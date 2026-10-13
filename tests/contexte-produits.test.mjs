import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import ts from 'typescript';
const js=ts.transpileModule(fs.readFileSync('lib/contexte-produits.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {concerneProduits}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
test('known brand spellings, products and contextual follow-ups retrieve the fiche without capturing unrelated turns',()=>{
 for(const q of ['Tu connais DDsking ?','Parle-moi de DD SKIN','Dédé Skin','DD-skin','Quels produits de beauté proposes-tu ?','DD Black Soap'])assert(concerneProduits(q),q);
 const history=[{role:'user',text:'Tu connais DD SKIN ?'},{role:'bia',text:'Oui, une marque de soins.'}];
 for(const q of ['Et leurs produits ?','Combien ça coûte ?','Donne-moi leur numéro.'])assert(concerneProduits(q,history),q);
 for(const q of ['Bonjour','Je suis étudiant','Ma copine ne répond plus','Quel temps fait-il ?'])assert.equal(concerneProduits(q,history),false,q);
 assert.equal(concerneProduits('Combien ça coûte ?',[]),false);
});
