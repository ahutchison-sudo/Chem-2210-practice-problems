(() => {
  const $ = (s) => document.querySelector(s);
  const R = (a,b,d=0) => +(a + Math.random() * (b-a)).toFixed(d);
  const F = (x) => (+x.toPrecision(4)).toString();
  const t95 = {4:3.182,5:2.776};
  const g95 = {4:1.463,5:1.672};
  let mode = "ci", problem;
  const oldCheck = $("#check").onclick;
  const topicNav = document.querySelector(".layout aside .modes");
  topicNav.insertAdjacentHTML("beforeend", '<button data-statistics-topic="yes">Statistics</button>');

  function roundResult(value,error) {
    const scale = 10 ** Math.floor(Math.log10(Math.abs(error)));
    const e = Math.round(error / scale) * scale;
    const places = Math.max(0, -Math.floor(Math.log10(Math.abs(e))));
    return { value:Number(value.toFixed(places)), error:e };
  }
  function mean(values) { return values.reduce((a,b)=>a+b,0)/values.length; }
  function stdev(values) { const m=mean(values); return Math.sqrt(values.reduce((s,x)=>s+(x-m)**2,0)/(values.length-1)); }
  function confidence() {
    const n = Math.random() < .5 ? 4 : 5;
    const center = R(5,40,2), spread = R(.35,2.2,2);
    const values = Array.from({length:n}, ()=>R(center-spread,center+spread,2));
    const m=mean(values), s=stdev(values), ci=t95[n]*s/Math.sqrt(n), final=roundResult(m,ci);
    return {type:"ci",n,values,m,s,ci,final};
  }
  function grubbs() {
    const n = Math.random() < .5 ? 4 : 5, wantOutlier = Math.random() < .55;
    let values, candidate, m, s, g;
    for(let tries=0; tries<100; tries++) {
      const center=R(10,45,1), spread=R(.5,2.5,2);
      const base=Array.from({length:n-1},()=>R(center-spread,center+spread,2));
      candidate=R(center+(wantOutlier?3.3:1.4)*spread,center+(wantOutlier?4.6:1.8)*spread,2);
      values=[...base,candidate]; m=mean(values); s=stdev(values); g=Math.abs(candidate-m)/s;
      if((wantOutlier && g>g95[n]+.08)||(!wantOutlier && g<g95[n]-.08)) break;
    }
    return {type:"grubbs",n,values,candidate,m,s,g,critical:g95[n],outlier:g>g95[n]};
  }
  function make() { return mode === "ci" ? confidence() : grubbs(); }
  function show() {
    document.querySelectorAll("[data-practice-topic]").forEach(x=>x.classList.remove("active"));
    document.querySelector("[data-statistics-topic]").classList.add("active");
    $(".top span").textContent="Statistics";
    $(".top + .eyebrow").textContent="Choose a statistics skill";
    $("#modes").innerHTML='<button class="'+(mode==="ci"?"active":"")+'" data-stat-mode="ci">mean and 95% confidence interval</button><button class="'+(mode==="grubbs"?"active":"")+'" data-stat-mode="grubbs">Grubbs outlier test</button>';
    document.querySelectorAll("[data-stat-mode]").forEach(b=>b.onclick=()=>{mode=b.dataset.statMode;show();});
    problem=make(); $("#answer").value=""; $("#feedback").className="feedback hidden"; $("#hint").className="hint hidden";
    if(problem.type === "ci") {
      $("#title").textContent="mean and 95% confidence interval";
      $("#prompt").textContent=`Calculate the mean and the 95% confidence interval for this data set (${problem.n} measurements): ${problem.values.join(", ")}. Use the Student's t table provided.`;
      $("label[for=answer]").textContent="Report as mean +/- confidence interval";
      $("#answer").placeholder="Example: 12.3 +/- 0.4";
      $("#hint").textContent="Hint: Find the sample standard deviation using n - 1 degrees of freedom. Then CI = t s / sqrt(n).";
      $("#solution").innerHTML=[`Mean = ${F(problem.m)}.`,`Sample standard deviation s = ${F(problem.s)}.`,`For n = ${problem.n}, degrees of freedom = ${problem.n-1}; t(95%) = ${t95[problem.n]}.`,`95% CI = ${t95[problem.n]} x ${F(problem.s)} / sqrt(${problem.n}) = ${F(problem.ci)}.`,`Final result: ${problem.final.value} +/- ${problem.final.error}.`].map(x=>'<li>'+x+'</li>').join("");
    } else {
      $("#title").textContent="Grubbs outlier test";
      $("#prompt").textContent=`Use a 95% Grubbs test to determine whether the specified value ${problem.candidate} is an outlier in this data set: ${problem.values.join(", ")}. Enter G, then yes or no (example: 1.51, yes).`;
      $("label[for=answer]").textContent="G value, then outlier decision";
      $("#answer").placeholder="Example: 1.51, yes";
      $("#hint").textContent="Hint: G = |specified value - mean| / s. Compare G to the critical value for the number of observations.";
      $("#solution").innerHTML=[`Mean = ${F(problem.m)}.`,`Sample standard deviation s = ${F(problem.s)}.`,`G = |${problem.candidate} - ${F(problem.m)}| / ${F(problem.s)} = ${F(problem.g)}.`,`For n = ${problem.n}, G critical (95%) = ${problem.critical}.`,`Because G is ${problem.outlier?">":"<"} G critical, the specified value ${problem.outlier?"may":"may not"} be rejected as an outlier.`].map(x=>'<li>'+x+'</li>').join("");
    }
    $("#solution").className="solution hidden"; $("#unit").textContent="";
  }
  function checked(ok,message) { const score=$(".score"), count=+(score.querySelector("b").textContent), prior=+(score.querySelector("span").textContent.match(/\d+/)?.[0]||0); score.querySelector("b").textContent=count+(ok?1:0); score.querySelector("span").textContent="of "+(prior+1)+" checked"; const feedback=$("#feedback"); feedback.className="feedback "+(ok?"ok":"no"); feedback.textContent=message; }
  $("#check").onclick=()=> {
    if(!document.querySelector("[data-statistics-topic].active")) return oldCheck();
    const text=$("#answer").value.trim();
    if(problem.type === "ci") { const m=text.match(/^\s*([+-]?(?:\d*\.)?\d+)\s*(?:\+\/-|±)\s*([+-]?(?:\d*\.)?\d+)\s*$/); const ok=m&&Math.abs(+m[1]-problem.final.value)<=Math.max(Math.abs(problem.final.value)*.012,.002)&&Math.abs(+m[2]-problem.final.error)<=Math.max(Math.abs(problem.final.error)*.08,.002); checked(ok,ok?"Correct - the mean and 95% confidence interval are consistent.":"Enter both parts as mean +/- confidence interval. Check t, s, and final rounding."); }
    else { const m=text.match(/^\s*([+-]?(?:\d*\.)?\d+)\s*[,; ]\s*(yes|no)\s*$/i); const ok=m&&Math.abs(+m[1]-problem.g)<=.03&&((m[2].toLowerCase()==="yes")===problem.outlier); checked(ok,ok?"Correct - your G calculation and decision agree.":"Enter G followed by yes or no. Compare G with the table's 95% critical value."); }
  };
  $("#new").addEventListener("click",()=>{if(document.querySelector("[data-statistics-topic].active")) show();});
  document.querySelector("[data-statistics-topic]").onclick=show;
})();

