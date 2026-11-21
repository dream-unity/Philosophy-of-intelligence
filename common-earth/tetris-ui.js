(function(root){
  'use strict';
  const {Game,width,height,rotations}=root.EarthTetris;
  const colors={I:'#70d4dc',J:'#78a7f5',L:'#efa364',O:'#f0ce69',S:'#88d5a2',T:'#c496df',Z:'#f08b91'};
  const keys={ArrowLeft:'left',ArrowRight:'right',ArrowDown:'down',ArrowUp:'clockwise',
    x:'clockwise',z:'counterclockwise',' ':'drop',Shift:'hold'};
  const repeats=new Set(['left','right','down']);
  function tile(ctx,x,y,size,type,ghost=false){
    const left=x*size,top=y*size;
    if(ghost){
      ctx.strokeStyle=colors[type];ctx.lineWidth=2;
      ctx.strokeRect(left+3,top+3,size-6,size-6);return;
    }
    ctx.fillStyle=colors[type];ctx.fillRect(left+1,top+1,size-2,size-2);
    ctx.fillStyle='#ffffff55';ctx.fillRect(left+3,top+3,size-6,2);
    ctx.fillStyle='#152a393d';ctx.fillRect(left+2,top+size-5,size-4,3);
  }
  function preview(canvas,type,label){
    const ctx=canvas.getContext('2d');
    ctx.clearRect(0,0,canvas.width,canvas.height);
    canvas.setAttribute('aria-label',label+' · '+(type||'empty'));
    if(!type)return;
    const cells=rotations[type][0],xs=cells.map(([x])=>x),ys=cells.map(([,y])=>y);
    const size=20;
    ctx.save();
    ctx.translate((canvas.width-size*(Math.min(...xs)+Math.max(...xs)+1))/2,
      (canvas.height-size*(Math.min(...ys)+Math.max(...ys)+1))/2);
    for(const [x,y] of cells)tile(ctx,x,y,size,type);
    ctx.restore();
  }
  function mount(doc){
    const get=id=>doc.getElementById('tetris-'+id),dialog=get('dialog'),board=get('board');
    const pad=dialog.querySelector('.tetris-pad'),controls=[...pad.querySelectorAll('button')];
    const ctx=board.getContext('2d'),size=board.width/width;
    let game=null,paused=false,last=0,timer=0,repeatTimer=0,repeatPointer=null;
    // Draw the empty well once. Only piece movement or a player action redraws the board.
    const grid=doc.createElement('canvas');grid.width=board.width;grid.height=board.height;
    const bg=grid.getContext('2d');
    bg.fillStyle='#0a1a20';bg.fillRect(0,0,grid.width,grid.height);
    bg.strokeStyle='#193038';bg.lineWidth=1;bg.beginPath();
    for(let x=1;x<width;x++){bg.moveTo(x*size+.5,0);bg.lineTo(x*size+.5,grid.height);}
    for(let y=1;y<height;y++){bg.moveTo(0,y*size+.5);bg.lineTo(grid.width,y*size+.5);}
    bg.stroke();
    let bestScore=0,lastLines=0;
    try{bestScore=Number(root.localStorage?.getItem('common-earth.tetris-best')||0)||0;}catch{}
    function paint(){
      ctx.drawImage(grid,0,0);
      game.board.forEach((row,y)=>row.forEach((type,x)=>{if(type)tile(ctx,x,y,size,type);}));
      if(!game.over){
        const cells=rotations[game.type][game.rotation],landing=game.landing();
        for(const [x,y] of cells)tile(ctx,game.x+x,landing+y,size,game.type,true);
        for(const [x,y] of cells)tile(ctx,game.x+x,game.y+y,size,game.type);
      }
      if(game.score>bestScore){
        bestScore=game.score;
        try{root.localStorage?.setItem('common-earth.tetris-best',String(bestScore));}catch{}
      }
      const cleared=game.lines-lastLines;
      if(cleared>0){
        const callout=get('callout');
        if(callout)callout.textContent=['','Single line!','Double!','Triple!','TETRIS!'][Math.min(4,cleared)]||'Cleared '+cleared+' lines!';
      }else if(game.lines===0&&lastLines>0){
        const callout=get('callout');if(callout)callout.textContent='';
      }
      lastLines=game.lines;
      board.setAttribute('aria-label','Tetris playfield · '+(game.over?'Game over':game.type+' piece, column '+(game.x+1)));
      get('score').textContent=game.score;if(get('best'))get('best').textContent=bestScore;get('lines').textContent=game.lines;get('level').textContent=game.level;
      preview(get('next'),game.next,'Next piece');preview(get('held'),game.held,'Held piece');
      const stopped=paused||game.over;
      get('overlay').hidden=!stopped;
      get('pause').disabled=stopped;
      for(const b of controls)b.disabled=stopped||(b.dataset.piece==='hold'&&!game.canHold);
      if(stopped){
        get('status').textContent=game.over?'Game over':'Paused';
        get('continue').textContent=game.over?'Play again':'Resume';
      }
    }
    function stopRepeat(){
      clearTimeout(repeatTimer);repeatPointer=null;
    }
    function advance(){
      const now=performance.now(),elapsed=now-last;last=now;
      // A busy street frame can run late. Give the player a turn with each new piece.
      return game.advance(Math.min(elapsed,game.wait+100));
    }
    function schedule(){
      clearTimeout(timer);
      if(!game||!dialog.open||game.over||paused)return;
      timer=setTimeout(()=>{
        if(doc.hidden){pause();return;}
        if(advance())paint();
        if(game.over){stopRepeat();get('continue').focus();}
        schedule();
      },Math.ceil(game.wait));
    }
    function start(){
      stopRepeat();game=new Game();paused=false;last=performance.now();
      paint();board.focus({preventScroll:true});schedule();
    }
    function pause(){
      if(!game||game.over||paused)return;
      advance();paused=true;stopRepeat();clearTimeout(timer);paint();get('continue').focus({preventScroll:true});
    }
    function resume(){
      if(!paused||game.over)return;
      paused=false;last=performance.now();paint();board.focus({preventScroll:true});schedule();
    }
    function play(action){
      if(!game||!dialog.open||game.over||paused)return;
      advance();game.act(action);paint();schedule();
      if(game.over){stopRepeat();get('continue').focus({preventScroll:true});}
    }
    get('pause').addEventListener('click',pause);
    get('continue').addEventListener('click',()=>{if(game.over)start();else resume();});
    for(const button of controls){
      const action=button.dataset.piece;
      button.addEventListener('click',e=>{
        if(e.detail===0||!repeats.has(action))play(action);
        if(!game.over&&!paused&&e.detail>0)board.focus({preventScroll:true});
      });
      if(!repeats.has(action))continue;
      button.addEventListener('pointerdown',e=>{
        if(e.button!==0||repeatPointer!==null)return;
        button.setPointerCapture(e.pointerId);repeatPointer=e.pointerId;
        play(action);
        const repeat=()=>{
          if(repeatPointer!==e.pointerId)return;
          play(action);
          if(repeatPointer===e.pointerId)repeatTimer=setTimeout(repeat,85);
        };
        if(repeatPointer!==null)repeatTimer=setTimeout(repeat,240);
      });
      for(const type of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(type,e=>{
        if(e.pointerId===repeatPointer)stopRepeat();
      });
    }
    dialog.addEventListener('keydown',e=>{
      if(e.ctrlKey||e.altKey||e.metaKey)return;
      const key=e.key.length===1?e.key.toLowerCase():e.key;
      if(key==='p'){
        e.preventDefault();if(!e.repeat){if(paused)resume();else pause();}return;
      }
      const action=keys[key];
      if(!action||paused||game.over||(key===' '&&e.target.closest('button')))return;
      e.preventDefault();e.stopPropagation();
      if(!e.repeat||repeats.has(action))play(action);
    });
    dialog.addEventListener('cancel',e=>{if(game&&!game.over){e.preventDefault();if(!paused)pause();else resume();}});
    doc.addEventListener('visibilitychange',()=>{if(doc.hidden&&dialog.open)pause();});
    root.addEventListener('blur',()=>{if(dialog.open)pause();});
    dialog.addEventListener('close',()=>{
      if(dialog.open)return;
      stopRepeat();clearTimeout(timer);game=null;paused=false;
    });
    return {
      open(name){get('player').textContent='Playing as '+name;dialog.showModal();start();},
      close(){if(dialog.open)dialog.close();},
      get active(){return dialog.open;}
    };
  }
  root.EarthTetrisUI={mount};
})(globalThis);
