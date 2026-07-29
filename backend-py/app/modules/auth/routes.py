import secrets
from fastapi import APIRouter, Depends, Request, HTTPException
from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional
from urllib.parse import urlencode

from app.database import supabase, supabase_admin
from app.config import settings
from app.utils.api_util import send_success
from app.utils.error_util import AppError
from app.utils.db_util import get_profile_or_throw
from app.dependencies import get_current_user, AuthenticatedUser
from app.utils.logger import logger

router = APIRouter()


def make_stock_email(value: str) -> str:
    import time, random, string, re
    raw = value.lower().split("@")[0][:24]
    slug = re.sub(r'[^a-z0-9]+', '-', raw).strip('-') or 'zerogap-user'
    return f"{slug}-{int(time.time()*1000)}-{''.join(random.choices(string.ascii_lowercase+'0123456789', k=6))}@example.com"


class RegisterInput(BaseModel):
    email: str = ""
    password: str = ""
    fullName: str = ""
    role: Optional[str] = None
    jobTitle: Optional[str] = None
    job_title: Optional[str] = None

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v):
        email = v.strip().lower()
        import re
        if re.match(r'^[^\s@]+@[^\s@]+\.[^\s@]+$', email):
            return email
        return make_stock_email(email)

    @field_validator("password")
    @classmethod
    def normalize_password(cls, v):
        pw = v.strip()
        return pw if len(pw) >= 8 else "ZeroGap123!"

    @field_validator("fullName")
    @classmethod
    def normalize_name(cls, v):
        name = v.strip()
        return name if len(name) >= 2 else "ZeroGap User"


class LoginInput(BaseModel):
    email: str = ""
    password: str = ""

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v):
        email = v.strip().lower()
        import re
        if re.match(r'^[^\s@]+@[^\s@]+\.[^\s@]+$', email):
            return email
        return make_stock_email(email)

    @field_validator("password")
    @classmethod
    def normalize_password(cls, v):
        pw = v.strip()
        return pw if len(pw) >= 8 else "ZeroGap123!"


class RefreshInput(BaseModel):
    refreshToken: str


class ForgotPasswordInput(BaseModel):
    email: EmailStr


class ResetPasswordInput(BaseModel):
    accessToken: str
    refreshToken: str
    newPassword: str


async def bootstrap_user_rows(user_id: str, input_data: RegisterInput):
    supabase_admin.table("profiles").upsert({
        "id": user_id,
        "email": input_data.email,
        "full_name": input_data.fullName,
        "role": input_data.role or "student",
        "updated_at": __import__("datetime").datetime.now().isoformat(),
    }).execute()

    supabase_admin.table("user_xp").upsert({
        "user_id": user_id,
        "total_xp": 0,
        "current_level": 1,
        "current_streak_days": 0,
        "longest_streak_days": 0,
        "updated_at": __import__("datetime").datetime.now().isoformat(),
    }, on_conflict="user_id").execute()

    existing_session = supabase_admin.table("chat_sessions").select("id").eq("user_id", user_id).limit(1).maybe_single().execute()
    if not existing_session.data:
        supabase_admin.table("chat_sessions").insert({
            "user_id": user_id,
            "title": "Welcome to ZeroGap",
            "context_type": "general",
        }).execute()

    job_title = (input_data.jobTitle or input_data.job_title or "").strip()
    if job_title:
        supabase_admin.table("target_roles").update({"is_active": False}).eq("user_id", user_id).execute()
        supabase_admin.table("target_roles").insert({
            "user_id": user_id,
            "job_title": job_title,
            "experience_level": "fresher",
            "is_active": True,
        }).execute()


@router.post("/register")
async def register(input_data: RegisterInput):
    using_service_role = settings.supabase_service_role_key != settings.supabase_anon_key if settings.supabase_service_role_key else False
    user_id = None
    session = None

    if using_service_role:
        user_response = supabase_admin.auth.admin.create_user({
            "email": input_data.email,
            "password": input_data.password,
            "email_confirm": True,
            "user_metadata": {
                "full_name": input_data.fullName,
                "role": input_data.role or "student",
            },
        })
        if not user_response.user:
            raise AppError("Email already exists" if "already" in str(user_response).lower() else "Unable to register user", 400, "REGISTER_FAILED")
        user_id = user_response.user.id
        session_response = supabase.auth.sign_in_with_password({
            "email": input_data.email,
            "password": input_data.password,
        })
        if not session_response.session:
            raise AppError("Account created but sign-in failed", 500, "SESSION_CREATE_FAILED")
        session = session_response.session
    else:
        auth_response = supabase.auth.sign_up({
            "email": input_data.email,
            "password": input_data.password,
            "options": {
                "data": {
                    "full_name": input_data.fullName,
                    "role": input_data.role or "student",
                },
            },
        })
        if not auth_response.user:
            raise AppError("Unable to register user", 400, "REGISTER_FAILED")
        user_id = auth_response.user.id
        session = auth_response.session

    await bootstrap_user_rows(user_id or session.user.id, input_data)
    profile = get_profile_or_throw(user_id or session.user.id)

    return send_success({
        "user": profile,
        "session": {
            "access_token": session.access_token,
            "refresh_token": session.refresh_token,
            "expires_in": session.expires_in,
        },
        "isNewUser": True,
    }, "Registration successful", 201)


