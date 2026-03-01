#!/usr/bin/env node
// Avvia il server unico (Express + Vite middleware).
// Uso: node dev.js

const { spawn } = require('child_process');
const path = require('path');

const reset = '\x1b[0m';

function spawnService(svc) {
  const proc = spawn(svc.cmd, { cwd: svc.cwd, shell: true });
  proc.stdout.on('data', (data) =>
    process.stdout.write(`${svc.color}[${svc.name}]${reset} ${data}`)
  );
  proc.stderr.on('data', (data) =>
    process.stderr.write(`${svc.color}[${svc.name}]${reset} ${data}`)
  );
  proc.on('exit', (code) => {
    console.log(`${svc.color}[${svc.name}]${reset} uscito con codice ${code}`);
    process.exit(code ?? 1);
  });
  return proc;
}

const backend = { name: 'server', color: '\x1b[34m', cwd: path.join(__dirname, 'backend'), cmd: 'npm run dev' };

spawnService(backend);

process.on('SIGINT', () => process.exit(0));
