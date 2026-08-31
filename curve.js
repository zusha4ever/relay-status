const CURVE_FEED="https://raw.githubusercontent.com/zusha4ever/relay-status/main/windows.json";
let CURVE=null, curveChart=null;
const _showPane=showPane;
showPane=function(i,btn){_showPane(i,btn); if(i===6) renderCurve();};
async function renderCurve(){
  if(curveChart) return;
  if(!CURVE){ try{ const r=await fetch(CURVE_FEED+"?t="+Date.now()); if(!r.ok) throw new Error("HTTP "+r.status); CURVE=await r.json(); }catch(e){ el("curvenote").textContent="windows.json unreachable: "+e.message; return; } }
  const W=CURVE.windows, T0=new Date(CURVE.day0).getTime(), END=CURVE.mvpDay, GTM=CURVE.gtmDay;
  const TODAY=Math.round((new Date(CURVE.asOf)-T0)/864e5*10)/10;
  const dstr=d=>new Date(T0+d*864e5).toISOString().slice(5,10).replace("-","/");
  const rad=b=>3+9*Math.sqrt(Math.min(b,60000)/60000);
  const ex=W.slice().sort((a,b)=>a[1]-b[1]); const idealB=ex.map((w,i)=>({x:w[1],y:i+1,r:rad(w[3]),w:w[0]}));
  const mg=W.filter(w=>w[2]!==null).sort((a,b)=>a[2]-b[2]); const actB=mg.map((w,i)=>({x:w[2],y:i+1,r:rad(w[3]),w:w[0]}));
  const days=Math.ceil(TODAY), dailyM=[], dailyE=[];
  for(let d=0;d<days;d++){dailyM.push(mg.filter(w=>Math.floor(w[2])===d).length);dailyE.push(ex.filter(w=>Math.floor(w[1])===d).length);}
  const cum=a=>a.reduce((s,v)=>(s.push((s[s.length-1]||0)+v),s),[]);
  const ols=c=>{const n=c.length;let sx=0,sy=0,sxy=0,sxx=0;for(let i=0;i<n;i++){const x=i+1;sx+=x;sy+=c[i];sxy+=x*c[i];sxx+=x*x;}return (n*sxy-sx*sy)/(n*sxx-sx*sx);};
  const slopeE=ols(cum(dailyE)), slopeM=ols(cum(dailyM));
  const nE=ex.length, nM=mg.length, N=4000, H=Math.ceil(END-TODAY), recent=dailyM.slice(-7), paths=[];
  for(let p=0;p<N;p++){let c=nM;const row=[];for(let h=0;h<H;h++){const src=Math.random()<0.5?dailyM:recent;c+=src[Math.floor(Math.random()*src.length)];row.push(c);}paths.push(row);}
  const q=(h,qq)=>{const col=paths.map(r=>r[h]).sort((a,b)=>a-b);return col[Math.floor(qq*(N-1))];};
  const p10=[{x:TODAY,y:nM}],p50=[{x:TODAY,y:nM}],p90=[{x:TODAY,y:nM}];
  for(let h=0;h<H;h++){const x=Math.min(TODAY+h+1,END);p10.push({x,y:q(h,.1)});p50.push({x,y:q(h,.5)});p90.push({x,y:q(h,.9)});}
  const idealEnd=Math.round(nE+slopeE*(END-TODAY)), olsEnd=Math.round(nM+slopeM*(END-TODAY));
  const last=a=>a[a.length-1].y;
  el("curvekpis").innerHTML=`<div class="counts"><div class="count"><b>${nE}</b><span>sessions run</span></div><div class="count"><b>${nM}</b><span>landed on main</span></div><div class="count"><b>${last(p50)}</b><span>landed by Sep 18, median</span></div><div class="count"><b>${idealEnd}</b><span>could have landed</span></div></div>`;
  el("curvelegend").innerHTML=`<div class="legend" style="margin-bottom:8px"><span><i style="background:var(--chalk-dim);border-radius:50%"></i>could have been: every session lands</span><span><i style="background:transparent;border:2px solid var(--gold);border-radius:50%"></i>planned, authored, not yet run</span><span><i style="background:var(--gold-bright);border-radius:50%"></i>actual landed</span><span><i style="border-top:2px dashed var(--gold-bright);height:0"></i>Monte Carlo median, band P10 to P90</span><span><i style="border-top:2px dotted var(--gold-bright);height:0"></i>straight-line regression</span></div>`;
  el("curvenote").textContent="Data as of "+ago(CURVE.asOf)+". Median "+last(p50)+" landed by Sep 18 (P10 "+last(p10)+", P90 "+last(p90)+"); regression says "+olsEnd+". "+CURVE.bytesNote+".";
  const vlines={id:"vl",afterDraw(ch){const {ctx,chartArea:a,scales:{x}}=ch;[[TODAY,"today"],[GTM,"Sep 4"],[END,"Sep 18"]].forEach(([d,l])=>{const px=x.getPixelForValue(d);ctx.save();ctx.strokeStyle="#9AA0A8";ctx.setLineDash([3,3]);ctx.beginPath();ctx.moveTo(px,a.top);ctx.lineTo(px,a.bottom);ctx.stroke();ctx.fillStyle="#9AA0A8";ctx.font="11px Inter";ctx.textAlign="center";ctx.fillText(l,px,a.top-4);ctx.restore();});}};
  const G="#A67C00", GR="#8A8F98";
  curveChart=new Chart(el("curvechart"),{type:"bubble",data:{datasets:[
    {label:"ideal",data:idealB,backgroundColor:"rgba(138,143,152,0.45)",borderColor:GR,borderWidth:1},
    {type:"line",label:"il",data:[{x:0,y:0}].concat(idealB.map(p=>({x:p.x,y:p.y}))),borderColor:GR,borderWidth:2,pointRadius:0},
    {type:"line",label:"ip",data:[{x:TODAY,y:nE},{x:END,y:idealEnd}],borderColor:GR,borderDash:[6,4],borderWidth:2,pointRadius:0},
    {label:"actual",data:actB,backgroundColor:"rgba(212,160,23,0.6)",borderColor:G,borderWidth:1},
    {type:"line",label:"al",data:[{x:0,y:0}].concat(actB.map(p=>({x:p.x,y:p.y}))),borderColor:G,borderWidth:2,pointRadius:0},
    {type:"line",label:"p90",data:p90,borderColor:"rgba(212,160,23,0.3)",borderWidth:1,pointRadius:0,fill:"+1",backgroundColor:"rgba(212,160,23,0.14)"},
    {type:"line",label:"p10",data:p10,borderColor:"rgba(212,160,23,0.3)",borderWidth:1,pointRadius:0},
    {type:"line",label:"p50",data:p50,borderColor:G,borderDash:[6,4],borderWidth:2,pointRadius:0},
    {label:"planned",data:(window.FEEDDATA&&window.FEEDDATA.plannedWindows||[]).map((p,i)=>({x:Math.max(TODAY+0.2,(new Date(p.day)-T0)/864e5),y:nM+i+1,r:7,w:p.w,lbl:p.label})),backgroundColor:"rgba(0,0,0,0)",borderColor:G,borderWidth:2},
    {type:"line",label:"ols",data:[{x:TODAY,y:nM},{x:END,y:olsEnd}],borderColor:G,borderDash:[2,3],borderWidth:2,pointRadius:0}
  ]},options:{responsive:true,maintainAspectRatio:false,layout:{padding:{top:16}},plugins:{legend:{display:false},tooltip:{filter:i=>i.dataset.label==="ideal"||i.dataset.label==="actual",callbacks:{label:i=>"W"+i.raw.w+" · "+dstr(i.raw.x)+" · #"+i.raw.y}}},
    scales:{x:{type:"linear",min:0,max:END+1,ticks:{stepSize:7,color:GR,callback:v=>dstr(v)},grid:{display:false},border:{color:"#DDD8CC"}},y:{min:0,max:Math.max(idealEnd,last(p90))+10,ticks:{color:GR},grid:{color:"#E7E3D8"},title:{display:true,text:"cumulative windows (one Code session each)",color:GR,font:{size:11}}}},
    onClick(e){const hit=curveChart.getElementsAtEventForMode(e,"nearest",{intersect:true},true).find(x=>x.datasetIndex===0||x.datasetIndex===3||curveChart.data.datasets[x.datasetIndex].label==="planned");if(!hit)return;const p=curveChart.data.datasets[hit.datasetIndex].data[hit.index];const w=W.find(r=>r[0]===p.w);const landed=w[2]!==null;const lag=landed?Math.round((w[2]-w[1])*24):null;
      el("curvepanel").innerHTML=`<b style="color:var(--chalk)">W${w[0]}</b> · ${landed?"landed on main":"executed, not landed"} · brief ${dstr(w[1])}${landed?" · merged "+dstr(w[2])+" · "+lag+" h brief to merge":" · still in a branch or PR"} · work log ${Math.round(w[3]/1000)} KB`;
      if(DETAIL["W"+w[0]]) toggleDetail("W"+w[0]);}
  },plugins:[vlines]});
}


