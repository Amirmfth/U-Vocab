import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
const root=process.cwd();
const old=execFileSync("git",["show","4115281b9dcd9dd0519e12c0f52950824da8212d:src/app/tailwind-named-utilities.css"],{encoding:"utf8"});
const css=fs.readFileSync(path.join(root,"src/app/tailwind-named-utilities.css"),"utf8");
function pairs(prefix){
 const match=new RegExp("  --"+prefix+"-([^:]+): ([^;]+);","g");
 const a=[...old.matchAll(match)].map(x=>({name:x[1],value:x[2]}));
 const b=new Map([...css.matchAll(match)].map(x=>[x[2],x[1]]));
 return a.flatMap(x=>{const to=b.get(x.value);return to&&to!==x.name?[[x.name,to]]:[];});
}
const map=[
 ...pairs("text").map(([a,b])=>["text-"+a,"text-"+b]),
 ...pairs("radius").flatMap(([a,b])=>[
 ["rounded-"+a,"rounded-"+b],["rounded-tl-"+a,"rounded-tl-"+b],
 ["rounded-tr-"+a,"rounded-tr-"+b],["rounded-bl-"+a,"rounded-bl-"+b],
 ["rounded-br-"+a,"rounded-br-"+b]
 ])
];
let updated=0;
function walk(dir){
 for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
  const full=path.join(dir,entry.name);
  if(entry.isDirectory())walk(full);
  else if(/\.(tsx|jsx)$/.test(full)){
    let c=fs.readFileSync(full,"utf8"),next=c;
    for(const [from,to] of map){
      const re=new RegExp("(?<![A-Za-z0-9_-])"+from+"(?![A-Za-z0-9_-])","g");
      next=next.replace(re,to);
    }
    if(c!==next){fs.writeFileSync(full,next);updated++;}
  }
 }
}
walk(path.join(root,"src"));
console.log(JSON.stringify({themePairs:map.length,filesUpdated:updated},null,2));
