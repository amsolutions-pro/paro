"""
Extraction de TOUS les exemples du fichier source alphabétiques.
Stratégie : split par double-newline, chercher blocs par mot.
"""
import re
import json

SOURCE = "C:/Users/melik/.paro/content/_extracted/Paronymes alphabétiques.docx.txt"

with open(SOURCE, "r", encoding="utf-8") as f:
    raw = f.read()

paras = [p.strip() for p in re.split(r"\n{2,}", raw) if p.strip()]

CAT = r"(?:\s+(?:v\.?\s*tr\.?|v\.?\s*intr\.?|v\.|n\.?\s*m\.?|n\.?\s*f\.?|m\.|f\.|adj\.|adv\.)[\s:,]*)?"

word_data: dict[str, dict] = {}

i = 0
while i < len(paras):
    p = paras[i]

    # Word entry: has tab AND starts with capital AND not a label
    if "\t" in p and len(p) < 300:
        before_tab = p[:p.index("\t")].strip()
        after_tab = p[p.index("\t"):].strip()

        # Skip if starts with a label word
        if re.match(r"^(D[ée]finition|Exemple|Note|NB|Bien |En |Il |Ce |adj\.|v\.|m\.|f\.)", before_tab, re.IGNORECASE):
            i += 1
            continue

        if not re.match(r"^[A-ZÀ-Ý]", before_tab) or len(before_tab) > 60:
            i += 1
            continue

        # Extract word (strip category)
        word_clean = re.sub(CAT + r"\s*$", "", before_tab, flags=re.IGNORECASE).strip().rstrip(" ,;:")
        if len(word_clean) < 2:
            i += 1
            continue

        key = word_clean.lower()
        entry = word_data.get(key, {"hy": "", "definition": "", "examples": []})

        if after_tab and not entry["hy"]:
            hy = re.sub(r"^\s*(?:adj\.|m\.|f\.|v\.tr\.?)\s*", "", after_tab).strip()
            entry["hy"] = hy

        # Look ahead for definition + examples (up to next word entry)
        j = i + 1
        while j < min(i + 60, len(paras)):
            np = paras[j]

            # Detect start of next word entry (capital + tab, not a label)
            if "\t" in np and len(np) < 300:
                bt = np[:np.index("\t")].strip()
                if (re.match(r"^[A-ZÀ-Ý]", bt) and len(bt) < 60
                        and not re.match(r"^(D[ée]finition|Exemple|adj\.|v\.|m\.|f\.)", bt, re.IGNORECASE)):
                    break

            # Definition (may have tab)
            np_notab = np.replace("\t", " ").strip()
            if re.match(r"^D[ée]finition\s*:", np_notab, re.IGNORECASE) and not entry["definition"]:
                defn = re.sub(r"^D[ée]finition\s*:\s*", "", np_notab, flags=re.IGNORECASE).strip()
                # Continuation paras
                k = j + 1
                while k < min(j + 6, len(paras)):
                    nxt = paras[k]
                    if "\t" in nxt or re.match(r"^(Exemple|Bien |D[ée]finition)", nxt, re.IGNORECASE):
                        break
                    if 5 < len(nxt) < 400:
                        defn += " " + nxt.strip()
                        j = k
                    else:
                        break
                    k += 1
                entry["definition"] = defn.strip()

            # Examples section — all label variants:
            # "Exemples d'utilisation :", "Exemples :", "Exemple d'utilisation :"
            # Also handle inline: "Exemples : \t text"
            elif re.match(r"^Exemples?", np_notab, re.IGNORECASE):
                existing = set(entry["examples"])
                new_ex: list[str] = []

                # Inline text after label — strip everything up to and including ':'
                inline = re.sub(r"^Exemples?[^:]*:\s*", "", np_notab, flags=re.IGNORECASE).strip()
                inline = re.sub(r"\s*\([^)]{1,80}\)\s*$", "", inline).strip()
                if inline and len(inline) > 12 and inline not in existing:
                    new_ex.append(inline)
                    existing.add(inline)

                # Following example paragraphs
                k = j + 1
                while k < min(j + 60, len(paras)):
                    ep_raw = paras[k]
                    ep = ep_raw.lstrip("\t").strip()  # strip leading tab indentation

                    # Stop at next word entry
                    if "\t" in ep_raw and len(ep_raw) < 300:
                        bt = ep_raw[:ep_raw.index("\t")].strip()
                        if (re.match(r"^[A-ZÀ-Ý]", bt) and len(bt) < 60
                                and not re.match(r"^(D[ée]finition|Exemple|adj\.|v\.|m\.|f\.)", bt, re.IGNORECASE)):
                            break

                    # Stop at conclusion paragraph
                    if re.match(r"^(Bien que|En comprenant|Pour conclure)", ep, re.IGNORECASE):
                        break

                    # Filter valid example sentences
                    ep_clean = re.sub(r"\s*\([^)]{1,80}\)\s*$", "", ep).strip()
                    if (ep_clean and 12 < len(ep_clean) < 350
                            and ep_clean not in existing
                            and not re.match(r"^\(", ep_clean)
                            and not re.match(r"^(Ce terme|Ces termes?|Ainsi|Comprendre|Cette|Cela implique|Il est)", ep_clean, re.IGNORECASE)):
                        new_ex.append(ep_clean)
                        existing.add(ep_clean)
                    k += 1

                entry["examples"].extend(new_ex)

            elif re.match(r"^(Bien que|En comprenant)", np, re.IGNORECASE):
                break

            j += 1

        word_data[key] = entry

    i += 1

# ── Deduplicate and report ──────────────────────────────────────────────────
total = len(word_data)
with_ex = sum(1 for e in word_data.values() if e["examples"])
print(f"{total} words extracted, {with_ex} with examples ({total - with_ex} without)")

for w in ["carnassier", "carnivore", "cligner", "clignoter", "flairer", "fleurer",
          "arborer", "abhorrer", "apparier", "appareiller", "postiche"]:
    e = word_data.get(w, {})
    exs = e.get("examples", [])
    print(f"  {w}: {len(exs)} ex — {exs[0][:70] if exs else 'NONE'}")

with open("C:/Users/melik/.paro/content/_extracted/alpha_parsed.json", "w", encoding="utf-8") as f:
    json.dump(word_data, f, ensure_ascii=False, indent=2)

print("\nSaved alpha_parsed.json")
