export interface OKCMetadata {
  id: string;
  title: string;
  description: string;
  author: string;
  created_at: string;
  okc_version: string;
}

export interface Topic {
  id: string;
  title: string;
  summary: string;
  definitions: Array<{ term: string; explanation: string }>;
  facts: string[];
  difficulty: string;
  learning_time_minutes: number;
  prerequisites: string[];
  key_takeaways: string[];
}

export interface GraphNode {
  id: string;
  label: string;
  type: string;
  importance: number;
}

export interface GraphEdge {
  source: string;
  target: string;
  relation_type: string;
}

export interface OKCGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface Citation {
  id: string;
  source_file: string;
  page?: number;
  line_number?: number;
  timestamp?: string;
  snippet: string;
}

export interface Chapter {
  id: string;
  chapter_number: number;
  title: string;
  content_markdown: string;
}

export interface GlossaryItem {
  term: string;
  definition: string;
}

export interface Slide {
  id: string;
  title: string;
  bullets: string[];
  speaker_notes?: string;
  diagram_mermaid?: string;
}

export interface SlideDeck {
  id: string;
  title: string;
  slides: Slide[];
}

export interface Question {
  id: string;
  type: string;
  question_text: string;
  options?: string[];
  correct_answer: string;
  explanation: string;
  difficulty: string;
}

export interface Lab {
  id: string;
  title: string;
  instructions_markdown: string;
  starter_code?: string;
  expected_output?: string;
}

export interface Lesson {
  id: string;
  title: string;
  objectives: string[];
  content_markdown: string;
  labs: Lab[];
}

export interface Module {
  id: string;
  title: string;
  description: string;
  lessons: Lesson[];
}

export interface ProjectTask {
  id: string;
  description: string;
  starter_code?: string;
  test_cases_json?: string;
}

export interface OKCProject {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  tasks: ProjectTask[];
}

export interface Simulation {
  id: string;
  title: string;
  description: string;
  html_content: string;
}

export interface TimelineEvent {
  id: string;
  date: string;
  title: string;
  description: string;
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  difficulty_score: number;
  repetitions: number;
  interval_days: number;
  next_review_date?: string;
}

export interface OKCPackageData {
  metadata: OKCMetadata;
  knowledge: { topics: Topic[] };
  graph: OKCGraph;
  citations: { citations: Record<string, Citation> };
  course: { modules: Module[] };
  book: { title: string; chapters: Chapter[]; glossary: GlossaryItem[]; appendices: Record<string, string> };
  slides: { decks: SlideDeck[] };
  quiz: { questions: Question[] };
  projects: { projects: OKCProject[] };
  simulation: { simulations: Simulation[] };
  timeline: { events: TimelineEvent[] };
  mindmap: { root_id: string; nodes: Record<string, any> };
  revision: { flashcards: Flashcard[] };
}
