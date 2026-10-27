(function(root){
const C=root.Core,X=root.ExcelCore;
const datestr=d=>d?new Date(d+'T12:00:00Z').toLocaleDateString('id-ID',{day:'2-digit',month:'short',year:'numeric',timeZone:'UTC'}):'';
const subjectHeader=name=>{
 const full=String(name).trim(),key=full.toUpperCase().replace(/\s+/g,' ');
 if(/^(ILMU PENGETAHUAN ALAM DAN SOSIAL|IPAS)(\s*\(IPAS\))?$/.test(key))return 'IPAS';
 if(/^PENDIDIKAN KEBERSIHAN DAN LINGKUNGAN HIDUP(\s*\(PKLH\))?$/.test(key))return 'PKLH';
 if(/^KODING DAN KECERDASAN ARTIFISIAL(\s*\(.*\))?$/.test(key))return 'Koding & KA';
 return full;
};
const remarks=j=>[j.remarks,j.reflection?'Refleksi: '+j.reflection:'',j.followup?'Tindak lanjut: '+j.followup:''].filter(Boolean).join('\n');
function reportSupplements(db,sid,n){
 const rows=[],p=C.period(db),extras=C.extracurriculars(db,sid),a=C.attendance(db,sid);
 const band=title=>Object.assign([title],{kind:'band',supplement:true});
 const cell=(values,spans)=>Object.assign(values,{spans,supplement:true});
 function section(title,headers,spans,values){const b=band(title),h=Object.assign(cell(headers,spans),{kind:'sub'}),blk={band:b,sub:h};rows.push(b,h,...values.map(v=>Object.assign(cell(v,spans),{blk})));}
 section('B. Ekstrakurikuler',['No.','Kegiatan ekstrakurikuler','Penilaian','Keterangan / capaian'],n===8?[1,2,3,2]:[1,1,2,1],extras.length?extras.map((r,i)=>[i+1,r.name,r.rating||'Belum dinilai',r.description||'-']):[['-','Belum ada kegiatan','-','-']]);
 section('C. Ketidakhadiran',['Keterangan','Jumlah'],[n-2,2],[['Sakit',a.S+' hari'],['Izin',a.I+' hari'],['Tanpa keterangan',a.A+' hari']]);
 section('D. Catatan Wali Kelas',['Catatan'],[n],[[db.reportNotes[p+'|'+sid+'|wali']||'-']]);
 return rows;
}
function tables(db,scope,o={}){
 if(scope==='analysis')return root.QuestionAnalysis.tables(db,o);
 const out=[],s=db.settings,p=C.period(db),st=C.active(db),month=o.month||s.start.slice(0,7),all=['dashboard','backup'].includes(scope),has=k=>all||scope===k,sub=id=>db.subjects.find(x=>x.id===id)?.name||'';
 const base=()=>({left:[['Tahun Pelajaran',s.year],['Semester',s.semester],['Kelas',s.className||'................']]}),pct=v=>(v*100).toFixed(1).replace('.',',')+'%',monthName=m=>new Date(m+'-01T12:00:00Z').toLocaleDateString('id-ID',{month:'long',timeZone:'UTC'}),
 add=(key,title,headers,rows,widths,extra={})=>out.push({key,title,headers,rows,widths,note:'',info:base(),fontSize:8.5,idCols:0,center:[],...extra});
 for(const [key,title] of [['school','DATA SEKOLAH'],['class','DATA KELAS']])if(has(key))add(key,title,['Data','Isian'],X.templateTables(db,key,{mode:'existing'}).settings.rows.map(r=>[r[2],r[1]]),[30,70]);
 if(has('subjects'))add('subjects','DAFTAR MATA PELAJARAN',['No.','Mata pelajaran'],db.subjects.map((x,i)=>[i+1,x.name]),[8,92]);
 if(has('extracurricular')){
  const rows=st.flatMap(s=>{const extras=C.extracurriculars(db,s.id);return extras.length?extras.map(r=>[s.nis,s.name,r.name,r.rating||'Belum dinilai',r.description||'-']):[[s.nis,s.name,'Belum ada kegiatan','-','-']]});
  add('extracurricular','DAFTAR NILAI EKSTRAKURIKULER',['No.','NIS','Nama murid','Kegiatan ekstrakurikuler','Penilaian','Keterangan / capaian'],rows.map((r,i)=>[i+1,...r]),[4,9,20,20,22,25],{role:'Wali Kelas',center:[0,1,4]});
 }
 if(has('students')){
  add('students','IDENTITAS PESERTA DIDIK',['No.','NIS','NISN','Nama murid','L/P','Tempat lahir','Tanggal lahir','Agama','Status'],db.students.map((x,i)=>[i+1,x.nis,x.nisn,x.name,x.gender,x.birthplace,datestr(x.birthdate),x.religion,x.active===false?'Arsip':'Aktif']),[4,8,12,25,4,15,13,11,8]);
  add('parents','DATA ORANG TUA / WALI',['No.','NIS','Nama murid','Alamat','Ayah','Pekerjaan ayah','Ibu','Pekerjaan ibu','Telepon'],db.students.map((x,i)=>[i+1,x.nis,x.name,x.address,x.father,x.fatherJob,x.mother,x.motherJob,x.phone]),[4,7,18,23,15,12,15,12,12]);
 }
 if(has('attendance')){
  const days=X.monthDates(month),holidays=days.flatMap((date,i)=>{const h=C.holiday(db,date);return h?[{c:i+3,label:(/^\s*(?:hari\s+)?libur\b/i.test(h.label)?h.label:'Libur: '+h.label).toUpperCase()}]:[]}),saved=new Map(db.attendance.filter(a=>a.date.startsWith(month+'-')&&!C.holiday(db,a.date)).map(a=>[a.studentId+'|'+a.date,a.status])),pupils=db.students.filter(x=>x.active!==false||days.some(d=>saved.has(x.id+'|'+d)));
  const stats=pupils.map(x=>C.attendance(db,x.id,days[0],days.at(-1))),sum=k=>stats.reduce((v,a)=>v+a[k],0),dayH=days.map(d=>pupils.filter(x=>saved.get(x.id+'|'+d)==='H').length),dayN=days.map(d=>pupils.filter(x=>saved.has(x.id+'|'+d)).length),total=sum('H')+sum('S')+sum('I')+sum('A'),effective=dayN.filter(v=>v>0).length;
  const nd=days.length,dow=d=>['M','Sn','Sl','R','K','J','Sa'][new Date(d+'T12:00:00Z').getUTCDay()];
  add('attendance','DAFTAR HADIR PESERTA DIDIK',['No.','NIS','Nama murid',...days.map(d=>dow(d)+'\n'+Number(d.slice(8))),'Sakit','Izin','Tanpa Keterangan','Hadir','%'],pupils.map((x,i)=>{const a=stats[i];return[i+1,x.nis,x.name+(x.active===false?' (arsip)':''),...days.map(d=>saved.get(x.id+'|'+d)||''),a.S,a.I,a.A,a.H,a.percent===null?'':a.percent.toFixed(1).replace('.',',')+'%']}),[4,10,38,...days.map(()=>3.7),6,6,12.5,6,9],{holidays,fontSize:7.4,idCols:3,center:[0,1,...Array.from({length:nd+5},(_,i)=>i+3)],info:{left:[['Kelas',s.className||'................'],['Tahun Pelajaran',s.year]],right:[['Bulan',monthName(month)],['Tahun',month.slice(0,4)]]},
   groups:[{start:3,span:nd,label:'TANGGAL KEHADIRAN'},{start:3+nd,span:5,label:'REKAPITULASI'}],
   foot:[{span0:3,label:'Jumlah hadir',cells:[...dayH.map((v,i)=>dayN[i]?v:''),sum('S'),sum('I'),sum('A'),sum('H'),'']},{span0:3,label:'Persentase hadir (%)',cells:[...dayH.map((v,i)=>dayN[i]?String(Math.round(100*v/dayN[i])):''),total?pct(sum('S')/total):'',total?pct(sum('I')/total):'',total?pct(sum('A')/total):'',total?pct(sum('H')/total):'','']}],
   summary:{left:[['Jumlah Hari Efektif',effective],['Jumlah Siswa',pupils.length]],chart:[['Hadir',sum('H'),total?pct(sum('H')/total):'0%',[.13,.55,.38]],['Sakit',sum('S'),total?pct(sum('S')/total):'0%',[.93,.68,.12]],['Izin',sum('I'),total?pct(sum('I')/total):'0%',[.24,.49,.84]],['Alpa',sum('A'),total?pct(sum('A')/total):'0%',[.84,.25,.25]]],right:[['Sakit',sum('S')+(total?' ('+pct(sum('S')/total)+')':'')],['Ijin',sum('I')+(total?' ('+pct(sum('I')/total)+')':'')],['Alpa',sum('A')+(total?' ('+pct(sum('A')/total)+')':'')]]},
   note:'H = Hadir | S = Sakit | I = Izin | A = Alpa. Kosong = belum dicatat / hari libur. Persentase hadir dihitung dari catatan yang terisi.',weekend:days.map((d,i)=>[0,6].includes(new Date(d+'T12:00:00Z').getUTCDay())?i+3:-1).filter(i=>i>=0)});
 }
 if(has('grades')){
  const period=o.gradeRange==='review'?'review':p,list=db.assessments.filter(a=>a.period===period&&(!o.subjectId||o.subjectId==='all'||a.subjectId===o.subjectId)&&(!o.type||o.type==='all'||a.type===o.type));
  const th=Math.max(0,Math.min(100,Number(s.threshold)||65)),good=Math.min(99,th+11),great=Math.min(100,th+21),criteria=[['Kriteria Ketercapaian',great+' s/d 100  Sangat Baik'],['Tujuan Pembelajaran',good+' s/d '+(great-1)+'  Baik'],['',th+' s/d '+(good-1)+'  Cukup'],['','0 s/d '+(th-1)+'  Kurang']];
  /* TP berjajar sebagai kelompok kolom; kegiatan kosong tidak dicetak. */
  const paperW=(o.paper==='f4'?330*72/25.4:o.paper==='a4'?210*72/25.4:1008)-56,
   idW=[24,155,52],available=paperW-idW.reduce((a,b)=>a+b,0),activityW=52,averageW=32,
   maxItems=Math.max(1,Math.floor((available-averageW)/activityW)),
   filled=a=>db.students.some(x=>Number.isFinite(a.scores[x.id]));
  for(const subj of db.subjects)for(const [type,label] of Object.entries(C.types)){
   const original=list.filter(a=>a.subjectId===subj.id&&a.type===type),selected=original.filter(filled);if(!selected.length)continue;
   const pupils=db.students.filter(x=>x.active!==false||selected.some(a=>Number.isFinite(a.scores[x.id]))),parts=[];
   let chunk=[],used=0;
   for(const tp of [...new Set(selected.map(a=>a.tp))]){
    const values=selected.filter(a=>a.tp===tp),allValues=original.filter(a=>a.tp===tp);
    for(let offset=0;offset<values.length;offset+=maxItems){
     const items=values.slice(offset,offset+maxItems),w=items.length*activityW+averageW;
     if(chunk.length&&used+w>available){parts.push(chunk);chunk=[];used=0}
     chunk.push({tp,items,allValues,offset});used+=w;
    }
   }
   if(chunk.length)parts.push(chunk);
   parts.forEach((blocks,part)=>{
    const headers=['No.','Nama siswa','NIS'],widths=[...idW],groups=[],nr=[];
    blocks.forEach(b=>{
     const title=(/^\s*TP\b/i.test(b.tp||'')?'':'TP: ')+(b.tp||'-')+(b.offset?' (lanjutan)':'');
     groups.push({start:headers.length,span:b.items.length+1,label:title});
     headers.push(...b.items.map((a,i)=>a.label||('Kegiatan '+(b.offset+i+1))),'NR');
     widths.push(...b.items.map(()=>activityW),averageW);nr.push(headers.length-1);
    });
    const rows=pupils.map((x,i)=>[i+1,x.name,x.nis,...blocks.flatMap(b=>[
     ...b.items.map(a=>Number.isFinite(a.scores[x.id])?a.scores[x.id]:''),
     b.allValues.every(a=>Number.isFinite(a.scores[x.id]))?Math.round(C.mean(b.allValues.map(a=>a.scores[x.id]))):''
    ])]);
    const info={left:[...base().left,['Mata Pelajaran',subj.name],...(parts.length>1?[['Bagian',(part+1)+' dari '+parts.length]]:[])],right:criteria};
    add('grades-'+subj.id+'-'+type+'-'+part,'ASESMEN '+label.toUpperCase()+' PESERTA DIDIK',headers,rows,widths,{
     fontSize:8,headerSize:7,groupSize:7,idCols:3,center:[0,2,...Array.from({length:headers.length-3},(_,i)=>i+3)],boldCols:nr,weekend:nr,
     banner:'DAFTAR NILAI ASESMEN '+label.toUpperCase()+' PER TUJUAN PEMBELAJARAN',groups,info,
     note:(period==='review'?'Kelompok: Perlu ditinjau. ':'')+'TP disusun ke samping. Hanya kegiatan dengan setidaknya satu nilai ditampilkan. Nilai 0 tetap dihitung; kosong berarti belum dinilai. NR = rata-rata TP (dibulatkan), tampil setelah seluruh kegiatan pada TP lengkap, termasuk kegiatan yang belum terisi.'
    });
   });
  }
  if(!out.some(t=>t.key.startsWith('grades-')))add('grades','DAFTAR NILAI ASESMEN',['No.','NIS','Nama murid','Tujuan pembelajaran','Nilai'],[],[5,12,28,45,10],{note:'Belum ada kegiatan dengan nilai terisi pada pilihan mapel, jenis, atau periode ini.'});
 }
 if(has('journal')){
  const monthly=!all&&o.journalRange!=='semester',list=db.journals.filter(j=>j.period===p&&(!monthly||j.date.startsWith(month+'-'))).sort((a,b)=>a.date.localeCompare(b.date));
  add('journal','JURNAL KEGIATAN BELAJAR MENGAJAR (KBM)',['Tanggal','Mata pelajaran','Tujuan pembelajaran','Rincian kegiatan pembelajaran','Media pembelajaran','Asesmen','Keterangan'],list.map(j=>[datestr(j.date),sub(j.subjectId)+'\n'+j.jp+' JP',j.tp,j.activity,j.media||'',j.assessment||'',remarks(j)]),[10,12,20,26,11,10,13],{fontSize:8.5,info:{left:[...base().left,['Pengajar',s.teacher||'................']],right:monthly?[['Bulan',monthName(month)],['Tahun',month.slice(0,4)]]:[['Cakupan','Seluruh semester aktif']]},note:list.length+' pertemuan | '+list.reduce((v,j)=>v+j.jp,0)+' JP. Refleksi dan tindak lanjut tersimpan dicantumkan pada Keterangan.'});
 }
 if(has('reports')&&!all&&o.kind==='recap'){
  const component=['sts','sas'].includes(o.recapComponent)?o.recapComponent:'combined',single=component!=='combined',label=single?(component==='sts'?'TENGAH SEMESTER (STS)':'AKHIR SEMESTER (SAS)'):'RAPOR',
   subs=db.subjects,res=st.map(x=>subs.map(sb=>C.result(db,x.id,sb.id))),vals=res.map(r=>r.map(v=>single?(v.categories[component]===null?null:Math.round(v.categories[component])):v.value)),
   filled=vals.map(v=>v.filter(n=>n!==null)),total=filled.map(f=>f.length?f.reduce((a,b)=>a+b,0):null),exact=filled.map(f=>f.length?f.reduce((a,b)=>a+b,0)/f.length:null),avg=exact.map(m=>m===null?null:Math.round(m)),rank=exact.map(m=>m===null?'':1+exact.filter(u=>u!==null&&u>m).length),
   th=Math.max(0,Math.min(100,Number(s.threshold)||65)),good=Math.min(99,th+11),great=Math.min(100,th+21),criteria=[['Kriteria Ketercapaian',great+' s/d 100  Sangat Baik'],['Tujuan Pembelajaran',good+' s/d '+(great-1)+'  Baik'],['',th+' s/d '+(good-1)+'  Cukup'],['','0 s/d '+(th-1)+'  Kurang']],
   sem=s.semester==='2'?'GENAP':'GANJIL',kelas=(s.className||'................').toUpperCase(),dash=v=>v===null||v===undefined?'':v,
   stat=(arr,f)=>{const a=arr.filter(v=>v!==null&&v!==undefined&&v!=='');return a.length?f(a):''},sum=a=>a.reduce((x,y)=>x+y,0),
   note=single?'Nilai '+label+' = rata-rata dalam TP, lalu antar-TP, dibulatkan. Hanya asesmen '+component.toUpperCase()+' pada semester aktif yang dihitung; nilai kosong bukan nol. Jumlah, rata-rata, dan peringkat berdasarkan nilai yang tersedia.':'Nilai rapor = nilai akhir sesuai bobot ('+Object.entries(C.reportTypes).filter(([k])=>s.weights[k]>0).map(([k,v])=>v+' '+s.weights[k]+'%').join(', ')+'). Jumlah nilai, rata-rata, dan peringkat terisi otomatis dari nilai rapor mata pelajaran yang sudah ada; rata-rata dibulatkan tanpa koma. Peringkat mengikuti rata-rata (sama bila rata-rata sama). Murid tanpa satu pun nilai rapor dikosongkan; mapel yang belum lengkap tidak dihitung sebagai nol.';
  const stats=[['JUMLAH NILAI PER MATA PELAJARAN',a=>sum(a)],['NILAI TERTINGGI PER MATA PELAJARAN',a=>Math.max(...a)],['NILAI TERENDAH PER MATA PELAJARAN',a=>Math.min(...a)],['RATA-RATA PER MATA PELAJARAN',a=>Math.round(sum(a)/a.length)]];
  const nS=subs.length,tailIdx=[4+nS,5+nS,6+nS],
   shortNames=subs.filter(sb=>subjectHeader(sb.name)!==sb.name.trim()).map(sb=>subjectHeader(sb.name)+' = '+sb.name),
   subjectNote=shortNames.length?'\nSingkatan mapel: '+shortNames.join('; ')+'.':'';
  add(single?'recap-'+component:'recap-nilai','REKAPITULASI NILAI '+label+' SEMESTER '+sem+'\nKELAS '+kelas+'\nTAHUN PELAJARAN '+s.year,['No.','Nama siswa','NIS','NISN',...subs.map(x=>subjectHeader(x.name)),'JUMLAH NILAI','RATA-RATA','PERINGKAT'],
   st.map((x,i)=>[i+1,x.name,x.nis,x.nisn,...vals[i].map(dash),dash(total[i]),dash(avg[i]),rank[i]]),[3,20,5,8,...subs.map(()=>6),6,6,6.5],
   {idCols:4,tailCols:3,rotate:true,banner:'MATA PELAJARAN (MAPEL)',center:[0,2,3],boldCols:tailIdx,weekend:tailIdx,fontSize:nS>9?7.8:8.5,headerSize:7,headerMinSize:6,headerMaxLines:3,info:{left:[],right:[]},note:note+subjectNote,
    foot:st.length&&nS?stats.map(([label,f],k)=>({span0:4,label,cells:[...subs.map((_,j)=>stat(vals.map(v=>v[j]),f)),stat(total,f),stat(avg,f),'']})):[]});
  if(single)return out;
  const cats=Object.keys(C.reportTypes).filter(k=>s.weights[k]>0),abbr={formative:'FORM',sumative:'TP',sts:'STS',sas:'SAS',discipline:'Kedisiplinan',attitude:'Sikap /100'},paperW=(o.paper==='f4'?330*72/25.4:1008)-56,per=cats.length+1,
   idW=[22,112,40],tailW=36,G=Math.max(62,per*18),K0=Math.max(1,Math.floor((paperW-idW.reduce((a,b)=>a+b,0)-3*tailW)/G)),nParts=Math.max(1,Math.ceil(nS/K0)),K=Math.max(1,Math.ceil(nS/nParts)),parts=[];
  for(let i=0;i<nS;i+=K)parts.push(subs.slice(i,i+K));if(!parts.length)parts.push([]);
  parts.forEach((chunk,part)=>{
   const last=part===parts.length-1,headers=['No.','Nama siswa','NIS'],groups=[],nr=[];
   chunk.forEach(sb=>{groups.push({start:headers.length,span:cats.length+1,label:subjectHeader(sb.name)});headers.push(...cats.map(k=>abbr[k]),'NR');nr.push(headers.length-1)});
   const nc=headers.length;if(last)headers.push('JUMLAH NILAI','RATA-RATA','PERINGKAT');
   const bold=[...nr,...(last?[nc,nc+1,nc+2]:[])];
   add('recap-olah-'+part,'REKAPITULASI PENGOLAHAN NILAI RAPOR SEMESTER '+sem,headers,st.map((x,i)=>[i+1,x.name,x.nis,...chunk.flatMap(sb=>{const r=res[i][subs.indexOf(sb)];return[...cats.map(k=>r.categories[k]===null?'':Math.round(r.categories[k])),dash(r.value)]}),...(last?[dash(total[i]),dash(avg[i]),rank[i]]:[])]),[...idW,...Array.from({length:nc-3},()=>(paperW-idW.reduce((a,b)=>a+b,0)-(last?3*tailW:0))/Math.max(1,nc-3)),...(last?[tailW,tailW,tailW]:[])],
    {idCols:3,tailCols:last?3:0,rotate:true,rotFit:true,groupSize:7,groupMinSize:6,groupMax:3,banner:'PENGOLAHAN NILAI RAPOR',groups,center:[0,2],boldCols:bold,weekend:bold,fontSize:8,info:{left:[...base().left.slice(0,1),['Semester',sem],['Kelas',s.className||'................'],...(parts.length>1?[['Bagian',(part+1)+' dari '+parts.length]]:[])],right:criteria},note:'FORM = formatif; TP = sumatif tujuan pembelajaran; STS = sumatif tengah semester; SAS = sumatif akhir semester; NR = nilai rapor. Nilai kategori = rata-rata dalam TP, lalu antar-TP (dibulatkan). Hanya kategori berbobot yang ditampilkan.'+subjectNote});
  });
 }else if(has('reports')){
  const comp=!all&&C.types[o.component]?o.component:'combined',pick=all||!o.studentId||o.studentId==='all'?st:st.filter(x=>x.id===o.studentId),
   th=Math.max(0,Math.min(100,Number(s.threshold)||65)),good=Math.min(99,th+11),great=Math.min(100,th+21),grade=v=>v>=great?'Sangat Baik':v>=good?'Baik':v>=th?'Cukup':'Kurang',
   weights='Bobot: '+Object.entries(C.types).map(([k,v])=>v+' '+s.weights[k]+'%').join(' | ')+'. Nilai kategori = rata-rata dalam TP, lalu rata-rata antar-TP. Nilai akhir dibulatkan; kategori berbobot yang belum lengkap tidak dihitung sebagai nol. Deskripsi perlu ditinjau guru.',
   single='Nilai '+C.types[comp]+' = rata-rata nilai dalam TP, lalu rata-rata antar-TP, dibulatkan. Capaian: Sangat Baik '+great+'-100 | Baik '+good+'-'+(great-1)+' | Cukup '+th+'-'+(good-1)+' | Kurang 0-'+(th-1)+'. Deskripsi perlu ditinjau guru.',
   title=comp==='combined'?'LAPORAN HASIL BELAJAR - NILAI AKHIR GABUNGAN':'LAPORAN HASIL BELAJAR - ASESMEN '+C.types[comp].toUpperCase(),
   rapor={paper:'a4',role:'Wali Kelas',ownPages:true,singlePage:comp!=='combined'||o.reportPagination==='single',fontSize:9,center:comp==='combined'?[0,2,3,4,5,6]:[0,2,3]};
  for(const pupil of pick){
   const a=C.attendance(db,pupil.id),wali=db.reportNotes[p+'|'+pupil.id+'|wali']||'',
    rows=db.subjects.map((subj,i)=>{
     const r=C.result(db,pupil.id,subj.id);
     if(comp==='combined')return[i+1,subj.name,...Object.keys(C.types).map(k=>r.categories[k]===null?'':Number(r.categories[k].toFixed(2))),r.value??'Belum lengkap',(['sts','sumative'].includes(o.descriptionSource)?o.description?.(pupil.id,subj.id,o.descriptionSource):db.reportNotes[p+'|'+pupil.id+'|'+subj.id]||o.description?.(pupil.id,subj.id,'sumative'))||''];
     const v=r.categories[comp],incomplete=v!==null&&r.categoryIncomplete[comp];
     return[i+1,subj.name,v===null?'':Math.round(v),v===null?'Belum ada nilai':grade(Math.round(v))+(incomplete?' (belum lengkap)':''),o.description?.(pupil.id,subj.id,comp)||'']});
   add('rapor-'+pupil.id,title,comp==='combined'?['No.','Mata pelajaran',...Object.values(C.types),'Nilai akhir','Deskripsi capaian']:['No.','Mata pelajaran','Nilai','Capaian','Deskripsi capaian'],rows,comp==='combined'?[4,16,9,9,10,10,9,43]:[4,22,14,15,45],
    {...rapor,sheet:pupil.name,parent:'',info:{left:[['Nama murid',pupil.name],['NIS / NISN',pupil.nis+(pupil.nisn?' / '+pupil.nisn:'')],['Kelas',s.className||'................']],right:[['Tahun Pelajaran',s.year],['Semester',s.semester]]},note:'',summaryNear:true,
     sectionTitle:'A. Nilai dan Capaian Kompetensi', supplements:reportSupplements(db,pupil.id,comp==='combined'?8:5)});
  }
  if(!pick.length)add('rapor-kosong',title,['No.','Mata pelajaran','Nilai','Capaian','Deskripsi capaian'],[],[4,22,14,15,45],{...rapor,note:'Belum ada murid aktif untuk diolah.'});
  if(all)add('report-notes','CATATAN WALI KELAS DAN KEHADIRAN',['NIS','Nama murid','Hadir','Sakit','Izin','Alpa','Catatan wali kelas'],st.map(x=>{const a=C.attendance(db,x.id);return[x.nis,x.name,a.H,a.S,a.I,a.A,db.reportNotes[p+'|'+x.id+'|wali']||'']}),[10,25,7,7,7,7,45],{paper:'a4',role:'Wali Kelas',note:'Rentang rekap kehadiran: '+datestr(s.start)+' s.d. '+datestr(s.end)});
 }
 if(scope==='competency'||all&&(db.competencyScores||[]).some(r=>r.period===p)){
  const dims=Object.keys(C.dimensions),ctx=root.Competency.context(db),phase=root.Competency.phase(ctx);
  add('competency','NILAI SIKAP DAN KEDISIPLINAN',['No.','NIS','Nama murid','Kedisiplinan\n(0–100)',...Object.values(C.dimensions).map(v=>v+'\n(1–5)'),'Rerata sikap\n(1–5)','Sikap\n(0–100)'],st.map((x,i)=>{const r=C.optionalRecord(db,x.id),v=C.optionalResult(db,x.id);return [i+1,x.nis,x.name,v.discipline??'',...dims.map(k=>r?.attitudes?.[k]??''),v.average===null?'':Number(v.average.toFixed(2)),v.attitude===null?'':Number(v.attitude.toFixed(2))]}),[4,9,26,12,...dims.map(()=>10),10,10],{fontSize:8,headerSize:6.8,idCols:3,center:[0,...Array.from({length:11},(_,i)=>i+3)],info:{left:[...base().left,['Jenjang / fase',ctx?ctx.level+' / '+phase:'Belum dipilih']],right:[]}});
  const notes=st.filter(x=>C.optionalRecord(db,x.id)?.note);
  if(notes.length)add('competency-notes','CATATAN PENGAMATAN SIKAP DAN KEDISIPLINAN',['No.','NIS','Nama murid','Catatan pengamatan'],notes.map((x,i)=>[i+1,x.nis,x.name,C.optionalRecord(db,x.id).note]),[4,10,26,60]);
 }
 if(has('settings'))add('settings','PENGATURAN PENGOLAHAN NILAI',['Pengaturan','Nilai'],[...Object.entries(C.reportTypes).map(([k,v])=>['Bobot '+v+' (%)',s.weights[k]??0]),['Batas ketercapaian',s.threshold]],[70,30],{note:'Rata-rata dalam TP, lalu rata-rata antar-TP, kemudian bobot kategori. Nilai akhir dibulatkan; nilai kosong bukan nol.'});
 if(!out.length)throw Error('Halaman laporan tidak dikenali.');return out;
}
root.ReportData={tables,datestr,remarks};
})(typeof window==='undefined'?globalThis:window);
