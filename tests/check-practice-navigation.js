// Displaying, skipping and refreshing a question never grades an answer.
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const ctx={};vm.createContext(ctx);
for(const file of ['js/engine.js','js/scheduler.js','practice/division.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../public',file),'utf8'),ctx);
const S=ctx.Scheduler,groups=ctx.Engine.PRACTICE[0].types[0].groups(S.DEFAULTS).map(g=>g.map(([n,d])=>n+'/'+d));
let seed=41;const rng=()=>((seed=seed*48271%2147483647)/2147483647);
let state=S.fresh();state.wrong['498/8']={due:0,need:2,got:0};
const first=S.next(state,groups,{fresh:true},rng);
assert.notStrictEqual(first.key,'498/8','fresh opening pinned to queued review');
S.shown(state,first.key,{});
let previous=first.key;const seen=[];
for(let i=0;i<80;i++){
  state=JSON.parse(JSON.stringify(state));
  const picked=S.next(state,groups,{fresh:true},rng);
  assert.notStrictEqual(picked.key,previous,'refresh repeated previous question');
  assert(!seen.includes(picked.key),'refresh ignored shown-question window');
  const [n,d]=picked.key.split('/').map(Number);
  assert(n>=100&&n<=999&&d>=2&&d<=9,'difficulty changed');
  S.shown(state,picked.key,{});seen.push(picked.key);previous=picked.key;
}
assert.strictEqual(state.count,0,'skipping incremented graded attempts');
assert.strictEqual(state.wrong['498/8'].got,0,'skipping counted as correct');
assert.strictEqual(Object.keys(state.wrong).length,1,'skipping created wrong attempts');
state=S.fresh();state.wrong['498/8']={due:0,need:2,got:0};
let repeated=0,lastAt=-Infinity;
for(let i=0;i<40;i++){
  const picked=S.next(state,groups,{},rng);
  if(picked.key==='498/8'){assert(i-lastAt-1>=S.DEFAULTS.gapMin,'queued review repeated too soon');lastAt=i;repeated++;}
  assert.notStrictEqual(picked.key,state.lastShown,'Next repeated the same question');
  S.shown(state,picked.key,{});
}
assert(repeated>1,'queued review was lost');
const tiny=[['100/2','102/2']];state=S.fresh();
for(let i=0;i<10;i++){const picked=S.next(state,tiny,{noRepeat:0},()=>0);assert.notStrictEqual(picked.key,state.lastShown);S.shown(state,picked.key,{noRepeat:0});}
state=S.fresh();state.wrong['498/88']={due:0,need:2,got:0};
assert.notStrictEqual(S.next(state,groups,{},rng).key,'498/88','old review changed divisor difficulty');
console.log('ALL PASSED: fresh refreshes, Next, persisted shown history, unchanged grading, review spacing, and difficulty.');
