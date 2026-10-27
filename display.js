/* View preferences are separate from classroom data and JSON backups. */
(function(){
 const prefKey=KEY+'-display',modeButton=document.getElementById('display-button'),fullButton=document.getElementById('fullscreen-button'),menu=document.getElementById('menu-toggle'),shade=document.getElementById('menu-shade');
 function setMode(mode){const large=mode==='ifp';document.body.dataset.display=large?'ifp':'auto';modeButton.setAttribute('aria-pressed',String(large));modeButton.textContent=large?'Mode biasa':'Mode IFP';modeButton.title=large?'Kembali ke tampilan otomatis':'Perbesar teks dan tombol untuk layar IFP';}
 try{setMode(localStorage.getItem(prefKey))}catch(e){setMode('auto')}
 modeButton.addEventListener('click',()=>{const mode=document.body.dataset.display==='ifp'?'auto':'ifp';setMode(mode);try{localStorage.setItem(prefKey,mode)}catch(e){};});
 fullButton.addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else if(document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();else toast('Layar penuh tidak didukung peramban ini. Gunakan fitur layar penuh perangkat.');}catch(e){toast('Layar penuh belum diizinkan. Gunakan fitur layar penuh perangkat.');}});
 document.addEventListener('fullscreenchange',()=>{fullButton.textContent=document.fullscreenElement?'Keluar layar penuh':'Layar penuh';});
 function syncMenu(){menu.setAttribute('aria-expanded',String(document.body.classList.contains('menu-open')));}
 function closeMenu(){document.body.classList.remove('menu-open');syncMenu();}
 menu.onclick=()=>{document.body.classList.toggle('menu-open');syncMenu();};shade.addEventListener('click',closeMenu);
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.body.classList.contains('menu-open')){closeMenu();menu.focus();}});
 window.addEventListener('hashchange',syncMenu);syncMenu();
 function enhanceTables(){document.querySelectorAll('.table-wrap').forEach(el=>{el.setAttribute('tabindex','0');el.setAttribute('role','region');el.setAttribute('aria-label','Tabel '+(document.getElementById('crumb').textContent||'data')+'. Geser ke samping untuk melihat kolom lainnya.');});}
 const before=render;render=function(){before();enhanceTables()};enhanceTables();
})();
