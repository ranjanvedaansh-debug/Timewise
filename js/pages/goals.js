window.Pages = window.Pages || {};

(function() {
  const {$: $, $$: $$, esc: esc} = UI;
  let showDone = false;
  const pct = g => g.milestones.length ? Math.round(g.milestones.filter(m => m.done).length / g.milestones.length * 100) : g.done ? 100 : 0;
  function goalCard(g) {
    const left = g.deadline ? UI.relDays(g.deadline) : null;
    const p = pct(g);
    return '<div class="card goal-card"><div class="goal-top"><div><span class="pill ' + (g.type === 'exam' ? 'high' : 'primary') + '">' + icon(g.type === 'exam' ? 'graduation' : 'target', 'sm') + ' ' + t(g.type === 'exam' ? 'type_exam' : 'type_goal') + '</span>' + '<h3 style="margin-top:8px">' + esc(g.title) + '</h3>' + (g.why ? '<p class="small muted" style="margin-top:4px">' + esc(g.why) + '</p>' : '') + '</div>' + (left !== null ? '<div class="countdown ' + (left < 0 && !g.done ? 'late' : '') + '"><b>' + Math.abs(left) + '</b><span>' + (left < 0 ? t('days_late') : left === 0 ? t('today') : t('days_left')) + '</span></div>' : '') + '</div>' + '<div><div class="flex between small"><span class="muted">' + t('progress') + '</span><b>' + p + '%</b></div><div class="progress ' + (p === 100 ? 'green' : '') + '" style="margin-top:6px"><div style="width:' + p + '%"></div></div></div>' + '<div>' + g.milestones.map(m => '<div class="milestone ' + (m.done ? 'done' : '') + '"><button class="check ' + (m.done ? 'on' : '') + '" data-ms="' + g.id + ':' + m.id + '" aria-pressed="' + !!m.done + '" aria-label="' + esc(t('toggle_done') + ': ' + m.text) + '">' + icon('check') + '</button><span>' + esc(m.text) + '</span><button class="icon-btn sm danger" data-msdel="' + g.id + ':' + m.id + '" aria-label="' + t('delete') + '">' + icon('x', 'sm') + '</button></div>').join('') + '</div>' + '<form class="inline-form" data-msadd="' + g.id + '"><input class="input" maxlength="100" aria-label="' + t('add_step') + '" placeholder="' + t('add_step') + '"><button class="btn sm">' + icon('plus', 'sm') + '</button></form>' + '<div class="flex wrap">' + (!g.milestones.length ? '<button class="btn sm" data-ai="' + g.id + '">' + icon('sparkles', 'sm') + t('break_down') + '</button>' : '') + '<button class="btn sm ' + (g.done ? '' : 'primary') + '" data-complete="' + g.id + '">' + icon('check', 'sm') + (g.done ? t('reopen') : t('mark_achieved')) + '</button>' + '<button class="icon-btn sm" data-edit="' + g.id + '" aria-label="' + t('edit_goal') + '" style="margin-left:auto">' + icon('edit', 'sm') + '</button><button class="icon-btn sm danger" data-del="' + g.id + '" aria-label="' + t('delete') + '">' + icon('trash', 'sm') + '</button></div></div>';
  }
  function render(main) {
    const goals = Store.list('goals');
    const active = goals.filter(g => !g.done), done = goals.filter(g => g.done);
    const list = showDone ? done : active;
    list.sort((a, b) => (a.deadline || '9999').localeCompare(b.deadline || '9999'));
    main.innerHTML = '<div class="page-head"><div><h1>' + t('page_goals') + '</h1><p>' + t('goals_sub') + '</p></div>' + '<div class="actions"><div class="tabs"><button class="tab ' + (!showDone ? 'active' : '') + '" data-show="0">' + t('in_progress') + ' (' + active.length + ')</button><button class="tab ' + (showDone ? 'active' : '') + '" data-show="1">' + t('achieved') + ' (' + done.length + ')</button></div>' + '<button class="btn" id="gExam">' + icon('graduation', 'sm') + t('new_exam') + '</button><button class="btn primary" id="gNew">' + icon('plus', 'sm') + t('new_goal') + '</button></div></div>' + (list.length ? '<div class="grid grid-2">' + list.map(goalCard).join('') + '</div>' : '<div class="card">' + UI.empty('target', showDone ? t('no_achieved') : t('no_goals'), showDone ? '' : '<button class="btn primary" id="gNew2">' + icon('plus', 'sm') + t('new_goal') + '</button>') + '</div>');
    $$('[data-show]', main).forEach(b => b.addEventListener('click', () => {
      showDone = b.dataset.show === '1';
      App.rerender();
    }));
    $('#gNew', main).addEventListener('click', () => editGoal(null, 'goal'));
    $('#gExam', main).addEventListener('click', () => editGoal(null, 'exam'));
    const g2 = $('#gNew2', main);
    if (g2) g2.addEventListener('click', () => editGoal(null, 'goal'));
    $$('[data-ms]', main).forEach(b => b.addEventListener('click', () => {
      const [gid, mid] = b.dataset.ms.split(':');
      const g = Store.find('goals', gid);
      const m = g.milestones.find(x => x.id === mid);
      m.done = !m.done;
      Store.save();
      Gamify.award(m.done ? Gamify.POINTS.milestone : -Gamify.POINTS.milestone);
      if (m.done && g.milestones.every(x => x.done) && !g.done) UI.toast(t('all_steps_done'), 'info');
      App.rerender();
    }));
    $$('[data-msdel]', main).forEach(b => b.addEventListener('click', () => {
      const [gid, mid] = b.dataset.msdel.split(':');
      const g = Store.find('goals', gid);
      g.milestones = g.milestones.filter(x => x.id !== mid);
      Store.save();
      App.rerender();
    }));
    $$('[data-msadd]', main).forEach(f => f.addEventListener('submit', e => {
      e.preventDefault();
      const inp = $('input', f);
      const v = inp.value.trim();
      if (!v) return;
      Store.find('goals', f.dataset.msadd).milestones.push({
        id: Store.uid(),
        text: v,
        done: false
      });
      Store.save();
      App.rerender();
    }));
    $$('[data-complete]', main).forEach(b => b.addEventListener('click', () => {
      const g = Store.find('goals', b.dataset.complete);
      g.done = !g.done;
      g.doneAt = g.done ? Date.now() : null;
      Store.save();
      if (g.done) {
        Gamify.award(Gamify.POINTS.goal);
        UI.toast(t('goal_achieved_toast'), 'badge');
      } else Gamify.award(-Gamify.POINTS.goal);
      App.rerender();
    }));
    $$('[data-edit]', main).forEach(b => b.addEventListener('click', () => {
      const g = Store.find('goals', b.dataset.edit);
      editGoal(g, g.type);
    }));
    $$('[data-del]', main).forEach(b => b.addEventListener('click', async () => {
      if (await UI.confirm(t('delete_goal_q'))) {
        Store.remove('goals', b.dataset.del);
        App.rerender();
      }
    }));
    $$('[data-ai]', main).forEach(b => b.addEventListener('click', () => breakDown(Store.find('goals', b.dataset.ai), b)));
  }
  async function breakDown(g, btn) {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner" style="width:14px;height:14px;border-width:2px;margin:0"></span> ' + t('thinking');
    const steps = await AI.breakDownGoal(g);
    g.milestones = steps.map(s => ({
      id: Store.uid(),
      text: s,
      done: false
    }));
    Store.save();
    App.rerender();
  }
  function editGoal(g, type) {
    const isNew = !g;
    const m = UI.modal({
      title: isNew ? type === 'exam' ? t('new_exam') : t('new_goal') : t('edit_goal'),
      body: '<div class="field"><label>' + (type === 'exam' ? t('exam_name') : t('goal_name')) + '</label><input class="input" id="gTitle" maxlength="100" value="' + esc(g ? g.title : '') + '" placeholder="' + (type === 'exam' ? t('exam_ph') : t('goal_ph')) + '"></div>' + '<div class="field"><label>' + (type === 'exam' ? t('exam_date') : t('deadline')) + ' <span class="muted">(' + t('optional') + ')</span></label><input type="date" class="input" id="gDate" value="' + (g ? g.deadline || '' : '') + '"></div>' + '<div class="field"><label>' + t('why_matters') + ' <span class="muted">(' + t('optional') + ')</span></label><input class="input" id="gWhy" maxlength="150" value="' + esc(g ? g.why || '' : '') + '"></div>',
      foot: '<button class="btn" data-close>' + t('cancel') + '</button><button class="btn primary" id="gSave">' + t('save') + '</button>'
    });
    $('#gSave', m).addEventListener('click', () => {
      const title = $('#gTitle', m).value.trim();
      if (!title) return UI.toast(t('enter_title'), 'error');
      const patch = {
        title: title,
        deadline: $('#gDate', m).value,
        why: $('#gWhy', m).value.trim()
      };
      if (isNew) Store.add('goals', Object.assign(patch, {
        type: type,
        milestones: [],
        done: false
      })); else Store.update('goals', g.id, patch);
      UI.closeModal();
      App.rerender();
    });
  }
  Pages.goals = {
    render: render
  };
})();
