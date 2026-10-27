(function(root){
/* Penyusun jurnal KBM — alur mengikuti generator JURNAL-PRO:
   jadwal per hari → kalender libur → media & asesmen (berlaku semua) → TP per mapel → draf yang dapat disunting. */

// Mengambil topik dari TP dengan membuang kata kerja operasional (KKO) di awal kalimat.
function extractTopic(tpString){
 let topic=String(tpString||'').trim();
 topic=topic.replace(/^(peserta\s+didik|murid|siswa|mereka)\s*(mampu|dapat|diharapkan|terampil|terbiasa|terlibat\s+secara\s+aktif|secara\s+aktif)?\s*/gi,'');
 const prefix=/^(memahami|menjelaskan|mengidentifikasi|menganalisis|menerapkan|menyajikan|mengenali?|menceritakan|mengamati|menunjukkan|membedakan|membaca|menulis|berbicara|merespons|mengungkapkan?|memaknai|mengembangkan|mempresentasikan|menggunakan|membandingkan|menyampaikan|merefleksikan|menyelidiki|mendemonstrasikan|menirukan|mengeksplorasi|membuat|menggambar|menciptakan|mempraktikkan|mengapresiasi|meniru|menyusun|melakukan|menentukan|mengurutkan|mengelompokkan|mengukur|mengestimasi|menyelesaikan|mengonstruksi|mengurai|merancang|mengevaluasi|mempelajari|mempertahankan|menggubah|bermain|mensimulasikan|mengomunikasikan|menyebutkan|menghargai|menyortir|menghafal|membiasakan|sikap|terampil|aktif|berkolaborasi|menelaah|menginisiasi|merumuskan|memodelkan|menginvestigasi|menginterpretasi|menggeneralisasi|mengoperasikan|memprediksi)\s+/i;
 const filler=/^(dan|serta|atau|secara|dengan|melalui|tentang|mengenai|informasi|dari|gagasan|ide\s+pokok|pesan|makna|konsep|hasil|cara|bentuk|berupa|berbagai|suatu|teks|hal-hal|dalam|untuk|sebagai|pada|ke|di|terhadap|atas|bawah|identifikasi|penerapan|penggunaan|macam|jenis|nilai-nilai|tata\s+cara)\s+/i;
 while(prefix.test(topic)){topic=topic.replace(prefix,'');topic=topic.replace(filler,'');}
 let result=topic.replace(/\.$/,'').trim();
 if(!result||result.split(' ').length<2)result=String(tpString||'').replace(/^(Peserta didik|Murid|Siswa|Mereka)\s+(mampu|dapat|diharapkan|terampil)\s+/i,'').replace(/\.$/,'');
 return result.toLowerCase();
}

// Kalimat kegiatan: alur pembelajaran mendalam (memahami → mengaplikasi → merefleksi), bervariasi per pertemuan.
function activitySentence(phase,t,i){
 const memahami=[
  `Guru menampilkan stimulus visual/bacaan singkat. Murid merespons melalui pertanyaan pemantik dan mengaitkan pengalaman nyata mereka terkait materi ${t}.`,
  `Murid bekerja dalam kelompok kecil, mengeksplorasi bahan ajar untuk mengidentifikasi poin penting mengenai konsep ${t} secara mandiri.`,
  `Secara klasikal, kelompok mempresentasikan temuan diskusi awal mereka tentang ${t} dan menemukan konsep intinya dengan bimbingan guru.`,
  `Murid diajak berdiskusi tentang penerapan konsep ${t} di kehidupan sehari-hari, serta merumuskan nilai karakter yang bisa diteladani.`,
  `Murid memilih sumber belajar yang disediakan guru, lalu menuliskan ide awal mereka pada secarik kertas (sticky notes) tentang ${t}.`];
 const mengaplikasi=[
  `Guru memberikan tantangan atau skenario kasus nyata terkait ${t}, dan murid menyusun rencana penyelesaiannya dalam kelompok.`,
  `Murid mempraktikkan langsung ide solusi mereka untuk merancang sebuah karya, poster, atau lembar kerja nyata bertema ${t}.`,
  `Kelompok murid melakukan pengujian atau simulasi peran terkait ${t} untuk mengaplikasikan pengetahuan dalam situasi kehidupan sehari-hari.`,
  `Murid mempresentasikan progres produk/LKPD materi ${t} kepada teman sebangku guna mendapatkan saran perbaikan secara interaktif.`,
  `Murid berkolaborasi melakukan observasi mendalam mengenai ${t} dan menyusun laporan hasil penyelidikan kelompok.`];
 const merefleksi=[
  `Murid mengisi lembar evaluasi diri (self-evaluation) untuk merefleksikan pencapaian pemahaman dan kerja samanya pada materi ${t}.`,
  `Beberapa murid menyampaikan refleksi lisan mengenai tantangan tersulit saat mempelajari ${t} dan menyusun strategi belajar ke depannya.`,
  `Guru memberikan apresiasi belajar, dan murid mengerjakan post-test atau asesmen formatif akhir secara mandiri tentang ${t}.`,
  `Murid menulis pesan reflektif atas proses pembelajaran ${t}, serta menyimpulkan satu hal yang paling membuat mereka bangga hari ini.`];
 const list=phase==='Memahami'?memahami:phase==='Mengaplikasi'?mengaplikasi:merefleksi;
 return list[i%list.length];
}

function joinUnique(parts){return [...new Set(parts.map(s=>String(s||'').trim()).filter(Boolean))];}

function generate(db,plan){
 const C=root.Core;
 if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(plan.month||''))throw Error('Pilih bulan jurnal.');
 if(!Array.isArray(plan.schedule)||!plan.schedule.length)throw Error('Tambahkan jadwal mengajar terlebih dahulu.');
 const seen=new Set,counts={},days=[],total=new Date(Number(plan.month.slice(0,4)),Number(plan.month.slice(5)),0).getDate();
 for(const row of plan.schedule){
  if(!Number.isInteger(row.day)||row.day<1||row.day>6||!db.subjects.some(s=>s.id===row.subjectId)||!Number.isFinite(row.jp)||row.jp<.5||row.jp>24)throw Error('Periksa hari, mata pelajaran, dan JP pada jadwal.');
  const key=row.day+'|'+row.subjectId;
  if(seen.has(key))throw Error('Mapel yang sama pada hari yang sama cukup ditulis sekali; gabungkan JP.');
  seen.add(key);
  if(!plan.plans[row.subjectId]?.tps?.length)throw Error('Pilih atau ketik minimal satu TP untuk '+db.subjects.find(s=>s.id===row.subjectId).name+'.');
 }
 for(let d=1;d<=total;d++){
  const dt=plan.month+'-'+String(d).padStart(2,'0'),day=new Date(dt+'T12:00:00Z').getUTCDay();
  if(day===0||plan.holidays.includes(dt)||dt<db.settings.start||dt>db.settings.end)continue;
  for(const row of plan.schedule.filter(x=>x.day===day)){days.push({date:dt,...row});counts[row.subjectId]=(counts[row.subjectId]||0)+1;}
 }
 if(!days.length)throw Error('Tidak ada pertemuan efektif. Periksa jadwal, libur, dan rentang semester di Data kelas.');
 const mediaGlobal=(plan.media||[]),jenis=(plan.assessTypes||[]),teknik=(plan.assessTechniques||[]);
 const tracker={},used={};
 const rows=days.map(row=>{
  const settings=plan.plans[row.subjectId],n=counts[row.subjectId],index=tracker[row.subjectId]||0;
  const tpIndex=Math.min(settings.tps.length-1,Math.floor(index*settings.tps.length/n)),tp=settings.tps[tpIndex];
  tracker[row.subjectId]=index+1;(used[row.subjectId]=used[row.subjectId]||new Set).add(tpIndex);
  // Pertemuan terakhir = merefleksi; separuh pertama sisanya = memahami; sisanya = mengaplikasi.
  const phase=index===n-1?'Merefleksi':index<Math.ceil((n-1)/2)?'Memahami':'Mengaplikasi';
  const media=joinUnique([...mediaGlobal,...String(settings.media||'').split(', ')]).join(', ');
  const assessmentLines=[jenis.join(', '),joinUnique([...teknik,...String(settings.assessment||'').split(', ')]).join(', ')].filter(Boolean);
  return {period:C.period(db),date:row.date,subjectId:row.subjectId,jp:row.jp,tp,activity:activitySentence(phase,extractTopic(tp),index),media,assessment:assessmentLines.join('\n'),remarks:'',reflection:'',followup:''};
 });
 // TP yang tidak kebagian pertemuan (jumlah TP lebih banyak daripada pertemuan efektif).
 rows.uncovered=Object.entries(used).flatMap(([sid,set])=>plan.plans[sid].tps.filter((_,i)=>!set.has(i)).map(tp=>db.subjects.find(s=>s.id===sid).name+': '+tp));
 return rows;
}
function fresh(db,rows){const seen=new Set(db.journals.map(j=>j.period+'|'+j.date+'|'+j.subjectId+'|'+j.tp)),added=[];for(const r of rows){const k=r.period+'|'+r.date+'|'+r.subjectId+'|'+r.tp;if(!seen.has(k)){seen.add(k);added.push(r)}}return {added,skipped:rows.length-added.length};}
root.JournalPlanner={generate,fresh,extractTopic};
})(typeof window==='undefined'?globalThis:window);

