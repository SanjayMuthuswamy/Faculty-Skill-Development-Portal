
import json
import logging
import httpx
from typing import List, Dict, Any, Optional, Type, TypeVar
from pydantic import BaseModel, Field, ValidationError
from app.core.config import settings

logger = logging.getLogger(__name__)

T = TypeVar('T', bound=BaseModel)

# --- Schemas for Structured Output ---

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
    role: str  # "user" or "assistant"
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

# --- LLM Service ---

class LLMService:
    def __init__(self):
        self.base_url = settings.OPENROUTER_BASE_URL
        self.api_key = settings.OPENROUTER_API_KEY
        self.model = settings.OPENROUTER_MODEL
        self.timeout = httpx.Timeout(settings.LLM_TIMEOUT_SECONDS)
        self.max_retries = settings.LLM_MAX_RETRIES

    async def _call_llm(self, prompt: str, system_prompt: str = "") -> Optional[str]:
        """Base method to call OpenRouter with retries and guardrails."""
        if not self.api_key:
            logger.error("OpenRouter API key not configured")
            return None

        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.3,
            "response_format": {"type": "json_object"}
        }

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://github.com/SanjayMuthuswamy/Faculty-Skill-Development-Portal", # Required by OpenRouter
            "X-Title": "Faculty Skill Development Portal"
        }

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            for attempt in range(self.max_retries + 1):
                try:
                    logger.info(f"--- [AI] Sending Prompt to OpenRouter ({self.model}) [Attempt {attempt + 1}] ---")
                    response = await client.post(self.base_url, json=payload, headers=headers)
                    response.raise_for_status()
                    data = response.json()
                    
                    if "choices" in data and len(data["choices"]) > 0:
                        content = data["choices"][0]["message"]["content"]
                        logger.info("--- [AI] Successfully received response from OpenRouter ---")
                        return content
                    else:
                        logger.error(f"Unexpected OpenRouter response format: {data}")
                        return None
                        
                except (httpx.HTTPError, json.JSONDecodeError) as e:
                    logger.warning(f"--- [AI] OpenRouter call attempt {attempt + 1} failed: {str(e)} ---")
                    if attempt == self.max_retries:
                        logger.error("--- [AI] OpenRouter exhausted all retries. ---")
                        return None
        return None

    def _validate_json(self, raw_response: str, schema: Type[T]) -> Optional[T]:
        """Strict JSON schema validation."""
        try:
            # Sometime LLMs wrap JSON in backticks or have extra text
            cleaned = raw_response.strip()
            if cleaned.startswith("```json"):
                cleaned = cleaned[7:]
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
            
            data = json.loads(cleaned)
            return schema.model_validate(data)
        except (json.JSONDecodeError, ValidationError) as e:
            logger.error(f"JSON Validation failed: {str(e)}\nRaw Response: {raw_response}")
            return None

    async def generate_quiz(self, topic: str, difficulty: str, num_questions: int, marks: int) -> Optional[QuizResponse]:
        """Generates a structured quiz using the Enterprise prompt framework."""
        system_prompt = (
            "You are an academic assessment generation engine designed for structured enterprise learning platforms. "
            "Your responsibility is to generate high-quality, non-repetitive multiple choice questions strictly in valid JSON format. "
            "Internal Prompt Refinement: Redesign the question flow for maximum conceptual clarity without exposing this thought process."
        )

        prompt = f"""
INPUT PARAMETERS:
- topic: {topic}
- difficulty: {difficulty}
- number_of_questions: {num_questions}
- marks_per_question: {marks}

Difficulty Meaning:
Easy -> fundamental concepts, definitions
Medium -> applied understanding, scenario-based
Hard -> analytical, conceptual depth, edge cases

Strict Requirements:
1. Generate exactly {num_questions} questions.
2. Each question must have exactly 4 options: A, B, C, D.
3. Only one correct_answer.
4. Do NOT include explanations.
5. Do NOT include markdown.
6. Do NOT include commentary outside JSON.
7. Avoid ambiguity.
8. Avoid duplicate question intent.
9. Ensure factual correctness.
10. Validate JSON internally before responding.

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
        raw = await self._call_llm(prompt, system_prompt)
        if not raw:
            return None
            
        return self._validate_json(raw, QuizResponse)

    async def analyze_performance(self, report_data: Dict[str, Any]) -> Optional[SkillGapResponse]:
        """Analyzes performance data to identify skill gaps."""
        system_prompt = (
            "You are a performance analysis assistant for an educational assessment platform. "
            "Analyze weaknesses, strengths, and skill gaps logically from the provided report."
        )

        prompt = f"""
