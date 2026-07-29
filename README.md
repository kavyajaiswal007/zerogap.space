<div align="center">

# 🚀 ZeroGap

### AI-Powered Career Intelligence Platform

[![GitHub stars](https://img.shields.io/github/stars/kavyajaiswal007/zerogap.space?style=for-the-badge&logo=github&color=yellow)](https://github.com/kavyajaiswal007/zerogap.space/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/kavyajaiswal007/zerogap.space?style=for-the-badge&logo=github&color=blue)](https://github.com/kavyajaiswal007/zerogap.space/network/members)
[![GitHub issues](https://img.shields.io/github/issues/kavyajaiswal007/zerogap.space?style=for-the-badge&logo=github&color=red)](https://github.com/kavyajaiswal007/zerogap.space/issues)
[![GitHub pull requests](https://img.shields.io/github/issues-pr/kavyajaiswal007/zerogap.space?style=for-the-badge&logo=github&color=green)](https://github.com/kavyajaiswal007/zerogap.space/pulls)
[![License](https://img.shields.io/github/license/kavyajaiswal007/zerogap.space?style=for-the-badge&color=purple)](https://github.com/kavyajaiswal007/zerogap.space/blob/main/LICENSE)

---

**ZeroGap** is an AI-powered platform that helps students and early professionals identify skill gaps, build personalized learning roadmaps, improve resumes, and discover job opportunities — all based on their current abilities and career goals.

[🚀 Live Demo](https://zerogap-frontend-002.vercel.app) · [📋 Report Bug](https://github.com/kavyajaiswal007/zerogap.space/issues) · [✨ Request Feature](https://github.com/kavyajaiswal007/zerogap.space/issues)

</div>

---

## 🎯 The Problem

Today's students face critical career challenges:

| Challenge | Description |
|-----------|-------------|
| 🎯 **Skill Uncertainty** | Don't know which skills companies actually expect |
| 📚 **Random Learning** | Waste time following random YouTube playlists |
| ✅ **Job Readiness** | Don't know if they are job-ready |
| 📄 **Resume Issues** | Resumes aren't ATS optimized |
| 🔗 **Disconnected Tools** | No platform connecting learning, resume, and job prep |

**ZeroGap solves all of this in one platform.**

---

## ✨ Features

<div align="center">

| Feature | Description |
|---------|-------------|
| 🔐 **Smart Authentication** | Email/Password + Google Sign-In with secure JWT |
| 👤 **Career Profile** | Complete career information beyond basic details |
| 🧠 **AI Skill Gap Analysis** | Compare skills against industry expectations |
| 📊 **Personalized Dashboard** | Unique dashboard with scores, streaks, and roadmap |
| 📚 **AI Learning Resources** | YouTube playlists, docs, and projects for skill gaps |
| 📄 **Resume Intelligence** | ATS score, keyword match, AI review & optimization |
| 💼 **Smart Job Matching** | Ranked opportunities based on compatibility |
| 🤖 **AI Career Mentor** | Chat with AI based on your own profile |

</div>

---

## 🛠️ Tech Stack

<div align="center">

### Frontend
![React](https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)

### Backend
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)

### Database & Auth
![Supabase](https://img.shields.io/badge/Supabase-3FCF8E?style=for-the-badge&logo=supabase&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)

### AI & APIs
![OpenAI](https://img.shields.io/badge/OpenAI-412991?style=for-the-badge&logo=openai&logoColor=white)
![Anthropic](https://img.shields.io/badge/Anthropic-D4A574?style=for-the-badge&logo=anthropic&logoColor=white)

### Deployment
![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)
![Render](https://img.shields.io/badge/Render-46E3B7?style=for-the-badge&logo=render&logoColor=white)

</div>

---

## 📐 Architecture

```
zerogap.space/
├── 🎨 frontend/                    # React + TypeScript + Tailwind
│   ├── src/
│   │   ├── components/             # UI Components
│   │   ├── pages/                  # Route Pages
│   │   └── utils/                  # Helper Functions
│   └── public/                     # Static Assets
│
├── ⚙️ backend/                     # Node.js + Express + TypeScript
│   ├── src/
│   │   ├── modules/                # Feature Modules
│   │   │   ├── auth/               # Authentication
│   │   │   ├── profile/            # User Profiles
│   │   │   ├── dashboard/          # Dashboard Analytics
│   │   │   ├── resume/             # Resume Intelligence
│   │   │   ├── jobMarket/          # Job Matching
│   │   │   ├── mentor/             # AI Mentor
│   │   │   └── skillGap/           # Skill Analysis
│   │   ├── middleware/             # Auth, Validation, Errors
│   │   ├── queues/                 # Background Jobs
│   │   └── utils/                  # Shared Utilities
│   └── supabase/migrations/        # Database Schema
│
├── 🤖 aiml/                        # AI/ML Scripts
└── 📁 reserch and others/          # Research Materials
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ 
- **npm** or **yarn**
- **Supabase** account (free tier works)
- **OpenAI** API key

### Installation

```bash
# Clone the repository
git clone https://github.com/kavyajaiswal007/zerogap.space.git
cd zerogap.space

# Install frontend dependencies
cd frontend
npm install

# Install backend dependencies
cd ../backend
npm install
```

### Environment Setup

```bash
# Frontend (.env.local)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key

# Backend (.env)
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_key
OPENAI_API_KEY=your_openai_key
REDIS_URL=your_redis_url
```

### Run Development Server

```bash
# Frontend (port 5173)
cd frontend
npm run dev

# Backend (port 3000)
cd backend
npm run dev
```

---

## 📊 How It Works

### Step 1 — Authentication
```
Email/Password or Google Sign-In → JWT Token → Secure Profile
```

### Step 2 — Career Profile
```
Education + Skills + Experience + Goals → Complete Profile
```

### Step 3 — AI Skill Gap Analysis
```
User Skills vs Industry Requirements → Missing Skills → Roadmap
```

### Step 4 — Personalized Dashboard
```
Career Readiness Score + Learning Streak + Progress + AI Suggestions
```

### Step 5 — Smart Recommendations
```
Skill Gap → YouTube Playlists + Docs + Projects + Practice
```

### Step 6 — Resume Intelligence
```
Upload Resume → ATS Score → AI Review → Optimization Tips
```

### Step 7 — Job Matching
```
Skills + Goals + Location → Ranked Opportunities → Preparation Checklist
```

### Step 8 — AI Mentor
```
Ask Questions → AI Responds Based on YOUR Profile
```

---

## 🎨 Screenshots

<div align="center">

| Dashboard | Skill Analysis | Job Matching |
|-----------|---------------|--------------|
| ![Dashboard](https://via.placeholder.com/400x250/6366f1/ffffff?text=Dashboard) | ![Skills](https://via.placeholder.com/400x250/8b5cf6/ffffff?text=Skill+Analysis) | ![Jobs](https://via.placeholder.com/400x250/a855f7/ffffff?text=Job+Matching) |

| Resume Builder | AI Mentor | Learning Path |
|---------------|-----------|---------------|
| ![Resume](https://via.placeholder.com/400x250/ec4899/ffffff?text=Resume+Builder) | ![Mentor](https://via.placeholder.com/400x250/f43f5e/ffffff?text=AI+Mentor) | ![Learning](https://via.placeholder.com/400x250/f97316/ffffff?text=Learning+Path) |

</div>

---

## 🔮 Future Roadmap

- [ ] 🎤 AI Mock Interviews
- [ ] 💻 Coding Skill Assessment
- [ ] ⚡ Real-time Skill Tests
- [ ] 🐙 GitHub Profile Analysis
- [ ] 💼 LinkedIn Profile Analysis
- [ ] 🌐 Automatic Portfolio Generator
- [ ] 📅 Daily Learning Planner
- [ ] 🏢 Company-wise Interview Prep
- [ ] 👥 Community Challenges
- [ ] 🧑‍🏫 Mentor Marketplace
- [ ] 💼 Internship Recommendations

---

## 🤝 Contributing

Contributions are welcome! Please see our [Contributing Guidelines](CONTRIBUTING.md).

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Support

<div align="center">

If you find this project helpful, please give it a ⭐️!

[![Star History Chart](https://api.star-history.com/svg?repos=kavyajaiswal007/zerogap.space&type=Date)](https://star-history.com/#kavyajaiswal007/zerogap.space&Date)

---

**Built with ❤️ by [Kavya Jaiswal](https://github.com/kavyajaiswal007)**

[![Twitter](https://img.shields.io/badge/Twitter-1DA1F2?style=for-the-badge&logo=twitter&logoColor=white)](https://twitter.com/)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-0A66C2?style=for-the-badge&logo=linkedin&logoColor=white)](https://linkedin.com/)
[![Instagram](https://img.shields.io/badge/Instagram-E4405F?style=for-the-badge&logo=instagram&logoColor=white)](https://instagram.com/)

</div>
