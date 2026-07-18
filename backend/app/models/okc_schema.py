from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

# ==========================================
# 1. Metadata Schema (metadata.json)
# ==========================================
class SourceFileMetadata(BaseModel):
    filename: str
    file_size: int
    file_hash: str
    mime_type: str

class OKCMetadata(BaseModel):
    id: str
    title: str
    description: Optional[str] = ""
    author: str = "Open Knowledge Compiler"
    created_at: str
    okc_version: str = "1.0.0"
    source_files: List[SourceFileMetadata] = []

# ==========================================
# 2. Knowledge Schema (knowledge.json)
# ==========================================
class Definition(BaseModel):
    term: str
    explanation: str

class Topic(BaseModel):
    id: str
    title: str
    summary: str
    definitions: List[Definition] = []
    facts: List[str] = []
    difficulty: str = "Intermediate" # Beginner, Intermediate, Advanced
    learning_time_minutes: int = 15
    prerequisites: List[str] = []
    key_takeaways: List[str] = []

class OKCPrimaryKnowledge(BaseModel):
    topics: List[Topic] = []

# ==========================================
# 3. Graph Schema (graph.json)
# ==========================================
class GraphNode(BaseModel):
    id: str
    label: str
    type: str = "topic" # topic, concept, keyword
    importance: float = 0.5 # 0 to 1

class GraphEdge(BaseModel):
    source: str
    target: str
    relation_type: str = "prerequisite" # prerequisite, related_to, part_of

class OKCGraph(BaseModel):
    nodes: List[GraphNode] = []
    edges: List[GraphEdge] = []

# ==========================================
# 4. Citations Schema (citations.json)
# ==========================================
class Citation(BaseModel):
    id: str
    source_file: str
    page: Optional[int] = None
    line_number: Optional[int] = None
    timestamp: Optional[str] = None
    snippet: str

class OKCCitations(BaseModel):
    citations: Dict[str, Citation] = {} # Map citation_id -> Citation

# ==========================================
# 5. Course Schema (course.json)
# ==========================================
class Lab(BaseModel):
    id: str
    title: str
    instructions_markdown: str
    starter_code: Optional[str] = None
    expected_output: Optional[str] = None

class Lesson(BaseModel):
    id: str
    title: str
    objectives: List[str] = []
    content_markdown: str
    labs: List[Lab] = []

class Module(BaseModel):
    id: str
    title: str
    description: str
    lessons: List[Lesson] = []

class OKCCourse(BaseModel):
    modules: List[Module] = []

# ==========================================
# 6. Book Schema (book.json)
# ==========================================
class Chapter(BaseModel):
    id: str
    chapter_number: int
    title: str
    content_markdown: str

class GlossaryItem(BaseModel):
    term: str
    definition: str

class OKCBook(BaseModel):
    title: str
    chapters: List[Chapter] = []
    glossary: List[GlossaryItem] = []
    appendices: Dict[str, str] = {} # name -> content_markdown

# ==========================================
# 7. Slides Schema (slides.json)
# ==========================================
class Slide(BaseModel):
    id: str
    title: str
    bullets: List[str] = []
    speaker_notes: Optional[str] = None
    diagram_mermaid: Optional[str] = None

class SlideDeck(BaseModel):
    id: str
    title: str
    slides: List[Slide] = []

class OKCSlides(BaseModel):
    decks: List[SlideDeck] = []

# ==========================================
# 8. Quiz Schema (quiz.json)
# ==========================================
class Question(BaseModel):
    id: str
    type: str = "mcq" # mcq, true_false, fill_blank, coding, reasoning
    question_text: str
    options: Optional[List[str]] = None # for mcq
    correct_answer: str # correct option, true/false, fill in text, or sample solution code
    explanation: str
    difficulty: str = "Intermediate"

class OKCQuiz(BaseModel):
    questions: List[Question] = []

# ==========================================
# 9. Projects Schema (projects.json)
# ==========================================
class ProjectTask(BaseModel):
    id: str
    description: str
    starter_code: Optional[str] = None
    test_cases_json: Optional[str] = None

class OKCProject(BaseModel):
    id: str
    title: str
    description: str
    difficulty: str = "Intermediate"
    tasks: List[ProjectTask] = []

class OKCProjects(BaseModel):
    projects: List[OKCProject] = []

# ==========================================
# 10. Simulation Schema (simulation.json)
# ==========================================
class Simulation(BaseModel):
    id: str
    title: str
    description: str
    html_content: str # Self-contained HTML + Inline CSS + JS Canvas visualization code

class OKCSimulation(BaseModel):
    simulations: List[Simulation] = []

# ==========================================
# 11. Timeline Schema (timeline.json)
# ==========================================
class TimelineEvent(BaseModel):
    id: str
    date: str # e.g. "1969", "2024-05", etc.
    title: str
    description: str

class OKCTimeline(BaseModel):
    events: List[TimelineEvent] = []

# ==========================================
# 12. MindMap Schema (mindmap.json)
# ==========================================
class MindMapNode(BaseModel):
    id: str
    label: str
    parent_id: Optional[str] = None
    children: List[str] = []

class OKCMindMap(BaseModel):
    root_id: str
    nodes: Dict[str, MindMapNode] = {}

# ==========================================
# 13. Revision Schema (revision.json)
# ==========================================
class Flashcard(BaseModel):
    id: str
    front: str
    back: str
    difficulty_score: float = 2.5 # initial ease factor (SM-2)
    repetitions: int = 0
    interval_days: int = 1
    next_review_date: Optional[str] = None # ISO format date

class OKCRevision(BaseModel):
    flashcards: List[Flashcard] = []
