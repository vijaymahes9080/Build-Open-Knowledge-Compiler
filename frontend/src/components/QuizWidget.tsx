"use client";

import React, { useState } from "react";
import { Question, Flashcard } from "@/types/okc";
import { updateProgress } from "@/lib/api";

interface QuizWidgetProps {
  packageId: string;
  quizData: { questions: Question[] };
  revisionData: { flashcards: Flashcard[] };
}

type Mode = "quiz" | "flashcards";

export default function QuizWidget({ packageId, quizData, revisionData }: QuizWidgetProps) {
  const [mode, setMode] = useState<Mode>("quiz");

  // Quiz states
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);

  // Flashcards states
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [cards, setCards] = useState<Flashcard[]>(revisionData.flashcards);

  const activeQuestion = quizData.questions[currentQuestionIndex];
  const activeCard = cards[currentCardIndex];

  // ==========================================
  // Quiz Actions
  // ==========================================
  const handleOptionSelect = (option: string) => {
    if (submitted) return;
    setSelectedOption(option);
  };

  const handleQuizSubmit = async () => {
    if (!selectedOption || submitted || !activeQuestion) return;

    const isCorrect = selectedOption === activeQuestion.correct_answer;
    if (isCorrect) setScore((prev) => prev + 1);

    setSubmitted(true);
    
    // Log progress to SQLite
    try {
      await updateProgress(packageId, activeQuestion.id, "quiz_question", "completed", isCorrect ? 100 : 0);
    } catch (e) {
      console.error(e);
    }
  };

  const handleNextQuestion = () => {
    setSelectedOption(null);
    setSubmitted(false);
    if (currentQuestionIndex + 1 < quizData.questions.length) {
      setCurrentQuestionIndex((prev) => prev + 1);
    } else {
      setQuizFinished(true);
    }
  };

  const handleResetQuiz = () => {
    setCurrentQuestionIndex(0);
    setSelectedOption(null);
    setSubmitted(false);
    setScore(0);
    setQuizFinished(false);
  };

  // ==========================================
  // Flashcard Actions
  // ==========================================
  const handleFlipCard = () => {
    setIsFlipped((prev) => !prev);
  };

  const handleRecallGrade = async (grade: number) => {
    if (!activeCard) return;

    // Simple SM-2 Algorithm calculation
    let newRepetitions = activeCard.repetitions + 1;
    let newInterval = 1;
    let newDifficulty = activeCard.difficulty_score;

    if (grade >= 3) { // Correct recall
      if (activeCard.repetitions === 0) {
        newInterval = 1;
      } else if (activeCard.repetitions === 1) {
        newInterval = 6;
      } else {
        newInterval = Math.round(activeCard.interval_days * activeCard.difficulty_score);
      }
      
      // Calculate ease factor adjustment
      newDifficulty = activeCard.difficulty_score + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02));
      newDifficulty = Math.max(1.3, newDifficulty);
    } else { // Incorrect recall
      newRepetitions = 0;
      newInterval = 1;
    }

    const updatedCard = {
      ...activeCard,
      repetitions: newRepetitions,
      interval_days: newInterval,
      difficulty_score: parseFloat(newDifficulty.toFixed(2))
    };

    // Update in-memory state
    const updatedCards = [...cards];
    updatedCards[currentCardIndex] = updatedCard;
    setCards(updatedCards);

    // Save recall history to SQLite backend
    try {
      await updateProgress(packageId, activeCard.id, "flashcard", "completed", grade * 20);
    } catch (e) {
      console.error(e);
    }

    // Advance index
    setIsFlipped(false);
    setTimeout(() => {
      if (currentCardIndex + 1 < cards.length) {
        setCurrentCardIndex((prev) => prev + 1);
      } else {
        setCurrentCardIndex(0); // Wrap around for practice
      }
    }, 200);
  };

  return (
    <div className="h-full flex flex-col bg-[#070b13] overflow-hidden select-none">
      {/* Quiz or Flashcards selector tab */}
      <div className="p-4 bg-[#090e18] border-b border-gray-850 flex items-center justify-between shrink-0">
        <div className="space-y-0.5">
          <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Learning mode</h4>
          <div className="flex space-x-1">
            <button
              onClick={() => setMode("quiz")}
              className={`px-3 py-1 rounded text-xs font-semibold cursor-pointer ${
                mode === "quiz" ? "bg-blue-600 text-white" : "bg-slate-900 text-gray-400 border border-gray-800"
              }`}
            >
              📝 Evaluation Quiz
            </button>
            <button
              onClick={() => setMode("flashcards")}
              className={`px-3 py-1 rounded text-xs font-semibold cursor-pointer ${
                mode === "flashcards" ? "bg-blue-600 text-white" : "bg-slate-900 text-gray-400 border border-gray-800"
              }`}
            >
              🗂 Flashcard Revision
            </button>
          </div>
        </div>
      </div>

      {/* Main View Area */}
      <div className="flex-grow p-6 overflow-y-auto flex items-center justify-center">
        {mode === "quiz" ? (
          /* QUIZ VIEW */
          <div className="w-full max-w-xl glass-panel p-6 border-gray-850 space-y-6">
            {quizFinished ? (
              <div className="text-center space-y-4 py-8">
                <span className="text-4xl block">🏆</span>
                <h3 className="text-lg font-bold text-gray-200">Evaluation Finished</h3>
                <p className="text-xs text-gray-400">
                  You scored <span className="text-blue-400 font-bold">{score}</span> out of{" "}
                  <span className="text-gray-300 font-bold">{quizData.questions.length}</span>.
                </p>
                <button
                  onClick={handleResetQuiz}
                  className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors cursor-pointer"
                >
                  Restart Evaluation
                </button>
              </div>
            ) : activeQuestion ? (
              <div className="space-y-6">
                {/* Question Info Header */}
                <div className="flex justify-between items-center border-b border-gray-800 pb-3">
                  <span className="text-[10px] text-gray-500 font-mono">
                    QUESTION {currentQuestionIndex + 1} OF {quizData.questions.length}
                  </span>
                  <span className="text-[9px] bg-indigo-950 text-indigo-400 border border-indigo-900 px-1.5 py-0.5 rounded uppercase">
                    {activeQuestion.difficulty}
                  </span>
                </div>

                {/* Question text */}
                <h4 className="text-sm font-bold text-gray-100">{activeQuestion.question_text}</h4>

                {/* Interactive options */}
                <div className="space-y-2.5">
                  {activeQuestion.options ? (
                    activeQuestion.options.map((opt, idx) => {
                      const isSelected = selectedOption === opt;
                      const isCorrectAnswer = opt === activeQuestion.correct_answer;
                      let optionStyle = "border-gray-800 bg-slate-950 hover:bg-gray-900/60";
                      
                      if (isSelected) optionStyle = "border-blue-500 bg-blue-950/20";
                      if (submitted) {
                        if (isCorrectAnswer) optionStyle = "border-green-600 bg-green-950/20 text-green-300";
                        else if (isSelected) optionStyle = "border-red-600 bg-red-950/20 text-red-300";
                      }
                      
                      return (
                        <button
                          key={idx}
                          onClick={() => handleOptionSelect(opt)}
                          disabled={submitted}
                          className={`w-full text-left text-xs p-3.5 rounded-lg border transition-all cursor-pointer ${optionStyle}`}
                        >
                          {opt}
                        </button>
                      );
                    })
                  ) : (
                    // Free text answer form / coding task box
                    <textarea
                      placeholder="Write your explanation or code solution here..."
                      disabled={submitted}
                      className="w-full h-32 bg-slate-950 border border-gray-800 rounded-lg p-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 font-mono"
                      value={selectedOption || ""}
                      onChange={(e) => setSelectedOption(e.target.value)}
                    />
                  )}
                </div>

                {/* Submissions feedback panels */}
                {submitted && (
                  <div className="p-4 bg-gray-900/60 rounded-lg border border-gray-800 text-[11px] text-gray-300 space-y-1">
                    <span className="font-bold text-blue-400 block">Explanation:</span>
                    <p className="leading-relaxed">{activeQuestion.explanation}</p>
                  </div>
                )}

                {/* Submit button controls */}
                {!submitted ? (
                  <button
                    onClick={handleQuizSubmit}
                    disabled={!selectedOption}
                    className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 disabled:text-gray-500 text-white font-bold py-2.5 rounded-lg text-xs transition-colors cursor-pointer"
                  >
                    Submit Answer
                  </button>
                ) : (
                  <button
                    onClick={handleNextQuestion}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-lg text-xs transition-colors cursor-pointer"
                  >
                    Next Question
                  </button>
                )}
              </div>
            ) : (
              <div className="text-center py-10 text-gray-500 text-xs italic">
                No quiz items compiled for this package.
              </div>
            )}
          </div>
        ) : (
          /* FLASHCARDS VIEW */
          <div className="w-full max-w-md space-y-6">
            {activeCard ? (
              <div className="space-y-6">
                <div className="flex justify-between items-center text-[10px] text-gray-500 font-mono select-none">
                  <span>CARD {currentCardIndex + 1} OF {cards.length}</span>
                  <span>Ease Factor: {activeCard.difficulty_score}</span>
                </div>

                {/* Card Flip box */}
                <div
                  onClick={handleFlipCard}
                  className="h-56 bg-slate-900 border border-gray-800 rounded-xl flex flex-col items-center justify-center p-6 text-center cursor-pointer shadow-lg hover:border-gray-700 transition-colors select-none relative"
                >
                  <span className="absolute top-3 right-3 text-[10px] text-gray-500 uppercase tracking-widest font-mono">
                    {isFlipped ? "Answer" : "Question"}
                  </span>
                  
                  <div className="space-y-2">
                    <p className="text-sm font-bold text-gray-100 leading-relaxed">
                      {isFlipped ? activeCard.back : activeCard.front}
                    </p>
                    {!isFlipped && (
                      <span className="text-[10px] text-gray-500 italic block mt-3">Click card to reveal answer</span>
                    )}
                  </div>
                </div>

                {/* SM-2 Recall Actions */}
                {isFlipped && (
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      onClick={() => handleRecallGrade(1)}
                      className="bg-red-950/20 border border-red-900/40 hover:bg-red-900 hover:text-white text-red-400 font-semibold py-2 rounded-lg text-xs transition-all cursor-pointer"
                    >
                      👎 Hard (Reset Spacing)
                    </button>
                    <button
                      onClick={() => handleRecallGrade(4)}
                      className="bg-blue-950/20 border border-blue-900/40 hover:bg-blue-900 hover:text-white text-blue-400 font-semibold py-2 rounded-lg text-xs transition-all cursor-pointer"
                    >
                      👍 Good (Standard Spacing)
                    </button>
                    <button
                      onClick={() => handleRecallGrade(5)}
                      className="bg-green-950/20 border border-green-900/40 hover:bg-green-900 hover:text-white text-green-400 font-semibold py-2 rounded-lg text-xs transition-all cursor-pointer"
                    >
                      🔥 Easy (Extend Spacing)
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-20 text-gray-500 text-xs italic">
                No flashcards compiled for this package.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
