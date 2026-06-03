# -*- coding: utf-8 -*-
"""
reconcile-dico.py — Fusionne le contenu propre (manual.rebuilt.json) dans
l'existant (manual.json) SANS casser les liens d'exercices.

Principe :
  - matching par ENSEMBLE de mots de base (insensible à l'ordre), pas par slug.
  - si un groupe rebuild a le même ensemble qu'un groupe existant → on prend le
    contenu rebuild (riche) mais on GARDE le slug existant (stabilité exercices).
  - groupe existant sans contrepartie mais dont tous les mots sont couverts par
    le rebuild (cas agglo/arité) → supprimé, ses exercices sont remappés.
  - groupe existant non couvert (curaté, absent du docx) → conservé tel quel.
  - groupe rebuild inédit → ajouté.

Sortie : content/manual.reconciled.json + content/_remap-exercises.json
(n'écrase ni manual.json ni les exercices).
"""
import json, re, sys, unicodedata
from pathlib import Path
from collections import defaultdict

ROOT = Path(__file__).resolve().parent.parent
C = ROOT / "content"

def norm(s):
    s = unicodedata.normalize("NFD", s)
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z0-9]", "", s.lower())

def base(hw):
    return hw.split(",")[0].strip()

def wset(g):
    return frozenset(norm(base(w["headword"])) for w in g["words"])

def slugify(name):
    s = name.replace("œ", "oe").replace("Œ", "OE").replace("æ", "ae").replace("Æ", "AE")
    s = unicodedata.normalize("NFD", s)
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-zA-Z0-9]+", "-", s.lower()).strip("-")

def ttok(t):
    t = re.sub(r"\([^)]*\)", "", t)
    return set(norm(p) for p in re.split(r"&|/|,| et ", t) if norm(p))

def hwset(g):
    return set(norm(base(w["headword"])) for w in g["words"])

JUNK = re.compile(r"^\s*(exemples?\s*)?d.?utilisation\s*:?\s*$|^\s*:?\s*$", re.I)

