// js/manager.js — рабочее место ответственного
(function () {
  'use strict';
  const S = window.Store;
  const UI = window.UI;
  const session = S.requireRole(['manager']);
  if (!session) return;

  UI.initPage('manager');
  window.__openTicket = openTicketById;

  const currentUser = session.user;
  let kanban = null;
  let scope = 'assigned';

  renderKPIs();
  renderSimilar();

  // Kanban
  const boardEl = document.getElementById('manager-board');
  kanban = window.createKanban(boardEl, { mode: 'own', scope: scope, onOpen: openTicketById });
  refreshBoard();

  function refreshBoard() {
    const tickets = S.getTickets();
    kanban.refresh(tickets);
    renderKPIs();
    renderSimilar();
  }

  function renderKPIs() {
    const all = S.getTickets();
    const mine = all.filter(t => t.assignee === currentUser);
    const overdueMine = mine.filter(t => S.isOverdue(t)).length;
    const activeMine = mine.filter(t => !S.FINAL_STATUSES.includes(t.status)).length;
    // среднее время первого ответа по моим
    const fr = mine.filter(t => t.firstResponseAt);
    const avg = fr.length ? (fr.reduce((a, t) => a + (new Date(t.firstResponseAt) - new Date(t.createdAt)) / 86400000, 0) / fr.length) : 0;
    const analytics = S.getAnalytics();

    document.getElementById('manager-kpis').innerHTML =
      kpi('Назначено мне', activeMine, activeMine + ' активных', 'normal') +
      kpi('Просрочено', overdueMine, overdueMine ? 'требуют срочного внимания' : 'всё в срок', overdueMine ? 'warn' : 'ok') +
      kpi('Среднее первого ответа', (Math.round(avg * 10) / 10) + ' дн', 'по моим обращениям', 'normal') +
      kpi('Закрыто/реализовано', mine.filter(t => S.FINAL_STATUSES.includes(t.status)).length, 'из моих обращений', 'ok');
  }
  function kpi(label, value, sub, tone) {
    return '<div class="kpi-card"><div class="kpi-label">' + UI.esc(label) + '</div>' +
      '<div class="kpi-value ' + (tone === 'warn' ? 'warn' : tone === 'ok' ? 'ok' : '') + '">' + UI.esc(value) + '</div>' +
      '<div class="kpi-sub">' + UI.esc(sub) + '</div></div>';
  }

  function renderSimilar() {
    const analytics = S.getAnalytics();
    const repeating = analytics.repeating.slice(0, 5);
    const block = document.getElementById('similar-block');
    if (repeating.length === 0) { block.style.display = 'none'; return; }
    block.style.display = '';
    document.getElementById('similar-list').innerHTML = repeating.map(r =>
      '<div class="similar-item" data-cat="' + UI.esc(r.category) + '" tabindex="0">' +
        UI.icon('flag') + '<span style="flex:1">' + UI.esc(r.category) + '</span>' +
        '<span class="similar-count">' + r.count + ' обращений</span>' +
        '<span class="icon">' + UI.ICONS.chevron + '</span>' +
      '</div>'
    ).join('');
    document.querySelectorAll('.similar-item').forEach(item => {
      const open = () => {
        // отфильтровать доску по категории
        if (kanban) kanban.state.filters.category = item.getAttribute('data-cat');
        if (kanban) kanban.render();
        boardEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      };
      item.addEventListener('click', open);
      item.addEventListener('keydown', (e) => { if (e.key === 'Enter') open(); });
    });
  }

  function openTicketById(id) {
    const t = S.getTicket(id);
    if (!t) return;
    kanban.openTicket(id);
  }

  // Поддержка хеш-ссылки #ticket-A-XXX
  if (location.hash.startsWith('#ticket-')) {
    setTimeout(() => openTicketById(location.hash.slice(8)), 300);
  }
  UI.markReady();
})();
