from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware

from app.config import settings
from app.utils.error_util import AppError
from app.utils.api_util import build_response
from app.utils.logger import logger


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"ZeroGap backend starting on port {settings.port}")
    yield


app = FastAPI(
    title="ZeroGap API",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/api/docs",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.frontend_url,
        "https://zerogap-frontend-002.vercel.app",
        "https://zerogap-frontend-002-kavya-jaiswals-projects.vercel.app",
        "https://zerogap-frontend-002-kavyajaiswal007-kavya-jaiswals-projects.vercel.app",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(AppError)
async def app_error_handler(request: Request, exc: AppError):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "data": None,
            "message": exc.message,
            "error": exc.code,
            "meta": {
                "timestamp": __import__("datetime").datetime.now().isoformat(),
                "version": "1.0",
            },
        },
    )


@app.exception_handler(Exception)
async def global_error_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error: {exc}")
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "data": None,
            "message": "Internal server error",
            "error": "INTERNAL_ERROR",
            "meta": {
                "timestamp": __import__("datetime").datetime.now().isoformat(),
                "version": "1.0",
            },
        },
    )


@app.get("/health")
async def health():
    checks = {
        "status": "ok",
        "timestamp": __import__("datetime").datetime.now().isoformat(),
        "uptime": __import__("time").time(),
        "services": {
            "database": "ok",
            "redis": "degraded",
            "ai": "ok",
        },
    }
    return checks


@app.get("/")
async def root():
    return RedirectResponse(url=settings.frontend_url)


# Import and register routers
from app.modules.auth.routes import router as auth_router
from app.modules.profile.routes import router as profile_router
from app.modules.skill_gap.routes import router as skill_gap_router
from app.modules.scoring.routes import router as scoring_router
from app.modules.roadmap.routes import router as roadmap_router
from app.modules.resume.routes import router as resume_router
from app.modules.mentor.routes import router as mentor_router
from app.modules.job_market.routes import router as job_market_router
from app.modules.proof_analyzer.routes import router as proof_analyzer_router
from app.modules.hire_me.routes import router as hire_me_router
from app.modules.peer_benchmark.routes import router as peer_benchmark_router
from app.modules.execution_tracker.routes import router as execution_tracker_router
from app.modules.achievements.routes import router as achievements_router
from app.modules.failure_prediction.routes import router as failure_prediction_router
from app.modules.project_builder.routes import router as project_builder_router
from app.modules.college_panel.routes import router as college_panel_router
from app.modules.dashboard.routes import router as dashboard_router
from app.modules.learnpath.routes import router as learnpath_router

app.include_router(auth_router, prefix="/api/auth")
app.include_router(profile_router, prefix="/api")
app.include_router(skill_gap_router, prefix="/api")
app.include_router(scoring_router, prefix="/api")
app.include_router(roadmap_router, prefix="/api")
app.include_router(resume_router, prefix="/api")
app.include_router(mentor_router, prefix="/api")
app.include_router(job_market_router, prefix="/api")
app.include_router(proof_analyzer_router, prefix="/api")
app.include_router(hire_me_router, prefix="/api")
app.include_router(peer_benchmark_router, prefix="/api")
app.include_router(execution_tracker_router, prefix="/api")
app.include_router(achievements_router, prefix="/api")
app.include_router(failure_prediction_router, prefix="/api")
app.include_router(project_builder_router, prefix="/api")
app.include_router(college_panel_router, prefix="/api")
app.include_router(dashboard_router, prefix="/api")
app.include_router(learnpath_router, prefix="/api/learnpath")
