import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import { getUniqueSkills, getSkillColor, cn, shuffleArray } from '@/lib/utils';
import { Check, ArrowRight, Sliders } from 'lucide-react';

export default function FocusedSetup() {
  const navigate = useNavigate();
  const { questions, userSkills, setCurrentSession, currentSession } = useStore();
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [questionCount, setQuestionCount] = useState(20);

  if (!currentSession || currentSession.mode !== 'focused') {
    navigate('/app');
    return null;
  }

  const skills = getUniqueSkills(questions);

  const toggleSkill = (skill: string) => {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  };

  const handleStart = () => {
    if (selectedSkills.length === 0) return;

    const filteredQuestions = questions.filter((q) => selectedSkills.includes(q.skill));
    const shuffled = shuffleArray(filteredQuestions);
    const selectedQuestions = shuffled.slice(0, Math.min(questionCount, shuffled.length));

    const newSession = {
      ...currentSession,
      questions: selectedQuestions,
      focusedSkills: selectedSkills,
    };

    setCurrentSession(newSession);
    navigate('/practice');
  };

  const questionCounts = [10, 20, 30, 40];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1
          className="mb-2 text-3xl font-bold md:text-4xl"
          style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-primary)' }}
        >
          Focused Practice Setup
        </h1>
        <p className="text-lg" style={{ color: 'var(--text-secondary)' }}>
          Choose 1 or more skills to practice
        </p>
      </div>

      {/* Skill Grid */}
      <div className="mb-8">
        <h2 className="mb-4 text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
          Select Skills
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {skills.map((skill) => {
            const isSelected = selectedSkills.includes(skill);
            const skillData = userSkills[skill];
            const mastery = skillData?.masteryScore ?? 0;
            const questionCount = questions.filter((q) => q.skill === skill).length;

            return (
              <button
                key={skill}
                onClick={() => toggleSkill(skill)}
                className={cn(
                  'relative rounded-xl border-2 p-4 text-left transition-all duration-200',
                  isSelected
                    ? 'border-blue-500 shadow-lg shadow-blue-500/10'
                    : 'border-slate-700/50 hover:border-slate-500'
                )}
                style={{ backgroundColor: 'var(--bg-surface)' }}
              >
                {/* Checkmark */}
                {isSelected && (
                  <div
                    className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full"
                    style={{ backgroundColor: 'var(--accent-blue)' }}
                  >
                    <Check className="h-3 w-3 text-white" />
                  </div>
                )}

                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-lg"
                    style={{ backgroundColor: `${getSkillColor(skill)}15` }}
                  >
                    <div
                      className="h-4 w-4 rounded-full"
                      style={{ backgroundColor: getSkillColor(skill) }}
                    />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                      {skill}
                    </h3>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {questionCount} questions
                    </p>
                  </div>
                </div>

                {/* Mastery bar */}
                <div className="mt-2">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      Mastery
                    </span>
                    <span className="text-xs font-mono" style={{ color: getSkillColor(skill) }}>
                      {Math.round(mastery)}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ backgroundColor: 'var(--bg-elevated)' }}>
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${mastery}%`,
                        backgroundColor: getSkillColor(skill),
                      }}
                    />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Question Count */}
      <div className="mb-8">
        <h2 className="mb-4 text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
          Number of Questions
        </h2>
        <div className="flex gap-2">
          {questionCounts.map((count) => (
            <button
              key={count}
              onClick={() => setQuestionCount(count)}
              className={cn(
                'rounded-lg border-2 px-5 py-2 text-sm font-medium transition-all',
                questionCount === count
                  ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                  : 'border-slate-700 text-slate-400 hover:border-slate-500'
              )}
            >
              {count}
            </button>
          ))}
          <button
            onClick={() => setQuestionCount(questions.length)}
            className={cn(
              'rounded-lg border-2 px-5 py-2 text-sm font-medium transition-all',
              questionCount === questions.length
                ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                : 'border-slate-700 text-slate-400 hover:border-slate-500'
            )}
          >
            All
          </button>
        </div>
      </div>

      {/* Start Button */}
      <div className="flex justify-center">
        <button
          onClick={handleStart}
          disabled={selectedSkills.length === 0}
          className={cn(
            'flex items-center gap-2 rounded-xl px-8 py-4 text-lg font-semibold transition-all',
            selectedSkills.length > 0
              ? 'bg-blue-500 text-white hover:bg-blue-600 hover:shadow-lg hover:shadow-blue-500/20'
              : 'cursor-not-allowed bg-slate-700 text-slate-500'
          )}
        >
          <Sliders className="h-5 w-5" />
          Start Focused Practice
          <ArrowRight className="h-5 w-5" />
        </button>
      </div>

      {selectedSkills.length === 0 && (
        <p className="mt-3 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
          Select at least one skill to continue
        </p>
      )}
    </div>
  );
}
