from apify_client import ApifyClient
from dotenv import load_dotenv
import os 

load_dotenv()
    
def get_linkedin():
    LINKEDIN_URL = os.getenv("LINKEDIN_URL")
    client = ApifyClient(os.getenv("APIFY_API_KEY"))
    run_input = {
        "profileScraperMode": "Profile details no email ($4 per 1k)",
        "queries": [
            LINKEDIN_URL
        ],
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
    linkedin_data = get_linkedin()
    print(linkedin_data)