import asyncio
import json
import math
import re
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, UploadFile, File
from pydantic import BaseModel, field_validator

from app.database import supabase_admin
from app.dependencies import get_current_user, AuthenticatedUser
from app.utils.api_util import send_success
from app.utils.error_util import AppError
from app.utils.db_util import get_profile_or_throw, get_user_skills


STOCK_SKILLS = [
    {"skill_name": "React", "proficiency_level": 65},
    {"skill_name": "JavaScript", "proficiency_level": 70},
    {"skill_name": "TypeScript", "proficiency_level": 55},
]


def _stock_text(value, fallback, min_len=0):
    text = str(value).strip() if value is not None else ""
    return text if len(text) >= min_len else fallback


def _optional_text(value):
    if value is None:
        return None
    text = str(value).strip()
    return text if text else None


def _optional_url(value):
    if value is None:
        return None
    raw = str(value).strip()
    if not raw:
        return None
    if not (raw.startswith("http://") or raw.startswith("https://")):
        raw = f"https://{raw}"
    if "." in raw.split("://")[1].split("/")[0] if "://" in raw else "." in raw:
        return raw
    return None


def _optional_int(value):
    if value is None:
        return None
    try:
        n = float(value)
        if math.isfinite(n):
            return round(n)
    except (ValueError, TypeError):
        pass
    return None


class UpdateProfileInput(BaseModel):
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    role: Optional[str] = None
    college_name: Optional[str] = None
    degree: Optional[str] = None
    graduation_year: Optional[int] = None
    location: Optional[str] = None
    bio: Optional[str] = None
    learning_style: Optional[str] = None
    time_availability_hours: Optional[int] = None
    github_username: Optional[str] = None
    linkedin_url: Optional[str] = None
    github_access_token: Optional[str] = None
    onboarding_completed: Optional[bool] = None

    @field_validator("full_name")
    @classmethod
    def normalize_full_name(cls, v):
        if v is None:
            return None
        return _stock_text(v, "ZeroGap User", 2)

    @field_validator("avatar_url", "linkedin_url")
    @classmethod
    def normalize_url(cls, v):
        return _optional_url(v)

    @field_validator("college_name", "degree", "location", "bio", "learning_style", "github_username", "github_access_token")
    @classmethod
    def normalize_text(cls, v):
        return _optional_text(v)

    @field_validator("graduation_year", "time_availability_hours")
    @classmethod
    def normalize_int(cls, v):
        return _optional_int(v)


class TargetRoleInput(BaseModel):
    job_title: Optional[str] = "Full Stack Developer"
    specialization: Optional[str] = None
    experience_level: Optional[str] = "fresher"

    @field_validator("job_title")
    @classmethod
    def normalize_job_title(cls, v):
        return _stock_text(v, "Full Stack Developer", 2)


class SkillInput(BaseModel):
    skill_name: str = "React"
    proficiency_level: int = 50
    verified: bool = False
    proof_type: str = "self_declared"
    proof_url: Optional[str] = None

    @field_validator("skill_name")
    @classmethod
    def normalize_skill_name(cls, v):
        return _stock_text(v, "React", 2)

    @field_validator("proficiency_level")
    @classmethod
    def clamp_proficiency(cls, v):
        return max(0, min(100, int(v)))


class OnboardingInput(BaseModel):
    profile: Optional[UpdateProfileInput] = None
    target_role: Optional[TargetRoleInput] = None
    skills: Optional[list[SkillInput]] = None


class CertificateInput(BaseModel):
    title: str = "ZeroGap Practice Certificate"
    issuer: Optional[str] = None
    issue_date: Optional[str] = None
    expiry_date: Optional[str] = None
    credential_url: Optional[str] = None
    file_url: Optional[str] = None
    skills_validated: list[str] = []
    verified: bool = False

    @field_validator("title")
    @classmethod
    def normalize_title(cls, v):
        return _stock_text(v, "ZeroGap Practice Certificate", 2)

    @field_validator("credential_url", "file_url")
    @classmethod
    def normalize_url(cls, v):
        return _optional_url(v)

    @field_validator("skills_validated")
    @classmethod
    def ensure_list(cls, v):
        return v or []


