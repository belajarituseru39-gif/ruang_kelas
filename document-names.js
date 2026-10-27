(function(root){
'use strict';
const labels={school:'Data Sekolah',class:'Data Kelas',subjects:'Daftar Mata Pelajaran',students:'Identitas Peserta Didik dan Data Orang Tua Wali',attendance:'Daftar Hadir Peserta Didik',grades:'Daftar Nilai Asesmen',journal:'Jurnal Kegiatan Belajar Mengajar (KBM)',competency:'Nilai Sikap dan Kedisiplinan',extracurricular:'Daftar Nilai Ekstrakurikuler',settings:'Pengaturan',dashboard:'Administrasi Pembelajaran Lengkap',backup:'Administrasi Pembelajaran Lengkap'};
const types={formative:'Formatif',sumative:'Sumatif TP',sts:'Sumatif Tengah Semester',sas:'Sumatif Akhir Semester',combined:'Semester'};
const clean=v=>String(v??'').normalize('NFC').replace(/[<>:"/\\|?*\u0000-\u001f]/g,'-').replace(/\s+/g,' ').replace(/[. ]+$/g,'').trim();
function title(db,scope,o={}){
 if(scope==='analysis'){const a=o.analysis||(db.questionAnalyses||[]).find(x=>x.id===o.analysisId)||{},batch=Array.isArray(o.analyses),type=batch?o.batchType:(a.assessmentType||'sumative');return 'Analisis '+(root.QuestionAnalysis.assessmentTypes[type]||'Soal')+' - '+(batch?'Semua Mata Pelajaran':a.subject||'Mata Pelajaran');}
 if(scope==='reports'){const recap=o.kind==='recap',type=recap?o.recapComponent||'combined':o.component||'combined';return (recap?'Rekapitulasi Nilai '+(type==='combined'?'Rapor Semester':types[type]||'Rapor Semester'):'Laporan Hasil Belajar - '+(type==='combined'?'Nilai Akhir Gabungan':'Asesmen '+(types[type]||'Semester')))+(!recap&&o.studentId&&o.studentId!=='all'?' - '+(db.students.find(s=>s.id===o.studentId)?.name||'Murid'):'');}
 let name=labels[scope]||'Dokumen Ruang Kelas';
 if(scope==='grades'){if(o.type&&o.type!=='all')name+=' '+(types[o.type]||'');if(o.subjectId&&o.subjectId!=='all')name+=' - '+(db.subjects.find(s=>s.id===o.subjectId)?.name||'Mata Pelajaran');}
 return name;
}
function make(db,label,ext,o={}){
 const a=o.analysis,s=db.settings,[year,semester]=(a?.period||s.year+'|'+s.semester).split('|'),className=a?.className||s.className;
 const parts=[label,className?'Kelas '+className:'',o.gradeRange==='review'?'Perlu Ditinjau':year+' - Semester '+(semester==='2'?'Genap':'Ganjil')];
 if(o.month&&/^\d{4}-\d{2}$/.test(o.month)&&o.journalRange!=='semester')parts.push(new Date(o.month+'-01T12:00:00Z').toLocaleDateString('id-ID',{month:'long',year:'numeric',timeZone:'UTC'}));
 if(o.date)parts.push(o.date);
 const tail=parts.slice(1).filter(Boolean).map(v=>clean(v).slice(0,40)).join(' - '),suffix=tail?' - '+tail:'';
 let base=(clean(label).slice(0,Math.max(30,190-suffix.length))+suffix).replace(/[. ]+$/g,'');
 if(/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(base))base='Dokumen '+base;
 return base+'.'+String(ext).replace(/[^a-z0-9]/gi,'').toLowerCase();
}
function report(db,scope,o={},ext='pdf'){return make(db,title(db,scope,o),ext,{...o,date:scope==='analysis'&&!o.analyses?o.analysis?.date:undefined,month:['attendance','journal','dashboard','backup'].includes(scope)?o.month:undefined});}
function template(db,scope,o={}){const label=scope==='reports'?'Catatan Rapor':scope==='students'?'Data Murid':scope==='grades'?'Asesmen dan Nilai':labels[scope]||'Administrasi Pembelajaran Lengkap';return make(db,'Template '+label,'xlsx',o);}
root.DocumentNames={title,make,report,template,clean};
})(typeof window==='undefined'?globalThis:window);
