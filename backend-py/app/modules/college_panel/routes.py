from typing import Optional, Any
from fastapi import APIRouter, Depends

from app.database import supabase_admin
from app.dependencies import get_current_user, AuthenticatedUser, require_role
from app.utils.api_util import send_success
from app.utils.error_util import AppError
from app.utils.logger import logger

router = APIRouter()


@router.get("/college-panel/dashboard")
async def get_dashboard(user: AuthenticatedUser = Depends(require_role(["college", "admin"]))):
    students_resp = supabase_admin.table("profiles").select("id", count="exact").eq("role", "student").execute()
    total_students = students_resp.count or 0

    active_resp = supabase_admin.table("execution_logs").select("user_id", count="exact").gte("date", __import__("datetime").datetime.now().strftime("%Y-%m-%d")).execute()
    active_today = active_resp.count or 0

    return send_success({
        "total_students": total_students,
        "active_today": active_today,
    }, "Dashboard stats fetched")


@router.get("/college-panel/students")
async def list_students(user: AuthenticatedUser = Depends(require_role(["college", "admin"]))):
    response = supabase_admin.table("profiles").select("*").eq("role", "student").order("created_at", desc=True).execute()
    return send_success(response.data or [], "Students fetched")


@router.get("/college-panel/students/{student_id}")
async def get_student_details(student_id: str, user: AuthenticatedUser = Depends(require_role(["college", "admin"]))):
    response = supabase_admin.table("profiles").select("*").eq("id", student_id).maybe_single().execute()
    if not response.data:
        raise AppError("Student not found", 404, "STUDENT_NOT_FOUND")

    progress_resp = supabase_admin.table("skill_gap_analyses").select("*").eq("user_id", student_id).order("created_at", desc=True).limit(1).maybe_single().execute()
    student = dict(response.data)
    student["latest_analysis"] = progress_resp.data
    return send_success(student, "Student details fetched")
