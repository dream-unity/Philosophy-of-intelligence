import { readFileSync, readdirSync, realpathSync, statSync } from 'node:fs';
import { dirname, extname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { Script } from 'node:vm';

export const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// These controls are created by app.js inside the indicated view. A reference
// is exempt from the static DOM check only if its literal declaration also
// exists in app.js; adding a misspelled ID to this list cannot hide an error.
const DYNAMIC_IDS = new Map([
  ['detail-title', 'detail dialog'],
  ['save-revision', 'Palace entry dialog'],
  ['revision-text', 'Palace entry dialog'],
  ['delete-entry', 'Palace entry dialog'],
  ['download-export', 'export dialog'],
  ['export-private', 'export dialog'],
  ['evidence-observation', 'prediction review'],
  ['evidence-verdict', 'prediction review'],
  ['evidence-revision', 'prediction review'],
  ['save-evidence', 'prediction review'],
  ['export-current-tab', 'concurrent tab notice'],
  ['reload-saved-progress', 'concurrent tab notice'],
  ['download-recovery', 'saved data recovery'],
  ['reset-recovery', 'saved data recovery']
]);

export function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

export function attributes(tag) {
  const result = Object.create(null);
  const body = tag.replace(/^<\s*\/?\s*[\w:-]+/, '').replace(/\/?\s*>$/, '');
  const expression = /([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  for (const match of body.matchAll(expression)) {
    const name = match[1].toLowerCase();
    invariant(!Object.hasOwn(result, name), `Duplicate attribute ${name} in ${tag.slice(0, 120)}`);
    result[name] = decodeHtmlReferences(match[2] ?? match[3] ?? match[4] ?? '');
  }
  return result;
}

export function decodeHtmlReferences(value) {
  return value.replace(/&(?:#(x[0-9a-f]+|[0-9]+)|(amp|quot|apos|lt|gt));/gi, (full, numeric, named) => {
    if (numeric) {
      const number = numeric[0].toLowerCase() === 'x' ? parseInt(numeric.slice(1), 16) : parseInt(numeric, 10);
      return number > 0 && number <= 0x10ffff ? String.fromCodePoint(number) : '\ufffd';
    }
    return { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>' }[named.toLowerCase()];
  });
}

export function localAsset(reference, fromDirectory = projectRoot, rootDirectory = projectRoot) {
  invariant(typeof reference === 'string' && reference.trim() !== '', 'An asset has an empty path.');
  reference = reference.trim();
  invariant(!/^(?:[a-z][\w+.-]*:|\/\/)/i.test(reference), `External asset is not allowed: ${reference}`);
  let pathname;
  try { pathname = decodeURIComponent(reference.split(/[?#]/, 1)[0]); }
  catch { throw new Error(`Invalid encoded asset path: ${reference}`); }
  invariant(pathname !== '' && !/[\\\u0000-\u001f\u007f]/.test(pathname), `Invalid asset path: ${reference}`);
  invariant(!/^(?:[a-z][\w+.-]*:|\/\/)/i.test(pathname), `External asset is not allowed: ${reference}`);
  invariant(!isAbsolute(pathname), `Use a relative asset path: ${reference}`);
  const absolute = resolve(fromDirectory, pathname);
  const fromRoot = relative(rootDirectory, absolute);
  invariant(fromRoot !== '..' && !fromRoot.startsWith('..' + sep) && !isAbsolute(fromRoot), `Asset escapes the project: ${reference}`);
  let info;
  try { info = statSync(absolute); } catch { throw new Error(`Missing local asset: ${reference}`); }
  invariant(info.isFile(), `Asset is not a file: ${reference}`);
  const realRelative = relative(realpathSync(rootDirectory), realpathSync(absolute));
  invariant(realRelative !== '..' && !realRelative.startsWith('..' + sep) && !isAbsolute(realRelative), `Asset symlink escapes the project: ${reference}`);
  return absolute;
}

const ASSET_MIME_TYPES = Object.freeze({
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.gif': 'image/gif', '.avif': 'image/avif', '.bmp': 'image/bmp', '.ico': 'image/x-icon',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.otf': 'font/otf'
});

export function assertInertSvg(source, filename) {
  invariant(/<svg\b/i.test(source), `${filename} is not an SVG document.`);
  invariant(!/<script\b|<foreignObject\b|\bon[\w:-]+\s*=|<!ENTITY\b|<!DOCTYPE\b/i.test(source), `${filename} must be inert, self-contained SVG.`);
  assertDocumentResources(source, { selfContained: true, filename });
}

export function assetDataUrl(reference, fromDirectory = projectRoot, rootDirectory = projectRoot) {
  const pathname = localAsset(reference, fromDirectory, rootDirectory);
  const mime = ASSET_MIME_TYPES[extname(pathname).toLowerCase()];
  invariant(mime, `Unsupported embedded asset type: ${reference}`);
  const content = readFileSync(pathname);
  if (mime === 'image/svg+xml') assertInertSvg(content.toString('utf8'), reference);
  const fragment = reference.includes('#') ? reference.slice(reference.indexOf('#') + 1) : '';
  return `data:${mime};base64,${content.toString('base64')}${fragment ? '#' + encodeURIComponent(decodeURIComponent(fragment)) : ''}`;
}

export function scriptBlocks(html) {
  return [...html.matchAll(/(<script\b[^>]*>)([\s\S]*?)<\/script\s*>/gi)].map(match => ({
    tag: match[1], body: match[2], attributes: attributes(match[1]), full: match[0]
  }));
}

export function assertScriptSyntax(source, filename) {
  try { new Script(source, { filename }); }
  catch (error) { throw new Error(`Invalid script ${filename}: ${error.message}`); }
}

export function assertNoNetworkCode(source, filename) {
  const forbidden = [
    /\bfetch\s*\(/,
    /\b(?:XMLHttpRequest|WebSocket|EventSource)\b/,
    /\bimportScripts\s*\(/,
    /\bimport\s*\(/,
    /\bnew\s+(?:Worker|SharedWorker)\s*\(/,
    /\bserviceWorker\s*\.\s*register\s*\(/,
    /\bcreateElement\s*\(\s*['"](?:script|iframe|link)['"]\s*\)/
  ];
  for (const pattern of forbidden) {
    invariant(!pattern.test(source), `${filename} contains an unreviewed runtime loading/network API: ${pattern}`);
  }
}

export function cssUrls(css) {
  // Comments remain in the output but cannot supply a live resource reference.
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, match => ' '.repeat(match.length));
  const values = [];
  for (const match of clean.matchAll(/url\(\s*(?:"((?:\\.|[^"\\])*)"|'((?:\\.|[^'\\])*)'|((?:\\.|[^)\\])*))\s*\)/gi)) {
    const raw = (match[1] ?? match[2] ?? match[3]).trim();
    const value = raw.replace(/\\(?:([0-9a-f]{1,6})\s?|([^\r\n]))/gi, (_, hex, literal) => hex ? String.fromCodePoint(parseInt(hex, 16) || 0xfffd) : literal);
    values.push({ value, start: match.index, end: match.index + match[0].length });
  }
  return values;
}

export function assertOfflineCss(css, filename, { selfContained = true, fromDirectory = projectRoot, rootDirectory = projectRoot } = {}) {
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, '');
  invariant(!/@import\b/i.test(clean), `${filename} contains @import; the offline edition must contain all CSS.`);
  invariant(!/(?:-webkit-)?image-set\s*\(/i.test(clean), `${filename}: image-set requires an explicit offline embedding implementation.`);
  for (const { value: url } of cssUrls(css)) {
    if (url.startsWith('#') || /^data:/i.test(url)) continue;
    invariant(!selfContained, `${filename} loads a non-embedded CSS resource: ${url}`);
    assetDataUrl(url, fromDirectory, rootDirectory);
  }
}

export const SUNO_EMBED_URL = 'https://suno.com/embed/9d62272c-0a81-4f29-b6b0-52f03324b7b8';

// A targeted source audit, not a general HTML security parser. External anchor
// links are intentional navigation; source/font/media/script loads are not.
export function assertDocumentResources(html, { selfContained = false, allowOnlinePlayer = false, filename = 'index.html', fromDirectory = projectRoot, rootDirectory = projectRoot } = {}) {
  for (const match of html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style\s*>/gi)) assertOfflineCss(match[1], filename, { selfContained, fromDirectory, rootDirectory });
  const markup = html
    .replace(/(<script\b[^>]*>)[\s\S]*?<\/script\s*>/gi, '$1</script>')
    .replace(/(<style\b[^>]*>)[\s\S]*?<\/style\s*>/gi, '$1</style>')
    .replace(/<!--[\s\S]*?-->/g, '');
  invariant(!/<base\b/i.test(markup), `${filename} must not change the base URL.`);
  invariant(!/<meta\b[^>]*http-equiv\s*=\s*['"]?refresh\b/i.test(markup), `${filename} must not redirect automatically.`);
  const resourceAttributes = {
    script: ['src'], link: ['href'], img: ['src', 'srcset'], source: ['src', 'srcset'],
    video: ['src', 'poster'], audio: ['src'], iframe: ['src'], object: ['data'],
    embed: ['src'], input: ['src'], image: ['href', 'xlink:href'], use: ['href', 'xlink:href']
  };
  let count = 0;
  for (const match of markup.matchAll(/<([a-z][\w:-]*)\b[^>]*>/gi)) {
    const name = match[1].toLowerCase();
    const attrs = attributes(match[0]);
    if (attrs.style) assertOfflineCss(attrs.style, filename + ' inline style', { selfContained, fromDirectory, rootDirectory });
    for (const key of resourceAttributes[name] || []) {
      if (!Object.hasOwn(attrs, key)) continue;
      const value = attrs[key].trim();
      invariant(key !== 'srcset', `${filename}: srcset requires an explicit offline embedding implementation.`);
      if (allowOnlinePlayer && !selfContained && name === 'iframe' && key === 'src' &&
          attrs['data-online-player'] === 'suno' && value === SUNO_EMBED_URL) {
        const permissions = (attrs.sandbox || '').trim().split(/\s+/).sort().join(' ');
        invariant(permissions === 'allow-same-origin allow-scripts',
          'The music player sandbox must block popups and top-level navigation.');
        continue;
      }
      if (value.startsWith('#') || /^data:/i.test(value)) continue;
      invariant(!selfContained, `${filename} still depends on an external file: ${value}`);
      const asset = localAsset(value, fromDirectory, rootDirectory);
      if (name === 'link' && (attrs.rel || '').split(/\s+/).includes('stylesheet')) {
        assertOfflineCss(readFileSync(asset, 'utf8'), value, { selfContained: false, fromDirectory: dirname(asset), rootDirectory });
      } else if (name === 'img' || (name === 'link' && (attrs.rel || '').split(/\s+/).includes('icon'))) {
        invariant(assetDataUrl(value, fromDirectory, rootDirectory).startsWith('data:image/'), `${filename}: an image requires an image asset: ${value}`);
      }
      count++;
    }
  }
  return count;
}

function javascriptFiles(directory) {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const pathname = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...javascriptFiles(pathname));
    else if (/\.(?:cjs|mjs|js)$/.test(entry.name)) files.push(pathname);
  }
  return files.sort();
}

export function checkProject() {
  const html = readFileSync(resolve(projectRoot, 'index.html'), 'utf8');
  const app = readFileSync(resolve(projectRoot, 'src/app.js'), 'utf8');
  const files = javascriptFiles(resolve(projectRoot, 'src'));
  for (const file of files) {
    const check = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
    invariant(check.status === 0, `Node syntax check failed: ${relative(projectRoot, file)}\n${check.stderr || check.error || ''}`);
    assertNoNetworkCode(readFileSync(file, 'utf8'), relative(projectRoot, file));
  }

  const idPattern = /\bid\s*=\s*(["'])([^"']+)\1/g;
  const staticIds = [...html.matchAll(idPattern)].map(match => match[2]);
  invariant(new Set(staticIds).size === staticIds.length, 'index.html contains duplicate IDs.');
  const staticSet = new Set(staticIds);
  const dynamicSet = new Set([...app.matchAll(idPattern)].map(match => match[2]));
  const references = new Set([...app.matchAll(/(?:\$|document\.getElementById)\(\s*(["'])([^"']+)\1\s*\)/g)].map(match => match[2]));
  for (const id of references) {
    invariant(staticSet.has(id) || (DYNAMIC_IDS.has(id) && dynamicSet.has(id)), `app.js references missing #${id}; it is neither a static ID nor an explicitly declared dynamic control.`);
  }
  for (const [id, view] of DYNAMIC_IDS) {
    invariant(dynamicSet.has(id), `The dynamic-ID exception #${id} (${view}) has no declaration in app.js.`);
  }
  for (const match of html.matchAll(/\b(?:for|aria-labelledby|aria-describedby)\s*=\s*(["'])([^"']+)\1/g)) {
    for (const id of match[2].split(/\s+/)) invariant(staticSet.has(id) || (DYNAMIC_IDS.has(id) && dynamicSet.has(id)), `index.html refers to missing accessibility target #${id}.`);
  }

  const resources = assertDocumentResources(html, { allowOnlinePlayer: true });
  const scripts = scriptBlocks(html);
  invariant(scripts.length > 0, 'index.html contains no application scripts.');
  const linkedScripts = scripts.filter(script => script.attributes.src).map(script => localAsset(script.attributes.src));
  invariant(new Set(linkedScripts).size === linkedScripts.length, 'index.html loads an application script more than once.');
  invariant(linkedScripts.at(-1) === resolve(projectRoot, 'src/app.js'), 'app.js must load after the other application modules.');
  for (const script of scripts) {
    if (script.attributes.src) continue;
    assertScriptSyntax(script.body, 'index.html inline script');
    assertNoNetworkCode(script.body, 'index.html inline script');
  }
  const icon = readFileSync(resolve(projectRoot, 'icon.svg'), 'utf8');
  assertInertSvg(icon, 'icon.svg');
  console.log(`Checked ${files.length} source scripts, ${references.size} DOM references and ${resources} local assets. Only the optional Suno player uses the network.`);
  return { files: files.length, references: references.size, resources };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { checkProject(); }
  catch (error) { console.error(`Check failed: ${error.message}`); process.exitCode = 1; }
}
