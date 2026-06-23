import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import type { Question } from "@/types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// SAT Scoring utilities
export function calculatePredictedScore(
  correct: number,
  total: number,
  _difficultyWeights?: number[]
): number {
  if (total === 0) return 400;
  const baseScore = 200 + (correct / total) * 600;
  return Math.round(Math.min(800, Math.max(200, baseScore)));
}

export function calculateMasteryDelta(
  isCorrect: boolean,
  confidenceLevel: number,
  difficulty: string
): number {
  const confidenceWeight = 0.65 + 0.35 * (confidenceLevel / 3);
  const difficultyMultiplier =
    difficulty === 'Hard' ? 1.2 : difficulty === 'Medium' ? 1.0 : 0.8;
  const direction = isCorrect ? 1 : -1;
  return direction * confidenceWeight * difficultyMultiplier * 5;
}

export function updateMasteryScore(
  currentMastery: number,
  isCorrect: boolean,
  confidenceLevel: number,
  difficulty: string
): number {
  const delta = calculateMasteryDelta(isCorrect, confidenceLevel, difficulty);
  const alpha = 0.3;
  const result = isCorrect ? 1 : 0;
  const weightedResult = result * (1 + delta / 100);
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

// Question selection algorithms
export function selectAdaptiveQuestions(
  questions: Question[],
  userSkills: Record<string, { masteryScore: number; lastPracticed?: number }>,
  count: number = 10
): Question[] {
  const skills = getUniqueSkills(questions);
  const now = Date.now();

  // Weight skills by weakness and recency
  const skillWeights = skills.map((skill) => {
    const us = userSkills[skill];
    const mastery = us?.masteryScore ?? 0;
    const lastPracticed = us?.lastPracticed ?? 0;
    const daysSince = lastPracticed ? (now - lastPracticed) / (1000 * 60 * 60 * 24) : 30;
    const recencyFactor = Math.min(1 + daysSince * 0.1, 3);
    const weaknessWeight = (100 - mastery) / 100;
    return { skill, weight: weaknessWeight * recencyFactor };
  });

  const totalWeight = skillWeights.reduce((sum, sw) => sum + sw.weight, 0);
  const selected: Question[] = [];

  for (let i = 0; i < count; i++) {
    let rand = Math.random() * totalWeight;
    let chosenSkill = skillWeights[0].skill;
    for (const sw of skillWeights) {
      rand -= sw.weight;
      if (rand <= 0) {
        chosenSkill = sw.skill;
        break;
      }
    }

    const skillQuestions = questions.filter((q) => q.skill === chosenSkill);
    if (skillQuestions.length > 0) {
      const q = skillQuestions[Math.floor(Math.random() * skillQuestions.length)];
      if (!selected.find((sq) => sq.id === q.id)) {
        selected.push(q);
      } else {
        i--;
      }
    }
  }

  return selected;
}

export function selectWeakSpotQuestions(
  questions: Question[],
  userSkills: Record<string, { masteryScore: number }>,
  count: number = 30
): Question[] {
  const skills = getUniqueSkills(questions);
  const sortedSkills = skills
    .map((skill) => ({
      skill,
      mastery: userSkills[skill]?.masteryScore ?? 0,
    }))
    .sort((a, b) => a.mastery - b.mastery)
    .slice(0, 3);

  const selected: Question[] = [];
  const perSkill = Math.floor(count / sortedSkills.length);

  for (const { skill } of sortedSkills) {
    const skillQuestions = questions.filter((q) => q.skill === skill);
    const shuffled = [...skillQuestions].sort(() => Math.random() - 0.5);
    selected.push(...shuffled.slice(0, perSkill));
  }

  return selected.slice(0, count);
}

export function selectMockTestQuestions(questions: Question[]): Question[] {
  // Module 1: balanced mix of all difficulties
  const easy = questions.filter((q) => q.difficulty === 'Easy');
  const medium = questions.filter((q) => q.difficulty === 'Medium');
  const hard = questions.filter((q) => q.difficulty === 'Hard');

  const selected: Question[] = [];
  // 9 easy, 12 medium, 6 hard = 27
  for (let i = 0; i < 9; i++) {
    selected.push(easy[Math.floor(Math.random() * easy.length)]);
  }
  for (let i = 0; i < 12; i++) {
    selected.push(medium[Math.floor(Math.random() * medium.length)]);
  }
  for (let i = 0; i < 6; i++) {
    selected.push(hard[Math.floor(Math.random() * hard.length)]);
  }

  return shuffleArray(selected);
}

export function selectMockModule2Questions(
  questions: Question[],
  module1Correct: number
): Question[] {
  // Adaptive: more hard if did well, more easy if did poorly
  const isHarder = module1Correct >= 14; // ~50% threshold
  const easy = questions.filter((q) => q.difficulty === 'Easy');
  const medium = questions.filter((q) => q.difficulty === 'Medium');
  const hard = questions.filter((q) => q.difficulty === 'Hard');

  const selected: Question[] = [];
  if (isHarder) {
    // 6 easy, 9 medium, 12 hard
    for (let i = 0; i < 6; i++) selected.push(easy[Math.floor(Math.random() * easy.length)]);
    for (let i = 0; i < 9; i++) selected.push(medium[Math.floor(Math.random() * medium.length)]);
    for (let i = 0; i < 12; i++) selected.push(hard[Math.floor(Math.random() * hard.length)]);
  } else {
    // 12 easy, 9 medium, 6 hard
    for (let i = 0; i < 12; i++) selected.push(easy[Math.floor(Math.random() * easy.length)]);
    for (let i = 0; i < 9; i++) selected.push(medium[Math.floor(Math.random() * medium.length)]);
    for (let i = 0; i < 6; i++) selected.push(hard[Math.floor(Math.random() * hard.length)]);
  }

  return shuffleArray(selected);
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
  };
  return colors[skill] ?? '#6B7280';
}
