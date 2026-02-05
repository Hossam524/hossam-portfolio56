"use strict";

function $(id) { return document.getElementById(id); }

var stageCountEl = $("stageCount");
var mixModeEl = $("mixMode");
var difficultyEl = $("difficulty");

var startBtn = $("startBtn");
var resetBtn = $("resetBtn");

var ll5050 = $("ll5050");
var llAudience = $("llAudience");
var llPhone = $("llPhone");

var pStage = $("pStage");
var pQ = $("pQ");
var pScore = $("pScore");

var catBadge = $("catBadge");
var lvlBadge = $("lvlBadge");
var questionText = $("questionText");
var choicesEl = $("choices");
var hintBox = $("hintBox");

var nextBtn = $("nextBtn");
var quitBtn = $("quitBtn");

var overlay = $("overlay");
var ovTitle = $("ovTitle");
var ovText = $("ovText");
var ovContinue = $("ovContinue");
var ovClose = $("ovClose");

var ovStats = $("ovStats");
var stCorrect = $("stCorrect");
var stWrong = $("stWrong");
var stScore = $("stScore");
var ovBio = $("ovBio");

// أسماء الأقسام
var CAT_NAME = {
  religion: "ديني 🕌",
  general: "معلومات عامة 🌍",
  logic: "ذكاء 🧠",
  education: "تعليم 🧑‍🏫",
  mixed: "متنوع"
};

// بنك الأسئلة
var RAW_BANK = Array.isArray(window.QUESTION_BANK) ? window.QUESTION_BANK : [];

function normalizeQuestion(q) {
  if (!q) return null;

  if (Array.isArray(q.choices) && q.choices.length >= 4) {
    var c0 = String(q.choices[0] ?? "").trim();
    var c1 = String(q.choices[1] ?? "").trim();
    var c2 = String(q.choices[2] ?? "").trim();
    var c3 = String(q.choices[3] ?? "").trim();

    var isDigit = c0 !== "" && !isNaN(Number(c0));
    var packed = (c2.indexOf(",") !== -1) || (c2.indexOf("،") !== -1);

    if (isDigit && c1 === "" && c3 === "" && packed) {
      var sep = c2.indexOf("،") !== -1 ? "،" : ",";
      var parts = c2.split(sep).map(function (s) { return s.trim(); }).filter(Boolean);
      if (parts.length >= 4) {
        q.answer = Number(c0);
        q.choices = parts.slice(0, 4);
      }
    }
    if (typeof q.answer === "number" && q.answer >= 1 && q.answer <= 4) q.answer = q.answer - 1;
    return (Array.isArray(q.choices) && q.choices.length >= 4) ? q : null;
  }

  if (q.A != null && q.B != null && q.C != null && q.D != null) {
    q.choices = [q.A, q.B, q.C, q.D].map(function (v) { return String(v ?? "").trim(); });
    if (typeof q.answer === "number" && q.answer >= 1 && q.answer <= 4) q.answer = q.answer - 1;
    return q;
  }

  if (q.a != null && q.b != null && q.c != null && q.d != null) {
    q.choices = [q.a, q.b, q.c, q.d].map(function (v) { return String(v ?? "").trim(); });
    if (typeof q.answer === "number" && q.answer >= 1 && q.answer <= 4) q.answer = q.answer - 1;
    return q;
  }

  if (Array.isArray(q.options) && q.options.length >= 4) {
    q.choices = q.options.slice(0, 4).map(function (v) { return String(v ?? "").trim(); });
    if (typeof q.answer === "number" && q.answer >= 1 && q.answer <= 4) q.answer = q.answer - 1;
    return q;
  }

  return null;
}

var BANK = RAW_BANK.map(normalizeQuestion).filter(function (q) {
  return q && Array.isArray(q.choices) && q.choices.length >= 4 && typeof q.answer === "number";
});

