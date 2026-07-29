import asyncio
from datetime import datetime, timedelta
from typing import Optional, Any
from fastapi import APIRouter, Depends

from app.database import supabase_admin
from app.dependencies import get_current_user, AuthenticatedUser
from app.utils.api_util import send_success
from app.utils.error_util import AppError

router = APIRouter()

EMPTY_SCORE = {
    "skillsMatchPercentage": 0,
    "projectQualityScore": 0,
    "activityConsistencyScore": 0,
    "finalScore": 0,
}


def clamp_score(value: float) -> float:
    if not isinstance(value, (int, float)) or value != value:
        return 0.0
    return max(0.0, min(100.0, round(value, 2)))


def calculate_skill_score(skills_match_pct: float, project_quality: float, consistency: float) -> dict:
    return {
        "skillsMatchPercentage": clamp_score(skills_match_pct),
        "projectQualityScore": clamp_score(project_quality),
        "activityConsistencyScore": clamp_score(consistency),
        "finalScore": clamp_score(skills_match_pct * 0.5 + project_quality * 0.3 + consistency * 0.2),
    }


async def get_consistency(user_id: str) -> dict:
    start = (datetime.now() - timedelta(days=29)).strftime("%Y-%m-%d")
    response = supabase_admin.table("execution_logs").select("date").eq("user_id", user_id).gte("date", start).execute()
    data = response.data or []
    active_days = len({row["date"] for row in data})
    return {
        "active_days": active_days,
        "consistency_score": round((active_days / 30) * 100, 2),
        "graph": data,
    }


class ScoringService:

    @staticmethod
    async def recalculate(user_id: str) -> dict:
        analyses_resp = supabase_admin.table("skill_gap_analyses").select("*").eq("user_id", user_id).order("created_at", desc=True).limit(1).execute()
        analyses = analyses_resp.data or []
        if not analyses:
            raise AppError("No skill analysis found to calculate score", 404, "ANALYSIS_NOT_FOUND")
        latest = analyses[0]

        proofs_resp = supabase_admin.table("github_proofs").select("quality_score").eq("user_id", user_id).execute()
        proofs = proofs_resp.data or []
        project_quality_score = (
            round(sum(float(p.get("quality_score", 0) or 0) for p in proofs) / len(proofs), 2)
            if proofs
            else float(latest.get("project_quality_score", 0) or 0)
        )

        consistency = await get_consistency(user_id)
        breakdown = calculate_skill_score(
            float(latest.get("skills_match_percentage", 0) or 0),
            project_quality_score,
            consistency["consistency_score"],
        )

        supabase_admin.table("skill_gap_analyses").update({
            "skill_score": breakdown["finalScore"],
            "project_quality_score": breakdown["projectQualityScore"],
            "activity_consistency_score": breakdown["activityConsistencyScore"],
        }).eq("id", latest["id"]).execute()

        return breakdown

    @staticmethod
    async def current(user_id: str) -> dict:
        try:
            return await ScoringService.recalculate(user_id)
        except AppError as e:
            if e.code == "ANALYSIS_NOT_FOUND":
                return EMPTY_SCORE
            raise

    @staticmethod
    async def history(user_id: str) -> list[dict]:
        response = supabase_admin.table("skill_gap_analyses").select(
            "id, skill_score, skills_match_percentage, project_quality_score, activity_consistency_score, created_at"
        ).eq("user_id", user_id).order("created_at").execute()
        return response.data or []

    @staticmethod
    async def radar(user_id: str) -> list[dict]:
        response = supabase_admin.table("user_skills").select("skill_name, proficiency_level").eq("user_id", user_id).execute()
        data = response.data or []
        return [
            {
                "skill": row["skill_name"],
                "score": row["proficiency_level"],
                "category": "Frontend" if ("React" in row["skill_name"] or "CSS" in row["skill_name"]) else "Core",
            }
            for row in data
        ]


@router.get("/score/current")
async def get_current(user: AuthenticatedUser = Depends(get_current_user)):
    result = await ScoringService.current(user.id)
    return send_success(result, "Current score fetched")


@router.get("/score/history")
async def get_history(user: AuthenticatedUser = Depends(get_current_user)):
    result = await ScoringService.history(user.id)
    return send_success(result, "Score history fetched")


@router.get("/score/radar")
async def get_radar(user: AuthenticatedUser = Depends(get_current_user)):
    result = await ScoringService.radar(user.id)
    return send_success(result, "Radar data fetched")


@router.get("/score/breakdown")
async def get_breakdown(user: AuthenticatedUser = Depends(get_current_user)):
    score, radar_data = await asyncio.gather(
        ScoringService.current(user.id),
        ScoringService.radar(user.id),
    )
    return send_success({**score, "radar": radar_data}, "Score breakdown fetched")


@router.post("/score/recalculate")
async def recalculate(user: AuthenticatedUser = Depends(get_current_user)):
    result = await ScoringService.recalculate(user.id)
    return send_success(result, "Score recalculated")
