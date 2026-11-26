// 레이싱 게임 음악 & 효과음 — 직접 작곡한 8비트 곡을 Web Audio로 연주 (음악 파일 없음)
(() => {
  const STORE_KEY = 'qqnnSound';
  let muted = false;
  try { muted = localStorage.getItem(STORE_KEY) === 'off'; } catch (e) { /* 저장 불가 */ }

  let ctx = null, master = null, musicGain = null, sfxGain = null, noiseBuf = null;
  let wanted = null;       // 틀고 싶은 곡 이름
  let playing = null;      // 지금 연주 중인 곡
  let timer = 0, step = 0, nextTime = 0;

  const freq = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const _ = null;

  // ---------- 곡 ----------
  // 경주 곡: 빠르고 신나는 C - G - Am - F 진행
  const RACE = {
    bpm: 152, lead: 'square', drums: true, leadVol: 0.16, bassVol: 0.2,
    roots: [48, 43, 45, 41, 48, 43, 45, 43],
    melody: [
      [76, _, 79, _, 84, _, 79, _, 76, _, 79, 81, 79, _, 76, _],
      [74, _, 79, _, 83, _, 79, _, 74, _, 79, 81, 83, _, 86, _],
      [76, _, 81, _, 84, _, 81, _, 76, _, 81, 83, 84, _, 88, _],
      [77, _, 81, _, 84, _, 86, _, 84, _, 81, _, 79, _, 77, _],
      [84, 84, _, 84, _, 79, _, 76, 79, _, 84, _, 88, _, _, _],
      [86, 86, _, 86, _, 83, _, 79, 83, _, 86, _, 91, _, _, _],
      [88, _, 86, _, 84, _, 83, _, 81, _, 83, _, 84, _, 86, _],
      [84, _, 81, _, 77, _, 81, _, 83, _, 86, _, 91, _, _, _],
    ],
  };
  // 메뉴 곡: 느긋하고 귀여운 분위기
  const MENU = {
    bpm: 108, lead: 'triangle', drums: false, leadVol: 0.22, bassVol: 0.16,
    roots: [48, 45, 41, 43],
    melody: [
      [72, _, _, 76, _, _, 79, _, 76, _, _, _, 74, _, 72, _],
      [69, _, _, 72, _, _, 76, _, 74, _, _, _, 72, _, _, _],
      [65, _, _, 69, _, _, 72, _, 74, _, 72, _, 69, _, _, _],
      [67, _, _, 71, _, _, 74, _, 79, _, 77, _, 74, _, 71, _],
    ],
  };
  const SONGS = { race: RACE, menu: MENU };

  // ---------- 기본 소리 ----------
  function init() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.5;
    master.connect(ctx.destination);
    musicGain = ctx.createGain(); musicGain.gain.value = 0.55; musicGain.connect(master);
    sfxGain = ctx.createGain(); sfxGain.gain.value = 0.9; sfxGain.connect(master);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }

  function tone(dest, type, f, t, dur, vol, slideTo) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest);
    o.start(t); o.stop(t + dur + 0.02);
  }

  function noise(dest, t, dur, vol, hp) {
    const s = ctx.createBufferSource(), g = ctx.createGain(), f = ctx.createBiquadFilter();
    s.buffer = noiseBuf;
    f.type = 'highpass'; f.frequency.value = hp;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(dest);
    s.start(t); s.stop(t + dur + 0.02);
  }

  // ---------- 곡 연주 (미리 예약하는 방식) ----------
  function scheduleStep(song, i, t) {
    const sixteenth = 60 / song.bpm / 4;
    const bar = Math.floor(i / 16) % song.melody.length;
    const s = i % 16;
    const note = song.melody[bar][s];
    if (note) {
      // 다음 음표까지 길이만큼 늘여 연주
      let len = 1;
      while (s + len < 16 && song.melody[bar][s + len] === null && len < 4) len++;
      tone(musicGain, song.lead, freq(note), t, sixteenth * len * 0.95, song.leadVol);
    }
    // 베이스: 8분음표로 근음과 옥타브를 번갈아
    if (s % 2 === 0) {
      const root = song.roots[bar % song.roots.length];
      tone(musicGain, 'triangle', freq(s % 4 === 0 ? root : root + 12), t, sixteenth * 1.8, song.bassVol);
    }
    if (song.drums) {
      if (s % 4 === 0) tone(musicGain, 'sine', 150, t, 0.12, 0.5, 45);            // 쿵
      if (s === 4 || s === 12) noise(musicGain, t, 0.12, 0.25, 1200);              // 탁
      if (s % 2 === 1) noise(musicGain, t, 0.03, s % 4 === 3 ? 0.08 : 0.04, 7000); // 치
    } else if (s === 0 || s === 8) {
      noise(musicGain, t, 0.03, 0.05, 7000);
    }
  }

  function tick() {
    if (!playing) return;
    const song = SONGS[playing];
    const sixteenth = 60 / song.bpm / 4;
    while (nextTime < ctx.currentTime + 0.15) {
      scheduleStep(song, step, nextTime);
      step++;
      nextTime += sixteenth;
    }
  }

  function startSong(name) {
    if (!ctx || playing === name) return;
    stopSong();
    playing = name;
    step = 0;
    nextTime = ctx.currentTime + 0.06;
    musicGain.gain.cancelScheduledValues(ctx.currentTime);
    musicGain.gain.setValueAtTime(0.55, ctx.currentTime);
    timer = setInterval(tick, 25);
    tick();
  }

  function stopSong() {
    clearInterval(timer);
    timer = 0;
    playing = null;
    if (ctx) {
      // 이미 예약된 음은 살짝 줄여서 끊김 없이 정리
      const g = musicGain;
      g.gain.cancelScheduledValues(ctx.currentTime);
      g.gain.setValueAtTime(g.gain.value, ctx.currentTime);
      g.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.12);
      const old = g;
      musicGain = ctx.createGain(); musicGain.gain.value = 0.55; musicGain.connect(master);
      setTimeout(() => old.disconnect(), 400);
    }
  }

  // ---------- 효과음 ----------
  const SFX = {
    jump(t) { tone(sfxGain, 'square', 320, t, 0.16, 0.18, 760); },
    coin(t) { tone(sfxGain, 'square', 988, t, 0.06, 0.12); tone(sfxGain, 'square', 1319, t + 0.06, 0.12, 0.12); },
    hit(t) { noise(sfxGain, t, 0.25, 0.5, 300); tone(sfxGain, 'sawtooth', 220, t, 0.3, 0.2, 55); },
    beep(t) { tone(sfxGain, 'square', 523, t, 0.18, 0.2); },
    go(t) { tone(sfxGain, 'square', 1047, t, 0.4, 0.22); },
    win(t) { [72, 76, 79, 84, 79, 84].forEach((m, i) => tone(sfxGain, 'square', freq(m), t + i * 0.11, i === 5 ? 0.5 : 0.12, 0.18)); },
    lose(t) { [76, 74, 72, 67].forEach((m, i) => tone(sfxGain, 'triangle', freq(m), t + i * 0.16, i === 3 ? 0.45 : 0.15, 0.25)); },
  };

  // ---------- 바깥에서 쓰는 기능 ----------
  window.RaceAudio = {
    // 사용자가 화면을 처음 누를 때 소리를 켬 (브라우저 규칙)
    unlock() {
      init();
      if (!ctx) return;
      if (ctx.state === 'suspended') ctx.resume();
      if (wanted && playing !== wanted) startSong(wanted);
    },
    play(name) {
      wanted = name;
      if (ctx && ctx.state !== 'closed') startSong(name);
    },
    stop() { wanted = null; stopSong(); },
    sfx(name) {
      if (!ctx || muted || !SFX[name]) return;
      SFX[name](ctx.currentTime + 0.01);
    },
    isMuted: () => muted,
    toggleMute() {
      muted = !muted;
      try { localStorage.setItem(STORE_KEY, muted ? 'off' : 'on'); } catch (e) { /* 저장 불가 */ }
      if (master) master.gain.setValueAtTime(muted ? 0 : 0.5, ctx.currentTime);
      return muted;
    },
  };

  // 다른 탭으로 가면 잠시 멈춤
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) ctx.suspend();
    else ctx.resume();
  });
})();
