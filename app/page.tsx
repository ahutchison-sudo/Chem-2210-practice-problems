"use client";

import { useState } from "react";

type Problem = {
  id: string;
  label: string;
  prompt: string;
  answer: number;
  unit: string;
  hint: string;
  solution: string[];
};

const substances = [
  { name: "mercury (Hg)", mm: 200.59 },
  { name: "copper(II) ion (Cu²⁺)", mm: 63.55 },
  { name: "sodium chloride (NaCl)", mm: 58.44 },
  { name: "potassium nitrate (KNO₃)", mm: 101.10 },
];

const r = (min: number, max: number, places = 0) =>
  Number((min + Math.random() * (max - min)).toFixed(places));
const sig = (value: number, figures = 3) => Number(value.toPrecision(figures));
const fmt = (value: number) =>
  value >= 1000 || value < 0.01 ? value.toExponential(3) : String(sig(value));

function makeProblem(kind: string): Problem {
  const s = substances[Math.floor(Math.random() * substances.length)];
  const density = r(0.98, 1.18, 3);

  if (kind === "ppm") {
    const ppb = r(180, 4800, 0);
    const molarity = (ppb * 1e-6 * density) / s.mm;
    return {
      id: kind,
      label: "ppb → molarity",
      prompt: `A water sample contains ${ppb} ppb ${s.name}. The solution density is ${density} g/mL. Calculate the concentration in mol/L.`,
      answer: molarity,
      unit: "mol/L",
      hint: "Use ppb as g solute per 10⁹ g solution. Convert solution mass to volume with density, then grams to moles with molar mass.",
      solution: [
        `${ppb} ppb = ${ppb} × 10⁻⁹ g ${s.name} / g solution.`,
        `One liter of solution has a mass of ${density} × 1000 = ${fmt(density * 1000)} g.`,
        `Mass of solute per liter = ${fmt(ppb * 1e-9 * density * 1000)} g.`,
        `Molarity = ${fmt(ppb * 1e-9 * density * 1000)} g/L ÷ ${s.mm} g/mol = ${fmt(molarity)} mol/L.`,
      ],
    };
  }

  if (kind === "wtpercent") {
    const wt = r(4.5, 32, 1);
    const molarity = (wt / 100 * density * 1000) / s.mm;
    return {
      id: kind,
      label: "weight % → molarity",
      prompt: `A ${wt} wt% solution of ${s.name} has a density of ${density} g/mL. Calculate its molarity.`,
      answer: molarity,
      unit: "mol/L",
      hint: "Choose a 100 g solution basis. Weight percent gives grams of solute; density converts the 100 g of solution to liters.",
      solution: [
        `In 100.0 g solution there are ${wt} g ${s.name}.`,
        `Volume = 100.0 g ÷ ${density} g/mL = ${fmt(100 / density)} mL = ${fmt(0.1 / density)} L.`,
        `Moles = ${wt} g ÷ ${s.mm} g/mol = ${fmt(wt / s.mm)} mol.`,
        `Molarity = ${fmt(wt / s.mm)} mol ÷ ${fmt(0.1 / density)} L = ${fmt(molarity)} mol/L.`,
      ],
    };
  }

  if (kind === "flask") {
    const m = r(0.035, 0.450, 3);
    const vol = [100, 250, 500, 1000][Math.floor(Math.random() * 4)];
    const mass = m * (vol / 1000) * s.mm;
    return {
      id: kind,
      label: "prepare in a volumetric flask",
      prompt: `How many grams of ${s.name} (molar mass ${s.mm} g/mol) are required to prepare ${vol} mL of a ${m} M solution in a volumetric flask?`,
      answer: mass,
      unit: "g",
      hint: "First find moles needed from M × L. Then use the molar mass to convert moles to grams.",
      solution: [
        `Convert the flask volume: ${vol} mL = ${vol / 1000} L.`,
        `Moles required = ${m} mol/L × ${vol / 1000} L = ${fmt(m * vol / 1000)} mol.`,
        `Mass = ${fmt(m * vol / 1000)} mol × ${s.mm} g/mol = ${fmt(mass)} g.`,
      ],
    };
  }

  if (kind === "dilution") {
    const wt = r(22, 55, 1);
    const targetM = r(0.050, 0.400, 3);
    const targetVol = [100, 250, 500][Math.floor(Math.random() * 3)];
    const stockM = (wt / 100 * density * 1000) / s.mm;
    const stockVol = (targetM * targetVol) / stockM;
    return {
      id: kind,
      label: "dilute a concentrated stock",
      prompt: `A ${wt} wt% ${s.name} stock has density ${density} g/mL. What volume of this stock is needed to prepare ${targetVol} mL of ${targetM} M solution?`,
      answer: stockVol,
      unit: "mL",
      hint: "Convert the weight-percent stock to molarity first. Then use M₁V₁ = M₂V₂, keeping both volumes in mL.",
      solution: [
        `Stock molarity = [${wt}/100 × ${density} g/mL × 1000 mL/L] ÷ ${s.mm} g/mol = ${fmt(stockM)} M.`,
        `Use M₁V₁ = M₂V₂: V₁ = (${targetM} M × ${targetVol} mL) ÷ ${fmt(stockM)} M.`,
        `Required stock volume = ${fmt(stockVol)} mL. Dilute this aliquot to the mark in a ${targetVol} mL volumetric flask.`,
      ],
    };
  }

  const copperM = r(1.20e-3, 4.20e-3, 5);
  const sampleVol = r(250, 750, 0);
  const wt = r(35, 50, 1);
  const ureaDensity = r(1.06, 1.16, 3);
  const copperMoles = copperM * sampleVol / 1000;
  const ureaMoles = copperMoles;
  const ureaPerMl = (wt / 100 * ureaDensity) / 60.06;
  const volume = ureaMoles / ureaPerMl;
  return {
    id: "stoich",
    label: "stoichiometry + weight %",
    prompt: `How many mL of a ${wt} wt% urea solution (density ${ureaDensity} g/mL; urea molar mass 60.06 g/mol) are required to completely precipitate Cu²⁺ from ${sampleVol} mL of ${copperM} M Cu²⁺? Assume urea produces 2 OH⁻ and Cu²⁺ requires 2 OH⁻ to form Cu(OH)₂.`,
    answer: volume,
    unit: "mL",
    hint: "Find mol Cu²⁺ first. The two 2:1 relationships cancel: mol urea needed equals mol Cu²⁺. Convert the stock's wt% and density into mol urea per mL.",
    solution: [
      `Moles Cu²⁺ = ${copperM} mol/L × ${sampleVol / 1000} L = ${fmt(copperMoles)} mol.`,
      `Each urea makes 2 OH⁻ and each Cu²⁺ needs 2 OH⁻, so mol urea = ${fmt(ureaMoles)} mol.`,
      `Urea per mL stock = ${wt}/100 × ${ureaDensity} g/mL ÷ 60.06 g/mol = ${fmt(ureaPerMl)} mol/mL.`,
      `Volume = ${fmt(ureaMoles)} mol ÷ ${fmt(ureaPerMl)} mol/mL = ${fmt(volume)} mL.`,
    ],
  };
}

