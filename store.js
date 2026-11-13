// js/store.js — слой данных: хранение, права, маршрутизация, уведомления, аналитика
(function () {
  'use strict';

  const DATA_KEY = 'signal.data.v1';
  const SESSION_KEY = 'signal.session';
  const DRAFT_KEY = 'signal.draft';

  const STATUSES = ['new', 'review', 'clarification', 'in_progress', 'done', 'rejected', 'closed'];
  const FINAL_STATUSES = ['done', 'rejected', 'closed'];
  const STATUS_LABELS = {
    new: 'Новое', review: 'На рассмотрении', clarification: 'Ожидает уточнения',
    in_progress: 'В работе', done: 'Реализовано', rejected: 'Отклонено', closed: 'Закрыто'
  };
  const STATUS_REQUIRES_TEXT = { clarification: 'question', done: 'result', rejected: 'result', closed: 'result' };
  const STATUS_COLORS = {
    new: 'gray', review: 'blue', clarification: 'yellow',
    in_progress: 'purple', done: 'green', rejected: 'red', closed: 'light'
  };
  const TYPE_LABELS = { 'Проблема': 'Проблема', 'Предложение': 'Предложение', 'Положительный отзыв': 'Отзыв' };
  const TYPE_COLORS = { 'Проблема': 'problem', 'Предложение': 'suggestion', 'Положительный отзыв': 'feedback' };
  const PRIORITIES = ['Низкий', 'Средний', 'Высокий'];

  let _data = null;

  function loadData() {
    if (_data) return _data;
    let raw = null;
    try { raw = localStorage.getItem(DATA_KEY); } catch (e) {}
    if (!raw) {
      const seed = window.SignalSeed;
      if (!seed) throw new Error('Seed data missing');
      _data = {
        tickets: JSON.parse(JSON.stringify(seed.tickets)),
        categories: JSON.parse(JSON.stringify(seed.categories)),
        assignees: JSON.parse(JSON.stringify(seed.assignees)),
        users: JSON.parse(JSON.stringify(seed.users)),
        settings: JSON.parse(JSON.stringify(seed.settings)),
        depts: JSON.parse(JSON.stringify(seed.depts)),
        notifications: [],
        registeredUsers: JSON.parse(JSON.stringify(seed.registeredUsers || '[]')),
        seq: seed.tickets.length
      };
      saveData();
    } else {
      _data = JSON.parse(raw);
    }
    return _data;
  }

  function saveData() {
    try { localStorage.setItem(DATA_KEY, JSON.stringify(_data)); } catch (e) { console.error('save failed', e); }
  }

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  // ---------- Session ----------
  function getSession() {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY)); } catch (e) { return null; }
  }
  function setSession(role, user) {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ role, user, at: Date.now() }));
  }
  function clearSession() { localStorage.removeItem(SESSION_KEY); }
  function requireRole(roles) {
    const s = getSession();
    if (!s || !roles.includes(s.role)) {
      window.location.href = 'index.html';
      return null;
    }
    return s;
  }

  // ---------- Users ----------
  function getEmployees() { return loadData().users.employees; }
  function getAssignees() { return loadData().assignees; }
  function getAssigneeList() { return loadData().assignees.map(a => a.name); }
  function getAssigneeRecord(name) { return loadData().assignees.find(a => a.name === name) || null; }
  function getDepts() { return loadData().depts; }
  function getUsers() { return loadData().users; }
  function getAdminName() { return loadData().users.admin; }

  // Сопоставление сотрудника с отделом (по имени/категории)
  const EMPLOYEE_DEPTS = {
    'Сотрудник закупок': 'Закупки',
    'Сотрудник проектирования': 'Проектирование',
    'Сотрудник бухгалтерии': 'Бухгалтерия',
    'Менеджер по продажам': 'Продажи',
    'Координатор проекта': 'Проекты',
    'Руководитель проекта': 'Проекты',
    'Сотрудник офиса': 'Офис'
  };
  // Отдел ответственного берём из категории, где он назначен
  function getAssigneeDept(assigneeName) {
    const cat = loadData().categories.find(c => c.assignee === assigneeName);
    return cat ? cat.dept : '';
  }
  // Группировка сотрудников по отделам для выпадающего списка
  function getEmployeesByDept() {
    const groups = {};
    for (const e of loadData().users.employees) {
      const dept = EMPLOYEE_DEPTS[e.name] || 'Прочее';
      if (!groups[dept]) groups[dept] = [];
      groups[dept].push(e);
    }
    // сортируем отделы по алфавиту
    return Object.keys(groups).sort().map(dept => ({ dept, employees: groups[dept] }));
  }
  // Группировка ответственных по отделам
  function getAssigneesByDept() {
    const groups = {};
    for (const a of loadData().assignees) {
      const dept = getAssigneeDept(a.name);
      const key = dept || 'Прочее';
      if (!groups[key]) groups[key] = [];
      groups[key].push(a);
    }
    return Object.keys(groups).sort().map(dept => ({ dept, assignees: groups[dept] }));
  }

  // ---------- Auth (имитация, email + пароль) ----------
  function getDemoPassword() { return loadData().users.demoPassword || 'demo1234'; }

  // Найти пользователя по email среди демо-данных и зарегистрированных.
  // Возвращает { role, user, email } или null.
  function findUserByEmail(email) {
    if (!email) return null;
    const norm = email.trim().toLowerCase();
    const d = loadData();
    // сотрудники
    const emp = d.users.employees.find(e => (e.email || '').toLowerCase() === norm);
    if (emp) return { role: 'employee', user: emp.name, email: emp.email, source: 'demo' };
    // ответственные
    const asg = d.assignees.find(a => (a.email || '').toLowerCase() === norm);
    if (asg) return { role: 'manager', user: asg.name, email: asg.email, source: 'demo' };
    // администратор
    const adminEmail = d.users.adminEmail || 'admin@modus.ru';
    if (adminEmail.toLowerCase() === norm) return { role: 'admin', user: d.users.admin, email: adminEmail, source: 'demo' };
    // зарегистрированные (сотрудники)
    const reg = (d.registeredUsers || []).find(u => (u.email || '').toLowerCase() === norm);
    if (reg) return { role: 'employee', user: reg.name, email: reg.email, source: 'registered' };
    return null;
  }

  // Проверка пароля
  function verifyPassword(email, password) {
    const found = findUserByEmail(email);
    if (!found) return { ok: false, error: 'Пользователь с таким email не найден' };
    const d = loadData();
    let expected = null;
    if (found.source === 'demo') {
      if (found.role === 'employee') {
        const emp = d.users.employees.find(e => e.name === found.user);
        expected = emp ? emp.password : null;
      } else if (found.role === 'manager') {
        const asg = d.assignees.find(a => a.name === found.user);
        expected = asg ? asg.password : null;
      } else if (found.role === 'admin') {
        expected = getDemoPassword();
      }
    } else {
      const reg = (d.registeredUsers || []).find(u => u.email === found.email);
      expected = reg ? reg.password : null;
    }
    if (!expected) return { ok: false, error: 'Учётная запись недоступна' };
    if (password !== expected) return { ok: false, error: 'Неверный пароль' };
    return { ok: true, user: found };
  }

  // Регистрация нового сотрудника
  function registerUser(data) {
    const d = loadData();
    if (!data.name || data.name.trim().length < 2) throw new Error('Имя слишком короткое');
    if (data.name.trim().length > 60) throw new Error('Имя слишком длинное');
    if (!isValidEmail(data.email)) throw new Error('Некорректный email');
    if (findUserByEmail(data.email)) throw new Error('Пользователь с таким email уже зарегистрирован');
    if (!data.password || data.password.length < 8) throw new Error('Пароль должен быть не менее 8 символов');
    if (data.password.length > 64) throw new Error('Пароль слишком длинный');
    if (!data.agree) throw new Error('Необходимо принять условия');
    if (!d.registeredUsers) d.registeredUsers = [];
    const user = {
      name: data.name.trim(),
      email: data.email.trim().toLowerCase(),
      password: data.password,
      role: 'employee',
      at: new Date().toISOString()
    };
    d.registeredUsers.push(user);
    saveData();
    return { role: 'employee', user: user.name, email: user.email, source: 'registered' };
  }

  function isValidEmail(email) {
    if (!email) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
  }

  function getRegisteredUsers() { return loadData().registeredUsers || []; }

  function addAssignee(name, fallback) {
    const d = loadData();
    if (d.assignees.some(a => a.name === name)) throw new Error('Ответственный с таким именем уже существует');
    d.assignees.push({ name, available: true, fallback: fallback || '' });
    saveData();
  }
  function setAssigneeAvailable(name, available) {
    const a = getAssigneeRecord(name);
    if (!a) return;
    a.available = !!available;
    saveData();
  }
  function setAssigneeFallback(name, fallback) {
    const a = getAssigneeRecord(name);
    if (!a) return;
    a.fallback = fallback || '';
    saveData();
  }
  function removeAssignee(name) {
    const d = loadData();
    // не удалять, если на него назначены обращения или категории
    const usedByTicket = d.tickets.some(t => t.assignee === name && !FINAL_STATUSES.includes(t.status));
    if (usedByTicket) throw new Error('Нельзя удалить: есть активные обращения у этого ответственного');
    d.assignees = d.assignees.filter(a => a.name !== name);
    // категории с этим ответственным очищаем
    d.categories.forEach(c => { if (c.assignee === name) c.assignee = ''; });
    saveData();
  }

  // ---------- Categories ----------
  function getCategories() { return loadData().categories; }
  function getCategory(name) { return loadData().categories.find(c => c.name === name) || null; }
  function addCategory(cat) {
    const d = loadData();
    if (d.categories.some(c => c.name === cat.name)) throw new Error('Категория с таким названием уже существует');
    d.categories.push({ name: cat.name, dept: cat.dept || '', assignee: cat.assignee || '' });
    saveData();
  }
  function updateCategory(name, patch) {
    const d = loadData();
    const c = d.categories.find(x => x.name === name);
    if (!c) return;
    if (patch.name && patch.name !== name) {
      if (d.categories.some(x => x.name === patch.name)) throw new Error('Категория с таким названием уже существует');
      d.tickets.forEach(t => { if (t.category === name) t.category = patch.name; });
    }
    Object.assign(c, patch);
    saveData();
  }
  function deleteCategory(name) {
    const d = loadData();
    const used = d.tickets.some(t => t.category === name);
    if (used) throw new Error('Нельзя удалить категорию: есть обращения в ней');
    d.categories = d.categories.filter(c => c.name !== name);
    saveData();
  }

  // ---------- Settings ----------
  function getSettings() { return loadData().settings; }
  function updateSettings(patch) {
    const d = loadData();
    Object.assign(d.settings, patch);
    saveData();
  }

  // ---------- Routing ----------
  function routeByCategory(categoryName) {
    const d = loadData();
    const cat = d.categories.find(c => c.name === categoryName);
    if (!cat) return { assignee: '', routedBy: 'none', reason: 'Категория не найдена' };
    const primary = getAssigneeRecord(cat.assignee);
    if (primary && primary.available) {
      return { assignee: cat.assignee, routedBy: 'rule', reason: 'Назначен основной ответственный по категории' };
    }
    // primary недоступен — берём резервного из записи ответственного
    if (primary && primary.fallback) {
      const fb = getAssigneeRecord(primary.fallback);
      if (fb && fb.available) {
        return { assignee: fb.name, routedBy: 'fallback', reason: 'Основной недоступен, назначен резервный ответственный' };
      }
    }
    // глобальный fallback из настроек
    const globalFb = d.settings.fallback ? getAssigneeRecord(d.settings.fallback) : null;
    if (globalFb && globalFb.available) {
      return { assignee: globalFb.name, routedBy: 'fallback', reason: 'Назначен резервный по умолчанию' };
    }
    return { assignee: '', routedBy: 'none', reason: 'Нет доступного ответственного, обращение в очереди администратора' };
  }

  function slaDays(priority) { return (loadData().settings.sla[priority] || 7); }
  function computeDue(createdAt, priority) {
    return new Date(new Date(createdAt).getTime() + slaDays(priority) * 86400000).toISOString();
  }

  // ---------- Tickets ----------
  function getTickets() { return loadData().tickets; }
  function getTicket(id) { return loadData().tickets.find(t => t.id === id) || null; }
  function getUserTickets(author) {
    return loadData().tickets.filter(t => t.author === author).slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }
  function getAssignedTickets(assignee) {
    return loadData().tickets.filter(t => t.assignee === assignee).slice();
  }

  function nextId() {
    const d = loadData();
    d.seq = (d.seq || d.tickets.length) + 1;
    saveData();
    return 'A-' + String(d.seq).padStart(3, '0');
  }

  function findSimilar(title, author) {
    if (!title || title.trim().length < 5) return null;
    const words = title.toLowerCase().split(/\s+/).filter(w => w.length >= 4);
    if (words.length === 0) return null;
    const mine = loadData().tickets.filter(t => t.author === author);
    let best = null, bestScore = 0;
    for (const t of mine) {
      const tw = t.title.toLowerCase();
      let score = 0;
      for (const w of words) if (tw.includes(w)) score++;
      if (score > bestScore) { bestScore = score; best = t; }
    }
    return bestScore >= 2 ? best : null;
  }

  function createTicket(data) {
    const d = loadData();
    const route = routeByCategory(data.category);
    const id = nextId();
    const now = new Date().toISOString();
    const dueAt = computeDue(now, data.priority);
    const events = [{
      type: 'created', at: now, text: 'Обращение зарегистрировано'
    }];
    events.push({
      type: 'assign', at: now, to: route.assignee, routedBy: route.routedBy,
      text: route.reason
    });
    const order = d.tickets.filter(t => t.status === 'new').length;
    const ticket = {
      id, type: data.type, category: data.category, title: data.title, text: data.text,
      solution: data.solution || '', author: data.author, anon: !!data.anon,
      priority: data.priority, status: 'new', assignee: route.assignee,
      routedBy: route.routedBy, nextAction: '', result: '', public: false,
      order, createdAt: now, dueAt, firstResponseAt: null, closedAt: null,
      attachments: data.attachments || [], events
    };
    d.tickets.push(ticket);
    saveData();
    // уведомление ответственному (если есть)
    if (route.assignee) addNotification(route.assignee, id, 'Новое обращение ' + id + ': ' + data.title);
    else addNotification(getAdminName(), id, 'Обращение ' + id + ' без ответственного — требует распределения');
    return ticket;
  }

  function updateTicket(id, patch) {
    const d = loadData();
    const t = d.tickets.find(x => x.id === id);
    if (!t) return null;
    Object.assign(t, patch);
    saveData();
    return t;
  }

  // Смена статуса. Для статусов, требующих текст, проверяем его наличие.
  // options: { text, public, by, admin }
  function changeStatus(id, newStatus, options) {
    options = options || {};
    const d = loadData();
    const t = d.tickets.find(x => x.id === id);
    if (!t) throw new Error('Обращение не найдено');
    if (t.status === newStatus) return t;
    const required = STATUS_REQUIRES_TEXT[newStatus];
    if (required && !options.text) throw new Error('Для этого статуса обязательно заполнить поле');
    pushUndo();
    const oldStatus = t.status;
    const now = new Date().toISOString();
    const ev = {
      type: 'status', at: now, from: oldStatus, to: newStatus,
      by: options.by || t.assignee, text: options.text || ''
    };
    if (options.admin) ev.admin = true;
    t.events.push(ev);
    t.status = newStatus;
    t.updatedAt = now;
    if (!t.firstResponseAt && newStatus !== 'new') t.firstResponseAt = now;
    if (FINAL_STATUSES.includes(newStatus)) t.closedAt = now;
    if (newStatus === 'done') t.public = !!options.public;
    if (newStatus === 'done' || newStatus === 'rejected' || newStatus === 'closed') t.result = options.text || t.result;
    if (newStatus === 'clarification') t.nextAction = options.text || '';
    // обновить order в новой колонке
    const inCol = d.tickets.filter(x => x.status === newStatus);
    t.order = inCol.length - 1;
    saveData();
    // уведомление автору
    addNotification(t.author, id, 'Статус обращения ' + id + ' изменён на «' + STATUS_LABELS[newStatus] + '»');
    return t;
  }

  function addComment(id, text, internal, by) {
    const d = loadData();
    const t = d.tickets.find(x => x.id === id);
    if (!t) throw new Error('Обращение не найдено');
    if (!text || !text.trim()) throw new Error('Комментарий не может быть пустым');
    if (text.length > 1000) throw new Error('Комментарий слишком длинный (до 1000 символов)');
    const ev = { type: 'comment', at: new Date().toISOString(), text: text.trim(), internal: !!internal, by: by || t.assignee };
    t.events.push(ev);
    saveData();
    if (!internal) addNotification(t.author, id, 'Новый комментарий по обращению ' + id);
    return t;
  }

  function addReply(id, text) {
    const d = loadData();
    const t = d.tickets.find(x => x.id === id);
    if (!t) throw new Error('Обращение не найдено');
    if (!text || !text.trim()) throw new Error('Ответ не может быть пустым');
    if (text.length > 1000) throw new Error('Ответ слишком длинный (до 1000 символов)');
    const now = new Date().toISOString();
    t.events.push({ type: 'reply', at: now, text: text.trim(), byAuthor: true });
    // статус возвращается в «На рассмотрении»
    if (t.status === 'clarification') {
      t.events.push({ type: 'status', at: now, from: 'clarification', to: 'review', by: t.author, text: 'Автор ответил, возвращено на рассмотрение' });
      t.status = 'review';
      t.order = d.tickets.filter(x => x.status === 'review').length - 1;
    }
    saveData();
    addNotification(t.assignee, id, 'Автор ответил по обращению ' + id);
    return t;
  }

  function reassign(id, newAssignee, by) {
    const d = loadData();
    const t = d.tickets.find(x => x.id === id);
    if (!t) throw new Error('Обращение не найдено');
    const old = t.assignee;
    if (old === newAssignee) return t;
    pushUndo();
    const now = new Date().toISOString();
    t.events.push({
      type: 'assign', at: now, to: newAssignee, routedBy: 'manual',
      text: 'Передача обращения от «' + (old || '—') + '» к «' + (newAssignee || '—') + '»',
      by: by || 'Администратор системы'
    });
    t.assignee = newAssignee || '';
    t.updatedAt = now;
    saveData();
    if (newAssignee) addNotification(newAssignee, id, 'Вам передано обращение ' + id);
    if (old) addNotification(old, id, 'Обращение ' + id + ' передано другому ответственному');
    return t;
  }

  function setPublic(id, isPublic) {
    const t = getTicket(id);
    if (!t) return;
    pushUndo();
    t.public = !!isPublic;
    saveData();
  }

  function reorderInColumn(status, orderedIds) {
    const d = loadData();
    pushUndo();
    const now = new Date().toISOString();
    orderedIds.forEach((id, i) => {
      const t = d.tickets.find(x => x.id === id);
      if (t && t.status === status) { t.order = i; t.updatedAt = now; }
    });
    saveData();
  }

  // Карточки колонки в том порядке, в котором их показывает доска (по order, затем по позиции в массиве).
  // Без этой сортировки индекс вставки считался по «сырому» массиву и карточка попадала не туда.
  function columnSorted(d, status, exceptId) {
    return d.tickets
      .map((x, i) => ({ x, i }))
      .filter(r => r.x.status === status && r.x.id !== exceptId)
      .sort((a, b) => ((a.x.order || 0) - (b.x.order || 0)) || (a.i - b.i))
      .map(r => r.x);
  }

  // Перенос обращения в новый статус с вставкой перед конкретной карточкой (или в конец).
  // beforeId — id карточки, перед которой вставить; null/undefined — в конец колонки.
  // Пересчитывает order (0,1,2…) для исходной и целевой колонок.
  function moveTicketToColumn(id, newStatus, beforeId, options) {
    options = options || {};
    const d = loadData();
    const t = d.tickets.find(x => x.id === id);
    if (!t) throw new Error('Обращение не найдено');
    const oldStatus = t.status;
    if (newStatus === oldStatus && !options.force) {
      // перемещение внутри одной колонки
      pushUndo();
      const col = columnSorted(d, newStatus, id);
      // вставить t перед beforeId (список уже отсортирован по order — как на экране)
      let insertIdx = col.length;
      if (beforeId) {
        const idx = col.findIndex(x => x.id === beforeId);
        if (idx >= 0) insertIdx = idx;
      }
      col.splice(insertIdx, 0, t);
      const now = new Date().toISOString();
      col.forEach((x, i) => { x.order = i; x.updatedAt = now; });
      saveData();
      return t;
    }
    const required = STATUS_REQUIRES_TEXT[newStatus];
    if (required && !options.text) throw new Error('Для этого статуса обязательно заполнить поле');
    pushUndo();
    const now = new Date().toISOString();
    const ev = { type: 'status', at: now, from: oldStatus, to: newStatus, by: options.by || t.assignee, text: options.text || '' };
    if (options.admin) ev.admin = true;
    t.events.push(ev);
    t.status = newStatus;
    t.updatedAt = now;
    if (!t.firstResponseAt && newStatus !== 'new') t.firstResponseAt = now;
    if (FINAL_STATUSES.includes(newStatus)) t.closedAt = now;
    if (newStatus === 'done') t.public = !!options.public;
    if (newStatus === 'done' || newStatus === 'rejected' || newStatus === 'closed') t.result = options.text || t.result;
    if (newStatus === 'clarification') t.nextAction = options.text || '';
    // пересчёт order целевой колонки: вставка перед beforeId
    const targetCol = columnSorted(d, newStatus, id);
    let insertIdx = targetCol.length;
    if (beforeId) {
      const idx = targetCol.findIndex(x => x.id === beforeId);
      if (idx >= 0) insertIdx = idx;
    }
    targetCol.splice(insertIdx, 0, t);
    targetCol.forEach((x, i) => { x.order = i; });
    // пересчёт order исходной колонки
    const sourceCol = columnSorted(d, oldStatus, id);
    sourceCol.forEach((x, i) => { x.order = i; });
    saveData();
    addNotification(t.author, id, 'Статус обращения ' + id + ' изменён на «' + STATUS_LABELS[newStatus] + '»');
    return t;
  }

  // ---------- Undo ----------
  const UNDO_LIMIT = 30;
  function pushUndo() {
    const d = loadData();
    if (!d.undoStack) d.undoStack = [];
    // снимок только tickets (основной мутируемый массив)
    d.undoStack.push(JSON.stringify(d.tickets));
    if (d.undoStack.length > UNDO_LIMIT) d.undoStack.shift();
  }
  function canUndo() {
    const d = loadData();
    return !!(d.undoStack && d.undoStack.length > 0);
  }
  function undo() {
    const d = loadData();
    if (!d.undoStack || !d.undoStack.length) return false;
    const snap = d.undoStack.pop();
    try {
      d.tickets = JSON.parse(snap);
      saveData();
      return true;
    } catch (e) { return false; }
  }

  // ---------- Permissions ----------
  function canEditStatus(role, user, ticket) {
    if (role === 'admin') return true;
    if (role === 'manager' && ticket.assignee === user) return true;
    return false;
  }
  function canReassign(role, user, ticket) {
    if (role === 'admin') return true;
    if (role === 'manager' && ticket.assignee === user) return true;
    return false;
  }
  function canSeeAuthor(role, user, ticket) {
    if (ticket.anon && role !== 'employee') return false;
    if (role === 'employee' && ticket.author !== user) return false;
    return true;
  }
  function isOverdue(t) {
    if (FINAL_STATUSES.includes(t.status)) return false;
    return new Date(t.dueAt).getTime() < Date.now();
  }
  function daysLeft(t) {
    return Math.ceil((new Date(t.dueAt).getTime() - Date.now()) / 86400000);
  }

  // ---------- Notifications ----------
  function getNotifications(user) {
    return loadData().notifications.filter(n => n.to === user).sort((a, b) => new Date(b.at) - new Date(a.at));
  }
  function getUnreadCount(user) {
    return loadData().notifications.filter(n => n.to === user && !n.read).length;
  }
  function markNotificationRead(id) {
    const d = loadData();
    const n = d.notifications.find(x => x.id === id);
    if (n) n.read = true;
    saveData();
  }
  function markAllRead(user) {
    const d = loadData();
    d.notifications.forEach(n => { if (n.to === user) n.read = true; });
    saveData();
  }
  function addNotification(to, ticketId, text) {
    if (!to) return;
    const d = loadData();
    d.notifications.push({
      id: 'n-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
      to, ticketId, text, at: new Date().toISOString(), read: false
    });
    saveData();
  }
  // Динамические уведомления о просрочке и отсутствии ответственного (вычисляются)
  function getDynamicNotifications(role, user) {
    const d = loadData();
    const list = [];
    if (role === 'manager') {
      const overdue = d.tickets.filter(t => t.assignee === user && isOverdue(t));
      for (const t of overdue) {
        list.push({ id: 'dyn-od-' + t.id, to: user, ticketId: t.id, text: 'Просрочено: ' + t.id + ' — ' + t.title, at: t.dueAt, read: false, dynamic: true });
      }
    }
    if (role === 'admin') {
      const unassigned = d.tickets.filter(t => !t.assignee && !FINAL_STATUSES.includes(t.status));
      for (const t of unassigned) {
        list.push({ id: 'dyn-na-' + t.id, to: user, ticketId: t.id, text: 'Без ответственного: ' + t.id + ' — ' + t.title, at: t.createdAt, read: false, dynamic: true });
      }
    }
    return list;
  }

  // ---------- Analytics ----------
  function getAnalytics() {
    const d = loadData();
    const tickets = d.tickets;
    const byType = { 'Проблема': 0, 'Предложение': 0, 'Положительный отзыв': 0 };
    const byStatus = {};
    for (const s of STATUSES) byStatus[s] = 0;
    let closedCount = 0;
    let firstResponseTimes = [];
    let overdueCount = 0;
    const byCategory = {};

    for (const t of tickets) {
      byType[t.type] = (byType[t.type] || 0) + 1;
      byStatus[t.status] = (byStatus[t.status] || 0) + 1;
      if (FINAL_STATUSES.includes(t.status)) closedCount++;
      if (t.firstResponseAt) {
        firstResponseTimes.push((new Date(t.firstResponseAt) - new Date(t.createdAt)) / 86400000);
      }
      if (isOverdue(t)) overdueCount++;
      byCategory[t.category] = (byCategory[t.category] || 0) + 1;
    }

    const avgFirstResponse = firstResponseTimes.length
      ? firstResponseTimes.reduce((a, b) => a + b, 0) / firstResponseTimes.length : 0;

    // повторяющиеся проблемы: категории-проблемы с >= 2 обращениями
    const problemByCat = {};
    for (const t of tickets) {
      if (t.type === 'Проблема') {
        problemByCat[t.category] = (problemByCat[t.category] || 0) + 1;
      }
    }
    const repeating = Object.keys(problemByCat)
      .filter(c => problemByCat[c] >= 2)
      .map(c => ({ category: c, count: problemByCat[c] }))
      .sort((a, b) => b.count - a.count);

    // нагрузка на ответственных
    const loadByAssignee = {};
    for (const t of tickets) {
      if (!FINAL_STATUSES.includes(t.status) && t.assignee) {
        loadByAssignee[t.assignee] = (loadByAssignee[t.assignee] || 0) + 1;
      }
    }
    const workload = Object.keys(loadByAssignee).map(a => ({ assignee: a, count: loadByAssignee[a] })).sort((x, y) => y.count - x.count);

    return {
      total: tickets.length,
      byType, byStatus, closedCount,
      closedRate: tickets.length ? Math.round(closedCount / tickets.length * 100) : 0,
      avgFirstResponseDays: Math.round(avgFirstResponse * 10) / 10,
      overdueCount, repeating, workload,
      byCategory
    };
  }

  // ---------- Draft ----------
  function getDraft() {
    try { return JSON.parse(localStorage.getItem(DRAFT_KEY)); } catch (e) { return null; }
  }
  function saveDraft(data) {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
  }
  function clearDraft() { localStorage.removeItem(DRAFT_KEY); }

  // ---------- Data management ----------
  function exportData() {
    return JSON.stringify(loadData(), null, 2);
  }
  function resetData() {
    localStorage.removeItem(DATA_KEY);
    localStorage.removeItem(DRAFT_KEY);
    _data = null;
    loadData();
  }
  function redistributeUnassigned() {
    const d = loadData();
    const unassigned = d.tickets.filter(t => !t.assignee && !FINAL_STATUSES.includes(t.status));
    if (unassigned.length === 0) return { total: 0, reassigned: 0 };
    pushUndo();
    let reassigned = 0;
    for (const t of unassigned) {
      const route = routeByCategory(t.category);
      if (route.assignee) {
        t.events.push({
          type: 'assign', at: new Date().toISOString(), to: route.assignee,
          routedBy: route.routedBy, text: 'Перераспределение очереди: ' + route.reason,
          by: getAdminName()
        });
        t.assignee = route.assignee;
        t.routedBy = route.routedBy;
        reassigned++;
        addNotification(route.assignee, t.id, 'Перераспределено обращение ' + t.id);
      }
    }
    saveData();
    return { total: unassigned.length, reassigned };
  }

  // ---------- Helpers exposed ----------
  window.Store = {
    STATUSES, FINAL_STATUSES, STATUS_LABELS, STATUS_COLORS, STATUS_REQUIRES_TEXT,
    TYPE_LABELS, TYPE_COLORS, PRIORITIES,
    getSession, setSession, clearSession, requireRole,
    getEmployees, getAssignees, getAssigneeList, getAssigneeRecord, getDepts, getUsers, getAdminName,
    getEmployeesByDept, getAssigneesByDept, getAssigneeDept,
    addAssignee, setAssigneeAvailable, setAssigneeFallback, removeAssignee,
    getCategories, getCategory, addCategory, updateCategory, deleteCategory,
    getSettings, updateSettings,
    routeByCategory, slaDays, computeDue,
    getTickets, getTicket, getUserTickets, getAssignedTickets, createTicket, updateTicket,
    changeStatus, addComment, addReply, reassign, setPublic, reorderInColumn, moveTicketToColumn, findSimilar,
    canEditStatus, canReassign, canSeeAuthor, isOverdue, daysLeft,
    getNotifications, getUnreadCount, markNotificationRead, markAllRead, addNotification, getDynamicNotifications,
    getAnalytics,
    getDraft, saveDraft, clearDraft,
    exportData, resetData, redistributeUnassigned,
    saveData,
    findUserByEmail, verifyPassword, registerUser, isValidEmail, getRegisteredUsers, getDemoPassword,
    canUndo, undo
  };
})();
