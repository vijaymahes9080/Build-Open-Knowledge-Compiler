from typing import List, Dict, Any
from app.services.llm import LocalLLMService
from app.services.vector_store import OKCVectorStore
from app.models.db_models import TutorChatMessage
from sqlmodel import Session

class OKCTutor:
    @staticmethod
    def get_system_prompt(role: str = "Teacher") -> str:
        """
        Returns specialized tutoring prompt instructions depending on the selected persona.
        """
        base_instructions = (
            "You are a local AI Tutor for the Open Knowledge Compiler (OKC) workspace.\n"
            "CRITICAL: Never output direct code solutions or direct copy-paste answers immediately. "
            "Instead, guide the student using Socratic questioning, explain underlying concepts, "
            "point them to the relevant facts from their course material, and suggest experiments. "
            "Always be encouraging, educational, and structured.\n"
        )
        
        roles = {
            "Teacher": (
                "Role: Primary Teacher. Break down difficult concepts into simple terms, "
                "give conceptual analogies, and ask small review questions at the end of your response."
            ),
            "Mentor": (
                "Role: Personal Career Mentor. Connect the topics to real-world industrial applications, "
                "career options, and project advice."
            ),
            "Research Guide": (
                "Role: Research Advisor. Highlight open questions, research methodologies, potential hypotheses, "
                "and how this topic fits in academic publication spaces."
            ),
            "Code Reviewer": (
                "Role: Strict Code Reviewer. When reviewing code, highlight logic errors, efficiency concerns, "
                "and styling tips, but let the user write the final fix code themselves."
            ),
            "Exam Trainer": (
                "Role: Active Recall Trainer. Ask mock exam questions, grade the user's response, "
                "and highlight their gaps."
            ),
        }
        
        return base_instructions + roles.get(role, roles["Teacher"])

    @classmethod
    def answer_question(
        cls, 
        package_id: str, 
        session_id: str, 
        user_message: str, 
        role: str,
        db: Session
    ) -> str:
        """
        Gathers context from vector DB, retrieves chat history, queries local LLM, and saves the transcripts.
        """
        # 1. Search vector database for contextual snippets
        vector_store = OKCVectorStore(package_id)
        context_chunks = vector_store.search(user_message, limit=3)
        
        context_text = "\n".join([
            f"[Source: {hit['metadata'].get('source', 'material')} page {hit['metadata'].get('page', 'N/A')}]: {hit['text']}" 
            for hit in context_chunks
        ])
        
        # 2. Get past chat history from database
        history = db.query(TutorChatMessage).filter(
            TutorChatMessage.package_id == package_id,
            TutorChatMessage.session_id == session_id
        ).order_by(TutorChatMessage.timestamp.asc()).all()
        
        messages = []
        for msg in history[-10:]: # Limit history to last 10 messages for context window size
            messages.append({"role": msg.role, "content": msg.content})
            
        # Add current user message with context payload
        user_prompt_with_context = (
            f"Context from study materials:\n{context_text}\n\n"
            f"User Question: {user_message}"
        )
        messages.append({"role": "user", "content": user_prompt_with_context})
        
        # 3. Call LLM
        system_prompt = cls.get_system_prompt(role)
        reply = LocalLLMService.generate_chat(messages=messages, system_prompt=system_prompt)
        
        # 4. Save messages to SQLite
        user_db_msg = TutorChatMessage(
            package_id=package_id,
            session_id=session_id,
            role="user",
            content=user_message
        )
        assistant_db_msg = TutorChatMessage(
            package_id=package_id,
            session_id=session_id,
            role="assistant",
            content=reply
        )
        db.add(user_db_msg)
        db.add(assistant_db_msg)
        db.commit()
        
        return reply
