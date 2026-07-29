from typing import Optional, Any
from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.database import supabase_admin
from app.dependencies import get_current_user, AuthenticatedUser
from app.utils.api_util import send_success
from app.utils.error_util import AppError
from app.utils.logger import logger

router = APIRouter()


class AddProjectInput(BaseModel):
    title: str
    description: Optional[str] = None
    repo_url: Optional[str] = None
    technologies: Optional[list[str]] = None


class UpdateProjectInput(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    repo_url: Optional[str] = None
    technologies: Optional[list[str]] = None
    status: Optional[str] = None


@router.get("/project-builder/projects")
async def get_projects(user: AuthenticatedUser = Depends(get_current_user)):
    response = supabase_admin.table("user_projects").select("*").eq("user_id", user.id).order("created_at", desc=True).execute()
    return send_success(response.data or [], "Projects fetched")


@router.post("/project-builder/projects")
async def add_project(input_data: AddProjectInput, user: AuthenticatedUser = Depends(get_current_user)):
    payload = {
        "user_id": user.id,
        "title": input_data.title,
        "description": input_data.description or "",
        "repo_url": input_data.repo_url or "",
        "technologies": input_data.technologies or [],
        "status": "suggested",
    }
    response = supabase_admin.table("user_projects").insert(payload).select().single().execute()
    if not response.data:
        raise AppError("Failed to create project", 500, "PROJECT_CREATE_FAILED")

    logger.info(f"Project created for user {user.id}: {input_data.title}")
    return send_success(response.data, "Project created")


@router.put("/project-builder/projects/{project_id}")
async def update_project(project_id: str, input_data: UpdateProjectInput, user: AuthenticatedUser = Depends(get_current_user)):
    existing = supabase_admin.table("user_projects").select("*").eq("id", project_id).eq("user_id", user.id).maybe_single().execute()
    if not existing.data:
        raise AppError("Project not found", 404, "PROJECT_NOT_FOUND")

    updates = {k: v for k, v in input_data.model_dump().items() if v is not None}
    if not updates:
        raise AppError("No fields to update", 400, "NO_UPDATES")

    response = supabase_admin.table("user_projects").update(updates).eq("id", project_id).eq("user_id", user.id).select().single().execute()
    return send_success(response.data, "Project updated")


@router.delete("/project-builder/projects/{project_id}")
async def delete_project(project_id: str, user: AuthenticatedUser = Depends(get_current_user)):
    existing = supabase_admin.table("user_projects").select("*").eq("id", project_id).eq("user_id", user.id).maybe_single().execute()
    if not existing.data:
        raise AppError("Project not found", 404, "PROJECT_NOT_FOUND")

    supabase_admin.table("user_projects").delete().eq("id", project_id).eq("user_id", user.id).execute()
    return send_success(None, "Project deleted")
