from typing import Optional


def calculate_skill_score(params: dict) -> dict:
    skills_pct = params.get("skillsMatchPercentage", 0)
    project_score = params.get("projectQualityScore", 0)
    activity_score = params.get("activityConsistencyScore", 0)

    final_score = (skills_pct * 0.5) + (project_score * 0.3) + (activity_score * 0.2)
    final_score = max(0, min(100, round(final_score, 2)))

    return {
        "skillsMatchPercentage": round(skills_pct, 2),
        "projectQualityScore": round(project_score, 2),
        "activityConsistencyScore": round(activity_score, 2),
        "finalScore": final_score,
    }
