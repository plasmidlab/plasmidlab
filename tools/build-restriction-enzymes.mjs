// Writes the restriction enzyme list in both languages:
//   tools/restriction-enzymes/index.html  and  ko/tools/restriction-enzymes/index.html
// The whole 162-row table goes into the HTML at build time, so a crawler sees it without running anything.
// The filters and the "cuts my sequence" column are script on top of that same table.
// One builder for both languages, so a change to what the page claims cannot land in one and miss the other.
// Both index.html files are generated: edit this script and re-run it, never the HTML. (The six
// hand-written pages under ko/tools/ are the opposite case and are maintained by hand.)
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
// shortcut: pinned to v0.2.6 (bumped from v0.2.5 on 2026-11-09) because GitHub's latest/ alias returned 504 on 2026-11-08; move back to latest/ or bump the version at the next release.
const DL = 'https://github.com/plasmidlab/plasmidlab/releases/download/v0.2.6/PlasmidLab-Mac.dmg'
const EN_URL = 'https://plasmidlab.com/tools/restriction-enzymes/'
const KO_URL = 'https://plasmidlab.com/ko/tools/restriction-enzymes/'
const N = E.length

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

const groupId = (g) => `ends-${g.end === "5'" ? '5' : '3'}-${g.overhang.toLowerCase()}`
const groupOf = new Map()
for (const g of gs) for (const m of g.members) groupOf.set(m.name, g)