def main():
    existing = json.loads((C / "manual.json").read_text(encoding="utf-8"))
    rebuild = json.loads((C / "manual.rebuilt.json").read_text(encoding="utf-8"))

    exist_by_set = defaultdict(list)
    for g in existing:
        exist_by_set[wset(g)].append(g)

    final = []
    remap = {}            # ancien groupSlug d'exercice -> nouveau slug
    used_exist = set()

    # 1) Groupes rebuild : réutiliser le slug existant si même ensemble de mots
    for rg in rebuild:
        s = wset(rg)
        match = exist_by_set.get(s)
        if match:
            eg = match.pop(0)
            used_exist.add(id(eg))
            slug = eg["slug"]                       # slug stable
            if rg["slug"] != slug:
                remap[rg["slug"]] = slug
            g = {**rg, "slug": slug}
            # backfill catégorie/posClass depuis l'existant si le rebuild est vide
            # (NB : on ne reprend JAMAIS le résumé existant — certains sont corrompus)
            ex_by_hw = {norm(base(w["headword"])): w for w in eg["words"]}
            for w in g["words"]:
                ew = ex_by_hw.get(norm(base(w["headword"])))
                if ew and not (w.get("category") or "").strip() and (ew.get("category") or "").strip():
                    w["category"] = ew["category"]
                    w["posClass"] = ew.get("posClass", w.get("posClass"))
            final.append(g)
        else:
            final.append(rg)

    final_sets = [wset(g) for g in final]
    slug_of_word = {}
    for g in final:
        for w in g["words"]:
            slug_of_word.setdefault(norm(base(w["headword"])), g["slug"])

    # 2) Groupes existants non appariés
    covered_words = set().union(*final_sets) if final_sets else set()
    kept_curated = salvaged = 0
    for g in existing:
        if id(g) in used_exist:
            continue
        covered = all(w in covered_words for w in wset(g))
        title_ok = (ttok(g["title"]) == hwset(g))
        if covered:
            # agglo/arité : tout est couvert par des groupes propres → remap exercices
            target = slug_of_word.get(norm(base(g["words"][0]["headword"])), g["slug"])
            remap[g["slug"]] = target
        elif title_ok:
            final.append(g)                          # curaté légitime (hors docx)
            kept_curated += 1
        else:
            # groupe CORROMPU (titre volé/agglo) partiellement couvert :
            # sauver les vraies paires uniques (mots non couverts), sinon supprimer.
            uncovered = [w for w in g["words"]
                         if norm(base(w["headword"])) not in covered_words]
            if len(uncovered) >= 2:
                nslug = "-".join(slugify(base(w["headword"])) for w in uncovered)
                ng = {
                    "slug": nslug,
                    "title": " & ".join(base(w["headword"]) for w in uncovered),
                    "letter": unicodedata.normalize("NFD", base(uncovered[0]["headword"])[0])[0].upper(),
                    "summary": "",                   # régénéré par la passe de conformité
                    "words": uncovered,
                }
                remap[g["slug"]] = nslug
                final.append(ng)
                salvaged += 1
                for w in uncovered:
                    slug_of_word.setdefault(norm(base(w["headword"])), nslug)
            else:
                target = None
                for w in g["words"]:
                    target = slug_of_word.get(norm(base(w["headword"])))
                    if target:
                        break
                remap[g["slug"]] = target or g["slug"]

    # Passe de conformité au schéma Zod (category/definition/summary non vides).
    POSCAT = {"VERBE": "v.", "NOM_M": "m.", "NOM_F": "f.", "ADJECTIF": "adj.", "AUTRE": "loc."}
    for g in final:
        if not (g.get("summary") or "").strip():
            hw = [base(w["headword"]) for w in g["words"]]
            g["summary"] = ("« " + " » et « ".join(hw)
                            + " » sont des paronymes : des mots de forme proche mais de sens distincts.")
        for w in g["words"]:
            # purge des exemples-junk ("d'utilisation :", ":") hérités de l'ancien parser
            w["examples"] = [e for e in (w.get("examples") or []) if e and not JUNK.match(e)]
            if not (w.get("category") or "").strip():
                w["category"] = POSCAT.get(w.get("posClass", "AUTRE"), "loc.")
                w["reviewNeeded"] = True
            if not (w.get("definition") or "").strip():
                w["definition"] = "(définition à compléter)"
                w["reviewNeeded"] = True
            if not w.get("examples"):
                w["reviewNeeded"] = True
    final = [g for g in final if len(g["words"]) >= 2]

    # tri par lettre puis titre (cohérent avec l'API)
    final.sort(key=lambda g: (g.get("letter", ""), g.get("title", "")))

    (C / "manual.reconciled.json").write_text(
        json.dumps(final, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (C / "_remap-exercises.json").write_text(
        json.dumps(remap, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    # ── reconcil. exercices : appliquer remap puis compter les orphelins ──
    final_slugs = {g["slug"] for g in final}
    # remap supplémentaire par ensemble de mots pour les exercices encore orphelins
    set_to_slug = {}
    for g in final:
        set_to_slug[wset(g)] = g["slug"]
    word_to_slug = slug_of_word

    from collections import Counter
    tot = none = resolved = 0
    orph = Counter()
    for f in ["exercises.json", "exercises-quiz.json", "exercises-extra.json"]:
        for e in json.loads((C / f).read_text(encoding="utf-8")):
            tot += 1
            gs = e.get("groupSlug")
            if gs is None:
                none += 1; continue
            gs2 = remap.get(gs, gs)
            if gs2 in final_slugs:
                resolved += 1
            else:
                orph[gs] += 1

    nwords = sum(len(g["words"]) for g in final)
    no_ex = sum(1 for g in final for w in g["words"] if not w.get("examples"))
    print(f"RÉCONCILIÉ : {len(final)} groupes / {nwords} mots")
    print(f"  groupes curatés conservés (hors docx) : {kept_curated}")
    print(f"  paires sauvées de groupes corrompus : {salvaged}")
    print(f"  mots sans exemple : {no_ex}")
    print(f"  entrées de remap exercices : {len(remap)}")
    print(f"EXERCICES : {tot} | None : {none} | résolus : {resolved} | orphelins : {sum(orph.values())}")
    for gs, n in orph.most_common(25):
        print(f"    {n:3}  {gs}")

if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    main()
