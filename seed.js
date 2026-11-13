// js/seed.js — тестовые данные для демо «Сигнал»
// Все даты относительно текущего момента. Часть обращений просрочена.
(function () {
  'use strict';
  const DAY = 86400000;
  const now = Date.now();
  const ago = (d) => new Date(now - d * DAY).toISOString();
  const ahead = (d) => new Date(now + d * DAY).toISOString();

  // --- Подразделения ---
  const DEPTS = [
    'Закупки', 'Продажи', 'Проектирование', 'Бухгалтерия', 'IT',
    'HR и обучение', 'Проекты', 'Процессы', 'Документы', 'Офис', 'Управление'
  ];

  // --- Ответственные (для входа и назначения) ---
  const assignees = [
    { name: 'Руководитель закупок', available: true, fallback: 'Руководитель направления' },
    { name: 'Руководитель направления', available: true, fallback: 'Руководитель подразделения' },
    { name: 'Ответственный за номенклатуру', available: true, fallback: 'Руководитель проектирования' },
    { name: 'Ответственный за обучение', available: true, fallback: 'HR / внутренние коммуникации' },
    { name: 'Руководитель бухгалтерии', available: true, fallback: 'Ответственный за процессы' },
    { name: 'Ответственный за процессы', available: true, fallback: 'Руководитель подразделения' },
    { name: 'IT-специалист', available: true, fallback: 'Руководитель направления' },
    { name: 'Руководитель подразделения', available: true, fallback: 'Руководитель направления' },
    { name: 'Ответственный за договоры', available: true, fallback: 'Руководитель продаж' },
    { name: 'Руководитель продаж', available: true, fallback: 'Руководитель направления' },
    { name: 'Административный руководитель', available: true, fallback: 'HR / внутренние коммуникации' },
    { name: 'Руководитель проектов', available: true, fallback: 'Руководитель направления' },
    { name: 'Руководитель проектирования', available: true, fallback: 'Ответственный за номенклатуру' },
    { name: 'Администратор документов', available: true, fallback: 'Ответственный за процессы' },
    { name: 'HR / внутренние коммуникации', available: true, fallback: 'Ответственный за обучение' }
  ];

  // --- Категории: имя → подразделение → ответственный ---
  const categories = [
    { name: 'Межотдельное взаимодействие', dept: 'Управление', assignee: 'Руководитель закупок' },
    { name: 'Информационная прозрачность', dept: 'Управление', assignee: 'Руководитель направления' },
    { name: 'Каталог и данные', dept: 'Проектирование', assignee: 'Ответственный за номенклатуру' },
    { name: 'Обучение', dept: 'HR и обучение', assignee: 'Ответственный за обучение' },
    { name: 'Документооборот', dept: 'Бухгалтерия', assignee: 'Руководитель бухгалтерии' },
    { name: 'Регламенты', dept: 'Процессы', assignee: 'Ответственный за процессы' },
    { name: 'Интеграции и IT', dept: 'IT', assignee: 'IT-специалист' },
    { name: 'Знания и наставничество', dept: 'HR и обучение', assignee: 'Руководитель подразделения' },
    { name: 'Договорная работа', dept: 'Продажи', assignee: 'Ответственный за договоры' },
    { name: 'Задачи и коммуникации', dept: 'Проекты', assignee: 'Руководитель продаж' },
    { name: 'Оперативность', dept: 'Проекты', assignee: 'Руководитель направления' },
    { name: 'Коммуникации', dept: 'IT', assignee: 'IT-специалист' },
    { name: 'Проектная деятельность', dept: 'Проекты', assignee: 'Руководитель проектов' },
    { name: 'Планирование ресурсов', dept: 'Проектирование', assignee: 'Руководитель проектирования' },
    { name: 'Постановка задач', dept: 'Проекты', assignee: 'Руководитель направления' },
    { name: 'Корпоративная среда', dept: 'Офис', assignee: 'Административный руководитель' },
    { name: 'Хранение документов', dept: 'Документы', assignee: 'Администратор документов' },
    { name: 'Прозрачность результатов', dept: 'Управление', assignee: 'Руководитель подразделения' }
  ];

  // --- Пользователи для входа ---
  const employees = [
    { name: 'Сотрудник закупок', role: 'employee', email: 'zakupki@modus.ru' },
    { name: 'Сотрудник проектирования', role: 'employee', email: 'proekt@modus.ru' },
    { name: 'Сотрудник бухгалтерии', role: 'employee', email: 'buh@modus.ru' },
    { name: 'Менеджер по продажам', role: 'employee', email: 'prodazhi@modus.ru' },
    { name: 'Координатор проекта', role: 'employee', email: 'proj-coord@modus.ru' },
    { name: 'Руководитель проекта', role: 'employee', email: 'proj-lead@modus.ru' },
    { name: 'Сотрудник офиса', role: 'employee', email: 'office@modus.ru' }
  ];

  // email для ответственных (генерируем из имени роли)
  const assigneeEmails = {
    'Руководитель закупок': 'r.zakupki@modus.ru',
    'Руководитель направления': 'r.napravlenie@modus.ru',
    'Ответственный за номенклатуру': 'r.nomenklatura@modus.ru',
    'Ответственный за обучение': 'r.obuchenie@modus.ru',
    'Руководитель бухгалтерии': 'r.buh@modus.ru',
    'Ответственный за процессы': 'r.processy@modus.ru',
    'IT-специалист': 'it@modus.ru',
    'Руководитель подразделения': 'r.podrazdel@modus.ru',
    'Ответственный за договоры': 'r.dogovory@modus.ru',
    'Руководитель продаж': 'r.prodazhi@modus.ru',
    'Административный руководитель': 'r.admin@modus.ru',
    'Руководитель проектов': 'r.proekty@modus.ru',
    'Руководитель проектирования': 'r.proektir@modus.ru',
    'Администратор документов': 'r.docs@modus.ru',
    'HR / внутренние коммуникации': 'hr@modus.ru'
  };
  assignees.forEach(a => { a.email = assigneeEmails[a.name] || 'staff@modus.ru'; a.password = 'demo1234'; });
  employees.forEach(e => { e.password = 'demo1234'; });

  const users = {
    employees,
    assignees: assignees.map(a => a.name),
    admin: 'Администратор системы',
    adminEmail: 'admin@modus.ru',
    demoPassword: 'demo1234'
  };

  const settings = {
    sla: { 'Высокий': 3, 'Средний': 7, 'Низкий': 14 },
    fallback: 'Руководитель направления'
  };

  // --- SLA по приоритету (дни) ---
  const slaDays = (priority) => settings.sla[priority] || 7;

  // Построитель обращений. path — массив статусов от 'new' до финального.
  function buildTicket(spec) {
    const created = spec.created;
    const dueAt = new Date(new Date(created).getTime() + slaDays(spec.priority) * DAY).toISOString();
    const events = [];
    events.push({ type: 'created', at: created, text: 'Обращение зарегистрировано' });

    // назначение
    events.push({
      type: 'assign',
      at: new Date(new Date(created).getTime() + 20000).toISOString(),
      to: spec.assignee,
      routedBy: spec.routedBy || 'rule',
      text: spec.routedByText || 'Назначен по правилу маршрутизации (категория → ответственный)'
    });

    const isFinal = (s) => s === 'done' || s === 'rejected' || s === 'closed';
    const path = spec.path;
    let firstResponseAt = null;
    let closedAt = null;
    let prev = 'new';
    for (let i = 1; i < path.length; i++) {
      const to = path[i];
      const at = spec.statusAt ? spec.statusAt[i] : new Date(new Date(created).getTime() + (i * 0.5 + 0.2) * DAY).toISOString();
      if (!firstResponseAt) firstResponseAt = at;
      const ev = { type: 'status', at, from: prev, to, by: spec.assignee };
      if (to === 'clarification') ev.text = spec.question || 'Требуется уточнение от автора';
      if (to === 'done') ev.text = spec.result || 'Решение принято и реализовано';
      if (to === 'rejected') ev.text = spec.result || 'Обращение отклонено';
      if (to === 'closed') ev.text = spec.result || 'Обращение закрыто';
      if (to === 'in_progress') ev.text = spec.progressNote || 'Взято в работу';
      events.push(ev);
      prev = to;
      if (isFinal(to)) closedAt = at;
    }

    // комментарии
    if (spec.comments) {
      for (const c of spec.comments) {
        events.push({
          type: 'comment',
          at: new Date(new Date(created).getTime() + c.daysAgo * DAY).toISOString(),
          text: c.text,
          internal: !!c.internal,
          by: c.by
        });
      }
    }
    // ответ автора
    if (spec.replies) {
      for (const r of spec.replies) {
        events.push({
          type: 'reply',
          at: new Date(new Date(created).getTime() + r.daysAgo * DAY).toISOString(),
          text: r.text,
          byAuthor: true
        });
      }
    }

    return {
      id: spec.id,
      type: spec.type,
      category: spec.category,
      title: spec.title,
      text: spec.text,
      solution: spec.solution || '',
      author: spec.author,
      anon: !!spec.anon,
      priority: spec.priority,
      status: path[path.length - 1],
      assignee: spec.assignee,
      routedBy: spec.routedBy || 'rule',
      nextAction: spec.nextAction || '',
      result: spec.result || '',
      public: !!spec.public,
      order: spec.order || 0,
      createdAt: created,
      dueAt,
      firstResponseAt,
      closedAt,
      attachments: spec.attachments || [],
      events
    };
  }

  const tickets = [];

  // A-001 Новое
  tickets.push(buildTicket({
    id: 'A-001', type: 'Проблема', category: 'Межотдельное взаимодействие',
    author: 'Сотрудник закупок', priority: 'Средний', assignee: 'Руководитель закупок',
    title: 'В заявках на оборудование не хватает назначения и параметров',
    text: 'Заявки на поставку оборудования часто приходят без указания назначения и требуемых параметров. Из-за этого приходится уточнять детали у инициатора, что задерживает обработку. Предлагаю сделать обязательные поля в форме заявки.',
    path: ['new'], created: ago(0.2)
  }));

  // A-002 На рассмотрении
  tickets.push(buildTicket({
    id: 'A-002', type: 'Предложение', category: 'Информационная прозрачность',
    author: 'Сотрудник закупок', priority: 'Средний', assignee: 'Руководитель направления',
    title: 'Показывать поставщикам краткий статус проекта без коммерческих деталей',
    text: 'Поставщики часто спрашивают, на каком этапе их предложение. Было бы удобно показывать им краткий статус проекта без раскрытия коммерческих условий и других поставщиков.',
    solution: 'Добавить страницу статуса с обобщёнными этапами и сроками без сумм и контрагентов.',
    path: ['new', 'review'], created: ago(2),
    comments: [{ text: 'Принято к рассмотрению, изучим возможность.', internal: false, by: 'Руководитель направления', daysAgo: 1 }]
  }));

  // A-003 В работе, просрочено
  tickets.push(buildTicket({
    id: 'A-003', type: 'Проблема', category: 'Каталог и данные',
    author: 'Сотрудник проектирования', priority: 'Высокий', assignee: 'Ответственный за номенклатуру',
    title: 'Разные обозначения одного изделия в каталоге',
    text: 'Одно и то же изделие встречается под разными обозначениями в разных разделах каталога. Это приводит к ошибкам в спецификациях и дублированию заказов.',
    solution: 'Ввести единый справочник обозначений и проверить каталог на дубли.',
    path: ['new', 'review', 'in_progress'], created: ago(10),
    progressNote: 'Начата нормализация справочника, проверяем дубликаты'
  }));

  // A-004 Реализовано, public=true
  tickets.push(buildTicket({
    id: 'A-004', type: 'Предложение', category: 'Обучение',
    author: 'Сотрудник закупок', priority: 'Низкий', assignee: 'Ответственный за обучение',
    title: 'Короткие занятия по новым товарным линейкам',
    text: 'При появлении новых товарных линеек сотрудникам сложно быстро в них разобраться. Предлагаю короткие вводные занятия по 20–30 минут.',
    solution: 'Запланировать ежемесячные короткие сессии по новым линейкам.',
    path: ['new', 'review', 'in_progress', 'done'], created: ago(20),
    result: 'Организованы ежемесячные 30-минутные сессии по новым линейкам, первая прошла с участием 12 сотрудников.',
    public: true
  }));

  // A-005 Ожидает уточнения
  tickets.push(buildTicket({
    id: 'A-005', type: 'Проблема', category: 'Документооборот',
    author: 'Сотрудник бухгалтерии', priority: 'Средний', assignee: 'Руководитель бухгалтерии',
    title: 'Непонятно, на каком этапе пакет документов',
    text: 'При передаче пакета документов между подразделениями не видно, на каком этапе он находится и кто текущий держатель. Это вызывает дублирующие запросы и задержки.',
    path: ['new', 'review', 'clarification'], created: ago(4),
    question: 'Уточните, пожалуйста, о каких именно пакетах документов идёт речь: договорные, закрывающие или внутренние? И на каком этапе чаще всего теряется видимость?'
  }));

  // A-006 На рассмотрении
  tickets.push(buildTicket({
    id: 'A-006', type: 'Предложение', category: 'Регламенты',
    author: 'Сотрудник бухгалтерии', priority: 'Средний', assignee: 'Ответственный за процессы',
    title: 'Памятка для операций с участием нескольких подразделений',
    text: 'Для операций, где задействовано несколько подразделений, нет единой памятки по порядку действий. Предлагаю подготовить короткий чек-лист для типовых операций.',
    solution: 'Составить чек-листы для 5–7 типовых межотдельных операций.',
    path: ['new', 'review'], created: ago(3)
  }));

  // A-007 Новое, просрочено (Высокий, 3 дня, создано 5 дней назад)
  tickets.push(buildTicket({
    id: 'A-007', type: 'Проблема', category: 'Интеграции и IT',
    author: 'Сотрудник бухгалтерии', priority: 'Высокий', assignee: 'IT-специалист',
    title: 'Повторный ввод данных в разных системах',
    text: 'Одни и те же данные приходится вводить в нескольких системах: учётной, складской и отчётной. Это занимает время и порождает расхождения. Нужна интеграция или единый ввод.',
    path: ['new'], created: ago(5)
  }));

  // A-008 Реализовано, public=true
  tickets.push(buildTicket({
    id: 'A-008', type: 'Предложение', category: 'Знания и наставничество',
    author: 'Сотрудник бухгалтерии', priority: 'Низкий', assignee: 'Руководитель подразделения',
    title: 'Памятка по типовым ошибкам для новичков',
    text: 'Новички повторяют одни и те же ошибки при оформлении документов. Памятка с типовыми ошибками и правильными примерами сэкономит время наставников.',
    solution: 'Собрать топ-10 ошибок за квартал и оформить памятку.',
    path: ['new', 'review', 'in_progress', 'done'], created: ago(30),
    result: 'Памятка подготовлена и размещена в базе знаний, используется при адаптации новых сотрудников.',
    public: true
  }));

  // A-009 В работе
  tickets.push(buildTicket({
    id: 'A-009', type: 'Проблема', category: 'Договорная работа',
    author: 'Менеджер по продажам', priority: 'Высокий', assignee: 'Ответственный за договоры',
    title: 'Неясно, кто готовит и проверяет приложение к договору',
    text: 'При подготовке приложения к договору не определено, кто отвечает за его составление и кто за проверку. Из-за этого случаются задержки и ошибки в формулировках.',
    solution: 'Зафиксировать зоны ответственности в регламенте договорной работы.',
    path: ['new', 'review', 'in_progress'], created: ago(4),
    progressNote: 'Готовим обновление регламента, согласуем с юристами'
  }));

  // A-010 На рассмотрении
  tickets.push(buildTicket({
    id: 'A-010', type: 'Предложение', category: 'Задачи и коммуникации',
    author: 'Менеджер по продажам', priority: 'Средний', assignee: 'Руководитель продаж',
    title: 'Не закрывать задачу до подтверждения результата заказчиком',
    text: 'Задачи часто закрываются до того, как заказчик подтвердит результат. Предлагаю ввести обязательное подтверждение результата заказчиком перед закрытием.',
    solution: 'Добавить шаг подтверждения в процесс закрытия задачи.',
    path: ['new', 'review'], created: ago(2)
  }));

  // A-011 Новое, просрочено
  tickets.push(buildTicket({
    id: 'A-011', type: 'Проблема', category: 'Оперативность',
    author: 'Менеджер по продажам', priority: 'Высокий', assignee: 'Руководитель направления',
    title: 'Сложно прогнозировать сроки ответа смежных подразделений',
    text: 'Смежные подразделения отвечают непредсказуемо по срокам, что мешает планировать и обещать клиентам. Нужны ориентиры по срокам ответа.',
    path: ['new'], created: ago(5)
  }));

  // A-012 На рассмотрении
  tickets.push(buildTicket({
    id: 'A-012', type: 'Предложение', category: 'Коммуникации',
    author: 'Менеджер по продажам', priority: 'Низкий', assignee: 'IT-специалист',
    title: 'Единое место для итоговых решений по задаче',
    text: 'Итоговые решения по задачам размазаны по перепискам и звонкам. Предлагаю единое место для фиксации решений, привязанное к задаче.',
    solution: 'Использовать раздел «Решения» в карточке задачи.',
    path: ['new', 'review'], created: ago(3)
  }));

  // A-013 Ожидает уточнения
  tickets.push(buildTicket({
    id: 'A-013', type: 'Проблема', category: 'Проектная деятельность',
    author: 'Координатор проекта', priority: 'Средний', assignee: 'Руководитель проектов',
    title: 'Не видно, какие строки спецификации пересмотрены',
    text: 'При пересмотре спецификации не фиксируется, какие именно строки изменились. Это усложняет контроль и согласование изменений.',
    path: ['new', 'review', 'clarification'], created: ago(6),
    question: 'Уточните, в каком формате вы ведёте спецификации сейчас: Excel, САПР или другая система? И кто обычно инициирует пересмотр?'
  }));

  // A-014 На рассмотрении
  tickets.push(buildTicket({
    id: 'A-014', type: 'Предложение', category: 'Планирование ресурсов',
    author: 'Координатор проекта', priority: 'Средний', assignee: 'Руководитель проектирования',
    title: 'Показывать укрупнённо загрузку проектной группы',
    text: 'Загрузка проектной группы видна только по отдельным людям, а не по команде. Предлагаю сводный вид загрузки по группе.',
    solution: 'Добавить дашборд загрузки с группировкой по проектной группе.',
    path: ['new', 'review'], created: ago(2)
  }));

  // A-015 В работе
  tickets.push(buildTicket({
    id: 'A-015', type: 'Проблема', category: 'Постановка задач',
    author: 'Руководитель проекта', priority: 'Средний', assignee: 'Руководитель направления',
    title: 'Поручения без результата и даты завершения',
    text: 'Часть поручений фиксируется без ожидаемого результата и даты завершения. Из-за этого нельзя отследить исполнение и сроки.',
    solution: 'Сделать обязательными поля результата и даты при постановке поручения.',
    path: ['new', 'review', 'in_progress'], created: ago(5),
    progressNote: 'Готовим шаблон поручения с обязательными полями'
  }));

  // A-016 Новое
  tickets.push(buildTicket({
    id: 'A-016', type: 'Предложение', category: 'Обучение',
    author: 'Руководитель проекта', priority: 'Низкий', assignee: 'Ответственный за обучение',
    title: 'Практические демонстрации оборудования для новичков',
    text: 'Новичкам полезно видеть оборудование в работе, а не только на схемах. Предлагаю короткие практические демонстрации при адаптации.',
    solution: 'Включить демонстрацию в программу адаптации.',
    path: ['new'], created: ago(1)
  }));

  // A-017 Отклонено
  tickets.push(buildTicket({
    id: 'A-017', type: 'Предложение', category: 'Корпоративная среда',
    author: 'Сотрудник офиса', priority: 'Низкий', assignee: 'Административный руководитель',
    title: 'Зона для коротких перерывов',
    text: 'Нет места, где можно сделать короткий перерыв в течение дня. Предлагаю организовать небольшую зону отдыха.',
    solution: 'Найти помещение под зону отдыха.',
    path: ['new', 'review', 'rejected'], created: ago(15),
    result: 'Отклонено: подходящего помещения нет. Вернёмся к идее при следующей перепланировке офиса.'
  }));

  // A-018 Закрыто
  tickets.push(buildTicket({
    id: 'A-018', type: 'Положительный отзыв', category: 'Корпоративная среда',
    author: 'Сотрудник офиса', priority: 'Низкий', assignee: 'HR / внутренние коммуникации',
    title: 'Польза внутренних учебных встреч',
    text: 'Внутренние учебные встречи оказались очень полезными: обмен опытом между подразделениями стал регулярнее, появилось взаимопонимание процессов.',
    path: ['new', 'review', 'in_progress', 'closed'], created: ago(25),
    result: 'Спасибо за отзыв! Рады, что формат полезен, продолжим серию встреч.'
  }));

  // A-019 На рассмотрении
  tickets.push(buildTicket({
    id: 'A-019', type: 'Предложение', category: 'Хранение документов',
    author: 'Координатор проекта', priority: 'Средний', assignee: 'Администратор документов',
    title: 'Единые правила именования и архивирования документов',
    text: 'Документы хранятся под разными именами и в разных местах. Предлагаю единые правила именования и архивирования.',
    solution: 'Утвердить регламент именования и настроить структуру архива.',
    path: ['new', 'review'], created: ago(3)
  }));

  // A-020 Новое
  tickets.push(buildTicket({
    id: 'A-020', type: 'Предложение', category: 'Прозрачность результатов',
    author: 'Сотрудник закупок', priority: 'Низкий', assignee: 'Руководитель подразделения',
    title: 'Публиковать обзор завершённых улучшений',
    text: 'Сотрудники не видят, какие улучшения уже реализованы по итогам обращений. Предлагаю публиковать периодический обзор.',
    solution: 'Выпускать ежеквартальный обзор реализованных улучшений.',
    path: ['new'], created: ago(0.5)
  }));

  // Дополнительные обращения-проблемы для повторяющихся проблем (A-021 … A-026)
  tickets.push(buildTicket({
    id: 'A-021', type: 'Проблема', category: 'Документооборот',
    author: 'Сотрудник закупок', priority: 'Средний', assignee: 'Руководитель бухгалтерии',
    title: 'Нет единого шаблона акта приёмки',
    text: 'Подрядчики присылают акты приёмки в произвольной форме, что затрудляет проверку и сверку. Нужен единый шаблон.',
    solution: 'Разработать и утвердить типовой шаблон акта приёмки.',
    path: ['new', 'review'], created: ago(8)
  }));

  tickets.push(buildTicket({
    id: 'A-022', type: 'Проблема', category: 'Документооборот',
    author: 'Менеджер по продажам', priority: 'Высокий', assignee: 'Руководитель бухгалтерии',
    title: 'Согласование закрывающих документов задерживает отгрузку',
    text: 'Согласование закрывающих документов занимает слишком много времени и задерживает отгрузку клиенту.',
    path: ['new', 'review', 'in_progress'], created: ago(9),
    progressNote: 'Проверяем узкие места в процессе согласования'
  }));

  tickets.push(buildTicket({
    id: 'A-023', type: 'Проблема', category: 'Каталог и данные',
    author: 'Сотрудник проектирования', priority: 'Средний', assignee: 'Ответственный за номенклатуру',
    title: 'Характеристики изделий указаны не полностью',
    text: 'В карточках изделий часто не хватает ключевых характеристик, приходится уточнять у поставщика, что задерживает проектирование.',
    solution: 'Дополнить обязательные поля в карточках изделий.',
    path: ['new', 'review'], created: ago(6)
  }));

  tickets.push(buildTicket({
    id: 'A-024', type: 'Проблема', category: 'Оперативность',
    author: 'Координатор проекта', priority: 'Высокий', assignee: 'Руководитель направления',
    title: 'Нет SLA на ответы смежных подразделений',
    text: 'Смежные подразделения не имеют зафиксированных сроков ответа, из-за чего сложно планировать проектные сроки.',
    path: ['new', 'review'], created: ago(7)
  }));

  tickets.push(buildTicket({
    id: 'A-025', type: 'Проблема', category: 'Договорная работа',
    author: 'Менеджер по продажам', priority: 'Средний', assignee: 'Ответственный за договоры',
    title: 'Согласование допсоглашения затягивается',
    text: 'Согласование дополнительных соглашений проходит через слишком много согласующих, что затягивает процесс на недели.',
    path: ['new', 'review', 'clarification'], created: ago(6),
    question: 'Уточните, на каком этапе чаще всего возникает задержка: у юристов, у руководства или у контрагента?'
  }));

  tickets.push(buildTicket({
    id: 'A-026', type: 'Проблема', category: 'Договорная работа',
    author: 'Сотрудник закупок', priority: 'Низкий', assignee: 'Ответственный за договоры',
    title: 'Формы договоров рассыпаны по папкам',
    text: 'Актуальные шаблоны договоров хранятся в разных папках и версиях, сложно понять, какой текущий.',
    path: ['new'], created: ago(2)
  }));

  // Присвоим order внутри колонок
  const statusOrder = ['new', 'review', 'clarification', 'in_progress', 'done', 'rejected', 'closed'];
  const byStatus = {};
  for (const t of tickets) (byStatus[t.status] = byStatus[t.status] || []).push(t);
  for (const s of statusOrder) {
    const arr = byStatus[s] || [];
    arr.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    arr.forEach((t, i) => { t.order = i; });
  }

  window.SignalSeed = {
    tickets,
    categories,
    assignees,
    users,
    settings,
    depts: DEPTS,
    notifications: [],
    registeredUsers: []
  };
})();