function shuffle(arr) {
  var a = arr.slice();
  for (var i = a.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}

function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

var settings = { stages: 5, mode: "mixed", diff: "ladder" };

var state = {
  inGame: false,
  stage: 1,
  qInStage: 1,
  score: 0,
  correct: 0,
  wrong: 0,
  current: null,
  answered: false,

  used5050: false,
  usedAudience: false,
  usedPhone: false,

  plan: [],
  planIndex: 0
};

function setIdleUI() {
  if (catBadge) catBadge.textContent = "—";
  if (lvlBadge) lvlBadge.textContent = "—";
  if (questionText) questionText.textContent = 'اضغط "ابدأ اللعبة"';
  if (choicesEl) choicesEl.innerHTML = "";
  if (hintBox) hintBox.textContent = "";

  if (pStage) pStage.textContent = "—";
  if (pQ) pQ.textContent = "—";
  if (pScore) pScore.textContent = "0";

  if (nextBtn) nextBtn.disabled = true;
  if (quitBtn) quitBtn.disabled = true;

  updateLifelinesUI(true);
}
function lockChoices(lock) {
  if (!choicesEl) return;
  var btns = choicesEl.querySelectorAll(".choice");
  for (var i = 0; i < btns.length; i++) {
    btns[i].disabled = !!lock;
    btns[i].classList.toggle("disabled", !!lock);
  }
}

function updateLifelinesUI(forceDisableAll) {
  if (!ll5050 || !llAudience || !llPhone) return;
  var disableAll = !!forceDisableAll || !state.inGame;

  ll5050.disabled = disableAll || state.used5050 || state.answered;
  llAudience.disabled = disableAll || state.usedAudience || state.answered;
  llPhone.disabled = disableAll || state.usedPhone || state.answered;

  ll5050.classList.toggle("used", !!state.used5050);
  llAudience.classList.toggle("used", !!state.usedAudience);
  llPhone.classList.toggle("used", !!state.usedPhone);
}

function resetLifelines() {
  state.used5050 = false;
  state.usedAudience = false;
  state.usedPhone = false;
  updateLifelinesUI(false);
}

function filterByMode(bank, mode) {
  if (mode === "mixed") return bank;
  return bank.filter(function (q) { return String(q.cat) === String(mode); });
}

function filterByDifficulty(bank, diff) {
  if (diff === "easy") return bank.filter(function (q) { return (q.lvl ?? 1) <= 2; });
  if (diff === "medium") return bank.filter(function (q) { return (q.lvl ?? 1) === 3; });
  if (diff === "hard") return bank.filter(function (q) { return (q.lvl ?? 1) >= 4; });
  return bank; // ladder
}

function buildPlan() {
  settings.stages = clamp(Number(stageCountEl && stageCountEl.value ? stageCountEl.value : 5), 1, 50);
  settings.mode = String(mixModeEl && mixModeEl.value ? mixModeEl.value : "mixed");
  settings.diff = String(difficultyEl && difficultyEl.value ? difficultyEl.value : "ladder");

  var wanted = settings.stages * 20;

  var filtered = filterByMode(BANK, settings.mode);
  filtered = filterByDifficulty(filtered, settings.diff);

  if (filtered.length < wanted) {
    var fallback = filterByMode(BANK, settings.mode);
    if (fallback.length >= wanted) filtered = fallback;
  }

  if (filtered.length === 0) return { ok: false, msg: "⚠️ مفيش أسئلة مناسبة للاختيارات الحالية." };

  state.plan = shuffle(filtered).slice(0, Math.min(wanted, filtered.length));
  state.planIndex = 0;

  return {
    ok: true,
    msg: (state.plan.length < wanted) ? ("⚠️ المتاح " + state.plan.length + " سؤال فقط. هنلعب بيهم.") : ""
  };
}

function nextFromPlan() {
  if (state.planIndex >= state.plan.length) return null;
  var q = state.plan[state.planIndex];
  state.planIndex += 1;
  return q;
}

function renderQuestion(q) {
  q = normalizeQuestion(q);
  if (!q || !choicesEl) return;

  state.current = q;
  state.answered = false;

  if (catBadge) catBadge.textContent = CAT_NAME[q.cat] || String(q.cat || "—");
  if (lvlBadge) lvlBadge.textContent = "مستوى " + String(q.lvl ?? 1);
  if (questionText) questionText.textContent = String(q.q ?? "—");

  if (hintBox) hintBox.textContent = "";
  choicesEl.innerHTML = "";

  var letters = ["A", "B", "C", "D"];
  for (var i = 0; i < 4; i++) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "choice";
    btn.setAttribute("data-i", String(i));
    btn.textContent = letters[i] + ": " + String(q.choices[i] ?? "");

    (function (choiceIndex) {
      btn.addEventListener("click", function () { answer(choiceIndex); });
    })(i);

    choicesEl.appendChild(btn);
  }

  if (pStage) pStage.textContent = state.stage + "/" + settings.stages;
  if (pQ) pQ.textContent = state.qInStage + "/20";
  if (pScore) pScore.textContent = String(state.score);

  if (nextBtn) nextBtn.disabled = true;
  if (quitBtn) quitBtn.disabled = false;

  lockChoices(false);
  updateLifelinesUI(false);
}

