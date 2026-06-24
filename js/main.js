// Navbar scroll effect
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 40);
}, { passive: true });

// Mobile nav toggle
const navToggle = document.getElementById('navToggle');
const navLinks  = document.getElementById('navLinks');
navToggle.addEventListener('click', () => {
  navToggle.classList.toggle('open');
  navLinks.classList.toggle('open');
});
navLinks.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    navToggle.classList.remove('open');
    navLinks.classList.remove('open');
  });
});

// Highlight active nav link on scroll
const sections = document.querySelectorAll('section[id]');
const navItems  = document.querySelectorAll('.nav-links a[href^="#"]');
window.addEventListener('scroll', () => {
  let current = '';
  sections.forEach(s => { if (window.scrollY >= s.offsetTop - 120) current = s.id; });
  navItems.forEach(a => {
    a.style.color = a.getAttribute('href') === `#${current}` ? 'var(--text)' : '';
  });
}, { passive: true });

// Fade-in observer — called after dynamic content is injected too
function observeFade() {
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); } });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.video-card, .schedule-day, .support-card, .about-grid, .section-head, .soc-card').forEach((el, i) => {
    if (!el.classList.contains('fade-in')) {
      el.classList.add('fade-in');
      el.style.transitionDelay = `${(i % 6) * 80}ms`;
    }
    obs.observe(el);
  });
}
observeFade();

// ============================================================
//  YOUTUBE — LIVE SUBSCRIBER COUNT + LATEST VIDEOS
// ============================================================
const YT_CHANNELS = {
  main: { id: 'UClVUKdTl7z0SqVJp6S_TcMQ', label: '@Mavlo' },  // CS:GO / gaming
  gta:  { id: 'UCI3DQPSvnwh7TDgGCUSIAgQ', label: '@MMavlo' }   // GTA RP
};

function fmtNum(n) {
  n = parseInt(n, 10) || 0;
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace('.0','') + 'M';
  if (n >= 1000)    return (n / 1000).toFixed(1).replace('.0','') + 'K';
  return String(n);
}

function fmtDate(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now - d) / 1000);
  if (diff < 3600)   return Math.floor(diff / 60)  + ' мин. назад';
  if (diff < 86400)  return Math.floor(diff / 3600) + ' ч. назад';
  if (diff < 604800) return Math.floor(diff / 86400) + ' дн. назад';
  if (diff < 2592000) return Math.floor(diff / 604800) + ' нед. назад';
  return Math.floor(diff / 2592000) + ' мес. назад';
}

function videoIdFromUrl(url) {
  const shortsM = url.match(/shorts\/([A-Za-z0-9_-]+)/);
  if (shortsM) return shortsM[1];
  const watchM = url.match(/[?&]v=([A-Za-z0-9_-]+)/);
  if (watchM) return watchM[1];
  return null;
}

function buildVideoCard(item, channelLabel) {
  const vidId = videoIdFromUrl(item.link);
  if (!vidId) return null;
  const isShort = item.link.includes('/shorts/');
  const thumb = `https://img.youtube.com/vi/${vidId}/maxresdefault.jpg`;
  const href  = isShort
    ? `https://youtube.com/shorts/${vidId}`
    : `https://youtube.com/watch?v=${vidId}`;

  const card = document.createElement('article');
  card.className = 'video-card';

  card.innerHTML = `
    <a href="${href}" target="_blank" rel="noopener" class="video-thumb">
      <img src="${thumb}" alt="${item.title.replace(/"/g,'&quot;')}" loading="lazy"
           onerror="this.src=this.src.includes('maxres')?'https://img.youtube.com/vi/${vidId}/hqdefault.jpg':'https://img.youtube.com/vi/${vidId}/mqdefault.jpg'">
      <div class="video-overlay"><i class="fas fa-play"></i></div>
      ${isShort ? '<span class="video-dur" style="background:var(--accent)">SHORT</span>' : ''}
    </a>
    <div class="video-body">
      <span class="video-channel-tag">${channelLabel}</span>
      <h3 class="video-title">${item.title}</h3>
      <div class="video-meta">
        <span><i class="far fa-calendar"></i> ${fmtDate(item.pubDate)}</span>
      </div>
    </div>`;
  return card;
}

