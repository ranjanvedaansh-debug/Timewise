window.Pages = window.Pages || {};

(function() {
  const {$: $, $$: $$, esc: esc} = UI;
  let clockTimer = null;
  const QUOTES = [ [ 'Lost time is never found again.', 'Benjamin Franklin' ], [ 'The key is not to prioritize what’s on your schedule, but to schedule your priorities.', 'Stephen Covey' ], [ 'Well begun is half done.', 'Aristotle' ], [ 'It does not matter how slowly you go as long as you do not stop.', 'Confucius' ], [ 'Action is the foundational key to all success.', 'Pablo Picasso' ], [ 'You may delay, but time will not.', 'Benjamin Franklin' ], [ 'Small deeds done are better than great deeds planned.', 'Peter Marshall' ], [ 'The secret of getting ahead is getting started.', 'Mark Twain' ], [ 'Do what you can, with what you have, where you are.', 'Theodore Roosevelt' ], [ 'Time is what we want most, but what we use worst.', 'William Penn' ] ];
  // Blocks that are "time around" the real activities: shown quietly, never marked Now/Next.
  const QUIET = [ 'rest', 'break' ];
  const nowMin = () => {
    const n = new Date;
    return n.getHours() * 60 + n.getMinutes();
  };
  const S = b => Store.toMin(b.start), E = b => Store.toMin(b.end);
  const range = b => UI.fmtTime(b.start) + ' – ' + UI.fmtTime(b.end);

  function greeting() {
    const h = (new Date).getHours();
    return h < 12 ? t('good_morning') : h < 17 ? t('good_afternoon') : t('good_evening');
  }

  // Today's day from the active schedule. If today isn't in the plan, fall back to the
  // same weekday (marked `reused` so the UI can say so instead of pretending it's today's).
  function todayBlocks() {
    const s = Store.activeSchedule();
    if (!s) return null;
    const day = s.days.find(d => d.date === Store.dateKey());
    if (day) return { s: s, day: day };
    const dow = (new Date).getDay();
    const same = s.days.find(d => Store.parseDate(d.date).getDay() === dow);
    return same ? { s: s, day: same, reused: true } : { s: s, day: null };
  }

  // Works out which block is happening now and which real activity is next.
  function dayState(day) {
    const blocks = day.blocks.slice().sort((a, b) => S(a) - S(b));
    const m = nowMin();
    const active = blocks.filter(b => S(b) <= m && E(b) > m);
    const now = active.find(b => !QUIET.includes(b.category)) || active[0] || null;
    const next = blocks.find(b => S(b) > m && !QUIET.includes(b.category)) || null;
    return { blocks: blocks, m: m, now: now, next: next };
  }

  // ---------- Today header ----------
  function summary(d, tb) {
    const today = Store.dateKey();
    const open = d.tasks.filter(x => !x.done);
    const due = open.filter(x => x.due === today).length;
    const overdue = open.filter(x => x.due && x.due < today).length;
    const habitsDone = d.habits.filter(h => (h.log || {})[today]).length;
    const focus = d.focusLog.filter(x => Store.dateKey(new Date(x.at)) === today).reduce((s, x) => s + x.minutes, 0);
    const items = [];
    if (overdue) items.push('<span class="warn">' + icon('alert', 'sm') + t('sum_overdue', { n: overdue }) + '</span>');
    if (due) items.push('<span>' + icon('checksq', 'sm') + t('sum_due', { n: due }) + '</span>');
    if (d.habits.length) items.push('<span>' + icon('flame', 'sm') + t('sum_habits', { d: habitsDone, n: d.habits.length }) + '</span>');
    if (focus) items.push('<span>' + icon('timer', 'sm') + t('sum_focus', { m: UI.fmtMinutes(focus) }) + '</span>');
    const nx = tb && tb.day && !tb.reused ? dayState(tb.day).next : null;
    if (nx) items.push('<span>' + icon('clock', 'sm') + t('sum_next', { x: esc(nx.title), t: UI.fmtTime(nx.start) }) + '</span>');
    return items.length ? items.join('') : '<span>' + t(tb && tb.day ? 'sum_clear' : 'sum_empty') + '</span>';
  }

  function ribbonGeometry(blocks) {
    const r0 = Math.min(...blocks.map(S)), r1 = Math.max(...blocks.map(E));
    return { r0: r0, r1: r1, pct: m => Math.max(0, Math.min(100, (m - r0) / (r1 - r0) * 100)) };
  }

  function ribbonScaleMid(g, m) {
    if (m < g.r0) return t('day_ahead', { t: UI.fmtTime(Store.toTime(g.r0)) });
    if (m >= g.r1) return t('day_over');
    return t('day_left', { t: '<b>' + UI.fmtMinutes(g.r1 - m) + '</b>' });
  }

  function ribbon(tb) {
    if (!tb || !tb.day || !tb.day.blocks.length) return '';
    const st = dayState(tb.day);
    const g = ribbonGeometry(st.blocks);
    if (g.r1 <= g.r0) return '';
    const segs = st.blocks.map(b => {
      const cls = (b.category === 'rest' ? ' is-rest' : b.category === 'break' ? ' is-break' : '') + (b.done ? ' is-done' : '');
      return '<span class="seg' + cls + '" title="' + esc(range(b) + '  ' + b.title) + '" style="--cat:' + UI.catColor(b.category) + ';left:' + g.pct(S(b)).toFixed(2) + '%;width:' + (g.pct(E(b)) - g.pct(S(b))).toFixed(2) + '%"></span>';
    }).join('');
    const inDay = st.m >= g.r0 && st.m <= g.r1;
    const passed = Math.round(g.pct(st.m));
    return '<div class="ribbon-wrap"><div class="ribbon" id="dRibbon" role="img" aria-label="' + esc(t('ribbon_lbl', { p: passed })) + '" data-r0="' + g.r0 + '" data-r1="' + g.r1 + '">' + segs + '<span class="past" style="width:' + passed + '%"></span>' + (inDay ? '<span class="needle" style="left:' + g.pct(st.m).toFixed(2) + '%"></span>' : '') + '</div>' + '<div class="ribbon-scale"><span>' + UI.fmtTime(Store.toTime(g.r0)) + '</span><span id="dRibbonMid">' + ribbonScaleMid(g, st.m) + '</span><span>' + UI.fmtTime(Store.toTime(Math.min(g.r1, 1439))) + '</span></div></div>';
  }

  function header(p, d, tb) {
    const hasPlan = !!(tb && tb.day);
    return '<section class="today" aria-labelledby="dHello"><div class="today-top"><div>' + '<div class="today-date" id="dDate"></div>' + '<h1 id="dHello">' + greeting() + ', ' + esc(p.name) + '</h1>' + '<div class="today-sum">' + summary(d, tb) + '</div></div>' + '<div class="today-clock" id="dClock" aria-live="off"></div></div>' + ribbon(tb) + '<div class="today-actions">' + (hasPlan ? '<a class="btn primary" href="#/focus">' + icon('timer', 'sm') + t('start_focus') + '</a><a class="btn" href="#/schedule">' + icon('calendar', 'sm') + t('open_schedule') + '</a>' : '<a class="btn primary" href="#/planner">' + icon('sparkles', 'sm') + t('create_with_ai') + '</a><a class="btn" href="#/focus">' + icon('timer', 'sm') + t('start_focus') + '</a>') + '</div></section>';
  }

  // ---------- Today's plan (agenda) ----------
  function agRow(o) {
    return '<li class="ag-row ' + (o.cls || '') + '"><span class="ag-time">' + (o.time || '') + '</span>' + '<span class="ag-rail"><i class="ag-dot" style="--cat:' + (o.cat ? UI.catColor(o.cat) : 'var(--surface-3)') + '"></i></span>' + '<div class="ag-body"><div class="ag-title">' + o.title + (o.tags || '') + '</div>' + (o.meta ? '<div class="ag-meta">' + o.meta + '</div>' : '') + (o.extra || '') + '</div>' + (o.action || '<span></span>') + '</li>';
  }
  const tag = (txt, cls) => '<span class="ag-tag ' + (cls || '') + '">' + txt + '</span>';

  function scheduleCard(tb) {
    const head = link => '<div class="card"><div class="card-head"><h2>' + icon('calendar') + t('todays_plan') + '</h2>' + link + '</div>';
    if (!tb) return head('') + UI.empty('sparkles', t('no_schedule_yet'), '<a class="btn primary" href="#/planner">' + icon('sparkles', 'sm') + t('create_with_ai') + '</a>') + '</div>';
    if (!tb.day) return head('<a class="link" href="#/schedule">' + t('open') + '</a>') + UI.empty('calendar', t('no_blocks_today') + ' ' + t('plan_covers', { a: UI.fmtDate(tb.s.days[0].date), b: UI.fmtDate(tb.s.days[tb.s.days.length - 1].date) }), '<a class="btn primary" href="#/planner">' + icon('sparkles', 'sm') + t('make_new_plan') + '</a>') + '</div>';
    if (!tb.day.blocks.length) return head('<a class="link" href="#/schedule">' + t('open') + '</a>') + UI.empty('calendar', t('no_blocks_today'), '<a class="btn" href="#/schedule">' + icon('plus', 'sm') + t('add_block') + '</a>') + '</div>';

    const st = dayState(tb.day), m = st.m, blocks = st.blocks;
    // Keep the most recent finished block for context; summarise the rest.
    let firstShown = blocks.findIndex(b => E(b) > m);
    const dayOver = firstShown < 0;
    if (dayOver) firstShown = Math.max(0, blocks.length - 3); else firstShown = Math.max(0, firstShown - 1);
    const hidden = blocks.slice(0, firstShown);
    const shown = blocks.slice(firstShown, firstShown + 9);

    let html = head('<a class="link" href="#/schedule">' + t('view_full') + '</a>');
    if (tb.reused) html += '<p class="ag-note">' + t('reused_note', { day: UI.weekday(tb.day.date), date: UI.fmtDate(tb.day.date, { month: 'long', day: 'numeric' }) }) + '</p>';
    if (hidden.length) html += '<p class="ag-earlier">' + t('earlier_blocks', { n: hidden.length, d: hidden.filter(b => b.done).length }) + '</p>';

    const rows = [];
    let maxEnd = hidden.length ? Math.max(...hidden.map(E)) : null;
    shown.forEach(b => {
      const s = S(b), e = E(b), len = e - s;
      if (maxEnd !== null && s - maxEnd >= 15) rows.push(agRow({ cls: 'is-gap', time: UI.fmtTime(Store.toTime(maxEnd)), title: t('open_time'), tags: tag(UI.fmtMinutes(s - maxEnd)) }));
      const overlaps = maxEnd !== null && s < maxEnd;
      maxEnd = Math.max(maxEnd === null ? e : maxEnd, e);
      if (b.category === 'rest') {
        rows.push(agRow({ cls: 'is-gap', time: UI.fmtTime(b.start), cat: b.category, title: esc(b.title), tags: tag(UI.fmtMinutes(len)) + (overlaps ? tag(t('overlaps'), 'ag-warn') : '') }));
        return;
      }
      const isNow = b === st.now, isNext = b === st.next, past = e <= m;
      let tags = '', extra = '';
      if (isNow) {
        tags += tag(t('now_lbl') + ' · ' + t('ends_in', { m: UI.fmtMinutes(e - m) }));
        extra = '<div class="ag-progress" aria-hidden="true"><i style="width:' + Math.round((m - s) / len * 100) + '%"></i></div>';
      } else if (isNext) tags += tag(t('next_lbl') + ' · ' + t('in_x', { m: UI.fmtMinutes(s - m) }));
      if (b.done) tags += '<span class="sr-only">' + t('done_lbl') + '</span>';
      if (overlaps) tags += tag(t('overlaps'), 'ag-warn');
      const cls = [ isNow ? 'is-now' : '', isNext ? 'is-next' : '', b.done ? 'is-done' : '', b.category === 'break' ? 'is-break' : '', past ? 'is-past' : '' ].join(' ');
      const action = tb.reused || b.category === 'break' ? '' : '<button class="check ' + (b.done ? 'on' : '') + '" data-bdone="' + b.id + '" aria-pressed="' + !!b.done + '" aria-label="' + esc(t('toggle_done') + ': ' + b.title) + '">' + icon('check') + '</button>';
      rows.push(agRow({ cls: cls, time: UI.fmtTime(b.start), cat: b.category, title: esc(b.title), tags: tags, meta: range(b) + ', ' + t('cat_' + b.category), extra: extra, action: action }));
    });
    html += '<ol class="agenda">' + rows.join('') + '</ol>';
    if (dayOver) html += '<p class="muted small mt">' + t('day_done') + '</p>';
    else if (blocks.length > firstShown + shown.length) html += '<p class="small mt"><a href="#/schedule">' + t('more_blocks', { n: blocks.length - firstShown - shown.length }) + '</a></p>';
    return html + '</div>';
  }

  // ---------- Coach: rule-based suggestions from the user's own data ----------
  function coachCard(d, tb) {
    const today = Store.dateKey();
    const open = d.tasks.filter(x => !x.done);
    const overdue = open.filter(x => x.due && x.due < today);
    const dueToday = open.filter(x => x.due === today);
    const focusToday = d.focusLog.filter(x => Store.dateKey(new Date(x.at)) === today).length;
    const habitsLeft = d.habits.filter(h => !(h.log || {})[today]).length;
    const hour = (new Date).getHours();
    const tips = [];
    const add = (cls, ic, text, href, linkTxt) => tips.push('<li class="coach-item ' + cls + '">' + icon(ic) + '<span>' + text + (href ? ' <a href="' + href + '">' + linkTxt + '</a>' : '') + '</span></li>');

    if (overdue.length) add('warn', 'alert', t('coach_overdue', { n: overdue.length }), '#/tasks', t('all_tasks'));
    if (tb && tb.day && !tb.reused) {
      const st = dayState(tb.day);
      if (st.now && [ 'study', 'work' ].includes(st.now.category) && st.now.notes !== t('fixed_commitment') && !(window.FocusTimer && FocusTimer.running)) {
        add('time', 'timer', t('coach_focus_now', { x: esc(st.now.title) }), '#/focus', t('start_focus'));
      } else {
        const free = st.blocks.find(b => b.category === 'rest' && S(b) <= st.m && E(b) > st.m);
        if (free && E(free) - st.m >= 20) {
          const task = dueToday[0] || overdue[0] || open[0];
          add('time', 'clock', task ? t('coach_free_task', { m: UI.fmtMinutes(E(free) - st.m), x: esc(task.title) }) : t('coach_free', { m: UI.fmtMinutes(E(free) - st.m) }), '', '');
        }
      }
    }
    if (!overdue.length && dueToday.length) add('', 'checksq', t('coach_due_today', { n: dueToday.length }), '#/tasks', t('all_tasks'));
    if (habitsLeft && hour >= 17) add('', 'flame', t('coach_habits_left', { n: habitsLeft }), '#/habits', t('manage'));
    if (!focusToday && hour >= 11 && open.length) add('', 'timer', t('coach_no_focus', { n: Store.settings.focus.focus }), '#/focus', t('start_focus'));
    if (!tb) add('', 'sparkles', t('coach_no_plan'), '#/planner', t('create_with_ai'));
    if (!d.habits.length && tips.length < 3) add('', 'leaf', t('coach_first_habit'), '#/habits', t('add_habit'));
    if (!tips.length) add('good', 'check', t('coach_on_track'), '', '');

    const q = QUOTES[Math.floor(Date.now() / 864e5) % QUOTES.length];
    return '<div class="card"><div class="card-head"><h2>' + icon('lightbulb') + t('coach') + '</h2></div><ul class="coach-list">' + tips.slice(0, 3).join('') + '</ul>' + '<p class="quote coach-quote">“' + esc(q[0]) + '”<cite>— ' + esc(q[1]) + '</cite></p></div>';
  }

  // ---------- Tasks & habits (behaviour unchanged) ----------
  function tasksCard() {
    const today = Store.dateKey();
    const PR = { high: 0, medium: 1, low: 2 };
    const open = Store.list('tasks').filter(x => !x.done).sort((a, b) => (a.due || '9999').localeCompare(b.due || '9999') || PR[a.priority] - PR[b.priority]).slice(0, 6);
    return '<div class="card"><div class="card-head"><h2>' + icon('checksq') + t('up_next') + '</h2><a class="link" href="#/tasks">' + t('all_tasks') + '</a></div>' + '<form class="inline-form mb" id="dqForm"><input class="input" id="dqTitle" placeholder="' + t('quick_add_task') + '" aria-label="' + t('quick_add_task') + '" maxlength="120"><button class="btn primary" aria-label="' + t('add') + '">' + icon('plus', 'sm') + '</button></form>' + (open.length ? '<div class="list">' + open.map(x => '<div class="list-item"><button class="check" data-done="' + x.id + '" aria-label="' + esc(t('toggle_done') + ': ' + x.title) + '">' + icon('check') + '</button><div class="grow"><div class="title">' + esc(x.title) + '</div>' + '<div class="sub"><span class="pill ' + x.priority + '">' + t('prio_' + x.priority) + '</span>' + (x.due ? '<span class="' + (x.due < today ? 'pill high' : '') + '">' + icon('clock', 'sm') + ' ' + (x.due === today ? t('today') : UI.fmtDate(x.due)) + '</span>' : '') + '</div></div></div>').join('') + '</div>' : '<p class="muted small">' + t('no_open_tasks') + '</p>') + '</div>';
  }

  function habitsCard() {
    const today = Store.dateKey();
    const habits = Store.list('habits');
    return '<div class="card"><div class="card-head"><h2>' + icon('flame') + t('todays_habits') + '</h2><a class="link" href="#/habits">' + t('manage') + '</a></div>' + (habits.length ? '<div class="list">' + habits.slice(0, 6).map(h => {
      const on = !!(h.log || {})[today];
      return '<div class="list-item ' + (on ? 'done' : '') + '"><button class="check ' + (on ? 'on' : '') + '" data-habit="' + h.id + '" aria-pressed="' + on + '" aria-label="' + esc(h.name) + '" style="' + (on ? 'background:' + h.color + ';border-color:' + h.color : '') + '">' + icon('check') + '</button><div class="grow title">' + esc(h.name) + '</div><span class="streak" title="' + t('streak') + '">' + icon('flame', 'sm') + Gamify.streak(h) + '</span></div>';
    }).join('') + '</div>' : UI.empty('flame', t('no_habits_long'), '<a class="btn" href="#/habits">' + icon('plus', 'sm') + t('add_habit') + '</a>')) + '</div>';
  }

  function statCell(href, ic, val, label) {
    return '<a class="stat-cell" href="' + href + '"><b>' + esc(val) + '</b><span>' + icon(ic, 'sm') + label + '</span></a>';
  }

  Pages.dashboard = {
    render(main) {
      const p = Store.profile(), d = Store.data();
      const today = Store.dateKey();
      const focusToday = d.focusLog.filter(x => Store.dateKey(new Date(x.at)) === today).reduce((s, x) => s + x.minutes, 0);
      const openTasks = d.tasks.filter(x => !x.done).length;
      const best = d.habits.reduce((m, h) => Math.max(m, Gamify.streak(h)), 0);
      const tb = todayBlocks();
      const features = [ [ 'planner', 'sparkles' ], [ 'focus', 'timer' ], [ 'tasks', 'grid' ], [ 'habits', 'flame' ], [ 'goals', 'target' ], [ 'journal', 'book' ] ];
      main.innerHTML = header(p, d, tb) + '<div class="stat-strip">' + statCell('#/tasks', 'checksq', openTasks, t('open_tasks')) + statCell('#/focus', 'timer', UI.fmtMinutes(focusToday), t('focus_today')) + statCell('#/habits', 'flame', best, t('best_streak_now')) + statCell('#/stats', 'star', d.points || 0, t('points') + ', ' + t('level') + ' ' + Gamify.level(d.points)) + '</div>' + '<div class="dash-grid">' + scheduleCard(tb) + '<div class="dash-side">' + coachCard(d, tb) + tasksCard() + habitsCard() + '</div></div>' + '<div class="card"><div class="card-head"><h2>' + icon('grid') + t('explore') + '</h2></div><div class="explore-row">' + features.map(([id, ic]) => '<a href="#/' + id + '" title="' + esc(t('feat_' + id)) + '">' + icon(ic) + t('page_' + id) + '</a>').join('') + '</div></div>' + '<p class="footer-note">Timewise · ' + t('footer_note') + ' · <a href="#/credits">' + t('page_credits') + '</a></p>';

      const initial = tb && tb.day ? dayState(tb.day) : null;
      const sig = st => st ? (st.now ? st.now.id : '') + '|' + (st.next ? st.next.id : '') : '';
      const startSig = sig(initial);
      const tick = () => {
        const el = $('#dClock');
        if (!el) return;
        const n = new Date;
        const txt = UI.fmtTime(Store.pad(n.getHours()) + ':' + Store.pad(n.getMinutes()));
        const parts = txt.split(' ');
        el.innerHTML = esc(parts[0]) + (parts[1] ? '<small>' + esc(parts[1]) + '</small>' : '');
        $('#dDate').textContent = n.toLocaleDateString(UI.locale(), { weekday: 'long', month: 'long', day: 'numeric' });
        // Keep the ribbon needle in step with the clock without a full re-render.
        const rb = $('#dRibbon');
        if (rb) {
          const g = { r0: +rb.dataset.r0, r1: +rb.dataset.r1 };
          g.pct = m => Math.max(0, Math.min(100, (m - g.r0) / (g.r1 - g.r0) * 100));
          const m = nowMin();
          const past = $('.past', rb), needle = $('.needle', rb), mid = $('#dRibbonMid');
          if (past) past.style.width = Math.round(g.pct(m)) + '%';
          if (needle) needle.style.left = g.pct(m).toFixed(2) + '%';
          if (mid) mid.innerHTML = ribbonScaleMid(g, m);
        }
        // When the current or next activity changes, refresh the page (unless the user is typing).
        if (initial && sig(dayState(tb.day)) !== startSig) {
          const inp = $('#dqTitle');
          if (!inp || (document.activeElement !== inp && !inp.value)) App.rerender();
        }
      };
      tick();
      clockTimer = setInterval(tick, 15e3);

      $('#dqForm').addEventListener('submit', e => {
        e.preventDefault();
        const title = $('#dqTitle').value.trim();
        if (!title) return;
        Store.add('tasks', { title: title, priority: 'medium', due: Store.dateKey(), urgent: false, important: true, done: false });
        UI.toast(t('task_added'));
        App.rerender();
      });
      $$('[data-done]', main).forEach(b => b.addEventListener('click', () => {
        Store.update('tasks', b.dataset.done, { done: true, doneAt: Date.now() });
        Gamify.award(Gamify.POINTS.task);
        UI.toast(t('task_done_toast'));
        App.rerender();
      }));
      $$('[data-habit]', main).forEach(b => b.addEventListener('click', () => {
        Pages.habits.toggle(b.dataset.habit, Store.dateKey());
        App.rerender();
      }));
      $$('[data-bdone]', main).forEach(btn => btn.addEventListener('click', () => {
        const blk = tb.day.blocks.find(x => x.id === btn.dataset.bdone);
        if (!blk) return;
        blk.done = !blk.done;
        Store.save();
        Gamify.award(blk.done ? Gamify.POINTS.block : -Gamify.POINTS.block);
        App.rerender();
      }));
    },
    destroy() {
      clearInterval(clockTimer);
    }
  };
})();
