(function() {
  const Cal = {};
  const tz = () => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch (e) {
      return 'UTC';
    }
  };
  const stamp = (date, hhmm) => date.replace(/-/g, '') + 'T' + hhmm.replace(':', '') + '00';
  function icsEscape(s) {
    return String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
  }
  function fold(line) {
    const out = [];
    while (line.length > 74) {
      out.push(line.slice(0, 74));
      line = ' ' + line.slice(74);
    }
    out.push(line);
    return out.join('\r\n');
  }
  Cal.toICS = function(schedule, {skipCats: skipCats = []} = {}) {
    const now = (new Date).toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
    const zone = tz();
    const lines = [ 'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Timewise//Schedule//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:' + icsEscape(schedule.title), 'X-WR-TIMEZONE:' + zone ];
    schedule.days.forEach(day => day.blocks.forEach(b => {
      if (skipCats.includes(b.category)) return;
      lines.push('BEGIN:VEVENT', 'UID:' + b.id + '-' + day.date + '@timewise', 'DTSTAMP:' + now, 'DTSTART;TZID=' + zone + ':' + stamp(day.date, b.start), 'DTEND;TZID=' + zone + ':' + stamp(day.date, b.end), fold('SUMMARY:' + icsEscape(b.title)), fold('DESCRIPTION:' + icsEscape((b.notes ? b.notes + '\n' : '') + 'Category: ' + b.category + ' · Made with Timewise')), 'CATEGORIES:' + b.category.toUpperCase(), 'END:VEVENT');
    }));
    lines.push('END:VCALENDAR');
    return lines.join('\r\n');
  };
  Cal.downloadICS = function(schedule, opts) {
    const name = (schedule.title || 'schedule').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-').toLowerCase() || 'schedule';
    UI.download(name + '.ics', Cal.toICS(schedule, opts), 'text/calendar');
  };
  Cal.googleLink = function(date, b) {
    const p = new URLSearchParams({
      action: 'TEMPLATE',
      text: b.title,
      dates: stamp(date, b.start) + '/' + stamp(date, b.end),
      details: (b.notes ? b.notes + '\n\n' : '') + 'Made with Timewise',
      ctz: tz()
    });
    return 'https://calendar.google.com/calendar/render?' + p.toString();
  };
  Cal.syncAvailable = () => !!(window.TW_CONFIG && TW_CONFIG.GOOGLE_CLIENT_ID);
  function loadGIS() {
    return new Promise((resolve, reject) => {
      if (window.google && google.accounts && google.accounts.oauth2) return resolve();
      const s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client';
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('Could not load Google sign-in'));
      document.head.appendChild(s);
    });
  }
  function getToken() {
    return new Promise((resolve, reject) => {
      const client = google.accounts.oauth2.initTokenClient({
        client_id: TW_CONFIG.GOOGLE_CLIENT_ID,
        scope: 'https://www.googleapis.com/auth/calendar.events',
        callback: r => r.error ? reject(new Error(r.error)) : resolve(r.access_token),
        error_callback: e => reject(new Error(e && e.message || 'Sign-in cancelled'))
      });
      client.requestAccessToken();
    });
  }
  Cal.syncToGoogle = async function(schedule, {skipCats: skipCats = [], onProgress: onProgress} = {}) {
    await loadGIS();
    const token = await getToken();
    const zone = tz();
    const events = [];
    schedule.days.forEach(d => d.blocks.forEach(b => {
      if (!skipCats.includes(b.category)) events.push({
        d: d,
        b: b
      });
    }));
    let done = 0;
    for (const {d: d, b: b} of events) {
      const body = {
        summary: b.title,
        description: (b.notes ? b.notes + '\n\n' : '') + 'Made with Timewise',
        start: {
          dateTime: d.date + 'T' + b.start + ':00',
          timeZone: zone
        },
        end: {
          dateTime: d.date + 'T' + b.end + ':00',
          timeZone: zone
        }
      };
      const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error && j.error.message || 'Google Calendar error ' + res.status);
      }
      done++;
      if (onProgress) onProgress(done, events.length);
    }
    return done;
  };
  window.Cal = Cal;
})();
