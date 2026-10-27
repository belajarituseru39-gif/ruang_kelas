(function(root){
'use strict';
const assessmentTypes={sumative:'Asesmen TP',sts:'Sumatif Tengah Semester',sas:'Sumatif Akhir Semester'};
const stateNames={correct:'Benar',wrong:'Salah',unanswered:'Tidak dijawab',partial:'Sebagian benar',ungraded:'Belum dinilai'};
const value=c=>{const v=c?.value;if(v==null)return '';if(typeof v==='object'){if(v.error)throw Error('Sel '+c.address+' mengandung kesalahan rumus.');if('formula'in v||'sharedFormula'in v){if(v.result===undefined)throw Error('Hasil rumus '+c.address+' belum tersimpan. Hitung dan simpan ulang Excel.');return v.result??''}if(v.richText)return v.richText.map(r=>r.text).join('');if('text'in v)return v.text}return v};
const text=c=>String(value(c)).trim(),norm=s=>String(s??'').normalize('NFKC').trim().toLocaleLowerCase('id-ID').replace(/\s+/g,' ');
const number=(v,label)=>{if(v===''||v==null||typeof v==='boolean')throw Error(label+' wajib berupa angka.');const n=typeof v==='number'?v:Number(String(v).replace(',','.'));if(!Number.isFinite(n))throw Error(label+' bukan angka yang valid.');return n};
const compare=new Intl.Collator('id',{numeric:true,sensitivity:'base'}).compare;
function validate(a){
 const fail=m=>{throw Error('Analisis soal: '+m)};
 if(!a||typeof a.id!=='string'||!a.id||!/^\d{4}\/\d{4}\|[12]$/.test(a.period))fail('identitas/periode tidak valid.');
 for(const k of ['title','subject','className','date','sourceName','sourceKind'])if(typeof a[k]!=='string'||a[k].length>500)fail('isian '+k+' tidak valid.');
 if(a.assessmentType!==undefined&&!Object.hasOwn(assessmentTypes,a.assessmentType))fail('jenis asesmen tidak valid.');
 if(!a.title.trim()||!a.subject.trim())fail('judul dan mata pelajaran wajib diisi.');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(a.date)||isNaN(Date.parse(a.date))||new Date(a.date).toISOString().slice(0,10)!==a.date)fail('tanggal tidak valid.');
 if(!Number.isFinite(a.threshold)||a.threshold<0||a.threshold>100||!Number.isFinite(a.hardLimit)||!Number.isFinite(a.easyLimit)||a.hardLimit<0||a.hardLimit>=a.easyLimit||a.easyLimit>=100)fail('batas nilai/kesukaran tidak valid.');
 if(!Array.isArray(a.questions)||!a.questions.length||a.questions.length>200||!Array.isArray(a.participants)||!a.participants.length||a.participants.length>1000)fail('maksimal 200 soal dan 1.000 peserta/percobaan.');
 if(!Array.isArray(a.warnings)||a.warnings.some(x=>typeof x!=='string'||x.length>2000))fail('catatan sumber tidak valid.');
 const qids=new Set(),pids=new Set(),numbers=new Set();
 for(const q of a.questions){if(!q||typeof q.id!=='string'||qids.has(q.id)||typeof q.number!=='string'||!q.number||q.number.length>20||numbers.has(q.number)||typeof q.text!=='string'||q.text.length>20000||typeof q.type!=='string'||q.type.length>120||!Number.isFinite(q.max)||q.max<=0||q.max>1000)fail('nomor, teks, atau skor maksimum soal tidak valid.');qids.add(q.id);numbers.add(q.number)}
 for(const p of a.participants){if(!p||typeof p.id!=='string'||pids.has(p.id)||typeof p.name!=='string'||!p.name.trim()||p.name.length>300||typeof p.sourceLabel!=='string'||p.sourceLabel.length>500||typeof p.included!=='boolean'||typeof p.listed!=='boolean')fail('peserta tidak valid/duplikat.');pids.add(p.id);
  for(const k of ['scores','states','answers'])if(!Array.isArray(p[k])||p[k].length!==a.questions.length)fail('jumlah skor peserta tidak cocok.');
  p.scores.forEach((s,i)=>{if(s!==null&&(!Number.isFinite(s)||s<0||s>1))fail('skor harus 0 sampai skor maksimum.');if(!Object.hasOwn(stateNames,p.states[i])||typeof p.answers[i]!=='string'||p.answers[i].length>20000)fail('jawaban/status tidak valid.');const st=p.states[i];if((s===null)!==(st==='ungraded')||(st==='correct'&&s!==1)||(['wrong','unanswered'].includes(st)&&s!==0)||(st==='partial'&&!(s>0&&s<1)))fail('skor dan status jawaban tidak sesuai.')});
 }
 return a;
}
function analyze(a){
 validate(a);const questions=a.questions,max=questions.reduce((v,q)=>v+q.max,0);
 const participants=a.participants.filter(p=>p.included).map(p=>{
  const complete=p.scores.every(s=>s!==null),total=p.scores.reduce((v,s,i)=>v+(s??0)*questions[i].max,0);
  return {...p,total:complete?total:null,value:complete?100*total/max:null,missing:p.scores.filter(s=>s===null).length};
 }).sort((a,b)=>compare(a.name,b.name)||compare(a.sourceLabel,b.sourceLabel)||compare(a.id,b.id));
 participants.forEach(p=>p.rank=p.value===null?null:1+participants.filter(x=>x.value!==null&&x.value>p.value+1e-9).length);
 const n=participants.length,items=questions.map((q,i)=>{
  const counts=Object.fromEntries(Object.keys(stateNames).map(k=>[k,0])),answers=new Map();let total=0;
  participants.forEach(p=>{counts[p.states[i]]++;if(p.scores[i]!==null)total+=p.scores[i];const key=p.answers[i]||'('+stateNames[p.states[i]]+')';answers.set(key,(answers.get(key)||0)+1)});
  const index=n&&!counts.ungraded?total/n:null;
  return {...q,...counts,index,percentCorrect:n?100*counts.correct/n:null,percentWrong:n?100*counts.wrong/n:null,
   difficulty:index===null?'Belum lengkap':index*100<=a.hardLimit+1e-9?'SK':index*100<=a.easyLimit+1e-9?'SD':'M',
   answers:[...answers].map(([answer,count])=>({answer,count})).sort((a,b)=>b.count-a.count||compare(a.answer,b.answer))};
 });
 const valid=participants.filter(p=>p.value!==null),values=valid.map(p=>p.value),average=values.length?values.reduce((a,b)=>a+b,0)/values.length:null;
 return {participants,items,n,max,complete:valid.length,incomplete:n-valid.length,average,highest:values.length?Math.max(...values):null,lowest:values.length?Math.min(...values):null,mastered:valid.filter(p=>p.value+1e-9>=a.threshold).length,absorption:valid.length===n?average:null};
}
async function readWorkbook(buffer,filename){
 const wb=new root.ExcelJS.Workbook();await wb.xlsx.load(buffer);
 const overall=wb.worksheets.find(s=>norm(text(s.getCell(1,2)))==='pertanyaan'&&norm(text(s.getCell(1,7)))==='benar'&&norm(text(s.getCell(1,12)))==='tidak dijawab');
 if(overall)return readQuiz(wb,overall,filename);
 const matrix=wb.worksheets.find(s=>norm(text(s.getCell(1,2)))==='nama peserta'&&norm(text(s.getCell(2,2)))==='skor maksimum');
 if(matrix)return readMatrix(matrix,filename);
 throw Error('Format belum dikenali. Gunakan ekspor Excel dengan lembar Keseluruhan dan Data Peserta seperti contoh, atau template Analisis Soal dari aplikasi.');
}
function base(filename){return {sourceName:filename,sourceKind:'',title:filename.replace(/\.xlsx$/i,'').replace(/[-_]\d{4}-\d{2}-\d{2}T.*$/,'').replace(/([a-z])([A-Z])/g,'$1 $2').replace(/([A-Z])([A-Z][a-z])/g,'$1 $2').slice(0,160),questions:[],participants:[],warnings:[]}}
function readQuiz(wb,s,filename){
 const a=base(filename);a.sourceKind='Ekspor kuis';const headers=[];
 for(let c=13;c<=s.columnCount;c++){const label=text(s.getCell(1,c));if(label)headers.push({c,label,player:label.replace(/\s+\([^]*\)\s*$/,'').trim()})}
 if(!headers.length||headers.length>1000)throw Error('Jumlah kolom peserta tidak valid (1-1.000).');
 const participantsSheet=wb.worksheets.find(w=>norm(text(w.getCell(1,4)))==='player name'),listed=new Set();
 if(participantsSheet)for(let r=2;r<=participantsSheet.rowCount;r++)if(Number.isFinite(value(participantsSheet.getCell(r,1)))){const label=text(participantsSheet.getCell(r,4));if(listed.has(label))a.warnings.push('Nama percobaan berulang di Data Peserta: '+label);listed.add(label)}
 const uniquePlayers=new Set(headers.map(h=>h.player));if(uniquePlayers.size!==headers.length)throw Error('Nama kolom percobaan tidak unik. Gunakan template untuk memberi identitas percobaan yang berbeda.');
 const missing=[...listed].filter(p=>!uniquePlayers.has(p));if(missing.length)a.warnings.push('Nama Data Peserta yang belum cocok dengan kolom jawaban: '+missing.join(', ')+'. Pilih percobaan yang sesuai secara manual pada tab Pilih peserta; nama tidak dicocokkan secara perkiraan.');
 a.participants=headers.map((h,i)=>({id:'p'+(i+1),name:h.player,sourceLabel:h.label,listed:listed.has(h.player),included:listed.size?listed.has(h.player):true,scores:[],states:[],answers:[]}));
 let unknown=0,partial=0;
 for(let r=2;r<=s.rowCount;r++){
  const nr=value(s.getCell(r,1));if(!Number.isInteger(nr)||nr<1)continue;
  const question=text(s.getCell(r,2));if(!question)throw Error('Teks soal '+nr+' kosong.');
  const q={id:'q'+nr,number:String(nr),text:question,type:text(s.getCell(r,3))||'Soal',max:1};a.questions.push(q);
  if(a.questions.length>200)throw Error('Maksimal 200 soal per analisis.');
  const expected=[7,8,9,10,11,12].map(c=>number(value(s.getCell(r,c)),'Jumlah status soal '+nr));
  if(expected.some(n=>!Number.isInteger(n)||n<0)||expected.reduce((a,b)=>a+b,0)!==headers.length)throw Error('Jumlah status soal '+nr+' tidak cocok dengan '+headers.length+' kolom percobaan.');
  const observed={correct:0,wrong:0,unanswered:0,ungraded:0},unresolved=[];
  headers.forEach((h,i)=>{const cell=s.getCell(r,h.c),answer=text(cell),color=String(cell.fill?.fgColor?.argb||'').slice(-6).toUpperCase();let score=null,state='ungraded';
   if(answer&&color==='D9F7ED'){score=1;state='correct'}else if(answer&&color==='FCDBE3'){score=0;state='wrong'}else if(!answer&&color==='E5E5E5'){score=0;state='unanswered'}else unresolved.push(i);
   observed[state]++;a.participants[i].scores.push(score);a.participants[i].states.push(state);a.participants[i].answers.push(answer);
  });
  // Colored correctness is accepted only when it reconciles to the export's counts.
  if(observed.correct!==expected[0]||observed.wrong!==expected[3]||observed.unanswered!==expected[5]||observed.ungraded!==expected[1]+expected[2]+expected[4]){
   throw Error('Penanda benar/salah pada soal '+nr+' tidak cocok dengan rekap sumber. Warna mungkin berubah. Gunakan ekspor asli atau template dengan skor per soal.');
  }
  unknown+=unresolved.length;partial+=expected[2];
 }
 if(!a.questions.length)throw Error('Tidak ditemukan baris soal.');
 const detail=wb.worksheets.find(s=>norm(s.name)==='detail kuis');let declared=null;
 if(detail)for(let r=2;r<=detail.rowCount;r++)if(norm(text(detail.getCell(r,1)))==='peserta')declared=value(detail.getCell(r,2));
 a.sourceCounts={attempts:headers.length,listed:listed.size,matched:a.participants.filter(p=>p.listed).length,declaredParticipants:declared};
 a.warnings.push(headers.length+' percobaan ditemukan. '+(listed.size?a.participants.filter(p=>p.listed).length+' percobaan yang cocok persis dengan Data Peserta dipilih pada awalnya.':'Semua percobaan dipilih pada awalnya.')+' Periksa pilihan peserta; nama mirip dan tanda * tidak digabung otomatis.');
 if(Number.isFinite(declared)&&declared!==listed.size)a.warnings.push('Ringkasan sumber menyebut '+declared+' peserta, sedangkan Data Peserta memuat '+listed.size+' nama percobaan. Jumlah analisis mengikuti pilihan Anda.');
 a.warnings.push('Benar/salah mengikuti penanda warna dan rekap pada Excel sumber, bukan penilaian ulang isi soal atau kunci jawaban. Tidak dijawab bernilai 0. Skor permainan dan bonus waktu tidak dipakai.');
 if(unknown)a.warnings.push(unknown+' jawaban belum memiliki skor pasti'+(partial?' (termasuk sebagian benar)':'')+'. Lengkapi skor melalui Ubah skor peserta; nilai lengkap dan tingkat kesukaran menunggu skor tersebut.');
 return a;
}
function readMatrix(s,filename){
 const a=base(filename);a.sourceKind='Template skor';const cols=[];
 for(let c=3;c<=s.columnCount;c++){const nr=text(s.getCell(1,c));if(!nr)continue;const max=number(value(s.getCell(2,c)),'Skor maksimum soal '+nr);if(max<=0||max>1000)throw Error('Skor maksimum soal '+nr+' harus > 0 dan <= 1.000.');cols.push(c);a.questions.push({id:'q'+c,number:nr,text:text(s.getCell(3,c)),type:'Skor per soal',max})}
 if(!cols.length||cols.length>200)throw Error('Jumlah soal harus 1-200.');
 const hasKey=norm(text(s.getCell(4,2)))==='kunci jawaban',keys=cols.map(c=>hasKey?text(s.getCell(4,c)):'');
 for(let r=hasKey?5:4;r<=s.rowCount;r++){
  const name=text(s.getCell(r,2));if(!name) {if(cols.some(c=>text(s.getCell(r,c))))throw Error('Nama peserta pada baris '+r+' kosong.');continue}
  const p={id:'p'+r,name,sourceLabel:name,listed:true,included:true,scores:[],states:[],answers:[]};
  cols.forEach((c,i)=>{const v=value(s.getCell(r,c)),raw=String(v??'').trim();let ratio=null,state='ungraded';
   if(norm(raw)==='td'){ratio=0;state='unanswered'}
   else if(raw!==''){if(keys[i])ratio=norm(raw)===norm(keys[i])?1:0;else{const n=number(v,'Skor '+s.getCell(r,c).address);if(n<0||n>a.questions[i].max)throw Error('Skor '+s.getCell(r,c).address+' di luar 0-'+a.questions[i].max+'.');ratio=n/a.questions[i].max}state=ratio===1?'correct':ratio===0?'wrong':'partial'}
   p.scores.push(ratio);p.states.push(state);p.answers.push(keys[i]?raw:'');
  });a.participants.push(p);
 }
 if(!a.participants.length||a.participants.length>1000)throw Error('Jumlah peserta harus 1-1.000.');
 a.warnings.push('Skor kosong berarti belum dinilai; TD berarti tidak dijawab (0). Kolom dengan kunci jawaban membandingkan teks tanpa membedakan huruf besar/kecil. Kolom tanpa kunci memakai skor angka.');
 return a;
}
const fmt=v=>v===null||v===undefined?'Belum lengkap':Number(v.toFixed(2)).toLocaleString('id-ID'),pct=v=>v===null?'—':fmt(v)+'%';
function selectReports(db,current,o={}){
 if(o.analysisScope!=='all')return [current];
 const period=current.period,byId=new Map((db.questionAnalyses||[]).filter(a=>a.period===period).map(a=>[a.id,a]));
 byId.set(current.id,current);
 const result=[...byId.values()].filter(a=>o.batchType==='all'||(a.assessmentType||'sumative')===o.batchType)
  .sort((a,b)=>compare(a.subject,b.subject)||compare(a.assessmentType||'sumative',b.assessmentType||'sumative')||compare(a.date,b.date)||compare(a.title,b.title)||compare(a.id,b.id));
 if(!result.length)throw Error('Belum ada analisis untuk jenis asesmen yang dipilih pada semester ini.');
 for(const a of result){validate(a);if(!a.participants.some(p=>p.included))throw Error('Pilih peserta pada analisis '+a.subject+' ('+a.title+') terlebih dahulu.');}
 return result;
}
function tables(db,o){
 const a=o.analysis||((db.questionAnalyses||[]).find(x=>x.id===o.analysisId));if(!a)throw Error('Pilih analisis soal terlebih dahulu.');
 const r=analyze(a);if(!r.n)throw Error('Pilih setidaknya satu peserta.');
 const [year,semester]=a.period.split('|'),label=assessmentTypes[a.assessmentType||'sumative'],info={
  left:[['Kelas',a.className||'-'],['Mata pelajaran',a.subject]],
  right:[['Semester',semester==='1'?'Ganjil':'Genap'],['KKTP',String(a.threshold)]]
 };
 const items=r.items,n=items.length,widths=[24,175,...items.map(()=>24),44,40],
  headers=['No.','Nama siswa',...items.map(q=>q.number+'\n'+fmt(q.max)),'Nilai','Peringkat'],
  rows=r.participants.map((p,j)=>{
   const row=[j+1,p.name,...items.map((q,i)=>p.scores[i]===null?'?':Number((p.scores[i]*q.max).toFixed(2))),p.value===null?'Belum lengkap':Math.round(p.value),p.rank??'-'];
   row.colors={};items.forEach((q,i)=>row.colors[i+2]=p.states[i]==='correct'?'D9F7ED':p.states[i]==='wrong'?'FCDBE3':p.states[i]==='partial'?'FFF0C2':'E5E5E5');return row;
  }),
  foot=[['JUMLAH BENAR',q=>q.correct],['JUMLAH SALAH',q=>q.wrong],['PERSENTASE BENAR',q=>q.percentCorrect===null?'-':Math.round(q.percentCorrect)+'%'],['PERSENTASE SALAH',q=>q.percentWrong===null?'-':Math.round(q.percentWrong)+'%'],['TINGKAT KESUKARAN',q=>q.difficulty==='Belum lengkap'?'?':q.difficulty]]
   .map(([label,f])=>({span0:2,label,cells:[...items.map(f),'','']})),
  summary={left:[['Nilai tertinggi',r.highest===null?'Belum lengkap':Math.round(r.highest)],['Nilai terendah',r.lowest===null?'Belum lengkap':Math.round(r.lowest)],['Rata-rata',r.average===null?'Belum lengkap':Math.round(r.average)]],
   right:[['Daya serap',pct(r.absorption)],['Mencapai KKTP',r.mastered+' / '+r.n],['Belum lengkap',r.incomplete]]},
  base={info,ownPages:true,singlePage:true,fitNumeric:true,compactCells:true,role:'Guru Kelas',fontSize:o.analysisFontSize||8.5,idCols:2,tailCols:2,center:[0],note:'',summaryNear:true,
   title:'ANALISIS '+label.toUpperCase()+'\nTAHUN PELAJARAN '+year,
   headers,widths,boldCols:[n+2,n+3],banner:'NOMOR SOAL / SKOR MAKSIMUM'},
  // Keep every question on both pages. Allow extra room on page 2 for recap and signatures.
  split=Math.max(1,Math.min(r.n-1,o.analysisSplit||Math.ceil((r.n+18)/2)));
 const out=[
  {...base,key:'analisis-halaman-1',sheet:'Analisis 1',rows:rows.slice(0,split),showSign:false,reportPage:1,reportPages:2},
  {...base,key:'analisis-halaman-2',sheet:'Analisis 2',rows:rows.slice(split),foot,summary,showSign:true,reportPage:2,reportPages:2,allowEmptyRows:true}
 ];
 if(!o.analysisMatrixOnly)out.push({
  key:'analisis-per-soal',sheet:'Ringkasan soal',info,ownPages:true,role:'Guru Kelas',fontSize:8.5,
  idCols:0,tailCols:0,center:[0,2,3,4,5],note:'',summaryNear:true,
  title:'RINGKASAN ANALISIS PER SOAL\n'+label.toUpperCase()+'\nTAHUN PELAJARAN '+year,
  headers:['No.','Pertanyaan','Benar','Salah','Indeks (%)','Kesukaran','Tindak lanjut'],
  widths:[5,45,6,6,9,9,24],
  rows:r.items.map(q=>[q.number,q.text||'-',q.correct,q.wrong,q.index===null?'Belum lengkap':fmt(q.index*100),
   ({M:'Mudah',SD:'Sedang',SK:'Sukar'}[q.difficulty]||q.difficulty),recommend(q)])
 });
 return out;
}
function recommend(q){return q.ungraded?'Lengkapi skor yang belum dinilai.':q.difficulty==='SK'?'Tinjau kunci dan kejelasan soal; bahas kembali materi.':q.difficulty==='SD'?'Bahas jawaban yang sering salah.':'Gunakan untuk penguatan; siapkan soal pengayaan.'}
root.QuestionAnalysis={assessmentTypes,selectReports,validate,analyze,readWorkbook,tables,recommend,fmt,pct,stateNames};
})(typeof window==='undefined'?globalThis:window);

