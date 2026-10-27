(function(root){
const mm=n=>n*72/25.4,esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const papers={legal:{id:'legal',width:1008,height:612,label:'Legal 35,56 × 21,59 cm',tag:'Legal landscape'},f4:{id:'f4',width:mm(330),height:mm(210),label:'F4 33 × 21 cm',tag:'F4 landscape'},a4:{id:'a4',width:mm(210),height:mm(297),label:'A4 21 × 29,7 cm',tag:'A4 portrait'}};
const sumTo=(a,n)=>a.slice(0,n).reduce((x,y)=>x+y,0);
const CHART_H=92;
/* Diagram batang kehadiran: satu perhitungan geometri dipakai bersama oleh PDF dan HTML agar tampilannya identik. */
function chartGeom(chart,x,top,w,h){
 const pad=6,titleH=11,labelH=11,valH=10,plotTop=top+pad+titleH,plotBottom=top+h-pad-labelH,plotH=plotBottom-plotTop,maxBar=Math.max(8,plotH-valH);
 const max=Math.max(1,...chart.map(c=>c[1])),slot=(w-2*pad)/chart.length,bw=Math.min(34,slot*.5);
 return {box:{x,top,w,h},title:{x:x+pad,top:top+pad,w:w-2*pad},base:{x1:x+pad,x2:x+w-pad,y:plotBottom},
  bars:chart.map((c,i)=>{const bh=c[1]>0?Math.max(1.5,maxBar*c[1]/max):0,cx=x+pad+slot*i+slot/2;
   return {label:c[0],value:c[1]+' ('+c[2]+')',color:c[3],x:cx-bw/2,w:bw,top:plotBottom-bh,h:bh,cx,slotX:cx-slot/2,slot,valueTop:plotBottom-bh-valH,labelTop:plotBottom+2}})};
}
function summaryCols(a){const hasChart=!!(a.summary&&a.summary.chart);return {hasChart,rx:a.margin+a.width*(hasChart?.26:.5),cx:a.margin+a.width*.54,cw:a.width*.46};}

async function layout(db,scope,o={}){
 // Lay out each assessment independently so every matrix keeps its two-page allocation.
 if(scope==='analysis'&&Array.isArray(o.analyses)){
  if(!o.analyses.length)throw Error('Tidak ada analisis yang dipilih.');
  const tables=[];
  for(const a of o.analyses){
   const single={...o,analysis:a};delete single.analyses;delete single.analysisTables;
   const result=await layout(db,scope,single),seen=new Set();
   for(const p of result.pages)if(!seen.has(p.table)){seen.add(p.table);tables.push({...p.table,fontSize:p.size,sheet:a.subject+' '+(p.table.sheet||'Analisis')});}
  }
  const next={...o,analysisTables:tables,analysisFitted:true,analysisIndependent:true};delete next.analyses;
  return layout(db,scope,next);
 }

 // Balance both analysis pages using measured content, including names and signatures.
 if(scope==='analysis'&&!o.analysisFitted){
  const selected=o.analysis||(db.questionAnalyses||[]).find(a=>a.id===o.analysisId);
  if(!selected)throw Error('Pilih analisis soal terlebih dahulu.');
  const count=root.QuestionAnalysis.analyze(selected).n;if(!count)throw Error('Pilih setidaknya satu peserta.');
  let low=1,high=Math.max(1,count-1),best=null;
  while(low<=high){
   const split=Math.floor((low+high)/2),result=await layout(db,scope,{...o,analysisFitted:true,analysisIndependent:true,analysisMatrixOnly:true,analysisSplit:split}),
    sizes=result.pages.map(p=>p.size),size=Math.min(...sizes);
   if(!best||size>best.size)best={split,size};
   if(Math.abs(sizes[0]-sizes[1])<.01)break;
   if(sizes[0]<sizes[1])high=split-1;else low=split+1;
  }
  return layout(db,scope,{...o,analysisFitted:true,analysisSplit:best.split,analysisFontSize:best.size});
 }
 const P=root.PDFLib,doc=await P.PDFDocument.create(),font=await doc.embedFont(P.StandardFonts.Helvetica),bold=await doc.embedFont(P.StandardFonts.HelveticaBold),paper=papers[o.paper||'legal']||papers.legal,margin=28,every=o.signMode==='every';
 function clean(value){return Array.from(String(value??'').replace(/\r/g,'').replace(/\t/g,'  ').replace(/→/g,' -> ').replace(/[−–—]/g,'-').replace(/…/g,'...')).map(c=>{if(c==='\n')return c;try{font.encodeText(c);return c}catch{return '[U+'+c.codePointAt(0).toString(16).toUpperCase()+']'}}).join('');}
 const tw=(v,size,b=false)=>(b?bold:font).widthOfTextAtSize(v,size);
 function wrap(value,w,size=8.5,isBold=false){const f=isBold?bold:font,result=[];for(const para of clean(value).split('\n')){let line='';for(const word of para.split(/\s+/).filter(Boolean)){if(f.widthOfTextAtSize(line?line+' '+word:word,size)<=w){line+=(line?' ':'')+word;continue}if(line){result.push(line);line=''}for(const ch of word){if(f.widthOfTextAtSize(line+ch,size)>w&&line){result.push(line);line=''}line+=ch}}result.push(line)}return result.length?result:[''];}
 function fit(value,w,size,b){let t=clean(value).replace(/\n/g,' ');if(tw(t,size,b)<=w)return t;while(t.length>1&&tw(t+'..',size,b)>w)t=t.slice(0,-1);return t+'..';}
 const s=db.settings,date=o.signDate||new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Makassar',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 const longDate=d=>d?new Date(d+'T12:00:00Z').toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}):'';
 let logo=null;if(s.logo&&/^data:image\/(png|jpeg);base64,/.test(s.logo)){try{const bytes=Uint8Array.from(atob(s.logo.split(',')[1]),c=>c.charCodeAt(0));logo=s.logo.startsWith('data:image/png')?await doc.embedPng(bytes):await doc.embedJpg(bytes)}catch{logo=null}}
 const embedSig=async u=>{if(!u||!/^data:image\/(png|jpeg);base64,/.test(u))return null;try{const bytes=Uint8Array.from(atob(u.split(',')[1]),c=>c.charCodeAt(0));return u.startsWith('data:image/png')?await doc.embedPng(bytes):await doc.embedJpg(bytes)}catch{return null}};
 const sigP=await embedSig(s.principalSig),sigT=await embedSig(s.teacherSig);
 const frames={};
 function frame(pp,role,parent){const fk=pp.id+'|'+role+'|'+(parent??'-');if(frames[fk])return frames[fk];const width=pp.width-2*margin,three=parent!==undefined,signWidth=width*(three?.3:.42),paper=pp;
 const signLeft=[['Mengetahui,'],[root.Core.principalTitle(db)+','],...Array.from({length:3},()=>['']),wrap(s.principal||'........................................',signWidth,9,true),wrap('NIP. '+(s.principalNip||'................................'),signWidth,8.5)];
 const signRight=[wrap((o.signCity||s.city||'................')+', '+longDate(date),signWidth,8.5),[role+','],...Array.from({length:3},()=>['']),wrap(s.teacher||'........................................',signWidth,9,true),wrap('NIP. '+(s.teacherNip||'................................'),signWidth,8.5)];
 const signParent=[['Mengetahui,'],['Orang Tua / Wali,'],...Array.from({length:3},()=>['']),wrap(parent||'........................................',signWidth,9,true),['']],mkSign=(lines,x,img,src)=>({lines,x,img,src,pre:lines.slice(0,2).reduce((n,l)=>n+l.length,0)*11}),signs=three?[mkSign(signParent,margin),mkSign(signLeft,margin+(width-signWidth)/2,sigP,s.principalSig),mkSign(signRight,margin+width-signWidth,sigT,s.teacherSig)]:[mkSign(signLeft,margin,sigP,s.principalSig),mkSign(signRight,margin+width-signWidth,sigT,s.teacherSig)];
 const signHeight=Math.max(...signs.map(g=>g.lines).map(arr=>arr.reduce((n,a)=>n+a.length*11,0)))+8,signTop=paper.height-margin-signHeight-12;
 /* kop surat: dihitung sekali karena sama untuk semua halaman */
 const logoSize=logo?58:0,kopX=margin+(logo?logoSize+14:0),kopW=width-(logo?2*(logoSize+14):0),kop=[];let kt=margin;
 const kopLines=String(s.kopLines||'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
 for(const [text,size] of [...kopLines.map(x=>[x,10.5]),[s.school||'NAMA SEKOLAH BELUM DIISI',12],...(s.schoolAddress?[[s.schoolAddress,8.5]]:[])]){const lines=wrap(text,kopW,size,true);kop.push({lines,size,bold:true,top:kt});kt+=lines.length*size*1.25+1.5}
 const ruleTop=Math.max(kt,margin+logoSize)+3,afterKop=ruleTop+10;
 return frames[fk]={paper,width,signWidth,signs,signHeight,signTop,kop,ruleTop,afterKop,logoSize};}
 const pages=[],defPaper=paper;
 for(const t of (o.analysisTables||root.ReportData.tables(db,scope,o))){
  const F=frame(papers[t.paper]||defPaper,t.role||'Guru Kelas',t.parent),{width,signWidth,signs,signHeight,signTop,kop,ruleTop,afterKop,logoSize}=F,paper=F.paper;
  const singlePage=!!t.singlePage;
  let candidate=t.fontSize||8.5;
  for(let attempt=0;;attempt++){
  const size=candidate,lh=size*1.25,rowPad=singlePage?size*.5:5,n=t.headers.length,weights=t.widths.reduce((a,b)=>a+b,0),widths=t.widths.map(w=>width*w/weights),xs=[0];widths.forEach(w=>xs.push(xs.at(-1)+w));
  const span=(c,k)=>xs[c+k]-xs[c],pad=c=>t.compactCells&&c>=2&&c<n-(t.tailCols||0)?1:widths[c]<30?2:4;
  if(t.fitNumeric){let scale=1;for(let c=2;c<n;c++){const values=[...String(t.headers[c]).split('\n'),...t.rows.map(r=>r[c]),...(t.foot||[]).map(f=>f.cells[c-(f.span0||3)])];for(const v of values){const str=clean(v);if(!/^\d+(?:[.,]\d+)?%?$/.test(str))continue;const w=tw(str,size,true);if(w)scale=Math.min(scale,(widths[c]-2*pad(c)-1)/w)}}if(scale<.999){candidate*=Math.max(.1,scale);continue}}
  /* judul + blok keterangan */
  let top=afterKop;const title={lines:wrap(t.title,width,11,true),size:11,top};top+=title.lines.length*11*1.25+6;
  const infoSize=8.5,il=infoSize*1.3,L=(t.info?.left||[]).map(r=>[clean(r[0]),clean(r[1])]),R=(t.info?.right||[]).map(r=>[clean(r[0]),clean(r[1])]);
  const lw=L.length?Math.max(...L.map(r=>tw(r[0],infoSize)))+6:0,rw=R.length?Math.max(...R.map(r=>tw(r[0],infoSize)))+6:0,rv=R.length?Math.max(...R.map(r=>tw(r[1],infoSize)))+10:0,rightX=margin+width-(rw+rv+8);
  const info={left:L,right:R,lw,rw,top,size:infoSize,il,rightX};
  if(t.ownPages){
   info.rightX=margin+width*.62;
   const blocks=(items,x,labelW,w)=>{let y=top;return items.map(([label,value])=>{const lines=wrap(': '+value,Math.max(10,w-labelW-4),infoSize),b={label,lines,x,labelW,top:y};y+=Math.max(1,lines.length)*il;return b})};
   info.leftBlocks=blocks(L,margin,lw,width*.59);info.rightBlocks=blocks(R,info.rightX,rw,width*.38);
   top=Math.max(top,...[...info.leftBlocks,...info.rightBlocks].map(b=>b.top+b.lines.length*il))+4;
  }else top+=Math.max(L.length,R.length)*il+4;
  /* Keterangan penjelas tidak dicetak pada unduhan PDF, HTML, maupun Excel. */
  const note={lines:[],size:7,top};
  const sectionTitle=t.sectionTitle?{lines:wrap(t.sectionTitle,width,size+1,true),top:top+4,size:size+1}:null;
  if(sectionTitle)top+=sectionTitle.lines.length*(size+1)*1.25+12;
  const tableTop=top+2;
  /* kepala tabel bertingkat */
  const id=t.idCols||0,tail=t.tailCols||0,rowsH=[],cells=[],rotOK=!!t.rotate;
  const rot=c=>rotOK&&c>=id&&(t.rotFit?tw(clean(t.headers[c]),size,true)>widths[c]-2*pad(c):widths[c]<30);
  let r=0;
  if(t.banner){const lines=wrap(t.banner,span(id,n-id-tail)-8,size,true);cells.push({c:id,cs:n-id-tail,r,rs:1,lines});rowsH.push(lines.length*lh+8);r++}
  const compactHead=(value,w,initial,min,maxLines)=>{
   let gs=initial,lines=wrap(value,w,gs,true);
   const longest=Math.max(0,...clean(value).split(/\s+/).map(word=>tw(word,gs,true)));
   if(min&&longest>w)gs=Math.max(min,Math.min(gs,gs*w/longest));
   lines=wrap(value,w,gs,true);
   while(min&&maxLines&&lines.length>maxLines&&gs>min){gs=Math.max(min,gs-.25);lines=wrap(value,w,gs,true)}
   return {lines,gs};
  };
  const gsz=t.groupSize||size,gcells=(t.groups||[]).map(g=>{const gw=span(g.start,g.span)-8;let {lines,gs}=compactHead(g.label,gw,gsz,t.groupMinSize,t.groupMax);if(t.groupMax&&lines.length>t.groupMax){lines=lines.slice(0,t.groupMax);lines[t.groupMax-1]=fit(lines[t.groupMax-1]+' ...',gw,gs,true)}return {c:g.start,cs:g.span,lines,gs}});
  if(gcells.length){gcells.forEach(g=>cells.push({...g,r,rs:1}));rowsH.push(Math.max(...gcells.map(g=>g.lines.length*g.gs*1.25))+6);r++}
  const leaf=[];for(let c=id>0?id:0;c<n-tail;c++)leaf.push(rot(c)?{c,cs:1,rot:true,lines:[fit(t.headers[c],64,size,true)]}:{c,cs:1,...compactHead(t.headers[c],widths[c]-2*pad(c),t.headerSize||size,t.headerMinSize,t.headerMaxLines),pad:pad(c)});
  const leafH=Math.max(...leaf.map(l=>l.rot?tw(l.lines[0],size,true)+10:l.lines.length*(l.gs||size)*1.25+(singlePage?rowPad:8)),id&&!rowsH.length?lh+8:0,singlePage?lh+rowPad:18);
  leaf.forEach(l=>cells.push({...l,r,rs:1}));rowsH.push(leafH);const leafRow=r;r++;
  const tailNeed=tail?Math.max(...t.headers.slice(n-tail).map(h=>tw(clean(h),size,true)))+12:0;{const cur=rowsH.reduce((a,b)=>a+b,0);if(tailNeed>cur)rowsH[rowsH.length-1]+=tailNeed-cur}
  const headH=rowsH.reduce((a,b)=>a+b,0),rowY=[0];rowsH.forEach(h=>rowY.push(rowY.at(-1)+h));
  for(let c=0;c<id;c++)cells.push({c,cs:1,r:0,rs:rowsH.length,lines:wrap(t.headers[c],widths[c]-2*pad(c),size,true),idcell:true,pad:pad(c)});
  for(let c=n-tail;c<n;c++)cells.push({c,cs:1,r:0,rs:rowsH.length,rot:true,lines:[clean(t.headers[c])],idcell:true});
  /* ringkasan (hanya halaman terakhir) */
  const sm=t.summary;if(sm&&sm.text)sm.textLines=wrap(sm.text,width,size+.6).slice(0,10);const sl=sm?Math.max(sm.left.length,sm.right.length):0,sumH=sm?Math.max(sl*size*1.45+8,sm.chart?CHART_H:0)+(sm.textLines?sm.textLines.length*(size+.6)*1.3+6:0):0;
  const bodyTop=tableTop+headH,pageBottom=paper.height-38,fullCap=pageBottom-bodyTop,signCap=signTop-8-bodyTop,capEvery=every?signCap:fullCap,capLast=(t.showSign===false?fullCap:signCap)-sumH-(t.summaryNear?12:0);
  if(capEvery<lh*3||capLast<lh*3)throw Error('Judul atau tujuan pembelajaran terlalu panjang untuk halaman. Ringkas judul/TP sebelum mencetak.');
  const centerSet=new Set(t.center||[]),weekend=new Set(t.weekend||[]),boldSet=new Set(t.boldCols||[]);
  const mk=(vals,x={})=>{if(vals.spans){let c=0;return vals.map((raw,i)=>{const cs=vals.spans[i],padding=cs===1?pad(c):4,item={c,cs,raw,lines:wrap(raw,span(c,cs)-2*padding,size,!!x.bold),pad:padding,center:i===0&&cs===1,bold:!!x.bold,fill:!!x.fill};c+=cs;return item})}const out=[];let c=0;if(x.span0){const lines=wrap(vals[0],span(0,x.span0)-6,size,true);out.push({c,cs:x.span0,raw:vals[0],lines,center:false,bold:true,fill:true,right:true});c=x.span0}for(;c<n;c++)out.push({c,cs:1,raw:vals[c],lines:wrap(vals[c],widths[c]-2*pad(c),size,!!x.bold||boldSet.has(c)),pad:pad(c),center:centerSet.has(c)||typeof vals[c]==='number',bold:!!x.bold||boldSet.has(c),fill:!!x.fill,bg:typeof vals.colors?.[c]==='string'&&/^[A-Fa-f0-9]{6}$/.test(vals.colors[c])?vals.colors[c]:null,shade:!x.fill&&weekend.has(c)});return out};
  const maxLines=singlePage?Infinity:Math.max(1,Math.floor((capLast-6)/lh)),minH=singlePage?lh+rowPad:Math.max(15,lh+5);
  const seq=[];
  const source=[...(t.rows.length||t.allowEmptyRows?t.rows:[t.headers.map((_,i)=>i===0?'Belum ada data.':'')]),...(t.supplements||[])];
  const kindEntry=(row,cont)=>{
   if(row.kind==='band'){const text=row[0]+(cont&&!/lanjutan\)$/.test(row[0])?' (sambungan)':''),lines=wrap(text,span(0,n)-8,size,true);return {cells:[{c:0,cs:n,raw:text,lines,pad:4,center:false,bold:true,fill:true}],height:Math.max(minH,lines.length*lh+rowPad),kind:'band',supplement:!!row.supplement,keep:cont?0:2}}
   const cs=mk(row,{bold:true,fill:true});return {cells:cs,height:Math.max(minH,Math.max(...cs.map(c=>c.lines.length))*lh+rowPad),kind:'sub',supplement:!!row.supplement,keep:cont?0:1}};
  source.forEach((row,index)=>{
   if(row.kind){seq.push(kindEntry(row,false));return}
   const base=mk(row),count=Math.max(...base.map(c=>c.lines.length));
   for(let start=0;start<count;start+=maxLines){
    const continuation=start>0,cs=base.map(c=>({...c,lines:c.lines.slice(start,start+maxLines)}));
    if(continuation&&!row.spans)for(let k=0;k<Math.min(3,cs.length);k++)if(!cs[k].lines.length)cs[k].lines=wrap(String(row[cs[k].c]??'')+' (lanj.)',widths[cs[k].c]-6,size);
    seq.push({cells:cs,height:Math.max(minH,Math.max(...cs.map(c=>c.lines.length))*lh+rowPad),index,continuation,blk:row.blk,supplement:!!row.supplement});
   }
  });
  (t.foot||[]).forEach(f=>{const cs=mk([f.label,...Array.from({length:(f.span0||3)-1},()=>''),...f.cells],{span0:f.span0||3,bold:true,fill:true});seq.push({cells:cs,height:Math.max(minH,Math.max(...cs.map(c=>c.lines.length))*lh+rowPad),foot:true})});
  const totalHeight=seq.reduce((sum,row)=>sum+row.height,0);
  if(singlePage&&totalHeight>capLast-4){
   if(attempt>=100||capLast<=0)throw Error('Rapor '+(t.sheet||'murid')+' belum dapat dimuat pada satu lembar. Periksa panjang kop dan identitas sekolah.');
   candidate*=Math.min(.95,Math.sqrt((capLast-4)/totalHeight)*.98);continue;
  }
  const mine=[];let buffer=[],height=0;
  const flush=()=>{mine.push(buffer);buffer=[];height=0};
  /* blok TP yang berlanjut ke halaman berikutnya mengulang pita TP dan nama kegiatan; pita tidak ditinggalkan sendirian di dasar halaman */
  const contOf=blk=>blk.c||(blk.c=[kindEntry(blk.band,true),kindEntry(blk.sub,true)]),plain=r=>!!r&&!r.kind&&!r.foot&&!!r.blk;
  if(singlePage)mine.push(seq);else seq.forEach((row,i)=>{const extra=row.keep?seq.slice(i+1,i+1+row.keep).reduce((v,x)=>v+x.height,0):0;
   if(height+row.height+extra>capEvery&&buffer.length)flush();
   if(!buffer.length&&plain(row))for(const x of contOf(row.blk)){buffer.push(x);height+=x.height}
   buffer.push(row);height+=row.height});
  if(buffer.length)flush();
  /* halaman terakhir harus muat tanda tangan (dan ringkasan) */
  const hOf=a=>a.reduce((v,x)=>v+x.height,0);
  let guard=0;while(!singlePage&&hOf(mine.at(-1))>capLast&&mine.at(-1).length>1&&guard++<200){const last=mine.at(-1),carry=[];while(last.length>1&&hOf(last)>capLast)carry.unshift(last.pop());while(last.length>1&&last.at(-1).kind&&last.at(-1).keep)carry.unshift(last.pop());if(plain(carry[0]))carry.unshift(...contOf(carry[0].blk));mine.push(carry)}
  mine.forEach((rows,pi)=>{
   /* Satu sel libur memanjang melintasi baris murid pada setiap halaman. */
   const holidayRows=rows.filter(row=>!row.foot&&!row.kind),holidays=[];
   if(t.holidays?.length&&holidayRows.length){
    const hs=6.2,hl=hs*1.05;
    let need=60;
    for(const h of t.holidays){
     const linesAcross=Math.max(1,Math.floor((widths[h.c]-2)/hl));
     while(wrap(h.label,need-8,hs,true).length>linesAcross)need+=5;
    }
    const current=holidayRows.reduce((v,row)=>v+row.height,0),extra=Math.max(0,need-current);
    const limit=pi===mine.length-1?capLast:capEvery;
    if(hOf(rows)+extra>limit)throw Error('Keterangan hari libur terlalu panjang untuk halaman. Ringkas keterangan libur.');
    holidayRows.at(-1).height+=extra;
    const height=holidayRows.reduce((v,row)=>v+row.height,0);
    for(const h of t.holidays){
     let gs=7.4;
     while(wrap(h.label,height-8,gs,true).length*gs*1.05>widths[h.c]-2&&gs>hs)gs=Math.max(hs,gs-.2);
     holidays.push({...h,lines:wrap(h.label,height-8,gs,true),size:gs,lh:gs*1.05,height,rowSpan:holidayRows.length});
    }
   }
   const summaryTop=t.summaryNear?bodyTop+hOf(rows)+12:null,nearSignTop=t.summaryNear?(pi===mine.length-1?summaryTop+sumH+8:bodyTop+hOf(rows)+8):signTop;
   pages.push({table:t,singlePage,paper,margin,width,widths,xs,size,lh,title,sectionTitle:rows.every(r=>r.supplement)?null:sectionTitle,kop,logo,logoSize,ruleTop,info,note,tableTop:rows.every(r=>r.supplement)?bodyTop:tableTop,cells:rows.every(r=>r.supplement)?[]:cells,rowsH:rows.every(r=>r.supplement)?[]:rowsH,rowY,headH,leafRow,bodyTop,rows,holidays,signs,signTop:nearSignTop,signWidth,signHeight,showSign:t.showSign!==false&&(every||pi===mine.length-1),ownPages:!!t.ownPages,summary:pi===mine.length-1?sm:null,sumH,sumTop:summaryTop,part:pi+1,parts:mine.length,rotOK});
  });
  break;
  }
 }
 pages.forEach((p,i)=>{p.label=p.table.reportPage?'Halaman '+p.table.reportPage+' / '+p.table.reportPages:p.table.ownPages?'Halaman '+p.part+' / '+p.parts:'Halaman '+(i+1)+' / '+pages.length});
 if(scope==='analysis'&&!o.analysisIndependent){const matrix=pages.filter(p=>p.table.key.startsWith('analisis-halaman-')),minSize=Math.min(...matrix.map(p=>p.size));if(matrix.some(p=>p.size>minSize+.01))return layout(db,scope,{...o,analysisFontSize:minSize});}
 if(scope==='analysis')pages.forEach((p,i)=>p.label='Halaman '+(i+1)+' / '+pages.length);
 return {doc,font,bold,pages,paper,clean,wrap,tw,logo,longDate};
}
async function pdf(db,scope,o={}){
 const L=await layout(db,scope,o),P=root.PDFLib,black=P.rgb(.08,.1,.09),line=P.rgb(.23,.27,.24),pale=P.rgb(.91,.94,.91),grey=P.rgb(.95,.95,.93);
 for(let pi=0;pi<L.pages.length;pi++){
  const a=L.pages[pi],H=a.paper.height,page=L.doc.addPage([a.paper.width,H]);
  const text=(lines,x,top,w,size,bold=false,center=false,lh=size*1.25)=>lines.forEach((v,i)=>{const f=bold?L.bold:L.font;page.drawText(v,{x:x+(center?(w-f.widthOfTextAtSize(v,size))/2:0),y:H-top-size-i*lh,font:f,size,color:black})});
  const rect=(x,top,w,h,fill)=>page.drawRectangle({x,y:H-top-h,width:w,height:h,borderWidth:.45,borderColor:line,...(fill?{color:fill}:{})});
  /* kop surat */
  if(a.logo)page.drawImage(a.logo,{x:a.margin,y:H-a.margin-a.logoSize,width:a.logoSize*a.logo.width/Math.max(a.logo.width,a.logo.height),height:a.logoSize*a.logo.height/Math.max(a.logo.width,a.logo.height)});
  const kx=a.margin+(a.logo?a.logoSize+14:0),kw=a.width-(a.logo?2*(a.logoSize+14):0);
  for(const h of a.kop)text(h.lines,kx,h.top,kw,h.size,true,true);
  page.drawRectangle({x:a.margin,y:H-a.ruleTop-2,width:a.width,height:2,color:black});
  text(a.title.lines,a.margin,a.title.top,a.width,11,true,true);
  /* blok keterangan */
  const il=a.info,rows=Math.max(il.left.length,il.right.length);
  if(il.leftBlocks){for(const b of [...il.leftBlocks,...il.rightBlocks]){text([b.label],b.x,b.top,b.labelW,il.size);text(b.lines,b.x+b.labelW,b.top,0,il.size,false,false,il.il)}}
  else {il.left.forEach((r,i)=>{const y=il.top+i*il.il;text([r[0]],a.margin,y,0,il.size);text([': '+r[1]],a.margin+il.lw,y,0,il.size)});
  il.right.forEach((r,i)=>{const y=il.top+i*il.il;text([r[0]],il.rightX,y,0,il.size);text([': '+r[1]],il.rightX+il.rw,y,0,il.size)});}
  if(a.note.lines.length)text(a.note.lines,a.margin,a.note.top,a.width,a.note.size);
  if(a.sectionTitle)text(a.sectionTitle.lines,a.margin,a.sectionTitle.top,a.width,a.sectionTitle.size,true);
  /* kepala tabel */
  for(const c of a.cells){const x=a.margin+a.xs[c.c],w=a.xs[c.c+c.cs]-a.xs[c.c],top=a.tableTop+a.rowY[c.r],h=a.rowY[c.r+c.rs]-a.rowY[c.r];rect(x,top,w,h,pale);
   if(c.rot){page.drawText(c.lines[0],{x:x+w/2+a.size*.35,y:H-top-h+5,font:L.bold,size:a.size,color:black,rotate:P.degrees(90)})}
   else{const p=c.pad??3,gs=c.gs||a.size;text(c.lines,x+p,top+(h-c.lines.length*gs*1.25)/2+1,w-2*p,gs,true,true)}}
  /* isi tabel */
  let y=a.bodyTop;
  for(const row of a.rows){for(const c of row.cells){const x=a.margin+a.xs[c.c],w=a.xs[c.c+c.cs]-a.xs[c.c];rect(x,y,w,row.height,c.bg?P.rgb(...c.bg.match(/../g).map(h=>parseInt(h,16)/255)):c.fill?pale:c.shade?grey:null);{const p=c.pad??3;text(c.lines,x+p,y+(row.height-c.lines.length*a.lh)/2+.5,w-2*p,a.size,c.bold,c.center)}}y+=row.height}
  for(const h of a.holidays){
   const x=a.margin+a.xs[h.c],w=a.widths[h.c];rect(x,a.bodyTop,w,h.height,grey);
   h.lines.forEach((line,i)=>page.drawText(line,{x:x+(w-h.lines.length*h.lh)/2+h.size+i*h.lh,y:H-a.bodyTop-h.height+(h.height-L.bold.widthOfTextAtSize(line,h.size))/2,font:L.bold,size:h.size,color:black,rotate:P.degrees(90)}));
  }
  /* ringkasan + tanda tangan */
  if(a.summary){const s=a.summary,top=a.sumTop??(a.signTop-a.sumH-4),sz=a.size+.6;const lx=a.margin,cols=summaryCols(a),rx=cols.rx,lw=Math.max(0,...s.left.map(r=>L.tw(r[0],sz)))+8,rw=Math.max(0,...s.right.map(r=>L.tw(r[0],sz)))+8;
   s.left.forEach((r,i)=>{text([r[0]],lx,top+i*sz*1.45,0,sz);text([': '+r[1]],lx+lw,top+i*sz*1.45,0,sz)});s.right.forEach((r,i)=>{text([r[0]],rx,top+i*sz*1.45,0,sz);text([': '+r[1]],rx+rw,top+i*sz*1.45,0,sz)});
   if(s.textLines)text(s.textLines,lx,top+Math.max(s.left.length,s.right.length)*sz*1.45+6,a.width,sz,false,false,sz*1.3);
   if(cols.hasChart){const g=chartGeom(s.chart,cols.cx,top,cols.cw,a.sumH-4);rect(g.box.x,g.box.top,g.box.w,g.box.h);text(['Grafik kehadiran murid (jumlah catatan)'],g.title.x,g.title.top,g.title.w,7,true,true);
    g.bars.forEach(b=>{if(b.h>0)page.drawRectangle({x:b.x,y:H-b.top-b.h,width:b.w,height:b.h,color:P.rgb(...b.color)});text([b.value],b.slotX,b.valueTop,b.slot,6.3,false,true);text([b.label],b.slotX,b.labelTop,b.slot,7,true,true)});
    page.drawLine({start:{x:g.base.x1,y:H-g.base.y},end:{x:g.base.x2,y:H-g.base.y},thickness:.6,color:line})}}
  if(a.showSign)for(const {lines,x:left,img,pre} of a.signs){let y=a.signTop;if(img){const bw=a.signWidth*.8,bh=38,k=Math.min(bw/img.width,bh/img.height),iw=img.width*k,ih=img.height*k;page.drawImage(img,{x:left+(a.signWidth-iw)/2,y:H-(a.signTop+pre-2+(bh-ih)/2)-ih,width:iw,height:ih})}lines.forEach((v,i)=>{text(v,left,y,a.signWidth,i===5?9:8.5,i===5,true,11);if(i===5)v.forEach((t,k)=>{const f=L.bold,w=f.widthOfTextAtSize(t,9);page.drawLine({start:{x:left+(a.signWidth-w)/2,y:H-y-9-k*11-1.5},end:{x:left+(a.signWidth+w)/2,y:H-y-9-k*11-1.5},thickness:.5,color:black})});y+=v.length*11})}
  text(['Ruang Kelas | '+a.paper.tag],a.margin,H-23,a.width,7);
  const label=a.label;page.drawText(label,{x:a.paper.width-a.margin-L.font.widthOfTextAtSize(label,7),y:16,font:L.font,size:7,color:black});
 }
 L.doc.setTitle(root.DocumentNames?root.DocumentNames.title(db,scope,o):'Administrasi Ruang Kelas');L.doc.setAuthor(db.settings.teacher||'Ruang Kelas');return L.doc.save();
}
async function html(db,scope,o={}){
 const L=await layout(db,scope,o),lines=a=>a.map(esc).join('<br>'),pt=v=>(Math.round(v*100)/100)+'pt';
 const abs=(x,y,w,extra='')=>`position:absolute;left:${pt(x)};top:${pt(y)};${w?'width:'+pt(w)+';':''}${extra}`;
 const content=L.pages.map((a,index)=>{
  const kx=a.margin+(a.logo?a.logoSize+14:0),kw=a.width-(a.logo?2*(a.logoSize+14):0),img=db.settings.logo&&a.logo?`<img src="${esc(db.settings.logo)}" alt="" style="${abs(a.margin,a.margin,0,`height:${pt(a.logoSize)};width:auto;max-width:${pt(a.logoSize)};object-fit:contain`)}">`:'';
  const kop=a.kop.map(h=>`<div style="${abs(kx,h.top,kw,`font-size:${h.size}pt;font-weight:bold;text-align:center;line-height:1.25`)}">${lines(h.lines)}</div>`).join('');
  const rule=`<div style="${abs(a.margin,a.ruleTop,a.width,'height:2pt;background:#151916')}"></div>`;
  const title=`<div style="${abs(a.margin,a.title.top,a.width,'font-size:11pt;font-weight:bold;text-align:center;line-height:1.25')}">${lines(a.title.lines)}</div>`;
  const il=a.info,infoRows=(rows,x,lw)=>il.leftBlocks?(x===a.margin?il.leftBlocks:il.rightBlocks).map(b=>`<div style="${abs(b.x,b.top,b.labelW,`font-size:${il.size}pt;line-height:${il.il}pt`)}">${esc(b.label)}</div><div style="${abs(b.x+b.labelW,b.top,0,`font-size:${il.size}pt;line-height:${il.il}pt;white-space:nowrap`)}">${lines(b.lines)}</div>`).join(''):rows.map((r,i)=>`<div style="${abs(x,il.top+i*il.il,0,`font-size:${il.size}pt;line-height:1.2;white-space:nowrap`)}"><span style="display:inline-block;width:${pt(lw)}">${esc(r[0])}</span>: ${esc(r[1])}</div>`).join('');
  const note=a.note.lines.length?`<div style="${abs(a.margin,a.note.top,a.width,'font-size:7pt;line-height:1.25')}">${lines(a.note.lines)}</div>`:'';
  const headRows=a.rowsH.map((h,r)=>`<tr style="height:${pt(h)}">${a.cells.filter(c=>c.r===r).sort((x,y)=>x.c-y.c).map(c=>`<th colspan="${c.cs}"${c.rs>1?` rowspan="${c.rs}"`:''}${c.gs||a.singlePage?` style="font-size:${c.gs||a.size}pt;${a.singlePage?'padding:0 1pt;line-height:'+((c.gs||a.size)*1.25)+'pt;white-space:nowrap;':''}"`:''}>${c.rot?`<div class="rot">${esc(c.lines[0])}</div>`:lines(c.lines)}</th>`).join('')}</tr>`).join('');
  const body=a.rows.map((r,ri)=>`<tr style="height:${pt(r.height)}">${r.cells.map(c=>{
   const holiday=!r.foot&&!r.kind&&a.holidays.find(h=>h.c===c.c);
   if(holiday)return ri===0?`<td rowspan="${holiday.rowSpan}" style="padding:0;background:#f2f2ee;position:relative"><div style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%) rotate(-90deg);width:${pt(holiday.height-8)};font-size:${holiday.size}pt;line-height:1.05;text-align:center;font-weight:bold;white-space:nowrap">${lines(holiday.lines)}</div></td>`:'';
   return `<td colspan="${c.cs}" style="${a.singlePage?`padding:0 1pt;line-height:${a.lh}pt;white-space:nowrap;`: ''}${c.center?'text-align:center;':''}${c.bold?'font-weight:bold;':''}${c.bg?'background:#'+c.bg+';':c.fill?'background:#e8f0e8;':c.shade?'background:#f2f2ee;':''}${c.right?'text-align:right;':''}${c.lines.length<2?'white-space:nowrap;overflow:hidden;':''}">${lines(c.lines)}</td>`;
  }).join('')}</tr>`).join('');
  let sum='';if(a.summary){const s=a.summary,top=a.sumTop??(a.signTop-a.sumH-4);const stext=s.textLines?`<div style="${abs(0,Math.max(s.left.length,s.right.length)*(a.size+.6)*1.45+6,a.width,`font-size:${a.size+.6}pt;line-height:1.3`)}">${lines(s.textLines)}</div>`:'';const cols=summaryCols(a),lw1=cols.hasChart?26:50,rw1=cols.hasChart?28:48;sum=`<div style="${abs(a.margin,top,a.width,`font-size:${a.size+.6}pt;line-height:1.45`)}"><div style="display:inline-block;vertical-align:top;width:${lw1}%">${s.left.map(r=>`<div><span style="display:inline-block;min-width:${pt(110)}">${esc(r[0])}</span>: ${esc(r[1])}</div>`).join('')}</div><div style="display:inline-block;vertical-align:top;width:${rw1}%">${s.right.map(r=>`<div><span style="display:inline-block;min-width:${pt(cols.hasChart?50:95)}">${esc(r[0])}</span>: ${esc(r[1])}</div>`).join('')}</div>${stext}</div>`;
   if(cols.hasChart){const g=chartGeom(s.chart,cols.cx,top,cols.cw,a.sumH-4),px=v=>pt(v),col=c=>`rgb(${c.map(v=>Math.round(v*255)).join(',')})`;
    sum+=`<div class="att-chart" style="${abs(g.box.x,g.box.top,g.box.w)}height:${px(g.box.h)};border:.45pt solid #3b453d;"><div style="${abs(g.title.x-g.box.x,g.title.top-g.box.top,g.title.w)}text-align:center;font-weight:bold;font-size:7pt;line-height:1.25">Grafik kehadiran murid (jumlah catatan)</div>`+g.bars.map(b=>(b.h>0?`<div style="${abs(b.x-g.box.x,b.top-g.box.top,b.w)}height:${px(b.h)};background:${col(b.color)};-webkit-print-color-adjust:exact;print-color-adjust:exact"></div>`:'')+`<div style="${abs(b.slotX-g.box.x,b.valueTop-g.box.top,b.slot)}text-align:center;font-size:6.3pt;line-height:1.25;white-space:nowrap">${esc(b.value)}</div><div style="${abs(b.slotX-g.box.x,b.labelTop-g.box.top,b.slot)}text-align:center;font-weight:bold;font-size:7pt;line-height:1.25">${esc(b.label)}</div>`).join('')+`<div style="${abs(g.base.x1-g.box.x,g.base.y-g.box.top,g.base.x2-g.base.x1)}border-top:.6pt solid #3b453d"></div></div>`}}
  const sign=a.showSign?a.signs.map(({lines:sg,x,img,src,pre})=>`<div class="signature" style="${abs(x,a.signTop,a.signWidth)}">${img&&src?`<img src="${esc(src)}" alt="" style="position:absolute;left:10%;width:80%;top:${pt(pre-2)};height:38pt;object-fit:contain">`:''}${sg.map((c,i)=>`<div style="font-weight:${i===5?'bold':'normal'};${i===5?'text-decoration:underline;':''}min-height:11pt">${lines(c)||'&nbsp;'}</div>`).join('')}</div>`).join(''):'';
  return `<section class="sheet p-${a.paper.id}" style="width:${pt(a.paper.width)};height:${pt(a.paper.height)}">${img}${kop}${rule}${title}${infoRows(il.left,a.margin,il.lw)}${infoRows(il.right,il.rightX,il.rw)}${note}${a.sectionTitle?`<div style="${abs(a.margin,a.sectionTitle.top,a.width,`font-size:${a.sectionTitle.size}pt;font-weight:bold`)}">${lines(a.sectionTitle.lines)}</div>`:''}<table style="${abs(a.margin,a.tableTop,a.width,`font-size:${a.size}pt;line-height:1.25`)}"><colgroup>${a.widths.map(w=>`<col style="width:${pt(w)}">`).join('')}</colgroup><thead>${headRows}</thead><tbody>${body}</tbody></table>${sum}${sign}<small style="${abs(a.margin,0,0,'bottom:14pt;top:auto')}">Ruang Kelas | ${esc(a.paper.tag)}</small><small style="position:absolute;right:${pt(a.margin)};bottom:14pt">${esc(a.label)}</small></section>`}).join('');
 const used=[...new Map(L.pages.map(p=>[p.paper.id,p.paper])).values()],sizes=used.map(q=>q.label+' · '+(q.tag.includes('portrait')?'Portrait':'Landscape')).join(' / '),pageCss=used.map(q=>`@page ${q.id}{size:${q.width}pt ${q.height}pt;margin:0}.p-${q.id}{page:${q.id}}`).join('');
 return `<!DOCTYPE html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(root.DocumentNames?root.DocumentNames.title(db,scope,o):"Laporan Ruang Kelas")}</title><style>@page{size:${L.paper.width}pt ${L.paper.height}pt;margin:0}${pageCss}*{box-sizing:border-box}body{font-family:Arial,sans-serif;margin:0;background:#e8ece9;color:#151916}.tools{padding:18px;position:sticky;left:0;top:0;background:white;z-index:2}.tools button{padding:10px 20px;cursor:pointer}.sheet{position:relative;background:white;margin:18px auto;page-break-after:always;break-after:page;overflow:hidden}.sheet:last-child{break-after:auto;page-break-after:auto}table{border-collapse:collapse;table-layout:fixed}td,th{border:.45pt solid #404840;padding:2pt 1.5pt;vertical-align:middle;overflow-wrap:anywhere}th{background:#e8f0e8;text-align:center}tr{break-inside:avoid;page-break-inside:avoid}td{text-align:left}.rot{writing-mode:vertical-rl;transform:rotate(180deg);white-space:nowrap;margin:0 auto}.signature{font-size:8.5pt;line-height:11pt;text-align:center}small{font-size:7pt}@media print{body{background:white}.tools{display:none}.sheet{margin:0}}</style></head><body><div class="tools"><button onclick="window.print()">Cetak / Simpan PDF</button> ${esc(sizes)} · Skala 100% · Matikan header/footer peramban</div>${content}</body></html>`;
}
root.ReportPrint={layout,pdf,html,papers};
})(typeof window==='undefined'?globalThis:window);
