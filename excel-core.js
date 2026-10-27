(function(root){
const C=root.Core;
const competencyColumns={faith:'Keimanan_Ketakwaan',citizenship:'Kewargaan',reasoning:'Penalaran_Kritis',creativity:'Kreativitas',collaboration:'Kolaborasi',independence:'Kemandirian',health:'Kesehatan',communication:'Komunikasi'};
const specs={
 extracurricular:{sheet:'Ekstrakurikuler',title:'Ekstrakurikuler',headers:['ID_Ekstrakurikuler','Tahun','Semester','ID_Murid','NIS','Nama','Kegiatan','Penilaian','Keterangan'],tip:'Satu baris per kegiatan per murid per semester. Kegiatan baru: kosongkan ID_Ekstrakurikuler. ID_Murid jangan diubah; jika kosong, NIS dan nama harus cocok. Penilaian: Kurang, Cukup, Baik, Sangat Baik (wajib untuk kegiatan baru). Baris tanpa kegiatan, penilaian, dan keterangan dilewati. Kolom kosong pada kegiatan lama mempertahankan nilai sebelumnya. Nama kegiatan maksimal 120 karakter; keterangan maksimal 1000 karakter. Tambahkan baris untuk kegiatan lain. Hapus data melalui aplikasi.'},
 competency:{sheet:'Sikap_Kedisiplinan',title:'Sikap & kedisiplinan',headers:['Tahun','Semester','ID_Murid','NIS','Nama','Jenjang','Kelas','Kedisiplinan',...Object.values(competencyColumns),'Catatan'],tip:'Satu baris per murid per semester. Jangan ubah ID_Murid; bila ID kosong, NIS wajib dan harus sesuai nama. Kedisiplinan 0–100; delapan dimensi sikap bilangan bulat 1–5. Kolom kosong mempertahankan nilai lama; angka 0 sah hanya untuk kedisiplinan. Jenjang/Kelas mengikuti acuan semester. Catatan maksimal 1000 karakter. Bobot rapor tidak berubah karena impor.'},
 students:{sheet:'Murid',title:'Data murid',headers:['ID_Murid','NIS','NISN','Nama','LP','Tempat_Lahir','Tanggal_Lahir','Agama','Alamat','Ayah','Ibu','Telepon','Pekerjaan_Ayah','Pekerjaan_Ibu','Status'],tip:'Murid baru: kosongkan ID_Murid, isi NIS unik, Nama, dan LP (L/P). Murid lama dicocokkan dengan ID atau NIS. NIS/NISN/Telepon berupa teks. Status: Aktif/Arsip. Kolom kosong mempertahankan data lama.'},
 attendance:{sheet:'Presensi',title:'Daftar hadir',headers:['Tanggal','NIS','Nama','Status'],tip:'Isi tanggal YYYY-MM-DD dan status H/S/I/A. Satu baris per murid per tanggal. Status kosong dilewati. Status lama pada NIS dan tanggal yang sama diperbarui.'},
 grades:{sheet:'Nilai',title:'Asesmen & nilai',headers:['ID_Asesmen','Tahun','Semester','Mapel','Jenis','TP','Kegiatan','Tanggal','NIS','Nama','Nilai'],tip:'Nilai 0–100, otomatis dibulatkan tanpa koma; kosong dilewati. Murid dicocokkan lewat NIS. Jenis: Formatif, Sumatif TP, Tengah semester, Akhir semester. Asesmen baru: ID kosong, isi TP dan Kegiatan yang sama untuk seluruh murid dalam satu asesmen. Semester 1/2; TINJAU khusus nilai impor yang belum ditetapkan. ID lama mempertahankan identitas asesmen. Khusus Pendidikan Agama dan Budi Pekerti, isi hanya TP yang diikuti masing-masing murid. TP tanpa nilai murid tersebut tidak diwajibkan; setelah satu nilai terisi, asesmen lain pada TP yang sama perlu dilengkapi. Setiap kategori berbobot tetap memerlukan nilai.'},
 journal:{sheet:'Jurnal',title:'Jurnal mengajar',headers:['ID_Jurnal','Tahun','Semester','Tanggal','Mapel','JP','TP','Kegiatan','Refleksi','Tindak_Lanjut','Media','Asesmen','Keterangan'],tip:'Jurnal baru: ID_Jurnal kosong. Wajib tanggal, mapel terdaftar, JP > 0, TP dan kegiatan. ID lama memperbarui pertemuan. Tanpa ID, tanggal+mapel+TP yang sama dicocokkan bila unik.'},
 reports:{sheet:'Catatan_Rapor',title:'Catatan rapor',headers:['Tahun','Semester','NIS','Nama','Mapel','Catatan'],tip:'Isi nama mapel terdaftar untuk deskripsi capaian, atau Wali kelas untuk catatan umum. Catatan kosong dilewati. Nilai rapor dihitung otomatis dari asesmen; lembar Rapor_Rekap hanya untuk dibaca.'},
 settings:{sheet:'Pengaturan',title:'Pengaturan',headers:['Kunci','Nilai','Keterangan'],tip:'Ubah hanya kolom Nilai. Bobot harus berjumlah 100%. Perubahan tahun/semester mengubah periode aktif, tanpa memindahkan data lama.'},
 subjects:{sheet:'Mapel',title:'Mata pelajaran',headers:['ID_Mapel','Nama_Mapel'],tip:'Mapel baru: kosongkan ID_Mapel. ID yang sudah ada memperbarui nama mapel. Nama mapel harus unik.'}
};
const scopes={dashboard:Object.keys(specs),backup:Object.keys(specs),students:['students'],attendance:['attendance'],grades:['grades'],journal:['journal'],reports:['reports'],settings:['settings','subjects']};
scopes.school=['settings'];scopes.class=['settings'];scopes.subjects=['subjects'];
scopes.competency=['competency'];scopes.extracurricular=['extracurricular'];
const settingScopes={school:['school','npsn','schoolAddress','city','principal','principalStatus','principalNip'],class:['className','teacher','teacherNip','year','semester','start','end']};
const settingLabels={school:'Nama sekolah',className:'Kelas',schoolAddress:'Alamat sekolah',teacher:'Wali kelas',teacherNip:'NIP wali kelas',principal:'Kepala sekolah',principalStatus:'Status kepala sekolah (Definitif / Plt.)',principalNip:'NIP kepala sekolah',city:'Kota',year:'Tahun pelajaran, contoh 2026/2027',semester:'Semester 1 atau 2',start:'Mulai rekap presensi YYYY-MM-DD',end:'Akhir rekap presensi YYYY-MM-DD',threshold:'Batas ketercapaian 0–100','weights.formative':'Bobot formatif (%)','weights.sumative':'Bobot sumatif TP (%)','weights.sts':'Bobot tengah semester (%)','weights.sas':'Bobot akhir semester (%)','weights.discipline':'Bobot kehadiran (kedisiplinan) (%)','weights.attitude':'Bobot sikap (%)'};
const text=v=>v===null||v===undefined?'':String(v).trim();
settingLabels.npsn='NPSN (teks)';
const norm=v=>text(v).toLocaleLowerCase('id-ID');
const yearValid=y=>/^\d{4}\/\d{4}$/.test(y)&&Number(y.slice(5))===Number(y.slice(0,4))+1;
const safeId=s=>/^[a-zA-Z0-9_-]+$/.test(s);
function monthDates(month){
 if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)||!C.dateValid(month+'-01'))throw Error('Pilih bulan dan tahun yang valid.');
 const count=new Date(Number(month.slice(0,4)),Number(month.slice(5)),0).getDate();
 return Array.from({length:count},(_,i)=>month+'-'+String(i+1).padStart(2,'0'));
}
function templateTables(db,scope,options={}){
 const keys=scopes[scope]||scopes.backup,st=C.active(db),year=db.settings.year,sem=db.settings.semester,p=C.period(db),date=options.date||db.settings.start,mode=options.mode||'new';
 const sub=id=>db.subjects.find(x=>x.id===id)?.name||'',student=id=>db.students.find(x=>x.id===id),tables={};
 for(const k of keys){let rows=[];
  if(k==='competency'){
   const ctx=root.Competency.context(db),pupils=db.students.filter(s=>s.active!==false||mode==='existing'&&C.optionalRecord(db,s.id));
   rows=pupils.map(s=>{const r=mode==='existing'?C.optionalRecord(db,s.id):null;return [year,sem,s.id,s.nis,s.name,ctx?.level||'',ctx?.grade??'',r?.discipline??'',...Object.keys(competencyColumns).map(key=>r?.attitudes?.[key]??''),r?.note||'']});
  }
  if(k==='extracurricular'){
   const slots=Number(options.extracurricularSlots||1);if(!Number.isInteger(slots)||slots<1||slots>10)throw Error('Jumlah baris ekstrakurikuler per murid harus 1–10.');
   const pupils=C.sortStudents(db.students.filter(s=>s.active!==false||mode==='existing'&&C.extracurriculars(db,s.id).length));
   rows=pupils.flatMap(s=>{const saved=mode==='existing'?C.extracurriculars(db,s.id):[];return [...saved.map(r=>[r.id,year,sem,s.id,s.nis,s.name,r.name,r.rating||'',r.description||'']),...Array.from({length:Math.max(0,slots-saved.length)},()=>['',year,sem,s.id,s.nis,s.name,'','',''])]});
  }
  if(k==='students')rows=db.students.map(s=>[s.id,s.nis,s.nisn,s.name,s.gender,s.birthplace||'',s.birthdate||'',s.religion||'',s.address||'',s.father||'',s.mother||'',s.phone||'',s.fatherJob||'',s.motherJob||'',s.active===false?'Arsip':'Aktif']);
  if(k==='attendance')rows=mode==='existing'?db.attendance.filter(a=>a.date>=db.settings.start&&a.date<=db.settings.end).map(a=>[a.date,student(a.studentId)?.nis||'',student(a.studentId)?.name||'',a.status]):st.map(s=>[date,s.nis,s.name,'']);
  if(k==='grades'){
   const all=scope==='backup'||scope==='dashboard';
   const list=db.assessments.filter(a=>(all||((options.subjectId==='all'||a.subjectId===options.subjectId)&&(options.type==='all'||a.type===options.type)))&&a.period===(options.review?'review':p));
   if(mode==='existing')rows=list.flatMap(a=>db.students.filter(s=>typeof a.scores[s.id]==='number'||options.includeEmpty&&s.active!==false).map(s=>[a.id,a.period==='review'?(a.sourceYear||year):a.period.split('|')[0],a.period==='review'?'TINJAU':a.period.split('|')[1],sub(a.subjectId),C.types[a.type],a.tp,a.label,a.date,s.nis,s.name,a.scores[s.id]??'']));
   else {
    const subjects=all||options.subjectId==='all'?db.subjects:db.subjects.filter(s=>s.id===(options.subjectId||db.subjects[0]?.id));
    const types=all||options.type==='all'?Object.keys(C.types):[options.type||'sumative'];
    const count=Number(options.assessmentSlots||1);
    if(!Number.isInteger(count)||count<1||count>10)throw Error('Jumlah kegiatan per jenis harus 1–10.');
    rows=subjects.flatMap(subj=>types.flatMap(type=>Array.from({length:count},(_,i)=>st.map(s=>['',year,sem,subj.name,C.types[type],options.tp||'',options.label?(count>1?options.label+' '+(i+1):options.label):(types.length>1||count>1?C.types[type]+' '+(i+1):''),date,s.nis,s.name,''])).flat()));
   }
   if(rows.length>9900)throw Error('Template nilai terlalu besar. Pilih satu mapel atau kurangi jumlah kegiatan (maksimal 9.900 baris).');
  }
  if(k==='journal'&&mode==='existing')rows=db.journals.filter(j=>j.period===p).map(j=>[j.id,...j.period.split('|'),j.date,sub(j.subjectId),j.jp,j.tp,j.activity,j.reflection,j.followup,j.media||'',j.assessment||'',j.remarks||'']);
  if(k==='journal'&&mode!=='existing')rows=[['',year,sem,date,sub(db.subjects[0]?.id),2,'','','','']];
  if(k==='journal'&&options.month){
   const days=monthDates(options.month),slots=Number(options.slots||3);
   if(!Number.isInteger(slots)||slots<1||slots>10)throw Error('Jumlah kegiatan per hari harus 1–10.');
   rows=days.flatMap(dt=>{
    const saved=mode==='existing'?db.journals.filter(j=>j.period===p&&j.date===dt).map(j=>[j.id,...j.period.split('|'),j.date,sub(j.subjectId),j.jp,j.tp,j.activity,j.reflection,j.followup,j.media||'',j.assessment||'',j.remarks||'']):[];
    return [...saved,...Array.from({length:Math.max(0,slots-saved.length)},()=>['',year,sem,dt,'','','','','',''])];
   });
  }
  if(k==='reports')rows=st.flatMap(s=>[...db.subjects.map(a=>[year,sem,s.nis,s.name,a.name,mode==='existing'?db.reportNotes[p+'|'+s.id+'|'+a.id]||'':'']),[year,sem,s.nis,s.name,'Wali kelas',mode==='existing'?db.reportNotes[p+'|'+s.id+'|wali']||'':'']]);
  if(k==='settings')rows=Object.entries(settingLabels).filter(([key])=>!settingScopes[scope]||settingScopes[scope].includes(key)).map(([key,label])=>[key,key.startsWith('weights.')?db.settings.weights[key.slice(8)]:db.settings[key]??(key==='principalStatus'?'Definitif':''),label]);
  if(k==='subjects')rows=db.subjects.map(s=>[s.id,s.name]);
  tables[k]={headers:specs[k].headers,rows};
 }
 return tables;
}
function plan(db,tables,scope,makeId){
 const next=structuredClone(db),errors=[],warnings=[],changes=[],counts={added:0,updated:0,unchanged:0,skipped:0},allowed=scopes[scope]||scopes.backup;
 const error=(sheet,row,msg)=>errors.push({sheet,row,message:msg});
 const warn=m=>{if(!warnings.includes(m))warnings.push(m)};
 const record=(sheet,row,kind,label)=>{counts[kind]++;if(kind!=='unchanged')changes.push({sheet,row,kind,label})};
 const id=prefix=>makeId(prefix),seen=new Set;
 function unique(key){if(seen.has(key))throw Error('Baris duplikat untuk kunci yang sama dalam berkas.');seen.add(key)}
 function date(v,optional=false){if(optional&&!v)return '';if(!C.dateValid(v))throw Error('Tanggal harus valid dengan format YYYY-MM-DD.');return v}
 function period(r,review=false){if(review&&r.Semester==='TINJAU'){if(!yearValid(r.Tahun))throw Error('Tahun sumber tidak valid.');return 'review'}if(!yearValid(r.Tahun)||!['1','2'].includes(r.Semester))throw Error('Tahun harus berurutan (contoh 2026/2027) dan semester 1/2.');const p=r.Tahun+'|'+r.Semester;if(p!==C.period(db))warn('Ada data untuk periode berbeda dari semester aktif. Data tetap ditempatkan pada periode yang tertulis di Excel.');return p}
 function number(v,min,max,label){if(v===''||!/^\d+(?:[.,]\d+)?$/.test(v))throw Error(label+' harus berupa angka.');const n=Number(v.replace(',','.'));if(!Number.isFinite(n)||n<min||n>max)throw Error(label+' harus '+min+'–'+max+'.');return n}
 function stu(r){if(!r.NIS)throw Error('NIS wajib diisi sebagai kunci murid.');const matches=next.students.filter(s=>s.nis===r.NIS);if(matches.length!==1)throw Error('NIS '+r.NIS+' tidak ditemukan atau tidak unik. Impor data murid terlebih dahulu.');const s=matches[0];if(r.Nama&&norm(r.Nama)!==norm(s.name))throw Error('Nama tidak cocok dengan NIS '+r.NIS+' ('+s.name+').');return s}
 function subject(name){const matches=next.subjects.filter(s=>norm(s.name)===norm(name));if(matches.length!==1)throw Error('Mapel "'+name+'" tidak ditemukan atau tidak unik.');return matches[0]}
 function process(k,fn){if(!allowed.includes(k)||!tables[k])return;const t=tables[k],spec=specs[k],sheet=t.sheet||spec.sheet;if(JSON.stringify(t.headers)!==JSON.stringify(spec.headers)&&!(k==='journal'&&JSON.stringify(t.headers)===JSON.stringify(spec.headers.slice(0,10)))){error(sheet,1,'Kolom tidak sesuai template. Unduh template terbaru dan jangan mengubah judul kolom.');return}if(t.rows.length>10000){error(sheet,1,'Maksimal 10.000 isian per lembar.');return}t.rows.forEach((values,i)=>{const row=t.sourceRows?.[i]||i+2,r=Object.fromEntries(spec.headers.map((h,j)=>[h,text(values[j])]));if(!Object.values(r).some(Boolean))return;try{fn(r,row,sheet)}catch(e){error(sheet,row,(t.sourceCells?.[i]?t.sourceCells[i]+': ':'')+e.message)}})}
 process('students',(r,row,sheet)=>{
  if(!r.Nama&&!r.NIS&&!r.NISN&&!r.ID_Murid){counts.skipped++;return}if(!r.NIS||!r.Nama)throw Error('NIS dan Nama wajib diisi.');unique('student:'+r.NIS);
  if(r.ID_Murid&&!safeId(r.ID_Murid))throw Error('ID murid tidak valid.');
  const byId=r.ID_Murid?next.students.find(s=>s.id===r.ID_Murid):null,byNis=next.students.find(s=>s.nis===r.NIS);
  if(r.ID_Murid&&!byId)throw Error('ID murid tidak dikenal. Untuk murid baru, kosongkan ID_Murid.');
  if(byId&&byNis&&byId.id!==byNis.id)throw Error('ID murid dan NIS merujuk murid berbeda.');
  const existing=byId||byNis;if(existing)unique('student-id:'+existing.id);
  if(r.NISN&&next.students.some(s=>s.id!==existing?.id&&s.nisn===r.NISN))throw Error('NISN telah dipakai murid lain.');
  if((r.LP||!existing)&&!['L','P'].includes(r.LP.toUpperCase()))throw Error('LP harus L atau P.');if(r.Tanggal_Lahir)date(r.Tanggal_Lahir);
  if(r.Status&&!['aktif','arsip'].includes(norm(r.Status)))throw Error('Status harus Aktif atau Arsip.');
  const values={},mapping={Nama:'name',NIS:'nis',NISN:'nisn',Tempat_Lahir:'birthplace',Tanggal_Lahir:'birthdate',Agama:'religion',Alamat:'address',Ayah:'father',Ibu:'mother',Telepon:'phone',Pekerjaan_Ayah:'fatherJob',Pekerjaan_Ibu:'motherJob'};
  for(const [h,k]of Object.entries(mapping))if(r[h]!=='')values[k]=r[h];if(r.LP)values.gender=r.LP.toUpperCase();if(r.Status)values.active=norm(r.Status)==='aktif';
  if(existing){const changed=Object.entries(values).some(([k,v])=>existing[k]!==v);Object.assign(existing,values);record(sheet,row,changed?'updated':'unchanged',r.Nama)}else{next.students.push({id:id('s'),nisn:'',gender:'',active:true,...values});record(sheet,row,'added',r.Nama)}
 });
 process('subjects',(r,row,sheet)=>{if(!r.Nama_Mapel){counts.skipped++;return}unique('subject-name:'+norm(r.Nama_Mapel));if(r.ID_Mapel&&!safeId(r.ID_Mapel))throw Error('ID mapel tidak valid.');let s=r.ID_Mapel?next.subjects.find(x=>x.id===r.ID_Mapel):next.subjects.find(x=>norm(x.name)===norm(r.Nama_Mapel));if(r.ID_Mapel&&!s)throw Error('ID mapel tidak dikenal; kosongkan untuk mapel baru.');if(s)unique('subject-id:'+s.id);if(next.subjects.some(x=>x.id!==s?.id&&norm(x.name)===norm(r.Nama_Mapel)))throw Error('Nama mapel duplikat.');if(s){const changed=s.name!==r.Nama_Mapel;s.name=r.Nama_Mapel;record(sheet,row,changed?'updated':'unchanged',r.Nama_Mapel)}else{next.subjects.push({id:id('sub'),name:r.Nama_Mapel});record(sheet,row,'added',r.Nama_Mapel)}});
 process('settings',(r,row,sheet)=>{if(!r.Kunci&&!r.Nilai){counts.skipped++;return}if(!Object.hasOwn(settingLabels,r.Kunci))throw Error('Kunci pengaturan tidak dikenal.');unique('setting:'+r.Kunci);if(r.Nilai===''){counts.skipped++;return}let target=next.settings,key=r.Kunci,value=r.Nilai;if(key.startsWith('weights.')){target=target.weights;key=key.slice(8);value=number(value,0,100,'Bobot')}else if(key==='threshold')value=number(value,0,100,'Batas ketercapaian');const changed=target[key]!==value;target[key]=value;record(sheet,row,changed?'updated':'unchanged',settingLabels[r.Kunci]);});
 process('attendance',(r,row,sheet)=>{if(!r.Status){counts.skipped++;return}const s=stu(r),dt=date(r.Tanggal),status=({H:'H',HADIR:'H','.':'H',S:'S',SAKIT:'S',I:'I',IZIN:'I',IJIN:'I',A:'A',ALPA:'A',ALPHA:'A'})[r.Status.toUpperCase()];if(!status)throw Error('Status harus H/S/I/A.');unique('att:'+dt+'|'+s.id);const old=next.attendance.find(a=>a.date===dt&&a.studentId===s.id);if(old){const changed=old.status!==status;old.status=status;record(sheet,row,changed?'updated':'unchanged',s.name+' · '+dt+' · '+status)}else{next.attendance.push({studentId:s.id,date:dt,status});record(sheet,row,'added',s.name+' · '+dt+' · '+status)}if(dt<db.settings.start||dt>db.settings.end)warn('Ada presensi di luar rentang rekap aktif; tanggal aslinya dipertahankan.')});
 const competencyContextsSeen=new Map;
 process('competency',(r,row,sheet)=>{
  if(![r.Kedisiplinan,r.Catatan,...Object.values(competencyColumns).map(h=>r[h])].some(v=>v!=='')){counts.skipped++;return}
  let s;
  if(r.ID_Murid){
   s=next.students.find(x=>x.id===r.ID_Murid);
   if(!s)throw Error('ID_Murid tidak dikenal. Gunakan template dari data kelas ini.');
   if(r.NIS&&r.NIS!==s.nis)throw Error('ID_Murid dan NIS tidak cocok.');
   if(r.Nama&&norm(r.Nama)!==norm(s.name))throw Error('Nama tidak cocok dengan ID_Murid ('+s.name+').');
  }else s=stu(r);
  const p=period(r);unique('competency:'+p+'|'+s.id);
  const old=(next.competencyScores||[]).find(x=>x.studentId===s.id&&x.period===p),before=JSON.stringify(old),recordValue=old?structuredClone(old):{studentId:s.id,period:p,attitudes:{}};
  if(r.Kedisiplinan!=='')recordValue.discipline=Math.round(number(r.Kedisiplinan,0,100,'Kedisiplinan'));
  for(const [key,h] of Object.entries(competencyColumns))if(r[h]!==''){
   const v=number(r[h],1,5,h);if(!Number.isInteger(v))throw Error(h+' harus bilangan bulat 1–5.');recordValue.attitudes[key]=v;
  }
  if(r.Catatan){if(r.Catatan.length>1000)throw Error('Catatan maksimal 1000 karakter.');recordValue.note=r.Catatan}
  let ctx;
  if(r.Jenjang!==''||r.Kelas!==''){
   const level=r.Jenjang.toUpperCase(),grade=number(r.Kelas,0,13,'Kelas');
   if(!Number.isInteger(grade)||!['PAUD','SD','SMP','SMA','SMK'].includes(level)||!(level==='PAUD'?grade===0:level==='SD'?grade>=1&&grade<=6:level==='SMP'?grade>=7&&grade<=9:grade>=10&&grade<=(level==='SMK'?13:12)))throw Error('Jenjang/Kelas tidak sesuai: PAUD 0, SD 1–6, SMP 7–9, SMA 10–12, SMK 10–13.');
   ctx={level,grade};
   const saved=next.competencyContexts?.[p]||competencyContextsSeen.get(p);
   if(saved&&(saved.level!==level||saved.grade!==grade))throw Error('Acuan Jenjang/Kelas berbeda untuk semester yang sama. Samakan dengan acuan yang tersimpan di aplikasi.');
  }else if(p===C.period(db)&&!next.competencyContexts?.[p])ctx=root.Competency.context(db);
  const contextChanged=ctx&&JSON.stringify(next.competencyContexts?.[p])!==JSON.stringify(ctx);
  if(ctx){next.competencyContexts??={};next.competencyContexts[p]=ctx;competencyContextsSeen.set(p,ctx)}
  next.competencyScores??=[];
  if(old)Object.assign(old,recordValue);else next.competencyScores.push(recordValue);
  record(sheet,row,!old?'added':before===JSON.stringify(recordValue)&&!contextChanged?'unchanged':'updated',s.name+' · '+p);
 });
 process('extracurricular',(r,row,sheet)=>{
  if(!r.ID_Ekstrakurikuler&&!r.Kegiatan&&!r.Penilaian&&!r.Keterangan){counts.skipped++;return}
  const p=period(r);let s;
  if(r.ID_Murid){s=next.students.find(x=>x.id===r.ID_Murid);if(!s)throw Error('ID_Murid tidak dikenal. Gunakan template terbaru.');if(r.NIS&&r.NIS!==s.nis)throw Error('NIS tidak sesuai ID_Murid.');if(r.Nama&&norm(r.Nama)!==norm(s.name))throw Error('Nama tidak sesuai ID_Murid.');}
  else s=stu(r);
  next.extracurriculars??=[];let old;
  if(r.ID_Ekstrakurikuler){
   if(!safeId(r.ID_Ekstrakurikuler))throw Error('ID_Ekstrakurikuler tidak valid.');
   old=next.extracurriculars.find(x=>x.id===r.ID_Ekstrakurikuler);
   if(!old)throw Error('ID_Ekstrakurikuler tidak dikenal. Kosongkan ID untuk kegiatan baru.');
   if(old.studentId!==s.id||old.period!==p)throw Error('Murid dan periode kegiatan lama tidak boleh diubah melalui impor.');
  }else if(r.Kegiatan){const matches=next.extracurriculars.filter(x=>x.studentId===s.id&&x.period===p&&norm(x.name)===norm(r.Kegiatan));if(matches.length>1)throw Error('Kegiatan tidak unik. Gunakan template Data tersimpan dengan ID.');old=matches[0]}
  const name=r.Kegiatan||old?.name;if(!name||name.length>120)throw Error('Kegiatan wajib diisi, maksimal 120 karakter.');
  const rating=r.Penilaian?C.extracurricularRatings.find(v=>norm(v)===norm(r.Penilaian)):old?.rating||'';
  if(r.Penilaian&&!rating||!old&&!rating)throw Error('Penilaian harus Kurang, Cukup, Baik, atau Sangat Baik; wajib untuk kegiatan baru.');
  if(r.Keterangan.length>1000)throw Error('Keterangan maksimal 1000 karakter.');
  if(next.extracurriculars.some(x=>x.id!==old?.id&&x.studentId===s.id&&x.period===p&&norm(x.name)===norm(name)))throw Error('Kegiatan sudah ada untuk murid dan semester ini.');
  unique('extra-key:'+p+'|'+s.id+'|'+norm(name));if(old)unique('extra-id:'+old.id);
  const values={name,rating,description:r.Keterangan||old?.description||''};
  if(old){const changed=Object.entries(values).some(([k,v])=>(old[k]??'')!==v);Object.assign(old,values);record(sheet,row,changed?'updated':'unchanged',s.name+' · '+name+' · '+(rating||'Belum dinilai'));}
  else{next.extracurriculars.push({id:id('extra'),studentId:s.id,period:p,...values});record(sheet,row,'added',s.name+' · '+name+' · '+rating);}
 });

 const metaSeen=new Map;
 process('grades',(r,row,sheet)=>{if(r.Nilai===''){counts.skipped++;return}const s=stu(r),v=Math.round(number(r.Nilai,0,100,'Nilai')),sub=subject(r.Mapel),type=Object.keys(C.types).find(k=>norm(C.types[k])===norm(r.Jenis)||k===r.Jenis),p=period(r,true);if(!type)throw Error('Jenis asesmen tidak dikenal.');if(!r.TP||!r.Kegiatan)throw Error('TP dan Kegiatan wajib diisi.');const dt=date(r.Tanggal,true),metadata={subjectId:sub.id,type,tp:r.TP,label:r.Kegiatan,date:dt,period:p};
  const signature=JSON.stringify(metadata);let a;
  if(r.ID_Asesmen){if(!safeId(r.ID_Asesmen))throw Error('ID asesmen tidak valid.');a=next.assessments.find(x=>x.id===r.ID_Asesmen);if(!a)throw Error('ID asesmen tidak dikenal; kosongkan untuk asesmen baru.');if(a.period!==p)throw Error('Periode asesmen lama tidak boleh diganti lewat Excel. Gunakan tinjauan impor untuk menetapkan periode.');if(metaSeen.has(a.id)&&metaSeen.get(a.id)!==signature)throw Error('Metadata berbeda untuk ID asesmen yang sama.');metaSeen.set(a.id,signature)}
  else{const matches=next.assessments.filter(x=>Object.entries(metadata).every(([k,v])=>x[k]===v));if(matches.length>1)throw Error('Asesmen tidak unik; gunakan template data tersimpan yang menyertakan ID.');a=matches[0]}
  if(!a){a={id:id('a'),...metadata,scores:{},...(p==='review'?{sourceYear:r.Tahun,source:'Impor Excel'}:{})};next.assessments.push(a)}
  unique('score:'+a.id+'|'+s.id);const old=a.scores[s.id],changed=old!==v||Object.entries(metadata).some(([k,v])=>a[k]!==v);Object.assign(a,metadata);a.scores[s.id]=v;record(sheet,row,old===undefined?'added':changed?'updated':'unchanged',s.name+' · '+r.Mapel+' · '+r.Kegiatan+' = '+v);
 });
 process('journal',(r,row,sheet)=>{if(!r.Kegiatan&&!r.TP&&!r.ID_Jurnal){counts.skipped++;return}if(!r.TP||!r.Kegiatan)throw Error('TP dan Kegiatan wajib diisi.');const p=period(r),dt=date(r.Tanggal),sub=subject(r.Mapel),jp=number(r.JP,0.5,24,'JP'),values={period:p,date:dt,subjectId:sub.id,jp,tp:r.TP,activity:r.Kegiatan};if(r.Refleksi)values.reflection=r.Refleksi;if(r.Tindak_Lanjut)values.followup=r.Tindak_Lanjut;if(r.Media)values.media=r.Media;if(r.Asesmen)values.assessment=r.Asesmen;if(r.Keterangan)values.remarks=r.Keterangan;let j;
  if(r.ID_Jurnal){if(!safeId(r.ID_Jurnal))throw Error('ID jurnal tidak valid.');j=next.journals.find(x=>x.id===r.ID_Jurnal);if(!j)throw Error('ID jurnal tidak dikenal; kosongkan untuk jurnal baru.');if(j.period!==p)throw Error('Periode jurnal lama tidak boleh diubah melalui impor.')}
  else{const matches=next.journals.filter(x=>x.period===p&&x.date===dt&&x.subjectId===sub.id&&x.tp===r.TP);if(matches.length>1)throw Error('Ada beberapa jurnal dengan tanggal, mapel, dan TP sama; gunakan ID_Jurnal.');j=matches[0]}
  unique('journal-key:'+p+'|'+dt+'|'+sub.id+'|'+r.TP);if(j)unique('journal-id:'+j.id);if(j){const changed=Object.entries(values).some(([k,v])=>j[k]!==v);Object.assign(j,values);record(sheet,row,changed?'updated':'unchanged',dt+' · '+r.Mapel)}else{next.journals.push({id:id('j'),reflection:'',followup:'',...values});record(sheet,row,'added',dt+' · '+r.Mapel)}
 });
 process('reports',(r,row,sheet)=>{if(!r.Catatan){counts.skipped++;return}const s=stu(r),p=period(r),sub=norm(r.Mapel)==='wali kelas'?'wali':subject(r.Mapel).id,k=p+'|'+s.id+'|'+sub;unique('note:'+k);const old=next.reportNotes[k];next.reportNotes[k]=r.Catatan;record(sheet,row,old===undefined?'added':old===r.Catatan?'unchanged':'updated',s.name+' · '+r.Mapel)});
 try{C.validate(next);if(!yearValid(next.settings.year))throw Error('Tahun pelajaran tidak berurutan.')}catch(e){error('Validasi akhir',0,e.message)}
 if(allowed.every(k=>!tables[k]))error('Berkas',0,'Tidak ada lembar template yang sesuai dengan menu ini.');
 return {next,errors,warnings,changes,counts};
}
root.ExcelCore={specs,scopes,settingLabels,competencyColumns,templateTables,plan,monthDates};
})(typeof window==='undefined'?globalThis:window);