const EN = {
  lang: 'en', url: EN_URL, home: '/', tools: '/#tools', guides: '/#guides',
  title: 'Restriction Enzyme List: Sites, Overhangs and Compatible Ends | PlasmidLab',
  desc: `All ${N} restriction enzymes PlasmidLab knows, with the recognition site, where it cuts, the overhang it leaves and which other enzymes leave an end that ligates to it. Paste a sequence to see how often each one cuts.`,
  ldName: 'Restriction enzyme list',
  crumb: 'Restriction enzymes',
  h1: 'Restriction enzyme list: sites, overhangs and compatible ends',
  lead: `All ${N} enzymes PlasmidLab works with, in one table: what each one recognises, where it cuts, the end it leaves, and which other enzymes leave an end that ligates to it. Paste a sequence and a column appears showing how often each enzyme cuts it.`,
  skip: 'Skip to content', navAria: 'Main navigation', navHome: 'Home', navTools: 'Tools', navGuides: 'Guides',
  login: 'Log in', download: 'Download', toolAria: 'Restriction enzyme list',
  seqLabel: 'DNA sequence', optional: '(optional)',
  seqPlaceholder: 'Paste DNA or FASTA to count the cuts, e.g. a plasmid',
  skipHeaders: 'Skip FASTA header lines', circular: 'Circular', example: 'Use an example',
  endsLabel: 'Ends', all: 'All', blunt: 'Blunt', typeIIs: 'Type IIS',
  lenLabel: 'Site length', any: 'Any', bp: 'bp', find: 'Find an enzyme',
  statusStart: `${N} enzymes. Recognition sites and cut positions from REBASE release 611.`,
  thEnzyme: 'Enzyme', thSite: 'Site', thEnds: 'Ends', thOverhang: 'Overhang',
  thLigates: 'Ligates with', thSame: 'Same site as', thCuts: 'Cuts',
  cellBlunt: 'blunt', cellFlanking: 'set by flanking sequence', cellAnyBlunt: 'any blunt end',
  cellDesign: 'whatever you design', cellNothing: 'nothing else in this list', cellDepends: 'depends on the site',
  nt: 'nt', iso: 'isoschizomer', neo: 'neoschizomer',
  h2Groups: 'Which ends ligate to which',
  groupsP1: 'Two sticky ends anneal when their overhangs are the same kind, both 5′ or both 3′, the same length, and complementary to each other. An overhang written 5′ to 3′ therefore pairs with its own reverse complement, which is why a palindromic overhang such as GATC pairs with itself. A 5′ overhang never pairs with a 3′ one, whatever the letters: KpnI and Acc65I cut the same site, GGTACC, and leave the same four bases, but one leaves them on the 3′ side and the other on the 5′ side, so their ends do not go together.',
  groupsP2: `Below are the ${gs.length} groups in this list whose members leave ends that ligate to each other. Joining two enzymes from one group usually destroys both recognition sites, which is the point of the trick: the insert cannot fall back out. The exceptions are listed under each group, and most of them are enzymes with a short site that still finds it inside the join.`,
  enzymes: 'enzymes',
  keptIntro: 'Joins in this group that leave a site standing:',
  keptNone: 'Every pair in this group destroys both sites.',
  gives: 'gives',
  to: 'to',
  h3Blunt: 'Blunt ends',
  bluntP: (names) => `Any blunt end ligates to any other blunt end, so these ${blunt.length} enzymes form one group with no sequence to match: ${names}. The join is less efficient than a sticky one and the insert can go in either way round.`,
  h3Flanking: 'Overhang set by the flanking sequence',
  flankingP: (names) => `These cut outside their recognition site, so the overhang is whatever the neighbouring bases happen to be, not a property of the enzyme. That is what Golden Gate assembly is built on: you choose the overhangs. They are listed with no group for that reason: ${names}.`,
  h3Depends: 'Overhang depends on the site',
  dependsP: (names) => `These recognise a site with an ambiguous base inside the overhang, so the four bases left behind depend on the particular site that was cut. AvaI, for example, leaves 5′ YCGR, which is CCGA, CCGG, TCGA or TCGG depending on the sequence. Two of them ligate only when the real overhangs work out complementary: ${names}.`,
  h2How: 'How this table is made',
  howP1: 'Every column is worked out from the recognition site and the two cut offsets, which is all the enzyme list holds. The site is written REBASE style, with ^ where the top strand is cut, or as GGTCTC(1/5) when the cut falls past the site. The overhang is the stretch between the two cuts, the end is 5′ when the top strand is cut first and 3′ when the bottom strand is, and the group is the overhang together with its reverse complement so that complementary ends land in the same group.',
  howP2: 'Each join shown under a group is the left half of the first site up to its cut, followed by the right half of the second. The site finder then runs on that joined sequence for both enzymes. Only a site lying wholly inside the join can be decided this way: bases further out belong to the rest of your construct, so a site that would need them is neither claimed nor ruled out here.',
  howP3: 'Dam and Dcm methylation are not taken into account here. The PlasmidLab app can mark the sites they block. Nothing on this page knows about buffers, reaction temperatures or how well an enzyme cuts near the end of a fragment, because the list does not carry that.',
  note: 'Recognition sites and cut positions from REBASE, the Restriction Enzyme Database (<a href="http://rebase.neb.com">rebase.neb.com</a>), release 611. This is the same enzyme list the PlasmidLab app uses. Everything runs in your browser; the sequence is not sent anywhere.',
  ctaKicker: 'PlasmidLab for Mac and Windows', ctaTitle: 'Do this on your own plasmids',
  ctaBody: 'PlasmidLab draws the cut sites on a map of your plasmid, runs the digest on a simulated gel and plans the cloning from the ends you have. It is free for Mac and Windows.',
  ctaMac: 'Download for Mac', ctaWin: 'Also for Windows',
  relatedTools: 'More free tools', relatedGuides: 'Guides',
  tools: [
    ['/tools/restriction-sites/', 'Restriction site finder', 'Enzymes that cut once, twice or not at all.'],
    ['/tools/virtual-gel/', 'Virtual agarose gel', 'The bands your digest will give.'],
    ['/tools/dna-molarity/', 'DNA molarity and ligation calculator', 'ng to pmol, and the insert ng for a ratio.'],
    ['/tools/gc-content/', 'GC content and primer Tm', 'Base counts, GC% and the Tm of a primer.'],
    ['/tools/translate/', 'Translate DNA and find ORFs', 'Six reading frames, with the ORFs marked.'],
  ],
  guideLinks: [
    ['/guides/restriction-cloning/', 'Restriction cloning', 'Two enzymes, one orientation.'],
    ['/guides/golden-gate-assembly/', 'Golden Gate assembly', 'Overhangs you choose.'],
    ['/guides/gibson-assembly/', 'Design a Gibson assembly', 'Primers, junctions and the product.'],
  ],
  footer: '<p>© 2026 PlasmidLab</p><p>PlasmidLab is for research use only. The free AI trial is for people aged 18 or older.</p><p>Gibson Assembly, Gateway, TOPO, In-Fusion, NEBuilder, Q5, SnapGene, Benchling, Claude, Codex, ChatGPT, Grok, Google and Apple are trademarks of their owners. PlasmidLab is not affiliated with or endorsed by them.</p>',
  footerLinks: `<a href="mailto:support@plasmidlab.com">support@plasmidlab.com</a><a href="https://github.com/plasmidlab/plasmidlab/issues">Report a problem</a><a href="/#guides">Guides</a><a href="/privacy/">Privacy</a><a href="/privacy/ko/" lang="ko">개인정보처리방침</a><a href="/terms/">Terms</a><a href="${KO_URL.replace('https://plasmidlab.com', '')}" lang="ko" hreflang="ko">한국어</a>`,
  js: {none: 'none', dash: '—',
    statusAll: (n) => `${n} enzymes`, statusSome: (s, n) => `${s} of ${n} enzymes`,
    seq: (bp, shape) => ` · ${bp} bp, ${shape} · `, linear: 'linear', circular2: 'circular',
    cutting: (c, n) => `${c} of ${n} cut it`,
    rebase: ' · Recognition sites and cut positions from REBASE release 611.',
    exampleHeader: '>pUC19 multiple cloning site, EcoRI to HindIII'},
}

