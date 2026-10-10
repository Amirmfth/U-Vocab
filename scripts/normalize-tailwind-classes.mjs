import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import { createHash } from "node:crypto";

const root = process.cwd();
const src = path.join(root, "src");
const hash = (text) => createHash("sha1").update(text).digest("hex").slice(0, 10);
const all = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((item) => {
  const full = path.join(dir, item.name);
  return item.isDirectory() ? all(full) : [full];
});
const files = all(src).filter((file) => /\.(jsx|tsx)$/.test(file));
const customUtilities = new Map();
const customVariants = new Map();
const colors = new Map();
const spacing = new Map();
const fontSizes = new Map();
const shadows = new Map();
const radius = new Map();
const gaps = new Map();
let original = 0, builtin = 0, generated = 0, variants = 0;
const normalize = (text) => text.replace(/_/g, " ").replace(/\\\\/g,"\\");
const simple = (prop, value) => {
  const names = {
    display: { flex:"flex", grid:"grid", block:"block", "inline-flex":"inline-flex",
      inline:"inline", "inline-block":"inline-block", none:"hidden", contents:"contents" },
    position: {relative:"relative",absolute:"absolute",fixed:"fixed",sticky:"sticky",static:"static"},
    "flex-direction": {row:"flex-row",column:"flex-col","row-reverse":"flex-row-reverse","column-reverse":"flex-col-reverse"},
    "flex-wrap": {wrap:"flex-wrap",nowrap:"flex-nowrap","wrap-reverse":"flex-wrap-reverse"},
    "align-items": {center:"items-center",start:"items-start",end:"items-end",
      "flex-start":"items-start","flex-end":"items-end",stretch:"items-stretch",baseline:"items-baseline"},
    "align-self": {center:"self-center",start:"self-start",end:"self-end",
      "flex-start":"self-start","flex-end":"self-end",stretch:"self-stretch"},
    "justify-content": {center:"justify-center",start:"justify-start",end:"justify-end",
      "flex-start":"justify-start","flex-end":"justify-end","space-between":"justify-between",
      "space-around":"justify-around","space-evenly":"justify-evenly"},
    "text-align": {center:"text-center",left:"text-left",right:"text-right",start:"text-start",end:"text-end",justify:"text-justify"},
    "text-transform": {uppercase:"uppercase",lowercase:"lowercase",capitalize:"capitalize",none:"normal-case"},
    "text-decoration": {none:"no-underline",underline:"underline", "line-through":"line-through"},
    "font-style": {italic:"italic",normal:"not-italic"},
    overflow: {hidden:"overflow-hidden",auto:"overflow-auto",visible:"overflow-visible",scroll:"overflow-scroll"},
    "overflow-x": {hidden:"overflow-x-hidden",auto:"overflow-x-auto",visible:"overflow-x-visible",scroll:"overflow-x-scroll"},
    "overflow-y": {hidden:"overflow-y-hidden",auto:"overflow-y-auto",visible:"overflow-y-visible",scroll:"overflow-y-scroll"},
    "white-space": {nowrap:"whitespace-nowrap",normal:"whitespace-normal",pre:"whitespace-pre","pre-wrap":"whitespace-pre-wrap"},
    "pointer-events": {none:"pointer-events-none",auto:"pointer-events-auto"},
    "cursor": {pointer:"cursor-pointer",default:"cursor-default",wait:"cursor-wait",grab:"cursor-grab",grabbing:"cursor-grabbing","not-allowed":"cursor-not-allowed",text:"cursor-text",move:"cursor-move"},
    visibility: {hidden:"invisible",visible:"visible"},
    "object-fit": {cover:"object-cover",contain:"object-contain",fill:"object-fill",none:"object-none"},
    isolation: {isolate:"isolate",auto:"isolation-auto"},
    "box-sizing": {"border-box":"box-border","content-box":"box-content"},
    "flex-grow": {"1":"grow","0":"grow-0"},
    "flex-shrink":{"1":"shrink","0":"shrink-0"},
    "width": {auto:"w-auto", "100%":"w-full", fit:"w-fit","fit-content":"w-fit",
      "max-content":"w-max","min-content":"w-min","100vw":"w-screen"},
    "height": {auto:"h-auto","100%":"h-full","100vh":"h-screen","100dvh":"h-dvh",
      "fit-content":"h-fit","max-content":"h-max"},
    "min-width": {"0":"min-w-0","100%":"min-w-full",auto:"min-w-auto"},
    "min-height": {"0":"min-h-0","100%":"min-h-full","100vh":"min-h-screen","100dvh":"min-h-dvh"},
    "max-width": {none:"max-w-none","100%":"max-w-full"},
    "max-height": {none:"max-h-none","100%":"max-h-full"},
    "border-style": {solid:"border-solid",dashed:"border-dashed",dotted:"border-dotted",none:"border-none"},
    "background": {transparent:"bg-transparent",none:"bg-none"},
    "background-color": {transparent:"bg-transparent",inherit:"bg-inherit",currentColor:"bg-current"},
    color: {inherit:"text-inherit",transparent:"text-transparent",currentColor:"text-current"},
    "font-family": {inherit:"font-inherit"},
    "font-weight": {normal:"font-normal",bold:"font-bold",medium:"font-medium",semibold:"font-semibold",light:"font-light"},
    "line-height": {normal:"leading-normal",none:"leading-none"},
    "z-index": {auto:"z-auto"},
    "user-select": {none:"select-none",text:"select-text",all:"select-all",auto:"select-auto"},
    "appearance": {none:"appearance-none",auto:"appearance-auto"},
    "resize": {none:"resize-none",both:"resize",vertical:"resize-y",horizontal:"resize-x"},
    "list-style": {none:"list-none"},
    "outline": {none:"outline-none"},
    "outline-style": {none:"outline-hidden"},
    "overscroll-behavior": {contain:"overscroll-contain",none:"overscroll-none",auto:"overscroll-auto"},
    "touch-action": {none:"touch-none",panX:"touch-pan-x",panY:"touch-pan-y",manipulation:"touch-manipulation"},
  };
  return names[prop]?.[value] ?? null;
};
const spacingProps = {
  gap:"gap", "row-gap":"gap-y","column-gap":"gap-x",
  padding:"p","padding-top":"pt","padding-right":"pr","padding-bottom":"pb","padding-left":"pl",
  "padding-inline":"px","padding-block":"py","padding-inline-start":"ps","padding-inline-end":"pe",
  margin:"m","margin-top":"mt","margin-right":"mr","margin-bottom":"mb","margin-left":"ml",
  "margin-inline":"mx","margin-block":"my","margin-inline-start":"ms","margin-inline-end":"me",
  top:"top",right:"right",bottom:"bottom",left:"left",inset:"inset",
  "inset-inline":"inset-x","inset-block":"inset-y",
  width:"w",height:"h","min-width":"min-w","min-height":"min-h",
  "max-width":"max-w","max-height":"max-h",
  "border-radius":"rounded","border-top-left-radius":"rounded-tl",
  "border-top-right-radius":"rounded-tr","border-bottom-left-radius":"rounded-bl",
  "border-bottom-right-radius":"rounded-br",
};
const directColors = {
  "var(--text)":"uv-text","var(--text-soft)":"uv-text-soft",
  "var(--text-muted)":"uv-text-muted", "var(--primary)":"uv-primary",
  "var(--primary-strong)":"uv-primary-strong",
  "var(--surface)":"uv-surface","var(--surface-raised)":"uv-surface-raised",
  "var(--surface-soft)":"uv-surface-soft","var(--bg)":"uv-bg",
  "var(--border)":"uv-border","var(--border-strong)":"uv-border-strong",
  "var(--success)":"uv-success","var(--danger)":"uv-danger","var(--warning)":"uv-warning",
};
const colorProps = {
  color:"text","background-color":"bg",background:"bg",
  "border-color":"border","border-top-color":"border-t",
  "border-right-color":"border-r","border-bottom-color":"border-b",
  "border-left-color":"border-l",
  "outline-color":"outline","text-decoration-color":"decoration",
  "fill":"fill","stroke":"stroke",
};
function colorName(value) {
  if (directColors[value]) return directColors[value];
  if (value === "transparent") return "transparent";
  if (value === "currentColor") return "current";
  const key = "uv-c" + hash(value);
  colors.set(key, value);
  return key;
}
const spacingPattern = /^(-?)(\d+(?:\.\d+)?)px$/;
function unitClass(prefix, value, property) {
  if (value === "0" || value === "0px") return prefix + "-0";
  if (value === "auto") return prefix + "-auto";
  if (value === "none" && (property === "max-width" || property === "max-height")) return prefix + "-none";
  if (value === "100%" && /^(width|height|min-width|min-height|max-width|max-height)$/.test(property)) return prefix+"-full";
  const m = spacingPattern.exec(value);
  if (!m) return null;
  const px = Number(m[2]);
  const quarter = px / 4;
  const negative = m[1] === "-" ? "-" : "";
  if (!Number.isFinite(quarter)) return null;
  if (Number.isInteger(quarter*4) && px <= 600) {
    const token = Number(quarter.toFixed(3)).toString();
    return negative + prefix + "-" + token;
  }
  const name = "uv-" + hash(value);
  spacing.set(name, value);
  return negative + prefix + "-" + name;
}
function generatedUtility(prop, value) {
  const key = "uv-" + prop.replace(/[^a-z0-9-]/gi,"-") + "-" + hash(value);
  customUtilities.set(key, {prop,value});
  generated++;
  return key;
}
function getUtility(prop, value) {
  value = normalize(value);
  if (prop === "border" && value === "0") return "border-0";
  const match = simple(prop,value);
  if (match) {builtin++;return match;}
  if (spacingProps[prop] && spacingProps[prop] !== "rounded" && !spacingProps[prop].startsWith("rounded")) {
    const util = unitClass(spacingProps[prop],value,prop);
    if (util) {builtin++;return util;}
  }
  if (prop === "border-radius" || prop.endsWith("-radius")) {
    if (value === "0"||value === "0px") return spacingProps[prop]+"-none";
    const key = "uv-r"+hash(value);
    radius.set(key,value);
    builtin++;return spacingProps[prop]+"-"+key;
  }
  if (colorProps[prop] && /^(#|rgb\(|rgba\(|hsl\(|var\(|transparent$|currentColor$)/.test(value)) {
    builtin++;return colorProps[prop]+"-"+colorName(value);
  }
  if (prop === "font-size") {
    const key="uv-f"+hash(value);fontSizes.set(key,value);
    builtin++;return "text-"+key;
  }
  if (prop === "opacity" && !Number.isNaN(Number(value))) {
    const number = Number(value)*100;
    if (Number.isInteger(number) && number>=0&&number<=100) {builtin++;return "opacity-"+number;}
  }
  if (prop === "font-weight" && !Number.isNaN(Number(value))) {
    const n = Number(value);
    if ([100,200,300,400,500,600,700,800,900].includes(n)) return "font-"+({100:"thin",200:"extralight",300:"light",400:"normal",500:"medium",600:"semibold",700:"bold",800:"extrabold",900:"black"})[n];
    const key="uv-weight-"+n;customUtilities.set(key,{prop,value});return key;
  }
  return generatedUtility(prop,value);
}
const builtinVariants = {
  "&:hover":"hover","&:focus":"focus","&:focus-visible":"focus-visible",
  "&:active":"active","&:disabled":"disabled","&:checked":"checked",
  "&:first-child":"first","&:last-child":"last","&:empty":"empty",
  "&::before":"before","&::after":"after",
};
function mapVariant(original) {
  if(builtinVariants[original]) return builtinVariants[original];
  const name="uv-v"+hash(original);
  customVariants.set(name,original.replace(/_/g," "));
  variants++;return name;
}
function tokenize(text) {
  // CSS arbitrary-value tokens in the old codemod use underscores, never whitespace.
  return text.split(/(\s+)/g);
}
function translateToken(token) {
  if(!token.includes("[")) return token;
  const sections=[];let current="",depth=0;
  for(let i=0;i<token.length;i++){
    const char=token[i];
    if(char==="[") depth++;
    if(char==="]") depth--;
    if(char===":"&&depth===0){sections.push(current);current="";}else current+=char;
  }
  sections.push(current);
  const last=sections.pop();
  if(!last?.startsWith("[")||!last.endsWith("]"))return token;
  const declaration=last.slice(1,-1);
  const colon=declaration.indexOf(":");
  if(colon<1)return token;
  const prop=declaration.slice(0,colon);
  const value=declaration.slice(colon+1);
  if(!/^[a-z-]+$/.test(prop)) return token;
  original++;
  const mapped=sections.map(section=>{
    let m=/^(min|max)-\[(\d+)px\]$/.exec(section);
    if(m)return (m[1]==="min"?"uv-min":"uv-max")+m[2];
    if(section.startsWith("[")&&section.endsWith("]"))return mapVariant(section.slice(1,-1));
    return section;
  });
  let util=getUtility(prop,value);
  if(util.includes(":")||util.includes("["))throw Error("Nonstandard resulting utility "+util);
  if(token.endsWith("]!")) util+="!";
  return [...mapped,util].join(":");
}
function replaceClassText(text) {
  return tokenize(text).map(part=>/^\s+$/.test(part)?part:translateToken(part)).join("");
}
let filesChanged=0;
for (const file of files) {
 const source=fs.readFileSync(file,"utf8");
 const sf=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 const updates=[];
 function literal(node) {
   const start=node.getStart(sf)+1,end=node.getEnd()-1;
   const value=source.slice(start,end);
   const replacement=replaceClassText(value);
   if(replacement!==value) updates.push({start,end,replacement});
 }
 function traverse(node) {
   if(ts.isJsxAttribute(node)&&node.name.text==="className"&&node.initializer){
     const init=node.initializer;
     if(ts.isStringLiteral(init))literal(init);
     else if(ts.isJsxExpression(init)&&init.expression) visitExpression(init.expression);
   }else ts.forEachChild(node,traverse);
 }
 function visitExpression(node){
   if(ts.isStringLiteral(node)||ts.isNoSubstitutionTemplateLiteral(node))literal(node);
   else if(ts.isTemplateExpression(node)) {
     const head=node.head;
     const start=head.getStart(sf)+1,end=head.getEnd()-2;
     const replacement=replaceClassText(source.slice(start,end));
     if(replacement!==source.slice(start,end))updates.push({start,end,replacement});
     for(const span of node.templateSpans){
       visitExpression(span.expression);
       const text=span.literal;
       const s=text.getStart(sf)+1,e=text.getEnd()-(ts.isTemplateTail(text)?1:2);
       const current=source.slice(s,e);const next=replaceClassText(current);
       if(next!==current)updates.push({start:s,end:e,replacement:next});
     }
   } else ts.forEachChild(node,visitExpression);
 }
 traverse(sf);
 if(!updates.length)continue;
 let next=source;
 for(const {start,end,replacement} of updates.sort((a,b)=>b.start-a.start)){
   next=next.slice(0,start)+replacement+next.slice(end);
 }
 fs.writeFileSync(file,next);filesChanged++;
}
let css=`/* Named Tailwind theme tokens for exact visual parity. */\n@theme {\n`;
for(const [key,value] of spacing) css+=`  --spacing-${key}: ${value};\n`;
for(const [key,value] of fontSizes) css+=`  --text-${key}: ${value};\n`;
for(const [key,value] of radius) css+=`  --radius-${key}: ${value};\n`;
for(const [key,value] of colors) css+=`  --color-${key}: ${value};\n`;
css+="}\n\n";
for(const [key,value] of customVariants) css+=`@custom-variant ${key} (${value});\n`;
css+="\n";
for(const [key,{prop,value}] of customUtilities) css+=`@utility ${key} { ${prop}: ${value}; }\n`;
const themeFile="src/app/tailwind-named-utilities.css";
fs.writeFileSync(path.join(root,themeFile),css);
const globalsFile=path.join(root,"src/app/globals.css");
let globals=fs.readFileSync(globalsFile,"utf8");
if(!globals.includes('tailwind-named-utilities.css')){
 globals=globals.replace('@import "tailwindcss/utilities.css" layer(utilities);','@import "tailwindcss/utilities.css" layer(utilities);\n@import "./tailwind-named-utilities.css";');
 fs.writeFileSync(globalsFile,globals);
}
const result={filesChanged,originalDeclarations:original,mappedToTailwind:builtin,customUtilities:customUtilities.size,customVariants:customVariants.size,theme:{spacing:spacing.size,fontSizes:fontSizes.size,radius:radius.size,colors:colors.size},cssLines:css.split("\n").length};
console.log(JSON.stringify(result,null,2));
