(() => {
  const canvas = document.querySelector('#game');
  const ctx = canvas.getContext('2d');
  const overlay = document.querySelector('#overlay');
  const playButton = document.querySelector('#play-button');
  const installButton = document.querySelector('#install-button');
  const scoreDisplay = document.querySelector('#score');
  const headline = document.querySelector('#headline');
  const eyebrow = document.querySelector('#eyebrow');
  const description = document.querySelector('#description');
  const overlayMonkey = document.querySelector('#overlay-monkey');

  let w = 0, h = 0, dpr = 1, platforms = [], player, cameraX = 0;
  let score = 0, state = 'ready', lastTime = 0, waterTime = 0, particles = [];
  let best = 0;
  try { best = Number(localStorage.getItem('monkeyRiverBest') || 0); } catch (_) { /* localStorage pode estar indisponível */ }
  const rand = (min, max) => min + Math.random() * (max - min);
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  function resize() {
    const rect = canvas.getBoundingClientRect();
    w = rect.width; h = rect.height; dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    makeWorld(); draw();
  }

  function makeWorld() {
    const floor = h * .72;
    platforms = [{ x: 30, y: floor, width: clamp(w * .19, 110, 155), height: 28, visited: false }];
    let x = platforms[0].x + platforms[0].width, y = floor;
    for (let i = 0; i < 12; i++) {
      const gap = rand(64, 94), width = rand(105, 145);
      y = clamp(y + rand(-35, 35), h * .54, h * .78);
      x += gap; platforms.push({ x, y, width, height: 26, visited: false }); x += width;
    }
    player = { x: 76, y: floor - 48, vy: 0, width: 44, height: 48, grounded: true, coyote: 0 };
    cameraX = 0; score = 0; scoreDisplay.textContent = '0'; particles = [];
  }

  function addPlatform() {
    const last = platforms[platforms.length - 1];
    const gap = rand(64, 94), width = rand(105, 145);
    const y = clamp(last.y + rand(-37, 37), h * .54, h * .78);
    platforms.push({ x: last.x + last.width + gap, y, width, height: 26, visited: false });
  }

  function startGame() {
    if (state === 'over') makeWorld();
    state = 'playing'; overlay.classList.add('hidden'); lastTime = performance.now();
    requestAnimationFrame(loop);
  }

  function jump() {
    if (state === 'ready' || state === 'over') { startGame(); return; }
    if (player.grounded || player.coyote > 0) {
      player.vy = -12.5; player.grounded = false; player.coyote = 0;
      for (let i = 0; i < 6; i++) particles.push({ x: player.x + 20, y: player.y + 45, vx: rand(-1.5, 1.5), vy: rand(-2, -.4), life: .4 });
    }
  }

  function endGame() {
    if (state !== 'playing') return;
    state = 'over'; best = Math.max(best, score);
    try { localStorage.setItem('monkeyRiverBest', String(best)); } catch (_) { /* ignore */ }
    eyebrow.textContent = 'PLUFT! HORA DE TENTAR DE NOVO';
    headline.innerHTML = `Você fez<br><span>${score} ${score === 1 ? 'ponto' : 'pontos'}!</span>`;
    description.textContent = `Seu recorde é ${best} ${best === 1 ? 'ponto' : 'pontos'}. Será que você consegue ir mais longe?`;
    overlayMonkey.textContent = '🙈'; playButton.innerHTML = 'Jogar de novo <span aria-hidden="true">↻</span>';
    overlay.classList.remove('hidden');
  }

  function update(dt) {
    waterTime += dt;
    const speed = clamp(3.25 + score * .035, 3.25, 5.4);
    player.x += speed * dt * 60;
    const oldBottom = player.y + player.height;
    player.vy += .58 * dt * 60;
    player.y += player.vy * dt * 60;
    player.grounded = false;
    for (const pad of platforms) {
      const overlaps = player.x + player.width * .78 > pad.x && player.x + player.width * .22 < pad.x + pad.width;
      const bottom = player.y + player.height;
      if (overlaps && player.vy >= 0 && oldBottom <= pad.y + 7 && bottom >= pad.y && bottom < pad.y + 28) {
        player.y = pad.y - player.height; player.vy = 0; player.grounded = true;
        if (!pad.visited) {
          pad.visited = true;
          if (pad !== platforms[0]) { score++; scoreDisplay.textContent = String(score); }
          for (let i = 0; i < 5; i++) particles.push({ x: player.x + rand(10, 38), y: pad.y, vx: rand(-1, 1), vy: rand(-1.7, -.3), life: .35 });
        }
      }
    }
    player.coyote = player.grounded ? .12 : Math.max(0, player.coyote - dt);
    cameraX = Math.max(0, player.x - w * .29);
    while (platforms[platforms.length - 1].x - cameraX < w + 250) addPlatform();
    platforms = platforms.filter(p => p.x + p.width > cameraX - 120);
    particles = particles.filter(p => p.life > 0);
    particles.forEach(p => { p.x += p.vx * dt * 60; p.y += p.vy * dt * 60; p.life -= dt; });
    if (player.y > h + 70) endGame();
  }

  function drawBackground() {
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#38d4bd'); sky.addColorStop(.48, '#14b9a6'); sky.addColorStop(1, '#087d91');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
    // Sol brilhante e folhas da floresta.
    ctx.fillStyle = 'rgba(255,239,125,.72)'; ctx.beginPath(); ctx.arc(w * .78, h * .2, 43, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#13855c'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(w, 0); ctx.lineTo(w, 28);
    for (let x = w; x >= 0; x -= 30) ctx.lineTo(x, 23 + Math.sin(x * .04 + waterTime) * 8);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#65c85c';
    for (let i = 0; i < 22; i++) {
      let x = ((i * 61 - cameraX * .12) % (w + 60) + w + 60) % (w + 60) - 30;
      ctx.beginPath(); ctx.ellipse(x, 17 + Math.sin(i) * 7, 21, 10, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = .23;
    for (let i = 0; i < 14; i++) {
      const x = ((i * 93 + waterTime * (12 + i % 4 * 4)) % (w + 50)) - 25;
      const y = (i * 71 + 35) % h;
      ctx.strokeStyle = '#e0fff0'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(x, y, 12 + i % 4 * 4, 3, 0, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function drawPad(pad) {
    const x = pad.x - cameraX, y = pad.y + Math.sin(waterTime * 2 + pad.x * .02) * 2;
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = 'rgba(0,72,57,.28)'; ctx.beginPath(); ctx.ellipse(pad.width / 2, 10, pad.width / 2, 15, 0, 0, Math.PI * 2); ctx.fill();
    const leaf = ctx.createLinearGradient(0, -20, 0, 19);
    leaf.addColorStop(0, '#8be55b'); leaf.addColorStop(1, '#22a852'); ctx.fillStyle = leaf;
    ctx.beginPath(); ctx.ellipse(pad.width / 2, 0, pad.width / 2, 17, 0, .18, Math.PI * 2 - .27); ctx.lineTo(pad.width / 2, 0); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(235,255,164,.72)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(pad.width / 2, 0); ctx.lineTo(pad.width - 10, -10); ctx.stroke();
    ctx.fillStyle = '#f5ff9c'; ctx.beginPath(); ctx.arc(pad.width * .29, -7, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function drawMonkey() {
    const x = player.x - cameraX, y = player.y;
    ctx.save(); ctx.translate(x + 22, y + 24);
    // Rabinho
    ctx.strokeStyle = '#75401f'; ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-10, 9); ctx.bezierCurveTo(-28, 13, -28, -7, -18, -10); ctx.bezierCurveTo(-11, -14, -8, -8, -13, -7); ctx.stroke();
    // Corpo, braços e pés
    ctx.fillStyle = '#a76532'; ctx.beginPath(); ctx.ellipse(0, 7, 14, 16, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#70401f'; ctx.beginPath(); ctx.ellipse(-8, 19, 8, 4, -.1, 0, Math.PI * 2); ctx.ellipse(8, 19, 8, 4, .1, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#a76532'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(-9, 4); ctx.lineTo(-16, 12); ctx.moveTo(9, 4); ctx.lineTo(16, 12); ctx.stroke();
    // Orelhas e cabeça
    ctx.fillStyle = '#8b512c'; ctx.beginPath(); ctx.arc(-12, -12, 8, 0, Math.PI * 2); ctx.arc(12, -12, 8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f2b77e'; ctx.beginPath(); ctx.arc(-12, -12, 4, 0, Math.PI * 2); ctx.arc(12, -12, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#a76532'; ctx.beginPath(); ctx.ellipse(0, -11, 16, 17, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffcf9b'; ctx.beginPath(); ctx.ellipse(1, -4, 11, 8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#382117'; ctx.beginPath(); ctx.arc(6, -14, 1.7, 0, Math.PI * 2); ctx.arc(4, -7, 1.8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#75df62'; ctx.beginPath(); ctx.ellipse(-3, -28, 6, 2.5, -.7, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function draw() {
    ctx.clearRect(0, 0, w, h); drawBackground(); platforms.forEach(drawPad);
    particles.forEach(p => { ctx.globalAlpha = clamp(p.life / .4, 0, 1); ctx.fillStyle = '#fff4a3'; ctx.beginPath(); ctx.arc(p.x - cameraX, p.y, 3, 0, Math.PI * 2); ctx.fill(); });
    ctx.globalAlpha = 1; if (player && (state !== 'over' || player.y < h + 70)) drawMonkey();
  }

  function loop(now) {
    if (state !== 'playing') return;
    const dt = Math.min((now - lastTime) / 1000, .033); lastTime = now;
    update(dt); draw(); if (state === 'playing') requestAnimationFrame(loop);
  }

  playButton.addEventListener('click', startGame);
  canvas.addEventListener('pointerdown', event => { event.preventDefault(); jump(); });
  window.addEventListener('keydown', event => {
    if (['Space', 'ArrowUp', 'KeyW'].includes(event.code)) { event.preventDefault(); if (!event.repeat) jump(); }
    if (state === 'over' && event.code === 'Enter') startGame();
  });
  window.addEventListener('resize', resize);

  let installPrompt = null;
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault(); installPrompt = event; installButton.hidden = false;
  });
  installButton.addEventListener('click', async () => {
    if (!installPrompt) return;
    installPrompt.prompt(); await installPrompt.userChoice; installPrompt = null; installButton.hidden = true;
  });
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
  }

  resize();
})();
