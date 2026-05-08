from langgraph.graph import StateGraph, END

from .Schemas.State import State
from .Node.JDNode.Node import JDNode
from .Node.GithubNode.Node import GithubNode
from .Node.LinkedinNode.Node import LinkedinNode
from .Node.GapAnalysisNode.Node import GapAnalysisNode
from .Node.ResumeWriteNode.Node import ResumeWriteNode
from .Node.ATSValidatorNode.Node import ATSValidatorNode
from .Node.UserReviewNode.Node import UserReviewNode
from .Node.RenderCVNode.Node import RenderCVNode
from .Node.VerifyNode.Node import VerifyNode

ATS_PASS_THRESHOLD = 0.85
ATS_MAX_ATTEMPTS = 2


def _ats_router(state: State) -> str:
    if state.get("ATSScore", 0.0) >= ATS_PASS_THRESHOLD:
        return "pass"
    if state.get("ATSAttempts", 0) >= ATS_MAX_ATTEMPTS:
        return "give_up"
    return "retry"


def build_workflow():
    g = StateGraph(State)

    g.add_node("jd", JDNode)
    g.add_node("github", GithubNode)
    g.add_node("linkedin", LinkedinNode)
    g.add_node("gap", GapAnalysisNode)
    g.add_node("write", ResumeWriteNode)
    g.add_node("ats", ATSValidatorNode)
    g.add_node("review", UserReviewNode)
    g.add_node("render", RenderCVNode)
    g.add_node("verify", VerifyNode)

    g.set_entry_point("jd")

    # Parallel fan-out: JD → GitHub + LinkedIn
    g.add_edge("jd", "github")
    g.add_edge("jd", "linkedin")

    # Both evidence branches converge at gap analysis
    g.add_edge("github", "gap")
    g.add_edge("linkedin", "gap")

    g.add_edge("gap", "write")
    g.add_edge("write", "ats")

    # Conditional retry loop: pass → review, fail (<2 attempts) → write, give_up → review
    g.add_conditional_edges("ats", _ats_router, {
        "pass": "review",
        "retry": "write",
        "give_up": "review",
    })

    g.add_edge("review", "render")
    g.add_edge("render", "verify")
    g.add_edge("verify", END)

    return g.compile()
