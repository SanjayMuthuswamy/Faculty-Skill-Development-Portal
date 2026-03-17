import json
import logging
import re
from typing import Any, Dict, List, Optional, Type, TypeVar
from urllib.parse import quote_plus

import httpx
from pydantic import BaseModel, ValidationError

from app.core.config import settings

logger = logging.getLogger(__name__)

T = TypeVar("T", bound=BaseModel)


class QuizQuestion(BaseModel):
    question_id: int
    question: str
    options: Dict[str, str]
    correct_answer: str
    marks: int


class QuizMetadata(BaseModel):
    topic: str
    difficulty: str
    total_questions: int
    marks_per_question: int


class QuizResponse(BaseModel):
    metadata: QuizMetadata
    quiz: List[QuizQuestion]


class SkillGapAnalysis(BaseModel):
    strength: str
    weakness: str
    skill_gaps: List[str]
    recommendations: List[str]
    next_difficulty: str


class SkillGapResponse(BaseModel):
    analysis: SkillGapAnalysis


class RoadmapWeekAI(BaseModel):
    week_number: int
    title: str
    required_practice_count: int
    required_min_avg_score: float
    tasks: List[str]


class RoadmapAI(BaseModel):
    weeks: List[RoadmapWeekAI]


class PracticeQuestionAI(BaseModel):
    question_text: str
    option_a: str
    option_b: str
    option_c: str
    option_d: str
    correct_option: str
    explanation: str


class PracticeQuestionResponseAI(BaseModel):
    questions: List[PracticeQuestionAI]


class SkillSuggestionsAI(BaseModel):
    suggested_skills: List[str]
    reasoning: str


class ChatMessage(BaseModel):
    role: str
    content: str


class LearningRoadmapResourceAI(BaseModel):
    title: str
    url: str


class LearningRoadmapWeekAI(BaseModel):
    week: int
    goals: List[str] = []
    topics: List[str] = []
    resources: List[LearningRoadmapResourceAI] = []
    practice: List[str] = []


class LearningRoadmapAI(BaseModel):
    weekly_plan: List[LearningRoadmapWeekAI]