class LinkedInImportInput(BaseModel):
    linkedinUrl: str
    targetRole: Optional[str] = "Full Stack Developer"


class GithubSyncInput(BaseModel):
    accessToken: Optional[str] = None


router = APIRouter()


class ProfileService:

    @staticmethod
    async def get_own_profile(user_id: str) -> dict:
        profile = get_profile_or_throw(user_id)

        roles_task = supabase_admin.table("target_roles").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
        skills_task = supabase_admin.table("user_skills").select("*").eq("user_id", user_id).order("skill_name").execute()
        certs_task = supabase_admin.table("certificates").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
        proofs_task = supabase_admin.table("github_proofs").select("*").eq("user_id", user_id).order("last_synced", desc=True).execute()
        xp_task = supabase_admin.table("user_xp").select("*").eq("user_id", user_id).maybe_single().execute()

        roles_resp, skills_resp, certs_resp, proofs_resp, xp_resp = await asyncio.gather(
            roles_task, skills_task, certs_task, proofs_task, xp_task, return_exceptions=True,
        )

        return {
            "profile": profile,
            "target_roles": roles_resp.data if not isinstance(roles_resp, Exception) and hasattr(roles_resp, "data") else [],
            "skills": skills_resp.data if not isinstance(skills_resp, Exception) and hasattr(skills_resp, "data") else [],
            "certificates": certs_resp.data if not isinstance(certs_resp, Exception) and hasattr(certs_resp, "data") else [],
            "github_proofs": proofs_resp.data if not isinstance(proofs_resp, Exception) and hasattr(proofs_resp, "data") else [],
            "xp": xp_resp.data if not isinstance(xp_resp, Exception) and hasattr(xp_resp, "data") else None,
        }

    @staticmethod
    async def update_profile(user_id: str, payload: UpdateProfileInput) -> dict:
        update_dict = {k: v for k, v in payload.model_dump(exclude_none=True).items() if v is not None}
        if not update_dict:
            raise AppError("No fields to update", 400, "NO_UPDATE_FIELDS")
        update_dict["updated_at"] = datetime.now().isoformat()

        resp = supabase_admin.table("profiles").update(update_dict).eq("id", user_id).select().execute()
        if hasattr(resp, "error") and resp.error:
            raise AppError(resp.error.message, 500, "PROFILE_UPDATE_FAILED")
        data = resp.data[0] if resp.data else None
        if not data:
            raise AppError("Profile update returned no data", 500, "PROFILE_UPDATE_FAILED")
        return data

    @staticmethod
    async def complete_onboarding(user_id: str, payload: OnboardingInput) -> dict:
        profile_payload = {
            "full_name": "ZeroGap User",
            "college_name": "Independent learner",
            "degree": "B.Tech CSE",
            "graduation_year": datetime.now().year + 1,
            "learning_style": "project-based",
            "time_availability_hours": 3,
            "onboarding_completed": True,
        }
        if payload.profile:
            profile_payload.update({k: v for k, v in payload.profile.model_dump(exclude_none=True).items() if v is not None})
        profile_payload["onboarding_completed"] = True

        update_input = UpdateProfileInput(**profile_payload)
        await ProfileService.update_profile(user_id, update_input)

        supabase_admin.table("target_roles").update({"is_active": False}).eq("user_id", user_id).execute()

        target_role_data = payload.target_role.model_dump() if payload.target_role else {"job_title": "Full Stack Developer", "experience_level": "fresher"}
        target_role_data.pop("specialization", None)
        tr_resp = supabase_admin.table("target_roles").insert({
            "user_id": user_id,
            **target_role_data,
            "is_active": True,
        }).select().execute()
        if hasattr(tr_resp, "error") and tr_resp.error:
            raise AppError(tr_resp.error.message, 500, "TARGET_ROLE_CREATE_FAILED")
        target_role = tr_resp.data[0] if tr_resp.data else None

        skills = [s.model_dump() for s in (payload.skills or [])]
        if not skills:
            skills = STOCK_SKILLS

        if skills:
            skill_rows = [
                {
                    "user_id": user_id,
                    **s,
                    "verified": False,
                    "proof_type": "self_declared",
                }
                for s in skills
            ]
            supabase_admin.table("user_skills").upsert(skill_rows, on_conflict="user_id,skill_name").execute()

        supabase_admin.table("roadmaps").update({
            "is_active": False,
            "updated_at": datetime.now().isoformat(),
        }).eq("user_id", user_id).execute()

        try:
            from app.modules.roadmap.routes import RoadmapService
            await RoadmapService.generate(user_id)
        except Exception:
            pass

        try:
            from app.utils.skill_analysis_util import enqueue_skill_analysis
            await enqueue_skill_analysis(user_id)
        except Exception:
            pass

        return {
            "target_role": target_role,
            "skills": get_user_skills(user_id),
        }

    @staticmethod
    async def sync_github(user_id: str, access_token: Optional[str] = None) -> dict:
        profile = get_profile_or_throw(user_id)
        token = access_token or profile.get("github_access_token")
        if not token:
            raise AppError("GitHub access token missing in profile or request body", 400, "GITHUB_TOKEN_MISSING")

        try:
            from app.utils.github_util import sync_github_repos
            result = await sync_github_repos(user_id, token)
        except ImportError:
            raise AppError("GitHub sync utility not available", 500, "GITHUB_UTIL_MISSING")

        if result.get("skills"):
            skill_rows = [
                {
                    "user_id": user_id,
                    "skill_name": skill,
                    "proficiency_level": 70,
                    "verified": True,
                    "proof_type": "github",
                }
                for skill in result["skills"]
            ]
            supabase_admin.table("user_skills").upsert(skill_rows, on_conflict="user_id,skill_name").execute()

        try:
            from app.utils.skill_analysis_util import enqueue_skill_analysis
            await enqueue_skill_analysis(user_id)
        except Exception:
            pass

        return result

    @staticmethod
    async def import_linkedin(user_id: str, body: LinkedInImportInput) -> dict:
        linkedin_url = body.linkedinUrl
        target_role = body.targetRole or "Full Stack Developer"

        linkedin_data = None
        enriched = {"predictedSkills": [], "predictedGaps": [], "suggestedRoadmap": "", "careerSummary": "", "predictedSalaryRange": "₹4-8 LPA", "topJobTitles": [], "relevantCertifications": [], "suggestedPlaylists": [], "relevantJobs": []}

        try:
            from app.utils.linkedin_util import scrape_linkedin_public_profile, enrich_profile_with_ai
            linkedin_data = await scrape_linkedin_public_profile(linkedin_url)
            enriched = await enrich_profile_with_ai(linkedin_data or {}, target_role)
        except ImportError:
            pass

        profile_update = {
            "linkedin_url": linkedin_url,
            "updated_at": datetime.now().isoformat(),
        }

        if linkedin_data:
            if linkedin_data.get("name"):
                profile_update["full_name"] = linkedin_data["name"]
            if linkedin_data.get("location"):
                profile_update["location"] = linkedin_data["location"]
            if linkedin_data.get("headline"):
                profile_update["bio"] = linkedin_data["headline"]
            if linkedin_data.get("education") and len(linkedin_data["education"]) > 0:
                edu = linkedin_data["education"][0]
                profile_update["college_name"] = edu.get("institution")
                degree_parts = [d for d in [edu.get("degree"), edu.get("field")] if d]
                profile_update["degree"] = " ".join(degree_parts)
                try:
                    profile_update["graduation_year"] = int(edu.get("year", "")) if edu.get("year") else datetime.now().year + 1
                except (ValueError, TypeError):
                    profile_update["graduation_year"] = datetime.now().year + 1

        profile_resp = supabase_admin.table("profiles").update(profile_update).eq("id", user_id).execute()
        if hasattr(profile_resp, "error") and profile_resp.error:
            raise AppError(profile_resp.error.message, 400)

        linkedin_skills = linkedin_data.get("skills", []) if linkedin_data else []
        predicted_skills = enriched.get("predictedSkills", [])

        all_skills = []
        for i, skill in enumerate(linkedin_skills):
            all_skills.append({
                "user_id": user_id,
                "skill_name": skill,
                "proficiency_level": max(60, 85 - i * 2),
                "verified": False,
                "proof_type": "self_declared",
                "last_updated": datetime.now().isoformat(),
            })

        for ps in predicted_skills:
            skill_name = ps.get("skill_name", "")
            if not any(s.lower() == skill_name.lower() for s in linkedin_skills):
                all_skills.append({
                    "user_id": user_id,
                    "skill_name": skill_name,
                    "proficiency_level": ps.get("proficiency_level", 60),
                    "verified": False,
                    "proof_type": "self_declared",
                    "last_updated": datetime.now().isoformat(),
                })

        if all_skills:
            supabase_admin.table("user_skills").upsert(all_skills, on_conflict="user_id,skill_name").execute()

        certs_added = 0
        if linkedin_data and linkedin_data.get("certifications"):
            cert_rows = []
            for cert in linkedin_data["certifications"]:
                cert_rows.append({
                    "user_id": user_id,
                    "title": cert.get("name", ""),
                    "issuer": cert.get("issuer"),
                    "issue_date": cert.get("date"),
                    "credential_url": None,
                    "verified": False,
                })
            if cert_rows:
                supabase_admin.table("certificates").upsert(cert_rows, on_conflict="user_id,title").execute()
                certs_added = len(cert_rows)

        try:
            from app.utils.skill_analysis_util import enqueue_skill_analysis
            asyncio.ensure_future(enqueue_skill_analysis(user_id))
        except Exception:
            pass

        return {
            "linkedInData": linkedin_data,
            "enriched": enriched,
            "skillsAdded": len(all_skills),
            "certificationsAdded": certs_added,
        }

    @staticmethod
    async def upload_resume(user_id: str, file: UploadFile) -> dict:
        buffer = await file.read()
        file_name = file.filename or "resume.pdf"

        parsed = {"skills": [], "education": [], "work_experience": [], "projects": [], "certifications": []}
        try:
            from app.utils.resume_parser_util import parse_resume_buffer
            parsed = await parse_resume_buffer(buffer)
        except ImportError:
            pass

        parsed_any = parsed
        basics = parsed_any.get("basics", {})
        education = parsed_any.get("education", parsed.get("education", []))
        skills_list = parsed_any.get("skills", parsed.get("skills", []))

        normalized_skills = []
        for sk in skills_list:
            name = sk.get("skill_name") or sk.get("name")
            if name:
                normalized_skills.append({
                    "name": name,
                    "proficiency": sk.get("proficiency_level") or sk.get("proficiency") or 60,
                })

        certifications = parsed_any.get("certifications", parsed.get("certifications", []))

        if basics.get("name") or basics.get("email") or education:
            profile_update = {"updated_at": datetime.now().isoformat()}
            if basics.get("name"):
                profile_update["full_name"] = basics["name"]
            if basics.get("email"):
                profile_update["email"] = basics["email"]
            if education and len(education) > 0:
                profile_update["degree"] = education[0].get("degree")
                profile_update["graduation_year"] = education[0].get("graduation_year") or education[0].get("year")
            if parsed_any.get("summary"):
                profile_update["bio"] = parsed_any["summary"]
            supabase_admin.table("profiles").update(profile_update).eq("id", user_id).execute()

        if normalized_skills:
            skill_rows = [
                {
                    "user_id": user_id,
                    "skill_name": sk["name"],
                    "proficiency_level": sk["proficiency"],
                    "verified": False,
                    "proof_type": "self_declared",
                }
                for sk in normalized_skills
            ]
            supabase_admin.table("user_skills").upsert(skill_rows, on_conflict="user_id,skill_name").execute()

        if certifications:
            cert_rows = [
                {
                    "user_id": user_id,
                    "title": cert.get("title", ""),
                    "issuer": cert.get("issuer"),
                    "credential_url": cert.get("credential_url") or cert.get("url"),
                }
                for cert in certifications
            ]
            supabase_admin.table("certificates").insert(cert_rows).execute()

        storage_data = supabase_admin.storage.from_("resumes").upload(
            f"{user_id}/{int(datetime.now().timestamp() * 1000)}-{file_name}",
            buffer,
            {"content-type": "application/pdf", "upsert": "true"},
        )

        try:
            from app.utils.skill_analysis_util import enqueue_skill_analysis
            asyncio.ensure_future(enqueue_skill_analysis(user_id))
        except Exception:
            pass

        return {
            "parsed": parsed,
            "storage": storage_data,
        }


