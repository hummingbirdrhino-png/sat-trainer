#!/usr/bin/env python3
"""Parse SAT Math question bank PDF into structured JSON + page images.

The Math PDF stores many equations/fractions/graphs as positioned image snippets, so
plain text extraction loses key math. This parser preserves exact visual fidelity by
creating rendered question-only image crop(s) for each question and also extracts searchable
metadata, answers, choices, and rationale text when available.
"""
from __future__ import annotations

from pathlib import Path
import fitz
import json
import re
from collections import Counter

PDF_PATH = Path('work/math-pdf/sat_math_question_bank.pdf')
OUT_JSON = Path('public/math_questions.json')
SUMMARY_JSON = Path('public/math_questions_summary.json')
IMG_DIR = Path('public/math_figures')
CHOICE_DIR = Path('public/math_choices')
IMG_DIR.mkdir(parents=True, exist_ok=True)
CHOICE_DIR.mkdir(parents=True, exist_ok=True)

ID_RE = re.compile(r'Question ID:\s*([A-Za-z0-9]+)')
CORRECT_RE = re.compile(r'Correct Answer:\s*(.+?)(?=\nRationale\n|\nRationale\r?\n|\Z)', re.S)
DIFFICULTIES = {'Easy', 'Medium', 'Hard'}


def clean_text(s: str) -> str:
    if not s:
        return ''
    s = s.replace('\u00a0', ' ')
    fixes = {
        'bir th': 'birth', 'proper ty': 'property', 'Proper ty': 'Property',
        'transpor t': 'transport', 'cer tain': 'certain', 'ver tex': 'vertex',
        'propor tional': 'proportional', 'propor tion': 'proportion',
        'suppor t': 'support', 'repor ter': 'reporter', 'shir ts': 'shirts',
        'four th': 'fourth', 'xy-plane': 'xy-plane', 'x y-plane': 'xy-plane',
    }
    for a, b in fixes.items():
        s = s.replace(a, b)
    s = re.sub(r'[ \t]+', ' ', s)
    s = re.sub(r'\n{3,}', '\n\n', s)
    return s.strip()


def line_text(page: fitz.Page) -> list[tuple[float, float, float, float, str]]:
    data = page.get_text('dict')
    lines = []
    for b in data.get('blocks', []):
        if b.get('type') != 0:
            continue
        for line in b.get('lines', []):
            txt = ''.join(span.get('text', '') for span in line.get('spans', []))
            if txt.strip():
                x0, y0, x1, y1 = line.get('bbox')
                lines.append((x0, y0, x1, y1, txt.strip()))
    return sorted(lines, key=lambda x: (round(x[1], 1), x[0]))


def extract_meta(first_page: fitz.Page):
    lines = line_text(first_page)
    domain_parts, skill_parts = [], []
    difficulty = ''
    for x0, y0, x1, y1, txt in lines:
        if not (75 <= y0 <= 122):
            continue
        if 180 <= x0 <= 335:
            domain_parts.append(txt)
        elif 340 <= x0 <= 475:
            skill_parts.append(txt)
        elif 475 <= x0 <= 535 and txt in DIFFICULTIES:
            difficulty = txt
    return {
        'assessment': 'SAT',
        'test': 'Math',
        'domain': clean_text(' '.join(domain_parts)),
        'skill': clean_text(' '.join(skill_parts)),
        'difficulty': difficulty,
    }


