
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './config.js';

const statusEl = document.getElementById('load-status');
function esc(value = '') { return String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function dateLabel(value) { if (!value) return ''; const d = new Date(value + 'T00:00:00'); return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).toUpperCase(); }
function tagsHtml(value) { const tags = String(value || '').split(',').map(s => s.trim()).filter(Boolean); return tags.map(t => `<span class="tag">${esc(t)}</span>`).join(''); }
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);


/* 이미지 전체 보기 팝업 */
const lightbox = document.createElement('div');
lightbox.className = 'image-lightbox';
lightbox.innerHTML = `
    <button type="button" class="lightbox-close" aria-label="닫기">×</button>
    <img src="" alt="전체 이미지 보기">
`;
document.body.appendChild(lightbox);

const lightboxImage = lightbox.querySelector('img');
const lightboxClose = lightbox.querySelector('.lightbox-close');

function closeLightbox() {
    lightbox.classList.remove('is-open');
    lightboxImage.src = '';
}

document.addEventListener('click', (event) => {
    const image = event.target.closest('img.main-image, img.thumb');

    if (image) {
        lightboxImage.src = image.currentSrc || image.src;
        lightboxImage.alt = image.alt || '전체 이미지 보기';
        lightbox.classList.add('is-open');
        return;
    }

    if (event.target === lightbox || event.target === lightboxClose) {
        closeLightbox();
    }
});

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        closeLightbox();
    }
});


function updateActiveMenu() {
    const currentPage = window.location.hash || '#today';
    window.scrollTo({ top: 0, behavior: 'auto' });

    // 메뉴 밑줄 업데이트
    document.querySelectorAll('nav a:not(#login-button)').forEach(link => {
        link.classList.toggle(
            'active',
            link.getAttribute('href') === currentPage
        );
    });

    const hero = document.querySelector('main > .hero');
    const today = document.getElementById('today');
    const recent = document.getElementById('recent');
    const gallery = document.getElementById('gallery');
    const archive = document.getElementById('archive');

    // 화면 전환 대상만 숨김 처리
    [hero, today, recent, gallery, archive].forEach(section => {
        if (section) section.style.display = 'none';
    });

    if (currentPage === '#today') {
        if (hero) hero.style.display = 'block';
        if (today) today.style.display = 'block';
        if (recent) recent.style.display = 'block';
    } else if (currentPage === '#gallery') {
        if (gallery) gallery.style.display = 'block';
    } else if (currentPage === '#archive') {
        if (archive) archive.style.display = 'block';
    } else if (currentPage === '#about') {
        // ABOUT 화면은 별도 콘텐츠를 만들 때 연결
    }
}

window.addEventListener('hashchange', updateActiveMenu);
updateActiveMenu();


document.querySelector('nav a[href="#today"]')?.addEventListener('click', (event) => {
    event.preventDefault();

    history.replaceState(null, '', '#today');
    updateActiveMenu();

    window.scrollTo({ top: 0, behavior: 'auto' });

    requestAnimationFrame(() => {
        const title = document.querySelector('#today .section-head');
        if (title) {
            const top = title.getBoundingClientRect().top + window.scrollY - 90;
            window.scrollTo({ top, behavior: 'auto' });
        }
    });
});



document.querySelector('.logo')?.addEventListener('click', (event) => {
    event.preventDefault();
    history.replaceState(null, '', '#today');
    updateActiveMenu();
    window.scrollTo({ top: 0, behavior: 'auto' });
});


