import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

const source = readFileSync(new URL('../docs/acidbase-titrations.js', import.meta.url), 'utf8');
function load(extra = {}) {
  const context = vm.createContext(extra);
  vm.runInContext(source, context);
  return context.AcidBaseTitrations;
}
const api = load();
const mono = { c: .100, v: 50, t: .200, k: 1.8e-5 };
const poly = { c: .100, v: 50, t: .200, k1: .059, k2: 6.4e-5 };
function close(actual, expected, tolerance = 1e-8) {
  assert.ok(Math.abs(actual - expected) < tolerance, `${actual} != ${expected}`);
}

// Independent reference values: positive real roots of the cubic (mono) or
// quartic (diprotic), calculated with numpy.roots, rather than the production
// log-space bisection. These include dilution and Kw = 1e-14.
const fixtures = [
  [false, 0, 2.8752770603192666, 'initial'],
  [false, 12.5, 4.745117996588565, 'buffer'],
  [false, 13.75, 4.832206907750013, 'buffer'],
  [false, 24.999, 8.689957717281613, 'buffer'],
  [false, 25, 8.784356925047607, 'equivalence'],
  [false, 25.001, 8.878752095710828, 'excess'],
  [false, 33.75, 12.320053265977977, 'excess'],
  [true, 0, 10.997828538842446, 'initial'],
  [true, 12.5, 8.999782982961523, 'buffer'],
  [true, 13.75, 8.912666875135296, 'buffer'],
  [true, 24.999, 5.1586502226941, 'buffer'],
  [true, 25, 5.088039648898058, 'equivalence'],
  [true, 25.001, 5.017432112327046, 'excess'],
  [true, 33.75, 1.6799467076295336, 'excess'],
];
for (const [base, vt, expected, stage] of fixtures) {
  test(`${base ? 'weak base/HCl' : 'weak acid/NaOH'} at ${vt} mL (${stage})`, () => {
    const result = api.calculateMono({ ...mono, base, k: base ? 1e-5 : mono.k, vt });
    close(result.ans, expected);
    assert.equal(result.stage, stage);
    close(result.h * result.oh, 1e-14, 1e-25);
    assert.match(result.lines.at(-1), new RegExp(`pH = -log10\\[H\\+\\] = ${expected.toFixed(3)}\\.`));
    if (stage === 'equivalence') {
      assert.match(result.lines.join('\n'), base ? /Ka = Kw\/Kb = 1.000e-9/ : /Kb = Kw\/Ka = 5.556e-10/);
    }
  });
}
for (const [vt, expected, stage] of [
  [0, 1.276992818374218, 'initial'],
  [12.5, 1.699143601524443, 'firstbuffer'],
  [13.75, 1.7552707684718196, 'firstbuffer'],
  [25, 2.8561177456133438, 'firsteq'],
  [38.75, 4.283668357588215, 'secondbuffer'],
  [50, 8.446660696566106, 'secondeq'],
  [58.75, 12.206608795124739, 'excess'],
]) {
  test(`diprotic acid/NaOH at ${vt} mL (${stage})`, () => {
    const result = api.calculatePoly({ ...poly, vt });
    close(result.ans, expected);
    assert.equal(result.stage, stage);
    assert.match(result.lines.join('\n'), /\[HA-\] \+ 2\[A2-\]/);
  });
}

test('acid/base symmetry, dilution and water dominate correctly at low concentrations', () => {
  for (const vt of [0, 12.5, 25, 33.75]) {
    const acid = api.calculateMono({ ...mono, vt });
    const base = api.calculateMono({ ...mono, base: true, vt });
    close(acid.ans + base.ans, 14);
    const dilute = api.calculateMono({ ...mono, c: 1e-12, t: 2e-12, vt });
    close(dilute.ans, 7, 1e-5);
  }
  const diluted = api.calculateMono({ ...mono, v: 100, t: .100, vt: 100 });
  close(diluted.ans, 8.72190403158168, 1e-6); // 0.050 M acetate at equivalence
});

test('continuous monotone titration curves through both equivalence points', () => {
  for (const kind of ['acid', 'base', 'poly']) {
    let previous = kind === 'base' ? Infinity : -Infinity;
    for (let vt = 0; vt <= 70; vt += .1) {
      const r = kind === 'poly' ? api.calculatePoly({ ...poly, vt })
        : api.calculateMono({ ...mono, base: kind === 'base', vt });
      assert.ok(Number.isFinite(r.ans));
      assert.ok(kind === 'base' ? r.ans < previous : r.ans > previous);
      previous = r.ans;
    }
    for (const eq of kind === 'poly' ? [25, 50] : [25]) {
      const calc = vt => kind === 'poly' ? api.calculatePoly({ ...poly, vt }).ans
        : api.calculateMono({ ...mono, base: kind === 'base', vt }).ans;
      assert.ok(Math.abs(calc(eq - 1e-8) - calc(eq + 1e-8)) < 1e-4);
    }
  }
});

