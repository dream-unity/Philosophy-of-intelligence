import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  projectRoot, invariant, attributes, localAsset, scriptBlocks,
  assertScriptSyntax, assertNoNetworkCode, assertOfflineCss, assertDocumentResources
} from './check.mjs';

const source = readFileSync(resolve(projectRoot, 'index.html'), 'utf8');
const originalScripts = scriptBlocks(source);
const expectedOrder = originalScripts.map((script, index) => script.attributes.src || `inline-${index}`);
const embeddedScripts = [];
let cssCount = 0;
let iconCount = 0;

// The closing-tag escape is needed even inside JS strings and comments: HTML
// parsers recognise </script before JavaScript gets to interpret the source.
const escapeScript = value => value.replace(/<\/script/gi, '<\\/script');
const escapeStyle = value => value.replace(/<\/style/gi, '<\\/style');
const escapeAttribute = value => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

let html = source.replace(/<link\b[^>]*>/gi, tag => {
  const attrs = attributes(tag);
  const relations = (attrs.rel || '').toLowerCase().split(/\s+/);
  if (relations.includes('stylesheet')) {
    const css = readFileSync(localAsset(attrs.href), 'utf8');
    assertOfflineCss(css, attrs.href);
    cssCount++;
    const media = attrs.media ? ` media="${escapeAttribute(attrs.media)}"` : '';
    return `<style data-form-source="${escapeAttribute(attrs.href)}"${media}>\n${escapeStyle(css)}\n</style>`;
  }
  if (relations.includes('icon')) {
    const icon = readFileSync(localAsset(attrs.href));
    invariant((attrs.type || 'image/svg+xml') === 'image/svg+xml', 'The offline icon must use the SVG MIME type.');
    iconCount++;
    return `<link rel="icon" type="image/svg+xml" href="data:image/svg+xml;base64,${icon.toString('base64')}">`;
  }
  return tag;
});

html = html.replace(/(<script\b[^>]*>)([\s\S]*?)<\/script\s*>/gi, (full, tag, inlineSource) => {
  const attrs = attributes(tag);
  invariant(!attrs.type || /^(?:text|application)\/javascript$/i.test(attrs.type), 'The offline builder supports classic application scripts only.');
  invariant(!Object.hasOwn(attrs, 'async'), 'Async scripts cannot guarantee the module order required by the offline build.');
  const name = attrs.src || `inline-${embeddedScripts.length}`;
  const code = attrs.src ? readFileSync(localAsset(attrs.src), 'utf8') : inlineSource;
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
assertDocumentResources(html, { selfContained: true, filename: 'FORM-Offline.html' });
invariant(!/<script\b[^>]*\bsrc\s*=/i.test(html), 'Offline build still has a linked script.');
invariant(!/<link\b[^>]*rel\s*=\s*['"]stylesheet['"]/i.test(html), 'Offline build still has a linked stylesheet.');

const output = resolve(projectRoot, 'dist/FORM-Offline.html');
mkdirSync(resolve(projectRoot, 'dist'), { recursive: true });
writeFileSync(output, html, 'utf8');
console.log(`Built dist/FORM-Offline.html (${Buffer.byteLength(html).toLocaleString('en-US')} bytes); ${embeddedScripts.length} ordered scripts, ${cssCount} stylesheet and the icon embedded. Offline structure and script syntax verified.`);
