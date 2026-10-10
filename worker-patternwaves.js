import site from './site-patternwaves.html';
export default { fetch() { return new Response(site, { headers: { 'content-type': 'text/html;charset=utf-8', 'cache-control': 'no-cache, must-revalidate' } }); } };
