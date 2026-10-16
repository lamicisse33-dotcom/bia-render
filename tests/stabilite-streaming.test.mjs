import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {createHash} from 'node:crypto';
const baseline=JSON.parse(fs.readFileSync('.github/baselines/ecoute-stable.json','utf8'));
test('isolated streaming experiment preserves the stable production listening and voice paths',()=>{
 for(const [path,hash] of Object.entries(baseline.files))assert.equal(createHash('sha256').update(fs.readFileSync(path)).digest('hex'),hash,`${path}: measured migration required before baseline update`);
});
