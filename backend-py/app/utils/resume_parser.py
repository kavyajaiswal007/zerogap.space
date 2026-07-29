import io
from typing import Any


async def parse_resume_buffer(buffer: bytes) -> dict:
    try:
        from PyPDF2 import PdfReader

        pdf_file = io.BytesIO(buffer)
        reader = PdfReader(pdf_file)
        text = ""
        for page in reader.pages:
            text += page.extract_text() or ""

        lines = [line.strip() for line in text.split("\n") if line.strip()]
        email = ""
        name = ""
        skills = []

        import re
        email_match = re.search(r'[\w.+-]+@[\w-]+\.[\w.-]+', text)
        if email_match:
            email = email_match.group(0)

        if lines:
            name = lines[0]

        common_skills = ["Python", "JavaScript", "TypeScript", "React", "Node.js", "SQL", "Git",
                         "Docker", "AWS", "CSS", "HTML", "Java", "C++", "Go", "Rust"]
        text_lower = text.lower()
        for skill in common_skills:
            if skill.lower() in text_lower:
                skills.append({"skill_name": skill, "proficiency_level": 70})

        education = []
        edu_keywords = ["B.Tech", "M.Tech", "B.E.", "M.E.", "Bachelor", "Master", "Ph.D", "BCA", "MCA"]
        for i, line in enumerate(lines):
            for keyword in edu_keywords:
                if keyword.lower() in line.lower():
                    education.append({
                        "degree": line,
                        "institution": lines[i + 1] if i + 1 < len(lines) else "",
                        "year": lines[i + 2] if i + 2 < len(lines) else "",
                    })
                    break
            if education:
                break

        return {
            "name": name,
            "email": email,
            "skills": skills,
            "education": education,
            "summary": text[:500],
        }

    except Exception:
        return {"name": "", "email": "", "skills": [], "education": [], "summary": ""}
