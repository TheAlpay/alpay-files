// netlify/functions/upload.js
const fetch = require('node-fetch');

const GH_TOKEN = process.env.GH_TOKEN;
const GH_OWNER = process.env.GH_OWNER;
const GH_REPO  = process.env.GH_REPO;
const BRANCH   = process.env.GH_BRANCH || 'main';

function bad(msg, code=400){ return {statusCode: code, body: msg}; }

exports.handler = async (event) => {
  if(event.httpMethod !== 'POST') return bad('POST',405);
  if(!GH_TOKEN||!GH_OWNER||!GH_REPO) return bad('Server missing GitHub config',500);
  try{
    const { filename, contentType, data } = JSON.parse(event.body||'{}');
    if(!data) return bad('no data');
    const name = (filename||'file').replace(/[^a-zA-Z0-9._-]/g,'_').slice(0,120) || 'file';
    const now = new Date();
    const path = `files/${now.getFullYear()}/${String(now.getMonth()+1).padStart(2,'0')}/${name}`;

    const url = `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${encodeURIComponent(path)}`;
    const res = await fetch(url, {
      method:'PUT',
      headers:{ 'Authorization': `Bearer ${GH_TOKEN}`, 'Content-Type':'application/json', 'Accept':'application/vnd.github+json' },
      body: JSON.stringify({ message:`upload ${path}`, content:data, branch:BRANCH })
    });
    const j = await res.json();
    if(!res.ok){ return bad(j.message||'github error', 500); }

    const rawUrl = `https://raw.githubusercontent.com/${GH_OWNER}/${GH_REPO}/${BRANCH}/${path}`;
    return { statusCode: 200, body: JSON.stringify({ ok:true, url: rawUrl, name }) };
  }catch(e){
    console.error(e);
    return bad('error',500);
  }
};
