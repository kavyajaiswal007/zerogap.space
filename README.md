# zerogap.space

**AI career coach** that actually knows what you're missing.

Students waste months grinding random tutorials and still can't land jobs. ZeroGap connects your current skills to what companies actually want — then gives you a playlist, a roadmap, and a resume fix so you can stop guessing and start applying.

Built as a learning + resume + job matching platform in one place. No separate tools, no generic advice, no "learn Python" spam.

---

## what it does

- **skill gap analysis** — pick a role (backend, frontend, data), and the AI compares you against market requirements. you get a list of exactly what's missing, not a generic course dump
- **personalized roadmap** — 4-stage plan with tasks, projects, and resources tailored to your profile. each stage builds on the last
- **resume intelligence** — upload your PDF, get an ATS score, keyword match, and specific things to add. compares your resume against actual job descriptions
- **job matching** — scrapes listings, ranks them by how well you fit, shows you what skills you'd need for each one
- **AI mentor** — chat that reads your profile, skills, and roadmap before answering. asks you "what should I learn next?" and actually knows what you already know
- **dashboard** — career readiness score, skill match %, learning streak, weekly goals. no two dashboards look the same
- **peer benchmark** — how you stack against other students targeting the same role

---

## tech stack

| what | using |
|------|-------|
| frontend | React 19, Tailwind CSS 4, Vite |
| backend | Node.js + Express + TypeScript |
| database | Supabase (PostgreSQL + auth + storage) |
| AI | Anthropic Claude + OpenAI GPT-4o fallback |
| queues | BullMQ + Redis (optional, degrades gracefully) |
| jobs API | JSearch RapidAPI |
| resume parsing | PDF parsing + Claude extraction |
| hosting | Vercel (frontend) / Render (backend) |

---

## project layout

```
zerogap.space/
├── frontend/          # React SPA
│   ├── src/
│   │   ├── App.tsx         # routes + lazy loading
│   │   ├── session.tsx     # auth context (Supabase JWT)
│   │   ├── backend.ts      # API client + types
│   │   ├── Dashboard.tsx
│   │   ├── ResumePage.tsx
│   │   ├── JobMatchPage.tsx
│   │   ├── ... 20+ components
│   │   └── learnpath/      # YouTube playlist learning
│   └── public/
│
├── backend/           # Express API
│   ├── src/
│   │   ├── modules/    # 17 feature modules
│   │   │   ├── auth/
│   │   │   ├── profile/
│   │   │   ├── dashboard/
│   │   │   ├── skillGap/
│   │   │   ├── resume/
│   │   │   ├── mentor/
│   │   │   └── ...
│   │   ├── middleware/  # auth, rate-limit, validation
│   │   ├── queues/      # background jobs
│   │   ├── utils/       # AI clients, scoring, parsers
│   │   └── workers/
│   ├── supabase/migrations/
│   └── scripts/         # seed data
│
├── backend-py/        # Python/FastAPI port (work in progress)
│   └── app/
│       ├── main.py
│       ├── modules/     # same modules, FastAPI style
│       └── utils/
│
├── README.md
├── .gitignore
└── LICENSE
```

---

## local setup

### frontend

```bash
cd frontend
npm install
cp ../.env.local .env.local   # add your Supabase keys
npm run dev                    # → localhost:3000
```

### backend

```bash
cd backend
npm install
cp .env.example .env
# fill in SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY, etc.
npm run dev                    # → localhost:5000
```

### env variables you'll need

these are the ones that matter:

```
SUPABASE_URL=             # from your Supabase project
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=           # or ANTHROPIC_API_KEY
REDIS_URL=                # optional, app works without it
RAPIDAPI_KEY=             # for job listings (optional)
FRONTEND_URL=http://localhost:3000
```

---

## api endpoints (main ones)

```
POST   /api/auth/register
POST   /api/auth/login
GET    /api/auth/me
POST   /api/skill-gap/analyze
GET    /api/skill-gap/latest
GET    /api/dashboard
GET    /api/score/current
POST   /api/roadmap/generate
POST   /api/resume        (upload PDF)
POST   /api/mentor/chat
GET    /api/job-market/listings
```

full list at `/api/docs` when running locally.

---

## why i built this

I was tired of seeing friends grind LeetCode and random YouTube courses, apply to 200 jobs, hear nothing back, and have no idea why. The problem isn't that they can't code — it's that no platform tells them *what* to learn, *how* to prove it, and *where* to apply, all in one flow.

ZeroGap is my attempt to fix that. One profile, one dashboard, one AI that actually reads your resume before giving advice.

---

## contributing

PRs welcome. If you find a bug or have an idea, open an issue or just send a PR. No strict guidelines, just don't break the build.

```bash
# quick start
git clone https://github.com/kavyajaiswal007/zerogap.space
cd zerogap.space/frontend && npm install && npm run dev
```

---

*built by [kavya jaiswal](https://github.com/kavyajaiswal007)*
