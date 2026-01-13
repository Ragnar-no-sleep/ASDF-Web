'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { QuizOption } from '@/data/dev-curriculum';

interface QuizBlockProps {
  question: string;
  options: QuizOption[];
  correctAnswer: string;
  selectedAnswer?: string;
  onAnswer: (answerId: string, isCorrect: boolean) => void;
}

export function QuizBlock({
  question,
  options,
  correctAnswer,
  selectedAnswer,
  onAnswer,
}: QuizBlockProps) {
  const [selected, setSelected] = useState<string | null>(selectedAnswer || null);
  const [showFeedback, setShowFeedback] = useState(!!selectedAnswer);

  const handleSelect = (optionId: string) => {
    if (selected) return; // Already answered

    setSelected(optionId);
    setShowFeedback(true);

    const isCorrect = optionId === correctAnswer;
    onAnswer(optionId, isCorrect);
  };

  const getOptionStyle = (optionId: string) => {
    if (!selected) {
      return 'bg-[#111] border-[#222] hover:border-[#ea4e33]/50 text-[#ccc]';
    }

    if (optionId === correctAnswer) {
      return 'bg-[#4ade80]/10 border-[#4ade80] text-[#4ade80]';
    }

    if (optionId === selected && optionId !== correctAnswer) {
      return 'bg-[#ef4444]/10 border-[#ef4444] text-[#ef4444]';
    }

    return 'bg-[#111] border-[#222] text-[#666] opacity-50';
  };

  const selectedOption = options.find(o => o.id === selected);
  const isCorrect = selected === correctAnswer;

  return (
    <div>
      {/* Question */}
      <h3 className="text-xl font-semibold text-white mb-6">{question}</h3>

      {/* Options */}
      <div className="space-y-3">
        {options.map((option, index) => (
          <motion.button
            key={option.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => handleSelect(option.id)}
            disabled={!!selected}
            className={`w-full p-4 text-left border-2 rounded-xl transition-all ${getOptionStyle(option.id)} ${
              !selected ? 'cursor-pointer' : 'cursor-default'
            }`}
          >
            <div className="flex items-start gap-3">
              <span
                className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm font-medium shrink-0 ${
                  selected && option.id === correctAnswer
                    ? 'bg-[#4ade80] text-black'
                    : selected && option.id === selected
                      ? 'bg-[#ef4444] text-white'
                      : 'bg-[#222] text-[#888]'
                }`}
              >
                {selected && option.id === correctAnswer
                  ? '✓'
                  : selected && option.id === selected && option.id !== correctAnswer
                    ? '✗'
                    : String.fromCharCode(65 + index)}
              </span>
              <span className="pt-0.5">{option.text}</span>
            </div>
          </motion.button>
        ))}
      </div>

      {/* Feedback */}
      <AnimatePresence>
        {showFeedback && selectedOption && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`mt-6 p-4 rounded-xl border ${
              isCorrect
                ? 'bg-[#4ade80]/5 border-[#4ade80]/30'
                : 'bg-[#ef4444]/5 border-[#ef4444]/30'
            }`}
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl">{isCorrect ? '🎉' : '💡'}</span>
              <div>
                <p
                  className={`font-medium mb-1 ${isCorrect ? 'text-[#4ade80]' : 'text-[#ef4444]'}`}
                >
                  {isCorrect ? 'Correct!' : 'Not quite!'}
                </p>
                <p className="text-sm text-[#888]">{selectedOption.explanation}</p>
                {!isCorrect && (
                  <p className="text-sm text-[#666] mt-2">
                    The correct answer was:{' '}
                    <span className="text-[#4ade80]">
                      {options.find(o => o.id === correctAnswer)?.text}
                    </span>
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Progress indicator */}
      {selected && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-4 text-center text-sm text-[#666]"
        >
          {isCorrect ? (
            <span className="text-[#4ade80]">✓ Question completed - you can continue</span>
          ) : (
            <span className="text-[#f59e0b]">Review the explanation, then continue when ready</span>
          )}
        </motion.div>
      )}
    </div>
  );
}

export default QuizBlock;
