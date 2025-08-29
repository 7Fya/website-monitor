// 仅保留 Cloudflare Workers 格式的代码
const STORAGE_KEY = 'monitoring_sites';

export async function onRequest(context) {
  const { request, env } = context;

  // 检查 KV 存储是否绑定
  if (!env.SITE_MONITOR_KV) {
    return new Response(JSON.stringify({
      success: false,
      error: 'KV存储未配置'
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500
    });
  }

  const kv = env.SITE_MONITOR_KV;

  if (request.method === 'GET') {
    // 获取所有网站
    const data = await kv.get(STORAGE_KEY);
    return new Response(data || '[]', {
      headers: { 'Content-Type': 'application/json' }
    });
  } else if (request.method === 'POST') {
    // 保存网站列表
    try {
      const sites = await request.json();
      await kv.put(STORAGE_KEY, JSON.stringify(sites));
      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('保存失败:', error);
      return new Response(JSON.stringify({
        success: false,
        error: '保存失败'
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 500
      });
    }
  } else {
    return new Response(JSON.stringify({
      success: false,
      error: '方法不允许'
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 405
    });
  }
}