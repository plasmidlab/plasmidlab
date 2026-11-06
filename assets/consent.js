// The cookie choice and the visit record. Nothing is stored or sent until the visitor presses Allow.
(() => {
  const API = 'https://api.plasmidlab.com/site/', YEAR = 31536000, CHOICE = 'plasmidlab_consent', ID = 'plasmidlab_visitor';
  const ko = document.documentElement.lang === 'ko';
  const words = ko
    ? {label:'쿠키 선택', text:'쿠키를 저장하고 어떤 페이지와 섹션을 봤는지 기록해 사이트 이용 현황을 파악하려 합니다. 허용하지 않으면 기록하지 않습니다.', more:'자세히 보기', href:'/privacy/ko/', allow:'허용', decline:'거부', settings:'쿠키 설정'}
    : {label:'Cookie choice', text:'We would like to set a cookie and record which pages and sections you view, to see how this site is used. Nothing is recorded unless you allow it.', more:'Details', href:'/privacy/', allow:'Allow', decline:'Decline', settings:'Cookie settings'};
  const read = name => document.cookie.split('; ').find(c => c.startsWith(name + '='))?.slice(name.length + 1);
  const write = (name, value, age = YEAR) => { document.cookie = `${name}=${value}; Max-Age=${age}; Path=/; SameSite=Lax; Secure`; };
  const send = (route, body) => navigator.sendBeacon(API + route, JSON.stringify(body));
  let stop = null;

  function record() {
    if (stop) return;
    let visitor = read(ID);
    if (!visitor) write(ID, visitor = crypto.randomUUID());
    // Another tab may have declined since this page loaded.
    const event = (kind, extra) => {
      if (read(CHOICE) === 'yes' && read(ID) === visitor) send('event', {visitor, kind, path:location.pathname, ...extra});
      else stop?.();
    };
    const from = document.referrer && new URL(document.referrer).hostname.toLowerCase();
    event('page', from !== location.hostname && /^[a-z0-9._-]+$/.test(from) ? {referrer:from} : {});
    // The line across the middle of the screen entering a section counts as viewing it, however tall it is.
    const seen = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { seen.unobserve(entry.target); event('section', {detail:entry.target.id}); }
    }), {rootMargin:'-50% 0px -50% 0px'});
    document.querySelectorAll('section[id]').forEach(section => seen.observe(section));
    const click = e => {
      const link = e.target.closest?.('[data-download],a[href*="/releases/"]');
      if (link) event('download', {detail:link.textContent.trim().replace(/[^\w .-]/g, '').slice(0, 80) || 'Download'});
    };
    document.addEventListener('click', click);
    stop = () => { seen.disconnect(); document.removeEventListener('click', click); stop = null; };
  }

  // The id stays until the relay confirms the deletion. The relay deletes a batch per call and answers an error
  // while more remain, so a few quick retries finish it; anything left waits for the next visit.
  function forget(tries = 5) {
    const visitor = read(ID);
    if (!visitor || read(CHOICE) !== 'no') return;
    fetch(API + 'forget', {method:'POST', body:JSON.stringify({visitor}), keepalive:true})
      .then(response => { if (!response.ok) throw new Error('Not deleted yet'); if (read(CHOICE) === 'no') write(ID, '', 0); })
      .catch(() => { if (tries > 1) setTimeout(() => forget(tries - 1), 500); });
  }

  function apply() {
    const choice = read(CHOICE);
    if (choice === 'yes') return record();
    stop?.();
    if (choice === 'no') forget();
    else ask(false);
  }

  function choose(yes) {
    write(CHOICE, yes ? 'yes' : 'no');
    document.getElementById('cookie-choice')?.remove();
    // With cookies blocked the choice is not kept: close, record nothing, and ask again on the next page.
    if (read(CHOICE)) apply();
  }

  function ask(focus) {
    if (document.getElementById('cookie-choice')) return;
    const box = document.createElement('div');
    box.id = 'cookie-choice';
    box.setAttribute('role', 'region');
    box.setAttribute('aria-label', words.label);
    const text = document.createElement('p');
    const more = document.createElement('a');
    more.href = words.href;
    more.textContent = words.more;
    text.append(words.text + ' ', more);
    const row = document.createElement('div');
    for (const [label, yes] of [[words.decline, false], [words.allow, true]]) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = label;
      if (yes) button.className = 'allow';
      button.addEventListener('click', () => choose(yes));
      row.append(button);
    }
    box.append(text, row);
    document.body.append(box);
    if (focus) row.firstChild.focus();
  }

  const style = document.createElement('style');
  style.textContent = `
#cookie-choice{position:fixed;z-index:90;left:16px;right:16px;bottom:16px;max-width:560px;margin:0 auto;box-sizing:border-box;padding:16px;background:#fff;color:#161618;border:1px solid #dedee2;border-radius:12px;box-shadow:0 8px 32px rgba(22,22,24,.14);font-size:14px;line-height:20px}
#cookie-choice p{margin:0 0 12px}
#cookie-choice a{color:#2b3fb0}
#cookie-choice div{display:flex;justify-content:flex-end;gap:8px}
#cookie-choice button{font:inherit;font-weight:500;min-height:40px;padding:8px 16px;border-radius:8px;border:1px solid #2b3fb0;background:#fff;color:#2b3fb0;cursor:pointer}
#cookie-choice button.allow{background:#2b3fb0;color:#fff}
#cookie-choice button:focus-visible,.cookie-settings:focus-visible{outline:2px solid #2b3fb0;outline-offset:2px}
.cookie-settings{align-self:flex-start;font:inherit;color:inherit;background:none;border:0;padding:0;cursor:pointer;text-decoration:underline;text-underline-offset:4px}`;
  document.head.append(style);

  const settings = document.createElement('button');
  settings.type = 'button';
  settings.className = 'cookie-settings';
  settings.textContent = words.settings;
  settings.addEventListener('click', () => ask(true));
  document.querySelector('.footer-links, footer nav')?.append(settings);

  apply();
  // Back and forward restore a page as it was, possibly from before the visitor chose.
  addEventListener('pageshow', e => {
    if (!e.persisted) return;
    document.getElementById('cookie-choice')?.remove();
    apply();
  });
})();
