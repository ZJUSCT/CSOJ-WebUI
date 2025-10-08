/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'export',
    // 可以在这里添加重写、重定向等高级配置
    // 例如，将 API 请求代理到后端以避免 CORS 问题
    // async rewrites() {
    //   return [
    //     {
    //       source: '/api/:path*',
    //       destination: 'http://127.0.0.1:8080/api/:path*',
    //     },
    //   ]
    // },
};

export default nextConfig;