from fastapi import FastAPI

from app.database import Base, engine
from app.routers import auth

# Creates tables if they don't exist yet. Fine for early dev;
# switch to Alembic migrations once the schema starts changing often.
Base.metadata.create_all(bind=engine)

app = FastAPI(title="SOC Analyst Platform")

app.include_router(auth.router)


@app.get("/health")
def health():
    return {"status": "ok"}