from typing import Optional, Any
from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.database import supabase_admin
from app.dependencies import get_current_user, AuthenticatedUser
from app.utils.api_util import send_success
from app.utils.error_util import AppError
from app.utils.logger import logger

router = APIRouter()


class EnrollInput(BaseModel):
    playlist_id: str


class QuizInput(BaseModel):
    answers: list[dict]
    score: Optional[int] = None


@router.get("/playlists")
async def get_playlists(user: AuthenticatedUser = Depends(get_current_user)):
    response = supabase_admin.table("playlists").select("*").order("created_at", desc=True).execute()
    return send_success(response.data or [], "Playlists fetched")


@router.get("/playlists/{playlist_id}")
async def get_playlist_details(playlist_id: str, user: AuthenticatedUser = Depends(get_current_user)):
    response = supabase_admin.table("playlists").select("*").eq("id", playlist_id).maybe_single().execute()
    if not response.data:
        raise AppError("Playlist not found", 404, "PLAYLIST_NOT_FOUND")

    videos_resp = supabase_admin.table("playlist_videos").select("*").eq("playlist_id", playlist_id).order("position").execute()
    playlist = dict(response.data)
    playlist["videos"] = videos_resp.data or []
    return send_success(playlist, "Playlist details fetched")


@router.post("/playlists/enroll")
async def enroll_playlist(input_data: EnrollInput, user: AuthenticatedUser = Depends(get_current_user)):
    existing = supabase_admin.table("user_enrollments").select("*").eq("user_id", user.id).eq("playlist_id", input_data.playlist_id).maybe_single().execute()
    if existing.data:
        raise AppError("Already enrolled", 409, "ALREADY_ENROLLED")

    payload = {
        "user_id": user.id,
        "playlist_id": input_data.playlist_id,
        "progress": 0,
    }
    response = supabase_admin.table("user_enrollments").insert(payload).select().single().execute()
    if not response.data:
        raise AppError("Failed to enroll", 500, "ENROLL_FAILED")

    logger.info(f"User {user.id} enrolled in playlist {input_data.playlist_id}")
    return send_success(response.data, "Enrolled successfully")


@router.post("/playlists/{playlist_id}/quiz/{video_id}")
async def submit_quiz(playlist_id: str, video_id: str, input_data: QuizInput, user: AuthenticatedUser = Depends(get_current_user)):
    payload = {
        "user_id": user.id,
        "playlist_id": playlist_id,
        "video_id": video_id,
        "answers": input_data.answers,
        "score": input_data.score or 0,
    }
    response = supabase_admin.table("quiz_attempts").insert(payload).select().single().execute()
    if not response.data:
        raise AppError("Failed to submit quiz", 500, "QUIZ_SUBMIT_FAILED")

    return send_success(response.data, "Quiz submitted")


@router.get("/playlists/{playlist_id}/certificate")
async def generate_certificate(playlist_id: str, user: AuthenticatedUser = Depends(get_current_user)):
    enrollment = supabase_admin.table("user_enrollments").select("*").eq("user_id", user.id).eq("playlist_id", playlist_id).maybe_single().execute()
    if not enrollment.data:
        raise AppError("Not enrolled in this playlist", 403, "NOT_ENROLLED")

    playlist = supabase_admin.table("playlists").select("title").eq("id", playlist_id).maybe_single().execute()
    if not playlist.data:
        raise AppError("Playlist not found", 404, "PLAYLIST_NOT_FOUND")

    certificate = {
        "user_id": user.id,
        "playlist_id": playlist_id,
        "playlist_title": playlist.data["title"],
        "status": "generated",
    }
    response = supabase_admin.table("certificates").upsert(
        certificate, on_conflict="user_id,playlist_id"
    ).select().single().execute()

    return send_success(response.data, "Certificate generated")
