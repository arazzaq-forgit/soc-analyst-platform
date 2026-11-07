import logging

from fastapi import FastAPI
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.database import Base, engine
from app.rate_limit import limiter
from app.routers import auth, admin, alerts, stream, investigations

from app import models, models_integration, models_alert, models_investigation, models_audit  # noqa: F401

logging.basicConfig(level=logging.INFO)

app = FastAPI(title="SOC Analyst Platform")

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(alerts.router)
app.include_router(stream.router)
app.include_router(investigations.router)


@app.get("/health")
def health():
    return {"status": "ok"}
