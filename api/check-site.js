<// 用于检查网站状态的Serverless函数
// 在Vercel上，此文件应放在/api目录下
// 在Cloudflare Pages上，此文件应放在/functions/api目录下

export async function onRequestGet(context) {
  // Cloudflare Pages格式
  const { request } = context;
  const urlParams = new URL(request.url).searchParams;
  const targetUrl = urlParams.get('url');
  
  if (!targetUrl) {
    return new Response(JSON.stringify({ 
      success: false, 
      error: '请提供要监测的网址' 
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 400
    });
  }
  
  try {
    // 验证URL格式
    new URL(targetUrl);
    
    // 记录开始时间
    const startTime = Date.now();
    
    // 发送请求
    const response = await fetch(targetUrl, {
      method: 'GET',
      redirect: 'follow',
      timeout: 10000, // 10秒超时
      headers: {
        'User-Agent': 'SiteMonitor/1.0'
      }
    });
    
    // 计算响应时间
    const responseTime = Date.now() - startTime;
    
    // 返回结果
    return new Response(JSON.stringify({
      success: true,
      status: 'online',
      statusCode: response.status,
      responseTime: responseTime
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('监测网站时出错:', error);
    return new Response(JSON.stringify({
      success: false,
      status: 'offline',
      error: error.message
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Vercel兼容格式
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: '方法不允许' });
  }
  
  const { url } = req.query;
  
  if (!url) {
    return res.status(400).json({ 
      success: false, 
      error: '请提供要监测的网址' 
    });
  }
  
  try {
    // 验证URL格式
    new URL(url);
    
    // 记录开始时间
    const startTime = Date.now();
    
    // 发送请求
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      timeout: 10000, // 10秒超时
      headers: {
        'User-Agent': 'SiteMonitor/1.0'
      }
    });
    
    // 计算响应时间
    const responseTime = Date.now() - startTime;
    
    // 返回结果
    res.status(200).json({
      success: true,
      status: 'online',
      statusCode: response.status,
      responseTime: responseTime
    });
  } catch (error) {
    console.error('监测网站时出错:', error);
    res.status(200).json({
      success: false,
      status: 'offline',
      error: error.message
    });
  }
}