class LLMService:
    def __init__(self):
        self.base_url = settings.OPENROUTER_BASE_URL
        self.api_key = settings.OPENROUTER_API_KEY
        self.model = settings.OPENROUTER_MODEL
        self.timeout = httpx.Timeout(settings.LLM_TIMEOUT_SECONDS)
        self.max_retries = settings.LLM_MAX_RETRIES

    def _remote_enabled(self) -> bool:
        return bool(self.api_key)

    def _extract_keywords(self, text: str, fallback: Optional[List[str]] = None) -> List[str]:
        chunks = re.split(r"[\n,;|]+", text or "")
        words: List[str] = []
        for chunk in chunks:
            normalized = re.sub(r"\s+", " ", chunk).strip(" .:-")
            if normalized:
                words.append(normalized)
        if not words and fallback:
            words = fallback[:]
        deduped: List[str] = []
        for word in words:
            if word not in deduped:
                deduped.append(word)
        return deduped[:8] or ["core concepts"]

    def _difficulty_label(self, difficulty: str) -> str:
        normalized = (difficulty or "").strip().lower()
        if normalized in {"easy", "beginner"}:
            return "Easy"
        if normalized in {"hard", "advanced"}:
            return "Hard"
        return "Medium"

    def _difficulty_target(self, difficulty: str) -> str:
        label = self._difficulty_label(difficulty)
        if label == "Easy":
            return "75%"
        if label == "Hard":
            return "65%"
        return "70%"

    def _normalize_topic_label(self, topic: str) -> str:
        cleaned = re.sub(r"\s+", " ", (topic or "").strip())
        if not cleaned:
            return "the target topic"
        if len(cleaned) <= 90:
            return cleaned
        # Keep fallback prompts concise and readable when topic text is very long.
        return cleaned[:87].rstrip(" ,.;:-") + "..."

    async def _call_llm(
        self,
        prompt: str,
        system_prompt: str = "",
        max_tokens: int = 700,
    ) -> Optional[str]:
        if not self._remote_enabled():
            logger.info("OpenRouter API key not configured. Using deterministic local fallback.")
            return None

        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.3,
            "max_tokens": max_tokens,
            "response_format": {"type": "json_object"},
        }
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://github.com/SanjayMuthuswamy/Faculty-Skill-Development-Portal",
            "X-Title": "Faculty Skill Development Portal",
        }

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            for attempt in range(self.max_retries + 1):
                try:
                    response = await client.post(self.base_url, json=payload, headers=headers)
                    response.raise_for_status()
                    data = response.json()
                    if data.get("choices"):
                        return data["choices"][0]["message"]["content"]
                    logger.error("Unexpected OpenRouter response format: %s", data)
                    return None
                except (httpx.HTTPError, json.JSONDecodeError) as exc:
                    logger.warning("OpenRouter call attempt %s failed: %s", attempt + 1, exc)
                    if attempt == self.max_retries:
                        logger.error("OpenRouter exhausted all retries.")
                        return None
        return None

    def _validate_json(self, raw_response: str, schema: Type[T]) -> Optional[T]:
        try:
            cleaned = raw_response.strip()
            if cleaned.startswith("```json"):
                cleaned = cleaned[7:]
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
            return schema.model_validate(json.loads(cleaned))
        except (json.JSONDecodeError, ValidationError) as exc:
            logger.error("JSON validation failed: %s\nRaw Response: %s", exc, raw_response)
            return None

    def _fallback_quiz(self, topic: str, difficulty: str, num_questions: int, marks: int) -> QuizResponse:
        topic_label = self._normalize_topic_label(topic)
        keywords = self._extract_keywords(topic_label, fallback=[topic_label or "the topic"])
        label = self._difficulty_label(difficulty)
        stems = [
            "In {context}, which approach best applies {keyword} for {topic}?",
            "Which action most directly improves results in {keyword} work?",
            "What is the best first step when implementing {keyword} in {context}?",
            "Which practice shows a strong understanding of {keyword}?",
            "Which choice best reduces risk when using {keyword}?",
            "For a faculty team using {keyword}, which step should come next?",
            "Which statement is most accurate about applying {keyword} in {topic}?",
            "When evaluating progress in {keyword}, what should be prioritized?",
            "Which method creates the most reliable outcome for {keyword} tasks?",
            "What is the strongest way to validate a {keyword} solution?",
            "Which option best aligns {keyword} work with measurable outcomes?",
            "Which decision improves quality while using {keyword} in {context}?",
        ]
        contexts = [
            "assessment planning",
            "course delivery",
            "project execution",
            "rubric design",
            "student mentoring",
            "content revision",
            "lab practice",
            "quality review",
            "curriculum alignment",
            "time-constrained testing",
        ]
        strong_actions = [
            "define measurable objectives and success criteria before execution",
            "test assumptions with a small pilot and refine from evidence",
            "use structured checkpoints and document decisions",
            "review outcomes against clear quality metrics and iterate",
            "combine theory with hands-on validation using realistic cases",
            "capture errors, root causes, and corrective steps after each run",
            "compare alternatives against constraints before finalizing",
            "use feedback loops to improve accuracy and consistency",
        ]
        weak_actions = [
            "skip validation because the first attempt is usually enough",
            "rely on assumptions without collecting evidence",
            "ignore review checkpoints and postpone quality checks",
            "treat the process as one-time with no iteration",
            "optimize speed by removing all verification steps",
            "copy old solutions without checking context fit",
            "avoid documentation and depend only on memory",
            "change multiple variables at once without tracking impact",
        ]
        labels = ["A", "B", "C", "D"]
        quiz: List[QuizQuestion] = []
        for index in range(num_questions):
            keyword = keywords[index % len(keywords)]
            context = contexts[(index + (index // len(contexts))) % len(contexts)]
            stem = stems[index % len(stems)].format(keyword=keyword, topic=topic_label or keyword, context=context)

            correct = (
                f"It applies {keyword} by {strong_actions[index % len(strong_actions)]}."
            )
            wrong_candidates = [
                f"It handles {keyword} by {weak_actions[(index + 1) % len(weak_actions)]}.",
                f"It treats {keyword} as optional and delays core planning decisions.",
                f"It focuses on appearance over measurable outcomes in {context}.",
                f"It assumes {keyword} quality is guaranteed without testing.",
                f"It removes feedback cycles to avoid rework in {topic_label}.",
                f"It limits {keyword} to theory only and skips practical checks.",
            ]

            unique_wrongs: List[str] = []
            for candidate in wrong_candidates:
                if candidate not in unique_wrongs and candidate != correct:
                    unique_wrongs.append(candidate)
                if len(unique_wrongs) == 3:
                    break

            correct_label = labels[index % len(labels)]
            options: Dict[str, str] = {}
            wrong_index = 0
            for option_label in labels:
                if option_label == correct_label:
                    options[option_label] = correct
                else:
                    options[option_label] = unique_wrongs[wrong_index]
                    wrong_index += 1

            quiz.append(
                QuizQuestion(
                    question_id=index + 1,
                    question=stem,
                    options=options,
                    correct_answer=correct_label,
                    marks=marks,
                )
            )
        return QuizResponse(
            metadata=QuizMetadata(
                topic=topic_label,
                difficulty=label,
                total_questions=num_questions,
                marks_per_question=marks,
            ),
            quiz=quiz,
        )

    def _fallback_analysis(self, report_data: Dict[str, Any]) -> SkillGapResponse:
        percentage = float(report_data.get("percentage") or 0.0)
        incorrect_questions = report_data.get("incorrect_questions") or []
        gaps = [
            q.get("question", "concept review").split("?")[0][:80]
            for q in incorrect_questions[:3]
            if q.get("question")
        ] or ["accuracy under timed conditions", "topic recall"]

        if percentage >= 80:
            strength = "Strong conceptual accuracy with consistent performance."
            weakness = "Only minor refinement is needed on a few missed items."
            next_difficulty = "Hard"
        elif percentage >= 60:
            strength = "Core understanding is present across the assessed topic."
            weakness = "Application speed and precision need reinforcement."
            next_difficulty = "Medium"
        else:
            strength = "There is a usable baseline to build from."
            weakness = "Fundamentals and question interpretation need immediate review."
            next_difficulty = "Easy"

        recommendations = [
            "Review missed questions and rewrite the correct reasoning in your own words.",
            "Complete one focused practice set on the weakest area before the next attempt.",
            "Take a timed retest after revising the core concepts.",
        ]

        return SkillGapResponse(
            analysis=SkillGapAnalysis(
                strength=strength,
                weakness=weakness,
                skill_gaps=gaps,
                recommendations=recommendations,
                next_difficulty=next_difficulty,
            )
        )

    def _fallback_roadmap(
        self,
        skill: str,
        domain: str,
        current_level: int,
        target_level: int,
        weekly_hours: int,
    ) -> RoadmapAI:
        focus_terms = self._extract_keywords(skill, fallback=[skill, domain])
        weeks: List[RoadmapWeekAI] = []
        for week_number in range(1, 5):
            focus = focus_terms[(week_number - 1) % len(focus_terms)]
            weeks.append(
                RoadmapWeekAI(
                    week_number=week_number,
                    title=f"Week {week_number}: {focus} for {skill}",
                    required_practice_count=max(1, min(3, weekly_hours // 2 or 1)),
                    required_min_avg_score=60.0 + (week_number * 5),
                    tasks=[
                        f"Review the fundamentals of {focus} for 60 minutes.",
                        f"Practice one applied exercise related to {focus} in {domain}.",
                        f"Document two takeaways that move you from level {current_level} toward {target_level}.",
                    ],
                )
            )
        return RoadmapAI(weeks=weeks)

    def _fallback_practice_questions(self, topic: str, difficulty: str, count: int) -> PracticeQuestionResponseAI:
        quiz = self._fallback_quiz(topic, difficulty, count, marks=1)
        questions = [
            PracticeQuestionAI(
                question_text=item.question,
                option_a=item.options["A"],
                option_b=item.options["B"],
                option_c=item.options["C"],
                option_d=item.options["D"],
                correct_option=item.correct_answer,
                explanation=(
                    f"The best answer is {item.correct_answer} because it reflects structured, "
                    f"evidence-based practice for {self._normalize_topic_label(topic)}."
                ),
            )
            for item in quiz.quiz
        ]
        return PracticeQuestionResponseAI(questions=questions)

    def _fallback_skill_suggestions(self, current_skills: List[str], department: str) -> SkillSuggestionsAI:
        department_text = (department or "").lower()
        catalog = [
            "Data-informed teaching",
            "Assessment design",
            "AI-assisted productivity",
            "Research communication",
            "Learning analytics",
            "Instructional design",
        ]
        if "computer" in department_text or "it" in department_text:
            catalog = [
                "Cloud architecture",
                "Prompt engineering",
                "Applied machine learning",
                "API design",
                "Cybersecurity awareness",
            ]
        elif "management" in department_text or "business" in department_text:
            catalog = [
                "Strategic planning",
                "Business analytics",
                "Stakeholder communication",
                "Digital transformation",
                "Leadership coaching",
            ]

        suggestions = [skill for skill in catalog if skill not in current_skills][:4]
        if not suggestions:
            suggestions = catalog[:4]
        return SkillSuggestionsAI(
            suggested_skills=suggestions,
            reasoning=(
                f"These suggestions complement the current profile for {department or 'the department'} "
                "and can be adopted without depending on external AI configuration."
            ),
        )

    def _fallback_learning_roadmap(
        self,
        skill: str,
        weeks: int,
        hours_per_week: int,
        current_level: str,
    ) -> LearningRoadmapAI:
        plan: List[LearningRoadmapWeekAI] = []
        focus_terms = self._extract_keywords(skill, fallback=[skill])
        for week in range(1, weeks + 1):
            focus = focus_terms[(week - 1) % len(focus_terms)]
            plan.append(
                LearningRoadmapWeekAI(
                    week=week,
                    goals=[
                        f"Understand the core workflow of {focus}.",
                        f"Apply {focus} in one practical exercise at {current_level} level.",
                    ],
                    topics=[focus, f"{skill} fundamentals", "review and reflection"],
                    resources=[
                        LearningRoadmapResourceAI(
                            title=f"Search resources for {focus}",
                            url=f"https://www.google.com/search?q={quote_plus(focus + ' tutorial')}",
                        ),
                        LearningRoadmapResourceAI(
                            title=f"Reference material for {skill}",
                            url=f"https://www.google.com/search?q={quote_plus(skill + ' documentation')}",
                        ),
                    ],
                    practice=[
                        f"TEST: Attempt a 15-question quiz on {focus}; target >= {self._difficulty_target(current_level)}",
                        f"BUILD: Create one small artifact that demonstrates {focus} in practice.",
                        f"REVIEW: Summarize the week's progress and note 3 improvement points.",
                    ],
                )
            )
        return LearningRoadmapAI(weekly_plan=plan)

    def _fallback_chat(self, user_message: str, performance_context: Dict[str, Any]) -> str:
        total_tests = performance_context.get("total_tests", 0)
        avg_accuracy = float(performance_context.get("avg_accuracy", 0) or 0)
        weak_topics = performance_context.get("weak_topics", []) or []
        strong_topics = performance_context.get("strong_topics", []) or []
        prompt = (user_message or "").lower()

        if total_tests == 0:
            return (
                "You do not have completed tests yet.\n"
                "- Take one baseline test first.\n"
                "- After that, I can point out weak areas and study priorities.\n"
                "- Start with a beginner or medium test in your main domain."
            )

        weak_line = weak_topics[0]["topic"] if weak_topics else "no major weak topic recorded"
        strong_line = strong_topics[0]["topic"] if strong_topics else "no strong topic recorded yet"

        if any(term in prompt for term in ["improve", "score", "better", "increase"]):
            recommendation = "revise fundamentals and retake a focused test" if avg_accuracy < 70 else "move to timed practice and advanced topics"
            return (
                f"To improve your score from {avg_accuracy:.1f}%:\n"
                f"- Focus first on: {weak_line}\n"
                "- Do 1 targeted practice set today and review each wrong answer.\n"
                f"- Reattempt an official test after review.\n"
                f"- Current strong area to retain: {strong_line}\n"
                f"- Next step: {recommendation}."
            )

        if any(term in prompt for term in ["weak", "weakness", "where am i weak"]):
            return (
                f"Your weakest area is: {weak_line}\n"
                f"- Average accuracy: {avg_accuracy:.1f}%\n"
                "- Spend 30-45 minutes reviewing this topic.\n"
                "- Then take a short focused practice set to confirm improvement."
            )

        if any(term in prompt for term in ["strong", "strength", "what am i good at"]):
            return (
                f"Your strongest area is: {strong_line}\n"
                f"- Overall average: {avg_accuracy:.1f}%\n"
                "- Keep this level by doing one revision test each week."
            )

        recommendation = "revise fundamentals and retake a focused test" if avg_accuracy < 70 else "move to timed practice and advanced topics"
        return (
            f"Based on your current performance ({avg_accuracy:.1f}% average across {total_tests} tests):\n"
            f"- Strongest area: {strong_line}\n"
            f"- Main area to improve: {weak_line}\n"
            f"- Next step: {recommendation}\n"
            "- Keep practice targeted and review every missed question."
        )

    def _fallback_course_feedback(self, wrong_questions: List[str], course_title: str) -> Dict[str, Any]:
        weak_areas = [
            question.split("?")[0][:80]
            for question in wrong_questions[:3]
            if question
        ] or [f"{course_title} fundamentals"]
        return {
            "weak_areas": weak_areas,
            "suggestions": [
                f"Review the key concepts from {course_title} that relate to the missed questions.",
                "Reattempt a smaller practice set on the weak areas before the next final assessment.",
                "Write short notes for each incorrect answer to reinforce the correct logic.",
            ],
        }

    async def generate_quiz(self, topic: str, difficulty: str, num_questions: int, marks: int) -> Optional[QuizResponse]:
        if not self._remote_enabled():
            return self._fallback_quiz(topic, difficulty, num_questions, marks)

        system_prompt = (
            "You are an academic assessment generation engine designed for structured enterprise learning platforms. "
            "Your responsibility is to generate high-quality, non-repetitive multiple choice questions strictly in valid JSON format."
        )
        prompt = f"""
INPUT PARAMETERS:
- topic: {topic}
- difficulty: {difficulty}
- number_of_questions: {num_questions}
- marks_per_question: {marks}

Output JSON structure ONLY:
{{
  "metadata": {{
    "topic": "{topic}",
    "difficulty": "{difficulty}",
    "total_questions": {num_questions},
    "marks_per_question": {marks}
  }},
  "quiz": [
    {{
      "question_id": 1,
      "question": "string",
      "options": {{
        "A": "string",
        "B": "string",
        "C": "string",
        "D": "string"
      }},
      "correct_answer": "A",
      "marks": {marks}
    }}
  ]
}}
"""
        estimated_tokens = min(1800, max(500, num_questions * 130))
        raw = await self._call_llm(prompt, system_prompt, max_tokens=estimated_tokens)
        if not raw:
            return self._fallback_quiz(topic, difficulty, num_questions, marks)
        return self._validate_json(raw, QuizResponse) or self._fallback_quiz(topic, difficulty, num_questions, marks)

    async def analyze_performance(self, report_data: Dict[str, Any]) -> Optional[SkillGapResponse]:
        if not self._remote_enabled():
            return self._fallback_analysis(report_data)

        system_prompt = (
            "You are a performance analysis assistant for an educational assessment platform. "
            "Analyze weaknesses, strengths, and skill gaps logically from the provided report."
        )
        prompt = f"""
Respond strictly in valid JSON format.

Analyze the following structured performance report:
{json.dumps(report_data, indent=2)}
"""
        raw = await self._call_llm(prompt, system_prompt, max_tokens=500)
        if not raw:
            return self._fallback_analysis(report_data)
        return self._validate_json(raw, SkillGapResponse) or self._fallback_analysis(report_data)

    async def generate_roadmap(
        self,
        skill: str,
        domain: str,
        current_level: int,
        target_level: int,
        weekly_hours: int,
    ) -> Optional[RoadmapAI]:
        if not self._remote_enabled():
            return self._fallback_roadmap(skill, domain, current_level, target_level, weekly_hours)

        system_prompt = (
            "You are an academic curriculum designer. Create a realistic four-week roadmap "
            "for a faculty member with practical and measurable tasks."
        )
        prompt = f"""
Skill: {skill}
Domain: {domain}
Current Level: {current_level}
Target Level: {target_level}
Weekly Hours: {weekly_hours}
"""
        raw = await self._call_llm(prompt, system_prompt, max_tokens=700)
        if not raw:
            return self._fallback_roadmap(skill, domain, current_level, target_level, weekly_hours)
        return self._validate_json(raw, RoadmapAI) or self._fallback_roadmap(skill, domain, current_level, target_level, weekly_hours)

    async def generate_practice_questions(self, topic: str, difficulty: str, count: int) -> Optional[PracticeQuestionResponseAI]:
        if not self._remote_enabled():
            return self._fallback_practice_questions(topic, difficulty, count)

        system_prompt = "Generate multiple choice practice questions in strict JSON."
        prompt = f"Topic: {topic}\nDifficulty: {difficulty}\nCount: {count}"
        raw = await self._call_llm(prompt, system_prompt, max_tokens=900)
        if not raw:
            return self._fallback_practice_questions(topic, difficulty, count)
        return self._validate_json(raw, PracticeQuestionResponseAI) or self._fallback_practice_questions(topic, difficulty, count)

    async def suggest_skills(self, current_skills: List[str], department: str) -> Optional[SkillSuggestionsAI]:
        if not self._remote_enabled():
            return self._fallback_skill_suggestions(current_skills, department)

        system_prompt = "Suggest complementary faculty development skills in strict JSON."
        prompt = f"Department: {department}\nCurrent Skills: {', '.join(current_skills)}"
        raw = await self._call_llm(prompt, system_prompt, max_tokens=350)
        if not raw:
            return self._fallback_skill_suggestions(current_skills, department)
        return self._validate_json(raw, SkillSuggestionsAI) or self._fallback_skill_suggestions(current_skills, department)

    async def generate_learning_roadmap(
        self,
        skill: str,
        weeks: int,
        hours_per_week: int,
        current_level: str = "beginner",
    ) -> Optional[LearningRoadmapAI]:
        if not self._remote_enabled():
            return self._fallback_learning_roadmap(skill, weeks, hours_per_week, current_level)

        system_prompt = "Create a week-by-week learning roadmap in strict JSON."
        prompt = f"Skill: {skill}\nWeeks: {weeks}\nHours per week: {hours_per_week}\nCurrent level: {current_level}"
        raw = await self._call_llm(prompt, system_prompt, max_tokens=350)
        if not raw:
            return self._fallback_learning_roadmap(skill, weeks, hours_per_week, current_level)
        return self._validate_json(raw, LearningRoadmapAI) or self._fallback_learning_roadmap(skill, weeks, hours_per_week, current_level)

    async def chat_with_coach(
        self,
        user_message: str,
        conversation_history: List[Dict[str, str]],
        performance_context: Dict[str, Any],
    ) -> Optional[str]:
        if not self._remote_enabled():
            return self._fallback_chat(user_message, performance_context)

        total_tests = performance_context.get("total_tests", 0)
        avg_accuracy = performance_context.get("avg_accuracy", 0)
        weak_topics = performance_context.get("weak_topics", [])
        strong_topics = performance_context.get("strong_topics", [])
        recent_tests = performance_context.get("recent_tests", [])
        if total_tests == 0:
            context_block = "The faculty member has not completed any tests yet."
        else:
            weak_str = ", ".join(f"{t['topic']} ({t['avg_accuracy']:.0f}%)" for t in weak_topics) if weak_topics else "None"
            strong_str = ", ".join(f"{t['topic']} ({t['avg_accuracy']:.0f}%)" for t in strong_topics) if strong_topics else "None"
            recent_str = "; ".join(f"{t['title']} scored {t['accuracy']:.0f}%" for t in recent_tests[:3]) if recent_tests else "No recent tests"
            context_block = (
                f"Total tests: {total_tests}\n"
                f"Average accuracy: {avg_accuracy:.1f}%\n"
                f"Weak topics: {weak_str}\n"
                f"Strong topics: {strong_str}\n"
                f"Recent activity: {recent_str}"
            )

        messages = [{"role": "system", "content": context_block}]
        messages.extend(conversation_history[-8:])
        messages.append({"role": "user", "content": user_message})
        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": 0.4,
            "max_tokens": 280,
        }
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://github.com/SanjayMuthuswamy/Faculty-Skill-Development-Portal",
            "X-Title": "Faculty Skill Development Portal",
        }

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            for attempt in range(self.max_retries + 1):
                try:
                    response = await client.post(self.base_url, json=payload, headers=headers)
                    response.raise_for_status()
                    data = response.json()
                    if data.get("choices"):
                        return data["choices"][0]["message"]["content"]
                    return self._fallback_chat(user_message, performance_context)
                except Exception as exc:
                    logger.warning("Chat coach attempt %s failed: %s", attempt + 1, exc)
                    if attempt == self.max_retries:
                        return self._fallback_chat(user_message, performance_context)
        return self._fallback_chat(user_message, performance_context)

    async def generate_course_feedback(self, wrong_questions: list, course_title: str) -> Optional[dict]:
        if not self._remote_enabled():
            return self._fallback_course_feedback(wrong_questions, course_title)
        if not wrong_questions:
            return {"weak_areas": [], "suggestions": ["Excellent work! You answered all questions correctly."]}

        payload = {
            "model": self.model,
            "messages": [
                {
                    "role": "system",
                    "content": "Identify weak areas from missed course assessment questions and respond with JSON only.",
                },
                {
                    "role": "user",
                    "content": (
                        f"Course: {course_title}\n"
                        f"Incorrect questions:\n" + "\n".join(f"- {question}" for question in wrong_questions[:10])
                    ),
                },
            ],
            "temperature": 0.3,
            "max_tokens": 260,
            "response_format": {"type": "json_object"},
        }
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://github.com/SanjayMuthuswamy/Faculty-Skill-Development-Portal",
            "X-Title": "Faculty Skill Development Portal",
        }
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                response = await client.post(self.base_url, json=payload, headers=headers)
                response.raise_for_status()
                data = response.json()
                if data.get("choices"):
                    return json.loads(data["choices"][0]["message"]["content"])
            except Exception as exc:
                logger.warning("Course feedback generation failed: %s", exc)
        return self._fallback_course_feedback(wrong_questions, course_title)
