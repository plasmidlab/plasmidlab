// The visitor's own light or dark choice. With nothing stored the CSS follows the system setting.
(() => {
  const KEY = 'plasmidlab_theme', root = document.documentElement;
  const store = () => { try { return localStorage; } catch { return null; } };
  const saved = store()?.getItem(KEY);
  if (saved === 'light' || saved === 'dark') root.dataset.theme = saved;

  const isDark = () => root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  const ko = root.lang === 'ko';
  const words = ko
    ? {light: '밝은 화면으로 보기', dark: '어두운 화면으로 보기'}
    : {light: 'Switch to the light theme', dark: 'Switch to the dark theme'};
  const icon = {
    light: '<svg viewBox="0 0 256 256" aria-hidden="true" focusable="false"><path d="M120,40V16a8,8,0,0,1,16,0V40a8,8,0,0,1-16,0Zm72,88a64,64,0,1,1-64-64A64.07,64.07,0,0,1,192,128Zm-16,0a48,48,0,1,0-48,48A48.05,48.05,0,0,0,176,128ZM58.34,69.66A8,8,0,0,0,69.66,58.34l-16-16A8,8,0,0,0,42.34,53.66Zm0,116.68-16,16a8,8,0,0,0,11.32,11.32l16-16a8,8,0,0,0-11.32-11.32ZM192,72a8,8,0,0,0,5.66-2.34l16-16a8,8,0,0,0-11.32-11.32l-16,16A8,8,0,0,0,192,72Zm5.66,114.34a8,8,0,0,0-11.32,11.32l16,16a8,8,0,0,0,11.32-11.32ZM48,128a8,8,0,0,0-8-8H16a8,8,0,0,0,0,16H40A8,8,0,0,0,48,128Zm80,80a8,8,0,0,0-8,8v24a8,8,0,0,0,16,0V216A8,8,0,0,0,128,208Zm112-88H216a8,8,0,0,0,0,16h24a8,8,0,0,0,0-16Z"/></svg>',
    dark: '<svg viewBox="0 0 256 256" aria-hidden="true" focusable="false"><path d="M233.54,142.23a8,8,0,0,0-8-2,88.08,88.08,0,0,1-109.8-109.8,8,8,0,0,0-10-10,104.84,104.84,0,0,0-52.91,37A104,104,0,0,0,136,224a103.09,103.09,0,0,0,62.52-20.88,104.84,104.84,0,0,0,37-52.91A8,8,0,0,0,233.54,142.23ZM188.9,190.34A88,88,0,0,1,65.66,67.11a89,89,0,0,1,31.4-26A106,106,0,0,0,96,56,104.11,104.11,0,0,0,200,160a106,106,0,0,0,14.92-1.06A89,89,0,0,1,188.9,190.34Z"/></svg>'
  };

  function paint(button) {
    const next = isDark() ? 'light' : 'dark';
    button.innerHTML = icon[next];
    button.setAttribute('aria-label', words[next]);
    button.title = words[next];
    // The paired theme-color metas follow the system, so a chosen theme has to colour the browser bar itself.
    if (root.dataset.theme) {
      const colour = isDark() ? '#181818' : '#FFFFFF';
      document.querySelectorAll('meta[name="theme-color"]').forEach(meta => { meta.content = colour; });
    }
  }

  addEventListener('DOMContentLoaded', () => {
    const nav = document.querySelector('.nav');
    if (!nav) return;
    const style = document.createElement('style');
    style.textContent = `
.theme-toggle{display:inline-flex;align-items:center;justify-content:center;flex:none;width:40px;height:40px;padding:0;border:0;border-radius:8px;background:transparent;color:var(--muted);cursor:pointer}
.theme-toggle svg{width:20px;height:20px;fill:currentColor}
.theme-toggle:hover{background:var(--band);color:var(--ink)}
.theme-toggle:focus-visible{outline:2px solid var(--accent);outline-offset:2px}`;
    document.head.append(style);

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'theme-toggle';
    button.addEventListener('click', () => {
      root.dataset.theme = isDark() ? 'light' : 'dark';
      try { store()?.setItem(KEY, root.dataset.theme); } catch {}
      paint(button);
    });
    paint(button);

    const toggle = nav.querySelector('.menu-toggle');
    if (toggle) nav.insertBefore(button, toggle);
    else (nav.querySelector('.nav-links') || nav).append(button);
  });
})();
