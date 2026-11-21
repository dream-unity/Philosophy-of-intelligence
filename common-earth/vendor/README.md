The static Common Earth site serves its flight runtime from this directory. The ES module contains the Three.js 0.187.0 exports used by flight-3d.js and the RoomEnvironment add-on, bundled with esbuild 0.28.2. The upstream MIT license is included.

To regenerate from the repository root after installing the locked dependencies, run:

```sh
node --input-type=module -e "import fs from 'node:fs'; const names = [...new Set([...fs.readFileSync('common-earth/flight-3d.js','utf8').matchAll(/THREE\\.(\\w+)/g)].map(m=>m[1]))].filter(n=>n!=='RoomEnvironment').sort(); console.log('export {'+names.join(',')+'} from \'three\'; export {RoomEnvironment} from \'three/addons/environments/RoomEnvironment.js\';')" | npx --yes esbuild@0.28.2 --bundle --format=esm --target=es2020 --minify --legal-comments=inline --outfile=common-earth/vendor/three-flight-r187.mjs
cp node_modules/three/LICENSE common-earth/vendor/three-LICENSE.txt
```
