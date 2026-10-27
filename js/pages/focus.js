window.Pages = window.Pages || {};

(function() {
  const {$: $, $$: $$, esc: esc} = UI;
  const T = {
    mode: 'focus',
    total: 0,
    remaining: 0,
    running: false,
    endAt: 0,
    count: 0,
    taskId: '',
    iv: null
  };
  const RADIUS = 140, CIRC = 2 * Math.PI * RADIUS;
  const dur = mode => (Store.settings.focus[mode] || 25) * 60;
  function setMode(mode) {
    T.mode = mode;
    T.total = T.remaining = dur(mode);
    T.running = false;
    clearInterval(T.iv);
    updateAll();
  }
  setTimeout(() => {
    if (!T.total) setMode('focus');
  }, 0);
  const fmt = s => Store.pad(Math.floor(s / 60)) + ':' + Store.pad(s % 60);
  function start() {
    if (T.running) return;
    if (T.remaining <= 0) T.remaining = T.total;
    T.running = true;
    T.endAt = Date.now() + T.remaining * 1e3;
    clearInterval(T.iv);
    T.iv = setInterval(tick, 250);
    updateAll();
  }
  function pause() {
    if (!T.running) return;
    T.running = false;
    clearInterval(T.iv);
    T.remaining = Math.max(0, Math.round((T.endAt - Date.now()) / 1e3));
    updateAll();
  }
  function tick() {
    T.remaining = Math.max(0, Math.round((T.endAt - Date.now()) / 1e3));
    if (T.remaining <= 0) return finish(true);
    updateAll();
  }
  function finish(completed) {
    clearInterval(T.iv);
    T.running = false;
    const was = T.mode;
    if (was === 'focus' && completed) {
      T.count++;
      const minutes = Math.round(T.total / 60);
      Store.data().focusLog.push({
        at: Date.now(),
        minutes: minutes,
        taskId: T.taskId || null
      });
      Store.save();
      Gamify.award(Gamify.POINTS.focus);
      Sounds.chime();
      UI.notify(t('focus_done_t'), t('focus_done_b', {
        m: minutes
      }));
    } else if (completed) {
      Sounds.chime();
      UI.notify(t('break_over_t'), t('break_over_b'));
    }
    const next = was === 'focus' ? T.count % (Store.settings.focus.longEvery || 4) === 0 ? 'long' : 'short' : 'focus';
    setMode(next);
    if (Store.settings.focus.autoStart && completed) start();
    if (location.hash.includes('focus')) App.rerender();
  }
  function updateAll() {
    const mini = $('#miniTimer');
    const onFocusPage = location.hash.includes('focus');
    const active = T.running || T.remaining > 0 && T.remaining < T.total;
    if (mini) {
      mini.classList.toggle('hidden', !active || onFocusPage);
      mini.innerHTML = icon(T.running ? 'timer' : 'pause', 'sm') + fmt(T.remaining);
    }
    document.title = active ? fmt(T.remaining) + ' · ' + t('mode_' + T.mode) + ' · Timewise' : document.title.includes('·') && /^\d\d:\d\d/.test(document.title) ? 'Timewise' : document.title;
    const timeEl = $('#fTime');
    if (!timeEl) return;
    timeEl.textContent = fmt(T.remaining);
    const fg = $('#fRing .fg');
    if (fg) fg.style.strokeDashoffset = CIRC * (1 - T.remaining / T.total);
    const pb = $('#fPlay');
    if (pb) pb.innerHTML = icon(T.running ? 'pause' : 'play');
  }
  function render(main) {
    if (!T.total) {
      T.mode = 'focus';
      T.total = T.remaining = dur('focus');
    }
    const d = Store.data(), f = Store.settings.focus;
    const today = Store.dateKey();
    const todays = d.focusLog.filter(x => Store.dateKey(new Date(x.at)) === today);
    const tasks = d.tasks.filter(x => !x.done);
    const sIcons = {
      rain: 'rain',
      ocean: 'wave',
      wind: 'wind',
      white: 'volume',
      brown: 'leaf'
    };
    main.innerHTML = '<div class="page-head"><div><h1>' + t('page_focus') + '</h1><p>' + t('focus_sub') + '</p></div></div>' + '<div class="focus-wrap"><div class="card timer-card">' + '<div class="tabs">' + [ 'focus', 'short', 'long' ].map(m => '<button class="tab ' + (T.mode === m ? 'active' : '') + '" data-mode="' + m + '">' + t('mode_' + m) + '</button>').join('') + '</div>' + '<div class="ring ' + (T.mode !== 'focus' ? 'break' : '') + '" id="fRing"><svg viewBox="0 0 300 300"><circle class="bg" cx="150" cy="150" r="' + RADIUS + '"/><circle class="fg" cx="150" cy="150" r="' + RADIUS + '" stroke-dasharray="' + CIRC + '" stroke-dashoffset="' + CIRC * (1 - T.remaining / T.total) + '"/></svg>' + '<div class="ring-center"><div class="ring-time" id="fTime">' + fmt(T.remaining) + '</div><div class="ring-label">' + (T.mode === 'focus' ? t('stay_focused') : t('take_breath')) + '</div></div></div>' + '<div class="timer-controls"><button class="icon-btn" id="fReset" title="' + t('reset') + '" aria-label="' + t('reset') + '">' + icon('reset') + '</button>' + '<button class="round-btn" id="fPlay" aria-label="Start/Pause">' + icon(T.running ? 'pause' : 'play') + '</button>' + '<button class="icon-btn" id="fSkip" title="' + t('skip') + '" aria-label="' + t('skip') + '">' + icon('skip') + '</button></div>' + '<div class="sessions-dots">' + Array.from({
      length: f.longEvery
    }, (_, i) => '<i class="' + (i < T.count % f.longEvery || T.count && T.count % f.longEvery === 0 && T.mode === 'long' ? 'on' : '') + '"></i>').join('') + '</div>' + '<div class="field mt" style="max-width:340px;margin-left:auto;margin-right:auto;text-align:left"><label>' + t('working_on') + '</label><select class="input" id="fTask"><option value="">' + t('no_task') + '</option>' + UI.options(tasks.map(x => [ x.id, x.title ]), T.taskId) + '</select></div>' + '<p class="small muted"><kbd>Space</kbd> ' + t('space_hint') + '</p></div>' + '<div class="grid">' + '<div class="card"><div class="card-head"><h3>' + icon('volume') + t('focus_sounds') + '</h3></div><div class="sound-grid">' + Sounds.list.map(s => '<button class="sound-btn ' + (Sounds.current() === s ? 'on' : '') + '" data-sound="' + s + '">' + icon(sIcons[s]) + t('snd_' + s) + '</button>').join('') + '</div>' + '<div class="field mt"><label>' + t('volume') + '</label><input type="range" min="0" max="1" step="0.05" value="' + Sounds.volume + '" id="fVol" aria-label="' + t('volume') + '"></div></div>' + '<div class="card"><div class="card-head"><h3>' + icon('settings') + t('timer_settings') + '</h3></div>' + [ [ 'focus', 5, 90 ], [ 'short', 1, 30 ], [ 'long', 5, 45 ] ].map(([k, mi, ma]) => '<div class="field"><label>' + t('mode_' + k) + ': <b id="lbl_' + k + '">' + f[k] + '</b> ' + t('min_short') + '</label><input type="range" min="' + mi + '" max="' + ma + '" value="' + f[k] + '" data-dur="' + k + '"></div>').join('') + '<div class="setting-row"><div class="txt"><b>' + t('auto_start') + '</b><span>' + t('auto_start_d') + '</span></div><label class="switch"><input type="checkbox" id="fAuto" ' + (f.autoStart ? 'checked' : '') + '><span></span></label></div></div>' + '<div class="card"><div class="card-head"><h3>' + icon('chart') + t('today') + '</h3><span class="pill primary">' + UI.fmtMinutes(todays.reduce((s, x) => s + x.minutes, 0)) + '</span></div>' + (todays.length ? '<div class="list">' + todays.slice().reverse().slice(0, 6).map(x => {
      const tk = x.taskId && Store.find('tasks', x.taskId);
      return '<div class="list-item small"><span class="time-col">' + new Date(x.at).toLocaleTimeString(UI.locale(), {
        hour: 'numeric',
        minute: '2-digit'
      }) + '</span><div class="grow">' + (tk ? esc(tk.title) : t('focus_session')) + '</div><span class="pill">' + x.minutes + ' ' + t('min_short') + '</span></div>';
    }).join('') + '</div>' : '<p class="muted small">' + t('no_sessions') + '</p>') + '</div>' + '</div></div>';
    $$('[data-mode]', main).forEach(b => b.addEventListener('click', () => {
      if (T.mode !== b.dataset.mode) {
        setMode(b.dataset.mode);
        App.rerender();
      }
    }));
    $('#fPlay', main).addEventListener('click', () => T.running ? pause() : start());
    $('#fReset', main).addEventListener('click', () => {
      setMode(T.mode);
      App.rerender();
    });
    $('#fSkip', main).addEventListener('click', () => finish(false));
    $('#fTask', main).addEventListener('change', e => T.taskId = e.target.value);
    $$('[data-sound]', main).forEach(b => b.addEventListener('click', () => {
      Sounds.toggle(b.dataset.sound);
      $$('[data-sound]', main).forEach(x => x.classList.toggle('on', x.dataset.sound === Sounds.current()));
    }));
    $('#fVol', main).addEventListener('input', e => Sounds.setVolume(+e.target.value));
    $$('[data-dur]', main).forEach(r => r.addEventListener('input', () => {
      const k = r.dataset.dur;
      f[k] = +r.value;
      $('#lbl_' + k).textContent = r.value;
      Store.save();
      if (T.mode === k && !T.running) {
        T.total = T.remaining = dur(k);
        updateAll();
        const fg = $('#fRing .fg');
        if (fg) fg.style.strokeDashoffset = 0;
      }
    }));
    $('#fAuto', main).addEventListener('change', e => {
      f.autoStart = e.target.checked;
      Store.save();
    });
    updateAll();
  }
  document.addEventListener('keydown', e => {
    if (e.code !== 'Space' || !location.hash.includes('focus')) return;
    if (/INPUT|TEXTAREA|SELECT|BUTTON/.test(document.activeElement.tagName) || UI.$('#modalRoot').classList.contains('open')) return;
    e.preventDefault();
    T.running ? pause() : start();
  });
  Pages.focus = {
    render: render,
    destroy() {
      setTimeout(updateAll, 0);
    }
  };
  window.FocusTimer = T;
})();