function answer(i) {
  if (!state.inGame || state.answered || !state.current) return;

  state.answered = true;

  var q = state.current;
  var correct = (i === q.answer);

  lockChoices(true);
  var btns = choicesEl ? choicesEl.querySelectorAll(".choice") : [];
  for (var k = 0; k < btns.length; k++) {
    var bi = Number(btns[k].getAttribute("data-i"));
    if (bi === q.answer) btns[k].classList.add("correct");
    if (bi === i && !correct) btns[k].classList.add("wrong");
  }

  if (correct) {
    state.score += 10;
    state.correct += 1;
    if (hintBox) hintBox.textContent = "✅ إجابة صحيحة. " + String(q.explain ?? "");
  } else {
    state.wrong += 1;
    if (hintBox) hintBox.textContent = "❌ إجابة خاطئة. " + String(q.explain ?? "");
  }

  if (pScore) pScore.textContent = String(state.score);
  if (nextBtn) nextBtn.disabled = false;

  updateLifelinesUI(false);
}

function showOverlay(title, text, continueText, showStats) {
  if (!overlay) return;

  overlay.classList.add("show");
  overlay.setAttribute("aria-hidden", "false");

  if (ovTitle) ovTitle.textContent = title || "—";
  if (ovText) ovText.textContent = text || "—";
  if (ovContinue) ovContinue.textContent = continueText || "متابعة";

  // النبذة تظهر فقط في نهاية اللعبة (showStats = true)
  if (ovBio) ovBio.style.display = showStats ? "block" : "none";

  // لو عندك إحصائيات في الصفحة فقط
  if (ovStats) ovStats.style.display = showStats ? "grid" : "none";
  if (showStats) {
    if (stCorrect) stCorrect.textContent = String(state.correct);
    if (stWrong) stWrong.textContent = String(state.wrong);
    if (stScore) stScore.textContent = String(state.score);
  }
}

function hideOverlayBox() {
  if (!overlay) return;
  overlay.classList.remove("show");
  overlay.setAttribute("aria-hidden", "true");
}

var overlayMode = "stage"; // stage | game

function stageEndMessage() {
  return "أحسنت! أنهيت المرحلة " + state.stage + " من " + settings.stages + ".";
}

function gameEndMessage() {
  var total = state.correct + state.wrong;
  var percent = total ? Math.round((state.correct / total) * 100) : 0;

  var vibe = "أداء رائع 💪";
  if (percent >= 85) vibe = "ممتاز جدًا 🌟";
  else if (percent >= 70) vibe = "ممتاز 👏";
  else if (percent >= 50) vibe = "كويس جدًا 👍";
  else vibe = "شد حيلك المرة الجاية 💙";

  return vibe + " — " + "نسبة الإجابات الصحيحة: " + percent + "%";
}
function showStageEnd(isGameEnd) {
  overlayMode = isGameEnd ? "game" : "stage";

  if (isGameEnd) {
  showOverlay("🏁 نهاية اللعبة", gameEndMessage(), "إعادة اللعب", true);
  if (ovBio) ovBio.style.display = "block";


    // ✅ اجبار إظهار النبذة في نهاية اللعبة
    if (ovBio) ovBio.style.display = "block";

  } else {
    showOverlay("🎉 نهاية المرحلة", stageEndMessage(), "ابدأ المرحلة التالية", false);

    // ✅ اخفاء النبذة في نهاية المرحلة
    if (ovBio) ovBio.style.display = "none";
  }
}

function startGame() {
  if (!BANK || BANK.length === 0) {
    if (hintBox) hintBox.textContent = "⚠️ مفيش أسئلة جاهزة.";
    return;
  }

  var planRes = buildPlan();
  if (!planRes.ok) {
    if (hintBox) hintBox.textContent = planRes.msg;
    return;
  }

  state.inGame = true;
  state.stage = 1;
  state.qInStage = 1;
  state.score = 0;
  state.correct = 0;
  state.wrong = 0;
  state.current = null;
  state.answered = false;

  resetLifelines();

  if (pScore) pScore.textContent = "0";
  if (planRes.msg && hintBox) hintBox.textContent = planRes.msg;

  var q = nextFromPlan();
  if (!q) {
    if (hintBox) hintBox.textContent = "⚠️ مفيش أسئلة كفاية.";
    return;
  }
  renderQuestion(q);
}

