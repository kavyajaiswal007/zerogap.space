import uuid
from typing import Any
from fastapi import APIRouter, Depends
from app.database import supabase_admin
from app.utils.claude_util import get_claude_json
from app.utils.db_util import get_active_target_role, get_latest_skill_gap_analysis, get_profile_or_throw, get_user_skills
from app.utils.error_util import AppError
from app.dependencies import get_current_user, AuthenticatedUser
from app.utils.api_util import send_success

router = APIRouter()


def default_roadmap(role: str = "Software Engineer") -> dict:
    return {
        "title": f"{role} Job-Ready Roadmap",
        "estimated_weeks": 16,
        "stages": [
            {
                "stage_number": 1,
                "title": "Fundamentals",
                "description": "Strengthen core concepts and close foundational gaps.",
                "skills_to_learn": ["JavaScript", "Git", "Problem Solving"],
                "resources": [],
                "projects": [],
                "estimated_weeks": 4,
                "tasks": [
                    {"title": "Refresh core syntax", "description": "Practice fundamentals daily", "task_type": "learn", "estimated_hours": 8, "xp_reward": 50},
                ],
            },
            {
                "stage_number": 2,
                "title": "Core Skills",
                "description": "Learn role-critical skills and build confidence.",
                "skills_to_learn": ["React", "APIs", "SQL"],
                "resources": [],
                "projects": [],
                "estimated_weeks": 4,
                "tasks": [
                    {"title": "Build a feature app", "description": "Create a mini production feature", "task_type": "build", "estimated_hours": 12, "xp_reward": 75},
                ],
            },
            {
                "stage_number": 3,
                "title": "Advanced",
                "description": "Move into advanced tools and system-level thinking.",
                "skills_to_learn": ["Testing", "Performance", "Deployment"],
                "resources": [],
                "projects": [],
                "estimated_weeks": 4,
                "tasks": [
                    {"title": "Ship with tests", "description": "Add automated coverage", "task_type": "practice", "estimated_hours": 10, "xp_reward": 75},
                ],
            },
            {
                "stage_number": 4,
                "title": "Projects & Portfolio",
                "description": "Turn learning into visible proof and job applications.",
                "skills_to_learn": ["Portfolio", "Resume", "Interview Prep"],
                "resources": [],
                "projects": [],
                "estimated_weeks": 4,
                "tasks": [
                    {"title": "Polish portfolio project", "description": "Publish final portfolio-ready work", "task_type": "apply", "estimated_hours": 12, "xp_reward": 100},
                ],
            },
        ],
    }


