
// Mobile menu
const menuBtn = document.getElementById('menuBtn');
const menu = document.getElementById('menu');
if(menuBtn){
  menuBtn.addEventListener('click', ()=>{
    const open = menu.classList.toggle('open');
    menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
}

// Consent Gate (mandatory)
const KEY='alpay_consent_v2';
const gate=document.getElementById('consentGate');
const prev=localStorage.getItem(KEY);
if(!prev){
  document.documentElement.style.overflow='hidden';
  gate.classList.remove('hidden');
}
function closeGate(){
  gate.classList.add('hidden');
  document.documentElement.style.overflow='';
}
document.getElementById('btnAccept').onclick=()=>{
  localStorage.setItem(KEY,'yes'); sendLog(true); closeGate();
};
document.getElementById('btnReject').onclick=()=>{
  localStorage.setItem(KEY,'no'); // no logging
  closeGate();
};
if(prev==='yes'){ sendLog(true); }

function sendLog(consented){
  try{
    fetch('/api/track',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        consented: !!consented,
        path: location.pathname+location.search,
        tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
        lang: navigator.language,
        screen: `${screen.width}x${screen.height}`
      })
    });
  }catch(e){}
}

// Drag & Drop + Upload
const drop=document.getElementById('drop');
const fInput=document.getElementById('fileInput');
const nInput=document.getElementById('nameInput');
const btn=document.getElementById('btnUpload');
const msg=document.getElementById('uploadMsg');
const prog=document.getElementById('progress');
const bar=document.getElementById('bar');

['dragenter','dragover'].forEach(ev=>drop.addEventListener(ev,(e)=>{e.preventDefault();drop.classList.add('drag');}));
['dragleave','drop'].forEach(ev=>drop.addEventListener(ev,(e)=>{e.preventDefault();drop.classList.remove('drag');}));
drop.addEventListener('drop', (e)=>{
  const f=e.dataTransfer.files && e.dataTransfer.files[0];
  if(f){ fInput.files=e.dataTransfer.files; msg.textContent=f.name; }
});
drop.addEventListener('click', ()=> fInput.click());

btn.addEventListener('click', async ()=>{
  const file=fInput.files[0];
  if(!file){ msg.textContent='Dosya seç.'; return; }
  if(file.size>80*1024*1024){ msg.textContent='80MB üzeri desteklemiyorum.'; return; }
  msg.textContent='Yükleme hazırlanıyor…'; prog.classList.add('show'); bar.style.width='0%';
  try{
    const base64=await readWithProgress(file, p=>{ bar.style.width=p+'%'; });
    const r=await fetch('/api/upload',{
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        filename: sanitize(nInput.value || file.name),
        contentType: file.type || 'application/octet-stream',
        data: base64
      })
    });
    if(!r.ok){ msg.textContent='Hata: '+(await r.text()); return; }
    const j=await r.json();
    msg.innerHTML=`Yüklendi: <a href="${j.url}" target="_blank" rel="noopener">${j.name}</a>`;
    fInput.value=''; nInput.value=''; bar.style.width='100%';
    await loadFiles();
  }catch(err){
    msg.textContent='Hata: '+err.message;
  }finally{
    setTimeout(()=>prog.classList.remove('show'),1200);
  }
});

function sanitize(name){ return name.replace(/[^a-zA-Z0-9._-]/g,'_').slice(0,120) || 'file'; }

function readWithProgress(file, onp){
  return new Promise((resolve,reject)=>{
    const fr=new FileReader();
    fr.onprogress=(e)=>{
      if(e.lengthComputable){ onp(Math.min(99, Math.round(e.loaded/e.total*100))); }
    };
    fr.onload=()=>{
      const s=String(fr.result); const i=s.indexOf('base64,');
      onp(100);
      resolve(i>0? s.slice(i+7): s);
    };
    fr.onerror=()=>reject(fr.error||new Error('okuma hatası'));
    fr.readAsDataURL(file);
  });
}

// List files
async function loadFiles(){
  const wrap=document.getElementById('fileList');
  wrap.innerHTML='<div class="file"><div>Liste yükleniyor…</div></div>';
  try{
    const r=await fetch('/api/list');
    if(!r.ok){ wrap.innerHTML='<div class="file"><div>Liste alınamadı.</div></div>'; return; }
    const arr=await r.json();
    if(!arr.length){ wrap.innerHTML='<div class="file"><div>Henüz dosya yok.</div></div>'; return; }
    wrap.innerHTML='';
    arr.forEach(f=>{
      const el=document.createElement('div');
      el.className='file';
      el.innerHTML=`<div><h4>${f.name}</h4><small>${(f.size/1024).toFixed(1)} KB • ${new Date(f.date).toLocaleString()}</small></div>
                    <div><a href="${f.url}" target="_blank" rel="noopener">İndir</a></div>`;
      wrap.appendChild(el);
    });
  }catch(e){
    wrap.innerHTML='<div class="file"><div>Liste hatası.</div></div>';
  }
}
loadFiles();
