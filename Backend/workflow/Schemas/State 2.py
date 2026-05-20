from typing import TypedDict, Optional,List


class GithubProjects(TypedDict):
    projectSummary: str


class State(TypedDict):
    JD: str
    user_input: Optional[str]
    session_id: str
    JDAnalysis: str
    LinkedinSummary: str
    GithubProjectSummary: List[GithubProjects]
    FinalSummary: str
    