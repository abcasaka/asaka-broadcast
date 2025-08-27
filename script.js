// ===== JS起動フラグ（.reveal-now をアニメ可に） =====
document.documentElement.classList.add('js');

// ===== 年表示 =====
const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

// ===== モバイルナビ =====
const toggle = document.querySelector('.nav-toggle');
const nav = document.getElementById('nav');
if (toggle && nav) {
  toggle.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
}

// ===== ブログ（JSONPコールバック） =====
let POST_MAP = {}; // slug -> post

function renderPosts(payload) {
  const wrap = document.getElementById('blog-cards');
  if (!wrap) return;

  const posts = (payload && payload.posts) || [];
  if (!posts.length) {
    wrap.innerHTML = '<p class="muted">記事はまだありません。</p>';
    return;
  }

  POST_MAP = Object.fromEntries(posts.filter(p => p.slug).map(p => [String(p.slug), p]));

  wrap.innerHTML = posts.map((p, i) => {
    const thumb = p.image_url
      ? `linear-gradient(25deg, rgba(59,130,246,.25), rgba(16,185,129,.2)), url('${p.image_url}') center/cover`
      : `linear-gradient(25deg, rgba(59,130,246,.25), rgba(16,185,129,.2))`;

    const datestr = displayDate(p.date);
    const slug = encodeURIComponent(p.slug || '');

    return `
      <article class="card reveal" style="--d:${i*80}ms">
        <div class="card-thumb" style="background:${thumb}" aria-hidden="true"></div>
        <div class="card-body">
          <h3 class="card-title">${escapeHTML(p.title || '')}</h3>
          <p class="muted">${datestr} · ${Math.max(1, Math.ceil((p.content||'').length/400))} min</p>
          <p>${escapeHTML(p.excerpt || '').replace(/\n/g, '<br>')}</p>
          ${p.slug ? `<a class="text-link readmore" href="#post/${slug}" data-slug="${slug}">続きを読む →</a>` : ''}
        </div>
      </article>
    `;
  }).join('');

  // 追加された要素を監視に登録
  const armReveals = () => {
    if (window.__observeReveals) {
      window.__observeReveals(
        wrap.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-now')
      );
    } else {
      setTimeout(armReveals, 80);
    }
  };
  armReveals();

  wrap.addEventListener('click', onReadMoreClick);
}

// ===== モーダル制御 =====
function onReadMoreClick(e) {
  const a = e.target.closest('a.readmore');
  if (!a) return;
  e.preventDefault();
  openPost(decodeURIComponent(a.dataset.slug || ''));
}

function openPost(slug) {
  const p = POST_MAP[slug];
  if (!p) return;

  const dlg = document.getElementById('postDialog');
  if (!dlg) return;

  const titleEl = document.getElementById('postTitle');
  const metaEl  = document.getElementById('postMeta');
  const bodyEl  = document.getElementById('postBody');
  const imgEl   = document.getElementById('postImage');

  titleEl.textContent = p.title || '';
  metaEl.textContent  = displayDate(p.date);
  bodyEl.innerHTML    = toParagraphs(p.content || '');

  if (p.image_url) {
    imgEl.src = p.image_url;
    imgEl.hidden = false;
  } else {
    imgEl.hidden = true;
  }

  dlg.showModal();
  location.hash = `#post/${encodeURIComponent(slug)}`;
}

const closeBtn = document.getElementById('postClose');
if (closeBtn) {
  closeBtn.addEventListener('click', () => {
    const dlg = document.getElementById('postDialog');
    if (dlg?.open) dlg.close();
    clearPostHash();
  });
}

window.addEventListener('hashchange', handleHash);
function handleHash() {
  const m = location.hash.match(/^#post\/(.+)$/);
  const dlg = document.getElementById('postDialog');
  if (m) {
    const slug = decodeURIComponent(m[1]);
    if (POST_MAP[slug]) openPost(slug);
  } else {
    if (dlg?.open) dlg.close();
  }
}
function clearPostHash() {
  if (location.hash.startsWith('#post/')) {
    history.pushState('', document.title, window.location.pathname + window.location.search);
  }
}

// ===== ユーティリティ =====
function escapeHTML(str){
  return String(str).replace(/[&<>"']/g, s =>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
}
function toParagraphs(text) {
  const safe = escapeHTML(text);
  return safe.split(/\n{2,}/).map(p =>
    `<p>${p.replace(/\n/g, '<br>')}</p>`
  ).join('');
}
function displayDate(dateField) {
  if (typeof dateField === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateField)) return dateField;
  try {
    const d = new Date(dateField);
    if (isNaN(d)) return String(dateField || '');
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  } catch { return String(dateField || ''); }
}

/* ===== ヒーロー：即時表示＋左右4枚の順次表示 ===== */
function showHeroSideThumbs(){
  const thumbs = document.querySelectorAll('.hero-strip .hero-thumb');
  if (!thumbs.length) return;

  const isSmall = window.matchMedia('(max-width: 700px)').matches;
  const baseDelay = isSmall ? 280 : 350; // ヒーロー現れた後の待機
  const step      = isSmall ? 140 : 180; // 1枚ずつの遅延差

  thumbs.forEach((el, i) => {
    setTimeout(() => el.classList.add('is-in'), baseDelay + i*step);
  });
}

// ヒーローの .reveal-now を可視化 → 4枚を順次表示
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.reveal-now').forEach(el => {
    requestAnimationFrame(() => el.classList.add('visible'));
  });
  setTimeout(showHeroSideThumbs, 500);
});

/* ===== 出現アニメ：画像読込後に起動（早発火防止） ===== */
(function(){
  // リロードで勝手に途中へスクロールされるのを防ぐ
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

  const boot = () => {
    let io;
    const observe = (nodes) => {
      if (!nodes || !nodes.length) return;
      if (!('IntersectionObserver' in window)) {
        nodes.forEach(el => el.classList.add('visible'));
        return;
      }
      if (!io) {
        io = new IntersectionObserver((entries) => {
          entries.forEach(en => {
            const el = en.target;
            const need = parseFloat(el.getAttribute('data-th')) || 0.5; // 既定0.5（contactは0.3など）
            if (en.isIntersecting && en.intersectionRatio >= need) {
              el.classList.add('visible');
              io.unobserve(el);
            }
          });
        }, {
          threshold: [0, 0.35, 0.5, 1],
          rootMargin: '0px 0px -10% 0px'
        });
      }
      nodes.forEach(el => io.observe(el));
    };

    // 初期ターゲットを監視
    observe(document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-now'));

    // 後から追加される要素用に公開
    window.__observeReveals = observe;

    // ハッシュが無ければ最上部へ
    if (!location.hash) window.scrollTo(0, 0);
  };

  // 画像も含め読み込み完了後に起動
  window.addEventListener('load', boot);
})();


