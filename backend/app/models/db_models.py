from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime

class OKCLibraryItem(SQLModel, table=True):
    """
    Tracks local compiled or imported .okc files in the library.
    """
    id: str = Field(primary_key=True)
    title: str
    description: Optional[str] = ""
    author: str = "Open Knowledge Compiler"
    filepath: str # Path to the .okc file on disk
    extract_dir: str # Path to the extracted files for active reading
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

class TutorChatMessage(SQLModel, table=True):
    """
    Saves context-rich chat histories for the local AI Tutor.
    """
    id: Optional[int] = Field(default=None, primary_key=True)
    package_id: str
    session_id: str
    role: str # 'user' or 'assistant'
    content: str
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

class LearningProgress(SQLModel, table=True):
    """
    Keeps track of learning history: completed lessons, quizzes, flashcards spaced repetition.
    """
    id: Optional[int] = Field(default=None, primary_key=True)
    package_id: str
    element_id: str # ID of the topic, flashcard, quiz question, or lesson
    element_type: str # 'lesson', 'quiz_question', 'flashcard', 'simulation'
    status: str = "completed" # 'started', 'completed'
    score: Optional[float] = 0.0 # for quizzes
    repetitions: int = 0 # for flashcards spaced repetition
    interval_days: int = 1 # for flashcards spaced repetition
    next_review_date: Optional[str] = None # ISO format date
    last_reviewed: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
