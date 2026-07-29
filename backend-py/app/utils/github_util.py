import httpx
from typing import Optional
from app.utils.logger import logger


async def sync_github_repos(user_id: str, access_token: str) -> dict:
    if not access_token:
        return {"repos": [], "languages": {}, "skills": []}

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(
                "https://api.github.com/user/repos?per_page=50&sort=updated",
                headers={"Authorization": f"Bearer {access_token}"},
            )
            if resp.status_code != 200:
                return {"repos": [], "languages": {}, "skills": []}
            repos = resp.json()
            languages = {}
            for repo in repos:
                lang = repo.get("language")
                if lang:
                    languages[lang] = languages.get(lang, 0) + 1

            language_skills = list(languages.keys())
            return {"repos": repos, "languages": languages, "skills": language_skills}
    except Exception as e:
        logger.warning(f"GitHub sync failed for user {user_id}: {e}")
        return {"repos": [], "languages": {}, "skills": []}
