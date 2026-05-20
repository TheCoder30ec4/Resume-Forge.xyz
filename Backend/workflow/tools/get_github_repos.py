import os
import httpx
from dotenv import load_dotenv

load_dotenv()


def get_github_repos(repo_full_names: list[str], token: str | None = None) -> list[dict]:
    """Fetch metadata for a specific set of GitHub repos.

    In production the user connects their GitHub account on the frontend and
    grants access to 2-10 repositories; the frontend passes those repos here as
    `owner/repo` names plus an access token.

    Args:
        repo_full_names: List of "owner/repo" identifiers to fetch.
        token: GitHub access token (from the frontend OAuth connection).
            Falls back to the GITHUB_TOKEN env var for local runs.

    Returns:
        One dict per repo with name (the "owner/repo" identifier), description,
        languages, topics, stars, url, and a README excerpt. Repos that cannot
        be fetched (renamed, deleted, no access) are skipped.
    """
    token = token or os.getenv("GITHUB_TOKEN")
    headers = {"Accept": "application/vnd.github+json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"

    results: list[dict] = []
    # follow_redirects: renamed repos (e.g. tiangolo/fastapi → fastapi/fastapi)
    # return a 301; without this they would be silently skipped.
    with httpx.Client(headers=headers, timeout=30.0, follow_redirects=True) as client:
        for full_name in repo_full_names:
            full_name = full_name.strip().removeprefix("https://github.com/").strip("/")
            if full_name.count("/") != 1:
                continue  # not an "owner/repo" identifier

            repo_resp = client.get(f"https://api.github.com/repos/{full_name}")
            if repo_resp.status_code != 200:
                continue  # renamed, deleted, or no access — skip
            r = repo_resp.json()

            languages_resp = client.get(r["languages_url"])
            languages = list(languages_resp.json().keys()) if languages_resp.status_code == 200 else []

            readme_excerpt = ""
            readme_resp = client.get(
                f"https://api.github.com/repos/{full_name}/readme",
                headers={**headers, "Accept": "application/vnd.github.raw"},
            )
            if readme_resp.status_code == 200:
                readme_excerpt = readme_resp.text[:1500]

            results.append({
                "name": r["full_name"],
                "description": r.get("description") or "",
                "languages": languages,
                "topics": r.get("topics", []),
                "stars": r.get("stargazers_count", 0),
                "url": r.get("html_url", ""),
                "readme_excerpt": readme_excerpt,
            })

    return results


if __name__ == "__main__":
    import sys
    names = sys.argv[1:] or [os.getenv("GITHUB_REPO", "")]
    print(get_github_repos([n for n in names if n]))
