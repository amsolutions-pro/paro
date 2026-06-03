# -*- coding: utf-8 -*-
"""
apply-dico.py — Étape finale : applique le dictionnaire réconcilié.
  1. Re-fusionne la famille émigr-/immigr- en un seul groupe (choix utilisateur).
  2. Complète le remap exercices (famille émigr + 2 typos préexistants).
  3. Écrit content/manual.json (backup .prereparse.bak) depuis manual.reconciled.json.
  4. Remappe groupSlug dans les 3 fichiers d'exercices (backups .prereparse.bak).
  5. Rapport final d'intégrité.
"""
import json, re, sys, unicodedata, shutil
from pathlib import Path
from collections import Counter

ROOT = Path(__file__).resolve().parent.parent
C = ROOT / "content"

def norm(s):
    s = unicodedata.normalize("NFD", s)
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z0-9]", "", s.lower())

def base(hw):
    return hw.split(",")[0].strip()

EMIGR = {"emigrer", "immigrer", "emigrant", "immigrant", "emigration", "immigration"}
EMIGR_ORDER = ["emigrer", "immigrer", "emigrant", "immigrant", "emigration", "immigration"]
EMIGR_SLUG = "emigrer-immigrer-emigrant-immigrant-emigration-immigration"

def main():
    rec = json.loads((C / "manual.reconciled.json").read_text(encoding="utf-8"))
    remap = json.loads((C / "_remap-exercises.json").read_text(encoding="utf-8"))

    # ── 1. Fusion famille émigr ──
    emigr_groups = [g for g in rec
                    if g["words"] and all(norm(base(w["headword"])) in EMIGR for w in g["words"])]
    if emigr_groups:
        merged_words, seen = [], set()
        for g in emigr_groups:
            for w in g["words"]:
                k = norm(base(w["headword"]))
                if k not in seen:
                    seen.add(k); merged_words.append(w)
        merged_words.sort(key=lambda w: EMIGR_ORDER.index(norm(base(w["headword"])))
                          if norm(base(w["headword"])) in EMIGR_ORDER else 99)
        merged = {
            "slug": EMIGR_SLUG,
            "title": "Émigr- & Immigr- (famille)",
            "letter": "E",
            "summary": ("La famille « émigr- / immigr- » oppose les préfixes é-/ex- « hors de » "
                        "(émigrer, émigrant, émigration : quitter son pays) et im-/in- « dans, vers » "
                        "(immigrer, immigrant, immigration : entrer dans un pays). Une même personne "
                        "est émigrant vu de son pays de départ et immigrant vu du pays d'accueil. "
                        "Ce groupe réunit le verbe, le nom de personne et le nom d'action."),
            "words": merged_words,
        }
        emigr_slugs = {g["slug"] for g in emigr_groups}
        rec = [g for g in rec if g["slug"] not in emigr_slugs]
        rec.append(merged)
        for s in emigr_slugs | {EMIGR_SLUG}:
            remap[s] = EMIGR_SLUG

    rec.sort(key=lambda g: (g.get("letter", ""), g.get("title", "")))
    final_slugs = {g["slug"] for g in rec}

    # ── 2. Remap des 2 typos préexistants ──
    def find_slug(sub):
        for s in final_slugs:
            if sub in s:
                return s
        return None
    typo = {
        "completage-complement-complementationetcompletude": find_slug("completage"),
        "rancune-rancur": find_slug("rancune"),
    }
    for k, v in typo.items():
        if v:
            remap[k] = v

    # ── 3. Écriture manual.json ──
    shutil.copyfile(C / "manual.json", C / "manual.json.prereparse.bak")
    (C / "manual.json").write_text(json.dumps(rec, ensure_ascii=False, indent=2) + "\n",
                                   encoding="utf-8")

    # ── 4. Remap exercices ──
    moved = 0
    for f in ["exercises.json", "exercises-quiz.json", "exercises-extra.json"]:
        p = C / f
        shutil.copyfile(p, p.with_suffix(p.suffix + ".prereparse.bak"))
        data = json.loads(p.read_text(encoding="utf-8"))
        for e in data:
            gs = e.get("groupSlug")
            if gs in remap and remap[gs] != gs:
                e["groupSlug"] = remap[gs]; moved += 1
        p.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    # ── 5. Rapport ──
    tot = none = resolved = 0
    orph = Counter()
    for f in ["exercises.json", "exercises-quiz.json", "exercises-extra.json"]:
        for e in json.loads((C / f).read_text(encoding="utf-8")):
            tot += 1
            gs = e.get("groupSlug")
            if gs is None:
                none += 1
            elif gs in final_slugs:
                resolved += 1
            else:
                orph[gs] += 1
    print(f"manual.json : {len(rec)} groupes / {sum(len(g['words']) for g in rec)} mots")
    print(f"exercices remappés : {moved}")
    print(f"EXERCICES : {tot} | None : {none} | résolus : {resolved} | orphelins : {sum(orph.values())}")
    for gs, n in orph.most_common():
        print(f"    {n}  {gs}")

if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    main()
