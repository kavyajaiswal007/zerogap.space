from datetime import datetime
from fastapi import APIRouter, Depends
from app.database import supabase_admin
from app.dependencies import get_current_user, AuthenticatedUser
from app.utils.api_util import send_success
from app.utils.error_util import AppError

router = APIRouter()


@router.post("/resume")
async def create_or_update_resume(
    body: dict,
    user: AuthenticatedUser = Depends(get_current_user),
):
    content_json = body.get("content_json", {})
    ats_score = body.get("ats_score", 0)
    keyword_match_score = body.get("keyword_match_score", 0)

    latest_resp = supabase_admin.table("resumes").select("version").eq("user_id", user.id).order("version", desc=True).limit(1).maybe_single().execute()
    next_version = (latest_resp.data.get("version", 0) if latest_resp.data else 0) + 1

    supabase_admin.table("resumes").update({"is_latest": False}).eq("user_id", user.id).execute()

    response = supabase_admin.table("resumes").insert({
        "user_id": user.id,
        "content_json": content_json,
        "ats_score": ats_score,
        "keyword_match_score": keyword_match_score,
        "version": next_version,
        "is_latest": True,
    }).select().single().execute()

    if response.error:
        raise AppError(response.error.message, 500, "RESUME_CREATE_FAILED")

    return send_success(response.data, "Resume saved", 201)


@router.get("/resume/{resume_id}")
async def get_resume(
    resume_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
):
    response = supabase_admin.table("resumes").select("*").eq("id", resume_id).eq("user_id", user.id).single().execute()
    if response.error:
        raise AppError("Resume not found", 404, "RESUME_NOT_FOUND")

    return send_success(response.data, "Resume fetched")


@router.post("/resume/{resume_id}/export-pdf")
async def export_resume_pdf(
    resume_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
):
    response = supabase_admin.table("resumes").select("*").eq("id", resume_id).eq("user_id", user.id).single().execute()
    if response.error:
        raise AppError("Resume not found", 404, "RESUME_NOT_FOUND")

    resume = response.data
    file_name = f"resume-{user.id}-v{resume.get('version', 1)}.pdf"

    upload_resp = supabase_admin.storage.from_("resumes").upload(
        file_name,
        b"",
        {"content-type": "application/pdf", "upsert": "true"},
    )
    if upload_resp.error:
        raise AppError("PDF export failed", 500, "PDF_EXPORT_FAILED")

    url_resp = supabase_admin.storage.from_("resumes").get_public_url(file_name)
    pdf_url = url_resp

    supabase_admin.table("resumes").update({
        "pdf_url": pdf_url,
        "updated_at": datetime.now().isoformat(),
    }).eq("id", resume_id).execute()

    return send_success({"pdf_url": pdf_url}, "Resume PDF exported")
