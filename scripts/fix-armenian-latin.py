# -*- coding: utf-8 -*-
"""
1. Applique l'armenien correct du fichier source pour les mots qui y figurent.
2. Pour les mots absents du source dont la traduction est une translitteration
   latine inventee : vide le champ + marque reviewNeeded=True + autoFilled=True
   pour que l'interface les affiche en rouge.
"""
import json, re

with open("C:/Users/melik/.paro/content/_extracted/alpha_parsed.json", "r", encoding="utf-8") as f:
    src = json.load(f)

# Armenian extraite du document source (pas de translitteration latine)
SOURCE_HY = {
    k: v["hy"]
    for k, v in src.items()
    if v.get("hy") and not re.search(r"[a-z]{4,}", v["hy"])
}

def is_latin_translit(s: str) -> bool:
    """True si la chaine contient surtout de la translitteration latine."""
    if not s:
        return False
    latin_chars = len(re.findall(r"[a-zA-Z]", s))
    total_chars = len(re.sub(r"\s", "", s))
    return total_chars > 3 and latin_chars / total_chars > 0.4

with open("C:/Users/melik/.paro/content/manual.json", "r", encoding="utf-8") as f:
    manual = json.load(f)

fixed_from_source = 0
cleared_as_review = 0

for g in manual:
    for w in g["words"]:
        key = w["headword"].lower()
        hy = w.get("translationHy", "")

        if not is_latin_translit(hy):
            continue  # armenien correct ou vide, rien a faire

        if key in SOURCE_HY:
            # Remplacement par l'armenien verifie du document source
            w["translationHy"] = SOURCE_HY[key]
            w.pop("autoFilled", None)
            w.pop("reviewNeeded", None)
            fixed_from_source += 1
        else:
            # Pas de source : vider + marquer pour revision humaine
            w["translationHy"] = ""
            w["autoFilled"] = True
            w["reviewNeeded"] = True
            cleared_as_review += 1

with open("C:/Users/melik/.paro/content/manual.json", "w", encoding="utf-8") as f:
    json.dump(manual, f, ensure_ascii=False, indent=2)

print(f"Corriges depuis source : {fixed_from_source}")
print(f"Vides (a completer) : {cleared_as_review}")

# Rapport final
auto_review = [(w["headword"], g["title"]) for g in manual for w in g["words"]
               if w.get("autoFilled") or w.get("reviewNeeded")]
print(f"\nFiches a verifier ({len(auto_review)}) :")
for h, gt in auto_review:
    print(f"  {h} [{gt}]")
