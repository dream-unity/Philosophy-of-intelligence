import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  projectRoot, invariant, attributes, localAsset, scriptBlocks,
  assertScriptSyntax, assertNoNetworkCode, assertOfflineCss, assertDocumentResources, assetDataUrl, cssUrls
} from './check.mjs';

// The closing-tag escape is needed even inside JS strings and comments: HTML
// parsers recognise </script before JavaScript gets to interpret the source.
const escapeScript = value => value.replace(/<\/script/gi, '<\\/script');
const escapeStyle = value => value.replace(/<\/style/gi, '<\\/style');
const escapeAttribute = value => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

export function embedCss(css, filename, fromDirectory = projectRoot, rootDirectory = projectRoot) {
  assertOfflineCss(css, filename, { selfContained: false, fromDirectory, rootDirectory });
  let result = css;
  for (const resource of cssUrls(css).reverse()) {
    if (resource.value.startsWith('#') || /^data:/i.test(resource.value)) continue;
    const url = assetDataUrl(resource.value, fromDirectory, rootDirectory);
    result = result.slice(0, resource.start) + `url("${url}")` + result.slice(resource.end);
  }
  assertOfflineCss(result, filename + ' (embedded)');
  return result;
}

function replaceAttribute(tag, name, value) {
  const pattern = new RegExp('(\\s' + name + '\\s*=\\s*)(?:"[^"]*"|\'[^\']*\'|[^\\s"\'=<>`]+)', 'i');
  invariant(pattern.test(tag), `Cannot replace missing ${name} attribute.`);
  return tag.replace(pattern, (_, prefix) => prefix + '"' + escapeAttribute(value) + '"');
}

