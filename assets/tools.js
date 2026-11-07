// The free sequence tools: reverse complement, translation and restriction sites. Everything runs in the page;
// no sequence leaves the browser. tools/selftest.mjs checks this logic: run `node tools/selftest.mjs`.
(() => {
  // The app's complement table (app/src/core/seq.ts): IUPAC aware, U pairs with A.
  const COMP = {A:'T', C:'G', G:'C', T:'A', U:'A', R:'Y', Y:'R', S:'S', W:'W', K:'M', M:'K', B:'V', V:'B', D:'H', H:'D', N:'N'};
  const IUPAC = {A:'A', C:'C', G:'G', T:'T', R:'AG', Y:'CT', S:'CG', W:'AT', K:'GT', M:'AC', B:'CGT', D:'AGT', H:'ACT', V:'ACG', N:'ACGT'};

  /** Pasted text to sequence: FASTA header lines and digits, spaces and line breaks out, as asked. */
  function clean(text, {header = true, junk = true} = {}) {
    let s = String(text);
    if (header) s = s.split(/\r?\n/).filter(line => !/^\s*[>;]/.test(line)).join('\n');
    if (junk) s = s.replace(/[\s\d]+/g, '');
    return s;
  }

  /** Letters that are neither IUPAC bases nor gaps, once each. */
  const unknown = s => [...new Set(s.replace(/[ACGTURYSWKMBDHVN\s\d-]/gi, ''))].join('');

  function complement(s) {
    let out = '';
    for (const ch of s) {
      const up = ch.toUpperCase(), c = COMP[up] ?? up;
      out += ch === up ? c : c.toLowerCase();
    }
    return out;
  }
  const reverse = s => [...s].reverse().join('');
  const reverseComplement = s => reverse(complement(s));

  // Standard genetic code, codons in TCAG order.
  const BASES = 'TCAG', AA = 'FFLLSSSSYY**CC*WLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG';
  const CODE = {};
  for (let i = 0; i < 64; i++) CODE[BASES[i >> 4] + BASES[(i >> 2) & 3] + BASES[i & 3]] = AA[i];

  /** One codon to one amino acid; an ambiguous codon gives its amino acid only when every reading agrees (GCN is A), else X. */
  function codon(c) {
    c = c.toUpperCase().replace(/U/g, 'T');
    if (CODE[c]) return CODE[c];
    const sets = [...c].map(b => IUPAC[b]);
    if (sets.some(x => !x)) return 'X';
    const seen = new Set();
    for (const a of sets[0]) for (const b of sets[1]) for (const d of sets[2]) seen.add(CODE[a + b + d]);
    return seen.size === 1 ? [...seen][0] : 'X';
  }

  const translate = s => { let p = ''; for (let i = 0; i + 3 <= s.length; i += 3) p += codon(s.slice(i, i + 3)); return p; };

  /** ORFs in a protein: from each first M after a stop (or the start) to the next stop. `stop` is false when it runs off the end. */
  function orfs(protein) {
    const out = [];
    let start = -1;
    for (let i = 0; i < protein.length; i++) {
      if (start < 0 && protein[i] === 'M') start = i;
      else if (start >= 0 && protein[i] === '*') { out.push({start, end: i + 1, stop: true}); start = -1; }
    }
    if (start >= 0) out.push({start, end: protein.length, stop: false});
    return out;
  }

  /**
   * The six reading frames. Each ORF also gets its top-strand bases, 1-based and inclusive (from <= to), and
   * `aa`, its length in amino acids without the stop.
   */
  function frames(seq) {
    const n = seq.length, rc = reverseComplement(seq), out = [];
    for (const strand of [1, -1]) for (let f = 0; f < 3; f++) {
      const protein = translate((strand === 1 ? seq : rc).slice(f));
      const list = orfs(protein).map(o => {
        const a = f + 3 * o.start, b = f + 3 * o.end;  // bases [a, b) of the strand read
        return {...o, aa: o.end - o.start - (o.stop ? 1 : 0), from: strand === 1 ? a + 1 : n - b + 1, to: strand === 1 ? b : n - a};
      });
      out.push({label: (strand === 1 ? '+' : '−') + (f + 1), strand, offset: f, protein, orfs: list});
    }
    return out;
  }

  // Restriction sites, ported from the app's findCutSites (app/src/core/enzymes.ts) without its methylation check.
// One difference: on a linear sequence a cut at either end is dropped (see findSites).
  const siteRegex = site => new RegExp(`(?=(${[...site].map(c => IUPAC[c].length > 1 ? `[${IUPAC[c]}]` : c).join('')}))`, 'g');

  /** Where one enzyme [name, site, cut, cut2] cuts: pos is the top-strand cut, between base pos and pos + 1. */
  function findSites(seq, circular, [, site, cut, cut2]) {
    const n = seq.length, s = seq.toUpperCase(), L = site.length, rc = reverseComplement(site);
    const wrap = x => (circular ? ((x % n) + n) % n : x);
    const records = rc === site ? [[site, cut, cut2, 1]] : [[site, cut, cut2, 1], [rc, L - cut2, L - cut, -1]];
    const out = [];
    if (n < L) return out;
    for (const [rec, top, bottom, strand] of records) {
      const ext = circular ? s + s.slice(0, L - 1) : s;
      for (const m of ext.matchAll(siteRegex(rec))) {
        const i = m.index;
        if (i >= n) break;
        const pos = wrap(i + top), pos2 = wrap(i + bottom);
        // Unlike the app, a linear cut exactly at an end (before the first base, after the last) is not a cut either.
        if (!circular && (pos <= 0 || pos >= n || pos2 <= 0 || pos2 >= n)) continue;
        out.push({siteStart: i, pos, pos2, strand});
      }
    }
    return out.sort((a, b) => a.pos - b.pos);
  }

  /** Every enzyme with its cuts, from the list the app ships (assets/enzymes.js). */
  const digest = (seq, circular, enzymes = globalThis.PLASMIDLAB_ENZYMES) =>
    enzymes.map(enzyme => ({name: enzyme[0], site: enzyme[1], sites: findSites(seq, circular, enzyme)}));

  /** Buttons with data-copy="id" copy that element's text, and say so. */
  function wireCopy(root = document) {
    root.querySelectorAll('[data-copy]').forEach(button => button.addEventListener('click', async () => {
      const target = document.getElementById(button.dataset.copy);
      const text = target.value ?? target.textContent;
      if (!text) return;
      const label = button.textContent;
      try { await navigator.clipboard.writeText(text); button.textContent = 'Copied'; }
      catch { button.textContent = 'Select and copy'; }
      setTimeout(() => { button.textContent = label; }, 1400);
    }));
  }

  globalThis.PlasmidTools = {clean, unknown, complement, reverse, reverseComplement, codon, translate, orfs, frames, findSites, digest, wireCopy};
})();
