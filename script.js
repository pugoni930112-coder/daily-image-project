
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


document.addEventListener('pointerup', (event) => {
    const image = event.target.closest?.(
        'img.main-image, img.thumb, img.member-prompt-image'
    );

    if (image) {
        lightboxImage.src = image.currentSrc || image.src;
        lightboxImage.alt = image.alt || '전체 이미지 보기';
        lightbox.classList.add('is-open');
        return;
    }

    if (
        event.target === lightbox ||
        event.target === lightboxClose
    ) {
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
const about = document.getElementById('about-content');

    // 화면 전환 대상만 숨김 처리
   [hero, today, recent, gallery, archive, about].forEach(section => {
    if (section) section.style.display = 'none';
});

    if (currentPage === '#today') {
        if (hero) hero.style.display = 'block';
        if (today) today.style.display = 'block';
        if (recent) recent.style.display = 'block';
    } else if (currentPage === '#gallery') {
        if (gallery) gallery.style.display = 'block';
    } else if (currentPage === '#member-prompts') {
        if (archive) archive.style.display = 'block';
   } else if (currentPage === '#about') {
    if (about) about.style.display = 'block';
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

        console.log('프로필 조회 결과:', profile);
        console.log('프로필 조회 오류:', profileError);

        if (!profileError && profile) {
            isApproved = profile.approved === true;
        }
    }
    if (!SUPABASE_URL.startsWith('https://') || SUPABASE_PUBLISHABLE_KEY.startsWith('PASTE_')) { statusEl.textContent = '설정이 필요합니다: config.js에 Supabase URL과 Publishable key를 입력해 주세요.'; return; }
    const { data, error } = await supabase.from('public_daily_images')


        .select('id,title,image_date,day_number,image_url,tags,description,image_position_x,image_position_y,image_zoom,prompt')

        .order('image_date', { ascending: false }).order('day_number', { ascending: false });
    if (error) { statusEl.textContent = '이미지를 불러오지 못했습니다. Supabase Data API와 읽기 정책을 확인해 주세요.'; console.error(error); return; }
    const items = data || []; console.log('이미지 조회 결과:', items);
    console.log('각 이미지 프롬프트:', items.map(x => ({
        title: x.title,
        prompt: x.prompt
    }))); statusEl.textContent = `현재 ${items.length}개의 이미지가 기록되어 있습니다.`;
    document.getElementById('gallery-meta').textContent = `${items.length} IMAGES`;
    document.getElementById('archive-heading').innerHTML =
        `${items.length} ${items.length === 1 ? 'DAY' : 'DAYS'}.<br>${items.length} ${items.length === 1 ? 'PROMPT' : 'PROMPTS'}.`;
    const featured = document.getElementById('featured');
    if (items.length) {
        const x = items[0];
        document.getElementById('today-meta').textContent = `${dateLabel(x.image_date)} · DAY ${String(x.day_number || '').padStart(3, '0')}`;

        featured.innerHTML = `
<img class="main-image" src="${esc(x.image_url)}" alt="${esc(x.title || 'Daily image')}" style="object-position: ${Number(x.image_position_x ?? 50)}% ${Number(x.image_position_y ?? 50)}%; transform: scale(${Number(x.image_zoom ?? 1)});">
<div class="prompt"><div class="day">DAY ${String(x.day_number || '').padStart(3, '0')} / 365</div><h2>${esc(x.title || 'Untitled image')}</h2>${isApproved ? `<blockquote>${esc(x.prompt || '')}</blockquote>` : '<p class="prompt-locked">프롬프트는 승인된 회원만 볼 수 있습니다.</p>'}${x.description ? `<div class="description">${esc(x.description)}</div>` : ''}<div class="tags">${tagsHtml(x.tags)}</div><a class="button" href="#gallery">VIEW ARCHIVE →</a></div>`;

    } else { document.getElementById('today-meta').textContent = '아직 등록된 이미지가 없습니다.'; }
    document.getElementById('gallery-grid').innerHTML = items.slice(0, 30).map(x => `<article class="card">
<img class="thumb" src="${esc(x.image_url)}" alt="${esc(x.title || 'Daily image')}" loading="lazy" style="object-position: ${Number(x.image_position_x ?? 50)}% ${Number(x.image_position_y ?? 50)}%; transform: scale(${Number(x.image_zoom ?? 1)});">
<div class="card-info"><div class="card-day">DAY ${String(x.day_number || '').padStart(3, '0')} · ${esc(x.image_date || '')}</div><div class="card-title">${esc(x.title || 'Untitled image')}</div>${isApproved
            ? `<div class="card-prompt">${esc((x.prompt || '').slice(0, 130))}${(x.prompt || '').length > 130 ? '...' : ''}</div>`
            : `<div class="card-prompt">승인된 회원만 프롬프트를 볼 수 있습니다.</div>`}</div></article>`).join('');
    document.getElementById('recent-grid').innerHTML =
        document.getElementById('gallery-grid').innerHTML
            ? items.slice(0, 3).map(x =>
                `<article class="card">
      
<img class="thumb" src="${esc(x.image_url)}" alt="${esc(x.title || 'Daily image')}" loading="lazy" style="object-position: ${Number(x.image_position_x ?? 50)}% ${Number(x.image_position_y ?? 50)}%; transform: scale(${Number(x.image_zoom ?? 1)});">

      <div class="card-info">
        <div class="card-day">DAY ${String(x.day_number || '').padStart(3, '0')}</div>
        <div class="card-title">${esc(x.title || 'Untitled image')}</div>
      </div>
    </article>`
            ).join('')
            : '';


    const archiveList = document.getElementById('archive-list');


    // MEMBER PROMPTS: 승인 회원에게만 이미지 등록 버튼 표시
    const previousUploadWrap = document.getElementById('member-upload-wrap');
    if (previousUploadWrap) previousUploadWrap.remove();

    if (isApproved) {
        console.log('업로드 버튼 생성 조건:', isApproved);
        const uploadWrap = document.createElement('div');
        uploadWrap.id = 'member-upload-wrap';
        uploadWrap.style.cssText =
            'display:flex;justify-content:flex-end;margin:0 0 24px;';

        uploadWrap.innerHTML = `
            <a id="member-upload-link"
               href="./member-upload.html"
               style="display:inline-block;padding:12px 18px;background:#171717;color:#fff;text-decoration:none;border-radius:4px;font-size:13px;font-weight:700;">
               + 이미지 업로드
            </a>`;

        archiveList.parentElement.insertBefore(uploadWrap, archiveList);
    }



    if (!isApproved) {
        archiveList.innerHTML =
            '<div class="archive-row"><span>로그인 후 관리자 승인을 받으면 프롬프트를 볼 수 있습니다.</span></div>';
    } else {
        archiveList.innerHTML = items.slice(0, 30).map(x => `
        <article class="member-prompt-card">
            <img
                class="member-prompt-image"
                src="${esc(x.image_url)}"
                alt="${esc(x.title || 'Daily image')}"
                loading="lazy"
                style="object-position: ${Number(x.image_position_x ?? 50)}% ${Number(x.image_position_y ?? 50)}%; transform: scale(${Number(x.image_zoom ?? 1)});"
            >
            <div class="member-prompt-content">
                <div class="member-prompt-day">
                    DAY ${String(x.day_number || '').padStart(3, '0')}
                    · ${esc(x.image_date || '')}
                </div>
                <h3>${esc(x.title || 'Untitled image')}</h3>
                <p>${esc(x.prompt || '등록된 프롬프트가 없습니다.')}</p>
            </div>
        </article>
    `).join('') ||
            '<div class="archive-row"><span>등록된 이미지가 아직 없습니다.</span></div>';
    }



}

const loginSection = document.getElementById('login');
const loginButton = document.getElementById('login-button');

async function updateLoginButton() {
    const { data: { session } } = await supabase.auth.getSession();

    loginButton.textContent = session ? 'LOGOUT' : 'LOGIN';
    loginButton.href = session ? '#logout' : '#login';

    const adminMenu = document.getElementById('admin-menu');

    if (adminMenu) {
        let isAdmin = false;

        if (session) {
            const { data: profile, error } = await supabase
                .from('profiles')
                .select('is_admin')
                .eq('id', session.user.id)
                .maybeSingle();

            if (!error && profile) {
                isAdmin = profile.is_admin === true;
            }
        }

        adminMenu.style.display = isAdmin ? '' : 'none';
    }
}


loginButton.addEventListener('click', async (event) => {
    event.preventDefault();

    const { data: { session } } = await supabase.auth.getSession();

    if (session) {
        await supabase.auth.signOut();
        await updateLoginButton();

        // 로그아웃 후 회원 전용 프롬프트 숨기기
        document.getElementById('archive-list').innerHTML =
            '<div class="archive-row"><span>로그인 후 관리자 승인을 받으면 프롬프트를 볼 수 있습니다.</span></div>';

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
        await start();
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