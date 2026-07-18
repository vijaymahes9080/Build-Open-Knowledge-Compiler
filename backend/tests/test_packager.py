import os
import tempfile
import shutil
from pathlib import Path
from app.models.okc_schema import OKCMetadata, Topic, Definition
from app.services.packager import OKCPackage, OKCPackager

def test_packager_zip_unzip_cycle():
    # 1. Create a temporary workspace directory for test output
    with tempfile.TemporaryDirectory() as temp_dir:
        temp_dir_path = Path(temp_dir)
        okc_filepath = temp_dir_path / "quantum_physics.okc"
        unpack_dir = temp_dir_path / "extracted_quantum"
        
        # 2. Build mock package
        metadata = OKCMetadata(
            id="test-package-uuid-1234",
            title="Quantum Mechanics 101",
            description="Introduction to Quantum Physics",
            author="Max Planck",
            created_at="2026-07-03T20:00:00"
        )
        
        package = OKCPackage(metadata)
        
        # Add a custom topic
        topic = Topic(
            id="topic_schrodinger",
            title="Schrodinger's Equation",
            summary="Wave function description of quantum states.",
            definitions=[
                Definition(term="Wave Function", explanation="A mathematical description of the quantum state of a system.")
            ],
            facts=["It is a key equation in non-relativistic quantum mechanics."],
            difficulty="Advanced",
            learning_time_minutes=25
        )
        package.knowledge.topics.append(topic)
        
        # 3. Pack to .okc
        pack_path = OKCPackager.pack(package, str(okc_filepath))
        assert os.path.exists(pack_path)
        assert pack_path.endswith(".okc")
        
        # 4. Unpack and load
        unpacked_package = OKCPackager.unpack(pack_path, str(unpack_dir))
        
        # 5. Assert equal values
        assert unpacked_package.metadata.id == metadata.id
        assert unpacked_package.metadata.title == metadata.title
        assert unpacked_package.metadata.author == metadata.author
        
        # Verify custom topic parsing
        assert len(unpacked_package.knowledge.topics) == 1
        parsed_topic = unpacked_package.knowledge.topics[0]
        assert parsed_topic.id == "topic_schrodinger"
        assert parsed_topic.title == "Schrodinger's Equation"
        assert len(parsed_topic.definitions) == 1
        assert parsed_topic.definitions[0].term == "Wave Function"
        
        print("OKC Container Packing/Unpacking Unit Test Passed Successfully!")
        
if __name__ == "__main__":
    test_packager_zip_unzip_cycle()
