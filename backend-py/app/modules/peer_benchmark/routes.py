from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends

from app.database import supabase_admin
from app.dependencies import get_current_user, AuthenticatedUser
from app.utils.api_util import send_success
from app.utils.error_util import AppError
from app.utils.logger import logger

router = APIRouter()


class PeerBenchmarkService:

    @staticmethod
    async def get_mine(user_id: str) -> dict:
        response = supabase_admin.table("peer_benchmarks").select("*").eq("user_id", user_id).maybe_single().execute()
        if not response.data:
            return {
                "totalScore": 0,
                "skillScore": 0,
                "projectScore": 0,
                "consistencyScore": 0,
                "percentile": 0,
                "rank": 0,
                "totalUsers": 0,
            }
        row = response.data
        return {
            "totalScore": row.get("total_score", 0),
            "skillScore": row.get("skill_score", 0),
            "projectScore": row.get("project_score", 0),
            "consistencyScore": row.get("consistency_score", 0),
            "percentile": row.get("percentile", 0),
            "rank": row.get("rank", 0),
            "totalUsers": row.get("total_users", 0),
        }

    @staticmethod
    async def get_global() -> list[dict]:
        response = supabase_admin.table("peer_benchmarks").select("*").order("total_score", desc=True).limit(100).execute()
        data = response.data or []
        return [
            {
                "userId": row["user_id"],
                "totalScore": row.get("total_score", 0),
                "skillScore": row.get("skill_score", 0),
                "projectScore": row.get("project_score", 0),
                "consistencyScore": row.get("consistency_score", 0),
                "percentile": row.get("percentile", 0),
                "rank": row.get("rank", 0),
            }
            for row in data
        ]

    @staticmethod
    async def recalculate(user_id: str) -> dict:
        from app.modules.scoring.routes import ScoringService

        score = await ScoringService.current(user_id)
        total_score = score.get("finalScore", 0)

        all_users = supabase_admin.table("peer_benchmarks").select("user_id, total_score").execute()
        all_rows = all_users.data or []

        sorted_scores = sorted(
            [r["total_score"] for r in all_rows if r.get("total_score") is not None] + [total_score],
            reverse=True,
        )
        total_count = len(sorted_scores)
        rank = next(i for i, s in enumerate(sorted_scores) if s <= total_score) + 1 if total_count else 1
        percentile = round(((total_count - rank) / total_count) * 100, 2) if total_count > 1 else 100.0

        payload = {
            "user_id": user_id,
            "total_score": round(total_score, 2),
            "skill_score": round(score.get("skillsMatchPercentage", 0), 2),
            "project_score": round(score.get("projectQualityScore", 0), 2),
            "consistency_score": round(score.get("activityConsistencyScore", 0), 2),
            "percentile": percentile,
            "rank": rank,
            "total_users": total_count,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }

        existing = supabase_admin.table("peer_benchmarks").select("id").eq("user_id", user_id).maybe_single().execute()
        if existing.data:
            supabase_admin.table("peer_benchmarks").update(payload).eq("user_id", user_id).execute()
        else:
            payload["created_at"] = datetime.now(timezone.utc).isoformat()
            supabase_admin.table("peer_benchmarks").insert(payload).execute()

        logger.info(f"Peer benchmark recalculated for user {user_id}: rank {rank}/{total_count}")
        return await PeerBenchmarkService.get_mine(user_id)


@router.get("/peer-benchmark")
async def get_benchmark(user: AuthenticatedUser = Depends(get_current_user)):
    result = await PeerBenchmarkService.get_mine(user.id)
    return send_success(result, "Peer benchmark fetched")


@router.get("/peer-benchmark/global")
async def get_global_benchmarks(user: AuthenticatedUser = Depends(get_current_user)):
    result = await PeerBenchmarkService.get_global()
    return send_success(result, "Global benchmarks fetched")


@router.post("/peer-benchmark/recalculate")
async def recalculate_benchmark(user: AuthenticatedUser = Depends(get_current_user)):
    result = await PeerBenchmarkService.recalculate(user.id)
    return send_success(result, "Peer benchmark recalculated")
