import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    base: process.env.GITHUB_ACTIONS === 'true' ? '/money/' : '/',
    plugins: [
      react(), 
      tailwindcss(),
      {
        name: 'vercel-api-mock',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (req.url?.startsWith('/api/') && req.method === 'POST') {
              try {
                // Parse body manually for JSON payload
                const bodyStr = await new Promise((resolve) => {
                  let body = '';
                  req.on('data', chunk => body += chunk.toString());
                  req.on('end', () => resolve(body));
                });
                
                req.body = bodyStr ? JSON.parse(bodyStr) : {};

                // Mock Vercel res.status and res.json
                res.status = (code) => {
                  res.statusCode = code;
                  return res;
                };
                res.json = (data) => {
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify(data));
                };

                const modulePath = req.url.split('?')[0]; // e.g. /api/voice
                const absolutePath = path.resolve(__dirname, `.${modulePath}.js`);
                // Use file:// protocol for absolute paths in Windows Node ES module imports
                const handler = await import(`file://${absolutePath}`);
                await handler.default(req, res);
              } catch (e) {
                console.error('API Mock Error:', e);
                res.statusCode = 500;
                res.end(JSON.stringify({ error: e.message }));
              }
            } else {
              next();
            }
          });
        }
      }
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
