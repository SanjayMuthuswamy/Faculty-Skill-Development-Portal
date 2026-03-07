from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from fastapi import HTTPException
from starlette.exceptions import HTTPException as StarletteHTTPException
from app.core.config import settings
from app.api.v1.api import api_router
import logging

logger = logging.getLogger(__name__)

app = FastAPI(
    title="Faculty Skill Development Portal API",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    debug=settings.DEBUG,
    redirect_slashes=False
)

# Set all CORS enabled origins
if settings.CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(origin) for origin in settings.CORS_ORIGINS],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


def _add_cors_headers(response: JSONResponse, origin: str | None) -> JSONResponse:
    """Inject CORS headers into any error response so the browser can read the error detail."""
    if origin and settings.CORS_ORIGINS:
        allowed = [str(o) for o in settings.CORS_ORIGINS]
        if origin in allowed or "*" in allowed:
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
            response.headers["Access-Control-Allow-Methods"] = "*"
            response.headers["Access-Control-Allow-Headers"] = "*"
    return response


# Override HTTPException handler so CORS headers are always present on 4xx responses.
# Without this, FastAPI's default handler returns 401/403/404 WITHOUT CORS headers,
# causing the browser to report a CORS error instead of the real HTTP error.
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    response = JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
    )
    return _add_cors_headers(response, request.headers.get("origin"))


# Override validation error handler for the same reason (422 responses need CORS headers too).
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    response = JSONResponse(
        status_code=422,
        content={"detail": exc.errors()},
    )
    return _add_cors_headers(response, request.headers.get("origin"))


# Global exception handler – ensures CORS headers are always sent for 500s
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"--- [SERVER] Unhandled exception: {type(exc).__name__}: {exc} ---", exc_info=True)
    response = JSONResponse(
        status_code=500,
        content={"detail": f"Internal server error: {type(exc).__name__}"}
    )
    return _add_cors_headers(response, request.headers.get("origin"))


app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/")
def root():
    return {"message": "Faculty Skill Development Portal API is running"}
