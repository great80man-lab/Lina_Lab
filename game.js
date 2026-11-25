// 꽥꽥이가 만든 꽥꽥스택 (Quack Stack) — 연못에 돌을 쌓는 블록 퍼즐
(() => {
  const COLS = 10, ROWS = 20;

  // 연못 돌 모양과 색
  const STONES = [
    { color: '#ffd60a', cells: [[0, 0], [1, 0], [0, 1], [1, 1]] },          // 알
    { color: '#4cc9f0', cells: [[0, 1], [1, 1], [2, 1], [3, 1]] },          // 막대
    { color: '#f72585', cells: [[1, 0], [0, 1], [1, 1], [2, 1]] },          // 부리
    { color: '#80ed99', cells: [[1, 0], [2, 0], [0, 1], [1, 1]] },          // 물결 오른쪽
    { color: '#ff9f1c', cells: [[0, 0], [1, 0], [1, 1], [2, 1]] },          // 물결 왼쪽
    { color: '#b388eb', cells: [[0, 0], [0, 1], [1, 1], [2, 1]] },          // 발 왼쪽
    { color: '#ff6b6b', cells: [[2, 0], [0, 1], [1, 1], [2, 1]] },          // 발 오른쪽
  ];

  const board = document.getElementById('board');
  const ctx = board.getContext('2d');
  const nextCanvas = document.getElementById('next');
  const nctx = nextCanvas.getContext('2d');
  const overlay = document.getElementById('overlay');
  const overlayTitle = document.getElementById('overlay-title');
  const overlaySub = document.getElementById('overlay-sub');
  const startBtn = document.getElementById('start');
  const $ = (id) => document.getElementById(id);

  let SIZE = 30;
  let grid, piece, nextPiece, score, lines, level;
  let dropTimer = 0, lastTime = 0, running = false, paused = false;
  let flash = [];   // 지워지는 줄 효과
  let bag = [];

  let best = 0;
  try { best = Number(localStorage.getItem('quackStackBest')) || 0; } catch (e) { /* 저장 불가 */ }
  $('best').textContent = best;

  // ---------- 화면 크기 ----------
  function resize() {
    const touch = window.matchMedia('(max-width: 640px), (hover: none)').matches;
    const availH = window.innerHeight - (touch ? 250 : 100);
    const availW = Math.min(window.innerWidth - 40, touch ? 360 : 400);
    SIZE = Math.max(14, Math.floor(Math.min(availH / ROWS, availW / COLS)));
    board.width = COLS * SIZE;
    board.height = ROWS * SIZE;
    draw();
  }

  // ---------- 돌 만들기 ----------
  function randomStone() {
    if (bag.length === 0) {
      bag = STONES.map((_, i) => i);
      for (let i = bag.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [bag[i], bag[j]] = [bag[j], bag[i]];
      }
    }
    const s = STONES[bag.pop()];
    return { color: s.color, cells: s.cells.map(([x, y]) => [x, y]), x: 3, y: 0 };
  }

  function rotated(cells) {
    const size = Math.max(...cells.flat()) + 1;
    return cells.map(([x, y]) => [size - 1 - y, x]);
  }

  function fits(cells, ox, oy) {
    return cells.every(([x, y]) => {
      const gx = x + ox, gy = y + oy;
      return gx >= 0 && gx < COLS && gy < ROWS && (gy < 0 || !grid[gy][gx]);
    });
  }

  // ---------- 동작 ----------
  function move(dx) {
    if (fits(piece.cells, piece.x + dx, piece.y)) piece.x += dx;
  }

  function rotate() {
    const r = rotated(piece.cells);
    for (const kick of [0, -1, 1, -2, 2]) {
      if (fits(r, piece.x + kick, piece.y)) {
        piece.cells = r;
        piece.x += kick;
        return;
      }
    }
  }

  function softDrop() {
    if (fits(piece.cells, piece.x, piece.y + 1)) {
      piece.y++;
      score += 1;
    } else {
      lock();
    }
    dropTimer = 0;
  }

  function hardDrop() {
    let d = 0;
    while (fits(piece.cells, piece.x, piece.y + 1)) { piece.y++; d++; }
    score += d * 2;
    lock();
  }

  function lock() {
    for (const [x, y] of piece.cells) {
      const gy = y + piece.y;
      if (gy < 0) return gameOver();
      grid[gy][x + piece.x] = piece.color;
    }
    clearLines();
    spawn();
  }

  function clearLines() {
    const full = [];
    for (let y = 0; y < ROWS; y++) if (grid[y].every(Boolean)) full.push(y);
    if (!full.length) return;
    for (const y of full) {
      grid.splice(y, 1);
      grid.unshift(Array(COLS).fill(null));
    }
    flash = full.map((y) => ({ y, life: 1 }));
    lines += full.length;
    score += [0, 100, 300, 500, 800][full.length] * level;
    level = Math.floor(lines / 10) + 1;
  }

  function spawn() {
    piece = nextPiece;
    nextPiece = randomStone();
    if (!fits(piece.cells, piece.x, piece.y)) gameOver();
  }

  function interval() {
    return Math.max(80, 800 - (level - 1) * 70);
  }

  // ---------- 그리기 ----------
  function stone(c, x, y, color, s, alpha = 1) {
    const px = x * s, py = y * s, pad = Math.max(1, s * 0.06), r = s * 0.28;
    c.globalAlpha = alpha;
    c.fillStyle = color;
    c.beginPath();
    c.roundRect(px + pad, py + pad, s - pad * 2, s - pad * 2, r);
    c.fill();
    // 물방울 반짝임
    c.fillStyle = 'rgba(255,255,255,.45)';
    c.beginPath();
    c.ellipse(px + s * 0.35, py + s * 0.32, s * 0.14, s * 0.09, -0.5, 0, Math.PI * 2);
    c.fill();
    c.globalAlpha = 1;
  }

  function draw() {
    if (!grid) {
      ctx.clearRect(0, 0, board.width, board.height);
      return;
    }
    ctx.clearRect(0, 0, board.width, board.height);

    // 잔물결 격자
    ctx.strokeStyle = 'rgba(255,255,255,.05)';
    for (let x = 1; x < COLS; x++) {
      ctx.beginPath(); ctx.moveTo(x * SIZE, 0); ctx.lineTo(x * SIZE, board.height); ctx.stroke();
    }

    for (let y = 0; y < ROWS; y++)
      for (let x = 0; x < COLS; x++)
        if (grid[y][x]) stone(ctx, x, y, grid[y][x], SIZE);

    if (piece && running) {
      // 떨어질 자리 미리보기
      let gy = piece.y;
      while (fits(piece.cells, piece.x, gy + 1)) gy++;
      for (const [x, y] of piece.cells) stone(ctx, x + piece.x, y + gy, piece.color, SIZE, 0.2);
      for (const [x, y] of piece.cells)
        if (y + piece.y >= 0) stone(ctx, x + piece.x, y + piece.y, piece.color, SIZE);
    }

    // 줄 지울 때 꽥!
    for (const f of flash) {
      ctx.fillStyle = `rgba(255,255,255,${f.life * 0.6})`;
      ctx.fillRect(0, f.y * SIZE, board.width, SIZE);
      ctx.globalAlpha = f.life;
      ctx.font = `800 ${SIZE * 0.8}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffb703';
      ctx.fillText('꽥!', board.width / 2, f.y * SIZE + SIZE * 0.8);
      ctx.globalAlpha = 1;
    }

    // 다음 돌
    nctx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
    if (nextPiece) {
      const s = 22;
      const xs = nextPiece.cells.map((c) => c[0]), ys = nextPiece.cells.map((c) => c[1]);
      const w = Math.max(...xs) - Math.min(...xs) + 1, h = Math.max(...ys) - Math.min(...ys) + 1;
      nctx.save();
      nctx.translate((nextCanvas.width - w * s) / 2 - Math.min(...xs) * s, (nextCanvas.height - h * s) / 2 - Math.min(...ys) * s);
      for (const [x, y] of nextPiece.cells) stone(nctx, x, y, nextPiece.color, s);
      nctx.restore();
    }

    $('score').textContent = score;
    $('lines').textContent = lines;
    $('level').textContent = level;
  }

  // ---------- 게임 흐름 ----------
  function start() {
    grid = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    score = 0; lines = 0; level = 1; bag = []; flash = [];
    nextPiece = randomStone();
    spawn();
    running = true; paused = false;
    overlay.classList.add('hidden');
    lastTime = performance.now(); dropTimer = 0;
    requestAnimationFrame(loop);
  }

  function gameOver() {
    running = false;
    if (score > best) {
      best = score;
      try { localStorage.setItem('quackStackBest', String(best)); } catch (e) { /* 저장 불가 */ }
      $('best').textContent = best;
    }
    showOverlay('연못이 가득 찼어요!', `점수 ${score}점 · ${lines}줄`, '다시 하기');
  }

  function togglePause() {
    if (!running) return;
    paused = !paused;
    if (paused) showOverlay('잠깐 쉬는 중', '오리도 쉬어 가요.', '계속하기');
    else {
      overlay.classList.add('hidden');
      lastTime = performance.now();
      requestAnimationFrame(loop);
    }
  }

  function showOverlay(title, sub, btn) {
    overlayTitle.textContent = title;
    overlaySub.textContent = sub;
    startBtn.textContent = btn;
    overlay.classList.remove('hidden');
  }

  function loop(now) {
    if (!running || paused) return;
    const dt = now - lastTime;
    lastTime = now;
    dropTimer += dt;
    if (dropTimer > interval()) softDropAuto();
    flash = flash.map((f) => ({ ...f, life: f.life - dt / 400 })).filter((f) => f.life > 0);
    draw();
    requestAnimationFrame(loop);
  }

  function softDropAuto() {
    dropTimer = 0;
    if (fits(piece.cells, piece.x, piece.y + 1)) piece.y++;
    else lock();
  }

  function act(a) {
    if (a === 'pause') return togglePause();
    if (!running || paused) return;
    if (a === 'left') move(-1);
    else if (a === 'right') move(1);
    else if (a === 'rotate') rotate();
    else if (a === 'down') softDrop();
    else if (a === 'drop') hardDrop();
    draw();
  }

  // ---------- 입력 ----------
  startBtn.addEventListener('click', () => {
    if (running && paused) togglePause();
    else start();
  });

  const KEYS = {
    ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'rotate', ArrowDown: 'down',
    ' ': 'drop', p: 'pause', P: 'pause', Escape: 'pause',
  };
  document.addEventListener('keydown', (e) => {
    const a = KEYS[e.key];
    if (!a) return;
    e.preventDefault();
    act(a);
  });

  // 버튼 (누르고 있으면 반복)
  document.querySelectorAll('.pad button').forEach((b) => {
    let rep;
    const stop = () => clearInterval(rep);
    b.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      const a = b.dataset.act;
      act(a);
      if (['left', 'right', 'down'].includes(a)) rep = setInterval(() => act(a), 110);
    });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => b.addEventListener(ev, stop));
  });

  // 게임판 위 스와이프
  let sx = 0, sy = 0, moved = 0, startT = 0;
  board.addEventListener('pointerdown', (e) => {
    sx = e.clientX; sy = e.clientY; moved = 0; startT = performance.now();
  });
  board.addEventListener('pointermove', (e) => {
    if (e.buttons === 0 && e.pointerType === 'mouse') return;
    const dx = e.clientX - sx;
    if (Math.abs(dx) > SIZE) {
      act(dx > 0 ? 'right' : 'left');
      sx = e.clientX;
      moved++;
    }
  });
  board.addEventListener('pointerup', (e) => {
    const dy = e.clientY - sy;
    const quick = performance.now() - startT < 300;
    if (dy > SIZE * 2.5 && quick) act('drop');
    else if (moved === 0 && Math.abs(dy) < 10) act('rotate');
  });

  window.addEventListener('resize', resize);
  resize();
})();
