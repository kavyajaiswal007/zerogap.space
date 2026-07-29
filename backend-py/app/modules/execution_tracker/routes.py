from datetime import datetime
from typing import Optional, Any
from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.database import supabase_admin
from app.dependencies import get_current_user, AuthenticatedUser
from app.utils.api_util import send_success
from app.utils.error_util import AppError
from app.utils.logger import logger

router = APIRouter()


class LogActivityInput(BaseModel):
    activity_type: str
    metadata: dict


@router.get("/execution-tracker/consistency")
async def get_consistency(user: AuthenticatedUser = Depends(get_current_user)):
    start = (datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)).isoformat()
    response = supabase_admin.table("execution_logs").select("*").eq("user_id", user.id).gte("created_at", start).execute()
    data = response.data or []
    active_days = len({row.get("date", row["created_at"][:10]) for row in data})
    return send_success({
        "active_days": active_days,
        "total_logs": len(data),
        "logs": data,
    }, "Consistency data fetched")


@router.post("/execution-tracker/log")
async def log_activity(input_data: LogActivityInput, user: AuthenticatedUser = Depends(get_current_user)):
    payload = {
        "user_id": user.id,
        "activity_type": input_data.activity_type,
        "metadata": input_data.metadata,
        "date": datetime.now().strftime("%Y-%m-%d"),
    }
    response = supabase_admin.table("execution_logs").insert(payload).select().single().execute()
    if not response.data:
        raise AppError("Failed to log activity", 500, "LOG_FAILED")

    logger.info(f"Activity logged for user {user.id}: {input_data.activity_type}")
    return send_success(response.data, "Activity logged")
