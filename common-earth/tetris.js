// Station 1's playfield. Coordinates grow downward, including the hidden spawn space.
(function(root){
  'use strict';
  const width=10,height=20,lockDelay=500,maxLockResets=15;
  const shapes={
    I:['....','IIII','....','....'],J:['J..','JJJ','...'],L:['..L','LLL','...'],
    O:['OO','OO'],S:['.SS','SS.','...'],T:['.T.','TTT','...'],Z:['ZZ.','.ZZ','...']
  };
  const rotations={};
  for(const [type,rows] of Object.entries(shapes)){
    let cells=[];
    rows.forEach((row,y)=>[...row].forEach((cell,x)=>{if(cell!=='.')cells.push([x,y]);}));
    rotations[type]=[];
    for(let i=0;i<4;i++){
      rotations[type].push(cells);
      cells=cells.map(([x,y])=>[rows.length-1-y,x]);
    }
  }
  // Clockwise wall kicks in SRS coordinates (+y up). Reverse the transition for counterclockwise turns.
  const kicks=[
    [[-1,0],[-1,1],[0,-2],[-1,-2]], [[1,0],[1,-1],[0,2],[1,2]],
    [[1,0],[1,1],[0,-2],[1,-2]], [[-1,0],[-1,-1],[0,2],[-1,2]]
  ];
  const longKicks=[
    [[-2,0],[1,0],[-2,-1],[1,2]], [[-1,0],[2,0],[-1,2],[2,-1]],
    [[2,0],[-1,0],[2,1],[-1,-2]], [[1,0],[-2,0],[1,-2],[-2,1]]
  ];
  const emptyRow=()=>Array(width).fill(null);
  class Game{
    constructor(random=Math.random){
      this.random=random;
      this.board=Array.from({length:height},emptyRow);
      this.bag=[];this.held=null;this.canHold=true;this.over=false;
      this.lines=0;this.score=0;
      this.next=this.draw();
      this.spawnNext();
    }
    get level(){return 1+Math.floor(this.lines/10);}
    get gravity(){return Math.max(65,Math.round(800*.82**(this.level-1)));}
    draw(){
      if(!this.bag.length){
        this.bag=Object.keys(shapes);
        for(let i=this.bag.length-1;i>0;i--){
          const j=Math.floor(this.random()*(i+1));
          [this.bag[i],this.bag[j]]=[this.bag[j],this.bag[i]];
        }
      }
      return this.bag.pop();
    }
    fits(x,y,rotation){
      return rotations[this.type][rotation].every(([dx,dy])=>{
        const col=x+dx,row=y+dy;
        return col>=0&&col<width&&row<height&&(row<0||!this.board[row][col]);
      });
    }
    grounded(){return !this.fits(this.x,this.y+1,this.rotation);}
    landing(){
      let y=this.y;
      while(this.fits(this.x,y+1,this.rotation))y++;
      return y;
    }
    spawn(type){
      this.type=type;this.rotation=0;this.lockResets=0;
      this.x=Math.floor((width-shapes[type].length)/2);this.y=0;
      this.over=!this.fits(this.x,this.y,0);
      this.wait=this.grounded()?lockDelay:this.gravity;
    }
    spawnNext(){
      const type=this.next;
      this.next=this.draw();
      this.spawn(type);
    }
    place(x,y,rotation){
      if(!this.fits(x,y,rotation))return false;
      const wasGrounded=this.grounded();
      this.x=x;this.y=y;this.rotation=rotation;
      if(this.grounded()){
        if(!wasGrounded)this.wait=lockDelay;
        else if(this.lockResets<maxLockResets){this.wait=lockDelay;this.lockResets++;}
      }else if(wasGrounded)this.wait=this.gravity;
      return true;
    }
    rotate(direction){
      if(this.type==='O')return;
      const target=(this.rotation+direction+4)%4;
      if(this.place(this.x,this.y,target))return;
      const tests=this.type==='I'?longKicks:kicks;
      for(const [dx,dy] of tests[direction===1?this.rotation:target]){
        if(this.place(this.x+direction*dx,this.y-direction*dy,target))return;
      }
    }
    lock(){
      const cells=rotations[this.type][this.rotation].map(([x,y])=>[x+this.x,y+this.y]);
      if(cells.some(([,y])=>y<0)){this.over=true;return;}
      for(const [x,y] of cells)this.board[y][x]=this.type;
      const rows=this.board.filter(row=>row.includes(null)),cleared=height-rows.length;
      this.board=[...Array.from({length:cleared},emptyRow),...rows];
      this.score+=[0,100,300,500,800][cleared]*this.level;
      this.lines+=cleared;this.canHold=true;
      this.spawnNext();
    }
    descend(){
      this.y++;
      this.wait=this.grounded()?lockDelay:this.gravity;
    }
    advance(elapsed){
      if(this.over)return false;
      let changed=false;
      while(elapsed>=this.wait&&!this.over){
        elapsed-=this.wait;
        if(this.grounded())this.lock();else this.descend();
        changed=true;
      }
      this.wait-=elapsed;
      return changed;
    }
    act(action){
      if(this.over)return;
      switch(action){
        case 'left': this.place(this.x-1,this.y,this.rotation);break;
        case 'right': this.place(this.x+1,this.y,this.rotation);break;
        case 'clockwise': this.rotate(1);break;
        case 'counterclockwise': this.rotate(-1);break;
        case 'down': if(!this.grounded()){this.descend();this.score++;}break;
        case 'drop': {
          const y=this.landing();this.score+=2*(y-this.y);this.y=y;this.lock();break;
        }
        case 'hold': {
          if(!this.canHold)break;
          const previous=this.held;this.held=this.type;this.canHold=false;
          if(previous)this.spawn(previous);else this.spawnNext();
          break;
        }
      }
    }
  }
  root.EarthTetris=Object.freeze({Game,width,height,rotations});
})(globalThis);
