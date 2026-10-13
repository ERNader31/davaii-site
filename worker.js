import site from './site.html';
import admin from './admin.html';
const favicon16 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAj0lEQVR4nK1TOw7AIAhFz9G1TJymp+zEaTr1ICa62MlGLaBJJTEa8T0+D12KIcMP85aTCYEJTQKnZSABj+uey0ADi9mkGHK9zn1rduucYshNCUyoR+oyKeW8BKNmaWS+B0uN0nxMaMs4Y2tKqC+sEsQ3IwlHUn4mUZOyRK0lBBAm0ZqDHgyw4C+oBDWJ1dgH4EnHVWApavgAAAAASUVORK5CYII=';
const favicon32 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAABI0lEQVR4nNWXSxLCIAyGU8ezdNXT9KA9TVccxBnd6AqGxjx+QhXNSilJvpIH6fS43540UC4jnRMRXXuUt2Uuv9c9fRdgW+aDU/4flSmSA/Wbc2mFaAKwHEdBIADE8boncZ8H4laBlGjrng6G63Xu1IM3Abws5yD8GQKhApxRYgiEG4Koc1RfTMJMy5V7qkCzaTaiSFZnPRT27QS02Le8vadfrx8AvA5Xt1vrdPI+pGOWJNR6uVRqmmG+bpVo3jv8OjYBeksQsVGqQIqZljho37dClff+VhUgztA+gOqbjUg6UvQk0HCo84DVjq1TkJ5rtoga54GIhOcBJAG9kCBXOtwHrBKVINB5YvhM+B9TcQvIR78LOMSwL6PaaZboxdUFcIa8AKrUBcrJguEWAAAAAElFTkSuQmCC';
const favicon48 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAB20lEQVR4nOVZS25DIQwkVc+SVU6Tg+Y0WeUgldpNu4rEI/6MzZgI1auEB8ZjG3/g9PP99ds2po93CzBL2wP4rGJ8u5wP/6/3R8k+JRYYhdfGGEQH0At6vT8Omq8AcWJHIURIpjtRAMxodhbMFACmS2SBpM9ARnhLyKwyUgCszcaD249b/z2+GoUBSPHdE1jTvLQ2CiJ0BrTk9BxH/Vian018sAWs+M6gbM6AAFRlUca+LoBVNY3G3wMRKuY84aOWul3OagBAeZkAVhRlEj/JCpryQhbw4j+LV0RJ4X5A81FmPRThJeYBzayoBbR50hyNrzXe0wuAqJuMScnTHpr8UDkOYXT2gCLrGXP672IeyGiFRVEP2P5WQgSAHMIqivYMBwCzAiLrGXP67y95QApfaITR1nuCWeHSq8XUfgAVgnGwUZ6SAsyGJiIcs5SI8IdLCc+NKm4oEJ4wgGdFyHah2ZxjAkDq8n7OTE/s7aFRKJGtai0j+7gAKqKORdEWFrLAigyc3Rd2obGWR6tK1GLjXPq9kMTU6gW834xLrdYS1agEYhQAvQyQ1kbdNVVOM26ZkXYRoe3fB/73C41Eq9/ISltKqXZi5xS6BVpb25KWWAB5YmJRiQVW0vbXKn/4G2UkYFg4ygAAAABJRU5ErkJggg==';
const favicon64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAACR0lEQVR4nO1bSW7DMAxMir4lJ78mD81rcspDCrSX9uRCdbVwGQ4FWAMECOxEJMckJZHy9evz4/tyYrxlK5CNRUC2Atl4zxT+2G6/3+/PV4oO14wkWBp+BJsIegj0jJfcRyM1BMqnzTZ8BzUENEayQiGcAMSTjSQjjIAIl44gAk4AI5aRREBnAVYiQ8qBeABSofvzRU2Wbg/QKttTeL+nMcpLvouAkfCWIbXrEmKsevRgXgh5l7Na191/35L72G6mcDB5gMV4q8GacSyeAJ0FjsqhkuNxnNRpsGUUexfXkqclXUXALMaP5GpIcIdAlvEo+eJZwBvP7O2udFZw1QOY+/na+OXCySpftBTOKlYgMPICSkXIE6fR5EMIqBlYKo4yYiTHgmEISKa+zBCR6NHzwCYB6C2uZtwocmtEVEMAsR+vjSEdtzWFeRc+tXFpfQHtk9QY5cE/AmZoV6HRC6nTN0cXAccLmgw8Q4hIdOiFdWhNsASqIoTG6dcBayWI2A1GrNFRcii7wchkGbGpKkHZDs9cTxD3BnsVmdb9aIzkh5fEys1FdB5AN0R2iAnw1N32/2vBkEftDkeA2h1GdWNQQDRq1B4wCwmoLlXoERnUej6q6Xq5GAmwZOTj9cd2+/OxjiPVqwWzB4xI6ClqqReOxrR6mysELEdXtMSM/iPRowdqdzii0OnNM9CDksyZAJVgQ4/IRAEpZ50VXqfF1/sC3HeGWiXqrI7UNG+NZYHeGRo9XXazJeW1uR0zNGJTCZgBqzmarUA2fgAobpSdFj4FOQAAAABJRU5ErkJggg==';
const favicon180 = 'data:image/png;base64,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';
const faviconsvg = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzMiAzMiI+CiAgPGRlZnM+CiAgICA8bGluZWFyR3JhZGllbnQgaWQ9ImdyYWQiIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPgogICAgICA8c3RvcCBvZmZzZXQ9IjAlIiBzdHlsZT0ic3RvcC1jb2xvcjojQTgyNTFDO3N0b3Atb3BhY2l0eToxIiAvPgogICAgICA8c3RvcCBvZmZzZXQ9IjEwMCUiIHN0eWxlPSJzdG9wLWNvbG9yOiM3QjFBMTQ7c3RvcC1vcGFjaXR5OjEiIC8+CiAgICA8L2xpbmVhckdyYWRpZW50PgogIDwvZGVmcz4KICA8IS0tIEF0b20gc3ltYm9sIHdpdGggd2F2ZSAtLT4KICA8Y2lyY2xlIGN4PSIxNiIgY3k9IjE2IiByPSIxNCIgZmlsbD0idXJsKCNncmFkKSIgb3BhY2l0eT0iMC4xNSIvPgogIDxjaXJjbGUgY3g9IjE2IiBjeT0iMTYiIHI9IjEyIiBmaWxsPSJub25lIiBzdHJva2U9InVybCgjZ3JhZCkiIHN0cm9rZS13aWR0aD0iMi41Ii8+CiAgPCEtLSBFbGVjdHJvbiBvcmJpdHMgLS0+CiAgPGVsbGlwc2UgY3g9IjE2IiBjeT0iMTYiIHJ4PSIxNCIgcnk9IjUiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI0E4MjUxQyIgc3Ryb2tlLXdpZHRoPSIxLjUiIG9wYWNpdHk9IjAuNiIvPgogIDxlbGxpcHNlIGN4PSIxNiIgY3k9IjE2IiByeD0iNSIgcnk9IjE0IiBmaWxsPSJub25lIiBzdHJva2U9IiNBODI1MUMiIHN0cm9rZS13aWR0aD0iMS41IiBvcGFjaXR5PSIwLjYiLz4KICA8ZWxsaXBzZSBjeD0iMTYiIGN5PSIxNiIgcng9IjEyIiByeT0iMyIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjQTgyNTFDIiBzdHJva2Utd2lkdGg9IjEiIG9wYWNpdHk9IjAuNCIvPgogIDwhLS0gTnVjbGV1cyAtLT4KICA8Y2lyY2xlIGN4PSIxNiIgY3k9IjE2IiByPSIzIiBmaWxsPSIjQTgyNTFDIi8+CiAgPCEtLSBFbGVjdHJvbiBkb3RzIC0tPgogIDxjaXJjbGUgY3g9IjI2IiBjeT0iMTYiIHI9IjEuOCIgZmlsbD0iI0E4MjUxQyIvPgogIDxjaXJjbGUgY3g9IjYiIGN5PSIxNiIgcj0iMS44IiBmaWxsPSIjQTgyNTFDIi8+CiAgPGNpcmNsZSBjeD0iMTYiIGN5PSIyNiIgcj0iMS44IiBmaWxsPSIjQTgyNTFDIi8+CiAgPGNpcmNsZSBjeD0iMTYiIGN5PSI2IiByPSIxLjgiIGZpbGw9IiNBODI1MUMiLz4KPC9zdmc+';