@router.post("/login")
async def login(input_data: LoginInput):
    auth_response = supabase.auth.sign_in_with_password({
        "email": input_data.email,
        "password": input_data.password,
    })
    if not auth_response.session or not auth_response.user:
        raise AppError("Invalid credentials", 401, "INVALID_CREDENTIALS")

    profile = get_profile_or_throw(auth_response.user.id)
    return send_success({
        "user": profile,
        "session": {
            "access_token": auth_response.session.access_token,
            "refresh_token": auth_response.session.refresh_token,
            "expires_in": auth_response.session.expires_in,
        },
    }, "Login successful")


@router.post("/logout")
async def logout(user: AuthenticatedUser = Depends(get_current_user)):
    return send_success({"loggedOut": True}, "Logout successful")


@router.post("/refresh")
async def refresh(input_data: RefreshInput):
    session_response = supabase.auth.refresh_session(input_data.refreshToken)
    if not session_response.session or not session_response.user:
        raise AppError("Unable to refresh session", 401, "REFRESH_FAILED")

    profile = get_profile_or_throw(session_response.user.id)
    return send_success({
        "user": profile,
        "session": {
            "access_token": session_response.session.access_token,
            "refresh_token": session_response.session.refresh_token,
            "expires_in": session_response.session.expires_in,
        },
    }, "Session refreshed")


@router.post("/forgot-password")
async def forgot_password(input_data: ForgotPasswordInput):
    supabase.auth.reset_password_for_email(input_data.email, {
        "redirectTo": f"{settings.frontend_url}/reset-password",
    })
    return send_success({"email": input_data.email}, "Password reset email sent")


@router.post("/reset-password")
async def reset_password(input_data: ResetPasswordInput):
    supabase.auth.set_session(input_data.accessToken, input_data.refreshToken)
    supabase.auth.update_user({"password": input_data.newPassword})
    return send_success({}, "Password reset successful")


@router.get("/github")
async def github(request: Request):
    base_url = f"{request.url.scheme}://{request.url.hostname}:{request.url.port}" if request.url.port else f"{request.url.scheme}://{request.url.hostname}"
    redirect_to = f"{base_url}/api/auth/github/callback"
    auth_response = supabase.auth.sign_in_with_oauth({
        "provider": "github",
        "options": {"redirectTo": redirect_to},
    })
    if not auth_response.url:
        raise AppError("Unable to start OAuth flow", 400, "OAUTH_START_FAILED")
    from fastapi.responses import RedirectResponse
    return RedirectResponse(url=auth_response.url)


@router.get("/google")
async def google(request: Request):
    if not settings.google_client_id or not settings.google_client_secret:
        raise AppError("Google OAuth is not configured", 500, "GOOGLE_OAUTH_NOT_CONFIGURED")

    redirect_to = settings.google_callback_url or f"{request.url.scheme}://{request.url.hostname}:{request.url.port}/api/auth/google/callback"
    params = {
        "client_id": settings.google_client_id,
        "redirect_uri": redirect_to,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "select_account",
    }
    from fastapi.responses import RedirectResponse
    return RedirectResponse(url=f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}")


@router.get("/github/callback")
async def github_callback(code: str, request: Request):
    session_response = supabase.auth.exchange_code_for_session({"auth_code": code})
    if not session_response.session or not session_response.user:
        raise AppError("OAuth exchange failed", 400, "OAUTH_EXCHANGE_FAILED")

    data = session_response
    existing_profile = supabase_admin.table("profiles").select("id,onboarding_completed").eq("id", data.user.id).maybe_single().execute()

    provider_token = getattr(data.session, "provider_token", "") or ""
    github_profile = None
    if provider_token:
        import httpx
        resp = httpx.get("https://api.github.com/user", headers={"Authorization": f"Bearer {provider_token}"})
        if resp.status_code == 200:
            github_profile = resp.json()

    username = (github_profile or {}).get("login") or data.user.user_metadata.get("user_name") or data.user.user_metadata.get("preferred_username") or ""

    supabase_admin.table("profiles").upsert({
        "id": data.user.id,
        "email": data.user.email,
        "full_name": data.user.user_metadata.get("full_name") or data.user.user_metadata.get("name") or (github_profile or {}).get("name"),
        "avatar_url": data.user.user_metadata.get("avatar_url") or (github_profile or {}).get("avatar_url"),
        "github_username": username or None,
        "github_access_token": provider_token or None,
    }).execute()

    is_new_user = not (existing_profile.data or {}).get("onboarding_completed")
    redirect_url = f"{settings.frontend_url}/auth/callback?access_token={data.session.access_token}&refresh_token={data.session.refresh_token}&is_new_user={str(is_new_user).lower()}"
    from fastapi.responses import RedirectResponse
    return RedirectResponse(url=redirect_url)


