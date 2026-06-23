import { useNavigate } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import {
  selectAdaptiveQuestions,
  selectMockTestQuestions,
  selectWeakSpotQuestions,
  calculatePredictedScore,
  getUniqueSkills,
  cn,
} from '@/lib/utils';
import type { PracticeMode } from '@/types';
import {
  Brain,
  Target,
  Timer,
  RotateCcw,
  AlertTriangle,
  Bookmark,
  Zap,
  TrendingUp,
  BookOpen,
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
    id: 'focused',
    title: 'Focused Practice',
    subtitle: 'Choose specific skills to drill and master.',
    icon: Target,
    color: 'var(--accent-emerald)',
  },
  {
    id: 'mock',
    title: 'Mock Test',
    subtitle: '54 questions, 64 minutes. Simulates the real SAT.',
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
  const { questions, userSkills, bookmarks, userAnswers, sessionSummaries, displayName, isPro, setCurrentSession } = useStore();

  const overallMastery = Object.values(userSkills).reduce(
    (sum, s) => sum + (s?.masteryScore ?? 0),
    0
  ) / Math.max(Object.keys(userSkills).length, 1) || 0;

  const wrongAnswers = userAnswers.filter((a) => !a.isCorrect);
  const predictedScore = sessionSummaries.length > 0 
    ? sessionSummaries[0].predictedSatScore 
    : calculatePredictedScore(
        userAnswers.filter((a) => a.isCorrect).length,
        userAnswers.length
      );

  const dueForReview = Object.values(userSkills).filter(
    (s) => s.sessionCounter >= s.nextReviewSession
  ).length;

  const skills = getUniqueSkills(questions);

  const startMode = (mode: PracticeMode) => {
    if (!questions.length) return;

    const proOnlyModes: PracticeMode[] = ['mock', 'focused', 'review_wrong', 'weak_spots', 'bookmarked'];
    if (!isPro && proOnlyModes.includes(mode)) {
      navigate('/upgrade');
      return;
    }

    let selectedQuestions;
    switch (mode) {
      case 'adaptive':
        selectedQuestions = selectAdaptiveQuestions(isPro ? questions : questions.slice(0, 25), userSkills, 1);
        break;
      case 'mock':
        selectedQuestions = selectMockTestQuestions(questions);
        break;
      case 'review_wrong':
        selectedQuestions = questions.filter((q) =>
          wrongAnswers.some((wa) => wa.questionId === q.id)
        );
        if (selectedQuestions.length === 0) return;
        break;
      case 'weak_spots':
        selectedQuestions = selectWeakSpotQuestions(questions, userSkills, 30);
        break;
      case 'bookmarked':
        selectedQuestions = questions.filter((q) =>
          bookmarks.some((b) => b.questionId === q.id)
        );
        if (selectedQuestions.length === 0) return;
        break;
      default:
        selectedQuestions = questions.slice(0, 10);
    }

    const session = {
      id: crypto.randomUUID(),
      mode,
      currentQuestionIndex: 0,
      questions: selectedQuestions,
      answers: {},
      markedForReview: [],
      startTime: Date.now(),
      isComplete: false,
      questionCount: selectedQuestions.length,
      isEndless: mode === 'adaptive',
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
          Ready to sharpen your skills?
        </p>
      </div>

      {!isPro && (
        <div className="mb-8 rounded-2xl border p-5 text-center" style={{ backgroundColor: 'rgba(59, 130, 246, 0.08)', borderColor: 'rgba(96, 165, 250, 0.35)' }}>
          <p className="font-semibold text-blue-300">Free plan: starter access to 25 questions.</p>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>Unlock Pro for the full 596-question bank, mock tests, focused drills, bookmarks, and weak-spot review.</p>
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
          label="Predicted SAT Score"
          value={predictedScore.toString()}
          icon={TrendingUp}
          color="var(--accent-blue)"
          trend={sessionSummaries.length > 1 
            ? `${sessionSummaries[0].predictedSatScore - sessionSummaries[1].predictedSatScore > 0 ? '+' : ''}${sessionSummaries[0].predictedSatScore - sessionSummaries[1].predictedSatScore} pts`
            : 'Baseline'
          }
        />
        <StatCard
          label="Due for Review"
          value={dueForReview.toString()}
          icon={BookOpen}
          color="var(--accent-emerald)"
          trend={`${skills.length} skills tracked`}
        />
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
                    {mode.subtitle}
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
