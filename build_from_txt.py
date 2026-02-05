import json
import re

INPUT = "raw_questions.txt"
OUTPUT = "questions.js"

def parse_line(line: str):
    line = line.strip()
    if not line or line.startswith("#"):
        return None

    # الشكل: [cat]|lvl|q|A|B|C|D|answer|explain
    m = re.match(r"^\[(.+?)\]\|(.*)$", line)
    if not m:
        return None

    cat = m.group(1).strip()
    rest = m.group(2).split("|")

    # لازم على الأقل: lvl,q,A,B,C,D,answer  => 7 عناصر
    if len(rest) < 7:
        return None

    lvl = int(rest[0].strip() or "1")
    q = rest[1].strip()

    A = rest[2].strip()
    B = rest[3].strip()
    C = rest[4].strip()
    D = rest[5].strip()

    ans_raw = rest[6].strip()
    explain = rest[7].strip() if len(rest) >= 8 else ""

    # answer: 1..4 أو 0..3
    ans = int(ans_raw)
    if 1 <= ans <= 4:
        ans -= 1

    # تحقق
    if not cat or not q or not A or not B or not C or not D:
        return None
    if not (0 <= ans <= 3):
        return None

    return {
        "cat": cat,
        "lvl": lvl,
        "q": q,
        "choices": [A, B, C, D],
        "answer": ans,
        "explain": explain
    }

bank = []
bad = 0

with open(INPUT, "r", encoding="utf-8") as f:
    for line in f:
        q = parse_line(line)
        if q is None:
            # تجاهل الفاضي والتعليقات، لكن احسب السطور الغلط
            if line.strip() and not line.strip().startswith("#"):
                bad += 1
            continue
        bank.append(q)

with open(OUTPUT, "w", encoding="utf-8") as f:
    f.write("window.QUESTION_BANK=")
    f.write(json.dumps(bank, ensure_ascii=False, separators=(",", ":")))
    f.write(";")

print(f"✅ كتبنا {len(bank)} سؤال في {OUTPUT}")
if bad:
    print(f"⚠️ سطور متجاهلة بسبب فورمات غلط: {bad}")