async function start() {
    const { data: { session } } = await supabase.auth.getSession();

    let isApproved = false;

    if (session) {
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('approved')
            .eq('id', session.user.id)
            .maybeSingle();

        if (!profileError && profile) {
            isApproved = profile.approved === true;
        }
    }
    if (!SUPABASE_URL.startsWith('https://') || SUPABASE_PUBLISHABLE_KEY.startsWith('PASTE_')) { statusEl.textContent = '설정이 필요합니다: config.js에 Supabase URL과 Publishable key를 입력해 주세요.'; return; }
    const { data, error } = await supabase.from('public_daily_images')
        .select('id,title,image_date,day_number,image_url,tags,description').order('image_date', { ascending: false }).order('day_number', { ascending: false });
    if (error) { statusEl.textContent = '이미지를 불러오지 못했습니다. Supabase Data API와 읽기 정책을 확인해 주세요.'; console.error(error); return; }
    const items = data || []; statusEl.textContent = `현재 ${items.length}개의 이미지가 기록되어 있습니다.`;
    document.getElementById('gallery-meta').textContent = `${items.length} IMAGES`;
    document.getElementById('archive-heading').innerHTML = `${items.length} DAYS.<br>${items.length} PROMPTS.`;
    const featured = document.getElementById('featured');
    if (items.length) {
        const x = items[0];
        document.getElementById('today-meta').textContent = `${dateLabel(x.image_date)} · DAY ${String(x.day_number || '').padStart(3, '0')}`;

        featured.innerHTML = `<img class="main-image" src="${esc(x.image_url)}" alt="${esc(x.title || 'Daily image')}"><div class="prompt"><div class="day">DAY ${String(x.day_number || '').padStart(3, '0')} / 365</div><h2>${esc(x.title || 'Untitled image')}</h2>${isApproved ? `<blockquote>${esc(x.prompt || '')}</blockquote>` : '<p class="prompt-locked">프롬프트는 승인된 회원만 볼 수 있습니다.</p>'}${x.description ? `<div class="description">${esc(x.description)}</div>` : ''}<div class="tags">${tagsHtml(x.tags)}</div><a class="button" href="#gallery">VIEW ARCHIVE →</a></div>`;

    } else { document.getElementById('today-meta').textContent = '아직 등록된 이미지가 없습니다.'; }
    document.getElementById('gallery-grid').innerHTML = items.slice(0, 30).map(x => `<article class="card"><img class="thumb" src="${esc(x.image_url)}" alt="${esc(x.title || 'Daily image')}" loading="lazy"><div class="card-info"><div class="card-day">DAY ${String(x.day_number || '').padStart(3, '0')} · ${esc(x.image_date || '')}</div><div class="card-title">${esc(x.title || 'Untitled image')}</div>${isApproved
        ? `<div class="card-prompt">${esc((x.prompt || '').slice(0, 130))}${(x.prompt || '').length > 130 ? '...' : ''}</div>`
        : `<div class="card-prompt">승인된 회원만 프롬프트를 볼 수 있습니다.</div>`}</div></article>`).join('');
    document.getElementById('recent-grid').innerHTML =
        document.getElementById('gallery-grid').innerHTML
            ? items.slice(0, 3).map(x =>
                `<article class="card">
      <img class="thumb" src="${esc(x.image_url)}" alt="${esc(x.title || 'Daily image')}" loading="lazy">
      <div class="card-info">
        <div class="card-day">DAY ${String(x.day_number || '').padStart(3, '0')}</div>
        <div class="card-title">${esc(x.title || 'Untitled image')}</div>
      </div>
    </article>`
            ).join('')
            : '';
    document.getElementById('archive-list').innerHTML = items.slice(0, 30).map(x => `<div class="archive-row"><span>DAY ${String(x.day_number || '').padStart(3, '0')} — ${esc(x.title || 'Untitled image')}</span><span>${esc(x.image_date || '')}</span></div>`).join('') || '<div class="archive-row"><span>등록된 프롬프트가 아직 없습니다.</span></div>';
}

const loginSection = document.getElementById('login');
const loginButton = document.getElementById('login-button');
async function updateLoginButton() {
    const { data: { session } } = await supabase.auth.getSession();

    loginButton.textContent = session ? 'LOGOUT' : 'LOGIN';
    loginButton.href = session ? '#logout' : '#login';
}

loginButton.addEventListener('click', async (event) => {
    event.preventDefault();

    const { data: { session } } = await supabase.auth.getSession();

    if (session) {
        await supabase.auth.signOut();
        await updateLoginButton();
        alert('로그아웃되었습니다.');
    } else {
        loginSection.classList.add('is-open');
        await updateLoginButton();
    }
});

loginSection.addEventListener('click', (event) => {
    if (event.target === loginSection) {
        loginSection.classList.remove('is-open');
    }
});

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        loginSection.classList.remove('is-open');
    }
});
const loginClose = document.getElementById('login-close');

loginClose.addEventListener('click', () => {
    loginSection.classList.remove('is-open');
});
const authForm = document.getElementById('auth-form');
const signupButton = document.getElementById('signup-button');
const authStatus = document.getElementById('auth-status');

authForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;

    authStatus.textContent = '로그인 중입니다...';

    const { error } = await supabase.auth.signInWithPassword({
        email,
        password
    });


    if (error) {
        authStatus.textContent = '로그인에 실패했어요. 이메일과 비밀번호를 확인해 주세요.';
    } else {
        authStatus.textContent = '로그인 성공!';
        loginSection.classList.remove('is-open');
        await updateLoginButton();
    }
});

signupButton.addEventListener('click', async () => {
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;

    if (!email || password.length < 6) {
        authStatus.textContent = '이메일과 6자 이상의 비밀번호를 입력해 주세요.';
        return;
    }

    authStatus.textContent = '회원가입 신청 중입니다...';

    const { error } = await supabase.auth.signUp({
        email,
        password
    });

    authStatus.textContent = error
        ? '가입 신청에 실패했어요. 입력 내용을 확인해 주세요.'
        : '가입 신청이 완료됐어요. 관리자 승인 후 프롬프트를 볼 수 있습니다.';
});
updateLoginButton();
start();