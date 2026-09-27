document.addEventListener('DOMContentLoaded', () => {
    const language = document.getElementById('language-switch');
    const menu = document.getElementById('menu-switch');
    const nav = document.getElementById('primary-nav');
    function syncLanguage() {
        const english = window.languageManager.currentLang === 'en';
        document.documentElement.lang = english ? 'en' : 'zh-CN';
        language.textContent = english ? 'EN / 中文' : '中文 / EN';
        language.setAttribute('aria-label', english ? '切换至中文' : 'Switch to English');
        const title = document.querySelector('.page-title');
        const name = english ? 'Yangzhu Taoist Association of America' : '美国阳翥道教协会';
        document.title = title && title.textContent !== name ? title.textContent + ' — ' + name : name;
    }
    language.addEventListener('click', () => {
        window.languageManager.switchLanguage(window.languageManager.currentLang === 'zh' ? 'en' : 'zh');
        syncLanguage();
    });
    function closeMenu() { nav.classList.remove('open'); menu.setAttribute('aria-expanded', 'false'); }
    document.querySelector('.skip-link').addEventListener('click', () => document.getElementById('main').focus({ preventScroll: true }));
    menu.addEventListener('click', () => {
        const open = nav.classList.toggle('open');
        menu.setAttribute('aria-expanded', String(open));
    });
    nav.addEventListener('click', event => { if (event.target.closest('a')) closeMenu(); });
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && nav.classList.contains('open')) { closeMenu(); menu.focus(); }
    });
    // Keep visible labels associated with the existing contact and newsletter integrations.
    const fields = [
        ['.contact-form input[name="name"]', 'contact-name', '姓名', 'Name'],
        ['.contact-form input[name="email"]', 'contact-email', '邮箱', 'Email'],
        ['.contact-form textarea', 'contact-message', '留言内容', 'Message'],
        ['#newsletter-email', 'newsletter-email', '邮箱地址', 'Email address']
    ];
    fields.forEach(([selector,id,zh,en]) => {
        const field = document.querySelector(selector);
        if (!field) return;
        field.id = id;
        if (field.type === 'email') field.autocomplete = 'email';
        if (id === 'contact-name') field.autocomplete = 'name';
        const label = document.createElement('label');
        label.htmlFor = id; label.dataset.zh = zh; label.dataset.en = en; label.textContent = zh;
        if (id === 'newsletter-email') field.closest('.newsletter-input-group').before(label);
        else field.before(label);
    });
    document.querySelector('.social-link[title="YouTube"]')?.remove();
    document.querySelectorAll('.social-link').forEach(a => a.setAttribute('aria-label', a.title));
    document.getElementById('newsletter-message')?.setAttribute('aria-live', 'polite');
    const support = document.createElement('button');
    support.type = 'button'; support.dataset.zh = '支持协会'; support.dataset.en = 'Support us'; support.textContent = '支持协会';
    document.querySelector('.footer-links').append(support);
    const dialog = document.getElementById('support-dialog');
    support.addEventListener('click', () => dialog.showModal());
    dialog.querySelector('button').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => {
        if (event.target !== dialog) return;
        const rect = dialog.getBoundingClientRect();
        if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
    });
    const currentPage = location.pathname.split('/').pop() || 'index.html';
    nav.querySelectorAll('a').forEach(link => {
        if (link.getAttribute('href') === currentPage) link.setAttribute('aria-current', 'page');
    });
    const entries = [...document.querySelectorAll('.member-detail-card,.activity-detail-card,.ceremony-detail-card,.relation-card,.exchange-card')];
    if (entries.length) {
        const directory = document.createElement('nav');
        directory.className = 'page-directory'; directory.setAttribute('aria-label', '本页目录 / On this page');
        entries.filter(entry => entry.id).forEach(entry => {
            const heading = entry.querySelector('.member-name') || entry.querySelector('h2,h3');
            if (!heading) return;
            const anchor = document.createElement('a');
            anchor.href = '#' + entry.id;
            anchor.dataset.zh = heading.dataset.zh || heading.textContent;
            anchor.dataset.en = heading.dataset.en || heading.textContent;
            anchor.textContent = anchor.dataset.zh;
            directory.append(anchor);
        });
        document.querySelector('.page-header .container').append(directory);
    }
    const viewer = document.createElement('dialog');
    viewer.className = 'image-viewer'; viewer.setAttribute('aria-label', '查看原图 / View image');
    viewer.innerHTML = '<button class="dialog-close" aria-label="关闭 / Close">×</button><img alt=""><p class="image-caption"></p><a target="_blank" rel="noopener noreferrer" data-zh="在新窗口查看原图" data-en="Open original image">在新窗口查看原图</a>';
    document.body.append(viewer);
    viewer.querySelector('button').addEventListener('click', () => viewer.close());
    viewer.addEventListener('click', event => {
        if(event.target !== viewer) return;
        const r = viewer.getBoundingClientRect();
        if(event.clientX<r.left || event.clientX>r.right || event.clientY<r.top || event.clientY>r.bottom) viewer.close();
    });
    document.querySelectorAll('.activity-images img,.ceremony-images img,.relation-image img,.exchange-image img').forEach(img => {
        const button = document.createElement('button'); button.type = 'button'; button.className = 'image-open';
        button.setAttribute('aria-label', '查看图片 / View image: ' + img.alt);
        img.before(button); button.append(img);
        button.addEventListener('click', () => {
            const enlarged = viewer.querySelector('img'); enlarged.src = img.src; enlarged.alt = img.alt;
            viewer.querySelector('.image-caption').textContent = img.alt;
            viewer.querySelector('a').href = img.src; viewer.showModal();
        });
    });
    // Progressive enhancement: without JavaScript, every photograph stays accessible.
    document.querySelectorAll('.activity-images,.ceremony-images').forEach(gallery => {
        const slides = [...gallery.children];
        if (slides.length < 2) return;
        gallery.classList.add('media-slider');
        gallery.setAttribute('role', 'region');
        gallery.setAttribute('aria-label', '活动相册 / Event gallery');
        const stage = document.createElement('div'); stage.className = 'slider-stage';
        slides.forEach(slide => stage.append(slide));
        const controls = document.createElement('div'); controls.className = 'slider-controls';
        const previous = document.createElement('button'); previous.type = 'button'; previous.textContent = '←';
        previous.setAttribute('aria-label', '上一张 / Previous slide');
        const next = document.createElement('button'); next.type = 'button'; next.textContent = '→';
        next.setAttribute('aria-label', '下一张 / Next slide');
        const counter = document.createElement('span'); counter.setAttribute('aria-live', 'polite'); counter.setAttribute('aria-atomic', 'true');
        controls.append(previous, counter, next); gallery.append(stage, controls);
        let current = 0;
        function show(index) {
            slides[current].querySelectorAll('video').forEach(video => video.pause());
            if (slides[current].tagName === 'VIDEO') slides[current].pause();
            current = (index + slides.length) % slides.length;
            slides.forEach((slide, i) => { slide.hidden = i !== current; });
            counter.textContent = `${current + 1} / ${slides.length}`;
        }
        previous.addEventListener('click', () => show(current - 1));
        next.addEventListener('click', () => show(current + 1));
        gallery.addEventListener('keydown', event => {
            if (event.target.closest('video') || !['ArrowLeft','ArrowRight'].includes(event.key)) return;
            event.preventDefault(); show(current + (event.key === 'ArrowRight' ? 1 : -1));
        });
        let start = null, swiped = false;
        stage.addEventListener('touchstart', event => {
            swiped = false;
            start = event.touches.length === 1 && !event.target.closest('video') ? {x:event.touches[0].clientX,y:event.touches[0].clientY} : null;
        }, {passive:true});
        stage.addEventListener('touchend', event => {
            if (!start) return;
            const dx = event.changedTouches[0].clientX - start.x, dy = event.changedTouches[0].clientY - start.y;
            start = null;
            if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.5) { swiped = true; show(current + (dx < 0 ? 1 : -1)); }
        }, {passive:true});
        stage.addEventListener('touchcancel', () => { start = null; }, {passive:true});
        stage.addEventListener('click', event => { if(swiped) { event.preventDefault(); event.stopPropagation(); swiped = false; } }, true);
        show(0);
    });
    const top = document.createElement('a'); top.href = '#main'; top.className = 'to-top';
    top.dataset.zh = '返回顶部 ↑'; top.dataset.en = 'Back to top ↑'; top.textContent = top.dataset.zh;
    document.querySelector('.footer .container').append(top);
    function reachHash() {
        if (!location.hash) return;
        let id; try { id = decodeURIComponent(location.hash.slice(1)); } catch { return; }
        const target = document.getElementById(id);
        if (target) target.scrollIntoView({behavior:'instant',block:'start'});
    }
    // One final alignment after fonts and media settle; never force the page back to the top.
    window.addEventListener('load', reachHash, {once:true});
    document.addEventListener('languagechange', syncLanguage);
    window.languageManager.updateLanguage();
    syncLanguage();
});
