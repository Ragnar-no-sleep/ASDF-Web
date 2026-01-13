'use client';

import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

// ============================================
// XP & BADGES CONTEXT
// ============================================

interface LearnState {
  xp: number;
  completedSections: string[];
  unlockedBadges: string[];
  quizProgress: { level: number; perfectRun: boolean };
}

interface LearnContextType extends LearnState {
  addXP: (amount: number) => void;
  completeSection: (sectionId: string) => void;
  unlockBadge: (badgeId: string) => void;
  setQuizLevel: (level: number) => void;
  setQuizPerfect: (perfect: boolean) => void;
}

const LearnContext = createContext<LearnContextType | null>(null);

function useLearn() {
  const context = useContext(LearnContext);
  if (!context) throw new Error('useLearn must be used within LearnProvider');
  return context;
}

// ============================================
// BADGES DATA
// ============================================

const BADGES = [
  { id: 'reader', icon: '📖', name: 'Reader' },
  { id: 'scholar', icon: '🎓', name: 'Scholar' },
  { id: 'quiz', icon: '🏆', name: 'Quiz Master' },
  { id: 'journey', icon: '💎', name: 'Journey' },
  { id: 'perfect', icon: '🎯', name: 'Perfect' },
  { id: 'master', icon: '👑', name: 'Master' },
];

const SECTIONS = [
  { id: 'what', name: 'What is it', xp: 25 },
  { id: 'why', name: 'Why ASDF', xp: 25 },
  { id: 'process', name: 'The Process', xp: 25 },
  { id: 'quiz', name: 'Quiz', xp: 150 },
  { id: 'play', name: 'Play', xp: 100, locked: true },
  { id: 'analytics', name: 'Analytics', xp: 0 },
  { id: 'faq', name: 'FAQ', xp: 0 },
];

// ============================================
// SIDEBAR COMPONENT
// ============================================

