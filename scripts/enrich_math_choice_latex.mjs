import fs from 'node:fs';

const path = 'public/math_questions.json';
const questions = JSON.parse(fs.readFileSync(path, 'utf8'));
const letters = ['A', 'B', 'C', 'D'];

const cleanChoice = (choice = '', letter = '') => String(choice)
  .replace(new RegExp(`^\\s*${letter}\\s*\\.\\s*`), '')
  .trim();

const escapeLatexText = (value) => value.replace(/[&%$#_{}]/g, (ch) => `\\${ch}`);

function simpleChoiceToLatex(value) {
  const text = value.trim();
  if (!text) return null;

  // Only auto-convert conservative, text-layer choices. Visual equation choices remain image fallback.
  if (text.length > 80) return null;
  if (/[\n]|[A-Za-z]{4,}/.test(text)) return null;

  const normalized = text
    .replace(/[−–—]/g, '-')
    .replace(/÷/g, '\\div ')
    .replace(/×/g, '\\times ')
    .replace(/≤/g, '\\le ')
    .replace(/≥/g, '\\ge ')
    .replace(/°/g, '^\\circ')
    .replace(/π/g, '\\pi');

  // Plain integers/decimals/commas/currency are safe and look better as text than screenshots.
  if (/^\$?-?\d[\d,]*(?:\.\d+)?(?:\^\\circ)?$/.test(normalized)) {
    return normalized.replace(/^\$/, '\\$');
  }

  if (/^-?\d[\d,]*(?:\.\d+)?\s*%$/.test(normalized)) {
    return normalized.replace(/%$/, '\\%');
  }

  if (/^\d+(?:\.\d+)?\s*:\s*\d+(?:\.\d+)?$/.test(normalized)) {
    return normalized.replace(/\s*:\s*/, ':');
  }

  const unitMatch = normalized.match(/^(-?\d[\d,]*(?:\.\d+)?)\s+(meters per second|feet per second|miles per hour|feet|meters|dollars|minutes|hours|years|degrees)$/i);
  if (unitMatch) {
    return `${unitMatch[1]}\\text{ ${unitMatch[2]} }`;
  }

  const exactTextChoices = new Set([
    'exactly one', 'exactly two', 'infinitely many', 'zero',
    'none', 'one', 'two', 'three', 'more than two',
    'i only', 'ii only', 'iii only', 'i and ii', 'i and iii', 'ii and iii', 'i, ii, and iii', 'neither i nor ii',
    'mean', 'median', 'range', 'standard deviation',
  ]);
  if (exactTextChoices.has(text.toLowerCase())) {
    return `\\text{${text.replace(/[{}]/g, '')}}`;
  }

  // Simple fractions such as 3/17.
  const fraction = normalized.match(/^(-?\d+(?:\.\d+)?)\s*\/\s*(-?\d+(?:\.\d+)?)$/);
  if (fraction) return `\\frac{${fraction[1]}}{${fraction[2]}}`;

  // Simple algebraic expressions from the text layer.
  if (/^[0-9a-zA-Z\\_+\-*/=().,\s^{}]+$/.test(normalized) && /[0-9]/.test(normalized)) {
    return normalized
      .replace(/\*/g, '\\cdot ')
      .replace(/([a-zA-Z])(\d)/g, '$1_$2');
  }

  return null;
}

let verifiedChoices = 0;
let fallbackChoices = 0;
let questionsWithLatex = 0;

for (const q of questions) {
  if (q.question_type !== 'multiple_choice') continue;

  const choice_latex = {};
  const choice_text = {};
  const choice_parse_status = {};
  let hasLatex = false;

  letters.forEach((letter, index) => {
    const text = cleanChoice(q.choices?.[index], letter);
    if (text) choice_text[letter] = text;

    const latex = simpleChoiceToLatex(text);
    if (latex) {
      choice_latex[letter] = latex;
      choice_parse_status[letter] = 'verified_text_layer';
      verifiedChoices += 1;
      hasLatex = true;
    } else if (text && !/\n/.test(text) && !['and', '%'].includes(text.trim().toLowerCase()) && text.length >= 3) {
      choice_parse_status[letter] = 'verified_plain_text';
    } else if (q.choice_images?.[letter]) {
      choice_parse_status[letter] = 'fallback_image_needs_latex_review';
      fallbackChoices += 1;
    } else if (text) {
      choice_parse_status[letter] = 'plain_text';
    } else {
      choice_parse_status[letter] = 'missing';
    }
  });

  q.choice_latex = choice_latex;
  q.choice_text = choice_text;
  q.choice_parse_status = choice_parse_status;
  if (hasLatex) questionsWithLatex += 1;
}

fs.writeFileSync(path, JSON.stringify(questions, null, 2) + '\n');
console.log(JSON.stringify({ verifiedChoices, fallbackChoices, questionsWithLatex }, null, 2));
