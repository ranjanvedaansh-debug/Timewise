window.Pages = window.Pages || {};

(function() {
  const {$: $, $$: $$, esc: esc} = UI;
  const TOTAL = 10;
  let step = 0;
  let A = null;
  let busy = false;
  function freshAnswers() {
    const last = Store.data().lastAnswers;
    if (last) return JSON.parse(JSON.stringify(Object.assign({}, last, {
      startDate: Store.dateKey()
    })));
    const p = Store.profile();
    const kid = p.ageGroup === 'kid', teen = p.ageGroup === 'teen';
    return {
      ageGroup: p.ageGroup,
      focus: kid || teen ? [ 'school' ] : p.ageGroup === 'senior' ? [ 'health', 'hobbies' ] : [ 'work' ],
      wake: kid ? '06:45' : '07:00',
      bed: kid ? '21:00' : teen ? '22:30' : '23:00',
      commitments: kid || teen ? [ {
        label: t('school'),
        start: '08:00',
        end: '14:00',
        days: [ 1, 2, 3, 4, 5 ]
      } ] : p.ageGroup === 'senior' ? [] : [ {
        label: t('work'),
        start: '09:00',
        end: '17:00',
        days: [ 1, 2, 3, 4, 5 ]
      } ],
      energy: 'morning',
      goals: [ '', '', '' ],
      activities: [ 'exercise', 'reading' ],
      customActivity: '',
      focusLength: kid ? 20 : 45,
      style: 'balanced',
      notes: '',
      mode: 'day',
      startDate: Store.dateKey()
    };
  }
  const cards = (name, items, selected, multi = false) => '<div class="choice-cards" data-group="' + name + '" data-multi="' + multi + '">' + items.map(([v, ic, title, sub]) => {
    const sel = multi ? (selected || []).includes(v) : String(selected) === String(v);
    return '<div class="choice-card ' + (sel ? 'selected' : '') + '" data-v="' + v + '">' + (ic ? '<span class="ci">' + icon(ic) + '</span>' : '') + '<b>' + title + '</b>' + (sub ? '<span>' + sub + '</span>' : '') + '</div>';
  }).join('') + '</div>';
  const chips = (name, items, selected) => '<div class="chips" data-group="' + name + '" data-multi="true">' + items.map(([v, l]) => '<span class="chip ' + ((selected || []).includes(v) ? 'selected' : '') + '" data-v="' + v + '">' + l + '</span>').join('') + '</div>';
  function goalPlaceholders() {
    const g = A.ageGroup;
    if (g === 'kid') return [ t('gph_kid_1'), t('gph_kid_2'), t('gph_kid_3') ];
    if (g === 'teen') return [ t('gph_teen_1'), t('gph_teen_2'), t('gph_teen_3') ];
    if (g === 'senior') return [ t('gph_senior_1'), t('gph_senior_2'), t('gph_senior_3') ];
    return [ t('gph_adult_1'), t('gph_adult_2'), t('gph_adult_3') ];
  }
  const Q = [ () => ({
    title: t('q1_t'),
    sub: t('q1_s'),
    body: cards('ageGroup', [ 'kid', 'teen', 'adult', 'senior' ].map(a => [ a, {
      kid: 'baby',
      teen: 'graduation',
      adult: 'briefcase',
      senior: 'leaf'
    }[a], t('age_' + a), t('age_' + a + '_d') ]), A.ageGroup)
  }), () => ({
    title: t('q2_t'),
    sub: t('q2_s'),
    body: cards('focus', [ [ 'school', 'graduation', t('area_school') ], [ 'work', 'briefcase', t('area_work') ], [ 'home', 'house', t('area_home') ], [ 'health', 'heart', t('area_health') ], [ 'hobbies', 'palette', t('area_hobbies') ], [ 'family', 'users', t('area_family') ] ].map(x => [ x[0], x[1], x[2], '' ]), A.focus, true)
  }), () => ({
    title: t('q3_t'),
    sub: t('q3_s'),
    body: '<div class="row"><div class="field"><label>' + icon('sunrise', 'sm') + ' ' + t('wake_time') + '</label><input type="time" class="input" id="qWake" value="' + A.wake + '"></div>' + '<div class="field"><label>' + icon('bed', 'sm') + ' ' + t('bed_time') + '</label><input type="time" class="input" id="qBed" value="' + A.bed + '"></div></div>' + '<p class="muted small" id="sleepHint"></p>'
  }), () => ({
    title: t('q4_t'),
    sub: t('q4_s'),
    body: '<div id="commits">' + A.commitments.map(commitRow).join('') + '</div>' + '<button class="btn sm" id="addCommit" type="button">' + icon('plus', 'sm') + t('add_commitment') + '</button>' + '<p class="muted small mt">' + t('q4_none') + '</p>'
  }), () => ({
    title: t('q5_t'),
    sub: t('q5_s'),
    body: cards('energy', [ [ 'morning', 'sunrise', t('energy_morning'), t('energy_morning_d') ], [ 'afternoon', 'sun', t('energy_afternoon'), t('energy_afternoon_d') ], [ 'evening', 'moon', t('energy_evening'), t('energy_evening_d') ] ], A.energy)
  }), () => {
    const ph = goalPlaceholders();
    return {
      title: t('q6_t'),
      sub: t('q6_s'),
      body: [ 0, 1, 2 ].map(i => '<div class="field"><label>' + t('goal') + ' ' + (i + 1) + (i ? ' <span class="muted">(' + t('optional') + ')</span>' : '') + '</label><input class="input goal-in" data-i="' + i + '" maxlength="80" placeholder="' + esc(ph[i]) + '" value="' + esc(A.goals[i] || '') + '"></div>').join('')
    };
  }, () => ({
    title: t('q7_t'),
    sub: t('q7_s'),
    body: chips('activities', [ 'exercise', 'reading', 'homework', 'chores', 'cooking', 'music', 'art', 'outdoor', 'family', 'social', 'meditation', 'games' ].map(x => [ x, t('act_' + x) ]), A.activities) + '<div class="field mt"><label>' + t('something_else') + '</label><input class="input" id="qCustom" maxlength="60" placeholder="' + t('custom_act_ph') + '" value="' + esc(A.customActivity || '') + '"></div>'
  }), () => ({
    title: t('q8_t'),
    sub: t('q8_s'),
    body: cards('focusLength', [ [ 15, 'zap', '15 ' + t('min_short'), t('fl_15') ], [ 20, 'zap', '20 ' + t('min_short'), t('fl_20') ], [ 30, 'timer', '30 ' + t('min_short'), t('fl_30') ], [ 45, 'timer', '45 ' + t('min_short'), t('fl_45') ], [ 60, 'brain', '60 ' + t('min_short'), t('fl_60') ], [ 90, 'brain', '90 ' + t('min_short'), t('fl_90') ] ], A.focusLength)
  }), () => ({
    title: t('q9_t'),
    sub: t('q9_s'),
    body: cards('style', [ [ 'strict', 'grid', t('style_strict'), t('style_strict_d') ], [ 'balanced', 'target', t('style_balanced'), t('style_balanced_d') ], [ 'relaxed', 'coffee', t('style_relaxed'), t('style_relaxed_d') ] ], A.style)
  }), () => ({
    title: t('q10_t'),
    sub: t('q10_s'),
    body: '<textarea class="input" id="qNotes" maxlength="500" rows="4" placeholder="' + t('notes_ph') + '">' + esc(A.notes || '') + '</textarea>' + '<p class="field-label mt" style="margin-bottom:8px">' + t('quick_add') + '</p><div class="chips">' + [ 'sugg_1', 'sugg_2', 'sugg_3', 'sugg_4', 'sugg_5', 'sugg_6' ].map(k => '<span class="chip" data-sugg="' + esc(t(k)) + '">+ ' + t(k) + '</span>').join('') + '</div>'
  }) ];
  function commitRow(c, i) {
    const days = [ 'd_sun', 'd_mon', 'd_tue', 'd_wed', 'd_thu', 'd_fri', 'd_sat' ];
    return '<div class="commit" data-i="' + i + '"><div class="commit-row">' + '<input class="input c-label" maxlength="40" placeholder="' + t('commit_ph') + '" value="' + esc(c.label) + '">' + '<input type="time" class="input c-start" value="' + c.start + '"><input type="time" class="input c-end" value="' + c.end + '">' + '<button class="icon-btn danger c-del" type="button" aria-label="' + t('delete') + '">' + icon('trash', 'sm') + '</button></div>' + '<div class="commit-days">' + [ 1, 2, 3, 4, 5, 6, 0 ].map(d => '<button type="button" class="day-toggle ' + (c.days.includes(d) ? 'on' : '') + '" data-d="' + d + '">' + t(days[d]) + '</button>').join('') + '</div></div>';
  }
  function collect(main) {
    if (step === 2) {
      A.wake = $('#qWake', main).value || A.wake;
      A.bed = $('#qBed', main).value || A.bed;
    }
    if (step === 3) {
      A.commitments = $$('.commit', main).map(el => ({
        label: $('.c-label', el).value.trim(),
        start: $('.c-start', el).value,
        end: $('.c-end', el).value,
        days: $$('.day-toggle.on', el).map(b => +b.dataset.d)
      }));
    }
    if (step === 5) A.goals = $$('.goal-in', main).map(i => i.value.trim());
    if (step === 6) A.customActivity = $('#qCustom', main).value.trim();
    if (step === 9) A.notes = $('#qNotes', main).value.trim();
  }
  function validate() {
    if (step === 1 && !A.focus.length) return t('val_pick_one');
    if (step === 2 && Store.toMin(A.bed) === Store.toMin(A.wake)) return t('val_times');
    if (step === 3) {
      const bad = A.commitments.find(c => c.label && (!c.start || !c.end || Store.toMin(c.end) <= Store.toMin(c.start) || !c.days.length));
      if (bad) return t('val_commit');
    }
    if (step === 5 && !A.goals.some(Boolean)) return t('val_goal');
    return '';
  }
  function render(main) {
    if (!A) A = freshAnswers();
    if (busy) return renderBusy(main);
    const pct = Math.round(Math.min(step, TOTAL) / TOTAL * 100);
    let inner;
    if (step < TOTAL) {
      const q = Q[step]();
      inner = '<div class="q-num">' + t('question_x', {
        n: step + 1,
        total: TOTAL
      }) + '</div><h2 class="q-title">' + q.title + '</h2><p class="q-sub">' + q.sub + '</p>' + q.body;
    } else inner = reviewStep();
    main.innerHTML = '<div class="page-head"><div><h1>' + t('page_planner') + '</h1><p>' + t('planner_sub') + '</p></div>' + '<div class="actions">' + (Store.data().schedules.length ? '<a class="btn" href="#/schedule">' + icon('calendar', 'sm') + t('my_schedules') + '</a>' : '') + '<button class="btn ghost" id="pRestart">' + icon('refresh', 'sm') + t('start_over') + '</button></div></div>' + '<div class="wizard"><div class="wizard-progress"><div class="progress"><div style="width:' + pct + '%"></div></div><span>' + pct + '%</span></div>' + '<div class="card q-card">' + inner + '</div>' + '<div class="wizard-nav"><button class="btn" id="pBack" ' + (step === 0 ? 'disabled' : '') + '>' + icon('left', 'sm') + t('back') + '</button>' + (step < TOTAL ? '<button class="btn primary" id="pNext">' + (step === TOTAL - 1 ? t('review') : t('next')) + icon('right', 'sm') + '</button>' : '<button class="btn primary lg" id="pGen">' + icon('sparkles', 'sm') + t('generate_schedule') + '</button>') + '</div></div>';
    bind(main);
  }
  function reviewStep() {
    const goals = A.goals.filter(Boolean);
    return '<div class="q-num">' + t('almost_done') + '</div><h2 class="q-title">' + t('review_t') + '</h2><p class="q-sub">' + t('review_s') + '</p>' + cards('mode', [ [ 'day', 'sun', t('plan_day'), t('plan_day_d') ], [ 'week', 'calendar', t('plan_week'), t('plan_week_d') ] ], A.mode) + '<div class="field mt"><label>' + t('start_date') + '</label><input type="date" class="input" id="qStart" value="' + A.startDate + '" style="max-width:220px"></div>' + '<div class="list mb small">' + rv(t('age_group'), t('age_' + A.ageGroup), 0) + rv(t('rv_areas'), A.focus.map(f => t('area_' + f)).join(', '), 1) + rv(t('rv_day'), UI.fmtTime(A.wake) + ' → ' + UI.fmtTime(A.bed), 2) + rv(t('rv_commit'), A.commitments.filter(c => c.label).map(c => c.label + ' ' + UI.fmtTime(c.start) + '–' + UI.fmtTime(c.end)).join(', ') || '—', 3) + rv(t('rv_energy'), t('energy_' + A.energy), 4) + rv(t('rv_goals'), goals.join(', ') || '—', 5) + rv(t('rv_acts'), [ ...A.activities.map(a => t('act_' + a)), A.customActivity ].filter(Boolean).join(', ') || '—', 6) + rv(t('rv_focus'), A.focusLength + ' ' + t('min_short'), 7) + rv(t('rv_style'), t('style_' + A.style), 8) + rv(t('rv_notes'), A.notes || '—', 9) + '</div>' + '<div class="notice">' + icon('sparkles') + '<span>' + t('ai_on_notice') + '</span></div>';
  }
  const rv = (label, val, s) => '<div class="list-item"><div class="grow"><div class="sub">' + label + '</div><div class="title">' + esc(val) + '</div></div><button class="btn ghost sm" data-goto="' + s + '">' + icon('edit', 'sm') + '</button></div>';
  function renderBusy(main) {
    main.innerHTML = '<div class="wizard mt"><div class="card generating"><div class="spinner"></div><h2 class="q-title">' + t('generating_t') + '</h2><p class="muted" id="genMsg">' + t('gen_msg_1') + '</p></div></div>';
    let i = 1;
    const iv = setInterval(() => {
      const el = $('#genMsg');
      if (!el || !busy) return clearInterval(iv);
      i = i % 4 + 1;
      el.textContent = t('gen_msg_' + i);
    }, 2200);
  }
  function bind(main) {
    $$('[data-group]', main).forEach(group => {
      const name = group.dataset.group, multi = group.dataset.multi === 'true';
      $$('[data-v]', group).forEach(el => el.addEventListener('click', () => {
        let v = el.dataset.v;
        if (name === 'focusLength') v = +v;
        if (multi) {
          const arr = A[name];
          const i = arr.indexOf(v);
          if (i >= 0) arr.splice(i, 1); else arr.push(v);
          el.classList.toggle('selected');
        } else {
          A[name] = v;
          $$('[data-v]', group).forEach(x => x.classList.toggle('selected', x === el));
          if (name === 'mode' && v === 'week') {}
        }
      }));
    });
    const sh = $('#sleepHint', main);
    if (sh) {
      const upd = () => {
        const w = Store.toMin($('#qWake').value || A.wake), b = Store.toMin($('#qBed').value || A.bed);
        const sleep = (w - b + 1440) % 1440 / 60;
        const need = {
          kid: 10,
          teen: 9,
          adult: 7.5,
          senior: 7.5
        }[A.ageGroup];
        sh.innerHTML = t('sleep_hint', {
          h: sleep.toFixed(1)
        }) + (sleep < need - .5 ? ' <b style="color:var(--warning)">' + t('sleep_low', {
          n: need
        }) + '</b>' : ' ' + t('sleep_ok'));
      };
      upd();
      $('#qWake').addEventListener('input', upd);
      $('#qBed').addEventListener('input', upd);
    }
    const cBox = $('#commits', main);
    if (cBox) {
      const bindRows = () => {
        $$('.day-toggle', cBox).forEach(b => b.onclick = () => b.classList.toggle('on'));
        $$('.c-del', cBox).forEach(b => b.onclick = () => {
          b.closest('.commit').remove();
        });
      };
      bindRows();
      $('#addCommit').addEventListener('click', () => {
        cBox.insertAdjacentHTML('beforeend', commitRow({
          label: '',
          start: '16:00',
          end: '17:00',
          days: [ 1, 2, 3, 4, 5 ]
        }, Date.now()));
        bindRows();
        $$('.c-label', cBox).pop().focus();
      });
    }
    $$('[data-sugg]', main).forEach(c => c.addEventListener('click', () => {
      const ta = $('#qNotes');
      ta.value = (ta.value ? ta.value.replace(/\s*$/, '') + '. ' : '') + c.dataset.sugg;
      c.classList.add('selected');
    }));
    $$('[data-goto]', main).forEach(b => b.addEventListener('click', () => {
      step = +b.dataset.goto;
      render(main);
    }));
    const sd = $('#qStart', main);
    if (sd) sd.addEventListener('change', () => {
      A.startDate = sd.value || Store.dateKey();
    });
    $('#pBack', main).addEventListener('click', () => {
      collect(main);
      step = Math.max(0, step - 1);
      render(main);
    });
    const next = $('#pNext', main);
    if (next) next.addEventListener('click', () => {
      collect(main);
      const err = validate();
      if (err) return UI.toast(err, 'error');
      step++;
      render(main);
    });
    $('#pRestart', main).addEventListener('click', () => {
      step = 0;
      A = null;
      Store.data().lastAnswers = null;
      render(main);
    });
    const gen = $('#pGen', main);
    if (gen) gen.addEventListener('click', () => generate(main));
    $$('input.input', main).forEach(i => i.addEventListener('keydown', e => {
      if (e.key === 'Enter' && next) {
        e.preventDefault();
        next.click();
      }
    }));
  }
  async function generate(main) {
    A.commitments = A.commitments.filter(c => c.label);
    Store.data().lastAnswers = JSON.parse(JSON.stringify(A));
    Store.save();
    busy = true;
    render(main);
    const schedule = await AI.generateSchedule(A);
    busy = false;
    if (!schedule.days.some(d => d.blocks.length)) {
      UI.toast(t('ai_unknown'), 'error');
      render(main);
      return;
    }
    Store.add('schedules', schedule);
    Store.setActiveSchedule(schedule.id);
    Gamify.award(Gamify.POINTS.schedule);
    step = 0;
    A = null;
    UI.toast(t('schedule_ready'));
    App.go('schedule');
  }
  Pages.planner = {
    render: render
  };
})();
