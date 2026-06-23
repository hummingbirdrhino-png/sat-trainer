import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import { cn, formatTime, calculateConfidenceWeight, updateMasteryScore, calculatePredictedScore, calculateNextReviewSession } from '@/lib/utils';
import { getChoiceDisplay } from '@/lib/questionSanitizer';
import type { Question, UserAnswer } from '@/types';
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Highlighter,
  Bookmark,
  BookmarkCheck,
  Send,
  ZoomIn,
  ZoomOut,
  Grid3X3,
  Clock,
  X,
  Sparkles,
  Calculator,
  ArrowLeft,
} from 'lucide-react';

export default function Practice() {
  const navigate = useNavigate();
  const {
    currentSession,
    settings,
    updateSessionAnswer,
    toggleMarkedForReview,
    addUserAnswer,
    userSkills,
    updateUserSkill,
    bookmarks,
    addBookmark,
    removeBookmark,
    addSessionSummary,
    updateDailyGoal,
    setCurrentSession,
  } = useStore();

  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [eliminatedChoices, setEliminatedChoices] = useState<string[]>([]);
  const [showRationale, setShowRationale] = useState(false);
  const [isAnswered, setIsAnswered] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [questionElapsedTime, setQuestionElapsedTime] = useState(0);
  const [questionStartTime, setQuestionStartTime] = useState(() => Date.now());
  const [showGrid, setShowGrid] = useState(false);
  const [maskAnswers, setMaskAnswers] = useState(false);
  const [eliminateMode, setEliminateMode] = useState(false);
  const [highlightMode, setHighlightMode] = useState(false);
  const [, setHighlights] = useState<Array<{ id: string; start: number; end: number; color: string }>>([]);
  const [fontSize, setFontSize] = useState(16);
  const [showAiExplanation, setShowAiExplanation] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [studentResponse, setStudentResponse] = useState('');
  const passageRef = useRef<HTMLDivElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);

  const formatNotesHtml = (text: string) => {
    const marker = 'While researching a topic, a student has taken the following notes:';
    if (!text.startsWith(marker)) return null;

    const notesText = text.slice(marker.length).trim();
    const notes = notesText
      .split(/(?<=[.!?])\s+(?=[A-Z0-9“])/)
      .map((note) => note.trim())
      .filter(Boolean);

    return `
      <div class="text-left">
        <p class="mb-4 font-medium text-slate-200">${marker}</p>
        <div class="rounded-xl border border-blue-400/30 bg-slate-900/40 p-4 shadow-lg sm:p-5">
          <div class="mb-3 inline-flex rounded-full border border-blue-400/25 bg-blue-500/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-blue-300">Notes</div>
          <ul class="ml-5 list-disc space-y-2 text-left marker:text-blue-400">
            ${notes.map((note) => `<li class="pl-1">${note}</li>`).join('')}
          </ul>
        </div>
      </div>
    `;
  };

  const formatPassageHtml = (text: string) => {
    const notesHtml = formatNotesHtml(text);
    if (notesHtml) return notesHtml;

    return text
      .replace(/\s*Text 1\s*/g, '<div class="mb-2 mt-1 text-xs font-bold uppercase tracking-[0.2em] text-blue-400">Text 1</div><p class="mb-5">')
      .replace(/\s*Text 2\s*/g, '</p><div class="mb-2 mt-5 text-xs font-bold uppercase tracking-[0.2em] text-emerald-400">Text 2</div><p>')
      .replace(/^(?!<div)/, '<p>')
      .replace(/(?<!>)$/, '</p>');
  };

  const renderFormattedText = (text: string, className?: string) => (
    <span
      className={className}
      dangerouslySetInnerHTML={{ __html: text }}
    />
  );

  const isMockMode = currentSession?.mode === 'mock';
  const isAdaptiveMode = currentSession?.mode === 'adaptive';
  const isRandomMode = currentSession?.mode === 'random';
  const isEndlessMode = isAdaptiveMode || isRandomMode;
  const isMathSession = currentSession?.section === 'math' || currentSession?.questions.some((q) => q.section === 'math');

  // Redirect if no session
  useEffect(() => {
    if (!currentSession) {
      navigate('/app');
    }
  }, [currentSession, navigate]);

  if (!currentSession) return null;

  const currentQuestion = currentSession.questions[currentSession.currentQuestionIndex];
  if (!currentQuestion) return null;

  const isMathQuestion = currentQuestion.section === 'math';
  const mathPageImages = currentQuestion.page_images?.length ? currentQuestion.page_images : currentQuestion.page_image ? [currentQuestion.page_image] : [];
  const isStudentProduced = currentQuestion.question_type === 'student_produced_response';
  const isMarked = currentSession.markedForReview.includes(currentQuestion.id);
  const isBookmarked = bookmarks.some((b) => b.questionId === currentQuestion.id);
  const answeredCount = Object.keys(currentSession.answers).length;

  const pickNextEndlessQuestion = (session = currentSession): Question => {
    const allQuestions = session.section === 'math' ? useStore.getState().mathQuestions : useStore.getState().questions;
    const availableQuestions = (useStore.getState().isPro ? allQuestions : allQuestions.slice(0, 25))
      .filter((q) => q.id !== currentQuestion.id);
    const recentlySeen = new Set(session.questions.slice(-10).map((q) => q.id));
    const freshQuestions = availableQuestions.filter((q) => !recentlySeen.has(q.id));
    const pool = freshQuestions.length ? freshQuestions : availableQuestions;

    if (isRandomMode) {
      return pool[Math.floor(Math.random() * pool.length)] ?? currentQuestion;
    }

    const skills = [...new Set(pool.map((q) => q.skill))];
    const skillWeights = skills.map((skill) => {
      const skillData = useStore.getState().userSkills[skill];
      const mastery = skillData?.masteryScore ?? 0;
      const answered = skillData?.questionsAnswered ?? 0;
      return { skill, weight: Math.max(0.15, (100 - mastery) / 100) * (answered < 3 ? 1.5 : 1) };
    });
    const totalWeight = skillWeights.reduce((sum, item) => sum + item.weight, 0);
    let rand = Math.random() * totalWeight;
    let chosenSkill = skillWeights[0]?.skill;

    for (const item of skillWeights) {
      rand -= item.weight;
      if (rand <= 0) {
        chosenSkill = item.skill;
        break;
      }
    }

    const skillPool = pool.filter((q) => q.skill === chosenSkill);
    const finalPool = skillPool.length ? skillPool : pool;
    return finalPool[Math.floor(Math.random() * finalPool.length)] ?? currentQuestion;
  };


  // Timer
  useEffect(() => {
    timerRef.current = setInterval(() => {
      const now = Date.now();
      setElapsedTime(Math.floor((now - currentSession.startTime) / 1000));
      setQuestionElapsedTime(Math.floor((now - questionStartTime) / 1000));
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [currentSession.startTime, questionStartTime]);

  // Reset state on question change
  useEffect(() => {
    setSelectedAnswer(null);
    setEliminatedChoices([]);
    setShowRationale(false);
    setIsAnswered(false);
    const now = Date.now();
    setQuestionStartTime(now);
    setQuestionElapsedTime(0);
    setShowAiExplanation(false);
    setMaskAnswers(false);
    setStudentResponse('');

    // Check if already answered
    const existingAnswer = currentSession.answers[currentQuestion.id];
    if (existingAnswer) {
      setSelectedAnswer(existingAnswer.selectedAnswer);
      setStudentResponse(existingAnswer.selectedAnswer);
      setEliminatedChoices(existingAnswer.eliminatedChoices);
      setIsAnswered(true);
      if (!isMockMode) setShowRationale(true);
    }
  }, [currentQuestion.id, currentSession.answers, isMockMode]);

  const handleSelectAnswer = (choice: string) => {
    if (isAnswered) return;
    if (eliminateMode) {
      toggleEliminate(choice);
      return;
    }
    setSelectedAnswer(choice);
  };

  const toggleEliminate = (choice: string) => {
    if (isAnswered) return;
    setEliminatedChoices((prev) =>
      prev.includes(choice) ? prev.filter((c) => c !== choice) : [...prev, choice]
    );
  };

  const normalizeStudentResponse = (value: string) => value.trim().toLowerCase().replace(/\s+/g, '');

  const isCorrectStudentResponse = (value: string, correctAnswer: string) => {
    const normalized = normalizeStudentResponse(value);
    return correctAnswer
      .split(/,|\band\b|\bor\b/i)
      .map((answer) => normalizeStudentResponse(answer.replace(/^either\s+/i, '')))
      .filter(Boolean)
      .includes(normalized);
  };

  const eliminateAllButSelected = () => {
    if (isAnswered || !selectedAnswer) return;
    setEliminatedChoices(['A', 'B', 'C', 'D'].filter((choice) => choice !== selectedAnswer));
  };

  const handleSubmit = () => {
    const submittedAnswer = currentQuestion.question_type === 'student_produced_response' ? studentResponse.trim() : selectedAnswer;
    if (!submittedAnswer || isAnswered) return;

    const timeSpent = Math.floor((Date.now() - questionStartTime) / 1000);
    const isCorrect = currentQuestion.question_type === 'student_produced_response'
      ? isCorrectStudentResponse(submittedAnswer, currentQuestion.correct_answer)
      : submittedAnswer === currentQuestion.correct_answer;
    const confidenceLevel = eliminatedChoices.length;

    const answer: UserAnswer = {
      questionId: currentQuestion.id,
      selectedAnswer: submittedAnswer,
      isCorrect,
      eliminatedChoices,
      confidenceLevel,
      timeSpentSeconds: timeSpent,
      timestamp: Date.now(),
      sessionId: currentSession.id,
    };

    updateSessionAnswer(answer);

    // Update mastery
    const currentMastery = userSkills[currentQuestion.skill]?.masteryScore ?? 0;
    const newMastery = updateMasteryScore(
      currentMastery,
      isCorrect,
      confidenceLevel,
      currentQuestion.difficulty,
      timeSpent
    );

    updateUserSkill(currentQuestion.skill, {
      masteryScore: newMastery,
      questionsAnswered: (userSkills[currentQuestion.skill]?.questionsAnswered ?? 0) + 1,
      questionsCorrect: (userSkills[currentQuestion.skill]?.questionsCorrect ?? 0) + (isCorrect ? 1 : 0),
      lastUpdated: Date.now(),
      sessionCounter: (userSkills[currentQuestion.skill]?.sessionCounter ?? 0) + 1,
      nextReviewSession: calculateNextReviewSession(
        (userSkills[currentQuestion.skill]?.sessionCounter ?? 0) + 1,
        newMastery
      ),
    });

    setIsAnswered(true);
    if (!isMockMode) {
      setShowRationale(true);
    }

    // Update daily goal
    const today = new Date().toISOString().split('T')[0];
    const existingGoal = useStore.getState().dailyGoals.find((g) => g.date === today);
    updateDailyGoal({
      date: today,
      target: settings.dailyGoalTarget,
      completed: (existingGoal?.completed ?? 0) + 1,
      streak: existingGoal?.streak ?? 0,
    });
  };

  const handleNext = () => {
    if (isEndlessMode) {
      const nextQuestion = pickNextEndlessQuestion();
      setCurrentSession({
        ...currentSession,
        questions: [...currentSession.questions, nextQuestion],
        currentQuestionIndex: currentSession.currentQuestionIndex + 1,
        questionCount: (currentSession.questionCount ?? currentSession.questions.length) + 1,
      });
      return;
    }

    if (currentSession.currentQuestionIndex < currentSession.questions.length - 1) {
      setCurrentSession({
        ...currentSession,
        currentQuestionIndex: currentSession.currentQuestionIndex + 1,
      });
    } else {
      handleFinish();
    }
  };

  const handlePrevious = () => {
    if (currentSession.currentQuestionIndex > 0) {
      setCurrentSession({
        ...currentSession,
        currentQuestionIndex: currentSession.currentQuestionIndex - 1,
      });
    }
  };

  const persistAnswers = () => {
    Object.values(currentSession.answers).forEach((answer) => {
      addUserAnswer(answer);
    });
  };

  const handleEndPractice = () => {
    persistAnswers();
    setCurrentSession(null);
    navigate('/app');
  };

  const handleFinish = () => {
    const answers = Object.values(currentSession.answers);
    const correct = answers.filter((a) => a.isCorrect).length;
    const total = currentSession.questions.length;
    const timeTaken = Math.floor((Date.now() - currentSession.startTime) / 1000);

    const summary = {
      id: currentSession.id,
      mode: currentSession.mode,
      score: Math.round((correct / total) * 100),
      totalQuestions: total,
      correctCount: correct,
      skillsPracticed: [...new Set(currentSession.questions.map((q) => q.skill))],
      timeTakenSeconds: timeTaken,
      predictedSatScore: calculatePredictedScore(
        correct,
        total,
        answers.length > 0 ? answers.reduce((sum, answer) => sum + answer.timeSpentSeconds, 0) / answers.length : undefined,
        currentSession.questions.length > 0
          ? currentSession.questions.reduce((sum, question) => sum + (useStore.getState().userSkills[question.skill]?.masteryScore ?? 0), 0) / currentSession.questions.length
          : undefined
      ),
      date: Date.now(),
    };

    // Save all answers
    persistAnswers();

    addSessionSummary(summary);
    setCurrentSession({ ...currentSession, isComplete: true });
    navigate('/results');
  };

  const handleBookmark = () => {
    if (isBookmarked) {
      removeBookmark(currentQuestion.id);
    } else {
      addBookmark({ questionId: currentQuestion.id, createdAt: Date.now() });
    }
  };

  const handleHighlight = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    const text = range.toString();
    if (!text || text.length < 2) return;

    const newHighlight = {
      id: crypto.randomUUID(),
      start: range.startOffset,
      end: range.endOffset,
      color: '#FDE047',
    };
    setHighlights((prev) => [...prev, newHighlight]);
    selection.removeAllRanges();
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isAnswered) {
        if (e.key === 'n' || e.key === 'Enter') {
          e.preventDefault();
          handleNext();
        }
        return;
      }

      const key = e.key.toUpperCase();
      const isConfidenceShortcut = e.shiftKey && (
        key === 'ENTER' ||
        e.code === 'Enter' ||
        e.code === 'NumpadEnter'
      );

      if (isConfidenceShortcut) {
        e.preventDefault();
        e.stopPropagation();
        eliminateAllButSelected();
      } else if (['A', 'B', 'C', 'D'].includes(key)) {
        e.preventDefault();
        if (e.shiftKey) {
          toggleEliminate(key);
        } else {
          handleSelectAnswer(key);
        }
      } else if (e.key === 'Enter' && selectedAnswer) {
        e.preventDefault();
        handleSubmit();
      } else if (e.key === 'm') {
        toggleMarkedForReview(currentQuestion.id);
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [selectedAnswer, isAnswered, currentQuestion, eliminatedChoices]);

  const getAnswerButtonStyle = (choice: string) => {
    const baseStyle = 'w-full min-h-14 rounded-lg border-2 px-4 py-4 text-left transition-all duration-200 flex items-start gap-3 sm:px-5';

    if (isAnswered) {
      if (choice === currentQuestion.correct_answer) {
        return cn(baseStyle, 'border-emerald-500 bg-emerald-500/10');
      }
      if (choice === selectedAnswer && !isAnswered) {
        return cn(baseStyle, 'border-rose-500 bg-rose-500/10');
      }
      if (choice === selectedAnswer && choice !== currentQuestion.correct_answer) {
        return cn(baseStyle, 'border-rose-500 bg-rose-500/10 opacity-70');
      }
    }

    if (eliminatedChoices.includes(choice)) {
      return cn(baseStyle, 'opacity-40 border-rose-500/30 line-through decoration-2');
    }

    if (selectedAnswer === choice) {
      return cn(baseStyle, 'border-blue-500 bg-blue-500/10 shadow-md shadow-blue-500/10');
    }

    return cn(baseStyle, 'border-slate-600/20 hover:border-blue-500/50');
  };

  const getAnswerTextStyle = (choice: string) => {
    if (isAnswered) {
      if (choice === currentQuestion.correct_answer) return 'text-emerald-400';
      if (choice === selectedAnswer && choice !== currentQuestion.correct_answer) return 'text-rose-400';
    }
    return 'text-[var(--text-primary)]';
  };

  return (
    <div className="flex h-[calc(100dvh-4rem)] min-h-0 flex-col pb-[env(safe-area-inset-bottom)]">
      {/* Practice Toolbar */}
      <div
        className="flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2 sm:px-4"
        style={{
          backgroundColor: 'var(--bg-glass)',
          borderColor: 'rgba(148, 163, 184, 0.1)',
        }}
      >
        <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-4">
          <button
            onClick={isEndlessMode ? handleEndPractice : () => navigate('/app')}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-sm transition-colors hover:bg-white/5"
            style={{ color: 'var(--text-secondary)' }}
          >
            <ArrowLeft className="h-4 w-4" />
            {isEndlessMode ? 'End Practice' : 'Exit'}
          </button>

          <div className="flex items-center gap-2 rounded-lg px-3 py-1" style={{ backgroundColor: 'var(--bg-elevated)' }}>
            <Clock className="h-4 w-4" style={{ color: 'var(--accent-amber)' }} />
            <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              {isMockMode ? 'Test' : 'Question'}
            </span>
            <span className="font-mono text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
              {formatTime(isMockMode ? elapsedTime : questionElapsedTime)}
            </span>
          </div>

          <div className="flex items-center gap-1 rounded-lg px-3 py-1" style={{ backgroundColor: 'var(--bg-elevated)' }}>
            <span className="font-mono text-sm" style={{ color: 'var(--text-muted)' }}>
              {isEndlessMode
                ? `${answeredCount} answered`
                : `${currentSession.currentQuestionIndex + 1} / ${currentSession.questions.length}`}
            </span>
          </div>
        </div>

        <div className="flex max-w-full items-center gap-1 overflow-x-auto sm:gap-2">
          {/* Tools */}
          {isMathSession && (
            <button
              onClick={() => setShowCalculator(!showCalculator)}
              className={cn(
                'min-h-10 min-w-10 rounded-lg p-2 transition-colors',
                showCalculator && 'bg-blue-500/20'
              )}
              style={{ color: showCalculator ? 'var(--accent-blue)' : 'var(--text-secondary)' }}
              title="Desmos Calculator"
            >
              <Calculator className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={() => setEliminateMode(!eliminateMode)}
            className={cn(
              'min-h-10 min-w-10 rounded-lg p-2 transition-colors',
              eliminateMode && 'bg-blue-500/20'
            )}
            style={{ color: eliminateMode ? 'var(--accent-blue)' : 'var(--text-secondary)' }}
            title="Elimination Mode (Shift+A-D)"
          >
            <X className="h-4 w-4" />
          </button>

          <button
            onClick={() => setHighlightMode(!highlightMode)}
            className={cn(
              'min-h-10 min-w-10 rounded-lg p-2 transition-colors',
              highlightMode && 'bg-yellow-500/20'
            )}
            style={{ color: highlightMode ? '#FDE047' : 'var(--text-secondary)' }}
            title="Highlight Mode"
          >
            <Highlighter className="h-4 w-4" />
          </button>

          <button
            onClick={() => setMaskAnswers(!maskAnswers)}
            className="min-h-10 min-w-10 rounded-lg p-2 transition-colors hover:bg-white/5"
            style={{ color: 'var(--text-secondary)' }}
            title="Mask Answers"
          >
            {maskAnswers ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </button>

          <button
            onClick={() => setFontSize((s) => Math.max(12, s - 1))}
            className="min-h-10 min-w-10 rounded-lg p-2 transition-colors hover:bg-white/5"
            style={{ color: 'var(--text-secondary)' }}
            title="Decrease Font"
          >
            <ZoomOut className="h-4 w-4" />
          </button>

          <button
            onClick={() => setFontSize((s) => Math.min(20, s + 1))}
            className="min-h-10 min-w-10 rounded-lg p-2 transition-colors hover:bg-white/5"
            style={{ color: 'var(--text-secondary)' }}
            title="Increase Font"
          >
            <ZoomIn className="h-4 w-4" />
          </button>

          <button
            onClick={() => setShowGrid(!showGrid)}
            className="min-h-10 min-w-10 rounded-lg p-2 transition-colors hover:bg-white/5"
            style={{ color: 'var(--text-secondary)' }}
            title="Question Grid"
          >
            <Grid3X3 className="h-4 w-4" />
          </button>

          <button
            onClick={() => toggleMarkedForReview(currentQuestion.id)}
            className={cn(
              'min-h-10 min-w-10 rounded-lg p-2 transition-colors',
              isMarked && 'bg-amber-500/20'
            )}
            style={{ color: isMarked ? 'var(--accent-amber)' : 'var(--text-secondary)' }}
            title="Mark for Review"
          >
            {isMarked ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row">
        {/* Passage Panel */}
        <div
          className="max-h-[42dvh] flex-1 overflow-y-auto border-b p-4 md:max-h-none md:border-b-0 md:border-r md:p-6"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'rgba(148, 163, 184, 0.1)',
          }}
        >
          {highlightMode && (
            <div className="mb-4 rounded-lg p-2 text-center text-xs" style={{ backgroundColor: 'rgba(253, 224, 71, 0.1)', color: '#FDE047' }}>
              Select text to highlight it
            </div>
          )}

          <div
            ref={passageRef}
            onMouseUp={highlightMode ? handleHighlight : undefined}
            className="leading-relaxed"
            style={{
              fontSize: `${fontSize}px`,
              fontFamily: 'var(--font-body)',
              color: 'var(--text-primary)',
              lineHeight: '1.7',
            }}
          >
            {isMathQuestion && mathPageImages.length > 0 ? (
              <div className="space-y-4">
                <div className="rounded-xl border p-3 text-sm" style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'rgba(96, 165, 250, 0.25)', color: 'var(--text-secondary)' }}>
                  Math questions are rendered from the official PDF page image so equations, graphs, and tables stay exact.
                </div>
                {mathPageImages.map((image, index) => (
                  <div key={image} className="overflow-hidden rounded-xl border bg-white p-2 shadow-lg" style={{ borderColor: 'rgba(148, 163, 184, 0.2)' }}>
                    <img
                      src={`${import.meta.env.BASE_URL}${image}`}
                      alt={`Math question page ${index + 1}`}
                      className="mx-auto w-full object-contain"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <>
                {currentQuestion.figure_image && (
                  <div className="mb-6 overflow-hidden rounded-xl border bg-white p-3 shadow-lg" style={{ borderColor: 'rgba(148, 163, 184, 0.2)' }}>
                    <img
                      src={`${import.meta.env.BASE_URL}${currentQuestion.figure_image}`}
                      alt={currentQuestion.figure_alt ?? 'Question figure'}
                      className="mx-auto max-h-[420px] w-full object-contain"
                    />
                  </div>
                )}
                {currentQuestion.passage ? (
                  <div dangerouslySetInnerHTML={{ __html: formatPassageHtml(currentQuestion.passage) }} />
                ) : (
                  <div className="italic opacity-50">No passage for this question.</div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Question Panel */}
        <div
          className="min-h-0 flex flex-1 flex-col overflow-y-auto p-4 md:p-6"
          style={{ backgroundColor: 'var(--bg-base)' }}
        >
          {/* Question Stem */}
          <div className="mb-6">
            <div className="mb-2 flex items-center gap-2">
              <span
                className="rounded px-2 py-0.5 text-xs font-semibold uppercase"
                style={{
                  backgroundColor: `${getSkillColor(currentQuestion.skill)}20`,
                  color: getSkillColor(currentQuestion.skill),
                }}
              >
                {currentQuestion.skill}
              </span>
              <span
                className="rounded px-2 py-0.5 text-xs font-semibold"
                style={{
                  backgroundColor: currentQuestion.difficulty === 'Hard' ? 'rgba(244, 63, 94, 0.15)' :
                    currentQuestion.difficulty === 'Medium' ? 'rgba(245, 158, 11, 0.15)' :
                    'rgba(16, 185, 129, 0.15)',
                  color: currentQuestion.difficulty === 'Hard' ? 'var(--accent-rose)' :
                    currentQuestion.difficulty === 'Medium' ? 'var(--accent-amber)' :
                    'var(--accent-emerald)',
                }}
              >
                {currentQuestion.difficulty}
              </span>
            </div>
            <p
              className="text-lg font-medium leading-relaxed"
              style={{
                fontFamily: 'var(--font-body)',
                color: 'var(--text-primary)',
                fontSize: `${fontSize}px`,
              }}
            >
              {renderFormattedText(currentQuestion.stem)}
            </p>
          </div>

          {/* Answer Choices */}
          {!maskAnswers && !isStudentProduced && (
            <div className="mb-6 space-y-3">
              {currentQuestion.choices.map((choice, index) => {
                const { letter, text } = getChoiceDisplay(choice, index);

                return (
                  <button
                    key={letter}
                    onClick={() => handleSelectAnswer(letter)}
                    className={cn(getAnswerButtonStyle(letter), 'group relative')}
                    disabled={isAnswered}
                    style={{ backgroundColor: 'var(--bg-surface)' }}
                  >
                    {/* Eliminate button */}
                    {!isAnswered && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleEliminate(letter);
                        }}
                        className="absolute right-3 top-1/2 min-h-9 min-w-9 -translate-y-1/2 rounded p-2 opacity-100 transition-opacity hover:bg-rose-500/20 sm:opacity-0 sm:group-hover:opacity-100"
                        style={{ color: 'var(--accent-rose)' }}
                        title="Eliminate"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}

                    {/* Check/X icons for answered state */}
                    {isAnswered && letter === currentQuestion.correct_answer && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-400">
                        Correct
                      </span>
                    )}
                    {isAnswered && letter === selectedAnswer && letter !== currentQuestion.correct_answer && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-rose-400">
                        Incorrect
                      </span>
                    )}

                    <span
                      className={cn(
                        'flex h-8 w-8 shrink-0 items-center justify-center rounded-md font-mono font-bold text-sm',
                        getAnswerTextStyle(letter)
                      )}
                      style={{
                        backgroundColor: selectedAnswer === letter ? 'var(--accent-blue)' :
                          isAnswered && letter === currentQuestion.correct_answer ? 'rgba(16, 185, 129, 0.2)' :
                          'rgba(148, 163, 184, 0.1)',
                        color: selectedAnswer === letter ? '#fff' :
                          isAnswered && letter === currentQuestion.correct_answer ? '#10B981' :
                          'var(--text-secondary)',
                      }}
                    >
                      {letter}
                    </span>
                    {renderFormattedText(text, cn('flex-1 text-sm leading-relaxed', getAnswerTextStyle(letter)))}
                  </button>
                );
              })}
            </div>
          )}

          {!maskAnswers && isStudentProduced && (
            <div className="mb-6 rounded-xl border p-4" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'rgba(148, 163, 184, 0.16)' }}>
              <label className="mb-2 block text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                Student-produced response
              </label>
              <input
                value={studentResponse}
                onChange={(event) => {
                  setStudentResponse(event.target.value);
                  setSelectedAnswer(event.target.value);
                }}
                disabled={isAnswered}
                placeholder="Enter your answer"
                className="w-full rounded-lg border px-4 py-3 font-mono text-lg outline-none transition-colors focus:border-blue-500 disabled:opacity-70"
                style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'rgba(148, 163, 184, 0.2)', color: 'var(--text-primary)' }}
              />
              {isAnswered && (
                <p className={cn('mt-3 text-sm font-semibold', isCorrectStudentResponse(selectedAnswer ?? '', currentQuestion.correct_answer) ? 'text-emerald-400' : 'text-rose-400')}>
                  Correct answer: {currentQuestion.correct_answer}
                </p>
              )}
            </div>
          )}

          {maskAnswers && (
            <div className="mb-6 rounded-lg border border-dashed p-8 text-center" style={{ borderColor: 'var(--text-muted)' }}>
              <EyeOff className="mx-auto mb-2 h-8 w-8" style={{ color: 'var(--text-muted)' }} />
              <p style={{ color: 'var(--text-secondary)' }}>Answers are masked</p>
              <button
                onClick={() => setMaskAnswers(false)}
                className="mt-2 text-sm underline"
                style={{ color: 'var(--accent-blue)' }}
              >
                Reveal
              </button>
            </div>
          )}

          {!isAnswered && selectedAnswer && (
            <button
              onClick={eliminateAllButSelected}
              className="mb-4 w-full rounded-lg border px-4 py-2 text-sm font-semibold transition-all hover:bg-white/5"
              style={{ borderColor: 'rgba(96, 165, 250, 0.35)', color: 'var(--accent-blue)' }}
              title="Shortcut: Shift+Enter"
            >
              100% confident — eliminate other choices
            </button>
          )}

          {/* Confidence Score */}
          {isAnswered && !isMockMode && (
            <div
              className="mb-4 rounded-lg p-3 text-sm"
              style={{ backgroundColor: 'var(--bg-elevated)' }}
            >
              <span style={{ color: 'var(--text-secondary)' }}>
                Confidence: {eliminatedChoices.length}/3 eliminated ({Math.round(calculateConfidenceWeight(eliminatedChoices.length) * 100)}% weight)
              </span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-auto space-y-3">
            {!isAnswered ? (
              <button
                onClick={handleSubmit}
                disabled={isStudentProduced ? !studentResponse.trim() : !selectedAnswer}
                className={cn(
                  'w-full rounded-lg py-3 font-semibold transition-all duration-200',
                  (isStudentProduced ? studentResponse.trim() : selectedAnswer)
                    ? 'hover:shadow-lg hover:shadow-blue-500/20'
                    : 'cursor-not-allowed opacity-40'
                )}
                style={{
                  backgroundColor: (isStudentProduced ? studentResponse.trim() : selectedAnswer) ? 'var(--accent-blue)' : 'var(--bg-elevated)',
                  color: (isStudentProduced ? studentResponse.trim() : selectedAnswer) ? '#fff' : 'var(--text-muted)',
                }}
              >
                <span className="flex items-center justify-center gap-2">
                  <Send className="h-4 w-4" />
                  Submit Answer
                </span>
              </button>
            ) : (
              <>
                {!isMockMode && (
                  <button
                    onClick={() => setShowAiExplanation(!showAiExplanation)}
                    className="w-full rounded-lg border-2 py-3 font-semibold transition-all duration-200 hover:bg-white/5"
                    style={{
                      borderColor: 'var(--accent-blue)',
                      color: 'var(--accent-blue)',
                    }}
                  >
                    <span className="flex items-center justify-center gap-2">
                      <Sparkles className="h-4 w-4" />
                      {showAiExplanation ? 'Hide' : 'Show'} AI Explanation
                    </span>
                  </button>
                )}

                <button
                  onClick={handleNext}
                  className="w-full rounded-lg py-3 font-semibold transition-all duration-200 hover:shadow-lg"
                  style={{
                    backgroundColor: 'var(--accent-amber)',
                    color: '#000',
                  }}
                >
                  <span className="flex items-center justify-center gap-2">
                    {currentSession.currentQuestionIndex < currentSession.questions.length - 1 ? (
                      <>
                        Next Question
                        <ChevronRight className="h-4 w-4" />
                      </>
                    ) : (
                      'Finish Session'
                    )}
                  </span>
                </button>
              </>
            )}

            <button
              onClick={handleBookmark}
              className={cn(
                'flex w-full items-center justify-center gap-2 rounded-lg py-2 text-sm transition-all',
                isBookmarked && 'text-amber-400'
              )}
              style={{ color: isBookmarked ? 'var(--accent-amber)' : 'var(--text-secondary)' }}
            >
              {isBookmarked ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
              {isBookmarked ? 'Bookmarked' : 'Bookmark Question'}
            </button>
          </div>

          {/* Rationale */}
          {showRationale && !isMockMode && (
            <div
              className="mt-6 rounded-lg border p-5"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                borderColor: 'rgba(148, 163, 184, 0.1)',
              }}
            >
              <h3 className="mb-3 font-semibold" style={{ color: 'var(--text-primary)' }}>
                Explanation
              </h3>
              <div
                className="text-sm leading-relaxed whitespace-pre-wrap"
                style={{ color: 'var(--text-secondary)' }}
              >
                {renderFormattedText(currentQuestion.rationale)}
              </div>
            </div>
          )}

          {/* AI Explanation Placeholder */}
          {showAiExplanation && !isMockMode && (
            <div
              className="mt-4 rounded-lg border p-5"
              style={{
                backgroundColor: 'rgba(59, 130, 246, 0.05)',
                borderColor: 'var(--accent-blue)',
              }}
            >
              <h3 className="mb-3 flex items-center gap-2 font-semibold" style={{ color: 'var(--accent-blue)' }}>
                <Sparkles className="h-4 w-4" />
                AI Explanation
              </h3>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                AI explanations are generated on-demand to help you understand why the correct answer is right
                and why other choices are wrong. This feature requires an internet connection.
              </p>
              <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                <strong>Correct answer ({currentQuestion.correct_answer}):</strong> The rationale from the official
                College Board materials states that this choice best answers the question because it aligns
                with the evidence presented in the passage.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Desmos Calculator Overlay */}
      {showCalculator && isMathSession && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm" onClick={() => setShowCalculator(false)}>
          <div className="flex h-[86vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl border" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'rgba(148, 163, 184, 0.2)' }} onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: 'rgba(148, 163, 184, 0.14)' }}>
              <div>
                <h3 className="font-bold" style={{ color: 'var(--text-primary)' }}>Desmos Graphing Calculator</h3>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>College Board version embedded from Desmos</p>
              </div>
              <button onClick={() => setShowCalculator(false)} className="rounded-lg p-2 hover:bg-white/5" style={{ color: 'var(--text-secondary)' }}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <iframe
              title="Desmos Graphing Calculator"
              src="https://www.desmos.com/testing/cb-sat-ap/graphing"
              className="h-full w-full flex-1 bg-white"
            />
          </div>
        </div>
      )}

      {/* Question Grid Overlay */}
      {showGrid && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setShowGrid(false)}
        >
          <div
            className="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-xl p-6"
            style={{ backgroundColor: 'var(--bg-surface)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-4 text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
              Question Navigator
            </h3>
            <div className="grid grid-cols-9 gap-2">
              {currentSession.questions.map((q, idx) => {
                const answer = currentSession.answers[q.id];
                const isCurrent = idx === currentSession.currentQuestionIndex;
                const isMarked = currentSession.markedForReview.includes(q.id);

                return (
                  <button
                    key={q.id}
                    onClick={() => {
                      setCurrentSession({ ...currentSession, currentQuestionIndex: idx });
                      setShowGrid(false);
                    }}
                    className={cn(
                      'relative flex h-10 items-center justify-center rounded-lg text-sm font-mono font-bold transition-all',
                      isCurrent && 'ring-2 ring-blue-500',
                      answer?.isCorrect && 'bg-emerald-500/20 text-emerald-400',
                      answer && !answer.isCorrect && 'bg-rose-500/20 text-rose-400',
                      !answer && 'bg-slate-700/30 text-slate-400 hover:bg-slate-700/50'
                    )}
                  >
                    {idx + 1}
                    {isMarked && (
                      <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-amber-400" />
                    )}
                  </button>
                );
              })}
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setShowGrid(false)}
                className="rounded-lg px-4 py-2 text-sm"
                style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation Bar */}
      <div
        className="flex items-center justify-between gap-2 border-t px-3 py-3 sm:px-6"
        style={{
          backgroundColor: 'var(--bg-glass)',
          borderColor: 'rgba(148, 163, 184, 0.1)',
        }}
      >
        <button
          onClick={handlePrevious}
          disabled={currentSession.currentQuestionIndex === 0}
          className="min-h-11 flex items-center gap-1 rounded-lg px-3 py-2 text-sm transition-colors disabled:opacity-30 hover:bg-white/5"
          style={{ color: 'var(--text-secondary)' }}
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </button>

        <div className="hidden items-center gap-2 sm:flex">
          {/* Mini progress dots */}
          {(isEndlessMode ? currentSession.questions.slice(-20) : currentSession.questions.slice(0, 20)).map((q, dotIdx) => {
            const idx = isEndlessMode ? Math.max(0, currentSession.questions.length - 20) + dotIdx : dotIdx;
            return (
            <div
              key={q.id}
              className={cn(
                'h-1.5 w-1.5 rounded-full transition-all',
                idx === currentSession.currentQuestionIndex && 'h-2 w-2 bg-blue-500',
                currentSession.answers[q.id]?.isCorrect && 'bg-emerald-500',
                currentSession.answers[q.id] && !currentSession.answers[q.id].isCorrect && 'bg-rose-500',
                !currentSession.answers[q.id] && idx !== currentSession.currentQuestionIndex && 'bg-slate-600'
              )}
            />
          )})}
          {currentSession.questions.length > 20 && (
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {isEndlessMode ? `${currentSession.questions.length} seen` : `+${currentSession.questions.length - 20}`}
            </span>
          )}
        </div>

        <button
          onClick={handleNext}
          disabled={!isAnswered}
          className="min-h-11 flex items-center gap-1 rounded-lg px-3 py-2 text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/5"
          style={{ color: 'var(--text-secondary)' }}
          title={!isAnswered ? 'Submit an answer before moving on' : undefined}
        >
          {isEndlessMode ? 'Next Question' : currentSession.currentQuestionIndex < currentSession.questions.length - 1 ? 'Next' : 'Finish'}
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function getSkillColor(skill: string): string {
  const colors: Record<string, string> = {
    Inferences: '#3B82F6',
    'Central Ideas and Details': '#10B981',
    'Command of Evidence': '#F59E0B',
    'Words in Context': '#8B5CF6',
    'Text Structure and Purpose': '#EC4899',
    'Cross-Text Connections': '#06B6D4',
    'Rhetorical Synthesis': '#F43F5E',
    Transitions: '#84CC16',
    Boundaries: '#6366F1',
    'Form, Structure, and Sense': '#14B8A6',
  };
  return colors[skill] ?? '#6B7280';
}
