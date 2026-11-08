// Writes tools/restriction-enzymes/index.html: the whole 162-row table in the HTML, so a crawler sees it
// without running anything. The filters and the "cuts my sequence" column are script on top of that table.
// Run: node tools/build-restriction-enzymes.mjs
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { classify, sameSite, groups, junctionOutcome } from './enzyme-groups.mjs'

const site = join(dirname(fileURLToPath(import.meta.url)), '..')
await import(join(site, 'assets', 'enzymes.js'))
await import(join(site, 'assets', 'tools.js'))
const E = globalThis.PLASMIDLAB_ENZYMES, T = globalThis.PlasmidTools

const rows = classify(E)
const same = sameSite(rows)
const gs = groups(rows)
const blunt = rows.filter((r) => r.kind === 'blunt')
const flanking = rows.filter((r) => r.kind === 'flanking')
const depends = rows.filter((r) => r.kind === 'ambiguous')
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]))
const DL = 'https://github.com/plasmidlab/plasmidlab/releases/latest/download/PlasmidLab-Mac.dmg'
const URL = 'https://plasmidlab.com/tools/restriction-enzymes/'
const TITLE = 'Restriction Enzyme List: Sites, Overhangs and Compatible Ends | PlasmidLab'
const DESC = `All ${E.length} restriction enzymes PlasmidLab knows, with the recognition site, where it cuts, the overhang it leaves and which other enzymes leave an end that ligates to it. Paste a sequence to see how often each one cuts.`

// Pairs where a site survives the join. Most pairs destroy both, so the exceptions are what is worth printing.
const survivors = []
for (const g of gs) {
  for (const a of g.members) {
    for (const b of g.members) {
      if (a === b) continue
      const o = junctionOutcome(a, b, T.findSites)
      if (o.keptA || o.keptB) survivors.push({a, b, ...o})
    }
  }
}

const groupLabel = (g) => `${g.end} ${g.overhang}`
const groupId = (g) => `ends-${g.end === "5'" ? '5' : '3'}-${g.overhang.toLowerCase()}`
const groupOf = new Map()
for (const g of gs) for (const m of g.members) groupOf.set(m.name, g)

const tableRows = rows.map((r) => {
  const g = groupOf.get(r.name)
  const partners = g ? g.members.filter((m) => m !== r).map((m) => m.name).join(', ') : ''
  const ends = r.kind === 'blunt' ? 'blunt' : `${r.end} overhang, ${r.length} nt`
  const over = r.kind === 'blunt' ? '—' : r.kind === 'flanking' ? 'set by flanking sequence' : r.overhang
  const ligates = r.kind === 'blunt' ? 'any blunt end'
    : r.kind === 'flanking' ? 'whatever you design'
      : partners ? `<a href="#${groupId(g)}">${esc(partners)}</a>`
        : r.group ? 'nothing else in this list' : 'depends on the site'
  const siblings = same.get(r.name)
  const sib = siblings ? siblings.map((s) => `${esc(s.name)} <span class="muted">(${s.kind})</span>`).join(', ') : '—'
  return `<tr data-name="${esc(r.name.toLowerCase())}" data-end="${r.kind === 'flanking' ? 'flanking' : r.end === 'blunt' ? 'blunt' : r.end === "5'" ? 'five' : 'three'}" data-len="${r.site.length}">`
    + `<th scope="row">${esc(r.name)}</th><td class="mono">${esc(r.text)}</td><td>${ends}</td>`
    + `<td class="mono">${esc(over)}</td><td>${ligates}</td><td>${sib}</td><td class="cuts">—</td></tr>`
}).join('')

const groupSections = gs.map((g) => {
  const names = g.members.map((m) => `<a href="/tools/restriction-sites/">${esc(m.name)}</a>`).join(', ')
  const kept = survivors.filter((s) => g.members.includes(s.a) && g.members.includes(s.b))
  const keptText = kept.length
    ? `<p class="muted">Joins in this group that leave a site standing: ${kept.map((s) =>
      `${esc(s.a.name)} to ${esc(s.b.name)} gives <span class="mono">${esc(s.seq)}</span>, ${esc(s.label)}`).join('; ')}.</p>`
    : '<p class="muted">Every pair in this group destroys both sites.</p>'
  return `<div class="ends-group" id="${groupId(g)}"><h3>${esc(groupLabel(g))} <span class="muted">· ${g.members.length} enzymes</span></h3>`
    + `<p>${names}</p>${keptText}</div>`
}).join('')

