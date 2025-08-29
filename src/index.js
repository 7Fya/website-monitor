// src/index.js
import { onRequest as handleSites } from '../api/sites';
import { onRequestGet as handleCheckSite } from '../api/check-site';

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);

        // 处理API请求
        if (url.pathname === '/api/sites') {
            return handleSites({ request, env });
        } else if (url.pathname === '/api/check-site') {
            return handleCheckSite({ request, env });
        }

        // 处理静态资源（如index.html、js/app.js）
        return env.ASSETS.fetch(request);
    }
};