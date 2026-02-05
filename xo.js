/* XO — Clean Version */

(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);

  const boardEl = $("board");
  const statusEl = $("status");
  const resultEl = $("result");
  const resultTitleEl = $("resultTitle");
  const resultTextEl = $("resultText");

  const yearEl = $("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  const modeEl = $("mode");
  const difficultyEl = $("difficulty");
  const difficultyRowEl = $("difficultyRow");
  const playerMarkEl = $("playerMark");
  const firstTurnEl = $("firstTurn");
  const soundEl = $("sound");
  const hintsEl = $("hints");

  const newGameBtn = $("newGame");
  const resetRoundBtn = $("resetRound");
  const resetAllBtn = $("resetAll");
  const playAgainBtn = $("playAgain");
  const closeResultBtn = $("closeResult");

  const nameAEl = $("nameA");
  const nameBEl = $("nameB");
  const markAEl = $("markA");
  const markBEl = $("markB");
  const scoreAEl = $("scoreA");
  const scoreBEl = $("scoreB");
  const scoreDEl = $("scoreD");

  const WINS = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];

  const STORE_KEY = "xo_scores_v1";

  let cells = [];
  let board = Array(9).fill(null);

  let locked = true;
  let current = "X";

  let mode = "ai"; // ai | pvp
  let difficulty = "medium"; // easy | medium | hard
  let human = "X";
  let ai = "O";
  let firstTurn = "player"; // player | other | random

  let scores = { A: 0, B: 0, D: 0 };

  function safeLoadScores() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (
        parsed &&
        typeof parsed.A === "number" &&
        typeof parsed.B === "number" &&
        typeof parsed.D === "number"
      ) {
        scores = parsed;
      }
    } catch (e) {
      // ignore
    }
  }

  function safeSaveScores() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(scores));
    } catch (e) {
      // ignore
    }
  }

  function beep(kind) {
    if (!soundEl || !soundEl.checked) return;

    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    const freqMap = {
      move: 440,
      win: 660,
      draw: 330,
      error: 220,
    };

    osc.frequency.value = freqMap[kind] || 440;
    osc.type = "sine";
    gain.gain.value = 0.06;

    osc.start();
    setTimeout(() => {
      try {
        osc.stop();
        ctx.close();
      } catch (e) {
        // ignore
      }
    }, 110);
  }

  function setStatus(text) {
    if (statusEl) statusEl.textContent = text;
  }

  function renderScoreboard() {
    if (scoreAEl) scoreAEl.textContent = String(scores.A);
    if (scoreBEl) scoreBEl.textContent = String(scores.B);
    if (scoreDEl) scoreDEl.textContent = String(scores.D);

    if (mode === "ai") {
      if (nameAEl) nameAEl.textContent = "أنا";
      if (nameBEl) nameBEl.textContent = "الكمبيوتر";
      if (markAEl) markAEl.textContent = human;
      if (markBEl) markBEl.textContent = ai;
    } else {
      if (nameAEl) nameAEl.textContent = "لاعب 1";
      if (nameBEl) nameBEl.textContent = "لاعب 2";
      if (markAEl) markAEl.textContent = "X";
      if (markBEl) markBEl.textContent = "O";
    }
  }

  function makeBoard() {
    boardEl.innerHTML = "";
    cells = [];

    for (let i = 0; i < 9; i++) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "cell";
      btn.setAttribute("role", "gridcell");
      btn.setAttribute("aria-label", "خلية " + (i + 1));
      btn.dataset.idx = String(i);

      btn.addEventListener("click", () => handleMove(i));
      btn.addEventListener("keydown", (e) => handleKeyNav(e, i));

      boardEl.appendChild(btn);
      cells.push(btn);
    }
  }
  function handleKeyNav(e, idx) {
    const key = e.key;
    const row = Math.floor(idx / 3);
    const col = idx % 3;

    let next = idx;

    if (key === "ArrowLeft") {
      // RTL: التحرك بصريًا لليسار يعني زيادة العمود
      next = row * 3 + Math.min(2, col + 1);
    } else if (key === "ArrowRight") {
      next = row * 3 + Math.max(0, col - 1);
    } else if (key === "ArrowUp") {
      next = Math.max(0, row - 1) * 3 + col;
    } else if (key === "ArrowDown") {
      next = Math.min(2, row + 1) * 3 + col;
    } else if (key === "Enter" || key === " ") {
      e.preventDefault();
      handleMove(idx);
      return;
    } else {
      return;
    }

    e.preventDefault();
    if (cells[next]) cells[next].focus();
  }

  function isTerminal(b) {
    for (let k = 0; k < WINS.length; k++) {
      const a = WINS[k][0];
      const c = WINS[k][1];
      const d = WINS[k][2];
      if (b[a] && b[a] === b[c] && b[a] === b[d]) {
        return { winner: b[a], line: [a, c, d] };
      }
    }
    if (b.every(Boolean)) return { winner: "D", line: [] };
    return null;
  }

  function availableMoves(b) {
    const arr = [];
    for (let i = 0; i < 9; i++) {
      if (!b[i]) arr.push(i);
    }
    return arr;
  }

  function randomMove(b) {
    const moves = availableMoves(b);
    return moves[Math.floor(Math.random() * moves.length)];
  }

  function findWinningMove(b, mark) {
    const moves = availableMoves(b);
    for (let i = 0; i < moves.length; i++) {
      const idx = moves[i];
      const nb = b.slice();
      nb[idx] = mark;
      const t = isTerminal(nb);
      if (t && t.winner === mark) return idx;
    }
    return null;
  }

  function minimax(b, turn, me, opp) {
    const t = isTerminal(b);
    if (t) {
      if (t.winner === me) return { score: 10 };
      if (t.winner === opp) return { score: -10 };
      return { score: 0 };
    }

    const moves = availableMoves(b);
    let bestIdx = moves[0];
    let bestScore = turn === me ? -Infinity : Infinity;

    for (let i = 0; i < moves.length; i++) {
      const idx = moves[i];
      const nb = b.slice();
      nb[idx] = turn;

      const nextTurn = turn === "X" ? "O" : "X";
      const res = minimax(nb, nextTurn, me, opp);
      const score = res.score;

      if (turn === me) {
        if (score > bestScore) {
          bestScore = score;
          bestIdx = idx;
        }
      } else {
        if (score < bestScore) {
          bestScore = score;
          bestIdx = idx;
        }
      }
    }

    return { score: bestScore, idx: bestIdx };
  }

  function chooseAIMove() {
    if (difficulty === "easy") {
      return randomMove(board);
    }

    if (difficulty === "medium") {
      const win = findWinningMove(board, ai);
      if (win !== null) return win;

      const block = findWinningMove(board, human);
      if (block !== null) return block;

      if (!board[4]) return 4;

      if (Math.random() < 0.35) return randomMove(board);

      const corners = [0, 2, 6, 8].filter((i) => !board[i]);
      if (corners.length) return corners[Math.floor(Math.random() * corners.length)];

      return randomMove(board);
    }

    // hard
    const res = minimax(board.slice(), ai, ai, human);
    return typeof res.idx === "number" ? res.idx : randomMove(board);
  }

  function updateHints() {
    for (let i = 0; i < cells.length; i++) {
      cells[i].classList.remove("hint");
    }

    if (!hintsEl || !hintsEl.checked) return;
    if (locked) return;

    // في وضع AI: نعرض تلميحات فقط لما يكون دور اللاعب
    if (mode === "ai" && current !== human) return;

    const win = findWinningMove(board, current);
    if (win !== null) {
      cells[win].classList.add("hint");
      return;
    }

    const opp = current === "X" ? "O" : "X";
    const block = findWinningMove(board, opp);
    if (block !== null) {
      cells[block].classList.add("hint");
    }
  }
  function announceTurn() {
    if (mode === "ai") {
      if (current === human) setStatus("دورك الآن (" + human + ").");
      else setStatus("دور الكمبيوتر (" + ai + ")...");
    } else {
      setStatus("دور " + current + " الآن.");
    }
  }

  function showResult(title, text) {
    if (resultTitleEl) resultTitleEl.textContent = title;
    if (resultTextEl) resultTextEl.textContent = text;

    if (resultEl) {
      resultEl.classList.add("show");
      resultEl.setAttribute("aria-hidden", "false");
    }

    if (playAgainBtn) playAgainBtn.focus();
  }

  function closeResult() {
    if (!resultEl) return;
    resultEl.classList.remove("show");
    resultEl.setAttribute("aria-hidden", "true");
  }

  function lockBoard(on) {
    for (let i = 0; i < 9; i++) {
      if (!board[i]) cells[i].disabled = on;
    }
  }

  function place(i, mark) {
    board[i] = mark;
    cells[i].textContent = mark;
    cells[i].disabled = true;
    beep("move");
  }

  function endRound(end) {
    locked = true;

    if (end.winner === "D") {
      scores.D += 1;
      safeSaveScores();
      renderScoreboard();
      beep("draw");
      showResult("تعادل 🤝", "الجولة انتهت بالتعادل. جرّبوا تاني!");
      return;
    }

    // highlight winning line
    for (let k = 0; k < end.line.length; k++) {
      cells[end.line[k]].classList.add("win");
    }

    if (mode === "ai") {
      if (end.winner === human) scores.A += 1;
      else scores.B += 1;
    } else {
      if (end.winner === "X") scores.A += 1;
      else scores.B += 1;
    }

    safeSaveScores();
    renderScoreboard();
    beep("win");

    let who = "";
    if (mode === "ai") who = end.winner === human ? "أنت" : "الكمبيوتر";
    else who = end.winner === "X" ? "لاعب 1 (X)" : "لاعب 2 (O)";

    showResult("فوز 🎉", who + " فاز بالجولة!");
  }

  function maybeAIMove() {
    if (mode !== "ai") return;
    if (locked) return;
    if (current !== ai) return;

    lockBoard(true);
    setTimeout(() => {
      lockBoard(false);

      const idx = chooseAIMove();
      if (idx === null || idx === undefined) return;

      place(idx, ai);

      const end = isTerminal(board);
      if (end) {
        endRound(end);
        return;
      }

      current = human;
      updateHints();
      announceTurn();
    }, 350);
  }

  function handleMove(i) {
    if (locked) return;

    if (board[i]) {
      beep("error");
      return;
    }

    if (mode === "ai" && current === ai) {
      beep("error");
      return;
    }

    place(i, current);

    const end = isTerminal(board);
    if (end) {
      endRound(end);
      return;
    }

    current = current === "X" ? "O" : "X";
    updateHints();
    announceTurn();
    maybeAIMove();
  }

  function decideFirstTurn() {
    if (firstTurn === "random") {
      const a = mode === "ai" ? human : "X";
      const b = mode === "ai" ? ai : "O";
      return Math.random() < 0.5 ? a : b;
    }
    if (firstTurn === "player") {
      return mode === "ai" ? human : "X";
    }
    return mode === "ai" ? ai : "O";
  }

  function syncSettings() {
    mode = modeEl ? modeEl.value : "ai";
    difficulty = difficultyEl ? difficultyEl.value : "medium";
    firstTurn = firstTurnEl ? firstTurnEl.value : "player";

    if (difficultyRowEl) {
      difficultyRowEl.style.display = mode === "ai" ? "grid" : "none";
    }

    if (mode === "ai") {
      human = playerMarkEl ? playerMarkEl.value : "X";
      ai = human === "X" ? "O" : "X";
    } else {
      human = "X";
      ai = "O";
    }

    renderScoreboard();
  }

  function resetBoardOnly() {
    board = Array(9).fill(null);
    for (let i = 0; i < 9; i++) {
      cells[i].textContent = "";
      cells[i].disabled = false;
      cells[i].classList.remove("win");
      cells[i].classList.remove("hint");
    }
  }

  function startNewGame() {
    syncSettings();
    closeResult();

    locked = false;
    resetBoardOnly();

    current = decideFirstTurn();
    updateHints();
    announceTurn();
    maybeAIMove();
  }

  function resetRound() {
    closeResult();
    locked = false;
    resetBoardOnly();
    current = decideFirstTurn();
    updateHints();
    announceTurn();
    maybeAIMove();
  }

  function resetAll() {
    closeResult();
    scores = { A: 0, B: 0, D: 0 };
    safeSaveScores();
    renderScoreboard();
    beep("error");
    resetRound();
    setStatus("تم مسح النتائج. ابدأ جولة جديدة.");
  }

  function init() {
    safeLoadScores();
    makeBoard();
    syncSettings();
    renderScoreboard();

    locked = true;
    setStatus('اضبط الإعدادات ثم اضغط "لعبة جديدة".');

    if (modeEl) {
      modeEl.addEventListener("change", () => {
        syncSettings();
        locked = true;
        setStatus('تم تغيير الوضع. اضغط "لعبة جديدة" للبدء.');
      });
    }

    if (difficultyEl) {
      difficultyEl.addEventListener("change", () => {
        difficulty = difficultyEl.value;
        locked = true;
        setStatus('تم تغيير المستوى. اضغط "لعبة جديدة" للبدء.');
      });
    }

    if (playerMarkEl) {
      playerMarkEl.addEventListener("change", () => {
        syncSettings();
        locked = true;
        setStatus('تم تغيير العلامة. اضغط "لعبة جديدة" للبدء.');
      });
    }

    if (firstTurnEl) {
      firstTurnEl.addEventListener("change", () => {
        firstTurn = firstTurnEl.value;
        locked = true;
        setStatus('تم تغيير من يبدأ. اضغط "لعبة جديدة" للبدء.');
      });
    }

    if (hintsEl) {
      hintsEl.addEventListener("change", () => updateHints());
    }

    if (newGameBtn) newGameBtn.addEventListener("click", startNewGame);
    if (resetRoundBtn) resetRoundBtn.addEventListener("click", resetRound);
    if (resetAllBtn) resetAllBtn.addEventListener("click", resetAll);

    if (playAgainBtn) {
      playAgainBtn.addEventListener("click", () => {
        closeResult();
        resetRound();
      });
    }

    if (closeResultBtn) closeResultBtn.addEventListener("click", closeResult);

    if (resultEl) {
      resultEl.addEventListener("click", (e) => {
        if (e.target === resultEl) closeResult();
      });
    }
  }

  init();
})();