const listOf = (list, extra) => list.map((r) => `<li><span class="mono">${esc(r.name)}</span>${extra ? ' ' + extra(r) : ''}</li>`).join('')

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(TITLE)}</title><meta name="description" content="${esc(DESC)}"><link rel="canonical" href="${URL}"><meta property="og:type" content="website"><meta property="og:title" content="${esc(TITLE)}"><meta property="og:description" content="${esc(DESC)}"><meta property="og:url" content="${URL}"><meta property="og:image" content="https://plasmidlab.com/assets/sequence.png"><meta name="twitter:card" content="summary_large_image"><meta name="theme-color" content="#FFFFFF" media="(prefers-color-scheme: light)"><meta name="theme-color" content="#181818" media="(prefers-color-scheme: dark)"><script type="application/ld+json">${JSON.stringify({
  '@context': 'https://schema.org', '@type': 'WebApplication',
  name: 'Restriction enzyme list', url: URL, description: DESC,
  applicationCategory: 'UtilitiesApplication', operatingSystem: 'Any', isAccessibleForFree: true,
  author: {'@type': 'Organization', name: 'PlasmidLab', url: 'https://plasmidlab.com/'},
  publisher: {'@type': 'Organization', name: 'PlasmidLab', url: 'https://plasmidlab.com/'},
})}</script><script src="/assets/theme.js"></script><link rel="icon" href="/assets/icon.svg" type="image/svg+xml"><link rel="stylesheet" href="/assets/fonts/geist.css"><link rel="stylesheet" href="/guides/guides.css"><link rel="stylesheet" href="/assets/pages.css"></head><body><a class="skip" href="#main">Skip to content</a><nav class="nav" aria-label="Main navigation"><a class="brand" href="/">PlasmidLab</a><div class="nav-links"><a class="home" href="/">Home</a><a class="more" href="/#tools">Tools</a><a href="/#guides">Guides</a><a data-login rel="nofollow" href="https://api.plasmidlab.com/login">Log in</a><a class="button" data-download="nav" href="${DL}">Download</a></div></nav><main class="wrap" id="main"><p class="eyebrow"><a href="/">PlasmidLab</a> / <a href="/#tools">Free tools</a> / Restriction enzymes</p><h1>Restriction enzyme list: sites, overhangs and compatible ends</h1><p class="lead">All ${E.length} enzymes PlasmidLab works with, in one table: what each one recognises, where it cuts, the end it leaves, and which other enzymes leave an end that ligates to it. Paste a sequence and a column appears showing how often each enzyme cuts it.</p>

<section class="tool" aria-label="Restriction enzyme list"><label class="field" for="seq">DNA sequence <span class="muted">(optional)</span></label><textarea id="seq" spellcheck="false" autocomplete="off" placeholder="Paste DNA or FASTA to count the cuts, e.g. a plasmid"></textarea><div class="options"><label><input type="checkbox" id="header" checked> Skip FASTA header lines</label><label><input type="checkbox" id="circular"> Circular</label><button type="button" class="copy" id="example">Use an example</button></div>
<div class="controls"><div><span class="label" id="end-label">Ends</span><span class="seg" role="group" aria-labelledby="end-label"><button type="button" data-end="all" aria-pressed="true">All</button><button type="button" data-end="five" aria-pressed="false">5′ overhang</button><button type="button" data-end="three" aria-pressed="false">3′ overhang</button><button type="button" data-end="blunt" aria-pressed="false">Blunt</button><button type="button" data-end="flanking" aria-pressed="false">Type IIS</button></span></div><div><label for="len">Site length</label><select id="len"><option value="all">Any</option><option value="4">4 bp</option><option value="5">5 bp</option><option value="6">6 bp</option><option value="7">7 bp</option><option value="8">8 bp</option><option value="11">11 bp</option></select></div><div><label for="q">Find an enzyme</label><input id="q" type="search" spellcheck="false" autocomplete="off" placeholder="EcoRI"></div></div>
<p class="status" id="status" role="status" aria-live="polite">${E.length} enzymes. Recognition sites and cut positions from REBASE release 611.</p>
<div class="table-wrap"><table class="features" id="enzymes"><thead><tr><th scope="col">Enzyme</th><th scope="col">Site</th><th scope="col">Ends</th><th scope="col">Overhang</th><th scope="col">Ligates with</th><th scope="col">Same site as</th><th scope="col">Cuts</th></tr></thead><tbody>${tableRows}</tbody></table></div></section>

