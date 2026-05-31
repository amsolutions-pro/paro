"""
Parse paronymes_lines.txt (extracted from .docx) and enrich manual.json
with full definitions, examples, and summaries.

Runs from the repo root:
    python scripts/enrich-from-docx.py
"""

import json
import re
import unicodedata
from pathlib import Path

LINES_FILE = Path("content/paronymes_lines.txt")
MANUAL_FILE = Path("content/manual.json")

ARMENIAN_RE = re.compile(r"[Ա-և]")
PAIR_HEADER_RE = re.compile(r"(?:&amp;|(?<!\w)&(?!\w))")
DEF_RE = re.compile(r"^Définition\s*:\s*(.*)", re.IGNORECASE)
EX_HEADER_RE = re.compile(r"^Exemples?\s+d.utilisation\s*:", re.IGNORECASE)


def has_armenian(s: str) -> bool:
    return bool(ARMENIAN_RE.search(s))


def is_pair_header(line: str) -> bool:
    """Line like 'Absorber &amp; Adsorber' or 'Accès &amp; Excès'."""
    return bool(PAIR_HEADER_RE.search(line)) and not has_armenian(line)


def split_pair_header(line: str) -> list[str]:
    """Return list of headwords from a pair/triplet header line."""
    line = line.replace("&amp;", "&")
    parts = re.split(r"\s*[&,]\s*", line)
    return [p.strip() for p in parts if p.strip()]


def slugify(words: list[str]) -> str:
    """Produce a slug matching manual.json convention."""
    parts = []
    for w in words:
        w = w.lower().strip()
        # Normalize accents to keep them (manual.json slugs keep accents)
        parts.append(w)
    return "-".join(parts)


def extract_word_and_category(line: str) -> tuple[str, str, str]:
    """
    From 'Absorber v.tr.կlanel, ...' → (headword, category, armenian)
    The Armenian portion starts at the first Armenian character.
    """
    m = ARMENIAN_RE.search(line)
    if not m:
        return line.strip(), "", ""
    prefix = line[: m.start()].strip()
    armenian = line[m.start() :].strip()
    # Split prefix into headword + category by known POS markers
    cat_m = re.search(
        r"\s+(v\.(?:tr|intr|pron)\.?|n\.?\s*[mf]\.?|adj\.?|adv\.?|m\.?\s*:?|f\.?\s*:?|prép\.?|conj\.?|loc\.?)",
        prefix,
        re.IGNORECASE,
    )
    if cat_m:
        headword = prefix[: cat_m.start()].strip()
        category = prefix[cat_m.start() :].strip().rstrip(".")
    else:
        # No recognised POS — whole prefix is the headword
        headword = prefix
        category = ""
    return headword, category, armenian


# ---------------------------------------------------------------------------
# Parse the lines file into a list of pair dicts
# ---------------------------------------------------------------------------

def parse_lines(path: Path) -> list[dict]:
    lines = path.read_text(encoding="utf-8-sig").splitlines()
    lines = [l.replace("\xa0", " ").strip() for l in lines if l.strip()]

    pairs: list[dict] = []
    current_pair: dict | None = None
    current_word: dict | None = None
    state = "scanning"  # scanning | in_def | in_examples | between_words

    def close_word():
        nonlocal current_word
        if current_word and current_pair is not None:
            current_pair["words"].append(current_word)
            current_word = None

    def close_pair():
        nonlocal current_pair
        if current_pair:
            close_word()
            pairs.append(current_pair)
            current_pair = None

    for line in lines:
        # --- Pair header? ---
        if is_pair_header(line):
            close_pair()
            headwords = split_pair_header(line)
            slug = slugify(headwords)
            current_pair = {
                "slug": slug,
                "headwords": headwords,
                "words": [],
                "summary_lines": [],
            }
            state = "between_words"
            continue

        if current_pair is None:
            continue

        # --- Definition header ---
        dm = DEF_RE.match(line)
        if dm:
            if current_word is not None:
                tail = dm.group(1).strip()
                current_word["def_lines"] = [tail] if tail else []
                state = "in_def"
            continue

        # --- Examples header ---
        if EX_HEADER_RE.match(line):
            state = "in_examples"
            continue

        # --- Word line (contains Armenian) ---
        if has_armenian(line) and state in ("between_words", "in_examples", "in_def"):
            # Could be a word line or just Armenian text in a summary
            # Heuristic: word lines start with an uppercase French word + POS marker
            headword_candidate = line.split()[0] if line.split() else ""
            looks_like_word = (
                bool(re.match(r"^[A-ZÀ-Ö]{1}", headword_candidate))
                and len(headword_candidate) > 1
            )
            if looks_like_word and current_pair is not None:
                close_word()
                hw, cat, arm = extract_word_and_category(line)
                current_word = {
                    "headword": hw,
                    "category": cat,
                    "armenian": arm,
                    "def_lines": [],
                    "examples": [],
                }
                state = "between_words"
                continue

        # --- Dispatch by state ---
        if state == "in_def" and current_word is not None:
            # Continuation line of definition (no special marker)
            # Stop if it looks like an example or a new section
            current_word["def_lines"].append(line)
            # If line ends with a full sentence, definition is complete
            if line.rstrip().endswith(".") or line.rstrip().endswith("»"):
                state = "between_words"
            continue

        if state == "in_examples" and current_word is not None:
            # A trailing comparative paragraph mentioning ≥2 of the pair's
            # headwords is the synthesis ("Le bon usage"), not an example.
            hw_hits = sum(
                1
                for hw in current_pair["headwords"]
                if re.search(r"\b" + re.escape(hw.lower()) + r"\b", line.lower())
            )
            if hw_hits >= 2 or len(line) > 180:
                current_pair["summary_lines"].append(line)
                state = "between_words"
            else:
                current_word["examples"].append(line)
            continue

        # --- Anything else after all words = summary candidate ---
        if state in ("in_examples", "between_words") and current_word is not None:
            current_pair["summary_lines"].append(line)
            state = "between_words"
            continue

    close_pair()
    return pairs


