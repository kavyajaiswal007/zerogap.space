from app.utils.logger import logger
from app.database import supabase_admin


def seed_skill_matrix_if_empty():
    count = supabase_admin.table("skill_matrix").select("id", count="exact").execute()
    if count.count and count.count > 0:
        logger.info(f"Skill matrix already seeded ({count.count} rows)")
        return

    default_skills = [
        {"job_title": "Full Stack Developer", "skill_name": "JavaScript", "is_mandatory": True, "market_demand_score": 95},
        {"job_title": "Full Stack Developer", "skill_name": "React", "is_mandatory": True, "market_demand_score": 92},
        {"job_title": "Full Stack Developer", "skill_name": "Node.js", "is_mandatory": True, "market_demand_score": 90},
        {"job_title": "Full Stack Developer", "skill_name": "Python", "is_mandatory": False, "market_demand_score": 85},
        {"job_title": "Full Stack Developer", "skill_name": "TypeScript", "is_mandatory": True, "market_demand_score": 88},
        {"job_title": "Full Stack Developer", "skill_name": "SQL", "is_mandatory": True, "market_demand_score": 80},
        {"job_title": "Full Stack Developer", "skill_name": "Git", "is_mandatory": True, "market_demand_score": 75},
        {"job_title": "Backend Engineer", "skill_name": "Python", "is_mandatory": True, "market_demand_score": 95},
        {"job_title": "Backend Engineer", "skill_name": "FastAPI", "is_mandatory": True, "market_demand_score": 88},
        {"job_title": "Backend Engineer", "skill_name": "Docker", "is_mandatory": True, "market_demand_score": 85},
        {"job_title": "Backend Engineer", "skill_name": "PostgreSQL", "is_mandatory": True, "market_demand_score": 82},
        {"job_title": "Backend Engineer", "skill_name": "Redis", "is_mandatory": False, "market_demand_score": 78},
        {"job_title": "Frontend Developer", "skill_name": "React", "is_mandatory": True, "market_demand_score": 95},
        {"job_title": "Frontend Developer", "skill_name": "TypeScript", "is_mandatory": True, "market_demand_score": 90},
        {"job_title": "Frontend Developer", "skill_name": "CSS", "is_mandatory": True, "market_demand_score": 85},
        {"job_title": "Frontend Developer", "skill_name": "HTML", "is_mandatory": True, "market_demand_score": 80},
    ]

    for skill in default_skills:
        supabase_admin.table("skill_matrix").upsert(skill, on_conflict="job_title,skill_name").execute()

    logger.info(f"Skill matrix seeded with {len(default_skills)} entries")
