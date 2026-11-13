// js/kanban.js — общий компонент Trello-доски с настройкой по роли.
// Перетаскивание: Pointer Events (мышь + touch + перо) + клавиатура + меню «Переместить».
(function () {
  'use strict';

  const S = window.Store;
  const UI = window.UI;

  const STATUS_COLS = S.STATUSES;
  const STATUS_REQUIRES = S.STATUS_REQUIRES_TEXT;
  const DRAG_THRESHOLD = 6; // px — порог отличия клика от драга
  const TOUCH_HOLD_MS = 250; // удержание пальцем до начала переноса
  const TOUCH_SLOP = 10;     // px — сдвиг пальца раньше удержания = обычная прокрутка

  function createKanban(container, opts) {
    opts = opts || {};
    const state = {
      container,
      mode: opts.mode || 'readonly',
      scope: opts.scope || 'all',
      grouping: 'status',
      view: 'board',
      compact: false,
      filters: { q: '', dept: '', category: '', type: '', priority: '', due: 'any' },
      tickets: [],
      filtered: [],
      onOpen: opts.onOpen || null,
      autoScrollTimer: null,
      autoScrollDx: 0,
      autoScrollDy: 0
    };

    // ---------- Драг-состояние (Pointer Events) ----------
    const drag = {
      active: false,      // pointerdown произошёл, ждём порога
      moving: false,      // превысили порог — драг идёт
      pointerId: null,
      id: null, ticket: null, cardEl: null,
      startX: 0, startY: 0,
      offsetX: 0, offsetY: 0,
      ghost: null,
      placeholder: null,
      fromStatus: null, fromAssignee: null,
      targetColBody: null,
      pageScrollY: 0,
      suppressedClick: false
    };
    // Клавиатурный grab
    let lastDragEndAt = 0;
    // клик, который браузер шлёт сразу после отпускания перетащенной карточки, — не «открыть обращение»
    function justDragged() { return performance.now() - lastDragEndAt < 400; }
    const kbd = { active: false, id: null, ticket: null, cardEl: null, colStatus: null, colAssignee: null, idx: 0 };

    function refresh(tickets) {
      if (tickets) state.tickets = tickets;
      applyFilters();
      render();
    }

    function applyFilters() {
      const f = state.filters;
      let list = state.tickets.slice();
      if (state.mode === 'own' && state.scope === 'assigned') {
        const u = S.getSession().user;
        list = list.filter(t => t.assignee === u);
      }
      if (f.q) {
        const q = f.q.toLowerCase();
        list = list.filter(t =>
          t.title.toLowerCase().includes(q) ||
          t.id.toLowerCase().includes(q) ||
          (t.text || '').toLowerCase().includes(q));
      }
      if (f.dept) list = list.filter(t => { const c = S.getCategory(t.category); return c && c.dept === f.dept; });
      if (f.category) list = list.filter(t => t.category === f.category);
      if (f.type) list = list.filter(t => t.type === f.type);
      if (f.priority) list = list.filter(t => t.priority === f.priority);
      if (f.due === 'overdue') list = list.filter(t => S.isOverdue(t));
      if (f.due === 'soon') list = list.filter(t => {
        if (S.FINAL_STATUSES.includes(t.status)) return false;
        const d = S.daysLeft(t); return d >= 0 && d <= 3;
      });
      state.filtered = list;
    }

    // Сохранение/восстановление прокрутки доски и колонок между перерисовками
    function saveScrollState() {
      const board = state.container.querySelector('.board-scroll');
      const boardScroll = board ? board.scrollLeft : 0;
      const winX = window.scrollX, winY = window.scrollY;
      const colScrolls = {};
      state.container.querySelectorAll('.column-body').forEach(c => {
        const key = c.getAttribute('data-status') || c.getAttribute('data-assignee') || '';
        if (key) colScrolls[key] = c.scrollTop;
      });
      return { boardScroll, colScrolls, winX, winY };
    }
    function applyScrollState(snap) {
      const board = state.container.querySelector('.board-scroll');
      if (board && snap.boardScroll != null) board.scrollLeft = snap.boardScroll;
      state.container.querySelectorAll('.column-body').forEach(c => {
        const key = c.getAttribute('data-status') || c.getAttribute('data-assignee') || '';
        if (key && snap.colScrolls && snap.colScrolls[key] != null) c.scrollTop = snap.colScrolls[key];
      });
      if (Math.abs(window.scrollY - snap.winY) > 1 || Math.abs(window.scrollX - snap.winX) > 1) window.scrollTo(snap.winX, snap.winY);
    }
    function restoreScrollState(snap) {
      if (!snap) return;
      applyScrollState(snap);
      // ещё раз после раскладки: модалка/шрифты могут поменять высоту страницы
      requestAnimationFrame(() => applyScrollState(snap));
    }

    function render() {
      applyFilters();
      // сохранить прокрутку до перерисовки
      const scrollSnap = saveScrollState();
      const compactClass = state.compact ? ' compact' : '';
      state.container.innerHTML = renderToolbar() + '<div class="kanban-body' + compactClass + '">' + (state.view === 'board' ? renderBoard() : renderTable()) + '</div>';
      bindToolbar();
      if (state.view === 'board') bindBoard(); else bindTable();
      restoreScrollState(scrollSnap);
      updateUndoButton();
    }

    function updateUndoButton() {
      const btn = state.container.querySelector('#kb-undo');
      if (btn) btn.disabled = !S.canUndo();
    }

    // ---------- Тулбар ----------
    function renderToolbar() {
      const cats = S.getCategories();
      const depts = S.getDepts();
      const total = state.tickets.length;
      const shown = state.filtered.length;
      let html = '<div class="kanban-toolbar">';
      html += '<div class="toolbar-search">' + UI.icon('search') + '<input type="search" id="kb-search" placeholder="Поиск по обращениям…" value="' + UI.esc(state.filters.q) + '" aria-label="Поиск"></div>';
      html += '<div class="toolbar-filters">';
      html += '<select id="kb-dept" aria-label="Подразделение"><option value="">Все подразделения</option>' +
        depts.map(d => '<option value="' + UI.esc(d) + '"' + (state.filters.dept === d ? ' selected' : '') + '>' + UI.esc(d) + '</option>').join('') + '</select>';
      html += '<select id="kb-category" aria-label="Категория"><option value="">Все категории</option>' +
        cats.map(c => '<option value="' + UI.esc(c.name) + '"' + (state.filters.category === c.name ? ' selected' : '') + '>' + UI.esc(c.name) + '</option>').join('') + '</select>';
      html += '<select id="kb-type" aria-label="Тип"><option value="">Все типы</option>' +
        ['Проблема', 'Предложение', 'Положительный отзыв'].map(t => '<option value="' + t + '"' + (state.filters.type === t ? ' selected' : '') + '>' + t + '</option>').join('') + '</select>';
      html += '<select id="kb-priority" aria-label="Приоритет"><option value="">Любой приоритет</option>' +
        ['Низкий', 'Средний', 'Высокий'].map(p => '<option value="' + p + '"' + (state.filters.priority === p ? ' selected' : '') + '>' + p + '</option>').join('') + '</select>';
      html += '<select id="kb-due" aria-label="Срок"><option value="any"' + (state.filters.due === 'any' ? ' selected' : '') + '>Любой срок</option>' +
        '<option value="overdue"' + (state.filters.due === 'overdue' ? ' selected' : '') + '>Просрочено</option>' +
        '<option value="soon"' + (state.filters.due === 'soon' ? ' selected' : '') + '>Ближайшие 3 дня</option></select>';
      html += '<button class="btn btn-ghost btn-sm" id="kb-reset">' + UI.icon('x') + 'Сбросить</button>';
      html += '</div>';
      html += '<div class="toolbar-meta">';
      html += '<span class="counter">Показано ' + shown + ' из ' + total + '</span>';
      if (state.mode === 'own') {
        html += '<div class="seg-toggle" role="tablist" aria-label="Область">';
        html += '<button class="seg' + (state.scope === 'assigned' ? ' active' : '') + '" data-scope="assigned">Назначенные мне</button>';
        html += '<button class="seg' + (state.scope === 'all' ? ' active' : '') + '" data-scope="all">Все обращения</button>';
        html += '</div>';
      }
      if (state.mode === 'admin') {
        html += '<div class="seg-toggle" role="tablist" aria-label="Группировка">';
        html += '<button class="seg' + (state.grouping === 'status' ? ' active' : '') + '" data-group="status">По статусам</button>';
        html += '<button class="seg' + (state.grouping === 'assignee' ? ' active' : '') + '" data-group="assignee">По ответственным</button>';
        html += '</div>';
      }
      html += '<div class="seg-toggle" role="tablist" aria-label="Вид">';
      html += '<button class="seg' + (state.view === 'board' ? ' active' : '') + '" data-view="board" aria-label="Доска">' + UI.icon('grid') + 'Доска</button>';
      html += '<button class="seg' + (state.view === 'table' ? ' active' : '') + '" data-view="table" aria-label="Таблица">' + UI.icon('list') + 'Таблица</button>';
      html += '</div>';
      html += '<button class="btn btn-ghost btn-sm' + (state.compact ? ' active' : '') + '" id="kb-compact" aria-pressed="' + state.compact + '" title="Компактный вид">' + UI.icon('list') + 'Компактно</button>';
      if (state.mode !== 'readonly') {
        html += '<button class="btn btn-ghost btn-sm" id="kb-undo" title="Отменить (Ctrl+Z)"' + (S.canUndo() ? '' : ' disabled') + '>' + UI.icon('refresh') + 'Отменить</button>';
      }
      html += '</div>';
      html += '</div>';
      return html;
    }

    function bindToolbar() {
      const search = state.container.querySelector('#kb-search');
      if (search) search.addEventListener('input', () => { state.filters.q = search.value.trim(); applyFilters(); rerenderBody(); updateCounter(); });
      const bindSel = (id, key) => {
        const el = state.container.querySelector('#kb-' + id);
        if (el) el.addEventListener('change', () => { state.filters[key] = el.value; applyFilters(); rerenderBody(); updateCounter(); });
      };
      bindSel('dept', 'dept'); bindSel('category', 'category'); bindSel('type', 'type'); bindSel('priority', 'priority'); bindSel('due', 'due');
      const reset = state.container.querySelector('#kb-reset');
      if (reset) reset.addEventListener('click', () => { state.filters = { q: '', dept: '', category: '', type: '', priority: '', due: 'any' }; render(); });
      state.container.querySelectorAll('[data-scope]').forEach(b => b.addEventListener('click', () => { state.scope = b.getAttribute('data-scope'); render(); }));
      state.container.querySelectorAll('[data-group]').forEach(b => b.addEventListener('click', () => { state.grouping = b.getAttribute('data-group'); render(); }));
      state.container.querySelectorAll('[data-view]').forEach(b => b.addEventListener('click', () => { state.view = b.getAttribute('data-view'); render(); }));
      const compact = state.container.querySelector('#kb-compact');
      if (compact) compact.addEventListener('click', () => { state.compact = !state.compact; render(); });
      const undoBtn = state.container.querySelector('#kb-undo');
      if (undoBtn) undoBtn.addEventListener('click', () => doUndo());
    }

    function updateCounter() {
      const c = state.container.querySelector('.counter');
      if (c) c.textContent = 'Показано ' + state.filtered.length + ' из ' + state.tickets.length;
    }
    function rerenderBody() {
      const body = state.container.querySelector('.kanban-body');
      if (!body) return;
      const snap = saveScrollState();
      body.innerHTML = state.view === 'board' ? renderBoard() : renderTable();
      if (state.view === 'board') bindBoard(); else bindTable();
      restoreScrollState(snap);
    }

    // ---------- Доска ----------
    function renderBoard() {
      if (state.grouping === 'assignee' && state.mode === 'admin') return renderAssigneeBoard();
      return renderStatusBoard();
    }
    function renderStatusBoard() {
      const byCol = {};
      STATUS_COLS.forEach(s => byCol[s] = []);
      for (const t of state.filtered) byCol[t.status].push(t);
      for (const s of STATUS_COLS) byCol[s].sort((a, b) => (a.order || 0) - (b.order || 0));
      let html = '<div class="board-scroll"><div class="board">';
      for (const s of STATUS_COLS) {
        const cards = byCol[s];
        html += '<div class="column" data-status="' + s + '">' +
          '<div class="column-head"><span class="column-dot status-' + S.STATUS_COLORS[s] + '"></span>' +
          '<span class="column-title">' + S.STATUS_LABELS[s] + '</span>' +
          '<span class="column-count">' + cards.length + '</span></div>' +
          '<div class="column-body" data-status="' + s + '">' +
            (cards.length === 0 ? '<div class="column-empty-hint">Пусто</div>' : cards.map(t => renderCard(t)).join('')) +
          '</div></div>';
      }
      html += '</div></div>';
      return html;
    }
    function renderAssigneeBoard() {
      const assignees = S.getAssigneeList();
      const byAssignee = { '': [] };
      assignees.forEach(a => byAssignee[a] = []);
      for (const t of state.filtered) { const key = t.assignee || ''; if (!byAssignee[key]) byAssignee[key] = []; byAssignee[key].push(t); }
      let html = '<div class="board-scroll"><div class="board board-assignees">';
      html += '<div class="column" data-assignee=""><div class="column-head"><span class="column-dot dot-queue"></span>' +
        '<span class="column-title">Не назначен</span><span class="column-count">' + byAssignee[''].length + '</span></div>' +
        '<div class="column-body" data-assignee="">' +
          (byAssignee[''].length === 0 ? '<div class="column-empty-hint">Пусто</div>' : byAssignee[''].map(t => renderCard(t)).join('')) +
        '</div></div>';
      for (const a of assignees) {
        const rec = S.getAssigneeRecord(a);
        const unavailable = rec && !rec.available;
        html += '<div class="column' + (unavailable ? ' column-unavail' : '') + '" data-assignee="' + UI.esc(a) + '">' +
          '<div class="column-head"><span class="avatar avatar-xs">' + UI.esc(UI.initials(a)) + '</span>' +
          '<span class="column-title">' + UI.esc(a) + '</span>' +
          (unavailable ? '<span class="badge badge-mute">недоступен</span>' : '') +
          '<span class="column-count">' + byAssignee[a].length + '</span></div>' +
          '<div class="column-body" data-assignee="' + UI.esc(a) + '">' +
            (byAssignee[a].length === 0 ? '<div class="column-empty-hint">Пусто</div>' : byAssignee[a].map(t => renderCard(t)).join('')) +
          '</div></div>';
      }
      html += '</div></div>';
      return html;
    }

    // ---------- Карточка ----------
    function renderCard(t) {
      const canDrag = UI.canDrag(state.mode, t);
      const overdue = S.isOverdue(t);
      const dl = S.daysLeft(t);
      let dueClass = 'due-normal', dueText = 'Срок: ' + UI.fmtDate(t.dueAt);
      if (overdue) { dueClass = 'due-overdue'; dueText = 'Просрочено'; }
      else if (dl <= 3) { dueClass = 'due-soon'; dueText = dl <= 0 ? 'Сегодня' : 'Осталось ' + dl + ' дн'; }
      if (S.FINAL_STATUSES.includes(t.status)) { dueClass = 'due-done'; dueText = 'Завершено'; }
      const commentCount = t.events.filter(e => e.type === 'comment' || e.type === 'reply').length;
      const attachCount = (t.attachments || []).length;
      const typeColor = S.TYPE_COLORS[t.type];
      const assigneeName = t.assignee || '';
      const avatarTitle = assigneeName || 'Не назначен';
      const compact = state.compact;
      const draggable = canDrag ? 'true' : 'false';

      // Кнопка меню перемещения (только если есть права)
      const moveMenu = canDrag ? '<button type="button" class="card-move-btn" data-move="' + UI.esc(t.id) + '" aria-label="Переместить обращение" title="Переместить">' + UI.icon('chevron') + '</button>' : '';

      return '<article class="card strip-' + typeColor + '" data-id="' + UI.esc(t.id) + '" tabindex="0" role="button" aria-label="Обращение ' + UI.esc(t.id) + ': ' + UI.esc(t.title) + (canDrag ? '. Пробел — взять для переноса.' : '') + '" data-draggable="' + draggable + '">' +
        '<div class="card-body">' +
          '<div class="card-head-row">' +
            '<h4 class="card-title">' + UI.esc(t.title) + '</h4>' +
            moveMenu +
          '</div>' +
          '<div class="card-badges">' +
            '<span class="badge badge-id">' + UI.esc(t.id) + '</span>' +
            '<span class="badge badge-priority-mini priority-' + UI.priorityClass(t.priority) + '" title="Приоритет: ' + UI.esc(t.priority) + '">' + UI.esc(t.priority[0]) + '</span>' +
            '<span class="badge badge-due ' + dueClass + '">' + UI.icon('clock') + '<span>' + UI.esc(dueText) + '</span></span>' +
            (compact ? '' :
              (commentCount > 0 ? '<span class="badge badge-meta" title="Комментарии">' + UI.icon('message') + UI.esc(commentCount) + '</span>' : '') +
              (attachCount > 0 ? '<span class="badge badge-meta" title="Вложения">' + UI.icon('paperclip') + UI.esc(attachCount) + '</span>' : '')
            ) +
          '</div>' +
          (compact ? '' : '<div class="card-footer">' +
            '<span class="card-category" title="' + UI.esc(t.category) + '">' + UI.esc(t.category) + '</span>' +
            (assigneeName ? '<span class="avatar avatar-xs" title="' + UI.esc(avatarTitle) + '" data-assignee="' + UI.esc(assigneeName) + '">' + UI.esc(UI.initials(assigneeName)) + '</span>' : '<span class="avatar avatar-xs unassigned" title="Не назначен">—</span>') +
          '</div>') +
        '</div>' +
      '</article>';
    }

    // ---------- Таблица ----------
    function renderTable() {
      const sort = state.tableSort || { key: 'createdAt', dir: 'desc' };
      let list = state.filtered.slice();
      list.sort((a, b) => {
        let va, vb;
        switch (sort.key) {
          case 'id': va = a.id; vb = b.id; break;
          case 'title': va = a.title; vb = b.title; break;
          case 'category': va = a.category; vb = b.category; break;
          case 'priority': va = S.PRIORITIES.indexOf(a.priority); vb = S.PRIORITIES.indexOf(b.priority); break;
          case 'status': va = S.STATUSES.indexOf(a.status); vb = S.STATUSES.indexOf(b.status); break;
          case 'dueAt': va = new Date(a.dueAt).getTime(); vb = new Date(b.dueAt).getTime(); break;
          default: va = new Date(a.createdAt).getTime(); vb = new Date(b.createdAt).getTime();
        }
        return sort.dir === 'asc' ? (va > vb ? 1 : va < vb ? -1 : 0) : (va < vb ? 1 : va > vb ? -1 : 0);
      });
      let html = '<div class="table-wrap"><table class="kb-table"><thead><tr>';
      const cols = [['id','ID'],['title','Заголовок'],['category','Категория'],['type','Тип'],['priority','Приоритет'],['status','Статус'],['dueAt','Срок']];
      for (const [k, label] of cols) {
        const active = sort.key === k;
        html += '<th><button class="th-sort' + (active ? ' active' : '') + '" data-sort="' + k + '">' + label + (active ? (sort.dir === 'asc' ? ' ↑' : ' ↓') : '') + '</button></th>';
      }
      html += '</tr></thead><tbody>';
      if (list.length === 0) html += '<tr><td colspan="7">Нет обращений</td></tr>';
      for (const t of list) {
        const od = S.isOverdue(t);
        html += '<tr class="kb-row' + (od ? ' row-overdue' : '') + '" data-id="' + UI.esc(t.id) + '" tabindex="0">' +
          '<td><span class="badge badge-id">' + UI.esc(t.id) + '</span></td>' +
          '<td class="cell-title">' + UI.esc(t.title) + '</td>' +
          '<td>' + UI.esc(t.category) + '</td>' +
          '<td>' + UI.typeBadge(t.type) + '</td>' +
          '<td>' + UI.priorityBadge(t.priority) + '</td>' +
          '<td>' + UI.statusBadge(t.status) + '</td>' +
          '<td class="cell-due' + (od ? ' due-overdue' : S.daysLeft(t) <= 3 && !S.FINAL_STATUSES.includes(t.status) ? ' due-soon' : '') + '">' + UI.fmtDate(t.dueAt) + (od ? ' (просрочено)' : '') + '</td>' +
        '</tr>';
      }
      html += '</tbody></table></div>';
      return html;
    }
    function bindTable() {
      state.container.querySelectorAll('[data-sort]').forEach(b => b.addEventListener('click', () => {
        const k = b.getAttribute('data-sort');
        const cur = state.tableSort || { key: 'createdAt', dir: 'desc' };
        state.tableSort = cur.key === k ? { key: k, dir: cur.dir === 'asc' ? 'desc' : 'asc' } : { key: k, dir: 'asc' };
        rerenderBody();
      }));
      state.container.querySelectorAll('.kb-row').forEach(r => { r.addEventListener('click', () => openTicket(r.getAttribute('data-id'))); r.addEventListener('keydown', (e) => { if (e.key === 'Enter') openTicket(r.getAttribute('data-id')); }); });
    }

    // ---------- Привязка доски: Pointer Events + клавиатура + меню ----------
    function bindBoard() {
      const cards = state.container.querySelectorAll('.card');
      cards.forEach(card => {
        const id = card.getAttribute('data-id');
        const t = S.getTicket(id);
        if (!t) return;
        // клик (отличается от драга по порогу движения)
        card.addEventListener('click', (e) => {
          // если клик по кнопке меню — не открываем обращение
          if (e.target.closest('.card-move-btn')) return;
          if (justDragged()) { e.preventDefault(); e.stopPropagation(); return; }
          openTicket(id);
        });
        // Pointer Events (только для перетаскиваемых карточек)
        if (UI.canDrag(state.mode, t)) {
          card.addEventListener('pointerdown', (e) => onPointerDown(e, card, t));
        }
        // клавиатура
        card.addEventListener('keydown', (e) => onCardKeydown(e, card, t));
      });
      // кнопки меню перемещения
      state.container.querySelectorAll('[data-move]').forEach(btn => btn.addEventListener('click', (e) => { e.stopPropagation(); openMoveMenu(btn); }));
      // инициализировать аккуратную прокрутку для колонок и доски
      if (window.UI && window.UI.initScrollHints) window.UI.initScrollHints(state.container);
      // глобальные pointer-обработчики (один раз)
      if (!state.pointerBound) {
        document.addEventListener('pointermove', onPointerMove, { passive: false });
        document.addEventListener('pointerup', onPointerUp, { passive: false });
        document.addEventListener('pointercancel', onPointerCancel);
        // пока карточка «взята» пальцем — страница не должна прокручиваться
        document.addEventListener('touchmove', (ev) => { if (drag.moving && ev.cancelable) ev.preventDefault(); }, { passive: false });
        document.addEventListener('contextmenu', (ev) => { if (drag.active && drag.pointerType === 'touch') ev.preventDefault(); });
        document.addEventListener('keydown', onDocKeydown);
        state.pointerBound = true;
      }
    }

    // ---------- Pointer Events: начало ----------
    function onPointerDown(e, card, t) {
      if (e.button != null && e.button !== 0) return; // только левая кнопка
      if (kbd.active) return;
      // не начинать драг, если pointerdown на кнопке меню или интерактивном элементе
      if (e.target.closest('.card-move-btn')) return;
      drag.active = true;
      drag.moving = false;
      drag.pointerId = e.pointerId;
      drag.id = t.id;
      drag.ticket = t;
      drag.cardEl = card;
      drag.startX = e.clientX;
      drag.startY = e.clientY;
      const rect = card.getBoundingClientRect();
      drag.offsetX = e.clientX - rect.left;
      drag.offsetY = e.clientY - rect.top;
      const col = card.closest('.column');
      drag.fromStatus = col ? col.getAttribute('data-status') : null;
      drag.fromAssignee = col ? col.getAttribute('data-assignee') : null;
      drag.targetColBody = null;
      drag.pointerType = e.pointerType || 'mouse';
      drag.lastX = e.clientX; drag.lastY = e.clientY;
      drag.armed = false;
      clearTimeout(drag.holdTimer);
      if (drag.pointerType === 'touch') {
        // Палец: короткое движение = прокрутка доски, а удержание ~250 мс = «взять» карточку
        drag.holdTimer = setTimeout(() => {
          if (!drag.active || drag.moving) return;
          drag.armed = true;
          startDrag({ clientX: drag.lastX, clientY: drag.lastY });
          if (navigator.vibrate) { try { navigator.vibrate(12); } catch (err) {} }
        }, TOUCH_HOLD_MS);
      } else {
        // захватываем pointer, чтобы получать move/up даже если курсор ушёл с элемента
        try { card.setPointerCapture(e.pointerId); } catch (err) {}
      }
    }
    function abortPendingTouch() {
      clearTimeout(drag.holdTimer); drag.holdTimer = null;
      drag.active = false; drag.armed = false; drag.pointerId = null;
      drag.id = null; drag.ticket = null; drag.cardEl = null;
    }

    function onPointerMove(e) {
      if (!drag.active || e.pointerId !== drag.pointerId) return;
      const dx = e.clientX - drag.startX;
      const dy = e.clientY - drag.startY;
      drag.lastX = e.clientX; drag.lastY = e.clientY;
      if (!drag.moving) {
        if (drag.pointerType === 'touch') {
          // не дождались удержания и палец поехал — отдаём жест браузеру (прокрутка)
          if (Math.abs(dx) > TOUCH_SLOP || Math.abs(dy) > TOUCH_SLOP) abortPendingTouch();
          return;
        }
        if (Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) return;
        startDrag(e);
      }
      e.preventDefault();
      // двигаем ghost
      if (drag.ghost) {
        drag.ghost.style.left = (e.clientX - drag.offsetX) + 'px';
        drag.ghost.style.top = (e.clientY - drag.offsetY) + 'px';
      }
      // найти колонку под курсором
      const colBody = findColumnBodyAt(e.clientX, e.clientY);
      highlightColumn(colBody);
      movePlaceholder(colBody, e.clientY);
      handleEdgeScroll(e.clientX, e.clientY);
    }

    function startDrag(e) {
      drag.moving = true;
      drag.suppressedClick = true; // подавить клик после драга
      document.body.classList.add('kb-dragging');
      if (drag.pointerType === 'touch') { try { drag.cardEl.setPointerCapture(drag.pointerId); } catch (err) {} }
      const card = drag.cardEl;
      // скрываем оригинал
      card.classList.add('dragging-source');
      card.setAttribute('aria-grabbed', 'true');
      // ghost
      const ghost = card.cloneNode(true);
      ghost.classList.add('drag-ghost');
      ghost.removeAttribute('data-id');
      ghost.style.position = 'fixed';
      ghost.style.left = (e.clientX - drag.offsetX) + 'px';
      ghost.style.top = (e.clientY - drag.offsetY) + 'px';
      ghost.style.width = drag.cardEl.getBoundingClientRect().width + 'px';
      ghost.style.pointerEvents = 'none';
      ghost.style.zIndex = '1000';
      document.body.appendChild(ghost);
      drag.ghost = ghost;
      // placeholder в исходной колонке (на место карточки)
      const ph = document.createElement('div');
      ph.className = 'drop-placeholder';
      ph.style.height = drag.cardEl.getBoundingClientRect().height + 'px';
      drag.placeholder = ph;
      const origColBody = drag.cardEl.closest('.column-body');
      if (origColBody) origColBody.insertBefore(ph, drag.cardEl);
      // запомним скролл страницы, чтобы вернуть после drop (защита от случайного уезда)
      drag.pageScrollY = window.scrollY;
      // объявление для скринридера
      announce('Взято обращение ' + drag.id + '. Переместите в колонку и отпустите.');
    }

    function onPointerUp(e) {
      if (!drag.active || e.pointerId !== drag.pointerId) return;
      if (drag.moving) {
        e.preventDefault();
        completeDrop(e);
      }
      cleanupDrag();
    }
    function onPointerCancel(e) {
      if (!drag.active || e.pointerId !== drag.pointerId) return;
      if (drag.moving) announce('Перенос отменён.');
      cleanupDrag();
    }

    function completeDrop(e) {
      const colBody = findColumnBodyAt(e.clientX, e.clientY);
      const col = colBody ? colBody.closest('.column') : null;
      const id = drag.id;
      const t = drag.ticket;
      if (!t || !col) { announce('Отпущено вне доски — возврат на место.'); return; }

      if (state.grouping === 'assignee' && state.mode === 'admin') {
        const newAssignee = col.getAttribute('data-assignee') || '';
        if (newAssignee === t.assignee) return;
        try {
          S.reassign(id, newAssignee, S.getSession().user);
          UI.toastSuccess('Обращение ' + id + ' передано: ' + (newAssignee || 'не назначен'));
        } catch (err) { UI.toastError(err.message); }
        rerenderAfterAction();
        return;
      }
      const newStatus = col.getAttribute('data-status');
      const session = S.getSession();
      if (!S.canEditStatus(session.role, session.user, t)) {
        UI.toastError('Менять статус может только назначенный ответственный');
        return;
      }
      // вычислить, перед какой карточкой вставить (по позиции курсора)
      const beforeCard = getDragAfterElement(colBody, e.clientY);
      const beforeId = beforeCard ? beforeCard.getAttribute('data-id') : null;
      if (newStatus === t.status) {
        // переупорядочивание внутри колонки
        try {
          S.moveTicketToColumn(id, newStatus, beforeId);
        } catch (err) { UI.toastError(err.message); }
        rerenderAfterAction();
        return;
      }
      if (STATUS_REQUIRES[newStatus]) {
        // открыть модалку с обязательным текстом; запоминаем позицию для вставки
        drag.pendingDrop = { id, newStatus, beforeId };
        promptStatusChange(t, newStatus);
        return;
      }
      try {
        S.moveTicketToColumn(id, newStatus, beforeId, { by: session.user, admin: session.role === 'admin' });
        UI.toastSuccess('Статус изменён: ' + S.STATUS_LABELS[newStatus]);
      } catch (err) { UI.toastError(err.message); }
      rerenderAfterAction();
    }

    function saveColumnOrder(status, colBody) {
      // устаревшая функция, оставлена для совместимости; использует moveTicketToColumn
      const ids = Array.from(colBody.querySelectorAll('.card:not(.dragging-source)')).map(c => c.getAttribute('data-id')).filter(Boolean);
      S.reorderInColumn(status, ids);
    }

    function cleanupDrag() {
      const wasMoving = drag.moving;
      clearTimeout(drag.holdTimer); drag.holdTimer = null; drag.armed = false;
      if (drag.cardEl) { drag.cardEl.classList.remove('dragging-source'); drag.cardEl.removeAttribute('aria-grabbed'); if (drag.cardEl.releasePointerCapture) { try { drag.cardEl.releasePointerCapture(drag.pointerId); } catch (e) {} } }
      if (drag.ghost) { drag.ghost.remove(); }
      document.querySelectorAll('.column').forEach(c => c.classList.remove('drop-target'));
      document.querySelectorAll('.drop-placeholder').forEach(p => p.remove());
      document.body.classList.remove('kb-dragging');
      stopAutoScroll();
      drag.active = false; drag.moving = false; drag.pointerId = null; drag.id = null; drag.ticket = null; drag.cardEl = null; drag.ghost = null; drag.placeholder = null; drag.targetColBody = null; drag.suppressedClick = false;
      if (wasMoving) lastDragEndAt = performance.now();
      updateUndoButton();
    }

    function findColumnBodyAt(x, y) {
      // временно скрываем ghost, чтобы elementFromPoint нашёл колонку
      const hadGhost = drag.ghost;
      if (hadGhost) hadGhost.style.display = 'none';
      const el = document.elementFromPoint(x, y);
      if (hadGhost) hadGhost.style.display = '';
      if (!el) return null;
      const col = el.closest('.column');
      return col ? col.querySelector('.column-body') : null;
    }
    function highlightColumn(colBody) {
      document.querySelectorAll('.column').forEach(c => c.classList.remove('drop-target'));
      if (colBody) colBody.closest('.column').classList.add('drop-target');
      drag.targetColBody = colBody;
    }
    function movePlaceholder(colBody, y) {
      if (!drag.placeholder) return;
      if (!colBody) { drag.placeholder.remove(); return; }
      const after = getDragAfterElement(colBody, y);
      const ph = drag.placeholder;
      if (after) colBody.insertBefore(ph, after); else colBody.appendChild(ph);
      // убрать empty-hint если есть
      const hint = colBody.querySelector('.column-empty-hint');
      if (hint && ph) hint.style.display = 'none';
    }
    function getDragAfterElement(container, y) {
      const cards = [...container.querySelectorAll('.card:not(.dragging-source)')];
      let closest = { offset: -Infinity, element: null };
      for (const card of cards) {
        const box = card.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) closest = { offset, element: card };
      }
      return closest.element;
    }

    function handleEdgeScroll(x, y) {
      const board = state.container.querySelector('.board-scroll');
      if (!board) return;
      const W = window.innerWidth, H = window.innerHeight;
      let dx = 0; // горизонталь — только доска (между колонками)
      if (x < 60) dx = -14; else if (x > W - 60) dx = 14;
      // вертикаль — НЕ прокручиваем страницу; прокручиваем колонку под курсором
      let dy = 0;
      if (drag.targetColBody) {
        const r = drag.targetColBody.getBoundingClientRect();
        const pad = 40;
        if (y < r.top + pad) dy = -14;
        else if (y > r.bottom - pad) dy = 14;
      }
      // страница целиком: у верхней/нижней кромки окна, когда курсор не над прокручиваемой колонкой
      let wy = 0;
      if (!dy) { if (y < 70) wy = -16; else if (y > H - 70) wy = 16; }
      state.autoScrollDx = dx; state.autoScrollDy = dy; state.autoScrollWy = wy;
      if (!dx && !dy && !wy) { stopAutoScroll(); return; }
      if (!state.autoScrollTimer) {
        state.autoScrollTimer = setInterval(() => {
          if (state.autoScrollDx) board.scrollBy(state.autoScrollDx, 0);
          if (state.autoScrollDy && drag.targetColBody) drag.targetColBody.scrollBy(0, state.autoScrollDy);
          if (state.autoScrollWy) window.scrollBy(0, state.autoScrollWy);
          // после прокрутки пересчитать место вставки под неподвижным пальцем/курсором
          if (drag.moving && drag.lastX != null) {
            const cb = findColumnBodyAt(drag.lastX, drag.lastY);
            highlightColumn(cb); movePlaceholder(cb, drag.lastY);
          }
        }, 16);
      }
    }
    function stopAutoScroll() { if (state.autoScrollTimer) { clearInterval(state.autoScrollTimer); state.autoScrollTimer = null; } }

    // ---------- Клавиатурный перенос ----------
    function onCardKeydown(e, card, t) {
      // если фокус в input/textarea — не перехватываем
      const tag = (e.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
      if (e.target.closest('.card-move-btn')) return;

      if (!kbd.active) {
        // Space — взять для переноса; Enter — открыть обращение
        if (e.key === ' ' && UI.canDrag(state.mode, t)) {
          e.preventDefault();
          startKbdGrab(card, t);
          return;
        }
        if (e.key === 'Enter') { e.preventDefault(); openTicket(t.id); return; }
        return;
      }
      // режим grab активен
      e.preventDefault();
      if (e.key === 'Escape') { cancelKbdGrab(); return; }
      if (e.key === ' ' || e.key === 'Enter') { completeKbdDrop(); return; }
      if (e.key === 'ArrowLeft') { moveKbdCursor(-1); return; }
      if (e.key === 'ArrowRight') { moveKbdCursor(1); return; }
      if (e.key === 'ArrowUp') { moveKbdVertical(-1); return; }
      if (e.key === 'ArrowDown') { moveKbdVertical(1); return; }
    }

    function startKbdGrab(card, t) {
      kbd.active = true;
      kbd.id = t.id; kbd.ticket = t; kbd.cardEl = card;
      const col = card.closest('.column');
      kbd.colStatus = col ? col.getAttribute('data-status') : null;
      kbd.colAssignee = col ? col.getAttribute('data-assignee') : null;
      // индекс в текущей колонке
      const colBody = col ? col.querySelector('.column-body') : null;
      const cards = colBody ? Array.from(colBody.querySelectorAll('.card')) : [];
      kbd.idx = cards.indexOf(card);
      card.classList.add('kbd-grabbed');
      card.setAttribute('aria-grabbed', 'true');
      showKbdPlaceholder();
      announce('Взято обращение ' + t.id + '. Стрелки — переместить, Пробел — положить, Esc — отмена.');
    }

    function kbdColumns() {
      if (state.grouping === 'assignee' && state.mode === 'admin') {
        return Array.from(state.container.querySelectorAll('.column[data-assignee]'));
      }
      return Array.from(state.container.querySelectorAll('.column[data-status]'));
    }
    function currentKbdColIndex() {
      const cols = kbdColumns();
      const key = state.grouping === 'assignee' && state.mode === 'admin' ? kbd.colAssignee : kbd.colStatus;
      return cols.findIndex(c => (state.grouping === 'assignee' && state.mode === 'admin' ? c.getAttribute('data-assignee') : c.getAttribute('data-status')) === key);
    }
    function showKbdPlaceholder() {
      document.querySelectorAll('.drop-placeholder').forEach(p => p.remove());
      const cols = kbdColumns();
      const i = currentKbdColIndex();
      if (i < 0) return;
      const col = cols[i];
      const colBody = col.querySelector('.column-body');
      const cards = Array.from(colBody.querySelectorAll('.card:not(.kbd-grabbed)'));
      const ph = document.createElement('div');
      ph.className = 'drop-placeholder kbd-placeholder';
      if (kbd.cardEl) ph.style.height = kbd.cardEl.getBoundingClientRect().height + 'px';
      if (kbd.idx >= cards.length) colBody.appendChild(ph); else colBody.insertBefore(ph, cards[kbd.idx]);
      col.classList.add('drop-target');
    }
    function moveKbdCursor(delta) {
      const cols = kbdColumns();
      let i = currentKbdColIndex();
      if (i < 0) i = 0;
      i = Math.max(0, Math.min(cols.length - 1, i + delta));
      if (state.grouping === 'assignee' && state.mode === 'admin') {
        kbd.colAssignee = cols[i].getAttribute('data-assignee');
      } else {
        kbd.colStatus = cols[i].getAttribute('data-status');
      }
      kbd.idx = 0;
      showKbdPlaceholder();
      announce('Колонка: ' + cols[i].querySelector('.column-title').textContent);
    }
    function moveKbdVertical(delta) {
      const cols = kbdColumns();
      const i = currentKbdColIndex();
      if (i < 0) return;
      const colBody = cols[i].querySelector('.column-body');
      const cards = Array.from(colBody.querySelectorAll('.card:not(.kbd-grabbed)'));
      kbd.idx = Math.max(0, Math.min(cards.length, kbd.idx + delta));
      showKbdPlaceholder();
    }
    function completeKbdDrop() {
      const t = kbd.ticket; if (!t) { cancelKbdGrab(); return; }
      const cols = kbdColumns();
      const i = currentKbdColIndex();
      const col = cols[i];
      if (state.grouping === 'assignee' && state.mode === 'admin') {
        const newAssignee = col.getAttribute('data-assignee') || '';
        if (newAssignee !== t.assignee) {
          try { S.reassign(t.id, newAssignee, S.getSession().user); UI.toastSuccess('Обращение ' + t.id + ' передано: ' + (newAssignee || 'не назначен')); } catch (e) { UI.toastError(e.message); }
        }
      } else {
        const newStatus = col.getAttribute('data-status');
        const session = S.getSession();
        if (S.canEditStatus(session.role, session.user, t)) {
          // место вставки: перед карточкой с индексом kbd.idx среди остальных карточек колонки
          const others = Array.from(col.querySelectorAll('.column-body .card:not(.kbd-grabbed)'));
          const beforeEl = others[kbd.idx] || null;
          const beforeId = beforeEl ? beforeEl.getAttribute('data-id') : null;
          if (newStatus === t.status) {
            try { S.moveTicketToColumn(t.id, newStatus, beforeId); } catch (e) { UI.toastError(e.message); }
          } else if (STATUS_REQUIRES[newStatus]) {
            drag.pendingDrop = { id: t.id, newStatus, beforeId };
            endKbdGrab(true); promptStatusChange(t, newStatus); return;
          } else {
            try { S.moveTicketToColumn(t.id, newStatus, beforeId, { by: session.user, admin: session.role === 'admin' }); UI.toastSuccess('Статус изменён: ' + S.STATUS_LABELS[newStatus]); } catch (e) { UI.toastError(e.message); }
          }
        } else {
          UI.toastError('Менять статус может только назначенный ответственный');
        }
      }
      endKbdGrab(true);
      rerenderAfterAction();
    }
    function cancelKbdGrab() { endKbdGrab(false); }
    function endKbdGrab(done) {
      if (kbd.cardEl) { kbd.cardEl.classList.remove('kbd-grabbed'); kbd.cardEl.removeAttribute('aria-grabbed'); }
      document.querySelectorAll('.drop-placeholder').forEach(p => p.remove());
      document.querySelectorAll('.column').forEach(c => c.classList.remove('drop-target'));
      if (!done && kbd.cardEl) kbd.cardEl.focus({ preventScroll: true });
      const id = kbd.id;
      kbd.active = false; kbd.id = null; kbd.ticket = null; kbd.cardEl = null;
      announce(done ? 'Обращение ' + id + ' перенесено.' : 'Перенос отменён.');
    }

    // ---------- Меню «Переместить» ----------
    function openMoveMenu(btn) {
      const id = btn.getAttribute('data-move');
      const t = S.getTicket(id); if (!t) return;
      // закрыть предыдущее меню
      document.querySelectorAll('.move-menu').forEach(m => m.remove());
      const menu = document.createElement('div');
      menu.className = 'move-menu';
      menu.setAttribute('role', 'menu');
      menu.setAttribute('aria-label', 'Переместить обращение ' + id);
      let html = '<div class="move-menu-title">Переместить ' + UI.esc(id) + '</div>';
      if (state.grouping === 'assignee' && state.mode === 'admin') {
        html += '<div class="move-menu-list">';
        const list = [''].concat(S.getAssigneeList());
        for (const a of list) {
          const sel = a === t.assignee;
          html += '<button class="move-menu-item' + (sel ? ' current' : '') + '" data-to-assignee="' + UI.esc(a) + '"' + (sel ? ' disabled' : '') + ' role="menuitem">' + (a ? UI.esc(a) : 'Не назначен') + (sel ? ' (текущий)' : '') + '</button>';
        }
        html += '</div>';
      } else {
        html += '<div class="move-menu-list">';
        for (const s of STATUS_COLS) {
          const sel = s === t.status;
          html += '<button class="move-menu-item' + (sel ? ' current' : '') + '" data-to-status="' + s + '"' + (sel ? ' disabled' : '') + ' role="menuitem">' + S.STATUS_LABELS[s] + (sel ? ' (текущий)' : '') + '</button>';
        }
        html += '</div>';
      }
      menu.innerHTML = html;
      document.body.appendChild(menu);
      const rect = btn.getBoundingClientRect();
      menu.style.position = 'fixed';
      // разместить над кнопкой, не выходя за viewport
      const menuW = 220, menuH = menu.offsetHeight || 300;
      let left = rect.right - menuW; if (left < 8) left = 8;
      let top = rect.bottom + 4;
      if (top + menuH > window.innerHeight - 8) top = rect.top - menuH - 4;
      menu.style.left = left + 'px'; menu.style.top = top + 'px';
      menu.addEventListener('click', (e) => e.stopPropagation());
      const close = () => { menu.remove(); document.removeEventListener('click', closeOutside); };
      const closeOutside = (e) => { if (!menu.contains(e.target)) close(); };
      setTimeout(() => document.addEventListener('click', closeOutside), 0);
      menu.querySelectorAll('[data-to-status]').forEach(b => b.addEventListener('click', () => {
        const ns = b.getAttribute('data-to-status'); close();
        if (ns === t.status) return;
        const session = S.getSession();
        if (!S.canEditStatus(session.role, session.user, t)) { UI.toastError('Менять статус может только назначенный ответственный'); return; }
        if (STATUS_REQUIRES[ns]) { promptStatusChange(t, ns); return; }
        try { S.changeStatus(t.id, ns, { by: session.user, admin: session.role === 'admin' }); UI.toastSuccess('Статус изменён: ' + S.STATUS_LABELS[ns]); } catch (e) { UI.toastError(e.message); }
        rerenderAfterAction();
      }));
      menu.querySelectorAll('[data-to-assignee]').forEach(b => b.addEventListener('click', () => {
        const na = b.getAttribute('data-to-assignee'); close();
        if (na === t.assignee) return;
        try { S.reassign(t.id, na, S.getSession().user); UI.toastSuccess('Обращение ' + t.id + ' передано: ' + (na || 'не назначен')); } catch (e) { UI.toastError(e.message); }
        rerenderAfterAction();
      }));
    }

    // ---------- Undo ----------
    function doUndo() {
      if (!S.canUndo()) { UI.toast('Нечего отменять'); return; }
      if (S.undo()) {
        UI.toast('Действие отменено');
        rerenderAfterAction();
      }
    }

    // ---------- Глобальные клавиши ----------
    function onDocKeydown(e) {
      // Ctrl/Cmd+Z — undo (если фокус не в поле ввода)
      const tag = (e.target.tagName || '').toLowerCase();
      const inField = tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !inField) {
        e.preventDefault();
        doUndo();
        return;
      }
      // Esc во время pointer-драга
      if (e.key === 'Escape' && drag.moving) {
        cleanupDrag();
        announce('Перенос отменён.');
      }
    }

    // ---------- aria-live регион ----------
    let liveEl = null;
    function announce(msg) {
      if (!liveEl) {
        liveEl = document.createElement('div');
        liveEl.setAttribute('aria-live', 'assertive');
        liveEl.setAttribute('aria-atomic', 'true');
        liveEl.className = 'sr-only';
        document.body.appendChild(liveEl);
      }
      liveEl.textContent = msg;
    }

    // ---------- Модалка смены статуса ----------
    function promptStatusChange(t, newStatus) {
      let fieldLabel = 'Комментарий', helper = '';
      if (newStatus === 'clarification') { fieldLabel = 'Вопрос автору'; helper = 'Автор получит уведомление и сможет ответить в карточке обращения.'; }
      if (newStatus === 'done') { fieldLabel = 'Решение'; helper = 'Опишите, что было реализовано. Это увидит автор в итогах.'; }
      if (newStatus === 'rejected') { fieldLabel = 'Причина отказа'; helper = 'Мотивируйте отказ — автор увидит это в итогах.'; }
      if (newStatus === 'closed') { fieldLabel = 'Итог закрытия'; helper = 'Зафиксируйте итог рассмотрения.'; }
      const session = S.getSession();
      const isAdmin = session.role === 'admin';
      const body = '<div class="form-row">' +
        '<label class="form-label" for="sc-text">' + UI.esc(fieldLabel) + '<span class="req">*</span></label>' +
        '<textarea id="sc-text" class="form-control" rows="4" maxlength="1000" placeholder="' + UI.esc(fieldLabel) + '…"></textarea>' +
        '<p class="field-error" id="sc-text-error" style="display:none" role="alert"></p>' +
        (helper ? '<p class="form-hint">' + UI.esc(helper) + '</p>' : '') + '</div>' +
        (newStatus === 'done' ? '<div class="form-row form-row-inline"><label class="check-line"><input type="checkbox" id="sc-public"><span>Показать в сводке улучшений (без имени автора)</span></label></div>' : '') +
        (isAdmin ? '<p class="form-hint"><span class="badge badge-admin">администратор</span> Смена статуса от имени администратора будет отмечена в ленте.</p>' : '');
      UI.openModal({
        title: 'Перенос в «' + S.STATUS_LABELS[newStatus] + '»: ' + t.id,
        body,
        footer: '<button class="btn btn-primary" id="sc-save">Сохранить и перенести</button><button class="btn btn-ghost" data-close="1">Отмена</button>',
        onClose: () => { drag.pendingDrop = null; },
        onMount: (dialog, close) => {
          const ta = dialog.querySelector('#sc-text');
          const err = dialog.querySelector('#sc-text-error');
          const save = dialog.querySelector('#sc-save');
          const pub = dialog.querySelector('#sc-public');
          ta.focus({ preventScroll: true });
          save.addEventListener('click', () => {
            const val = ta.value.trim();
            if (!val) { err.textContent = 'Поле обязательно для заполнения'; err.style.display = 'block'; ta.setAttribute('aria-invalid', 'true'); ta.focus({ preventScroll: true }); return; }
            if (val.length > 1000) { err.textContent = 'Не более 1000 символов'; err.style.display = 'block'; return; }
            try {
              // позиция вставки сохранена из drag.pendingDrop, если есть
              const beforeId = (drag.pendingDrop && drag.pendingDrop.id === t.id) ? drag.pendingDrop.beforeId : null;
              S.moveTicketToColumn(t.id, newStatus, beforeId, { text: val, public: pub ? pub.checked : false, by: session.user, admin: isAdmin });
              UI.toastSuccess('Статус изменён: ' + S.STATUS_LABELS[newStatus]);
              close(); rerenderAfterAction();
            } catch (err2) { UI.toastError(err2.message); }
          });
        }
      });
    }

    // ---------- Модалка обращения ----------
    function markTicketNotifsRead(user, ticketId) {
      // отметить все статические уведомления пользователя по этому обращению прочитанными
      const notifs = S.getNotifications(user).filter(n => n.ticketId === ticketId && !n.read);
      notifs.forEach(n => S.markNotificationRead(n.id));
      if (notifs.length) UI.buildHeader(window.__currentPage);
    }
    function openTicket(id) {
      const t = S.getTicket(id);
      if (!t) { UI.toastError('Обращение не найдено'); return; }
      const session = S.getSession();
      // отметить уведомления по этому обращению прочитанными
      markTicketNotifsRead(session.user, id);
      const isEmployee = session.role === 'employee';
      const isAuthor = t.author === session.user;
      const canEdit = S.canEditStatus(session.role, session.user, t);
      const canReassign = S.canReassign(session.role, session.user, t);
      const showAuthor = S.canSeeAuthor(session.role, session.user, t);
      const authorLabel = t.anon ? (isAuthor ? 'Вы (анонимно)' : 'Аноним') : (showAuthor ? t.author : 'Аноним');
      const events = t.events.filter(e => !(e.internal && isEmployee));
      let feedHtml = '';
      for (const e of events) feedHtml += renderEvent(e, isEmployee, authorLabel);
      const attachHtml = (t.attachments && t.attachments.length)
        ? '<div class="attach-list">' + t.attachments.map(a => '<div class="attach-item">' + UI.icon('paperclip') + '<div><div class="attach-name">' + UI.esc(a.name) + '</div><div class="attach-size">' + formatSize(a.size) + '</div></div></div>').join('') + '</div>'
        : '<p class="muted">Нет вложений</p>';
      let actionsHtml = '<div class="side-actions">';
      actionsHtml += '<div class="side-block"><div class="side-label">Ответственный</div><div class="side-value">' + (t.assignee ? UI.esc(t.assignee) : '<span class="muted">Не назначен</span>') + '</div></div>';
      actionsHtml += '<div class="side-block"><div class="side-label">Автор</div><div class="side-value">' + UI.esc(authorLabel) + (t.anon ? ' <span class="badge badge-mute">анонимно</span>' : '') + '</div></div>';
      actionsHtml += '<div class="side-block"><div class="side-label">Срок</div><div class="side-value ' + (S.isOverdue(t) ? 'due-overdue-text' : '') + '">' + UI.fmtDate(t.dueAt) + (S.isOverdue(t) ? ' (просрочено)' : '') + '</div></div>';
      actionsHtml += '<div class="side-block"><div class="side-label">Создано</div><div class="side-value">' + UI.fmtDateTime(t.createdAt) + '</div></div>';
      if (t.firstResponseAt) actionsHtml += '<div class="side-block"><div class="side-label">Первый ответ</div><div class="side-value">' + UI.fmtDateTime(t.firstResponseAt) + '</div></div>';
      if (t.closedAt) actionsHtml += '<div class="side-block"><div class="side-label">Закрыто</div><div class="side-value">' + UI.fmtDateTime(t.closedAt) + '</div></div>';
      if (canEdit && !S.FINAL_STATUSES.includes(t.status)) {
        actionsHtml += '<div class="side-block"><div class="side-label">Сменить статус</div><div class="status-actions">';
        for (const s of STATUS_COLS) { if (s === t.status) continue; actionsHtml += '<button class="chip-status status-' + S.STATUS_COLORS[s] + '" data-setstatus="' + s + '">' + S.STATUS_LABELS[s] + '</button>'; }
        actionsHtml += '</div></div>';
      }
      if (canReassign) {
        const opts = S.getAssigneeList().map(a => '<option value="' + UI.esc(a) + '"' + (a === t.assignee ? ' selected' : '') + '>' + UI.esc(a) + '</option>').join('');
        actionsHtml += '<div class="side-block"><div class="side-label">Передать</div><select class="form-control" id="ticket-reassign">' + opts + '</select></div>';
      }
      actionsHtml += '</div>';
      const leftHtml =
        '<div class="ticket-meta-top">' + UI.typeBadge(t.type) + UI.statusBadge(t.status) + UI.priorityBadge(t.priority) + '<span class="badge badge-id">' + UI.esc(t.id) + '</span></div>' +
        '<h2 class="ticket-title">' + UI.esc(t.title) + '</h2>' +
        '<div class="ticket-tags"><span class="tag">' + UI.icon('flag') + UI.esc(t.category) + '</span></div>' +
        '<div class="ticket-section"><div class="section-label">Описание</div><p class="section-text">' + UI.esc(t.text) + '</p></div>' +
        (t.solution ? '<div class="ticket-section"><div class="section-label">Предполагаемое решение</div><p class="section-text">' + UI.esc(t.solution) + '</p></div>' : '') +
        '<div class="ticket-section"><div class="section-label">Вложения</div>' + attachHtml + '</div>' +
        (t.result ? '<div class="ticket-section"><div class="section-label result-label">Итог рассмотрения</div><p class="section-text result-text">' + UI.esc(t.result) + '</p></div>' : '') +
        '<div class="ticket-section"><div class="section-label">Лента активности</div><div class="activity-feed">' + feedHtml + '</div></div>';
      let formHtml = '';
      if (isEmployee && isAuthor && t.status === 'clarification') {
        formHtml = '<div class="ticket-form reply-form"><div class="form-label">Ответ на уточнение<span class="req">*</span></div>' +
          '<textarea id="reply-text" class="form-control" rows="3" maxlength="1000" placeholder="Ваш ответ ответственному…"></textarea>' +
          '<p class="field-error" id="reply-error" style="display:none" role="alert"></p>' +
          '<button class="btn btn-primary" id="reply-send">' + UI.icon('send') + 'Ответить</button></div>';
      } else if (!isEmployee) {
        formHtml = '<div class="ticket-form comment-form">' +
          '<div class="form-row"><div class="tabs-mini" role="tablist"><button class="tab-mini active" data-tab="public">Комментарий автору</button><button class="tab-mini" data-tab="internal">Внутренняя заметка</button></div></div>' +
          '<textarea id="comment-text" class="form-control" rows="3" maxlength="1000" placeholder="Ваш комментарий…"></textarea>' +
          '<p class="field-error" id="comment-error" style="display:none" role="alert"></p>' +
          '<div class="form-actions"><button class="btn btn-primary" id="comment-send">' + UI.icon('send') + 'Отправить</button><label class="check-line"><input type="checkbox" id="comment-internal"><span>внутренняя (автор не увидит)</span></label></div></div>';
      }
      const body = '<div class="ticket-layout"><div class="ticket-main">' + leftHtml + formHtml + '</div><aside class="ticket-side">' + actionsHtml + '</aside></div>';
      UI.openModal({
        title: 'Обращение ' + t.id, size: 'lg', body,
        onMount: (dialog, close) => {
          window.__currentTicketId = id;
          dialog.querySelectorAll('[data-setstatus]').forEach(b => b.addEventListener('click', () => {
            const ns = b.getAttribute('data-setstatus');
            if (STATUS_REQUIRES[ns]) promptStatusChange(t, ns);
            else { try { S.changeStatus(id, ns, { by: session.user, admin: session.role === 'admin' }); UI.toastSuccess('Статус изменён: ' + S.STATUS_LABELS[ns]); close(); rerenderAfterAction(); } catch (e) { UI.toastError(e.message); } }
          }));
          const reassignSel = dialog.querySelector('#ticket-reassign');
          if (reassignSel) reassignSel.addEventListener('change', () => { const na = reassignSel.value; if (na && na !== t.assignee) { S.reassign(id, na, session.user); UI.toastSuccess('Обращение передано: ' + na); close(); rerenderAfterAction(); } });
          const replyBtn = dialog.querySelector('#reply-send');
          if (replyBtn) replyBtn.addEventListener('click', () => {
            const ta = dialog.querySelector('#reply-text'); const err = dialog.querySelector('#reply-error'); const v = ta.value.trim();
            if (!v) { err.textContent = 'Ответ не может быть пустым'; err.style.display = 'block'; ta.setAttribute('aria-invalid', 'true'); return; }
            if (v.length > 1000) { err.textContent = 'Не более 1000 символов'; err.style.display = 'block'; return; }
            try { S.addReply(id, v); UI.toastSuccess('Ответ отправлен, обращение возвращено на рассмотрение'); close(); rerenderAfterAction(); } catch (e) { UI.toastError(e.message); }
          });
          const cmtBtn = dialog.querySelector('#comment-send');
          if (cmtBtn) {
            const internalChk = dialog.querySelector('#comment-internal'); const ta = dialog.querySelector('#comment-text'); const err = dialog.querySelector('#comment-error');
            dialog.querySelectorAll('.tab-mini').forEach(tb => tb.addEventListener('click', () => {
              dialog.querySelectorAll('.tab-mini').forEach(x => x.classList.remove('active')); tb.classList.add('active');
              const mode = tb.getAttribute('data-tab'); if (internalChk) internalChk.checked = (mode === 'internal');
              ta.placeholder = mode === 'internal' ? 'Внутренняя заметка (автор не увидит)…' : 'Комментарий автору…';
            }));
            cmtBtn.addEventListener('click', () => {
              const v = ta.value.trim();
              if (!v) { err.textContent = 'Комментарий не может быть пустым'; err.style.display = 'block'; ta.setAttribute('aria-invalid', 'true'); return; }
              if (v.length > 1000) { err.textContent = 'Не более 1000 символов'; err.style.display = 'block'; return; }
              try { S.addComment(id, v, internalChk ? internalChk.checked : false, session.user); UI.toastSuccess(internalChk && internalChk.checked ? 'Внутренняя заметка добавлена' : 'Комментарий добавлен'); close(); rerenderAfterAction(); } catch (e) { UI.toastError(e.message); }
            });
          }
        },
        onClose: () => { window.__currentTicketId = null; }
      });
    }

    function renderEvent(e, isEmployee, authorLabel) {
      let iconCls = 'ev-info', text = '', title = '';
      if (e.type === 'created') { iconCls = 'ev-create'; title = 'Обращение создано'; text = e.text || ''; }
      else if (e.type === 'assign') { iconCls = 'ev-assign'; title = e.routedBy === 'manual' ? 'Передача обращения' : 'Назначение ответственного'; text = e.text || ('Назначен: ' + (e.to || '—')); if (e.by) text += ' · ' + e.by; }
      else if (e.type === 'status') { iconCls = 'ev-status'; title = 'Смена статуса: ' + S.STATUS_LABELS[e.from] + ' → ' + S.STATUS_LABELS[e.to]; text = e.text || ''; if (e.by) text += ' · ' + (e.admin ? e.by + ' (администратор)' : e.by); }
      else if (e.type === 'comment') { iconCls = e.internal ? 'ev-internal' : 'ev-comment'; title = e.internal ? 'Внутренняя заметка' : 'Комментарий'; text = e.text; if (e.by) text = e.by + ': ' + text; }
      else if (e.type === 'reply') { iconCls = 'ev-reply'; title = 'Ответ автора'; text = e.text; }
      return '<div class="event ' + iconCls + '"><div class="event-dot"></div><div class="event-body"><div class="event-title">' + UI.esc(title) + '</div>' + (text ? '<div class="event-text">' + UI.esc(text) + '</div>' : '') + '<div class="event-time">' + UI.esc(UI.fmtDateTime(e.at)) + '</div></div></div>';
    }

    function rerenderAfterAction() {
      if (state.mode === 'own' && state.scope === 'assigned') {
        const u = S.getSession().user; state.tickets = S.getTickets().filter(t => t.assignee === u);
      } else state.tickets = S.getTickets();
      if (state.mode === 'readonly') { const u = S.getSession().user; state.tickets = S.getUserTickets(u); }
      applyFilters(); render(); UI.buildHeader(window.__currentPage);
    }

    function formatSize(bytes) { if (!bytes) return ''; if (bytes < 1024) return bytes + ' Б'; if (bytes < 1024*1024) return Math.round(bytes/1024)+' КБ'; return (bytes/1024/1024).toFixed(1)+' МБ'; }

    return { state, refresh, openTicket, promptStatusChange, rerenderAfterAction, doUndo };
  }

  window.createKanban = createKanban;
})();
