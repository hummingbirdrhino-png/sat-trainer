#!/usr/bin/env python3
import json
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
questions = json.loads((ROOT / 'public/math_questions.json').read_text())
start = int(sys.argv[1]) if len(sys.argv) > 1 else 0
count = int(sys.argv[2]) if len(sys.argv) > 2 else 16
kind = sys.argv[3] if len(sys.argv) > 3 else 'choices'
letters = ['A', 'B', 'C', 'D']
items = []

if kind == 'choices':
    for q in questions:
        for letter in letters:
            if q.get('choice_images', {}).get(letter) and not q.get('choice_latex', {}).get(letter) and q.get('choice_parse_status', {}).get(letter) == 'fallback_image_needs_latex_review':
                items.append({
                    'id': q['id'],
                    'letter': letter,
                    'image': q['choice_images'][letter],
                    'skill': q.get('skill', ''),
                    'type': 'choice',
                })
elif kind == 'questions':
    for q in questions:
        if q.get('section') == 'math' and not q.get('question_latex') and (q.get('page_images') or q.get('page_image')):
            items.append({
                'id': q['id'],
                'image': (q.get('page_images') or [q.get('page_image')])[0],
                'skill': q.get('skill', ''),
                'type': 'question',
                'text': q.get('question', ''),
            })
else:
    raise SystemExit('kind must be choices or questions')

batch = items[start:start + count]
out_dir = ROOT / 'work/math-latex/sheets'
out_dir.mkdir(parents=True, exist_ok=True)
(out_dir / f'{kind}_{start}_{count}.json').write_text(json.dumps(batch, indent=2))

row_h = 170 if kind == 'choices' else 360
label_w = 380
img_w = 1100
width = label_w + img_w + 50
height = max(1, len(batch)) * row_h + 30
canvas = Image.new('RGB', (width, height), 'white')
draw = ImageDraw.Draw(canvas)
try:
    font_big = ImageFont.truetype('DejaVuSans.ttf', 22)
    font_small = ImageFont.truetype('DejaVuSans.ttf', 14)
except Exception:
    font_big = None
    font_small = None

for i, item in enumerate(batch):
    y = 20 + i * row_h
    draw.rectangle((10, y - 10, width - 20, y + row_h - 18), outline='#bbbbbb', width=1)
    label = f"{i + 1}. {item['id']}" + (f" {item['letter']}" if 'letter' in item else '')
    draw.text((24, y + 18), label, fill='black', font=font_big)
    draw.text((24, y + 48), item.get('skill', '')[:44], fill='black', font=font_small)
    img_path = ROOT / 'public' / item['image']
    img = Image.open(img_path).convert('RGB')
    scale = min(img_w / img.width, (row_h - 35) / img.height)
    new_size = (max(1, int(img.width * scale)), max(1, int(img.height * scale)))
    img = img.resize(new_size, Image.Resampling.LANCZOS)
    canvas.paste(img, (label_w, y))

out = out_dir / f'{kind}_{start}_{count}.png'
canvas.save(out)
print(json.dumps({'start': start, 'count': len(batch), 'kind': kind, 'path': str(out.relative_to(ROOT))}, indent=2))
