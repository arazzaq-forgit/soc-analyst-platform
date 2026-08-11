import logging

from fastapi import FastAPI
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.database import Base, engine
from app.rate_limit import limiter
from app.routers import auth, admin

logging.basicConfig(level=logging.INFO)

# Creates tables if they don't exist yet. Fine for early dev;
# switch to Alembic migrations once the schema starts changing often.
Base.metadata.create_all(bind=engine)

app = FastAPI(title="SOC Analyst Platform")

# Rate limiting setup — must happen before routers are included so every
# route is covered by the default limit from the moment it's registered.
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

app.include_router(auth.router)
app.include_router(admin.router)