<section class="prose"><h2>Which ends ligate to which</h2><p>Two sticky ends anneal when their overhangs are the same kind, both 5′ or both 3′, the same length, and complementary to each other. An overhang written 5′ to 3′ therefore pairs with its own reverse complement, which is why a palindromic overhang such as GATC pairs with itself. A 5′ overhang never pairs with a 3′ one, whatever the letters: KpnI and Acc65I cut the same site, GGTACC, and leave the same four bases, but one leaves them on the 3′ side and the other on the 5′ side, so their ends do not go together.</p><p>Below are the ${gs.length} groups in this list whose members leave ends that ligate to each other. Joining two enzymes from one group usually destroys both recognition sites, which is the point of the trick: the insert cannot fall back out. The exceptions are listed under each group, and most of them are enzymes with a short site that still finds it inside the join.</p>${groupSections}
<h3>Blunt ends <span class="muted">· ${blunt.length} enzymes</span></h3><p>Any blunt end ligates to any other blunt end, so these ${blunt.length} enzymes form one group with no sequence to match: ${blunt.map((r) => esc(r.name)).join(', ')}. The join is less efficient than a sticky one and the insert can go in either way round.</p>
<h3>Overhang set by the flanking sequence <span class="muted">· ${flanking.length} enzymes</span></h3><p>These cut outside their recognition site, so the overhang is whatever the neighbouring bases happen to be, not a property of the enzyme. That is what Golden Gate assembly is built on: you choose the overhangs. They are listed with no group for that reason: ${flanking.map((r) => esc(r.name)).join(', ')}.</p>
<h3>Overhang depends on the site <span class="muted">· ${depends.length} enzymes</span></h3><p>These recognise a site with an ambiguous base inside the overhang, so the four bases left behind depend on the particular site that was cut. AvaI, for example, leaves 5′ YCGR, which is CCGA, CCGG, TCGA or TCGG depending on the sequence. Two of them ligate only when the real overhangs work out complementary: ${depends.map((r) => `${esc(r.name)} <span class="mono">${esc(r.end)} ${esc(r.overhang)}</span>`).join(', ')}.</p>

<h2>How this table is made</h2><p>Every column is worked out from the recognition site and the two cut offsets, which is all the enzyme list holds. The site is written REBASE style, with ^ where the top strand is cut, or as GGTCTC(1/5) when the cut falls past the site. The overhang is the stretch between the two cuts, the end is 5′ when the top strand is cut first and 3′ when the bottom strand is, and the group is the overhang together with its reverse complement so that complementary ends land in the same group.</p><p>Each join shown under a group is the left half of the first site up to its cut, followed by the right half of the second. The site finder then runs on that joined sequence for both enzymes. Only a site lying wholly inside the join can be decided this way: bases further out belong to the rest of your construct, so a site that would need them is neither claimed nor ruled out here.</p><p>Dam and Dcm methylation are not taken into account here. The PlasmidLab app can mark the sites they block. Nothing on this page knows about buffers, reaction temperatures or how well an enzyme cuts near the end of a fragment, because the list does not carry that.</p><p class="note">Recognition sites and cut positions from REBASE, the Restriction Enzyme Database (<a href="http://rebase.neb.com">rebase.neb.com</a>), release 611. This is the same enzyme list the PlasmidLab app uses. Everything runs in your browser; the sequence is not sent anywhere.</p></section>

