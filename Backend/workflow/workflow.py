from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver

from .Schemas.State import State
from .Node.JDNode.Node import JDNode
from .Node.GithubNode.Node import GithubNode
from .Node.LinkedinNode.Node import LinkedinNode
from .Node.GapAnalysisNode.Node import GapAnalysisNode
from .Node.ResumeWriteNode.Node import ResumeWriteNode
from .Node.ATSValidatorNode.Node import ATSValidatorNode
from .Node.RenderCVNode.Node import RenderCVNode
from .Node.VerifyNode.Node import VerifyNode

# ── Constants ─────────────────────────────────────────────────────────────────

ATS_PASS_THRESHOLD = 0.90   # composite score required to render
ATS_MAX_RETRIES    = 5      # safety cap on writer retries to bound LLM cost


# ── Routers ───────────────────────────────────────────────────────────────────

def _ats_router(state: State) -> str:
    """Loop write → ats until the composite score reaches 90%.

    The writer keeps revising with ATSReport feedback until score >= 90%.
    ATS_MAX_RETRIES is only a safety cap to prevent an unbounded loop /
    runaway LLM cost if the score plateaus below threshold.
    """
    attempts = state.get("ATSAttempts", 0)
    score    = state.get("ATSScore", 0.0)

    if score >= ATS_PASS_THRESHOLD:
        return "render"     # passed — render the resume
    if attempts >= ATS_MAX_RETRIES + 1:
        return "render"     # safety cap reached — render the best draft so far
    return "retry"          # below 90% → send ATSReport feedback → ResumeWriteNode


# ── Graph ─────────────────────────────────────────────────────────────────────

def build_workflow(checkpointer=None):
    g = StateGraph(State)

    # ── Register nodes ────────────────────────────────────────────────────────
    g.add_node("jd",       JDNode)
    g.add_node("github",   GithubNode)
    g.add_node("linkedin", LinkedinNode)
    g.add_node("gap",      GapAnalysisNode)
    g.add_node("write",    ResumeWriteNode)
    g.add_node("ats",      ATSValidatorNode)
    g.add_node("render",   RenderCVNode)
    g.add_node("verify",   VerifyNode)

    # ── Entry ─────────────────────────────────────────────────────────────────
    g.set_entry_point("jd")

    # ── Stage 1: JD analysis ──────────────────────────────────────────────────
    # Fan-out: JD → GitHub + LinkedIn in parallel
    g.add_edge("jd", "github")
    g.add_edge("jd", "linkedin")

    # ── Stage 2: Evidence → Gap analysis ─────────────────────────────────────
    # Fan-in: LangGraph fires "gap" only after BOTH github AND linkedin complete
    g.add_edge("github",   "gap")
    g.add_edge("linkedin", "gap")

    # ── Stage 3: Write → ATS validation loop ─────────────────────────────────
    #
    #   gap → write → ats
    #                  │  retry  (score < 90%, under retry cap)
    #                  └──────→ write (writer reads ATSReport from state)
    #                  │  render (score >= 90% OR retry cap reached)
    #                  └──────→ render
    #
    # On a user rerun with updated user_input, the frontend calls ainvoke
    # with the existing session_id. The checkpointer restores state and the
    # workflow re-enters at "write" with the new user_input already merged in.
    g.add_edge("gap",   "write")
    g.add_edge("write", "ats")

    g.add_conditional_edges(
        "ats",
        _ats_router,
        {
            "render": "render",   # ATS passed or max retries reached
            "retry":  "write",    # writer revises using ATSReport feedback
        },
    )

    # ── Stage 4: Render → Verify → Done ──────────────────────────────────────
    g.add_edge("render", "verify")
    g.add_edge("verify", END)

    return g.compile(checkpointer=checkpointer)


# ── Singleton instances ───────────────────────────────────────────────────────
#
# `workflow`          — stateless, for one-shot API calls (no persistence)
# `workflow_with_memory` — checkpointed, for session-aware runs where the user
#                          can rerun with updated user_input and the same
#                          thread_id to revise their resume without re-running
#                          all upstream nodes.

workflow             = build_workflow()
workflow_with_memory = build_workflow(checkpointer=MemorySaver())
