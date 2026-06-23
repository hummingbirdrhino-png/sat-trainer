import type { Question } from '@/types';

const choiceLetters = ['A', 'B', 'C', 'D'] as const;

export function cleanQuestionText(value: string | undefined | null): string {
  return String(value ?? '')
    .replace(/---PAGE_BREAK---/g, ' ')
    .replace(/[\r\n]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;:?!])/g, '$1')
    .replace(/([“(])\s+/g, '$1')
    .replace(/\s+([”)])/g, '$1')
    .trim();
}

function stripChoicePrefix(value: string): { letter: string | null; text: string } {
  const match = String(value).match(/^\s*([A-D])\s*\.\s*(.*)$/s);
  if (!match) return { letter: null, text: cleanQuestionText(value) };
  return { letter: match[1], text: cleanQuestionText(match[2]) };
}

function splitChoices(choices: string[] = []): string[] {
  const joined = choices.join('\n');
  const markerRegex = /(^|\n)\s*([A-D])\s*\.\s*/g;
  const markers = [...joined.matchAll(markerRegex)];

  if (markers.length >= 4) {
    const bestByLetter: Partial<Record<(typeof choiceLetters)[number], string>> = {};

    markers.forEach((marker, index) => {
      const letter = marker[2] as (typeof choiceLetters)[number];
      const start = (marker.index ?? 0) + marker[0].length;
      const end = index + 1 < markers.length ? markers[index + 1].index ?? joined.length : joined.length;
      const text = cleanQuestionText(joined.slice(start, end));

      if (!bestByLetter[letter] || text.length > bestByLetter[letter]!.length) {
        bestByLetter[letter] = text;
      }
    });

    if (choiceLetters.every((letter) => bestByLetter[letter] !== undefined)) {
      return choiceLetters.map((letter) => `${letter}. ${bestByLetter[letter] ?? ''}`);
    }
  }

  return choiceLetters.map((letter, index) => {
    const raw = choices[index] ?? `${letter}.`;
    const parsed = stripChoicePrefix(raw);
    return `${letter}. ${parsed.text}`;
  });
}

export function sanitizeQuestion(question: Question): Question {
  const isMath = question.section === 'math' || question.test === 'Math' || question.id?.startsWith('math_');
  const stem = question.stem ?? question.question ?? '';

  return {
    ...question,
    section: isMath ? 'math' : (question.section ?? 'reading_writing'),
    passage: isMath
      ? String(question.passage ?? '').trim()
      : question.figure_image ? String(question.passage ?? '').trim() : cleanQuestionText(question.passage),
    stem: isMath ? cleanQuestionText(stem) : cleanQuestionText(stem),
    question: question.question ? cleanQuestionText(question.question) : undefined,
    rationale: cleanQuestionText(question.rationale),
    choices: splitChoices(question.choices),
    has_graph: Boolean(question.has_graph || question.page_image || question.page_images?.length),
    question_type: question.question_type ?? (question.choices?.length ? 'multiple_choice' : 'student_produced_response'),
  };
}

export function sanitizeQuestions(questions: Question[]): Question[] {
  return questions.map(sanitizeQuestion);
}

export function getChoiceDisplay(choice: string, fallbackIndex: number): { letter: string; text: string } {
  const fallbackLetter = choiceLetters[fallbackIndex] ?? '?';
  const parsed = stripChoicePrefix(choice);
  return {
    letter: parsed.letter ?? fallbackLetter,
    text: parsed.text,
  };
}
