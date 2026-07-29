from fastapi import Header, HTTPException, Depends
from typing import Optional
from app.database import supabase_admin


class AuthenticatedUser:
    def __init__(self, id: str, email: Optional[str] = None, role: str = "student"):
        self.id = id
        self.email = email
        self.role = role


async def get_current_user(authorization: str = Header(None)) -> AuthenticatedUser:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")

    token = authorization.replace("Bearer ", "").strip()
    response = supabase_admin.auth.get_user(token)

    if not response.user:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user = response.user
    return AuthenticatedUser(
        id=user.id,
        email=user.email,
        role=str(user.user_metadata.get("role", "student")),
    )


def require_role(allowed_roles: list[str]):
    async def role_checker(user: AuthenticatedUser = Depends(get_current_user)) -> AuthenticatedUser:
        if user.role not in allowed_roles:
            raise HTTPException(status_code=403, detail="Forbidden")
        return user
    return role_checker
