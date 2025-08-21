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

// Apps Script から呼ばれる関数名（index.html の callback=renderPosts と一致）
function renderPosts(payload) {
  const wrap = document.getElementById('blog-cards');
  if (!wrap) return;

  const posts = (payload && payload.posts) || [];
  if (!posts.length) {
    wrap.innerHTML = '<p class="muted">記事はまだありません。</p>';
    return;
  }

  // slug で引けるようにマップ化
  POST_MAP = Object.fromEntries(
    posts.filter(p => p.slug).map(p => [String(p.slug), p])
  );

  // カードを描画（★日付は文字列のまま表示）
  wrap.innerHTML = posts.map(p => {
    const thumb = p.image_url
      ? `linear-gradient(25deg, rgba(59,130,246,.25), rgba(16,185,129,.2)), url('${p.image_url}') center/cover`
      : `linear-gradient(25deg, rgba(59,130,246,.25), rgba(16,185,129,.2))`;

    const datestr = displayDate(p.date); // ← 変換せず安全に表示
    const slug = encodeURIComponent(p.slug || '');

    return `
      <article class="card">
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

  // 「続きを読む」クリックを拾ってモーダルを開く（★onceは付けない）
  wrap.addEventListener('click', onReadMoreClick);

  // ハッシュ直リンク（#post/slug）で来た場合に対応
  handleHash();
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

  const datestr = displayDate(p.date); // ← ここも同じ方針

  titleEl.textContent = p.title || '';
  metaEl.textContent  = datestr;
  bodyEl.innerHTML    = toParagraphs(p.content || '');

  if (p.image_url) {
    imgEl.src = p.image_url;
    imgEl.hidden = false;
  } else {
    imgEl.hidden = true;
  }

  dlg.showModal();
  // 戻るボタンで閉じられるようにハッシュを書き換え
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

// ハッシュでのオープン/クローズ対応
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
  // 改行2つで段落、1つなら改行に
  const safe = escapeHTML(text);
  return safe.split(/\n{2,}/).map(p =>
    `<p>${p.replace(/\n/g, '<br>')}</p>`
  ).join('');
}

// ★ 日付を“文字列のまま”安全に表示する関数
function displayDate(dateField) {
  // "YYYY-MM-DD" 形式ならそのまま
  if (typeof dateField === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateField)) {
    return dateField;
  }
  // 念のため：Date等が来た時だけローカル日付に整形（UTC化しない）
  try {
    const d = new Date(dateField);
    if (isNaN(d)) return String(dateField || '');
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  } catch {
    return String(dateField || '');
  }
}
