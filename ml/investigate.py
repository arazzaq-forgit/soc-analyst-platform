from dotenv import load_dotenv
import os
import chromadb
from huggingface_hub import InferenceClient
from groq import Groq

load_dotenv()

hf_client = InferenceClient(token=os.getenv("HUGGINGFACE_API_KEY"))
groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))

chroma_client = chromadb.PersistentClient(path="ml/chroma_db")
collection = chroma_client.get_or_create_collection(name="alert_history")


def retrieve_context(query: str, n_results: int = 5):
    """Retrieve the most relevant alerts for a given query."""
    query_embedding = hf_client.feature_extraction(
        query, model="sentence-transformers/all-MiniLM-L6-v2"
    )
    results = collection.query(query_embeddings=[query_embedding], n_results=n_results)

    retrieved = []
    for doc, meta in zip(results["documents"][0], results["metadatas"][0]):
        retrieved.append({
            "alert_id": meta["alert_id"],
            "text": doc,
            "mitre_technique": meta.get("mitre_technique", ""),
            "severity": meta.get("severity", ""),
        })
    return retrieved


def build_investigation_prompt(query: str, context: list):
    """Builds a citation-aware prompt - the model must only use the provided
    alerts as evidence, and must cite alert IDs for every claim it makes."""
    context_text = "\n".join(
        f"[{c['alert_id']}] {c['text']} (MITRE: {c['mitre_technique'] or 'none'}, Severity: {c['severity']})"
        for c in context
    )

    prompt = f"""You are a SOC investigation assistant. A security analyst is investigating: "{query}"

Here are the relevant alerts retrieved from the alert history:
{context_text}

Write a short investigation brief with exactly these sections:
1. SUMMARY - 2-3 sentences describing what's happening
2. SEVERITY ASSESSMENT - Low/Medium/High/Critical, with one sentence of reasoning
3. EVIDENCE - list each claim you make with the alert ID it comes from in [brackets], e.g. "Multiple SSH brute-force attempts detected [alrt_57c0f997]"
4. RECOMMENDED ACTION - one concrete next step for the analyst

Rules:
- Only use information from the alerts provided above. Do not invent details.
- Every factual claim in EVIDENCE must cite an alert ID from the list above.
- If the alerts don't support a clear conclusion, say so honestly rather than guessing.
- For RECOMMENDED ACTION, only suggest actions directly supported by fields present in the alerts (asset_id, severity, mitre_technique). Do NOT reference source IPs, source systems, or any data not explicitly shown above - the alerts do not currently include source IP addresses.
"""
    return prompt


def investigate(query: str):
    """Full pipeline: retrieve -> prompt -> generate investigation brief."""
    context = retrieve_context(query)
    prompt = build_investigation_prompt(query, context)

    response = groq_client.chat.completions.create(
        model="openai/gpt-oss-20b",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.2,
    )

    return response.choices[0].message.content, context


if __name__ == "__main__":
    query = "suspicious SSH login attempts"
    brief, context = investigate(query)

    print(f"Query: {query}\n")
    print(f"Retrieved {len(context)} alerts as context\n")
    print("=" * 60)
    print(brief)
    print("=" * 60)