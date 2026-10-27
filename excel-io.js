(function(root){
const X=root.ExcelCore,C=root.Core;
const MIME='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const listValidation=formula=>({type:'list',allowBlank:true,formulae:[formula],showErrorMessage:true,errorTitle:'Pilihan tidak valid',error:'Pilih nilai dari daftar.'});
function styleTable(ws,headers,rows){
 ws.addRow(headers);rows.forEach(row=>ws.addRow(row));ws.views=[{state:'frozen',ySplit:1,showGridLines:false}];
 ws.getRow(1).height=30;ws.getRow(1).eachCell(cell=>{cell.font={name:'Calibri',size:11,bold:true,color:{argb:'FFFFFFFF'}};cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF205E49'}};cell.alignment={vertical:'middle',wrapText:true}});
 ws.columns.forEach((col,i)=>{const h=headers[i];col.width=/Catatan|Refleksi|Kegiatan|Alamat|Tindak|Keterangan/.test(h)?48:/Nama|Mapel|TP/.test(h)?30:/ID_/.test(h)?24:19;col.numFmt=['Nilai','JP'].includes(h)?'0.##':'@';});
 ws.eachRow((row,n)=>{if(n>1){row.height=32;row.eachCell({includeEmpty:true},cell=>{cell.font={name:'Calibri',size:11,color:{argb:'FF253C34'}};cell.alignment={vertical:'middle',wrapText:true};if(n%2===0)cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFF2F6EF'}};});}});
 ws.autoFilter={from:{row:1,column:1},to:{row:Math.max(1,rows.length+1),column:headers.length}};
 ws.pageSetup={orientation:'landscape',paperSize:9,fitToPage:true,fitToWidth:1,fitToHeight:0,printTitlesRow:'1:1'};
}
async function createWorkbook(db,scope,options={}){
 const wb=new root.ExcelJS.Workbook();wb.creator='Ruang Kelas';wb.created=new Date();wb.title='Template administrasi kelas';
 const instructions=wb.addWorksheet('Petunjuk');instructions.columns=[{width:27},{width:115}];
 const tables=X.templateTables(db,scope,options);
 const days=options.month?X.monthDates(options.month):null;
 const info=[['Ruang Kelas — Template Excel',''],['Format','RK-XLSX-1'],['Sekolah',db.settings.school],['Kelas',db.settings.className],['Periode aktif',C.period(db).replace('|',' · Semester ')],['Cara mengisi','Isi lembar sesuai menu. Jangan ubah nama lembar/judul kolom. Simpan sebagai .xlsx, lalu gunakan Impor Excel di aplikasi.'],['Identitas murid','NIS adalah kunci pencocokan. NISN dan telepon disimpan sebagai teks agar nol awal tidak hilang.'],['Kolom kosong','Dilewati: tidak menghapus data lama. Nilai 0 tetap dihitung. Jangan gunakan rumus; tempel hasilnya sebagai nilai.'],['Penggabungan','Baris yang sama memperbarui data; data lain dipertahankan. Semua kesalahan harus diperbaiki sebelum impor dapat disimpan.'],['Periode','Nilai, jurnal, dan catatan mengikuti Tahun/Semester pada setiap baris. Presensi mengikuti tanggal.'],['Batas','Maksimal 10.000 baris per lembar dan 20 MB per berkas. Tambahkan baris di bawah tabel bila diperlukan.'],...Object.keys(tables).map(k=>[X.specs[k].sheet,X.specs[k].tip])];
 if(days){const presensi=info.find(r=>r[0]==='Presensi');if(presensi){presensi[0]='Presensi_Bulanan';presensi[1]='Satu baris per murid, kolom tanggal 1 sampai akhir bulan. Isi H (hadir), S (sakit), I (izin), A (tanpa keterangan). Sel kosong dilewati. NIS dan tanggal mencocokkan catatan lama.';}info.push(['Bulan pengisian',options.month],['Pengisian satu bulan','Presensi_Bulanan: isi H/S/I/A; kosongkan hari libur atau yang belum dicatat. Jurnal: tanggal sebulan disiapkan, isi mapel, JP, TP dan kegiatan pada baris yang dipakai. Baris kosong dilewati. Sabtu/Minggu diberi warna, tetap dapat diisi.'],['Data tersimpan','Presensi dan jurnal hanya memuat bulan pilihan. Jurnal mengikuti semester aktif. Jangan mengubah tanggal kepala kolom presensi. Tambahkan baris jurnal bila kegiatan per hari lebih banyak.']);}
 info.forEach((r,i)=>{const row=instructions.addRow(r);row.height=i===0?32:60;row.alignment={vertical:'middle',wrapText:true};row.font={name:'Calibri',size:11};row.getCell(1).font={name:'Calibri',size:i===0?16:11,bold:true,color:{argb:'FF205E49'}}});instructions.mergeCells('A1:B1');instructions.views=[{showGridLines:false}];
 const ref=wb.addWorksheet('Referensi');styleTable(ref,['NIS','Nama','Status murid','Mapel'],Array.from({length:Math.max(db.students.length,db.subjects.length)},(_,i)=>[db.students[i]?.nis||'',db.students[i]?.name||'',db.students[i]?(db.students[i].active===false?'Arsip':'Aktif'):'',db.subjects[i]?.name||'']));
 wb.definedNames.add(`Referensi!$D$2:$D$${Math.max(2,db.subjects.length+1)}`,'DaftarMapel');
 for(const [k,t]of Object.entries(tables)){
  if(k==='attendance'&&days){
   const saved=new Map(db.attendance.filter(a=>a.date.startsWith(options.month+'-')).map(a=>[a.studentId+'|'+a.date,a.status]));
   const pupils=db.students.filter(s=>s.active!==false||(options.mode==='existing'&&days.some(dt=>saved.has(s.id+'|'+dt))));
   const ws=wb.addWorksheet('Presensi_Bulanan');styleTable(ws,['NIS','Nama',...days],pupils.map(s=>[s.nis,s.name,...days.map(dt=>options.mode==='existing'?saved.get(s.id+'|'+dt)||'':'')]));
   ws.views=[{state:'frozen',xSplit:2,ySplit:1,showGridLines:false}];ws.getColumn(1).width=14;ws.getColumn(2).width=36;ws.getRow(1).height=44;
   days.forEach((dt,i)=>{const col=i+3,weekend=[0,6].includes(new Date(dt+'T00:00:00Z').getUTCDay());ws.getColumn(col).width=6;const head=ws.getCell(1,col);head.value=new Date(dt+'T00:00:00Z');head.numFmt='dd"/"mm';head.alignment={vertical:'middle',horizontal:'center',wrapText:false};if(weekend)head.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF786342'}};
    for(let r=2;r<=Math.max(52,pupils.length+11);r++){const cell=ws.getCell(r,col);cell.dataValidation=listValidation('"H,S,I,A"');cell.alignment={vertical:'middle',horizontal:'center'};if(weekend)cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFFFF2DE'}};}
   });ws.pageSetup.paperSize=8;ws.pageSetup.printTitlesColumn='A:B';continue;
  }
  const ws=wb.addWorksheet(X.specs[k].sheet);styleTable(ws,t.headers,t.rows);
  if(k==='settings')t.rows.forEach((row,i)=>{if(row[0]==='principalStatus')ws.getCell(i+2,2).dataValidation={...listValidation('"Definitif,Plt."'),errorStyle:'stop'};});
  if(k==='extracurricular'){
   ws.views=[{state:'frozen',xSplit:6,ySplit:1,showGridLines:false}];
   [26,16,12,26,15,30,32,26,55].forEach((width,i)=>ws.getColumn(i+1).width=width);
   ws.getCell('H1').note='Kurang, Cukup, Baik, atau Sangat Baik. Wajib untuk kegiatan baru. Kosong mempertahankan penilaian kegiatan lama.';
   for(let r=2;r<=Math.max(202,t.rows.length+51);r++){
    ws.getCell(r,8).dataValidation={...listValidation('"'+C.extracurricularRatings.join(',')+'"'),errorStyle:'stop'};
    for(const [col,max] of [[7,120],[9,1000]])ws.getCell(r,col).dataValidation={type:'textLength',operator:'lessThanOrEqual',allowBlank:true,formulae:[max],showErrorMessage:true,errorStyle:'stop',error:'Maksimal '+max+' karakter.'};
    for(const col of [7,8,9])ws.getCell(r,col).font={name:'Calibri',size:11,color:{argb:'FF1463A3'}};
   }
  }
  if(k==='competency'){
   ws.views=[{state:'frozen',xSplit:5,ySplit:1,showGridLines:false}];ws.getRow(1).height=52;
   ws.getColumn(1).width=16;ws.getColumn(2).width=12;ws.getColumn(3).width=25;ws.getColumn(4).width=14;ws.getColumn(5).width=32;
   ws.getColumn(6).width=12;ws.getColumn(7).width=10;ws.getColumn(17).width=50;
   const attitudeHeaders=Object.values(X.competencyColumns);
   t.headers.forEach((h,i)=>{
    const isScore=h==='Kedisiplinan'||attitudeHeaders.includes(h);
    if(isScore){ws.getColumn(i+1).width=18;ws.getColumn(i+1).numFmt=h==='Kedisiplinan'?'0.##':'0'}
    const key=Object.keys(X.competencyColumns).find(k=>X.competencyColumns[k]===h);
    if(key)ws.getCell(1,i+1).note=C.dimensions[key]+' — bilangan bulat 1–5. Kosong mempertahankan nilai lama.';
    if(h==='Kedisiplinan')ws.getCell(1,i+1).note='Nilai kehadiran (Kedisiplinan) 0–100. Nilai 0 tetap dihitung; kosong mempertahankan nilai lama.';
    for(let r=2;r<=Math.max(52,t.rows.length+11);r++){
     const cell=ws.getCell(r,i+1);
     if(isScore){cell.dataValidation={type:h==='Kedisiplinan'?'decimal':'whole',operator:'between',allowBlank:true,formulae:h==='Kedisiplinan'?[0,100]:[1,5],showErrorMessage:true,errorStyle:'stop',errorTitle:'Nilai tidak valid',error:h==='Kedisiplinan'?'Kedisiplinan harus 0–100.':'Sikap harus bilangan bulat 1–5.'};cell.font={name:'Calibri',size:11,color:{argb:'FF1463A3'}};cell.alignment={horizontal:'center',vertical:'middle'}}
     if(h==='Jenjang')cell.dataValidation=listValidation('"PAUD,SD,SMP,SMA,SMK"');
     if(h==='Kelas')cell.dataValidation={type:'whole',operator:'between',allowBlank:true,formulae:[0,13],showErrorMessage:true,error:'Kelas 0 untuk PAUD; 1–13 mengikuti jenjang.'};
     if(h==='Catatan')cell.dataValidation={type:'textLength',operator:'lessThanOrEqual',allowBlank:true,formulae:[1000],showErrorMessage:true,error:'Catatan maksimal 1000 karakter.'};
    }
   });
  }
  if(k==='journal'&&days)t.rows.forEach((row,i)=>{ws.getRow(i+2).height=56;const dt=row[3];ws.getCell(i+2,4).value=new Date(dt+'T00:00:00Z');ws.getCell(i+2,4).numFmt='dd/mm/yyyy';if([0,6].includes(new Date(dt+'T00:00:00Z').getUTCDay()))ws.getCell(i+2,4).fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFFFF2DE'}};});
  for(let r=2;r<=Math.max(52,t.rows.length+11);r++)t.headers.forEach((h,i)=>{const cell=ws.getCell(r,i+1);if(h==='LP')cell.dataValidation=listValidation('"L,P"');if(h==='Status')cell.dataValidation=listValidation(k==='students'?'"Aktif,Arsip"':'"H,S,I,A"');if(h==='Jenis')cell.dataValidation=listValidation('"Formatif,Sumatif TP,Tengah semester,Akhir semester"');if(h==='Semester')cell.dataValidation=listValidation(k==='grades'?'"1,2,TINJAU"':'"1,2"');if(h==='Mapel'&&k!=='reports')cell.dataValidation=listValidation('DaftarMapel');if(h==='Nilai'&&k==='grades')cell.dataValidation={type:'decimal',operator:'between',allowBlank:true,formulae:[0,100],showErrorMessage:true,error:'Nilai harus 0–100.'};if(h==='JP')cell.dataValidation={type:'decimal',operator:'between',allowBlank:true,formulae:[0.5,24],showErrorMessage:true,error:'JP harus 0,5–24.'};});
 }
 if(scope==='reports'||scope==='backup'||scope==='dashboard'){
  const ws=wb.addWorksheet('Rapor_Rekap'),headers=['NIS','Nama',...db.subjects.map(s=>s.name),'Hadir','Sakit','Izin','Tanpa keterangan'];
  styleTable(ws,headers,C.active(db).map(s=>{const a=C.attendance(db,s.id);return[s.nis,s.name,...db.subjects.map(sub=>C.result(db,s.id,sub.id).value),a.H,a.S,a.I,a.A]}));
  const row=C.active(db).length+3;ws.mergeCells(row,1,row,headers.length);ws.getCell(row,1).value='Rekap hanya untuk dibaca. Tidak diimpor. Nilai akhir dihitung di aplikasi.';
 }
 return wb;
}
function zipCheck(buffer){const view=new DataView(buffer.buffer||buffer,buffer.byteOffset||0,buffer.byteLength);let eocd=-1;for(let p=view.byteLength-22;p>=Math.max(0,view.byteLength-65557);p--){if(view.getUint32(p,true)===0x06054b50){eocd=p;break}}if(eocd<0)throw Error('Berkas bukan XLSX/ZIP yang valid.');const count=view.getUint16(eocd+10,true);let p=view.getUint32(eocd+16,true),total=0;if(count>5000)throw Error('Berkas terlalu kompleks. Gunakan template aplikasi.');for(let i=0;i<count;i++){if(p+46>view.byteLength||view.getUint32(p,true)!==0x02014b50)throw Error('Struktur XLSX tidak valid.');total+=view.getUint32(p+24,true);if(total>32*1024*1024)throw Error('Isi Excel terlalu besar setelah dibuka. Pecah menjadi beberapa berkas.');p+=46+view.getUint16(p+28,true)+view.getUint16(p+30,true)+view.getUint16(p+32,true)}}
async function readWorkbook(buffer,scope){
 if(buffer.byteLength>20*1024*1024)throw Error('Maksimal 20 MB.');zipCheck(buffer);
 const wb=new root.ExcelJS.Workbook();await wb.xlsx.load(buffer);const info=wb.getWorksheet('Petunjuk');if(info?.getCell('B2').value!=='RK-XLSX-1')throw Error('Gunakan template Excel Ruang Kelas terbaru. Format Excel lama/berkas bebas belum didukung.');
 const tables={},errors=[],allowed=X.scopes[scope]||X.scopes.backup;let rowTotal=0;
 function value(cell,header,sheet,row){const v=cell.value;if(v===null||v===undefined)return '';if(v instanceof Date){if(isNaN(v.getTime()))throw Error('Tanggal tidak valid.');return v.toISOString().slice(0,10)}if(typeof v==='object'){if(v.formula||v.sharedFormula||v.error){errors.push({sheet,row,message:cell.address+': rumus/galat tidak diterima; tempel sebagai nilai.'});return ''}if(v.hyperlink){errors.push({sheet,row,message:cell.address+': gunakan teks biasa, bukan hyperlink.'});return ''}if(v.richText)return v.richText.map(x=>x.text).join('');errors.push({sheet,row,message:cell.address+': tipe sel tidak didukung.'});return ''}if(typeof v==='number'&&['NISN','Telepon'].includes(header))errors.push({sheet,row,message:cell.address+': '+header+' harus berformat Teks agar nol awal tidak hilang.'});return String(v)}
 const monthly=allowed.includes('attendance')?wb.getWorksheet('Presensi_Bulanan'):null;
 if(monthly){
  if(wb.getWorksheet('Presensi'))throw Error('Gunakan satu lembar presensi saja: Presensi atau Presensi_Bulanan.');
  if(monthly.rowCount>10001||monthly.columnCount>33)throw Error('Presensi_Bulanan melebihi batas baris/kolom.');
  const headers=Array.from({length:monthly.columnCount},(_,i)=>value(monthly.getCell(1,i+1),'',monthly.name,1).trim()),dates=headers.slice(2);
  if(headers[0]!=='NIS'||headers[1]!=='Nama'||!dates.length)throw Error('Kolom Presensi_Bulanan tidak sesuai template.');
  const expected=X.monthDates(dates[0].slice(0,7));if(JSON.stringify(dates)!==JSON.stringify(expected))throw Error('Tanggal kolom Presensi_Bulanan harus lengkap dan berurutan untuk satu bulan. Unduh ulang template.');
  const rows=[],sourceRows=[],sourceCells=[];rowTotal+=monthly.rowCount;
  for(let r=2;r<=monthly.rowCount;r++){
   const nis=value(monthly.getCell(r,1),'NIS',monthly.name,r),name=value(monthly.getCell(r,2),'Nama',monthly.name,r);
   dates.forEach((dt,i)=>{const cell=monthly.getCell(r,i+3),status=value(cell,'Status',monthly.name,r);if(status.trim()){rows.push([dt,nis,name,status]);sourceRows.push(r);sourceCells.push(cell.address+' ('+dt+')');}});
  }
  tables.attendance={headers:X.specs.attendance.headers,rows,sheet:monthly.name,sourceRows,sourceCells};
 }
 for(const k of allowed){const ws=wb.getWorksheet(X.specs[k].sheet);if(!ws)continue;if(ws.rowCount>10001||ws.columnCount>60)throw Error(ws.name+': jumlah baris/kolom melebihi batas template.');rowTotal+=ws.rowCount;if(rowTotal>25000)throw Error('Total baris melebihi 25.000; pecah berkas.');const headers=Array.from({length:X.specs[k].headers.length},(_,i)=>value(ws.getCell(1,i+1),'',ws.name,1).trim());
  if(k==='journal'&&JSON.stringify(headers.slice(0,10))===JSON.stringify(X.specs.journal.headers.slice(0,10))&&headers.slice(10).every(h=>!h))headers.splice(10,3,...X.specs.journal.headers.slice(10));
  const rows=[];for(let r=2;r<=ws.rowCount;r++){const row=[];for(let c=1;c<=headers.length;c++)row.push(value(ws.getCell(r,c),headers[c-1],ws.name,r));for(let c=headers.length+1;c<=ws.columnCount;c++)if(ws.getCell(r,c).value!==null)errors.push({sheet:ws.name,row:r,message:'Ada isi pada kolom tambahan yang tidak dikenal.'});rows.push(row)}tables[k]={headers,rows};
 }
 return {tables,errors,school:String(info.getCell('B3').value||''),className:String(info.getCell('B4').value||'')};
}
root.ExcelIO={MIME,createWorkbook,readWorkbook,zipCheck};
})(typeof window==='undefined'?globalThis:window);
