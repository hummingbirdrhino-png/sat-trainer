import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import type { Question } from "@/types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// SAT Scoring utilities
export const TARGET_SECONDS_PER_QUESTION = 71;

export function calculateTimeMultiplier(timeSpentSeconds?: number): number {
  if (!timeSpentSeconds || timeSpentSeconds <= 0) return 1;

  // Reward efficient correct work a little, but penalize slow work more clearly.
  if (timeSpentSeconds <= TARGET_SECONDS_PER_QUESTION * 0.75) return 1.08;
  if (timeSpentSeconds <= TARGET_SECONDS_PER_QUESTION) return 1.0;
  if (timeSpentSeconds <= TARGET_SECONDS_PER_QUESTION * 1.25) return 0.9;
  if (timeSpentSeconds <= TARGET_SECONDS_PER_QUESTION * 1.5) return 0.78;
  return 0.65;
}

export function calculatePredictedScore(
  correct: number,
  total: number,
  averageTimeSeconds?: number,
  averageMastery?: number,
  _difficultyWeights?: number[]
): number {
  if (total === 0) return 400;

  const accuracy = correct / total;
  const timeMultiplier = calculateTimeMultiplier(averageTimeSeconds);
  const timedAccuracy = Math.min(1, accuracy * timeMultiplier);
  const performanceScore = 200 + timedAccuracy * 600;
  const masteryScore = averageMastery === undefined ? performanceScore : 200 + (averageMastery / 100) * 600;

  // Mastery is the anti-guessing signal: confidence, consistency, skill history,
  // and timing all flow into mastery. Blend it with raw performance so a lucky
  // streak helps, but does not dominate the prediction.
  const blendedScore = masteryScore * 0.65 + performanceScore * 0.35;
  return Math.round(Math.min(800, Math.max(200, blendedScore)) / 10) * 10;
}

export function calculateMasteryDelta(
  isCorrect: boolean,
  confidenceLevel: number,
  difficulty: string,
  timeSpentSeconds?: number
): number {
  const confidenceWeight = 0.65 + 0.35 * (confidenceLevel / 3);
  const difficultyMultiplier =
    difficulty === 'Hard' ? 1.2 : difficulty === 'Medium' ? 1.0 : 0.8;
  const timeMultiplier = calculateTimeMultiplier(timeSpentSeconds);
  const direction = isCorrect ? 1 : -1;

  // Slow correct answers still count, but less; slow wrong answers hurt more.
  const speedAdjustedDirection = isCorrect ? timeMultiplier : 1 / timeMultiplier;
  return direction * confidenceWeight * difficultyMultiplier * speedAdjustedDirection * 5;
}

export function updateMasteryScore(
  currentMastery: number,
  isCorrect: boolean,
  confidenceLevel: number,
  difficulty: string,
  timeSpentSeconds?: number
): number {
  const delta = calculateMasteryDelta(isCorrect, confidenceLevel, difficulty, timeSpentSeconds);
  const alpha = 0.3;
  const result = isCorrect ? 1 : 0;
  const weightedResult = result * (1 + delta / 100) * (isCorrect ? calculateTimeMultiplier(timeSpentSeconds) : 1);
  const newMastery =
    currentMastery * (1 - alpha) + Math.min(100, Math.max(0, weightedResult * 100)) * alpha;
  return Math.round(Math.min(100, Math.max(0, newMastery)));
}

// Spaced repetition
export function calculateNextReviewSession(
  currentSession: number,
  masteryScore: number
): number {
  const sessionsUntilReview = 3 + Math.floor((100 - masteryScore) / 20);
  return currentSession + sessionsUntilReview;
}

// Confidence scoring
export function calculateConfidenceWeight(eliminatedCount: number): number {
  const weights: Record<number, number> = {
    0: 0.65,
    1: 0.75,
    2: 0.9,
    3: 1.0,
  };
  return weights[eliminatedCount] ?? 0.65;
}

