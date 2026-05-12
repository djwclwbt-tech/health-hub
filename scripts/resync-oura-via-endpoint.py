#!/usr/bin/env python3
import json, os, urllib.parse, urllib.request
from datetime import date, datetime, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ENV = {}
for line in (ROOT / '.env.local').read_text().splitlines():
    line=line.strip()
    if not line or line.startswith('#') or '=' not in line: continue
    k,v=line.split('=',1); v=v.strip().strip('"').strip("'"); ENV[k.strip()]=v
SB_URL = ENV.get('SUPABASE_URL','https://wszumxewqxkggtevfubb.supabase.co').rstrip('/')
SB_KEY = ENV.get('SUPABASE_ANON_KEY') or ENV.get('SUPABASE_KEY')
BASE = ENV.get('HEALTH_HUB_URL','https://health-hub-topaz-sigma.vercel.app').rstrip('/')
HEAD = {'apikey':SB_KEY,'Authorization':f'Bearer {SB_KEY}','Content-Type':'application/json'}
START = os.environ.get('OURA_RESYNC_START','2026-02-01')
END = os.environ.get('OURA_RESYNC_END', date.today().isoformat())

def req(method, url, body=None, headers=None):
    data = None if body is None else json.dumps(body).encode()
    r = urllib.request.Request(url, data=data, method=method, headers=headers or HEAD)
    with urllib.request.urlopen(r, timeout=60) as resp:
        raw=resp.read().decode()
        return json.loads(raw) if raw else None

def add_days(s, n):
    d=datetime.strptime(s,'%Y-%m-%d').date()+timedelta(days=n)
    return d.isoformat()

def min_day(a,b): return a if a <= b else b

backup_dir=ROOT/'backups'; backup_dir.mkdir(exist_ok=True)
existing=req('GET', f"{SB_URL}/rest/v1/recovery?select=*&order=date.asc")
backup=backup_dir/f"recovery-before-oura-endpoint-{datetime.utcnow().isoformat().replace(':','-').replace('.','-')}.json"
backup.write_text(json.dumps(existing, indent=2))

# Clear rebuilt range so stale Whoop/manual fields and non-Oura sources are removed.
req('DELETE', f"{SB_URL}/rest/v1/recovery?date=gte.{urllib.parse.quote(START)}&date=lte.{urllib.parse.quote(END)}", headers={**HEAD,'Prefer':''})

synced=[]
s=START
while s <= END:
    e=min_day(add_days(s,29),END)
    url=f"{BASE}/api/oura-sync?start={urllib.parse.quote(s)}&end={urllib.parse.quote(e)}"
    out=req('GET', url, headers={})
    synced.extend(out.get('synced',[]))
    s=add_days(e,1)

after=req('GET', f"{SB_URL}/rest/v1/recovery?select=date,recovery_score,hrv,rhr,sleep_hours,strain,source&date=gte.{urllib.parse.quote(START)}&date=lte.{urllib.parse.quote(END)}&order=date.asc")
counts={}
for r in after: counts[r.get('source') or 'null']=counts.get(r.get('source') or 'null',0)+1
print(json.dumps({'ok':True,'range':{'start':START,'end':END},'backup':str(backup),'endpointSynced':len(synced),'rowsAfter':len(after),'sourceCounts':counts,'first':after[0] if after else None,'last':after[-1] if after else None}, indent=2))