// ===== Antarmuka: memakai kelas, semester, dan penyimpanan yang sama dengan halaman lain =====
function journalPhaseFor(className){
 const n=Number((String(className||'').match(/\d+/)||[])[0]||0);
 return n<=0?'C':n<=2?'A':n<=4?'B':n<=6?'C':n<=9?'D':n===10?'E':'F';
}
function journalBankTPs(subjectName,phase){
 const bank=globalThis.JournalTPBank||{},norm=s=>String(s).toLowerCase().replace(/[^a-z0-9]/g,''),name=norm(subjectName);
 const key=Object.keys(bank).find(k=>norm(k)===name||(['ipas','pjok'].includes(name)&&norm(k).includes(name))||(name==='pai'&&norm(k).includes('pendidikanagamaislam')));
 return bank[key]?.[phase]||[];
}
function journalPlannerDialog(){
 if(!db.subjects.length){location.hash='subjects';return toast('Tambahkan mata pelajaran terlebih dahulu.');}
 const saved=db.journalPlanner||{},month=journalMonth||saved.month||today().slice(0,7),names=['','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
 const phase=saved.phase||journalPhaseFor(db.settings.className);
 const mediaOpts=globalThis.JournalMediaOptions||[],teknikOpts=globalThis.JournalAssessmentOptions||[];
 const checks=(name,opts,chosen=[])=>opts.map(o=>`<label class="pick"><input type="checkbox" name="${name}" value="${esc(o)}" ${chosen.includes(o)?'checked':''}><span>${esc(o)}</span></label>`).join('');
 const line=(r={day:1,subjectId:db.subjects[0].id,jp:2})=>`<div class="schedule-line">${sel('Hari','schedule-day',names.slice(1).map((n,i)=>[i+1,n]),r.day)}${sel('Mapel','schedule-subject',subOpts(),r.subjectId)}${input('JP','schedule-jp',r.jp,'number','min="0.5" max="24" step="0.5" required')}<button type="button" data-remove-schedule aria-label="Hapus jadwal">Hapus</button></div>`;
 modal('Susun jurnal bulanan',`<form><p class="sub">Alur penyusunan: jadwal mengajar → hari libur → media &amp; asesmen → Tujuan Pembelajaran. Kegiatan tiap pertemuan disusun otomatis (memahami → mengaplikasi → merefleksi) dan dapat Anda sunting sebelum disimpan.</p>
 <div class="form-grid">${input('Bulan jurnal','month',month,'month','required')}${sel('Jenjang','level',[['SD','SD / MI'],['SMP','SMP / MTs'],['SMA','SMA / MA'],['SMK','SMK']],saved.level||'SD')}${sel('Fase contoh TP','phase',[['A','A · kelas 1–2'],['B','B · kelas 3–4'],['C','C · kelas 5–6'],['D','D · kelas 7–9'],['E','E · kelas 10'],['F','F · kelas 11–12']],phase)}</div>
 <h3>1. Jadwal mengajar per hari</h3><p class="helper">Tambahkan satu baris untuk setiap mapel pada hari tersebut. JP dicantumkan bersama nama mapel pada jurnal.</p><div id="journal-schedules">${(saved.schedule?.length?saved.schedule:[undefined]).map(line).join('')}</div><button id="add-journal-schedule" type="button">＋ Tambah jadwal</button>
 <h3>2. Tandai hari libur</h3><p class="helper">Klik tanggal untuk menandai libur atau minggu tidak efektif. Minggu otomatis dilewati, begitu pula tanggal di luar rentang semester.</p><div id="journal-holidays" class="holiday-grid calendar"></div>
 <h3>3. Media &amp; asesmen <small>(berlaku untuk semua entri bulan ini)</small></h3>
 <div class="planner-picks"><div><p class="pick-title">Media pembelajaran</p><div class="pick-list">${checks('pl-media',mediaOpts,saved.media)}</div></div>
 <div><p class="pick-title">Jenis asesmen</p><div class="pick-list">${checks('pl-jenis',['Formatif','Sumatif'],saved.assessTypes)}</div><p class="pick-title">Teknik asesmen</p><div class="pick-list">${checks('pl-teknik',teknikOpts,saved.assessTechniques)}</div></div></div>
 <h3>4. Tujuan Pembelajaran per mapel</h3><p class="helper">Centang TP dari contoh fase terpilih dan/atau ketik TP sendiri (satu TP per baris). Cukup isi mapel yang ada di jadwal.</p>
 ${db.subjects.map(sub=>`<details class="planner-subject" data-subject="${esc(sub.id)}"><summary><span class="tp-dot"></span>${esc(sub.name)} <span class="tp-badge" data-tp-badge="${esc(sub.id)}">0 TP</span></summary><div data-tp-choices="${esc(sub.id)}"></div>${textarea('Atau ketik TP manual — satu TP per baris','tp-'+sub.id,'')}</details>`).join('')}
 <div class="form-actions">${btn('close','Batal','','type="button"')}<button class="primary" type="submit">✨ Susun draf jurnal</button></div></form>`,f=>{
  try{
   const plan={month:f.get('month'),level:f.get('level'),phase:f.get('phase'),holidays:f.getAll('holiday'),
    media:f.getAll('pl-media'),assessTypes:f.getAll('pl-jenis'),assessTechniques:f.getAll('pl-teknik'),
    schedule:$$('#journal-schedules .schedule-line').map(el=>({day:Number(el.querySelector('[name=schedule-day]').value),subjectId:el.querySelector('[name=schedule-subject]').value,jp:Number(el.querySelector('[name=schedule-jp]').value)})),
    plans:Object.fromEntries(db.subjects.map(s=>{
     const manual=String(f.get('tp-'+s.id)||'').split('\n').map(t=>t.trim()).filter(Boolean);
     return [s.id,{tps:[...new Set([...f.getAll('tpb-'+s.id),...manual])],media:'',assessment:''}];
    }))};
   const rows=JournalPlanner.generate(db,plan);close();journalDraftDialog(plan,rows);
  }catch(e){toast(e.message)}
 });
 const form=$('#dialog form');
 const countTPs=id=>{
  const box=$$('[data-tp-choices]').find(el=>el.dataset.tpChoices===id),area=$$('#dialog textarea').find(a=>a.name==='tp-'+id);
  const n=new Set([...box.querySelectorAll('input:checked')].map(i=>i.value).concat(area.value.split('\n').map(t=>t.trim()).filter(Boolean))).size;
  const badge=$(`[data-tp-badge="${CSS.escape(id)}"]`);badge.textContent=n+' TP';badge.classList.toggle('on',n>0);
  badge.closest('summary').querySelector('.tp-dot').classList.toggle('on',n>0);
 };
 const paintChoices=(restore)=>{
  const ph=$('#dialog [name=phase]').value;
  $$('[data-tp-choices]').forEach(el=>{
   const subject=db.subjects.find(s=>s.id===el.dataset.tpChoices),tps=journalBankTPs(subject.name,ph),area=$$('#dialog textarea').find(a=>a.name==='tp-'+subject.id);
   const previous=restore?(saved.plans?.[subject.id]?.tps||[]):[...el.querySelectorAll('input:checked')].map(i=>i.value);
   el.innerHTML=tps.length?`<div class="tp-tools"><span class="helper">Contoh TP fase ${ph}. Tinjau kesesuaiannya dengan kurikulum dan kebutuhan kelas.</span><span><button type="button" data-tp-all="${esc(subject.id)}">Pilih semua</button><button type="button" data-tp-none="${esc(subject.id)}">Reset</button></span></div><div class="tp-bank-list">${tps.map(tp=>`<label><input type="checkbox" name="tpb-${esc(subject.id)}" value="${esc(tp)}" ${previous.includes(tp)?'checked':''}><span>${esc(tp)}</span></label>`).join('')}</div>`:'<p class="helper">Belum ada contoh TP untuk nama mapel dan fase ini. Ketik TP sendiri di bawah.</p>';
   if(restore){area.value=previous.filter(t=>!tps.includes(t)).join('\n');}
   countTPs(subject.id);
  });
 };
 paintChoices(true);$('#dialog [name=phase]').onchange=()=>paintChoices(false);
 form.addEventListener('change',e=>{const el=e.target.closest('[data-tp-choices] input');if(el)countTPs(el.closest('[data-tp-choices]').dataset.tpChoices)});
 form.addEventListener('input',e=>{if(e.target.matches('textarea[name^="tp-"]'))countTPs(e.target.name.slice(3))});
 form.addEventListener('click',e=>{
  const all=e.target.closest('[data-tp-all]'),none=e.target.closest('[data-tp-none]');if(!all&&!none)return;
  const id=(all||none).dataset.tpAll||(all||none).dataset.tpNone;
  $$('[data-tp-choices]').find(el=>el.dataset.tpChoices===id).querySelectorAll('input').forEach(i=>i.checked=!!all);countTPs(id);
 });
 const paint=()=>{
  const m=$('#dialog [name=month]').value;if(!/^\d{4}-\d{2}$/.test(m))return;
  const y=Number(m.slice(0,4)),mo=Number(m.slice(5)),count=new Date(y,mo,0).getDate(),first=new Date(Date.UTC(y,mo-1,1,12)).getUTCDay();
  const head=['Mg','Sn','Sl','Rb','Km','Jm','Sb'].map(d=>`<span class="cal-head">${d}</span>`).join('');
  const blanks='<span></span>'.repeat(first);
  $('#journal-holidays').innerHTML=head+blanks+Array.from({length:count},(_,i)=>{
   const dt=m+'-'+String(i+1).padStart(2,'0'),sunday=new Date(dt+'T12:00:00Z').getUTCDay()===0;
   return `<label class="cal-day ${sunday?'sun':''}" title="${sunday?'Hari Minggu':'Klik untuk tandai libur'}"><input type="checkbox" name="holiday" value="${dt}" ${sunday?'checked disabled':saved.holidays?.includes(dt)?'checked':''}><span>${i+1}</span></label>`;
  }).join('');
 };paint();$('#dialog [name=month]').onchange=paint;
 $('#add-journal-schedule').onclick=()=>$('#journal-schedules').insertAdjacentHTML('beforeend',line());
 $('#journal-schedules').onclick=e=>{if(e.target.closest('[data-remove-schedule]'))e.target.closest('.schedule-line').remove()};
}
function journalDraftDialog(plan,rows){
 const preview=JournalPlanner.fresh(db,rows),uncovered=rows.uncovered||[];
 modal('Tinjau draf jurnal',`<form><div class="notice green">${rows.length} draf kegiatan disusun; ${preview.skipped} sudah memiliki jurnal dengan tanggal, mapel, dan TP yang sama. Jurnal lama tetap dipertahankan. Semua kolom dapat diubah sebelum disimpan.</div>
 ${uncovered.length?`<div class="notice">${uncovered.length} TP belum kebagian pertemuan karena jumlah TP lebih banyak daripada pertemuan efektif bulan ini: ${esc(uncovered.join(' · '))}. Kurangi TP atau tambahkan jadwal bila perlu.</div>`:''}
 <div class="table-wrap"><table class="journal-draft"><thead><tr><th>Tanggal / mapel</th><th>TP</th><th>Kegiatan</th><th>Media</th><th>Asesmen</th><th>Keterangan</th></tr></thead><tbody>${rows.map((r,i)=>`<tr><td>${niceDate(r.date)}<br>${esc(subject(r.subjectId))}<br>${r.jp} JP</td>${[['tp',r.tp],['activity',r.activity],['media',r.media],['assessment',r.assessment],['remarks',r.remarks]].map(([key,value])=>`<td><textarea name="${key}-${i}" aria-label="${key} ${niceDate(r.date)} ${esc(subject(r.subjectId))}" ${['tp','activity'].includes(key)?'required':''}>${esc(value)}</textarea></td>`).join('')}</tr>`).join('')}</tbody></table></div>
 <div class="form-actions">${btn('close','Batal','','type="button"')}<button class="primary" type="submit">Simpan jurnal yang belum ada</button></div></form>`,f=>{
  const data=rows.map((r,i)=>({...r,...Object.fromEntries(['tp','activity','media','assessment','remarks'].map(k=>[k,String(f.get(k+'-'+i)||'').trim()]))}));
  if(data.some(r=>!r.tp||!r.activity))return toast('TP dan kegiatan wajib diisi.');
  const current=JournalPlanner.fresh(db,data);
  if(mutate(d=>{d.journalPlanner=plan;d.journals.push(...current.added.map(r=>({...r,id:uid('j')})))})){journalMonth=plan.month;close();render();toast(`${current.added.length} jurnal tersimpan; ${current.skipped} jurnal yang sudah ada dilewati.`);}
 });
}

// ===== Sunting langsung di tabel jurnal (klik sel, ketik, lalu klik di luar sel) =====
function journalInlineSave(el){
 const id=el.dataset.jid,field=el.dataset.jfield,j=db.journals.find(x=>x.id===id);if(!j)return;
 const value=el.innerText.replace(/\u00a0/g,' ').replace(/\n{3,}/g,'\n\n').trim();
 if(value===String(j[field]||''))return;
 if(['tp','activity'].includes(field)&&!value){el.textContent=j[field]||'';return toast('TP dan kegiatan tidak boleh kosong.');}
 if(mutate(d=>{d.journals.find(x=>x.id===id)[field]=value}))toast('Perubahan jurnal tersimpan.');
}

// ===== Unduh Word (.doc), format tabel KBM 7 kolom dengan tanda tangan =====
function journalWordExport(){
 const s=db.settings,list=db.journals.filter(j=>j.period===Core.period(db)&&(!journalMonth||j.date.startsWith(journalMonth))).sort((a,b)=>a.date.localeCompare(b.date));
 if(!list.length)return toast('Belum ada jurnal untuk diunduh pada pilihan bulan ini.');
 const bln=['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
 const periode=journalMonth?bln[Number(journalMonth.slice(5))-1]+' '+journalMonth.slice(0,4):'Seluruh semester';
 const dmy=d=>d.slice(8,10)+'/'+d.slice(5,7)+'/'+d.slice(0,4),br=t=>esc(t||'').replace(/\r?\n/g,'<br>');
 const rows=list.map(j=>`<tr><td class="c">${dmy(j.date)}</td><td class="c"><b>${esc(subject(j.subjectId))}</b><br>${j.jp} JP</td><td class="j">${br(j.tp)}</td><td class="j">${br(j.activity)}</td><td class="c">${br(j.media)}</td><td class="c">${br(j.assessment)}</td><td class="c">${br([j.remarks,j.reflection?'Refleksi: '+j.reflection:'',j.followup?'Tindak lanjut: '+j.followup:''].filter(Boolean).join('\n'))}</td></tr>`).join('');
 const html=`<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>Jurnal KBM</title><style>@page Section1{size:29.7cm 21cm;mso-page-orientation:landscape;margin:1.5cm}div.Section1{page:Section1}body{font-family:Arial,sans-serif;font-size:10pt}h2{text-align:center;font-size:14pt;margin:10px 0 4px}h3{text-align:center;font-size:12pt;margin:0 0 14px}table.d{width:100%;border-collapse:collapse}table.d th,table.d td{border:1px solid #000;padding:6px;vertical-align:top}table.d th{background:#f2f2f2;text-align:center}.c{text-align:center}.j{text-align:justify}table.t{width:100%;border:none;margin-top:36px;text-align:center}table.t td{border:none;width:50%}</style></head><body><div class="Section1">
 <p><b>Satuan Pendidikan : ${esc(s.school||'')}</b><br><b>Tahun Pelajaran : ${esc(s.year||'')}</b><br><b>Semester : ${s.semester==='2'?'Genap':'Ganjil'}</b><br><b>Bulan : ${esc(periode)}</b></p>
 <h2>JURNAL KEGIATAN BELAJAR MENGAJAR (KBM)${s.className?' KELAS '+esc(s.className):''}</h2><h3>Pengajar: ${esc(s.teacher||'')}</h3>
 <table class="d"><thead><tr><th width="10%">Tanggal</th><th width="12%">Mata Pelajaran</th><th width="20%">Tujuan Pembelajaran</th><th width="26%">Rincian Kegiatan Pembelajaran</th><th width="12%">Media Pembelajaran</th><th width="10%">Asesmen</th><th width="10%">Keterangan</th></tr></thead><tbody>${rows}</tbody></table>
 <table class="t"><tr><td>Mengetahui,<br>${esc(Core.principalTitle(db))}<br><br><br><br><b><u>${esc(s.principal||'')}</u></b><br>NIP. ${esc(s.principalNip||'-')}</td><td><br>Guru Mata Pelajaran<br><br><br><br><b><u>${esc(s.teacher||'')}</u></b><br>NIP. ${esc(s.teacherNip||'-')}</td></tr></table></div></body></html>`;
 download(DocumentNames.report(db,'journal',{month:journalMonth,journalRange:journalMonth?'month':'semester'},'doc'),'\ufeff'+html,'application/msword');
 toast('Jurnal diunduh dalam format Word.');
}
if(typeof document!=='undefined'){
 document.addEventListener('click',e=>{
  if(e.target.closest('[data-action="journal-planner"]'))journalPlannerDialog();
  if(e.target.closest('[data-action="export-journal-word"]'))journalWordExport();
 });
 document.addEventListener('focusout',e=>{const el=e.target.closest&&e.target.closest('[data-jfield]');if(el)journalInlineSave(el)});
}
