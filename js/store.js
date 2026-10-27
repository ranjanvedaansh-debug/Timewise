(function() {
  const KEY = 'timewise:v1';
  const AVATAR_COLORS = [ '#4f46e5', '#0ea5e9', '#16a34a', '#f59e0b', '#ec4899', '#a855f7', '#f97316', '#14b8a6' ];
  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }
  function emptyData() {
    return {
      tasks: [],
      habits: [],
      goals: [],
      journal: [],
      schedules: [],
      activeScheduleId: null,
      focusLog: [],
      points: 0,
      badges: [],
      lastAnswers: null
    };
  }
  function defaults() {
    return {
      version: 1,
      settings: {
        theme: 'system',
        lang: 'en',
        breakReminder: false,
        breakEvery: 50,
        notifications: false,
        focus: {
          focus: 25,
          short: 5,
          long: 15,
          longEvery: 4,
          autoStart: false
        }
      },
      activeProfileId: null,
      profiles: {}
    };
  }
  let state;
  try {
    state = JSON.parse(localStorage.getItem(KEY)) || defaults();
  } catch (e) {
    state = defaults();
  }
  state.settings = Object.assign(defaults().settings, state.settings || {});
  state.settings.focus = Object.assign(defaults().settings.focus, state.settings.focus || {});
  const listeners = [];
  let saveTimer = null;
  const Store = {
    uid: uid,
    AVATAR_COLORS: AVATAR_COLORS,
    get state() {
      return state;
    },
    get settings() {
      return state.settings;
    },
    save() {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {
        try {
          localStorage.setItem(KEY, JSON.stringify(state));
        } catch (e) {
          console.warn('Save failed', e);
        }
      }, 50);
      listeners.forEach(fn => {
        try {
          fn();
        } catch (e) {
          console.error(e);
        }
      });
    },
    onChange(fn) {
      listeners.push(fn);
    },
    profiles() {
      return Object.values(state.profiles).sort((a, b) => a.createdAt - b.createdAt);
    },
    profile() {
      return state.profiles[state.activeProfileId] || null;
    },
    data() {
      const p = Store.profile();
      return p ? p.data : emptyData();
    },
    createProfile({name: name, ageGroup: ageGroup}) {
      const id = uid();
      const color = AVATAR_COLORS[Object.keys(state.profiles).length % AVATAR_COLORS.length];
      state.profiles[id] = {
        id: id,
        name: name.trim() || 'Me',
        ageGroup: ageGroup || 'adult',
        color: color,
        createdAt: Date.now(),
        data: emptyData()
      };
      state.activeProfileId = id;
      Store.save();
      return state.profiles[id];
    },
    updateProfile(id, patch) {
      Object.assign(state.profiles[id], patch);
      Store.save();
    },
    switchProfile(id) {
      if (state.profiles[id]) {
        state.activeProfileId = id;
        Store.save();
      }
    },
    deleteProfile(id) {
      delete state.profiles[id];
      if (state.activeProfileId === id) state.activeProfileId = Object.keys(state.profiles)[0] || null;
      Store.save();
    },
    list(name) {
      return Store.data()[name];
    },
    add(name, item) {
      item.id = item.id || uid();
      item.createdAt = item.createdAt || Date.now();
      Store.data()[name].unshift(item);
      Store.save();
      return item;
    },
    update(name, id, patch) {
      const it = Store.data()[name].find(x => x.id === id);
      if (it) Object.assign(it, patch);
      Store.save();
      return it;
    },
    remove(name, id) {
      const d = Store.data();
      d[name] = d[name].filter(x => x.id !== id);
      Store.save();
    },
    find(name, id) {
      return Store.data()[name].find(x => x.id === id);
    },
    activeSchedule() {
      const d = Store.data();
      return d.schedules.find(s => s.id === d.activeScheduleId) || d.schedules[0] || null;
    },
    setActiveSchedule(id) {
      Store.data().activeScheduleId = id;
      Store.save();
    },
    exportJSON() {
      return JSON.stringify(state, null, 2);
    },
    importJSON(text) {
      const obj = JSON.parse(text);
      if (!obj || !obj.profiles) throw new Error('Not a Timewise backup');
      state = Object.assign(defaults(), obj);
      state.settings = Object.assign(defaults().settings, obj.settings || {});
      Store.save();
    },
    resetAll() {
      state = defaults();
      localStorage.removeItem(KEY);
      Store.save();
    }
  };
  const pad = n => String(n).padStart(2, '0');
  Store.dateKey = (d = new Date) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  Store.parseDate = s => {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d);
  };
  Store.addDays = (s, n) => {
    const d = Store.parseDate(s);
    d.setDate(d.getDate() + n);
    return Store.dateKey(d);
  };
  Store.toMin = t => {
    const [h, m] = String(t).split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };
  Store.toTime = m => {
    m = Math.max(0, Math.min(1439, Math.round(m)));
    return pad(Math.floor(m / 60)) + ':' + pad(m % 60);
  };
  Store.pad = pad;
  window.Store = Store;
})();