async function loadVideos() {
  const grid = document.getElementById('videosGrid');
  if (!grid) return;

  grid.innerHTML = '<div class="videos-loading"><i class="fas fa-spinner fa-spin"></i> Загружаем видео…</div>';

  const RSS2JSON = 'https://api.rss2json.com/v1/api.json?rss_url=';

  const fetches = [
    fetch(RSS2JSON + encodeURIComponent(`https://www.youtube.com/feeds/videos.xml?channel_id=${YT_CHANNELS.main.id}`))
      .then(r => r.json()).then(d => ({ data: d, label: YT_CHANNELS.main.label })),
    fetch(RSS2JSON + encodeURIComponent(`https://www.youtube.com/feeds/videos.xml?channel_id=${YT_CHANNELS.gta.id}`))
      .then(r => r.json()).then(d => ({ data: d, label: YT_CHANNELS.gta.label }))
  ];

  let results;
  try { results = await Promise.allSettled(fetches); }
  catch { results = []; }

  const allItems = [];
  for (const res of results) {
    if (res.status !== 'fulfilled') continue;
    const { data, label } = res.value;
    if (data.status !== 'ok') continue;
    for (const item of (data.items || []).slice(0, 6)) {
      allItems.push({ item, label, date: new Date(item.pubDate) });
    }
  }

  // Sort all videos by date desc, take 6
  allItems.sort((a, b) => b.date - a.date);
  const top6 = allItems.slice(0, 6);

  grid.innerHTML = '';
  if (!top6.length) {
    grid.innerHTML = '<p style="color:var(--text-muted);grid-column:1/-1;text-align:center">Не удалось загрузить видео</p>';
    return;
  }

  for (const { item, label } of top6) {
    const card = buildVideoCard(item, label);
    if (card) { grid.appendChild(card); }
  }
  observeFade();
  initTilt();
}

async function loadStats() {
  const BASE     = 'https://api.socialcounts.org/youtube-live-subscriber-count/';
  const elSubs1  = document.getElementById('statSubs1');
  const elSubs2  = document.getElementById('statSubs2');
  const elVideos = document.getElementById('statVideos');
  const abSubs1  = document.getElementById('abSubs1');
  const abSubs2  = document.getElementById('abSubs2');

  try {
    const [r1, r2] = await Promise.all([
      fetch(BASE + YT_CHANNELS.main.id).then(r => r.json()),
      fetch(BASE + YT_CHANNELS.gta.id).then(r => r.json())
    ]);
    const subs1 = r1?.counters?.api?.subscriberCount || 0;
    const subs2 = r2?.counters?.api?.subscriberCount || 0;
    const vids1 = r1?.counters?.api?.videoCount || 0;
    const vids2 = r2?.counters?.api?.videoCount || 0;

    if (elSubs1)  elSubs1.textContent  = fmtNum(subs1);
    if (elSubs2)  elSubs2.textContent  = fmtNum(subs2);
    if (elVideos) elVideos.textContent = fmtNum(vids1 + vids2) + '+';
    if (abSubs1)  abSubs1.textContent  = fmtNum(subs1);
    if (abSubs2)  abSubs2.textContent  = fmtNum(subs2);
    const t1 = document.getElementById('tipSubs1');
    const t2 = document.getElementById('tipSubs2');
    if (t1) t1.textContent = fmtNum(subs1) + ' подписчиков';
    if (t2) t2.textContent = fmtNum(subs2) + ' подписчиков';
  } catch {
    if (elSubs1)  elSubs1.textContent  = '12K+';
    if (elSubs2)  elSubs2.textContent  = '5K+';
    if (elVideos) elVideos.textContent = '847+';
    if (abSubs1)  abSubs1.textContent  = '12K+';
    if (abSubs2)  abSubs2.textContent  = '5K+';
    const t1 = document.getElementById('tipSubs1');
    const t2 = document.getElementById('tipSubs2');
    if (t1) t1.textContent = '12K+ подписчиков';
    if (t2) t2.textContent = '5K+ подписчиков';
  }
}

initPreloader();
loadVideos();
loadStats();
loadClips();
checkLive();
setInterval(checkLive, 60000);
initScrollProgress();
initParticles();
initGlitch();
initRotatingText();
initKonami();
initAmbient();
initCustomCursor();
initGrain();
initMagnetic();
loadDiscord();
initAvatarTilt();
initAvatarFlip();
initTyping();
initUISounds();

