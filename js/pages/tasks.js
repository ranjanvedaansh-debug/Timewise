window.Pages = window.Pages || {};

(function() {
  const {$: $, $$: $$, esc: esc} = UI;
  let view = 'list', filter = 'active', search = '';
  const PR = {
    high: 0,
    medium: 1,
    low: 2
  };
  function filtered() {
    const today = Store.dateKey();
    let list = Store.list('tasks').slice();
    if (filter === 'active') list = list.filter(x => !x.done);
    if (filter === 'today') list = list.filter(x => !x.done && x.due && x.due <= today);
    if (filter === 'upcoming') list = list.filter(x => !x.done && x.due && x.due > today);
    if (filter === 'overdue') list = list.filter(x => !x.done && x.due && x.due < today);
    if (filter === 'done') list = list.filter(x => x.done);
    if (search) list = list.filter(x => (x.title + ' ' + (x.notes || '')).toLowerCase().includes(search.toLowerCase()));
    return list.sort((a, b) => a.done - b.done || (a.due || '9999').localeCompare(b.due || '9999') || PR[a.priority] - PR[b.priority]);
  }
  function taskRow(x) {
    const today = Store.dateKey();
    const dueTxt = x.due ? x.due === today ? t('today') : x.due === Store.addDays(today, 1) ? t('tomorrow') : UI.fmtDate(x.due) : '';
    return '<div class="list-item ' + (x.done ? 'done' : '') + '"><button class="check ' + (x.done ? 'on' : '') + '" data-toggle="' + x.id + '">' + icon('check') + '</button>' + '<div class="grow" data-edit="' + x.id + '" style="cursor:pointer"><div class="title">' + esc(x.title) + '</div><div class="sub">' + '<span class="pill ' + x.priority + '">' + t('prio_' + x.priority) + '</span>' + (x.due ? '<span class="' + (!x.done && x.due < today ? 'pill high' : '') + '">' + icon('clock', 'sm') + ' ' + dueTxt + '</span>' : '') + (x.urgent ? '<span class="pill">' + t('urgent') + '</span>' : '') + (x.important ? '<span class="pill primary">' + t('important') + '</span>' : '') + (x.notes ? '<span>' + esc(x.notes.slice(0, 60)) + '</span>' : '') + '</div></div>' + '<button class="icon-btn sm danger" data-del="' + x.id + '" aria-label="' + t('delete') + '">' + icon('trash', 'sm') + '</button></div>';
  }
  function listView() {
    const list = filtered();
    return '<div class="card"><div class="filters"><div class="tabs">' + [ 'active', 'today', 'upcoming', 'overdue', 'done' ].map(f => '<button class="tab ' + (filter === f ? 'active' : '') + '" data-filter="' + f + '">' + t('f_' + f) + '</button>').join('') + '</div>' + '<input class="input" id="tSearch" placeholder="' + t('search') + '" value="' + esc(search) + '" style="max-width:220px;margin-left:auto"></div>' + (list.length ? '<div class="list">' + list.map(taskRow).join('') + '</div>' : UI.empty('checksq', t('no_tasks_here'))) + '</div>';
  }
  function matrixView() {
    const tasks = Store.list('tasks').filter(x => !x.done || x.doneAt && Date.now() - x.doneAt < 864e5);
    const quad = (u, i) => tasks.filter(x => !!x.urgent === u && !!x.important === i);
    const Qs = [ [ 'q1', true, true, 'zap' ], [ 'q2', false, true, 'target' ], [ 'q3', true, false, 'bell' ], [ 'q4', false, false, 'trash' ] ];
    return '<p class="muted small mb">' + t('matrix_hint') + '</p><div class="matrix">' + Qs.map(([q, u, i, ic]) => '<div class="quad ' + q + '" data-quad="' + q + '" data-u="' + u + '" data-i="' + i + '"><h3>' + icon(ic, 'sm') + t('m' + q + '_t') + '</h3><p class="q-hint">' + t('m' + q + '_d') + '</p>' + quad(u, i).map(x => '<div class="mtask ' + (x.done ? 'done' : '') + '" draggable="true" data-id="' + x.id + '"><button class="check ' + (x.done ? 'on' : '') + '" data-toggle="' + x.id + '">' + icon('check') + '</button><span data-edit="' + x.id + '" style="flex:1;cursor:pointer">' + esc(x.title) + '</span></div>').join('') + '<button class="btn ghost sm" data-addq="' + q + '">' + icon('plus', 'sm') + t('add') + '</button></div>').join('') + '</div>';
  }
  function render(main) {
    const d = Store.data();
    const doneToday = d.tasks.filter(x => x.done && x.doneAt && Store.dateKey(new Date(x.doneAt)) === Store.dateKey()).length;
    main.innerHTML = '<div class="page-head"><div><h1>' + t('page_tasks') + '</h1><p>' + t('tasks_sub', {
      n: doneToday
    }) + '</p></div>' + '<div class="actions"><div class="tabs"><button class="tab ' + (view === 'list' ? 'active' : '') + '" data-view="list">' + icon('list', 'sm') + ' ' + t('list_view') + '</button><button class="tab ' + (view === 'matrix' ? 'active' : '') + '" data-view="matrix">' + icon('grid', 'sm') + ' ' + t('matrix_view') + '</button></div>' + '<button class="btn primary" id="tNew">' + icon('plus', 'sm') + t('new_task') + '</button></div></div>' + '<form class="inline-form mb" id="tQuick"><input class="input" id="tQuickIn" maxlength="120" placeholder="' + t('quick_add_task_long') + '"><button class="btn primary">' + t('add') + '</button></form>' + (view === 'list' ? listView() : matrixView());
    $$('[data-view]', main).forEach(b => b.addEventListener('click', () => {
      view = b.dataset.view;
      App.rerender();
    }));
    $$('[data-filter]', main).forEach(b => b.addEventListener('click', () => {
      filter = b.dataset.filter;
      App.rerender();
    }));
    const s = $('#tSearch', main);
    if (s) s.addEventListener('input', () => {
      search = s.value;
      const pos = s.selectionStart;
      App.rerender();
      const n = $('#tSearch');
      n.focus();
      n.setSelectionRange(pos, pos);
    });
    $('#tNew', main).addEventListener('click', () => editTask(null));
    $('#tQuick', main).addEventListener('submit', e => {
      e.preventDefault();
      const v = $('#tQuickIn').value.trim();
      if (!v) return;
      Store.add('tasks', parseQuick(v));
      UI.toast(t('task_added'));
      App.rerender();
      $('#tQuickIn').focus();
    });
    $$('[data-toggle]', main).forEach(b => b.addEventListener('click', e => {
      e.stopPropagation();
      toggle(b.dataset.toggle);
    }));
    $$('[data-edit]', main).forEach(b => b.addEventListener('click', () => editTask(Store.find('tasks', b.dataset.edit))));
    $$('[data-del]', main).forEach(b => b.addEventListener('click', () => {
      Store.remove('tasks', b.dataset.del);
      UI.toast(t('deleted'));
      App.rerender();
    }));
    $$('[data-addq]', main).forEach(b => b.addEventListener('click', () => {
      const q = b.closest('.quad');
      editTask(null, {
        urgent: q.dataset.u === 'true',
        important: q.dataset.i === 'true'
      });
    }));
    $$('.mtask', main).forEach(el => el.addEventListener('dragstart', e => e.dataTransfer.setData('text/plain', el.dataset.id)));
    $$('.quad', main).forEach(q => {
      q.addEventListener('dragover', e => {
        e.preventDefault();
        q.classList.add('over');
      });
      q.addEventListener('dragleave', () => q.classList.remove('over'));
      q.addEventListener('drop', e => {
        e.preventDefault();
        const id = e.dataTransfer.getData('text/plain');
        Store.update('tasks', id, {
          urgent: q.dataset.u === 'true',
          important: q.dataset.i === 'true'
        });
        App.rerender();
      });
    });
  }
  function parseQuick(v) {
    const task = {
      title: v,
      priority: 'medium',
      due: '',
      urgent: false,
      important: true,
      done: false,
      notes: ''
    };
    const m = v.match(/!(high|medium|low)\b/i);
    if (m) {
      task.priority = m[1].toLowerCase();
      task.title = task.title.replace(m[0], '');
    }
    if (/\btoday\b/i.test(v)) {
      task.due = Store.dateKey();
      task.title = task.title.replace(/\btoday\b/i, '');
    } else if (/\btomorrow\b/i.test(v)) {
      task.due = Store.addDays(Store.dateKey(), 1);
      task.title = task.title.replace(/\btomorrow\b/i, '');
    }
    task.title = task.title.replace(/\s+/g, ' ').trim() || v;
    if (task.priority === 'high') task.urgent = true;
    return task;
  }
  function toggle(id) {
    const x = Store.find('tasks', id);
    if (!x) return;
    const done = !x.done;
    Store.update('tasks', id, {
      done: done,
      doneAt: done ? Date.now() : null
    });
    if (done) {
      Gamify.award(Gamify.POINTS.task);
      UI.toast(t('task_done_toast'));
    }
    App.rerender();
  }
  function editTask(x, preset = {}) {
    const isNew = !x;
    x = x || Object.assign({
      title: '',
      notes: '',
      due: '',
      priority: 'medium',
      urgent: false,
      important: true
    }, preset);
    const m = UI.modal({
      title: isNew ? t('new_task') : t('edit_task'),
      body: '<div class="field"><label>' + t('title') + '</label><input class="input" id="eTitle" maxlength="120" value="' + esc(x.title) + '"></div>' + '<div class="row"><div class="field"><label>' + t('due_date') + '</label><input type="date" class="input" id="eDue" value="' + (x.due || '') + '"></div>' + '<div class="field"><label>' + t('priority') + '</label><select class="input" id="ePrio">' + UI.options([ 'high', 'medium', 'low' ].map(p => [ p, t('prio_' + p) ]), x.priority) + '</select></div></div>' + '<div class="row mb"><label class="flex"><input type="checkbox" id="eUrg" ' + (x.urgent ? 'checked' : '') + '> ' + t('urgent') + '</label><label class="flex"><input type="checkbox" id="eImp" ' + (x.important ? 'checked' : '') + '> ' + t('important') + '</label></div>' + '<div class="field"><label>' + t('notes') + '</label><textarea class="input" id="eNotes" maxlength="500">' + esc(x.notes || '') + '</textarea></div>',
      foot: '<button class="btn" data-close>' + t('cancel') + '</button><button class="btn primary" id="eSave">' + t('save') + '</button>'
    });
    $('#eSave', m).addEventListener('click', () => {
      const title = $('#eTitle', m).value.trim();
      if (!title) return UI.toast(t('enter_title'), 'error');
      const patch = {
        title: title,
        due: $('#eDue', m).value,
        priority: $('#ePrio', m).value,
        urgent: $('#eUrg', m).checked,
        important: $('#eImp', m).checked,
        notes: $('#eNotes', m).value.trim()
      };
      if (isNew) Store.add('tasks', Object.assign(patch, {
        done: false
      })); else Store.update('tasks', x.id, patch);
      UI.closeModal();
      UI.toast(isNew ? t('task_added') : t('saved'));
      App.rerender();
    });
    $('#eTitle', m).addEventListener('keydown', e => {
      if (e.key === 'Enter') $('#eSave', m).click();
    });
  }
  Pages.tasks = {
    render: render
  };
})();
