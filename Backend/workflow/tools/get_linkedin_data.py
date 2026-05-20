from apify_client import ApifyClient
from dotenv import load_dotenv
import os

load_dotenv()


def get_linkedin(linkedin_url: str):
    """Fetch a candidate's LinkedIn profile via Apify and return the raw items.

    Args:
        linkedin_url: The candidate's LinkedIn profile URL. In production this
            comes from the frontend — the user connects their LinkedIn account
            and the resulting profile URL flows through the workflow State.

    Returns:
        A list of profile detail records (work experience, education, skills,
        certifications, languages, projects) suitable for resume tailoring.

    Reads APIFY_API_KEY from the environment.
    """
    if not linkedin_url:
        raise ValueError("linkedin_url is required — the user must connect a LinkedIn account.")

    client = ApifyClient(os.getenv("APIFY_API_KEY"))
    run_input = {
        "profileScraperMode": "Profile details no email ($4 per 1k)",
        "queries": [linkedin_url],
        "urls": [],
        "publicIdentifiers": [],
        "profileIds": [],
    }

    run = client.actor("LpVuK3Zozwuipa5bp").call(run_input=run_input)
    results = []
    for item in client.dataset(run["defaultDatasetId"]).iterate_items():
        results.append(item)

    return results


if __name__ == "__main__":
    linkedin_data = get_linkedin(os.getenv("LINKEDIN_URL"))
    print(linkedin_data)
