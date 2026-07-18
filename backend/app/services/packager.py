import os
import zipfile
import json
import shutil
from pathlib import Path
from typing import Dict, Any, Optional
from app.models.okc_schema import (
    OKCMetadata,
    OKCPrimaryKnowledge,
    OKCGraph,
    OKCCitations,
    OKCCourse,
    OKCBook,
    OKCSlides,
    OKCQuiz,
    OKCProjects,
    OKCSimulation,
    OKCTimeline,
    OKCMindMap,
    OKCRevision,
)

class OKCPackage:
    """
    In-memory representation of an unzipped OKC container's content.
    """
    def __init__(self, metadata: OKCMetadata):
        self.metadata = metadata
        self.knowledge = OKCPrimaryKnowledge()
        self.graph = OKCGraph()
        self.citations = OKCCitations()
        self.course = OKCCourse()
        self.book = OKCBook(title=metadata.title)
        self.slides = OKCSlides()
        self.quiz = OKCQuiz()
        self.projects = OKCProjects()
        self.simulation = OKCSimulation()
        self.timeline = OKCTimeline()
        self.mindmap = OKCMindMap(root_id="root")
        self.revision = OKCRevision()

class OKCPackager:
    @staticmethod
    def pack(package: OKCPackage, output_path: str, assets_dir: Optional[str] = None) -> str:
        """
        Packs an OKCPackage object into a zip archive with .okc extension.
        """
        output_path = Path(output_path)
        # Ensure the filename ends with .okc
        if output_path.suffix != ".okc":
            output_path = output_path.with_suffix(".okc")
            
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Create a temp directory for gathering files
        temp_dir = output_path.parent / f"_temp_{package.metadata.id}"
        temp_dir.mkdir(parents=True, exist_ok=True)
        
        try:
            # Write all JSON files
            files_to_write = {
                "metadata.json": package.metadata,
                "knowledge.json": package.knowledge,
                "graph.json": package.graph,
                "citations.json": package.citations,
                "course.json": package.course,
                "book.json": package.book,
                "slides.json": package.slides,
                "quiz.json": package.quiz,
                "projects.json": package.projects,
                "simulation.json": package.simulation,
                "timeline.json": package.timeline,
                "mindmap.json": package.mindmap,
                "revision.json": package.revision,
            }
            
            for filename, model in files_to_write.items():
                file_path = temp_dir / filename
                with open(file_path, "w", encoding="utf-8") as f:
                    # Use model_dump_json for Pydantic V2
                    f.write(model.model_dump_json(indent=2))
            
            # Copy assets if provided
            assets_dest = temp_dir / "assets"
            assets_dest.mkdir(exist_ok=True)
            if assets_dir and os.path.exists(assets_dir):
                shutil.copytree(assets_dir, assets_dest, dirs_exist_ok=True)
            else:
                # Ensure structure exists
                (assets_dest / "images").mkdir(exist_ok=True)
                (assets_dest / "videos").mkdir(exist_ok=True)
                (assets_dest / "audio").mkdir(exist_ok=True)
                
            # Create zip file
            with zipfile.ZipFile(output_path, "w", zipfile.ZIP_DEFLATED) as zip_file:
                for root, _, files in os.walk(temp_dir):
                    for file in files:
                        file_path = Path(root) / file
                        arcname = file_path.relative_to(temp_dir)
                        zip_file.write(file_path, arcname)
                        
            return str(output_path)
            
        finally:
            # Clean up temp folder
            if temp_dir.exists():
                shutil.rmtree(temp_dir)

    @staticmethod
    def unpack(okc_path: str, extract_dir: str) -> OKCPackage:
        """
        Unpacks a .okc file to a directory and loads the Pydantic schemas.
        """
        okc_path = Path(okc_path)
        extract_dir = Path(extract_dir)
        
        if extract_dir.exists():
            shutil.rmtree(extract_dir)
        extract_dir.mkdir(parents=True, exist_ok=True)
        
        with zipfile.ZipFile(okc_path, "r") as zip_ref:
            zip_ref.extractall(extract_dir)
            
        # Parse metadata first to instantiate the OKCPackage object
        metadata_path = extract_dir / "metadata.json"
        if not metadata_path.exists():
            raise FileNotFoundError("Container is missing metadata.json")
            
        with open(metadata_path, "r", encoding="utf-8") as f:
            metadata_data = json.load(f)
            metadata = OKCMetadata(**metadata_data)
            
        package = OKCPackage(metadata)
        
        # Load and validate other components
        schema_map = {
            "knowledge.json": (OKCPrimaryKnowledge, "knowledge"),
            "graph.json": (OKCGraph, "graph"),
            "citations.json": (OKCCitations, "citations"),
            "course.json": (OKCCourse, "course"),
            "book.json": (OKCBook, "book"),
            "slides.json": (OKCSlides, "slides"),
            "quiz.json": (OKCQuiz, "quiz"),
            "projects.json": (OKCProjects, "projects"),
            "simulation.json": (OKCSimulation, "simulation"),
            "timeline.json": (OKCTimeline, "timeline"),
            "mindmap.json": (OKCMindMap, "mindmap"),
            "revision.json": (OKCRevision, "revision"),
        }
        
        for filename, (schema_cls, attribute) in schema_map.items():
            filepath = extract_dir / filename
            if filepath.exists():
                with open(filepath, "r", encoding="utf-8") as f:
                    try:
                        data = json.load(f)
                        setattr(package, attribute, schema_cls(**data))
                    except Exception as e:
                        print(f"Error parsing {filename}: {e}")
                        # Keep default empty initialized model on failure
                        
        return package
