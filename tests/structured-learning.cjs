const fs=require('fs'),vm=require('vm'),assert=require('assert'),ts=require('typescript');
const parser={exports:{}};vm.createContext(parser);vm.runInContext(ts.transpile(fs.readFileSync(__dirname+'/../lib/routage-apprentissage.ts','utf8'),{module:ts.ModuleKind.CommonJS}),parser);
const source=ts.transpile(fs.readFileSync(__dirname+'/../app/LectureApprentissage.tsx','utf8'),{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022});
function mount(){const calls=[],read=[],effects=[];const react={useState:v=>[v,()=>{}],useRef:v=>({current:v}),useMemo:f=>f(),useEffect:f=>effects.push(f)};
const modules={'react':react,'react/jsx-runtime':{jsx:(t,p)=>({t,p}),jsxs:(t,p)=>({t,p})},'@/lib/routage-apprentissage':parser.exports,'@/lib/lecture-continue':{LectureContinue:class{demarrer(t){read.push(t)}stop(){} pause(){} reprendre(){}}},'@/lib/langue':{ambiguitiesWolof:()=>[]},'@/lib/voix-piper-locale':{},'@/lib/flux-khalam':{}};
const ctx={exports:{},require:n=>modules[n]||{},fetch:async(url,opts)=>{calls.push({url,body:opts?.body?JSON.parse(opts.body):null});return {ok:true,json:async()=>({lecons:[],verifie:true,valide:true,reply:'8 000 francs.'})}},crypto:require('crypto').webcrypto,TextEncoder,performance,setTimeout,clearTimeout,AbortController};vm.createContext(ctx);vm.runInContext(source,ctx);
const tree=ctx.exports.default({code:'test-fixture',voice:'female',demande:{texte:'Jërëjëf. Merci.',nonce:1,auto:false},onStart(){},onClose(){},edition:true,obtenirAudio:()=>({currentTime:0,resume:async()=>{}})});
for(const f of effects)f();calls.length=0;read.length=0;
const nodes=[];function walk(x){if(!x)return;if(Array.isArray(x)){x.forEach(walk);return;}if(typeof x==='object'){nodes.push(x);walk(x.p?.children)}}walk(tree);
const area=nodes.find(n=>n.t==='textarea'&&n.p['aria-label']==='Texte complet de l’exercice');
const confirm=nodes.find(n=>n.t==='input'&&n.p.type==='checkbox'&&n.p.checked===false&&!n.p.disabled);
function paste(t){area.p.onPaste({clipboardData:{getData:()=>t},preventDefault(){},currentTarget:{value:'',selectionStart:0,selectionEnd:0}})}
return {calls,read,paste,confirm};}
const tick=()=>new Promise(r=>setTimeout(r,20));
(async()=>{
let m=mount();m.paste('INSTRUCTION: Pour les calculs, réponds simplement.');await tick();assert.equal(m.read.length,0);assert.equal(m.calls[0].url,'/api/apprentissage/instruction');assert.equal(m.calls[0].body.texte,'Pour les calculs, réponds simplement.');assert(!m.calls.some(c=>c.url.includes('/devoir')));
m=mount();m.paste('EXERCICE: Jërëjëf. Merci.');await tick();assert.deepEqual(m.read,['Jërëjëf. Merci.']);assert.equal(m.calls.length,0);
m.confirm.p.onChange({target:{checked:true}});m.paste('MÉMORISATION: Sauvegarde uniquement les phrases validées.');await tick();assert.equal(m.read.length,1);assert.equal(m.calls[0].url,'/api/apprentissage/devoir');assert.equal(m.calls[0].body.texte,'Jërëjëf. Merci.');assert.equal(m.calls[0].body.valide,true);
m=mount();m.paste('MÉMORISATION: Sauvegarde les phrases.');await tick();assert.equal(m.calls.length,0);assert.equal(m.read.length,0);
m=mount();m.paste('TEST: Si le kilo coûte 4 000 francs et j’en prends 2 ?');await tick();assert.equal(m.read.length,0);assert.equal(m.calls[0].url,'/api/chat');assert.equal(m.calls[0].body.apprentissageTest,true);assert.equal(m.calls[0].body.apprend,false);assert(!m.calls.some(c=>c.url.includes('/devoir')));
console.log('Window interaction tests passed: instruction, exercise, validated save, rejected unvalidated save, read-only test.');
})().catch(e=>{console.error(e);process.exit(1)});
