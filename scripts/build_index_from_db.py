import sqlite3
import chromadb
from ml.embeddings import embed

con = sqlite3.connect("dev.db")
con.row_factory = sqlite3.Row
rows = con.execute(
    "SELECT alert_id, asset_id, timestamp, description, severity_raw, "
    "source_system, mitre_technique FROM alerts"
).fetchall()
print(f"Read {len(rows)} alerts from dev.db")

documents, metadatas, ids = [], [], []
for r in rows:
    documents.append(
        f"Alert {r['alert_id']} on {r['asset_id']} at {r['timestamp']}: "
        f"{r['description']}. Severity: {r['severity_raw']}. "
        f"Source: {r['source_system']}."
    )
    metadatas.append({
        "alert_id": r["alert_id"],
        "severity": r["severity_raw"] or "",
        "mitre_technique": r["mitre_technique"] or "",
    })
    ids.append(r["alert_id"])

client = chromadb.PersistentClient(path="ml/chroma_db")
col = client.get_or_create_collection("alert_history")
col.upsert(
    documents=documents,
    embeddings=[embed(d) for d in documents],
    metadatas=metadatas,
    ids=ids,
)
print("Indexed", len(documents), "| collection count:", col.count())
