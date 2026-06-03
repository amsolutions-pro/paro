# -*- coding: utf-8 -*-
"""
reparse-dico.py — Re-extraction propre du dictionnaire depuis paronymes_lines.txt.

Corrige les corruptions du parser v2/v3 :
  - titres volés / qui ne correspondent pas aux mots
  - groupes agglomérés (plusieurs paires fusionnées)
  - définitions tronquées
  - exemples disparus ("d'utilisation :")

Stratégie : on ANCRE le découpage sur les lignes-titres de la source
("X & Y", "X, Y et Z"), puis pour chaque membre du titre on retrouve son
bloc (ligne-vedette contenant l'arménien) et on en extrait définition,
exemples, traduction, catégorie, origine, synonymes.

Sortie : content/manual.rebuilt.json  (n'écrase PAS manual.json).
"""
import json, re, sys, unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "content" / "paronymes_lines.txt"
OUT = ROOT / "content" / "manual.rebuilt.json"

ARM = re.compile(r"[Ա-Ֆա-և]")  # lettres arméniennes
MARKERS = ("Définition", "Signification", "Exemples", "Origine", "Synonymes",
           "Formes", "NB", "Lexique", "Paronymes :")
DEF_MARK = re.compile(r"^\s*(Définition|Signification)\s*:?\s*", re.I)
EX_MARK = re.compile(r"^\s*Exemples?(\s+d.?utilisation)?\s*:?\s*", re.I)
ORI_MARK = re.compile(r"^\s*Origine\s*:?\s*", re.I)
SYN_MARK = re.compile(r"^\s*Synonymes?\s*:?\s*", re.I)
TERM = ("。", ".", "!", "?", "…", "»", '"', ":")
COMMENT_START = ("Bien que", "Il est important", "En somme", "Comprendre ces",
                 "Ces deux", "Ces trois", "Attention", "Les deux", "Les trois")

POS_MAP = [
    (re.compile(r"\bv\b"), "VERBE"),
    (re.compile(r"\badj"), "ADJECTIF"),
    (re.compile(r"\bn\.?\s*f|^\s*f\b|\bf\."), "NOM_F"),
    (re.compile(r"\bn\.?\s*m|^\s*m\b|\bm\."), "NOM_M"),
    (re.compile(r"\badv"), "AUTRE"),
]

def strip_html(s: str) -> str:
    return s.replace("&amp;", "&").replace("\xa0", " ").strip()

def norm(s: str) -> str:
    s = unicodedata.normalize("NFD", s)
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z0-9]", "", s.lower())

def slugify(name: str) -> str:
    s = name.replace("œ", "oe").replace("Œ", "OE").replace("æ", "ae").replace("Æ", "AE")
    s = unicodedata.normalize("NFD", s)
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    s = re.sub(r"[^a-zA-Z0-9]+", "-", s.lower()).strip("-")
    return s

def is_title(l: str) -> bool:
    l = strip_html(l)
    if not l or ARM.search(l):
        return False
    if len(l) > 70 or l.endswith("."):
        return False
    if any(l.startswith(m) for m in MARKERS):
        return False
    if not re.match(r"^[A-ZÉÈÀÂÎÔÛÇ]", l):
        return False
    if l.startswith(("Le ", "La ", "Les ", "Un ", "Une ", "Paronymes")):
        return False
    has_sep = ("&" in l) or (re.search(r"\bet\b", l) and re.search(r"[A-ZÉ][a-zé]", l)) \
        or ("," in l and len(re.findall(r"[A-ZÉ][a-zéèêà]+", l)) >= 2)
    return has_sep and len(l.split()) <= 8

def title_members(title: str):
    t = strip_html(title)
    # retirer annotations parasites
    t = re.sub(r"\b(homophone|semi-synonymes?|paronymes?)\b", "", t, flags=re.I)
    t = re.sub(r"\([^)]*\)", "", t)
    parts = re.split(r"&|\bet\b|,", t)
    out = []
    for p in parts:
        p = p.strip(" .:-—")
        if p and norm(p):
            out.append(p)
    return out

