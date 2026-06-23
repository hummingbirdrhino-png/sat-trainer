import fs from 'node:fs';

const [,, batchPath, transcriptionPath] = process.argv;
if (!batchPath || !transcriptionPath) {
  console.error('Usage: node scripts/apply_math_latex_transcriptions.mjs <batch.json> <transcribed.json>');
  process.exit(1);
}
const questionsPath = 'public/math_questions.json';
const questions = JSON.parse(fs.readFileSync(questionsPath, 'utf8'));
const byId = new Map(questions.map((q) => [q.id, q]));
const batch = JSON.parse(fs.readFileSync(batchPath, 'utf8'));
const transcriptions = JSON.parse(fs.readFileSync(transcriptionPath, 'utf8'));
let applied = 0;
let skipped = 0;

for (const item of transcriptions) {
  const batchItem = batch[item.index - 1];
  if (!batchItem || !item.latex) {
    skipped += 1;
    continue;
  }
  const q = byId.get(batchItem.id);
  if (!q) {
    skipped += 1;
    continue;
  }
  if (batchItem.type === 'choice') {
    q.choice_latex ??= {};
    q.choice_text ??= {};
    q.choice_parse_status ??= {};
    q.choice_latex[batchItem.letter] = item.latex;
    q.choice_parse_status[batchItem.letter] = 'verified_latex_vision';
    applied += 1;
  } else if (batchItem.type === 'question') {
    q.question_latex = item.latex;
    q.question_parse_status = 'verified_latex_vision';
    applied += 1;
  }
}

fs.writeFileSync(questionsPath, JSON.stringify(questions, null, 2) + '\n');
console.log(JSON.stringify({ applied, skipped }, null, 2));
