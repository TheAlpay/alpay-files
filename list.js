// netlify/functions/list.js
const fetch = require('node-fetch');

const GH_TOKEN = process.env.GH_TOKEN;
const GH_OWNER = process.env.GH_OWNER;
const GH_REPO  = process.env.GH_REPO;
const BRANCH   = process.env.GH_BRANCH || 'main';

function bad(msg, code=400){ return {statusCode: code, body: msg}; }

async function listDir(path){
  const url=`https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${encodeURIComponent(path)}`;
  const res=await fetch(url,{ headers:{ 'Authorization':`Bearer ${GH_TOKEN}`, 'Accept': 'application/vnd.github+json' } });
  if(res.status===404) return [];
  const arr=await res.json();
  return Array.isArray(arr)?arr:[];
}

exports.handler = async () => {
  if(!GH_TOKEN||!GH_OWNER||!GH_REPO) return bad('Server missing GitHub config',500);
  try{
    const root=await listDir('files');
    let out=[];
    for(const yr of root.filter(x=>x.type==='dir')){
      const months=await listDir(`files/${yr.name}`);
      for(const m of months.filter(x=>x.type==='dir')){
        const files=await listDir(`files/${yr.name}/${m.name}`);
        for(const f of files.filter(x=>x.type==='file')){
          out.push({
            name:f.name,
            url:`https://raw.githubusercontent.com/${GH_OWNER}/${GH_REPO}/${BRANCH}/files/${yr.name}/${m.name}/${encodeURIComponent(f.name)}`,
            size:f.size,
            date:new Date().toISOString()
          });
        }
      }
    }
    out.reverse();
    return { statusCode:200, body: JSON.stringify(out) };
  }catch(e){
    console.error(e);
    return bad('error',500);
  }
};
