<// 用于管理监测网站列表的Serverless函数
// 在Vercel上，此文件应放在/api目录下
// 在Cloudflare Pages上，此文件应放在/functions/api目录下

// 存储键名
const STORAGE_KEY = 'monitoring_sites';

// Cloudflare Pages实现
export async function onRequest(context) {
  const { request } = context;
  
  // 检查是否有KV存储绑定
  if (!context.env || !context.env.SITE_MONITOR_KV) {
    return new Response(JSON.stringify({
      success: false,
      error: 'KV存储未配置'
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500
    });
  }
  
  const kv = context.env.SITE_MONITOR_KV;
  
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
      console.error('保存网站列表失败:', error);
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

// Vercel兼容实现
export default async function handler(req, res) {
  if (req.method === 'GET') {
    // 获取所有网站
    try {
      const data = await process.env.SITE_MONITOR_KV.get(STORAGE_KEY);
      res.status(200).json(data ? JSON.parse(data) : []);
    } catch (error) {
      console.error('获取网站列表失败:', error);
      // 回退到空数组
      res.status(200).json([]);
    }
  } else if (req.method === 'POST') {
    // 保存网站列表
    try {
      const sites = req.body;
      await process.env.SITE_MONITOR_KV.put(STORAGE_KEY, JSON.stringify(sites));
      res.status(200).json({ success: true });
    } catch (error) {
      console.error('保存网站列表失败:', error);
      res.status(500).json({
        success: false,
        error: '保存失败'
      });
    }
  } else {
    res.status(405).json({
      success: false,
      error: '方法不允许'
    });
  }
}
