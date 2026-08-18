(()=>{
  const targets=["#prompt","#hint","#solution"];
  const token=/\b(?:[A-Z][a-z]?\d*|\([A-Za-z0-9]+\)\d*)+(?:\^\d*[+-]|\d*[+-])?/g;
  function ion(raw){
    let core=raw,charge="",m=raw.match(/\^(\d*[+-])$/);
    if(m){core=raw.slice(0,-m[0].length);charge=m[1];}
    else if(/[+-]$/.test(raw)){
      core=raw.slice(0,-1);charge=raw.at(-1);
      if(/^[A-Z][a-z]?\d+$/.test(core)){let d=core.match(/\d+$/)[0];core=core.slice(0,-d.length);charge=d+charge;}
    }
    return core.replace(/\d+/g,"<sub>$&</sub>")+(charge?"<sup>"+charge+"</sup>":"");
  }
  function format(el){
    if(!el||el.dataset.chemSource===el.textContent)return;
    el.dataset.chemSource=el.textContent;
    const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT),nodes=[];
    while(walker.nextNode())nodes.push(walker.currentNode);
    nodes.forEach(n=>{if(!n.parentElement.closest("sup,sub")){
      const text=n.nodeValue;if(token.test(text)){token.lastIndex=0;const span=document.createElement("span"),safe=text.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");span.innerHTML=safe.replace(token,ion);n.replaceWith(span);}
      token.lastIndex=0;
    }});
  }
  function run(){targets.forEach(s=>format(document.querySelector(s)));}
  new MutationObserver(run).observe(document.body,{childList:true,subtree:true,characterData:true});
  run();
})();

