import fs from 'node:fs';

const questions = JSON.parse(fs.readFileSync('public/math_questions.json', 'utf8'));
const letters = ['A', 'B', 'C', 'D'];
const backlog = [];

for (const q of questions) {
  const questionNeedsLatex = q.section === 'math' && !q.question_latex && (q.page_images?.length || q.page_image);
  const choiceNeedsLatex = [];

  if (q.question_type === 'multiple_choice') {
    for (const letter of letters) {
      if (q.choice_images?.[letter] && !q.choice_latex?.[letter] && q.choice_parse_status?.[letter] === 'fallback_image_needs_latex_review') {
        choiceNeedsLatex.push({ letter, image: q.choice_images[letter] });
      }
    }
  }

  if (questionNeedsLatex || choiceNeedsLatex.length) {
    backlog.push({
      id: q.id,
      domain: q.domain,
      skill: q.skill,
      difficulty: q.difficulty,
      question_type: q.question_type,
      question_image: q.page_image,
      question_images: q.page_images ?? (q.page_image ? [q.page_image] : []),
      existing_question_text: q.question,
      question_needs_latex: Boolean(questionNeedsLatex),
      choices: choiceNeedsLatex,
    });
  }
}

fs.mkdirSync('work/math-latex', { recursive: true });
fs.writeFileSync('work/math-latex/backlog.json', JSON.stringify(backlog, null, 2));

const summary = {
  questions_total: questions.length,
  backlog_questions: backlog.length,
  question_latex_needed: backlog.filter((q) => q.question_needs_latex).length,
  choice_latex_needed: backlog.reduce((sum, q) => sum + q.choices.length, 0),
  choice_questions_needed: backlog.filter((q) => q.choices.length).length,
};
console.log(JSON.stringify(summary, null, 2));