def extract_sections(raw: str):
    text = raw.replace('\r\n', '\n')
    m = re.search(r'\nQuestion\n(.+)', text, re.S)
    body = m.group(1) if m else text

    cm = CORRECT_RE.search(body)
    correct = clean_text(cm.group(1).split('\n')[0]) if cm else ''

    rm = re.search(r'\nRationale\n(.+)$', body, re.S)
    rationale = clean_text(rm.group(1)) if rm else ''

    end_markers = [m.start() for m in re.finditer(r'\n(?:Answer|Correct Answer:|Rationale)\n?', body)]
    q_part = body[:min(end_markers)] if end_markers else body
    question = clean_text(q_part)

    ans_block = ''
    am = re.search(r'\nAnswer\n(.+?)(?=\nCorrect Answer:|\nRationale\n|\Z)', body, re.S)
    if am:
        ans_block = clean_text(am.group(1))

    if not correct and rationale:
        m_choice = re.search(r'Choice\s+([ABCD])\s+is\s+correct', rationale, re.I)
        if m_choice:
            correct = m_choice.group(1).upper()
    if not correct and rationale:
        m_either = re.search(r'The correct answer is either\s+(.+?)(?:\.|\n)', rationale, re.I)
        if m_either:
            correct = clean_text(m_either.group(1)).strip(' .')
    if not correct and rationale:
        m_num = re.search(r'The correct answer is\s+(-?(?:\d+(?:\.\d+)?|\.\d+)(?:\s*,\s*-?(?:\d+(?:\.\d+)?|\.\d+|\d+/\d+))*)', rationale)
        if m_num:
            correct = clean_text(m_num.group(1)).strip(' .')
    if not correct and rationale:
        m_note = re.search(r'Note that\s+([\s\S]{1,160}?)\s+(?:is|are) examples? of ways to enter a correct answer', rationale, re.I)
        if m_note:
            correct = clean_text(m_note.group(1)).strip(' .')

    choices = []
    if ans_block:
        parts = re.split(r'(?=(?:^|\n)[ABCD]\.)', ans_block)
        for part in parts:
            part = part.strip()
            if re.match(r'^[ABCD]\.', part):
                choices.append(clean_text(part))
    question_type = 'multiple_choice' if choices or re.search(r'\nAnswer\n', body) else 'student_produced_response'
    return question, choices, correct, rationale, question_type


def answer_marker_y(page: fitz.Page) -> float | None:
    candidates = []
    for x0, y0, x1, y1, txt in line_text(page):
        stripped = txt.strip()
        if stripped.startswith('Correct Answer:') or stripped == 'Rationale':
            candidates.append(y0)
    return min(candidates) if candidates else None


def render_question_crop(page: fitz.Page, out: Path):
    if out.exists():
        return
    # Crop before Correct Answer/Rationale so practice mode does not reveal the answer.
    marker_y = answer_marker_y(page)
    rect = page.rect
    if marker_y is not None and marker_y > 120:
        rect = fitz.Rect(0, 0, page.rect.width, max(120, marker_y - 8))
    pix = page.get_pixmap(matrix=fitz.Matrix(1.75, 1.75), alpha=False, clip=rect)
    pix.save(out)


def answer_choice_rects(page: fitz.Page) -> dict[str, fitz.Rect]:
    lines = line_text(page)
    labels = []
    for x0, y0, x1, y1, txt in lines:
        m = re.match(r'^([ABCD])\.\s*', txt.strip())
        if m and y0 > 120:
            labels.append((m.group(1), y0))
    if not labels:
        return {}
    # Only keep first A-D set before answer/rationale.
    seen = {}
    for letter, y in labels:
        seen.setdefault(letter, y)
    if not all(letter in seen for letter in 'ABCD'):
        return {}
    marker_y = answer_marker_y(page) or page.rect.height
    rects = {}
    ordered = [(letter, seen[letter]) for letter in 'ABCD']
    for idx, (letter, y) in enumerate(ordered):
        next_y = ordered[idx + 1][1] if idx + 1 < len(ordered) else marker_y
        bottom = max(y + 18, min(next_y - 2, marker_y - 4))
        rects[letter] = fitz.Rect(12, max(0, y - 6), page.rect.width - 12, bottom)
    return rects


def render_choice_crops(page: fitz.Page, qid: str) -> dict[str, str]:
    rects = answer_choice_rects(page)
    rendered = {}
    for letter, rect in rects.items():
        out = CHOICE_DIR / f'{qid}_{letter}.png'
        pix = page.get_pixmap(matrix=fitz.Matrix(2.0, 2.0), alpha=False, clip=rect)
        pix.save(out)
        rendered[letter] = f'math_choices/{out.name}'
    return rendered


