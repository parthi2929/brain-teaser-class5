// Read completed and partial work independently of the coach's last submitted step.
const fs=require('fs'), path=require('path'), vm=require('vm'), assert=require('assert');
const ctx={}; vm.createContext(ctx);
for(const file of ['longdiv','division-coach','division-review']) vm.runInContext(fs.readFileSync(path.join(__dirname,'../public/js/'+file+'.js'),'utf8'),ctx);
const L=ctx.LongDiv.build(498,8);
const rows=(list)=>list.map(([row,raw,col=2],order)=>({row,order,cells:[...raw].map((value,i)=>({id:row*20+col+i,row,col:col+i,value}))}));
const review=(list,bindings)=>ctx.DivisionReview.review(L,rows(list),{bindings});
const wrong=review([[0,'64'],[2,'48'],[3,'18',3],[4,'16',3],[5,'2',4]]);
assert.strictEqual(wrong.next,4);
assert.deepStrictEqual(Array.from(wrong.error.ids),[3]);
assert.deepStrictEqual(Array.from(wrong.accepted,a=>a.index),[0,1,2,3]);
assert(!wrong.dependent.includes(2),'correct first quotient digit was marked dependent');
assert(wrong.dependent.includes(83)&&wrong.dependent.includes(104),'dependent working not marked');
assert.deepStrictEqual(Array.from(wrong.accepted[3].contextIds),[63,64]);
const bindings=new Map(wrong.accepted.map(a=>[a.index,a]));
const correct=review([[0,'62'],[2,'48'],[3,'18',3],[4,'16',3],[5,'2',4]],bindings);
assert.strictEqual(correct.complete,true);
assert.strictEqual(correct.error,null);
assert.strictEqual(correct.accepted.length,7);
const partial=review([[0,'6'],[2,'48']]);
assert.strictEqual(partial.next,2);
assert.strictEqual(partial.missing,true);
assert.strictEqual(partial.error,null);
const firstBad=review([[0,'62'],[2,'47'],[3,'18',3],[4,'16',3],[5,'2',4]],new Map(correct.accepted.map(a=>[a.index,a])));
assert.strictEqual(firstBad.next,1);
assert.deepStrictEqual(Array.from(firstBad.error.ids),[43]);
const stillBad=review([[0,'62'],[2,'48'],[3,'18',3],[4,'32',3],[5,'2',4]],bindings);
assert.strictEqual(stillBad.next,5);
assert.strictEqual(stillBad.error.phase,'multiply');
const separate=review([[0,'62'],[2,'48'],[3,'1',3],[4,'18',3],[5,'16',3],[6,'2',4]]);
assert.strictEqual(separate.complete,true,'separate subtraction and brought-down partial failed');
const free=review([[7,'62',0],[0,'48',4],[6,'1',0],[5,'8',7],[3,'16',1],[4,'2',5]]);
assert.strictEqual(free.complete,true,'arbitrary rows and columns failed');
const splitQ=review([[7,'6',0],[0,'48',4],[6,'1',0],[5,'8',7],[2,'2',1],[3,'16',1],[4,'2',5]]);
assert.strictEqual(splitQ.complete,true,'separate quotient cells failed');
assert.strictEqual(review([[7,'6',0],[0,'48',4],[6,'1',0],[5,'8',7],[2,'2',1],[3,'16',1],[4,'2',5]],new Map(splitQ.accepted.map(a=>[a.index,a]))).complete,true);
assert.strictEqual(review([[0,'620'],[2,'48'],[3,'18',3],[4,'16',3],[5,'2',4]]).complete,false,'extra quotient digit accepted');
// Completion uses the answer the child wrote, with an independent arithmetic check.
const completeCells=new Map(rows([[0,'62'],[2,'48'],[3,'18',3],[4,'16',3],[5,'2',4]]).flatMap(t=>t.cells.map(c=>[c.id,c.value])));
assert.deepStrictEqual(JSON.parse(JSON.stringify(ctx.DivisionReview.answer(L,correct,id=>completeCells.get(id)))),{q:62,r:2});
assert.strictEqual(ctx.DivisionReview.answer(L,wrong,id=>completeCells.get(id)),null);
assert.strictEqual(ctx.DivisionReview.answer(L,partial,id=>completeCells.get(id)),null);
completeCells.set(3,'4');
assert.strictEqual(ctx.DivisionReview.answer(L,correct,id=>completeCells.get(id)),null,'stale completed answer accepted');
for (let n=100;n<=999;n+=17) for (let d=2;d<=19;d++) {
  const lesson=ctx.LongDiv.build(n,d), lines=[[0,String(lesson.q)]];
  let row=2;
  for(let i=0;i<lesson.steps.length;i++) {
    const step=lesson.steps[i];
    if(step.phase==='quotient') continue;
    if(step.phase==='subtract'&&lesson.steps[i+1]?.phase==='down') { lines.push([row++,step.answer+lesson.steps[++i].answer]); }
    else lines.push([row++,step.answer]);
  }
  assert.strictEqual(ctx.DivisionReview.review(lesson,rows(lines)).complete,true,`generated complete sheet ${n}/${d}`);
}
console.log('ALL PASSED: complete sheets, first bad digit, dependent steps, corrections, combined rows, partial work, and flexible placement.');
