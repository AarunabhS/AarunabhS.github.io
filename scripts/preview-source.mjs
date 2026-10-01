// Start a read-only source preview in a temporary directory.
// Usage: node scripts/preview-source.mjs /path/to/vite-project 5187
import { mkdtemp, cp, symlink, writeFile, realpath } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawn } from 'node:child_process';
const source = resolve(process.argv[2]);
const port = Number(process.argv[3] || 5187);
const temp = await realpath(await mkdtemp(join(tmpdir(), 'portfolio-source-preview-')));
for (const file of ['index.html','package.json']) await cp(join(source,file),join(temp,file));
for (const directory of ['src','public','node_modules']) await symlink(join(source,directory),join(temp,directory),'dir');
await writeFile(join(temp,'vite.config.js'), `import {defineConfig} from 'vite';import react from '@vitejs/plugin-react';export default defineConfig({plugins:[react()],cacheDir:${JSON.stringify(join(temp,'.vite'))},server:{host:'127.0.0.1',port:${port},strictPort:true,fs:{allow:${JSON.stringify([temp,source])}}}});`);
const child = spawn(process.execPath,[join(source,'node_modules/vite/bin/vite.js'),'--config',join(temp,'vite.config.js')],{cwd:temp,stdio:'inherit'});
process.on('SIGTERM',()=>child.kill('SIGTERM'));
process.on('SIGINT',()=>child.kill('SIGINT'));
child.on('exit',code=>process.exit(code || 0));
