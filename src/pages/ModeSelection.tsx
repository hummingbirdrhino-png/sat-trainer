import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import {
  selectAdaptiveQuestions,
  selectMockTestQuestions,
  selectWeakSpotQuestions,
  calculatePredictedScore,
  getUniqueSkills,
  cn,
  shuffleArray,
} from '@/lib/utils';
import type { PracticeMode, QuestionSection } from '@/types';
import {
  Brain,
  Shuffle,
  Target,
  Timer,
  RotateCcw,
  AlertTriangle,
  Bookmark,
  Zap,
  TrendingUp,
  BookOpen,
  Calculator,
  ChevronRight,
} from 'lucide-react';

interface ModeCard {
  id: PracticeMode;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  color: string;
  badge?: string;
}

const modes: ModeCard[] = [
  {
    id: 'adaptive',
    title: 'Adaptive Practice',
    subtitle: 'Prioritizes your weakest skills based on performance.',
    icon: Brain,
    color: 'var(--accent-blue)',
    badge: 'Recommended',
  },
  {
    id: 'random',
    title: 'Random Practice',
    subtitle: 'Endless fully random drill. Still updates mastery.',
    icon: Shuffle,
    color: '#A855F7',
  },
  {
    id: 'focused',
    title: 'Focused Practice',
    subtitle: 'Choose specific skills to drill and master.',
    icon: Target,
    color: 'var(--accent-emerald)',
  },
  {
    id: 'mock',
    title: 'Mock Test',
    subtitle: 'Section-length practice with SAT-style difficulty mix.',
    icon: Timer,
    color: 'var(--accent-amber)',
    badge: 'Full Test',
  },
  {
    id: 'review_wrong',
    title: 'Review Wrong Answers',
    subtitle: 'Only questions you have missed before.',
    icon: RotateCcw,
    color: 'var(--accent-rose)',
  },
  {
    id: 'weak_spots',
    title: 'Weak Spots',
    subtitle: 'Auto-selects your bottom 3 skills for targeted practice.',
    icon: AlertTriangle,
    color: '#F97316',
  },
  {
    id: 'bookmarked',
    title: 'Bookmarked',
    subtitle: 'Questions you have flagged for later review.',
    icon: Bookmark,
    color: '#8B5CF6',
  },
];

