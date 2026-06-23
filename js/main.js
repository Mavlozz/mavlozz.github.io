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
  const thumb = `https://img.youtube.com/vi/${vidId}/mqdefault.jpg`;
  const href  = isShort
    ? `https://youtube.com/shorts/${vidId}`
    : `https://youtube.com/watch?v=${vidId}`;

  const card = document.createElement('article');
  card.className = 'video-card';

  card.innerHTML = `
    <a href="${href}" target="_blank" rel="noopener" class="video-thumb">
      <img src="${thumb}" alt="${item.title.replace(/"/g,'&quot;')}" loading="lazy"
           onerror="this.src='https://img.youtube.com/vi/${vidId}/hqdefault.jpg'">
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
}

async function loadStats() {
  const BASE = 'https://api.socialcounts.org/youtube-live-subscriber-count/';
  const elSubs   = document.getElementById('statSubs');
  const elVideos = document.getElementById('statVideos');
  if (!elSubs) return;

  try {
    const [r1, r2] = await Promise.all([
      fetch(BASE + YT_CHANNELS.main.id).then(r => r.json()),
      fetch(BASE + YT_CHANNELS.gta.id).then(r => r.json())
    ]);
    const subs1 = r1?.counters?.api?.subscriberCount || 0;
    const subs2 = r2?.counters?.api?.subscriberCount || 0;
    const vids1 = r1?.counters?.api?.videoCount || 0;
    const vids2 = r2?.counters?.api?.videoCount || 0;

    elSubs.textContent   = fmtNum(subs1 + subs2);
    if (elVideos) elVideos.textContent = fmtNum(vids1 + vids2) + '+';
  } catch {
    if (elSubs)   elSubs.textContent   = '17K+';
    if (elVideos) elVideos.textContent = '847+';
  }
}

loadVideos();
loadStats();
loadClips();
checkLive();
setInterval(checkLive, 60000);

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
    if (live) {
      if (dot)     { dot.style.display = 'inline-block'; dot.title = `Идёт стрим: ${text}`; }
      if (navLive) navLive.style.display = 'inline-block';
      if (btnText) btnText.textContent = '🔴 В ЭФИРЕ — смотреть';
    } else {
      if (dot)     dot.style.display = 'none';
      if (navLive) navLive.style.display = 'none';
      if (btnText) btnText.textContent = 'Смотреть стримы на Twitch';
    }
  } catch {}
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
    const thumb = `https://img.youtube.com/vi/${vidId}/mqdefault.jpg`;
    const href  = `https://youtube.com/shorts/${vidId}`;
    const card  = document.createElement('a');
    card.className = 'clip-card';
    card.href = href;
    card.target = '_blank';
    card.rel = 'noopener';
    card.innerHTML = `
      <div class="clip-thumb">
        <img src="${thumb}" alt="${item.title.replace(/"/g,'&quot;')}" loading="lazy"
             onerror="this.src='https://img.youtube.com/vi/${vidId}/hqdefault.jpg'">
        <div class="clip-overlay"><i class="fab fa-youtube"></i></div>
        <span class="clip-badge">SHORT</span>
      </div>
      <p class="clip-title">${item.title}</p>`;
    grid.appendChild(card);
  }
  observeFade();
}
