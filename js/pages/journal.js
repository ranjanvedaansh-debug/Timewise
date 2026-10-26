window.Pages = window.Pages || {};

(function() {
  const {$: $, $$: $$, esc: esc} = UI;
  const MOODS = [ [ 5, 'smile5' ], [ 4, 'smile4' ], [ 3, 'smile3' ], [ 2, 'smile2' ], [ 1, 'smile1' ] ];
  let editDate = null;
  function render(main) {
    const today = Store.dateKey();
    const date = editDate || today;
    const entries = Store.list('journal').slice().sort((a, b) => b.date.localeCompare(a.date));
    const e = entries.find(x => x.date === date) || {
      mood: 0,
      well: '',
      improve: '',
      grateful: '',
      notes: ''
    };
    let mood = e.mood;
    const prompts = [ 'jp_1', 'jp_2', 'jp_3', 'jp_4', 'jp_5', 'jp_6' ];
    const prompt = t(prompts[Math.floor(Date.now() / 864e5) % prompts.length]);
    main.innerHTML = '<div class="page-head"><div><h1>' + t('page_journal') + '</h1><p>' + t('journal_sub') + '</p></div></div>' + '<div class="grid grid-2" style="align-items:start"><div class="card">' + '<div class="card-head"><h3>' + icon('edit') + (date === today ? t('todays_reflection') : UI.fmtDate(date, {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    })) + '</h3>' + (date !== today ? '<button class="btn sm" id="jToday">' + t('back_to_today') + '</button>' : '') + '</div>' + '<div class="field"><span class="field-label">' + t('how_feel') + '</span><div class="moods">' + MOODS.map(([v, ic]) => '<button type="button" class="mood ' + (mood === v ? 'sel' : '') + '" data-mood="' + v + '">' + icon(ic) + t('mood_' + v) + '</button>').join('') + '</div></div>' + '<div class="field"><label>' + t('went_well') + '</label><textarea class="input" id="jWell" maxlength="600" rows="2">' + esc(e.well) + '</textarea></div>' + '<div class="field"><label>' + t('to_improve') + '</label><textarea class="input" id="jImp" maxlength="600" rows="2">' + esc(e.improve) + '</textarea></div>' + '<div class="field"><label>' + t('grateful_for') + '</label><textarea class="input" id="jGrat" maxlength="600" rows="2">' + esc(e.grateful) + '</textarea></div>' + '<div class="field"><label>' + t('free_write') + '</label><div class="hint">' + icon('lightbulb', 'sm') + ' ' + prompt + '</div><textarea class="input" id="jNotes" maxlength="2000" rows="3">' + esc(e.notes) + '</textarea></div>' + '<button class="btn primary block" id="jSave">' + icon('check', 'sm') + t('save_entry') + '</button></div>' + '<div class="card"><div class="card-head"><h3>' + icon('book') + t('past_entries') + '</h3><span class="pill">' + entries.length + '</span></div>' + (entries.length ? entries.slice(0, 30).map(x => '<div class="entry"><div class="entry-head"><b class="flex">' + (x.mood ? '<span style="color:var(--primary)">' + icon(MOODS.find(m => m[0] === x.mood)[1], 'sm') + '</span>' : '') + UI.fmtDate(x.date, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }) + '</b>' + '<div><button class="icon-btn sm" data-open="' + x.date + '">' + icon('edit', 'sm') + '</button><button class="icon-btn sm danger" data-del="' + x.id + '">' + icon('trash', 'sm') + '</button></div></div>' + (x.well ? '<p><strong>' + t('went_well') + '</strong> ' + esc(x.well) + '</p>' : '') + (x.improve ? '<p><strong>' + t('to_improve') + '</strong> ' + esc(x.improve) + '</p>' : '') + (x.grateful ? '<p><strong>' + t('grateful_for') + '</strong> ' + esc(x.grateful) + '</p>' : '') + (x.notes ? '<p>' + esc(x.notes) + '</p>' : '') + '</div>').join('') : UI.empty('book', t('no_entries'))) + '</div></div>';
    $$('[data-mood]', main).forEach(b => b.addEventListener('click', () => {
      mood = +b.dataset.mood;
      $$('[data-mood]', main).forEach(x => x.classList.toggle('sel', x === b));
    }));
    const jt = $('#jToday', main);
    if (jt) jt.addEventListener('click', () => {
      editDate = null;
      App.rerender();
    });
    $('#jSave', main).addEventListener('click', () => {
      const data = {
        date: date,
        mood: mood,
        well: $('#jWell').value.trim(),
        improve: $('#jImp').value.trim(),
        grateful: $('#jGrat').value.trim(),
        notes: $('#jNotes').value.trim()
      };
      if (!data.mood && !data.well && !data.improve && !data.grateful && !data.notes) return UI.toast(t('write_something'), 'error');
      const existing = Store.list('journal').find(x => x.date === date);
      if (existing) Store.update('journal', existing.id, data); else {
        Store.add('journal', data);
        Gamify.award(Gamify.POINTS.journal);
      }
      UI.toast(t('entry_saved'));
      editDate = null;
      App.rerender();
    });
    $$('[data-open]', main).forEach(b => b.addEventListener('click', () => {
      editDate = b.dataset.open;
      App.rerender();
    }));
    $$('[data-del]', main).forEach(b => b.addEventListener('click', async () => {
      if (await UI.confirm(t('delete_entry_q'))) {
        Store.remove('journal', b.dataset.del);
        App.rerender();
      }
    }));
  }
  Pages.journal = {
    render: render
  };
})();
