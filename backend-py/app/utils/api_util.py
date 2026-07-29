from typing import Any, Optional
from fastapi.responses import JSONResponse


def build_response(success: bool, data: Any, message: str = "", error: str = "") -> dict:
    return {
        "success": success,
        "data": data,
        "message": message,
        "error": error,
        "meta": {
            "timestamp": __import__("datetime").datetime.now().isoformat(),
            "version": "1.0",
        },
    }


def send_success(data: Any, message: str = "OK", status_code: int = 200) -> JSONResponse:
    return JSONResponse(
        content=build_response(True, data, message),
        status_code=status_code,
    )
