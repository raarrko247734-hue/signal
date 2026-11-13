// js/ui.js — общие UI-компоненты: шапка, тосты, модальные окна, валидация, иконки, уведомления
(function () {
  'use strict';

  // ---------- XSS-безопасный вывод ----------
  function esc(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // обрезка пробелов и схлопывание множественных пробелов
  function normalizeSpaces(str) {
    return String(str || '').replace(/\s+/g, ' ').trim();
  }

  // ---------- SVG-иконки (линейные) ----------
  const ICONS = {
    bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
    x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
    message: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
    paperclip: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
    filter: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>',
    chevron: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>',
    arrowLeft: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
    alert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
    flag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>',
    grid: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>',
    list: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>',
    user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
    logOut: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>',
    download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
    refresh: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>',
    send: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>',
    lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
    info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
    sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>',
    moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>'
  };

  function icon(name, cls) {
    return '<span class="icon ' + (cls || '') + '">' + (ICONS[name] || ICONS.info) + '</span>';
  }

  // ---------- Даты ----------
  function fmtDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }
  function fmtDateTime(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }) + ' ' +
      d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  }
  function relTime(iso) {
    if (!iso) return '';
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'только что';
    if (m < 60) return m + ' мин назад';
    const h = Math.floor(m / 60);
    if (h < 24) return h + ' ч назад';
    const d = Math.floor(h / 24);
    if (d < 30) return d + ' дн назад';
    return fmtDate(iso);
  }

  // ---------- Аватар-инициалы ----------
  function initials(name) {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  // ---------- Тосты ----------
  let toastContainer = null;
  function ensureToastContainer() {
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.className = 'toast-container';
      toastContainer.setAttribute('role', 'region');
      toastContainer.setAttribute('aria-live', 'polite');
      toastContainer.setAttribute('aria-label', 'Уведомления');
      document.body.appendChild(toastContainer);
    }
    return toastContainer;
  }
  function toast(message, type, duration) {
    ensureToastContainer();
    const el = document.createElement('div');
    el.className = 'toast toast-' + (type || 'info');
    el.innerHTML = '<span class="toast-icon">' + (type === 'error' ? ICONS.alert : type === 'success' ? ICONS.check : ICONS.info) + '</span>' +
      '<span class="toast-text">' + esc(message) + '</span>';
    toastContainer.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => {
      el.classList.remove('show');
      setTimeout(() => el.remove(), 300);
    }, duration || 3500);
  }
  function toastError(msg) { toast(msg, 'error', 4500); }
  function toastSuccess(msg) { toast(msg, 'success', 3000); }

  // ---------- Подтверждение ----------
  function confirmDialog(message, onConfirm, opts) {
    opts = opts || {};
    openModal({
      title: opts.title || 'Подтверждение',
      size: 'sm',
      body: '<p class="modal-confirm-text">' + esc(message) + '</p>',
      footer: '<button class="btn btn-danger" data-confirm="1">' + esc(opts.confirmText || 'Подтвердить') + '</button>' +
        '<button class="btn btn-ghost" data-close="1">Отмена</button>',
      onMount: (modal) => {
        modal.querySelector('[data-confirm]').addEventListener('click', () => {
          closeModal();
          if (onConfirm) onConfirm();
        });
      }
    });
  }

  // ---------- Модальные окна ----------
  let modalStack = [];
  function openModal(opts) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    if (opts.size === 'sm') overlay.classList.add('modal-sm');
    if (opts.size === 'lg') overlay.classList.add('modal-lg');
    const dialog = document.createElement('div');
    dialog.className = 'modal-dialog';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    const titleId = 'modal-title-' + Date.now();
    dialog.setAttribute('aria-labelledby', titleId);

    const header = '<div class="modal-header">' +
      '<h2 class="modal-title" id="' + titleId + '">' + esc(opts.title || '') + '</h2>' +
      '<button class="modal-close" aria-label="Закрыть" data-close="1">' + ICONS.x + '</button>' +
      '</div>';
    const body = '<div class="modal-body">' + (opts.body || '') + '</div>';
    const footer = opts.footer ? '<div class="modal-footer">' + opts.footer + '</div>' : '';
    dialog.innerHTML = header + body + footer;
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    document.body.classList.add('modal-open');

    const close = () => {
      overlay.classList.remove('show');
      document.body.classList.remove('modal-open');
      setTimeout(() => {
        overlay.remove();
        modalStack = modalStack.filter(x => x !== overlay);
      }, 200);
      if (opts.onClose) opts.onClose();
    };
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    dialog.querySelector('[data-close]').addEventListener('click', close);
    dialog.querySelectorAll('[data-close="1"]').forEach(b => b.addEventListener('click', close));

    modalStack.push({ overlay, close });
    requestAnimationFrame(() => overlay.classList.add('show'));

    if (opts.onMount) opts.onMount(dialog, close);
    initScrollHints(dialog);
    // фокус на первый интерактивный элемент
    setTimeout(() => {
      const focusable = dialog.querySelector('input, textarea, select, button:not([data-close])');
      if (focusable) focusable.focus();
    }, 50);
    return { overlay, dialog, close };
  }
  function closeModal() {
    if (modalStack.length) modalStack[modalStack.length - 1].close();
  }
  // Esc для закрытия верхнего модального окна
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalStack.length) {
      e.preventDefault();
      modalStack[modalStack.length - 1].close();
    }
  });

  // ---------- Валидация ----------
  // field API: { input, validate, errorEl }
  function clearError(field) {
    field.input.removeAttribute('aria-invalid');
    field.input.removeAttribute('aria-describedby');
    if (field.errorEl) { field.errorEl.textContent = ''; field.errorEl.style.display = 'none'; }
    field.input.classList.remove('invalid');
  }
  function setError(field, msg) {
    field.input.setAttribute('aria-invalid', 'true');
    field.input.setAttribute('aria-describedby', field.errorEl.id);
    field.errorEl.textContent = msg;
    field.errorEl.style.display = 'block';
    field.input.classList.add('invalid');
    field.errorEl.setAttribute('role', 'alert');
  }
  // Создать поле валидации с подпиской на blur и input
  function attachField(field) {
    field.input.addEventListener('blur', () => {
      const r = field.validate();
      if (r) setError(field, r); else clearError(field);
    });
    field.input.addEventListener('input', () => {
      if (field.input.getAttribute('aria-invalid') === 'true') {
        const r = field.validate();
        if (!r) clearError(field);
      }
    });
  }
  // Прогнать все поля, показать ошибки, вернуть true если всё валидно
  function validateAll(fields, errorBox) {
    let firstInvalid = null;
    const errors = [];
    for (const f of fields) {
      const r = f.validate();
      if (r) {
        setError(f, r);
        errors.push({ field: f, msg: r });
        if (!firstInvalid) firstInvalid = f;
      } else {
        clearError(f);
      }
    }
    if (errorBox && errors.length) {
      errorBox.innerHTML = '<p>Проверьте поля:</p><ul>' + errors.map((e, i) =>
        '<li><a href="#' + e.field.input.id + '" data-focus="' + e.field.input.id + '">' + esc(e.msg) + '</a></li>'
      ).join('') + '</ul>';
      errorBox.style.display = 'block';
      errorBox.querySelectorAll('[data-focus]').forEach(a => a.addEventListener('click', (ev) => {
        ev.preventDefault();
        const el = document.getElementById(a.getAttribute('data-focus'));
        if (el) el.focus();
      }));
    } else if (errorBox) {
      errorBox.style.display = 'none';
      errorBox.innerHTML = '';
    }
    if (firstInvalid) {
      firstInvalid.input.focus();
      firstInvalid.input.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    return errors.length === 0;
  }
  // Фабрика полей-ошибок
  function makeErrorEl(id) {
    const el = document.createElement('p');
    el.className = 'field-error';
    el.id = id + '-error';
    el.style.display = 'none';
    return el;
  }

  // ---------- Шапка ----------
  function buildHeader(currentPage) {
    const session = window.Store.getSession();
    const role = session ? session.role : null;
    const user = session ? session.user : '';
    const navItems = {
      employee: { label: 'Моё рабочее место', href: 'employee.html' },
      manager: { label: 'Рабочее место ответственного', href: 'manager.html' },
      admin: { label: 'Консоль администратора', href: 'admin.html' }
    };
    let navHtml = '';
    if (role && navItems[role]) {
      const ni = navItems[role];
      navHtml = '<nav class="header-nav"><a href="' + ni.href + '" class="' + (currentPage === role ? 'active' : '') + '">' + esc(ni.label) + '</a></nav>';
    }

    const unread = role ? window.Store.getUnreadCount(user) : 0;
    const dyn = role ? window.Store.getDynamicNotifications(role, user).length : 0;
    const totalBell = unread + dyn;

    const html = '<header class="app-header">' +
      '<div class="header-inner">' +
        '<a href="index.html" class="brand" aria-label="Сигнал — главная">' +
          '<span class="brand-mark" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="1.8" stroke-linecap="round"><path d="M17 20.7 A10 10 0 1 1 17 3.3"/><path d="M15.5 18.1 A7 7 0 1 1 15.5 5.9"/><path d="M14.2 15.8 A4.4 4.4 0 1 1 14.2 8.2"/><circle cx="12" cy="12" r="1.7" fill="#F05A28" stroke="none"/></svg></span>' +
          '<span class="brand-name">Сигнал</span>' +
        '</a>' +
        navHtml +
        '<div class="header-right">' +
          '<button class="theme-toggle" id="theme-toggle" aria-label="Переключить тему" title="Светлая/тёмная тема">' +
            '<span class="icon sun">' + ICONS.sun + '</span>' +
            '<span class="icon moon">' + ICONS.moon + '</span>' +
          '</button>' +
          '<div class="notifications" data-notifications>' +
            '<button class="icon-btn bell-btn" aria-label="Уведомления" aria-haspopup="true" aria-expanded="false">' +
              icon('bell') +
              (totalBell > 0 ? '<span class="bell-count">' + (totalBell > 9 ? '9+' : totalBell) + '</span>' : '') +
            '</button>' +
          '</div>' +
          '<div class="user-switcher">' +
            '<button class="user-chip" aria-haspopup="true" aria-expanded="false">' +
              '<span class="avatar avatar-sm">' + esc(initials(user)) + '</span>' +
              '<span class="user-name">' + esc(user || 'Гость') + '</span>' +
              icon('chevron', 'chevron-icon') +
            '</button>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</header>';

    const mount = document.getElementById('header');
    if (mount) mount.innerHTML = html;
    bindHeader();
    return html;
  }

  function bindHeader() {
    // Тема
    const themeBtn = document.getElementById('theme-toggle');
    if (themeBtn) themeBtn.addEventListener('click', () => toggleTheme());
    // Колокольчик
    const bellWrap = document.querySelector('[data-notifications]');
    if (bellWrap) {
      const btn = bellWrap.querySelector('.bell-btn');
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        // закрыть пользовательское меню если открыто
        document.querySelectorAll('.user-menu').forEach(d => d.remove());
        document.querySelectorAll('.user-chip').forEach(b => b.setAttribute('aria-expanded', 'false'));
        const existing = bellWrap.querySelector('.notif-dropdown');
        if (existing) { existing.remove(); btn.setAttribute('aria-expanded', 'false'); return; }
        btn.setAttribute('aria-expanded', 'true');
        renderNotifDropdown(bellWrap, btn);
      });
    }
    // Переключатель пользователя
    const userChip = document.querySelector('.user-chip');
    if (userChip) {
      userChip.addEventListener('click', (e) => {
        e.stopPropagation();
        // закрыть меню уведомлений если открыто
        document.querySelectorAll('.notif-dropdown').forEach(d => d.remove());
        document.querySelectorAll('.bell-btn').forEach(b => b.setAttribute('aria-expanded', 'false'));
        const existing = userChip.parentElement.querySelector('.user-menu');
        if (existing) { existing.remove(); userChip.setAttribute('aria-expanded', 'false'); return; }
        userChip.setAttribute('aria-expanded', 'true');
        renderUserMenu(userChip.parentElement);
      });
    }
    // Закрытие дропдаунов по клику вне
    document.addEventListener('click', () => {
      document.querySelectorAll('.notif-dropdown, .user-menu').forEach(d => d.remove());
      document.querySelectorAll('.bell-btn, .user-chip').forEach(b => b.setAttribute('aria-expanded', 'false'));
    });
  }

  function renderNotifDropdown(bellWrap, btn) {
    const session = window.Store.getSession();
    if (!session) return;
    const user = session.user;
    const statics = window.Store.getNotifications(user);
    const dyn = window.Store.getDynamicNotifications(session.role, user);
    const all = dyn.concat(statics);
    const dd = document.createElement('div');
    dd.className = 'notif-dropdown';
    dd.addEventListener('click', (e) => e.stopPropagation());
    let html = '<div class="notif-header"><span>Уведомления</span>' +
      (statics.some(n => !n.read) ? '<button class="link-btn" data-markall>Отметить прочитанными</button>' : '') +
      '</div>';
    if (all.length === 0) {
      html += '<div class="notif-empty">Нет новых уведомлений</div>';
    } else {
      html += '<ul class="notif-list">';
      for (const n of all.slice(0, 30)) {
        html += '<li class="notif-item ' + (n.read ? '' : 'unread') + ' ' + (n.dynamic ? 'dyn' : '') + '">' +
          '<a href="' + ticketHref(n.ticketId, session.role) + '" data-ticket="' + esc(n.ticketId) + '">' +
            '<span class="notif-text">' + esc(n.text) + '</span>' +
            '<span class="notif-time">' + esc(relTime(n.at)) + '</span>' +
          '</a></li>';
      }
      html += '</ul>';
    }
    dd.innerHTML = html;
    bellWrap.appendChild(dd);
    initScrollHints(dd);
    // позиционирование
    const rect = btn.getBoundingClientRect();
    dd.style.right = Math.min(window.innerWidth - rect.right - 8, window.innerWidth - 320) + 'px';
    dd.style.top = (rect.bottom + 8) + 'px';
    dd.querySelectorAll('[data-ticket]').forEach(a => a.addEventListener('click', (e) => {
      e.preventDefault();
      dd.remove();
      const id = a.getAttribute('data-ticket');
      const t = window.Store.getTicket(id);
      if (t && window.__openTicket) window.__openTicket(id);
    }));
    const ma = dd.querySelector('[data-markall]');
    if (ma) ma.addEventListener('click', (e) => {
      e.preventDefault();
      window.Store.markAllRead(user);
      dd.remove();
      btn.setAttribute('aria-expanded', 'false');
      buildHeader(window.__currentPage || '');
    });
  }

  function ticketHref(id, role) {
    const page = { employee: 'employee.html', manager: 'manager.html', admin: 'admin.html' }[role] || 'index.html';
    return page + '#ticket-' + id;
  }

  function renderUserMenu(parent) {
    const session = window.Store.getSession();
    const menu = document.createElement('div');
    menu.className = 'user-menu';
    let html = '<div class="user-menu-header">' +
      '<span class="avatar">' + esc(initials(session.user)) + '</span>' +
      '<div><div class="user-menu-name">' + esc(session.user || '') + '</div>' +
      '<div class="user-menu-role">' + esc(roleLabel(session.role)) + '</div></div></div>';
    html += '<button type="button" class="user-menu-item" id="user-menu-logout">' + icon('logOut') + 'Выйти</button>';
    menu.innerHTML = html;
    parent.appendChild(menu);
    initScrollHints(menu);
    // не закрывать меню при клике по его пунктам
    menu.addEventListener('click', (e) => e.stopPropagation());
    const rect = parent.querySelector('.user-chip').getBoundingClientRect();
    menu.style.right = Math.min(window.innerWidth - rect.right - 8, window.innerWidth - 240) + 'px';
    menu.style.top = (rect.bottom + 8) + 'px';
    // обработчик выхода: очищаем сессию и черновик, переходим на страницу входа
    menu.querySelector('#user-menu-logout').addEventListener('click', () => {
      window.Store.clearSession();
      try { window.Store.clearDraft(); } catch (e) {}
      window.location.href = 'index.html';
    });
  }

  function roleLabel(role) {
    return { employee: 'Сотрудник', manager: 'Ответственный', admin: 'Администратор' }[role] || 'Гость';
  }

  // ---------- Общие бейджи ----------
  function statusBadge(status) {
    const label = window.Store.STATUS_LABELS[status];
    const color = window.Store.STATUS_COLORS[status];
    return '<span class="badge badge-status status-' + color + '">' + esc(label) + '</span>';
  }
  function typeBadge(type) {
    return '<span class="badge badge-type type-' + window.Store.TYPE_COLORS[type] + '">' + esc(window.Store.TYPE_LABELS[type] || type) + '</span>';
  }
  function priorityBadge(priority) {
    return '<span class="badge badge-priority priority-' + priorityClass(priority) + '">' + icon('flag') + esc(priority) + '</span>';
  }
  function priorityClass(p) {
    return { 'Низкий': 'low', 'Средний': 'med', 'Высокий': 'high' }[p] || 'med';
  }

  // ---------- Карточка обращения (рендер для канбана и модалки) ----------
  function ticketCard(t, mode) {
    const overdue = window.Store.isOverdue(t);
    const dl = window.Store.daysLeft(t);
    let dueClass = 'due-normal';
    let dueText = 'Срок: ' + window.UI.fmtDate(t.dueAt);
    if (overdue) { dueClass = 'due-overdue'; dueText = 'Просрочено'; }
    else if (dl <= 3) { dueClass = 'due-soon'; dueText = dl <= 0 ? 'Сегодня' : 'Осталось ' + dl + ' дн'; }
    if (window.Store.FINAL_STATUSES.includes(t.status)) { dueClass = 'due-done'; dueText = 'Завершено'; }

    const commentCount = t.events.filter(e => e.type === 'comment' || e.type === 'reply').length;
    const attachCount = (t.attachments || []).length;

    // автор: для сотрудника показываем своё, для manager/admin скрываем если анонимно
    const showAuthor = mode !== 'employee' || t.author !== (window.Store.getSession() || {}).user ? false : true;
    // На доске сотрудника аватар ответственного
    const assigneeName = t.assignee || '';
    const avatarTitle = assigneeName ? assigneeName : 'Не назначен';

    const typeColor = window.Store.TYPE_COLORS[t.type];
    const draggable = canDrag(mode, t) ? 'true' : 'false';

    return '<article class="card strip-' + typeColor + '" draggable="' + draggable + '" data-id="' + esc(t.id) + '" tabindex="0" role="button" aria-label="Обращение ' + esc(t.id) + '">' +
      '<div class="card-body">' +
        '<h4 class="card-title">' + esc(t.title) + '</h4>' +
        '<div class="card-badges">' +
          '<span class="badge badge-id">' + esc(t.id) + '</span>' +
          '<span class="badge badge-priority-mini priority-' + priorityClass(t.priority) + '" title="Приоритет: ' + esc(t.priority) + '">' + esc(t.priority[0]) + '</span>' +
          '<span class="badge badge-due ' + dueClass + '">' + icon('clock') + '<span>' + esc(dueText) + '</span></span>' +
          (commentCount > 0 ? '<span class="badge badge-meta" title="Комментарии">' + icon('message') + esc(commentCount) + '</span>' : '') +
          (attachCount > 0 ? '<span class="badge badge-meta" title="Вложения">' + icon('paperclip') + esc(attachCount) + '</span>' : '') +
        '</div>' +
        '<div class="card-footer">' +
          '<span class="card-category" title="' + esc(t.category) + '">' + esc(t.category) + '</span>' +
          (assigneeName ? '<span class="avatar avatar-xs" title="' + esc(avatarTitle) + '" data-assignee="' + esc(assigneeName) + '">' + esc(initials(assigneeName)) + '</span>' : '<span class="avatar avatar-xs unassigned" title="Не назначен">—</span>') +
        '</div>' +
      '</div>' +
    '</article>';
  }
  function canDrag(mode, t) {
    const session = window.Store.getSession();
    if (mode === 'readonly') return false;
    if (mode === 'own') return window.Store.canEditStatus(session.role, session.user, t);
    if (mode === 'admin') return true;
    return false;
  }

  // ---------- Запрет drag-селекции на карточках, которые нельзя таскать ----------
  function disableCardInteraction(card, mode, t) {
    if (!canDrag(mode, t)) {
      card.addEventListener('dragstart', (e) => { e.preventDefault(); toastError('Менять статус может только назначенный ответственный'); });
    }
  }

  // ---------- Пустое состояние ----------
  function emptyState(text, hint) {
    return '<div class="empty-state"><p>' + esc(text) + '</p>' + (hint ? '<span>' + esc(hint) + '</span>' : '') + '</div>';
  }

  // ---------- Тема ----------
  const THEME_KEY = 'signal.theme';
  function getTheme() { try { return localStorage.getItem(THEME_KEY) || 'light'; } catch (e) { return 'light'; } }
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem(THEME_KEY, theme); } catch (e) {}
  }
  function toggleTheme() { applyTheme(getTheme() === 'dark' ? 'light' : 'dark'); }

  // ---------- Прокрутка «зажал и тяни» + тени-подсказки ----------
  // Скрывает полосы (CSS), добавляет drag мышью на Pointer Events с инерцией.
  // На тач-устройствах drag отключён — работает нативная прокрутка.
  const scrollTimers = new WeakMap();
  const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function setupScrollArea(el) {
    if (!el || el.__scrollBound) return;
    el.__scrollBound = true;

    // --- тени-подсказки о наличии контента по краям ---
    const update = () => {
      const canTop = el.scrollTop > 4;
      const canBottom = el.scrollTop + el.clientHeight < el.scrollHeight - 4;
      el.classList.toggle('can-scroll-top', canTop);
      el.classList.toggle('can-scroll-bottom', canBottom);
      // для доски (горизонталь)
      const canLeft = el.scrollLeft > 4;
      const canRight = el.scrollLeft + el.clientWidth < el.scrollWidth - 4;
      el.classList.toggle('can-scroll-left', canLeft);
      el.classList.toggle('can-scroll-right', canRight);
    };
    el.addEventListener('scroll', () => {
      el.classList.add('is-scrolling');
      update();
      if (scrollTimers.has(el)) clearTimeout(scrollTimers.get(el));
      scrollTimers.set(el, setTimeout(() => el.classList.remove('is-scrolling'), 800));
    }, { passive: true });
    if (window.ResizeObserver) { new ResizeObserver(update).observe(el); }
    el.addEventListener('mouseenter', update);
    update();

    // --- Shift + колёсико → горизонтальная прокрутка ---
    el.addEventListener('wheel', (e) => {
      // если зажат Shift и есть горизонтальный скролл — прокручиваем по X
      if (e.shiftKey && el.scrollWidth > el.clientWidth + 2) {
        if (e.cancelable) e.preventDefault();
        el.scrollLeft += e.deltaY;
      }
    }, { passive: false });

    // --- drag-to-scroll мышью (только на устройствах с точным указателем) ---
    const isTouch = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    if (isTouch) return; // на тач — нативная прокрутка, ничего не перехватываем

    let drag = null; // { pointerId, startX, startY, startScrollLeft, startScrollTop, lastX, lastY, lastT, vx, vy, moved, axis }
    const DRAG_THRESHOLD = 5;

    const isInteractive = (target) => {
      // не начинать drag, если pointerdown на карточке/кнопке/ссылке/поле/меню
      if (!target) return false;
      return !!target.closest('a, button, input, textarea, select, label, .card, .card-move-btn, .move-menu, .move-menu-item, .chip-status, .seg, .tab-mini, .tab, .filter-chip, .demo-pill, .demo-select, .user-pick-item, [role="button"], [data-move], [data-setstatus], [data-to-status], [data-to-assignee]');
    };

    el.addEventListener('pointerdown', (e) => {
      // только левая кнопка мыши
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      // только если pointerdown не на интерактивном элементе (карточка/кнопка/поле)
      if (isInteractive(e.target)) return;
      // только если есть что прокручивать
      const canX = el.scrollWidth > el.clientWidth + 2;
      const canY = el.scrollHeight > el.clientHeight + 2;
      if (!canX && !canY) return;
      drag = {
        pointerId: e.pointerId,
        startX: e.clientX, startY: e.clientY,
        lastX: e.clientX, lastY: e.clientY, lastT: performance.now(),
        startScrollLeft: el.scrollLeft, startScrollTop: el.scrollTop,
        vx: 0, vy: 0, moved: false, axis: canX && !canY ? 'x' : (canY && !canX ? 'y' : null)
      };
      try { el.setPointerCapture(e.pointerId); } catch (err) {}
      // остановить инерцию если была
      if (el.__inertiaRAF) { cancelAnimationFrame(el.__inertiaRAF); el.__inertiaRAF = null; }
    });

    el.addEventListener('pointermove', (e) => {
      if (!drag || e.pointerId !== drag.pointerId) return;
      const dx = e.clientX - drag.startX;
      const dy = e.clientY - drag.startY;
      if (!drag.moved) {
        if (Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) return;
        drag.moved = true;
        el.classList.add('is-dragging');
        document.body.classList.add('dragging-scroll');
      }
      e.preventDefault();
      // определить ось, если не задана: выбираем преобладающую
      if (!drag.axis) {
        if (Math.abs(dx) > Math.abs(dy)) drag.axis = 'x'; else drag.axis = 'y';
      }
      // прокрутка: для доски axis=x, для колонки axis=y; если оба — двигаем обе
      if (drag.axis === 'x' || el.scrollWidth > el.clientWidth + 2) {
        el.scrollLeft = drag.startScrollLeft - dx;
      }
      if (drag.axis === 'y' || el.scrollHeight > el.clientHeight + 2) {
        el.scrollTop = drag.startScrollTop - dy;
      }
      // скорость для инерции
      const now = performance.now();
      const dt = Math.max(1, now - drag.lastT);
      drag.vx = (e.clientX - drag.lastX) / dt;
      drag.vy = (e.clientY - drag.lastY) / dt;
      drag.lastX = e.clientX; drag.lastY = e.clientY; drag.lastT = now;
    });

    const endDrag = (e) => {
      if (!drag || (e && e.pointerId !== drag.pointerId)) return;
      const wasMoving = drag.moved;
      el.classList.remove('is-dragging');
      document.body.classList.remove('dragging-scroll');
      if (el.releasePointerCapture) { try { el.releasePointerCapture(drag.pointerId); } catch (err) {} }
      // инерция: плавно затухает, если было движение и не reduced-motion
      if (wasMoving && !reducedMotion && (Math.abs(drag.vx) > 0.05 || Math.abs(drag.vy) > 0.05)) {
        startInertia(el, drag.vx, drag.vy);
      }
      drag = null;
    };
    el.addEventListener('pointerup', endDrag);
    el.addEventListener('pointercancel', endDrag);

    // потеря capture — тоже конец
    el.addEventListener('lostpointercapture', () => { if (drag) endDrag({ pointerId: drag.pointerId }); });
  }

  function startInertia(el, vx, vy) {
    const DECAY = 0.95;
    const STOP = 0.02;
    let lastT = performance.now();
    const step = () => {
      const now = performance.now();
      const dt = Math.max(1, now - lastT); lastT = now;
      el.scrollLeft -= vx * dt;
      el.scrollTop -= vy * dt;
      vx *= DECAY; vy *= DECAY;
      if (Math.abs(vx) < STOP && Math.abs(vy) < STOP) { el.__inertiaRAF = null; return; }
      el.__inertiaRAF = requestAnimationFrame(step);
    };
    if (el.__inertiaRAF) cancelAnimationFrame(el.__inertiaRAF);
    el.__inertiaRAF = requestAnimationFrame(step);
  }

  function initScrollHints(scope) {
    const sel = '.scroll-area, .board-scroll, .column-body, .modal-body, .notif-dropdown, .user-menu, .user-pick, .move-menu, .table-wrap, .admin-tabs';
    (scope || document).querySelectorAll(sel).forEach(setupScrollArea);
  }

  // ---------- Инициализация страницы ----------
  function initPage(page) {
    window.__currentPage = page;
    applyTheme(getTheme());
    const session = window.Store.getSession();
    buildHeader(page);
    initScrollHints(document);
    // footer
    const foot = document.getElementById('footer');
    if (foot) foot.innerHTML = '<div class="footer-inner"><span>Сигнал — система обратной связи сотрудников · ГК «Модус Трейд»</span><span>Демонстрационная версия. Данные хранятся локально в браузере.</span></div>';
  }
  function markReady() {
    const shell = document.querySelector('.app-shell');
    if (shell) shell.classList.add('is-ready');
  }

  // ---------- Экспорт ----------
  window.UI = {
    esc, normalizeSpaces, icon, ICONS,
    fmtDate, fmtDateTime, relTime, initials,
    toast, toastError, toastSuccess, confirmDialog,
    openModal, closeModal,
    clearError, setError, attachField, validateAll, makeErrorEl,
    buildHeader, initPage, initScrollHints, markReady,
    statusBadge, typeBadge, priorityBadge, priorityClass,
    ticketCard, canDrag, disableCardInteraction,
    emptyState, roleLabel
  };
})();
