window.Pages = window.Pages || {};

(function() {
  const {$: $, $$: $$, esc: esc} = UI;
  let clockTimer = null;
  const QUOTES = [ [ 'Lost time is never found again.', 'Benjamin Franklin' ], [ 'The key is not to prioritize what’s on your schedule, but to schedule your priorities.', 'Stephen Covey' ], [ 'Well begun is half done.', 'Aristotle' ], [ 'It does not matter how slowly you go as long as you do not stop.', 'Confucius' ], [ 'Action is the foundational key to all success.', 'Pablo Picasso' ], [ 'You may delay, but time will not.', 'Benjamin Franklin' ], [ 'Small deeds done are better than great deeds planned.', 'Peter Marshall' ], [ 'The secret of getting ahead is getting started.', 'Mark Twain' ], [ 'Do what you can, with what you have, where you are.', 'Theodore Roosevelt' ], [ 'Time is what we want most, but what we use worst.', 'William Penn' ] ];
  function greeting() {
    const h = (new Date).getHours();
    return h < 12 ? t('good_morning') : h < 17 ? t('good_afternoon') : t('good_evening');
  }
  function todayBlocks() {
    const s = Store.activeSchedule();
    if (!s) return null;
    const day = s.days.find(d => d.date === Store.dateKey());
    if (day) return {
      s: s,
      day: day
    };
    const dow = (new Date).getDay();
    const same = s.days.find(d => Store.parseDate(d.date).getDay() === dow);
    return same ? {
      s: s,
      day: same,
      reused: true
    } : {
      s: s,
      day: null
    };
  }
  function scheduleCard() {
    const tb = todayBlocks();
    if (!tb) return '<div class="card"><div class="card-head"><h3>' + icon('calendar') + t('todays_plan') + '</h3></div>' + UI.empty('sparkles', t('no_schedule_yet'), '<a class="btn primary" href="#/planner">' + icon('sparkles', 'sm') + t('create_with_ai') + '</a>') + '</div>';
    if (!tb.day) return '<div class="card"><div class="card-head"><h3>' + icon('calendar') + t('todays_plan') + '</h3><a class="link" href="#/schedule">' + t('open') + '</a></div>' + UI.empty('calendar', t('no_blocks_today'), '<a class="btn" href="#/planner">' + t('make_new_plan') + '</a>') + '</div>';
    const nowM = (new Date).getHours() * 60 + (new Date).getMinutes();
    const blocks = tb.day.blocks;
    const now = blocks.find(b => Store.toMin(b.start) <= nowM && Store.toMin(b.end) > nowM);
    const upcoming = blocks.filter(b => Store.toMin(b.start) > nowM).slice(0, 4);
    let html = '<div class="card"><div class="card-head"><h3>' + icon('calendar') + t('todays_plan') + '</h3><a class="link" href="#/schedule">' + t('view_full') + '</a></div>';
    if (now) html += '<div class="now-block" style="border-color:' + UI.catColor(now.category) + '"><div class="lbl">' + t('right_now') + '</div><b>' + esc(now.title) + '</b><span>' + UI.fmtTime(now.start) + ' – ' + UI.fmtTime(now.end) + ' · ' + t('ends_in', {
      m: UI.fmtMinutes(Store.toMin(now.end) - nowM)
    }) + '</span></div>';
    if (upcoming.length) html += '<div class="list block-list">' + upcoming.map(b => '<div class="list-item"><span class="cat-dot" style="--cat:' + UI.catColor(b.category) + '"></span><span class="time-col">' + UI.fmtTime(b.start) + '</span><div class="grow title">' + esc(b.title) + '</div></div>').join('') + '</div>'; else if (!now) html += '<p class="muted">' + t('day_done') + '</p>';
    return html + '</div>';
  }
  function tasksCard() {
    const today = Store.dateKey();
    const open = Store.list('tasks').filter(x => !x.done).sort((a, b) => (a.due || '9999').localeCompare(b.due || '9999') || {
      high: 0,
      medium: 1,
      low: 2
    }[a.priority] - {
      high: 0,
      medium: 1,
      low: 2
    }[b.priority]).slice(0, 6);
    return '<div class="card"><div class="card-head"><h3>' + icon('checksq') + t('up_next') + '</h3><a class="link" href="#/tasks">' + t('all_tasks') + '</a></div>' + '<form class="inline-form mb" id="dqForm"><input class="input" id="dqTitle" placeholder="' + t('quick_add_task') + '" maxlength="120"><button class="btn primary" aria-label="Add">' + icon('plus', 'sm') + '</button></form>' + (open.length ? '<div class="list">' + open.map(x => '<div class="list-item"><button class="check" data-done="' + x.id + '">' + icon('check') + '</button><div class="grow"><div class="title">' + esc(x.title) + '</div>' + '<div class="sub"><span class="pill ' + x.priority + '">' + t('prio_' + x.priority) + '</span>' + (x.due ? '<span class="' + (x.due < today ? 'pill high' : '') + '">' + icon('clock', 'sm') + ' ' + (x.due === today ? t('today') : UI.fmtDate(x.due)) + '</span>' : '') + '</div></div></div>').join('') + '</div>' : '<p class="muted small">' + t('no_open_tasks') + '</p>') + '</div>';
  }
  function habitsCard() {
    const today = Store.dateKey();
    const habits = Store.list('habits');
    return '<div class="card"><div class="card-head"><h3>' + icon('flame') + t('todays_habits') + '</h3><a class="link" href="#/habits">' + t('manage') + '</a></div>' + (habits.length ? '<div class="list">' + habits.slice(0, 6).map(h => {
      const on = !!(h.log || {})[today];
      return '<div class="list-item ' + (on ? 'done' : '') + '"><button class="check ' + (on ? 'on' : '') + '" data-habit="' + h.id + '" style="' + (on ? 'background:' + h.color + ';border-color:' + h.color : '') + '">' + icon('check') + '</button><div class="grow title">' + esc(h.name) + '</div><span class="streak">' + icon('flame', 'sm') + Gamify.streak(h) + '</span></div>';
    }).join('') + '</div>' : UI.empty('flame', t('no_habits'), '<a class="btn" href="#/habits">' + icon('plus', 'sm') + t('add_habit') + '</a>')) + '</div>';
  }
  Pages.dashboard = {
    render(main) {
      const p = Store.profile(), d = Store.data();
      const today = Store.dateKey();
      const focusToday = d.focusLog.filter(x => Store.dateKey(new Date(x.at)) === today).reduce((s, x) => s + x.minutes, 0);
      const openTasks = d.tasks.filter(x => !x.done).length;
      const best = d.habits.reduce((m, h) => Math.max(m, Gamify.streak(h)), 0);
      const q = QUOTES[Math.floor(Date.now() / 864e5) % QUOTES.length];
      const tipIdx = Math.floor(Date.now() / 864e5) % 8 + 1;
      const features = [ [ 'planner', 'sparkles', 'indigo' ], [ 'focus', 'timer', 'green' ], [ 'tasks', 'grid', 'amber' ], [ 'habits', 'flame', 'red' ], [ 'goals', 'target', 'indigo' ], [ 'journal', 'book', 'green' ] ];
      main.innerHTML = '<div class="hero mt mb">' + '<div><h1>' + greeting() + ', ' + esc(p.name) + '</h1><p>' + t('hero_sub') + '</p>' + '<div class="hero-actions mt"><a class="btn" href="#/planner">' + icon('sparkles', 'sm') + t('create_with_ai') + '</a><a class="btn outline" href="#/focus">' + icon('timer', 'sm') + t('start_focus') + '</a></div></div>' + '<div class="hero-clock" id="dClock"></div></div>' + '<div class="grid grid-4 mb">' + stat('checksq', 'indigo', openTasks, t('open_tasks')) + stat('timer', 'green', UI.fmtMinutes(focusToday), t('focus_today')) + stat('flame', 'amber', best, t('best_streak_now')) + stat('star', 'red', d.points || 0, t('points') + ' · ' + t('level') + ' ' + Gamify.level(d.points)) + '</div>' + '<div class="grid grid-2 mb">' + scheduleCard() + tasksCard() + '</div>' + '<div class="grid grid-2 mb">' + habitsCard() + '<div class="card"><div class="card-head"><h3>' + icon('lightbulb') + t('daily_boost') + '</h3></div>' + '<p class="quote">“' + esc(q[0]) + '”<cite>— ' + esc(q[1]) + '</cite></p>' + '<div class="notice mt">' + icon('info') + '<span><b>' + t('tip_label') + ':</b> ' + t('dtip_' + tipIdx) + '</span></div></div></div>' + '<div class="card"><div class="card-head"><h3>' + icon('grid') + t('explore') + '</h3></div><div class="feature-grid">' + features.map(([id, ic, col]) => '<a class="feature" href="#/' + id + '"><div class="stat-icon ' + col + '">' + icon(ic) + '</div><div><b>' + t('page_' + id) + '</b><span>' + t('feat_' + id) + '</span></div></a>').join('') + '</div></div>' + '<p class="footer-note">Timewise · ' + t('footer_note') + ' · <a href="#/credits">' + t('page_credits') + '</a></p>';
      const tick = () => {
        const el = $('#dClock');
        if (!el) return;
        const n = new Date;
        el.innerHTML = UI.fmtTime(Store.pad(n.getHours()) + ':' + Store.pad(n.getMinutes())) + '<small>' + n.toLocaleDateString(UI.locale(), {
          weekday: 'long',
          month: 'long',
          day: 'numeric'
        }) + '</small>';
      };
      tick();
      clockTimer = setInterval(tick, 1e4);
      $('#dqForm').addEventListener('submit', e => {
        e.preventDefault();
        const title = $('#dqTitle').value.trim();
        if (!title) return;
        Store.add('tasks', {
          title: title,
          priority: 'medium',
          due: Store.dateKey(),
          urgent: false,
          important: true,
          done: false
        });
        UI.toast(t('task_added'));
        App.rerender();
      });
      $$('[data-done]', main).forEach(b => b.addEventListener('click', () => {
        Store.update('tasks', b.dataset.done, {
          done: true,
          doneAt: Date.now()
        });
        Gamify.award(Gamify.POINTS.task);
        UI.toast(t('task_done_toast'));
        App.rerender();
      }));
      $$('[data-habit]', main).forEach(b => b.addEventListener('click', () => {
        Pages.habits.toggle(b.dataset.habit, Store.dateKey());
        App.rerender();
      }));
    },
    destroy() {
      clearInterval(clockTimer);
    }
  };
  function stat(ic, col, val, label) {
    return '<div class="card stat"><div class="stat-icon ' + col + '">' + icon(ic) + '</div><div><b>' + esc(val) + '</b><span>' + label + '</span></div></div>';
  }
})();
