window.Pages = window.Pages || {};

(function() {
  const {$: $, $$: $$, esc: esc} = UI;
  const PX = 1.15;
  let dayIdx = 0;
  let nowTimer = null;
  function sched() {
    return Store.activeSchedule();
  }
  function save() {
    Store.save();
  }
  function pickDefaultDay(s) {
    const i = s.days.findIndex(d => d.date === Store.dateKey());
    return i >= 0 ? i : 0;
  }
  function render(main) {
    const all = Store.list('schedules');
    const s = sched();
    if (!s) {
      main.innerHTML = '<div class="page-head"><div><h1>' + t('page_schedule') + '</h1><p>' + t('schedule_sub') + '</p></div></div>' + '<div class="card">' + UI.empty('calendar', t('no_schedule_yet'), '<a class="btn primary" href="#/planner">' + icon('sparkles', 'sm') + t('create_with_ai') + '</a>') + '</div>';
      return;
    }
    if (dayIdx >= s.days.length) dayIdx = pickDefaultDay(s);
    const day = s.days[dayIdx];
    main.innerHTML = '<div class="page-head"><div><h1>' + esc(s.title) + '</h1><p>' + esc(s.summary || t('schedule_sub')) + '</p>' + '<p class="small muted" style="margin-top:6px">' + '<span class="pill primary">' + icon('sparkles', 'sm') + ' Timewise AI</span>' + '</p></div>' + '<div class="actions">' + (all.length > 1 ? '<select class="input" id="sPick" style="width:auto">' + UI.options(all.map(x => [ x.id, x.title + ' · ' + UI.fmtDate(x.days[0].date) ]), s.id) + '</select>' : '') + '<a class="btn" href="#/planner">' + icon('plus', 'sm') + t('new_plan') + '</a></div></div>' + '<div class="sched-toolbar">' + '<button class="btn primary" id="sGcal">' + icon('calendar', 'sm') + t('add_to_gcal') + '</button>' + '<button class="btn" id="sPrint">' + icon('print', 'sm') + t('print') + '</button>' + '<button class="btn" id="sIcs">' + icon('download', 'sm') + t('download_ics') + '</button>' + (s.days.length === 1 ? '<button class="btn" id="sRepeat">' + icon('copy', 'sm') + t('repeat_week') + '</button>' : '') + '<button class="btn ghost danger" id="sDel" style="margin-left:auto">' + icon('trash', 'sm') + t('delete_plan') + '</button></div>' + (s.days.length > 1 ? '<div class="day-tabs">' + s.days.map((d, i) => '<button class="day-tab ' + (i === dayIdx ? 'active' : '') + '" data-day="' + i + '"><b>' + UI.weekday(d.date, 'short') + '</b><span>' + UI.fmtDate(d.date, {
      month: 'short',
      day: 'numeric'
    }) + '</span></button>').join('') + '</div>' : '') + '<div class="sched-layout"><div>' + '<div class="card-head"><h3>' + UI.fmtDate(day.date, {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    }) + '</h3><span class="small muted">' + t('drag_hint') + '</span></div>' + timeline(day) + '<div class="legend mt">' + [ ...new Set(day.blocks.map(b => b.category)) ].map(c => '<span><i class="cat-dot" style="--cat:' + UI.catColor(c) + '"></i>' + t('cat_' + c) + '</span>').join('') + '</div></div>' + '<div class="grid">' + ('<div class="card"><div class="card-head"><h3>' + icon('wand') + t('ask_ai_change') + '</h3></div>' + '<form class="ai-tweak" id="tweakForm"><input class="input" id="tweakIn" maxlength="300" placeholder="' + t('tweak_ph') + '"><button class="btn primary" id="tweakBtn">' + icon('send', 'sm') + '</button></form>' + '<div class="chips mt">' + AI.INTENTS.map(k => '<span class="chip" data-cmd="' + k + '">' + t('cmd_' + k) + '</span>').join('') + '</div>' + '</div>') + '<div class="card"><div class="card-head"><h3>' + icon('list') + t('blocks') + '</h3><button class="btn sm" id="addBlock">' + icon('plus', 'sm') + t('add_block') + '</button></div>' + '<div class="list block-list">' + (day.blocks.length ? day.blocks.map(b => '<div class="list-item ' + (b.done ? 'done' : '') + '"><button class="check ' + (b.done ? 'on' : '') + '" data-bdone="' + b.id + '">' + icon('check') + '</button>' + '<span class="cat-dot" style="--cat:' + UI.catColor(b.category) + '"></span><div class="grow"><div class="title">' + esc(b.title) + '</div><div class="sub">' + UI.fmtTime(b.start) + ' – ' + UI.fmtTime(b.end) + '</div></div>' + '<a class="icon-btn sm" target="_blank" rel="noopener" title="' + t('add_one_gcal') + '" href="' + Cal.googleLink(day.date, b) + '">' + icon('external', 'sm') + '</a>' + '<button class="icon-btn sm" data-bedit="' + b.id + '" title="' + t('edit') + '">' + icon('edit', 'sm') + '</button></div>').join('') : '<p class="muted small">' + t('no_blocks_today') + '</p>') + '</div></div>' + (s.tips && s.tips.length ? '<div class="card"><div class="card-head"><h3>' + icon('lightbulb') + t('coach_tips') + '</h3></div><ul class="tips" style="padding-left:18px;margin:0">' + s.tips.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul></div>' : '') + '</div></div>';
    bind(main, s, day);
    placeNow(day);
    clearInterval(nowTimer);
    nowTimer = setInterval(() => placeNow(day), 6e4);
  }
  function range(day) {
    if (!day.blocks.length) return [ 7 * 60, 22 * 60 ];
    const s = Math.min(...day.blocks.map(b => Store.toMin(b.start)));
    const e = Math.max(...day.blocks.map(b => Store.toMin(b.end)));
    return [ Math.floor(s / 60) * 60, Math.min(1440, Math.ceil(e / 60) * 60) ];
  }
  function timeline(day) {
    const [r0, r1] = range(day);
    const h = (r1 - r0) * PX + 16;
    let html = '<div class="timeline" style="height:' + h + 'px"><div class="timeline-inner" id="tl" style="height:' + h + 'px" data-r0="' + r0 + '">';
    for (let m = r0; m <= r1; m += 60) html += '<div class="hour-line" style="top:' + ((m - r0) * PX + 8) + 'px"><span>' + UI.fmtTime(Store.toTime(Math.min(m, 1439))).replace(':00', '') + '</span></div>';
    day.blocks.forEach(b => {
      const top = (Store.toMin(b.start) - r0) * PX + 8, hh = Math.max(9, (Store.toMin(b.end) - Store.toMin(b.start)) * PX - 2);
      html += '<div class="tl-block' + (hh < 22 ? ' tiny' : '') + '" title="' + esc(b.title) + '" data-id="' + b.id + '" style="--cat:' + UI.catColor(b.category) + ';top:' + top + 'px;height:' + hh + 'px">' + '<b>' + (b.done ? '✓ ' : '') + esc(b.title) + '</b>' + (hh > 34 ? '<span>' + UI.fmtTime(b.start) + ' – ' + UI.fmtTime(b.end) + '</span>' : '') + '</div>';
    });
    return html + '</div></div>';
  }
  function placeNow(day) {
    const tl = $('#tl');
    if (!tl) return;
    const old = $('.tl-now', tl);
    if (old) old.remove();
    if (day.date !== Store.dateKey()) return;
    const r0 = +tl.dataset.r0, n = new Date, m = n.getHours() * 60 + n.getMinutes();
    const [a, b] = range(day);
    if (m < a || m > b) return;
    tl.insertAdjacentHTML('beforeend', '<div class="tl-now" style="top:' + ((m - r0) * PX + 8) + 'px"></div>');
  }
  function enableDrag(main, s, day) {
    $$('.tl-block', main).forEach(el => {
      el.addEventListener('pointerdown', e => {
        const b = day.blocks.find(x => x.id === el.dataset.id);
        if (!b) return;
        const y0 = e.clientY, top0 = parseFloat(el.style.top), s0 = Store.toMin(b.start), len = Store.toMin(b.end) - s0;
        let moved = false, delta = 0;
        el.setPointerCapture(e.pointerId);
        const move = ev => {
          const dy = ev.clientY - y0;
          if (Math.abs(dy) > 4) moved = true;
          if (!moved) return;
          el.classList.add('dragging');
          delta = Math.round(dy / PX / 15) * 15;
          delta = Math.max(-s0, Math.min(1439 - len - s0, delta));
          el.style.top = top0 + delta * PX + 'px';
          const sp = $('span', el);
          if (sp) sp.textContent = UI.fmtTime(Store.toTime(s0 + delta)) + ' – ' + UI.fmtTime(Store.toTime(s0 + delta + len));
        };
        const up = () => {
          el.removeEventListener('pointermove', move);
          el.removeEventListener('pointerup', up);
          el.removeEventListener('pointercancel', up);
          if (!moved) {
            editBlock(s, day, b);
            return;
          }
          if (delta) {
            b.start = Store.toTime(s0 + delta);
            b.end = Store.toTime(s0 + delta + len);
            day.blocks.sort((x, y) => Store.toMin(x.start) - Store.toMin(y.start));
            save();
            const clash = day.blocks.some(o => o !== b && Store.toMin(o.start) < Store.toMin(b.end) && Store.toMin(o.end) > Store.toMin(b.start));
            if (clash) UI.toast(t('overlap_warn'), 'info');
          }
          App.rerender();
        };
        el.addEventListener('pointermove', move);
        el.addEventListener('pointerup', up);
        el.addEventListener('pointercancel', up);
      });
    });
  }
  function editBlock(s, day, b) {
    const isNew = !b;
    if (isNew) {
      const last = day.blocks[day.blocks.length - 1];
      const st = last ? Store.toMin(last.end) : 9 * 60;
      b = {
        id: Store.uid(),
        start: Store.toTime(st),
        end: Store.toTime(st + 30),
        title: '',
        category: 'other',
        notes: '',
        done: false
      };
    }
    const m = UI.modal({
      title: isNew ? t('add_block') : t('edit_block'),
      body: '<div class="field"><label>' + t('title') + '</label><input class="input" id="bTitle" maxlength="80" value="' + esc(b.title) + '"></div>' + '<div class="row"><div class="field"><label>' + t('start') + '</label><input type="time" class="input" id="bStart" value="' + b.start + '"></div>' + '<div class="field"><label>' + t('end') + '</label><input type="time" class="input" id="bEnd" value="' + b.end + '"></div></div>' + '<div class="field"><label>' + t('category') + '</label><select class="input" id="bCat">' + UI.options(UI.CATS.map(c => [ c, t('cat_' + c) ]), b.category) + '</select></div>' + '<div class="field"><label>' + t('notes') + '</label><textarea class="input" id="bNotes" maxlength="200">' + esc(b.notes || '') + '</textarea></div>' + (isNew ? '' : '<a class="btn sm" target="_blank" rel="noopener" href="' + Cal.googleLink(day.date, b) + '">' + icon('external', 'sm') + t('add_one_gcal') + '</a>'),
      foot: (isNew ? '' : '<button class="btn danger left" id="bDel">' + icon('trash', 'sm') + t('delete') + '</button>') + '<button class="btn" data-close>' + t('cancel') + '</button><button class="btn primary" id="bSave">' + t('save') + '</button>'
    });
    $('#bSave', m).addEventListener('click', () => {
      const title = $('#bTitle', m).value.trim(), st = $('#bStart', m).value, en = $('#bEnd', m).value;
      if (!title) return UI.toast(t('enter_title'), 'error');
      if (!st || !en || Store.toMin(en) <= Store.toMin(st)) return UI.toast(t('val_end_after'), 'error');
      Object.assign(b, {
        title: title,
        start: st,
        end: en,
        category: $('#bCat', m).value,
        notes: $('#bNotes', m).value.trim()
      });
      if (isNew) day.blocks.push(b);
      day.blocks.sort((x, y) => Store.toMin(x.start) - Store.toMin(y.start));
      save();
      UI.closeModal();
      App.rerender();
    });
    const del = $('#bDel', m);
    if (del) del.addEventListener('click', () => {
      day.blocks = day.blocks.filter(x => x !== b);
      save();
      UI.closeModal();
      App.rerender();
    });
  }
  function gcalDialog(s) {
    const sync = Cal.syncAvailable();
    const m = UI.modal({
      title: t('add_to_gcal'),
      wide: true,
      body: '<label class="flex mb"><input type="checkbox" id="gSkip" checked> <span>' + t('skip_small') + '</span></label>' + (sync ? '<div class="card mb"><h3 class="flex">' + icon('zap') + t('gcal_sync_t') + '</h3><p class="muted small" style="margin:6px 0 12px">' + t('gcal_sync_d') + '</p><button class="btn primary" id="gSync">' + icon('calendar', 'sm') + t('gcal_sync_btn') + '</button><p class="small muted mt" id="gProg"></p></div>' : '') + '<div class="card mb"><h3 class="flex">' + icon('download') + t('gcal_ics_t') + '</h3><ol class="small" style="color:var(--text-2);padding-left:18px;margin:8px 0 12px">' + '<li>' + t('gcal_ics_1') + '</li><li>' + t('gcal_ics_2') + '</li><li>' + t('gcal_ics_3') + '</li></ol>' + '<div class="flex wrap"><button class="btn primary" id="gIcs">' + icon('download', 'sm') + t('download_ics') + '</button><a class="btn" href="https://calendar.google.com/calendar/r/settings/export" target="_blank" rel="noopener">' + icon('external', 'sm') + t('open_gcal_import') + '</a></div></div>' + '<div class="card"><h3 class="flex">' + icon('external') + t('gcal_one_t') + '</h3><p class="muted small" style="margin-top:6px">' + t('gcal_one_d') + '</p></div>'
    });
    const skip = () => $('#gSkip', m).checked ? [ 'meal', 'break', 'rest', 'routine', 'sleep' ] : [];
    $('#gIcs', m).addEventListener('click', () => {
      Cal.downloadICS(s, {
        skipCats: skip()
      });
      UI.toast(t('ics_downloaded'));
    });
    const gs = $('#gSync', m);
    if (gs) gs.addEventListener('click', async () => {
      gs.disabled = true;
      try {
        const n = await Cal.syncToGoogle(s, {
          skipCats: skip(),
          onProgress: (d, tot) => {
            const p = $('#gProg');
            if (p) p.textContent = t('syncing', {
              d: d,
              tot: tot
            });
          }
        });
        UI.closeModal();
        UI.toast(t('synced', {
          n: n
        }));
      } catch (e) {
        gs.disabled = false;
        UI.toast(e.message, 'error', 6e3);
      }
    });
  }
  function printSchedule(s) {
    const pa = $('#printArea');
    pa.innerHTML = '<h1>' + esc(s.title) + '</h1><div class="p-sub">' + esc(Store.profile().name) + ' · ' + UI.fmtDate(s.days[0].date, {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    }) + (s.days.length > 1 ? ' – ' + UI.fmtDate(s.days[s.days.length - 1].date, {
      month: 'long',
      day: 'numeric'
    }) : '') + '</div>' + s.days.map(d => '<div class="p-day"><h2>' + UI.fmtDate(d.date, {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    }) + '</h2><table>' + d.blocks.map(b => '<tr><td class="t">' + UI.fmtTime(b.start) + ' – ' + UI.fmtTime(b.end) + '</td><td><span class="sw" style="background:' + UI.catHex[b.category] + '"></span><b>' + esc(b.title) + '</b>' + (b.notes ? '<br><small>' + esc(b.notes) + '</small>' : '') + '</td><td class="c">' + t('cat_' + b.category) + '</td><td style="width:20pt">☐</td></tr>').join('') + '</table></div>').join('') + (s.tips && s.tips.length ? '<div class="p-tips"><b>' + t('coach_tips') + '</b><ul>' + s.tips.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul></div>' : '') + '<div class="p-foot">Timewise</div>';
    window.print();
  }
  function bind(main, s, day) {
    enableDrag(main, s, day);
    const pick = $('#sPick', main);
    if (pick) pick.addEventListener('change', () => {
      Store.setActiveSchedule(pick.value);
      dayIdx = pickDefaultDay(sched());
      App.rerender();
    });
    $$('[data-day]', main).forEach(b => b.addEventListener('click', () => {
      dayIdx = +b.dataset.day;
      App.rerender();
    }));
    $('#sGcal', main).addEventListener('click', () => gcalDialog(s));
    $('#sPrint', main).addEventListener('click', () => printSchedule(s));
    $('#sIcs', main).addEventListener('click', () => {
      Cal.downloadICS(s);
      UI.toast(t('ics_downloaded'));
    });
    const rep = $('#sRepeat', main);
    if (rep) rep.addEventListener('click', () => {
      const base = s.days[0];
      s.days = Array.from({
        length: 7
      }, (_, i) => ({
        date: Store.addDays(base.date, i),
        blocks: base.blocks.map(b => Object.assign({}, b, {
          id: Store.uid(),
          done: false
        }))
      }));
      s.mode = 'week';
      save();
      UI.toast(t('repeated'));
      App.rerender();
    });
    $('#sDel', main).addEventListener('click', async () => {
      if (!await UI.confirm(t('delete_plan_q'))) return;
      Store.remove('schedules', s.id);
      Store.setActiveSchedule((Store.list('schedules')[0] || {}).id || null);
      dayIdx = 0;
      App.rerender();
    });
    $('#addBlock', main).addEventListener('click', () => editBlock(s, day, null));
    $$('[data-bedit]', main).forEach(b => b.addEventListener('click', () => editBlock(s, day, day.blocks.find(x => x.id === b.dataset.bedit))));
    $$('[data-bdone]', main).forEach(btn => btn.addEventListener('click', () => {
      const b = day.blocks.find(x => x.id === btn.dataset.bdone);
      b.done = !b.done;
      save();
      if (b.done) Gamify.award(Gamify.POINTS.block);
      App.rerender();
    }));
    const runAI = async input => {
      const btn = $('#tweakBtn');
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner" style="width:16px;height:16px;border-width:2px;margin:0"></span>';
      $$('[data-cmd]', main).forEach(c => c.style.pointerEvents = 'none');
      const res = await AI.tweak(s, input);
      if (res.ok) {
        s.source = 'timewise';
        save();
        UI.toast(res.msg);
        App.rerender();
      } else {
        UI.toast(res.msg, 'info', 6e3);
        btn.disabled = false;
        btn.innerHTML = icon('send', 'sm');
        $$('[data-cmd]', main).forEach(c => c.style.pointerEvents = '');
      }
    };
    $$('[data-cmd]', main).forEach(c => c.addEventListener('click', () => runAI(c.dataset.cmd)));
    $('#tweakForm', main).addEventListener('submit', e => {
      e.preventDefault();
      const txt = $('#tweakIn').value.trim();
      if (txt) runAI(txt);
    });
  }
  let lastSid = null;
  Pages.schedule = {
    render(main) {
      const s = sched();
      if (s && s.id !== lastSid) {
        dayIdx = pickDefaultDay(s);
        lastSid = s.id;
      }
      render(main);
    },
    destroy() {
      clearInterval(nowTimer);
    }
  };
})();
