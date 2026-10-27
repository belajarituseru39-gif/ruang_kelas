(function(root){
async function createWorkbook(db,scope,o={}){
 const L=await root.ReportPrint.layout(db,scope,o),wb=new root.ExcelJS.Workbook();wb.creator='Ruang Kelas';wb.title=root.DocumentNames?root.DocumentNames.title(db,scope,o):'Laporan administrasi landscape';
 let logoId=null;if(L.logo&&db.settings.logo){const m=db.settings.logo.match(/^data:image\/(png|jpeg);base64,(.+)$/);if(m)logoId=wb.addImage({base64:m[2],extension:m[1]==='png'?'png':'jpeg'})}
 const border=Object.fromEntries(['top','bottom','left','right'].map(k=>[k,{style:'thin',color:{argb:'FF404840'}}])),fillPale={type:'pattern',pattern:'solid',fgColor:{argb:'FFE8F0E8'}},fillGrey={type:'pattern',pattern:'solid',fgColor:{argb:'FFF2F2EE'}};
 for(let pi=0;pi<L.pages.length;pi++){
  const p=L.pages[pi],n=p.widths.length,ws=wb.addWorksheet((String(pi+1).padStart(2,'0')+' '+(p.table.sheet||p.table.key)).replace(/[\[\]:*?/\\]/g,'-').slice(0,31));let r=1;
  ws.columns=p.widths.map(w=>({width:Math.max(2.2,w/5.25)}));
  const merge=(row,start,end,value,bold=false,size=9,h='center',extra={})=>{if(end>start)ws.mergeCells(row,start,row,end);const c=ws.getCell(row,start);c.value=value;c.font={name:'Arial',size,bold,...extra};c.alignment={horizontal:h,vertical:'middle',wrapText:true};return c;};
  const logoW=p.logo?p.logoSize+14:0;let leftCols=1;if(logoW){let s=0;for(let c=0;c<n;c++){s+=p.widths[c];if(s>=logoW){leftCols=c+1;break}}}
  const kopStart=Math.min(n,logoW?leftCols+1:1),kopEnd=Math.max(kopStart,logoW?n-leftCols:n),kopFirst=r;
  for(const h of p.kop){merge(r,kopStart,kopEnd,h.lines.join('\n'),true,h.size);ws.getRow(r).height=h.lines.length*h.size*1.25+3;r++}
  const kopH=p.kop.reduce((v,h)=>v+h.lines.length*h.size*1.25+3,0);if(logoId!==null){if(kopH<p.logoSize){ws.getRow(r-1).height+=p.logoSize-kopH}ws.addImage(logoId,{tl:{col:0.05,row:kopFirst-1+0.05},ext:{width:p.logoSize*1.333,height:p.logoSize*1.333*(p.logo.height/p.logo.width>1?1:p.logo.height/p.logo.width)}})}
  for(let c=1;c<=n;c++)ws.getCell(r-1,c).border={bottom:{style:'medium',color:{argb:'FF151916'}}};
  ws.getRow(r++).height=6;
  merge(r,1,n,p.title.lines.join('\n'),true,11);ws.getRow(r).height=p.title.lines.length*11*1.25+6;r++;
  /* blok keterangan */
  let sum=0,leftEnd=1,rightStart=n;for(let c=0;c<n;c++){sum+=p.widths[c];if(sum<=p.width*.5)leftEnd=c+1;if(sum-p.widths[c]>=p.width*.62&&rightStart===n)rightStart=c+1}rightStart=Math.max(leftEnd+1,Math.min(n,rightStart));
  const rows=Math.max(p.info.left.length,p.info.right.length);
  for(let i=0;i<rows;i++){const l=p.info.left[i],rr=p.info.right[i];
   if(p.info.leftBlocks){const leftW=p.xs[leftEnd]-8,rightW=p.width-p.xs[rightStart-1]-8,lt=l?L.wrap(l[0]+': '+l[1],leftW,8.5):[],rt=rr?L.wrap(rr[0]+': '+rr[1],rightW,8.5):[];if(l)merge(r,1,leftEnd,lt.join('\n'),false,8.5,'left');if(rr)merge(r,rightStart,n,rt.join('\n'),false,8.5,'left');ws.getRow(r).height=Math.max(lt.length,rt.length)*11.5+3;r++;continue}
   if(l)merge(r,1,leftEnd,l[0]+(l[0].length<16?' '.repeat(16-l[0].length):'')+': '+l[1],false,8.5,'left');if(rr)merge(r,rightStart,n,rr[0]+(rr[0]?' ':'')+': '+rr[1],false,8.5,'left');ws.getRow(r).height=13;r++}
  if(p.note.lines.length){merge(r,1,n,p.note.lines.join(' '),false,7,'left');ws.getRow(r).height=Math.max(11,p.note.lines.length*9.5);r++}
  if(p.sectionTitle){merge(r,1,n,p.sectionTitle.lines.join(' '),true,p.sectionTitle.size,'left');ws.getRow(r).height=p.sectionTitle.lines.length*p.sectionTitle.size*1.25+12;r++}
  /* kepala tabel */
  const headStart=r,rowIdx=i=>headStart+i;
  p.rowsH.forEach((h,i)=>ws.getRow(rowIdx(i)).height=h);
  for(const c of p.cells){const r0=rowIdx(c.r),r1=r0+c.rs-1,c0=c.c+1,c1=c.c+c.cs;if(r1>r0||c1>c0)ws.mergeCells(r0,c0,r1,c1);const cell=ws.getCell(r0,c0);cell.value=c.lines.join(c.rot?' ':'\n');cell.alignment={horizontal:'center',vertical:'middle',wrapText:!c.rot,textRotation:c.rot?90:0}}
  const headEnd=headStart+p.rowsH.length-1;
  for(let row=headStart;row<=headEnd;row++)for(let col=1;col<=n;col++){const c=ws.getCell(row,col);c.font={name:'Arial',size:p.size,bold:true};c.fill=fillPale;c.border=border}
  for(const c of p.cells)if(c.gs)ws.getCell(headStart+c.r,c.c+1).font={name:'Arial',size:c.gs,bold:true};
  r=headEnd+1;const dataStart=r;
  const printRows=p.singlePage?p.rows.flatMap(row=>{const count=Math.max(...row.cells.map(c=>c.lines.length)),limit=Math.max(1,Math.floor(370/p.lh));if(count<=limit)return [row];return Array.from({length:Math.ceil(count/limit)},(_,i)=>({...row,continuation:i>0,cells:row.cells.map(c=>({...c,lines:c.lines.slice(i*limit,(i+1)*limit)})),height:Math.min(limit,count-i*limit)*p.lh+p.size*.5}))}):p.rows;
  for(const row of printRows){ws.getRow(r).height=row.height+1;for(const c of row.cells){const c0=c.c+1,c1=c.c+c.cs;if(c1>c0)ws.mergeCells(r,c0,r,c1);const cell=ws.getCell(r,c0);const numeric=typeof c.raw==='number'&&!row.continuation&&!row.foot;cell.value=numeric?c.raw:c.lines.join('\n');cell.alignment={vertical:'middle',wrapText:true,horizontal:c.right?'right':c.center?'center':'left'};cell.numFmt=numeric?'0.##':'@'}
   for(let col=1;col<=n;col++){const cell=ws.getCell(r,col),src=row.cells.find(c=>col-1>=c.c&&col-1<c.c+c.cs);cell.font={name:'Arial',size:p.size,bold:!!src?.bold};cell.border=border;if(src?.bg)cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF'+src.bg}};else if(src?.fill)cell.fill=fillPale;else if(src?.shade)cell.fill=fillGrey}
   r++}
  const dataEnd=r-1;
  for(const h of p.holidays){
   const col=h.c+1,last=dataStart+h.rowSpan-1;
   if(last>dataStart)ws.mergeCells(dataStart,col,last,col);
   const cell=ws.getCell(dataStart,col);cell.value=h.lines.join('\n');
   cell.font={name:'Arial',size:h.size,bold:true};cell.fill=fillGrey;cell.border=border;
   cell.alignment={horizontal:'center',vertical:'middle',textRotation:90,wrapText:true};
  }
  /* ringkasan + tanda tangan */
  ws.getRow(r++).height=10;
  if(p.summary){const s=p.summary,k=Math.max(s.left.length,s.right.length);for(let i=0;i<k;i++){if(s.left[i])merge(r,1,leftEnd,s.left[i][0].padEnd(22,' ')+': '+s.left[i][1],false,p.size+.6,'left');if(s.right[i])merge(r,Math.max(leftEnd+1,Math.floor(n/2)),n,s.right[i][0].padEnd(8,' ')+': '+s.right[i][1],false,p.size+.6,'left');ws.getRow(r).height=13;r++}if(s.textLines){merge(r,1,n,s.textLines.join(' '),false,p.size+.6,'left');ws.getRow(r).height=Math.max(13,s.textLines.length*(p.size+.6)*1.3+3);r++}ws.getRow(r++).height=8}
  if(p.showSign){const e1=Math.min(n-2,Math.max(1,p.xs.findIndex((x,c)=>c>0&&x>=p.width*.33))),s3=Math.max(e1+2,Math.min(n,1+p.xs.findIndex((x,c)=>c>0&&x>=p.width*.6))),rng=p.signs.length===3?[[1,e1],[e1+1,s3-1],[s3,n]]:[[1,leftEnd],[Math.max(leftEnd+1,Math.min(n,rightStart)),n]];
   const rowStart=r;for(let i=0;i<p.signs[0].lines.length;i++){let h=1;p.signs.forEach((g,k)=>{const [a0,a1]=rng[k],w=p.xs[a1]-p.xs[a0-1]-8,t=L.wrap(g.lines[i].join(' '),w,9,i===5);merge(r,a0,a1,t.join('\n'),i===5,9,'center',i===5?{underline:true}:{});h=Math.max(h,t.length)});ws.getRow(r).height=h*12;r++}
   p.signs.forEach((g,k)=>{const m=(g.src||'').match(/^data:image\/(png|jpeg);base64,(.+)$/);if(!m||!g.img)return;const [a0,a1]=rng[k],px=c=>Math.round((ws.getColumn(c).width||8.43)*7+5);let total=0;for(let c=a0;c<=a1;c++)total+=px(c);const ih=46,sc=Math.min(total*.8/g.img.width,ih/g.img.height),iw=Math.round(g.img.width*sc),ht=Math.round(g.img.height*sc);let off=Math.max(0,(total-iw)/2),c=a0;while(c<a1&&off>=px(c)){off-=px(c);c++}const id=wb.addImage({base64:m[2],extension:m[1]==='png'?'png':'jpeg'});ws.addImage(id,{tl:{col:(c-1)+off/px(c),row:rowStart+2-1+.05},ext:{width:iw,height:ht}})})}
  ws.views=[{state:'frozen',ySplit:headEnd,showGridLines:false}];
  if(p.paper.id==='f4')(wb.f4Sheets??=[]).push(ws.id);
  ws.pageSetup={orientation:p.paper.tag.includes('portrait')?'portrait':'landscape',paperSize:p.paper.id==='a4'?9:5,fitToPage:true,fitToWidth:1,fitToHeight:1,printArea:`A1:${ws.getColumn(n).letter}${r-1}`,margins:{left:.39,right:.39,top:.39,bottom:.39,header:.15,footer:.15}};
  ws.headerFooter={oddFooter:`&LRuang Kelas | ${p.paper.tag}&R${p.label}`};
 }
 return wb;
}
async function buffer(db,scope,o={}){
 const wb=await createWorkbook(db,scope,o),bytes=await wb.xlsx.writeBuffer(),f4=new Set((wb.f4Sheets||[]).map(String));if(!f4.size)return bytes;
 const zip=await root.JSZip.loadAsync(bytes);
 for(const name of Object.keys(zip.files).filter(n=>/^xl\/worksheets\/sheet\d+\.xml$/.test(n)&&f4.has(n.match(/sheet(\d+)\.xml$/)[1]))){const xml=await zip.file(name).async('string');zip.file(name,xml.replace(/<pageSetup\b[^>]*\/>/,tag=>tag.replace(/ paperSize="[^"]*"/,'').replace('/>',' paperWidth="210mm" paperHeight="330mm"/>')));}
 return zip.generateAsync({type:'uint8array',compression:'DEFLATE'});
}
root.ReportExcel={createWorkbook,buffer};
})(typeof window==='undefined'?globalThis:window);
