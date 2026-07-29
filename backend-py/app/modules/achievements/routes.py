from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends

from app.database import supabase_admin
from app.dependencies import get_current_user, AuthenticatedUser
from app.utils.api_util import send_success
from app.utils.error_util import AppError
from app.utils.logger import logger

router = APIRouter()

ACHIEVEMENT_DEFINITIONS = [
    {
        "key": "first_login",
        "name": "First Login",
        "description": "Logged into the platform for the first time",
        "icon": "🚀",
        "criteria_type": "login",
        "criteria_value": 1,
    },
    {
        "key": "skill_master",
        "name": "Skill Master",
        "description": "Reached 80%+ proficiency in any skill",
        "icon": "💡",
        "criteria_type": "skill_proficiency",
        "criteria_value": 80,
    },
    {
        "key": "roadmap_complete",
        "name": "Roadmap Complete",
        "description": "Completed a full skill roadmap",
        "icon": "🏆",
        "criteria_type": "roadmap_completion",
        "criteria_value": 100,
    },
    {
        "key": "streak_10",
        "name": "10 Days Streak",
        "description": "Maintained a 10-day activity streak",
        "icon": "🔥",
        "criteria_type": "streak",
        "criteria_value": 10,
    },
    {
        "key": "streak_30",
        "name": "Monthly Warrior",
        "description": "Maintained a 30-day activity streak",
        "icon": "⚡",
        "criteria_type": "streak",
        "criteria_value": 30,
    },
    {
        "key": "score_80",
        "name": "Top Scorer",
        "description": "Achieved a skill score of 80 or above",
        "icon": "📈",
        "criteria_type": "skill_score",
        "criteria_value": 80,
    },
    {
        "key": "first_project",
        "name": "Project Starter",
        "description": "Added your first project proof",
        "icon": "📁",
        "criteria_type": "project_count",
        "criteria_value": 1,
    },
    {
        "key": "five_projects",
        "name": "Portfolio Builder",
        "description": "Added 5 project proofs",
        "icon": "📂",
        "criteria_type": "project_count",
        "criteria_value": 5,
    },
    {
        "key": "target_role_set",
        "name": "Goal Setter",
        "description": "Set a target role",
        "icon": "🎯",
        "criteria_type": "target_role",
        "criteria_value": 1,
    },
    {
        "key": "skill_explorer",
        "name": "Skill Explorer",
        "description": "Added 10+ skills to your profile",
        "icon": "🧠",
        "criteria_type": "skill_count",
        "criteria_value": 10,
    },
]


