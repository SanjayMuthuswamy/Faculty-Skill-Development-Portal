from enum import Enum

class UserRole(str, Enum):
    ADMIN = "ADMIN"
    FACULTY = "FACULTY"

class Difficulty(str, Enum):
    EASY = "EASY"
    MEDIUM = "MEDIUM"
    HARD = "HARD"
    MIXED = "MIXED"
    BEGINNER = "BEGINNER"
    INTERMEDIATE = "INTERMEDIATE"
    ADVANCED = "ADVANCED"

class QuestionType(str, Enum):
    MCQ = "MCQ"

class SkillCategory(str, Enum):
    TECHNICAL = "TECHNICAL"
    PEDAGOGY = "PEDAGOGY"
    SOFT_SKILLS = "SOFT_SKILLS"

class SkillLevel(str, Enum):
    BEGINNER = "BEGINNER"
    INTERMEDIATE = "INTERMEDIATE"
    ADVANCED = "ADVANCED"
    EXPERT = "EXPERT"

class VerificationStatus(str, Enum):
    VERIFIED = "VERIFIED"
    SELF_DECLARED = "SELF_DECLARED"
    PENDING = "PENDING"
    REJECTED = "REJECTED"

class ProgramMode(str, Enum):
    ONLINE = "ONLINE"
    OFFLINE = "OFFLINE"
    HYBRID = "HYBRID"

class ProgramStatus(str, Enum):
    DRAFT = "DRAFT"
    PUBLISHED = "PUBLISHED"
    ARCHIVED = "ARCHIVED"
    UPCOMING = "UPCOMING"
    ONGOING = "ONGOING"
    COMPLETED = "COMPLETED"

class EnrollmentStatus(str, Enum):
    ENROLLED = "ENROLLED"
    CANCELLED = "CANCELLED"
    COMPLETED = "COMPLETED"
    DROPPED = "DROPPED"

class PackStatus(str, Enum):
    DRAFT = "DRAFT"
    PUBLISHED = "PUBLISHED"
    ARCHIVED = "ARCHIVED"

class AttemptStatus(str, Enum):
    IN_PROGRESS = "IN_PROGRESS"
    SUBMITTED = "SUBMITTED"

class PerformanceAnalysisStatus(str, Enum):
    PENDING = "PENDING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"

class QuestionOption(str, Enum):
    A = "A"
    B = "B"
    C = "C"
    D = "D"

