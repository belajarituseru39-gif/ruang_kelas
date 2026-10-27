let analysisBase='',analysisDraft=null,analysisSelected='',analysisDirty=false,analysisBusy=false,analysisTab='items',analysisParticipantSearch='';
function analysisCurrent(){
 const records=(db.questionAnalyses||[]).filter(a=>a.period===C.period(db));
 if(analysisDraft&&analysisDraft.period!==C.period(db)){analysisDraft=null;analysisDirty=false}
 if(analysisDraft&&!analysisDirty){const saved=records.find(a=>a.id===analysisDraft.id);if(JSON.stringify(saved||null)!==analysisBase)analysisDraft=null}
 if(!analysisDraft){const found=records.find(a=>a.id===analysisSelected)||records.at(-1);if(found){analysisDraft=structuredClone(found);analysisSelected=found.id;analysisBase=JSON.stringify(found)}}
 return analysisDraft;
}
function analysisPage(){
 const a=analysisCurrent(),records=(db.questionAnalyses||[]).filter(a=>a.period===C.period(db));
 const buttons=btn('analysis-template','↓ Template skor')+btn('analysis-import',analysisBusy?'Membaca Excel…':'↑ Unggah Excel','primary',analysisBusy?'disabled':'');
 let h=head('Analisis soal','Unggah hasil kuis, periksa peserta, lalu unduh analisis per soal.',buttons);
 h+='<input type="file" id="analysis-file" accept=".xlsx" hidden>';
 h+='<div class="notice green">Mendukung ekspor kuis Excel dengan lembar Keseluruhan dan Data Peserta seperti contoh, serta template skor dari aplikasi. Laporan memuat matriks skor, nilai, peringkat, dan tingkat kesukaran. PDF contoh digunakan sebagai acuan bentuk laporan. Data dianalisis di perangkat ini.</div>';
 if(records.length)h+='<section class="panel"><div class="toolbar">'+sel('Analisis tersimpan semester ini','analysis-record',records.map(r=>[r.id,r.title+' · '+r.subject]),analysisSelected)+'<span class="sub">'+records.length+' analisis tersimpan</span></div></section>';
 if(!a)return h+empty('Belum ada analisis soal','Unggah Excel hasil kuis atau isi template skor per soal terlebih dahulu.');
 let r;try{r=QuestionAnalysis.analyze(a)}catch{return h+'<div class="notice">Isian analisis belum valid. Unggah kembali berkas atau pilih analisis tersimpan.</div>'}
 const f=QuestionAnalysis.fmt,pct=QuestionAnalysis.pct;
 if(a.sourceCounts&&a.sourceCounts.listed>a.sourceCounts.matched)h+='<div class="notice"><b>'+esc(a.sourceCounts.listed-a.sourceCounts.matched)+' nama Data Peserta belum cocok dengan kolom jawaban.</b> Buka catatan sumber dan tab Pilih peserta untuk memilih percobaan yang sesuai. Pilihan awal hanya memakai nama yang cocok persis.</div>';
 h+='<section class="panel"><div class="panel-head"><h2>Pengaturan analisis</h2><span class="pill '+(analysisDirty?'amber':'')+'">'+(analysisDirty?'Belum disimpan':'Tersimpan')+'</span></div><div class="panel-body"><form id="analysis-settings"><div class="form-grid">'+
 sel('Jenis asesmen','assessmentType',Object.entries(QuestionAnalysis.assessmentTypes),a.assessmentType||'sumative')+input('Nama analisis (untuk daftar tersimpan)','title',a.title,'text','required maxlength="160"')+input('Mata pelajaran','subject',a.subject,'text','required maxlength="160" list="analysis-subjects"')+
 input('Kelas','className',a.className,'text','maxlength="80"')+input('Tanggal asesmen','date',a.date,'date','required')+input('KKTP (0–100)','threshold',a.threshold,'number','min="0" max="100" step="any" required')+
 input('Batas sukar: indeks ≤ (%)','hardLimit',a.hardLimit,'number','min="0" max="99" step="any" required')+input('Batas sedang: indeks ≤ (%)','easyLimit',a.easyLimit,'number','min="1" max="99.99" step="any" required')+
 '</div><datalist id="analysis-subjects">'+db.subjects.map(s=>'<option value="'+esc(s.name)+'">').join('')+'</datalist><p class="helper">Indeks = rata-rata proporsi skor pada soal. Di atas batas sedang termasuk mudah. Batas awal 30% dan 70% dapat disesuaikan. Skor maksimum diatur melalui tombol Atur soal & skor.</p><div class="form-actions">'+btn('analysis-weights','Atur soal & skor','','type="button"')+'<button type="submit" class="primary">Simpan analisis</button>'+btn('analysis-download','↓ Unduh hasil','','type="button"')+btn('analysis-discard','Batalkan perubahan','','type="button"')+(records.some(x=>x.id===a.id)?btn('analysis-delete','Hapus analisis','danger','type="button"'):'')+'</div></form></div></section>';
 h+='<div class="stats">'+[[r.n,'Peserta / percobaan dipilih'],[a.questions.length,'Jumlah soal'],[f(r.average),'Rata-rata nilai lengkap'],[r.mastered+' / '+r.n,'Mencapai KKTP']].map(([v,l])=>'<div class="stat"><div class="stat-top">'+l+'</div><div class="stat-value">'+v+'</div></div>').join('')+'</div>';
 h+='<p class="helper">'+r.complete+' peserta memiliki nilai lengkap; '+r.incomplete+' belum lengkap. Daya serap: '+pct(r.absorption)+'. Nilai dihitung ulang dari skor soal pada skala 0–100. Nilai rapor dan data murid tidak berubah.</p>';
 h+='<details class="panel"><summary style="padding:18px;cursor:pointer">Catatan berkas sumber dan percobaan berulang</summary><div class="panel-body"><b>'+esc(a.sourceName)+'</b>'+a.warnings.map(w=>'<p>'+esc(w)+'</p>').join('')+'</div></details>';
 h+='<section class="panel"><div class="toolbar">'+[['items','Analisis per soal'],['participants','Pilih peserta'],['matrix','Matriks skor']].map(([k,l])=>btn('analysis-tab',l,analysisTab===k?'primary small':'small','data-tab="'+k+'"')).join('')+'</div>';
 if(analysisTab==='items'){
  h+='<div class="table-wrap"><table><thead><tr><th>No.</th><th>Pertanyaan</th><th>Benar</th><th>Salah</th><th>Tidak dijawab</th><th>Sebagian</th><th>Belum dinilai</th><th>Indeks</th><th>Kesukaran</th><th>Tindak lanjut</th></tr></thead><tbody>'+r.items.map((q,i)=>'<tr><td>'+esc(q.number)+'</td><td style="min-width:270px;max-width:450px"><details><summary>'+esc(q.text.slice(0,110)||'Soal '+q.number)+(q.text.length>110?'…':'')+'</summary><p>'+esc(q.text)+'</p>'+btn('analysis-question','Lihat jawaban','small','data-index="'+i+'"')+'</details></td><td>'+q.correct+'</td><td>'+q.wrong+'</td><td>'+q.unanswered+'</td><td>'+q.partial+'</td><td>'+q.ungraded+'</td><td>'+pct(q.index===null?null:q.index*100)+'</td><td>'+({M:'Mudah',SD:'Sedang',SK:'Sukar'}[q.difficulty]||q.difficulty)+'</td><td style="min-width:200px">'+esc(QuestionAnalysis.recommend(q))+'</td></tr>').join('')+'</tbody></table></div>';
 }else if(analysisTab==='participants'){
  const list=a.participants.filter(p=>(p.name+' '+p.sourceLabel).toLowerCase().includes(analysisParticipantSearch.toLowerCase()));
  h+='<div class="toolbar">'+btn('analysis-preset','Pilih dari Data Peserta','small','data-preset="listed"')+btn('analysis-preset','Pilih semua percobaan','small','data-preset="all"')+btn('analysis-preset','Kosongkan pilihan','small','data-preset="none"')+'<input id="analysis-search" aria-label="Cari peserta analisis" placeholder="Cari nama atau percobaan" value="'+esc(analysisParticipantSearch)+'"></div><p class="helper" style="padding:0 18px">Satu baris adalah satu percobaan dari sumber. Pilih satu percobaan yang sesuai untuk tiap murid. Nama mirip dan tanda * tidak digabung otomatis. Pilihan berlaku untuk seluruh perhitungan.</p><div class="table-wrap"><table><thead><tr><th>Pilih</th><th>Nama peserta</th><th>Identitas dari sumber</th><th>Data Peserta</th><th>Skor terisi</th><th>Tindakan</th></tr></thead><tbody>'+list.map(p=>'<tr><td><input type="checkbox" aria-label="Pilih '+esc(p.name)+'" data-analysis-include="'+esc(p.id)+'" '+(p.included?'checked':'')+'></td><td>'+esc(p.name)+'</td><td>'+esc(p.sourceLabel)+'</td><td>'+(p.listed?'Ya':'—')+'</td><td>'+p.scores.filter(x=>x!==null).length+' / '+a.questions.length+'</td><td>'+btn('analysis-scores','Ubah nama / skor','small','data-participant="'+esc(p.id)+'"')+'</td></tr>').join('')+'</tbody></table></div>';
 }else{
  h+='<div class="table-wrap"><table class="analysis-matrix"><thead><tr><th>No.</th><th>Nama siswa</th>'+a.questions.map(q=>'<th>'+esc(q.number)+'<small>Maks. '+f(q.max)+'</small></th>').join('')+'<th>Nilai</th><th>Peringkat</th></tr></thead><tbody>'+r.participants.map((p,i)=>'<tr><td>'+(i+1)+'</td><td>'+esc(p.name)+'</td>'+p.scores.map((s,j)=>'<td class="analysis-'+p.states[j]+'">'+(s===null?'?':f(s*a.questions[j].max))+'</td>').join('')+'<td>'+f(p.value)+'</td><td>'+(p.rank??'—')+'</td></tr>').join('')+'</tbody></table></div><p class="helper" style="padding:0 18px">Hijau: benar penuh. Merah: salah. Kuning: sebagian benar. Abu-abu: tidak dijawab atau belum dinilai (?). Nilai/peringkat memakai seluruh soal.</p>';
 }
 return h+'</section>';
}
function analysisSync(){
 const form=$('#analysis-settings');if(!form||!analysisDraft)return true;
 if(!form.reportValidity())return false;
 const next=structuredClone(analysisDraft),values=Object.fromEntries(new FormData(form));
 for(const k of ['title','subject','className','date','assessmentType'])next[k]=String(values[k]||'').trim();
 for(const k of ['threshold','hardLimit','easyLimit'])next[k]=values[k]===''?NaN:Number(values[k]);
 try{QuestionAnalysis.validate(next);analysisDraft=next;return true}catch(e){toast(e.message);return false}
}
function bindAnalysis(){
 const picker=$('#analysis-file');if(picker)picker.onchange=async()=>{const file=picker.files[0];picker.value='';if(!file)return;if(analysisBusy)return;
  if(!/\.xlsx$/i.test(file.name)||file.size>20*1024*1024)return toast('Pilih Excel .xlsx maksimal 20 MB.');
  analysisBusy=true;toast('Membaca soal dan mencocokkan status jawaban…');
  try{
   const imported=await QuestionAnalysis.readWorkbook(await file.arrayBuffer(),file.name);
   const label=/bahasa[\s_-]*indonesia/i.test(file.name)?'Bahasa Indonesia':db.subjects[0]?.name||'Mata pelajaran';
   const a={...imported,id:uid('analysis'),period:C.period(db),assessmentType:'sumative',subject:label,className:db.settings.className,date:today(),threshold:db.settings.threshold,hardLimit:30,easyLimit:70};
   QuestionAnalysis.validate(a);analysisBase='null';analysisDraft=a;analysisSelected='';analysisDirty=true;analysisTab='items';analysisParticipantSearch='';
   render();toast(a.questions.length+' soal terbaca. Periksa pilihan peserta dan simpan analisis.');
  }catch(e){toast('Berkas belum dapat dianalisis: '+e.message);modal('Excel belum dapat dianalisis','<p>'+esc(e.message)+'</p><p>Data sebelumnya tetap tersimpan. Gunakan ekspor asli atau template skor Analisis Soal.</p>')}finally{analysisBusy=false;if(page==='analysis')render()}
 };
 const form=$('#analysis-settings');if(form){
  form.oninput=()=>{analysisDirty=true;const pill=form.closest('.panel').querySelector('.pill');pill.textContent='Belum disimpan';pill.classList.add('amber')};
  form.onsubmit=e=>{e.preventDefault();if(!analysisSync())return;try{QuestionAnalysis.validate(analysisDraft);if(!analysisDraft.participants.some(p=>p.included))throw Error('Pilih setidaknya satu peserta.');const copy=structuredClone(analysisDraft);if(JSON.stringify((db.questionAnalyses||[]).find(a=>a.id===copy.id)||null)!==analysisBase)throw Error('Analisis tersimpan berubah dari tab/pemulihan lain. Batalkan perubahan lalu buka ulang sebelum menyimpan.');if(mutate(d=>{d.questionAnalyses??=[];const i=d.questionAnalyses.findIndex(x=>x.id===copy.id);if(i<0)d.questionAnalyses.push(copy);else d.questionAnalyses[i]=copy})){analysisDirty=false;analysisBase=JSON.stringify(copy);analysisSelected=copy.id;render();toast('Analisis soal tersimpan dan ikut cadangan JSON.')}}catch(e){toast(e.message)}};
 }
 const select=$('[name=analysis-record]');if(select)select.onchange=()=>{const id=select.value;select.value=analysisSelected;const change=()=>{close();analysisDraft=null;analysisSelected=id;analysisDirty=false;render()};if(analysisDirty)confirmAction('Buka analisis tersimpan?','Perubahan analisis yang belum disimpan akan dilepas.',change,'Buka analisis');else change()};
 $$('[data-analysis-include]').forEach(el=>el.onchange=()=>{if(!analysisSync()){el.checked=!el.checked;return}analysisDraft.participants.find(p=>p.id===el.dataset.analysisInclude).included=el.checked;analysisDirty=true;render()});
 const search=$('#analysis-search');if(search)search.oninput=()=>{if(!analysisSync())return;const pos=search.selectionStart;analysisParticipantSearch=search.value;render();$('#analysis-search').focus();$('#analysis-search').setSelectionRange(pos,pos)};
}
function analysisWeights(){
 if(!analysisSync())return;const a=analysisDraft;
 modal('Atur soal dan skor maksimum','<form><p class="helper">Skor benar penuh mengikuti skor maksimum. Mengubah bobot mempertahankan proporsi skor peserta. Contoh: 25 soal × 4 = 100. Semua nilai akhir tetap dinormalisasi ke 0–100.</p>'+input('Terapkan skor maksimum yang sama ke semua soal','uniform','','number','min="0.01" max="1000" step="any"')+btn('analysis-uniform','Terapkan ke semua soal','','type="button"')+'<div class="table-wrap" style="max-height:52vh"><table><thead><tr><th>No.</th><th>Teks soal</th><th>Skor maksimum</th></tr></thead><tbody>'+a.questions.map((q,i)=>'<tr><td>'+esc(q.number)+'</td><td><textarea aria-label="Teks soal '+esc(q.number)+'" name="text-'+i+'" maxlength="20000">'+esc(q.text)+'</textarea></td><td><input aria-label="Skor maksimum soal '+esc(q.number)+'" name="max-'+i+'" type="number" min="0.01" max="1000" step="any" required value="'+q.max+'"></td></tr>').join('')+'</tbody></table></div><div class="form-actions">'+btn('close','Batal','','type="button"')+'<button type="submit" class="primary">Terapkan pengaturan soal</button></div></form>',f=>{
  const copy=structuredClone(a);copy.questions.forEach((q,i)=>{q.max=Number(f.get('max-'+i));q.text=String(f.get('text-'+i)).trim()});try{QuestionAnalysis.validate(copy);analysisDraft=copy;analysisDirty=true;close();render()}catch(e){toast(e.message)}
 });
}
function analysisScores(id){
 if(!analysisSync())return;const a=analysisDraft,p=a.participants.find(p=>p.id===id);if(!p)return;
 modal('Ubah peserta dan skor','<form>'+input('Nama pada laporan','name',p.name,'text','required maxlength="300"')+'<p class="helper">Identitas sumber: '+esc(p.sourceLabel)+'. Kosong = belum dinilai. Nilai 0 = salah. Pilih TD untuk tidak dijawab. Perubahan berlaku pada analisis ini.</p><div class="table-wrap" style="max-height:55vh"><table><thead><tr><th>No.</th><th>Soal / jawaban sumber</th><th>Skor</th><th>TD</th></tr></thead><tbody>'+a.questions.map((q,i)=>'<tr><td>'+esc(q.number)+'</td><td style="min-width:230px">'+esc(q.text.slice(0,150))+'<div class="sub">Jawaban: '+esc(p.answers[i]||'—')+'</div></td><td><input aria-label="Skor soal '+esc(q.number)+'" name="score-'+i+'" type="number" min="0" max="'+q.max+'" step="any" value="'+(p.scores[i]===null?'':Number((p.scores[i]*q.max).toFixed(8)))+'"><small>Maks. '+q.max+'</small></td><td><input aria-label="Tidak dijawab soal '+esc(q.number)+'" name="td-'+i+'" type="checkbox" '+(p.states[i]==='unanswered'?'checked':'')+'></td></tr>').join('')+'</tbody></table></div><div class="form-actions">'+btn('close','Batal','','type="button"')+'<button class="primary" type="submit">Terapkan skor</button></div></form>',f=>{
  const copy=structuredClone(a),target=copy.participants.find(x=>x.id===id);target.name=String(f.get('name')).trim();
  a.questions.forEach((q,i)=>{const raw=f.get('score-'+i),td=f.has('td-'+i),n=td?0:raw===''?null:Number(raw)/q.max;target.scores[i]=n;target.states[i]=td?'unanswered':n===null?'ungraded':n===1?'correct':n===0?'wrong':'partial'});
  try{QuestionAnalysis.validate(copy);analysisDraft=copy;analysisDirty=true;close();render()}catch(e){toast(e.message)}
 });
 // Editing a score is explicit; uncheck TD so the entered score is used.
 $$('#dialog [name^="score-"]').forEach(el=>el.oninput=()=>{$('#dialog [name="td-'+el.name.slice(6)+'"]').checked=false});
}
function analysisExport(){
 if(!analysisSync())return;const a=structuredClone(analysisDraft);try{QuestionAnalysis.validate(a);if(!a.participants.some(p=>p.included))throw Error('Pilih setidaknya satu peserta.')}catch(e){return toast(e.message)}
 modal('Unduh analisis soal','<form><p>Format mengikuti contoh: nama siswa, skor tiap nomor, nilai, peringkat, rekap benar/salah, tingkat kesukaran, dan tanda tangan. Matriks nilai disusun dalam 2 halaman landscape, dilanjutkan Ringkasan Analisis per Soal pada halaman tambahan. Seluruh nomor soal ditampilkan pada kedua halaman; daftar peserta berlanjut di halaman kedua, diikuti rekap dan tanda tangan. Judul mengikuti jenis asesmen yang dipilih. Pada Semua mata pelajaran, seluruh analisis tersimpan yang sesuai digabung dalam satu berkas, termasuk perubahan analisis yang sedang dibuka. Setiap analisis dimulai pada halaman baru.</p><div class="form-grid">'+sel('Cakupan unduhan','analysisScope',[['current','Analisis yang sedang dibuka'],['all','Semua mata pelajaran (semester aktif)']],'current')+sel('Jenis asesmen untuk semua mapel','batchType',[['all','Semua jenis asesmen'],...Object.entries(QuestionAnalysis.assessmentTypes)],a.assessmentType||'sumative')+sel('Format','format',[['pdf','PDF siap cetak'],['xlsx','Excel laporan'],['html','HTML pratinjau / cetak']],'pdf')+sel('Ukuran kertas','paper',[['legal','Legal landscape'],['f4','F4 landscape']],'legal')+input('Tanggal tanda tangan','signDate',today(),'date','required')+input('Tempat tanda tangan','signCity',db.settings.city)+'</div><p id="analysis-export-list" class="notice"></p><p class="helper">Matriks nilai menyesuaikan dalam 2 halaman. Nilai akhir ditampilkan sebagai bilangan bulat. Ringkasan memuat pertanyaan, jumlah benar/salah, indeks, kesukaran, dan tindak lanjut; halaman bertambah sesuai panjang isi. Identitas dan tanda tangan mengikuti Data sekolah/Data kelas. '+(analysisDirty?'Analisis ini belum disimpan; klik Simpan analisis agar dapat dibuka kembali.':'')+'</p><div class="form-actions">'+btn('close','Batal','','type="button"')+'<button type="submit" class="primary">Unduh analisis</button></div></form>',async(f,form)=>{
  const b=form.querySelector('[type=submit]');b.disabled=true;b.textContent='Menyiapkan laporan…';
  try{const o={...Object.fromEntries(f),analysis:a,signMode:'last'},format=o.format;if(o.analysisScope==='all')o.analyses=QuestionAnalysis.selectReports(db,a,o);let data,mime;if(format==='pdf'){data=await ReportPrint.pdf(db,'analysis',o);mime='application/pdf'}else if(format==='xlsx'){data=await ReportExcel.buffer(db,'analysis',o);mime=ExcelIO.MIME}else{data=await ReportPrint.html(db,'analysis',o);mime='text/html;charset=utf-8'}
   download(DocumentNames.report(db,'analysis',o,format),data,mime);close();toast('Hasil analisis berhasil dibuat.');
  }catch(e){toast('Laporan belum dapat dibuat: '+e.message);b.disabled=false;b.textContent='Unduh analisis'}
 });
 const form=$('#dialog form'),scope=form.elements.analysisScope,type=form.elements.batchType,info=$('#analysis-export-list');
 const refresh=()=>{const all=scope.value==='all';type.disabled=!all;type.closest('label').style.display=all?'':'none';try{const chosen=QuestionAnalysis.selectReports(db,a,{analysisScope:scope.value,batchType:type.value});info.textContent=chosen.length+' analisis: '+chosen.map(x=>x.subject+' — '+QuestionAnalysis.assessmentTypes[x.assessmentType||'sumative']+' ('+x.date+')').join('; ')}catch(e){info.textContent=e.message}};
 scope.onchange=refresh;type.onchange=refresh;refresh();
}
async function analysisTemplate(){
 modal('Template analisis soal','<form><div class="form-grid">'+input('Jumlah soal','count',25,'number','min="1" max="200" required')+input('Skor maksimum tiap soal','max',4,'number','min="0.01" max="1000" step="any" required')+'</div><p>Template berisi nama murid aktif jika tersedia. Isi skor per soal. Kosong = belum dinilai; TD = tidak dijawab. Bila baris Kunci jawaban diisi, kolom tersebut menerima jawaban teks yang dicocokkan dengan kunci.</p><div class="form-actions">'+btn('close','Batal','','type="button"')+'<button type="submit" class="primary">Unduh template</button></div></form>',async(f,form)=>{
  const b=form.querySelector('[type=submit]');b.disabled=true;
  try{const count=Number(f.get('count')),max=Number(f.get('max'));if(!Number.isInteger(count)||count<1||count>200||!Number.isFinite(max)||max<=0||max>1000)throw Error('Jumlah soal/skor maksimum tidak valid.');
   const wb=new ExcelJS.Workbook(),ws=wb.addWorksheet('Skor Soal'),numbers=Array.from({length:count},(_,i)=>String(i+1));
   ws.addRow(['No.','Nama peserta',...numbers]);ws.addRow(['','Skor maksimum',...numbers.map(()=>max)]);ws.addRow(['','Teks soal',...numbers.map(()=>'')]);ws.addRow(['','Kunci jawaban',...numbers.map(()=>'')]);
   const pupils=C.active(db);if(pupils.length)pupils.forEach((p,i)=>ws.addRow([i+1,p.name]));else for(let i=0;i<10;i++)ws.addRow([i+1,'']);
   ws.columns=[{width:7},{width:35},...numbers.map(()=>({width:14}))];ws.views=[{state:'frozen',xSplit:2,ySplit:4}];
   for(let r=1;r<=4;r++){ws.getRow(r).height=r===3?40:24;ws.getRow(r).eachCell({includeEmpty:true},c=>{c.font={name:'Arial',size:11,bold:true};c.fill={type:'pattern',pattern:'solid',fgColor:{argb:r===1?'FFD9E3F1':'FFF1F5F2'}};})}
   ws.eachRow(r=>r.eachCell(c=>c.alignment={wrapText:true,vertical:'middle'}));
   const guide=wb.addWorksheet('Petunjuk');['TEMPLATE ANALISIS SOAL','1. Satu peserta/percobaan per baris. Nama wajib diisi.','2. Baris 1 = nomor soal unik; baris 2 = skor maksimum positif.','3. Isi teks soal pada baris 3 bila ingin dicetak pada analisis.','4. Kunci jawaban opsional. Jika diisi, masukkan jawaban teks di kolom tersebut. Perbandingan mengabaikan huruf besar/kecil dan spasi berlebih.','5. Tanpa kunci: isi skor angka 0 sampai maksimum. Nilai sebagian diperbolehkan.','6. Kosong = belum dinilai (nilai belum lengkap). TD = tidak dijawab dan bernilai 0.','7. Tambahkan baris peserta sesuai kebutuhan. Jangan sisipkan total atau rata-rata di bawah tabel.','8. Unggah kembali lewat Analisis soal > Unggah Excel. Periksa peserta, KKTP dan skor, lalu Simpan analisis.','9. Nilai = total skor / total skor maksimum × 100. Skor rapor tidak diubah.'].forEach(t=>guide.addRow([t]));guide.getColumn(1).width=105;guide.eachRow(r=>{r.height=34;r.getCell(1).alignment={wrapText:true,vertical:'middle'}});
   download(DocumentNames.make(db,'Template Analisis Soal','xlsx'),await wb.xlsx.writeBuffer(),ExcelIO.MIME);close();
  }catch(e){toast(e.message);b.disabled=false}
 });
}
document.addEventListener('click',e=>{
 const el=e.target.closest('[data-action]');if(!el||!el.dataset.action.startsWith('analysis-'))return;const action=el.dataset.action;
 if(action==='analysis-import'){const open=()=>{close();$('#analysis-file').click()};if(analysisDirty)confirmAction('Unggah analisis baru?','Perubahan yang belum disimpan akan diganti setelah berkas baru berhasil dibaca.',open,'Pilih berkas');else open();return}
 if(action==='analysis-template'){analysisTemplate();return}
 if(action==='analysis-uniform'){const form=$('#dialog form'),n=Number(form.elements.uniform.value);if(!(n>0&&n<=1000))return toast('Skor maksimum harus > 0 dan ≤ 1.000.');form.querySelectorAll('[name^="max-"]').forEach(el=>el.value=n);return}
 if(action==='analysis-discard'){confirmAction('Batalkan perubahan?','Perubahan sejak terakhir disimpan akan dilepas.',()=>{analysisDraft=null;analysisDirty=false;close();render()},'Batalkan perubahan');return}
 if(action==='analysis-delete'){const id=analysisDraft.id;confirmAction('Hapus analisis ini?','Analisis ini akan dihapus dari penyimpanan. Data murid dan nilai rapor tetap tersimpan.',()=>{if(mutate(d=>d.questionAnalyses=d.questionAnalyses.filter(a=>a.id!==id))){analysisDraft=null;analysisSelected='';analysisDirty=false;close();render()}},'Hapus analisis');return}
 if(action==='analysis-download'){analysisExport();return}
 if(action==='analysis-weights'){analysisWeights();return}
 if(action==='analysis-scores'){analysisScores(el.dataset.participant);return}
 if(action==='analysis-tab'){if(!analysisSync())return;analysisTab=el.dataset.tab;render();return}
 if(action==='analysis-preset'){if(!analysisSync())return;analysisDraft.participants.forEach(p=>p.included=el.dataset.preset==='all'||el.dataset.preset==='listed'&&p.listed);analysisDirty=true;render();return}
 if(action==='analysis-question'){if(!analysisSync())return;const q=QuestionAnalysis.analyze(analysisDraft).items[Number(el.dataset.index)];modal('Soal '+q.number,'<p>'+esc(q.text)+'</p><p>'+esc(QuestionAnalysis.recommend(q))+'</p><div class="table-wrap"><table><thead><tr><th>Jawaban tercatat</th><th>Jumlah peserta terpilih</th></tr></thead><tbody>'+q.answers.map(a=>'<tr><td>'+esc(a.answer)+'</td><td>'+a.count+'</td></tr>').join('')+'</tbody></table></div><p class="helper">Daftar ini merangkum jawaban sumber. Jawaban yang paling banyak dipilih tidak otomatis merupakan kunci yang benar.</p>')}
});