def parse_pos(cat: str) -> str:
    c = cat.lower()
    for pat, pos in POS_MAP:
        if pat.search(c):
            return pos
    return "AUTRE"

def main():
    lines = SRC.read_text(encoding="utf-8-sig").splitlines()
    start = next(i for i, l in enumerate(lines) if l.strip() == "A")

    # Pass 1 — repérer les titres (positions)
    titles = [(i, strip_html(l)) for i, l in enumerate(lines)
              if i >= start and is_title(l)]

    groups = []
    seen_slugs = {}
    for idx, (li, title) in enumerate(titles):
        end = titles[idx + 1][0] if idx + 1 < len(titles) else len(lines)
        region = lines[li + 1:end]
        members = title_members(title)
        if not members:
            continue

        # localiser la ligne-vedette de chaque membre (contient l'arménien)
        anchors = []  # (offset_in_region, member_display)
        for off, raw in enumerate(region):
            l = strip_html(raw)
            if not ARM.search(l):
                continue
            for m in members:
                if norm(l).startswith(norm(m)) and not any(a[1] == m for a in anchors):
                    anchors.append((off, m))
                    break
        anchors.sort()
        if not anchors:
            continue

        words = []
        for ai, (off, mname) in enumerate(anchors):
            wend = anchors[ai + 1][0] if ai + 1 < len(anchors) else len(region)
            block = [strip_html(x) for x in region[off:wend]]
            head_line = block[0]
            m = ARM.search(head_line)
            before = head_line[:m.start()].strip() if m else head_line
            arm_part = head_line[m.start():].strip() if m else ""
            translation = re.sub(r"\s+", " ", arm_part).strip(" :,")

            # Séparer : headword (orthographe du titre) + suffixe féminin + catégorie.
            # Formes source : "Éminent, ente adj", "Affectif (ve) adj.", "Accès m. :", "Absorber v.tr."
            b = before
            fem = None
            pg = re.search(r"\(([a-zàâèéêîïôûüç]{1,5})\)", b)   # genre entre parenthèses
            if pg:
                fem = pg.group(1)
                b = (b[:pg.start()] + " " + b[pg.end():]).strip()
            cm = re.match(r"^(.+?),\s*([a-zàâèéêîïôûüç]{1,5})\b\s*(.*)$", b)  # "base, ente cat"
            if cm:
                fem = fem or cm.group(2)
                cat = cm.group(3)
            else:
                cm2 = re.match(r"^(.+?)\s+((?:loc\.?\s*)?(?:n\.?\s*)?(?:v|adj|adv|loc|m|f|n)\b.*)$", b)
                cat = cm2.group(2) if cm2 else ""
            if not (cat or "").strip():
                # catégorie collée ou en fin de ligne ("Excèsm. :", "Cane f.")
                mtail = re.search(
                    r"(v\.?\s*(?:tr|intr|pr)\.?|n\.?\s*[mf]\.?|adj|adv|loc|[mfn])\s*\.?\s*:?\s*$",
                    b, re.I)
                if mtail:
                    cat = mtail.group(1)
            headword = mname + ((", " + fem) if fem else "")
            cat = re.sub(r"\s+", " ", cat or "").strip(" .:,")
            cat = re.sub(r"\bv\.?\s*tr\b", "v. tr.", cat)
            cat = re.sub(r"\bv\.?\s*intr\b", "v. intr.", cat)

            # parcourir le bloc pour def / exemples / origine / synonymes
            definition, examples, origin, synonyms = "", [], None, None
            mode = None
            buf = []
            def flush_def():
                nonlocal definition
                if buf:
                    definition = " ".join(buf).strip()
            i = 1
            while i < len(block):
                line = block[i]
                if DEF_MARK.match(line):
                    if mode == "def":
                        flush_def(); buf.clear()
                    mode = "def"; buf = [DEF_MARK.sub("", line).strip()]
                elif EX_MARK.match(line):
                    if mode == "def":
                        flush_def(); buf.clear()
                    mode = "ex"
                    rest = EX_MARK.sub("", line).strip()
                    if rest:
                        examples.append(rest)
                elif ORI_MARK.match(line):
                    if mode == "def":
                        flush_def(); buf.clear()
                    mode = "ori"; origin = ORI_MARK.sub("", line).strip()
                elif SYN_MARK.match(line):
                    mode = "syn"; synonyms = SYN_MARK.sub("", line).strip()
                else:
                    if line.startswith(COMMENT_START):
                        mode = "comment"
                    if mode == "def":
                        buf.append(line)
                    elif mode == "ex":
                        examples.append(line)
                    elif mode == "ori" and origin is not None:
                        origin += " " + line
                    elif mode == "syn" and synonyms is not None:
                        synonyms += " " + line
                i += 1
            if mode == "def":
                flush_def()

            # fusionner les exemples coupés par retour à la ligne
            merged = []
            for ex in examples:
                if merged and not merged[-1].rstrip().endswith(TERM):
                    merged[-1] = (merged[-1].rstrip() + " " + ex.strip()).strip()
                else:
                    merged.append(ex.strip())
            examples = [e for e in merged if e and not e.startswith(COMMENT_START)]

            words.append({
                "headword": headword,
                "category": cat or "",
                "posClass": parse_pos(cat),
                "translationHy": translation,
                "definition": definition,
                **({"origin": origin} if origin else {}),
                **({"synonyms": synonyms} if synonyms else {}),
                "examples": examples,
                "reviewNeeded": not bool(examples and definition),
                "autoFilled": False,
            })

        if len(words) < 2:
            continue  # parse incomplet (membre introuvable) — écarté

        # résumé = commentaire final "Bien que..." du dernier bloc
        summary = ""
        tail = [strip_html(x) for x in region]
        for x in tail:
            if x.startswith(COMMENT_START):
                summary = x
        # slug + titre basés sur la forme DE BASE (sans suffixe féminin), comme l'existant
        def base(hw):
            return hw.split(",")[0].strip()
        slug = "-".join(slugify(base(w["headword"])) for w in words)
        if not slug:
            continue
        letter = unicodedata.normalize("NFD", base(words[0]["headword"])[0])[0].upper()
        groups.append({
            "slug": slug,
            "title": " & ".join(base(w["headword"]) for w in words),
            "letter": letter,
            "summary": summary,
            "words": words,
        })

    # Dédup par slug (le source répète certains groupes) : garder le plus riche.
    def richness(g):
        full = sum(1 for w in g["words"] if w["definition"] and w["examples"])
        exs = sum(len(w["examples"]) for w in g["words"])
        return (full, exs, len(g["words"]))
    def keyset(g):
        return frozenset(norm(w["headword"].split(",")[0].strip()) for w in g["words"])
    best = {}
    for g in groups:
        k = keyset(g)
        if k not in best or richness(g) > richness(best[k]):
            best[k] = g
    groups = list(best.values())

    OUT.write_text(json.dumps(groups, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    # ── stats ──
    nwords = sum(len(g["words"]) for g in groups)
    no_ex = sum(1 for g in groups for w in g["words"] if not w["examples"])
    no_def = sum(1 for g in groups for w in g["words"] if not w["definition"])
    trunc = sum(1 for g in groups for w in g["words"]
                if w["definition"] and not w["definition"].rstrip().endswith(TERM))
    print(f"groupes={len(groups)}  mots={nwords}")
    print(f"  mots sans exemple : {no_ex}")
    print(f"  mots sans définition : {no_def}")
    print(f"  définitions tronquées : {trunc}")

if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    main()
