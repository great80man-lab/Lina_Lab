// 마우스 포인터 옆을 날아다니는 오리
(() => {
  const duck = document.getElementById('duck');
  if (!duck) return;

  const OFFSET_X = 40;   // 포인터로부터 떨어진 거리
  const OFFSET_Y = -50;
  const EASE = 0.08;     // 따라오는 속도 (0~1)

  let mouseX = window.innerWidth / 2;
  let mouseY = window.innerHeight / 2;
  let x = mouseX, y = mouseY;
  let facingRight = true;
  let t = 0;

  const follow = (px, py) => { mouseX = px; mouseY = py; };

  // 마우스·펜·터치 모두 따라다님
  window.addEventListener('pointermove', (e) => follow(e.clientX, e.clientY), { passive: true });
  window.addEventListener('pointerdown', (e) => follow(e.clientX, e.clientY), { passive: true });

  // 스크롤 중에는 pointermove가 끊기므로 터치 이벤트로도 받음
  const onTouch = (e) => {
    const t = e.touches[0];
    if (t) follow(t.clientX, t.clientY);
  };
  window.addEventListener('touchstart', onTouch, { passive: true });
  window.addEventListener('touchmove', onTouch, { passive: true });

  function frame() {
    t += 0.05;

    // 진행 방향에 따라 포인터의 앞/뒤 옆자리를 잡음
    const side = facingRight ? -1 : 1;
    const targetX = mouseX + OFFSET_X * side;
    const targetY = mouseY + OFFSET_Y;

    const dx = targetX - x;
    const dy = targetY - y;
    x += dx * EASE;
    y += dy * EASE;

    // 방향 전환 (약간의 여유를 두어 떨림 방지)
    if (dx > 4 && !facingRight) facingRight = true;
    else if (dx < -4 && facingRight) facingRight = false;
    duck.classList.toggle('flip', !facingRight);

    // 속도가 느리면 날갯짓도 천천히
    const speed = Math.hypot(dx, dy);
    duck.classList.toggle('slow', speed < 8);

    // 둥실둥실 떠다니는 효과 + 이동 방향 기울기
    const bob = Math.sin(t * 2) * 6;
    const tilt = Math.max(-20, Math.min(20, dy * 0.15)) * (facingRight ? 1 : -1);

    const w = duck.offsetWidth, h = duck.offsetHeight;
    duck.style.transform =
      `translate(${x - w / 2}px, ${y - h / 2 + bob}px) rotate(${tilt}deg)`;

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
})();