const API_KEY = 'sk-nry-B8DS_setu7YL5L3HWdQhH1QNT0msvVHTKQ5GoyHLGCQ';
const BASE = 'https://router.bynara.id/v1/chat/completions';
const MODEL = 'nemotron-3-ultra-free';
const SYSTEM = `ØªÙ Â«Ø¯Ø³ØªÛØ§Ø± ÙÙØ´ÙÙØ¯Â» ÙØ¨âØ³Ø§ÛØª ÙØ¬ÛØ¯ Ø¯ÙØ§ÛÛ ÙØ³ØªÛ â ÙØ¯Ø±Ø³ ÙÛØ²ÛÚ©Ø Ø±ÛØ§Ø¶ÛØ ÙÙØ³ÙÙ Ù ÙÙØ·Ù.
Ø§Ø·ÙØ§Ø¹Ø§Øª Ø§Ø³ØªØ§Ø¯ (Ù¾Ø§ÛÙ Ù ÙØ¨ÙØ§Û Ù¾Ø§Ø³Ø®âÙØ§ÛØª):
- Û±Û¸ Ø³Ø§Ù Ø³Ø§Ø¨ÙÙ ØªØ¯Ø±ÛØ³ Ø¯Ø± ÙØ¯Ø§Ø±Ø³ Ø¨Ø±ØªØ± ØªÙØ±Ø§Ù: Ø³ÙØ§ÙØ Ø³Ø¨Ø­Ø§ÙØ Ø§Ø­Ø³Ø§ÙØ Ú¯Ø³ØªØ±Ø´Ø Ù¾ÛØ´Ø±ÙØ Ø¢Ø°ÛÙ
- Ø±ØªØ¨Ù Û² Ú©ÙÚ©ÙØ± Ø¯Ú©ØªØ±Ø§Û ÙÛØ²ÛÚ© Ø³Ø±Ø§Ø³Ø±Û
- Ø±ØªØ¨Ù Û± Ø¢Ø²ÙÙÙ Ø§Ø³ØªØ®Ø¯Ø§ÙÛ Ø¢ÙÙØ²Ø´ Ù Ù¾Ø±ÙØ±Ø´ ØªÙØ±Ø§Ù
- Ú©Ø§Ø±Ø´ÙØ§Ø³Û Ø§Ø±Ø´Ø¯ ÙÛØ²ÛÚ© ÙØ³ØªÙâØ§Û Ø§Ø² Ø¯Ø§ÙØ´Ú¯Ø§Ù ØªÙØ±Ø§Ù
- Ú©Ø§Ø±Ø´ÙØ§Ø³Û Ø§Ø±Ø´Ø¯ ÙÙØ³ÙÙ Ø¹ÙÙ Ø§Ø² Ø¯Ø§ÙØ´Ú¯Ø§Ù ØµÙØ¹ØªÛ Ø´Ø±ÛÙ
- Ø¯Ø±ÙØ³: ÙÛØ²ÛÚ© Ù¾Ø§ÛÙ Û· ØªØ§ Û±Û²Ø ÙÛØ²ÛÚ© Ú©ÙÚ©ÙØ± (Ú©Ø§Ø±Ø´ÙØ§Ø³Û ØªØ§ Ø¯Ú©ØªØ±Û)Ø Ø§ÙÙÙ¾ÛØ§Ø¯ ÙÛØ²ÛÚ©Ø ÙÛØ²ÛÚ© ÙØ§ÙÛØ¯ÛØ ÙÚ©Ø§ÙÛÚ© Ú©ÙØ§ÙØªÙÙØ Ø§ÙÚ©ØªØ±ÙÙØºÙØ§Ø·ÛØ³Ø ÙÚ©Ø§ÙÛÚ© ØªØ­ÙÛÙÛØ Ø±ÛØ§Ø¶Û Ø¯Ø¨ÛØ±Ø³ØªØ§ÙØ ÙÙØ³ÙÙ Ù ÙÙØ·Ù
- ØªØ¯Ø±ÛØ³ Ø­Ø¶ÙØ±Û Ø¯Ø± ØªÙØ±Ø§ÙØ Ø§ØµÙÙØ§Ù Ù Ú©Ø±Ø¬ (ÙÙØ±Ø´ÙØ±Ø Ø¹Ø¸ÛÙÛÙ) Ù Ø¢ÙÙØ§ÛÙ Ø¨Ø±Ø§Û Ú©Ù Ø§ÛØ±Ø§Ù
- ØªÙØ§Ø³: 09124864495 â ØªÙÚ¯Ø±Ø§Ù: @majid807060 â Ú©Ø§ÙØ§Ù ÙÙÙÙÙ ØªØ¯Ø±ÛØ³: t.me/physicsdavaei
ÙÙØ§Ø¹Ø¯ Ù¾Ø§Ø³Ø®:
- ÙÙÛØ´Ù ÙØ§Ø±Ø³ÛØ ÙØ­ØªØ±ÙØ§ÙÙØ Ú©ÙØªØ§Ù Ù ÙÙÛØ¯ (Ø­Ø¯Ø§Ú©Ø«Ø± Û³-Û´ Ø¬ÙÙÙ ÙÚ¯Ø± Ú©Ù Ø³Ø¤Ø§Ù Ø¯Ø±Ø³Û Ø¯ÙÛÙ Ø¨Ø§Ø´Ø¯)
- Ø§Ú¯Ø± Ø§Ø² ÙÛÙØª ÛØ§ Ø¨Ø±ÙØ§ÙÙ Ú©ÙØ§Ø³âÙØ§ ÙÛâÙ¾Ø±Ø³ÙØ¯Ø Ø¨Ù ØªÙØ§Ø³ ÙØ³ØªÙÛÙ Ø¨Ø§ Ø§Ø³ØªØ§Ø¯ Ø§Ø±Ø¬Ø§Ø¹ Ø¨Ø¯Ù
- Ø§Ú¯Ø± Ø³Ø¤Ø§Ù Ø¯Ø±Ø³Û ÙÛØ²ÛÚ©/Ø±ÛØ§Ø¶Û Ø¨ÙØ¯Ø Ø¨Ø§ Ø¯ÙØª Ù ÙØ±Ø­ÙÙâØ¨ÙâÙØ±Ø­ÙÙ Ø­Ù Ú©Ù
- Ø§Ø² Ø§Ø®ØªØ±Ø§Ø¹ Ø§Ø·ÙØ§Ø¹Ø§Øª Ø¯Ø±Ø¨Ø§Ø±Ù Ø§Ø³ØªØ§Ø¯ Ø®ÙØ¯Ø¯Ø§Ø±Û Ú©ÙØ ÙÙØ· Ø§Ø² Ø¯Ø§Ø¯ÙâÙØ§Û Ø¨Ø§ÙØ§ Ø§Ø³ØªÙØ§Ø¯Ù Ú©Ù
- Ø¯Ø± Ù¾Ø§ÛØ§Ù Ø§Ú¯Ø± ÙØ±ØªØ¨Ø· Ø¨ÙØ¯Ø Ø±Ø²Ø±Ù Ú©ÙØ§Ø³ Ø¨Ø§ Ø´ÙØ§Ø±Ù 09124864495 Ø±Ø§ Ù¾ÛØ´ÙÙØ§Ø¯ Ø¨Ø¯Ù`;

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'POST, OPTIONS',
  'access-control-allow-headers': 'content-type',
};

