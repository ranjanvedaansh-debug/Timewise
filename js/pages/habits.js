window.Pages = window.Pages || {};

(function() {
  const {$: $, $$: $$, esc: esc} = UI;
  const COLORS = [ '#4f46e5', '#0ea5e9', '#16a34a', '#f59e0b', '#ec4899', '#a855f7', '#f97316', '#14b8a6' ];
  function toggle(id, date) {
    const h = Store.find('habits', id);
    if (!h) return;
    h.log = h.log || {};
    if (h.log[date]) delete h.log[date]; else {
      h.log[date] = true;
      Gamify.award(Gamify.POINTS.habit);
      const s = Gamify.streak(h);
      if (date === Store.dateKey() && [ 3, 7, 14, 21, 30, 50, 100 ].includes(s)) UI.toast(t('streak_toast', {
        n: s,
        name: h.name
      }), 'badge');
    }
    Store.save();
  }
  function render(main) {
    const habits = Store.list('habits');
    const today = Store.dateKey();
    const days = Array.from({
      length: 7
    }, (_, i) => Store.addDays(today, i - 6));
    const doneToday = habits.filter(h => (h.log || {})[today]).length;
    const heat = Array.from({
      length: 30
    }, (_, i) => {
      const dk = Store.addDays(today, i - 29);
      const n = habits.filter(h => (h.log || {})[dk]).length;
      return habits.length ? n / habits.length : 0;
    });
    main.innerHTML = '<div class="page-head"><div><h1>' + t('page_habits') + '</h1><p>' + t('habits_sub') + '</p></div>' + '<div class="actions"><button class="btn primary" id="hNew">' + icon('plus', 'sm') + t('add_habit') + '</button></div></div>' + (habits.length ? '<div class="grid grid-3 mb">' + '<div class="card stat"><div class="stat-icon green">' + icon('checksq') + '</div><div><b>' + doneToday + '/' + habits.length + '</b><span>' + t('done_today') + '</span></div></div>' + '<div class="card stat"><div class="stat-icon amber">' + icon('flame') + '</div><div><b>' + Math.max(0, ...habits.map(Gamify.streak)) + '</b><span>' + t('longest_current') + '</span></div></div>' + '<div class="card stat"><div class="stat-icon indigo">' + icon('trophy') + '</div><div><b>' + Math.max(0, ...habits.map(Gamify.bestStreak)) + '</b><span>' + t('best_ever') + '</span></div></div></div>' : '') + '<div class="card mb">' + (habits.length ? '<div class="habits-scroll"><div><div class="habit-row head"><div>' + t('habit') + '</div>' + days.map(dk => '<div>' + UI.weekday(dk, 'narrow') + '<br>' + Store.parseDate(dk).getDate() + '</div>').join('') + '<div>' + t('streak') + '</div><div></div></div>' + habits.map(h => '<div class="habit-row"><div class="habit-name" data-edit="' + h.id + '" style="cursor:pointer"><span class="hdot" style="background:' + h.color + '"></span><span>' + esc(h.name) + '</span></div>' + days.map(dk => '<button class="hcell ' + ((h.log || {})[dk] ? 'on' : '') + ' ' + (dk === today ? 'today' : '') + '" style="--hc:' + h.color + '" data-h="' + h.id + '" data-d="' + dk + '" aria-label="' + esc(h.name) + ' ' + dk + '">' + icon('check') + '</button>').join('') + '<div class="streak">' + icon('flame', 'sm') + Gamify.streak(h) + '</div><button class="icon-btn sm danger" data-del="' + h.id + '">' + icon('trash', 'sm') + '</button></div>').join('') + '</div></div>' : UI.empty('flame', t('no_habits_long'), '<button class="btn primary" id="hNew2">' + icon('plus', 'sm') + t('add_habit') + '</button>')) + '</div>' + (habits.length ? '<div class="card"><div class="card-head"><h3>' + icon('calendar') + t('last_30') + '</h3><span class="small muted">' + t('heat_hint') + '</span></div><div class="heatmap">' + heat.map(v => '<i style="background:' + (v ? 'color-mix(in srgb, var(--success) ' + Math.round(25 + v * 75) + '%, var(--surface-3))' : 'var(--surface-3)') + '"></i>').join('') + '</div></div>' : '');
    [ $('#hNew', main), $('#hNew2', main) ].filter(Boolean).forEach(b => b.addEventListener('click', () => editHabit(null)));
    $$('.hcell', main).forEach(b => b.addEventListener('click', () => {
      toggle(b.dataset.h, b.dataset.d);
      App.rerender();
    }));
    $$('[data-edit]', main).forEach(b => b.addEventListener('click', () => editHabit(Store.find('habits', b.dataset.edit))));
    $$('[data-del]', main).forEach(b => b.addEventListener('click', async () => {
      if (await UI.confirm(t('delete_habit_q'))) {
        Store.remove('habits', b.dataset.del);
        App.rerender();
      }
    }));
  }
  function editHabit(h) {
    const isNew = !h;
    let color = h ? h.color : COLORS[Store.list('habits').length % COLORS.length];
    const age = Store.profile().ageGroup;
    const sugg = [ 'hs_water', 'hs_read', 'hs_exercise', 'hs_sleep', age === 'kid' ? 'hs_brush' : 'hs_meditate', age === 'senior' ? 'hs_walk' : 'hs_noscreen', 'hs_tidy', 'hs_gratitude' ];
    const m = UI.modal({
      title: isNew ? t('add_habit') : t('edit_habit'),
      body: '<div class="field"><label>' + t('habit_name') + '</label><input class="input" id="hName" maxlength="50" value="' + esc(h ? h.name : '') + '" placeholder="' + t('habit_ph') + '"></div>' + (isNew ? '<div class="chips mb">' + sugg.map(k => '<span class="chip" data-s="' + esc(t(k)) + '">' + t(k) + '</span>').join('') + '</div>' : '') + '<div class="field"><span class="field-label">' + t('color') + '</span><div class="color-pick">' + COLORS.map(c => '<button type="button" class="' + (c === color ? 'sel' : '') + '" style="background:' + c + '" data-c="' + c + '"></button>').join('') + '</div></div>',
      foot: '<button class="btn" data-close>' + t('cancel') + '</button><button class="btn primary" id="hSave">' + t('save') + '</button>'
    });
    $$('[data-s]', m).forEach(c => c.addEventListener('click', () => {
      $('#hName', m).value = c.dataset.s;
    }));
    $$('[data-c]', m).forEach(b => b.addEventListener('click', () => {
      color = b.dataset.c;
      $$('[data-c]', m).forEach(x => x.classList.toggle('sel', x === b));
    }));
    $('#hSave', m).addEventListener('click', () => {
      const name = $('#hName', m).value.trim();
      if (!name) return UI.toast(t('enter_title'), 'error');
      if (isNew) Store.add('habits', {
        name: name,
        color: color,
        log: {}
      }); else Store.update('habits', h.id, {
        name: name,
        color: color
      });
      UI.closeModal();
      Gamify.checkBadges();
      App.rerender();
    });
  }
  Pages.habits = {
    render: render,
    toggle: toggle
  };
})();