class RoadmapService:

    @staticmethod
    async def _ensure_target_role(user_id: str) -> dict:
        existing = get_active_target_role(user_id)
        if existing:
            return existing

        response = supabase_admin.table("target_roles").insert({
            "user_id": user_id,
            "job_title": "Full Stack Developer",
            "experience_level": "fresher",
            "is_active": True,
        }).select().single().execute()

        if response.error:
            raise AppError(response.error.message, 500, "TARGET_ROLE_CREATE_FAILED")
        return response.data

    @staticmethod
    async def generate(user_id: str) -> dict:
        profile = get_profile_or_throw(user_id)
        target_role = await RoadmapService._ensure_target_role(user_id)
        skills = get_user_skills(user_id)
        analysis = get_latest_skill_gap_analysis(user_id)

        fallback = default_roadmap(target_role.get("job_title", "Software Engineer"))

        system_prompt = (
            "You are an expert career coach and curriculum designer. "
            "Generate a personalized 4-stage learning roadmap with exact JSON output."
        )
        user_prompt = (
            f"Input:\n"
            f"Current skills: {skills}\n"
            f"Missing skills: {analysis.get('missing_skills', []) if analysis else []}\n"
            f"Target role: {target_role.get('job_title', 'Software Engineer')}\n"
            f"Time availability per day: {profile.get('time_availability_hours', 'N/A')}\n"
            f"Learning style: {profile.get('learning_style', 'N/A')}\n"
            f"Graduation year: {profile.get('graduation_year', 'N/A')}\n\n"
            'Return JSON:\n'
            '{\n'
            '  "title": string,\n'
            '  "estimated_weeks": number,\n'
            '  "stages": [{\n'
            '    "stage_number": 1,\n'
            '    "title": string,\n'
            '    "description": string,\n'
            '    "skills_to_learn": string[],\n'
            '    "resources": [{"name": string, "url": string, "type": "video"|"article"|"course"|"book", "platform": string, "is_free": boolean}],\n'
            '    "projects": [{"name": string, "description": string, "skills_practiced": string[], "difficulty": string, "github_template_url": string}],\n'
            '    "estimated_weeks": number,\n'
            '    "tasks": [{"title": string, "description": string, "task_type": "learn"|"build"|"practice"|"certify"|"apply", "resource_url": string, "estimated_hours": number, "xp_reward": number}]\n'
            '  }]\n'
            '}'
        )

        roadmap = await get_claude_json(system_prompt, user_prompt, fallback)

        supabase_admin.table("roadmaps").update({"is_active": False}).eq("user_id", user_id).execute()

        created = supabase_admin.table("roadmaps").insert({
            "user_id": user_id,
            "target_role_id": target_role["id"],
            "title": roadmap["title"],
            "estimated_weeks": roadmap["estimated_weeks"],
            "total_stages": len(roadmap["stages"]),
            "is_active": True,
            "generated_by_ai": True,
        }).select().single().execute()

        if created.error:
            raise AppError(created.error.message, 500, "ROADMAP_CREATE_FAILED")

        created_roadmap = created.data

        for stage in roadmap["stages"]:
            stage_row = supabase_admin.table("roadmap_stages").insert({
                "roadmap_id": created_roadmap["id"],
                "stage_number": stage["stage_number"],
                "title": stage["title"],
                "description": stage["description"],
                "skills_to_learn": stage.get("skills_to_learn", []),
                "resources": stage.get("resources", []),
                "projects": stage.get("projects", []),
                "estimated_weeks": stage.get("estimated_weeks", 4),
                "order_index": stage["stage_number"],
            }).select().single().execute()

            if stage.get("tasks") and stage_row.data:
                tasks_data = [
                    {
                        "id": str(uuid.uuid4()),
                        "stage_id": stage_row.data["id"],
                        "user_id": user_id,
                        "title": task["title"],
                        "description": task.get("description", ""),
                        "task_type": task.get("task_type", "learn"),
                        "resource_url": task.get("resource_url", ""),
                        "estimated_hours": task.get("estimated_hours", 1),
                        "xp_reward": task.get("xp_reward", 50),
                    }
                    for task in stage["tasks"]
                ]
                supabase_admin.table("roadmap_tasks").insert(tasks_data).execute()

        return await RoadmapService._get_roadmap(created_roadmap["id"])

    @staticmethod
    async def get_active(user_id: str) -> Any:
        response = supabase_admin.table("roadmaps").select("*").eq("user_id", user_id).eq("is_active", True).maybe_single().execute()
        if not response.data:
            return None
        return await RoadmapService._get_roadmap(response.data["id"])

    @staticmethod
    async def progress(user_id: str) -> Any:
        roadmap = await RoadmapService.get_active(user_id)
        if not roadmap:
            return None

        stages = roadmap.get("stages", [])
        tasks = [t for s in stages for t in s.get("tasks", [])]

        return {
            "roadmap_id": roadmap["id"],
            "completion_percentage": roadmap.get("completion_percentage", 0),
            "completed_stages": sum(1 for s in stages if s.get("is_completed")),
            "total_stages": len(stages),
            "completed_tasks": sum(1 for t in tasks if t.get("is_completed")),
            "total_tasks": len(tasks),
        }

    @staticmethod
    async def get_roadmap(roadmap_id: str) -> dict:
        response = supabase_admin.table("roadmaps").select("*").eq("id", roadmap_id).single().execute()
        if response.error:
            raise AppError(response.error.message, 500, "DB_ERROR")
        return await RoadmapService._get_roadmap(response.data["id"])

    @staticmethod
    async def _get_roadmap(roadmap_id: str) -> dict:
        roadmap_resp = supabase_admin.table("roadmaps").select("*").eq("id", roadmap_id).single().execute()
        if roadmap_resp.error:
            raise AppError(roadmap_resp.error.message, 500, "DB_ERROR")
        roadmap = roadmap_resp.data

        stages_resp = supabase_admin.table("roadmap_stages").select("*").eq("roadmap_id", roadmap_id).order("stage_number").execute()
        stages = stages_resp.data or []

        stage_ids = [s["id"] for s in stages]
        tasks = []
        if stage_ids:
            tasks_resp = supabase_admin.table("roadmap_tasks").select("*").in_("stage_id", stage_ids).order("created_at").execute()
            tasks = tasks_resp.data or []

        tasks_by_stage: dict[str, list[dict]] = {}
        for t in tasks:
            tasks_by_stage.setdefault(t["stage_id"], []).append(t)

        roadmap["stages"] = [
            {**s, "tasks": tasks_by_stage.get(s["id"], [])}
            for s in stages
        ]

        return roadmap

    @staticmethod
    async def update_stage(user_id: str, roadmap_id: str, stage_id: str, completion_percentage: float) -> dict:
        supabase_admin.table("roadmap_stages").update({
            "completion_percentage": completion_percentage,
            "is_completed": completion_percentage >= 100,
        }).eq("id", stage_id).execute()

        await RoadmapService._refresh_roadmap_completion(roadmap_id)
        return await RoadmapService._get_roadmap(roadmap_id)

    @staticmethod
    async def complete_task(user_id: str, task_id: str) -> dict:
        from datetime import datetime
        response = supabase_admin.table("roadmap_tasks").update({
            "is_completed": True,
            "completed_at": datetime.now().isoformat(),
        }).eq("id", task_id).eq("user_id", user_id).select().single().execute()

        if response.error or not response.data:
            raise AppError(
                response.error.message if response.error else "Task not found",
                404,
                "TASK_COMPLETE_FAILED",
            )

        task = response.data

        stage_resp = supabase_admin.table("roadmap_stages").select("id, roadmap_id").eq("id", task["stage_id"]).single().execute()
        if stage_resp.data:
            stage = stage_resp.data
            tasks_resp = supabase_admin.table("roadmap_tasks").select("id, is_completed").eq("stage_id", stage["id"]).execute()
            stage_tasks = tasks_resp.data or []
            total = len(stage_tasks)
            done = sum(1 for t in stage_tasks if t["is_completed"])

            supabase_admin.table("roadmap_stages").update({
                "completion_percentage": round((done / total * 100), 2) if total else 0,
                "is_completed": total > 0 and total == done,
            }).eq("id", stage["id"]).execute()

            await RoadmapService._refresh_roadmap_completion(stage["roadmap_id"])

        return task

    @staticmethod
    async def _refresh_roadmap_completion(roadmap_id: str) -> None:
        stages_resp = supabase_admin.table("roadmap_stages").select("completion_percentage").eq("roadmap_id", roadmap_id).execute()
        stages = stages_resp.data or []
        completion = round(
            sum(float(s.get("completion_percentage", 0)) for s in stages) / len(stages),
            2,
        ) if stages else 0

        from datetime import datetime
        supabase_admin.table("roadmaps").update({
            "completion_percentage": completion,
            "updated_at": datetime.now().isoformat(),
        }).eq("id", roadmap_id).execute()


