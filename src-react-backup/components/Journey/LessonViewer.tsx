'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import type { Lesson, ContentBlock, MicroSkill } from '@/data/dev-curriculum';
import { QuizBlock } from './QuizBlock';
import { CodeChallenge } from './CodeChallenge';
import { DiagramBlock } from './DiagramBlock';

// ============================================
// TYPES
// ============================================

interface LessonViewerProps {
  lesson: Lesson;
  onComplete: (skillsCompleted: MicroSkill[]) => void;
  onBack: () => void;
  completedSkills?: string[];
}

interface ContentProgress {
  currentIndex: number;
  completedIndexes: number[];
  quizAnswers: Record<number, string>;
}

// ============================================
// LESSON VIEWER COMPONENT
// ============================================

export function LessonViewer({
  lesson,
  onComplete,
  onBack,
  completedSkills = [],
}: LessonViewerProps) {
  const [progress, setProgress] = useState<ContentProgress>({
    currentIndex: 0,
    completedIndexes: [],
    quizAnswers: {},
  });
  const [showCompletion, setShowCompletion] = useState(false);

  const currentContent = lesson.content[progress.currentIndex];
  const isLastContent = progress.currentIndex === lesson.content.length - 1;
  const allCompleted = progress.completedIndexes.length === lesson.content.length;

  // Mark current content as completed
  const markComplete = (index: number) => {
    if (!progress.completedIndexes.includes(index)) {
      setProgress(prev => ({
        ...prev,
        completedIndexes: [...prev.completedIndexes, index],
      }));
    }
  };

  // Navigate to next content
  const goNext = () => {
    markComplete(progress.currentIndex);
    if (!isLastContent) {
      setProgress(prev => ({ ...prev, currentIndex: prev.currentIndex + 1 }));
    } else if (allCompleted || progress.completedIndexes.length === lesson.content.length - 1) {
      setShowCompletion(true);
    }
  };

  // Navigate to previous content
  const goPrev = () => {
    if (progress.currentIndex > 0) {
      setProgress(prev => ({ ...prev, currentIndex: prev.currentIndex - 1 }));
    }
  };

  // Handle quiz answer
  const handleQuizAnswer = (index: number, answerId: string, isCorrect: boolean) => {
    setProgress(prev => ({
      ...prev,
      quizAnswers: { ...prev.quizAnswers, [index]: answerId },
    }));
    if (isCorrect) {
      markComplete(index);
    }
  };

  // Handle lesson completion
  const handleComplete = () => {
    onComplete(lesson.skills);
  };

  // Calculate progress percentage
  const progressPercent = Math.round(
    (progress.completedIndexes.length / lesson.content.length) * 100
  );

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-[#666] hover:text-white transition-colors mb-4"
        >
          <span>←</span>
          <span className="text-sm">Back to Module</span>
        </button>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">{lesson.title}</h1>
            <p className="text-[#888]">{lesson.subtitle}</p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2 text-sm text-[#666] mb-1">
              <span>⏱️ {lesson.estimatedTime} min</span>
              <span className="w-1 h-1 bg-[#333] rounded-full" />
              <span className="capitalize">{lesson.difficulty}</span>
            </div>
            <div className="text-sm text-[#ea4e33] font-medium">
              +{lesson.skills.reduce((t, s) => t + s.xp, 0)} XP
            </div>
          </div>
        </div>
      </motion.div>

      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between text-xs text-[#666] mb-2">
          <span>Progress</span>
          <span>{progressPercent}%</span>
        </div>
        <div className="h-1.5 bg-[#111] rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-[#ea4e33] to-[#f59e0b] rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
        {/* Step indicators */}
        <div className="flex justify-between mt-3">
          {lesson.content.map((_, i) => (
            <button
              key={i}
              onClick={() => setProgress(prev => ({ ...prev, currentIndex: i }))}
              className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-medium transition-all ${
                i === progress.currentIndex
                  ? 'bg-[#ea4e33] text-white'
                  : progress.completedIndexes.includes(i)
                    ? 'bg-[#4ade80]/20 text-[#4ade80]'
                    : 'bg-[#111] text-[#666] hover:bg-[#1a1a1a]'
              }`}
            >
              {progress.completedIndexes.includes(i) ? '✓' : i + 1}
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <AnimatePresence mode="wait">
        <motion.div
          key={progress.currentIndex}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl overflow-hidden"
        >
          {/* Content Type Badge */}
          <div className="px-6 py-3 border-b border-[#1a1a1a] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ContentTypeBadge type={currentContent.type} />
              <span className="text-xs text-[#666]">
                {progress.currentIndex + 1} of {lesson.content.length}
              </span>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            <ContentRenderer
              content={currentContent}
              index={progress.currentIndex}
              onQuizAnswer={handleQuizAnswer}
              quizAnswer={progress.quizAnswers[progress.currentIndex]}
              onChallengeComplete={() => markComplete(progress.currentIndex)}
            />
          </div>

          {/* Navigation */}
          <div className="px-6 py-4 border-t border-[#1a1a1a] flex items-center justify-between">
            <button
              onClick={goPrev}
              disabled={progress.currentIndex === 0}
              className="px-4 py-2 text-sm text-[#666] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              ← Previous
            </button>

            {isLastContent && !showCompletion ? (
              <button
                onClick={goNext}
                disabled={
                  !progress.completedIndexes.includes(progress.currentIndex) &&
                  currentContent.type === 'quiz'
                }
                className="px-6 py-2.5 bg-gradient-to-r from-[#4ade80] to-[#22c55e] rounded-xl text-sm font-medium text-white hover:from-[#22c55e] hover:to-[#16a34a] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Complete Lesson ✓
              </button>
            ) : (
              <button
                onClick={goNext}
                className="px-6 py-2.5 bg-[#ea4e33] rounded-xl text-sm font-medium text-white hover:bg-[#d94429] transition-colors"
              >
                Continue →
              </button>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Skills to Earn */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="mt-8 p-6 bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl"
      >
        <h3 className="text-sm text-[#666] uppercase tracking-wider mb-4">
          Skills You&apos;ll Earn
        </h3>
        <div className="flex flex-wrap gap-2">
          {lesson.skills.map(skill => {
            const isCompleted = completedSkills.includes(skill.id);
            return (
              <div
                key={skill.id}
                className={`px-3 py-2 rounded-lg text-sm flex items-center gap-2 ${
                  isCompleted
                    ? 'bg-[#4ade80]/10 border border-[#4ade80]/30 text-[#4ade80]'
                    : 'bg-[#111] border border-[#222] text-[#888]'
                }`}
              >
                {isCompleted && <span>✓</span>}
                <span>{skill.name}</span>
                <span className="text-xs text-[#555]">+{skill.xp} XP</span>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Completion Modal */}
      <AnimatePresence>
        {showCompletion && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-3xl p-8 max-w-md w-full text-center"
            >
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="text-2xl font-bold text-white mb-2">Lesson Complete!</h2>
              <p className="text-[#888] mb-6">{lesson.title}</p>

              <div className="bg-[#111] rounded-xl p-4 mb-6">
                <div className="text-3xl font-bold text-[#4ade80] mb-1">
                  +{lesson.skills.reduce((t, s) => t + s.xp, 0)} XP
                </div>
                <div className="text-sm text-[#666]">{lesson.skills.length} skills unlocked</div>
              </div>

              <div className="flex flex-wrap justify-center gap-2 mb-6">
                {lesson.skills.map(skill => (
                  <span
                    key={skill.id}
                    className="px-3 py-1.5 bg-[#4ade80]/10 border border-[#4ade80]/30 rounded-lg text-sm text-[#4ade80]"
                  >
                    ✓ {skill.name}
                  </span>
                ))}
              </div>

              <button
                onClick={handleComplete}
                className="w-full py-3 bg-gradient-to-r from-[#ea4e33] to-[#f59e0b] rounded-xl text-sm font-medium text-white hover:from-[#d94429] hover:to-[#ea8f0a] transition-all"
              >
                Continue Journey →
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================
// CONTENT TYPE BADGE
// ============================================

function ContentTypeBadge({ type }: { type: ContentBlock['type'] }) {
  const config = {
    theory: { label: 'Theory', icon: '📖', color: '#4ade80' },
    code: { label: 'Code', icon: '💻', color: '#8b5cf6' },
    quiz: { label: 'Quiz', icon: '❓', color: '#f59e0b' },
    challenge: { label: 'Challenge', icon: '🎯', color: '#ea4e33' },
    diagram: { label: 'Diagram', icon: '📊', color: '#22d3ee' },
    video: { label: 'Video', icon: '🎬', color: '#ec4899' },
  };

  const { label, icon, color } = config[type];

  return (
    <span
      className="px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5"
      style={{ backgroundColor: `${color}15`, color }}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </span>
  );
}

// ============================================
// CONTENT RENDERER
// ============================================

interface ContentRendererProps {
  content: ContentBlock;
  index: number;
  onQuizAnswer: (index: number, answerId: string, isCorrect: boolean) => void;
  quizAnswer?: string;
  onChallengeComplete: () => void;
}

function ContentRenderer({
  content,
  index,
  onQuizAnswer,
  quizAnswer,
  onChallengeComplete,
}: ContentRendererProps) {
  switch (content.type) {
    case 'theory':
      return (
        <div className="prose prose-invert prose-sm max-w-none">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              code({ className, children, ...props }) {
                const match = /language-(\w+)/.exec(className || '');
                const isInline = !match;
                return isInline ? (
                  <code
                    className="px-1.5 py-0.5 bg-[#1a1a1a] rounded text-[#ea4e33] text-sm"
                    {...props}
                  >
                    {children}
                  </code>
                ) : (
                  <SyntaxHighlighter
                    style={oneDark}
                    language={match[1]}
                    PreTag="div"
                    className="rounded-xl !bg-[#0d0d0d] !p-4 text-sm"
                  >
                    {String(children).replace(/\n$/, '')}
                  </SyntaxHighlighter>
                );
              },
              table({ children }) {
                return (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">{children}</table>
                  </div>
                );
              },
              th({ children }) {
                return (
                  <th className="border border-[#222] bg-[#111] px-4 py-2 text-left text-sm font-medium text-[#999]">
                    {children}
                  </th>
                );
              },
              td({ children }) {
                return (
                  <td className="border border-[#222] px-4 py-2 text-sm text-[#ccc]">{children}</td>
                );
              },
              blockquote({ children }) {
                return (
                  <blockquote className="border-l-4 border-[#ea4e33] bg-[#ea4e33]/5 pl-4 py-3 pr-4 rounded-r-lg my-4 italic text-[#ccc]">
                    {children}
                  </blockquote>
                );
              },
              h1({ children }) {
                return <h1 className="text-2xl font-bold text-white mb-4 mt-6">{children}</h1>;
              },
              h2({ children }) {
                return <h2 className="text-xl font-semibold text-white mb-3 mt-5">{children}</h2>;
              },
              h3({ children }) {
                return <h3 className="text-lg font-medium text-white mb-2 mt-4">{children}</h3>;
              },
              p({ children }) {
                return <p className="text-[#ccc] leading-relaxed mb-4">{children}</p>;
              },
              ul({ children }) {
                return (
                  <ul className="list-disc list-inside space-y-1 text-[#ccc] mb-4">{children}</ul>
                );
              },
              ol({ children }) {
                return (
                  <ol className="list-decimal list-inside space-y-1 text-[#ccc] mb-4">
                    {children}
                  </ol>
                );
              },
              li({ children }) {
                return <li className="text-[#ccc]">{children}</li>;
              },
              strong({ children }) {
                return <strong className="font-semibold text-white">{children}</strong>;
              },
              a({ href, children }) {
                return (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#ea4e33] hover:underline"
                  >
                    {children}
                  </a>
                );
              },
            }}
          >
            {content.content}
          </ReactMarkdown>
        </div>
      );

    case 'code':
      return (
        <div>
          <SyntaxHighlighter
            style={oneDark}
            language={content.language || 'typescript'}
            PreTag="div"
            className="rounded-xl !bg-[#0d0d0d] !p-4 text-sm"
            showLineNumbers
          >
            {content.content}
          </SyntaxHighlighter>
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => navigator.clipboard.writeText(content.content)}
              className="px-4 py-2 bg-[#111] border border-[#222] rounded-lg text-sm text-[#888] hover:text-white hover:border-[#333] transition-colors"
            >
              📋 Copy Code
            </button>
          </div>
        </div>
      );

    case 'quiz':
      return (
        <QuizBlock
          question={content.content}
          options={content.options || []}
          correctAnswer={content.correctAnswer as string}
          selectedAnswer={quizAnswer}
          onAnswer={(answerId, isCorrect) => onQuizAnswer(index, answerId, isCorrect)}
        />
      );

    case 'challenge':
      return (
        <CodeChallenge
          description={content.content}
          language={content.language || 'typescript'}
          solution={content.solution || ''}
          onComplete={onChallengeComplete}
        />
      );

    case 'diagram':
      return <DiagramBlock title={content.content} data={content.diagramData!} />;

    default:
      return <div className="text-[#666]">Unsupported content type</div>;
  }
}

export default LessonViewer;
