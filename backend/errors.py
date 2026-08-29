import logging

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)


def error_body(message: str) -> dict[str, str]:
    return {"error": message}


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(HTTPException)
    async def http_exception_handler(
        _request: Request, exc: HTTPException
    ) -> JSONResponse:
        detail = exc.detail
        if not isinstance(detail, str):
            detail = "Request failed"
        return JSONResponse(
            status_code=exc.status_code,
            content=error_body(detail),
            headers=dict(exc.headers) if exc.headers else None,
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        _request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        first = exc.errors()[0] if exc.errors() else None
        message = "Invalid request"
        if first:
            loc = ".".join(str(part) for part in first.get("loc", ()) if part != "body")
            msg = first.get("msg", message)
            message = f"{loc}: {msg}" if loc else msg
        return JSONResponse(status_code=422, content=error_body(message))

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(
        _request: Request, exc: Exception
    ) -> JSONResponse:
        logger.exception("Unhandled server error: %s", exc)
        return JSONResponse(
            status_code=500,
            content=error_body("Something went wrong. Please try again."),
        )