const KO = {
  ...EN, lang: 'ko', url: KO_URL, home: '/ko/', tools: '/ko/#guides', guides: '/ko/guides/',
  title: '제한효소 목록: 인식 부위, 돌출, 호환되는 말단 | PlasmidLab',
  desc: `PlasmidLab이 쓰는 제한효소 ${N}종을 한 표에 모았습니다. 인식 부위와 절단 위치, 남는 돌출, 그리고 어떤 효소끼리 말단이 붙는지까지 보여줍니다. 서열을 붙여 넣으면 효소별로 몇 번 자르는지도 나옵니다.`,
  ldName: '제한효소 목록',
  crumb: '제한효소 목록',
  h1: '제한효소 목록: 인식 부위, 돌출, 호환되는 말단',
  lead: `PlasmidLab이 다루는 효소 ${N}종을 한 표에 모았습니다. 무엇을 인식하고 어디를 자르는지, 어떤 말단을 남기는지, 그리고 어떤 효소가 그 말단에 붙는 말단을 남기는지 함께 봅니다. 서열을 붙여 넣으면 효소마다 몇 번 자르는지 보여주는 열이 생깁니다.`,
  skip: '본문으로 건너뛰기', navAria: '주요 메뉴', navHome: '홈', navTools: '도구', navGuides: '가이드',
  login: '로그인', download: '다운로드', toolAria: '제한효소 목록',
  seqLabel: 'DNA 서열', optional: '(선택)',
  seqPlaceholder: 'DNA 또는 FASTA를 붙여 넣으면 절단 횟수를 셉니다. 예: 플라스미드',
  skipHeaders: 'FASTA 헤더 줄 건너뛰기', circular: '원형', example: '예시 넣기',
  endsLabel: '말단', all: '전체', blunt: '평활', typeIIs: 'Type IIS',
  lenLabel: '인식 부위 길이', any: '전체', bp: 'bp', find: '효소 찾기',
  statusStart: `효소 ${N}종. 인식 부위와 절단 위치는 REBASE release 611에서 가져왔습니다.`,
  thEnzyme: '효소', thSite: '인식 부위', thEnds: '말단', thOverhang: '돌출',
  thLigates: '붙는 효소', thSame: '같은 부위', thCuts: '절단',
  cellBlunt: '평활', cellFlanking: '옆 서열이 정함', cellAnyBlunt: '모든 평활 말단',
  cellDesign: '설계하기 나름', cellNothing: '이 목록에는 없음', cellDepends: '부위에 따라 다름',
  nt: 'nt', iso: '동일 절단', neo: '다른 절단',
  h2Groups: '어떤 말단끼리 붙는지',
  groupsP1: '두 점착 말단은 돌출이 같은 종류이고(둘 다 5′이거나 둘 다 3′) 길이가 같으며 서로 상보일 때 붙습니다. 5′에서 3′ 방향으로 적은 돌출은 자기 자신의 역상보와 짝이 되므로, GATC처럼 회문인 돌출은 자기끼리 붙습니다. 글자가 같아도 5′ 돌출은 3′ 돌출과 붙지 않습니다. KpnI와 Acc65I는 같은 부위 GGTACC를 자르고 같은 네 글자를 남기지만 한쪽은 3′에, 다른 쪽은 5′에 남기므로 두 말단은 서로 붙지 않습니다.',
  groupsP2: `아래는 이 목록에서 구성원끼리 말단이 붙는 그룹 ${gs.length}개입니다. 한 그룹의 효소 두 개를 이으면 보통 두 인식 부위가 모두 사라집니다. 인서트가 다시 빠져나오지 못하게 하는 것이 이 방법의 목적입니다. 예외는 그룹마다 따로 적어 두었습니다. 대부분 인식 부위가 짧아 이은 자리 안에서 자기 부위를 다시 찾아내는 효소입니다.`,
  enzymes: '종',
  keptIntro: '이 그룹에서 자리가 남는 조합:',
  keptNone: '이 그룹의 모든 조합은 두 부위를 모두 없앱니다.',
  gives: '→',
  to: '에',
  h3Blunt: '평활 말단',
  bluntP: (names) => `평활 말단은 다른 어떤 평활 말단과도 붙으므로, 이 ${blunt.length}종은 맞춰 볼 서열 없이 한 그룹입니다: ${names}. 점착 말단보다 효율이 낮고 인서트가 어느 방향으로도 들어갑니다.`,
  h3Flanking: '옆 서열이 돌출을 정하는 효소',
  flankingP: (names) => `인식 부위 밖을 자르므로 돌출은 옆에 오는 염기가 무엇이냐에 따라 정해집니다. 효소의 성질이 아닙니다. Golden Gate 조립이 이 점 위에 서 있습니다. 돌출을 내가 고르는 것입니다. 그래서 그룹 없이 따로 적습니다: ${names}.`,
  h3Depends: '부위에 따라 돌출이 달라지는 효소',
  dependsP: (names) => `돌출 안에 모호한 염기가 든 인식 부위를 자르므로, 남는 네 글자는 실제로 자른 부위에 따라 달라집니다. 예를 들어 AvaI는 5′ YCGR를 남기는데, 서열에 따라 CCGA, CCGG, TCGA, TCGG 가운데 하나입니다. 이런 효소 둘은 실제 돌출이 서로 상보로 나올 때만 붙습니다: ${names}.`,
  h2How: '이 표를 만드는 방법',
  howP1: '모든 열은 인식 부위와 두 절단 오프셋에서 계산합니다. 효소 목록에 있는 것이 그것뿐입니다. 인식 부위는 REBASE 표기를 따라 위 가닥을 자르는 자리에 ^를 넣고 절단이 부위 밖으로 가면 GGTCTC(1/5)처럼 적습니다. 돌출은 두 절단 사이 구간입니다. 위 가닥을 먼저 자르면 5′, 아래 가닥을 먼저 자르면 3′입니다. 그룹은 돌출과 그 역상보를 함께 묶은 것이라, 상보인 말단끼리 같은 그룹에 들어갑니다.',
  howP2: '그룹 아래 적은 접합부는 첫 부위의 절단 자리까지 왼쪽 반쪽에, 두 번째 부위의 오른쪽 반쪽을 이어 붙인 서열입니다. 그 서열에 두 효소로 각각 자리 찾기를 돌립니다. 이은 자리 안에 온전히 들어가는 부위만 이렇게 판정할 수 있습니다. 그보다 바깥 염기는 construct의 나머지이므로, 그 염기가 있어야 성립하는 부위는 여기서 있다고도 없다고도 하지 않습니다.',
  howP3: 'Dam과 Dcm 메틸화는 여기서 고려하지 않습니다. 메틸화가 막는 자리는 PlasmidLab 앱에서 표시할 수 있습니다. 이 페이지는 완충액이나 반응 온도, 조각 끝에 가까운 자리를 효소가 얼마나 잘 자르는지는 알지 못합니다. 목록에 그 정보가 없기 때문입니다.',
  note: '인식 부위와 절단 위치는 제한효소 데이터베이스 REBASE(<a href="http://rebase.neb.com">rebase.neb.com</a>) release 611에서 가져왔습니다. PlasmidLab 앱이 쓰는 것과 같은 효소 목록입니다. 모든 계산은 브라우저에서 이루어집니다. 서열은 어디에도 전송되지 않습니다.',
  ctaKicker: 'Mac·Windows용 PlasmidLab', ctaTitle: '내 플라스미드로 해보기',
  ctaBody: 'PlasmidLab은 내 플라스미드 지도 위에 절단 자리를 그리고, 그 절단을 젤 시뮬레이션으로 돌리고, 가진 말단에서 출발해 클로닝을 설계합니다. Mac과 Windows에서 무료로 쓸 수 있습니다.',
  ctaMac: 'Mac용 다운로드', ctaWin: 'Windows용도 있습니다',
  relatedTools: '다른 무료 도구', relatedGuides: '가이드',
  tools: [
    ['/ko/tools/restriction-sites/', '제한효소 자리 찾기', '한 번, 두 번, 자르지 않는 효소까지.'],
    ['/ko/tools/virtual-gel/', '가상 아가로스 젤', '절단했을 때 나올 밴드.'],
    ['/ko/tools/dna-molarity/', 'DNA 몰 농도·라이게이션 계산', 'ng에서 pmol로, 인서트 양까지.'],
    ['/ko/tools/gc-content/', 'GC 함량과 프라이머 Tm', '염기 개수, GC%, 프라이머 Tm.'],
    ['/ko/tools/translate/', 'DNA 번역과 ORF 찾기', '6개 프레임을 한 화면에, ORF 표시.'],
  ],
  guideLinks: [
    ['/ko/guides/dna-file-open/', 'SnapGene .dna 파일 열기', 'Mac·Windows에서 무료로.'],
    ['/ko/guides/gibson-primer/', 'Gibson 프라이머 설계', '상동 구간과 어닐링 온도.'],
    ['/ko/guides/', '한국어 가이드 전체', '목록 보기.'],
  ],
  footer: '<p>© 2026 PlasmidLab</p><p>PlasmidLab은 연구용 소프트웨어입니다. 무료 AI 체험은 만&nbsp;18세 이상만 이용할 수 있습니다.</p><p>Gibson Assembly, Gateway, TOPO, In-Fusion, NEBuilder, Q5, SnapGene, Benchling, Claude, Codex, ChatGPT, Grok, Google, Apple은 각 소유자의 상표입니다. PlasmidLab은 이들과 제휴하거나 보증받지 않았습니다.</p>',
  footerLinks: `<a href="mailto:support@plasmidlab.com">support@plasmidlab.com</a><a href="https://github.com/plasmidlab/plasmidlab/issues">문제 신고</a><a href="/ko/guides/">가이드</a><a href="/privacy/ko/">개인정보처리방침</a><a href="/terms/" lang="en">Terms</a><a href="${EN_URL.replace('https://plasmidlab.com', '')}" lang="en" hreflang="en">English</a>`,
  js: {none: '없음', dash: '—',
    statusAll: (n) => `효소 ${n}종`, statusSome: (s, n) => `${n}종 가운데 ${s}종`,
    seq: (bp, shape) => ` · ${bp} bp, ${shape} · `, linear: '선형', circular2: '원형',
    cutting: (c, n) => `${n}종 가운데 ${c}종이 자릅니다`,
    rebase: ' · 인식 부위와 절단 위치는 REBASE release 611에서 가져왔습니다.',
    exampleHeader: '>pUC19 다중 클로닝 자리, EcoRI부터 HindIII까지'},
}