/* ---- Forecast tab, computed in this browser from windows.json (never stale) ---- */
async function ensureCurveData(){
  if(CURVE) return CURVE;
  const r=await fetch(CURVE_FEED+"?t="+Date.now());
  if(!r.ok) throw new Error("HTTP "+r.status);
  CURVE=await r.json(); return CURVE;
}
window.fillForecastLive=async function(){
  try{
    const C=await ensureCurveData();
    const W=C.windows, T0=new Date(C.day0).getTime();
    const TODAY=(Date.now()-T0)/864e5;
    const mg=W.filter(w=>w[2]!==null).sort((a,b)=>a[2]-b[2]);
    const nE=W.length, nM=mg.length, remaining=nE-nM;
    const days=Math.ceil(TODAY), dailyM=[];
    for(let d=0;d<days;d++) dailyM.push(mg.filter(w=>Math.floor(w[2])===d).length);
    const recent=dailyM.slice(-7);
    const N=4000, HMAX=90, clears=[];
    for(let p=0;p<N;p++){
      let c=nM, h=0;
      while(c<nE&&h<HMAX){const src=Math.random()<0.5?dailyM:recent;c+=src[Math.floor(Math.random()*src.length)];h++;}
      clears.push(h<HMAX?TODAY+h:Infinity);
    }
    clears.sort((a,b)=>a-b);
    const q=qq=>clears[Math.floor(qq*(N-1))];
    const iso=d=>!isFinite(d)?null:new Date(T0+d*864e5).toISOString().slice(0,10);
    const frac=lim=>clears.filter(c=>c<=lim).length/N;
    const unlanded=W.filter(w=>w[2]===null).map(w=>"W"+w[0]);
    renderForecast({
      p50:iso(q(.5)), p80:iso(q(.8)), p95:iso(q(.95)),
      probSep04:frac(C.gtmDay), probSep18:frac(C.mvpDay),
      runUtc:new Date().toISOString(), stale:false,
      queue:unlanded.slice(0,10).concat(unlanded.length>10?["and "+(unlanded.length-10)+" more"]:[]),
      coverage:null, runCount:null,
      missing:["A graded track record — this projection recomputes in your browser on every visit ("+nM+" of "+nE+" windows landed, "+remaining+" open), so no run history accumulates yet."],
      fixedBy:"letting it run a few days"
    });
  }catch(e){/* feed fallback already rendered */}
};
