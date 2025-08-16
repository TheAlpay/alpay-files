// netlify/functions/track.js
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;
const IP_SALT = process.env.IP_SALT || 'change-this';

let supabase = null;
if(SUPABASE_URL && SUPABASE_SERVICE_ROLE){
  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {auth: {persistSession: false}});
}

exports.handler = async (event) => {
  try{
    const req = JSON.parse(event.body || "{}");
    const headers = event.headers || {};
    const ip = headers['x-nf-client-connection-ip'] || headers['client-ip'] || (headers['x-forwarded-for']||'').split(',')[0] || '0.0.0.0';
    const ua = headers['user-agent'] || '';
    const ref = headers['referer'] || headers['referrer'] || '';
    const path = req.path || '/';
    const consented = !!req.consented;
    const tz = req.tz || '';
    const lang = req.lang || '';
    const screen = req.screen || '';

    if(!supabase){ return { statusCode: 204, body: '' }; }

    const ip_hash = crypto.createHash('sha256').update(IP_SALT + '|' + ip).digest('hex');

    const { error } = await supabase.from('pageviews').insert([{
      ts: new Date().toISOString(),
      path, ua, ref, ip_hash, consented, tz, lang, screen
    }]);

    if(error){ console.error(error); }
    return { statusCode: 204, body: '' };
  }catch(e){
    console.error(e);
    return { statusCode: 204, body: '' };
  }
};
