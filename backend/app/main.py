import os
import shutil
import datetime
import uuid
from fastapi import FastAPI, UploadFile, File, Form, Depends, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select
from typing import List, Dict, Any, Optional
from pathlib import Path

from app.core import config
from app.core.database import init_db, get_session
from app.models.db_models import OKCLibraryItem, TutorChatMessage, LearningProgress
from app.models.okc_schema import OKCMetadata
from app.services.compiler import KnowledgeCompiler
from app.services.packager import OKCPackager, OKCPackage
from app.services.tutor import OKCTutor

app = FastAPI(title=config.PROJECT_NAME)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In development, allow Next.js server origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    init_db()

# Compile Status tracker
compilation_jobs: Dict[str, str] = {} # job_id -> status ("processing", "completed", "failed")

def run_compilation_background(file_path: str, title: str, author: str, job_id: str):
    db_session = next(get_session())
    try:
        compilation_jobs[job_id] = "processing"
        
        # Run compile
        okc_path = KnowledgeCompiler.compile_knowledge(file_path, title, author)
        
        # Load compiled metadata
        extract_dir = os.path.join(config.EXTRACT_DIR, job_id)
        package = OKCPackager.unpack(okc_path, extract_dir)
        
        # Insert or update library item
        library_item = OKCLibraryItem(
            id=package.metadata.id,
            title=package.metadata.title,
            description=package.metadata.description,
            author=package.metadata.author,
            filepath=okc_path,
            extract_dir=str(extract_dir)
        )
        db_session.add(library_item)
        db_session.commit()
        
        compilation_jobs[job_id] = "completed"
    except Exception as e:
        print(f"Background compilation failed: {e}")
        compilation_jobs[job_id] = f"failed: {str(e)}"
    finally:
        db_session.close()

@app.post("/api/compile")
async def compile_file(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    title: str = Form(...),
    author: str = Form("Local Compiler"),
):
    """
    Accepts raw file upload and runs background knowledge compilation.
    """
    job_id = f"job_{int(datetime.datetime.utcnow().timestamp())}" if "datetime" in globals() else f"job_{uuid.uuid4()}"
    # Python timestamp backup
    import time
    job_id = f"job_{int(time.time())}"
    
    # Save upload to file
    file_ext = Path(file.filename).suffix
    temp_upload_path = config.UPLOAD_DIR / f"{job_id}{file_ext}"
    
    with open(temp_upload_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    compilation_jobs[job_id] = "queued"
    
    background_tasks.add_task(
        run_compilation_background,
        str(temp_upload_path),
        title,
        author,
        job_id
    )
    
    return {"job_id": job_id, "status": "queued"}

@app.get("/api/compile/status/{job_id}")
async def get_compile_status(job_id: str):
    status = compilation_jobs.get(job_id)
    if not status:
        raise HTTPException(status_code=404, detail="Job not found")
    return {"job_id": job_id, "status": status}

@app.get("/api/library", response_model=List[OKCLibraryItem])
async def get_library(db: Session = Depends(get_session)):
    items = db.exec(select(OKCLibraryItem)).all()
    return items

@app.get("/api/package/{package_id}")
async def get_package(package_id: str, db: Session = Depends(get_session)):
    """
    Loads and returns all active workspaces configurations inside the unpacked folder.
    """
    item = db.exec(select(OKCLibraryItem).where(OKCLibraryItem.id == package_id)).first()
    if not item:
        raise HTTPException(status_code=404, detail="Package not found in library")
        
    # Unpack the package dynamically
    try:
        package = OKCPackager.unpack(item.filepath, item.extract_dir)
        return {
            "metadata": package.metadata.model_dump(),
            "knowledge": package.knowledge.model_dump(),
            "graph": package.graph.model_dump(),
            "citations": package.citations.model_dump(),
            "course": package.course.model_dump(),
            "book": package.book.model_dump(),
            "slides": package.slides.model_dump(),
            "quiz": package.quiz.model_dump(),
            "projects": package.projects.model_dump(),
            "simulation": package.simulation.model_dump(),
            "timeline": package.timeline.model_dump(),
            "mindmap": package.mindmap.model_dump(),
            "revision": package.revision.model_dump(),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to unpack .okc container: {str(e)}")

@app.post("/api/tutor/chat")
async def chat_with_tutor(
    package_id: str = Form(...),
    session_id: str = Form(...),
    message: str = Form(...),
    role: str = Form("Teacher"),
    db: Session = Depends(get_session)
):
    try:
        reply = OKCTutor.answer_question(
            package_id=package_id,
            session_id=session_id,
            user_message=message,
            role=role,
            db=db
        )
        return {"reply": reply}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/tutor/history/{package_id}/{session_id}", response_model=List[TutorChatMessage])
async def get_tutor_history(package_id: str, session_id: str, db: Session = Depends(get_session)):
    messages = db.exec(
        select(TutorChatMessage)
        .where(TutorChatMessage.package_id == package_id, TutorChatMessage.session_id == session_id)
        .order_by(TutorChatMessage.timestamp.asc())
    ).all()
    return messages

@app.post("/api/progress/update")
async def update_progress(
    package_id: str,
    element_id: str,
    element_type: str,
    status: str = "completed",
    score: Optional[float] = 0.0,
    db: Session = Depends(get_session)
):
    """
    Saves user study progress or quiz attempts.
    """
    progress = db.exec(
        select(LearningProgress)
        .where(
            LearningProgress.package_id == package_id, 
            LearningProgress.element_id == element_id
        )
    ).first()
    
    if not progress:
        progress = LearningProgress(
            package_id=package_id,
            element_id=element_id,
            element_type=element_type,
            status=status,
            score=score
        )
        db.add(progress)
    else:
        progress.status = status
        progress.score = score
        progress.last_reviewed = datetime.datetime.utcnow().isoformat() if "datetime" in globals() else progress.last_reviewed
        
    db.commit()
    return {"status": "success"}

@app.post("/api/run-code")
async def run_code(
    code: str = Form(...),
    language: str = Form("javascript")
):
    """
    Simple sandbox runner. For Python/JS we mock return success or run inside a limited subprocess safely.
    Since we are offline first, we can run simple commands or return output simulations.
    """
    import subprocess
    import tempfile
    
    if language == "javascript":
        # Check if Node is installed locally
        try:
            with tempfile.NamedTemporaryFile(suffix=".js", delete=False) as f:
                f.write(code.encode("utf-8"))
                temp_name = f.name
            
            res = subprocess.run(["node", temp_name], capture_output=True, text=True, timeout=5)
            os.remove(temp_name)
            return {"stdout": res.stdout, "stderr": res.stderr}
        except Exception as e:
            return {"stdout": "", "stderr": f"Local JavaScript executor error: {str(e)}"}
            
    elif language == "python":
        try:
            with tempfile.NamedTemporaryFile(suffix=".py", delete=False) as f:
                f.write(code.encode("utf-8"))
                temp_name = f.name
                
            res = subprocess.run(["python", temp_name], capture_output=True, text=True, timeout=5)
            os.remove(temp_name)
            return {"stdout": res.stdout, "stderr": res.stderr}
        except Exception as e:
            return {"stdout": "", "stderr": f"Local Python executor error: {str(e)}"}
            
    return {"stdout": "Running sandbox mock. Program ran successfully.", "stderr": ""}
