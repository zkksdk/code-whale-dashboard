const http = require('http');
function get(p) {
  return new Promise((resolve) => {
    http.get({hostname:'localhost',port:4322,path:p,timeout:5000}, r => {
      let d=''; r.on('data',c=>d+=c); r.on('end',()=>{ try{const j=JSON.parse(d);resolve({ok:j.success!==false,keys:Object.keys(j.data||{}).slice(0,5),hasData:!!j.data})}catch{resolve({ok:false,err:d.substring(0,80)})} });
    }).on('error',()=>resolve({ok:false,err:'connect'}));
  });
}
(async () => {
  console.log('=== Dashboard Backend APIs ===');
  const tests = [
    ['health', '/api/health'],
    ['system', '/api/system'],
    ['sessions', '/api/sessions?limit=1'],
    ['config', '/api/config'],
    ['models', '/api/models'],
    ['skills', '/api/skills'],
    ['mcp', '/api/mcp/capabilities'],
    ['workspace', '/api/workspace'],
    ['automations', '/api/automations'],
    ['analytics', '/api/analytics'],
    ['usage', '/api/usage'],
    ['settings', '/api/settings'],
    ['tasks', '/api/tasks'],
    ['threads', '/api/threads'],
  ];
  for (const [name, path] of tests) {
    const r = await get(path);
    console.log(r.ok ? 'OK  ' : 'FAIL', name.padEnd(12), r.hasData ? r.keys.join(',') : ('err:'+(r.err||'')));
  }
})();
