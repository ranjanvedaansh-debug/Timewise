(function() {
  const UI = {};
  UI.$ = (sel, root = document) => root.querySelector(sel);
  UI.$$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  UI.esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]));
  UI.toast = function(msg, type = 'success', ms = 3200) {
    const el = document.createElement('div');
    el.className = 'toast ' + type;
    const ic = type === 'error' ? 'alert' : type === 'badge' ? 'award' : type === 'info' ? 'info' : 'check';
    el.innerHTML = icon(ic) + '<span>' + UI.esc(msg) + '</span>';
    UI.$('#toastRoot').appendChild(el);
    setTimeout(() => {
      el.style.transition = 'opacity .3s';
      el.style.opacity = '0';
      setTimeout(() => el.remove(), 300);
    }, ms);
  };
  let onCloseCb = null;
  UI.modal = function({title: title, body: body, foot: foot = '', wide: wide = false, onClose: onClose = null, closable: closable = true}) {
    const root = UI.$('#modalRoot');
    onCloseCb = onClose;
    root.innerHTML = '<div class="modal-backdrop"></div>' + '<div class="modal ' + (wide ? 'wide' : '') + '" role="dialog" aria-modal="true">' + '<div class="modal-head"><h2>' + title + '</h2>' + (closable ? '<button class="icon-btn" data-close aria-label="Close">' + icon('x') + '</button>' : '') + '</div>' + '<div class="modal-body">' + body + '</div>' + (foot ? '<div class="modal-foot">' + foot + '</div>' : '') + '</div>';
    root.classList.add('open');
    if (closable) {
      UI.$$('[data-close]', root).forEach(b => b.addEventListener('click', UI.closeModal));
      UI.$('.modal-backdrop', root).addEventListener('click', UI.closeModal);
    }
    const first = UI.$('.modal input, .modal textarea, .modal select', root);
    if (first) setTimeout(() => first.focus(), 50);
    return UI.$('.modal', root);
  };
  UI.closeModal = function() {
    const root = UI.$('#modalRoot');
    root.classList.remove('open');
    root.innerHTML = '';
    if (onCloseCb) {
      const cb = onCloseCb;
      onCloseCb = null;
      cb();
    }
  };
  // Keyboard access for clickable cards and chips (they are built as div/span in several pages).
  const CLICKABLE = '.choice-card, .chip[data-v], .chip[data-s], .chip[data-sugg], .chip[data-cmd]';
  function markClickable(root) {
    UI.$$(CLICKABLE, root).forEach(el => {
      if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '0');
      if (!el.hasAttribute('role')) el.setAttribute('role', 'button');
    });
  }
  new MutationObserver(() => markClickable(document)).observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener('keydown', e => {
    const el = e.target;
    if ((e.key === 'Enter' || e.key === ' ') && el && el.matches && (el.matches(CLICKABLE) || el.matches('[role="button"][data-edit]'))) {
      e.preventDefault();
      el.click();
    }
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && UI.$('#modalRoot').classList.contains('open') && UI.$('#modalRoot [data-close]')) UI.closeModal();
  });
  UI.confirm = function(message, {okText: okText, danger: danger = true} = {}) {
    return new Promise(resolve => {
      let answered = false;
      const m = UI.modal({
        title: t('confirm_title'),
        body: '<p>' + UI.esc(message) + '</p>',
        foot: '<button class="btn" data-close>' + t('cancel') + '</button><button class="btn ' + (danger ? 'danger-solid' : 'primary') + '" id="cfOk">' + (okText || t('yes')) + '</button>',
        onClose: () => {
          if (!answered) resolve(false);
        }
      });
      UI.$('#cfOk', m).addEventListener('click', () => {
        answered = true;
        UI.closeModal();
        resolve(true);
      });
    });
  };
  UI.locale = () => ({
    en: 'en-US',
    hi: 'hi-IN',
    es: 'es-ES',
    fr: 'fr-FR'
  }[Store.settings.lang] || 'en-US');
  UI.fmtTime = function(hhmm) {
    if (!hhmm) return '';
    const [h, m] = hhmm.split(':').map(Number);
    if (Store.settings.clock === '24') return Store.pad(h) + ':' + Store.pad(m);
    const ap = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return h12 + ':' + Store.pad(m) + ' ' + ap;
  };
  UI.fmtDate = (key, opts = {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  }) => Store.parseDate(key).toLocaleDateString(UI.locale(), opts);
  UI.weekday = (key, style = 'long') => Store.parseDate(key).toLocaleDateString(UI.locale(), {
    weekday: style
  });
  UI.fmtMinutes = function(min) {
    min = Math.round(min);
    const h = Math.floor(min / 60), m = min % 60;
    if (!h) return m + ' ' + t('min_short');
    return h + ' ' + t('hr_short') + (m ? ' ' + m + ' ' + t('min_short') : '');
  };
  UI.relDays = function(key) {
    const diff = Math.round((Store.parseDate(key) - Store.parseDate(Store.dateKey())) / 864e5);
    return diff;
  };
  UI.download = function(filename, content, mime = 'text/plain') {
    const blob = new Blob([ content ], {
      type: mime
    });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 500);
  };
  UI.notify = function(title, body) {
    try {
      if (Store.settings.notifications && 'Notification' in window && Notification.permission === 'granted') {
        new Notification(title, {
          body: body,
          icon: 'assets/favicon.svg'
        });
        return;
      }
    } catch (e) {}
    UI.toast(title + (body ? ' — ' + body : ''), 'info', 6e3);
  };
  UI.options = (pairs, selected) => pairs.map(([v, l]) => '<option value="' + UI.esc(v) + '"' + (String(v) === String(selected) ? ' selected' : '') + '>' + UI.esc(l) + '</option>').join('');
  UI.empty = (ic, text, btnHtml = '') => '<div class="empty">' + icon(ic) + '<p>' + text + '</p>' + btnHtml + '</div>';
  UI.CATS = [ 'study', 'work', 'exercise', 'meal', 'break', 'chores', 'hobby', 'family', 'routine', 'rest', 'sleep', 'other' ];
  UI.catColor = c => 'var(--c-' + (UI.CATS.includes(c) ? c : 'other') + ')';
  UI.catHex = {
    study: '#1e40af',
    work: '#0284c7',
    exercise: '#15803d',
    meal: '#78716c',
    break: '#0d9488',
    chores: '#a16207',
    hobby: '#e11d48',
    family: '#ea580c',
    routine: '#64748b',
    rest: '#94a3b8',
    sleep: '#334155',
    other: '#94a3b8'
  };
  window.UI = UI;
})();
