(() => {
  // Concentration-based equilibria at 25 degrees C; activities are assumed ideal.
  const kw = 1e-14;
  const F = x => (Math.abs(x) < .01 ? x.toExponential(3) : (+x.toPrecision(4)).toString());
  const R = (a, b, d = 0) => +(a + Math.random() * (b - a)).toFixed(d);

  function validate({ c, v, t, vt }, constants) {
    if (![c, v, t, ...constants].every(x => Number.isFinite(x) && x > 0)
        || !Number.isFinite(vt) || vt < 0) {
      throw new RangeError("Concentrations, sample volume and equilibrium constants must be positive; titrant volume must be nonnegative.");
    }
  }

  // Electroneutrality is monotone in [H+]. Bisection in log space remains
  // stable at equivalence and includes water autoionization in every region.
  function equilibrium(charge) {
    let low = -30, high = 20;
    if (!(charge(10 ** low) < 0 && charge(10 ** high) > 0)) {
      throw new RangeError("Unable to bracket the equilibrium.");
    }
    for (let i = 0; i < 180; i++) {
      const mid = (low + high) / 2;
      if (charge(10 ** mid) > 0) high = mid;
      else low = mid;
    }
    const ans = -(low + high) / 2, h = 10 ** -ans;
    return { ans, h, oh: kw / h };
  }

  function amounts({ c, v, t, vt }) {
    const n = c * v / 1000, nt = t * vt / 1000, tot = (v + vt) / 1000;
    return { n, nt, tot, C: n / tot, T: nt / tot };
  }

  function calculateMono(input) {
    const { base = false, k } = input;
    validate(input, [k]);
    const { n, nt, tot, C, T } = amounts(input);
    const ka = base ? kw / k : k;
    const result = equilibrium(h => base
      ? h + C * h / (h + ka) - kw / h - T
      : h + T - kw / h - C * ka / (h + ka));
    const conjugate = kw / k;
    const stage = input.vt === 0 ? "initial" : Math.abs(nt - n) <= n * 1e-12
      ? "equivalence" : nt < n ? "buffer" : "excess";
    const lines = [
      `Initial moles analyte = ${F(n)} mol; moles titrant = ${F(nt)} mol. Total volume = ${F(tot)} L.`,
      `Region: ${stage}. Analytical analyte concentration C = ${F(C)} M; titrant counterion concentration T = ${F(T)} M.`,
    ];
    if (stage === "equivalence") {
      lines.push(`The conjugate ${base ? "acid" : "base"} controls pH: ${base ? "Ka = Kw/Kb" : "Kb = Kw/Ka"} = ${F(conjugate)}.`);
    } else if (stage === "buffer") {
      lines.push(base
        ? `Buffer pair B/BH+: pKa(BH+) = ${(-Math.log10(ka)).toFixed(3)}. Henderson-Hasselbalch is an approximation; use equilibrium concentrations.`
        : `Buffer pair HA/A-: pKa = ${(-Math.log10(ka)).toFixed(3)}. Henderson-Hasselbalch is an approximation; use equilibrium concentrations.`);
    } else if (stage === "excess") {
      lines.push(`Stoichiometric excess strong ${base ? "acid" : "base"} concentration = ${F((nt - n) / tot)} M.`);
    }
    lines.push(base
      ? `With h = [H+], [BH+] = C h/(h + Ka). Solve h + [BH+] = Kw/h + T.`
      : `With h = [H+], [A-] = C Ka/(h + Ka). Solve h + T = Kw/h + [A-].`);
    lines.push(`At equilibrium [H+] = ${F(result.h)} M; [OH-] = ${F(result.oh)} M. pH = -log10[H+] = ${result.ans.toFixed(3)}.`);
    return { ...input, ...result, stage, lines };
  }

  function calculatePoly(input) {
    const { k1, k2 } = input;
    validate(input, [k1, k2]);
    const { n, nt, tot, C, T } = amounts(input);
    const result = equilibrium(h => {
      const D = h * h + k1 * h + k1 * k2;
      return h + T - kw / h - C * (k1 * h + 2 * k1 * k2) / D;
    });
    const stage = input.vt === 0 ? "initial" : Math.abs(nt - n) <= n * 1e-12
      ? "firsteq" : Math.abs(nt - 2 * n) <= n * 1e-12 ? "secondeq"
      : nt < n ? "firstbuffer" : nt < 2 * n ? "secondbuffer" : "excess";
    const descriptions = {
      initial: "Initial H2A solution; both dissociation steps are included.",
      firstbuffer: "Before the first equivalence point: H2A/HA- buffer region.",
      firsteq: "One equivalent OH- added: HA- is amphiprotic. The simple average of pKa values can fail when C is not much larger than Ka1.",
      secondbuffer: "Between equivalence points: HA-/A2- buffer region.",
      secondeq: `Two equivalents OH- added: A2- hydrolyzes with Kb = Kw/Ka2 = ${F(kw / k2)}.`,
      excess: `Beyond two equivalents: stoichiometric excess [OH-] = ${F((nt - 2 * n) / tot)} M.`,
    };
    const lines = [
      `Initial moles H2A = ${F(n)} mol; moles OH- added = ${F(nt)} mol. Total volume = ${F(tot)} L.`,
      descriptions[stage],
      `C = ${F(C)} M; [Na+] = ${F(T)} M. Include both acid equilibria and Kw = 1.000e-14.`,
      "With h = [H+] and D = h^2 + Ka1 h + Ka1 Ka2: [H2A] = C h^2/D, [HA-] = C Ka1 h/D, [A2-] = C Ka1 Ka2/D.",
      "Solve charge balance: h + [Na+] = Kw/h + [HA-] + 2[A2-].",
      `At equilibrium [H+] = ${F(result.h)} M; [OH-] = ${F(result.oh)} M. pH = -log10[H+] = ${result.ans.toFixed(3)}.`,
    ];
    return { ...input, ...result, stage, lines };
  }

  function mono() {
    const base = Math.random() < .5, c = R(.08, .18, 3);
    const v = [50, 75, 100][Math.floor(Math.random() * 3)], t = R(.2, .5, 3);
    const k = base ? 1e-5 : 1.8e-5, ve = c * v / t;
    const stage = ["buffer", "equivalence", "excess"][Math.floor(Math.random() * 3)];
    // Equivalence is specified exactly in the prompt. Otherwise calculate from
    // the rounded volume students actually see, not an unprinted volume.
    const vt = stage === "equivalence" ? ve : +(ve * (stage === "buffer" ? .55 : 1.35)).toFixed(2);
    return calculateMono({ base, c, v, t, k, vt });
  }

  function poly() {
    const c = R(.08, .18, 3), v = [30, 50, 75][Math.floor(Math.random() * 3)], t = R(.2, .5, 3);
    const k1 = 5.9e-2, k2 = 6.4e-5, ve = c * v / t;
    const stage = ["firstbuffer", "firsteq", "secondbuffer", "secondeq", "excess"][Math.floor(Math.random() * 5)];
    const factors = { firstbuffer: .55, firsteq: 1, secondbuffer: 1.55, secondeq: 2, excess: 2.35 };
    const exact = factors[stage] * ve;
    const vt = ["firsteq", "secondeq"].includes(stage) ? exact : +exact.toFixed(2);
    return calculatePoly({ c, v, t, k1, k2, vt });
  }

  // The same pure functions are used by the browser and the Node regression suite.
  globalThis.AcidBaseTitrations = Object.freeze({ calculateMono, calculatePoly, mono, poly });
  if (typeof document === "undefined") return;
  const $ = s => document.querySelector(s), nav = $(".layout aside .modes");
  let mode = "mono", p;
  nav.addEventListener("click", e => {
    if (e.target.tagName === "BUTTON") nav.querySelectorAll("button").forEach(b => b.classList.remove("active"));
  }, true);
  nav.insertAdjacentHTML("beforeend", '<button data-acidbasetitration-topic="yes">Acid-base titrations</button>');
  const active = () => !!$("[data-acidbasetitration-topic].active");
  function mark(ok, msg) {
    const s = $(".score"), n = +(s.querySelector("b").textContent);
    const t = +(s.querySelector("span").textContent.match(/\d+/)?.[0] || 0);
    s.querySelector("b").textContent = n + (ok ? 1 : 0);
    s.querySelector("span").textContent = "of " + (t + 1) + " checked";
    $("#feedback").className = "feedback " + (ok ? "ok" : "no");
    $("#feedback").textContent = msg;
  }
function show(){p=mode==="mono"?mono():poly();$("[data-acidbasetitration-topic]").classList.add("active");$(".top span").textContent="Acid-base titrations";$(".top + .eyebrow").textContent="pH after a specified titrant volume";$("#modes").innerHTML='<button class="'+(mode==="mono"?"active":"")+'" data-abt="mono">monoprotic acid or base</button><button class="'+(mode==="poly"?"active":"")+'" data-abt="poly">polyprotic acid</button>';document.querySelectorAll("[data-abt]").forEach(b=>b.onclick=()=>{mode=b.dataset.abt;show()});$("#answer").value="";$("#unit").textContent="";$("label[for=answer]").textContent="pH";$("#answer").placeholder="Example: 4.62";$("#feedback").className="feedback hidden";$("#hint").className="hint hidden";$("#solution").className="solution hidden";if(mode==="mono"){let a=p.base?"weak base Pumaamine":"weak acid HA",t=p.base?"HCl":"NaOH",k=p.base?"Kb":"Ka";$("#title").textContent="monoprotic acid-base titration";$("#prompt").textContent=`A ${p.v.toFixed(1)} mL sample of ${p.c.toFixed(3)} M ${a} (${k} = ${F(p.k)}) is titrated with ${p.t.toFixed(3)} M ${t}. Determine pH after ${p.vt.toFixed(2)} mL titrant is added${p.stage==="equivalence"?" (the equivalence point; volume shown approximately)":""}.`}else{$("#title").textContent="polyprotic acid-base titration";$("#prompt").textContent=`A ${p.v.toFixed(1)} mL sample of ${p.c.toFixed(3)} M H2A is titrated with ${p.t.toFixed(3)} M NaOH. Ka1 = ${F(p.k1)}; Ka2 = ${F(p.k2)}. Determine pH after ${p.vt.toFixed(2)} mL NaOH is added${["firsteq","secondeq"].includes(p.stage)?" (the equivalence point; volume shown approximately)":""}.`}$("#hint").textContent="Hint: Compare moles of titrant added to initial analyte moles before choosing an equilibrium expression.";$("#solution").innerHTML=p.lines.map(x=>'<li>'+x+'</li>').join("")}
$("[data-acidbasetitration-topic]").onclick=show;$("#check").addEventListener("click",()=>{if(!active())return;let input=$("#answer").value.trim(),x=Number(input),ok=input!==""&&Number.isFinite(x)&&Math.abs(x-p.ans)<=.04;mark(ok,ok?"Correct - your titration pH is on target.":"Not quite. Identify the titration region from moles, then use the appropriate expression.")});$("#new").addEventListener("click",()=>{if(active())show()});})();