@router.get("/profile")
async def get_own_profile(user: AuthenticatedUser = Depends(get_current_user)):
    data = await ProfileService.get_own_profile(user.id)
    return send_success(data, "Profile fetched")


@router.put("/profile")
async def update_profile(payload: UpdateProfileInput, user: AuthenticatedUser = Depends(get_current_user)):
    data = await ProfileService.update_profile(user.id, payload)
    return send_success(data, "Profile updated")


@router.post("/profile/onboarding")
async def complete_onboarding(payload: OnboardingInput, user: AuthenticatedUser = Depends(get_current_user)):
    data = await ProfileService.complete_onboarding(user.id, payload)
    return send_success(data, "Onboarding completed")


@router.post("/profile/github/sync")
async def sync_github(payload: GithubSyncInput, user: AuthenticatedUser = Depends(get_current_user)):
    data = await ProfileService.sync_github(user.id, payload.accessToken)
    return send_success(data, "GitHub synced")


@router.post("/profile/linkedin/import")
async def import_linkedin(payload: LinkedInImportInput, user: AuthenticatedUser = Depends(get_current_user)):
    data = await ProfileService.import_linkedin(user.id, payload)
    return send_success(data, "LinkedIn profile imported and enriched")


@router.post("/profile/resume/upload")
async def upload_resume(file: UploadFile = File(...), user: AuthenticatedUser = Depends(get_current_user)):
    if not file:
        raise AppError("Resume file is required", 400)
    data = await ProfileService.upload_resume(user.id, file)
    return send_success(data, "Resume uploaded and parsed")


