// js/admin.js — консоль администратора
(function () {
  'use strict';
  const S = window.Store;
  const UI = window.UI;
  const session = S.requireRole(['admin']);
  if (!session) return;

  UI.initPage('admin');
  window.__openTicket = openTicketById;

  const currentUser = session.user;
  let kanban = null;
  let currentTab = 'board';

  // ---------- Tabs ----------
  document.querySelectorAll('.admin-tab').forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.getAttribute('data-tab')));
  });
  function switchTab(name) {
    currentTab = name;
    document.querySelectorAll('.admin-tab').forEach(t => t.classList.toggle('active', t.getAttribute('data-tab') === name));
    document.querySelectorAll('.admin-pane').forEach(p => p.style.display = 'none');
    const pane = document.getElementById('tab-' + name);
    pane.style.display = '';
    if (name === 'board') renderBoard();
    if (name === 'analytics') renderAnalytics();
    if (name === 'routing') renderRouting();
    if (name === 'assignees') renderAssignees();
    if (name === 'sla') renderSLA();
    if (name === 'perms') renderPerms();
    if (name === 'integrations') renderIntegrations();
    if (name === 'data') renderData();
  }

  // ---------- Board ----------
  function renderBoard() {
    const boardEl = document.getElementById('admin-board');
    if (!kanban) {
      kanban = window.createKanban(boardEl, { mode: 'admin', scope: 'all' });
    }
    kanban.refresh(S.getTickets());
  }

  function refreshCurrent() {
    if (currentTab === 'board') renderBoard();
    if (currentTab === 'analytics') renderAnalytics();
    if (currentTab === 'routing') renderRouting();
    if (currentTab === 'assignees') renderAssignees();
  }

  // ---------- Analytics ----------
  function renderAnalytics() {
    const a = S.getAnalytics();
    const el = document.getElementById('tab-analytics');
    const maxType = Math.max(1, ...Object.values(a.byType));
    const maxStatus = Math.max(1, ...Object.values(a.byStatus));
    const maxCat = Math.max(1, ...Object.values(a.byCategory));
    const typeBars = Object.entries(a.byType).map(([k, v]) => {
      const color = { 'Проблема': '#e05a3a', 'Предложение': '#2a6db0', 'Положительный отзыв': '#2f9e6b' }[k];
      return '<div class="chart-bar-col"><div class="chart-bar" style="height:' + Math.max(8, (v / maxType) * 100) + 'px;background:' + color + '"></div><div class="chart-bar-label">' + k.replace('Положительный отзыв', 'Отзыв') + '<br>' + v + '</div></div>';
    }).join('');

    el.innerHTML =
      '<div class="analytics-grid">' +
        kpi('Всего обращений', a.total, '', 'normal') +
        kpi('Закрыто/реализовано', a.closedCount, a.closedRate + '% от всех', 'ok') +
        kpi('Среднее первого ответа', a.avgFirstResponseDays + ' дн', 'по обращениям с ответом', 'normal') +
        kpi('Просрочено', a.overdueCount, a.overdueCount ? 'требуют внимания' : 'нет просроченных', a.overdueCount ? 'warn' : 'ok') +
      '</div>' +
      '<div class="emp-grid" style="margin-top:0">' +
        '<div class="section"><h2 class="section-title">По типам</h2><div class="chart-bars">' + typeBars + '</div></div>' +
        '<div class="section"><h2 class="section-title">По статусам</h2>' + distList(a.byStatus, S.STATUS_LABELS, S.STATUS_COLORS, maxStatus, true) + '</div>' +
      '</div>' +
      '<div class="section"><h2 class="section-title">Нагрузка на ответственных</h2>' +
        (a.workload.length ? distListAssignees(a.workload) : '<p class="muted">Нет активных обращений.</p>') + '</div>' +
      '<div class="section"><h2 class="section-title">Повторяющиеся проблемы</h2>' +
        (a.repeating.length
          ? '<div class="similar-list">' + a.repeating.map(r =>
              '<div class="similar-item" data-cat="' + UI.esc(r.category) + '" tabindex="0">' + UI.icon('flag') +
                '<span style="flex:1">' + UI.esc(r.category) + '</span><span class="similar-count">' + r.count + ' обращений</span>' +
                '<span class="icon">' + UI.ICONS.chevron + '</span></div>'
            ).join('') + '</div>'
          : '<p class="muted">Повторяющихся проблем не обнаружено.</p>') + '</div>' +
      '<div class="section"><h2 class="section-title">Распределение по категориям</h2>' +
        distList(a.byCategory, null, null, maxCat, false) + '</div>';

    el.querySelectorAll('.similar-item').forEach(item => {
      const open = () => {
        switchTab('board');
        if (kanban) kanban.state.filters.category = item.getAttribute('data-cat');
        if (kanban) kanban.render();
      };
      item.addEventListener('click', open);
      item.addEventListener('keydown', (e) => { if (e.key === 'Enter') open(); });
    });
  }
  function kpi(label, value, sub, tone) {
    return '<div class="kpi-card"><div class="kpi-label">' + UI.esc(label) + '</div>' +
      '<div class="kpi-value ' + (tone === 'warn' ? 'warn' : tone === 'ok' ? 'ok' : '') + '">' + UI.esc(value) + '</div>' +
      '<div class="kpi-sub">' + UI.esc(sub) + '</div></div>';
  }
  function distList(obj, labels, colors, max, useColor) {
    const entries = Object.entries(obj).sort((x, y) => y[1] - x[1]);
    const palette = ['var(--primary)', 'var(--info)', 'var(--accent)', 'var(--purple)', 'var(--ok)', 'var(--warn)', 'var(--err)', '#52606d'];
    return '<div class="dist-list">' + entries.map(([k, v], i) => {
      const label = labels ? (labels[k] || k) : k;
      const color = useColor && colors ? cssColor(colors[k]) : palette[i % palette.length];
      return '<div class="dist-row"><div class="dist-label">' + UI.esc(label) + '</div>' +
        '<div class="dist-bar-wrap"><div class="dist-bar" style="width:' + Math.max(2, (v / max) * 100) + '%;background:' + color + '"></div></div>' +
        '<div class="dist-value">' + v + '</div></div>';
    }).join('') + '</div>';
  }
  function cssColor(name) {
    const map = { gray: '#8a929b', blue: '#2a6db0', yellow: '#c79a00', purple: '#7257d0', green: '#2f9e6b', red: '#d04848', light: '#cdd2d8' };
    return map[name] || '#52606d';
  }
  function distListAssignees(workload) {
    const max = Math.max(1, ...workload.map(w => w.count));
    return '<div class="dist-list">' + workload.map(w =>
      '<div class="dist-row"><div class="dist-label">' + UI.esc(w.assignee) + '</div>' +
        '<div class="dist-bar-wrap"><div class="dist-bar" style="width:' + Math.max(2, (w.count / max) * 100) + '%;background:var(--primary)"></div></div>' +
        '<div class="dist-value">' + w.count + '</div></div>'
    ).join('') + '</div>';
  }

  // ---------- Routing ----------
  function renderRouting() {
    const el = document.getElementById('tab-routing');
    const cats = S.getCategories();
    const depts = S.getDepts();
    const assignees = S.getAssigneeList();
    const deptOpts = depts.map(d => '<option value="' + UI.esc(d) + '">' + UI.esc(d) + '</option>').join('');
    const assigneeOpts = '<option value="">— не назначен —</option>' + assignees.map(a => '<option value="' + UI.esc(a) + '">' + UI.esc(a) + '</option>').join('');

    el.innerHTML =
      '<div class="section"><h2 class="section-title">Маршрутизация обращений</h2>' +
        '<p class="muted" style="font-size:13px;margin-bottom:14px">Каждой категории назначается ответственный. При недоступности основного берётся резервный из карточки ответственного.</p>' +
        '<div style="margin-bottom:14px"><button class="btn btn-primary btn-sm" id="add-cat">' + UI.icon('plus') + 'Добавить категорию</button></div>' +
        '<div class="table-wrap"><table class="admin-table"><thead><tr><th>Категория</th><th>Подразделение</th><th>Ответственный</th><th>Действия</th></tr></thead><tbody>' +
          cats.map(c =>
            '<tr data-cat="' + UI.esc(c.name) + '">' +
              '<td><input class="form-control cat-name" value="' + UI.esc(c.name) + '" data-orig="' + UI.esc(c.name) + '"></td>' +
              '<td><select class="form-control cat-dept">' + deptOpts.replace('value="' + UI.esc(c.dept) + '"', 'value="' + UI.esc(c.dept) + '" selected') + '</select></td>' +
              '<td><select class="form-control cat-assignee">' + assigneeOpts.replace('value="' + UI.esc(c.assignee) + '"', 'value="' + UI.esc(c.assignee) + '" selected') + '</select></td>' +
              '<td><div class="cell-actions"><button class="btn btn-ghost btn-sm cat-save">Сохранить</button><button class="btn btn-danger btn-sm cat-del">Удалить</button></div></td>' +
            '</tr>'
          ).join('') +
        '</tbody></table></div>' +
      '</div>';

    // выставить selected для selects (replace выше ненадёжен для пустых значений — делаем явно)
    el.querySelectorAll('tr[data-cat]').forEach(tr => {
      const cat = tr.getAttribute('data-cat');
      const rec = S.getCategory(cat);
      if (rec) {
        tr.querySelector('.cat-dept').value = rec.dept || '';
        tr.querySelector('.cat-assignee').value = rec.assignee || '';
      }
      tr.querySelector('.cat-save').addEventListener('click', () => saveCatRow(tr));
      tr.querySelector('.cat-del').addEventListener('click', () => delCat(tr));
      tr.querySelector('.cat-name').addEventListener('blur', () => { /* no-op */ });
    });
    document.getElementById('add-cat').addEventListener('click', () => addCat());
  }
  function saveCatRow(tr) {
    const orig = tr.querySelector('.cat-name').getAttribute('data-orig');
    const name = tr.querySelector('.cat-name').value.trim();
    const dept = tr.querySelector('.cat-dept').value;
    const assignee = tr.querySelector('.cat-assignee').value;
    if (name.length < 3 || name.length > 50) { UI.toastError('Название категории 3–50 символов'); return; }
    try {
      S.updateCategory(orig, { name, dept, assignee });
      UI.toastSuccess('Категория сохранена');
      renderRouting();
    } catch (e) { UI.toastError(e.message); }
  }
  function delCat(tr) {
    const name = tr.querySelector('.cat-name').getAttribute('data-orig');
    UI.confirmDialog('Удалить категорию «' + name + '»?', () => {
      try { S.deleteCategory(name); UI.toastSuccess('Категория удалена'); renderRouting(); }
      catch (e) { UI.toastError(e.message); }
    }, { confirmText: 'Удалить' });
  }
  function addCat() {
    const depts = S.getDepts();
    const deptOpts = depts.map(d => '<option value="' + UI.esc(d) + '">' + UI.esc(d) + '</option>').join('');
    const assigneeOpts = '<option value="">— не назначен —</option>' + S.getAssigneeList().map(a => '<option value="' + UI.esc(a) + '">' + UI.esc(a) + '</option>').join('');
    UI.openModal({
      title: 'Новая категория',
      body: '<div class="form-row"><label class="form-label" for="nc-name">Название<span class="req">*</span></label>' +
        '<input id="nc-name" class="form-control" maxlength="50" placeholder="3–50 символов, уникально">' +
        '<p class="field-error" id="nc-name-error" style="display:none" role="alert"></p></div>' +
        '<div class="form-row"><label class="form-label" for="nc-dept">Подразделение</label>' +
        '<select id="nc-dept" class="form-control">' + deptOpts + '</select></div>' +
        '<div class="form-row"><label class="form-label" for="nc-assignee">Ответственный</label>' +
        '<select id="nc-assignee" class="form-control">' + assigneeOpts + '</select></div>',
      footer: '<button class="btn btn-primary" id="nc-save">Добавить</button><button class="btn btn-ghost" data-close="1">Отмена</button>',
      onMount: (dialog, close) => {
        const nameEl = dialog.querySelector('#nc-name');
        const errEl = dialog.querySelector('#nc-name-error');
        nameEl.focus();
        dialog.querySelector('#nc-save').addEventListener('click', () => {
          const name = nameEl.value.trim();
          if (name.length < 3 || name.length > 50) { errEl.textContent = '3–50 символов'; errEl.style.display = 'block'; nameEl.focus(); return; }
          if (S.getCategory(name)) { errEl.textContent = 'Категория уже существует'; errEl.style.display = 'block'; return; }
          try {
            S.addCategory({ name, dept: dialog.querySelector('#nc-dept').value, assignee: dialog.querySelector('#nc-assignee').value });
            UI.toastSuccess('Категория добавлена');
            close(); renderRouting();
          } catch (e) { UI.toastError(e.message); }
        });
      }
    });
  }

  // ---------- Assignees ----------
  function renderAssignees() {
    const el = document.getElementById('tab-assignees');
    const assignees = S.getAssignees();
    const allAssignees = S.getAssigneeList();
    const fbOpts = function (current) {
      return '<option value="">— нет —</option>' + allAssignees.filter(a => a !== current).map(a => '<option value="' + UI.esc(a) + '">' + UI.esc(a) + '</option>').join('');
    };

    el.innerHTML =
      '<div class="section"><h2 class="section-title">Ответственные</h2>' +
        '<p class="muted" style="font-size:13px;margin-bottom:14px">Управление доступностью и резервными. Недоступный ответственный не получает новые обращения по своим категориям — берётся резервный.</p>' +
        '<div style="margin-bottom:14px"><button class="btn btn-primary btn-sm" id="add-assignee">' + UI.icon('plus') + 'Добавить ответственного</button></div>' +
        '<div class="table-wrap"><table class="admin-table"><thead><tr><th>Имя</th><th>Доступен</th><th>Резервный</th><th>Активных</th></tr></thead><tbody>' +
          assignees.map(a => {
            const active = S.getTickets().filter(t => t.assignee === a.name && !S.FINAL_STATUSES.includes(t.status)).length;
            return '<tr data-assignee="' + UI.esc(a.name) + '">' +
              '<td><strong>' + UI.esc(a.name) + '</strong></td>' +
              '<td><label class="check-line"><input type="checkbox" class="av-toggle" ' + (a.available ? 'checked' : '') + '><span>' + (a.available ? 'доступен' : 'недоступен') + '</span></label></td>' +
              '<td><select class="form-control fb-select">' + fbOpts(a.name) + '</select></td>' +
              '<td>' + active + '</td>' +
            '</tr>';
          }).join('') +
        '</tbody></table></div>' +
      '</div>';
    // выставить selected для fallback
    el.querySelectorAll('tr[data-assignee]').forEach(tr => {
      const name = tr.getAttribute('data-assignee');
      const rec = S.getAssigneeRecord(name);
      const sel = tr.querySelector('.fb-select');
      sel.value = rec.fallback || '';
      sel.addEventListener('change', () => {
        S.setAssigneeFallback(name, sel.value);
        UI.toastSuccess('Резервный обновлён');
      });
      tr.querySelector('.av-toggle').addEventListener('change', (e) => {
        S.setAssigneeAvailable(name, e.target.checked);
        tr.querySelector('.check-line span').textContent = e.target.checked ? 'доступен' : 'недоступен';
        UI.toastSuccess(e.target.checked ? 'Ответственный доступен' : 'Ответственный недоступен — новые обращения пойдут резервному');
      });
    });
    document.getElementById('add-assignee').addEventListener('click', () => addAssignee());
  }
  function addAssignee() {
    const allAssignees = S.getAssigneeList();
    const fbOpts = '<option value="">— нет —</option>' + allAssignees.map(a => '<option value="' + UI.esc(a) + '">' + UI.esc(a) + '</option>').join('');
    UI.openModal({
      title: 'Новый ответственный',
      body: '<div class="form-row"><label class="form-label" for="na-name">Имя<span class="req">*</span></label>' +
        '<input id="na-name" class="form-control" maxlength="60" placeholder="Уникальное имя">' +
        '<p class="field-error" id="na-name-error" style="display:none" role="alert"></p></div>' +
        '<div class="form-row"><label class="form-label" for="na-fb">Резервный</label>' +
        '<select id="na-fb" class="form-control">' + fbOpts + '</select></div>',
      footer: '<button class="btn btn-primary" id="na-save">Добавить</button><button class="btn btn-ghost" data-close="1">Отмена</button>',
      onMount: (dialog, close) => {
        const nameEl = dialog.querySelector('#na-name');
        const errEl = dialog.querySelector('#na-name-error');
        nameEl.focus();
        dialog.querySelector('#na-save').addEventListener('click', () => {
          const name = nameEl.value.trim();
          if (name.length < 2) { errEl.textContent = 'Введите имя'; errEl.style.display = 'block'; return; }
          if (allAssignees.includes(name)) { errEl.textContent = 'Имя должно быть уникальным'; errEl.style.display = 'block'; return; }
          try {
            S.addAssignee(name, dialog.querySelector('#na-fb').value);
            UI.toastSuccess('Ответственный добавлен');
            close(); renderAssignees();
          } catch (e) { UI.toastError(e.message); }
        });
      }
    });
  }

  // ---------- SLA ----------
  function renderSLA() {
    const el = document.getElementById('tab-sla');
    const sla = S.getSettings().sla;
    el.innerHTML = '<div class="section"><h2 class="section-title">Сроки SLA по приоритету</h2>' +
      '<p class="muted" style="font-size:13px;margin-bottom:14px">Срок первого ответа в днях. Приоритет «Высокий» — срочные обращения.</p>' +
      '<div class="form-row" style="max-width:480px"><label class="form-label" for="sla-high">Высокий приоритет (дн.)</label>' +
        '<input id="sla-high" class="form-control" type="number" min="1" max="60" value="' + sla['Высокий'] + '">' +
        '<p class="field-error" id="sla-high-error" style="display:none" role="alert"></p></div>' +
      '<div class="form-row" style="max-width:480px"><label class="form-label" for="sla-med">Средний приоритет (дн.)</label>' +
        '<input id="sla-med" class="form-control" type="number" min="1" max="60" value="' + sla['Средний'] + '">' +
        '<p class="field-error" id="sla-med-error" style="display:none" role="alert"></p></div>' +
      '<div class="form-row" style="max-width:480px"><label class="form-label" for="sla-low">Низкий приоритет (дн.)</label>' +
        '<input id="sla-low" class="form-control" type="number" min="1" max="60" value="' + sla['Низкий'] + '">' +
        '<p class="field-error" id="sla-low-error" style="display:none" role="alert"></p></div>' +
      '<button class="btn btn-primary" id="sla-save">Сохранить сроки</button></div>';

    document.getElementById('sla-save').addEventListener('click', () => {
      const vals = { 'Высокий': document.getElementById('sla-high').value, 'Средний': document.getElementById('sla-med').value, 'Низкий': document.getElementById('sla-low').value };
      const newSla = {};
      let bad = null;
      for (const k of ['Высокий', 'Средний', 'Низкий']) {
        const v = parseInt(vals[k], 10);
        const errEl = document.getElementById('sla-' + (k === 'Высокий' ? 'high' : k === 'Средний' ? 'med' : 'low') + '-error');
        if (!Number.isInteger(v) || v < 1 || v > 60) { errEl.textContent = 'Введите целое число от 1 до 60'; errEl.style.display = 'block'; if (!bad) bad = k; }
        else { errEl.style.display = 'none'; newSla[k] = v; }
      }
      if (bad) { const id = bad === 'Высокий' ? 'high' : bad === 'Средний' ? 'med' : 'low'; document.getElementById('sla-' + id).focus(); return; }
      S.updateSettings({ sla: newSla });
      UI.toastSuccess('Сроки SLA сохранены');
    });
  }

  // ---------- Permissions ----------
  function renderPerms() {
    const el = document.getElementById('tab-perms');
    const matrix = [
      ['Видеть свои обращения', true, false, false],
      ['Подавать обращения', true, false, false],
      ['Отвечать на уточнения', true, false, false],
      ['Видеть публичные итоги улучшений', true, true, true],
      ['Видеть назначенные обращения', false, true, true],
      ['Видеть все обращения', false, false, true],
      ['Менять статус назначенных', false, true, true],
      ['Менять статус любых (эскалация)', false, false, true],
      ['Писать комментарий автору', false, true, true],
      ['Оставлять внутренние заметки', false, true, true],
      ['Передавать обращение', false, true, true],
      ['Видеть имя автора (кроме анонимных)', true, true, true],
      ['Видеть имя автора анонимных', false, false, false],
      ['Управлять маршрутизацией', false, false, true],
      ['Управлять ответственными', false, false, true],
      ['Управлять сроками SLA', false, false, true],
      ['Просматривать аналитику', false, true, true],
      ['Экспорт и сброс данных', false, false, true]
    ];
    el.innerHTML = '<div class="section"><h2 class="section-title">Права доступа по ролям</h2>' +
      '<div class="table-wrap"><table class="admin-table perm-table"><thead><tr><th>Действие</th><th>Сотрудник</th><th>Ответственный</th><th>Администратор</th></tr></thead><tbody>' +
        matrix.map(row => '<tr><td>' + UI.esc(row[0]) + '</td>' +
          [1, 2, 3].map(i => '<td>' + (row[i] ? '<span class="perm-yes">да</span>' : '<span class="perm-no">—</span>') + '</td>').join('')
        ).join('') +
      '</tbody></table></div>' +
      '<p class="muted" style="font-size:12px;margin-top:12px">Имя автора анонимного обращения не видит ни одна роль, кроме самого автора. Администратор видит «Аноним».</p></div>';
  }

  // ---------- Integrations ----------
  function renderIntegrations() {
    const el = document.getElementById('tab-integrations');
    el.innerHTML = '<div class="section"><h2 class="section-title">Интеграции (план)</h2>' +
      '<p class="muted" style="font-size:13px;margin-bottom:14px">В MVP интеграции имитируются уведомлениями в шапке. Ниже — план развития.</p>' +
      '<div class="integ-card"><h4>' + UI.icon('message') + 'Битрикс24 <span class="integ-status">план</span></h4>' +
        '<p>Направление уведомлений ответственным и авторам о смене статуса, новых комментариях и просрочке. Автоматическая постановка задач ответственному при назначении обращения. Двусторонняя синхронизация комментариев.</p></div>' +
      '<div class="integ-card"><h4>' + UI.icon('grid') + '1С: Управление торговлей <span class="integ-status">план</span></h4>' +
        '<p>Загрузка оргструктуры (подразделения и роли) для маршрутизации. Синхронизация справочника номенклатуры для категорий «Каталог и данные». Подтягивание ответственных по подразделениям из 1С.</p></div>' +
      '<div class="integ-card"><h4>' + UI.icon('info') + 'Прочее <span class="integ-status">план</span></h4>' +
        '<p>SSO через корпоративный LDAP/AD. Автоматический расчёт SLA по дате первого ответа из системы. Экспорт отчётов в формат для периодического обзора улучшений.</p></div>' +
      '</div>';
  }

  // ---------- Data ----------
  function renderData() {
    const el = document.getElementById('tab-data');
    const unassigned = S.getTickets().filter(t => !t.assignee && !S.FINAL_STATUSES.includes(t.status)).length;
    el.innerHTML = '<div class="section"><h2 class="section-title">Управление данными</h2>' +
      '<div class="form-row"><h4 style="margin-bottom:8px">Экспорт</h4>' +
        '<p class="muted" style="font-size:13px;margin-bottom:10px">Выгрузить все данные (обращения, настройки, уведомления) в JSON.</p>' +
        '<button class="btn btn-primary" id="export-btn">' + UI.icon('download') + 'Экспортировать JSON</button></div>' +
      '<hr style="border:none;border-top:1px solid var(--border);margin:20px 0">' +
      '<div class="form-row"><h4 style="margin-bottom:8px">Очередь без ответственного</h4>' +
        '<p class="muted" style="font-size:13px;margin-bottom:10px">Сейчас без ответственного: <strong>' + unassigned + '</strong> активных обращений. Перераспределение попытается назначить по правилам маршрутизации.</p>' +
        '<button class="btn btn-ghost" id="redist-btn">' + UI.icon('refresh') + 'Перераспределить очередь</button></div>' +
      '<hr style="border:none;border-top:1px solid var(--border);margin:20px 0">' +
      '<div class="form-row"><h4 style="margin-bottom:8px;color:var(--err)">Сброс демо-данных</h4>' +
        '<p class="muted" style="font-size:13px;margin-bottom:10px">Удалит все обращения, изменения и уведомления, вернёт тестовые данные из seed. Черновики будут очищены.</p>' +
        '<button class="btn btn-danger" id="reset-btn">Сбросить к демо-данным</button></div>' +
      '</div>';

    document.getElementById('export-btn').addEventListener('click', () => {
      const json = S.exportData();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'signal-export-' + new Date().toISOString().slice(0, 10) + '.json';
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
      UI.toastSuccess('Данные выгружены');
    });
    document.getElementById('redist-btn').addEventListener('click', () => {
      const r = S.redistributeUnassigned();
      UI.toastSuccess('Перераспределено: ' + r.reassigned + ' из ' + r.total);
      renderData();
      UI.buildHeader('admin');
    });
    document.getElementById('reset-btn').addEventListener('click', () => {
      UI.confirmDialog('Сбросить все данные к демо? Текущие обращения и изменения будут потеряны.', () => {
        S.resetData();
        UI.toastSuccess('Демо-данные восстановлены');
        switchTab('board');
      }, { title: 'Сброс данных', confirmText: 'Сбросить' });
    });
  }

  // ---------- Open ticket ----------
  function openTicketById(id) {
    if (!kanban) {
      kanban = window.createKanban(document.getElementById('admin-board'), { mode: 'admin', scope: 'all' });
      kanban.refresh(S.getTickets());
    }
    kanban.openTicket(id);
  }

  // Init board by default
  renderBoard();

  // хеш-ссылка
  if (location.hash.startsWith('#ticket-')) {
    setTimeout(() => openTicketById(location.hash.slice(8)), 300);
  }
  UI.markReady();
})();