// ============================================================
//  AVATAR 3D MOUSE TILT
// ============================================================
function initAvatarTilt() {
  const scene = document.getElementById('avatarScene');
  if (!scene || window.matchMedia('(pointer: coarse)').matches) return;

  let floatOffset = 0;
  let targetX = 0, targetY = 0, curX = 0, curY = 0;
  const MAX = 18;

  document.addEventListener('mousemove', e => {
    const cx = window.innerWidth  / 2;
    const cy = window.innerHeight / 2;
    targetX = ((e.clientY - cy) / cy) * -MAX;
    targetY = ((e.clientX - cx) / cx) *  MAX;
  });

  // Smoothly interpolate + preserve float animation via JS
  let t = 0;
  (function tick() {
    t += 0.016;
    floatOffset = Math.sin(t * 0.8) * 10;
    curX += (targetX - curX) * 0.08;
    curY += (targetY - curY) * 0.08;
    scene.style.transform =
      `translateY(${floatOffset}px) rotateX(${curX}deg) rotateY(${curY}deg)`;
    requestAnimationFrame(tick);
  })();
}

// ============================================================
//  SCROLL PROGRESS BAR
// ============================================================
function initScrollProgress() {
  const bar = document.getElementById('scrollProgress');
  if (!bar) return;
  window.addEventListener('scroll', () => {
    const pct = window.scrollY / (document.body.scrollHeight - window.innerHeight) * 100;
    bar.style.width = pct + '%';
  }, { passive: true });
}

