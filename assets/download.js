// Points each download link at the visitor's installer. tools/release.mjs uploads these fixed names with every release.
(() => {
  const latest = 'https://github.com/plasmidlab/plasmidlab/releases/latest/download/';
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