class AchievementsService:

    @staticmethod
    async def ensure_seeded():
        existing = supabase_admin.table("achievement_definitions").select("key").execute()
        existing_keys = {r["key"] for r in (existing.data or [])}

        new_defs = [d for d in ACHIEVEMENT_DEFINITIONS if d["key"] not in existing_keys]
        if new_defs:
            now = datetime.now(timezone.utc).isoformat()
            for d in new_defs:
                d["created_at"] = now
            supabase_admin.table("achievement_definitions").insert(new_defs).execute()
            logger.info(f"Seeded {len(new_defs)} achievement definitions")

    @staticmethod
    async def get_user_achievements(user_id: str) -> list[dict]:
        await AchievementsService.ensure_seeded()

        response = supabase_admin.table("user_achievements").select(
            "id, achievement_id, unlocked_at, metadata, achievement_definitions!inner(key, name, description, icon, criteria_type, criteria_value)"
        ).eq("user_id", user_id).order("unlocked_at", desc=True).execute()

        return [
            {
                "id": row["id"],
                "achievementId": row["achievement_id"],
                "key": row["achievement_definitions"]["key"],
                "name": row["achievement_definitions"]["name"],
                "description": row["achievement_definitions"]["description"],
                "icon": row["achievement_definitions"]["icon"],
                "unlockedAt": row["unlocked_at"],
                "metadata": row.get("metadata"),
            }
            for row in (response.data or [])
        ]

    @staticmethod
    async def check_and_award(user_id: str) -> list[dict]:
        await AchievementsService.ensure_seeded()

        defs_response = supabase_admin.table("achievement_definitions").select("*").execute()
        definitions = defs_response.data or []

        user_achievements = supabase_admin.table("user_achievements").select("achievement_id").eq("user_id", user_id).execute()
        unlocked_ids = {r["achievement_id"] for r in (user_achievements.data or [])}

        new_awards = []

        for definition in definitions:
            if definition["id"] in unlocked_ids:
                continue

            criteria_type = definition["criteria_type"]
            criteria_value = definition["criteria_value"]
            awarded = False
            metadata = {}

            if criteria_type == "login":
                profile = supabase_admin.table("profiles").select("created_at").eq("id", user_id).maybe_single().execute()
                if profile.data:
                    awarded = True

            elif criteria_type == "skill_proficiency":
                skills = supabase_admin.table("user_skills").select("proficiency_level").eq("user_id", user_id).execute()
                max_prof = max((float(s.get("proficiency_level", 0) or 0) for s in (skills.data or [])), default=0)
                if max_prof >= criteria_value:
                    awarded = True
                    metadata["maxProficiency"] = max_prof

            elif criteria_type == "roadmap_completion":
                roadmaps = supabase_admin.table("roadmaps").select("progress_percentage").eq("user_id", user_id).execute()
                if any((r.get("progress_percentage", 0) or 0) >= criteria_value for r in (roadmaps.data or [])):
                    awarded = True

            elif criteria_type == "streak":
                logs = supabase_admin.table("execution_logs").select("date").eq("user_id", user_id).order("date", desc=True).execute()
                if logs.data:
                    dates = sorted({r["date"] for r in logs.data}, reverse=True)
                    streak = 1
                    for i in range(len(dates) - 1):
                        from datetime import timedelta
                        curr = datetime.strptime(dates[i], "%Y-%m-%d").date()
                        prev = datetime.strptime(dates[i + 1], "%Y-%m-%d").date()
                        if (curr - prev).days == 1:
                            streak += 1
                        else:
                            break
                    if streak >= criteria_value:
                        awarded = True
                        metadata["streak"] = streak

            elif criteria_type == "skill_score":
                analyses = supabase_admin.table("skill_gap_analyses").select("skill_score").eq("user_id", user_id).order("created_at", desc=True).limit(1).execute()
                score = float((analyses.data or [{}])[0].get("skill_score", 0) or 0)
                if score >= criteria_value:
                    awarded = True
                    metadata["skillScore"] = score

            elif criteria_type == "project_count":
                projects = supabase_admin.table("github_proofs").select("id").eq("user_id", user_id).execute()
                if len(projects.data or []) >= criteria_value:
                    awarded = True
                    metadata["projectCount"] = len(projects.data or [])

            elif criteria_type == "target_role":
                roles = supabase_admin.table("target_roles").select("id").eq("user_id", user_id).execute()
                if len(roles.data or []) >= criteria_value:
                    awarded = True

            elif criteria_type == "skill_count":
                skills = supabase_admin.table("user_skills").select("id").eq("user_id", user_id).execute()
                if len(skills.data or []) >= criteria_value:
                    awarded = True
                    metadata["skillCount"] = len(skills.data or [])

            if awarded:
                now = datetime.now(timezone.utc).isoformat()
                supabase_admin.table("user_achievements").insert({
                    "user_id": user_id,
                    "achievement_id": definition["id"],
                    "unlocked_at": now,
                    "metadata": metadata,
                }).execute()
                new_awards.append({
                    "key": definition["key"],
                    "name": definition["name"],
                    "description": definition["description"],
                    "icon": definition["icon"],
                    "unlockedAt": now,
                    "metadata": metadata,
                })
                logger.info(f"Achievement '{definition['key']}' awarded to user {user_id}")

        return new_awards


@router.get("/achievements")
async def get_achievements(user: AuthenticatedUser = Depends(get_current_user)):
    result = await AchievementsService.get_user_achievements(user.id)
    return send_success(result, "Achievements fetched")


@router.post("/achievements/check")
async def check_achievements(user: AuthenticatedUser = Depends(get_current_user)):
    new_awards = await AchievementsService.check_and_award(user.id)
    return send_success(new_awards, "Achievements checked and awarded")
