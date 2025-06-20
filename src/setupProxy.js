const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    '/v5',
    createProxyMiddleware({
      target: 'https://api.internationalshowtimes.com',
      changeOrigin: true,
      secure: false,
      headers: {
        'X-API-Key': process.env.REACT_APP_SHOWTIMES_API_KEY
      },
      onProxyReq: (proxyReq) => {
        // Log the full URL being requested
        console.log('Proxying request');
      },
      onError: (err, req, res) => {
        console.error('Proxy error occurred');
      }
    })
  );
}; 