Respond strictly in valid JSON format.

Analyze the following structured performance report.
Do not calculate marks. Marks are already computed.

Input Report:
{json.dumps(report_data, indent=2)}

Provide:
1. Strength summary
2. Weakness summary
3. Skill gap identification
4. 3 actionable improvement steps
5. Recommended difficulty level for next quiz (Easy/Medium/Hard)

Respond in structured JSON structure ONLY:
{{
  "analysis": {{
    "strength": "string",
    "weakness": "string",
    "skill_gaps": ["string"],
    "recommendations": ["string"],
    "next_difficulty": "Easy/Medium/Hard"
  }}
}}
"""
        raw = await self._call_llm(prompt, system_prompt)
        if not raw:
            return None
            
        return self._validate_json(raw, SkillGapResponse)

    async def generate_roadmap(self, skill: str, domain: str, current_level: int, target_level: int, weekly_hours: int) -> Optional[RoadmapAI]:
        """Generates a structured 4-week roadmap using Ollama."""
        system_prompt = (
            "You are an academic curriculum designer. Your goal is to create a structured, 4-week skill development roadmap "
            "for a faculty member. The roadmap must be pedagogically sound and realistic given the weekly time commitment."
        )

        prompt = f"""
INPUT PARAMETERS:
- Skill: {skill}
- Domain: {domain}
- Current Proficiency: {current_level}/10
- Target Proficiency: {target_level}/10
- Weekly Commitment: {weekly_hours} hours

Requirements:
1. Generate exactly 4 weeks.
2. Each week must have a title and 3-4 specific, actionable tasks.
3. Suggest required_practice_count (number of tests to take) and required_min_avg_score (%) for each week.
4. Output strictly in JSON format.

Output JSON structure ONLY:
{{
  "weeks": [
    {{
      "week_number": 1,
      "title": "Fundamental Concepts of ...",
      "required_practice_count": 3,
      "required_min_avg_score": 65.0,
      "tasks": [
        "Actionable task 1",
        "Actionable task 2",
        "Actionable task 3"
      ]
    }},
    ...
  ]
}}
"""
        raw = await self._call_llm(prompt, system_prompt)
        if not raw:
            return None
            
        return self._validate_json(raw, RoadmapAI)

    async def generate_practice_questions(self, topic: str, difficulty: str, count: int) -> Optional[PracticeQuestionResponseAI]:
        """Generates a list of MCQs for practice using Ollama."""
        system_prompt = (
            "You are an expert examiner in professional development. Your task is to generate high-quality "
            "multiple-choice questions (MCQs) for a faculty member. Ensure the questions are accurate and relevant."
        )

        prompt = f"""
INPUT PARAMETERS:
- Topic: {topic}
- Difficulty: {difficulty}
- Count: {count}

Requirements:
1. Generate exactly {count} MCQs.
2. Each question must have 4 options (A, B, C, D).
3. Provide a clear, detailed explanation for the correct answer.
4. Output strictly in JSON format.

