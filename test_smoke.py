"""Smoke-test individual workflow stages.

Tests:
  1. JDAgent → produces valid JSON
  2. ATSValidatorNode → deterministic scoring works against a fake resume
  3. Resume + design template assembly → produces valid YAML rendercv accepts
"""
import asyncio
import json
import subprocess
from pathlib import Path

from langchain_core.messages import HumanMessage

from app.Node.JDNode.Agent import JDAgent
from app.Node.ATSValidatorNode.Node import ATSValidatorNode
from app.tools.render_cv import assemble_yaml, save_yaml

SAMPLE_JD = open("jd.txt").read()

SAMPLE_CV_YAML = """cv:
  name: "Varun Test"
  location: "Hyderabad, India"
  email: "test@example.com"
  social_networks:
    - network: LinkedIn
      username: ch-varun
    - network: GitHub
      username: thecoder30ec4
  sections:
    summary:
      - "Backend engineer with Python and PostgreSQL experience building payment systems."
    experience:
      - company: "Acme Payments"
        position: "Backend Engineer"
        start_date: "2022-01"
        end_date: "present"
        location: "Hyderabad, India"
        highlights:
          - "Reduced p99 API latency by 35% by profiling Python services and migrating hot paths to Go, supporting end-to-end ownership of the billing pipeline."
          - "Built PostgreSQL replication topology serving 5M+ users with 99.97% uptime."
          - "Containerized services with Docker and deployed via CI/CD pipelines on Agile sprints."
    skills:
      - label: "Languages"
        details: "Python, Go, SQL"
      - label: "Frameworks"
        details: "Django, FastAPI"
      - label: "Infrastructure"
        details: "PostgreSQL, Docker, Kubernetes, AWS"
"""


async def test_jd_only():
    print("\n=== 1. JDAgent ===")
    result = await JDAgent.ainvoke(
        {"messages": [HumanMessage(content=f"<job_description>\n{SAMPLE_JD}\n</job_description>")]}
    )
    output = result["messages"][-1].content
    try:
        parsed = json.loads(output)
        print("✓ JDAgent produced valid JSON")
        print(f"  hard_skills_required: {parsed['skills']['hard_skills_required']}")
        print(f"  domain: {parsed['role_identity']['domain']}")
        return output
    except json.JSONDecodeError as e:
        print(f"✗ JDAgent output is not valid JSON: {e}")
        print(output[:500])
        return None


async def test_ats(jd_analysis: str):
    print("\n=== 2. ATSValidatorNode ===")
    state = {
        "JDAnalysis": jd_analysis,
        "ResumeDraft": SAMPLE_CV_YAML,
        "ATSAttempts": 0,
    }
    result = await ATSValidatorNode(state)
    print(f"  ATSScore: {result['ATSScore']}")
    print(f"  ATSAttempts: {result['ATSAttempts']}")
    print(f"  Report (truncated): {result['ATSReport'][:300]}")
    assert 0.0 <= result["ATSScore"] <= 1.0
    assert result["ATSAttempts"] == 1
    print("✓ ATSValidatorNode produces a 0-1 score and increments attempts")


def test_render():
    print("\n=== 3. YAML assembly + rendercv ===")
    yaml_path = save_yaml(SAMPLE_CV_YAML, name="smoke_test")
    print(f"  YAML written to {yaml_path}")
    full = yaml_path.read_text()
    assert full.startswith("cv:")
    assert "design:" in full
    assert "locale:" in full
    assert "settings:" in full
    print("✓ Assembled YAML has cv: + design: + locale: + settings:")

    result = subprocess.run(
        ["rendercv", "render", str(yaml_path)],
        cwd=str(yaml_path.parent),
        capture_output=True, text=True,
    )
    if result.returncode != 0:
        print(f"✗ rendercv failed: {result.stderr[:1000]}")
        return
    pdfs = list((yaml_path.parent / "rendercv_output").glob("*.pdf"))
    if not pdfs:
        print("✗ No PDF produced")
        return
    print(f"✓ Rendered PDF: {pdfs[0]}")


async def main():
    jd_analysis = await test_jd_only()
    if not jd_analysis:
        return
    await test_ats(jd_analysis)
    test_render()


asyncio.run(main())
