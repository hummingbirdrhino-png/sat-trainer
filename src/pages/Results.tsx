import { useNavigate } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import { formatTime, getSkillColor } from '@/lib/utils';
import {
  Clock,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Home,
  RotateCcw,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from 'lucide-react';

export default function Results() {
  const navigate = useNavigate();
  const { currentSession, sessionSummaries } = useStore();

  if (!currentSession) {
    navigate('/app');
    return null;
  }

  const answers = Object.values(currentSession.answers);
  const correct = answers.filter((a) => a.isCorrect).length;
  const total = currentSession.questions.length;
  const score = Math.round((correct / total) * 100);
  const timeTaken = Math.floor((Date.now() - currentSession.startTime) / 1000);

  // Skill breakdown
  const skillStats: Record<string, { correct: number; total: number }> = {};
  currentSession.questions.forEach((q) => {
    const answer = currentSession.answers[q.id];
    if (!skillStats[q.skill]) skillStats[q.skill] = { correct: 0, total: 0 };
    skillStats[q.skill].total++;
    if (answer?.isCorrect) skillStats[q.skill].correct++;
  });

  // Predicted score
  const predictedScore = sessionSummaries.length > 0 ? sessionSummaries[0].predictedSatScore : 400;
  const previousScore = sessionSummaries.length > 1 ? sessionSummaries[1].predictedSatScore : predictedScore;
  const scoreChange = predictedScore - previousScore;

  // Distractor analysis
  const wrongBySkill: Record<string, number> = {};
  answers.filter((a) => !a.isCorrect).forEach((a) => {
    const q = currentSession.questions.find((qq) => qq.id === a.questionId);
    if (q) {
      wrongBySkill[q.skill] = (wrongBySkill[q.skill] || 0) + 1;
    }
  });
  const weakestSkill = Object.entries(wrongBySkill).sort((a, b) => b[1] - a[1])[0];

  const scoreColor = score >= 70 ? 'var(--accent-emerald)' : score >= 40 ? 'var(--accent-amber)' : 'var(--accent-rose)';

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Hero Score */}
      <div className="mb-10 text-center">
        <h1
          className="mb-4 text-3xl font-bold md:text-4xl"
          style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-primary)' }}
        >
          Session Complete
        </h1>

        <div
          className="mx-auto mb-4 flex h-32 w-32 items-center justify-center rounded-full border-4"
          style={{ borderColor: scoreColor }}
        >
          <span className="text-4xl font-bold" style={{ color: scoreColor, fontFamily: 'var(--font-heading)' }}>
            {score}%
          </span>
        </div>

        <p className="mb-2 text-lg" style={{ color: 'var(--text-secondary)' }}>
          {correct} correct, {total - correct} incorrect out of {total} questions
        </p>

        <div className="flex items-center justify-center gap-4 text-sm" style={{ color: 'var(--text-muted)' }}>
          <span className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            {formatTime(timeTaken)}
          </span>
          <span className="flex items-center gap-1">
            {scoreChange >= 0 ? (
              <TrendingUp className="h-4 w-4 text-emerald-400" />
            ) : (
              <TrendingDown className="h-4 w-4 text-rose-400" />
            )}
            Predicted SAT: {predictedScore}
            {scoreChange !== 0 && (
              <span className={scoreChange >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                ({scoreChange >= 0 ? '+' : ''}{scoreChange})
              </span>
            )}
          </span>
        </div>
      </div>

      {/* Skill Breakdown */}
      <div className="mb-8">
        <h2
          className="mb-4 text-xl font-bold"
          style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-primary)' }}
        >
          Skill Breakdown
        </h2>
        <div className="grid gap-3">
          {Object.entries(skillStats).map(([skill, stats]) => {
            const pct = Math.round((stats.correct / stats.total) * 100);
            return (
              <div
                key={skill}
                className="rounded-lg border p-4"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'rgba(148, 163, 184, 0.1)',
                }}
              >
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: getSkillColor(skill) }}
                    />
                    <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                      {skill}
                    </span>
                  </div>
                  <span className="text-sm font-mono" style={{ color: 'var(--text-secondary)' }}>
                    {stats.correct}/{stats.total} ({pct}%)
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full" style={{ backgroundColor: 'var(--bg-elevated)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-1000"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: pct >= 70 ? 'var(--accent-emerald)' : pct >= 40 ? 'var(--accent-amber)' : 'var(--accent-rose)',
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Distractor Analysis */}
      {weakestSkill && (
        <div
          className="mb-8 rounded-lg border-l-4 p-4"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--accent-amber)',
          }}
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" style={{ color: 'var(--accent-amber)' }} />
            <div>
              <h3 className="mb-1 font-semibold" style={{ color: 'var(--text-primary)' }}>
                Pattern Detected
              </h3>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                You struggled most with <strong style={{ color: getSkillColor(weakestSkill[0]) }}>{weakestSkill[0]}</strong> 
                ({weakestSkill[1]} incorrect). Focus on this skill in your next practice session.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Question Review */}
      <div className="mb-8">
        <h2
          className="mb-4 text-xl font-bold"
          style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-primary)' }}
        >
          Question Review
        </h2>
        <div className="space-y-2">
          {currentSession.questions.map((q, idx) => {
            const answer = currentSession.answers[q.id];
            const isCorrect = answer?.isCorrect;

            return (
              <div
                key={q.id}
                className="flex items-center justify-between rounded-lg border px-4 py-3"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: isCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(244, 63, 94, 0.2)',
                }}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-8 w-8 items-center justify-center rounded-full"
                    style={{
                      backgroundColor: isCorrect ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
                    }}
                  >
                    {isCorrect ? (
                      <CheckCircle className="h-4 w-4 text-emerald-400" />
                    ) : (
                      <XCircle className="h-4 w-4 text-rose-400" />
                    )}
                  </span>
                  <div>
                    <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      Question {idx + 1}
                    </span>
                    <span className="ml-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                      {q.skill} &middot; {q.difficulty}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-mono text-sm" style={{ color: isCorrect ? 'var(--accent-emerald)' : 'var(--accent-rose)' }}>
                    {answer?.selectedAnswer ?? '-'}
                  </span>
                  <span className="mx-1 text-xs" style={{ color: 'var(--text-muted)' }}>/</span>
                  <span className="font-mono text-sm" style={{ color: 'var(--accent-emerald)' }}>
                    {q.correct_answer}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          onClick={() => navigate('/app')}
          className="flex items-center justify-center gap-2 rounded-lg px-6 py-3 font-semibold transition-all hover:shadow-lg"
          style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid rgba(148, 163, 184, 0.2)' }}
        >
          <Home className="h-4 w-4" />
          Back to Dashboard
        </button>

        <button
          onClick={() => {
            // Restart same mode
            const { setCurrentSession } = useStore.getState();
            setCurrentSession({
              ...currentSession,
              id: crypto.randomUUID(),
              currentQuestionIndex: 0,
              answers: {},
              markedForReview: [],
              startTime: Date.now(),
              isComplete: false,
            });
            navigate('/practice');
          }}
          className="flex items-center justify-center gap-2 rounded-lg px-6 py-3 font-semibold transition-all hover:shadow-lg"
          style={{ backgroundColor: 'var(--accent-blue)', color: '#fff' }}
        >
          <RotateCcw className="h-4 w-4" />
          Practice Again
        </button>

        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center justify-center gap-2 rounded-lg px-6 py-3 font-semibold transition-all hover:shadow-lg"
          style={{ backgroundColor: 'var(--accent-amber)', color: '#000' }}
        >
          View Progress
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
