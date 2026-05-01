// supabase/functions/cors-handler/index.ts

Deno.serve(async (req) => {
  // CORS হেডার সেট করুন
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Max-Age': '86400',
  };

  // OPTIONS রিকোয়েস্ট হ্যান্ডল করুন (Preflight)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname;

    // ভিজিটর কাউন্ট API
    if (path === '/api/visitor-count' && req.method === 'GET') {
      const response = await fetch('https://bffomfsffrtfgxyetzvm.supabase.co/rest/v1/settings?key=eq.visitor_count&select=value', {
        headers: {
          'apikey': 'sb_publishable_A0BluIVwJ4M3Zd3JWpBoPg_NJSRu81D',
          'Authorization': 'Bearer sb_publishable_A0BluIVwJ4M3Zd3JWpBoPg_NJSRu81D'
        }
      });
      
      const data = await response.json();
      return new Response(JSON.stringify(data), {
        headers: { ...headers, 'Content-Type': 'application/json' }
      });
    }

    // মাদরাসা কাউন্ট API
    if (path === '/api/madrasa-count' && req.method === 'GET') {
      const response = await fetch('https://bffomfsffrtfgxyetzvm.supabase.co/rest/v1/madrasas?select=count', {
        headers: {
          'apikey': 'sb_publishable_A0BluIVwJ4M3Zd3JWpBoPg_NJSRu81D',
          'Authorization': 'Bearer sb_publishable_A0BluIVwJ4M3Zd3JWpBoPg_NJSRu81D'
        }
      });
      
      const data = await response.json();
      return new Response(JSON.stringify({ count: data.length }), {
        headers: { ...headers, 'Content-Type': 'application/json' }
      });
    }

    // ডিফল্ট রেসপন্স
    return new Response(JSON.stringify({ message: 'API is working!' }), {
      headers: { ...headers, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...headers, 'Content-Type': 'application/json' }
    });
  }
});