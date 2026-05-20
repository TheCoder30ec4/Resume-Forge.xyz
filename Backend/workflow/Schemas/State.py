from typing import TypedDict, Optional, List


class GithubProjects(TypedDict):
    projectSummary: str


class State(TypedDict):
    # Inputs
    JD: str
    user_input: Optional[str]
    session_id: str
    user_id: Optional[str]          # DB user ID — used for Redis cache lookups
    UserName: Optional[str]         # profile name — forced into the resume + output filenames
    UserEmail: Optional[str]        # login email — forced into the resume's email field
    UserLocation: Optional[str]     # profile location — forced into the resume's location field
    IsFresher: Optional[bool]       # True → no work experience; skip experience section
    # LinkedIn profile URL the user connected on the frontend
    LinkedinURL: str
    # GitHub repos the user granted access to on the frontend: "owner/repo" names,
    # 2-10 of them. GithubToken is the access token from the frontend OAuth.
    GithubRepos: List[str]
    GithubToken: Optional[str]
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
