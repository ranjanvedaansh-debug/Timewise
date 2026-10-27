(function() {
  let ctx = null, master = null, current = null, nodes = [];
  const Sounds = {
    current: () => current,
    volume: .5
  };
  function ensure() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext);
      master = ctx.createGain();
      master.gain.value = Sounds.volume;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
  }
  function noiseBuffer(type) {
    const len = ctx.sampleRate * 4, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      if (type === 'white') d[i] = w * .35; else if (type === 'pink') {
        b0 = .99886 * b0 + w * .0555179;
        b1 = .99332 * b1 + w * .0750759;
        b2 = .969 * b2 + w * .153852;
        b3 = .8665 * b3 + w * .3104856;
        b4 = .55 * b4 + w * .5329522;
        b5 = -.7616 * b5 - w * .016898;
        d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * .5362) * .09;
        b6 = w * .115926;
      } else {
        last = (last + .02 * w) / 1.02;
        d[i] = last * 3.2;
      }
    }
    return buf;
  }
  function src(type) {
    const s = ctx.createBufferSource();
    s.buffer = noiseBuffer(type);
    s.loop = true;
    s.start();
    nodes.push(s);
    return s;
  }
  function lfo(freq, depth, target) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.value = freq;
    g.gain.value = depth;
    o.connect(g);
    g.connect(target);
    o.start();
    nodes.push(o);
  }
  const RECIPES = {
    rain() {
      const s = src('pink'), hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 400;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 6e3;
      s.connect(hp);
      hp.connect(lp);
      lp.connect(master);
    },
    ocean() {
      const s = src('brown'), g = ctx.createGain();
      g.gain.value = .55;
      lfo(.09, .45, g.gain);
      s.connect(g);
      g.connect(master);
    },
    wind() {
      const s = src('pink'), bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 500;
      bp.Q.value = .8;
      lfo(.07, 300, bp.frequency);
      s.connect(bp);
      bp.connect(master);
    },
    white() {
      const s = src('white'), g = ctx.createGain();
      g.gain.value = .5;
      s.connect(g);
      g.connect(master);
    },
    brown() {
      src('brown').connect(master);
    }
  };
  Sounds.list = Object.keys(RECIPES);
  Sounds.stop = function() {
    nodes.forEach(n => {
      try {
        n.stop();
      } catch (e) {}
      try {
        n.disconnect();
      } catch (e) {}
    });
    nodes = [];
    current = null;
  };
  Sounds.play = function(name) {
    ensure();
    Sounds.stop();
    if (RECIPES[name]) {
      RECIPES[name]();
      current = name;
    }
  };
  Sounds.toggle = function(name) {
    if (current === name) Sounds.stop(); else Sounds.play(name);
    return current;
  };
  Sounds.setVolume = function(v) {
    Sounds.volume = v;
    if (master) master.gain.value = v;
  };
  Sounds.chime = function() {
    try {
      ensure();
      [ 660, 880, 1320 ].forEach((f, i) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'sine';
        o.frequency.value = f;
        const t0 = ctx.currentTime + i * .22;
        g.gain.setValueAtTime(0, t0);
        g.gain.linearRampToValueAtTime(.25, t0 + .02);
        g.gain.exponentialRampToValueAtTime(.001, t0 + 1.2);
        o.connect(g);
        g.connect(ctx.destination);
        o.start(t0);
        o.stop(t0 + 1.3);
      });
    } catch (e) {}
  };
  window.Sounds = Sounds;
})();
