"""
Check OpenAPI spec for available routes
"""
import httpx
import json

client = httpx.Client()
resp = client.get("http://localhost:8000/api/v1/openapi.json")

if resp.status_code == 200:
    spec = resp.json()
    paths = spec.get("paths", {})
    
    print(f"Total routes: {len(paths)}\n")
    print("Available routes:")
    for path in sorted(paths.keys()):
        methods = list(paths[path].keys())
        print(f"  {path}: {', '.join(m.upper() for m in methods if m != 'parameters')}")
else:
    print(f"Failed to get OpenAPI spec: {resp.status_code}")
