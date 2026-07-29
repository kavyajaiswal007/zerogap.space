from typing import Optional, Any
from app.database import supabase_admin
from app.utils.error_util import AppError


def get_profile_or_throw(user_id: str) -> dict:
    response = supabase_admin.table("profiles").select("*").eq("id", user_id).maybe_single().execute()
    data = response.data
    if not data:
        raise AppError("Profile not found", 404, "PROFILE_NOT_FOUND")
    return data


def get_active_target_role(user_id: str) -> Optional[dict]:
    response = supabase_admin.table("target_roles").select("*").eq("user_id", user_id).eq("is_active", True).maybe_single().execute()
    return response.data


def get_user_skills(user_id: str) -> list[dict]:
    response = supabase_admin.table("user_skills").select("*").eq("user_id", user_id).order("skill_name").execute()
    return response.data or []


def get_latest_skill_gap_analysis(user_id: str) -> Optional[dict]:
    response = supabase_admin.table("skill_gap_analyses").select("*").eq("user_id", user_id).order("created_at", desc=True).limit(1).maybe_single().execute()
    return response.data
