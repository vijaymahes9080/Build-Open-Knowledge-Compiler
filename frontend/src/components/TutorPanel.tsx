"use client";

import React, { useState, useEffect, useRef } from "react";
import { chatWithTutor, getTutorHistory } from "@/lib/api";
import { Topic } from "@/types/okc";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface TutorPanelProps {
  packageId: string;
  selectedTopic: Topic | null;
}

type TutorRole = "Teacher" | "Mentor" | "Research Guide" | "Code Reviewer" | "Exam Trainer";

export default function TutorPanel({ packageId, selectedTopic }: TutorPanelProps) {
  const [session_id] = useState(() => `sess_${Math.random().toString(36).substr(2, 9)}`);
  const [role, setRole] = useState<TutorRole>("Teacher");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Initialize welcome message when topic changes or session starts
  useEffect(() => {
    if (selectedTopic) {
      setMessages([
        {
          role: "assistant",
          content: `Hi! I am your Socratic ${role}. We are currently focusing on: **${selectedTopic.title}**. What would you like to explore? Let's discuss its principles without simply copying answers.`,
        },
      ]);
    }
  }, [selectedTopic, role]);

  // Scroll to bottom
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userText = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userText }]);
    setLoading(true);

    try {
      const res = await chatWithTutor(packageId, session_id, userText, role);
      setMessages((prev) => [...prev, { role: "assistant", content: res.reply }]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Failed to converse: ${err.message || "Tutor server error"}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#070b13] overflow-hidden">
      {/* Header configurations */}
      <div className="p-4 bg-[#090e18] border-b border-gray-850 flex items-center justify-between shrink-0 select-none">
        <div className="space-y-0.5">
          <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Tutor Persona</h4>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as TutorRole)}
            className="bg-slate-900 border border-gray-800 rounded px-2.5 py-1 text-xs text-white focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="Teacher">Socratic Teacher</option>
            <option value="Mentor">Industrial Mentor</option>
            <option value="Research Guide">Research Guide</option>
            <option value="Code Reviewer">Code Reviewer</option>
            <option value="Exam Trainer">Exam Trainer</option>
          </select>
        </div>

        {selectedTopic && (
          <div className="text-right space-y-0.5">
            <span className="text-[9px] text-gray-500 block uppercase font-mono">Topic Lock</span>
            <span className="text-[11px] text-indigo-400 font-semibold">{selectedTopic.title}</span>
          </div>
        )}
      </div>

      {/* Messages dialogue box */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-lg px-3.5 py-2.5 text-xs leading-relaxed ${
                msg.role === "user"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-900 border border-gray-800 text-gray-300"
              }`}
            >
              <div className="font-bold text-[9px] text-gray-400 uppercase font-mono mb-1">
                {msg.role === "user" ? "You" : role}
              </div>
              <p className="whitespace-pre-line">{msg.content}</p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 text-xs text-gray-400 flex items-center space-x-2">
              <span className="animate-bounce">●</span>
              <span className="animate-bounce [animation-delay:0.2s]">●</span>
              <span className="animate-bounce [animation-delay:0.4s]">●</span>
              <span className="italic text-[10px] text-gray-500">AI Tutor is contemplating...</span>
            </div>
          </div>
        )}
        <div ref={chatBottomRef} />
      </div>

      {/* Form sender footer */}
      <form onSubmit={handleSend} className="p-4 border-t border-gray-850 bg-[#090e18]/80 shrink-0">
        <div className="flex items-center space-x-2">
          <input
            type="text"
            placeholder={`Query tutor about ${selectedTopic?.title || "concepts"}...`}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            className="flex-1 bg-slate-950 border border-gray-800 rounded-lg px-3.5 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-800 disabled:text-gray-500 text-white font-bold px-4 py-2 rounded-lg text-xs transition-colors cursor-pointer"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
