from typing import Optional, Any
from fastapi import APIRouter, Depends, Query

from app.database import supabase_admin
from app.dependencies import get_current_user, AuthenticatedUser
from app.utils.api_util import send_success
from app.utils.error_util import AppError
from app.utils.logger import logger

router = APIRouter()


@router.get("/hire-me/matches")
async def get_job_matches(user: AuthenticatedUser = Depends(get_current_user)):
    response = supabase_admin.table("job_matches").select("*").eq("user_id", user.id).order("match_score", desc=True).execute()
    return send_success(response.data or [], "Job matches fetched")


@router.get("/hire-me/top-matches")
async def get_top_matches(limit: int = Query(50, ge=1, le=200), user: AuthenticatedUser = Depends(get_current_user)):
    response = supabase_admin.table("job_matches").select("*").eq("user_id", user.id).order("match_score", desc=True).limit(limit).execute()
    return send_success(response.data or [], "Top matches fetched")


@router.get("/hire-me/readiness")
async def get_hire_readiness(user: AuthenticatedUser = Depends(get_current_user)):
    response = supabase_admin.table("hire_readiness").select("*").eq("user_id", user.id).maybe_single().execute()
    score = response.data or {"score": 0, "readiness_level": "unknown", "breakdown": {}}
    return send_success(score, "Hire readiness fetched")
