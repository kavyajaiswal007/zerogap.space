import asyncio
import re
from datetime import datetime, timedelta
from typing import Optional, Any
from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.database import supabase_admin
from app.dependencies import get_current_user, AuthenticatedUser
from app.utils.api_util import send_success
from app.utils.claude_util import get_claude_json
from app.utils.error_util import AppError
from app.utils.db_util import get_active_target_role, get_user_skills

router = APIRouter()

STOCK_USER_SKILLS = [
    {"skill_name": "React", "proficiency_level": 65},
    {"skill_name": "JavaScript", "proficiency_level": 70},
    {"skill_name": "TypeScript", "proficiency_level": 55},
]

SKILL_ALIASES: dict[str, list[str]] = {
    "javascript": ["js", "ecmascript"],
    "typescript": ["ts"],
    "node js": ["nodejs", "node"],
    "express js": ["express"],
    "rest apis": ["api", "apis", "rest api"],
    "postgresql": ["postgres", "sql"],
    "tailwind css": ["tailwind"],
    "html css": ["html", "css"],
}


def normalize_skill_name(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", value.lower()).strip()


def fuzzy_skill_match(required: str, actual: str) -> bool:
    left = normalize_skill_name(required)
    right = normalize_skill_name(actual)
    if not left or not right:
        return False
    if left == right or left in right or right in left:
        return True
    aliases = SKILL_ALIASES.get(left, [])
    return any(normalize_skill_name(a) == right for a in aliases)


def fallback_skills_for_role(role: str) -> list[str]:
    normalized = role.lower()
    if "frontend" in normalized or "react" in normalized:
        return ["HTML", "CSS", "JavaScript", "TypeScript", "React", "Git", "REST APIs", "Testing"]
    if "backend" in normalized or "node" in normalized:
        return ["JavaScript", "TypeScript", "Node.js", "Express.js", "SQL", "PostgreSQL", "Git", "APIs"]
    if "data" in normalized or "analyst" in normalized:
        return ["Python", "SQL", "Statistics", "Excel", "Data Visualization", "Pandas", "Dashboards", "Communication"]
    if "ai" in normalized or "ml" in normalized or "machine" in normalized:
        return ["Python", "Machine Learning", "Statistics", "SQL", "Data Cleaning", "Model Evaluation", "Git", "APIs"]
    return ["Problem Solving", "Git", "JavaScript", "SQL", "Communication", "APIs", "Testing", "Deployment"]


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


class AnalyzeInput(BaseModel):
    target_role_id: Optional[str] = None


class SkillGapService:

    @staticmethod
    async def ensure_target_role(user_id: str, target_role_id: Optional[str] = None) -> Optional[dict]:
        if target_role_id:
            response = supabase_admin.table("target_roles").select("*").eq("id", target_role_id).maybe_single().execute()
            return response.data

        existing = get_active_target_role(user_id)
        if existing:
            return existing

        response = supabase_admin.table("target_roles").insert({
            "user_id": user_id,
            "job_title": "Full Stack Developer",
            "experience_level": "fresher",
            "is_active": True,
        }).select().single().execute()

        if response.data:
            return response.data
        raise AppError("Failed to create target role", 500, "TARGET_ROLE_CREATE_FAILED")

    @staticmethod
    async def ensure_user_skills(user_id: str) -> list[dict]:
        existing = get_user_skills(user_id)
        if existing:
            return existing

        records = [
            {"user_id": user_id, **skill, "verified": False, "proof_type": "self_declared"}
            for skill in STOCK_USER_SKILLS
        ]
        response = supabase_admin.table("user_skills").upsert(
            records, on_conflict="user_id,skill_name"
        ).select().order("skill_name").execute()

        return response.data or existing

    @staticmethod
    async def get_market_skills(role: str) -> list[dict]:
        response = supabase_admin.table("skill_matrix").select("*").eq("job_title", role).order("market_demand_score", desc=True).execute()
        matrix = response.data or []

        if len(matrix) < 5:
            skills = fallback_skills_for_role(role)

            if skills:
                supabase_admin.table("skill_matrix").upsert(
                    [
                        {
                            "job_title": role,
                            "skill_name": s,
                            "skill_category": "market",
                            "is_mandatory": True,
                            "market_demand_score": 80,
                        }
                        for s in skills
                    ],
                    on_conflict="job_title,skill_name",
                ).execute()

            existing_names = {str(row["skill_name"]).lower() for row in matrix}
            matrix = matrix + [
                {"skill_name": s, "market_demand_score": 80, "is_mandatory": True}
                for s in skills
                if s.lower() not in existing_names
            ]

        return matrix

    @staticmethod
    async def enrich_analysis_with_ai(
        target_role: str,
        user_skills: list[dict],
        matched: list[str],
        partial: list[str],
        missing: list[str],
    ) -> dict:
        dedup_missing = list(dict.fromkeys(missing + fallback_skills_for_role(target_role) + ["System Design", "Testing Strategy", "Cloud Deployment", "Product Thinking"]))[:12]
        dedup_partial = list(dict.fromkeys(partial + [s["skill_name"] for s in user_skills] + ["API Design", "Database Optimization", "Performance Debugging", "GitHub Actions", "Resume Proof Writing"]))[:15]

        fallback_skill_scores = {s: max(52, 92 - i * 3) for i, s in enumerate(dedup_missing)}

        fallback = {
            "missing_skills": dedup_missing,
            "partial_skills": dedup_partial,
            "missing_skill_reasons": [
                {"skill": s, "reason": f"{s} is important for {target_role} interviews and production-ready project work."}
                for s in dedup_missing
            ],
            "recommended_resources": [
                {"title": f"{target_role} project roadmap", "type": "playlist", "url": "https://www.youtube.com/@freecodecamp", "reason": "Builds role-specific proof projects and interview vocabulary."},
                {"title": "System Design fundamentals", "type": "playlist", "url": "https://www.youtube.com/@GauravSensei", "reason": "Improves architecture discussion for interviews."},
                {"title": "Testing and deployment practice", "type": "docs", "url": "https://docs.github.com/en/actions", "reason": "Turns projects into recruiter-ready production proof."},
            ],
            "skill_scores": fallback_skill_scores,
            "estimated_readiness_weeks": 8,
        }

        system = "You are a senior career analyst for ZeroGap.\nGenerate 8-12 missing skills and 10-15 partial skills. Be specific about what is missing for the target role. Each missing skill should include a reason why it matters. Also return skill_scores mapping every missing skill to a predicted market demand score from 0 to 100.\nReturn ONLY valid JSON, no markdown."

        prompt = f"Target role: {target_role}\nUser skills: {user_skills}\nMatched skills: {', '.join(matched)}\nPartial skills: {', '.join(partial)}\nMissing skills: {', '.join(missing)}\n\nReturn this JSON:\n{{\n  \"missing_skills\": [\"8-12 skill names\"],\n  \"partial_skills\": [\"10-15 skill names the user has but must improve\"],\n  \"missing_skill_reasons\": [{{\"skill\": \"System Design\", \"reason\": \"Why this matters for the target role\"}}],\n  \"recommended_resources\": [{{\"title\": \"resource title\", \"type\": \"playlist/course/docs\", \"url\": \"https://...\", \"reason\": \"why it helps\"}}],\n  \"skill_scores\": {{\"System Design\": 94, \"Testing Strategy\": 81}},\n  \"estimated_readiness_weeks\": 8\n}}"

        return await get_claude_json(system, prompt, fallback)

    @staticmethod
    async def analyze(user_id: str, target_role_id: Optional[str] = None) -> dict:
        user_skills, target_role = await asyncio.gather(
            SkillGapService.ensure_user_skills(user_id),
            SkillGapService.ensure_target_role(user_id, target_role_id),
        )

        if not target_role:
            raise AppError("Target role not found", 404, "TARGET_ROLE_NOT_FOUND")

        required_skills = await SkillGapService.get_market_skills(target_role["job_title"])

        def find_user_skill(required_name: str):
            return next(
                (s for s in user_skills if fuzzy_skill_match(required_name, s["skill_name"])),
                None,
            )

        matched = [
            r["skill_name"] for r in required_skills
            if (us := find_user_skill(r["skill_name"])) and us["proficiency_level"] is not None and us["proficiency_level"] >= 60
        ]
        partial = [
            r["skill_name"] for r in required_skills
            if (us := find_user_skill(r["skill_name"])) and us["proficiency_level"] is not None and us["proficiency_level"] < 60
        ]
        missing = [
            r["skill_name"] for r in required_skills
            if not find_user_skill(r["skill_name"])
        ]

        skills_match_pct = round((len(matched) / len(required_skills)) * 100, 2) if required_skills else 0

        proofs_resp = supabase_admin.table("github_proofs").select("quality_score").eq("user_id", user_id).execute()
        proofs = proofs_resp.data or []
        project_quality = round(sum(float(p.get("quality_score", 0) or 0) for p in proofs) / len(proofs), 2) if proofs else 0

        consistency = await get_consistency(user_id)
        breakdown = calculate_skill_score(skills_match_pct, project_quality, consistency["consistency_score"])

        enriched = await SkillGapService.enrich_analysis_with_ai(
            target_role["job_title"], user_skills, matched, partial, missing,
        )

        enriched_missing = enriched.get("missing_skills") or missing
        enriched_partial = enriched.get("partial_skills") or partial
        skill_scores = enriched.get("skill_scores") or {
            s: max(52, 92 - i * 3) for i, s in enumerate(enriched_missing)
        }

        analysis_payload = {
            "user_id": user_id,
            "target_role_id": target_role["id"],
            "skill_score": breakdown["finalScore"],
            "matched_skills": matched,
            "missing_skills": enriched_missing,
            "partial_skills": enriched_partial,
            "skills_match_percentage": breakdown["skillsMatchPercentage"],
            "project_quality_score": breakdown["projectQualityScore"],
            "activity_consistency_score": breakdown["activityConsistencyScore"],
            "analysis_data": {
                "required_skills_count": len(required_skills),
                "target_role": target_role["job_title"],
                "recommended_resources": enriched.get("recommended_resources", []),
                "estimated_readiness_weeks": enriched.get("estimated_readiness_weeks", 8),
                "missing_skill_reasons": enriched.get("missing_skill_reasons", []),
                "skill_scores": skill_scores,
            },
        }

        response = supabase_admin.table("skill_gap_analyses").insert(analysis_payload).select().single().execute()
        if not response.data:
            raise AppError("Failed to create skill gap analysis", 500, "SKILL_GAP_ANALYSIS_FAILED")

        return response.data

    @staticmethod
    async def latest(user_id: str) -> Optional[dict]:
        response = supabase_admin.table("skill_gap_analyses").select("*").eq("user_id", user_id).order("created_at", desc=True).limit(1).maybe_single().execute()
        return response.data

    @staticmethod
    async def history(user_id: str) -> list[dict]:
        response = supabase_admin.table("skill_gap_analyses").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
        return response.data or []


@router.post("/skill-gap/analyze")
async def analyze(input_data: Optional[AnalyzeInput] = None, user: AuthenticatedUser = Depends(get_current_user)):
    target_role_id = input_data.target_role_id if input_data else None
    result = await SkillGapService.analyze(user.id, target_role_id)
    return send_success(result, "Skill gap analysis complete")


@router.get("/skill-gap/latest")
async def get_latest(user: AuthenticatedUser = Depends(get_current_user)):
    result = await SkillGapService.latest(user.id)
    return send_success(result, "Latest skill gap fetched")


@router.get("/skill-gap/history")
async def get_history(user: AuthenticatedUser = Depends(get_current_user)):
    result = await SkillGapService.history(user.id)
    return send_success(result, "Skill gap history fetched")


@router.get("/skill-gap/missing-skills")
async def get_missing_skills(user: AuthenticatedUser = Depends(get_current_user)):
    latest = await SkillGapService.latest(user.id)
    return send_success(latest.get("missing_skills", []) if latest else [], "Missing skills fetched")


@router.get("/skill-gap/market-skills/{role}")
async def get_market_skills(role: str, user: AuthenticatedUser = Depends(get_current_user)):
    result = await SkillGapService.get_market_skills(role)
    return send_success(result, "Market skills fetched")
