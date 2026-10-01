// Keep PNG originals for inspection; create smaller previews for the gallery.
// Usage: SHARP_MODULE=/path/to/sharp node scripts/optimize-previews.mjs
import {createRequire} from 'node:module';
import {readdir, mkdir} from 'node:fs/promises';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url);
const sharp=require(process.env.SHARP_MODULE || 'sharp');
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const directory=join(root,'images/outputs');
await mkdir(join(directory,'previews'),{recursive:true});
const files=(await readdir(directory)).filter(file=>file.endsWith('.png'));
await Promise.all(files.map(file=>sharp(join(directory,file)).resize({width:960,withoutEnlargement:true}).webp({quality:88}).toFile(join(directory,'previews',file.replace(/\.png$/,'.webp')))));
console.log(`Optimized ${files.length} previews; original PNG files retained.`);
