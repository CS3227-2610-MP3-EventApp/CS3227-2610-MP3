"""Rename only exact known local helper titles; no deletion or arbitrary title filtering."""
import argparse
import os
from pathlib import Path
import sys
ROOT=Path(__file__).resolve().parents[1]
os.chdir(ROOT/"backend");sys.path.insert(0,str(ROOT/"backend"))
from app.database import engine
from app.settings import Settings
from sqlalchemy import text
from sqlalchemy.engine import make_url
mapping={"Invented F06 smoke event":"Singapore Makers Market 2027","Invented Phase 5 check":"Community Arts and Crafts Fair 2027","Manual Test Event":"Singapore Community Festival 2027","Invented Preparation Test":"Singapore Design and Makers Fair 2027"}
parser=argparse.ArgumentParser(description=__doc__);parser.add_argument("--apply",action="store_true");args=parser.parse_args()
s=Settings();url=make_url(s.database_url)
if s.environment not in {"development","test"} or url.host not in {"localhost","127.0.0.1"}: raise SystemExit("Only explicitly local development/test databases are permitted")
with engine.begin() as db:
    count=0
    for old,new in mapping.items():
        rows=db.execute(text("SELECT id FROM events WHERE title=:title ORDER BY id"),{"title":old}).all()
        for (identifier,) in rows:
            print(f"{identifier}: {old} -> {new}");count+=1
            if args.apply: db.execute(text("UPDATE events SET title=:new, revision=revision+1 WHERE id=:id AND title=:old"),{"new":new,"id":identifier,"old":old})
    print(("Renamed" if args.apply else "Dry run; would rename"),count,"events; IDs and associated records preserved")