// ============================================================
//  PARTICLES
// ============================================================
function initParticles() {
  const canvas = document.getElementById('particlesCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  function resize() {
    canvas.width  = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
  }
  resize();
  window.addEventListener('resize', resize, { passive: true });

  const pts = Array.from({ length: 80 }, () => ({
    x:  Math.random(),
    y:  Math.random(),
    r:  Math.random() * 1.8 + 0.4,
    vx: (Math.random() - 0.5) * 0.0003,
    vy: (Math.random() - 0.5) * 0.0003,
    a:  Math.random(),
    da: (Math.random() - 0.5) * 0.006,
  }));

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pts.forEach(p => {
      p.x += p.vx; p.y += p.vy; p.a += p.da;
      if (p.a < 0 || p.a > 1) p.da *= -1;
      if (p.x < 0) p.x = 1; if (p.x > 1) p.x = 0;
      if (p.y < 0) p.y = 1; if (p.y > 1) p.y = 0;
      ctx.beginPath();
      ctx.arc(p.x * canvas.width, p.y * canvas.height, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(139,92,246,${p.a * 0.6})`;
      ctx.fill();
    });
    requestAnimationFrame(draw);
  }
  draw();
}

// ============================================================
//  GLITCH on MAVLO title
// ============================================================
function initGlitch() {
  const el = document.getElementById('heroName');
  if (!el) return;
  function glitch() {
    el.classList.add('glitch');
    setTimeout(() => el.classList.remove('glitch'), 350);
    setTimeout(glitch, 5000 + Math.random() * 10000);
  }
  setTimeout(glitch, 3000 + Math.random() * 3000);
}

// ============================================================
//  ROTATING TEXT
// ============================================================
function initRotatingText() {
  const el = document.getElementById('heroRotate');
  if (!el) return;
  const words = ['Игры', 'Стримы', 'GTA RP', 'CS:GO', 'Хайлайты'];
  let i = 0;
  setInterval(() => {
    el.classList.add('fade-out');
    setTimeout(() => {
      i = (i + 1) % words.length;
      el.textContent = words[i];
      el.classList.remove('fade-out');
    }, 250);
  }, 2500);
}

// ============================================================
//  3D TILT on video cards (called after videos load)
// ============================================================
function initTilt() {
  document.querySelectorAll('.video-card').forEach(card => {
    card.addEventListener('mouseenter', () => { card.style.transition = 'none'; });
    card.addEventListener('mousemove', e => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width  - 0.5;
      const y = (e.clientY - r.top)  / r.height - 0.5;
      card.style.transform = `perspective(700px) rotateY(${x*14}deg) rotateX(${-y*10}deg) scale3d(1.04,1.04,1.04)`;
    });
    card.addEventListener('mouseleave', () => {
      card.style.transition = 'transform 0.6s ease';
      card.style.transform  = '';
      setTimeout(() => { card.style.transition = ''; }, 600);
    });
  });
}

// ============================================================
//  KONAMI CODE EASTER EGG
// ============================================================
function initKonami() {
  const SEQ = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
  let idx = 0;
  document.addEventListener('keydown', e => {
    idx = (e.key === SEQ[idx]) ? idx + 1 : (e.key === SEQ[0] ? 1 : 0);
    if (idx === SEQ.length) { idx = 0; triggerEasterEgg(); }
  });
}

function triggerEasterEgg() {
  confettiBurst();
  const ov = document.getElementById('eggOverlay');
  if (ov) ov.classList.add('show');
}

function confettiBurst() {
  const colors = ['#8b5cf6','#c084fc','#f59e0b','#22c55e','#ef4444','#3b82f6','#fff','#ff6cbd'];
  for (let i = 0; i < 140; i++) {
    const el = document.createElement('div');
    const size = Math.random() * 10 + 4;
    el.style.cssText = `position:fixed;top:${-10 + Math.random()*30}%;left:${Math.random()*100}%;`
      + `width:${size}px;height:${size}px;background:${colors[Math.floor(Math.random()*colors.length)]};`
      + `border-radius:${Math.random()>.5?'50%':'2px'};z-index:10002;pointer-events:none;`
      + `animation:confetti-fall ${1.5+Math.random()*2.5}s ease-in forwards;`
      + `animation-delay:${Math.random()*0.6}s;`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 4000);
  }
}

// ============================================================
//  AMBIENT MODE (Web Audio API — no files needed)
// ============================================================
function initAmbient() {
  const btn = document.getElementById('ambientBtn');
  if (!btn) return;
  let audioCtx = null, nodes = [], playing = false;

  function note(ctx, freq, time, dur, vol, type = 'square') {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = freq * 4;
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0, time);
    g.gain.linearRampToValueAtTime(vol, time + 0.02);
    g.gain.setValueAtTime(vol, time + dur - 0.05);
    g.gain.linearRampToValueAtTime(0, time + dur);
    o.connect(f); f.connect(g); g.connect(master);
    o.start(time); o.stop(time + dur);
    return o;
  }

  function kick(ctx, time) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.setValueAtTime(150, time);
    o.frequency.exponentialRampToValueAtTime(40, time + 0.15);
    g.gain.setValueAtTime(0.7, time);
    g.gain.exponentialRampToValueAtTime(0.001, time + 0.25);
    o.connect(g); g.connect(master);
    o.start(time); o.stop(time + 0.3);
  }

  function hat(ctx, time, vol = 0.06) {
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.05, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const hpf = ctx.createBiquadFilter();
    hpf.type = 'highpass'; hpf.frequency.value = 7000;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, time);
    g.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
    src.connect(hpf); hpf.connect(g); g.connect(master);
    src.start(time);
  }

  let master;

  function startAmbient() {
    if (playing) return;
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    audioCtx.resume();

    master = audioCtx.createGain();
    master.gain.setValueAtTime(0, audioCtx.currentTime);
    master.gain.linearRampToValueAtTime(0.4, audioCtx.currentTime + 1.5);
    master.connect(audioCtx.destination);

    // === MELODY — cyberpunk hook (A minor pentatonic) ===
    // Notes: A4=440 C5=523 E5=659 G5=784 A5=880
    const BPM = 128;
    const S = 60 / BPM;          // 1 step = 1 beat
    const mel = [440,440,523,440,0,659,523,440, 440,0,392,440,523,659,523,0];
    let melInterval;
    let step = 0;
    function scheduleMel() {
      if (!playing) { clearInterval(melInterval); return; }
      const t = audioCtx.currentTime;
      const f = mel[step % mel.length];
      if (f) note(audioCtx, f, t, S * 0.7, 0.09, 'square');
      step++;
    }
    melInterval = setInterval(scheduleMel, S * 1000);
    scheduleMel();

    // === BASS LINE ===
    const bassNotes = [110, 110, 130.81, 110, 98, 110, 130.81, 146.83];
    let bassStep = 0, bassInterval;
    function scheduleBass() {
      if (!playing) { clearInterval(bassInterval); return; }
      const t = audioCtx.currentTime;
      note(audioCtx, bassNotes[bassStep % bassNotes.length], t, S * 1.8, 0.12, 'sawtooth');
      bassStep++;
    }
    bassInterval = setInterval(scheduleBass, S * 2 * 1000);
    scheduleBass();

    // === DRUMS ===
    let beat = 0, drumInterval;
    function scheduleDrum() {
      if (!playing) { clearInterval(drumInterval); return; }
      const t = audioCtx.currentTime;
      if (beat % 4 === 0 || beat % 4 === 2) kick(audioCtx, t);
      if (beat % 2 === 1) hat(audioCtx, t, 0.055);
      if (beat % 8 === 5) hat(audioCtx, t + S * 0.5, 0.035);
      beat++;
    }
    drumInterval = setInterval(scheduleDrum, S * 1000);
    scheduleDrum();

    // === PAD chord (background warmth) ===
    [220, 261.63, 329.63].forEach((f, i) => {
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      const lp = audioCtx.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 800;
      o.type = 'sine'; o.frequency.value = f;
      o.detune.value = i * 5;
      g.gain.setValueAtTime(0, audioCtx.currentTime);
      g.gain.linearRampToValueAtTime(0.04 - i * 0.008, audioCtx.currentTime + 2);
      o.connect(lp); lp.connect(g); g.connect(master);
      o.start(); nodes.push(o, g);
    });

    nodes.push(master);
    playing = true;
    btn.classList.add('playing');
    btn.innerHTML = '<i class="fas fa-volume-up"></i>';
  }

  function stopAmbient() {
    const masterNode = nodes[nodes.length - 1];
    if (masterNode && masterNode.gain) {
      masterNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 1.2);
    }
    setTimeout(() => {
      nodes.forEach(n => { try { n.stop ? n.stop() : n.disconnect(); } catch {} });
      nodes = [];
    }, 1300);
    playing = false;
    btn.classList.remove('playing');
    btn.innerHTML = '<i class="fas fa-music"></i>';
  }

  btn.addEventListener('click', () => playing ? stopAmbient() : startAmbient());

  // Auto-start on first user interaction anywhere
  const autoStart = () => {
    startAmbient();
    document.removeEventListener('click',    autoStart);
    document.removeEventListener('keydown',  autoStart);
    document.removeEventListener('touchend', autoStart);
  };
  document.addEventListener('click',    autoStart);
  document.addEventListener('keydown',  autoStart);
  document.addEventListener('touchend', autoStart);
}

// ============================================================
//  CUSTOM CURSOR
// ============================================================
function initCustomCursor() {
  if (window.matchMedia('(pointer: coarse)').matches) return;
  const dot  = document.getElementById('cursorDot');
  const ring = document.getElementById('cursorRing');
  if (!dot || !ring) return;

  document.body.classList.add('custom-cursor');

  let mx = -100, my = -100, rx = -100, ry = -100;

  document.addEventListener('mousemove', e => {
    mx = e.clientX; my = e.clientY;
    dot.style.transform = `translate(${mx}px,${my}px)`;
  });

  // ring follows faster (0.2 vs old 0.13)
  (function animRing() {
    rx += (mx - rx) * 0.2;
    ry += (my - ry) * 0.2;
    ring.style.transform = `translate(${rx}px,${ry}px)`;
    requestAnimationFrame(animRing);
  })();

  // ring grows on hover
  document.querySelectorAll('a,button,.btn,.soc-card,.video-card').forEach(el => {
    el.addEventListener('mouseenter', () => ring.classList.add('hover'));
    el.addEventListener('mouseleave', () => ring.classList.remove('hover'));
  });

  // sparks ONLY on click — 8 sparks burst
  document.addEventListener('click', e => {
    for (let i = 0; i < 8; i++) spawnSpark(e.clientX, e.clientY);
  });
}

function spawnSpark(x, y) {
  const s = document.createElement('div');
  s.className = 'cursor-spark';
  const angle = Math.random() * Math.PI * 2;
  const dist  = 10 + Math.random() * 18;
  s.style.cssText = `left:${x}px;top:${y}px;`
    + `--dx:${(Math.cos(angle)*dist).toFixed(1)}px;`
    + `--dy:${(Math.sin(angle)*dist).toFixed(1)}px;`;
  document.body.appendChild(s);
  setTimeout(() => s.remove(), 600);
}

// ============================================================
//  GRAIN OVERLAY
// ============================================================
function initGrain() {
  const el = document.getElementById('grainOverlay');
  if (!el) return;
  const SIZE = 180;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = SIZE;
  const ctx = canvas.getContext('2d');

  function frame() {
    const id = ctx.createImageData(SIZE, SIZE);
    const d  = id.data;
    for (let i = 0; i < d.length; i += 4) {
      const v = (Math.random() * 255) | 0;
      d[i] = d[i+1] = d[i+2] = v; d[i+3] = 255;
    }
    ctx.putImageData(id, 0, 0);
    el.style.backgroundImage = `url(${canvas.toDataURL()})`;
    setTimeout(() => requestAnimationFrame(frame), 80);
  }
  frame();
}

// ============================================================
//  MAGNETIC BUTTONS
// ============================================================
function initMagnetic() {
  document.querySelectorAll('.btn-magnetic').forEach(btn => {
    btn.addEventListener('mousemove', e => {
      const r  = btn.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width  / 2);
      const dy = e.clientY - (r.top  + r.height / 2);
      btn.style.transform = `translate(${dx * 0.28}px, ${dy * 0.38}px) scale(1.04)`;
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.transition = 'transform 0.55s cubic-bezier(.23,1,.32,1)';
      btn.style.transform  = '';
      setTimeout(() => btn.style.transition = '', 600);
    });
    btn.addEventListener('mouseenter', () => { btn.style.transition = 'none'; });
  });
}

// ============================================================
//  DISCORD ONLINE COUNT
// ============================================================
async function loadDiscord() {
  const el = document.getElementById('discordOnline');
  if (!el) return;
  try {
    const r = await fetch('https://discord.com/api/v9/invites/BHVQsqj?with_counts=true');
    const d = await r.json();
    const online = d.approximate_presence_count || 0;
    const total  = d.approximate_member_count  || 0;
    el.innerHTML = `<span class="discord-dot"></span> ${online} онлайн · ${fmtNum(total)} всего`;
    const tipD = document.getElementById('tipDiscord');
    if (tipD) tipD.textContent = `${online} онлайн · ${fmtNum(total)} всего`;
  } catch {
    el.innerHTML = '<span class="discord-dot"></span> онлайн';
  }
}

// ============================================================
//  TWITCH LIVE CHECK
// ============================================================
async function checkLive() {
  try {
    const res  = await fetch('https://decapi.me/twitch/uptime/mmavlo');
    const text = (await res.text()).trim();
    const live = !/offline/i.test(text) && /\d/.test(text);
    const dot     = document.getElementById('liveDot');
    const navLive = document.getElementById('navLive');
    const btnText = document.getElementById('twitchBtnText');
    const tipLive = document.getElementById('tipLive');
    if (live) {
      if (dot)     { dot.style.display = 'inline-block'; dot.title = `Идёт стрим: ${text}`; }
      if (navLive) navLive.style.display = 'inline-block';
      if (btnText) btnText.textContent = '🔴 В ЭФИРЕ — смотреть';
      if (tipLive) tipLive.innerHTML = '<span style="color:#f87171">🔴 В ЭФИРЕ прямо сейчас!</span>';
    } else {
      if (dot)     dot.style.display = 'none';
      if (navLive) navLive.style.display = 'none';
      if (btnText) btnText.textContent = 'Смотреть стримы на Twitch';
      if (tipLive) tipLive.textContent = 'Прямые стримы';
    }
  } catch {}
}

// ============================================================
//  PRELOADER
// ============================================================
function initPreloader() {
  const pl  = document.getElementById('preloader');
  const bar = document.getElementById('plBar');
  if (!pl) return;

  // start bar fill after browser paints
  requestAnimationFrame(() => requestAnimationFrame(() => {
    bar.style.width = '100%';
  }));

  setTimeout(() => {
    pl.classList.add('done');
    setTimeout(() => pl.remove(), 700);
  }, 2000);
}

// ============================================================
//  TYPING ANIMATION (hero description)
// ============================================================
function initTyping() {
  const el = document.querySelector('.hero-desc');
  if (!el) return;

  const lines = [
    'Игры, стримы, разборы и настоящие эмоции.',
    'Подписывайся — пропустишь самое интересное.'
  ];

  el.innerHTML = '<span class="typing-text"></span><span class="typing-cursor">|</span>';
  const textEl = el.querySelector('.typing-text');

  let lineIdx = 0, charIdx = 0;

  function typeNext() {
    if (lineIdx >= lines.length) return;
    const line = lines[lineIdx];
    if (charIdx <= line.length) {
      const typed = lines.slice(0, lineIdx).join('\n') + line.slice(0, charIdx);
      textEl.innerHTML = typed.replace(/\n/g, '<br>');
      charIdx++;
      setTimeout(typeNext, 32 + Math.random() * 22);
    } else {
      lineIdx++;
      charIdx = 0;
      setTimeout(typeNext, 180);
    }
  }

  // start after preloader finishes (2.2s)
  setTimeout(typeNext, 2250);
}

// ============================================================
//  AVATAR FLIP CARD
// ============================================================
function initAvatarFlip() {
  const card = document.getElementById('avatarCard');
  if (!card) return;
  card.addEventListener('click', () => card.classList.toggle('flipped'));
}

// ============================================================
//  UI SOUNDS (subtle — click & hover)
// ============================================================
function initUISounds() {
  let sCtx = null;
  const getCtx = () => {
    if (!sCtx) sCtx = new (window.AudioContext || window.webkitAudioContext)();
    sCtx.resume();
    return sCtx;
  };

  function playClick() {
    try {
      const c = getCtx();
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(1100, c.currentTime);
      o.frequency.exponentialRampToValueAtTime(550, c.currentTime + 0.06);
      g.gain.setValueAtTime(0.055, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.09);
      o.connect(g); g.connect(c.destination);
      o.start(); o.stop(c.currentTime + 0.1);
    } catch {}
  }

  function playHover() {
    try {
      const c = getCtx();
      const buf = c.createBuffer(1, Math.floor(c.sampleRate * 0.07), c.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
      const src = c.createBufferSource(); src.buffer = buf;
      const hpf = c.createBiquadFilter(); hpf.type = 'highpass'; hpf.frequency.value = 4500;
      const g = c.createGain(); g.gain.value = 0.022;
      src.connect(hpf); hpf.connect(g); g.connect(c.destination);
      src.start();
    } catch {}
  }

  // attach after DOM is ready
  function attach() {
    document.querySelectorAll('.btn, .nav-links a, .hero-soc, .soc-card, .play-btn').forEach(el => {
      el.addEventListener('click', playClick, { once: false });
      el.addEventListener('mouseenter', playHover, { once: false });
    });
  }
  // small delay so dynamic content (cards) is loaded
  setTimeout(attach, 3000);
}

// ============================================================
//  CLIPS — YouTube Shorts as highlights
// ============================================================
async function loadClips() {
  const grid = document.getElementById('clipsGrid');
  if (!grid) return;

  const RSS2JSON = 'https://api.rss2json.com/v1/api.json?rss_url=';
  const fetches = Object.values(YT_CHANNELS).map(ch =>
    fetch(RSS2JSON + encodeURIComponent(`https://www.youtube.com/feeds/videos.xml?channel_id=${ch.id}`))
      .then(r => r.json()).then(d => ({ data: d, label: ch.label }))
  );

  let results;
  try { results = await Promise.allSettled(fetches); } catch { results = []; }

  const shorts = [];
  for (const res of results) {
    if (res.status !== 'fulfilled') continue;
    const { data, label } = res.value;
    if (data.status !== 'ok') continue;
    for (const item of (data.items || [])) {
      if (item.link.includes('/shorts/')) {
        shorts.push({ item, label, date: new Date(item.pubDate) });
      }
    }
  }

  shorts.sort((a, b) => b.date - a.date);
  const top = shorts.slice(0, 8);

  if (!top.length) {
    grid.closest('section').style.display = 'none';
    return;
  }

  grid.innerHTML = '';
  for (const { item, label } of top) {
    const vidId = videoIdFromUrl(item.link);
    if (!vidId) continue;
    const thumb = `https://img.youtube.com/vi/${vidId}/maxresdefault.jpg`;
    const href  = `https://youtube.com/shorts/${vidId}`;
    const card  = document.createElement('a');
    card.className = 'clip-card';
    card.href = href;
    card.target = '_blank';
    card.rel = 'noopener';
    card.innerHTML = `
      <div class="clip-thumb">
        <img src="${thumb}" alt="${item.title.replace(/"/g,'&quot;')}" loading="lazy"
             onerror="this.src=this.src.includes('maxres')?'https://img.youtube.com/vi/${vidId}/hqdefault.jpg':'https://img.youtube.com/vi/${vidId}/mqdefault.jpg'">
        <div class="clip-overlay"><i class="fab fa-youtube"></i></div>
        <span class="clip-badge">SHORT</span>
      </div>
      <p class="clip-title">${item.title}</p>`;
    grid.appendChild(card);
  }
  observeFade();
}