function resetGame() {
  state.inGame = false;
  state.stage = 1;
  state.qInStage = 1;
  state.score = 0;
  state.correct = 0;
  state.wrong = 0;
  state.current = null;
  state.answered = false;
  state.plan = [];
  state.planIndex = 0;
  resetLifelines();
  hideOverlayBox();
  setIdleUI();
}

function quitGame() {
  state.inGame = false;
  resetLifelines();
  hideOverlayBox();
  setIdleUI();
  if (hintBox) hintBox.textContent = "تم إنهاء اللعبة.";
}

function nextStep() {
  if (!state.inGame || !state.answered) return;

  if (state.qInStage >= 20) {
    if (state.stage >= settings.stages) {
      state.inGame = false;
      showStageEnd(true);
      return;
    }
    showStageEnd(false);
    return;
  }

  state.qInStage += 1;

  var q = nextFromPlan();
  if (!q) {
    state.inGame = false;
    showStageEnd(true);
    return;
  }
  renderQuestion(q);
}
// events
if (startBtn) startBtn.addEventListener("click", startGame);
if (resetBtn) resetBtn.addEventListener("click", resetGame);
if (quitBtn) quitBtn.addEventListener("click", quitGame);
if (nextBtn) nextBtn.addEventListener("click", nextStep);

if (ovContinue) {
  ovContinue.addEventListener("click", function () {
    if (overlayMode === "game") {
      hideOverlayBox();
      startGame();
      return;
    }

    hideOverlayBox();
    state.stage += 1;
    state.qInStage = 1;

    var q = nextFromPlan();
    if (!q) {
      state.inGame = false;
      showStageEnd(true);
      return;
    }
    renderQuestion(q);
  });
}

if (ovClose) ovClose.addEventListener("click", hideOverlayBox);
if (overlay) overlay.addEventListener("click", function (e) { if (e.target === overlay) hideOverlayBox(); });

// lifelines
if (ll5050) {
  ll5050.addEventListener("click", function () {
    if (!state.inGame || state.used5050 || state.answered || !state.current) return;
    state.used5050 = true;

    var q = state.current;
    var wrong = [0, 1, 2, 3].filter(function (x) { return x !== q.answer; });
    wrong = shuffle(wrong).slice(0, 2);

    var btns = choicesEl ? choicesEl.querySelectorAll(".choice") : [];
    for (var i = 0; i < btns.length; i++) {
      var bi = Number(btns[i].getAttribute("data-i"));
      if (wrong.indexOf(bi) !== -1) {
        btns[i].textContent = "—";
        btns[i].disabled = true;
        btns[i].classList.add("disabled");
      }
    }
    if (hintBox) hintBox.textContent = "تم استخدام 50:50.";
    updateLifelinesUI(false);
  });
}

if (llAudience) {
  llAudience.addEventListener("click", function () {
    if (!state.inGame || state.usedAudience || state.answered || !state.current) return;
    state.usedAudience = true;

    var q = state.current;
    var p = [10, 10, 10, 10];
    p[q.answer] = 55;

    var btns = choicesEl ? choicesEl.querySelectorAll(".choice") : [];
    for (var i = 0; i < btns.length; i++) {
      if (btns[i].textContent.trim() === "—") {
        var bi = Number(btns[i].getAttribute("data-i"));
        p[bi] = 0;
      }
    }

    if (hintBox) {
      hintBox.textContent = "الجمهور: A " + p[0] + "% • B " + p[1] + "% • C " + p[2] + "% • D " + p[3] + "%";
    }
    updateLifelinesUI(false);
  });
}

if (llPhone) {
  llPhone.addEventListener("click", function () {
    if (!state.inGame || state.usedPhone || state.answered || !state.current) return;
    state.usedPhone = true;

    var q = state.current;
    var guess = q.answer;

    if (Math.random() >= 0.75) {
      var other = [0, 1, 2, 3].filter(function (x) { return x !== q.answer; });
      guess = other[Math.floor(Math.random() * other.length)];
    }

    var letters = ["A", "B", "C", "D"];
    if (hintBox) hintBox.textContent = "الصديق: أظن الإجابة " + letters[guess] + ".";
    updateLifelinesUI(false);
  });
}

// init
setIdleUI();