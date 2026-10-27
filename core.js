(function(root){
const types={formative:'Formatif',sumative:'Sumatif TP',sts:'Tengah semester',sas:'Akhir semester'};
const dimensions={faith:'Keimanan dan Ketakwaan Kepada Tuhan YME',citizenship:'Kewargaan',reasoning:'Penalaran Kritis',creativity:'Kreativitas',collaboration:'Kolaborasi',independence:'Kemandirian',health:'Kesehatan',communication:'Komunikasi'};
const principalTitle=d=>d.settings.principalStatus==='Plt.'?'Plt. Kepala Sekolah':'Kepala Sekolah';
const reportTypes={...types,discipline:'Kehadiran (Kedisiplinan)',attitude:'Sikap'};
const optionalRecord=(d,sid)=>(d.competencyScores||[]).find(r=>r.period===period(d)&&r.studentId===sid);
function optionalResult(d,sid){const r=optionalRecord(d,sid),values=Object.keys(dimensions).map(k=>r?.attitudes?.[k]),complete=values.every(v=>Number.isInteger(v)&&v>=1&&v<=5);return {discipline:r?.discipline??null,attitude:complete?mean(values)*20:null,average:complete?mean(values):null,filled:values.filter(Number.isFinite).length};}
const mean=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:null;
const period=d=>`${d.settings.year}|${d.settings.semester}`;
const nameOrder=new Intl.Collator('id',{sensitivity:'base',numeric:true});
const sortStudents=students=>[...students].sort((a,b)=>nameOrder.compare(a.name.trim(),b.name.trim())||nameOrder.compare(a.nis,b.nis)||String(a.id).localeCompare(String(b.id)));
const active=d=>sortStudents(d.students.filter(s=>s.active!==false));
const extracurricularRatings=['Kurang','Cukup','Baik','Sangat Baik'];
const extracurriculars=(d,sid)=>(d.extracurriculars||[]).filter(r=>r.studentId===sid&&r.period===period(d));
const dateValid=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&!isNaN(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s;
// TP agama dapat berbeda antar murid. Nilai yang terisi menandai TP yang diikuti,
// bukan identitas agama. Asesmen lain dalam TP yang sama tetap harus lengkap.
const isReligionSubject=(d,subject)=>/^pendidikan agama(?:\s|$)/.test(String(d.subjects.find(s=>s.id===subject)?.name||'').normalize('NFKC').trim().toLocaleLowerCase('id-ID').replace(/\s+/g,' '));
function applicableAssessments(d,sid,subject,list){
 if(!isReligionSubject(d,subject))return list;
 const key=a=>a.tp||a.id,followed=new Set(list.filter(a=>Number.isFinite(a.scores[sid])).map(key));
 return list.filter(a=>followed.has(key(a)));
}
function result(d,sid,subject){
 const list=d.assessments.filter(a=>a.period===period(d)&&a.subjectId===subject);
 const categories={},categoryIncomplete={};let total=0,missing=[];
 for(const key of Object.keys(types)){
  const selected=applicableAssessments(d,sid,subject,list.filter(a=>a.type===key)),groups=Object.create(null);
  selected.forEach(a=>{if(typeof a.scores[sid]==='number')(groups[a.tp||a.id]??=[]).push(a.scores[sid])});
  categories[key]=mean(Object.values(groups).map(mean));
  categoryIncomplete[key]=categories[key]===null||selected.some(a=>!Number.isFinite(a.scores[sid]));
  if(d.settings.weights[key]>0){if(categoryIncomplete[key])missing.push(types[key]);else total+=categories[key]*d.settings.weights[key]/100;}
 }
 const optional=optionalResult(d,sid);
 for(const key of ['discipline','attitude']){categories[key]=optional[key];if((d.settings.weights[key]||0)>0){if(categories[key]===null)missing.push(reportTypes[key]);else total+=categories[key]*d.settings.weights[key]/100;}}
 const valid=Object.keys(reportTypes).reduce((a,k)=>a+(d.settings.weights[k]||0),0)===100;
 return {categories,categoryIncomplete,missing,value:valid&&!missing.length?Math.round(total):null};
}
const schoolDays=d=>d.settings.schoolDays===5?5:6;
const weekendHoliday=(d,date)=>{
 if(!dateValid(date))return;
 const day=new Date(date+'T12:00:00Z').getUTCDay();
 if(day===0||(day===6&&schoolDays(d)===5))return {date,label:'Hari libur',automatic:true};
};
/* Tanda akhir pekan dari tombol versi lama kini mengikuti jumlah hari sekolah. */
const legacyWeekendHoliday=h=>{
 const day=new Date(h.date+'T12:00:00Z').getUTCDay();
 return (day===6&&h.label==='Libur Sabtu')||(day===0&&h.label==='Libur Minggu');
};
const manualHolidays=d=>(d.attendanceHolidays||[]).filter(h=>!legacyWeekendHoliday(h));
const holiday=(d,date)=>(d.attendanceHolidays||[]).find(h=>h.date===date&&!legacyWeekendHoliday(h))||weekendHoliday(d,date);
function attendance(d,sid,start=d.settings.start,end=d.settings.end){const c={H:0,S:0,I:0,A:0};d.attendance.filter(a=>(!sid||a.studentId===sid)&&a.date>=start&&a.date<=end&&!holiday(d,a.date)).forEach(a=>c[a.status]++);c.total=c.H+c.S+c.I+c.A;c.percent=c.total?100*c.H/c.total:null;return c;}
function blank(){const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Makassar',year:'numeric',month:'2-digit'}).formatToParts(new Date()),year=Number(parts.find(p=>p.type==='year').value),second=Number(parts.find(p=>p.type==='month').value)<7,base=second?year-1:year;return {schemaVersion:1,settings:{school:'',npsn:'',kopLines:'',logo:'',principalSig:'',teacherSig:'',schoolAddress:'',teacher:'',teacherNip:'',principal:'',principalStatus:'Definitif',principalNip:'',city:'',className:'',schoolDays:6,year:base+'/'+(base+1),semester:second?'2':'1',start:year+(second?'-01-01':'-07-01'),end:year+(second?'-06-30':'-12-31'),weights:{formative:0,sumative:100,sts:0,sas:0,discipline:0,attitude:0},threshold:65},students:[],questionAnalyses:[],extracurriculars:[],subjects:[],attendance:[],attendanceHolidays:[],competencyScores:[],competencyContexts:{},assessments:[],journals:[],reportNotes:{},importNotes:[]};}
function validate(d){
 const fail=m=>{throw Error(m)};
 if(!d||d.schemaVersion!==1)fail('Format atau versi cadangan tidak didukung.');
 for(const key of ['students','subjects','attendance','assessments','journals','importNotes'])if(!Array.isArray(d[key]))fail('Bagian '+key+' tidak valid.');
 if(!d.settings||!d.reportNotes||Array.isArray(d.reportNotes)||typeof d.reportNotes!=='object')fail('Pengaturan atau catatan rapor tidak lengkap.');
 const s=d.settings;
 if(s.principalStatus!==undefined&&!['Definitif','Plt.'].includes(s.principalStatus))fail('Status kepala sekolah harus Definitif atau Plt.');
 if(s.schoolDays!==undefined&&![5,6].includes(s.schoolDays))fail('Jumlah hari sekolah harus 5 atau 6 hari.');
 if(s.npsn!==undefined&&typeof s.npsn!=='string')fail('NPSN harus berupa teks.');
 for(const k of ['school','schoolAddress','teacher','teacherNip','principal','principalNip','city','className','year','semester'])if(typeof s[k]!=='string')fail('Pengaturan '+k+' tidak valid.');
 if(s.kopLines!==undefined&&(typeof s.kopLines!=='string'||s.kopLines.length>600))fail('Baris kop surat tidak valid.');
 for(const [k,lbl] of [['principalSig','kepala sekolah'],['teacherSig','guru']])if(s[k]!==undefined&&!(typeof s[k]==='string'&&s[k].length<900000&&(s[k]===''||/^data:image\/(png|jpeg);base64,[A-Za-z0-9+\/=]+$/.test(s[k]))))fail('Tanda tangan '+lbl+' tidak valid (gunakan PNG/JPG).');
 if(s.logo!==undefined&&!(typeof s.logo==='string'&&s.logo.length<900000&&(s.logo===''||/^data:image\/(png|jpeg);base64,[A-Za-z0-9+\/=]+$/.test(s.logo))))fail('Logo sekolah tidak valid (gunakan PNG/JPG).');
 if(!/^\d{4}\/\d{4}$/.test(s.year)||!['1','2'].includes(s.semester)||!dateValid(s.start)||!dateValid(s.end)||s.start>s.end)fail('Periode tidak valid.');
 if(!s.weights||Object.keys(types).some(k=>typeof s.weights[k]!=='number'||!Number.isFinite(s.weights[k])||s.weights[k]<0||s.weights[k]>100)||['discipline','attitude'].some(k=>s.weights[k]!==undefined&&(!Number.isFinite(s.weights[k])||s.weights[k]<0||s.weights[k]>100))||Object.keys(reportTypes).reduce((a,k)=>a+(s.weights[k]??0),0)!==100)fail('Total bobot harus 100%.');
 if(typeof s.threshold!=='number'||s.threshold<0||s.threshold>100)fail('Batas ketercapaian tidak valid.');
 if(d.attendanceHolidays!==undefined){
  if(!Array.isArray(d.attendanceHolidays))fail('Daftar hari libur tidak valid.');
  const dates=new Set;for(const h of d.attendanceHolidays){
   if(!h||!dateValid(h.date)||dates.has(h.date)||typeof h.label!=='string'||!h.label.trim()||h.label.length>40)fail('Tanggal atau keterangan hari libur tidak valid (maksimal 40 karakter).');
   dates.add(h.date);
  }
 }
 const ids=new Set,subjects=new Set,aid=new Set,jid=new Set,nis=new Set;
 for(const st of d.students){if(!st||typeof st.id!=='string'||!st.id||ids.has(st.id)||typeof st.name!=='string'||!st.name.trim()||typeof st.nis!=='string'||typeof st.nisn!=='string')fail('Identitas murid tidak valid/duplikat.');ids.add(st.id);if(st.nis&&nis.has(st.nis))fail('NIS duplikat.');nis.add(st.nis);if(!['L','P',''].includes(st.gender))fail('Jenis kelamin tidak valid.');}
 for(const sub of d.subjects){if(!sub||typeof sub.id!=='string'||!sub.id||subjects.has(sub.id)||typeof sub.name!=='string'||!sub.name.trim())fail('Mata pelajaran tidak valid/duplikat.');subjects.add(sub.id)}
 if(d.competencyContexts!==undefined){
  if(!d.competencyContexts||typeof d.competencyContexts!=='object'||Array.isArray(d.competencyContexts))fail('Konteks kriteria tidak valid.');
  for(const [p,c] of Object.entries(d.competencyContexts))if(!/^\d{4}\/\d{4}\|[12]$/.test(p)||!c||!['PAUD','SD','SMP','SMA','SMK'].includes(c.level)||!Number.isInteger(c.grade)||!(c.level==='PAUD'?c.grade===0:c.level==='SD'?c.grade>=1&&c.grade<=6:c.level==='SMP'?c.grade>=7&&c.grade<=9:c.grade>=10&&c.grade<=(c.level==='SMK'?13:12)))fail('Jenjang dan kelas kriteria tidak sesuai.');
 }
 if(d.competencyScores!==undefined){
  if(!Array.isArray(d.competencyScores))fail('Nilai sikap dan kedisiplinan tidak valid.');
  const seen=new Set;for(const r of d.competencyScores){
   if(!r||!ids.has(r.studentId)||!/^\d{4}\/\d{4}\|[12]$/.test(r.period)||seen.has(r.period+'|'+r.studentId)||!r.attitudes||typeof r.attitudes!=='object'||Array.isArray(r.attitudes))fail('Identitas atau periode nilai sikap tidak valid/duplikat.');
   seen.add(r.period+'|'+r.studentId);
   if(r.discipline!==undefined&&(!Number.isFinite(r.discipline)||r.discipline<0||r.discipline>100))fail('Nilai kedisiplinan harus 0–100.');
   for(const [k,v] of Object.entries(r.attitudes))if(!Object.hasOwn(dimensions,k)||!Number.isInteger(v)||v<1||v>5)fail('Nilai setiap dimensi sikap harus bilangan bulat 1–5.');
   if(r.note!==undefined&&(typeof r.note!=='string'||r.note.length>1000))fail('Catatan pengamatan maksimal 1000 karakter.');
  }
 }
 if(d.extracurriculars!==undefined){
  if(!Array.isArray(d.extracurriculars))fail('Data ekstrakurikuler tidak valid.');
  const seen=new Set;
  for(const r of d.extracurriculars){
   if(!r||typeof r.id!=='string'||!r.id||seen.has(r.id)||!ids.has(r.studentId)||!/^\d{4}\/\d{4}\|[12]$/.test(r.period))fail('Identitas ekstrakurikuler tidak valid/duplikat.');
   seen.add(r.id);
   if(r.rating!==undefined&&r.rating!==''&&!extracurricularRatings.includes(r.rating))fail('Penilaian ekstrakurikuler harus Kurang, Cukup, Baik, atau Sangat Baik.');
   if(typeof r.name!=='string'||!r.name.trim()||r.name.length>120||typeof r.description!=='string'||r.description.length>1000)fail('Nama ekstrakurikuler wajib diisi (maksimal 120 karakter); keterangan maksimal 1000 karakter.');
  }
 }
 const keys=new Set;
 for(const a of d.attendance){const k=a.date+'|'+a.studentId;if(!ids.has(a.studentId)||!dateValid(a.date)||!['H','S','I','A'].includes(a.status)||keys.has(k))fail('Presensi tidak valid/duplikat.');keys.add(k)}
 for(const a of d.assessments){if(!a||!a.id||aid.has(a.id)||!subjects.has(a.subjectId)||!types[a.type]||typeof a.period!=='string'||!(a.period==='review'||/^\d{4}\/\d{4}\|[12]$/.test(a.period))||typeof a.tp!=='string'||typeof a.label!=='string'||!(a.date===''||dateValid(a.date))||!a.scores||Array.isArray(a.scores))fail('Asesmen tidak valid.');aid.add(a.id);for(const [id,v] of Object.entries(a.scores))if(!ids.has(id)||typeof v!=='number'||!Number.isFinite(v)||v<0||v>100)fail('Nilai harus 0–100 dan merujuk murid yang terdaftar.');}
 for(const j of d.journals){if(!j||!j.id||jid.has(j.id)||!subjects.has(j.subjectId)||!dateValid(j.date)||!/^\d{4}\/\d{4}\|[12]$/.test(j.period)||!Number.isFinite(j.jp)||j.jp<=0)fail('Jurnal tidak valid.');for(const k of ['media','assessment','remarks'])if(j[k]!==undefined&&typeof j[k]!=='string')fail('Kolom jurnal tidak valid.');for(const k of ['tp','activity','reflection','followup'])if(typeof j[k]!=='string')fail('Isi jurnal tidak valid.');jid.add(j.id)}
 if(d.journalPlanner!==undefined){const q=d.journalPlanner;if(!q||typeof q!=='object'||!/^\d{4}-(0[1-9]|1[0-2])$/.test(q.month)||!['SD','SMP','SMA','SMK'].includes(q.level)||!Array.isArray(q.schedule)||q.schedule.length>100||!Array.isArray(q.holidays)||q.holidays.some(v=>!dateValid(v))||!q.plans||typeof q.plans!=='object')fail('Pengaturan penyusun jurnal tidak valid.');for(const k of ['media','assessTypes','assessTechniques'])if(q[k]!==undefined&&(!Array.isArray(q[k])||q[k].some(v=>typeof v!=='string')))fail('Pilihan media/asesmen jurnal tidak valid.');
for(const r of q.schedule)if(!r||!Number.isInteger(r.day)||r.day<1||r.day>6||!subjects.has(r.subjectId)||!Number.isFinite(r.jp)||r.jp<.5||r.jp>24)fail('Jadwal jurnal tidak valid.');for(const plan of Object.values(q.plans))if(!plan||!Array.isArray(plan.tps)||plan.tps.some(t=>typeof t!=='string')||typeof plan.media!=='string'||typeof plan.assessment!=='string')fail('TP/media/asesmen jurnal tidak valid.');}
 for(const [k,v] of Object.entries(d.reportNotes))if(typeof v!=='string')fail('Catatan rapor tidak valid.');
 if(d.importNotes.some(n=>typeof n!=='string'))fail('Catatan impor tidak valid.');
 for(const a of d.assessments)for(const k of Object.keys(a.scores))a.scores[k]=Math.round(a.scores[k]);
 for(const r of d.competencyScores||[])if(typeof r.discipline==='number')r.discipline=Math.round(r.discipline);
 if(d.questionAnalyses!==undefined){if(!Array.isArray(d.questionAnalyses)||d.questionAnalyses.length>100)fail('Daftar analisis soal tidak valid (maksimal 100).');const seen=new Set();for(const a of d.questionAnalyses){if(!root.QuestionAnalysis)fail('Modul analisis soal tidak tersedia.');root.QuestionAnalysis.validate(a);if(seen.has(a.id))fail('ID analisis soal duplikat.');seen.add(a.id)}}
 d.students=sortStudents(d.students);
 return d;
}
root.Core={principalTitle,types,reportTypes,dimensions,optionalRecord,optionalResult,mean,period,active,sortStudents,extracurriculars,extracurricularRatings,isReligionSubject,applicableAssessments,result,schoolDays,weekendHoliday,manualHolidays,holiday,attendance,blank,validate,dateValid};
})(typeof window==='undefined'?globalThis:window);
