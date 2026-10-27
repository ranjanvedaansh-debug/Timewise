window.Pages = window.Pages || {};

(function () {
  const { esc } = UI;

  const SECTIONS = [
    ['cr_ai', 'sparkles', [
      ['Timewise AI', 'The planning engine that builds your schedule from your answers, changes it when you ask, and breaks goals into steps. It runs entirely in your browser.', 'Original', ''],
      ['Time blocking', 'Giving every part of the day a job — the method behind the timeline view, popularised by Cal Newport.', '', 'https://calnewport.com'],
      ['Chronotypes', 'Morning larks and night owls: the idea of placing hard work in your highest-energy hours.', '', '']
    ]],
    ['cr_pictures', 'palette', [
      ['Icons', 'All icons are drawn as inline SVG code in the style of the Lucide icon set.', 'ISC License', 'https://lucide.dev'],
      ['Timewise logo', 'Clock logo and favicon designed for this website.', 'Original', ''],
      ['Colour palette', 'Timewise’s own navy and gold palette. Some category hues are adapted from the Tailwind CSS colour system.', 'MIT License', 'https://tailwindcss.com/docs/colors'],
      ['Photos & images', 'No photos or stock images are used — every picture on the site is drawn with code.', '', '']
    ]],
    ['cr_audio', 'volume', [
      ['Focus sounds', 'Rain, ocean, wind, white noise and deep hum are generated live with the Web Audio API. No recordings are used.', 'Original', 'https://developer.mozilla.org/docs/Web/API/Web_Audio_API'],
      ['Pink-noise filter', 'Rain and wind use Paul Kellet’s well-known pink-noise filter method.', 'Public domain', ''],
      ['Brown noise', 'The ocean and deep hum sounds use a “random walk” brown-noise technique.', 'Public domain', ''],
      ['Timer chime', 'The three-note chime is synthesised with code.', 'Original', '']
    ]],
    ['cr_fonts', 'edit', [
      ['Inter', 'Body typeface by Rasmus Andersson.', 'SIL Open Font License 1.1', 'https://rsms.me/inter/'],
      ['Space Grotesk', 'Heading and number typeface by Florian Karsten.', 'SIL Open Font License 1.1', 'https://fonts.google.com/specimen/Space+Grotesk'],
      ['Google Fonts', 'Free service used to deliver the Inter and Space Grotesk fonts.', 'Apache License 2.0', 'https://fonts.google.com']
    ]],
    ['cr_services', 'globe', [
      ['Google Calendar', 'Schedules can be imported, added one event at a time, or synced.', 'Google Terms of Service', 'https://calendar.google.com'],
      ['iCalendar (.ics)', 'The open calendar file standard (RFC 5545) used for downloads.', 'Open standard', 'https://www.rfc-editor.org/rfc/rfc5545'],
      ['GitHub Pages', 'Free hosting for this website.', 'GitHub Terms of Service', 'https://pages.github.com']
    ]],
    ['cr_ideas', 'lightbulb', [
      ['Pomodoro Technique', 'Focus in short sessions with breaks — created by Francesco Cirillo.', '', 'https://www.pomodorotechnique.com'],
      ['Eisenhower Matrix', 'Sorting tasks by urgent and important, named after Dwight D. Eisenhower and popularised by Stephen Covey.', '', ''],
      ['“Don’t break the chain”', 'Marking every day you keep a habit — the idea behind habit streaks, often credited to Jerry Seinfeld.', '', ''],
      ['Two-minute rule & weekly review', 'From David Allen’s “Getting Things Done”.', '', 'https://gettingthingsdone.com'],
      ['Eat the frog', 'Doing your hardest task first — from Brian Tracy’s book of the same name.', '', ''],
      ['Gratitude journaling', 'Writing down good things each day, studied by psychologist Robert Emmons.', '', ''],
      ['Points, levels & badges', 'Game ideas (gamification) used to make good habits more fun.', '', '']
    ]],
    ['cr_science', 'brain', [
      ['Sleep recommendations', 'Hours of sleep for each age group follow guidance from the American Academy of Sleep Medicine and the CDC.', '', 'https://www.cdc.gov/sleep/'],
      ['Movement breaks', 'Regular reminders to stand and stretch follow common workplace health advice.', '', '']
    ]],
    ['cr_quotes', 'book', [
      ['Benjamin Franklin', 'Writer, inventor and statesman (1706–1790).', 'Public domain', ''],
      ['Aristotle & Confucius', 'Ancient Greek and Chinese philosophers.', 'Public domain', ''],
      ['Mark Twain & Theodore Roosevelt', 'American author (1835–1910) and 26th U.S. President (1858–1919).', 'Public domain', ''],
      ['William Penn & Peter Marshall', 'English writer and founder of Pennsylvania; Scottish-American preacher.', '', ''],
      ['Stephen Covey & Pablo Picasso', 'Author of “The 7 Habits of Highly Effective People”; Spanish painter.', '', '']
    ]],
    ['cr_tech', 'grid', [
      ['HTML, CSS & JavaScript', 'Built without frameworks or libraries — just the web platform.', '', 'https://developer.mozilla.org'],
      ['Browser features', 'localStorage (saving), Web Audio (sounds), Notifications, Pointer Events (dragging), Intl (dates and times), print styles.', '', ''],
      ['MDN Web Docs', 'Reference documentation for web technologies.', 'CC BY-SA 2.5', 'https://developer.mozilla.org']
    ]],
    ['cr_lang', 'globe', [
      ['Languages', 'English, हिन्दी (Hindi), Español (Spanish) and Français (French).', '', '']
    ]],
    ['cr_thanks', 'heart', [
      ['Family, friends & testers', 'For trying Timewise and sharing ideas.', '', ''],
      ['You', 'For using Timewise to make the most of your time.', '', '']
    ]]
  ];

  function render(main) {
    const author = (window.TW_CONFIG && TW_CONFIG.CREATED_BY || '').trim();
    main.innerHTML =
      '<div class="page-head"><div><h1>' + t('page_credits') + '</h1><p>' + t('credits_sub') + '</p></div></div>' +
      (author ? '<div class="hero mb"><div><h1>' + t('made_by') + ' ' + esc(author) + '</h1><p>' + t('made_by_sub') + '</p></div></div>' : '') +
      '<div class="grid grid-2" style="align-items:start">' + SECTIONS.map(([key, ic, items]) =>
        '<div class="card"><div class="card-head"><h3>' + icon(ic) + t(key) + '</h3></div><div class="list">' +
        items.map(([name, desc, lic, link]) =>
          '<div class="list-item" style="align-items:flex-start"><div class="grow"><div class="title">' +
          (link ? '<a href="' + link + '" target="_blank" rel="noopener">' + esc(name) + '</a>' : esc(name)) + '</div>' +
          '<div class="small muted" style="margin-top:2px">' + esc(desc) + '</div>' +
          (lic ? '<div class="sub" style="margin-top:6px"><span class="pill">' + esc(lic) + '</span></div>' : '') +
          '</div></div>').join('') +
        '</div></div>').join('') + '</div>' +
      '<p class="footer-note">' + t('credits_note') + '</p>';
  }

  Pages.credits = { render };
})();
