"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { OKCPackageData, Topic } from "@/types/okc";
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Volume2, 
  Mic, 
  MicOff, 
  SkipForward, 
  Sparkles,
  HelpCircle,
  MessageSquare
} from "lucide-react";

interface PodcastPanelProps {
  packageData: OKCPackageData;
}

interface DialogLine {
  speaker: "Alex" | "Sophia" | "User" | "System";
  text: string;
}

type ToneType = "casual" | "deep_dive" | "eli5";

export default function PodcastPanel({ packageData }: PodcastPanelProps) {
  const [tone, setTone] = useState<ToneType>("casual");
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [script, setScript] = useState<DialogLine[]>([]);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  
  // Voices states
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceA, setVoiceA] = useState<string>("");
  const [voiceB, setVoiceB] = useState<string>("");

  // Interrupt and Q&A states
  const [question, setQuestion] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isInterruptSpeaking, setIsInterruptSpeaking] = useState(false);
  
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  // Initialize script based on package data and selected tone
  const generateScript = useMemo(() => {
    const topics = packageData.knowledge.topics || [];
    const title = packageData.metadata.title;
    const generated: DialogLine[] = [];

    if (topics.length === 0) {
      return [
        { speaker: "System", text: "No topics found in this container to generate a podcast." } as DialogLine
      ];
    }

    // Intro
    generated.push({
      speaker: "Alex",
      text: `Hello and welcome back to the Open Knowledge Podcast! Today, we're doing a special deep dive into a learning container titled: "${title}". I'm your host, Alex.`
    });
    
    if (tone === "casual") {
      generated.push({
        speaker: "Sophia",
        text: `Hey Alex! I'm really excited to go through this. The material covers some incredibly neat structures and core principles that I think our listeners are going to love.`
      });
    } else if (tone === "eli5") {
      generated.push({
        speaker: "Sophia",
        text: `Hi Alex! Yes, we're going to break down this complex container and explain it like we're five. Simple analogies, no headache-inducing jargon!`
      });
    } else {
      generated.push({
        speaker: "Sophia",
        text: `Indeed, Alex. We will dissect the technical abstractions, key facts, and systematic principles documented inside this knowledge container. Let's begin.`
      });
    }

    // Topic cycles
    topics.forEach((topic, idx) => {
      // Transition question
      if (idx === 0) {
        generated.push({
          speaker: "Alex",
          text: `Awesome. Let's start with the foundational concept here: "${topic.title}". Sophia, how would you introduce this to someone starting out?`
        });
      } else {
        generated.push({
          speaker: "Alex",
          text: `Moving on to the next main area, which is "${topic.title}". How does this connect or stand out from what we just discussed?`
        });
      }

      // Sophia summary explanation
      if (tone === "eli5") {
        generated.push({
          speaker: "Sophia",
          text: `Think of ${topic.title} as a simple building block. In short, it is about: ${topic.summary} It's like building with LEGO bricks—each piece has a specific purpose.`
        });
      } else if (tone === "casual") {
        generated.push({
          speaker: "Sophia",
          text: `Well, ${topic.title} really captures the idea of ${topic.summary} Essentially, it helps us map out this concept in a logical way without getting bogged down.`
        });
      } else {
        generated.push({
          speaker: "Sophia",
          text: `${topic.title} is formally structured as: ${topic.summary} It is a key module within the architecture of this container.`
        });
      }

      // Definitions
      if (topic.definitions && topic.definitions.length > 0) {
        const def = topic.definitions[0];
        generated.push({
          speaker: "Alex",
          text: `I noticed the term "${def.term}" is heavily emphasized. Can you explain exactly what that is?`
        });
        generated.push({
          speaker: "Sophia",
          text: `Absolutely. "${def.term}" refers to: ${def.explanation}. It is a vital element to grasp if you want to understand the bigger picture here.`
        });
      }

      // Key takeaways or facts
      if (topic.key_takeaways && topic.key_takeaways.length > 0) {
        generated.push({
          speaker: "Alex",
          text: `What would you say is the absolute must-remember takeaway for "${topic.title}"?`
        });
        generated.push({
          speaker: "Sophia",
          text: `I'd say it is this: "${topic.key_takeaways[0]}". If you remember nothing else, keep that in mind!`
        });
      } else if (topic.facts && topic.facts.length > 0) {
        generated.push({
          speaker: "Alex",
          text: `Any interesting facts or details we should point out?`
        });
        generated.push({
          speaker: "Sophia",
          text: `Yes! One fascinating detail is: ${topic.facts[0]}`
        });
      }
    });

    // Outro
    generated.push({
      speaker: "Alex",
      text: `That really gives us a fantastic overview of this entire knowledge package. Sophia, thanks for unpacking this with me today!`
    });
    generated.push({
      speaker: "Sophia",
      text: `My pleasure, Alex! Thanks to all our listeners. Keep exploring, stay curious, and happy learning!`
    });

    return generated;
  }, [packageData, tone]);

  // Load and set voices
  useEffect(() => {
    if (typeof window === "undefined") return;

    const updateVoices = () => {
      const allVoices = window.speechSynthesis.getVoices();
      const enVoices = allVoices.filter(v => v.lang.startsWith("en") || v.lang.startsWith("EN"));
      setVoices(enVoices);
      
      // Auto-assign Voice A (Host Alex)
      const maleVoice = enVoices.find(v => v.name.includes("David") || v.name.includes("Male") || v.name.includes("Microsoft David")) || enVoices[0];
      if (maleVoice) setVoiceA(maleVoice.name);

      // Auto-assign Voice B (Host Sophia)
      const femaleVoice = enVoices.find(v => v.name.includes("Zira") || v.name.includes("Female") || v.name.includes("Google US English") || v.name.includes("Hazel")) || enVoices[1] || enVoices[0];
      if (femaleVoice) setVoiceB(femaleVoice.name);
    };

    updateVoices();
    window.speechSynthesis.onvoiceschanged = updateVoices;

    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  // Update script state when generated script changes
  useEffect(() => {
    setScript(generateScript);
    setCurrentIndex(-1);
    setIsPlaying(false);
    window.speechSynthesis.cancel();
  }, [generateScript]);

  // Speech player logic
  const speakCurrentLine = (index: number) => {
    if (index < 0 || index >= script.length) {
      setIsPlaying(false);
      return;
    }

    const currentLine = script[index];
    window.speechSynthesis.cancel(); // Cancel any existing speech
    
    const utterance = new SpeechSynthesisUtterance(currentLine.text);
    
    // Assign voice based on speaker
    const selectedVoiceName = currentLine.speaker === "Alex" ? voiceA : voiceB;
    const voiceObj = voices.find(v => v.name === selectedVoiceName);
    if (voiceObj) {
      utterance.voice = voiceObj;
    }
    
    // Set host speech characteristics
    utterance.pitch = currentLine.speaker === "Alex" ? 0.95 : 1.1;
    utterance.rate = playbackSpeed;

    utterance.onend = () => {
      // Advance to next line if still playing
      if (isPlaying) {
        setCurrentIndex(prev => {
          const next = prev + 1;
          if (next < script.length) {
            speakCurrentLine(next);
            return next;
          } else {
            setIsPlaying(false);
            return prev;
          }
        });
      }
    };

    utterance.onerror = (e) => {
      console.error("Speech error occurred:", e);
      // Attempt recovery
      if (isPlaying) {
        setTimeout(() => {
          setCurrentIndex(prev => {
            const next = prev + 1;
            speakCurrentLine(next);
            return next;
          });
        }, 500);
      }
    };

    window.speechSynthesis.speak(utterance);
  };

  // Trigger speak when index changes and playing is true
  useEffect(() => {
    if (isPlaying && currentIndex >= 0) {
      speakCurrentLine(currentIndex);
    }
  }, [currentIndex, isPlaying, voiceA, voiceB, playbackSpeed]);

  // Scroll transcript to bottom
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [script, currentIndex, isInterruptSpeaking]);

  const handlePlayPause = () => {
    if (isPlaying) {
      window.speechSynthesis.pause();
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      if (currentIndex === -1) {
        setCurrentIndex(0);
      } else {
        window.speechSynthesis.resume();
        // If synthesis wasn't successfully paused and resumed, restart the current line
        if (!window.speechSynthesis.speaking) {
          speakCurrentLine(currentIndex);
        }
      }
    }
  };

  const handleReset = () => {
    window.speechSynthesis.cancel();
    setIsPlaying(false);
    setCurrentIndex(-1);
    setScript(generateScript); // Reset any interrupts back to clean script
  };

  const handleSkip = () => {
    if (currentIndex < script.length - 1) {
      window.speechSynthesis.cancel();
      setCurrentIndex(prev => prev + 1);
    }
  };

  // Interrupt response engine
  const handleInterrupt = (userInput: string) => {
    if (!userInput.trim()) return;

    // Pause general script
    window.speechSynthesis.cancel();
    setIsPlaying(false);

    const cleanInput = userInput.toLowerCase();
    let replyText = "";
    let matchedTopic = "";

    // 1. Scan package data for matching terms/concepts
    const topics = packageData.knowledge.topics || [];
    let foundDefinition = null;
    let foundTopic = null;

    // Search definitions first
    for (const t of topics) {
      const match = t.definitions.find(d => cleanInput.includes(d.term.toLowerCase()));
      if (match) {
        foundDefinition = match;
        matchedTopic = t.title;
        break;
      }
    }

    // Search topics
    if (!foundDefinition) {
      foundTopic = topics.find(t => cleanInput.includes(t.title.toLowerCase()) || t.key_takeaways.some(k => cleanInput.includes(k.toLowerCase())));
    }

    // 2. Draft dynamic replies
    if (foundDefinition) {
      replyText = `That's a spot-on question. Looking at our topic "${matchedTopic}", the term "${foundDefinition.term}" is defined precisely as: ${foundDefinition.explanation}. Does that clarify things for you?`;
    } else if (foundTopic) {
      replyText = `Ah, great question about "${foundTopic.title}". To expand on that, this topic covers ${foundTopic.summary} The key takeaway to remember here is: "${foundTopic.key_takeaways[0] || 'It forms a central prerequisite for this domain.'}"`;
    } else {
      // Synthesize general answer or fallback using metadata
      replyText = `That is an interesting angle! While the specific detail you mentioned isn't fully detailed in the current knowledge tree of "${packageData.metadata.title}", we do know it relates heavily to the core concepts of this package. We should focus on understanding the primary definitions and prerequisites.`;
    }

    // Add user interrupt line & system answer to transcript
    const userLine: DialogLine = { speaker: "User", text: userInput };
    const hostAnswer: DialogLine = { speaker: "Sophia", text: replyText };

    // Insert these two lines immediately after the current index
    const updatedScript = [...script];
    const insertPos = currentIndex + 1;
    updatedScript.splice(insertPos, 0, userLine, hostAnswer);
    
    setScript(updatedScript);
    setCurrentIndex(insertPos); // Set index to user question
    
    // Speak host answer
    setIsInterruptSpeaking(true);
    
    // First, let Host Alex introduce the question, then Sophia answer it
    const introUtterance = new SpeechSynthesisUtterance(`Wait, we have a question from the listener: "${userInput}"`);
    const alexVoice = voices.find(v => v.name === voiceA);
    if (alexVoice) introUtterance.voice = alexVoice;
    introUtterance.pitch = 0.95;
    introUtterance.rate = playbackSpeed;

    introUtterance.onend = () => {
      // Now play Sophia's answer
      const answerUtterance = new SpeechSynthesisUtterance(replyText);
      const sophiaVoice = voices.find(v => v.name === voiceB);
      if (sophiaVoice) answerUtterance.voice = sophiaVoice;
      answerUtterance.pitch = 1.1;
      answerUtterance.rate = playbackSpeed;

      answerUtterance.onend = () => {
        setIsInterruptSpeaking(false);
        setIsPlaying(true);
        // Advance index to Sophia's explanation
        setCurrentIndex(insertPos + 1);
      };
      window.speechSynthesis.speak(answerUtterance);
    };

    window.speechSynthesis.speak(introUtterance);
  };

  const handleMicToggle = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice speech recognition is not supported in this browser. Please type your question.");
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    
    recognition.onresult = (event: any) => {
      const speechToText = event.results[0][0].transcript;
      handleInterrupt(speechToText);
    };

    recognition.start();
  };

  return (
    <div className="h-full flex flex-col bg-[#070b13] overflow-hidden text-gray-200">
      
      {/* Configuration Header */}
      <div className="p-4 bg-[#090e18] border-b border-gray-850 flex flex-wrap gap-4 items-center justify-between shrink-0 select-none">
        
        {/* Tone Selector */}
        <div className="space-y-0.5">
          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Podcast Style</label>
          <div className="flex bg-slate-900 border border-gray-800 rounded p-0.5 space-x-1">
            {(["casual", "deep_dive", "eli5"] as ToneType[]).map((t) => (
              <button
                key={t}
                onClick={() => setTone(t)}
                className={`text-[10px] px-2.5 py-1 rounded transition-colors capitalize ${
                  tone === t ? "bg-indigo-650 text-white font-bold" : "text-gray-400 hover:text-gray-200"
                }`}
              >
                {t === "deep_dive" ? "Deep Dive" : t === "eli5" ? "ELI5" : t}
              </button>
            ))}
          </div>
        </div>

        {/* Speed and Voice Selection */}
        <div className="flex gap-4 items-center">
          <div className="space-y-0.5">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Speed</label>
            <select
              value={playbackSpeed}
              onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
              className="bg-slate-900 border border-gray-800 rounded px-2 py-1 text-[11px] text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="0.75">0.75x</option>
              <option value="1.0">1.0x (Normal)</option>
              <option value="1.25">1.25x</option>
              <option value="1.5">1.5x</option>
            </select>
          </div>

          <div className="space-y-0.5">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Host A Voice (Alex)</label>
            <select
              value={voiceA}
              onChange={(e) => setVoiceA(e.target.value)}
              className="bg-slate-900 border border-gray-800 rounded px-2 py-1 text-[11px] text-white focus:outline-none focus:border-indigo-500 max-w-[140px] truncate cursor-pointer"
            >
              {voices.map((v) => (
                <option key={v.name} value={v.name}>{v.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-0.5">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Host B Voice (Sophia)</label>
            <select
              value={voiceB}
              onChange={(e) => setVoiceB(e.target.value)}
              className="bg-slate-900 border border-gray-800 rounded px-2 py-1 text-[11px] text-white focus:outline-none focus:border-indigo-500 max-w-[140px] truncate cursor-pointer"
            >
              {voices.map((v) => (
                <option key={v.name} value={v.name}>{v.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Studio View */}
      <div className="flex-1 flex flex-col p-4 space-y-4 overflow-hidden relative">
        
        {/* Interactive Waves and Host Avatars */}
        <div className="grid grid-cols-2 gap-4 bg-slate-950/40 border border-gray-900 rounded-xl p-4 shrink-0 shadow-inner">
          
          {/* Host A (Alex) */}
          <div className="flex flex-col items-center justify-center p-3 relative bg-slate-900/30 rounded-lg border border-gray-900">
            <div className={`w-16 h-16 rounded-full bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center shadow-lg relative transition-all duration-300 ${
              isPlaying && currentIndex >= 0 && script[currentIndex]?.speaker === "Alex" ? "ring-4 ring-cyan-400 scale-105" : ""
            }`}>
              <span className="text-xl font-bold text-white">Alex</span>
              {isPlaying && currentIndex >= 0 && script[currentIndex]?.speaker === "Alex" && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-cyan-500"></span>
                </span>
              )}
            </div>
            <div className="mt-2 text-xs font-semibold text-cyan-400">Podcast Host</div>
            
            {/* Speaker Waveform */}
            <div className="flex items-end justify-center space-x-0.5 mt-3 h-5">
              {[1, 2, 3, 4, 5, 4, 3, 2, 1].map((h, i) => (
                <div
                  key={i}
                  className={`w-0.5 rounded-full bg-cyan-500 transition-all duration-150 ${
                    isPlaying && currentIndex >= 0 && script[currentIndex]?.speaker === "Alex"
                      ? "animate-pulse"
                      : "opacity-30"
                  }`}
                  style={{ 
                    height: isPlaying && currentIndex >= 0 && script[currentIndex]?.speaker === "Alex" ? `${h * 4}px` : "3px",
                    animationDelay: `${i * 50}ms`
                  }}
                />
              ))}
            </div>
          </div>

          {/* Host B (Sophia) */}
          <div className="flex flex-col items-center justify-center p-3 relative bg-slate-900/30 rounded-lg border border-gray-900">
            <div className={`w-16 h-16 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-500 flex items-center justify-center shadow-lg relative transition-all duration-300 ${
              (isPlaying && currentIndex >= 0 && script[currentIndex]?.speaker === "Sophia") || isInterruptSpeaking ? "ring-4 ring-indigo-400 scale-105" : ""
            }`}>
              <span className="text-xl font-bold text-white">Sophia</span>
              {((isPlaying && currentIndex >= 0 && script[currentIndex]?.speaker === "Sophia") || isInterruptSpeaking) && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-indigo-500"></span>
                </span>
              )}
            </div>
            <div className="mt-2 text-xs font-semibold text-indigo-400">Co-Host Expert</div>

            {/* Speaker Waveform */}
            <div className="flex items-end justify-center space-x-0.5 mt-3 h-5">
              {[1, 2, 3, 4, 5, 4, 3, 2, 1].map((h, i) => (
                <div
                  key={i}
                  className={`w-0.5 rounded-full bg-indigo-500 transition-all duration-150 ${
                    (isPlaying && currentIndex >= 0 && script[currentIndex]?.speaker === "Sophia") || isInterruptSpeaking
                      ? "animate-pulse"
                      : "opacity-30"
                  }`}
                  style={{ 
                    height: (isPlaying && currentIndex >= 0 && script[currentIndex]?.speaker === "Sophia") || isInterruptSpeaking ? `${h * 4}px` : "3px",
                    animationDelay: `${i * 50}ms`
                  }}
                />
              ))}
            </div>
          </div>

        </div>

        {/* Scrollable Live Transcript & Chat Log */}
        <div className="flex-1 overflow-y-auto border border-gray-900 bg-slate-950/60 rounded-xl p-4 space-y-4">
          
          {currentIndex === -1 && (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3 opacity-60">
              <Sparkles className="h-8 w-8 text-indigo-400 animate-bounce" />
              <div className="text-sm font-semibold">Local AI Radio Ready</div>
              <p className="text-xs max-w-xs leading-relaxed">
                Click play below to compile the dialogue and listen to your study guides synthesized 100% offline!
              </p>
            </div>
          )}

          {script.map((line, idx) => {
            const isCurrent = idx === currentIndex;
            
            if (idx > currentIndex && currentIndex !== -1) return null; // Only show spoken dialogue so far

            if (line.speaker === "User") {
              return (
                <div key={idx} className="flex justify-end">
                  <div className="bg-indigo-650/40 border border-indigo-900 rounded-2xl rounded-tr-none px-4 py-2 text-xs max-w-[80%] shadow-sm">
                    <span className="block text-[9px] font-bold text-indigo-400 mb-1 uppercase font-mono">Vijay (Interrupting Listener)</span>
                    <p className="italic text-gray-200">{line.text}</p>
                  </div>
                </div>
              );
            }

            const speakerColor = line.speaker === "Alex" ? "text-cyan-400" : "text-indigo-400";
            const bubbleBorder = isCurrent ? "border-indigo-500 shadow-md shadow-indigo-950/55" : "border-gray-900";
            const bubbleBg = isCurrent ? "bg-slate-900/90" : "bg-slate-900/40";

            return (
              <div 
                key={idx} 
                className={`flex flex-col border rounded-xl p-3 text-xs space-y-1 transition-all duration-300 ${bubbleBg} ${bubbleBorder}`}
              >
                <div className="flex justify-between items-center select-none">
                  <span className={`font-bold font-mono tracking-wider ${speakerColor}`}>{line.speaker}</span>
                  {isCurrent && (
                    <span className="flex items-center space-x-1 text-[9px] text-indigo-400 bg-indigo-950/60 border border-indigo-900 px-1.5 py-0.5 rounded font-mono">
                      <Volume2 className="h-3 w-3 animate-pulse" />
                      <span>Speaking</span>
                    </span>
                  )}
                </div>
                <p className="text-gray-300 leading-relaxed font-sans">{line.text}</p>
              </div>
            );
          })}
          <div ref={transcriptEndRef} />
        </div>

        {/* Audio Player Controls */}
        <div className="bg-[#090e18] border border-gray-900 rounded-xl p-4 flex flex-col space-y-3 shrink-0 shadow-inner">
          <div className="flex items-center justify-between gap-4">
            
            {/* Progress Bar (Visual Only) */}
            <div className="flex-1 h-1.5 bg-slate-900 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-300"
                style={{ 
                  width: `${currentIndex >= 0 ? ((currentIndex + 1) / script.length) * 100 : 0}%` 
                }}
              />
            </div>
            <span className="text-[10px] font-mono text-gray-500 select-none">
              {currentIndex >= 0 ? currentIndex + 1 : 0}/{script.length}
            </span>
          </div>

          <div className="flex justify-between items-center">
            
            {/* Main Player Keys */}
            <div className="flex items-center space-x-2">
              <button
                onClick={handleReset}
                title="Restart Podcast"
                className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-gray-800 text-gray-400 hover:text-gray-200 transition-colors cursor-pointer"
              >
                <RotateCcw className="h-4 w-4" />
              </button>

              <button
                onClick={handlePlayPause}
                className="px-6 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 font-semibold text-white shadow-md transition-colors flex items-center space-x-2 cursor-pointer"
              >
                {isPlaying ? (
                  <>
                    <Pause className="h-4 w-4" />
                    <span className="text-xs">Pause Studio</span>
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    <span className="text-xs">Tune In Live</span>
                  </>
                )}
              </button>

              <button
                onClick={handleSkip}
                title="Skip to next segment"
                className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-gray-800 text-gray-400 hover:text-gray-200 transition-colors cursor-pointer"
                disabled={currentIndex >= script.length - 1}
              >
                <SkipForward className="h-4 w-4" />
              </button>
            </div>

            {/* Interrupt Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleInterrupt(question);
                setQuestion("");
              }}
              className="flex items-center space-x-1.5 max-w-[60%] flex-1 pl-4"
            >
              <div className="relative flex-1">
                <input
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Interrupt hosts with a question..."
                  className="w-full bg-slate-950 border border-gray-850 hover:border-gray-800 rounded-lg px-3 py-2 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 pr-8"
                />
                <button
                  type="button"
                  onClick={handleMicToggle}
                  title="Speak to hosts"
                  className={`absolute right-2 top-2 text-gray-400 hover:text-indigo-400 transition-colors cursor-pointer ${
                    isListening ? "text-red-500 hover:text-red-400 animate-pulse" : ""
                  }`}
                >
                  {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </button>
              </div>
              
              <button
                type="submit"
                disabled={!question.trim()}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-[11px] px-3.5 py-2 rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Interrupt
              </button>
            </form>

          </div>
        </div>

      </div>

    </div>
  );
}