function page(L) {
  const ligateHref = L.lang === 'ko' ? L.url.replace('https://plasmidlab.com', '') : ''
  const tableRows = rows.map((r) => {
    const g = groupOf.get(r.name)
    const others = g ? g.members.filter((m) => m !== r).map((m) => m.name) : []
    // The whole group is listed under its own heading, so the row shows the first few and links to the rest.
    const partners = others.slice(0, 3).join(', ') + (others.length > 3 ? ` +${others.length - 3}` : '')
    const ends = r.kind === 'blunt' ? L.cellBlunt : `${r.end}, ${r.length} ${L.nt}`
    const over = r.kind === 'blunt' ? '—' : r.kind === 'flanking' ? L.cellFlanking : r.overhang
    const ligates = r.kind === 'blunt' ? L.cellAnyBlunt
      : r.kind === 'flanking' ? L.cellDesign
        : others.length ? `<a href="${ligateHref}#${groupId(g)}">${esc(partners)}</a>`
          : r.group ? L.cellNothing : L.cellDepends
    const siblings = same.get(r.name)
    const sib = siblings ? siblings.map((s) => `${esc(s.name)} <span class="muted">(${s.kind === 'isoschizomer' ? L.iso : L.neo})</span>`).join(', ') : '—'
    return `<tr data-name="${esc(r.name.toLowerCase())}" data-end="${r.kind === 'flanking' ? 'flanking' : r.end === 'blunt' ? 'blunt' : r.end === "5'" ? 'five' : 'three'}" data-len="${r.site.length}">`
      + `<th scope="row">${esc(r.name)}</th><td class="mono nowrap">${esc(r.text)}</td><td class="nowrap">${esc(ends)}</td>`
      + `<td class="mono nowrap">${esc(over)}</td><td class="nowrap">${ligates}</td><td class="nowrap">${sib}</td><td class="cuts">—</td></tr>`
  }).join('')

  const groupSections = gs.map((g) => {
    const names = g.members.map((m) => esc(m.name)).join(', ')
    const kept = survivors.filter((s) => g.members.includes(s.a) && g.members.includes(s.b))
    const label = (s) => L.lang === 'ko'
      ? (s.keptA && s.keptB ? '두 부위 모두 남음' : s.keptA ? `${s.a.name} 부위 남음` : `${s.b.name} 부위 남음`)
      : s.label
    const keptText = kept.length
      ? `<p class="muted">${L.keptIntro} ${kept.map((s) =>
        L.lang === 'ko'
          ? `${esc(s.a.name)} ${L.gives} ${esc(s.b.name)} = <span class="mono">${esc(s.seq)}</span>, ${esc(label(s))}`
          : `${esc(s.a.name)} to ${esc(s.b.name)} gives <span class="mono">${esc(s.seq)}</span>, ${esc(label(s))}`).join('; ')}.</p>`
      : `<p class="muted">${L.keptNone}</p>`
    return `<div class="ends-group" id="${groupId(g)}"><h3>${esc(`${g.end} ${g.overhang}`)} <span class="muted">· ${g.members.length} ${L.enzymes}</span></h3>`
      + `<p>${names}</p>${keptText}</div>`
  }).join('')

  const linkList = (items) => items.map(([href, name, sub]) => `<li><a href="${href}">${esc(name)}<span>${esc(sub)}</span></a></li>`).join('')
  const ld = {
    '@context': 'https://schema.org', '@type': 'WebApplication',
    name: L.ldName, url: L.url, description: L.desc,
    applicationCategory: 'UtilitiesApplication', operatingSystem: 'Any', isAccessibleForFree: true,
    ...(L.lang === 'ko' ? {inLanguage: 'ko'} : {}),
    author: {'@type': 'Organization', name: 'PlasmidLab', url: 'https://plasmidlab.com/'},
    publisher: {'@type': 'Organization', name: 'PlasmidLab', url: 'https://plasmidlab.com/'},
  }
  const hreflang = `<link rel="alternate" hreflang="en" href="${EN_URL}"><link rel="alternate" hreflang="ko" href="${KO_URL}"><link rel="alternate" hreflang="x-default" href="${EN_URL}">`

  return `<!doctype html>
<html lang="${L.lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(L.title)}</title><meta name="description" content="${esc(L.desc)}"><link rel="canonical" href="${L.url}">${hreflang}<meta property="og:type" content="website"><meta property="og:title" content="${esc(L.title)}"><meta property="og:description" content="${esc(L.desc)}"><meta property="og:url" content="${L.url}">${L.lang === 'ko' ? '<meta property="og:locale" content="ko_KR">' : ''}<meta property="og:image" content="https://plasmidlab.com/assets/sequence.png"><meta name="twitter:card" content="summary_large_image"><meta name="theme-color" content="#FFFFFF" media="(prefers-color-scheme: light)"><meta name="theme-color" content="#181818" media="(prefers-color-scheme: dark)"><script type="application/ld+json">${JSON.stringify(ld)}</script><script src="/assets/theme.js"></script><link rel="icon" href="/assets/icon.svg" type="image/svg+xml"><link rel="stylesheet" href="/assets/fonts/geist.css"><link rel="stylesheet" href="/guides/guides.css"><link rel="stylesheet" href="/assets/pages.css"></head><body><a class="skip" href="#main">${esc(L.skip)}</a><nav class="nav" aria-label="${esc(L.navAria)}"><a class="brand" href="${L.home}">PlasmidLab</a><div class="nav-links"><a class="home" href="${L.home}">${esc(L.navHome)}</a><a class="more" href="${L.tools}">${esc(L.navTools)}</a><a href="${L.guides}">${esc(L.navGuides)}</a><a data-login rel="nofollow" href="https://api.plasmidlab.com/login">${esc(L.login)}</a><a class="button" data-download="nav" href="${DL}">${esc(L.download)}</a></div></nav><main class="wrap" id="main"><p class="eyebrow"><a href="${L.home}">PlasmidLab</a> / <a href="${L.tools}">${L.lang === 'ko' ? '무료 도구' : 'Free tools'}</a> / ${esc(L.crumb)}</p><h1>${esc(L.h1)}</h1><p class="lead">${esc(L.lead)}</p>

<section class="tool" aria-label="${esc(L.toolAria)}"><label class="field" for="seq">${esc(L.seqLabel)} <span class="muted">${esc(L.optional)}</span></label><textarea id="seq" spellcheck="false" autocomplete="off" placeholder="${esc(L.seqPlaceholder)}"></textarea><div class="options"><label><input type="checkbox" id="header" checked> ${esc(L.skipHeaders)}</label><label><input type="checkbox" id="circular"> ${esc(L.circular)}</label><button type="button" class="copy" id="example">${esc(L.example)}</button></div>
<div class="controls"><div><span class="label" id="end-label">${esc(L.endsLabel)}</span><span class="seg" role="group" aria-labelledby="end-label"><button type="button" data-end="all" aria-pressed="true">${esc(L.all)}</button><button type="button" data-end="five" aria-pressed="false">5′</button><button type="button" data-end="three" aria-pressed="false">3′</button><button type="button" data-end="blunt" aria-pressed="false">${esc(L.blunt)}</button><button type="button" data-end="flanking" aria-pressed="false">${esc(L.typeIIs)}</button></span></div><div><label for="len">${esc(L.lenLabel)}</label><select id="len"><option value="all">${esc(L.any)}</option>${[4, 5, 6, 7, 8, 11].map((n) => `<option value="${n}">${n} ${L.bp}</option>`).join('')}</select></div><div><label for="q">${esc(L.find)}</label><input id="q" type="search" spellcheck="false" autocomplete="off" placeholder="EcoRI"></div></div>
<p class="status" id="status" role="status" aria-live="polite">${esc(L.statusStart)}</p>
<div class="table-wrap wide"><table class="features" id="enzymes"><thead><tr><th scope="col" class="nowrap">${esc(L.thEnzyme)}</th><th scope="col" class="nowrap">${esc(L.thSite)}</th><th scope="col" class="nowrap">${esc(L.thEnds)}</th><th scope="col" class="nowrap">${esc(L.thOverhang)}</th><th scope="col" class="nowrap">${esc(L.thLigates)}</th><th scope="col" class="nowrap">${esc(L.thSame)}</th><th scope="col">${esc(L.thCuts)}</th></tr></thead><tbody>${tableRows}</tbody></table></div></section>

<section class="prose"><h2>${esc(L.h2Groups)}</h2><p>${esc(L.groupsP1)}</p><p>${esc(L.groupsP2)}</p>${groupSections}
<h3>${esc(L.h3Blunt)} <span class="muted">· ${blunt.length} ${L.enzymes}</span></h3><p>${L.bluntP(blunt.map((r) => esc(r.name)).join(', '))}</p>
<h3>${esc(L.h3Flanking)} <span class="muted">· ${flanking.length} ${L.enzymes}</span></h3><p>${L.flankingP(flanking.map((r) => esc(r.name)).join(', '))}</p>
<h3>${esc(L.h3Depends)} <span class="muted">· ${depends.length} ${L.enzymes}</span></h3><p>${L.dependsP(depends.map((r) => `${esc(r.name)} <span class="mono">${esc(r.end)} ${esc(r.overhang)}</span>`).join(', '))}</p>

<h2>${esc(L.h2How)}</h2><p>${esc(L.howP1)}</p><p>${esc(L.howP2)}</p><p>${esc(L.howP3)}</p><p class="note">${L.note}</p></section>

<aside class="cta" aria-labelledby="cta-title"><div><p class="kicker">${esc(L.ctaKicker)}</p><h2 id="cta-title">${esc(L.ctaTitle)}</h2><p>${esc(L.ctaBody)}</p></div><div class="actions"><a class="button" data-download="primary" href="${DL}">${esc(L.ctaMac)}</a><a data-download="other" href="${DL}">${esc(L.ctaWin)}</a></div></aside>
<aside class="related"><h2>${esc(L.relatedTools)}</h2><ul class="link-list">${linkList(L.tools)}</ul><h2 style="margin-top:40px">${esc(L.relatedGuides)}</h2><ul class="link-list">${linkList(L.guideLinks)}</ul></aside></main><footer class="footer"><div><div class="foot-text">${L.footer}</div><nav class="footer-links">${L.footerLinks}</nav></div></footer><script src="/assets/download.js" defer></script><script src="/assets/consent.js" defer></script><script src="/assets/enzymes.js"></script><script src="/assets/tools.js"></script>
<script>
(() => {
  const T = PlasmidTools, $ = id => document.getElementById(id), fmt = n => n.toLocaleString('en-US');
  const rows = [...document.querySelectorAll('#enzymes tbody tr')];
  const TOTAL = rows.length;
  let end = 'all', timer = 0;

  function run() {
    const s = T.clean($('seq').value, {header: $('header').checked}).replace(/[^A-Za-z]/g, '');
    const circular = $('circular').checked, len = $('len').value, q = $('q').value.trim().toLowerCase();
    const cuts = s ? new Map(T.digest(s, circular).map(h => [h.name, h.sites.length])) : null;
    let shown = 0, cutting = 0;
    for (const tr of rows) {
      const n = cuts ? (cuts.get(tr.firstElementChild.textContent) ?? 0) : null;
      tr.lastElementChild.textContent = n === null ? ${JSON.stringify(L.js.dash)} : n ? fmt(n) : ${JSON.stringify(L.js.none)};
      tr.lastElementChild.className = 'cuts' + (n ? ' hit' : '');
      if (n) cutting++;
      const ok = (end === 'all' || tr.dataset.end === end) && (len === 'all' || tr.dataset.len === len) && (!q || tr.dataset.name.includes(q));
      tr.hidden = !ok;
      if (ok) shown++;
    }
    $('status').textContent = (shown === TOTAL ? ${L.lang === 'ko' ? '`효소 ${fmt(TOTAL)}종`' : '`${fmt(TOTAL)} enzymes`'} : ${L.lang === 'ko' ? '`${fmt(TOTAL)}종 가운데 ${fmt(shown)}종`' : '`${fmt(shown)} of ${fmt(TOTAL)} enzymes`'})
      + (s ? ' · ' + fmt(s.length) + ' bp, ' + (circular ? ${JSON.stringify(L.js.circular2)} : ${JSON.stringify(L.js.linear)}) + ' · ' + ${L.lang === 'ko' ? '`${fmt(TOTAL)}종 가운데 ${fmt(cutting)}종이 자릅니다`' : '`${fmt(cutting)} of ${fmt(TOTAL)} cut it`'} : ${JSON.stringify(L.js.rebase)});
  }
  const later = () => { clearTimeout(timer); timer = setTimeout(run, 120); };
  for (const id of ['seq', 'header', 'circular', 'len', 'q']) $(id).addEventListener('input', later);
  document.querySelectorAll('.seg [data-end]').forEach(b => b.addEventListener('click', () => {
    end = b.dataset.end;
    document.querySelectorAll('.seg [data-end]').forEach(o => o.setAttribute('aria-pressed', String(o === b)));
    run();
  }));
  $('example').addEventListener('click', () => { $('seq').value = ${JSON.stringify(L.js.exampleHeader + '\nGAATTCGAGCTCGGTACCCGGGGATCCTCTAGAGTCGACCTGCAGGCATGCAAGCTT')}; run(); });
  run();
})();
</script></body></html>
`
}

for (const [L, dir] of [[EN, join(site, 'tools', 'restriction-enzymes')], [KO, join(site, 'ko', 'tools', 'restriction-enzymes')]]) {
  const html = page(L)
  mkdirSync(dir, {recursive: true})
  writeFileSync(join(dir, 'index.html'), html)
  console.log(`${L.url}  ${(html.length / 1024).toFixed(0)} kB`)
}
console.log(JSON.stringify({rows: rows.length, groups: gs.length, blunt: blunt.length, flanking: flanking.length, depends: depends.length, survivors: survivors.length}))
const sitemap = readFileSync(join(site, 'sitemap.xml'), 'utf8')
for (const u of [EN_URL, KO_URL]) if (!sitemap.includes(u)) console.log('  note: add', u, 'to sitemap.xml')
