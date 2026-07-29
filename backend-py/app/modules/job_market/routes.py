from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel

from app.database import supabase_admin
from app.dependencies import get_current_user, AuthenticatedUser
from app.utils.api_util import send_success
from app.utils.error_util import AppError
from app.config import settings
from app.utils.logger import logger
import httpx


router = APIRouter()


SKILL_DICTIONARY = [
    "JavaScript", "TypeScript", "React", "Node.js", "Next.js",
    "Python", "SQL", "PostgreSQL", "AWS", "Docker", "Git",
    "Redis", "Tailwind CSS", "Express.js", "Java", "C++",
]

JSEARCH_URL = "https://jsearch.p.rapidapi.com/search"

DEFAULT_ROLES = [
    "Full Stack Developer",
    "Frontend Developer",
    "Backend Developer",
    "Data Analyst",
    "Data Scientist",
    "Machine Learning Engineer",
    "DevOps Engineer",
    "Software Engineer",
    "React Developer",
    "Node.js Developer",
]


def extract_skills(text: str) -> list[str]:
    lower = text.lower()
    return [s for s in SKILL_DICTIONARY if s.lower() in lower]


def parse_salary(salary_text: Optional[str]) -> dict:
    if not salary_text:
        return {"min": None, "max": None}
    import re
    numbers = [float(n) for n in re.findall(r"\d+(?:\.\d+)?", salary_text)]
    if not numbers:
        return {"min": None, "max": None}
    return {"min": numbers[0], "max": numbers[-1]}


class RefreshRequest(BaseModel):
    role: str


class JobMarketService:

    @staticmethod
    async def fetch_jsearch_listings(role: str, location: str = "India") -> list[dict]:
        if not settings.rapidapi_key:
            logger.warning("RAPIDAPI_KEY not set, skipping JSearch fetch")
            return []

        try:
            async with httpx.AsyncClient(timeout=30) as client:
                response = await client.get(
                    JSEARCH_URL,
                    params={
                        "query": f"{role} jobs in {location}",
                        "page": 1,
                        "num_pages": 1,
                        "country": "in" if location.lower() == "india" else "us",
                        "date_posted": "all",
                    },
                    headers={
                        "x-rapidapi-host": "jsearch.p.rapidapi.com",
                        "x-rapidapi-key": settings.rapidapi_key,
                    },
                )
                data = response.json()
                return data.get("data", [])
        except Exception as e:
            logger.warning(f"JSearch API failed for {role}: {e}")
            return []

    @staticmethod
    async def refresh_role(role: str, location: str = "India") -> dict:
        raw_listings = await JobMarketService.fetch_jsearch_listings(role, location)

        normalized = []
        for job in raw_listings:
            salary = parse_salary(job.get("job_salary") or str(job.get("job_min_salary") or ""))
            normalized.append({
                "external_id": str(job.get("job_id", "")),
                "title": job.get("job_title", ""),
                "company": job.get("employer_name"),
                "location": job.get("job_city") or job.get("job_country") or location,
                "salary_range": job.get("job_salary"),
                "salary_lpa_min": salary["min"],
                "salary_lpa_max": salary["max"],
                "skills_required": extract_skills(f"{job.get('job_title', '')}\n{job.get('job_description', '')}"),
                "description": job.get("job_description", ""),
                "apply_url": job.get("job_apply_link"),
                "source": "jsearch",
                "posted_at": job.get("job_posted_at_datetime_utc"),
                "fetched_at": datetime.now(timezone.utc).isoformat(),
            })

        if normalized:
            supabase_admin.table("job_listings").upsert(normalized, on_conflict="external_id").execute()

        all_skills = list({s for job in normalized for s in job["skills_required"]})
        all_companies = list({job["company"] for job in normalized if job.get("company")})

        top_skills = all_skills[:10]
        top_companies = all_companies[:10]

        listing_count = len(normalized)
        demand_trend = "high" if listing_count > 25 else "medium" if listing_count > 10 else "emerging"

        avg_salary = 0.0
        if normalized:
            salaries = [float(j.get("salary_lpa_max") or j.get("salary_lpa_min") or 0) for j in normalized]
            avg_salary = round(sum(salaries) / len(salaries), 2)

        payload = {
            "job_title": role,
            "location": location,
            "avg_salary_lpa": avg_salary,
            "demand_trend": demand_trend,
            "top_skills": top_skills,
            "top_companies": top_companies,
            "job_count": listing_count,
            "last_updated": datetime.now(timezone.utc).isoformat(),
        }

        result = supabase_admin.table("job_market_cache").upsert(
            payload, on_conflict="job_title,location"
        ).select().single().execute()

        return {
            "cache": result.data or payload,
            "listings": normalized,
        }

    @staticmethod
    async def get_listings(
        role: Optional[str] = None,
        location: Optional[str] = None,
        page: int = 1,
        limit: int = 50,
    ) -> list[dict]:
        query = supabase_admin.table("job_listings").select("*").eq("is_active", True).order("fetched_at", desc=True)
        if role:
            query = query.ilike("title", f"%{role}%")
        if location:
            query = query.ilike("location", f"%{location}%")

        offset = (page - 1) * limit
        response = query.range(offset, offset + limit - 1).execute()
        return response.data or []

    @staticmethod
    async def get_market_for_role(role: str, location: str = "India") -> dict:
        response = supabase_admin.table("job_market_cache").select("*").eq("job_title", role).eq("location", location).maybe_single().execute()
        data = response.data
        if not data:
            return await JobMarketService.refresh_role(role, location)
        last_updated = data.get("last_updated")
        if last_updated:
            try:
                updated = datetime.fromisoformat(last_updated.replace("Z", "+00:00"))
                if (datetime.now(timezone.utc) - updated).total_seconds() > 86400:
                    return await JobMarketService.refresh_role(role, location)
            except Exception:
                pass
        return {"cache": data, "listings": []}

    @staticmethod
    async def get_roles() -> list[str]:
        response = supabase_admin.table("job_market_cache").select("job_title").order("last_updated", desc=True).execute()
        titles = list({row["job_title"] for row in (response.data or [])})
        return titles or DEFAULT_ROLES


@router.get("/job-market/listings")
async def get_job_listings(
    role: Optional[str] = Query(None),
    location: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(30, ge=1, le=100),
    user: AuthenticatedUser = Depends(get_current_user),
):
    result = await JobMarketService.get_listings(role, location, page, limit)
    return send_success(result, "Job listings fetched")


@router.get("/job-market/trending-skills")
async def get_trending_skills(
    role: Optional[str] = Query(None),
    user: AuthenticatedUser = Depends(get_current_user),
):
    if role:
        data = await JobMarketService.get_market_for_role(role)
        return send_success(data["cache"].get("top_skills", []) if data.get("cache") else [], "Trending skills fetched")

    response = supabase_admin.table("job_market_cache").select("top_skills").order("last_updated", desc=True).limit(5).execute()
    all_skills = []
    seen = set()
    for row in (response.data or []):
        for skill in (row.get("top_skills") or []):
            if skill not in seen:
                seen.add(skill)
                all_skills.append(skill)
    return send_success(all_skills[:20], "Trending skills fetched")


@router.post("/job-market/refresh")
async def refresh_job_market(
    body: RefreshRequest,
    user: AuthenticatedUser = Depends(get_current_user),
):
    result = await JobMarketService.refresh_role(body.role)
    return send_success(result, "Job market refreshed")


@router.get("/job-market/roles")
async def get_available_roles(user: AuthenticatedUser = Depends(get_current_user)):
    result = await JobMarketService.get_roles()
    return send_success(result, "Available roles fetched")