export function getSkillKey(question: Question): string {
  return `${question.section ?? 'reading_writing'}:${question.skill}`;
}

export function getSkillDisplayName(skillKey: string): string {
  return skillKey.includes(':') ? skillKey.split(':').slice(1).join(':') : skillKey;
}

export function getSectionLabel(section?: string): string {
  return section === 'math' ? 'Math' : 'Reading & Writing';
}

// Question selection algorithms
function sampleQuestions(pool: Question[], count: number): Question[] {
  return shuffleArray(pool).slice(0, Math.min(count, pool.length));
}

export function selectAdaptiveQuestions(
  questions: Question[],
  userSkills: Record<string, { masteryScore: number; lastPracticed?: number }>,
  count: number = 10
): Question[] {
  if (questions.length <= count) return shuffleArray(questions);

  const skills = getUniqueSkills(questions);
  const now = Date.now();
  const selected: Question[] = [];
  const selectedIds = new Set<string>();

  // Weight skills by weakness and recency. Keep a nonzero floor so mastered skills can still appear.
  const skillWeights = skills.map((skill) => {
    const sampleQuestion = questions.find((q) => q.skill === skill);
    const us = sampleQuestion ? userSkills[getSkillKey(sampleQuestion)] : userSkills[skill];
    const mastery = us?.masteryScore ?? 0;
    const lastPracticed = us?.lastPracticed ?? 0;
    const daysSince = lastPracticed ? (now - lastPracticed) / (1000 * 60 * 60 * 24) : 30;
    const recencyFactor = Math.min(1 + daysSince * 0.1, 3);
    const weaknessWeight = Math.max(0.1, (100 - mastery) / 100);
    return { skill, weight: weaknessWeight * recencyFactor };
  });

  const pickWeightedSkill = () => {
    const availableWeights = skillWeights.filter((sw) =>
      questions.some((q) => q.skill === sw.skill && !selectedIds.has(q.id))
    );
    const totalWeight = availableWeights.reduce((sum, sw) => sum + sw.weight, 0);
    let rand = Math.random() * totalWeight;

    for (const sw of availableWeights) {
      rand -= sw.weight;
      if (rand <= 0) return sw.skill;
    }

    return availableWeights[0]?.skill ?? skills[0];
  };

  while (selected.length < count && selected.length < questions.length) {
    const chosenSkill = pickWeightedSkill();
    const skillQuestions = questions.filter((q) => q.skill === chosenSkill && !selectedIds.has(q.id));
    const pool = skillQuestions.length ? skillQuestions : questions.filter((q) => !selectedIds.has(q.id));
    const q = pool[Math.floor(Math.random() * pool.length)];
    selected.push(q);
    selectedIds.add(q.id);
  }

  return selected;
}

export function selectWeakSpotQuestions(
  questions: Question[],
  userSkills: Record<string, { masteryScore: number }>,
  count: number = 30
): Question[] {
  if (questions.length <= count) return shuffleArray(questions);

  const skills = getUniqueSkills(questions);
  const sortedSkills = skills
    .map((skill) => ({
      skill,
      mastery: userSkills[getSkillKey(questions.find((q) => q.skill === skill) ?? questions[0])]?.masteryScore ?? userSkills[skill]?.masteryScore ?? 0,
    }))
    .sort((a, b) => a.mastery - b.mastery)
    .slice(0, 3);

  const selected: Question[] = [];
  const selectedIds = new Set<string>();
  const perSkill = Math.max(1, Math.ceil(count / Math.max(sortedSkills.length, 1)));

  for (const { skill } of sortedSkills) {
    for (const q of sampleQuestions(questions.filter((item) => item.skill === skill), perSkill)) {
      if (!selectedIds.has(q.id) && selected.length < count) {
        selected.push(q);
        selectedIds.add(q.id);
      }
    }
  }

  for (const q of shuffleArray(questions)) {
    if (selected.length >= count) break;
    if (!selectedIds.has(q.id)) selected.push(q);
  }

  return selected;
}