export default function ModeSelection() {
  const navigate = useNavigate();
  const { questions, mathQuestions, userSkills, bookmarks, userAnswers, displayName, isPro, setCurrentSession } = useStore();
  const [selectedSection, setSelectedSection] = useState<QuestionSection>('reading_writing');

  const activeQuestions = selectedSection === 'math' ? mathQuestions : questions;
  const sectionLabel = selectedSection === 'math' ? 'Math' : 'Reading & Writing';
  const skills = getUniqueSkills(activeQuestions);
  const sectionSkillData = Object.values(userSkills).filter((skill) => (skill.section ?? 'reading_writing') === selectedSection);
  const overallMastery = sectionSkillData.reduce(
    (sum, s) => sum + (s?.masteryScore ?? 0),
    0
  ) / Math.max(sectionSkillData.length, 1) || 0;

  const wrongAnswers = userAnswers.filter((a) => !a.isCorrect && (a.section ?? 'reading_writing') === selectedSection);
  const sectionAnswers = userAnswers.filter((answer) => (answer.section ?? 'reading_writing') === selectedSection);
  const predictedScore = sectionAnswers.length > 0
    ? calculatePredictedScore(
        sectionAnswers.filter((a) => a.isCorrect).length,
        sectionAnswers.length,
        sectionAnswers.reduce((sum, answer) => sum + answer.timeSpentSeconds, 0) / sectionAnswers.length,
        overallMastery
      )
    : null;

  const dueForReview = sectionSkillData.filter(
    (s) => s.sessionCounter >= s.nextReviewSession
  ).length;

  const getModeSubtitle = (mode: ModeCard) => {
    if (mode.id !== 'mock') return mode.subtitle;
    return selectedSection === 'math'
      ? '44 Math questions, about 70 minutes. SAT-style difficulty mix.'
      : '54 Reading & Writing questions, about 64 minutes. SAT-style difficulty mix.';
  };

  const startMode = (mode: PracticeMode) => {
    if (!activeQuestions.length) return;

    const proOnlyModes: PracticeMode[] = ['mock', 'focused', 'review_wrong', 'weak_spots', 'bookmarked'];
    if (!isPro && proOnlyModes.includes(mode)) {
      navigate('/upgrade');
      return;
    }

    let selectedQuestions;
    switch (mode) {
      case 'adaptive':
        selectedQuestions = selectAdaptiveQuestions(isPro ? activeQuestions : activeQuestions.slice(0, 25), userSkills, 1);
        break;
      case 'random':
        selectedQuestions = shuffleArray(isPro ? activeQuestions : activeQuestions.slice(0, 25)).slice(0, 1);
        break;
      case 'mock':
        selectedQuestions = selectMockTestQuestions(activeQuestions, selectedSection);
        break;
      case 'review_wrong':
        selectedQuestions = activeQuestions.filter((q) =>
          wrongAnswers.some((wa) => wa.questionId === q.id)
        );
        if (selectedQuestions.length === 0) return;
        break;
      case 'weak_spots':
        selectedQuestions = selectWeakSpotQuestions(activeQuestions, userSkills, 30);
        break;
      case 'bookmarked':
        selectedQuestions = activeQuestions.filter((q) =>
          bookmarks.some((b) => b.questionId === q.id)
        );
        if (selectedQuestions.length === 0) return;
        break;
      default:
        selectedQuestions = activeQuestions.slice(0, 10);
    }

    const session = {
      id: crypto.randomUUID(),
      mode,
      section: selectedSection,
      currentQuestionIndex: 0,
      questions: selectedQuestions,
      answers: {},
      markedForReview: [],
      startTime: Date.now(),
      isComplete: false,
      questionCount: selectedQuestions.length,
      isEndless: mode === 'adaptive' || mode === 'random',
    };

    setCurrentSession(session);

    if (mode === 'focused') {
      navigate('/focused-setup');
    } else {
      navigate('/practice');
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Hero Greeting */}
      <div className="mb-10 text-center">
        <h1
          className="mb-2 text-4xl font-bold md:text-5xl"
          style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-primary)' }}
        >
          Welcome back, {displayName}
        </h1>
        <p className="text-lg" style={{ color: 'var(--text-secondary)' }}>
          Ready to sharpen your {sectionLabel} skills?
        </p>
      </div>

      {!isPro && (
        <div className="mb-8 rounded-2xl border p-5 text-center" style={{ backgroundColor: 'rgba(59, 130, 246, 0.08)', borderColor: 'rgba(96, 165, 250, 0.35)' }}>
          <p className="font-semibold text-blue-300">Free plan: starter access to 25 questions.</p>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>Unlock Pro for the full question banks, mock tests, focused drills, bookmarks, and weak-spot review.</p>
          <button onClick={() => navigate('/upgrade')} className="mt-4 rounded-lg bg-blue-500 px-5 py-2 text-sm font-bold text-white hover:bg-blue-400">
            Upgrade to Pro
          </button>
        </div>
      )}

      {/* Stats Ribbon */}
      <div className="mb-12 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Overall Mastery"
          value={`${Math.round(overallMastery)}%`}
          icon={Zap}
          color="var(--accent-amber)"
          trend="Keep practicing"
        />
        <StatCard
          label={`Predicted ${sectionLabel} Score`}
          value={predictedScore?.toString() ?? '—'}
          icon={TrendingUp}
          color="var(--accent-blue)"
          trend={sectionAnswers.length > 0 ? `${sectionAnswers.length} answered` : 'Start practicing'}
        />
        <StatCard
          label="Due for Review"
          value={dueForReview.toString()}
          icon={BookOpen}
          color="var(--accent-emerald)"
          trend={`${skills.length} ${sectionLabel} skills`}
        />
      </div>

      {/* Section Selector */}
      <div className="mb-8 rounded-2xl border p-4" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'rgba(148, 163, 184, 0.12)' }}>
        <div className="mb-3 flex items-center gap-2">
          <Calculator className="h-5 w-5" style={{ color: 'var(--accent-blue)' }} />
          <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Choose Section</h2>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {([
            { id: 'reading_writing' as const, label: 'Reading & Writing', count: questions.length, description: 'Current SAT Reading and Writing practice bank' },
            { id: 'math' as const, label: 'Math', count: mathQuestions.length, description: 'New SAT Math bank with visual equation/page rendering' },
          ]).map((section) => (
            <button
              key={section.id}
              onClick={() => setSelectedSection(section.id)}
              className={cn(
                'rounded-xl border-2 p-4 text-left transition-all',
                selectedSection === section.id ? 'border-blue-500 bg-blue-500/10' : 'border-slate-700/50 hover:border-slate-500'
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-bold" style={{ color: 'var(--text-primary)' }}>{section.label}</p>
                  <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>{section.description}</p>
                </div>
                <span className="rounded-full px-3 py-1 text-xs font-bold" style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
                  {section.count} questions
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Mode Grid */}
      <div className="mb-8">
        <h2
          className="mb-6 text-2xl font-bold"
          style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-primary)' }}
        >
          Choose Your Practice Mode
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {modes.map((mode, index) => {
            const isDisabled =
              (mode.id === 'review_wrong' && wrongAnswers.length === 0) ||
              (mode.id === 'bookmarked' && bookmarks.length === 0);

            return (
              <button
                key={mode.id}
                onClick={() => !isDisabled && startMode(mode.id)}
                disabled={isDisabled}
                className={cn(
                  'group relative flex items-start gap-4 rounded-xl border p-6 text-left transition-all duration-200',
                  isDisabled && 'opacity-40 cursor-not-allowed',
                  !isDisabled && 'hover:-translate-y-1 hover:shadow-lg cursor-pointer'
                )}
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'rgba(148, 163, 184, 0.1)',
                  animationDelay: `${index * 50}ms`,
                }}
              >
                {/* Badge */}
                {mode.badge && (
                  <span
                    className="absolute right-3 top-3 rounded-full px-2 py-0.5 text-xs font-semibold"
                    style={{
                      backgroundColor: `${mode.color}20`,
                      color: mode.color,
                    }}
                  >
                    {mode.badge}
                  </span>
                )}

                {/* Icon */}
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg"
                  style={{ backgroundColor: `${mode.color}15` }}
                >
                  <mode.icon className="h-6 w-6" style={{ color: mode.color }} />
                </div>

                {/* Content */}
                <div className="flex-1">
                  <h3
                    className="mb-1 text-lg font-semibold"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {mode.title}
                  </h3>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {getModeSubtitle(mode)}
                  </p>
                </div>

                {/* Arrow */}
                {!isDisabled && (
                  <ChevronRight
                    className="h-5 w-5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                    style={{ color: 'var(--text-muted)' }}
                  />
                )}

                {/* Disabled overlay text */}
                {isDisabled && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/5">
                    <span className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
                      {mode.id === 'review_wrong' ? 'No wrong answers yet' : 'No bookmarks yet'}
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  trend,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  color: string;
  trend: string;
}) {
  return (
    <div
      className="rounded-xl border p-5 transition-all duration-200 hover:-translate-y-0.5"
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderColor: 'rgba(148, 163, 184, 0.1)',
      }}
    >
      <div className="mb-3 flex items-center justify-between">
        <span
          className="text-xs font-bold uppercase tracking-wider"
          style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}
        >
          {label}
        </span>
        <Icon className="h-5 w-5" style={{ color: color }} />
      </div>
      <div
        className="mb-1 text-3xl font-bold"
        style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-primary)' }}
      >
        {value}
      </div>
      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
        {trend}
      </span>
    </div>
  );
}
