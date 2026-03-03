
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