@router.post("/roadmap/generate", status_code=201)
async def generate_roadmap(user: AuthenticatedUser = Depends(get_current_user)):
    result = await RoadmapService.generate(user.id)
    return send_success(result, "Roadmap generated", 201)


@router.get("/roadmap/active")
async def get_active_roadmap(user: AuthenticatedUser = Depends(get_current_user)):
    result = await RoadmapService.get_active(user.id)
    return send_success(result, "Active roadmap fetched")


@router.get("/roadmap/progress")
async def get_roadmap_progress(user: AuthenticatedUser = Depends(get_current_user)):
    result = await RoadmapService.progress(user.id)
    return send_success(result, "Roadmap progress fetched")


@router.get("/roadmap/{roadmap_id}")
async def get_roadmap_by_id(roadmap_id: str, user: AuthenticatedUser = Depends(get_current_user)):
    result = await RoadmapService.get_roadmap(roadmap_id)
    return send_success(result, "Roadmap fetched")


@router.put("/roadmap/{roadmap_id}/stage/{stage_id}")
async def update_roadmap_stage(
    roadmap_id: str,
    stage_id: str,
    body: dict,
    user: AuthenticatedUser = Depends(get_current_user),
):
    completion = body.get("completion_percentage", 0)
    result = await RoadmapService.update_stage(user.id, roadmap_id, stage_id, completion)
    return send_success(result, "Stage updated")


@router.put("/roadmap/task/{task_id}/complete")
async def complete_roadmap_task(
    task_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
):
    result = await RoadmapService.complete_task(user.id, task_id)
    return send_success(result, "Task completed")
