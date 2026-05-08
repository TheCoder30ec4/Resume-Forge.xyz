import os
import httpx
from dotenv import load_dotenv

load_dotenv()


def get_github_repos() -> list[dict]:
    """Fetch the user's public GitHub repos with name, description, languages, and README excerpt.

    Reads GITHUB_USERNAME and optional GITHUB_TOKEN from the environment.
    Returns up to 30 most recently pushed non-fork repos.
    """
    username = os.getenv("GITHUB_USERNAME")
    if not username:
        return []

    token = os.getenv("GITHUB_TOKEN")
    headers = {"Accept": "application/vnd.github+json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"

    with httpx.Client(headers=headers, timeout=30.0) as client:
        repos_resp = client.get(
            f"https://api.github.com/users/{username}/repos",
            params={"sort": "pushed", "per_page": 10, "type": "owner"},
        )
        repos_resp.raise_for_status()
        repos = [r for r in repos_resp.json() if not r.get("fork")]

        results = []
        for r in repos:
            languages_resp = client.get(r["languages_url"])
            languages = list(languages_resp.json().keys()) if languages_resp.status_code == 200 else []

            readme_excerpt = ""
            readme_resp = client.get(
                f"https://api.github.com/repos/{username}/{r['name']}/readme",
                headers={**headers, "Accept": "application/vnd.github.raw"},
            )
            if readme_resp.status_code == 200:
                readme_excerpt = readme_resp.text[:1500]

            results.append({
                "name": r["name"],
                "description": r.get("description") or "",
                "languages": languages,
                "topics": r.get("topics", []),
                "stars": r.get("stargazers_count", 0),
                "url": r.get("html_url", ""),
                "readme_excerpt": readme_excerpt,
            })

        return results


if __name__ == "__main__":
    print(get_github_repos())
