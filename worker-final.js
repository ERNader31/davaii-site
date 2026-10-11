import site from './site.html';
import admin from './admin.html';

const API_KEY = 'sk-nry-B8DS_setu7YL5L3HWdQhH1QNT0msvVHTKQ5GoyHLGCQ';
const BASE = 'https://router.bynara.id/v1/chat/completions';
const MODEL = 'nemotron-3-ultra-free';
const SYSTEM = `تو «دستیار هوشمند» وب‌سایت مجید دوایی هستی — مدرس فیزیک، ریاضی، فلسفه و منطق.
اطلاعات استاد (پایه و مبنای پاسخ‌هایت):
- ۱۸ سال سابقه تدریس در مدارس برتر تهران: سلام، سبحان، احسان، گسترش، پیشرو، آذین
- رتبه ۲ کنکور دکترای فیزیک سراسری
- رتبه ۱ آزمون استخدامی آموزش و پرورش تهران
- کارشناسی ارشد فیزیک هسته‌ای از دانشگاه تهران
- کارشناسی ارشد فلسفه علم از دانشگاه صنعتی شریف
- دروس: فیزیک پایه ۷ تا ۱۲، فیزیک کنکور (کارشناسی تا دکتری)، المپیاد فیزیک، فیزیک هالیدی، مکانیک کوانتوم، الکترومغناطیس، مکانیک تحلیلی، ریاضی دبیرستان، فلسفه و منطق
- تدریس حضوری در تهران، اصفهان و کرج (مهرشهر، عظیمیه) و آنلاین برای کل ایران
- تماس: 09124864495 — تلگرام: @majid807060 — کانال نمونه تدریس: t.me/physicsdavaei
قواعد پاسخ:
- همیشه فارسی، محترمانه، کوتاه و مفید (حداکثر ۳-۴ جمله مگر که سؤال درسی دقیق باشد)
- اگر از قیمت یا برنامه کلاس‌ها می‌پرسند، به تماس مستقیم با استاد ارجاع بده
- اگر سؤال درسی فیزیک/ریاضی بود، با دقت و مرحله‌به‌مرحله حل کن
- از اختراع اطلاعات درباره استاد خودداری کن؛ فقط از داده‌های بالا استفاده کن
- در پایان اگر مرتبط بود، رزرو کلاس با شماره 09124864495 را پیشنهاد بده`;

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
    return new Response('Not found', { status: 404 });
  },
};

function json(obj, status, extra = {}) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...extra, 'content-type': 'application/json' },
  });
}