test('equilibrium populations satisfy independent mass, equilibrium and charge checks', () => {
  // Reconstruct species by successive dissociation ratios, not the solver's
  // closed-form charge expressions; span generated concentration limits.
  for (const c of [.08, .10, .18]) for (const t of [.2, .35, .5]) {
    for (const factor of [0, .001, .55, .999999, 1, 1.000001, 1.55, 2, 2.35]) {
      const vt = factor * c * 50 / t, C = c * 50 / (50 + vt), T = t * vt / (50 + vt);
      for (const base of [false, true]) {
        const k = base ? 1e-5 : 1.8e-5;
        const { h, oh } = api.calculateMono({ c, v: 50, t, vt, k, base });
        const ratio = base ? k / oh : k / h;
        const neutral = C / (1 + ratio), charged = C - neutral;
        close(neutral + charged, C, 1e-12);
        close(base ? charged * oh / neutral : charged * h / neutral, k, 1e-10);
        close(base ? h + charged - oh - T : h + T - oh - charged, 0, 1e-12);
      }
      const { h, oh } = api.calculatePoly({ ...poly, c, t, vt });
      const r1 = poly.k1 / h, r2 = poly.k2 / h;
      const h2a = C / (1 + r1 + r1 * r2), ha = h2a * r1, a = ha * r2;
      close(h2a + ha + a, C, 1e-12);
      close(h * ha / h2a, poly.k1);
      close(h * a / ha, poly.k2);
      close(h + T - oh - ha - 2 * a, 0, 1e-12);
    }
  }
});

test('invalid physical inputs fail explicitly', () => {
  for (const change of [{ c: 0 }, { v: -1 }, { t: NaN }, { k: 0 }, { vt: -1 }, { vt: Infinity }]) {
    assert.throws(() => api.calculateMono({ ...mono, vt: 25, ...change }), { name: 'RangeError' });
  }
  assert.throws(() => api.calculatePoly({ ...poly, vt: 25, k2: 0 }), { name: 'RangeError' });
});

// Minimal DOM exercises the actual classic-script entry point, question text,
// solution rendering, navigation and grading without adding browser dependencies.
function browser(randoms) {
  class Element {
    constructor() { this.textContent = ''; this.value = ''; this.innerHTML = ''; this.listeners = {}; this.className = ''; }
    classList = { add: () => {}, remove: () => {} };
    addEventListener(type, callback) { this.listeners[type] = callback; }
    insertAdjacentHTML() {}
    querySelector(selector) { return get(selector); }
    querySelectorAll() { return []; }
  }
  const elements = new Map();
  function get(selector) {
    if (!elements.has(selector)) elements.set(selector, new Element());
    return elements.get(selector);
  }
  get('b').textContent = '0'; get('span').textContent = 'of 0 checked';
  const math = Object.create(Math);
  math.random = () => randoms.shift() ?? .5;
  const choices = ['mono', 'poly'].map(abt => { const b = get(`[data-abt=${abt}]`); b.dataset = { abt }; return b; });
  const api = load({ Math: math, document: { querySelector: get, querySelectorAll: s => s === '[data-abt]' ? choices : [] } });
  get('[data-acidbasetitration-topic]').onclick();
  return { api, get };
}
for (const base of [false, true]) for (let stage = 0; stage < 3; stage++) {
  test(`browser renders and grades monoprotic ${base ? 'base' : 'acid'} region ${stage}`, () => {
    const { api, get } = browser([base ? .1 : .9, .2, 0, 0, (stage + .1) / 3]);
    const input = { ...mono, base, k: base ? 1e-5 : mono.k, vt: [13.75, 25, 33.75][stage] };
    const result = api.calculateMono(input);
    assert.ok(get('#prompt').textContent.includes(`${input.vt.toFixed(2)} mL`));
    assert.ok(get('#solution').innerHTML.includes(result.ans.toFixed(3)));
    if (stage === 1) assert.match(get('#prompt').textContent, /equivalence point; volume shown approximately/);
    const check = get('#check').listeners.click;
    for (const answer of ['', ' ', 'NaN', String(result.ans + .25)]) {
      get('#answer').value = answer; check(); assert.equal(get('#feedback').className, 'feedback no');
    }
    get('#answer').value = result.ans.toFixed(2); check();
    assert.equal(get('#feedback').className, 'feedback ok');
    get('#new').listeners.click();
    assert.equal(get('#answer').value, '');
  });
}

test('generators preserve exact equivalence and use displayed volumes elsewhere', () => {
  let state = 431;
  const math = Object.create(Math);
  math.random = () => ((state = (1664525 * state + 1013904223) >>> 0) / 2 ** 32);
  const api = load({ Math: math });
  const seen = new Set();
  for (let i = 0; i < 1000; i++) for (const kind of ['mono', 'poly']) {
    const p = api[kind](); seen.add(`${kind}:${p.base ?? ''}:${p.stage}`);
    const eq = { equivalence: 1, firsteq: 1, secondeq: 2 }[p.stage];
    if (eq) close(p.t * p.vt, eq * p.c * p.v, 1e-12);
    else assert.equal(p.vt, +p.vt.toFixed(2));
    const calculate = kind === 'mono' ? api.calculateMono : api.calculatePoly;
    close(p.ans, calculate(p).ans);
  }
  assert.equal(seen.size, 11); // acid and base x three regions, plus five diprotic regions
});

for (let stage = 0; stage < 5; stage++) {
  test(`browser renders and grades diprotic region ${stage}`, () => {
    const { api, get } = browser([.9, .2, 0, 0, 0, .2, 0, 0, (stage + .1) / 5]);
    get('[data-abt=poly]').onclick();
    const v = 30, ve = .100 * v / .200;
    const vt = [ .55, 1, 1.55, 2, 2.35 ][stage] * ve;
    const result = api.calculatePoly({ ...poly, v, vt });
    assert.ok(get('#prompt').textContent.includes(`${vt.toFixed(2)} mL`));
    assert.ok(get('#solution').innerHTML.includes(result.ans.toFixed(3)));
    if ([1, 3].includes(stage)) assert.match(get('#prompt').textContent, /equivalence point; volume shown approximately/);
    get('#answer').value = result.ans.toFixed(2);
    get('#check').listeners.click();
    assert.equal(get('#feedback').className, 'feedback ok');
  });
}
