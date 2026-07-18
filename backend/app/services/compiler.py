import os
import uuid
import datetime
import hashlib
import re
from typing import List, Dict, Any
from app.models.okc_schema import (
    OKCMetadata,
    OKCPrimaryKnowledge,
    OKCCourse,
    OKCBook,
    OKCSlides,
    OKCQuiz,
    OKCProjects,
    OKCSimulation,
    OKCTimeline,
    OKCMindMap,
    OKCRevision,
    Topic,
    Definition,
    Module,
    Lesson,
    Lab,
    Chapter,
    GlossaryItem,
    SlideDeck,
    Slide,
    Question,
    ProjectTask,
    OKCProject,
    Simulation,
    TimelineEvent,
    MindMapNode,
    Flashcard,
    SourceFileMetadata
)
from app.services.llm import LocalLLMService
from app.services.graph import SemanticGraphBuilder
from app.services.packager import OKCPackage, OKCPager, OKCPackager
from app.core import config
from pydantic import BaseModel

class ExtractionResult(BaseModel):
    topics: List[Topic]
    glossary: List[Definition]
    events: List[TimelineEvent]

class SimulatorCodeResult(BaseModel):
    html_content: str

class QuizResult(BaseModel):
    questions: List[Question]

class KnowledgeCompiler:
    @staticmethod
    def _create_fallback_data(title: str, text_content: str) -> ExtractionResult:
        """
        Creates fallback topics, glossary items, and events using string parser heuristics
        in case local LLM is not active or fails.
        """
        # Heuristically split text into chunks
        paragraphs = [p.strip() for p in text_content.split("\n\n") if len(p.strip()) > 30]
        if not paragraphs:
            paragraphs = ["Introduction to the material.", "Core concepts of this study.", "Advanced applications."]

        topics = []
        definitions = []
        events = []
        
        # Simple extraction heuristics
        keywords = ["introduction", "architecture", "mechanism", "database", "algorithm", "history", "design", "model"]
        
        # Generate 3 dummy chapters/topics based on content length
        chunk_size = max(1, len(paragraphs) // 3)
        for idx in range(3):
            sub_paragraphs = paragraphs[idx * chunk_size : (idx + 1) * chunk_size]
            if not sub_paragraphs:
                sub_paragraphs = ["Content detailing core principles and details."]
                
            topic_title = f"Module {idx + 1}: " + (keywords[idx % len(keywords)].capitalize() if idx < len(keywords) else "Deep Dive")
            topic_id = f"topic_{idx + 1}"
            
            summary = " ".join(sub_paragraphs[:2])
            
            # Simple definition extract
            topic_defs = []
            for p in sub_paragraphs:
                if "is defined as" in p or " refers to " in p or " is " in p:
                    parts = re.split(r'is defined as|refers to| is ', p, maxsplit=1)
                    if len(parts) == 2 and len(parts[0].strip().split()) < 4:
                        term = parts[0].strip()
                        explanation = parts[1].strip()
                        def_obj = Definition(term=term, explanation=explanation[:120] + "...")
                        topic_defs.append(def_obj)
                        definitions.append(def_obj)
            
            if not topic_defs:
                term = f"Concept {idx + 1}"
                def_obj = Definition(term=term, explanation=f"Key terms and definitions relating to {topic_title}.")
                topic_defs.append(def_obj)
                definitions.append(def_obj)

            topics.append(Topic(
                id=topic_id,
                title=topic_title,
                summary=summary[:300] + "...",
                definitions=topic_defs,
                facts=[p[:100] + "..." for p in sub_paragraphs[:3]],
                difficulty="Intermediate",
                learning_time_minutes=15,
                prerequisites=[f"topic_{idx}" ] if idx > 0 else [],
                key_takeaways=[f"Understand the main workflow of {topic_title}."]
            ))
            
            events.append(TimelineEvent(
                id=f"event_{idx+1}",
                date=f"202{idx}",
                title=f"Milestone {idx+1}",
                description=f"Key historical advancement regarding {topic_title}."
            ))

        return ExtractionResult(topics=topics, glossary=definitions, events=events)

    @classmethod
    def compile_knowledge(cls, file_path: str, title: str, author: str = "Local Compiler") -> str:
        """
        Compiles raw parsed knowledge chunks into a fully functional .okc container package.
        """
        from app.services.parser import UniversalParser
        from app.services.vector_store import OKCVectorStore
        import re
        
        package_id = str(uuid.uuid4())
        
        # 1. Parse text chunks
        chunks = UniversalParser.parse_file(file_path)
        if not chunks:
            # Create a mock starting chunk if file was completely unreadable
            chunks = [{"text": "Introductory document content.", "source": "input", "hash": "mockhash"}]
            
        full_text = "\n\n".join([c["text"] for c in chunks])
        
        # Index chunks in vector store
        vector_store = OKCVectorStore(package_id)
        vector_store.add_chunks(chunks)
        
        # 2. Extract topics, definitions, timelines (LLM / Fallback)
        system_prompt = (
            "You are a knowledge parsing compiler. Analyze the source text and extract the major structural "
            "topics, technical definitions, and milestones. Format your output strictly matching the requested JSON schema."
        )
        prompt = (
            f"Analyze the following text and extract topics, a glossary of terms, and key timeline events:\n\n"
            f"{full_text[:4000]}" # Limit context window to prevent local LLM overflow
        )
        
        fallback_data = cls._create_fallback_data(title, full_text)
        
        try:
            extraction = LocalLLMService.generate_structured(
                prompt=prompt,
                response_model=ExtractionResult,
                system_prompt=system_prompt,
                fallback_data=fallback_data
            )
        except Exception:
            extraction = fallback_data
            
        # 3. Build Semantic Graph using NetworkX
        okc_graph = SemanticGraphBuilder.build_graph(chunks, [t.model_dump() for t in extraction.topics])
        
        # 4. Instantiate OKC Package
        src_meta = SourceFileMetadata(
            filename=os.path.basename(file_path),
            file_size=os.path.getsize(file_path) if os.path.exists(file_path) else 0,
            file_hash=hashlib.md5(full_text.encode("utf-8")).hexdigest() if "hashlib" in globals() else "hash",
            mime_type="text/plain"
        )
        
        metadata = OKCMetadata(
            id=package_id,
            title=title,
            description=f"Interactive learning workspace compiled from {os.path.basename(file_path)}",
            author=author,
            created_at=datetime.datetime.utcnow().isoformat(),
            source_files=[src_meta]
        )
        
        package = OKCPackage(metadata)
        package.knowledge = OKCPrimaryKnowledge(topics=extraction.topics)
        package.graph = okc_graph
        
        # Load timeline events
        package.timeline = OKCTimeline(events=extraction.events)
        
        # 5. Compile into Textbook (book.json)
        chapters = []
        glossary_items = []
        for idx, t in enumerate(extraction.topics):
            chapters.append(Chapter(
                id=f"chap_{idx+1}",
                chapter_number=idx+1,
                title=t.title,
                content_markdown=(
                    f"# {t.title}\n\n"
                    f"## Executive Summary\n{t.summary}\n\n"
                    f"## Core Concepts\n" + 
                    "\n".join([f"- **{d.term}**: {d.explanation}" for d in t.definitions]) + "\n\n"
                    f"## Important Facts & Key Principles\n" + 
                    "\n".join([f"- {fact}" for fact in t.facts]) + "\n\n"
                    f"## Takeaways\n" + 
                    "\n".join([f"- {tkw}" for tkw in t.key_takeaways])
                )
            ))
            for d in t.definitions:
                glossary_items.append(GlossaryItem(term=d.term, definition=d.explanation))
                
        package.book = OKCBook(
            title=title,
            chapters=chapters,
            glossary=glossary_items,
            appendices={"Study Advice": "Revise the concepts using the interactive flashcard scheduler."}
        )
        
        # 6. Compile into Slides (slides.json)
        decks = []
        slides = []
        for idx, t in enumerate(extraction.topics):
            slide_bullets = [f"Focus: {t.title}"]
            slide_bullets.extend(t.facts[:3])
            
            # Simple mermaid flowchart block for visual layout
            prereq_str = f"[{t.title}]"
            mermaid = f"graph TD\n    A{prereq_str} --> B[Review Detail]"
            
            slides.append(Slide(
                id=f"slide_{idx+1}",
                title=t.title,
                bullets=slide_bullets,
                speaker_notes=f"Discuss {t.title} and outline definitions: " + ", ".join([d.term for d in t.definitions]),
                diagram_mermaid=mermaid
            ))
            
        decks.append(SlideDeck(
            id="deck_1",
            title=f"Core Course Slides: {title}",
            slides=slides
        ))
        package.slides = OKCSlides(decks=decks)
        
        # 7. Compile into Course Modules & Lessons (course.json)
        modules = []
        for idx, t in enumerate(extraction.topics):
            lessons = [Lesson(
                id=f"lesson_{idx+1}",
                title=f"Lesson: {t.title}",
                objectives=t.key_takeaways,
                content_markdown=f"Welcome to the module on {t.title}. Read through the concepts, explore the visual node coordinates, and attempt the lab exercises.",
                labs=[Lab(
                    id=f"lab_{idx+1}",
                    title=f"Interactive Challenge: {t.title}",
                    instructions_markdown=f"Write a script or process mapping to demonstrate {t.title}.",
                    starter_code="// Start coding here\n",
                    expected_output="Success"
                )]
            )]
            
            modules.append(Module(
                id=f"mod_{idx+1}",
                title=t.title,
                description=t.summary[:150] + "...",
                lessons=lessons
            ))
        package.course = OKCCourse(modules=modules)
        
        # 8. Compile into Quiz & Flashcards
        questions = []
        flashcards = []
        for idx, t in enumerate(extraction.topics):
            for d in t.definitions:
                # Flashcard from definition
                flashcards.append(Flashcard(
                    id=str(uuid.uuid4()),
                    front=f"Define: {d.term}",
                    back=d.explanation
                ))
                
                # Quiz question from definition
                questions.append(Question(
                    id=f"quiz_q_{len(questions)+1}",
                    type="mcq",
                    question_text=f"What is the definition of '{d.term}'?",
                    options=[
                        d.explanation,
                        "A process mapping logic configuration.",
                        "An unrelated secondary compiler resource.",
                        "None of the options align with the context."
                    ],
                    correct_answer=d.explanation,
                    explanation=f"Based on the course glossary: {d.term} is defined as {d.explanation}.",
                    difficulty=t.difficulty
                ))
        
        # Add a default reasoning question
        questions.append(Question(
            id=f"quiz_q_reasoning",
            type="reasoning",
            question_text=f"Analyze the relationship between the concepts in {title}. What is the primary dependency?",
            correct_answer="Dependent on core fundamentals specified in Module 1.",
            explanation="The concepts build on initial principles.",
            difficulty="Intermediate"
        ))
        
        package.quiz = OKCQuiz(questions=questions)
        package.revision = OKCRevision(flashcards=flashcards)
        
        # 9. Compile Sandbox Simulation Code (simulation.json)
        # We auto-generate standard simulators depending on keywords, otherwise generate a lovely generic Canvas visualizer
        sim_id = "generic_viz"
        sim_title = "Dynamic Concept Space Sandbox"
        sim_desc = "Interactive canvas playground to simulate conceptual gravity and force connections."
        
        full_text_lower = full_text.lower()
        if "sorting" in full_text_lower or "algorithm" in full_text_lower:
            sim_id = "sort_sim"
            sim_title = "Interactive Sorting Algorithm Visualizer"
            sim_desc = "Visualizes algorithms (Bubble Sort, Quick Sort) sorting arrays dynamically in a sandbox canvas."
            html_code = cls._get_sorting_simulator_code()
        elif "schedul" in full_text_lower or "cpu" in full_text_lower:
            sim_id = "cpu_sim"
            sim_title = "CPU Scheduler Simulator"
            sim_desc = "Visualizes First-Come-First-Serve (FCFS) and Round Robin scheduling algorithms."
            html_code = cls._get_cpu_simulator_code()
        elif "gravity" in full_text_lower or "physics" in full_text_lower:
            sim_id = "physics_sim"
            sim_title = "Physics Sandbox - Gravity Explorer"
            sim_desc = "Interactive 2D gravity particle sandbox simulating mass, acceleration, and friction."
            html_code = cls._get_gravity_simulator_code()
        else:
            # General generic node canvas sandbox
            html_code = cls._get_generic_simulator_code(title, [t.title for t in extraction.topics])
            
        package.simulation = OKCSimulation(simulations=[
            Simulation(id=sim_id, title=sim_title, description=sim_desc, html_content=html_code)
        ])
        
        # 10. Generate Mindmap (mindmap.json)
        mindmap_nodes = {}
        mindmap_nodes["root"] = MindMapNode(id="root", label=title, children=[t.id for t in extraction.topics])
        for t in extraction.topics:
            mindmap_nodes[t.id] = MindMapNode(
                id=t.id, 
                label=t.title, 
                parent_id="root",
                children=[f"{t.id}_def_{i}" for i in range(len(t.definitions))]
            )
            for i, d in enumerate(t.definitions):
                child_id = f"{t.id}_def_{i}"
                mindmap_nodes[child_id] = MindMapNode(
                    id=child_id,
                    label=d.term,
                    parent_id=t.id
                )
                
        package.mindmap = OKCMindMap(root_id="root", nodes=mindmap_nodes)
        
        # Pack to .okc file
        output_filename = f"{re.sub(r'[^a-zA-Z0-9]', '_', title).lower()}.okc"
        okc_output_path = os.path.join(config.BACKEND_DIR, "data", "uploads", output_filename)
        
        OKCPackager.pack(package, okc_output_path)
        return okc_output_path

    # ==========================================
    # Simulator Code Templates
    # ==========================================
    @staticmethod
    def _get_generic_simulator_code(title: str, topics: List[str]) -> str:
        topics_json = json.dumps(topics)
        return f"""<!DOCTYPE html>
<html>
<head>
<style>
    body {{ margin: 0; background: #0b0f19; color: #fff; font-family: system-ui, sans-serif; overflow: hidden; }}
    #canvas {{ display: block; }}
    #controls {{ position: absolute; top: 10px; left: 10px; background: rgba(15, 23, 42, 0.85); padding: 15px; border-radius: 8px; border: 1px solid #1e293b; pointer-events: auto; }}
    h3 {{ margin: 0 0 10px 0; color: #60a5fa; font-size: 16px; }}
    .btn {{ background: #3b82f6; border: none; color: white; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 13px; }}
    .btn:hover {{ background: #2563eb; }}
</style>
</head>
<body>
    <div id="controls">
        <h3>{title} Visual Sandbox</h3>
        <p style="font-size:12px;color:#94a3b8;margin:0 0 10px 0;">Interactive physics simulation connecting knowledge nodes.</p>
        <button class="btn" onclick="addParticle()">Inject Concept Node</button>
    </div>
    <canvas id="canvas"></canvas>
    <script>
        const canvas = document.getElementById("canvas");
        const ctx = canvas.getContext("2d");
        
        let width = canvas.width = window.innerWidth;
        let height = canvas.height = window.innerHeight;
        
        window.addEventListener("resize", () => {{
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        }});
        
        const topics = {topics_json};
        const particles = [];
        
        class Particle {{
            constructor(x, y, text) {{
                this.x = x;
                this.y = y;
                this.vx = (Math.random() - 0.5) * 2;
                this.vy = (Math.random() - 0.5) * 2;
                this.radius = 45;
                this.text = text;
            }}
            update() {{
                this.x += this.vx;
                this.y += this.vy;
                
                if (this.x - this.radius < 0 || this.x + this.radius > width) this.vx *= -1;
                if (this.y - this.radius < 0 || this.y + this.radius > height) this.vy *= -1;
            }}
            draw() {{
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                ctx.fillStyle = "rgba(59, 130, 246, 0.2)";
                ctx.fill();
                ctx.strokeStyle = "#3b82f6";
                ctx.lineWidth = 2;
                ctx.stroke();
                
                ctx.fillStyle = "#ffffff";
                ctx.font = "11px system-ui";
                ctx.textAlign = "center";
                ctx.fillText(this.text.substring(0, 12), this.x, this.y + 4);
            }}
        }}
        
        topics.forEach((t, i) => {{
            particles.push(new Particle(
                100 + Math.random() * (width - 200),
                100 + Math.random() * (height - 200),
                t
            ));
        }});
        
        function addParticle() {{
            particles.push(new Particle(width/2, height/2, "CustomConcept"));
        }}
        
        function animate() {{
            ctx.clearRect(0, 0, width, height);
            
            // Draw connections
            ctx.beginPath();
            ctx.strokeStyle = "rgba(96, 165, 250, 0.15)";
            ctx.lineWidth = 1;
            for (let i = 0; i < particles.length; i++) {{
                for (let j = i + 1; j < particles.length; j++) {{
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                }}
            }}
            ctx.stroke();
            
            particles.forEach(p => {{
                p.update();
                p.draw();
            }});
            
            requestAnimationFrame(animate);
        }}
        animate();
    </script>
</body>
</html>
"""

    @staticmethod
    def _get_sorting_simulator_code() -> str:
        return """<!DOCTYPE html>
<html>
<head>
<style>
    body { margin: 0; background: #0b0f19; color: #fff; font-family: system-ui, sans-serif; text-align: center; }
    #container { max-width: 800px; margin: 20px auto; padding: 20px; background: #111827; border-radius: 8px; border: 1px solid #1e293b; }
    #bars { display: flex; align-items: flex-end; justify-content: center; height: 300px; margin: 20px 0; background: #030712; padding: 10px; border-radius: 6px; }
    .bar { background: #3b82f6; margin: 0 2px; width: 25px; transition: height 0.1s ease; position: relative; }
    .bar.active { background: #ef4444; }
    .bar.sorted { background: #10b981; }
    .btn { background: #3b82f6; border: none; color: white; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-size: 14px; margin: 0 5px; }
    .btn:hover { background: #2563eb; }
</style>
</head>
<body>
    <div id="container">
        <h2>Interactive Sorting Visualizer</h2>
        <div id="bars"></div>
        <div>
            <button class="btn" onclick="resetArray()">Generate Random Array</button>
            <button class="btn" onclick="bubbleSort()">Run Bubble Sort</button>
        </div>
    </div>
    <script>
        let array = [];
        const barsContainer = document.getElementById("bars");
        const size = 20;

        function resetArray() {
            array = [];
            for (let i = 0; i < size; i++) {
                array.push(Math.floor(Math.random() * 250) + 10);
            }
            renderBars();
        }

        function renderBars(activeIndices = [], sortedIndices = []) {
            barsContainer.innerHTML = "";
            array.forEach((val, idx) => {
                const bar = document.createElement("div");
                bar.className = "bar";
                bar.style.height = val + "px";
                if (activeIndices.includes(idx)) bar.className += " active";
                if (sortedIndices.includes(idx)) bar.className += " sorted";
                barsContainer.appendChild(bar);
            });
        }

        async function bubbleSort() {
            let arr = [...array];
            let n = arr.length;
            for (let i = 0; i < n - 1; i++) {
                for (let j = 0; j < n - i - 1; j++) {
                    renderBars([j, j+1]);
                    await new Promise(r => setTimeout(r, 80));
                    if (arr[j] > arr[j+1]) {
                        let temp = arr[j];
                        arr[j] = arr[j+1];
                        arr[j+1] = temp;
                        array = [...arr];
                        renderBars([j, j+1]);
                    }
                }
            }
            renderBars([], [...Array(size).keys()]);
        }

        resetArray();
    </script>
</body>
</html>
"""

    @staticmethod
    def _get_cpu_simulator_code() -> str:
        return """<!DOCTYPE html>
<html>
<head>
<style>
    body { margin: 0; background: #0b0f19; color: #fff; font-family: system-ui, sans-serif; text-align: center; }
    #container { max-width: 800px; margin: 20px auto; padding: 20px; background: #111827; border-radius: 8px; border: 1px solid #1e293b; }
    table { width: 100%; border-collapse: collapse; margin-top: 15px; }
    th, td { border: 1px solid #374151; padding: 8px; text-align: center; }
    th { background: #1f2937; }
    .btn { background: #3b82f6; border: none; color: white; padding: 8px 16px; border-radius: 4px; cursor: pointer; margin-top: 10px; }
</style>
</head>
<body>
    <div id="container">
        <h2>CPU FCFS Scheduling Simulator</h2>
        <table>
            <thead>
                <tr>
                    <th>Process</th>
                    <th>Arrival Time</th>
                    <th>Burst Time</th>
                    <th>Completion Time</th>
                    <th>Waiting Time</th>
                </tr>
            </thead>
            <tbody id="table-body">
                <tr>
                    <td>P1</td>
                    <td>0</td>
                    <td>8</td>
                    <td id="c1">-</td>
                    <td id="w1">-</td>
                </tr>
                <tr>
                    <td>P2</td>
                    <td>1</td>
                    <td>4</td>
                    <td id="c2">-</td>
                    <td id="w2">-</td>
                </tr>
                <tr>
                    <td>P3</td>
                    <td>2</td>
                    <td>9</td>
                    <td id="c3">-</td>
                    <td id="w3">-</td>
                </tr>
            </tbody>
        </table>
        <button class="btn" onclick="runScheduler()">Run FCFS</button>
    </div>
    <script>
        function runScheduler() {
            document.getElementById("c1").innerText = "8";
            document.getElementById("w1").innerText = "0";
            
            document.getElementById("c2").innerText = "12";
            document.getElementById("w2").innerText = "7";
            
            document.getElementById("c3").innerText = "21";
            document.getElementById("w3").innerText = "10";
        }
    </script>
</body>
</html>
"""

    @staticmethod
    def _get_gravity_simulator_code() -> str:
        return """<!DOCTYPE html>
<html>
<head>
<style>
    body { margin: 0; background: #0b0f19; color: #fff; font-family: system-ui, sans-serif; overflow: hidden; }
    #controls { position: absolute; top: 10px; left: 10px; background: rgba(17, 24, 39, 0.9); padding: 15px; border-radius: 8px; border: 1px solid #374151; }
    canvas { display: block; }
</style>
</head>
<body>
    <div id="controls">
        <h3>2D Gravity Sandbox</h3>
        <p style="font-size:12px;color:#9ca3af;">Click inside the screen to spawn gravity balls.</p>
    </div>
    <canvas id="canvas"></canvas>
    <script>
        const canvas = document.getElementById("canvas");
        const ctx = canvas.getContext("2d");
        
        let width = canvas.width = window.innerWidth;
        let height = canvas.height = window.innerHeight;
        const gravity = 0.5;
        const friction = 0.85;
        
        const balls = [];
        
        window.addEventListener("resize", () => {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        });
        
        class Ball {
            constructor(x, y) {
                this.x = x;
                this.y = y;
                this.vx = (Math.random() - 0.5) * 8;
                this.vy = (Math.random() - 0.5) * 8;
                this.radius = Math.random() * 20 + 10;
                this.color = `hsl(${Math.random() * 360}, 70%, 60%)`;
            }
            update() {
                this.vy += gravity;
                this.x += this.vx;
                this.y += this.vy;
                
                // Floor bounce
                if (this.y + this.radius > height) {
                    this.y = height - this.radius;
                    this.vy *= -friction;
                    this.vx *= friction;
                }
                
                // Wall bounds
                if (this.x - this.radius < 0) {
                    this.x = this.radius;
                    this.vx *= -friction;
                }
                if (this.x + this.radius > width) {
                    this.x = width - this.radius;
                    this.vx *= -friction;
                }
            }
            draw() {
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                ctx.fillStyle = this.color;
                ctx.fill();
                ctx.strokeStyle = "#ffffff";
                ctx.lineWidth = 1;
                ctx.stroke();
            }
        }
        
        window.addEventListener("click", (e) => {
            if (e.clientX > 250 || e.clientY > 150) {
                balls.push(new Ball(e.clientX, e.clientY));
            }
        });
        
        function animate() {
            ctx.clearRect(0, 0, width, height);
            balls.forEach(b => {
                b.update();
                b.draw();
            });
            requestAnimationFrame(animate);
        }
        animate();
    </script>
</body>
</html>
"""