export function buildOfflineHtml(source, { fromDirectory = projectRoot, rootDirectory = projectRoot } = {}) {
  const originalScripts = scriptBlocks(source);
  const expectedOrder = originalScripts.map((script, index) => script.attributes.src || `inline-${index}`);
  const embeddedScripts = [];
  let cssCount = 0;
  let iconCount = 0;
  let imageCount = 0;
  assertDocumentResources(source, { fromDirectory, rootDirectory });

  // Only actual markup is rewritten: a tag-shaped string in JavaScript or a
  // comment must not mutate application code or change module ordering.
  let html = source.replace(/<!--[\s\S]*?-->|<script\b[^>]*>[\s\S]*?<\/script\s*>|<style\b[^>]*>[\s\S]*?<\/style\s*>|<[a-z][^>]*>/gi, tag => {
    if (/^<!--|^<script\b/i.test(tag)) return tag;
    if (/^<style\b/i.test(tag)) {
      return tag.replace(/^(<style\b[^>]*>)([\s\S]*?)(<\/style\s*>)$/i, (_, open, css, close) => {
        cssCount++;
        return open + escapeStyle(embedCss(css, 'index.html inline style', fromDirectory, rootDirectory)) + close;
      });
    }
    const attrs = attributes(tag);
    const relations = (attrs.rel || '').toLowerCase().split(/\s+/);
    if (/^<link\b/i.test(tag) && relations.includes('stylesheet')) {
      const cssPath = localAsset(attrs.href, fromDirectory, rootDirectory);
      const css = embedCss(readFileSync(cssPath, 'utf8'), attrs.href, dirname(cssPath), rootDirectory);
      cssCount++;
      const media = attrs.media ? ` media="${escapeAttribute(attrs.media)}"` : '';
      return `<style data-form-source="${escapeAttribute(attrs.href)}"${media}>\n${escapeStyle(css)}\n</style>`;
    }
    if (/^<link\b/i.test(tag) && relations.includes('icon')) {
      const icon = assetDataUrl(attrs.href, fromDirectory, rootDirectory);
      const mime = icon.match(/^data:([^;]+)/)[1];
      invariant(mime.startsWith('image/'), 'The offline icon must be an image.');
      invariant(!attrs.type || attrs.type.toLowerCase() === mime, 'The icon MIME type does not match its asset.');
      iconCount++;
      return `<link rel="icon" type="${mime}" href="${icon}">`;
    }
    if (/^<img\b/i.test(tag) && attrs.src && !/^data:/i.test(attrs.src) && !attrs.src.startsWith('#')) {
      const image = assetDataUrl(attrs.src, fromDirectory, rootDirectory);
      invariant(image.startsWith('data:image/'), 'An img source must be an image.');
      tag = replaceAttribute(tag, 'src', image);
      imageCount++;
    }
    if (attrs.style) tag = replaceAttribute(tag, 'style', embedCss(attrs.style, 'index.html style attribute', fromDirectory, rootDirectory));
    return tag;
  });

  html = html.replace(/(<script\b[^>]*>)([\s\S]*?)<\/script\s*>/gi, (full, tag, inlineSource) => {
    const attrs = attributes(tag);
    invariant(!attrs.type || /^(?:text|application)\/javascript$/i.test(attrs.type), 'The offline builder supports classic application scripts only.');
    invariant(!Object.hasOwn(attrs, 'async'), 'Async scripts cannot guarantee the module order required by the offline build.');
    const name = attrs.src || `inline-${embeddedScripts.length}`;
    const code = attrs.src ? readFileSync(localAsset(attrs.src, fromDirectory, rootDirectory), 'utf8') : inlineSource;
    assertScriptSyntax(code, name);
    assertNoNetworkCode(code, name);
    const safeCode = escapeScript(code);
    assertScriptSyntax(safeCode, name + ' (embedded)');
    embeddedScripts.push({ name, code: safeCode });
    return `<script data-form-module="${escapeAttribute(name)}">\n${safeCode}\n</script>`;
  });

  invariant(cssCount > 0, 'No stylesheet was embedded.');
  invariant(iconCount === 1, 'Expected exactly one embedded icon.');
  invariant(JSON.stringify(embeddedScripts.map(script => script.name)) === JSON.stringify(expectedOrder), 'Application script order changed during the build.');
  const outputScripts = scriptBlocks(html);
  invariant(outputScripts.length === embeddedScripts.length, 'An embedded script contains an unsafe closing tag.');
  for (let index = 0; index < outputScripts.length; index++) {
    invariant(outputScripts[index].attributes['data-form-module'] === expectedOrder[index], 'Built script order does not match index.html.');
    invariant(outputScripts[index].body.trim() === embeddedScripts[index].code.trim(), `Script content changed unexpectedly: ${expectedOrder[index]}`);
    assertScriptSyntax(outputScripts[index].body, expectedOrder[index] + ' (offline output)');
  }
  assertDocumentResources(html, { selfContained: true, filename: 'Philosophy-of-Intelligence-Offline.html' });
  invariant(!/<script\b[^>]*\bsrc\s*=/i.test(html), 'Offline build still has a linked script.');
  invariant(!/<link\b[^>]*rel\s*=\s*['"]stylesheet['"]/i.test(html), 'Offline build still has a linked stylesheet.');
  return { html, stats: { scripts: embeddedScripts.length, stylesheets: cssCount, icons: iconCount, images: imageCount } };
}

export function buildProject() {
  const source = readFileSync(resolve(projectRoot, 'index.html'), 'utf8');
  const { html, stats } = buildOfflineHtml(source);
  const output = resolve(projectRoot, 'dist/Philosophy-of-Intelligence-Offline.html');
  mkdirSync(resolve(projectRoot, 'dist'), { recursive: true });
  writeFileSync(output, html, 'utf8');
  // Preserve previously shared download URLs while using the full project name.
  writeFileSync(resolve(projectRoot, 'dist/FORM-Offline.html'), html, 'utf8');
  console.log(`Built dist/Philosophy-of-Intelligence-Offline.html (${Buffer.byteLength(html).toLocaleString('en-US')} bytes); ${stats.scripts} ordered scripts, ${stats.stylesheets} stylesheets, ${stats.images} images and the icon embedded. Offline structure and script syntax verified.`);
  return { output, stats };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { buildProject(); }
  catch (error) { console.error(`Build failed: ${error.message}`); process.exitCode = 1; }
}
