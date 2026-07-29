import asyncio
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends

from app.database import supabase_admin
from app.dependencies import get_current_user, AuthenticatedUser
from app.utils.api_util import send_success
from app.utils.db_util import get_profile_or_throw


DEFAULT_SCORE = {
    "skillsMatchPercentage": 35,
    "projectQualityScore": 20,
    "activityConsistencyScore": 15,
    "finalScore": 30,
}

DEFAULT_CONSISTENCY = {
    "active_days": 0,
    "consistency_score": 0,
    "graph": [],
}


async def _safe(loader, fallback, timeout_ms=1200):
    try:
        return await asyncio.wait_for(
            asyncio.ensure_future(loader) if not asyncio.iscoroutine(loader) else loader,
            timeout=timeout_ms / 1000,
        )
    except Exception:
        return fallback


async def fast_profile_bundle(user_id: str) -> dict:
    profile = get_profile_or_throw(user_id)

    async def fetch_roles():
        resp = supabase_admin.table("target_roles").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
        return resp.data or []

    async def fetch_skills():
        resp = supabase_admin.table("user_skills").select("*").eq("user_id", user_id).order("skill_name").execute()
        return resp.data or []

    async def fetch_certificates():
        resp = supabase_admin.table("certificates").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
        return resp.data or []

    async def fetch_github_proofs():
        resp = supabase_admin.table("github_proofs").select("*").eq("user_id", user_id).order("last_synced", desc=True).execute()
        return resp.data or []

    async def fetch_xp():
        resp = supabase_admin.table("user_xp").select("*").eq("user_id", user_id).maybe_single().execute()
        return resp.data or None

    roles, skills, certificates, github_proofs, xp = await asyncio.gather(
        _safe(fetch_roles(), [], 500),
        _safe(fetch_skills(), [], 500),
        _safe(fetch_certificates(), [], 500),
        _safe(fetch_github_proofs(), [], 500),
        _safe(fetch_xp(), None, 500),
    )

    return {
        "profile": profile,
        "target_roles": roles,
        "skills": skills,
        "certificates": certificates,
        "github_proofs": github_proofs,
        "xp": xp,
    }


async def _get_score(user_id: str) -> dict:
    try:
        from app.modules.scoring.routes import ScoringService
        return await _safe(ScoringService.fast_current(user_id), DEFAULT_SCORE)
    except Exception:
        return DEFAULT_SCORE


async def _get_roadmap(user_id: str):
    try:
        from app.modules.roadmap.routes import RoadmapService
        return await _safe(RoadmapService.get_or_generate(user_id), None)
    except Exception:
        return None


async def _get_benchmark(user_id: str):
    try:
        from app.modules.peer_benchmark.routes import PeerBenchmarkService
        return await _safe(PeerBenchmarkService.get_mine(user_id), None)
    except Exception:
        return None


async def _get_matches(user_id: str) -> list:
    try:
        from app.modules.hire_me.routes import HireMeService
        return await _safe(HireMeService.get_matches(user_id), [])
    except Exception:
        return []


async def _get_analysis(user_id: str):
    try:
        from app.modules.skill_gap.routes import SkillGapService
        return await _safe(SkillGapService.latest(user_id), None)
    except Exception:
        return None


async def _get_risk(user_id: str):
    try:
        from app.modules.failure_prediction.routes import FailurePredictionService
        return await _safe(FailurePredictionService.predict(user_id), None)
    except Exception:
        return None


async def _get_consistency(user_id: str) -> dict:
    try:
        from app.modules.execution_tracker.routes import ExecutionTrackerService
        return await _safe(ExecutionTrackerService.get_consistency(user_id), DEFAULT_CONSISTENCY)
    except Exception:
        return DEFAULT_CONSISTENCY


router = APIRouter()


@router.get("/dashboard")
async def get_dashboard(user: AuthenticatedUser = Depends(get_current_user)):
    user_id = user.id

    profile, score, roadmap, benchmark, matches, analysis, risk, consistency = await asyncio.gather(
        fast_profile_bundle(user_id),
        _get_score(user_id),
        _get_roadmap(user_id),
        _get_benchmark(user_id),
        _get_matches(user_id),
        _get_analysis(user_id),
        _get_risk(user_id),
        _get_consistency(user_id),
    )

    asyncio.ensure_future(_stale_analysis_refresh(user_id))

    return send_success({
        "profile": profile,
        "score": score,
        "roadmap": roadmap,
        "benchmark": benchmark,
        "matches": (matches or [])[:5],
        "analysis": analysis,
        "risk": risk,
        "consistency": consistency,
    }, "Dashboard fetched")


async def _stale_analysis_refresh(user_id: str):
    try:
        from app.modules.skill_gap.routes import SkillGapService
        from app.modules.scoring.routes import ScoringService
        from app.modules.peer_benchmark.routes import PeerBenchmarkService
        from app.modules.hire_me.routes import HireMeService

        latest = await SkillGapService.latest(user_id)
        analysis_age = float("inf")
        if latest and latest.get("created_at"):
            created = datetime.fromisoformat(latest["created_at"].replace("Z", "+00:00"))
            now = datetime.now(timezone.utc)
            analysis_age = (now - created).total_seconds() * 1000

        if analysis_age > 24 * 60 * 60 * 1000:
            await SkillGapService.analyze(user_id)
            await ScoringService.recalculate(user_id)
            await PeerBenchmarkService.recalculate(user_id)

        try:
            matches = await HireMeService.get_top_matches(user_id, 50)
            # Attempt to cache matches if redis available
        except Exception:
            pass
    except Exception:
        pass


@router.post("/dashboard/trigger-analysis")
async def trigger_analysis(user: AuthenticatedUser = Depends(get_current_user)):
    user_id = user.id

    asyncio.ensure_future(_run_full_analysis(user_id))

    return send_success({"queued": True}, "Analysis queued")


async def _run_full_analysis(user_id: str):
    try:
        from app.modules.skill_gap.routes import SkillGapService
        from app.modules.scoring.routes import ScoringService
        from app.modules.peer_benchmark.routes import PeerBenchmarkService

        await SkillGapService.analyze(user_id)
        await ScoringService.recalculate(user_id)
        await PeerBenchmarkService.recalculate(user_id)
    except Exception:
        pass
