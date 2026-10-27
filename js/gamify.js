(function() {
  const G = {};
  G.POINTS = {
    task: 10,
    focus: 15,
    habit: 5,
    journal: 10,
    schedule: 20,
    goal: 50,
    milestone: 5,
    block: 2
  };
  G.level = pts => Math.floor(Math.sqrt((pts || 0) / 50)) + 1;
  G.levelStart = lvl => 50 * Math.pow(lvl - 1, 2);
  G.levelEnd = lvl => 50 * Math.pow(lvl, 2);
  G.streak = function(habit) {
    const log = habit.log || {};
    let day = Store.dateKey();
    if (!log[day]) day = Store.addDays(day, -1);
    let n = 0;
    while (log[day]) {
      n++;
      day = Store.addDays(day, -1);
    }
    return n;
  };
  G.bestStreak = function(habit) {
    const days = Object.keys(habit.log || {}).filter(k => habit.log[k]).sort();
    let best = 0, run = 0, prev = null;
    days.forEach(d => {
      run = prev && Store.addDays(prev, 1) === d ? run + 1 : 1;
      best = Math.max(best, run);
      prev = d;
    });
    return best;
  };
  G.BADGES = [ {
    id: 'first_plan',
    ic: 'sparkles',
    test: d => d.schedules.length >= 1
  }, {
    id: 'first_task',
    ic: 'checksq',
    test: d => d.tasks.some(x => x.done)
  }, {
    id: 'task_25',
    ic: 'trophy',
    test: d => d.tasks.filter(x => x.done).length >= 25
  }, {
    id: 'focus_1',
    ic: 'timer',
    test: d => d.focusLog.length >= 1
  }, {
    id: 'focus_600',
    ic: 'brain',
    test: d => d.focusLog.reduce((s, x) => s + x.minutes, 0) >= 600
  }, {
    id: 'early_bird',
    ic: 'sunrise',
    test: d => d.focusLog.some(x => new Date(x.at).getHours() < 8)
  }, {
    id: 'habit_3',
    ic: 'leaf',
    test: d => d.habits.length >= 3
  }, {
    id: 'streak_7',
    ic: 'flame',
    test: d => d.habits.some(h => G.bestStreak(h) >= 7)
  }, {
    id: 'journal_5',
    ic: 'book',
    test: d => d.journal.length >= 5
  }, {
    id: 'goal_done',
    ic: 'target',
    test: d => d.goals.some(g => g.done)
  }, {
    id: 'level_5',
    ic: 'star',
    test: d => G.level(d.points) >= 5
  } ];
  G.award = function(pts) {
    const d = Store.data();
    if (!Store.profile()) return;
    const before = G.level(d.points);
    d.points = Math.max(0, (d.points || 0) + pts);
    const after = G.level(d.points);
    Store.save();
    if (after > before) setTimeout(() => UI.toast(t('level_up', {
      n: after
    }), 'badge', 4500), 300);
    G.checkBadges();
  };
  G.checkBadges = function() {
    const d = Store.data();
    if (!Store.profile()) return;
    G.BADGES.forEach(b => {
      if (!d.badges.includes(b.id) && b.test(d)) {
        d.badges.push(b.id);
        Store.save();
        setTimeout(() => UI.toast(t('badge_earned') + ': ' + t('badge_' + b.id), 'badge', 5e3), 600);
      }
    });
  };
  window.Gamify = G;
})();