@router.get("/profile/skills")
async def get_skills(user: AuthenticatedUser = Depends(get_current_user)):
    data = await ProfileService.get_own_profile(user.id)
    return send_success(data["skills"], "Skills fetched")


@router.post("/profile/skills")
async def add_skill(payload: SkillInput, user: AuthenticatedUser = Depends(get_current_user)):
    resp = supabase_admin.table("user_skills").upsert({
        "user_id": user.id,
        **payload.model_dump(),
        "last_updated": datetime.now().isoformat(),
    }, on_conflict="user_id,skill_name").select().execute()
    if hasattr(resp, "error") and resp.error:
        raise AppError(resp.error.message, 500, "SKILL_UPSERT_FAILED")
    return send_success(resp.data[0] if resp.data else None, "Skill saved")


@router.delete("/profile/skills/{skill_id}")
async def delete_skill(skill_id: str, user: AuthenticatedUser = Depends(get_current_user)):
    resp = supabase_admin.table("user_skills").delete().eq("id", skill_id).eq("user_id", user.id).execute()
    if hasattr(resp, "error") and resp.error:
        raise AppError(resp.error.message, 500, "SKILL_DELETE_FAILED")
    return send_success({"deleted": True}, "Skill removed")


@router.post("/profile/certificates")
async def add_certificate(payload: CertificateInput, user: AuthenticatedUser = Depends(get_current_user)):
    resp = supabase_admin.table("certificates").insert({
        "user_id": user.id,
        **payload.model_dump(),
    }).select().execute()
    if hasattr(resp, "error") and resp.error:
        raise AppError(resp.error.message, 500, "CERTIFICATE_ADD_FAILED")
    return send_success(resp.data[0] if resp.data else None, "Certificate added", 201)


@router.get("/profile/certificates")
async def get_certificates(user: AuthenticatedUser = Depends(get_current_user)):
    data = await ProfileService.get_own_profile(user.id)
    return send_success(data["certificates"], "Certificates fetched")


@router.delete("/profile/certificates/{cert_id}")
async def delete_certificate(cert_id: str, user: AuthenticatedUser = Depends(get_current_user)):
    resp = supabase_admin.table("certificates").delete().eq("id", cert_id).eq("user_id", user.id).execute()
    if hasattr(resp, "error") and resp.error:
        raise AppError(resp.error.message, 500, "CERTIFICATE_DELETE_FAILED")
    return send_success({"deleted": True}, "Certificate removed")
