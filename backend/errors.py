from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse


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
        return JSONResponse(status_code=exc.status_code, content=error_body(detail))

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