# ---------------------------------------------------------------------------
# Match parsed pairs to manual.json and enrich
# ---------------------------------------------------------------------------

def normalize(s: str) -> str:
    s = s.lower().strip()
    s = unicodedata.normalize("NFD", s)
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    s = re.sub(r"[^a-z0-9]", "", s)
    return s


def match_pairs_to_groups(pair: dict, groups: list[dict]) -> list[dict]:
    """Find ALL manual.json groups matching this pair (handles duplicates)."""
    p_slug_norm = normalize(pair["slug"])
    p_hw = normalize(pair["headwords"][0]) if pair["headwords"] else ""
    out = []
    for g in groups:
        if normalize(g["slug"]) == p_slug_norm:
            out.append(g)
        elif g["words"] and normalize(g["words"][0]["headword"]) == p_hw:
            out.append(g)
    return out


def merge(groups: list[dict], pairs: list[dict]) -> tuple[int, int]:
    """Enrich groups in-place. Returns (matched, skipped)."""
    matched = 0
    skipped = 0

    for pair in pairs:
        matching = match_pairs_to_groups(pair, groups)
        if not matching:
            skipped += 1
            continue
        matched += 1

      # Enrich every matching group (duplicates included)
        for group in matching:
            _enrich_group(group, pair)

    return matched, skipped


def _enrich_group(group: dict, pair: dict) -> None:
        # Update summary (Le bon usage) if the docx has a richer one
        docx_summary = " ".join(pair["summary_lines"]).strip()
        if docx_summary and len(docx_summary) > len(group.get("summary", "")):
            group["summary"] = docx_summary

        # Update word definitions and examples
        for pw in pair["words"]:
            pw_hw_norm = normalize(pw["headword"])
            for gw in group["words"]:
                if normalize(gw["headword"]) == pw_hw_norm:
                    docx_def = " ".join(pw["def_lines"]).strip()
                    if docx_def and len(docx_def) > len(gw.get("definition", "")):
                        gw["definition"] = docx_def
                    if pw["examples"] and len(pw["examples"]) > len(gw.get("examples", [])):
                        gw["examples"] = pw["examples"]
                    break


def main():
    print("Parsing docx lines...")
    pairs = parse_lines(LINES_FILE)
    print(f"  Parsed {len(pairs)} pairs from docx")

    print("Loading manual.json...")
    groups = json.loads(MANUAL_FILE.read_text(encoding="utf-8"))
    print(f"  {len(groups)} groups in manual.json")

    matched, skipped = merge(groups, pairs)
    print(f"  Matched: {matched}  /  Not found in manual: {skipped}")

    MANUAL_FILE.write_text(
        json.dumps(groups, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print("  manual.json updated.")

    # Show a sample
    for g in groups[:2]:
        print(f"\n--- {g['slug']} ---")
        print(f"  summary: {g['summary'][:120]}")
        for w in g["words"]:
            print(f"  {w['headword']}: {w['definition'][:100]}")
            for ex in w["examples"][:2]:
                print(f"    - {ex[:80]}")


if __name__ == "__main__":
    main()
