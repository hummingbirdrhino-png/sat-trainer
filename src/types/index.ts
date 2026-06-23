export type QuestionSection = 'reading_writing' | 'math';
export type QuestionType = 'multiple_choice' | 'student_produced_response';

export interface MathQuestionPart {
  type: 'text' | 'image';
  text?: string;
  src?: string;
  width?: number;
  height?: number;
  block?: boolean;
}

export interface Question {
  id: string;
  source_id?: string;
  section?: QuestionSection;
  assessment?: string;
  test?: string;
  domain: string;
  skill: string;
  skill_level_1?: string | null;
  skill_level_2?: string | null;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  passage: string;
  stem: string;
  question?: string;
  question_latex?: string | null;
  question_text?: string | null;
  question_parse_status?: 'verified_latex' | 'verified_text' | 'fallback_image_needs_latex_review' | string | null;
  question_parts?: MathQuestionPart[];
  choices: string[];
  choice_latex?: Record<string, string>;
  choice_text?: Record<string, string>;
  choice_parse_status?: Record<string, 'verified_text_layer' | 'plain_text' | 'fallback_image_needs_latex_review' | 'missing' | string>;
  choice_images?: Record<string, string>;
  correct_answer: string;
  rationale: string;
  has_graph: boolean;
  question_type?: QuestionType;
  calculator?: boolean | null;
  figure_image?: string;
  figure_alt?: string;
  page?: number;
  pages?: number[];
  page_image?: string;
  page_images?: string[];
  has_visual_math?: boolean;
  image_block_count?: number;
  parse_notes?: string[];
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  password: string;
  createdAt: number;
}

export interface UserAnswer {
  questionId: string;
  section?: QuestionSection;
  skill?: string;
  domain?: string;
  selectedAnswer: string;
  isCorrect: boolean;
  eliminatedChoices: string[];
  confidenceLevel: number;
  timeSpentSeconds: number;
  timestamp: number;
  sessionId: string;
}

export interface UserSkill {
  skill: string;
  section?: QuestionSection;
  displaySkill?: string;
  domain?: string;
  masteryScore: number;
  questionsAnswered: number;
  questionsCorrect: number;
  lastUpdated: number;
  sessionCounter: number;
  nextReviewSession: number;
}

export interface SessionSummary {
  id: string;
  mode: PracticeMode;
  section?: QuestionSection;
  score: number;
  totalQuestions: number;
  correctCount: number;
  skillsPracticed: string[];
  timeTakenSeconds: number;
  predictedSatScore: number;
  date: number;
}

export interface Bookmark {
  questionId: string;
  createdAt: number;
}

export type PracticeMode = 
  | 'adaptive'
  | 'random' 
  | 'focused' 
  | 'mock' 
  | 'review_wrong' 
  | 'weak_spots' 
  | 'bookmarked';

export interface PracticeSession {
  id: string;
  mode: PracticeMode;
  section?: QuestionSection;
  currentQuestionIndex: number;
  questions: Question[];
  answers: Record<string, UserAnswer>;
  markedForReview: string[];
  startTime: number;
  isComplete: boolean;
  focusedSkills?: string[];
  mockModule?: number;
  questionCount?: number;
  isEndless?: boolean;
}

export type Theme = 'dark' | 'light' | 'sepia' | 'high-contrast' | 'pure-black';
export type FontFamily = 'sans' | 'serif' | 'dyslexic';
export type FontSize = 'small' | 'medium' | 'large';

export interface AppSettings {
  theme: Theme;
  fontFamily: FontFamily;
  fontSize: FontSize;
  dailyGoalTarget: number;
  notificationsEnabled: boolean;
  reminderTime: string;
  aiExplanationsEnabled: boolean;
  targetSatScore: number;
}

export interface DailyGoal {
  date: string;
  target: number;
  completed: number;
  streak: number;
}

export interface Highlight {
  id: string;
  questionId: string;
  startOffset: number;
  endOffset: number;
  color: string;
}
