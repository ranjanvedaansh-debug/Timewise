window.Pages = window.Pages || {};

(function() {
  const {esc: esc} = UI;
  function bars(values, labels, cls, unitFmt) {
    const max = Math.max(1, ...values);
    return '<div class="bars">' + values.map((v, i) => '<div class="bar-col"><em>' + (v ? unitFmt(v) : '') + '</em><div class="bar ' + cls + '" style="height:' + Math.round(v / max * 130) + 'px"></div><small>' + labels[i] + '</small></div>').join('') + '</div>';
  }
  function moodLine(journal, days) {
    const pts = days.map((dk, i) => {
      const e = journal.find(x => x.date === dk && x.mood);
      return e ? [ i, e.mood ] : null;
    }).filter(Boolean);
    if (pts.length < 2) return '<p class="muted small">' + t('mood_need_more') + '</p>';
    const W = 600, H = 140, px = i => 20 + i * (W - 40) / (days.length - 1), py = m => H - 15 - (m - 1) * (H - 30) / 4;
    const path = pts.map((p, i) => (i ? 'L' : 'M') + px(p[0]).toFixed(1) + ' ' + py(p[1]).toFixed(1)).join(' ');
    return '<div class="mood-line"><svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none">' + [ 1, 3, 5 ].map(m => '<line x1="20" x2="' + (W - 20) + '" y1="' + py(m) + '" y2="' + py(m) + '" stroke="var(--border)" stroke-dasharray="4 4"/>').join('') + '<path d="' + path + '" fill="none" stroke="var(--primary)" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>' + pts.map(p => '<circle cx="' + px(p[0]) + '" cy="' + py(p[1]) + '" r="5" fill="var(--surface)" stroke="var(--primary)" stroke-width="3" vector-effect="non-scaling-stroke"/>').join('') + '</svg></div><div class="flex between small muted"><span>' + t('mood_1') + ' ↓</span><span>↑ ' + t('mood_5') + '</span></div>';
  }
  function render(main) {
    const d = Store.data();
    const today = Store.dateKey();
    const days7 = Array.from({
      length: 7
    }, (_, i) => Store.addDays(today, i - 6));
    const days14 = Array.from({
      length: 14
    }, (_, i) => Store.addDays(today, i - 13));
    const labels = days7.map(dk => UI.weekday(dk, 'short'));
    const focusPer = days7.map(dk => d.focusLog.filter(x => Store.dateKey(new Date(x.at)) === dk).reduce((s, x) => s + x.minutes, 0));
    const tasksPer = days7.map(dk => d.tasks.filter(x => x.done && x.doneAt && Store.dateKey(new Date(x.doneAt)) === dk).length);
    const habitSlots = d.habits.length * 7;
    const habitDone = d.habits.reduce((s, h) => s + days7.filter(dk => (h.log || {})[dk]).length, 0);
    const habitRate = habitSlots ? Math.round(habitDone / habitSlots * 100) : 0;
    const lvl = Gamify.level(d.points), a = Gamify.levelStart(lvl), b = Gamify.levelEnd(lvl);
    const totalFocus = d.focusLog.reduce((s, x) => s + x.minutes, 0);
    main.innerHTML = '<div class="page-head"><div><h1>' + t('page_stats') + '</h1><p>' + t('stats_sub') + '</p></div></div>' + '<div class="grid grid-3 mb">' + '<div class="card span-2"><div class="level-box"><div class="level-num">' + lvl + '</div><div style="flex:1"><b style="font-size:1.1rem">' + t('level') + ' ' + lvl + ' · ' + t('lvl_name_' + Math.min(lvl, 10)) + '</b>' + '<p class="small muted">' + t('points_to_next', {
      p: b - (d.points || 0),
      n: lvl + 1
    }) + '</p><div class="progress" style="margin-top:10px"><div style="width:' + Math.round(((d.points || 0) - a) / (b - a) * 100) + '%"></div></div></div></div>' + '<p class="small muted mt">' + t('how_points') + '</p></div>' + '<div class="card"><div class="list small">' + row('timer', t('total_focus'), UI.fmtMinutes(totalFocus)) + row('checksq', t('tasks_completed'), d.tasks.filter(x => x.done).length) + row('target', t('goals_achieved'), d.goals.filter(g => g.done).length) + row('book', t('journal_entries'), d.journal.length) + row('star', t('points'), d.points || 0) + '</div></div></div>' + '<div class="grid grid-2 mb">' + '<div class="card"><div class="card-head"><h3>' + icon('timer') + t('focus_7') + '</h3><span class="pill primary">' + UI.fmtMinutes(focusPer.reduce((s, v) => s + v, 0)) + '</span></div>' + bars(focusPer, labels, '', v => v + 'm') + '</div>' + '<div class="card"><div class="card-head"><h3>' + icon('checksq') + t('tasks_7') + '</h3><span class="pill">' + tasksPer.reduce((s, v) => s + v, 0) + '</span></div>' + bars(tasksPer, labels, 'green', v => v) + '</div>' + '<div class="card"><div class="card-head"><h3>' + icon('flame') + t('habits_week') + '</h3><b>' + habitRate + '%</b></div><div class="progress green"><div style="width:' + habitRate + '%"></div></div>' + '<p class="small muted mt">' + t('habit_rate_txt', {
      done: habitDone,
      total: habitSlots
    }) + '</p></div>' + '<div class="card"><div class="card-head"><h3>' + icon('smile4') + t('mood_14') + '</h3></div>' + moodLine(d.journal, days14) + '</div></div>' + '<div class="card"><div class="card-head"><h3>' + icon('award') + t('badges') + '</h3><span class="pill primary">' + d.badges.length + '/' + Gamify.BADGES.length + '</span></div><div class="badges">' + Gamify.BADGES.map(bd => '<div class="badge-card ' + (d.badges.includes(bd.id) ? 'earned' : '') + '"><div class="medal">' + icon(bd.ic) + '</div><b>' + t('badge_' + bd.id) + '</b><span>' + t('badge_' + bd.id + '_d') + '</span></div>').join('') + '</div></div>';
  }
  const row = (ic, label, val) => '<div class="list-item"><span class="muted">' + icon(ic, 'sm') + '</span><div class="grow">' + label + '</div><b>' + esc(val) + '</b></div>';
  Pages.stats = {
    render: render
  };
})();
