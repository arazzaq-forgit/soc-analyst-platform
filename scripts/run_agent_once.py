import json
from dotenv import load_dotenv
load_dotenv()

from ml.investigate import investigate

query = "Multiple failed SSH logins followed by a successful login from the same external IP"

brief, context = investigate(query)

print("=== BRIEF ===")
print(brief)
print()
print("=== CONTEXT ===")
print("type:", type(context).__name__, "| items:", len(context))
for i, item in enumerate(context[:3]):
    print(f"--- item {i} | type: {type(item).__name__}")
    if isinstance(item, dict):
        print("keys:", list(item.keys()))
    print(json.dumps(item, indent=2, default=str)[:600])
