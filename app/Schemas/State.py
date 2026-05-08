from typing import TypedDict, Optional, List


class GithubProjects(TypedDict):
    projectSummary: str


class State(TypedDict):
    # Inputs
    JD: str
    user_input: Optional[str]
    session_id: str
    # Plan
    JDAnalysis: str
    # Evidence
    LinkedinSummary: str
    GithubProjectSummary: List[GithubProjects]
    # Reconcile
    GapAnalysis: str
    # Generation
    ResumeDraft: str
    ResumeYAMLPath: str
    # Validation
    ATSScore: float
    ATSReport: str
    ATSAttempts: int
    # Review
    UserApproved: bool
    # Output
    Theme: str
    RenderedPDFPath: str
    ParseBackOK: bool
    FinalSummary: str
