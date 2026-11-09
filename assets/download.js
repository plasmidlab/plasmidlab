// Points each download link at the visitor's installer. tools/release.mjs uploads these fixed names with every release.
// shortcut: pinned to v0.2.4 (bumped from v0.2.2 on 2026-11-09) because GitHub's latest/ alias returned 504 on 2026-11-08; move back to latest/ or bump the version at the next release.
(() => {
  const latest = 'https://github.com/plasmidlab/plasmidlab/releases/download/v0.2.4/';
  const files = {mac:'PlasmidLab-Mac.dmg', windows:'PlasmidLab-Windows.exe'};
  const labels = {mac:'Mac', windows:'Windows'}, ko = document.documentElement.lang === 'ko';
  const primary = /Win/i.test(navigator.platform + navigator.userAgent) ? 'windows' : 'mac';
  document.querySelectorAll('[data-download]').forEach(link => {
    const kind = link.dataset.download;
    const os = files[kind] ? kind : kind === 'other' ? (primary === 'mac' ? 'windows' : 'mac') : primary;
    link.href = latest + files[os];
    // Narrow nav bars keep their short "Download" label.
    if (kind !== 'nav') link.textContent = ko ? labels[os] + '용 다운로드' : (kind === 'other' ? 'Also for ' : 'Download for ') + labels[os];
  });
})();