<aside class="cta" aria-labelledby="cta-title"><div><p class="kicker">PlasmidLab for Mac and Windows</p><h2 id="cta-title">Do this on your own plasmids</h2><p>PlasmidLab draws the cut sites on a map of your plasmid, runs the digest on a simulated gel and plans the cloning from the ends you have. It is free for Mac and Windows.</p></div><div class="actions"><a class="button" data-download="primary" href="${DL}">Download for Mac</a><a data-download="other" href="${DL}">Also for Windows</a></div></aside>
<aside class="related"><h2>More free tools</h2><ul class="link-list"><li><a href="/tools/restriction-sites/">Restriction site finder<span>Enzymes that cut once, twice or not at all.</span></a></li><li><a href="/tools/virtual-gel/">Virtual agarose gel<span>The bands your digest will give.</span></a></li><li><a href="/tools/dna-molarity/">DNA molarity and ligation calculator<span>ng to pmol, and the insert ng for a ratio.</span></a></li><li><a href="/tools/gc-content/">GC content and primer Tm<span>Base counts, GC% and the Tm of a primer.</span></a></li><li><a href="/tools/translate/">Translate DNA and find ORFs<span>Six reading frames, with the ORFs marked.</span></a></li></ul><h2 style="margin-top:40px">Guides</h2><ul class="link-list"><li><a href="/guides/restriction-cloning/">Restriction cloning<span>Two enzymes, one orientation.</span></a></li><li><a href="/guides/golden-gate-assembly/">Golden Gate assembly<span>Overhangs you choose.</span></a></li><li><a href="/guides/gibson-assembly/">Design a Gibson assembly<span>Primers, junctions and the product.</span></a></li></ul></aside></main><footer class="footer"><div><div class="foot-text"><p>© 2026 PlasmidLab</p><p>PlasmidLab is for research use only. The free AI trial is for people aged 18 or older.</p><p>Gibson Assembly, Gateway, TOPO, In-Fusion, NEBuilder, Q5, SnapGene, Benchling, Claude, Codex, ChatGPT, Grok, Google and Apple are trademarks of their owners. PlasmidLab is not affiliated with or endorsed by them.</p></div><nav class="footer-links"><a href="mailto:support@plasmidlab.com">support@plasmidlab.com</a><a href="https://github.com/plasmidlab/plasmidlab/issues">Report a problem</a><a href="/#guides">Guides</a><a href="/privacy/">Privacy</a><a href="/privacy/ko/" lang="ko">개인정보처리방침</a><a href="/terms/">Terms</a><a href="/ko/" lang="ko" hreflang="ko">한국어</a></nav></div></footer><script src="/assets/download.js" defer></script><script src="/assets/consent.js" defer></script><script src="/assets/enzymes.js"></script><script src="/assets/tools.js"></script>
<script>
(() => {
  const T = PlasmidTools, $ = id => document.getElementById(id), fmt = n => n.toLocaleString('en-US');
  const byName = new Map(PLASMIDLAB_ENZYMES.map(e => [e[0].toLowerCase(), e]));
  const rows = [...document.querySelectorAll('#enzymes tbody tr')];
  const TOTAL = rows.length;
  let end = 'all', timer = 0;

  function run() {
    const s = T.clean($('seq').value, {header: $('header').checked}).replace(/[^A-Za-z]/g, '');
    const circular = $('circular').checked, len = $('len').value, q = $('q').value.trim().toLowerCase();
    const cuts = s ? new Map(T.digest(s, circular).map(h => [h.name, h.sites.length])) : null;
    let shown = 0, cutting = 0;
    for (const tr of rows) {
      const name = tr.dataset.name;
      const n = cuts ? (cuts.get(tr.firstElementChild.textContent) ?? 0) : null;
      tr.lastElementChild.textContent = n === null ? '—' : n ? fmt(n) : 'none';
      tr.lastElementChild.className = 'cuts' + (n ? ' hit' : '');
      if (n) cutting++;
      const ok = (end === 'all' || tr.dataset.end === end) && (len === 'all' || tr.dataset.len === len) && (!q || name.includes(q));
      tr.hidden = !ok;
      if (ok) shown++;
    }
    $('status').textContent = (shown === TOTAL ? fmt(TOTAL) + ' enzymes' : fmt(shown) + ' of ' + fmt(TOTAL) + ' enzymes')
      + (s ? ' · ' + fmt(s.length) + ' bp, ' + (circular ? 'circular' : 'linear') + ' · ' + fmt(cutting) + ' of ' + fmt(TOTAL) + ' cut it' : ' · Recognition sites and cut positions from REBASE release 611.');
  }
  const later = () => { clearTimeout(timer); timer = setTimeout(run, 120); };
  for (const id of ['seq', 'header', 'circular', 'len', 'q']) $(id).addEventListener('input', later);
  document.querySelectorAll('[data-end]').forEach(b => b.addEventListener('click', () => {
    end = b.dataset.end;
    document.querySelectorAll('[data-end]').forEach(o => o.setAttribute('aria-pressed', String(o === b)));
    run();
  }));
  $('example').addEventListener('click', () => { $('seq').value = '>pUC19 multiple cloning site, EcoRI to HindIII\\nGAATTCGAGCTCGGTACCCGGGGATCCTCTAGAGTCGACCTGCAGGCATGCAAGCTT'; run(); });
  run();
})();
</script></body></html>
`

mkdirSync(join(site, 'tools', 'restriction-enzymes'), {recursive: true})
writeFileSync(join(site, 'tools', 'restriction-enzymes', 'index.html'), html)
const sizes = {rows: rows.length, groups: gs.length, blunt: blunt.length, flanking: flanking.length, depends: depends.length, survivors: survivors.length}
console.log('tools/restriction-enzymes/index.html', (html.length / 1024).toFixed(0) + ' kB', JSON.stringify(sizes))
if (!readFileSync(join(site, 'sitemap.xml'), 'utf8').includes(URL)) console.log('  note: add', URL, 'to sitemap.xml')
