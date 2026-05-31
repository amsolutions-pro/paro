# -*- coding: utf-8 -*-
"""
Extrait les QCM du fichier Quiz alphabétique paronyme.docx.txt.
Produit content/_extracted/quiz_items.json
"""
import json, re, unicodedata

def clean(s):
    # Supprime les caractères invisibles U+200B, U+FEFF, nbsp, etc.
    s = re.sub(r'[​‌‍﻿ ]', ' ', s)
    return s.strip()

def normalize_option(s):
    """Extrait le texte d'une option : 'A. affermé' → 'affermé'"""
    s = clean(s)
    m = re.match(r'^[A-Ba-b][.)]\s*(.+)$', s)
    return m.group(1).strip() if m else s.strip()

def detect_answer_letter(line):
    """Cherche 'réponse correcte est [la] A/B' etc. → 'A' ou 'B'"""
    patterns = [
        r'[Bb]on[ne]?\s+(?:choix|r[ée]ponse)\s+est\s+(?:la\s+)?([AB])',
        r'r[ée]ponse\s+correcte\s+est\s+(?:la\s+)?([AB])',
        r'correct[e]?\s+(?:est\s+)?(?:la\s+)?([AB])',
        r'^([AB])\s*[.:]',          # ligne commençant par "B." ou "A."
        r'est\s+(?:la\s+)?([AB])\b',
    ]
    for p in patterns:
        m = re.search(p, line, re.IGNORECASE)
        if m:
            return m.group(1).upper()
    return None

with open('content/_extracted/Quiz alphabétique paronyme.docx.txt', encoding='utf-8') as f:
    raw_lines = f.readlines()

lines = [clean(l) for l in raw_lines]

# ── Parseur en machine à états ─────────────────────────────────────────────
items = []
state = 'IDLE'   # IDLE → HAS_PROMPT → HAS_OPT_A → HAS_OPT_B → DONE
prompt = None
opt_a = None
opt_b = None
commentary_lines = []
answer_letter = None

def is_option_line(s):
    return bool(re.match(r'^[A-Ba-b][.)]\s*\S', s))

def has_blank(s):
    return '____' in s or '………' in s

def flush():
    """Enregistre l'item en cours si suffisamment complet."""
    global prompt, opt_a, opt_b, commentary_lines, answer_letter, state
    if prompt and opt_a and opt_b and answer_letter:
        commentary = ' '.join(commentary_lines).strip()
        items.append({
            'prompt': prompt,
            'optA': opt_a,
            'optB': opt_b,
            'correctAnswer': answer_letter,
            'commentary': commentary,
        })
    prompt = opt_a = opt_b = None
    commentary_lines = []
    answer_letter = None
    state = 'IDLE'

for line in lines:
    if not line:
        continue

    # Détecte une nouvelle question (contient des blancs)
    if has_blank(line) and len(line) > 10:
        flush()
        prompt = line
        state = 'HAS_PROMPT'
        continue

    if state == 'HAS_PROMPT':
        if is_option_line(line):
            opt_a = normalize_option(line)
            state = 'HAS_OPT_A'
        # sinon on ignore (lignes décoratives entre la question et les options)
        continue

    if state == 'HAS_OPT_A':
        if is_option_line(line):
            opt_b = normalize_option(line)
            state = 'HAS_OPT_B'
        continue

    if state == 'HAS_OPT_B':
        # Cherche la réponse dans toutes les lignes suivantes jusqu'à la prochaine question
        if answer_letter is None:
            letter = detect_answer_letter(line)
            if letter in ('A', 'B'):
                answer_letter = letter
        # Accumule le commentaire (explication)
        if line and not is_option_line(line) and not has_blank(line):
            commentary_lines.append(line)

flush()  # dernier item

print(f'Items extraits : {len(items)}')

# Vérifie la distribution A/B
na = sum(1 for i in items if i['correctAnswer'] == 'A')
nb = sum(1 for i in items if i['correctAnswer'] == 'B')
print(f'  Réponse A : {na}, Réponse B : {nb}')

with open('content/_extracted/quiz_items.json', 'w', encoding='utf-8') as f:
    json.dump(items, f, ensure_ascii=False, indent=2)

print('OK content/_extracted/quiz_items.json')
