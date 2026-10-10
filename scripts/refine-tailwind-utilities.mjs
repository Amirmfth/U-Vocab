import fs from "node:fs";
import path from "node:path";
const root=process.cwd();
const cssPath=path.join(root,"src/app/tailwind-named-utilities.css");
let css=fs.readFileSync(cssPath,"utf8");
const slug=(v,max=64)=>v
 .replace(/var\(--([^)]+)\)/g,"$1")
 .replace(/rgba?\(/g,"rgb-").replace(/hsla?\(/g,"hsl-")
 .replace(/#/g,"hex-").replace(/%/g,"pct")
 .replace(/\./g,"p").replace(/[^a-zA-Z0-9-]+/g,"-")
 .replace(/-+/g,"-").replace(/^-|-$/g,"")
 .toLowerCase().slice(0,max).replace(/-$/,"");
const replacements=new Map();
const taken=new Set();
function assign(old,desired){
 let next=desired, suffix=2;
 while(taken.has(next))next=desired+"-"+suffix++;
 taken.add(next);
 if(next!==old)replacements.set(old,next);
 return next;
}
css=css.replace(/@custom-variant (uv-v[a-f0-9]+) \(([^;]+)\);/g,(full,old,selector)=>{
 const clean=selector
 .replace(/^&\s*/,"").replace(/\s*\*\s*/g," descendants ")
 .replace(/:([a-z-]+)\(/g,"-$1-")
 .replace(/[.\[\]#>~+=:"']/g,"-")
 .replace(/\s+/g,"-");
 const next=assign(old,"in-"+slug(clean,55));
 return "@custom-variant "+next+" ("+selector+");";
});
css=css.replace(/@utility (uv-[a-z0-9-]+) \{ ([a-z-]+): ([^;]+); \}/g,(full,old,property,value)=>{
 const prefix=property.startsWith("font")?"font":property.startsWith("border")?"border":property.startsWith("background")?"bg":property;
 const next=assign(old,slug(prefix+"-"+value,63));
 return "@utility "+next+" { "+property+": "+value+"; }";
});
css=css.replace(/(--(?:color|spacing|radius|text)-)(uv-[a-z0-9-]+): ([^;]+);/g,(full,prefix,old,value)=>{
 let next;
 if(prefix==="--color-")next=assign(old,"exact-"+slug(value,38));
 else if(prefix==="--spacing-")next=assign(old,"exact-"+slug(value,32));
 else if(prefix==="--radius-")next=assign(old,"exact-"+slug(value,32));
 else next=assign(old,"exact-"+slug(value,32));
 return prefix+next+": "+value+";";
});
const variants=new Set();
const minmax=/\buv-(min|max)(\d{2,4})(?=:)/g;
const tsxFiles=[];
function walk(dir){
 for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
  const full=path.join(dir,entry.name);
  if(entry.isDirectory())walk(full);
  else if(/\.(tsx|jsx)$/.test(full))tsxFiles.push(full);
 }
}
walk(path.join(root,"src"));
let changed=0;
for(const file of tsxFiles){
 let source=fs.readFileSync(file,"utf8"),next=source;
 for(const [old,rename] of replacements){
  const pattern=new RegExp("(?<![A-Za-z0-9_-])"+old+"(?![A-Za-z0-9_-])","g");
  next=next.replace(pattern,rename);
 }
 next=next.replace(minmax,(_full,mode,px)=>{
   const key="uv-"+mode+px;
   variants.add(key);
   return key;
 });
 if(next!==source){fs.writeFileSync(file,next);changed++;}
}
const breakpoints=[...variants].map(v=>{
 const m=/uv-(min|max)(\d+)/.exec(v);
 return "@custom-variant "+v+" (@media ("+(m[1]==="min"?"min-width":"max-width")+": "+m[2]+"px));";
});
css=breakpoints.join("\n")+"\n\n"+css;
fs.writeFileSync(cssPath,css);
console.log(JSON.stringify({renamed:replacements.size,filesChanged:changed,breakpoints:breakpoints.length,generatedCssLines:css.split("\n").length},null,2));
