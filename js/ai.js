(function () {
  const AI = { name: 'Timewise AI' };

  const ACTIVITY_INFO = {
    exercise: { cat: 'exercise', dur: 40 }, reading: { cat: 'hobby', dur: 30 }, chores: { cat: 'chores', dur: 30 },
    music: { cat: 'hobby', dur: 30 }, outdoor: { cat: 'exercise', dur: 45 }, family: { cat: 'family', dur: 45 },
    meditation: { cat: 'rest', dur: 15 }, homework: { cat: 'study', dur: 45 }, cooking: { cat: 'chores', dur: 40 },
    games: { cat: 'hobby', dur: 30 }, art: { cat: 'hobby', dur: 40 }, social: { cat: 'family', dur: 45 }
  };
  const ENERGY_WINDOWS = { morning: [360, 720], afternoon: [720, 1020], evening: [1020, 1320] };
  const PERIODS = { morning: [300, 720], afternoon: [720, 1020], evening: [1020, 1440], night: [1020, 1440] };
  const SLEEP_NEED = { kid: 10, teen: 9, adult: 7.5, senior: 7.5 };
  const wait = ms => new Promise(r => setTimeout(r, ms));

  function dateList(a) {
    const n = a.mode === 'week' ? 7 : 1;
    return Array.from({ length: n }, (_, i) => Store.addDays(a.startDate, i));
  }

  function sleepHours(a) {
    return ((Store.toMin(a.wake) - Store.toMin(a.bed) + 1440) % 1440) / 60;
  }

  function buildDay(a, date) {
    const focusLen = Math.max(15, Math.min(120, +a.focusLength || 30));
    const breakLen = a.style === 'strict' ? 5 : a.style === 'relaxed' ? 15 : 10;
    const goals = (a.goals || []).map(s => s.trim()).filter(Boolean);
    const goalCat = (a.focus || []).includes('work') && !(a.focus || []).includes('school') ? 'work' : 'study';
    const acts = (a.activities || []).filter(x => ACTIVITY_INFO[x]);
    if (a.customActivity) acts.push('custom');

    const dow = Store.parseDate(date).getDay();
    const weekend = dow === 0 || dow === 6;
    let wake = Store.toMin(a.wake || '07:00');
    let bed = Store.toMin(a.bed || '22:00');
    if (bed <= wake) bed = 1439;
    if (weekend && a.ageGroup !== 'senior') wake = Math.min(wake + 30, bed - 240);

    const fixed = [];
    const addFixed = (s, e, title, category, notes = '') => {
      s = Math.max(wake, s); e = Math.min(bed, e);
      if (e - s < 10) return false;
      if (fixed.some(f => s < f.e && e > f.s)) return false;
      fixed.push({ s, e, title, category, notes });
      return true;
    };
    (a.commitments || []).forEach(c => {
      if (!c.label || !c.start || !c.end) return;
      if ((c.days || []).includes(dow)) addFixed(Store.toMin(c.start), Store.toMin(c.end), c.label, goalCat === 'work' ? 'work' : 'study', t('fixed_commitment'));
    });
    addFixed(wake, wake + 30, t('blk_morning_routine'), 'routine', t('blk_morning_routine_n'));
    addFixed(wake + 30, wake + 55, t('blk_breakfast'), 'meal');
    if (!addFixed(780, 825, t('blk_lunch'), 'meal')) addFixed(720, 765, t('blk_lunch'), 'meal') || addFixed(840, 885, t('blk_lunch'), 'meal');
    const dinnerStart = Math.min(1170, bed - 150);
    addFixed(dinnerStart, dinnerStart + 45, t('blk_dinner'), 'meal');
    addFixed(bed - 30, bed, t('blk_wind_down'), 'routine', t('blk_wind_down_n'));
    fixed.sort((x, y) => x.s - y.s);

    let gaps = [];
    let cur = wake;
    fixed.forEach(f => { if (f.s - cur >= 15) gaps.push({ s: cur, e: f.s }); cur = Math.max(cur, f.e); });
    if (bed - cur >= 15) gaps.push({ s: cur, e: bed });

    const placed = [];
    const [ew0, ew1] = ENERGY_WINDOWS[a.energy] || ENERGY_WINDOWS.morning;
    const energyScore = g => Math.max(0, Math.min(g.e, ew1) - Math.max(g.s, ew0));
    function place(len, title, category, notes, preferEnergy, withBreak) {
      const order = preferEnergy ? [...gaps].sort((x, y) => energyScore(y) - energyScore(x) || x.s - y.s) : [...gaps].sort((x, y) => x.s - y.s);
      const need = len + (withBreak ? breakLen : 0);
      const g = order.find(gg => gg.e - gg.s >= len);
      if (!g) return false;
      placed.push({ s: g.s, e: g.s + len, title, category, notes });
      let used = len;
      if (withBreak && g.e - g.s >= need) {
        placed.push({ s: g.s + len, e: g.s + need, title: t('blk_break'), category: 'break', notes: t('blk_break_n') });
        used = need;
      }
      g.s += used;
      gaps = gaps.filter(x => x.e - x.s >= 10);
      return true;
    }

    const sessionsPerGoal = a.style === 'strict' ? 2 : a.style === 'relaxed' ? 1 : (goals.length <= 2 ? 2 : 1);
    const lighter = weekend && !(a.commitments || []).some(c => (c.days || []).includes(dow));
    for (let r = 0; r < sessionsPerGoal; r++) {
      goals.forEach(g => {
        if (lighter && r > 0) return;
        place(focusLen, g, goalCat, t('blk_goal_n'), true, true);
      });
    }
    acts.forEach(x => {
      if (x === 'custom') { place(40, a.customActivity, 'hobby', '', false, false); return; }
      const info = ACTIVITY_INFO[x];
      place(info.dur, t('act_' + x), info.cat, '', x === 'exercise' && a.energy === 'morning', false);
    });
    if (dow === 0) place(20, t('blk_weekly_review'), 'routine', t('blk_weekly_review_n'), false, false);
    if (a.ageGroup === 'kid') place(45, t('blk_play'), 'hobby', '', false, false);

    gaps.forEach(g => {
      const len = g.e - g.s;
      if (len >= 10) placed.push({ s: g.s, e: g.e, title: len >= 40 ? t('blk_free') : t('blk_buffer'), category: 'rest', notes: '' });
    });

    const blocks = [...fixed, ...placed].sort((x, y) => x.s - y.s).map(b => ({
      id: Store.uid(), start: Store.toTime(b.s), end: Store.toTime(b.e), title: b.title, category: b.category, notes: b.notes || '', done: false
    }));
    return { date, blocks };
  }

  function personalTips(a) {
    const tips = [];
    const goals = (a.goals || []).filter(Boolean);
    tips.push(t('aitip_energy', { e: t('energy_' + a.energy).toLowerCase() }));
    tips.push(t('aitip_focus', { n: a.focusLength }));
    const h = sleepHours(a), need = SLEEP_NEED[a.ageGroup] || 8;
    tips.push(h < need - 0.5 ? t('aitip_sleep_low', { n: need }) : t('aitip_sleep', { h: h.toFixed(1) }));
    if (goals[0]) tips.push(t('aitip_goal', { g: goals[0] }));
    if (a.mode === 'week') tips.push(t('aitip_week'));
    if (a.ageGroup === 'kid') tips.push(t('aitip_kid'));
    if (a.ageGroup === 'senior') tips.push(t('aitip_senior'));
    tips.push(t('aitip_edit'));
    return tips.slice(0, 6);
  }

  AI.buildSchedule = function (a) {
    const dates = dateList(a);
    return {
      id: Store.uid(),
      title: a.mode === 'week' ? t('my_week_plan') : t('my_day_plan'),
      summary: t('ai_summary', { style: t('style_' + a.style), wake: UI.fmtTime(a.wake), bed: UI.fmtTime(a.bed) }),
      tips: personalTips(a),
      mode: dates.length > 1 ? 'week' : 'day',
      days: dates.map(d => buildDay(a, d)),
      answers: a, source: 'timewise', createdAt: Date.now()
    };
  };

  AI.generateSchedule = async function (a) {
    await wait(1600);
    return AI.buildSchedule(a);
  };

  function rebuild(s, change) {
    if (!s.answers || !s.answers.wake) return { ok: false, msg: t('ai_cant_rebuild') };
    const a = JSON.parse(JSON.stringify(s.answers));
    change(a);
    a.startDate = s.days[0].date;
    a.mode = s.days.length > 1 ? 'week' : 'day';
    const fresh = AI.buildSchedule(a);
    s.days = fresh.days.slice(0, s.days.length);
    s.answers = a; s.summary = fresh.summary; s.tips = fresh.tips;
    return { ok: true, msg: t('ai_done') };
  }

  function mergeRest(day) {
    day.blocks.sort((x, y) => Store.toMin(x.start) - Store.toMin(y.start));
    const out = [];
    day.blocks.forEach(b => {
      const prev = out[out.length - 1];
      if (prev && prev.category === 'rest' && b.category === 'rest' && prev.end === b.start) {
        prev.end = b.end;
        prev.title = Store.toMin(prev.end) - Store.toMin(prev.start) >= 40 ? t('blk_free') : t('blk_buffer');
      } else out.push(b);
    });
    day.blocks = out;
  }

  function findSlot(day, period, len, atEnd) {
    const [w0, w1] = period ? PERIODS[period] : [0, 1440];
    const cands = day.blocks.filter(b => b.category === 'rest').map(b => {
      const s = Math.max(Store.toMin(b.start), w0), e = Math.min(Store.toMin(b.end), w1);
      return { b, s, e };
    }).filter(c => c.e - c.s >= len);
    if (!cands.length) return null;
    const c = atEnd ? cands[cands.length - 1] : cands[0];
    return { block: c.b, start: atEnd ? c.e - len : c.s };
  }

  function carve(day, slot, len, nb) {
    const b = slot.block, bs = Store.toMin(b.start), be = Store.toMin(b.end);
    const parts = [];
    if (slot.start - bs >= 5) parts.push(Object.assign({}, b, { id: Store.uid(), end: Store.toTime(slot.start) }));
    parts.push(Object.assign({ id: Store.uid(), done: false, notes: '' }, nb, { start: Store.toTime(slot.start), end: Store.toTime(slot.start + len) }));
    if (be - (slot.start + len) >= 5) parts.push(Object.assign({}, b, { id: Store.uid(), start: Store.toTime(slot.start + len) }));
    day.blocks = day.blocks.filter(x => x !== b).concat(parts);
    mergeRest(day);
  }

  const norm = s => String(s || '').toLowerCase().replace(/[“”"'.!?]/g, '').trim();
  function matches(b, term) {
    const title = norm(b.title);
    if (!term || term.length < 3) return false;
    return title.includes(term) || term.includes(title) || norm(t('cat_' + b.category)) === term || b.category === term;
  }

  function guessCategory(what) {
    const w = norm(what);
    const map = [
      ['exercise', /exercis|workout|run|gym|yoga|sport|walk|व्यायाम|ejercicio|sport|marche|course/],
      ['study', /study|revis|homework|maths|math|science|read up|learn|पढ़ाई|होमवर्क|estudi|deberes|étud|devoirs|révis/],
      ['hobby', /read|book|music|guitar|piano|art|draw|paint|game|पढ़ना|संगीत|lectur|música|lecture|musique|dessin/],
      ['rest', /meditat|nap|relax|pray|ध्यान|पूजा|medit|siesta|sieste|prière/],
      ['family', /family|friend|परिवार|दोस्त|familia|amigos|famille|amis/],
      ['chores', /clean|tidy|chore|cook|laundry|सफ़ाई|limpi|cocin|ménage|cuisine/]
    ];
    const hit = map.find(([, re]) => re.test(w));
    return hit ? hit[0] : 'other';
  }

  function parseTime(h, m, ap, isBed) {
    h = +h; m = +(m || 0);
    if (ap) { ap = ap.toLowerCase(); if (ap.startsWith('p') && h < 12) h += 12; if (ap.startsWith('a') && h === 12) h = 0; }
    else if (isBed && h <= 12) h = h <= 3 ? 23 : h + 12;
    if (isBed && h === 23 && !ap && m === 0) m = 30;
    return Store.pad(Math.min(23, h)) + ':' + Store.pad(Math.min(59, m));
  }

  function periodFrom(text) {
    if (/before bed|bedtime|at night|tonight|सोने से पहले|antes de dormir|avant de dormir|avant le coucher/.test(text)) return 'bed';
    if (/morning|सुबह|mañana|matin/.test(text)) return 'morning';
    if (/afternoon|दोपहर|tarde|après-midi/.test(text)) return 'afternoon';
    if (/evening|night|शाम|रात|noche|soir/.test(text)) return 'evening';
    return '';
  }

  function addActivity(s, what, len, when) {
    const title = what.charAt(0).toUpperCase() + what.slice(1);
    const cat = guessCategory(what);
    let n = 0;
    s.days.forEach(day => {
      const slot = when === 'bed' ? findSlot(day, 'evening', len, true) || findSlot(day, null, len, true) : findSlot(day, when || null, len, false);
      if (slot) { carve(day, slot, len, { title, category: cat }); n++; }
    });
    return n ? { ok: true, msg: t('ai_added', { x: title, n }) } : { ok: false, msg: t('ai_no_room') };
  }

  const INTENTS = {
    more_breaks: s => rebuild(s, a => { a.style = 'relaxed'; a.focusLength = Math.max(15, (+a.focusLength || 30) - 10); }),
    lighter_morning: s => rebuild(s, a => { if (a.energy === 'morning') a.energy = 'afternoon'; if (a.style === 'strict') a.style = 'balanced'; a.wake = Store.toTime(Math.min(Store.toMin(a.wake) + 30, 600)); }),
    more_free: s => rebuild(s, a => { a.style = 'relaxed'; a.activities = (a.activities || []).slice(0, Math.max(1, (a.activities || []).length - 1)); }),
    earlier_bed: s => rebuild(s, a => { a.bed = Store.toTime(Math.max(Store.toMin(a.bed) - 30, Store.toMin(a.wake) + 600)); }),
    shorter_focus: s => rebuild(s, a => { a.focusLength = Math.max(15, (+a.focusLength || 30) - 10); }),
    longer_focus: s => rebuild(s, a => { a.focusLength = Math.min(90, (+a.focusLength || 30) + 15); }),
    more_structure: s => rebuild(s, a => { a.style = 'strict'; }),
    add_reading_bed: s => addActivity(s, t('act_reading'), 30, 'bed'),
    add_exercise: s => addActivity(s, t('act_exercise'), 30, '')
  };
  AI.INTENTS = Object.keys(INTENTS);

  AI.tweak = async function (s, input) {
    await wait(700);
    if (INTENTS[input]) return INTENTS[input](s);
    const text = norm(input);
    let m;

    if ((m = text.match(/(?:wake|get up|उठ|despert|lev)\D{0,12}(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/))) {
      const time = parseTime(m[1], m[2], m[3], false);
      return rebuild(s, a => { a.wake = time; });
    }
    if ((m = text.match(/(?:bed|sleep|सो|dormir|couch)\D{0,12}(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/))) {
      const time = parseTime(m[1], m[2], m[3], true);
      return rebuild(s, a => { a.bed = time; });
    }
    if ((m = text.match(/(?:add|include|जोड़ो|añade|agrega|ajoute)\s+(?:(\d+)\s*(minutes|minute|mins|min|hours|hour|hrs|hr|h|मिनट|घंटे|minutos|horas|heures|heure)?\s+)?(?:of\s+|de\s+|du\s+|d\s+|का\s+|की\s+)?(.+)$/))) {
      let len = m[1] ? +m[1] : 30;
      if (m[2] && /^h|घंटे|hora|heure/.test(m[2])) len *= 60;
      len = Math.max(10, Math.min(180, len));
      const when = periodFrom(m[3]);
      const what = m[3].replace(/\b(before bed|bedtime|at night|tonight|in the|the|morning|afternoon|evening|every day|daily)\b/g, '').replace(/सोने से पहले|antes de dormir|avant de dormir|por la|le soir|le matin/g, '').replace(/\s+/g, ' ').trim();
      if (!what) return { ok: false, msg: t('ai_unknown') };
      return addActivity(s, what, len, when);
    }
    if ((m = text.match(/(?:move|shift|put|खिसका|mueve|mover|déplace|mets)\s+(.+?)\s+(?:to|into|in|को|a la|al|à|au|en)\s+(?:the\s+|la\s+|le\s+)?(.+)$/))) {
      const term = norm(m[1]), period = periodFrom(m[2]);
      if (!period) return { ok: false, msg: t('ai_unknown') };
      const target = period === 'bed' ? 'evening' : period;
      let n = 0, found = false;
      s.days.forEach(day => {
        const b = day.blocks.find(x => matches(x, term) && x.notes !== t('fixed_commitment'));
        if (!b) return;
        found = true;
        const len = Store.toMin(b.end) - Store.toMin(b.start);
        const [w0, w1] = PERIODS[target];
        if (Store.toMin(b.start) >= w0 && Store.toMin(b.end) <= w1) { n++; return; }
        const slot = findSlot(day, target, len, period === 'bed');
        if (!slot) return;
        const moved = { title: b.title, category: b.category, notes: b.notes };
        Object.assign(b, { title: t('blk_free'), category: 'rest', notes: '' });
        carve(day, slot, len, moved);
        n++;
      });
      if (!found) return { ok: false, msg: t('ai_not_found', { x: m[1] }) };
      return n ? { ok: true, msg: t('ai_moved', { x: m[1], w: t('energy_' + target).toLowerCase(), n }) } : { ok: false, msg: t('ai_no_room') };
    }
    if ((m = text.match(/(?:remove|delete|drop|cancel|no more|हटा|quita|elimina|supprime|enlève)\s+(?:the\s+|my\s+)?(.+)$/))) {
      const term = norm(m[1]);
      let n = 0;
      s.days.forEach(day => {
        let hit = false;
        day.blocks.forEach(b => { if (matches(b, term) && b.notes !== t('fixed_commitment')) { Object.assign(b, { title: t('blk_free'), category: 'rest', notes: '' }); hit = true; } });
        if (hit) { mergeRest(day); n++; }
      });
      return n ? { ok: true, msg: t('ai_removed', { x: m[1], n }) } : { ok: false, msg: t('ai_not_found', { x: m[1] }) };
    }
    if (/break|pause|rest|ब्रेक|descanso/.test(text)) return INTENTS.more_breaks(s);
    if (/(light|easy|relax|slow).*morning|morning.*(light|easy|relax|slow)|सुबह.*हल्क|mañana.*ligera|matin.*léger/.test(text)) return INTENTS.lighter_morning(s);
    if (/free time|more time for me|खाली समय|tiempo libre|temps libre/.test(text)) return INTENTS.more_free(s);
    if (/longer (focus|session)|focus longer|लंबे सत्र|sesiones más largas|sessions plus longues/.test(text)) return INTENTS.longer_focus(s);
    if (/shorter (focus|session)|छोटे सत्र|sesiones más cortas|sessions plus courtes/.test(text)) return INTENTS.shorter_focus(s);
    if (/(earlier|early).*(bed|sleep)|जल्दी सो|dormir antes|coucher plus tôt/.test(text)) return INTENTS.earlier_bed(s);
    if (/strict|structured|productive|busy|व्यवस्थित|estructurad|structur/.test(text)) return INTENTS.more_structure(s);
    return { ok: false, msg: t('ai_unknown') };
  };

  AI.breakDownGoal = async function (goal) {
    await wait(900);
    const keys = goal.type === 'exam' ? ['ex_1', 'ex_2', 'ex_3', 'ex_4', 'ex_5', 'ex_6'] : ['gs_1', 'gs_2', 'gs_3', 'gs_4', 'gs_5'];
    const left = goal.deadline ? UI.relDays(goal.deadline) : 0;
    return keys.map((k, i) => {
      let step = t(k, { g: goal.title });
      if (left > 1) {
        const d = Store.addDays(Store.dateKey(), Math.max(0, Math.round(left * (i + 1) / keys.length) - (i === keys.length - 1 ? 1 : 0)));
        step += ' · ' + t('by_date', { d: UI.fmtDate(d, { month: 'short', day: 'numeric' }) });
      }
      return step;
    });
  };

  window.AI = AI;
})();
