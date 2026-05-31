# -*- coding: utf-8 -*-
"""
Niveau 1 : QCM + TROUS depuis quiz_items.json (croisé avec manual.json)
Niveau 2 : APPARIEMENT bilingue fr → hy (groupes par 4 mots)
Produit content/exercises-quiz.json
"""
import json, re, unicodedata

def norm(s):
    """Normalise pour comparaison : minuscules, sans accents, sans ponctuation."""
    s = unicodedata.normalize('NFD', s.lower())
    s = ''.join(c for c in s if unicodedata.category(c) != 'Mn')
    return re.sub(r"[^a-z0-9 ]", "", s).strip()

with open('content/manual.json', encoding='utf-8') as f:
    manual = json.load(f)

# Index : headword normalisé → (groupSlug, posClass)
word_index = {}
for g in manual:
    for w in g['words']:
        word_index[norm(w['headword'])] = (g['slug'], w.get('posClass', 'AUTRE'))

def stem(s, length=5):
    return norm(s)[:length]

# Index par radical (5 premiers chars normalisés)
stem_index = {}
for key, val in word_index.items():
    s = key[:5]
    if s not in stem_index:
        stem_index[s] = val

def find_group(optA, optB):
    """Trouve le groupSlug à partir des deux options (exact puis radical)."""
    for opt in (optA, optB):
        hit = word_index.get(norm(opt))
        if hit:
            return hit
    # Fallback : radical 5 chars
    for opt in (optA, optB):
        hit = stem_index.get(stem(opt))
        if hit:
            return hit
    # Fallback radical 4 chars
    for opt in (optA, optB):
        s4 = norm(opt)[:4]
        for key, val in word_index.items():
            if key[:4] == s4:
                return val
    return (None, None)

with open('content/_extracted/quiz_items.json', encoding='utf-8') as f:
    quiz_items = json.load(f)

# ── Niveau 1 : QCM + TROUS ────────────────────────────────────────────────
items = []
slug_counter = {}

def next_slug(prefix):
    slug_counter[prefix] = slug_counter.get(prefix, 0) + 1
    return f"{prefix}-quiz-{slug_counter[prefix]:03d}"

def clean_commentary(raw, opt_a, opt_b, correct):
    """Retire le préfixe 'La bonne réponse est A.' du commentaire."""
    s = re.sub(
        r"^(La\s+)?(bonne\s+r[ée]ponse|r[ée]ponse\s+correcte|bon\s+choix)\s+est\s+(la\s+)?[ABab][.:\s]*",
        "", raw, flags=re.IGNORECASE
    ).strip()
    return s or f"La réponse correcte est « {correct} »."

matched = 0
unmatched = []
seen_slugs = set()

for qi in quiz_items:
    group_slug, pos_class = find_group(qi['optA'], qi['optB'])
    correct_word = qi['optA'] if qi['correctAnswer'] == 'A' else qi['optB']
    wrong_word   = qi['optB'] if qi['correctAnswer'] == 'A' else qi['optA']
    commentary   = clean_commentary(qi['commentary'], qi['optA'], qi['optB'], correct_word)

    # ── QCM ──────────────────────────────────────────────────────────────
    qcm_slug = next_slug('qcm')
    if qcm_slug not in seen_slugs:
        seen_slugs.add(qcm_slug)
        items.append({
            "slug": qcm_slug,
            "type": "QCM",
            "gradingMode": "AUTO",
            "prompt": qi['prompt'],
            "payload": {
                "options": [
                    {"key": "a", "text": qi['optA']},
                    {"key": "b", "text": qi['optB']},
                ]
            },
            "solution": {"correctKey": "a" if qi['correctAnswer'] == 'A' else "b"},
            "commentary": commentary,
            "groupSlug": group_slug,
            "posClass": pos_class,
            "source": "manuel",
            "reviewNeeded": False,
            "orderIndex": 0,
        })

    # ── TROUS (variante de la même phrase) ────────────────────────────────
    if '____' in qi['prompt'] or '………' in qi['prompt']:
        trous_slug = next_slug('trous')
        if trous_slug not in seen_slugs:
            seen_slugs.add(trous_slug)
            items.append({
                "slug": trous_slug,
                "type": "TROUS",
                "gradingMode": "AUTO",
                "prompt": qi['prompt'],
                "payload": {
                    "bank": [qi['optA'], qi['optB']],
                    "blanksCount": 1,
                },
                "solution": {"answers": [correct_word], "accentSensitive": False},
                "commentary": commentary,
                "groupSlug": group_slug,
                "posClass": pos_class,
                "source": "manuel",
                "reviewNeeded": False,
                "orderIndex": 0,
            })

    if group_slug:
        matched += 1
    else:
        unmatched.append(f"{qi['optA'].encode('ascii','replace').decode()} / {qi['optB'].encode('ascii','replace').decode()}")

print(f"QCM + TROUS generes : {len(items)}")
print(f"  Associes a un groupe : {matched * 2} / {len(quiz_items) * 2}")
print(f"  Sans groupe ({len(unmatched)}) : {unmatched[:10]}")

# ── Niveau 2 : APPARIEMENT bilingue fr → hy ───────────────────────────────
hy_words = [
    {'headword': w['headword'], 'translationHy': w['translationHy'], 'groupSlug': g['slug']}
    for g in manual
    for w in g['words']
    if w.get('translationHy', '').strip()
]

letters = ['a', 'b', 'c', 'd']
bi_count = 0
WINDOW = 4

for i in range(0, len(hy_words) - WINDOW + 1, WINDOW):
    window = hy_words[i:i+WINDOW]
    if len(window) < 3:
        break
    left  = [{"id": str(k+1), "text": w['headword']}     for k, w in enumerate(window)]
    right = [{"id": letters[k], "text": w['translationHy']} for k, w in enumerate(window)]
    pairs = {str(k+1): letters[k] for k in range(len(window))}
    slug = f"appariement-hy-{i//WINDOW+1:03d}"
    items.append({
        "slug": slug,
        "type": "APPARIEMENT",
        "gradingMode": "AUTO",
        "prompt": "Associez chaque mot français à sa traduction arménienne.",
        "payload": {"left": left, "right": right},
        "solution": {"pairs": pairs},
        "commentary": "Exercice bilingue — correspondances fr ↔ հայerën.",
        "groupSlug": window[0]['groupSlug'],
        "posClass": None,
        "source": "manuel",
        "reviewNeeded": False,
        "orderIndex": 0,
    })
    bi_count += 1

print(f"APPARIEMENT bilingue : {bi_count}")
print(f"Total items : {len(items)}")

with open('content/exercises-quiz.json', 'w', encoding='utf-8') as f:
    json.dump(items, f, ensure_ascii=False, indent=2)

print("OK content/exercises-quiz.json")
