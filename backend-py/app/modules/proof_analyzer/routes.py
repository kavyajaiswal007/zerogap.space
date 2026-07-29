from typing import Optional, Any
from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.database import supabase_admin
from app.dependencies import get_current_user, AuthenticatedUser
from app.utils.api_util import send_success
from app.utils.error_util import AppError
from app.utils.logger import logger

router = APIRouter()


class AnalyzeInput(BaseModel):
    url: str
    type: str


@router.post("/proof-analyzer/analyze")
async def analyze_proof(input_data: AnalyzeInput, user: AuthenticatedUser = Depends(get_current_user)):
    logger.info(f"Analyzing proof for user {user.id}: type={input_data.type}, url={input_data.url}")

    existing = supabase_admin.table("github_proofs").select("*").eq("user_id", user.id).eq("url", input_data.url).maybe_single().execute()
    if existing.data:
        raise AppError("Proof already exists", 409, "PROOF_EXISTS")

    payload = {
        "user_id": user.id,
        "url": input_data.url,
        "proof_type": input_data.type,
        "status": "pending",
    }
    response = supabase_admin.table("github_proofs").insert(payload).select().single().execute()
    if not response.data:
        raise AppError("Failed to create proof", 500, "PROOF_CREATE_FAILED")

    return send_success(response.data, "Proof submitted for analysis")


@router.get("/proof-analyzer/proofs")
async def get_proofs(user: AuthenticatedUser = Depends(get_current_user)):
    response = supabase_admin.table("github_proofs").select("*").eq("user_id", user.id).order("created_at", desc=True).execute()
    return send_success(response.data or [], "Proofs fetched")


@router.delete("/proof-analyzer/proofs/{proof_id}")
async def delete_proof(proof_id: str, user: AuthenticatedUser = Depends(get_current_user)):
    existing = supabase_admin.table("github_proofs").select("*").eq("id", proof_id).eq("user_id", user.id).maybe_single().execute()
    if not existing.data:
        raise AppError("Proof not found", 404, "PROOF_NOT_FOUND")

    supabase_admin.table("github_proofs").delete().eq("id", proof_id).eq("user_id", user.id).execute()
    return send_success(None, "Proof deleted")