Output JSON structure ONLY:
{{
  "questions": [
    {{
      "question_text": "string",
      "option_a": "string",
      "option_b": "string",
      "option_c": "string",
      "option_d": "string",
      "correct_option": "A",
      "explanation": "string"
    }},
    ...
  ]
}}
"""
        raw = await self._call_llm(prompt, system_prompt)
        if not raw:
            return None
            
        return self._validate_json(raw, PracticeQuestionResponseAI)

    async def suggest_skills(self, current_skills: List[str], department: str) -> Optional[SkillSuggestionsAI]:
        """Suggests new skills to learn based on current profile."""
        system_prompt = (
            "You are a professional development coach for higher education faculty. "
            "Suggest relevant, modern skills that would complement the faculty member's current expertise."
        )

        prompt = f"""
FACULTY PROFILE:
- Department: {department}
- Current Skills: {", ".join(current_skills) if current_skills else "None listed"}

Requirements:
1. Suggest 3-5 complementary or emerging skills.
2. Provide a brief reasoning for these suggestions.
3. Output strictly in JSON format.

Output JSON structure ONLY:
{{
  "suggested_skills": ["string"],
  "reasoning": "string"
}}
"""
        raw = await self._call_llm(prompt, system_prompt)
        if not raw:
            return None
            
        return self._validate_json(raw, SkillSuggestionsAI)

    async def generate_learning_roadmap(
        self, skill: str, weeks: int, hours_per_week: int, current_level: str = "beginner"
    ) -> Optional[LearningRoadmapAI]:
        """Generates a detailed, variable-length learning roadmap with resources."""
        system_prompt = (
            "You are an expert curriculum designer. Create a structured, week-by-week learning roadmap "
            "for a professional who wants to master a skill. Each week must include specific goals, "
            "topics, learning resources (with real URLs), and practice exercises. "
            "Be realistic about what can be accomplished given the weekly hours."
        )

        prompt = f"""
INPUT PARAMETERS:
- Skill to learn: {skill}
- Current proficiency level: {current_level}
- Total weeks: {weeks}
- Hours per week: {hours_per_week}

IMPORTANT: The learner is at '{current_level}' level. Tailor content accordingly:
- beginner: Start from scratch with fundamentals, simple exercises, basic terminology.
- intermediate: Skip basics, focus on applied skills, patterns, and real-world projects.
- advanced: Deep dives, architecture, optimization, cutting-edge topics, complex projects.

Requirements:
1. Generate exactly {weeks} weeks.
2. Each week must include:
   - goals: 2-3 specific, measurable learning goals
   - topics: 2-4 core topics to study
   - resources: 2-3 learning resources with title and URL (use real documentation / tutorial URLs)
   - practice: 2-3 hands-on exercises or mini-projects
3. Make progression logical (basics first, advanced later).
4. Output strictly in JSON format with NO additional text.

Output JSON structure ONLY:
{{
  "weekly_plan": [
    {{
      "week": 1,
      "goals": ["Understand core concepts of {skill}", "Set up development environment"],
      "topics": ["Introduction to {skill}", "Core terminology"],
      "resources": [
        {{"title": "Official Documentation", "url": "https://example.com/docs"}},
        {{"title": "Beginner Tutorial", "url": "https://example.com/tutorial"}}
      ],
      "practice": ["Complete getting-started tutorial", "Build a hello-world project"]
    }}
  ]
}}
"""
        raw = await self._call_llm(prompt, system_prompt)
        if not raw:
            return None

        return self._validate_json(raw, LearningRoadmapAI)

    async def chat_with_coach(
        self,
        user_message: str,
        conversation_history: List[Dict[str, str]],
        performance_context: Dict[str, Any]
    ) -> Optional[str]:
        """Interactive AI coach chat using performance data as context."""
        if not self.api_key:
            logger.error("OpenRouter API key not configured")
            return None

        # Build a rich system prompt from the faculty's performance data
        total_tests = performance_context.get("total_tests", 0)
        avg_accuracy = performance_context.get("avg_accuracy", 0)
        weak_topics = performance_context.get("weak_topics", [])
        strong_topics = performance_context.get("strong_topics", [])
        recent_tests = performance_context.get("recent_tests", [])
        no_data = total_tests == 0

        if no_data:
            context_block = "The faculty member has not completed any tests yet. Encourage them to take a test to get personalized insights."
        else:
            weak_str = ", ".join([f"{t['topic']} ({t['avg_accuracy']:.0f}%)" for t in weak_topics]) if weak_topics else "None identified"
            strong_str = ", ".join([f"{t['topic']} ({t['avg_accuracy']:.0f}%)" for t in strong_topics]) if strong_topics else "None identified"
            recent_str = "; ".join([f"{t['title']} scored {t['accuracy']:.0f}%" for t in recent_tests[:3]]) if recent_tests else "No recent tests"

            context_block = f"""
