// Checks the sequence logic behind the free tools (assets/tools.js) on the enzyme list the site ships.
// Run: node tools/selftest.mjs
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const assets = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets')
await import(join(assets, 'enzymes.js'))
await import(join(assets, 'tools.js'))
const T = globalThis.PlasmidTools, E = globalThis.PLASMIDLAB_ENZYMES
const enzyme = name => E.find(e => e[0] === name)

// Reverse complement: IUPAC, case and order.
assert.equal(T.reverseComplement('ATGC'), 'GCAT')
assert.equal(T.complement('ACGTRYSWKMBDHVN'), 'TGCAYRSWMKVHDBN')
assert.equal(T.reverseComplement('aaCCgt'), 'acGGtt')
assert.equal(T.reverse('ACGt'), 'tGCA')
assert.equal(T.complement('AUG'), 'TAC')
assert.equal(T.clean('>seq1 desc\n1 acgt acgt\n11 GG\n'), 'acgtacgtGG')
assert.equal(T.clean('>x\nAC GT', {header: false, junk: false}), '>x\nAC GT')
assert.equal(T.unknown('ACGTxz-N'), 'xz')

// Translation: standard code, ambiguity, stops and frames.
assert.equal(T.translate('ATGGCCTAA'), 'MA*')
assert.equal(T.translate('atggcnta'), 'MA')
assert.equal(T.codon('GCN'), 'A')
assert.equal(T.codon('NNN'), 'X')
assert.equal(T.codon('AUG'), 'M')
const f = T.frames('CCATGAAATAGGG')  // + frame 3 holds M K *
assert.deepEqual(f.map(x => x.label), ['+1', '+2', '+3', '−1', '−2', '−3'])
assert.equal(f[2].protein, 'MK*')
assert.deepEqual(f[2].orfs, [{start: 0, end: 3, stop: true, aa: 2, from: 3, to: 11}])
const r = T.frames(T.reverseComplement('CCATGAAATAGGG'))  // the same ORF read on the bottom strand
const back = r.find(x => x.strand === -1 && x.orfs.length)
assert.deepEqual([back.orfs[0].from, back.orfs[0].to, back.orfs[0].aa], [3, 11, 2])
assert.deepEqual(T.orfs('MAAM'), [{start: 0, end: 4, stop: false}])

// Restriction sites: positions as the app gives them (cut between base pos and pos + 1).
assert.deepEqual(T.findSites('AAGAATTCAA', false, enzyme('EcoRI')).map(s => s.pos), [3])
assert.deepEqual(T.findSites('AATTCAAAAG', false, enzyme('EcoRI')), [])
const wrap = T.findSites('AATTCAAAAG', true, enzyme('EcoRI'))  // site across the origin of a circle
assert.deepEqual(wrap.map(s => [s.siteStart, s.pos, s.pos2]), [[9, 0, 4]])
// BsaI GGTCTC(1/5): one site on each strand, cutting outside the recognition sequence.
const bsa = T.findSites('GGTCTCAAAAAAAAAAAAGAGACC', false, enzyme('BsaI'))
assert.deepEqual(bsa.map(s => [s.strand, s.pos, s.pos2]), [[1, 7, 11], [-1, 13, 17]])
// A Type IIS cut past the end of a linear sequence is not a cut; on a circle it wraps.
assert.equal(T.findSites('AAAAGGTCTCA', false, enzyme('BsaI')).length, 0)
assert.deepEqual(T.findSites('AAAAGGTCTCA', true, enzyme('BsaI')).map(s => s.pos), [0])
// A linear cut at either end is no cut: Sau3AI ^GATC at the start, NlaIII CATG^ at the end. On a circle both count.
assert.equal(T.findSites('GATCAAAA', false, enzyme('Sau3AI')).length, 0)
assert.equal(T.findSites('AAAACATG', false, enzyme('NlaIII')).length, 0)
assert.equal(T.findSites('AGATCAAA', false, enzyme('Sau3AI')).length, 1)
assert.equal(T.findSites('GATCAAAA', true, enzyme('Sau3AI')).length, 1)
// Degenerate sites match on both strands: AccI GTMKAC.
assert.equal(T.findSites('GTATAC', false, enzyme('AccI')).length, 1)
assert.equal(T.findSites('GTCGAC', false, enzyme('AccI')).length, 1)
assert.equal(T.findSites('GTAAAC', false, enzyme('AccI')).length, 0)
// Lower case input cuts the same; HindIII once in pUC19's MCS fragment.
assert.equal(T.digest('ccaagcttgg', false).find(h => h.name === 'HindIII').sites.length, 1)
assert.equal(E.length, 162)
assert.ok(!E.some(e => /[^ACGTRYSWKMBDHVN]/.test(e[1])))

console.log('selftest: all checks pass')
