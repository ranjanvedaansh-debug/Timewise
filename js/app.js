(function() {
  const {$: $, $$: $$, esc: esc} = UI;
  const NAV = [ {
    section: 'nav_plan'
  }, {
    id: 'dashboard',
    ic: 'home'
  }, {
    id: 'planner',
    ic: 'sparkles',
    tag: 'AI'
  }, {
    id: 'schedule',
    ic: 'calendar'
  }, {
    section: 'nav_tools'
  }, {
    id: 'focus',
    ic: 'timer'
  }, {
    id: 'tasks',
    ic: 'checksq'
  }, {
    id: 'habits',
    ic: 'flame'
  }, {
    id: 'goals',
    ic: 'target'
  }, {
    id: 'journal',
    ic: 'book'
  }, {
    section: 'nav_you'
  }, {
    id: 'stats',
    ic: 'chart'
  }, {
    id: 'settings',
    ic: 'settings'
  }, {
    id: 'credits',
    ic: 'heart'
  } ];
  let currentPage = null;
  function effectiveTheme() {
    const th = Store.settings.theme;
    if (th === 'light' || th === 'dark') return th;
    return window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  function applyTheme() {
    const th = effectiveTheme();
    document.documentElement.setAttribute('data-theme', th);
    $('#themeBtn').innerHTML = icon(th === 'dark' ? 'sun' : 'moon');
    $('#themeBtn').title = t('toggle_theme');
  }
  if (window.matchMedia) matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);
  function renderNav() {
    const route = currentRoute();
    $('#nav').innerHTML = NAV.map(n => n.section ? '<div class="nav-section">' + t(n.section) + '</div>' : '<a href="#/' + n.id + '" class="' + (route === n.id ? 'active' : '') + '">' + icon(n.ic) + '<span>' + t('page_' + n.id) + '</span>' + (n.tag ? '<span class="badge-new">' + n.tag + '</span>' : '') + '</a>').join('');
    $$('#nav a').forEach(a => a.addEventListener('click', () => document.body.classList.remove('nav-open')));
    renderProfileChip();
    $('#langBtn').innerHTML = icon('globe');
    $('#langBtn').title = t('language');
  }
  function renderProfileChip() {
    const p = Store.profile();
    $('#profileChip').innerHTML = p ? '<div class="avatar" style="background:' + p.color + '">' + esc(p.name.slice(0, 1).toUpperCase()) + '</div><div class="meta"><b>' + esc(p.name) + '</b><span>' + t('age_' + p.ageGroup) + ' · ' + t('level') + ' ' + Gamify.level(p.data.points) + '</span></div>' : '';
    document.body.setAttribute('data-age', p ? p.ageGroup : 'adult');
  }
  function currentRoute() {
    const r = location.hash.replace(/^#\/?/, '').split('?')[0] || 'dashboard';
    return window.Pages[r] ? r : 'dashboard';
  }
  function render() {
    if (!Store.profile()) {
      showWelcome();
      return;
    }
    const route = currentRoute();
    if (currentPage && currentPage.destroy) {
      try {
        currentPage.destroy();
      } catch (e) {
        console.error(e);
      }
    }
    currentPage = window.Pages[route];
    renderNav();
    $('#topbarTitle').textContent = t('page_' + route);
    document.title = t('page_' + route) + ' · Timewise';
    const main = $('#main');
    try {
      currentPage.render(main);
    } catch (e) {
      console.error(e);
      main.innerHTML = '<div class="card mt">' + icon('alert') + ' ' + esc(e.message) + '</div>';
    }
    main.scrollTop = 0;
    window.scrollTo(0, 0);
  }
  window.App = {
    rerender: render,
    go: route => {
      if (currentRoute() === route) render(); else location.hash = '#/' + route;
    },
    refreshChrome: () => {
      renderNav();
      applyTheme();
    }
  };
  function ageChips(selected) {
    return '<div class="choice-cards" id="ageCards">' + [ 'kid', 'teen', 'adult', 'senior' ].map(a => '<div class="choice-card ' + (a === selected ? 'selected' : '') + '" data-age="' + a + '"><b>' + t('age_' + a) + '</b><span>' + t('age_' + a + '_d') + '</span></div>').join('') + '</div>';
  }
  function bindAgeCards(root, onPick) {
    $$('#ageCards .choice-card', root).forEach(c => c.addEventListener('click', () => {
      $$('#ageCards .choice-card', root).forEach(x => x.classList.remove('selected'));
      c.classList.add('selected');
      onPick(c.dataset.age);
    }));
  }
  function showWelcome() {
    let age = 'adult';
    const m = UI.modal({
      title: '',
      closable: false,
      body: '<div class="welcome-logo">' + $('.brand-logo').innerHTML + '</div>' + '<h2 style="font-size:1.5rem;font-weight:800">' + t('welcome_title') + '</h2>' + '<p class="muted mb" style="margin-top:6px">' + t('welcome_sub') + '</p>' + '<div class="field"><label>' + t('language') + '</label><select class="input" id="wLang">' + UI.options(I18N.LANGS, Store.settings.lang) + '</select></div>' + '<div class="field"><label for="wName">' + t('your_name') + '</label><input class="input" id="wName" maxlength="30" placeholder="' + t('name_ph') + '"></div>' + '<div class="field"><span class="field-label">' + t('age_group') + '</span>' + ageChips(age) + '</div>',
      foot: '<button class="btn primary lg block" id="wGo">' + t('get_started') + ' ' + icon('right') + '</button>'
    });
    bindAgeCards(m, a => age = a);
    $('#wLang', m).addEventListener('change', e => {
      Store.settings.lang = e.target.value;
      Store.save();
      UI.closeModal();
      I18N.apply();
      showWelcome();
    });
    const go = () => {
      const name = $('#wName', m).value.trim();
      if (!name) {
        $('#wName', m).focus();
        UI.toast(t('enter_name'), 'error');
        return;
      }
      Store.createProfile({
        name: name,
        ageGroup: age
      });
      UI.closeModal();
      render();
      UI.toast(t('welcome_toast', {
        name: name
      }));
    };
    $('#wGo', m).addEventListener('click', go);
    $('#wName', m).addEventListener('keydown', e => {
      if (e.key === 'Enter') go();
    });
  }
  function showProfiles() {
    const cur = Store.profile();
    const rows = Store.profiles().map(p => '<div class="list-item ' + (p.id === cur.id ? 'current' : '') + '" data-id="' + p.id + '">' + '<div class="avatar" style="background:' + p.color + '">' + esc(p.name[0].toUpperCase()) + '</div>' + '<div class="grow"><div class="title">' + esc(p.name) + '</div><div class="sub">' + t('age_' + p.ageGroup) + ' · ' + t('level') + ' ' + Gamify.level(p.data.points) + '</div></div>' + (p.id === cur.id ? '<span class="pill primary">' + t('active') + '</span>' : '') + '</div>').join('');
    const m = UI.modal({
      title: t('profiles'),
      body: '<p class="muted small mb">' + t('profiles_hint') + '</p><div class="list profiles-list">' + rows + '</div>',
      foot: '<button class="btn left" id="pEdit">' + icon('edit', 'sm') + ' ' + t('edit_profile') + '</button><button class="btn primary" id="pAdd">' + icon('plus', 'sm') + ' ' + t('add_profile') + '</button>'
    });
    $$('.profiles-list .list-item', m).forEach(r => r.addEventListener('click', () => {
      Store.switchProfile(r.dataset.id);
      UI.closeModal();
      render();
      UI.toast(t('switched_to', {
        name: Store.profile().name
      }));
    }));
    $('#pAdd', m).addEventListener('click', () => editProfile(null));
    $('#pEdit', m).addEventListener('click', () => editProfile(cur));
  }
  function editProfile(p) {
    let age = p ? p.ageGroup : 'adult';
    const m = UI.modal({
      title: p ? t('edit_profile') : t('add_profile'),
      body: '<div class="field"><label>' + t('your_name') + '</label><input class="input" id="epName" maxlength="30" value="' + esc(p ? p.name : '') + '"></div>' + '<div class="field"><span class="field-label">' + t('age_group') + '</span>' + ageChips(age) + '</div>',
      foot: (p && Store.profiles().length > 1 ? '<button class="btn danger left" id="epDel">' + icon('trash', 'sm') + ' ' + t('delete') + '</button>' : '') + '<button class="btn" data-close>' + t('cancel') + '</button><button class="btn primary" id="epSave">' + t('save') + '</button>'
    });
    bindAgeCards(m, a => age = a);
    $('#epSave', m).addEventListener('click', () => {
      const name = $('#epName', m).value.trim();
      if (!name) return UI.toast(t('enter_name'), 'error');
      if (p) Store.updateProfile(p.id, {
        name: name,
        ageGroup: age
      }); else Store.createProfile({
        name: name,
        ageGroup: age
      });
      UI.closeModal();
      render();
    });
    const del = $('#epDel', m);
    if (del) del.addEventListener('click', async () => {
      UI.closeModal();
      if (await UI.confirm(t('delete_profile_q', {
        name: p.name
      }))) {
        Store.deleteProfile(p.id);
        render();
      }
    });
  }
  function showLanguage() {
    const m = UI.modal({
      title: t('language'),
      body: '<div class="list profiles-list">' + I18N.LANGS.map(([v, l]) => '<div class="list-item ' + (Store.settings.lang === v ? 'current' : '') + '" data-v="' + v + '">' + icon('globe') + '<div class="grow title">' + l + '</div>' + (Store.settings.lang === v ? icon('check') : '') + '</div>').join('') + '</div>'
    });
    $$('.list-item', m).forEach(r => r.addEventListener('click', () => {
      Store.settings.lang = r.dataset.v;
      Store.save();
      UI.closeModal();
      I18N.apply();
      render();
    }));
  }
  let activeMin = 0;
  setInterval(() => {
    if (!Store.settings.breakReminder || document.hidden) return;
    activeMin++;
    if (activeMin >= (+Store.settings.breakEvery || 50)) {
      activeMin = 0;
      UI.notify(t('break_title'), t('break_body'));
      Sounds.chime();
    }
  }, 6e4);
  function boot() {
    I18N.apply();
    applyTheme();
    $('#menuBtn').innerHTML = icon('menu');
    $('#menuBtn').addEventListener('click', () => document.body.classList.toggle('nav-open'));
    $('#sidebarBackdrop').addEventListener('click', () => document.body.classList.remove('nav-open'));
    $('#themeBtn').addEventListener('click', () => {
      Store.settings.theme = effectiveTheme() === 'dark' ? 'light' : 'dark';
      Store.save();
      applyTheme();
    });
    $('#langBtn').addEventListener('click', showLanguage);
    $('#profileChip').addEventListener('click', showProfiles);
    $('#miniTimer').addEventListener('click', () => App.go('focus'));
    window.addEventListener('hashchange', render);
    Store.onChange(renderProfileChip);
    render();
    Gamify.checkBadges();
  }
  window.App.showProfiles = showProfiles;
  window.App.applyTheme = applyTheme;
  document.addEventListener('DOMContentLoaded', boot);
})();
