import { useMemo } from 'react';
import { useStore } from '@/store/useStore';
import { formatTime, formatDate, getSkillColor, calculatePredictedScore } from '@/lib/utils';
import {
  TrendingUp,
  Target,
  Clock,
  Flame,
  Calendar,
  BarChart3,
  Award,
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Doughnut, Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function Dashboard() {
  const {
    userSkills,
    sessionSummaries,
    userAnswers,
    dailyGoals,
  } = useStore();

  const normalizedSkills = Object.entries(userSkills).map(([key, skill]) => {
    const fallbackLabel = key.includes(':') ? key.split(':').slice(1).join(':') : key;
    return {
      ...skill,
      skill: skill?.skill ?? skill?.displaySkill ?? fallbackLabel,
      displaySkill: skill?.displaySkill ?? skill?.skill ?? fallbackLabel,
      section: skill?.section ?? (key.startsWith('math:') ? 'math' : 'reading_writing'),
      questionsAnswered: skill?.questionsAnswered ?? 0,
      questionsCorrect: skill?.questionsCorrect ?? 0,
      masteryScore: skill?.masteryScore ?? 0,
    };
  });

  const readingAnswers = userAnswers.filter((answer) => (answer.section ?? 'reading_writing') !== 'math');
  const mathAnswers = userAnswers.filter((answer) => answer.section === 'math');
  const sectionSkills = (section: 'reading_writing' | 'math') => normalizedSkills.filter((skill) => (skill.section ?? 'reading_writing') === section);
  const averageMastery = (skills: typeof normalizedSkills) =>
    skills.reduce((sum, skill) => sum + (skill?.masteryScore ?? 0), 0) / Math.max(skills.length, 1) || 0;
  const rwMastery = averageMastery(sectionSkills('reading_writing'));
  const mathMastery = averageMastery(sectionSkills('math'));
  const overallMastery = averageMastery(normalizedSkills);

  const totalAnswered = userAnswers.length;
  const avgTime = totalAnswered > 0
    ? Math.round(userAnswers.reduce((sum, a) => sum + a.timeSpentSeconds, 0) / totalAnswered)
    : 0;

  const sectionScore = (answers: typeof userAnswers, mastery: number) => {
    if (answers.length === 0) return null;
    const correct = answers.filter((answer) => answer.isCorrect).length;
    const avg = answers.length > 0 ? answers.reduce((sum, answer) => sum + answer.timeSpentSeconds, 0) / answers.length : undefined;
    return calculatePredictedScore(correct, answers.length, avg, mastery);
  };
  const rwPredictedScore = sectionScore(readingAnswers, rwMastery);
  const mathPredictedScore = sectionScore(mathAnswers, mathMastery);
  const predictedScore = rwPredictedScore !== null && mathPredictedScore !== null ? rwPredictedScore + mathPredictedScore : null;

  const streak = dailyGoals.length > 0
    ? [...dailyGoals].sort((a, b) => b.date.localeCompare(a.date))[0]?.streak ?? 0
    : 0;

  const getSessionCorrectCount = (session: { correctCount?: number; correctAnswers?: number }) =>
    session.correctCount ?? session.correctAnswers ?? 0;
  const getSessionSkills = (session: { skillsPracticed?: string[] }) =>
    Array.isArray(session.skillsPracticed) ? session.skillsPracticed : [];

  // Chart data - section score trend
  const scoreChartData = useMemo(() => {
    const sorted = [...sessionSummaries].sort((a, b) => a.date - b.date).slice(-14);
    return {
      labels: sorted.map((s) => formatDate(s.date)),
      datasets: [
        {
          label: 'Reading & Writing',
          data: sorted.map((s) => ((s.section ?? 'reading_writing') === 'math' ? null : s.predictedSatScore)),
          borderColor: '#60A5FA',
          backgroundColor: 'rgba(96, 165, 250, 0.12)',
          fill: false,
          tension: 0.35,
          pointRadius: 4,
          pointBackgroundColor: '#60A5FA',
          spanGaps: true,
        },
        {
          label: 'Math',
          data: sorted.map((s) => (s.section === 'math' ? s.predictedSatScore : null)),
          borderColor: '#A78BFA',
          backgroundColor: 'rgba(167, 139, 250, 0.12)',
          fill: false,
          tension: 0.35,
          pointRadius: 4,
          pointBackgroundColor: '#A78BFA',
          spanGaps: true,
        },
      ],
    };
  }, [sessionSummaries]);

  // Mastery doughnut
  const masteryChartData = useMemo(() => {
    const skills = normalizedSkills;
    if (skills.length === 0) {
      return {
        labels: ['No Data'],
        datasets: [{ data: [1], backgroundColor: ['rgba(148, 163, 184, 0.2)'] }],
      };
    }
    return {
      labels: skills.map((s) => s.displaySkill ?? s.skill),
      datasets: [{
        data: skills.map((s) => s.masteryScore),
        backgroundColor: skills.map((s) => getSkillColor(s.displaySkill ?? s.skill)),
        borderWidth: 0,
      }],
    };
  }, [normalizedSkills]);

  // Skill accuracy bar chart
  const accuracyChartData = useMemo(() => {
    const skills = normalizedSkills;
    return {
      labels: skills.map((s) => { const label = s.displaySkill ?? s.skill; return label.slice(0, 15) + (label.length > 15 ? '...' : ''); }),
      datasets: [{
        label: 'Accuracy %',
        data: skills.map((s) =>
          s.questionsAnswered > 0 ? Math.round((s.questionsCorrect / s.questionsAnswered) * 100) : 0
        ),
        backgroundColor: skills.map((s) => `${getSkillColor(s.displaySkill ?? s.skill)}80`),
        borderColor: skills.map((s) => getSkillColor(s.displaySkill ?? s.skill)),
        borderWidth: 1,
      }],
    };
  }, [normalizedSkills]);

  // Heatmap data (last 90 days)
  const heatmapData = useMemo(() => {
    const days: Array<{ date: string; count: number; intensity: number }> = [];
    const today = new Date();
    for (let i = 89; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const goal = dailyGoals.find((g) => g.date === dateStr);
      const count = goal?.completed ?? 0;
      days.push({
        date: dateStr,
        count,
        intensity: count > 0 ? Math.min(count / 20, 1) : 0,
      });
    }
    return days;
  }, [dailyGoals]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { color: '#94A3B8', font: { family: 'Inter' } },
      },
    },
    scales: {
      x: {
        ticks: { color: '#475569', font: { family: 'Inter', size: 11 } },
        grid: { color: 'rgba(148, 163, 184, 0.1)' },
      },
      y: {
        ticks: { color: '#475569', font: { family: 'Inter', size: 11 } },
        grid: { color: 'rgba(148, 163, 184, 0.1)' },
        min: 200,
        max: 800,
      },
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
        labels: { color: '#94A3B8', font: { family: 'Inter', size: 11 }, boxWidth: 12 },
      },
    },
    cutout: '65%',
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1
          className="text-3xl font-bold md:text-4xl"
          style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-primary)' }}
        >
          Your Progress
        </h1>
        <p className="mt-1" style={{ color: 'var(--text-secondary)' }}>
          Track your SAT readiness over time
        </p>
      </div>

      {/* Stats Cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          label="Predicted Total Score"
          value={predictedScore?.toString() ?? '—'}
          icon={TrendingUp}
          color="var(--accent-blue)"
          trend={predictedScore !== null ? 'Combined RW + Math estimate' : 'Answer both sections to unlock total'}
        />
        <StatCard
          label="RW Score"
          value={rwPredictedScore?.toString() ?? '—'}
          icon={TrendingUp}
          color="#60A5FA"
          trend={`${readingAnswers.length} answered`}
        />
        <StatCard
          label="Math Score"
          value={mathPredictedScore?.toString() ?? '—'}
          icon={TrendingUp}
          color="#A78BFA"
          trend={`${mathAnswers.length} answered`}
        />
        <StatCard
          label="Overall Mastery"
          value={`${Math.round(overallMastery)}%`}
          icon={Target}
          color="var(--accent-amber)"
          trend={`${normalizedSkills.length} skills tracked`}
        />
        <StatCard
          label="Avg Time / Question"
          value={`${avgTime}s`}
          icon={Clock}
          color="var(--accent-emerald)"
          trend={avgTime <= 71 ? 'On pace!' : `${avgTime - 71}s over target`}
        />
        <StatCard
          label="Current Streak"
          value={`${streak} days`}
          icon={Flame}
          color="#F97316"
          trend={streak > 0 ? 'Keep it up!' : 'Start today'}
        />
      </div>

      {/* Charts Row */}
      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Score Trend */}
        <div
          className="col-span-2 rounded-xl border p-5"
          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'rgba(148, 163, 184, 0.1)', height: 320 }}
        >
          <h3 className="mb-4 font-semibold" style={{ color: 'var(--text-primary)' }}>
            Section Score Trend
          </h3>
          <div className="h-[250px]">
            {sessionSummaries.length > 0 ? (
              <Line data={scoreChartData} options={chartOptions} />
            ) : (
              <div className="flex h-full items-center justify-center" style={{ color: 'var(--text-muted)' }}>
                Complete a practice session to see your score trend
              </div>
            )}
          </div>
        </div>

        {/* Mastery Doughnut */}
        <div
          className="rounded-xl border p-5"
          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'rgba(148, 163, 184, 0.1)', height: 320 }}
        >
          <h3 className="mb-4 font-semibold" style={{ color: 'var(--text-primary)' }}>
            Skill Mastery
          </h3>
          <div className="h-[250px]">
            {normalizedSkills.length > 0 ? (
              <Doughnut data={masteryChartData} options={doughnutOptions} />
            ) : (
              <div className="flex h-full items-center justify-center" style={{ color: 'var(--text-muted)' }}>
                No skill data yet
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Streak Heatmap */}
        <div
          className="rounded-xl border p-5"
          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'rgba(148, 163, 184, 0.1)' }}
        >
          <h3 className="mb-4 flex items-center gap-2 font-semibold" style={{ color: 'var(--text-primary)' }}>
            <Calendar className="h-4 w-4" />
            Activity Heatmap
          </h3>
          <div className="grid grid-cols-7 gap-1">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
              <div key={d} className="text-center text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
                {d}
              </div>
            ))}
            {heatmapData.map((day) => (
              <div
                key={day.date}
                className="aspect-square rounded-sm"
                style={{
                  backgroundColor: day.count > 0
                    ? `rgba(245, 158, 11, ${0.2 + day.intensity * 0.8})`
                    : 'var(--bg-elevated)',
                }}
                title={`${day.date}: ${day.count} questions`}
              />
            ))}
          </div>
        </div>

        {/* Skill Accuracy */}
        <div
          className="rounded-xl border p-5"
          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'rgba(148, 163, 184, 0.1)', height: 280 }}
        >
          <h3 className="mb-4 font-semibold" style={{ color: 'var(--text-primary)' }}>
            Accuracy by Skill
          </h3>
          <div className="h-[200px]">
            {normalizedSkills.length > 0 ? (
              <Bar
                data={accuracyChartData}
                options={{
                  ...chartOptions,
                  scales: {
                    ...chartOptions.scales,
                    y: { ...chartOptions.scales?.y, min: 0, max: 100 },
                  },
                }}
              />
            ) : (
              <div className="flex h-full items-center justify-center" style={{ color: 'var(--text-muted)' }}>
                Practice to see accuracy data
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Session History */}
      <div
        className="rounded-xl border"
        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'rgba(148, 163, 184, 0.1)' }}
      >
        <div className="border-b px-5 py-4" style={{ borderColor: 'rgba(148, 163, 184, 0.1)' }}>
          <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
            Session History
          </h3>
        </div>
        <div className="max-h-[400px] overflow-y-auto">
          {sessionSummaries.length === 0 ? (
            <div className="px-5 py-8 text-center" style={{ color: 'var(--text-muted)' }}>
              <BarChart3 className="mx-auto mb-2 h-8 w-8 opacity-50" />
              <p>No sessions yet. Start practicing!</p>
            </div>
          ) : (
            sessionSummaries.slice(0, 20).map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between border-b px-5 py-4 transition-colors hover:bg-white/5"
                style={{ borderColor: 'rgba(148, 163, 184, 0.05)' }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-lg"
                    style={{
                      backgroundColor: session.score >= 70
                        ? 'rgba(16, 185, 129, 0.1)'
                        : session.score >= 40
                        ? 'rgba(245, 158, 11, 0.1)'
                        : 'rgba(244, 63, 94, 0.1)',
                    }}
                  >
                    <Award
                      className="h-5 w-5"
                      style={{
                        color: session.score >= 70
                          ? 'var(--accent-emerald)'
                          : session.score >= 40
                          ? 'var(--accent-amber)'
                          : 'var(--accent-rose)',
                      }}
                    />
                  </div>
                  <div>
                    <p className="text-sm font-medium capitalize" style={{ color: 'var(--text-primary)' }}>
                      {session.mode.replace('_', ' ')} Mode
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {formatDate(session.date)} &middot; {formatTime(session.timeTakenSeconds)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="hidden sm:flex gap-1">
                    {getSessionSkills(session).slice(0, 3).map((skill) => (
                      <span
                        key={skill}
                        className="rounded px-2 py-0.5 text-[10px] font-semibold"
                        style={{
                          backgroundColor: `${getSkillColor(skill)}15`,
                          color: getSkillColor(skill),
                        }}
                      >
                        {skill.slice(0, 12)}
                      </span>
                    ))}
                  </div>
                  <div className="text-right">
                    <span
                      className="font-mono font-bold"
                      style={{
                        color: session.score >= 70
                          ? 'var(--accent-emerald)'
                          : session.score >= 40
                          ? 'var(--accent-amber)'
                          : 'var(--accent-rose)',
                      }}
                    >
                      {session.score}%
                    </span>
                    <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                      {getSessionCorrectCount(session)}/{session.totalQuestions}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
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
      className="rounded-xl border p-5 transition-all hover:-translate-y-0.5"
      style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'rgba(148, 163, 184, 0.1)' }}
    >
      <div className="mb-3 flex items-center justify-between">
        <span
          className="text-xs font-bold uppercase tracking-wider"
          style={{ color: 'var(--text-muted)' }}
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
