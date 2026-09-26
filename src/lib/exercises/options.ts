export function uniqueOptions(values:Array<string|null|undefined>){
  return Array.from(new Set(values.map((value)=>value?.trim()).filter((value):value is string=>Boolean(value))));
}

function hash(value:string){
  return Array.from(value).reduce((sum,char,index)=>sum+((char.codePointAt(0)??0)*(index+1)),0);
}

export function deterministicChoiceOptions(
  expected:string,
  pool:Array<string|null|undefined>,
  limit=4,
){
  const distractors=uniqueOptions(pool).filter((value)=>value!==expected);
  if(!distractors.length) return [expected];

  const start=hash(expected)%distractors.length;
  const rotated=[...distractors.slice(start),...distractors.slice(0,start)];
  const selected=[expected,...rotated.slice(0,Math.max(0,limit-1))];

  if(selected.length<2) return selected;
  const answerOffset=hash(expected+"answer")%selected.length;
  return [...selected.slice(answerOffset),...selected.slice(0,answerOffset)];
}
