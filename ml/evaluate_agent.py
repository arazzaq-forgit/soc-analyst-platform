from investigate import investigate
import re

# Test queries covering different scenarios your agent should handle
TEST_QUERIES = [
    "suspicious SSH login attempts",
    "FTP brute force attack",
    "unusual traffic on host-22",
    "port scanning activity",
    "normal benign traffic",  # tests behavior on non-attack data too
]


def extract_cited_ids(brief_text: str) -> set:
    """Pulls every alert ID mentioned in [brackets] from the brief."""
    # Matches patterns like [alrt_57c0f997] or [alrt_a, alrt_b]
    matches = re.findall(r'\[([^\]]+)\]', brief_text)
    cited_ids = set()
    for match in matches:
        # Handle comma-separated multiple IDs in one bracket
        ids = [i.strip() for i in match.split(',')]
        cited_ids.update(ids)
    return cited_ids


def evaluate_query(query: str):
    """Runs one query and checks whether every cited ID actually exists
    in the retrieved context - this is the core hallucination check."""
    brief, context = investigate(query)

    real_ids = {c["alert_id"] for c in context}
    cited_ids = extract_cited_ids(brief)

    # Any cited ID NOT in the real retrieved set is a hallucinated citation
    hallucinated = cited_ids - real_ids
    valid_citations = cited_ids & real_ids

    return {
        "query": query,
        "brief": brief,
        "real_ids_available": real_ids,
        "cited_ids": cited_ids,
        "valid_citations": valid_citations,
        "hallucinated_citations": hallucinated,
        "citation_accuracy": len(valid_citations) / len(cited_ids) if cited_ids else None,
    }


def run_evaluation():
    results = []
    for query in TEST_QUERIES:
        print(f"Testing: {query}...")
        result = evaluate_query(query)
        results.append(result)

    print("\n" + "=" * 70)
    print("EVALUATION SUMMARY")
    print("=" * 70)

    total_hallucinations = 0
    for r in results:
        status = "CLEAN" if not r["hallucinated_citations"] else "HALLUCINATION DETECTED"
        accuracy = f"{r['citation_accuracy']*100:.0f}%" if r["citation_accuracy"] is not None else "N/A (no citations)"
        print(f"\nQuery: {r['query']}")
        print(f"  Status: {status}")
        print(f"  Citation accuracy: {accuracy}")
        print(f"  Citations made: {len(r['cited_ids'])} | Valid: {len(r['valid_citations'])} | Hallucinated: {len(r['hallucinated_citations'])}")
        if r["hallucinated_citations"]:
            print(f"  Hallucinated IDs: {r['hallucinated_citations']}")
            total_hallucinations += len(r["hallucinated_citations"])

    print("\n" + "=" * 70)
    print(f"Total queries tested: {len(results)}")
    print(f"Total hallucinated citations found: {total_hallucinations}")
    print("=" * 70)

    return results


if __name__ == "__main__":
    run_evaluation()