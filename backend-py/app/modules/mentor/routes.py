from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.database import supabase_admin
from app.dependencies import get_current_user, AuthenticatedUser
from app.utils.api_util import send_success
from app.utils.error_util import AppError
from app.utils.claude_util import get_mentor_response
from app.utils.logger import logger
from app.utils.db_util import get_profile_or_throw, get_user_skills, get_active_target_role, get_latest_skill_gap_analysis

router = APIRouter()


class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None


class MentorService:

    @staticmethod
    async def list_sessions(user_id: str) -> list[dict]:
        response = supabase_admin.table("chat_sessions").select("*").eq("user_id", user_id).order("last_message_at", desc=True).execute()
        return response.data or []

    @staticmethod
    async def create_session(user_id: str, title: str = "New mentor chat", context_type: str = "general") -> dict:
        response = supabase_admin.table("chat_sessions").insert({
            "user_id": user_id,
            "title": title,
            "context_type": context_type,
        }).select().single().execute()
        if not response.data:
            raise AppError("Failed to create session", 500, "SESSION_CREATE_FAILED")
        return response.data

    @staticmethod
    async def get_or_create_session(user_id: str, session_id: Optional[str] = None, title: str = "Mentor chat") -> dict:
        if session_id:
            response = supabase_admin.table("chat_sessions").select("*").eq("id", session_id).eq("user_id", user_id).maybe_single().execute()
            if response.data:
                return response.data
        return await MentorService.create_session(user_id, title)

    @staticmethod
    async def get_messages(user_id: str, session_id: str) -> list[dict]:
        response = supabase_admin.table("chat_messages").select("*").eq("user_id", user_id).eq("session_id", session_id).order("created_at").execute()
        return response.data or []

    @staticmethod
    async def delete_session(user_id: str, session_id: str) -> dict:
        supabase_admin.table("chat_messages").delete().eq("session_id", session_id).eq("user_id", user_id).execute()
        supabase_admin.table("chat_sessions").delete().eq("id", session_id).eq("user_id", user_id).execute()
        return {"deleted": True}

    @staticmethod
    async def chat(user_id: str, message: str, session_id: Optional[str] = None) -> dict:
        session = await MentorService.get_or_create_session(user_id, session_id, message[:48])
        sid = session["id"]

        profile = get_profile_or_throw(user_id)
        target_role = get_active_target_role(user_id)
        analysis = get_latest_skill_gap_analysis(user_id)

        history = await MentorService.get_messages(user_id, sid)

        supabase_admin.table("chat_messages").insert({
            "session_id": sid,
            "user_id": user_id,
            "role": "user",
            "content": message,
            "token_count": max(1, len(message) // 4),
        }).execute()

        recent_resp = supabase_admin.table("execution_logs").select("action, date").eq("user_id", user_id).order("created_at", desc=True).limit(5).execute()
        recent_logs = recent_resp.data or []

        roadmap_resp = supabase_admin.table("roadmaps").select("title, completion_percentage").eq("user_id", user_id).eq("is_active", True).maybe_single().execute()
        roadmap = roadmap_resp.data

        system_prompt = (
            "You are ZeroGap AI Mentor — an expert career coach and technical mentor for students targeting tech jobs in India.\n\n"
            f"STUDENT PROFILE:\n"
            f"- Name: {profile.get('full_name', 'ZeroGap User')}\n"
            f"- Target Role: {target_role.get('job_title', 'Full Stack Developer') if target_role else 'Full Stack Developer'}\n"
            f"- College: {profile.get('college_name', 'Independent learner')}\n"
            f"- Graduation Year: {profile.get('graduation_year', 'Unknown')}\n"
            f"- Missing Skills: {', '.join((analysis.get('missing_skills', []) or [])[:8]) if analysis else 'Run skill gap analysis first'}\n"
            f"- Active Roadmap: {roadmap.get('title', 'No active roadmap') if roadmap else 'No active roadmap'} ({roadmap.get('completion_percentage', 0) if roadmap else 0}% complete)\n"
            f"- Recent Activity: {recent_logs}\n\n"
            "BEHAVIOR:\n"
            "- Be specific and data-driven. Reference their actual skill gaps by name.\n"
            "- Suggest specific free resources when useful.\n"
            "- For technical questions, give clean examples.\n"
            "- Keep responses under 300 words unless the user asks for depth.\n"
            "- Always end with one clear next action they can take today."
        )

        history_text = "\n".join(f"{m['role']}: {m['content']}" for m in history[-20:])
        prompt = f"Previous conversation:\n{history_text}\n\nUser: {message}" if history_text else message

        fallback = "Your next action today: complete one roadmap task, log it in Tracker, and rerun your skill-gap score so your dashboard counters update."
        reply = await get_mentor_response(system_prompt, prompt, fallback)

        supabase_admin.table("chat_messages").insert({
            "session_id": sid,
            "user_id": user_id,
            "role": "assistant",
            "content": reply,
            "token_count": max(1, len(reply) // 4),
        }).execute()

        supabase_admin.table("chat_sessions").update({
            "title": session.get("title") or message[:48],
            "last_message_at": datetime.now(timezone.utc).isoformat(),
        }).eq("id", sid).execute()

        return {"reply": reply, "session_id": sid}


@router.post("/mentor/chat")
async def chat_with_mentor(body: ChatRequest, user: AuthenticatedUser = Depends(get_current_user)):
    if not body.message or not body.message.strip():
        raise AppError("Message is required", 400, "MENTOR_MESSAGE_REQUIRED")
    result = await MentorService.chat(user.id, body.message.strip(), body.session_id)
    return send_success(result, "Mentor response generated")


@router.get("/mentor/sessions")
async def list_sessions(user: AuthenticatedUser = Depends(get_current_user)):
    result = await MentorService.list_sessions(user.id)
    return send_success(result, "Mentor sessions fetched")


@router.get("/mentor/sessions/{session_id}/messages")
async def get_session_messages(session_id: str, user: AuthenticatedUser = Depends(get_current_user)):
    result = await MentorService.get_messages(user.id, session_id)
    return send_success(result, "Mentor messages fetched")


@router.delete("/mentor/sessions/{session_id}")
async def delete_session(session_id: str, user: AuthenticatedUser = Depends(get_current_user)):
    result = await MentorService.delete_session(user.id, session_id)
    return send_success(result, "Mentor session deleted")
