require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDb } = require('./db/schema');

process.on('uncaughtException', (err) => {
  console.error('[FATAL] uncaughtException:', err.message);
  console.error(err.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('[FATAL] unhandledRejection:', reason);
});

const uploadRouter = require('./routes/upload');
const invoicesRouter = require('./routes/invoices');
const searchRouter = require('./routes/search');
const statsRouter = require('./routes/stats');
const adminRouter = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 5173;

app.use(cors());
app.use(express.json());

// Static: serve original invoice files for download
app.use('/files', express.static(process.env.FILES_PATH || path.join(__dirname, '../../data/files')));

// Routes
app.use('/api/upload', uploadRouter);
app.use('/api/invoices', invoicesRouter);
app.use('/api/search', searchRouter);
app.use('/api/stats', statsRouter);
app.use('/api/admin', adminRouter);

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Serve Vue frontend (built) — must be AFTER api routes
const FRONTEND_DIST = path.join(__dirname, '../public');
const fs = require('fs');

async function startServer() {
  if (fs.existsSync(path.join(FRONTEND_DIST, 'index.html'))) {
    // Produzione: servi il frontend buildato
    app.use(express.static(FRONTEND_DIST));
    app.get('*', (req, res) => {
      res.sendFile(path.join(FRONTEND_DIST, 'index.html'));
    });
  } else {
    // Dev: Vite in middleware mode (HMR incluso)
    const frontendDir = path.resolve(__dirname, '../../frontend');
    const tailwindcss = require(path.join(frontendDir, 'node_modules/tailwindcss'));
    const autoprefixer = require(path.join(frontendDir, 'node_modules/autoprefixer'));

    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      root: frontendDir,
      server: { middlewareMode: true },
      appType: 'spa',
      css: {
        postcss: {
          plugins: [
            tailwindcss({
              content: [
                path.join(frontendDir, 'index.html').replace(/\\/g, '/'),
                path.join(frontendDir, 'src/**/*.{vue,js}').replace(/\\/g, '/'),
              ],
              darkMode: 'class',
              theme: {
                extend: {
                  colors: {
                    primary: { DEFAULT: '#1a56db', 600: '#1e429f', 700: '#1a56db' },
                  },
                },
              },
              plugins: [],
            }),
            autoprefixer(),
          ],
        },
      },
    });
    app.use(vite.middlewares);
  }

  initDb();
  app.listen(PORT, () => {
    console.log(`FatturaHub running on http://localhost:${PORT}`);
  });
}

startServer();
