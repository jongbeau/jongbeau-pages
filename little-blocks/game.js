'use strict';
const COLS=8,ROWS=12,colors=['#79aecb','#f2bd52','#8975dc','#7cae99','#ed8775','#6b86d6','#edaa67'];
const types=['I','O','T','S','Z','J','L'];
const shapes=[[[0,0],[1,0],[2,0],[3,0]],[[0,0],[1,0],[0,1],[1,1]],[[1,0],[0,1],[1,1],[2,1]],[[1,0],[2,0],[0,1],[1,1]],[[0,0],[1,0],[1,1],[2,1]],[[0,0],[0,1],[1,1],[2,1]],[[2,0],[0,1],[1,1],[2,1]]];
let bag=[];
const $=id=>document.getElementById(id);
let grid,active,next,stars=0,playing=false,started=false,muted=true,last=0,celebrationTimer,lockUntil=0,audio;
$('board').style.setProperty('--columns',COLS);
$('board').style.setProperty('--rows',ROWS);
const cells=Array.from({length:COLS*ROWS},()=>{let c=document.createElement('div');c.className='cell';$('board').appendChild(c);return c;});
function makePiece(index){
  const shape=shapes[index].map(p=>[...p]);
  return {type:types[index],shape,color:colors[index],x:Math.floor((COLS-Math.max(...shape.map(([x])=>x))-1)/2),y:0};
}
function piece(){
  if(!bag.length){bag=types.map((_,i)=>i);for(let i=bag.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[bag[i],bag[j]]=[bag[j],bag[i]];}}
  return makePiece(bag.pop());
}
function empty(){return Array.from({length:ROWS},()=>Array(COLS).fill(null));}
function fits(p,x=p.x,y=p.y){return p.shape.every(([dx,dy])=>x+dx>=0&&x+dx<COLS&&y+dy>=0&&y+dy<ROWS&&!grid[y+dy][x+dx]);}
function landing(){let y=active.y;while(fits(active,active.x,y+1))y++;return y;}
function draw(){cells.forEach((c,i)=>{const color=grid[Math.floor(i/COLS)][i%COLS];c.className='cell'+(color?' block':'');if(color)c.style.setProperty('--color',color);});const paint=(y,kind)=>active.shape.forEach(([dx,dy])=>{const c=cells[(y+dy)*COLS+active.x+dx];c.className='cell '+kind;c.style.setProperty('--color',active.color);c.style.setProperty('--ghost',active.color+'20');});paint(landing(),'ghost');paint(active.y,'block active');positionRotate();$('stars').textContent=stars;$('next').replaceChildren(...next.shape.map(([x,y])=>{let b=document.createElement('i');b.style.setProperty('--color',next.color);b.style.gridColumn=x+1;b.style.gridRow=y+1;return b;}));$('next').style.gridTemplateColumns=`repeat(${Math.max(...next.shape.map(([x])=>x))+1},22px)`;}
function positionTarget(id,y){
  const rects=active.shape.map(([dx,dy])=>cells[(y+dy)*COLS+active.x+dx].getBoundingClientRect());
  const origin=$('board').getBoundingClientRect();
  const left=Math.min(...rects.map(r=>r.left)),top=Math.min(...rects.map(r=>r.top));
  const right=Math.max(...rects.map(r=>r.right)),bottom=Math.max(...rects.map(r=>r.bottom));
  Object.assign($(id).style,{left:(left-origin.left-7)+'px',top:(top-origin.top-7)+'px',width:(right-left+14)+'px',height:(bottom-top+14)+'px'});
}
function positionRotate(){
  positionTarget('drop',landing());
  positionTarget('rotate',active.y);
  // Once a piece reaches its target, leave the shape available for dropping
  // and keep rotation reachable through the separate circular arrow.
  $('rotate').classList.toggle('at-target',landing()===active.y);
}
function rotate(){
  if(!playing||performance.now()<lockUntil)return false;
  if(active.type==='O')return true;
  const maxY=Math.max(...active.shape.map(([,y])=>y));
  const shape=active.shape.map(([x,y])=>[maxY-y,x]);
  for(const [dx,dy] of [[0,0],[-1,0],[1,0],[-2,0],[2,0],[-3,0],[3,0],[0,-1],[0,-2],[0,-3]]){
    const turned={...active,shape,x:active.x+dx,y:active.y+dy};
    if(fits(turned)){active=turned;last=performance.now();draw();chime();return true;}
  }
  return false;
}
function chime(win=false){if(muted)return;try{audio??=new(window.AudioContext||window.webkitAudioContext)();audio.resume();[0,...(win?[.13,.26]:[])].forEach((delay,i)=>{const o=audio.createOscillator(),g=audio.createGain(),t=audio.currentTime+delay;o.type='sine';o.frequency.value=[523,659,784][i];g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.08,t+.015);g.gain.exponentialRampToValueAtTime(.001,t+.22);o.connect(g);g.connect(audio.destination);o.start(t);o.stop(t+.24);});}catch{}}
function celebrate(message){$('status').textContent=message;$('celebration').classList.remove('show');void $('celebration').offsetWidth;$('celebration').classList.add('show');clearTimeout(celebrationTimer);celebrationTimer=setTimeout(()=>{$('celebration').classList.remove('show');$('status').textContent='You’ve got this!';},1500);}
function spawn(){active=next;next=piece();if(!fits(active)){grid=empty();celebrate('A fresh start!');}draw();}
function settle(){active.shape.forEach(([dx,dy])=>grid[active.y+dy][active.x+dx]=active.color);const remaining=grid.filter(row=>!row.every(Boolean));const cleared=ROWS-remaining.length;if(cleared){stars+=cleared;grid=[...Array.from({length:cleared},()=>Array(COLS).fill(null)),...remaining];celebrate('Hooray! A happy row!');}else{$('status').textContent=['Nice little stack!','Lovely building!','Keep going!'][Math.floor(Math.random()*3)];}chime(!!cleared);lockUntil=performance.now()+450;last=performance.now();spawn();}
function action(kind){if(!playing||performance.now()<lockUntil)return false;if(kind==='left'||kind==='right'){const x=active.x+(kind==='left'?-1:1);if(fits(active,x))active.x=x;draw();}else if(kind==='drop'){active.y=landing();settle();}return true;}
function pause(){if(!started)return;playing=false;cancelGesture();$('rotate').disabled=true;$('drop').disabled=true;$('overlay-title').textContent='A little pause';$('overlay-text').textContent='Your blocks will wait right here.';$('play').querySelector('span').textContent='Play';$('overlay').hidden=false;$('pause').disabled=true;}
function resume(){started=true;playing=true;$('rotate').disabled=false;$('drop').disabled=false;last=performance.now();$('overlay').hidden=true;$('pause').disabled=false;chime();}
function frame(now){if(playing&&!gesture&&now-last>2400){last=now;if(fits(active,active.x,active.y+1)){active.y++;draw();}else settle();}requestAnimationFrame(frame);}
let gesture=null;
const playfield=$('playfield');
function cancelGesture(e){
  if(!gesture||(e && e.pointerId!==gesture.id))return;
  const id=gesture.id;gesture=null;last=performance.now();
  if(playfield.hasPointerCapture(id))playfield.releasePointerCapture(id);
  playfield.classList.remove('dragging');
}
function beginGesture(e){
  if(!playing||gesture||!e.isPrimary||e.button!==0||performance.now()<lockUntil)return;
  e.preventDefault();
  gesture={id:e.pointerId,startX:e.clientX,startY:e.clientY,lastX:e.clientX,startRow:active.y,rowPitch:cells[COLS].getBoundingClientRect().top-cells[0].getBoundingClientRect().top,lowered:false,remainder:0,moved:false,target:e.target.closest('#rotate,#drop')?.id};
  playfield.setPointerCapture(e.pointerId);
}
function moveGesture(e){
  if(!gesture||e.pointerId!==gesture.id)return;
  e.preventDefault();
  const g=gesture;
  g.remainder+=e.clientX-g.lastX;g.lastX=e.clientX;
  if(Math.hypot(e.clientX-g.startX,e.clientY-g.startY)>8)g.moved=true;
  if(!g.moved)return;
  playfield.classList.add('dragging');
  const step=(cells[1].getBoundingClientRect().left-cells[0].getBoundingClientRect().left)*.7;
  if(step<=0)return;
  while(Math.abs(g.remainder)>=step){
    const direction=Math.sign(g.remainder),before=active.x;
    action(direction<0?'left':'right');
    g.remainder-=direction*step;
    if(active.x===before){g.remainder=0;break;}
  }
  // One row of finger travel moves one row, with no jump on release.
  if(g.rowPitch>0){
    const targetRow=g.startRow+Math.floor(Math.max(0,e.clientY-g.startY)/g.rowPitch);
    while(active.y<targetRow && fits(active,active.x,active.y+1)){
      active.y++;g.lowered=true;
    }
    draw();
  }

}
function endGesture(e){
  if(!gesture||e.pointerId!==gesture.id)return;
  moveGesture(e);
  const g=gesture;cancelGesture();
  if(g.lowered&&!fits(active,active.x,active.y+1))settle();
  else if(!g.moved){if(g.target==='rotate')rotate();else if(g.target==='drop')action('drop');}
}
playfield.addEventListener('pointerdown',beginGesture);
playfield.addEventListener('pointermove',moveGesture);
playfield.addEventListener('pointerup',endGesture);
playfield.addEventListener('pointercancel',cancelGesture);
playfield.addEventListener('lostpointercapture',cancelGesture);
// Pointer taps are handled above; keep native clicks for keyboard activation only.
playfield.addEventListener('click',e=>{if(e.detail!==0&&e.target.closest('#rotate,#drop')){e.preventDefault();e.stopPropagation();}},true);
new ResizeObserver(()=>{if(active)positionRotate();}).observe($('board'));
$('rotate').addEventListener('click',rotate);window.addEventListener('resize',positionRotate);
$('drop').addEventListener('click',()=>action('drop'));$('play').addEventListener('click',resume);$('pause').addEventListener('click',pause);$('sound').addEventListener('click',()=>{muted=!muted;$('sound').setAttribute('aria-pressed',String(!muted));$('sound').setAttribute('aria-label',muted?'Turn sound on':'Turn sound off');$('sound').querySelector('path').setAttribute('d',muted?'M11 5 6 9H3v6h3l5 4V5Zm5 4 5 6m0-6-5 6':'M11 5 6 9H3v6h3l5 4V5Zm5 3c3 2 3 6 0 8m3-11c5 4 5 10 0 14');chime();});
document.addEventListener('keydown',e=>{if(e.target.closest('button,a'))return;if(e.key==='ArrowUp'){e.preventDefault();if(!e.repeat)rotate();return;}const kind={ArrowLeft:'left',ArrowRight:'right',ArrowDown:'drop',' ':'drop'}[e.key];if(kind){e.preventDefault();if(!e.repeat)action(kind);}if(e.key==='Escape')pause();});document.addEventListener('visibilitychange',()=>{if(document.hidden&&playing)pause();});
grid=empty();grid[ROWS-1]=[colors[3],colors[3],null,null,null,null,colors[4],colors[4]];active=makePiece(0);next=piece();draw();requestAnimationFrame(frame);
if(document.modelContext?.registerTool){try{Promise.resolve(document.modelContext.registerTool({name:'read_game_state',description:'Read the current Little Blocks game state.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:(input)=>{if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).length)throw new Error('Expected an empty object');return {playing,stars,grid:grid.map(r=>[...r]),active:{...active},controls:['drag_left_right','drag_down_proportionally','tap_target_to_drop','tap_block_to_rotate']};}})).catch(()=>{});}catch{}}
