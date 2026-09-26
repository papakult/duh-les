(function () {
  'use strict';

  var PHONE = '79122630108';
  var MSG = window.DUHLES_MSG || {};
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Аналитика: без привязки к счётчику ---------- */
  // События уходят в dataLayer и как CustomEvent 'duhles:track'.
  // Для Яндекс Метрики напрямую задайте window.DUHLES_YM_ID, цели уйдут в ym(..., 'reachGoal').
  function track(name, params) {
    params = params || {};
    try {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push(Object.assign({ event: name }, params));
      window.dispatchEvent(new CustomEvent('duhles:track', { detail: { name: name, params: params } }));
      if (typeof window.ym === 'function' && window.DUHLES_YM_ID) window.ym(window.DUHLES_YM_ID, 'reachGoal', name, params);
      if (typeof window.gtag === 'function') window.gtag('event', name, params);
    } catch (e) { /* аналитика не ломает сайт */ }
  }
  window.duhlesTrack = track;

  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-track]');
    if (!el) return;
    var name = el.getAttribute('data-track');
    var p = { service: el.getAttribute('data-service') || '', place: el.getAttribute('data-place') || '' };
    var ch = el.getAttribute('data-channel');
    if (ch) p.channel = ch;
    track(name, p);
    if (name === 'cta_service_click' && ch === 'phone' && touch) track('phone_click', p);
  });

  /* ---------- Тост и буфер ---------- */
  var toastEl = document.getElementById('toast'), toastT;
  function toast(t) {
    if (!toastEl) return;
    toastEl.textContent = t; toastEl.hidden = false;
    clearTimeout(toastT); toastT = setTimeout(function () { toastEl.hidden = true; }, 3200);
  }
  function copyText(t) {
    try { if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(t); } catch (e) {}
    return Promise.reject();
  }
  // Telegram не умеет предзаполнять сообщение: копируем текст
  document.addEventListener('click', function (e) {
    var a = e.target.closest('[data-tgmsg]');
    if (!a) return;
    var text = MSG[a.getAttribute('data-tgmsg')] || MSG.general;
    if (text) copyText(text).then(function () { toast('Текст сообщения скопирован. Вставьте его в чат Telegram'); }, function () {});
  });
  document.querySelectorAll('[data-copy]').forEach(function (b) {
    b.addEventListener('click', function () {
      copyText(b.getAttribute('data-copy')).then(function () { toast('Номер скопирован'); }, function () { toast('Номер: +7 912 263-01-08'); });
    });
  });

  /* ---------- Шапка и hero ---------- */
  var top = document.getElementById('top');
  var hero = document.querySelector('.hero');
  var heroImg = null;
  var ticking = false;
  function onScroll() {
    if (ticking) return; ticking = true;
    requestAnimationFrame(function () {
      var y = window.scrollY || 0;
      var h = hero ? hero.offsetHeight : 600;
      if (!document.body.classList.contains('menu-open')) top.setAttribute('data-state', y > h * 0.75 ? 'solid' : 'over');
      if (heroImg && !reduce && y < h) heroImg.style.setProperty('--py', (y * 0.12).toFixed(1) + 'px');
      updateBar();
      ticking = false;
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ---------- Полноэкранное меню ---------- */
  var menuBtn = document.querySelector('.menu-btn');
  var menu = document.getElementById('menu');
  function setMenu(open) {
    menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    menuBtn.querySelector('.menu-btn__t').textContent = open ? 'Закрыть' : 'Меню';
    document.body.classList.toggle('menu-open', open);
    document.documentElement.style.overflow = open ? 'hidden' : '';
    if (open) {
      menu.hidden = false;
      top.setAttribute('data-state', 'over');
      requestAnimationFrame(function () { menu.classList.add('is-open'); });
      var f = menu.querySelector('a'); if (f) setTimeout(function () { f.focus({ preventScroll: true }); }, 60);
    } else {
      menu.classList.remove('is-open');
      setTimeout(function () { if (!menu.classList.contains('is-open')) menu.hidden = true; }, reduce ? 0 : 260);
      onScroll();
    }
    updateBar();
  }
  if (menuBtn && menu) {
    menuBtn.addEventListener('click', function () { setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'); });
    menu.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !menu.hidden) { setMenu(false); menuBtn.focus(); } });
  }

  /* ---------- Звонок: все заявки идут по телефону ---------- */
  var book = document.getElementById('book');
  var bkService = document.getElementById('book-service');
  var TEL = 'tel:+' + PHONE;
  var touch = window.matchMedia('(hover: none), (pointer: coarse)').matches;
  function openCall(service, place) {
    bkService.textContent = service && service !== 'Общая бронь' && service !== 'Звонок'
      ? service + '. Подскажем свободное время и всё забронируем по телефону.'
      : 'Подскажем свободное время и всё забронируем по телефону.';
    book.querySelectorAll('[data-track]').forEach(function (a) { a.setAttribute('data-service', service || 'Звонок'); a.setAttribute('data-place', 'booking-dialog:' + (place || '')); });
    if (typeof book.showModal === 'function') { book.showModal(); updateBar(); }
  }
  // Кнопки «Позвонить / Узнать время»: на телефоне сразу набор номера, на компьютере окно с номером
  document.querySelectorAll('[data-book]').forEach(function (b) {
    b.addEventListener('click', function () {
      if (touch || !book) { track('phone_click', { service: b.getAttribute('data-service') || '', place: b.getAttribute('data-place') || '' }); window.location.href = TEL; }
      else openCall(b.getAttribute('data-service'), b.getAttribute('data-place'));
    });
  });
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[data-channel="phone"]');
    if (!a || touch || !book) return;
    e.preventDefault();
    openCall(a.getAttribute('data-service'), a.getAttribute('data-place'));
  });
  if (book) {
    book.addEventListener('click', function (e) { if (e.target === book) book.close(); });
    book.addEventListener('close', updateBar);
  }

  /* ---------- Мобильная панель ---------- */
  var mbar = document.getElementById('mbar');
  var lb = document.getElementById('lb');
  var visibleZones = new Set();
  function updateBar() {
    if (!mbar) return;
    var y = window.scrollY || 0;
    var h = hero ? hero.offsetHeight : 600;
    var hide = visibleZones.size > 0 || (book && book.open) || (lb && lb.open) || document.body.classList.contains('menu-open') || y < h * 0.6;
    mbar.classList.toggle('is-hidden', !!hide);
  }
  if ('IntersectionObserver' in window && mbar) {
    var zo = new IntersectionObserver(function (ents) {
      ents.forEach(function (en) { if (en.isIntersecting) visibleZones.add(en.target); else visibleZones.delete(en.target); });
      updateBar();
    }, { rootMargin: '0px 0px -10% 0px' });
    [document.getElementById('contacts'), document.querySelector('.foot')].forEach(function (z) { if (z) zo.observe(z); });
  }

  /* ---------- Появление: blur-in (механика из hero-04) ---------- */
  var rvs = document.querySelectorAll('.rv');
  if (!reduce && 'IntersectionObserver' in window) {
    var ro = new IntersectionObserver(function (ents) {
      ents.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('is-in'); ro.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    rvs.forEach(function (el) { ro.observe(el); });
  } else {
    rvs.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* ---------- Видео огня: играет только в кадре ---------- */
  var fire = document.querySelector('video.fire');
  if (fire) {
    if (reduce) { fire.controls = true; }
    else if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (ents) {
        ents.forEach(function (en) {
          if (en.isIntersecting) { fire.preload = 'auto'; var p = fire.play(); if (p && p.catch) p.catch(function () {}); }
          else fire.pause();
        });
      }, { threshold: 0.25 }).observe(fire);
    }
  }

  /* ---------- Лента фото ---------- */
  var strip = document.getElementById('strip');
  document.querySelectorAll('[data-strip]').forEach(function (b) {
    b.addEventListener('click', function () {
      var dir = parseInt(b.getAttribute('data-strip'), 10);
      strip.scrollBy({ left: dir * strip.clientWidth * 0.8, behavior: reduce ? 'auto' : 'smooth' });
    });
  });

  /* ---------- Lightbox ---------- */
  var items = Array.prototype.slice.call(document.querySelectorAll('#grid .gi'));
  var lbImg = document.getElementById('lb-img');
  var lbCap = document.getElementById('lb-cap');
  var lbN = document.getElementById('lb-n');
  var idx = 0, opener = null;
  function show(i) {
    idx = (i + items.length) % items.length;
    var it = items[idx];
    lbImg.src = it.getAttribute('data-full');
    lbImg.alt = it.querySelector('img').alt;
    lbCap.textContent = it.querySelector('img').alt;
    lbN.textContent = (idx + 1) + ' из ' + items.length;
    var nx = items[(idx + 1) % items.length]; if (nx) { var pre = new Image(); pre.src = nx.getAttribute('data-full'); }
  }
  items.forEach(function (it, i) {
    it.addEventListener('click', function () {
      opener = it; show(i);
      if (typeof lb.showModal === 'function') lb.showModal(); else lb.setAttribute('open', '');
      updateBar();
      track('gallery_open', { service: it.getAttribute('data-cat') || '', place: 'gallery', photo: it.getAttribute('data-slug') || '' });
    });
  });
  if (lb) {
    lb.querySelector('.lb__prev').addEventListener('click', function () { show(idx - 1); });
    lb.querySelector('.lb__next').addEventListener('click', function () { show(idx + 1); });
    lb.querySelector('.lb__x').addEventListener('click', function () { lb.close(); });
    lb.addEventListener('close', function () { lbImg.removeAttribute('src'); if (opener) opener.focus(); updateBar(); });
    lb.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); show(idx + 1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); show(idx - 1); }
    });
    lb.addEventListener('click', function (e) { if (e.target === lb || e.target.classList.contains('lb__in')) lb.close(); });
    var sx = null, sy = null;
    lb.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
    lb.addEventListener('touchend', function (e) {
      if (sx === null) return;
      var dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) show(idx + (dx < 0 ? 1 : -1));
      sx = sy = null;
    });
  }


  /* ---------- v7: маска открылась, снимаем clip-path, чтобы тени и печать не резались ---------- */
  document.querySelectorAll('.rv--media').forEach(function (el) {
    el.addEventListener('transitionend', function (e) { if (e.propertyName === 'clip-path' && el.classList.contains('is-in')) el.classList.add('rv-done'); });
  });
  if (reduce) document.querySelectorAll('.rv--media').forEach(function (el) { el.classList.add('rv-done'); });

  /* ---------- Прогресс прокрутки ---------- */
  var prog = document.querySelector('.progress');
  /* ---------- Параллакс внутри рамок ---------- */
  var pars = Array.prototype.slice.call(document.querySelectorAll('.collage__a, .forest__real, .steam__a, .tent__img, .trio figure:not(.trio__mid)'));
  pars.forEach(function (f) { f.setAttribute('data-par', ''); });
  var parOn = !reduce && window.matchMedia('(min-width: 641px)').matches;
  function fx() {
    var y = window.scrollY || 0, vh = window.innerHeight;
    if (prog) { var max = document.documentElement.scrollHeight - vh; prog.style.setProperty('--sp', max > 0 ? (y / max).toFixed(4) : 0); }
    if (parOn) pars.forEach(function (f) {
      var r = f.getBoundingClientRect();
      if (r.bottom < -100 || r.top > vh + 100) return;
      var k = ((r.top + r.height / 2) - vh / 2) / vh; // -1..1
      f.style.setProperty('--par', (k * -26).toFixed(1) + 'px');
    });
  }
  var fxT = false;
  window.addEventListener('scroll', function () { if (fxT) return; fxT = true; requestAnimationFrame(function () { fx(); fxT = false; }); }, { passive: true });
  window.addEventListener('resize', fx);
  fx();

  /* ---------- Мышь: кольцо-курсор и магнитные кнопки ---------- */
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (fine && !reduce) {
    var cur = document.createElement('div'); cur.className = 'cur'; cur.setAttribute('aria-hidden', 'true');
    cur.innerHTML = '<b></b>'; document.body.appendChild(cur);
    var lab = cur.firstChild, mx = -100, my = -100, cx = -100, cy = -100;
    document.addEventListener('mousemove', function (e) { mx = e.clientX; my = e.clientY; cur.classList.add('on'); }, { passive: true });
    document.addEventListener('mouseleave', function () { cur.classList.remove('on'); });
    (function loop() { cx += (mx - cx) * 0.2; cy += (my - cy) * 0.2; cur.style.transform = 'translate(' + cx.toFixed(1) + 'px,' + cy.toFixed(1) + 'px)'; requestAnimationFrame(loop); })();
    document.addEventListener('mouseover', function (e) {
      var g = e.target.closest('#grid .gi');
      var l = !g && e.target.closest('a, button, summary');
      cur.classList.toggle('big', !!g); cur.classList.toggle('link', !!l);
      lab.textContent = g ? 'Открыть' : '';
    });
    document.querySelectorAll('.btn--primary').forEach(function (b) {
      b.classList.add('is-mag');
      b.addEventListener('mousemove', function (e) {
        var r = b.getBoundingClientRect();
        var dx = (e.clientX - r.left - r.width / 2) * 0.22, dy = (e.clientY - r.top - r.height / 2) * 0.3;
        b.style.transform = 'translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px)';
      });
      b.addEventListener('mouseleave', function () { b.style.transform = ''; });
    });
  }

  onScroll();
})();