function Sidebar({
  activeSection,
  onSectionChange,
}: {
  activeSection: string;
  onSectionChange: (section: string) => void;
}) {
  const { xp, completedSections, unlockedBadges, quizProgress } = useLearn();

  const isSectionUnlocked = (sectionId: string) => {
    if (sectionId === 'play') {
      return completedSections.includes('quiz');
    }
    return true;
  };

  return (
    <aside className="hidden lg:block sticky top-24 h-fit space-y-4">
      {/* XP Display */}
      <div className="bg-dark-elevated border border-ragnar/20 rounded-xl p-5">
        <div className="flex items-center gap-3 p-4 bg-ragnar/10 border border-ragnar/30 rounded-lg mb-4">
          <span className="text-xl">⭐</span>
          <div>
            <div className="font-mono text-lg font-bold text-ragnar">{xp} XP</div>
            <div className="text-xs text-warm-muted">Total Earned</div>
          </div>
        </div>

        <div className="font-mono text-xs uppercase tracking-widest text-warm-ghost mb-4">
          Progress
        </div>
        <div className="space-y-2">
          {SECTIONS.map(section => {
            const isCompleted = completedSections.includes(section.id);
            const isActive = activeSection === section.id;
            const isLocked = !isSectionUnlocked(section.id);

            return (
              <button
                key={section.id}
                onClick={() => !isLocked && onSectionChange(section.id)}
                disabled={isLocked}
                className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${
                  isActive ? 'bg-ragnar/10' : 'hover:bg-dark-surface'
                } ${isLocked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <div
                  className={`w-6 h-6 flex items-center justify-center rounded-full font-mono text-xs font-bold ${
                    isCompleted
                      ? 'bg-green-500 text-hub-deep'
                      : isActive
                        ? 'bg-ragnar text-hub-deep'
                        : 'bg-dark-card'
                  }`}
                >
                  {isCompleted ? '✓' : SECTIONS.findIndex(s => s.id === section.id) + 1}
                </div>
                <div className="flex-1 text-left">
                  <div className="text-sm font-medium">{section.name}</div>
                  <div className="font-mono text-xs text-warm-ghost">
                    {section.xp > 0
                      ? `+${section.xp} XP`
                      : section.id === 'analytics'
                        ? 'Live Data'
                        : ''}
                  </div>
                </div>
                {isLocked && <span>🔒</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Badges */}
      <div className="bg-dark-elevated border border-ragnar/20 rounded-xl p-5">
        <div className="font-mono text-xs uppercase tracking-widest text-warm-ghost mb-4">
          Badges
        </div>
        <div className="grid grid-cols-3 gap-2">
          {BADGES.map(badge => {
            const isUnlocked = unlockedBadges.includes(badge.id);
            return (
              <div
                key={badge.id}
                className={`flex flex-col items-center p-3 rounded-lg text-center transition-all ${
                  isUnlocked
                    ? 'bg-ragnar/10 border border-ragnar/30'
                    : 'bg-dark-card opacity-30 grayscale'
                }`}
              >
                <span className="text-xl mb-1">{badge.icon}</span>
                <span className="text-[9px] text-warm-secondary">{badge.name}</span>
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
}

// ============================================
// SECTION: WHAT IS IT
// ============================================

function WhatSection() {
  const { addXP, completeSection, completedSections } = useLearn();

  useEffect(() => {
    if (!completedSections.includes('what')) {
      addXP(25);
      completeSection('what');
    }
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="bg-dark-elevated border border-ragnar/20 rounded-xl p-8">
        <h2 className="text-2xl font-bold mb-4">🐕 What is ASDF?</h2>
        <p className="text-warm-secondary mb-4">
          ASDF is a <strong className="text-warm-primary">deflationary token</strong> on Solana.
          Every trade generates fees that automatically buy back and burn tokens - permanently
          reducing supply.
        </p>

        <div className="p-5 bg-ragnar/10 border-l-4 border-ragnar rounded-lg my-5">
          <strong className="text-ragnar">The one-sentence pitch:</strong>{' '}
          <span className="text-warm-secondary">
            Trading fees buy tokens. Bought tokens get burned. Supply goes down. THIS IS FINE.
          </span>
        </div>

        <p className="text-warm-secondary">
          You know the "This is Fine" meme - the dog sitting in a burning room. That's our mascot
          and philosophy. In crypto chaos, most tokens pump and dump. ASDF turns the chaos into
          fuel.
        </p>
      </div>

      <div className="bg-dark-elevated border border-ragnar/20 rounded-xl p-8">
        <h3 className="text-lg font-semibold mb-3">🔥 The Burn Mechanism</h3>
        <p className="text-warm-secondary mb-4">
          When you "burn" tokens, you send them to an address with no private key. They're gone
          forever. No one can access them - ever.
        </p>
        <p className="text-warm-secondary mb-4">
          Think of it like throwing money into a volcano. When supply decreases while demand stays
          constant, each remaining token becomes more scarce.
        </p>
        <p className="text-ragnar">All burns are on-chain and publicly verifiable on Solscan.</p>
      </div>

      <div className="bg-dark-elevated border border-ragnar/20 rounded-xl p-8">
        <h3 className="text-lg font-semibold mb-3">🔧 Live Tools</h3>
        <p className="text-warm-secondary mb-4">
          ASDF is more than a token - it's an ecosystem of tools. Each tool generates fees that fuel
          the burn.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { icon: '📈', name: 'HolDex', href: '/holdex' },
            { icon: '🚀', name: 'Ignition', href: '/ignition' },
            { icon: '🎯', name: 'Forecast', href: '/asdforecast' },
            { icon: '🔥', name: 'Burns', href: '/burns' },
            { icon: '📊', name: 'Analytics', href: '/burns#analytics' },
          ].map(tool => (
            <Link
              key={tool.name}
              href={tool.href}
              className="flex items-center gap-3 p-4 bg-dark-card rounded-lg hover:bg-dark-elevated transition-all hover:-translate-y-0.5"
            >
              <span className="text-xl">{tool.icon}</span>
              <div>
                <div className="font-medium">{tool.name}</div>
                <div className="text-xs text-green-500">✓ Live</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ============================================
// SECTION: WHY ASDF
// ============================================

function WhySection() {
  const { addXP, completeSection, completedSections } = useLearn();

  useEffect(() => {
    if (!completedSections.includes('why')) {
      addXP(25);
      completeSection('why');
    }
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="bg-dark-elevated border border-ragnar/20 rounded-xl p-8">
        <h2 className="text-2xl font-bold mb-4">⚡ Why ASDF?</h2>
        <p className="text-warm-secondary mb-4">
          Most deflationary tokens take a percentage from each transfer. ASDF is different.
        </p>

        <div className="p-5 bg-ragnar/10 border-l-4 border-ragnar rounded-lg">
          <strong className="text-ragnar">External Revenue Source:</strong>{' '}
          <span className="text-warm-secondary">
            Burns are funded by creator fees from Pump.fun trading - not from your transfers. This
            means burns happen regardless of ASDF-specific activity.
          </span>
        </div>
      </div>

      {/* THIS IS FINE - 3 Layers */}
      <div className="bg-dark-elevated border border-ragnar rounded-xl p-8">
        <h3 className="text-lg font-semibold mb-4">🐕🔥 "THIS IS FINE" - Three Layers Deep</h3>
        <p className="text-warm-secondary mb-6">
          Our mascot isn't just a meme. It's a philosophy with three levels of meaning:
        </p>

        <div className="space-y-4">
          <div className="p-5 bg-dark-card rounded-lg border-l-4 border-warm-ghost">
            <div className="font-mono text-xs uppercase text-warm-ghost mb-2">Surface Level</div>
            <div className="font-semibold mb-2">Acceptance of Chaos</div>
            <div className="text-sm text-warm-secondary">
              Crypto markets are wild. Prices swing 50% in a day. Most panic. We accept the chaos as
              fuel.
            </div>
          </div>

          <div className="p-5 bg-dark-card rounded-lg border-l-4 border-ragnar">
            <div className="font-mono text-xs uppercase text-ragnar mb-2">Milieu</div>
            <div className="font-semibold mb-2">Anti-Panic Conviction</div>
            <div className="text-sm text-warm-secondary">
              Diamond hands through volatility. No FOMO, no FUD. The mechanism works regardless of
              short-term price.
            </div>
          </div>

          <div className="p-5 bg-gradient-to-r from-hub-base to-ragnar/10 rounded-lg border-l-4 border-ragnar">
            <div className="font-mono text-xs uppercase text-ragnar mb-2">Profond</div>
            <div className="font-semibold mb-2">Lucid Irony</div>
            <div className="text-sm text-warm-secondary">
              We <em>know</em> everything is on fire. We build anyway. With mathematical rigor. With
              verifiable code. The dog drinks coffee because he understands - and builds through the
              flames.
            </div>
          </div>
        </div>
      </div>

      {/* BUILD > USE > HOLD */}
      <div className="bg-dark-elevated border border-ragnar/20 rounded-xl p-8">
        <h3 className="text-lg font-semibold mb-4">
          🔨 Conviction Hierarchy: BUILD {'>'} USE {'>'} HOLD
        </h3>
        <p className="text-warm-secondary mb-6">
          Not all participation is equal. The ecosystem rewards active contribution with φ-weighted
          multipliers:
        </p>

        <div className="space-y-4">
          <div className="flex items-center gap-4 p-5 bg-gradient-to-r from-ragnar/20 to-hub-base rounded-lg">
            <span className="text-3xl">🔨</span>
            <div className="flex-1">
              <div className="font-bold text-ragnar">BUILD</div>
              <div className="text-sm text-warm-secondary">
                Create tools, contribute code, generate ecosystem value
              </div>
            </div>
            <div className="font-mono text-ragnar font-bold">φ² = 2.618x</div>
          </div>

          <div className="flex items-center gap-4 p-5 bg-gradient-to-r from-ragnar/10 to-hub-base rounded-lg">
            <span className="text-3xl">🔧</span>
            <div className="flex-1">
              <div className="font-bold">USE</div>
              <div className="text-sm text-warm-secondary">
                Active ecosystem participant, using tools generates fees
              </div>
            </div>
            <div className="font-mono text-warm-secondary font-bold">φ = 1.618x</div>
          </div>

          <div className="flex items-center gap-4 p-5 bg-dark-card border border-ragnar/10 rounded-lg">
            <span className="text-3xl">💎</span>
            <div className="flex-1">
              <div className="font-bold">HOLD</div>
              <div className="text-sm text-warm-secondary">
                Entry point - conviction demonstrated by holding
              </div>
            </div>
            <div className="font-mono text-warm-ghost font-bold">1.0x</div>
          </div>
        </div>

        <div className="p-5 bg-ragnar/10 border-l-4 border-ragnar rounded-lg mt-6">
          <strong className="text-ragnar">Conviction {'>'} Speculation.</strong>{' '}
          <span className="text-warm-secondary">
            Holding is the minimum. Building is the maximum. The ecosystem aligns incentives so that
            those who create the most value capture the most benefit.
          </span>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================
// SECTION: THE PROCESS
// ============================================

function ProcessSection() {
  const { addXP, completeSection, completedSections, unlockBadge } = useLearn();

  useEffect(() => {
    if (!completedSections.includes('process')) {
      addXP(25);
      completeSection('process');

      // Check for reader badge
      if (completedSections.includes('what') && completedSections.includes('why')) {
        unlockBadge('reader');
      }
    }
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="bg-dark-elevated border border-ragnar/20 rounded-xl p-8">
        <h2 className="text-2xl font-bold mb-4">🔄 The Process</h2>
        <p className="text-warm-secondary mb-6">Here's how the flywheel works - visualized.</p>

        {/* Flywheel */}
        <div className="flex flex-wrap items-center justify-center gap-3 p-8 bg-dark-card rounded-xl">
          {[
            { icon: '🔄', label: 'Trade' },
            { icon: '💰', label: 'Fees' },
            { icon: '🛒', label: 'Buyback' },
            { icon: '🔥', label: 'Burn' },
            { icon: '📈', label: 'Scarcity' },
          ].map((step, i) => (
            <div key={step.label} className="flex items-center gap-3">
              <div className="flex flex-col items-center gap-2 p-4 bg-dark-elevated border border-ragnar/10 rounded-lg min-w-[80px]">
                <span className="text-2xl">{step.icon}</span>
                <span className="font-mono text-xs font-medium uppercase tracking-wider">
                  {step.label}
                </span>
              </div>
              {i < 4 && <span className="text-ragnar text-xl">→</span>}
            </div>
          ))}
        </div>

        <p className="text-center text-warm-ghost text-sm italic mt-4">
          More trading → More fees → More burns → Less supply → More scarcity → More trading...
          repeat.
        </p>
      </div>

      {/* PHI Section */}
      <div className="bg-gradient-to-br from-hub-elevated to-ragnar/5 border border-ragnar rounded-xl p-8">
        <h3 className="flex items-center gap-2 text-lg font-semibold mb-4">
          <span className="font-serif text-3xl text-ragnar">φ</span>
          The Golden Ratio
        </h3>
        <p className="text-warm-secondary mb-4">
          Every ratio in the ASDF ecosystem is derived from{' '}
          <strong className="text-ragnar">φ (phi) = 1.618...</strong> - the golden ratio found in
          nature, from spiral galaxies to seashells.
        </p>

        <div className="p-5 bg-ragnar/10 border-l-4 border-ragnar rounded-lg mb-6">
          <strong className="text-ragnar">No magic numbers.</strong>{' '}
          <span className="text-warm-secondary">
            When you see 61.8%, it's 1/φ. When you see 38.2%, it's 1/φ². Every parameter has
            mathematical elegance - not arbitrary human decisions.
          </span>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {[
            { formula: '1/φ', value: '61.8%', label: 'Primary ratio' },
            { formula: '1/φ²', value: '38.2%', label: 'Secondary ratio' },
            { formula: '1/φ³', value: '23.6%', label: 'Tertiary ratio' },
          ].map(ratio => (
            <div key={ratio.formula} className="text-center p-4 bg-dark-card rounded-lg">
              <div className="font-mono text-xl text-ragnar">{ratio.formula}</div>
              <div className="text-lg font-bold">{ratio.value}</div>
              <div className="text-xs text-warm-ghost">{ratio.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* K-Score */}
      <div className="bg-dark-elevated border border-ragnar/20 rounded-xl p-8">
        <h3 className="text-lg font-semibold mb-4">📈 K-Score: Measuring Conviction</h3>
        <p className="text-warm-secondary mb-4">
          The K-Score uses <strong>geometric mean</strong> - if ANY dimension is zero, the entire
          score is zero. No shortcuts.
        </p>

        <div className="text-center p-8 bg-dark-card rounded-xl my-6">
          <div className="font-mono text-2xl text-ragnar mb-3">K = 100 × ∛(D × O × L)</div>
          <div className="text-sm text-warm-secondary">Diamond × Organic × Longevity</div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {[
            { icon: '💎', letter: 'D', name: 'Diamond', desc: 'Holder conviction depth' },
            { icon: '🌱', letter: 'O', name: 'Organic', desc: 'Natural distribution' },
            { icon: '⏳', letter: 'L', name: 'Longevity', desc: 'Time-tested survival' },
          ].map(dim => (
            <div key={dim.letter} className="p-4 bg-dark-card rounded-lg text-center">
              <span className="text-2xl">{dim.icon}</span>
              <div className="font-bold my-2">
                {dim.letter} ({dim.name})
              </div>
              <div className="text-sm text-warm-secondary">{dim.desc}</div>
            </div>
          ))}
        </div>

        <div className="p-5 bg-ragnar/10 border-l-4 border-ragnar rounded-lg mt-6">
          <strong className="text-ragnar">Critical:</strong>{' '}
          <span className="text-warm-secondary">
            If D=0 (no conviction), K=0. If O=0 (all whales), K=0. If L=0 (brand new), K=0. This
            enforces <strong>balanced quality</strong> - you can't fake your way to a high score.
          </span>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================
// SECTION: QUIZ
// ============================================

const QUIZ_DATA = {
  1: {
    title: 'Token Basics',
    questions: [
      {
        question: 'What happens to ASDF trading fees?',
        options: [
          'They go to the development team',
          'They buy back and burn ASDF tokens',
          "They're distributed to holders as dividends",
          'They fund marketing campaigns',
        ],
        correct: 1,
      },
      {
        question: 'What does "burn" mean in crypto?',
        options: [
          'Converting to another cryptocurrency',
          'Staking tokens for rewards',
          'Sending tokens to an inaccessible address forever',
          'Selling at a loss',
        ],
        correct: 2,
      },
    ],
  },
  2: {
    title: 'Ecosystem',
    questions: [
      {
        question: 'What happens when someone sells ASDF?',
        options: [
          'The burn mechanism stops',
          'Fees are still collected for future burns',
          'Holders lose their tokens',
          'The token becomes worthless',
        ],
        correct: 1,
      },
      {
        question: 'The daemon is best described as:',
        options: [
          'A person manually executing trades',
          'An automated program running 24/7',
          'A Discord bot',
          'A smart contract on Ethereum',
        ],
        correct: 1,
      },
    ],
  },
  3: {
    title: 'Building',
    questions: [
      {
        question: 'What makes ASDF different from a typical memecoin?',
        options: [
          'It has a cute mascot',
          "It's on Solana instead of Ethereum",
          'Fees fuel burns instead of going to devs',
          'It has a higher supply',
        ],
        correct: 2,
      },
      {
        question: "What's the core philosophy of ASDF?",
        options: [
          'Trust the team blindly',
          'Buy and hold forever',
          'Verify on-chain, trust the code',
          'Sell when in doubt',
        ],
        correct: 2,
      },
    ],
  },
};

function QuizSection() {
  const {
    addXP,
    completeSection,
    completedSections,
    unlockBadge,
    quizProgress,
    setQuizLevel,
    setQuizPerfect,
  } = useLearn();
  const [currentLevel, setCurrentLevel] = useState(1);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [levelComplete, setLevelComplete] = useState(false);
  const [isPerfect, setIsPerfect] = useState(true);

  const levelData = QUIZ_DATA[currentLevel as keyof typeof QUIZ_DATA];
  const question = levelData.questions[currentQuestion];

  const handleAnswer = (index: number) => {
    if (selectedAnswer !== null) return;
    setSelectedAnswer(index);
    setShowFeedback(true);

    const isCorrect = index === question.correct;
    if (isCorrect) {
      addXP(25);
    } else {
      setIsPerfect(false);
      setQuizPerfect(false);
    }

    setTimeout(() => {
      if (currentQuestion < levelData.questions.length - 1) {
        setCurrentQuestion(prev => prev + 1);
        setSelectedAnswer(null);
        setShowFeedback(false);
      } else {
        setLevelComplete(true);
      }
    }, 1500);
  };

  const nextLevel = () => {
    if (currentLevel < 3) {
      setCurrentLevel(prev => prev + 1);
      setQuizLevel(currentLevel + 1);
      setCurrentQuestion(0);
      setSelectedAnswer(null);
      setShowFeedback(false);
      setLevelComplete(false);
    } else {
      // Quiz complete
      completeSection('quiz');
      unlockBadge('quiz');
      if (isPerfect) {
        unlockBadge('perfect');
      }
    }
  };

  if (completedSections.includes('quiz')) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-12"
      >
        <div className="text-5xl mb-4">🏆</div>
        <h2 className="text-2xl font-bold text-ragnar mb-2">Quiz Complete!</h2>
        <p className="text-warm-secondary mb-6">You've mastered the ASDF knowledge.</p>
        <button
          onClick={() => {
            // Reset quiz
            setCurrentLevel(1);
            setCurrentQuestion(0);
            setSelectedAnswer(null);
            setShowFeedback(false);
            setLevelComplete(false);
          }}
          className="px-6 py-3 bg-ragnar/20 border border-ragnar/40 rounded-xl text-ragnar hover:bg-ragnar/30 transition-colors"
        >
          Retake Quiz
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="bg-dark-elevated border border-ragnar/20 rounded-xl p-8">
        <div className="flex items-center gap-3 mb-4">
          <span className="px-3 py-1 bg-ragnar/20 border border-ragnar/40 rounded-full text-ragnar text-sm font-mono">
            Level {currentLevel}
          </span>
          <span className="text-sm text-warm-ghost">{levelData.title}</span>
        </div>
        <h2 className="text-2xl font-bold">
          {currentLevel === 1 && '🔥 Understanding the Token'}
          {currentLevel === 2 && '💡 The Ecosystem'}
          {currentLevel === 3 && '🔨 Building on ASDF'}
        </h2>
      </div>

      <AnimatePresence mode="wait">
        {!levelComplete ? (
          <motion.div
            key={`q-${currentLevel}-${currentQuestion}`}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="bg-dark-elevated border border-ragnar/20 rounded-xl p-6"
          >
            <div className="flex justify-between items-center mb-4">
              <span className="font-mono text-xs uppercase tracking-widest text-warm-ghost">
                Question {currentQuestion + 1}/{levelData.questions.length}
              </span>
              <span className="font-mono text-sm text-ragnar">+25 XP</span>
            </div>

            <div className="text-lg font-semibold mb-5">{question.question}</div>

            <div className="space-y-3">
              {question.options.map((option, index) => {
                let className = 'w-full p-4 text-left rounded-lg border transition-all ';

                if (showFeedback) {
                  if (index === question.correct) {
                    className += 'bg-green-500/20 border-green-500 text-green-400';
                  } else if (index === selectedAnswer) {
                    className += 'bg-red-500/20 border-red-500 text-red-400';
                  } else {
                    className += 'bg-dark-card border-ragnar/10 opacity-50';
                  }
                } else if (selectedAnswer === index) {
                  className += 'bg-ragnar/10 border-ragnar';
                } else {
                  className +=
                    'bg-dark-card border-ragnar/10 hover:border-ragnar/30 hover:bg-dark-elevated cursor-pointer';
                }

                return (
                  <button
                    key={index}
                    onClick={() => handleAnswer(index)}
                    disabled={selectedAnswer !== null}
                    className={className}
                  >
                    {option}
                  </button>
                );
              })}
            </div>

            {showFeedback && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`mt-4 p-4 rounded-lg ${
                  selectedAnswer === question.correct
                    ? 'bg-green-500/10 border border-green-500 text-green-400'
                    : 'bg-red-500/10 border border-red-500 text-red-400'
                }`}
              >
                {selectedAnswer === question.correct
                  ? 'Correct! +25 XP'
                  : 'Not quite. The correct answer is highlighted.'}
              </motion.div>
            )}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center p-8 bg-ragnar/10 border border-ragnar rounded-xl"
          >
            <div className="text-5xl mb-4">
              {currentLevel === 1 && '🏆'}
              {currentLevel === 2 && '🌟'}
              {currentLevel === 3 && '👑'}
            </div>
            <h3 className="text-xl font-bold text-ragnar mb-2">Level {currentLevel} Complete!</h3>
            <p className="text-warm-secondary mb-4">+50 XP earned</p>
            <button
              onClick={nextLevel}
              className="px-6 py-3 bg-ragnar/20 border border-ragnar/40 rounded-xl text-ragnar hover:bg-ragnar/30 transition-colors"
            >
              {currentLevel < 3 ? `Continue to Level ${currentLevel + 1} →` : 'Complete Quiz →'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ============================================
// SECTION: PLAY (Holder's Journey)
// ============================================

const JOURNEY_CHAPTERS = [
  {
    icon: '🐕',
    title: 'The First Buy',
    text: 'You\'ve just discovered ASDF on Twitter. The meme caught your eye - a dog sitting in a burning room, drinking coffee. "This is fine."<br/><br/>You have 1,000 USDC to invest. ASDF is at $0.001. The chart looks volatile, but the burn mechanism sounds interesting...',
    choices: [
      { text: '🚀 Go all in! Buy 1,000,000 ASDF', effects: { diamond: -20, portfolio: 1000000 } },
      {
        text: '🧠 Research first - read the docs and check Solscan',
        effects: { knowledge: 30, diamond: 10 },
      },
      {
        text: '💎 Buy a small bag to test (100,000 ASDF)',
        effects: { diamond: 10, portfolio: 100000 },
      },
    ],
  },
  {
    icon: '📉',
    title: 'The First Dip',
    text: 'A whale just dumped 50M tokens. The chart is -40% in an hour. Twitter is full of FUD. Your portfolio is down significantly.<br/><br/>What do you do?',
    choices: [
      {
        text: '😱 Panic sell everything!',
        effects: { diamond: -30, portfolio: -50, community: -20 },
      },
      { text: '🔥 Check if burns are still happening', effects: { knowledge: 20, diamond: 20 } },
      { text: '💎 Diamond hands - HODL and wait', effects: { diamond: 30 } },
    ],
  },
  {
    icon: '🔥',
    title: 'Burn Cycle',
    text: 'You notice a large burn just happened - 500K tokens permanently removed. The daemon is working. Some community members are celebrating.<br/><br/>How do you react?',
    choices: [
      {
        text: '🎉 Share the news and celebrate with community',
        effects: { community: 30, knowledge: 10 },
      },
      { text: '📊 Verify the burn on Solscan yourself', effects: { knowledge: 30, diamond: 10 } },
      { text: '🛒 Buy more during the excitement', effects: { diamond: -10, portfolio: 200000 } },
    ],
  },
  {
    icon: '🏗️',
    title: 'Ecosystem Growth',
    text: "New tools are launching in the ecosystem - Forecast for predictions, HolDex for analytics. Each generates fees that fuel more burns.<br/><br/>What's your move?",
    choices: [
      { text: '🔨 Try building something yourself', effects: { knowledge: 40, community: 20 } },
      { text: '📈 Use the tools and provide feedback', effects: { community: 30, knowledge: 20 } },
      { text: '💰 Just hold and watch the burns', effects: { diamond: 20 } },
    ],
  },
  {
    icon: '🐋',
    title: 'Whale Alert',
    text: "A massive wallet is accumulating. Speculation is rampant - is it an exchange? An insider? The community is divided.<br/><br/>What's your stance?",
    choices: [
      { text: '🏃 Follow the whale - buy more!', effects: { diamond: -20, portfolio: 300000 } },
      { text: '🧐 Analyze wallet history on-chain', effects: { knowledge: 30 } },
      { text: '🤝 Discuss with community, stay rational', effects: { community: 30, diamond: 20 } },
    ],
  },
  {
    icon: '🎢',
    title: 'Market Mania',
    text: 'Bull market is here! ASDF is up 500%. Your portfolio is worth more than you ever imagined. Everyone is euphoric.<br/><br/>This is fine... right?',
    choices: [
      { text: '🎰 FOMO buy at the top', effects: { diamond: -40, portfolio: 500000 } },
      { text: '💡 Take some profits, keep some', effects: { knowledge: 20, portfolio: -30 } },
      { text: '💎 HODL everything - true diamond hands', effects: { diamond: 40 } },
    ],
  },
  {
    icon: '🏆',
    title: 'The Final Test',
    text: "After months of holding, learning, and participating, you've seen it all. The burns continue. The ecosystem grows. The community strengthens.<br/><br/>What did you learn?",
    choices: [
      {
        text: '🔥 This is fine - trust the process',
        effects: { diamond: 50, knowledge: 50, community: 50 },
      },
      { text: '📚 DYOR is everything', effects: { knowledge: 100 } },
      { text: '🤝 Community makes the difference', effects: { community: 100 } },
    ],
  },
];

function PlaySection() {
  const { addXP, completeSection, completedSections, unlockBadge } = useLearn();
  const [started, setStarted] = useState(false);
  const [chapter, setChapter] = useState(0);
  const [stats, setStats] = useState({
    diamond: 50,
    knowledge: 20,
    community: 30,
    portfolio: 1000,
  });
  const [finished, setFinished] = useState(false);

  const currentChapter = JOURNEY_CHAPTERS[chapter];

  const handleChoice = (choiceIndex: number) => {
    const effects = currentChapter.choices[choiceIndex].effects;
    setStats(prev => ({
      diamond: Math.max(0, Math.min(100, prev.diamond + (effects.diamond || 0))),
      knowledge: Math.max(0, Math.min(100, prev.knowledge + (effects.knowledge || 0))),
      community: Math.max(0, Math.min(100, prev.community + (effects.community || 0))),
      portfolio: Math.max(0, prev.portfolio + (effects.portfolio || 0)),
    }));

    if (chapter < JOURNEY_CHAPTERS.length - 1) {
      setTimeout(() => setChapter(prev => prev + 1), 500);
    } else {
      setFinished(true);
      addXP(100);
      completeSection('play');
      unlockBadge('journey');
    }
  };

  const getArchetype = () => {
    if (stats.diamond >= 80)
      return {
        icon: '💎',
        name: 'Diamond Hand Legend',
        desc: 'Unshakeable conviction. Nothing phases you.',
      };
    if (stats.knowledge >= 80)
      return {
        icon: '🧠',
        name: 'Scholar',
        desc: 'Knowledge is power. You understand the ecosystem deeply.',
      };
    if (stats.community >= 80)
      return {
        icon: '🤝',
        name: 'Community Leader',
        desc: 'The heart of the ecosystem. You bring people together.',
      };
    if (stats.portfolio >= 500000)
      return { icon: '🐋', name: 'Whale', desc: 'Massive bags. You believe in the vision.' };
    return { icon: '🐕', name: 'Survivor', desc: 'You made it through the chaos.' };
  };

  if (!completedSections.includes('quiz')) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-12"
      >
        <div className="text-5xl mb-4">🔒</div>
        <h2 className="text-2xl font-bold mb-2">Complete the Quiz First</h2>
        <p className="text-warm-secondary">
          Finish the Quiz section to unlock the Holder's Journey.
        </p>
      </motion.div>
    );
  }

  if (!started) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-12"
      >
        <div className="text-6xl mb-6">🐕🔥</div>
        <h1 className="text-3xl font-bold mb-4">Holder's Journey</h1>
        <p className="text-lg text-warm-secondary mb-8">
          Navigate the chaos. Learn the truth. THIS IS FINE.
        </p>

        <div className="max-w-lg mx-auto text-warm-secondary mb-8">
          <p>
            You're about to enter the chaotic world of crypto. Every choice matters. Every decision
            shapes your destiny.
          </p>
          <p className="text-ragnar mt-2">
            Will you become a diamond-handed legend or fall victim to the market's chaos?
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto mb-8">
          {[
            { icon: '💎', name: 'Diamond Hands', desc: 'HODL through volatility' },
            { icon: '🧠', name: 'Knowledge', desc: 'Ecosystem understanding' },
            { icon: '🤝', name: 'Community', desc: 'Fellow holder standing' },
            { icon: '💰', name: 'Portfolio', desc: 'Your holdings value' },
          ].map(stat => (
            <div
              key={stat.name}
              className="p-5 bg-dark-elevated border border-ragnar/20 rounded-xl text-center"
            >
              <span className="text-2xl">{stat.icon}</span>
              <div className="font-semibold text-sm mt-2">{stat.name}</div>
              <div className="text-xs text-warm-ghost">{stat.desc}</div>
            </div>
          ))}
        </div>

        <button
          onClick={() => setStarted(true)}
          className="px-8 py-4 bg-ragnar/20 border border-ragnar/40 rounded-xl text-ragnar text-lg hover:bg-ragnar/30 transition-colors"
        >
          Begin Your Journey →
        </button>
      </motion.div>
    );
  }

  if (finished) {
    const archetype = getArchetype();
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-12"
      >
        <div className="text-6xl mb-4">{archetype.icon}</div>
        <h2 className="text-2xl font-bold mb-2">Journey Complete!</h2>
        <p className="text-warm-secondary mb-6">{archetype.desc}</p>

        <div className="inline-block p-6 bg-ragnar/10 border border-ragnar rounded-xl mb-6">
          <div className="text-sm text-warm-ghost mb-2">Your Archetype</div>
          <div className="text-xl font-bold text-ragnar">{archetype.name}</div>
        </div>

        <div className="grid grid-cols-4 gap-4 max-w-md mx-auto mb-8">
          <div className="p-4 bg-dark-elevated rounded-lg">
            <div className="text-2xl">💎</div>
            <div className="font-mono font-bold">{stats.diamond}</div>
          </div>
          <div className="p-4 bg-dark-elevated rounded-lg">
            <div className="text-2xl">🧠</div>
            <div className="font-mono font-bold">{stats.knowledge}</div>
          </div>
          <div className="p-4 bg-dark-elevated rounded-lg">
            <div className="text-2xl">🤝</div>
            <div className="font-mono font-bold">{stats.community}</div>
          </div>
          <div className="p-4 bg-dark-elevated rounded-lg">
            <div className="text-2xl">💰</div>
            <div className="font-mono font-bold">{stats.portfolio.toLocaleString()}</div>
          </div>
        </div>

        <button
          onClick={() => {
            setStarted(false);
            setChapter(0);
            setStats({ diamond: 50, knowledge: 20, community: 30, portfolio: 1000 });
            setFinished(false);
          }}
          className="px-6 py-3 bg-ragnar/20 border border-ragnar/40 rounded-xl text-ragnar hover:bg-ragnar/30 transition-colors"
        >
          Play Again
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto"
    >
      {/* Stats Bar */}
      <div className="flex justify-around p-4 bg-dark-elevated border border-ragnar/20 rounded-xl mb-6">
        <div className="text-center">
          <div className="text-2xl">💎</div>
          <div className="font-mono text-ragnar">{stats.diamond}</div>
          <div className="text-[10px] text-warm-ghost">Diamond</div>
        </div>
        <div className="text-center">
          <div className="text-2xl">🧠</div>
          <div className="font-mono text-ragnar">{stats.knowledge}</div>
          <div className="text-[10px] text-warm-ghost">Knowledge</div>
        </div>
        <div className="text-center">
          <div className="text-2xl">🤝</div>
          <div className="font-mono text-ragnar">{stats.community}</div>
          <div className="text-[10px] text-warm-ghost">Community</div>
        </div>
        <div className="text-center">
          <div className="text-2xl">💰</div>
          <div className="font-mono text-ragnar">{stats.portfolio.toLocaleString()}</div>
          <div className="text-[10px] text-warm-ghost">ASDF</div>
        </div>
      </div>

      {/* Chapter */}
      <div className="text-center mb-4">
        <span className="font-mono text-xs text-warm-ghost">CHAPTER {chapter + 1}/7</span>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={chapter}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="bg-dark-elevated border border-ragnar/20 rounded-xl p-8 mb-6"
        >
          <div className="text-5xl text-center mb-4">{currentChapter.icon}</div>
          <h3 className="text-xl font-bold text-center mb-4">{currentChapter.title}</h3>
          <p
            className="text-warm-secondary leading-relaxed"
            dangerouslySetInnerHTML={{ __html: currentChapter.text }}
          />
        </motion.div>
      </AnimatePresence>

      <div className="space-y-3">
        {currentChapter.choices.map((choice, i) => (
          <button
            key={i}
            onClick={() => handleChoice(i)}
            className="w-full p-4 text-left bg-dark-card border border-ragnar/10 rounded-lg hover:border-ragnar/30 hover:bg-dark-elevated transition-all"
          >
            {choice.text}
          </button>
        ))}
      </div>
    </motion.div>
  );
}

// ============================================
// SECTION: ANALYTICS
// ============================================

function AnalyticsSection() {
  const [stats, setStats] = useState({
    totalBurned: '~80M',
    burnPct: '8%',
    cycles: '--',
    lastBurn: '--',
  });

  useEffect(() => {
    // Try to fetch live data
    fetch('/api/burns/stats')
      .then(res => res.json())
      .then(data => {
        if (data.totalBurned) {
          setStats({
            totalBurned: formatNumber(data.totalBurned),
            burnPct: data.burnPercentage?.toFixed(1) + '%' || '8%',
            cycles: data.cycleCount?.toString() || '--',
            lastBurn: data.lastBurnTime ? timeAgo(new Date(data.lastBurnTime)) : '--',
          });
        }
      })
      .catch(() => {});
  }, []);

  function formatNumber(num: number) {
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
    return num.toLocaleString();
  }

  function timeAgo(date: Date) {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return seconds + 's';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return minutes + 'm';
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return hours + 'h';
    const days = Math.floor(hours / 24);
    return days + 'd';
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="bg-dark-elevated border border-ragnar/20 rounded-xl p-8">
        <h2 className="text-2xl font-bold mb-4">📊 Live Analytics</h2>
        <p className="text-warm-secondary">
          Real-time burn metrics. Verified on-chain.{' '}
          <strong className="text-ragnar">Don't trust, verify.</strong>
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Burned', value: stats.totalBurned, sub: 'ASDF tokens' },
          { label: 'Burn %', value: stats.burnPct, sub: 'of initial supply' },
          { label: 'Burn Cycles', value: stats.cycles, sub: 'completed' },
          { label: 'Last Burn', value: stats.lastBurn, sub: 'ago' },
        ].map(stat => (
          <div
            key={stat.label}
            className="p-6 bg-dark-elevated border border-ragnar/20 rounded-xl text-center"
          >
            <div className="text-xs text-warm-ghost uppercase tracking-widest mb-2">
              {stat.label}
            </div>
            <div className="font-mono text-3xl font-bold text-ragnar">{stat.value}</div>
            <div className="text-sm text-warm-secondary">{stat.sub}</div>
          </div>
        ))}
      </div>

      <div className="bg-ragnar/10 border border-ragnar rounded-xl p-8">
        <h3 className="text-lg font-semibold text-ragnar mb-4">🔍 Verify Yourself</h3>
        <p className="text-warm-secondary mb-4">
          True to "Don't Trust, Verify" - check every transaction on-chain:
        </p>
        <div className="flex gap-4 flex-wrap">
          <a
            href="https://solscan.io/account/1nc1nerator11111111111111111111111111111111"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-dark-card border border-ragnar/20 rounded-lg hover:bg-dark-elevated transition-colors"
          >
            🔥 Burn Address
          </a>
          <Link
            href="/burns"
            className="px-4 py-2 bg-ragnar/20 border border-ragnar/40 rounded-lg text-ragnar hover:bg-ragnar/30 transition-colors"
          >
            📈 Full Burns Page
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================
// SECTION: FAQ
// ============================================

const FAQ_DATA = [
  {
    q: 'What is the burn address? Is it really inaccessible?',
    a: 'The burn address is a Solana address with no known private key. Once tokens are sent there, they cannot be recovered by anyone - ever. You can verify this on Solscan by checking that the address has never signed any transactions.',
  },
  {
    q: 'How often do burns happen?',
    a: 'Burns happen in "cycles" when accumulated fees reach a threshold. During high activity, burns can happen multiple times per day. You can monitor cycles via the /burns page.',
  },
  {
    q: 'Can the team "rug" or stop the burns?',
    a: 'The daemon is automated code running independently. All transactions are transparent and on-chain. The code is open-source - anyone can audit it on GitHub.',
  },
  {
    q: "What's the total supply and how much has been burned?",
    a: 'Initial supply was 1 billion tokens. Approximately 8% has been burned. Check real-time stats at alonisthe.dev/burns.',
  },
  {
    q: 'Is this a good investment?',
    a: "We don't give financial advice. ASDF is a memecoin with experimental tokenomics. Do your own research, understand the risks, and never invest more than you can afford to lose.",
  },
  {
    q: 'How can I contribute?',
    a: 'All code is open-source on GitHub! You can contribute code, build apps that integrate with the burn mechanism, or simply spread the word.',
  },
];

const GLOSSARY = [
  { term: '🔥 Burn', def: 'Permanently removing tokens by sending to an inaccessible address.' },
  { term: '🛒 Buyback', def: 'Using fees to purchase tokens from the market before burning.' },
  { term: '🤖 Daemon', def: 'Automated 24/7 program executing the burn mechanism.' },
  { term: '💰 Creator Fees', def: 'Percentage of each Pump.fun trade going to token creator.' },
  { term: '🔄 Flywheel', def: 'Self-reinforcing cycle: trade → fees → burn → scarcity → trade.' },
  { term: '🏛️ Treasury', def: 'Wallet where fees accumulate before buybacks.' },
  { term: '⏳ Cycle', def: 'Complete execution of collect → buyback → burn sequence.' },
  { term: '📉 Deflationary', def: 'Tokenomics where total supply decreases over time.' },
];

function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredGlossary = GLOSSARY.filter(
    item =>
      item.term.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.def.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="bg-dark-elevated border border-ragnar/20 rounded-xl p-8">
        <h2 className="text-2xl font-bold">❓ Frequently Asked Questions</h2>
      </div>

      <div className="space-y-3">
        {FAQ_DATA.map((faq, i) => (
          <div
            key={i}
            className="bg-dark-elevated border border-ragnar/20 rounded-xl overflow-hidden"
          >
            <button
              onClick={() => setOpenIndex(openIndex === i ? null : i)}
              className="w-full flex items-center justify-between p-5 text-left font-medium hover:bg-dark-surface transition-colors"
            >
              {faq.q}
              <span className={`transition-transform ${openIndex === i ? 'rotate-180' : ''}`}>
                ▼
              </span>
            </button>
            <AnimatePresence>
              {openIndex === i && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="px-5 pb-5 text-warm-secondary leading-relaxed">{faq.a}</div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>

      {/* Glossary */}
      <div className="bg-dark-elevated border border-ragnar/20 rounded-xl p-8">
        <h2 className="text-2xl font-bold mb-4">📖 Glossary</h2>
        <input
          type="text"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder="Search terms..."
          className="w-full p-4 bg-dark-card border border-ragnar/20 rounded-lg mb-6 focus:outline-none focus:border-ragnar"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredGlossary.map(item => (
          <div key={item.term} className="p-5 bg-dark-elevated border border-ragnar/20 rounded-xl">
            <div className="font-semibold mb-2">{item.term}</div>
            <div className="text-sm text-warm-secondary leading-relaxed">{item.def}</div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ============================================
// MAIN PAGE
// ============================================

export default function DeepLearnPage() {
  const [activeSection, setActiveSection] = useState('what');
  const [state, setState] = useState<LearnState>({
    xp: 0,
    completedSections: [],
    unlockedBadges: [],
    quizProgress: { level: 1, perfectRun: true },
  });

  // Load from localStorage on mount
  useEffect(() => {
    const savedXP = localStorage.getItem('asdf-deep-learn-xp');
    const savedSections = localStorage.getItem('asdf-deep-learn-sections');
    const savedBadges = localStorage.getItem('asdf-deep-learn-badges');

    setState(prev => ({
      ...prev,
      xp: savedXP ? parseInt(savedXP) : 0,
      completedSections: savedSections ? JSON.parse(savedSections) : [],
      unlockedBadges: savedBadges ? JSON.parse(savedBadges) : [],
    }));
  }, []);

  const contextValue: LearnContextType = {
    ...state,
    addXP: useCallback((amount: number) => {
      setState(prev => {
        const newXP = prev.xp + amount;
        localStorage.setItem('asdf-deep-learn-xp', newXP.toString());
        return { ...prev, xp: newXP };
      });
    }, []),
    completeSection: useCallback((sectionId: string) => {
      setState(prev => {
        if (prev.completedSections.includes(sectionId)) return prev;
        const newSections = [...prev.completedSections, sectionId];
        localStorage.setItem('asdf-deep-learn-sections', JSON.stringify(newSections));
        return { ...prev, completedSections: newSections };
      });
    }, []),
    unlockBadge: useCallback((badgeId: string) => {
      setState(prev => {
        if (prev.unlockedBadges.includes(badgeId)) return prev;
        const newBadges = [...prev.unlockedBadges, badgeId];
        localStorage.setItem('asdf-deep-learn-badges', JSON.stringify(newBadges));
        return { ...prev, unlockedBadges: newBadges };
      });
    }, []),
    setQuizLevel: useCallback((level: number) => {
      setState(prev => ({ ...prev, quizProgress: { ...prev.quizProgress, level } }));
    }, []),
    setQuizPerfect: useCallback((perfect: boolean) => {
      setState(prev => ({ ...prev, quizProgress: { ...prev.quizProgress, perfectRun: perfect } }));
    }, []),
  };

  const renderSection = () => {
    switch (activeSection) {
      case 'what':
        return <WhatSection />;
      case 'why':
        return <WhySection />;
      case 'process':
        return <ProcessSection />;
      case 'quiz':
        return <QuizSection />;
      case 'play':
        return <PlaySection />;
      case 'analytics':
        return <AnalyticsSection />;
      case 'faq':
        return <FAQSection />;
      default:
        return <WhatSection />;
    }
  };

  return (
    <LearnContext.Provider value={contextValue}>
      <main className="min-h-screen bg-black text-warm-primary">
        {/* Header */}
        <header className="fixed top-0 left-0 right-0 z-50 px-6 py-4 bg-gradient-to-b from-black to-transparent">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <Link
              href="/learn"
              className="font-mono text-xs tracking-widest uppercase text-warm-muted hover:text-ragnar transition-colors"
            >
              ← Back to Learn
            </Link>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-ragnar/10 border border-ragnar/20 rounded-full">
              <span>⭐</span>
              <span className="text-ragnar text-xs font-mono">{state.xp} XP</span>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-6 pt-24 pb-16">
          <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6">
            <Sidebar activeSection={activeSection} onSectionChange={setActiveSection} />

            <div className="max-w-3xl">
              {/* Section Tabs */}
              <div className="flex gap-2 mb-8 p-2 bg-dark-elevated border border-ragnar/20 rounded-xl overflow-x-auto">
                {SECTIONS.map(section => (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`px-5 py-3 rounded-lg font-medium text-sm whitespace-nowrap transition-all ${
                      activeSection === section.id
                        ? 'bg-ragnar/10 text-ragnar'
                        : 'text-warm-secondary hover:bg-dark-surface hover:text-warm-primary'
                    }`}
                  >
                    {section.name}
                  </button>
                ))}
              </div>

              {/* Section Content */}
              <AnimatePresence mode="wait">
                <motion.div key={activeSection}>{renderSection()}</motion.div>
              </AnimatePresence>

              {/* Navigation */}
              <div className="flex justify-between mt-8">
                {activeSection !== 'what' && (
                  <button
                    onClick={() => {
                      const currentIndex = SECTIONS.findIndex(s => s.id === activeSection);
                      if (currentIndex > 0) setActiveSection(SECTIONS[currentIndex - 1].id);
                    }}
                    className="px-4 py-2 text-warm-muted hover:text-warm-primary transition-colors"
                  >
                    ← Back
                  </button>
                )}
                <div className="flex-1" />
                {activeSection !== 'faq' && (
                  <button
                    onClick={() => {
                      const currentIndex = SECTIONS.findIndex(s => s.id === activeSection);
                      if (currentIndex < SECTIONS.length - 1) {
                        const nextSection = SECTIONS[currentIndex + 1];
                        if (nextSection.id !== 'play' || state.completedSections.includes('quiz')) {
                          setActiveSection(nextSection.id);
                        }
                      }
                    }}
                    className="px-6 py-3 bg-ragnar/20 border border-ragnar/40 rounded-xl text-ragnar hover:bg-ragnar/30 transition-colors"
                  >
                    Continue →
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </LearnContext.Provider>
  );
}
