#!/usr/bin/env python3
"""BIA experiment: read-only inventory of teacher, and curate Chatterbox teacher audio.
No GPU calls, no process restarts, no reads of API keys and no production changes.
Run on a separate H200 after copying approved source text and teacher-generated WAVs.
"""
import argparse, hashlib, json, wave, pathlib, collections
ROOT=pathlib.Path("/workspace/chatterbox-didi-913-2026-10-05")
CHECKPOINT=pathlib.Path("/tmp/khalam-models/20261009/prepared/voice-training/khalam-voice-step4472.safetensors")
def sha256(path):
    h=hashlib.sha256()
    with path.open("rb") as f:
        for block in iter(lambda:f.read(1048576),b""): h.update(block)
    return h.hexdigest()
def inventory():
    cfg=ROOT/"chatterbox-voice-config.json"
    conf=json.loads(cfg.read_text()) if cfg.is_file() else {}
    wanted=conf.get("female_condition_file") or str(ROOT/"mac-offline-runtime-step220/voices/female-didi_0132.pt")
    reference=pathlib.Path(wanted)
    if not reference.is_absolute():reference=ROOT/reference
    paths={"teacher_code":ROOT/"serve_chatterbox_bia.py","wolof_step4472":CHECKPOINT,"female_condition":reference}
    print(json.dumps({"config_exists":cfg.is_file(),"female_reference_id":conf.get("female_reference_id","requires checking running-process environment"),"note":"Production process may override reference via KHALAM_FEMALE_REFERENCE_ID. Verify before synthesis.","files":{k:{"path":str(p),"exists":p.is_file(),"bytes":p.stat().st_size if p.is_file() else None,"sha256":sha256(p) if p.is_file() else None} for k,p in paths.items()}},ensure_ascii=False,indent=2))
def prepare(args):
    out=pathlib.Path(args.out)
    if out.resolve()==ROOT.resolve() or ROOT.resolve() in out.resolve().parents:raise SystemExit("Refusing output inside teacher directory")
    if out.exists() and any(out.iterdir()):raise SystemExit("Output directory must be empty")
    out.mkdir(parents=True,exist_ok=True)
    counters=collections.Counter();seen=set();parts={"train":[],"validation":[],"test":[]}
    with open(args.texts,encoding="utf-8") as f:
        for lineno,line in enumerate(f,1):
            if not line.strip():continue
            row=json.loads(line)
            if row.get("approved") is not True: counters["unapproved"]+=1;continue
            txt=row.get("text","").strip()
            if not txt or txt in seen: counters["empty_or_duplicate"]+=1;continue
            seen.add(txt)
            ident=str(row.get("id","")).strip()
            if not ident or "/" in ident or ".." in ident: counters["bad_id"]+=1;continue
            wav=(pathlib.Path(args.wav_dir)/(ident+".wav"))
            if not wav.is_file():counters["missing_audio"]+=1;continue
            try:
                with wave.open(str(wav),"rb") as w:
                    length=w.getnframes()/w.getframerate()
                    if w.getnchannels()!=1 or length<0.35 or length>35: raise ValueError()
                    sr=w.getframerate()
            except Exception:
                counters["invalid_audio"]+=1;continue
            if row.get("audio_reviewed") is not True: counters["unreviewed_audio"]+=1;continue
            label=row.get("language","unknown")
            digest=hashlib.sha256(ident.encode()).digest()[0]
            split="test" if digest<13 else "validation" if digest<26 else "train"
            parts[split].append({"id":ident,"text":txt,"audio_path":str(wav.resolve()),"language":label,"duration_seconds":round(length,3),"sample_rate":sr,"sha256":sha256(wav),"teacher":"Chatterbox Khalam Voice; verify exact reference/checkpoint","source_id":row.get("source_id")})
            counters[split]+=1
    for split,rows in parts.items():
        with (out/(split+".jsonl")).open("w",encoding="utf-8") as f:
            for row in rows:f.write(json.dumps(row,ensure_ascii=False)+"\n")
    print(json.dumps({"summary":dict(counters),"output":str(out),"warning":"No source audio automatically trusted. Outputs are manifests, not trained Piper/Kokoro models."},ensure_ascii=False,indent=2))
if __name__=="__main__":
    p=argparse.ArgumentParser()
    sp=p.add_subparsers(dest="cmd",required=True)
    sp.add_parser("inventory")
    q=sp.add_parser("prepare")
    q.add_argument("--texts",required=True,help="JSONL with id, text, approved=true, audio_reviewed=true")
    q.add_argument("--wav-dir",required=True,help="Teacher-generated ID.wav files")
    q.add_argument("--out",required=True,help="New empty output directory")
    a=p.parse_args()
    inventory() if a.cmd=="inventory" else prepare(a)
