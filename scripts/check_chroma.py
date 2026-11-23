import chromadb
c = chromadb.PersistentClient(path="ml/chroma_db")
print([x.name for x in c.list_collections()])
col = c.get_or_create_collection("alert_history")
print("count:", col.count())
