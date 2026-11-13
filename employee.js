// js/employee.js — рабочее место сотрудника
(function () {
  'use strict';
  const S = window.Store;
  const UI = window.UI;
  const session = S.requireRole(['employee']);
  if (!session) return;

  UI.initPage('employee');
  window.__openTicket = openTicketById;

  const currentUser = session.user;
  let kanban = null;
  let myFilter = 'all';

  // ---------- Tabs ----------
  document.querySelectorAll('.emp-tab').forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.getAttribute('data-tab')));
  });
  function switchTab(name) {
    document.querySelectorAll('.emp-tab').forEach(t => t.classList.toggle('active', t.getAttribute('data-tab') === name));
    document.querySelectorAll('.emp-tab-pane').forEach(p => p.style.display = 'none');
    document.getElementById('tab-' + name).style.display = '';
    if (name === 'mine') renderMine();
    if (name === 'improved') renderImproved();
  }

  // ---------- Form ----------
  const formEl = document.getElementById('ticket-form');
  const errorBox = document.getElementById('form-error-box');
  let attachments = [];
  let submitting = false;
  let draftTimer = null;

  function buildForm() {
    const cats = S.getCategories();
    const catOpts = '<option value="">— выберите —</option>' + cats.map(c => '<option value="' + UI.esc(c.name) + '">' + UI.esc(c.name) + '</option>').join('');

    formEl.innerHTML =
      // Тип
      '<div class="form-row"><label class="form-label">Тип обращения<span class="req">*</span></label>' +
        '<div class="type-segments">' +
          '<button type="button" class="type-seg" data-type="Проблема"><span class="type-seg-title">Проблема</span><span class="type-seg-desc">Что-то не работает или мешает</span></button>' +
          '<button type="button" class="type-seg" data-type="Предложение"><span class="type-seg-title">Предложение</span><span class="type-seg-desc">Идея по улучшению процесса</span></button>' +
          '<button type="button" class="type-seg" data-type="Положительный отзыв"><span class="type-seg-title">Положительный отзыв</span><span class="type-seg-desc">Что-то работает хорошо</span></button>' +
        '</div><p class="field-error" id="err-type" style="display:none" role="alert"></p></div>' +

      // Категория
      '<div class="form-row"><label class="form-label" for="f-category">Категория<span class="req">*</span></label>' +
        '<select id="f-category" class="form-control" aria-describedby="err-category">' + catOpts + '</select>' +
        '<p class="field-error" id="err-category" style="display:none" role="alert"></p>' +
        '<div id="route-badge" style="margin-top:8px"></div></div>' +

      // Заголовок
      '<div class="form-row"><label class="form-label" for="f-title">Заголовок<span class="req">*</span></label>' +
        '<input id="f-title" class="form-control" type="text" maxlength="100" autocomplete="off" placeholder="Кратко опишите суть (10–100 символов)">' +
        '<div class="field-counter" id="cnt-title">0/100</div>' +
        '<p class="field-error" id="err-title" style="display:none" role="alert"></p>' +
        '<div id="dup-hint" style="display:none"></div></div>' +

      // Описание
      '<div class="form-row"><label class="form-label" for="f-text">Описание<span class="req">*</span></label>' +
        '<textarea id="f-text" class="form-control" rows="5" maxlength="2000" placeholder="Опишите подробно: что происходит, на каком этапе, что не хватает (30–2000 символов)"></textarea>' +
        '<div class="field-counter" id="cnt-text">0/2000</div>' +
        '<p class="field-error" id="err-text" style="display:none" role="alert"></p></div>' +

      // Предполагаемое решение
      '<div class="form-row"><label class="form-label" for="f-solution">Предполагаемое решение <span class="muted">(необязательно)</span></label>' +
        '<textarea id="f-solution" class="form-control" rows="3" maxlength="1000" placeholder="Как вы предлагаете решить?"></textarea>' +
        '<div class="field-counter" id="cnt-solution">0/1000</div></div>' +

      // Приоритет
      '<div class="form-row"><label class="form-label">Важность</label>' +
        '<div class="priority-radio">' +
          '<label><input type="radio" name="priority" value="Низкий"><span>Низкий</span></label>' +
          '<label><input type="radio" name="priority" value="Средний" checked><span>Средний</span></label>' +
          '<label><input type="radio" name="priority" value="Высокий"><span>Высокий</span></label>' +
        '</div></div>' +

      // Вложения
      '<div class="form-row"><label class="form-label">Вложения <span class="muted">(до 3 файлов, каждый до 2 МБ: pdf, png, jpg, jpeg, docx, xlsx)</span></label>' +
        '<label class="file-pill" for="f-files">' +
          '<span class="file-pill-icon">' + UI.icon('paperclip') + '</span>' +
          '<span class="file-pill-text">Выбрать файлы…</span>' +
          '<input id="f-files" type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.docx,.xlsx" aria-label="Выбрать файлы вложений">' +
        '</label>' +
        '<div id="attach-list" style="margin-top:8px"></div></div>' +

      // Анонимно
      '<div class="form-row"><label class="check-line"><input type="checkbox" id="f-anon"><span><strong>Анонимно</strong> · Ответственный не увидит ваше имя, но сможет задать вопрос здесь, и вы получите уведомление. Анонимность не влияет на рассмотрение.</span></label></div>' +

      // Подтверждение
      '<div class="form-row"><label class="check-line"><input type="checkbox" id="f-confirm"><span>Я не указываю коммерческие условия клиентов и персональные данные<span class="req">*</span></span></label>' +
        '<p class="field-error" id="err-confirm" style="display:none" role="alert"></p></div>' +

      // Черновик + кнопки
      '<div class="form-row" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px">' +
        '<span class="draft-hint" id="draft-hint">Черновик не начат</span>' +
        '<div class="form-row-inline" style="margin:0;gap:8px"><button type="button" class="btn btn-ghost" id="btn-clear-draft">Очистить черновик</button>' +
        '<button type="submit" class="btn btn-primary" id="btn-submit">Отправить обращение</button></div>' +
      '</div>';

    // Type segments
    let chosenType = '';
    formEl.querySelectorAll('.type-seg').forEach(seg => {
      seg.addEventListener('click', () => {
        formEl.querySelectorAll('.type-seg').forEach(s => s.classList.remove('selected'));
        seg.classList.add('selected');
        chosenType = seg.getAttribute('data-type');
        document.getElementById('err-type').style.display = 'none';
        saveDraft();
      });
    });

    // Category
    const catSel = document.getElementById('f-category');
    catSel.addEventListener('change', () => { updateRouteBadge(); validateField(catSel); saveDraft(); });

    // Title
    const titleEl = document.getElementById('f-title');
    const titleCnt = document.getElementById('cnt-title');
    titleEl.addEventListener('input', () => {
      const v = titleEl.value;
      titleCnt.textContent = v.length + '/100';
      titleCnt.className = 'field-counter' + (v.length > 100 ? ' over' : v.length >= 90 ? ' warn' : '');
      checkDuplicate(v);
    });
    titleEl.addEventListener('blur', () => validateField(titleEl));

    // Description
    const textEl = document.getElementById('f-text');
    const textCnt = document.getElementById('cnt-text');
    textEl.addEventListener('input', () => {
      const v = textEl.value;
      textCnt.textContent = v.length + '/2000';
      textCnt.className = 'field-counter' + (v.length > 2000 ? ' over' : v.length >= 1800 ? ' warn' : '');
    });
    textEl.addEventListener('blur', () => validateField(textEl));

    // Solution
    const solEl = document.getElementById('f-solution');
    const solCnt = document.getElementById('cnt-solution');
    solEl.addEventListener('input', () => {
      solCnt.textContent = solEl.value.length + '/1000';
      solCnt.className = 'field-counter' + (solEl.value.length > 1000 ? ' over' : '');
      saveDraft();
    });

    // Files
    document.getElementById('f-files').addEventListener('change', (e) => handleFiles(e.target.files));

    // Anon
    document.getElementById('f-anon').addEventListener('change', saveDraft);
    // Priority
    formEl.querySelectorAll('input[name="priority"]').forEach(r => r.addEventListener('change', saveDraft));
    // Confirm
    document.getElementById('f-confirm').addEventListener('change', () => { document.getElementById('err-confirm').style.display = 'none'; });

    // Clear draft
    document.getElementById('btn-clear-draft').addEventListener('click', () => {
      UI.confirmDialog('Очистить черновик? Введённые данные будут потеряны.', () => {
        clearDraftData();
        buildForm();
      }, { title: 'Очистить черновик', confirmText: 'Очистить' });
    });

    // Submit
    formEl.addEventListener('submit', (e) => { e.preventDefault(); onSubmit(); });

    restoreDraft();
  }

  function updateRouteBadge() {
    const cat = document.getElementById('f-category').value;
    const badge = document.getElementById('route-badge');
    if (!cat) { badge.innerHTML = ''; return; }
    const route = S.routeByCategory(cat);
    const sla = S.slaDays(currentPriority());
    if (route.assignee) {
      const reasonTxt = route.routedBy === 'fallback'
        ? 'Основной недоступен — назначен резервный'
        : 'Назначен основной ответственный по категории';
      badge.innerHTML = '<div class="route-badge' + (route.routedBy === 'none' ? ' route-queue' : '') + '">' +
        UI.icon('send') + '<span>Обращение получит: <strong>' + UI.esc(route.assignee) + '</strong> (' + UI.esc(reasonTxt) + ') · Первый ответ в течение ' + sla + ' дн.</span></div>';
    } else {
      badge.innerHTML = '<div class="route-badge route-queue">' + UI.icon('alert') +
        '<span>Нет доступного ответственного — обращение попадёт в очередь администратора. Первый ответ в течение ' + sla + ' дн. по SLA.</span></div>';
    }
  }
  function currentPriority() {
    const checked = formEl.querySelector('input[name="priority"]:checked');
    return checked ? checked.value : 'Средний';
  }

  function checkDuplicate(title) {
    const hint = document.getElementById('dup-hint');
    const v = UI.normalizeSpaces(title);
    if (v.length < 5) { hint.style.display = 'none'; return; }
    const sim = S.findSimilar(v, currentUser);
    if (sim) {
      hint.style.display = 'block';
      hint.className = 'dup-hint';
      hint.innerHTML = UI.icon('alert') + '<span>Похожее обращение уже есть: <a href="#" data-dup="' + UI.esc(sim.id) + '">' + UI.esc(sim.id) + '</a> — «' + UI.esc(sim.title) + '»</span>';
      hint.querySelector('[data-dup]').addEventListener('click', (e) => { e.preventDefault(); openTicketById(sim.id); });
    } else {
      hint.style.display = 'none';
    }
  }

  function handleFiles(fileList) {
    const allowed = ['pdf', 'png', 'jpg', 'jpeg', 'docx', 'xlsx'];
    const max = 2 * 1024 * 1024;
    const newFiles = Array.from(fileList);
    for (const f of newFiles) {
      const ext = (f.name.split('.').pop() || '').toLowerCase();
      if (!allowed.includes(ext)) { UI.toastError('Формат не поддерживается: ' + f.name); continue; }
      if (f.size > max) { UI.toastError('Файл больше 2 МБ: ' + f.name); continue; }
      if (attachments.length >= 3) { UI.toastError('Можно прикрепить не более 3 файлов'); break; }
      attachments.push({ name: f.name, size: f.size });
    }
    document.getElementById('f-files').value = '';
    renderAttachList();
  }
  function renderAttachList() {
    const el = document.getElementById('attach-list');
    if (attachments.length === 0) { el.innerHTML = ''; return; }
    el.innerHTML = attachments.map((a, i) =>
      '<div class="attach-item">' + UI.icon('paperclip') + '<div><div class="attach-name">' + UI.esc(a.name) + '</div><div class="attach-size">' + formatSize(a.size) + '</div></div>' +
        '<button type="button" class="attach-remove" data-rm="' + i + '" aria-label="Удалить">' + UI.icon('trash') + '</button></div>'
    ).join('');
    el.querySelectorAll('[data-rm]').forEach(b => b.addEventListener('click', () => {
      attachments.splice(parseInt(b.getAttribute('data-rm'), 10), 1);
      renderAttachList();
    }));
  }
  function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' Б';
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' КБ';
    return (bytes / 1024 / 1024).toFixed(1) + ' МБ';
  }

  // ---------- Validation ----------
  function getChosenType() {
    const seg = formEl.querySelector('.type-seg.selected');
    return seg ? seg.getAttribute('data-type') : '';
  }

  function validateTitle() {
    const el = document.getElementById('f-title');
    const v = UI.normalizeSpaces(el.value);
    if (v.length === 0) return 'Заполните заголовок';
    if (v.length < 10) return 'Заголовок слишком короткий (минимум 10 символов)';
    if (v.length > 100) return 'Заголовок слишком длинный (максимум 100 символов)';
    if (/^[\d\s\p{P}\p{S}]+$/u.test(v)) return 'Заголовок не может состоять только из цифр и знаков';
    return null;
  }
  function validateText() {
    const el = document.getElementById('f-text');
    const v = (el.value || '').trim();
    if (v.length === 0) return 'Заполните описание';
    if (v.length < 30) return 'Описание слишком короткое (минимум 30 символов)';
    if (v.length > 2000) return 'Описание слишком длинное (максимум 2000 символов)';
    return null;
  }
  function validateCategory() {
    const el = document.getElementById('f-category');
    if (!el.value) return 'Выберите категорию';
    return null;
  }
  function validateType() {
    if (!getChosenType()) return 'Выберите тип обращения';
    return null;
  }
  function validateConfirm() {
    if (!document.getElementById('f-confirm').checked) return 'Подтвердите, что не указываете коммерческие условия и персональные данные';
    return null;
  }

  function showFieldError(inputId, msg) {
    const el = document.getElementById(inputId);
    if (!el) return;
    el.classList.add('invalid');
    el.setAttribute('aria-invalid', 'true');
    const errId = 'err-' + inputId.replace('f-', '');
    const err = document.getElementById(errId) || el.parentElement.querySelector('.field-error');
    if (err) { err.textContent = msg; err.style.display = 'block'; err.setAttribute('role', 'alert'); }
    el.setAttribute('aria-describedby', errId);
  }
  function clearFieldError(inputId) {
    const el = document.getElementById(inputId);
    if (!el) return;
    el.classList.remove('invalid');
    el.removeAttribute('aria-invalid');
    const errId = 'err-' + inputId.replace('f-', '');
    const err = document.getElementById(errId) || el.parentElement.querySelector('.field-error');
    if (err) { err.textContent = ''; err.style.display = 'none'; }
  }
  function validateField(el) {
    const id = el.id;
    let err = null;
    if (id === 'f-title') err = validateTitle();
    else if (id === 'f-text') err = validateText();
    else if (id === 'f-category') err = validateCategory();
    if (err) showFieldError(id, err); else clearFieldError(id);
    return !err;
  }

  function onSubmit() {
    if (submitting) return;
    errorBox.style.display = 'none';
    const checks = [
      { field: 'type', check: validateType, focus: () => formEl.querySelector('.type-seg').focus(), label: 'Тип обращения' },
      { field: 'category', check: validateCategory, focus: () => document.getElementById('f-category').focus(), label: 'Категория' },
      { field: 'title', check: validateTitle, focus: () => document.getElementById('f-title').focus(), label: 'Заголовок' },
      { field: 'text', check: validateText, focus: () => document.getElementById('f-text').focus(), label: 'Описание' },
      { field: 'confirm', check: validateConfirm, focus: () => document.getElementById('f-confirm').focus(), label: 'Подтверждение' }
    ];
    const errors = [];
    for (const c of checks) {
      const e = c.check();
      if (e) {
        errors.push({ msg: e, label: c.label, focus: c.focus, field: c.field });
        if (c.field === 'type') { document.getElementById('err-type').textContent = e; document.getElementById('err-type').style.display = 'block'; }
        if (c.field === 'category') showFieldError('f-category', e);
        if (c.field === 'title') showFieldError('f-title', e);
        if (c.field === 'text') showFieldError('f-text', e);
        if (c.field === 'confirm') { document.getElementById('err-confirm').textContent = e; document.getElementById('err-confirm').style.display = 'block'; }
      } else {
        if (c.field === 'type') document.getElementById('err-type').style.display = 'none';
        if (c.field === 'category') clearFieldError('f-category');
        if (c.field === 'title') clearFieldError('f-title');
        if (c.field === 'text') clearFieldError('f-text');
        if (c.field === 'confirm') document.getElementById('err-confirm').style.display = 'none';
      }
    }
    if (errors.length) {
      errorBox.innerHTML = '<p>Проверьте поля:</p><ul>' + errors.map(e =>
        '<li><a href="#" data-err="' + e.field + '">' + UI.esc(e.msg) + '</a></li>').join('') + '</ul>';
      errorBox.style.display = 'block';
      errorBox.querySelectorAll('[data-err]').forEach(a => a.addEventListener('click', (ev) => {
        ev.preventDefault();
        const f = checks.find(c => c.field === a.getAttribute('data-err'));
        if (f) { f.focus(); }
      }));
      errors[0].focus();
      return;
    }
    // отправка
    submitting = true;
    const btn = document.getElementById('btn-submit');
    btn.disabled = true;
    btn.textContent = 'Отправка…';

    setTimeout(() => {
      const data = {
        type: getChosenType(),
        category: document.getElementById('f-category').value,
        title: UI.normalizeSpaces(document.getElementById('f-title').value),
        text: document.getElementById('f-text').value.trim(),
        solution: document.getElementById('f-solution').value.trim(),
        priority: currentPriority(),
        author: currentUser,
        anon: document.getElementById('f-anon').checked,
        attachments: attachments.slice()
      };
      try {
        const ticket = S.createTicket(data);
        clearDraftData();
        UI.toastSuccess('Обращение ' + ticket.id + ' зарегистрировано и направлено: ' + (ticket.assignee || 'очередь администратора'));
        // очистка формы
        attachments = [];
        buildForm();
        // подсветка карточки — переключаемся на «Мои обращения»
        switchTab('mine');
        setTimeout(() => {
          const card = document.querySelector('[data-id="' + ticket.id + '"]');
          if (card) { card.classList.add('highlight'); card.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
        }, 200);
      } catch (e) {
        UI.toastError(e.message || 'Не удалось создать обращение');
      } finally {
        submitting = false;
        btn.disabled = false;
        btn.textContent = 'Отправить обращение';
      }
    }, 300);
  }

  // ---------- Draft ----------
  function saveDraft() {
    if (draftTimer) clearTimeout(draftTimer);
    draftTimer = setTimeout(() => {
      const draft = {
        type: getChosenType(),
        category: document.getElementById('f-category').value,
        title: document.getElementById('f-title').value,
        text: document.getElementById('f-text').value,
        solution: document.getElementById('f-solution').value,
        priority: currentPriority(),
        anon: document.getElementById('f-anon').checked,
        attachments: attachments.slice(),
        at: Date.now()
      };
      S.saveDraft(draft);
      const hint = document.getElementById('draft-hint');
      if (hint) hint.textContent = 'Черновик сохранён · ' + new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    }, 600);
  }
  function restoreDraft() {
    const d = S.getDraft();
    if (!d) return;
    if (d.type) {
      const seg = formEl.querySelector('.type-seg[data-type="' + d.type + '"]');
      if (seg) seg.classList.add('selected');
    }
    if (d.category) document.getElementById('f-category').value = d.category;
    if (d.title) document.getElementById('f-title').value = d.title;
    if (d.text) document.getElementById('f-text').value = d.text;
    if (d.solution) document.getElementById('f-solution').value = d.solution;
    if (d.priority) {
      const r = formEl.querySelector('input[name="priority"][value="' + d.priority + '"]');
      if (r) r.checked = true;
    }
    if (d.anon) document.getElementById('f-anon').checked = true;
    if (d.attachments) attachments = d.attachments.slice();
    // счётчики
    const tEl = document.getElementById('f-title');
    if (tEl) { tEl.dispatchEvent(new Event('input')); }
    const txEl = document.getElementById('f-text');
    if (txEl) { txEl.dispatchEvent(new Event('input')); }
    const sEl = document.getElementById('f-solution');
    if (sEl) { sEl.dispatchEvent(new Event('input')); }
    updateRouteBadge();
    renderAttachList();
    const hint = document.getElementById('draft-hint');
    if (hint && d.at) hint.textContent = 'Черновик восстановлен · ' + new Date(d.at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  }
  function clearDraftData() {
    S.clearDraft();
    attachments = [];
    const hint = document.getElementById('draft-hint');
    if (hint) hint.textContent = 'Черновик не начат';
  }

  // ---------- My appeals ----------
  function renderMine() {
    const filters = [
      { id: 'all', label: 'Все' },
      { id: 'clarification', label: 'Нужно уточнение' },
      { id: 'progress', label: 'В процессе' },
      { id: 'done', label: 'Завершённые' }
    ];
    document.getElementById('my-filters').innerHTML = filters.map(f =>
      '<button class="filter-chip ' + (myFilter === f.id ? 'active' : '') + '" data-filter="' + f.id + '">' + f.label + '</button>'
    ).join('');
    document.querySelectorAll('[data-filter]').forEach(b => b.addEventListener('click', () => { myFilter = b.getAttribute('data-filter'); renderMine(); }));

    let tickets = S.getUserTickets(currentUser);
    if (myFilter === 'clarification') tickets = tickets.filter(t => t.status === 'clarification');
    else if (myFilter === 'progress') tickets = tickets.filter(t => ['new', 'review', 'clarification', 'in_progress'].includes(t.status));
    else if (myFilter === 'done') tickets = tickets.filter(t => ['done', 'rejected', 'closed'].includes(t.status));

    // доска readonly
    const boardEl = document.getElementById('my-board');
    if (!kanban) {
      kanban = window.createKanban(boardEl, { mode: 'readonly', scope: 'all' });
    }
    kanban.refresh(tickets);

    // список
    const listEl = document.getElementById('my-list');
    if (tickets.length === 0) {
      listEl.innerHTML = '<div class="empty-state"><p>У вас пока нет обращений в этом разделе.</p><span>Подайте обращение на вкладке «Подать обращение».</span></div>';
    } else {
      listEl.innerHTML = tickets.map(t => {
        const od = S.isOverdue(t);
        return '<div class="my-list-item" data-id="' + UI.esc(t.id) + '" tabindex="0">' +
          '<div class="mli-main"><div class="mli-title">' + UI.esc(t.title) + '</div>' +
          '<div class="mli-meta">' + UI.statusBadge(t.status) + ' · ' + UI.typeBadge(t.type) + ' · ' + UI.esc(t.category) + ' · ' + UI.fmtDate(t.createdAt) +
          (od ? ' · <span class="due-overdue">просрочено</span>' : '') + '</div></div>' +
          '<div>' + UI.priorityBadge(t.priority) + '</div>' +
        '</div>';
      }).join('');
      listEl.querySelectorAll('.my-list-item').forEach(item => {
        item.addEventListener('click', () => openTicketById(item.getAttribute('data-id')));
        item.addEventListener('keydown', (e) => { if (e.key === 'Enter') openTicketById(item.getAttribute('data-id')); });
      });
    }
  }

  // ---------- Improved ----------
  function renderImproved() {
    const list = S.getTickets().filter(t => t.status === 'done' && t.public);
    const el = document.getElementById('improved-list');
    if (list.length === 0) {
      el.innerHTML = '<div class="empty-state"><p>Пока нет публичных реализованных улучшений.</p><span>Когда ответственные реализуют предложения, они появятся здесь.</span></div>';
      return;
    }
    el.innerHTML = list.map(t =>
      '<div class="improved-item" data-id="' + UI.esc(t.id) + '" tabindex="0">' +
        '<h4>' + UI.esc(t.title) + '</h4>' +
        '<p>' + UI.esc(t.result || t.text) + '</p>' +
        '<div class="mli-meta" style="margin-top:6px">' + UI.esc(t.category) + ' · ' + UI.fmtDate(t.closedAt) + '</div>' +
      '</div>'
    ).join('');
    el.querySelectorAll('.improved-item').forEach(item => {
      item.addEventListener('click', () => openTicketById(item.getAttribute('data-id')));
      item.addEventListener('keydown', (e) => { if (e.key === 'Enter') openTicketById(item.getAttribute('data-id')); });
    });
  }

  // ---------- Open ticket ----------
  function openTicketById(id) {
    const t = S.getTicket(id);
    if (!t) return;
    // сотрудник видит только свои
    if (t.author !== currentUser && !(t.public && t.status === 'done')) {
      UI.toastError('Это обращение вам недоступно');
      return;
    }
    if (kanban) kanban.openTicket(id);
    else {
      // создать временный канбан без отрисовки для модалки
      const tmp = window.createKanban(document.createElement('div'), { mode: 'readonly' });
      tmp.refresh([]);
      tmp.openTicket(id);
    }
  }

  buildForm();
  UI.markReady();
})();
