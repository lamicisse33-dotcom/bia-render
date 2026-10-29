import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import ts from 'typescript';
const js=ts.transpileModule(fs.readFileSync('lib/levres-video.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText;
const a=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
test('la forme originale est conservée au repos et les déformations restent bornées',()=>{
 for(const niveau of [0,.2,.8,1,NaN])assert.equal(a.echelleLevres(niveau,.2,false),1);
 for(const gap of [0,.01,.1,.4])for(const niveau of [-10,0,.1,1,100]){const s=a.echelleLevres(niveau,gap,true);assert(s>=.76&&s<=1.3);}
 assert.equal(a.echelleLevres(1,0,true),1);
});
test('la transition converge sans saut ni dépassement même après une pause du navigateur',()=>{
 let s=1;for(let i=0;i<60;i++){const n=a.lisserLevres(s,1.3,16);assert(n>=s&&n<=1.3);s=n;}assert(s>1.299);
 assert.equal(a.lisserLevres(1,1.3,-1),1);assert(a.lisserLevres(1,1.3,99999)<1.3);
});

test('les bords restent immobiles et la transformation ne replie pas la texture des lèvres',()=>{
 for(const scale of [.76,1,1.3]){
  for(const x of [-60,60])for(const y of [-50,0,50])assert(Math.abs(a.origineLevre(y,x,100,.1,scale)-y)<1e-8);
  let prev=-Infinity;
  for(let y=-65;y<=65;y+=.5){const v=a.origineLevre(y,0,100,.1,scale);assert(v>=prev);prev=v;}
 }
});
