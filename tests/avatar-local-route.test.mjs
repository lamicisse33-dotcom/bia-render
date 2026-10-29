import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import * as crypto from 'node:crypto';
test('Runway demande un choix explicite ; les anciens appels restent bloqués et la fermeture reste autorisée',async()=>{
 let ouvertures=0,fermetures=0;
 const deps={
  'next/server':{NextResponse:{json:(body,options={})=>({body,status:options.status||200})}},
  '@/lib/codes':{verifierCode:()=>({ok:true,maitre:true})},
  '@/lib/acces-lien':{verifierNumero:async()=>({ok:true})},
  'node:crypto':crypto,
  '@/lib/avatar-runway-serveur':{configurationAvatar:()=>({}),cadrageAvatar:()=>({}),verifierAccesAvatar:async()=>({}),ouvrirAvatar:async()=>{ouvertures++;return {session:'explicit-session'};},fermerAvatar:async()=>{fermetures++;}}
 };
 const m={exports:{}};
 const js=ts.transpileModule(fs.readFileSync('app/api/avatar-runway/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 new Function('require','module','exports',js)(n=>{assert(n in deps,n);return deps[n];},m,m.exports);
 const req=body=>({headers:new Map([['x-bia-code','TEST'],['origin','https://app.khalam.app']]),nextUrl:new URL('https://app.khalam.app/api/avatar-runway'),json:async()=>body});
 const open=await m.exports.POST(req({action:'ouvrir',conversation:true}));
 assert.equal(open.status,409);assert.equal(ouvertures,0);
 const explicit=await m.exports.POST(req({action:'ouvrir',conversation:true,mode:'runway-explicite'}));assert.equal(explicit.status,200);assert.equal(ouvertures,1);
 const close=await m.exports.POST(req({action:'fermer',session:'existing'}));assert.equal(close.status,200);assert.equal(fermetures,1);
 const state=await m.exports.GET(req({}));assert.equal(state.body.avatar_conversation,true);assert.equal(state.body.selection_explicite_requise,true);assert.equal(state.body.animation_locale,true);
});
