/* ============================================================
   Life Dashboard — dashboard.js
   Navigation: Month → Week → Day → Block (popup)
   All rendering from window.STATE
   ============================================================ */

(function () {
  'use strict';

  /* ---- Helpers ---- */
  const $ = id => document.getElementById(id);
  const el = (tag, cls, html) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  };

  const STATUS_LABELS = {
    done:        'Выполнен',
    in_progress: 'В процессе',
    planned:     'Запланирован',
    off:         'Выходной',
    not_planned: 'Не запланирован',
  };

  const EVENT_ICONS = {
    training: '🏋️',
    rest:     '☕',
    food:     '🍽️',
    meeting:  '👥',
    other:    '📍',
  };

  function statusBadge(status) {
    return `<span class="status-badge ${status}">${STATUS_LABELS[status] || status}</span>`;
  }

  function statusDot(status) {
    return `<span class="status-dot ${status}"></span>`;
  }

  function energyColor(v) {
    if (v >= 8) return '#7bbfa5';
    if (v >= 5) return '#c9973a';
    return '#d98080';
  }

  /* ---- State ---- */
  /* global STATE */
  const S = typeof STATE !== 'undefined' ? STATE : window.STATE;
  let currentView = 'month';

  /* ---- Views ---- */
  const views = ['view-month', 'view-week', 'view-day'];

  function showView(id) {
    views.forEach(v => $(v).classList.add('hidden'));
    $(id).classList.remove('hidden');
    currentView = id;
    updateBreadcrumb();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ---- Breadcrumb ---- */
  function updateBreadcrumb() {
    const bc = $('breadcrumb');
    const parts = [];

    if (currentView === 'view-month') {
      parts.push(`<span>📅 ${monthName(S.month.period)}</span>`);
    } else if (currentView === 'view-week') {
      parts.push(`<span class="bc-link" data-nav="month">📅 ${monthName(S.month.period)}</span>`);
      parts.push(`<span class="bc-sep">›</span>`);
      parts.push(`<span>Неделя ${S.week.number}</span>`);
    } else if (currentView === 'view-day') {
      parts.push(`<span class="bc-link" data-nav="month">📅 ${monthName(S.month.period)}</span>`);
      parts.push(`<span class="bc-sep">›</span>`);
      parts.push(`<span class="bc-link" data-nav="week">Неделя ${S.week.number}</span>`);
      parts.push(`<span class="bc-sep">›</span>`);
      parts.push(`<span>${formatDate(S.today.date)}</span>`);
    }

    bc.innerHTML = parts.join(' ');
    bc.querySelectorAll('[data-nav]').forEach(link => {
      link.addEventListener('click', () => {
        const target = link.dataset.nav;
        if (target === 'month') showView('view-month');
        if (target === 'week') showView('view-week');
      });
    });
  }

  /* ---- MONTH VIEW ---- */
  function renderMonth() {
    const v = $('view-month');
    v.innerHTML = '';

    const header = el('div', 'view-header');
    header.innerHTML = `
      <h1 class="month-title">📅 ${monthName(S.month.period)}</h1>
      <div class="focus-tag">🎯 ${S.month.focus}</div>
    `;
    v.appendChild(header);

    const sectionLabel = el('div', 'section-label', 'НЕДЕЛИ МЕСЯЦА');
    v.appendChild(sectionLabel);

    const grid = el('div', 'cards-grid');
    S.month.weeks.forEach(week => {
      const card = el('div', 'card clickable');
      card.innerHTML = `
        <div class="card-row">
          ${statusDot(week.status)}
          <span class="card-week-num">Неделя ${week.number}</span>
          <span style="margin-left:auto">${statusBadge(week.status)}</span>
        </div>
        <div class="card-dates">${week.dates}</div>
        <div class="card-focus">${week.focus}</div>
      `;
      card.addEventListener('click', () => {
        showView('view-week');
      });
      grid.appendChild(card);
    });
    v.appendChild(grid);

    // Backlog preview
    if (S.tasks_backlog && S.tasks_backlog.length) {
      const bl = el('div', 'section-label', 'БЭКЛОГ ЗАДАЧ');
      bl.style.marginTop = '36px';
      v.appendChild(bl);
      renderBacklog(v);
    }
  }

  /* ---- WEEK VIEW ---- */
  function renderWeek() {
    const v = $('view-week');
    v.innerHTML = '';

    const backBtn = el('button', 'btn-back', '← Назад к месяцу');
    backBtn.addEventListener('click', () => showView('view-month'));
    v.appendChild(backBtn);

    const header = el('div', 'view-header');
    header.innerHTML = `
      <h1>Неделя ${S.week.number}</h1>
      <div class="focus-tag">🎯 ${S.week.focus}</div>
    `;
    v.appendChild(header);

    const sectionLabel = el('div', 'section-label', 'ДНИ НЕДЕЛИ');
    v.appendChild(sectionLabel);

    const grid = el('div', 'cards-grid-days');
    S.week.days.forEach(day => {
      const isToday = day.date === S.today.date;
      const card = el('div', 'card clickable');
      if (isToday) card.style.outline = `2px solid var(--accent)`;

      const dayLabel = formatDate(day.date);
      const blocksText = day.blocks_planned > 0
        ? `${day.blocks_planned} блок${pluralBlocks(day.blocks_planned)}`
        : 'Без блоков';

      card.innerHTML = `
        <div class="day-label">${day.day}${isToday ? ' — сегодня' : ''}</div>
        <div class="day-date">${dayLabel}</div>
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px">
          ${statusDot(day.status)}
          ${statusBadge(day.status)}
        </div>
        <div class="card-focus" style="margin-bottom:8px">${day.focus}</div>
        <div class="day-blocks">📦 ${blocksText}</div>
      `;

      card.addEventListener('click', () => {
        if (day.date === S.today.date) {
          showView('view-day');
        } else {
          // For non-today days, show today view (only today's data available)
          showView('view-day');
        }
      });

      grid.appendChild(card);
    });
    v.appendChild(grid);
  }

  /* ---- DAY VIEW ---- */
  function renderDay() {
    const v = $('view-day');
    v.innerHTML = '';

    const backBtn = el('button', 'btn-back', '← Назад к неделе');
    backBtn.addEventListener('click', () => showView('view-week'));
    v.appendChild(backBtn);

    const t = S.today;

    // Header
    const header = el('div', 'day-view-header');
    header.innerHTML = `
      <div>
        <span class="day-big-date">${formatDateFull(t.date)}</span>
        <span class="day-dow">${t.day_of_week}</span>
      </div>
      <div class="focus-tag" style="margin-top:10px">🎯 ${t.focus}</div>
    `;
    v.appendChild(header);

    // Vitals
    v.appendChild(el('div', 'section-label', 'ВИТАЛЬНЫЕ'));
    v.appendChild(renderVitals(t));

    // Timeline
    v.appendChild(el('div', 'section-label', 'РАСПИСАНИЕ ДНЯ'));
    v.appendChild(renderTimeline(t));

    // Meals
    if (t.meals && t.meals.length) {
      v.appendChild(el('div', 'section-label', 'ЕДА'));
      v.appendChild(renderMeals(t.meals));
    }

    // Stats
    const statsRow = el('div', 'stats-row');
    if (t.total_work_hours) {
      statsRow.innerHTML += `<div class="stat-chip">⏱ Рабочих часов: <strong>${t.total_work_hours}</strong></div>`;
    }
    if (t.blocks && t.blocks.length) {
      const done = t.blocks.filter(b => b.status === 'done').length;
      statsRow.innerHTML += `<div class="stat-chip">✅ Блоков выполнено: <strong>${done} / ${t.blocks.length}</strong></div>`;
    }
    if (statsRow.innerHTML) v.appendChild(statsRow);

    // Summary
    if (t.day_summary) {
      const box = el('div', 'day-summary-box');
      box.innerHTML = `<div class="summary-label">📝 Итог дня</div>${t.day_summary}`;
      v.appendChild(box);
    }
    if (t.day_insight) {
      const box = el('div', 'day-summary-box');
      box.style.background = 'var(--mint-soft)';
      box.style.borderColor = '#8ecbb5';
      box.innerHTML = `<div class="summary-label" style="color:var(--mint)">💡 Инсайт</div>${t.day_insight}`;
      v.appendChild(box);
    }
  }

  /* ---- Vitals ---- */
  function renderVitals(t) {
    const vt = t.vitals;
    const tr = t.training;
    const grid = el('div', 'vitals-grid');

    // Sleep
    grid.appendChild(vitalCard('💤', 'Сон', `${vt.sleep_hours} ч`));
    // Energy
    const ec = el('div', 'vital-card');
    const energyPct = (vt.energy / 10) * 100;
    ec.innerHTML = `
      <div class="vital-icon">⚡</div>
      <div class="vital-label">Энергия</div>
      <div class="vital-value">${vt.energy} / 10</div>
      <div class="energy-bar-wrap">
        <div class="energy-bar" style="width:${energyPct}%;background:${energyColor(vt.energy)}"></div>
      </div>
    `;
    grid.appendChild(ec);
    // Water
    grid.appendChild(vitalCard('💧', 'Вода', `${vt.water_glasses} ст.`));
    // Coffee
    grid.appendChild(vitalCard('☕', 'Кофе', `${vt.coffee}`));
    // Mood
    grid.appendChild(vitalCard('😊', 'Настроение', vt.mood || '—'));

    // Training
    if (tr && tr.done) {
      const tc = el('div', 'vital-card has-tooltip');
      let tooltipLines = [];
      if (tr.muscle_group) tooltipLines.push(`Мышцы: ${tr.muscle_group}`);
      if (tr.intensity)    tooltipLines.push(`Интенсивность: ${tr.intensity}`);
      if (tr.with_whom)    tooltipLines.push(`С кем: ${tr.with_whom}`);
      if (tr.notes)        tooltipLines.push(`«${tr.notes}»`);
      const tooltipHtml = tooltipLines.length
        ? `<div class="tooltip">${tooltipLines.join('<br>')}</div>` : '';
      tc.innerHTML = `
        <div class="vital-icon">🏋️</div>
        <div class="vital-label">Тренировка</div>
        <div class="vital-value">${tr.type}</div>
        <div style="font-size:12px;color:var(--text-2);margin-top:2px">${tr.duration_min} мин · ${tr.time}</div>
        ${tooltipHtml}
      `;
      grid.appendChild(tc);
    } else if (tr && !tr.done) {
      grid.appendChild(vitalCard('🏋️', 'Тренировка', 'Нет'));
    }

    return grid;
  }

  function vitalCard(icon, label, value) {
    const c = el('div', 'vital-card');
    c.innerHTML = `
      <div class="vital-icon">${icon}</div>
      <div class="vital-label">${label}</div>
      <div class="vital-value">${value}</div>
    `;
    return c;
  }

  /* ---- Timeline ---- */
  function renderTimeline(t) {
    const wrap = el('div', 'timeline');
    wrap.innerHTML = `<div class="timeline-axis"></div>`;

    // Merge blocks + other_events, sort by time
    const items = [];

    (t.blocks || []).forEach(b => {
      items.push({ type: 'block', time: b.time_start, data: b });
    });
    (t.other_events || []).forEach(e => {
      items.push({ type: 'event', time: e.time, data: e });
    });

    items.sort((a, b) => a.time.localeCompare(b.time));

    items.forEach(item => {
      const row = el('div', 'timeline-item');

      const timeEl = el('div', 'timeline-time', item.time);
      row.appendChild(timeEl);

      if (item.type === 'block') {
        const b = item.data;
        const dot = el('div', `timeline-dot ${b.status}`);
        row.appendChild(dot);

        const card = el('div', `block-card ${b.status}`);
        card.innerHTML = `
          <div class="block-card-header">
            <span class="block-num">Блок ${b.number}</span>
            <span class="block-time">${b.time_start} – ${b.time_end}</span>
          </div>
          <div class="block-task">${b.task}</div>
          <div class="block-why">❓ ${b.why}</div>
          <div style="margin-top:8px;display:flex;align-items:center;gap:8px">
            ${statusBadge(b.status)}
            ${b.subtasks ? `<span style="font-size:12px;color:var(--text-3)">${b.subtasks.filter(s=>s.done).length}/${b.subtasks.length} подзадач</span>` : ''}
          </div>
        `;
        card.addEventListener('click', () => openBlockPopup(b));
        row.appendChild(card);
      } else {
        const e = item.data;
        const dot = el('div', 'timeline-dot event');
        row.appendChild(dot);

        const entry = el('div', 'event-entry');
        entry.innerHTML = `
          <span class="event-type-icon">${EVENT_ICONS[e.type] || '📍'}</span>
          <span>${e.event}</span>
        `;
        row.appendChild(entry);
      }

      wrap.appendChild(row);
    });

    return wrap;
  }

  /* ---- Meals ---- */
  function renderMeals(meals) {
    const list = el('div', 'meals-list');
    meals.forEach(m => {
      const chip = el('div', 'meal-chip');
      chip.innerHTML = `<span class="meal-time">${m.time}</span><span>${m.what}</span>`;
      list.appendChild(chip);
    });
    return list;
  }

  /* ---- Backlog ---- */
  function renderBacklog(container) {
    const list = el('div', 'backlog-list');
    S.tasks_backlog.forEach(task => {
      const card = el('div', 'backlog-card');
      const done  = task.stages.filter(s => s.done).length;
      const total = task.stages.length;
      const pct   = total ? Math.round((done / total) * 100) : 0;

      const stagesHtml = task.stages.map(s =>
        `<span class="stage-chip ${s.done ? 'done-stage' : 'pending-stage'}">${s.done ? '✓' : '○'} ${s.text}</span>`
      ).join('');

      const deadlineStr = task.deadline
        ? `📅 До ${formatDateFull(task.deadline)}`
        : '';

      card.innerHTML = `
        <div class="backlog-name">${task.name}</div>
        <div class="backlog-meta">${deadlineStr} · ${done}/${total} этапов (${pct}%)</div>
        <div class="backlog-meta" style="margin-bottom:8px;font-style:italic">❓ ${task.why}</div>
        <div class="backlog-stages">${stagesHtml}</div>
      `;
      list.appendChild(card);
    });
    container.appendChild(list);
  }

  /* ---- Block popup ---- */
  function openBlockPopup(b) {
    const popup = $('block-popup');
    const inner = popup.querySelector('.popup-inner');

    const subtasksHtml = (b.subtasks || []).map(s => `
      <li class="subtask-item ${s.done ? 'done-item' : ''}">
        <span class="check-box ${s.done ? 'checked' : ''}">${s.done ? '✓' : ''}</span>
        ${s.text}
      </li>
    `).join('');

    inner.innerHTML = `
      <button class="popup-close" id="popup-close-btn">✕</button>
      <div class="popup-block-num">Блок ${b.number}</div>
      <div class="popup-block-time">🕐 ${b.time_start} – ${b.time_end}</div>
      <div class="popup-task">📌 ${b.task}</div>
      <div class="popup-why">❓ <em>${b.why}</em></div>
      ${b.subtasks && b.subtasks.length ? `
        <div class="popup-section-title">📋 Декомпозиция</div>
        <ul class="subtask-list">${subtasksHtml}</ul>
      ` : ''}
      <div style="margin-top:14px;display:flex;align-items:center;gap:8px">
        ${statusBadge(b.status)}
      </div>
      ${b.result ? `
        <div class="popup-section-title">📝 Результат</div>
        <div class="popup-result">${b.result}</div>
      ` : ''}
      ${b.energy_after !== null && b.energy_after !== undefined ? `
        <div class="popup-section-title">⚡ Энергия после</div>
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-size:20px;font-weight:700;color:${energyColor(b.energy_after)}">${b.energy_after}</span>
          <span style="font-size:12px;color:var(--text-3)">/ 10</span>
        </div>
      ` : ''}
      ${b.artifact ? `
        <div class="popup-section-title">📎 Артефакт</div>
        <div class="popup-notes">${b.artifact}</div>
      ` : ''}
      ${b.notes ? `
        <div class="popup-section-title">💬 Заметки</div>
        <div class="popup-notes">${b.notes}</div>
      ` : ''}
    `;

    popup.classList.remove('hidden');

    $('popup-close-btn').addEventListener('click', closePopup);
  }

  function closePopup() {
    $('block-popup').classList.add('hidden');
  }

  /* ---- Date helpers ---- */
  const MONTHS_RU = [
    'января','февраля','марта','апреля','мая','июня',
    'июля','августа','сентября','октября','ноября','декабря'
  ];
  const MONTHS_TITLE = [
    'Январь','Февраль','Март','Апрель','Май','Июнь',
    'Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'
  ];

  function monthName(period) {
    const [yr, mo] = period.split('-').map(Number);
    return `${MONTHS_TITLE[mo - 1]} ${yr}`;
  }

  function formatDate(dateStr) {
    const parts = dateStr.split('-').map(Number);
    const mo = parts[1];
    const d = parts[2];
    return `${d} ${MONTHS_RU[mo - 1].slice(0, 3)}.`;
  }

  function formatDateFull(dateStr) {
    const [yr, mo, d] = dateStr.split('-').map(Number);
    return `${d} ${MONTHS_RU[mo - 1]} ${yr}`;
  }

  function pluralBlocks(n) {
    if (n === 1) return '';
    if (n >= 2 && n <= 4) return 'а';
    return 'ов';
  }

  /* ---- Init ---- */
  function init() {
    renderMonth();
    renderWeek();
    renderDay();

    // Popup close on backdrop click
    $('block-popup').addEventListener('click', function (e) {
      if (e.target === this) closePopup();
    });

    // Close on Escape
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') closePopup();
    });

    // Start on month view (or jump to today's day if current date matches)
    showView('view-month');
  }

  document.addEventListener('DOMContentLoaded', init);
})();