export function selectMockTestQuestions(questions: Question[]): Question[] {
  const easy = sampleQuestions(questions.filter((q) => q.difficulty === 'Easy'), 9);
  const medium = sampleQuestions(questions.filter((q) => q.difficulty === 'Medium'), 12);
  const hard = sampleQuestions(questions.filter((q) => q.difficulty === 'Hard'), 6);
  const selectedIds = new Set([...easy, ...medium, ...hard].map((q) => q.id));
  const fill = shuffleArray(questions.filter((q) => !selectedIds.has(q.id))).slice(0, Math.max(0, 27 - selectedIds.size));

  return shuffleArray([...easy, ...medium, ...hard, ...fill]);
}

export function selectMockModule2Questions(
  questions: Question[],
  module1Correct: number
): Question[] {
  const isHarder = module1Correct >= 14;
  const easyTarget = isHarder ? 6 : 12;
  const mediumTarget = 9;
  const hardTarget = isHarder ? 12 : 6;
  const easy = sampleQuestions(questions.filter((q) => q.difficulty === 'Easy'), easyTarget);
  const medium = sampleQuestions(questions.filter((q) => q.difficulty === 'Medium'), mediumTarget);
  const hard = sampleQuestions(questions.filter((q) => q.difficulty === 'Hard'), hardTarget);
  const selectedIds = new Set([...easy, ...medium, ...hard].map((q) => q.id));
  const fill = shuffleArray(questions.filter((q) => !selectedIds.has(q.id))).slice(0, Math.max(0, 27 - selectedIds.size));

  return shuffleArray([...easy, ...medium, ...hard, ...fill]);
}

// Helper functions
export function getUniqueSkills(questions: Question[]): string[] {
  return [...new Set(questions.map((q) => q.skill))];
}

export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function getThemeColors(theme: string) {
  const themes: Record<string, { bg: string; surface: string; text: string; border: string }> = {
    dark: { bg: '#020617', surface: '#0F172A', text: '#F1F5F9', border: '#334155' },
    light: { bg: '#F8FAFC', surface: '#FFFFFF', text: '#0F172A', border: '#E2E8F0' },
    sepia: { bg: '#F5E6D3', surface: '#FAF0E6', text: '#433422', border: '#D4C4A8' },
    'high-contrast': { bg: '#000000', surface: '#000000', text: '#FFFFFF', border: '#FFFFFF' },
    'pure-black': { bg: '#000000', surface: '#0A0A0A', text: '#E5E5E5', border: '#262626' },
  };
  return themes[theme] ?? themes.dark;
}

export function getFontSizeClass(size: string): string {
  const sizes: Record<string, string> = {
    small: 'text-sm',
    medium: 'text-base',
    large: 'text-lg',
  };
  return sizes[size] ?? 'text-base';
}

export function getSkillColor(skill: string): string {
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
    'Linear equations in one variable': '#3B82F6',
    'Linear equations in two variables': '#2563EB',
    'Linear functions': '#0EA5E9',
    'Systems of two linear equations in two variables': '#06B6D4',
    'Linear inequalities in one or two variables': '#14B8A6',
    'Nonlinear functions': '#8B5CF6',
    'Nonlinear equations in one variable and systems of equations in two variables': '#A855F7',
    'Equivalent expressions': '#D946EF',
    'Ratios, rates, proportional relationships, and units': '#F59E0B',
    'Percentages': '#F97316',
    'One-variable data: Distributions and measures of center and spread': '#84CC16',
    'Two-variable data: Models and scatterplots': '#22C55E',
    'Probability and conditional probability': '#10B981',
    'Inference from sample statistics and margin of error': '#EAB308',
    'Evaluating statistical claims: Observational studies and experiments': '#F43F5E',
    'Area and volume': '#EC4899',
    'Lines, angles, and triangles': '#EF4444',
    'Right triangles and trigonometry': '#F97316',
    'Circles': '#6366F1',
  };
  return colors[skill] ?? '#6B7280';
}