export default {
  async fetch(req, env) {
    const url = new URL(req.url);

    if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });

    // --- admin: save portrait to KV ---
    if (url.pathname === '/api/admin/portrait' && req.method === 'POST') {
      try {
        if (req.headers.get('x-admin-key') !== (env.ADMIN_KEY || 'davaii-807060')) {
          return json({ error: 'unauthorized' }, 401, CORS);
        }
        const { image } = await req.json();
        if (typeof image !== 'string' || !image.startsWith('data:image/')) {
          return json({ error: 'bad image' }, 400, CORS);
        }
        if (image.length > 6 * 1024 * 1024) {
          return json({ error: 'image too large (max ~4MB)' }, 413, CORS);
        }
        await env.SITE_KV.put('portrait', image);
        return json({ ok: true }, 200, CORS);
      } catch (e) {
        return json({ error: 'server error' }, 500, CORS);
      }
    }

    // --- AI chat endpoint (proxied so the key never reaches the browser) ---
    if (url.pathname === '/api/chat' && req.method === 'POST') {
      try {
        const { messages } = await req.json();
        if (!Array.isArray(messages) || messages.length > 40)
          return json({ error: 'bad request' }, 400, CORS);

        const r = await fetch(BASE, {
          method: 'POST',
          headers: {
            'authorization': `Bearer ${API_KEY}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            model: MODEL,
            stream: true,
            max_tokens: 700,
            temperature: 0.5,
            messages: [{ role: 'system', content: SYSTEM }, ...messages.slice(-20)],
          }),
        });

        if (!r.ok) {
          const t = await r.text();
          // fall back to the other free model
          const r2 = await fetch(BASE, {
            method: 'POST',
            headers: {
              'authorization': `Bearer ${API_KEY}`,
              'content-type': 'application/json',
            },
            body: JSON.stringify({
              model: 'nemotron-3.5-lightning-free',
              stream: true,
              max_tokens: 700,
              temperature: 0.5,
              messages: [{ role: 'system', content: SYSTEM }, ...messages.slice(-20)],
            }),
          });
          if (!r2.ok) return json({ error: 'model unavailable' }, 502, CORS);
          return new Response(r2.body, { headers: { ...CORS, 'content-type': 'text/event-stream' } });
        }
        return new Response(r.body, { headers: { ...CORS, 'content-type': 'text/event-stream' } });
      } catch (e) {
        return json({ error: 'server error' }, 500, CORS);
      }
    }

    // --- admin page (portrait upload) ---
    if (url.pathname === '/admin') {
      return new Response(admin, { headers: { 'content-type': 'text/html;charset=utf-8', 'cache-control': 'no-cache, must-revalidate' } });
    }

    // --- site (portrait from KV overrides embedded default) ---
    if (url.pathname === '/' || url.pathname === '/index.html') {
      let html = site;
      try {
        const custom = env && env.SITE_KV ? await env.SITE_KV.get('portrait') : null;
        if (custom && custom.startsWith('data:image/')) {
          html = site.replace(/src="data:image\/[^"]*__PORTRAIT__[^"]*"/,
            'src="' + custom.replace(/"/g, '&quot;') + '"');
          // also handle fully-baked base64 portraits (no placeholder token)
          if (html === site) {
            html = site.replace(/src="data:image\/jpeg;base64,[^"]{1000,}"/,
              'src="' + custom.replace(/"/g, '&quot;') + '"');
          }
        }
      } catch (e) {}
      // wrap images in
      return new Response(html, {
        headers: {
          'content-type': 'text/html;charset=utf-8',
          'cache-control': 'no-cache, must-revalidate',
        },
      });
    }

    // --- static assets (favicons) ---
    if (url.pathname === '/favicon-16.png')  return dataResp(favicon16, 'image/png');
    if (url.pathname === '/favicon-32.png')  return dataResp(favicon32, 'image/png');
    if (url.pathname === '/favicon-48.png')  return dataResp(favicon48, 'image/png');
    if (url.pathname === '/favicon-64.png')  return dataResp(favicon64, 'image/png');
    if (url.pathname === '/favicon-180.png') return dataResp(favicon180, 'image/png');
    if (url.pathname === '/favicon.svg')     return dataResp(faviconsvg, 'image/svg+xml');

function dataResp(data, mime) {
  const b64 = data.split(',', 2)[1];
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Response(bytes, { headers: { 'content-type': mime, 'cache-control': 'public, max-age=86400' } });
}

    return new Response('Not found', { status: 404 });
  },
};

function json(obj, status, extra = {}) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...extra, 'content-type': 'application/json' },
  });
}