Faculty Performance Summary:
- Total tests completed: {total_tests}
- Overall average accuracy: {avg_accuracy:.1f}%
- Weak topics (accuracy < 70%): {weak_str}
- Strong topics (accuracy >= 70%): {strong_str}
- Recent activity: {recent_str}
"""

        system_prompt = f"""You are an AI learning coach for the Faculty Skill Development Portal. \
You help faculty members understand their performance, identify weak areas, and improve their skills through personalized guidance.

{context_block}

Guidelines:
- Be concise, encouraging, and specific. Use bullet points for lists.
- Always ground your answers in the performance data above.
- If asked about weak topics, reference the specific topics and their accuracy scores.
- If asked for study recommendations, suggest practical next steps.
- If no data is available, encourage the faculty member to take a test first.
- Keep responses under 250 words unless asked for a detailed plan."""

        # Build message list: system + history + current user message
        messages = [{"role": "system", "content": system_prompt}]
        for msg in conversation_history:
            messages.append({"role": msg["role"], "content": msg["content"]})
        messages.append({"role": "user", "content": user_message})

        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": 0.5,
        }
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://github.com/SanjayMuthuswamy/Faculty-Skill-Development-Portal",
            "X-Title": "Faculty Skill Development Portal"
        }

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            for attempt in range(self.max_retries + 1):
                try:
                    response = await client.post(self.base_url, json=payload, headers=headers)
                    response.raise_for_status()
                    data = response.json()
                    if "choices" in data and data["choices"]:
                        return data["choices"][0]["message"]["content"]
                    return None
                except Exception as e:
                    logger.warning(f"Chat coach attempt {attempt + 1} failed: {e}")
                    if attempt == self.max_retries:
                        return None
        return None

    async def generate_course_feedback(
        self,
        wrong_questions: list,
        course_title: str
    ) -> dict | None:
        """Generate AI feedback identifying weak areas after a course assessment."""
        if not self.api_key:
            return None
        if not wrong_questions:
            return {"weak_areas": [], "suggestions": ["Excellent work! You answered all questions correctly."]}

        prompt = f"""
A faculty member just completed the final assessment for the course: "{course_title}".

They answered the following questions INCORRECTLY:
{chr(10).join(f"- {q}" for q in wrong_questions[:10])}

Based on these incorrect answers, identify:
1. The 2-4 main weak topic areas
2. 3-4 specific, actionable improvement suggestions

Respond strictly in this JSON format:
{{
  "weak_areas": ["topic 1", "topic 2", "topic 3"],
  "suggestions": [
    "Specific suggestion 1",
    "Specific suggestion 2",
    "Specific suggestion 3"
  ]
}}
"""
        system = (
            "You are an educational assessment analyst. Identify knowledge gaps from incorrect answers "
            "and provide specific, actionable improvement recommendations. Respond only in JSON."
        )

        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.3,
            "response_format": {"type": "json_object"}
        }
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://github.com/SanjayMuthuswamy/Faculty-Skill-Development-Portal",
            "X-Title": "Faculty Skill Development Portal"
        }
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                response = await client.post(self.base_url, json=payload, headers=headers)
                response.raise_for_status()
                data = response.json()
                if "choices" in data and data["choices"]:
                    import json as _json
                    raw = data["choices"][0]["message"]["content"]
                    return _json.loads(raw)
            except Exception as e:
                logger.warning(f"Course feedback generation failed: {e}")
        return None