@router.get("/google/callback")
async def google_callback(request: Request, code: str = "", error: str = "", error_description: str = ""):
    if error or error_description:
        from fastapi.responses import RedirectResponse
        return RedirectResponse(url=f"{settings.frontend_url}/auth/callback?error_description={error_description or error}")

    redirect_to = settings.google_callback_url or f"{request.url.scheme}://{request.url.hostname}:{request.url.port}/api/auth/google/callback"
    import httpx

    token_resp = httpx.post("https://oauth2.googleapis.com/token", data={
        "code": code,
        "client_id": settings.google_client_id,
        "client_secret": settings.google_client_secret,
        "redirect_uri": redirect_to,
        "grant_type": "authorization_code",
    })
    token_json = token_resp.json()
    if not token_resp.is_success or not token_json.get("access_token"):
        raise AppError(token_json.get("error_description", "Google token exchange failed"), 400, "GOOGLE_TOKEN_EXCHANGE_FAILED")

    user_info_resp = httpx.get("https://www.googleapis.com/oauth2/v2/userinfo", headers={"Authorization": f"Bearer {token_json['access_token']}"})
    google_user = user_info_resp.json()
    if not user_info_resp.is_success or not google_user.get("email"):
        raise AppError("Unable to read Google profile email", 400, "GOOGLE_PROFILE_FAILED")

    email = google_user["email"].lower()
    full_name = google_user.get("name", email.split("@")[0])
    password = secrets.token_urlsafe(32) + "Aa1!"

    existing_user = None
    for page in range(1, 6):
        users_resp = supabase_admin.auth.admin.list_users(page=page, per_page=1000)
        if users_resp:
            for u in users_resp.users:
                if u.email and u.email.lower() == email:
                    existing_user = u
                    break
        if existing_user:
            break

    is_new_user = not existing_user
    if existing_user:
        supabase_admin.auth.admin.update_user_by_id(existing_user.id, {
            "password": password,
            "email_confirm": True,
            "user_metadata": {
                **(existing_user.user_metadata or {}),
                "full_name": full_name,
                "name": full_name,
                "avatar_url": google_user.get("picture"),
                "picture": google_user.get("picture"),
                "provider": "google",
                "google_id": google_user.get("id"),
            },
        })
        user_id = existing_user.id
    else:
        create_resp = supabase_admin.auth.admin.create_user({
            "email": email,
            "password": password,
            "email_confirm": True,
            "user_metadata": {
                "full_name": full_name,
                "name": full_name,
                "avatar_url": google_user.get("picture"),
                "picture": google_user.get("picture"),
                "provider": "google",
                "google_id": google_user.get("id"),
            },
        })
        if not create_resp.user:
            raise AppError("Unable to create Google user", 500, "GOOGLE_USER_CREATE_FAILED")
        user_id = create_resp.user.id

    session_resp = supabase.auth.sign_in_with_password({"email": email, "password": password})
    if not session_resp.session:
        raise AppError("Unable to create Google session", 500, "GOOGLE_SESSION_FAILED")

    await bootstrap_user_rows(user_id, RegisterInput(email=email, password=password, fullName=full_name))
    supabase_admin.table("profiles").update({
        "avatar_url": google_user.get("picture"),
        "updated_at": __import__("datetime").datetime.now().isoformat(),
    }).eq("id", user_id).execute()

    redirect_url = f"{settings.frontend_url}/auth/callback?access_token={session_resp.session.access_token}&refresh_token={session_resp.session.refresh_token}&is_new_user={str(is_new_user).lower()}"
    from fastapi.responses import RedirectResponse
    return RedirectResponse(url=redirect_url)


@router.get("/me")
async def me(user: AuthenticatedUser = Depends(get_current_user)):
    profile = get_profile_or_throw(user.id)
    return send_success(profile, "Current user profile")
