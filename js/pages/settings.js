window.Pages = window.Pages || {};

(function() {
  const {$: $, esc: esc} = UI;
  function render(main) {
    const s = Store.settings, p = Store.profile();
    main.innerHTML = '<div class="page-head"><div><h1>' + t('page_settings') + '</h1><p>' + t('settings_sub') + '</p></div></div>' + '<div class="grid grid-2" style="align-items:start"><div class="grid">' + '<div class="card"><div class="card-head"><h3>' + icon('user') + t('profile') + '</h3></div>' + '<div class="flex"><div class="avatar" style="background:' + p.color + ';width:46px;height:46px;font-size:1.1rem">' + esc(p.name[0].toUpperCase()) + '</div><div class="grow"><b>' + esc(p.name) + '</b><div class="small muted">' + t('age_' + p.ageGroup) + '</div></div>' + '<button class="btn" id="sProfiles">' + icon('users', 'sm') + t('manage_profiles') + '</button></div></div>' + '<div class="card"><div class="card-head"><h3>' + icon('palette') + t('appearance') + '</h3></div>' + '<div class="setting-row"><div class="txt"><b>' + t('theme') + '</b></div><select class="input" id="sTheme" style="width:auto">' + UI.options([ [ 'system', t('theme_system') ], [ 'light', t('theme_light') ], [ 'dark', t('theme_dark') ] ], s.theme) + '</select></div>' + '<div class="setting-row"><div class="txt"><b>' + t('language') + '</b><span>' + t('lang_hint') + '</span></div><select class="input" id="sLang" style="width:auto">' + UI.options(I18N.LANGS, s.lang) + '</select></div>' + '<div class="setting-row"><div class="txt"><b>' + t('clock_format') + '</b></div><select class="input" id="sClock" style="width:auto">' + UI.options([ [ '12', '12h (2:30 PM)' ], [ '24', '24h (14:30)' ] ], s.clock || '12') + '</select></div></div>' + '<div class="card"><div class="card-head"><h3>' + icon('bell') + t('reminders') + '</h3></div>' + '<div class="setting-row"><div class="txt"><b>' + t('browser_notif') + '</b><span>' + t('browser_notif_d') + '</span></div><label class="switch"><input type="checkbox" id="sNotif" ' + (s.notifications ? 'checked' : '') + '><span></span></label></div>' + '<div class="setting-row"><div class="txt"><b>' + t('break_rem') + '</b><span>' + t('break_rem_d') + '</span></div><label class="switch"><input type="checkbox" id="sBreak" ' + (s.breakReminder ? 'checked' : '') + '><span></span></label></div>' + '<div class="setting-row"><div class="txt"><b>' + t('remind_every') + '</b></div><select class="input" id="sEvery" style="width:auto">' + UI.options([ 20, 30, 45, 50, 60, 90 ].map(n => [ n, n + ' ' + t('min_short') ]), s.breakEvery) + '</select></div></div>' + '</div><div class="grid">' + '<div class="card"><div class="card-head"><h3>' + icon('sparkles') + 'Timewise AI</h3><span class="pill low">' + t('ai_ready') + '</span></div><p class="small muted">' + t('ai_about') + '</p></div>' + '<div class="card"><div class="card-head"><h3>' + icon('download') + t('your_data') + '</h3></div>' + '<p class="small muted mb">' + t('data_hint') + '</p>' + '<div class="flex wrap"><button class="btn" id="sExport">' + icon('download', 'sm') + t('export_backup') + '</button>' + '<label class="btn">' + icon('upload', 'sm') + t('import_backup') + '<input type="file" id="sImport" accept=".json,application/json" hidden></label>' + '<button class="btn danger" id="sReset">' + icon('trash', 'sm') + t('reset_all') + '</button></div></div>' + '<div class="card"><div class="card-head"><h3>' + icon('info') + t('about') + '</h3></div><p class="small muted">' + t('about_txt') + '</p></div>' + '</div></div>';
    $('#sProfiles').addEventListener('click', App.showProfiles);
    $('#sTheme').addEventListener('change', e => {
      s.theme = e.target.value;
      Store.save();
      App.applyTheme();
    });
    $('#sLang').addEventListener('change', e => {
      s.lang = e.target.value;
      Store.save();
      I18N.apply();
      App.rerender();
    });
    $('#sClock').addEventListener('change', e => {
      s.clock = e.target.value;
      Store.save();
    });
    $('#sNotif').addEventListener('change', async e => {
      if (e.target.checked && 'Notification' in window) {
        const perm = await Notification.requestPermission();
        if (perm !== 'granted') {
          e.target.checked = false;
          UI.toast(t('notif_denied'), 'error');
          return;
        }
      }
      s.notifications = e.target.checked;
      Store.save();
    });
    $('#sBreak').addEventListener('change', e => {
      s.breakReminder = e.target.checked;
      Store.save();
      UI.toast(e.target.checked ? t('break_on') : t('saved'));
    });
    $('#sEvery').addEventListener('change', e => {
      s.breakEvery = +e.target.value;
      Store.save();
    });
    $('#sExport').addEventListener('click', () => UI.download('timewise-backup-' + Store.dateKey() + '.json', Store.exportJSON(), 'application/json'));
    $('#sImport').addEventListener('change', e => {
      const f = e.target.files[0];
      if (!f) return;
      const rd = new FileReader;
      rd.onload = () => {
        try {
          Store.importJSON(rd.result);
          UI.toast(t('imported'));
          I18N.apply();
          App.refreshChrome();
          App.rerender();
        } catch (err) {
          UI.toast(err.message, 'error');
        }
      };
      rd.readAsText(f);
    });
    $('#sReset').addEventListener('click', async () => {
      if (await UI.confirm(t('reset_q'))) {
        Store.resetAll();
        location.hash = '#/dashboard';
        location.reload();
      }
    });
  }
  Pages.settings = {
    render: render
  };
})();
