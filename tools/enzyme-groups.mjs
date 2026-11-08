// Derives, from assets/enzymes.js alone, what each enzyme leaves behind and which ends ligate to which.
// Used by tools/build-restriction-enzymes.mjs to write the page and by tools/selftest.mjs to check it.
//
// Two ends anneal when their overhangs are the same kind (both 5' or both 3'), the same length, and
// complementary to each other. An overhang written 5'->3' therefore pairs with its own reverse
// complement, which is why palindromic overhangs pair with themselves.

const COMP = {A: 'T', T: 'A', C: 'G', G: 'C'}
const rc = (s) => [...s].reverse().map((c) => COMP[c] ?? c).join('')

/** How the enzyme is written in REBASE style: G^AATTC inside the site, GGTCTC(1/5) past it. */
export function siteText([, site, cut, cut2]) {
  if (cut >= 0 && cut <= site.length && cut2 >= 0 && cut2 <= site.length) return site.slice(0, cut) + '^' + site.slice(cut)
  return `${site}(${cut - site.length}/${cut2 - site.length})`
}

/**
 * One row per enzyme: its end, its overhang, and the key of the group it ligates within.
 * `group` is null when the enzyme cannot be placed in one, and `why` says which case it is.
 */
export function classify(enzymes) {
  return enzymes.map((e) => {
    const [name, site, cut, cut2] = e
    const end = cut === cut2 ? 'blunt' : cut < cut2 ? "5'" : "3'"
    const row = {name, site, cut, cut2, text: siteText(e), end, length: Math.abs(cut2 - cut), overhang: '', kind: '', group: null}
    if (cut > site.length || cut2 > site.length) {
      // A Type IIS enzyme cuts past its site. The end is still 5' or 3', but which bases it carries is
      // decided by the sequence next to the site, so it belongs to no fixed group.
      row.kind = 'flanking'
      return row
    }
    if (end === 'blunt') {
      row.kind = 'blunt'
      row.group = 'blunt'
      return row
    }
    row.overhang = cut < cut2 ? site.slice(cut, cut2) : site.slice(cut2, cut)
    if (/[^ACGT]/.test(row.overhang)) {
      row.kind = 'ambiguous'  // an ambiguous base inside the overhang: it depends on the site that was cut
      return row
    }
    row.kind = 'fixed'
    row.group = `${end}:${[row.overhang, rc(row.overhang)].sort()[0]}`
    return row
  })
}

/** Enzymes that share a recognition site: isoschizomers cut it the same way, neoschizomers do not. */
export function sameSite(rows) {
  const bySite = new Map()
  for (const r of rows) {
    if (!bySite.has(r.site)) bySite.set(r.site, [])
    bySite.get(r.site).push(r)
  }
  const out = new Map()
  for (const group of bySite.values()) {
    if (group.length < 2) continue
    for (const r of group) {
      out.set(r.name, group.filter((o) => o !== r).map((o) => ({
        name: o.name,
        kind: o.cut === r.cut && o.cut2 === r.cut2 ? 'isoschizomer' : 'neoschizomer',
      })))
    }
  }
  return out
}

/** The sequence left where an end cut by `a` is ligated to an end cut by `b`. */
export function junction(a, b) {
  return a.site.slice(0, a.cut) + b.site.slice(b.cut)
}

/**
 * Which of the two sites survives that junction. Only sites lying wholly inside the joined halves can
 * be decided: bases beyond them belong to the rest of the construct, so they are not claimed either way.
 */
export function junctionOutcome(a, b, findSites) {
  const seq = junction(a, b)
  const keptA = findSites(seq, false, [a.name, a.site, a.cut, a.cut2]).length > 0
  const keptB = findSites(seq, false, [b.name, b.site, b.cut, b.cut2]).length > 0
  const label = a.name === b.name
    ? (keptA ? 'same site regenerated' : 'site lost')
    : keptA && keptB ? `both sites kept`
      : keptA ? `${a.name} site kept` : keptB ? `${b.name} site kept` : 'both sites lost'
  return {seq, keptA, keptB, label}
}

/** The ligation groups with two or more members, largest first. Blunt is handled on its own. */
export function groups(rows) {
  const by = new Map()
  for (const r of rows) {
    if (!r.group || r.group === 'blunt') continue
    if (!by.has(r.group)) by.set(r.group, [])
    by.get(r.group).push(r)
  }
  return [...by.entries()]
    .filter(([, v]) => v.length > 1)
    .sort((x, y) => y[1].length - x[1].length || x[0].localeCompare(y[0]))
    .map(([key, members]) => ({key, end: key.slice(0, 2), overhang: members[0].overhang, members}))
}
