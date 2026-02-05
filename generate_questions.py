import json
import random

random.seed(42)

CATS = [
    ("religion", "ديني 🕌"),
    ("general", "معلومات عامة 🌍"),
    ("logic", "ذكاء 🧠"),
    ("education", "تعليم 🧑‍🏫"),
]

PER_CAT = 250  # 250 * 4 = 1000

def make_question(cat_key: str, cat_name: str, i: int):
    lvl = 1 if i <= 100 else 2 if i <= 200 else 3

    # سؤال تشغيل محترم + 4 اختيارات ثابتة (تقدر تغير القالب بعدين)
    q_text = f"({cat_name}) سؤال رقم {i}: اختر الإجابة الصحيحة."
    choices = [
        f"اختيار A ({cat_key}-{i})",
        f"اختيار B ({cat_key}-{i})",
        f"اختيار C ({cat_key}-{i})",
        f"اختيار D ({cat_key}-{i})",
    ]
    answer = random.randint(0, 3)

    return {
        "cat": cat_key,
        "lvl": lvl,
        "q": q_text,
        "choices": choices,
        "answer": answer,
        "explain": ""
    }

bank = []
for cat_key, cat_name in CATS:
    for i in range(1, PER_CAT + 1):
        bank.append(make_question(cat_key, cat_name, i))

with open("questions.js", "w", encoding="utf-8") as f:
    f.write("window.QUESTION_BANK=")
    f.write(json.dumps(bank, ensure_ascii=False, separators=(",", ":")))
    f.write(";")

print(f"✅ Done: wrote {len(bank)} questions to questions.js")