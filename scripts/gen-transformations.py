# -*- coding: utf-8 -*-
"""
gen-transformations.py — Complète la typologie TRANSFORMATION (3 items seulement)
en générant des exercices depuis les paires propres de manual.json.

Format calé sur les items existants (tran-8) :
  prompt   : De « <from> » : son paronyme signifiant « <glose de la cible> ».
  payload  : { from: <from> }
  solution : { answer: <cible>, accentSensitive: false }
Génère les DEUX sens (A→B et B→A). Ajout dans exercises-extra.json
(source "generated", reviewNeeded true). Cible : ~50 au total.
"""
import json, re, sys, unicodedata, shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
C = ROOT / "content"
TARGET_TOTAL = 50
PLACEHOLDER = "(définition à compléter)"

def baseword(hw):
    return hw.split(",")[0].strip()

def gloss(w):
    """Glose concise = définition de la cible, débarrassée de l'amorce et du mot-réponse."""
    d = (w.get("definition") or "").strip()
    hw = baseword(w["headword"])
    # 1) amorces "Le terme « X »", "L'adjectif X", article + tête
    d = re.sub(r"^(?:le terme|le mot|l[\'’]adjectif|le verbe|le nom)\s*[«\"]?\s*" + re.escape(hw)
               + r"\s*[»\"]?\s*", "", d, flags=re.I)
    d = re.sub(r"^[«\"]?\s*" + re.escape(hw) + r"\s*[»\"]?\s*", "", d, flags=re.I)
    d = re.sub(r"^(?:un|une|le|la|les|l[\'’]|des|du)\s+" + re.escape(hw) + r"\b\s*", "", d, flags=re.I)
    d = re.sub(r"^,?\s*(?:e|ente|euse|ale|elle|ive|trice|ne)\b\s*", "", d, flags=re.I)
    # 2) verbes d'amorce
    d = re.sub(r"^(?:est|qualifie|signifie|désigne|se réfère à|se rapporte à|"
               r"fait référence à|décrit|caractérise|renvoie à|correspond à|exprime|"
               r"indique|consiste à|consiste en)\b\s*", "", d, flags=re.I)
    d = re.sub(r"^(?:l[\'’]action de|le fait de|l[\'’]état de|action de|fait de)\s*", "", d, flags=re.I)
    # 3) première phrase + ~16 mots
    d = re.split(r"(?<=[.;])\s", d)[0]
    words = d.split()
    if len(words) > 16:
        d = " ".join(words[:16]) + "…"
    # 4) caviarder toute occurrence du mot-réponse (anti-divulgation)
    d = re.sub(r"\b" + re.escape(hw) + r"\w*", "…", d, flags=re.I)
    d = d.strip(" .;,:")
    return (d[0].lower() + d[1:]) if d else ""

def main():
    manual = json.loads((C / "manual.json").read_text(encoding="utf-8"))
    extra_path = C / "exercises-extra.json"
    extra = json.loads(extra_path.read_text(encoding="utf-8"))

    # compter les TRANSFORMATION déjà présents (tous fichiers) + slugs pris
    taken = set()
    existing_tr = 0
    for f in ["exercises.json", "exercises-quiz.json", "exercises-extra.json"]:
        for e in json.loads((C / f).read_text(encoding="utf-8")):
            taken.add(e["slug"])
            if e.get("type") == "TRANSFORMATION":
                existing_tr += 1

    need = max(0, TARGET_TOTAL - existing_tr)
    pairs = [g for g in manual if len(g["words"]) == 2]

    generated = []
    n = 0
    for g in pairs:
        if len(generated) >= need:
            break
        a, b = g["words"]
        for src, tgt in [(a, b), (b, a)]:
            if len(generated) >= need:
                break
            if (tgt.get("definition") or "") in ("", PLACEHOLDER):
                continue
            gl = gloss(tgt)
            if len(gl) < 8:                       # glose trop pauvre → on saute
                continue
            n += 1
            slug = f"transformation-gen-{n}"
            while slug in taken:
                n += 1
                slug = f"transformation-gen-{n}"
            taken.add(slug)
            generated.append({
                "slug": slug,
                "type": "TRANSFORMATION",
                "gradingMode": "AUTO",
                "prompt": f"De « {baseword(src['headword']).lower()} » : son paronyme signifiant « {gl} ».",
                "payload": {"from": baseword(src["headword"]).lower()},
                "solution": {"answer": baseword(tgt["headword"]).lower(), "accentSensitive": False},
                "commentary": f"{baseword(tgt['headword'])} — {tgt['definition']}",
                "groupSlug": g["slug"],
                "posClass": tgt.get("posClass"),
                "source": "generated",
                "reviewNeeded": True,
                "orderIndex": existing_tr + len(generated) + 1,
            })

    shutil.copyfile(extra_path, str(extra_path) + ".pretransfo.bak")
    extra.extend(generated)
    extra_path.write_text(json.dumps(extra, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    sys.stdout.reconfigure(encoding="utf-8")
    print(f"TRANSFORMATION existants : {existing_tr} | générés : {len(generated)} | total : {existing_tr + len(generated)}")
    for e in generated[:6]:
        print("  ex:", e["prompt"], "=>", e["solution"]["answer"])

if __name__ == "__main__":
    main()
