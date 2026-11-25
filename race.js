// 꽥꽥 냥냥 그랑프리 — 기획: 우리 딸 / 위에서 내려다보는 2차선 레이싱
(() => {
  const $ = (id) => document.getElementById(id);
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  // ---------- 데이터 ----------
  const CHARS = {
    duck: { name: '꽥꽥이', lane: 0, carColor: '#ff6b6b', sound: '꽥!' },
    cat:  { name: '냥냥이', lane: 1, carColor: '#4cc9f0', sound: '냥!' },
  };

  const SHOP = {
    car: [
      { id: 'basic',  name: '기본 레이서',   price: 0,   speed: 0,  color: null },
      { id: 'mint',   name: '민트 스프린터', price: 150, speed: 25, color: '#2ec4b6' },
      { id: 'purple', name: '보라 터보',     price: 400, speed: 50, color: '#9b5de5' },
      { id: 'rocket', name: '로켓 포뮬러',   price: 900, speed: 85, color: '#ff9f1c' },
    ],
    tire: [
      { id: 'basic',  name: '기본 타이어',   price: 0,   speed: 0,  color: '#2b2b2b', stripe: null },
      { id: 'sport',  name: '스포츠 타이어', price: 100, speed: 15, color: '#2b2b2b', stripe: '#ffd60a' },
      { id: 'racing', name: '레이싱 슬릭',   price: 300, speed: 30, color: '#1a1a1a', stripe: '#ff4d6d' },
      { id: 'gold',   name: '황금 타이어',   price: 700, speed: 45, color: '#c9a227', stripe: '#fff3b0' },
    ],
    costume: [
      { id: 'none',    name: '없음',        price: 0 },
      { id: 'glasses', name: '선글라스',    price: 60 },
      { id: 'ribbon',  name: '리본',        price: 60 },
      { id: 'helmet',  name: '레이싱 헬멧', price: 120 },
      { id: 'crown',   name: '왕관',        price: 250 },
    ],
  };
  const item = (kind, id) => SHOP[kind].find((i) => i.id === id) || SHOP[kind][0];

  const BASE_SPEED = 320;   // 기본 최고 속도
  const CPU_SPEED = 335;    // CPU 최고 속도 (기본 차보다 조금 빠름)
  const CPU_SKILL = 0.8;    // CPU가 장애물을 잘 넘을 확률
  const ACCEL = 260;
  const JUMP_TIME = 0.55;
  const RACE_LEN = 9000;
  const PRIZE = { 1: 100, 2: 30 };
  const COIN_VALUE = 10;

  // ---------- 저장 ----------
  const SAVE_KEY = 'qqnnGrandPrix';
  let save = {
    money: 0, char: 'duck',
    owned: { car: ['basic'], tire: ['basic'], costume: ['none'] },
    equip: { car: 'basic', tire: 'basic', costume: 'none' },
  };
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (s) save = { ...save, ...s, owned: { ...save.owned, ...s.owned }, equip: { ...save.equip, ...s.equip } };
  } catch (e) { /* 저장 불가 */ }
  const persist = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* 저장 불가 */ } };

  const playerMax = () => BASE_SPEED + item('car', save.equip.car).speed + item('tire', save.equip.tire).speed;
  const kmh = (v) => Math.round(v * 0.6);

  // ---------- 그림: 얼굴 (앞모습) ----------
  function drawFace(c, ch, x, y, r, costume) {
    c.save();
    c.translate(x, y);
    const fur = ch === 'duck' ? '#ffd60a' : '#f4a259';

    if (ch === 'cat') {
      for (const s of [-1, 1]) {
        c.fillStyle = fur;
        c.beginPath();
        c.moveTo(s * r * 0.95, -r * 0.25); c.lineTo(s * r * 0.78, -r * 1.2); c.lineTo(s * r * 0.18, -r * 0.88);
        c.closePath(); c.fill();
        c.fillStyle = '#ffb4a2';
        c.beginPath();
        c.moveTo(s * r * 0.78, -r * 0.4); c.lineTo(s * r * 0.72, -r * 0.98); c.lineTo(s * r * 0.36, -r * 0.8);
        c.closePath(); c.fill();
      }
    }

    c.fillStyle = fur;
    c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.fill();

    if (ch === 'cat') {
      // 이마 줄무늬
      c.strokeStyle = '#d9822b'; c.lineWidth = r * 0.08; c.lineCap = 'round';
      for (const dx of [-0.18, 0, 0.18]) {
        c.beginPath(); c.moveTo(dx * r, -r * 0.92); c.lineTo(dx * r, -r * 0.62); c.stroke();
      }
    } else {
      // 머리 깃털
      c.fillStyle = fur;
      c.beginPath(); c.ellipse(r * 0.08, -r * 1.02, r * 0.12, r * 0.25, 0.4, 0, Math.PI * 2); c.fill();
    }

    // 눈
    for (const s of [-1, 1]) {
      c.fillStyle = '#222';
      c.beginPath(); c.arc(s * r * 0.36, -r * 0.12, r * 0.13, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#fff';
      c.beginPath(); c.arc(s * r * 0.36 + r * 0.04, -r * 0.17, r * 0.045, 0, Math.PI * 2); c.fill();
    }
    // 볼
    c.fillStyle = 'rgba(255,120,120,.45)';
    for (const s of [-1, 1]) { c.beginPath(); c.arc(s * r * 0.62, r * 0.2, r * 0.13, 0, Math.PI * 2); c.fill(); }

    if (ch === 'duck') {
      // 부리
      c.fillStyle = '#ff8c00';
      c.beginPath(); c.ellipse(0, r * 0.3, r * 0.4, r * 0.2, 0, 0, Math.PI * 2); c.fill();
      c.strokeStyle = '#d96f00'; c.lineWidth = r * 0.05;
      c.beginPath(); c.moveTo(-r * 0.3, r * 0.3); c.lineTo(r * 0.3, r * 0.3); c.stroke();
    } else {
      // 코
      c.fillStyle = '#ff7b9c';
      c.beginPath(); c.moveTo(-r * 0.09, r * 0.1); c.lineTo(r * 0.09, r * 0.1); c.lineTo(0, r * 0.2); c.closePath(); c.fill();
      // 입 (w 모양)
      c.strokeStyle = '#7a3e12'; c.lineWidth = r * 0.05; c.lineCap = 'round';
      c.beginPath(); c.arc(-r * 0.1, r * 0.24, r * 0.1, 0.1 * Math.PI, 0.9 * Math.PI); c.stroke();
      c.beginPath(); c.arc(r * 0.1, r * 0.24, r * 0.1, 0.1 * Math.PI, 0.9 * Math.PI); c.stroke();
      // 튀어나온 앞니 2개
      c.fillStyle = '#fff'; c.strokeStyle = '#7a3e12'; c.lineWidth = r * 0.035;
      for (const tx of [-r * 0.12, r * 0.01]) {
        c.beginPath(); c.roundRect(tx, r * 0.33, r * 0.11, r * 0.2, r * 0.03); c.fill(); c.stroke();
      }
      // 수염
      c.strokeStyle = 'rgba(80,40,10,.6)'; c.lineWidth = r * 0.03;
      for (const s of [-1, 1]) for (const dy of [-0.04, 0.1]) {
        c.beginPath(); c.moveTo(s * r * 0.45, r * (0.18 + dy * 0.5)); c.lineTo(s * r * 1.05, r * (0.1 + dy)); c.stroke();
      }
    }

    // 옷 / 장식
    if (costume === 'helmet') {
      c.fillStyle = '#e63946';
      c.beginPath(); c.arc(0, -r * 0.3, r * 1.02, Math.PI, 0); c.closePath(); c.fill();
      c.fillStyle = '#fff'; c.fillRect(-r * 0.1, -r * 1.3, r * 0.2, r * 1.0);
      c.fillStyle = '#1d2a3a';
      c.beginPath(); c.roundRect(-r * 1.0, -r * 0.4, r * 2.0, r * 0.14, r * 0.07); c.fill();
    } else if (costume === 'glasses') {
      c.fillStyle = '#111';
      for (const s of [-1, 1]) { c.beginPath(); c.roundRect(s * r * 0.36 - r * 0.26, -r * 0.27, r * 0.52, r * 0.3, r * 0.1); c.fill(); }
      c.strokeStyle = '#111'; c.lineWidth = r * 0.06;
      c.beginPath(); c.moveTo(-r * 0.1, -r * 0.18); c.lineTo(r * 0.1, -r * 0.18); c.stroke();
      c.fillStyle = 'rgba(255,255,255,.35)';
      for (const s of [-1, 1]) { c.fillRect(s * r * 0.36 - r * 0.18, -r * 0.23, r * 0.12, r * 0.06); }
    } else if (costume === 'ribbon') {
      c.save(); c.translate(r * 0.55, -r * 0.82); c.rotate(0.3);
      c.fillStyle = '#ff5d8f';
      for (const s of [-1, 1]) {
        c.beginPath(); c.moveTo(0, 0); c.lineTo(s * r * 0.45, -r * 0.25); c.lineTo(s * r * 0.45, r * 0.25); c.closePath(); c.fill();
      }
      c.fillStyle = '#ff2e6e'; c.beginPath(); c.arc(0, 0, r * 0.12, 0, Math.PI * 2); c.fill();
      c.restore();
    } else if (costume === 'crown') {
      c.fillStyle = '#ffc300'; c.strokeStyle = '#d4a000'; c.lineWidth = r * 0.04;
      c.beginPath();
      c.moveTo(-r * 0.5, -r * 0.78); c.lineTo(-r * 0.55, -r * 1.35); c.lineTo(-r * 0.25, -r * 1.05);
      c.lineTo(0, -r * 1.45); c.lineTo(r * 0.25, -r * 1.05); c.lineTo(r * 0.55, -r * 1.35); c.lineTo(r * 0.5, -r * 0.78);
      c.closePath(); c.fill(); c.stroke();
      c.fillStyle = '#e63946'; c.beginPath(); c.arc(0, -r * 0.95, r * 0.09, 0, Math.PI * 2); c.fill();
    }
    c.restore();
  }

  // ---------- 그림: 포뮬러 스타일 경주차 (위에서 본 모습) ----------
  function drawCar(c, x, y, o) {
    const lift = o.lift || 0;
    const sc = 1 + lift * 0.35;
    c.fillStyle = 'rgba(0,0,0,.25)';
    c.beginPath(); c.ellipse(x + lift * 12, y + 6 + lift * 16, 28 * (1 - lift * 0.2), 44 * (1 - lift * 0.2), 0, 0, Math.PI * 2); c.fill();

    c.save();
    c.translate(x, y);
    c.rotate(o.wobble || 0);
    c.scale(sc, sc);

    // 축
    c.strokeStyle = '#555'; c.lineWidth = 3;
    for (const wy of [-26, 24]) { c.beginPath(); c.moveTo(-24, wy); c.lineTo(24, wy); c.stroke(); }
    // 바퀴
    for (const [wx, wy] of [[-25, -26], [25, -26], [-26, 24], [26, 24]]) {
      c.fillStyle = o.tire;
      c.beginPath(); c.roundRect(wx - 7, wy - 11, 14, 22, 4); c.fill();
      if (o.stripe) { c.fillStyle = o.stripe; c.fillRect(wx - 7, wy - 1.5, 14, 3); }
    }
    // 앞날개
    c.fillStyle = o.color;
    c.beginPath(); c.roundRect(-31, -48, 62, 8, 3); c.fill();
    // 몸통
    c.beginPath();
    c.moveTo(-6, -46); c.lineTo(6, -46); c.lineTo(14, -10); c.lineTo(18, 22); c.lineTo(12, 36);
    c.lineTo(-12, 36); c.lineTo(-18, 22); c.lineTo(-14, -10);
    c.closePath(); c.fill();
    c.fillStyle = 'rgba(255,255,255,.85)'; c.fillRect(-2, -44, 4, 26);
    // 뒷날개
    c.fillStyle = o.color;
    c.beginPath(); c.roundRect(-27, 36, 54, 9, 3); c.fill();
    c.fillStyle = 'rgba(0,0,0,.25)';
    c.beginPath(); c.roundRect(-27, 36, 54, 9, 3); c.fill();
    // 운전석
    c.fillStyle = 'rgba(0,0,0,.35)';
    c.beginPath(); c.ellipse(0, 4, 12, 15, 0, 0, Math.PI * 2); c.fill();
    drawFace(c, o.char, 0, 4, 13, o.costume);
    c.restore();
  }

  function playerLook() {
    const car = item('car', save.equip.car), tire = item('tire', save.equip.tire);
    return {
      char: save.char, costume: save.equip.costume,
      color: car.color || CHARS[save.char].carColor, tire: tire.color, stripe: tire.stripe,
    };
  }

  // ---------- 장애물 / 동전 ----------
  function drawObstacle(c, x, y, type) {
    if (type === 'cone') {
      c.fillStyle = 'rgba(0,0,0,.2)'; c.beginPath(); c.ellipse(x + 3, y + 4, 17, 17, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#ff7b00'; c.beginPath(); c.arc(x, y, 16, 0, Math.PI * 2); c.fill();
      c.strokeStyle = '#fff'; c.lineWidth = 4; c.beginPath(); c.arc(x, y, 9, 0, Math.PI * 2); c.stroke();
      c.fillStyle = '#ff9f1c'; c.beginPath(); c.arc(x, y, 4, 0, Math.PI * 2); c.fill();
    } else if (type === 'tires') {
      for (const [dx, dy] of [[-12, 6], [12, 6], [0, -10]]) {
        c.fillStyle = '#1a1a1a'; c.beginPath(); c.arc(x + dx, y + dy, 11, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#555'; c.beginPath(); c.arc(x + dx, y + dy, 5, 0, Math.PI * 2); c.fill();
      }
    } else { // 기름 웅덩이
      c.fillStyle = '#2d1e3e';
      c.beginPath(); c.ellipse(x, y, 30, 14, 0.1, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.ellipse(x - 16, y + 6, 12, 8, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = 'rgba(180,140,255,.4)';
      c.beginPath(); c.ellipse(x + 6, y - 4, 10, 3, 0.1, 0, Math.PI * 2); c.fill();
    }
  }

  function drawCoin(c, x, y, t) {
    const sx = Math.max(0.2, Math.abs(Math.cos(t * 4)));
    c.save(); c.translate(x, y); c.scale(sx, 1);
    c.fillStyle = '#ffc300'; c.beginPath(); c.arc(0, 0, 10, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#e09f00'; c.lineWidth = 2.5; c.beginPath(); c.arc(0, 0, 6.5, 0, Math.PI * 2); c.stroke();
    c.fillStyle = 'rgba(255,255,255,.6)'; c.beginPath(); c.arc(-3, -3, 2.5, 0, Math.PI * 2); c.fill();
    c.restore();
  }

  // ---------- 화면 전환 ----------
  function show(id) {
    document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('active', s.id === id));
    $('money').textContent = save.money;
    if (id === 'title') drawTitle();
    if (id === 'shop') renderShop();
  }

  // ---------- 처음 화면 ----------
  function drawTitle() {
    document.querySelectorAll('.char').forEach((btn) => {
      const ch = btn.dataset.char;
      btn.classList.toggle('on', ch === save.char);
      const cv = btn.querySelector('canvas'), c = cv.getContext('2d');
      c.clearRect(0, 0, cv.width, cv.height);
      drawFace(c, ch, 100, 112, 62, ch === save.char ? save.equip.costume : 'none');
    });
  }
  document.querySelectorAll('.char').forEach((btn) => btn.addEventListener('click', () => {
    save.char = btn.dataset.char; persist(); drawTitle();
  }));
  $('go').addEventListener('click', startRace);
  $('to-shop').addEventListener('click', () => show('shop'));

  // ---------- 경주 ----------
  const cv = $('track');
  const ctx = cv.getContext('2d');
  const VW = 360;           // 가상 화면 너비
  let VH = 640;
  const TRACK_L = 60, TRACK_W = 240, LANE_W = TRACK_W / 2;
  const laneX = (i) => TRACK_L + LANE_W * (i + 0.5);

  let race = null, rafId = 0;

  function sizeCanvas() {
    const header = document.querySelector('.top').offsetHeight;
    const w = Math.min(window.innerWidth - 26, 440);  // 테두리 10px 포함해 한 화면에 맞춤
    const h = Math.max(320, window.innerHeight - header - 106);
    const dpr = window.devicePixelRatio || 1;
    cv.style.width = w + 'px';
    cv.style.height = h + 'px';
    cv.width = Math.round(w * dpr);
    cv.height = Math.round(h * dpr);
    VH = VW * h / w;
    ctx.setTransform(cv.width / VW, 0, 0, cv.width / VW, 0, 0);
  }

  function makeRacer(ch, isPlayer) {
    const look = isPlayer ? playerLook()
      : { char: ch, costume: 'none', color: CHARS[ch].carColor, tire: '#2b2b2b', stripe: null };
    return {
      ch, isPlayer, lane: CHARS[ch].lane, look,
      max: isPlayer ? playerMax() : CPU_SPEED,
      d: 0, v: 0, jumpT: 0, stunT: 0, coins: 0, finishedAt: null,
    };
  }

  function startRace() {
    const cpuCh = save.char === 'duck' ? 'cat' : 'duck';
    const player = makeRacer(save.char, true);
    const cpu = makeRacer(cpuCh, false);

    const obstacles = [[], []];
    for (let lane = 0; lane < 2; lane++) {
      let d = 700;
      while (d < RACE_LEN - 300) {
        obstacles[lane].push({ d, type: pick(['cone', 'tires', 'oil']), hit: false, cpuPlan: null });
        d += rand(380, 720);
      }
    }
    // 동전: 장애물 사이에 줄지어, 가끔 장애물 바로 위에도 (점프하면 먹을 수 있음)
    const coins = [];
    const obs = obstacles[player.lane];
    let prev = 200;
    for (const o of [...obs, { d: RACE_LEN }]) {
      const n = Math.floor(rand(2, 5));
      const startD = prev + 110;
      if (Math.random() < 0.6 && startD + n * 45 < o.d - 90) for (let i = 0; i < n; i++) coins.push({ d: startD + i * 45, got: false });
      if (o.d < RACE_LEN && Math.random() < 0.45) coins.push({ d: o.d, got: false });
      prev = o.d;
    }

    race = { player, cpu, obstacles, coins, t: -3, pops: [], over: false, endTimer: 0 };
    show('race');
    sizeCanvas();
    cancelAnimationFrame(rafId);
    last = performance.now();
    rafId = requestAnimationFrame(loop);
  }

  function jump(r) {
    if (race.t < 0 || r.jumpT > 0 || r.stunT > 0 || r.finishedAt !== null) return;
    r.jumpT = JUMP_TIME;
  }

  function updateRacer(r, dt) {
    if (race.t < 0) return;
    if (r.stunT > 0) {
      r.stunT -= dt;
    } else {
      r.v = Math.min(r.max, r.v + ACCEL * dt);
    }
    if (r.finishedAt !== null) r.v = Math.max(80, r.v - 400 * dt);
    r.d += r.v * dt;
    if (r.jumpT > 0) r.jumpT = Math.max(0, r.jumpT - dt);

    // 장애물 충돌
    for (const o of race.obstacles[r.lane]) {
      if (o.hit || Math.abs(o.d - r.d) > 26) continue;
      if (r.jumpT > 0) continue;
      o.hit = true;
      r.v *= 0.3;
      r.stunT = 0.6;
      race.pops.push({ lane: r.lane, d: r.d, text: CHARS[r.ch].sound, life: 1, color: '#e63946' });
    }

    if (r.finishedAt === null && r.d >= RACE_LEN) r.finishedAt = race.t;
  }

  function cpuThink(r) {
    const o = race.obstacles[r.lane].find((ob) => ob.d > r.d - 10 && !ob.hit);
    if (!o) return;
    const dist = o.d - r.d;
    if (o.cpuPlan === null && dist < 160) o.cpuPlan = Math.random() < CPU_SKILL;
    if (o.cpuPlan && dist < r.v * JUMP_TIME * 0.5 + 8) jump(r);
  }

  let last = 0;
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const { player, cpu } = race;

    race.t += dt;
    cpuThink(cpu);
    updateRacer(player, dt);
    updateRacer(cpu, dt);

    for (const coin of race.coins) {
      if (!coin.got && Math.abs(coin.d - player.d) < 24) {
        coin.got = true;
        player.coins++;
        race.pops.push({ lane: player.lane, d: player.d, text: '+10', life: 0.7, color: '#ffb703' });
      }
    }
    race.pops.forEach((p) => { p.life -= dt; p.d += 60 * dt; });
    race.pops = race.pops.filter((p) => p.life > 0);

    draw(now / 1000);

    if (player.finishedAt !== null) {
      race.endTimer += dt;
      if (race.endTimer > 1.2) return finish();
    }
    rafId = requestAnimationFrame(loop);
  }

  function draw(time) {
    const { player, cpu } = race;
    const cam = player.d;
    const PY = VH * 0.72;
    const sy = (d) => PY - (d - cam);
    const dMin = cam - (VH - PY) - 60, dMax = cam + PY + 60;

    // 잔디
    ctx.fillStyle = '#58b368';
    ctx.fillRect(0, 0, VW, VH);
    ctx.fillStyle = '#4ea35d';
    for (let k = Math.floor(dMin / 80); k * 80 < dMax; k++) {
      if (k % 2) ctx.fillRect(0, sy((k + 1) * 80), VW, 80);
    }
    // 도로
    ctx.fillStyle = '#4a4e57';
    ctx.fillRect(TRACK_L, 0, TRACK_W, VH);
    // 연석 (빨강/하양)
    for (let k = Math.floor(dMin / 30); k * 30 < dMax; k++) {
      ctx.fillStyle = k % 2 ? '#e63946' : '#ffffff';
      const y = sy((k + 1) * 30);
      ctx.fillRect(TRACK_L - 12, y, 12, 30);
      ctx.fillRect(TRACK_L + TRACK_W, y, 12, 30);
    }
    // 가운데 점선
    ctx.fillStyle = 'rgba(255,255,255,.8)';
    for (let k = Math.floor(dMin / 60); k * 60 < dMax; k++) {
      ctx.fillRect(TRACK_L + LANE_W - 2, sy(k * 60 + 30), 4, 30);
    }
    // 출발선 / 결승선
    for (const [d, label] of [[0, '출발'], [RACE_LEN, '결승']]) {
      const y = sy(d);
      if (y < -40 || y > VH + 40) continue;
      const sq = 12;
      for (let row = 0; row < 2; row++)
        for (let col = 0; col < TRACK_W / sq; col++) {
          ctx.fillStyle = (row + col) % 2 ? '#111' : '#fff';
          ctx.fillRect(TRACK_L + col * sq, y - sq * (row + 1), sq, sq);
        }
      ctx.fillStyle = '#fff';
      ctx.font = '800 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(label, 30, y - 6);
      ctx.fillText(label, VW - 30, y - 6);
    }

    // 장애물
    for (let lane = 0; lane < 2; lane++)
      for (const o of race.obstacles[lane]) {
        if (o.d < dMin || o.d > dMax) continue;
        ctx.globalAlpha = o.hit ? 0.4 : 1;
        drawObstacle(ctx, laneX(lane), sy(o.d), o.type);
        ctx.globalAlpha = 1;
      }
    // 동전
    for (const coin of race.coins) {
      if (coin.got || coin.d < dMin || coin.d > dMax) continue;
      drawCoin(ctx, laneX(player.lane), sy(coin.d), time);
    }

    // 차 (CPU 먼저)
    for (const r of [cpu, player]) {
      const y = sy(r.d);
      if (y < -80 || y > VH + 80) continue;
      const lift = r.jumpT > 0 ? Math.sin(Math.PI * (1 - r.jumpT / JUMP_TIME)) : 0;
      const wobble = r.stunT > 0 ? Math.sin(r.stunT * 40) * 0.35 : 0;
      drawCar(ctx, laneX(r.lane), y, { ...r.look, lift, wobble });
      ctx.font = '800 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = r.isPlayer ? '#ffd60a' : '#fff';
      ctx.fillText(r.isPlayer ? '▼ 나' : 'CPU', laneX(r.lane), y - 60 - lift * 14);
    }

    // 튀어오르는 글자
    for (const p of race.pops) {
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life * 1.5));
      ctx.font = '900 22px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = p.color;
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 4;
      ctx.strokeText(p.text, laneX(p.lane) + 34, sy(p.d) - 30);
      ctx.fillText(p.text, laneX(p.lane) + 34, sy(p.d) - 30);
      ctx.globalAlpha = 1;
    }

    // 위쪽 정보: 진행 막대
    ctx.fillStyle = 'rgba(0,0,0,.35)';
    ctx.beginPath(); ctx.roundRect(12, 10, VW - 24, 38, 12); ctx.fill();
    const barL = 24, barW = VW - 120;
    ctx.fillStyle = 'rgba(255,255,255,.3)';
    ctx.fillRect(barL, 27, barW, 4);
    for (const r of [cpu, player]) {
      const px = barL + barW * Math.min(1, r.d / RACE_LEN);
      ctx.save(); ctx.translate(px, 29);
      drawFace(ctx, r.ch, 0, 0, 9, r.isPlayer ? r.look.costume : 'none');
      ctx.restore();
    }
    ctx.fillStyle = '#fff'; ctx.textAlign = 'right'; ctx.font = '800 14px sans-serif';
    ctx.fillText(`💰 ${player.coins * COIN_VALUE}`, VW - 22, 34);
    ctx.fillStyle = 'rgba(0,0,0,.4)';
    ctx.beginPath(); ctx.roundRect(VW / 2 - 44, VH - 34, 88, 24, 12); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.font = '800 13px sans-serif';
    ctx.fillText(`${kmh(player.v)} km/h`, VW / 2, VH - 17);

    // 출발 신호
    if (race.t < 0.6) {
      const n = Math.ceil(-race.t);
      const text = race.t < 0 ? String(n) : '출발!';
      ctx.font = '900 72px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = race.t < 0 ? '#fff' : '#ffd60a';
      ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.lineWidth = 8;
      ctx.strokeText(text, VW / 2, VH * 0.42);
      ctx.fillText(text, VW / 2, VH * 0.42);
    }
  }

  function finish() {
    const { player, cpu } = race;
    const rank = cpu.finishedAt !== null && cpu.finishedAt < player.finishedAt ? 2 : 1;
    const prize = PRIZE[rank];
    const coinMoney = player.coins * COIN_VALUE;
    save.money += prize + coinMoney;
    persist();

    $('r-title').textContent = rank === 1 ? '🏆 1등!' : '🥈 2등!';
    $('r-prize').textContent = `💰 ${prize}`;
    $('r-coins').textContent = `${player.coins}개 · 💰 ${coinMoney}`;
    $('r-total').textContent = `💰 ${prize + coinMoney}`;
    const fc = $('r-face').getContext('2d');
    fc.clearRect(0, 0, 200, 200);
    drawFace(fc, save.char, 100, 112, 62, save.equip.costume);
    race = null;
    show('result');
  }

  // 점프 입력
  const doJump = (e) => {
    if (!race) return;
    if (e) e.preventDefault();
    jump(race.player);
  };
  $('jump').addEventListener('pointerdown', doJump);
  cv.addEventListener('pointerdown', doJump);
  document.addEventListener('keydown', (e) => {
    if (race && (e.key === ' ' || e.key === 'ArrowUp')) doJump(e);
  });
  window.addEventListener('resize', () => { if (race) sizeCanvas(); });

  $('again').addEventListener('click', startRace);
  $('r-shop').addEventListener('click', () => show('shop'));
  $('r-home').addEventListener('click', () => show('title'));

  // ---------- 상점 ----------
  let tab = 'car';
  document.querySelectorAll('.tabs button').forEach((b) => b.addEventListener('click', () => {
    tab = b.dataset.tab;
    document.querySelectorAll('.tabs button').forEach((x) => x.classList.toggle('on', x === b));
    renderShop();
  }));
  $('shop-back').addEventListener('click', () => show('title'));

  function renderShop() {
    // 미리보기
    const pc = $('shop-preview').getContext('2d');
    pc.clearRect(0, 0, 600, 360);
    pc.save(); pc.translate(170, 185); pc.scale(2.6, 2.6);
    drawCar(pc, 0, 0, playerLook());
    pc.restore();
    drawFace(pc, save.char, 430, 200, 95, save.equip.costume);
    $('shop-speed').textContent = `${CHARS[save.char].name} · 최고 속도 ${kmh(playerMax())} km/h`;
    $('money').textContent = save.money;

    const list = $('shop-list');
    list.innerHTML = '';
    for (const it of SHOP[tab]) {
      const li = document.createElement('li');
      const sw = document.createElement('span');
      sw.className = 'swatch';
      if (tab === 'car') sw.style.background = it.color || CHARS[save.char].carColor;
      else if (tab === 'tire') sw.style.background = it.stripe ? `linear-gradient(${it.color} 40%, ${it.stripe} 40% 60%, ${it.color} 60%)` : it.color;
      else { sw.style.background = '#f1f5f9'; sw.textContent = { none: '', glasses: '🕶️', ribbon: '🎀', helmet: '⛑️', crown: '👑' }[it.id]; sw.style.textAlign = 'center'; sw.style.lineHeight = '28px'; }

      const nm = document.createElement('div');
      nm.className = 'item-name';
      nm.innerHTML = `<b>${it.name}</b><small>${tab === 'costume' ? '꾸미기' : it.speed ? `속도 +${kmh(it.speed)} km/h` : '기본'}</small>`;

      const btn = document.createElement('button');
      const owned = save.owned[tab].includes(it.id);
      const equipped = save.equip[tab] === it.id;
      if (equipped) { btn.textContent = '사용 중'; btn.disabled = true; btn.className = 'equip'; }
      else if (owned) { btn.textContent = '사용하기'; btn.className = 'equip'; }
      else { btn.textContent = `💰 ${it.price}`; btn.disabled = save.money < it.price; }
      btn.addEventListener('click', () => {
        if (!owned) {
          if (save.money < it.price) return;
          save.money -= it.price;
          save.owned[tab].push(it.id);
        }
        save.equip[tab] = it.id;
        persist();
        renderShop();
      });

      li.append(sw, nm, btn);
      list.appendChild(li);
    }
  }

  show('title');
})();