const kinds = ["ppm", "wtpercent", "flask", "dilution", "stoich"];

export default function Home() {
  const [kind, setKind] = useState("ppm");
  const [problem, setProblem] = useState(() => makeProblem("ppm"));
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<"correct" | "try" | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const [score, setScore] = useState({ correct: 0, attempted: 0 });

  const newProblem = (nextKind = kind) => {
    setKind(nextKind); setProblem(makeProblem(nextKind)); setAnswer("");
    setResult(null); setShowHint(false); setShowSolution(false);
  };
  const check = () => {
    const entered = Number(answer.replace(/,/g, ""));
    const correct = Number.isFinite(entered) && Math.abs(entered - problem.answer) <= Math.max(Math.abs(problem.answer) * 0.012, 1e-8);
    setResult(correct ? "correct" : "try");
    setScore((s) => ({ correct: s.correct + (correct ? 1 : 0), attempted: s.attempted + 1 }));
  };

  return <main>
    <section className="hero">
      <p className="eyebrow">CHEM 2210 • Analytical Chemistry</p>
      <h1>Concentration<br /><em>Practice Lab</em></h1>
      <p className="intro">Build fluency with the unit conversions and solution-preparation calculations used in class.</p>
      <div className="score"><strong>{score.correct}</strong> correct <span>of {score.attempted} checked</span></div>
    </section>

    <section className="workspace">
      <aside>
        <p className="sidebar-label">Choose a skill</p>
        {kinds.map((k) => <button key={k} className={kind === k ? "mode active" : "mode"} onClick={() => newProblem(k)}>{makeProblem(k).label}</button>)}
        <div className="reference"><strong>Quick reference</strong><br />wt% = g solute / 100 g solution<br />ppm = mg/kg<br />ppb = μg/kg<br />M = mol/L</div>
      </aside>
      <article className="problem-card">
        <div className="problem-top"><span>Practice problem</span><button className="new" onClick={() => newProblem()}>↻ New values</button></div>
        <h2>{problem.label}</h2>
        <p className="prompt">{problem.prompt}</p>
        <div className="answer-row"><label htmlFor="answer">Your answer</label><div><input id="answer" inputMode="decimal" value={answer} onChange={(e) => setAnswer(e.target.value)} onKeyDown={(e) => e.key === "Enter" && check()} placeholder="Enter a number" /><span>{problem.unit}</span></div></div>
        <button className="check" onClick={check}>Check answer</button>
        {result && <div className={result === "correct" ? "feedback correct" : "feedback try"}>{result === "correct" ? "Correct — your conversion is on target." : "Not quite. Check your units and try again, or reveal a hint."}</div>}
        <div className="support"><button onClick={() => setShowHint(!showHint)}>Hint</button><button onClick={() => setShowSolution(!showSolution)}>Worked solution</button></div>
        {showHint && <div className="hint"><strong>Hint:</strong> {problem.hint}</div>}
        {showSolution && <ol className="solution">{problem.solution.map((step, i) => <li key={i}>{step}</li>)}</ol>}
      </article>
    </section>
    <footer>Practice only — use your own work for graded assignments.</footer>
  </main>;
}
