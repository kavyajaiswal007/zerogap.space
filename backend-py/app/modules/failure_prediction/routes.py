from typing import Optional, Any
from fastapi import APIRouter, Depends

from app.database import supabase_admin
from app.dependencies import get_current_user, AuthenticatedUser
from app.utils.api_util import send_success
from app.utils.error_util import AppError
from app.utils.logger import logger

router = APIRouter()


@router.get("/failure-prediction/predict")
async def get_risk_prediction(user: AuthenticatedUser = Depends(get_current_user)):
    response = supabase_admin.table("failure_predictions").select("*").eq("user_id", user.id).order("created_at", desc=True).limit(1).maybe_single().execute()
    if not response.data:
        return send_success({
            "risk_score": 0,
            "risk_level": "low",
            "factors": [],
            "recommendations": ["Stay consistent with daily activities"],
        }, "Default risk prediction (no data yet)")

    return send_success(response.data, "Risk prediction fetched")