def main():
    doc = fitz.open(PDF_PATH)
    # Remove stale generated images for deterministic output.
    for old in IMG_DIR.glob('math_*.png'):
        old.unlink()
    for old in CHOICE_DIR.glob('math_*.png'):
        old.unlink()

    starts = []
    page_texts = []
    for i, page in enumerate(doc):
        raw = page.get_text('text')
        page_texts.append(raw)
        m = ID_RE.search(raw)
        if m:
            starts.append((i, m.group(1)))

    questions = []
    domains = Counter(); skills = Counter(); diffs = Counter(); qtypes = Counter()
    missing_correct = []
    multipage = 0

    for idx, (start, source_id) in enumerate(starts):
        end = starts[idx + 1][0] if idx + 1 < len(starts) else doc.page_count
        page_indexes = list(range(start, end))
        raw = '\n'.join(page_texts[p] for p in page_indexes)
        qid = f'math_{source_id}'
        meta = extract_meta(doc[start])
        question, choices, correct, rationale, qtype = extract_sections(raw)

        page_images = []
        choice_images = {}
        image_blocks = 0
        for n, pno in enumerate(page_indexes, start=1):
            suffix = '' if len(page_indexes) == 1 else f'_p{n}'
            marker_y = answer_marker_y(doc[pno])
            # If a continuation page starts directly with rationale, do not include it in practice display.
            if marker_y is None or marker_y > 120:
                img_name = f'{qid}{suffix}_qcrop.png'
                render_question_crop(doc[pno], IMG_DIR / img_name)
                page_images.append(f'math_figures/{img_name}')
                if n == 1:
                    choice_images = render_choice_crops(doc[pno], qid)
            image_blocks += sum(1 for b in doc[pno].get_text('dict').get('blocks', []) if b.get('type') == 1)

        if len(page_indexes) > 1:
            multipage += 1
        visual_math_likely = bool(image_blocks or '\n. ' in raw or '\n, ' in raw or re.search(r'\n\s*(?:and|or|is|=|\?)', raw))
        rec = {
            'id': qid,
            'source_id': source_id,
            'section': 'math',
            'assessment': meta['assessment'],
            'test': meta['test'],
            'domain': meta['domain'],
            'skill': meta['skill'],
            'skill_level_1': meta['skill'],
            'skill_level_2': None,
            'difficulty': meta['difficulty'],
            'question_type': qtype,
            'calculator': None,
            'question': question,
            'choices': choices,
            'choice_images': choice_images,
            'correct_answer': correct,
            'rationale': rationale,
            'page': start + 1,
            'pages': [p + 1 for p in page_indexes],
            'page_image': page_images[0],
            'page_images': page_images,
            'has_visual_math': visual_math_likely,
            'image_block_count': image_blocks,
            'parse_notes': ['page_images_are_question_only_crops_preserving_equations_graphs_tables; plain_text_may_omit_math_symbols'],
        }
        questions.append(rec)
        domains[rec['domain']] += 1
        skills[rec['skill']] += 1
        diffs[rec['difficulty']] += 1
        qtypes[rec['question_type']] += 1
        # Last-resort corrections for answers rendered entirely as visual math where the rationale text loses the value.
        manual_correct = {
            'math_466b87e3': '1/2 and .5',
            'math_fb58c0db': '1/6, .1666, .1667, 0.166, and 0.167',
        }
        if rec['id'] in manual_correct and not rec['correct_answer']:
            rec['correct_answer'] = manual_correct[rec['id']]
            rec['parse_notes'].append('correct_answer_manual_from_rationale_examples')
        if not rec['correct_answer']:
            missing_correct.append({'id': qid, 'page': start + 1, 'pages': rec['pages']})

    OUT_JSON.write_text(json.dumps(questions, ensure_ascii=False, indent=2), encoding='utf-8')
    summary = {
        'source_pdf': str(PDF_PATH),
        'question_count': len(questions),
        'pdf_page_count': doc.page_count,
        'rendered_question_image_count': sum(len(q['page_images']) for q in questions),
        'rendered_choice_image_count': sum(len(q.get('choice_images', {})) for q in questions),
        'multi_page_question_count': multipage,
        'domains': dict(sorted(domains.items())),
        'skills': dict(sorted(skills.items())),
        'difficulties': dict(sorted(diffs.items())),
        'question_types': dict(sorted(qtypes.items())),
        'missing_correct_answer_count': len(missing_correct),
        'missing_correct_answer_examples': missing_correct[:25],
        'notes': [
            'Math equations/fractions/graphs are often embedded visually in the PDF, so page_images are question-only visual crops for practice display.',
            'Structured text is useful for metadata/search/adaptive targeting but may omit symbols/equations.',
            'skill_level_2 is currently null because the PDF header exposes one skill label under each domain in extracted text.',
        ],
    }
    SUMMARY_JSON.write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
