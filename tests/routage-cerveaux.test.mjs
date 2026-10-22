import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

function load(path,deps={}){const m={exports:{}};const code=ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;new Function('require','module','exports',code)(id=>{assert(id in deps,id);return deps[id];},m,m.exports);return m.exports;}
const normaliser=load('lib/normaliser.ts');
const reflexion=load('lib/reflechir.ts',{'./normaliser':normaliser});
const {choisirModeleConversation}=load('lib/routage-cerveaux.ts',{'./reflechir':reflexion,'./normaliser':normaliser});
const choisir=(question,options={})=>choisirModeleConversation(question,{modeleConfigure:'claude-sonnet-5-5',...options});

test('Haiku handles short everyday turns without adding a classifier call',()=>{
 for(const question of ['Naka nga def ?', 'Je suis fatigué aujourd’hui.', 'Dama sonn tey.'])assert.equal(choisir(question),'claude-haiku-5-5',question);
});

test('Sonnet keeps learned language, complex reasoning, actions, and longer context',()=>{
 for(const question of ['Traduis-moi bonjour en wolof.', 'Pourquoi la tomate a-t-elle ce prix ?', 'Si je travaille 21 jours, combien vais-je gagner ?', 'Mémorise cette correction.', 'Je dois choisir un traitement et je ne sais pas lequel prendre.'])assert.equal(choisir(question),'claude-sonnet-5-5',question);
 assert.equal(choisir('Naka nga def ?', {apprentissage:true}),'claude-sonnet-5-5');
 assert.equal(choisir('Naka nga def ?', {avecOutil:true}),'claude-sonnet-5-5');
});

test('manual model trials and custom model configuration remain authoritative',()=>{
 assert.equal(choisir('Explique un calcul compliqué.',{profil:'haiku'}),'claude-haiku-5-5');
 assert.equal(choisir('Naka nga def ?',{profil:'sonnet'}),'claude-sonnet-5-5');
 assert.equal(choisir('Naka nga def ?',{modeleConfigure:'custom-model'}),'custom-model');
});
