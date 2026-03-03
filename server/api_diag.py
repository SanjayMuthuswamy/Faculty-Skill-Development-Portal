
import requests
import json

base_url = "http://localhost:8000/api/v1"

def check(endpoint):
    print(f"\nChecking {endpoint}...")
    try:
        r = requests.get(f"{base_url}/{endpoint}")
        print(f"Status: {r.status_code}")
        if r.status_code == 200:
            data = r.json()
            print(f"Count: {len(data)}")
            if len(data) > 0:
                print("First item sample:")
                print(json.dumps(data[0], indent=2)[:500])
        else:
            print(f"Error: {r.text}")
    except Exception as e:
        print(f"Req Error: {e}")

if __name__ == "__main__":
    check("question-packs")
    check("tests")
    check("faculty")
