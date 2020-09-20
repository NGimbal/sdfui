"use strict";

import * as SDFUI from './draw.js';

import * as ACT from '../store/actions.js';

import {bakeLayer, createEditLayer} from './layer.js';
// import * as chroma from 'chroma-js';
import * as twgl from 'twgl.js';

//
class GhostUI{

  constructor(){
    // need to check endianess for half float usage
    // https://abdulapopoola.com/2019/01/20/check-endianness-with-javascript/
    function endianNess(){
        let uInt32 = new Uint32Array([0x11223344]);
        let uInt8 = new Uint8Array(uInt32.buffer);

        if(uInt8[0] === 0x44) {
            return 'Little Endian';
        } else if (uInt8[0] === 0x11) {
            return 'Big Endian';
        } else {
            return 'Maybe mixed-endian?';
        }
    }

    this.endD = false;

    switch(endianNess()){
      case 'Little Endian':
        this.endD = true;
        break;
      case 'Big Endian':
        this.endD = false;
        break;
      case 'Maybe mixed-endian?':
        this.endD = true;
        break;
      default:
        this.endD = true;
        break;
    }

    // console.log(endianNess());

    let editOptions = {
    };

    //MODIFIERS
    let targetHome = new UIModifier("Return Home", "view", "h", {act:ACT.uiTargetHome(true)},true, {});

    let screenshot = new UIModifier("Screenshot", "export", "l", {act:ACT.statusRaster(true)},true, {});

    let snapPt = new UIModifier("Snap Point", "snap", "p", {act:ACT.cursorSnapPt()},false, {});
    let snapRef = new UIModifier("Snap Ref", "snap", "s", {act:ACT.cursorSnapRef()},false, {});
    let snapGlobal = new UIModifier("Snap Global", "snap", "Shift", {act:ACT.cursorSnapGlobal()},false, {});
    let snapGrid = new UIModifier("Snap Grid", "snap", "g", {act:ACT.cursorSnapGrid()},false, {});

    let endDraw = new UIModifier("End Draw", "edit", "Enter", {clck:endDrawClck, update:endDrawUpdate},true, {exit:false});
    let escDraw = new UIModifier("Esc Draw", "edit", "Escape", {clck:escDrawClck, update:escDrawUpdate},true, {exit:false});

    //MODES
    let globalMods = [targetHome, screenshot];
    let drawMods = [snapGlobal, snapRef, snapGrid, snapPt, endDraw, escDraw];
    drawMods = globalMods.concat(drawMods);

    let selMods = [targetHome, screenshot];

    //if no drawing tools are selected, drawExit();
    let draw = new UIMode("draw", drawMods, drawEnter, drawExit, drawUpdate, {mv:drawMv, up:drawUp}, editOptions);
    // let move

    //stack of UIModes
    this.modeStack = new StateStack(draw, 5);
    this.modeStack.curr().enter();

    //could pass elem around but...
    document.querySelector('#canvasContainer').addEventListener('mouseup', this.mouseUp.bind(this));
    document.querySelector('#canvasContainer').addEventListener('mousemove', this.mouseMove.bind(this));

    //cntrl+z
    this.cntlPressed = false;
    this.zPressed = false;
    window.addEventListener('keyup', this.keyUp.bind(this));
    window.addEventListener('keydown', this.keyDown.bind(this));

    return this;
  }

  // Helper to save a Uint8 data texture
  saveDataTUint8(pixels, name, width, height){
    // Create a 2D canvas to store the result
    var canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    var context = canvas.getContext('2d');

    // Copy the pixels to a 2D canvas
    var imageData = context.createImageData(width, height);
    imageData.data.set(pixels);
    context.putImageData(imageData, 0, 0);

    var img = new Image();
    img.src = canvas.toDataURL();

    var dlAnchorElem = document.getElementById('downloadAnchorElem');
    dlAnchorElem.setAttribute("href",     img.src     );
    dlAnchorElem.setAttribute("download", name);
    dlAnchorElem.click();
  }

  //global update to run functions that have been cued by a button press
  //most basic update pattern that will also be used in event handlers
  update(){
    let mode = this.modeStack.curr();
    if(!mode.update)return;

    if(SDFUI.state.ui.targeting){
      if(twgl.v3.distanceSq(SDFUI.state.ui.target, SDFUI.dPt) > 0.00001){
        twgl.v3.lerp(SDFUI.dPt, SDFUI.state.ui.target, 0.1, SDFUI.dPt);
      } else {
        SDFUI.store.dispatch(ACT.uiTargetHome(false));
      }
    }

    let newDoc = mode.update();
  }

  mouseUp(e) {
    let mode = this.modeStack.curr();
    // if(!mode.up)return;

    let newDoc = mode.up(e);
  }

  mouseMove(e) {
    let resolution = SDFUI.resolution;
    let canvas = SDFUI.gl.canvas;
    let rect = canvas.getBoundingClientRect();
    // let resolution = new PRIM.vec(rect.width, rect.height);

    let evPt = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };

    // transforms window / js space to sdf / frag space
    evPt.x = ((evPt.x/resolution.x) * (resolution.x/resolution.y)) - SDFUI.dPt[0];
    evPt.y = (evPt.y/resolution.y)  - SDFUI.dPt[1];
    evPt.x = evPt.x * (SDFUI.dPt[2] / 64.);
    evPt.y = evPt.y * (SDFUI.dPt[2] / 64.);

    SDFUI.store.dispatch(ACT.cursorSet({x:evPt.x, y:evPt.y}));

  }

  //cnrl Z
  keyUp(e){
    let key = e.key;

    if(key == "z") this.zPressed = false;
    else if(key == "Meta") this.cntlPressed = false;
    else if(key == "Control") this.cntlPressed = false;

    let mode = this.modeStack.curr();

    for (let m of mode.modifiers){
      if(m.keyCut == key){
        let newDoc = m.clck();
      }
    }
  }

  keyDown(e){
    let key = e.key;

    if(key == "z") this.zPressed = true;
    else if(key == "Meta") this.cntlPressed = true;
    else if(key == "Control") this.cntlPressed = true;

    if (this.zPressed && this.cntlPressed){
      this.zPressed = false;
      console.log("Control Z!");
      // Control Z code here
      //
    }
  }
}

//---DRAW-----------------------------
function drawEnter(){

  let snapPt = this.modifiers.find(mod => mod.name == "Snap Point");
  snapPt.clck();
}

function drawExit(){

}

//happens on every frame of draw mode
function drawUpdate(){
  for(let m of this.modifiers){
    //each update will deal with m.toggle on an individual basis
    if(m.update){
      m.update();
    }
  }
  return;
}

function drawMv(e){

  for (let m of this.modifiers){
    if(!m.mv || !m.toggle || m.update) continue;

    let modState = m.mv(e, this.options);
  }
  return;
}

function drawUp(e){
  for (let m of this.modifiers){
    if(!m.up) continue;
    let modState = m.up(e)
    if(!modState) continue;
  }

  let currLayer = SDFUI.layers[SDFUI.layers.length - 1];
  let pt = currLayer.uniforms.u_eTex.addPoint(SDFUI.mPt, SDFUI.state.scene.editItems[SDFUI.state.scene.editItem].id);

  SDFUI.store.dispatch(ACT.sceneAddPt(pt));

  let item = SDFUI.state.scene.editItems[SDFUI.state.scene.editItem];
  
  if ( (item.type == "circle" || item.type == "rectangle") && item.pts.length == 2){
    bakeLayer(currLayer);
    SDFUI.store.dispatch(ACT.scenePushEditItem(item.type));
    let nextPrim = SDFUI.state.scene.editItems[SDFUI.state.scene.editItem];
    let newLayer = createEditLayer(nextPrim);
    SDFUI.layers.push(newLayer);
  }
  return;
}

//---DRAW-----------------------------
function endDrawClck(){
  this.toggle = !this.toggle;
}
//
function escDrawClck(){
  this.toggle = !this.toggle;
}

function endDrawUpdate(){
  if(!this.toggle) return null;

  if(SDFUI.state.scene.editItems[SDFUI.state.scene.editItem].pts.length < 1) return;
 
  //list of layers should probably go in redux store at some point
  let layer = SDFUI.layers[SDFUI.layers.length - 1];
  bakeLayer(layer);
  
  let currItem = SDFUI.state.scene.editItems[SDFUI.state.scene.editItem];
  
  SDFUI.store.dispatch(ACT.scenePushEditItem(currItem.type));

  //next item
  let newLayer = createEditLayer(SDFUI.state.scene.editItems[SDFUI.state.scene.editItem]);

  SDFUI.layers.push(newLayer);

  this.toggle = !this.toggle;
}

function escDrawUpdate(){
  if(!this.toggle) return null;

  let currLayer = SDFUI.layers.pop();

  for (let p of currLayer.uniforms.u_eTex.pts){
    SDFUI.store.dispatch(ACT.sceneRmvPt(p));
  }

  SDFUI.store.dispatch(ACT.sceneRmvItem(currLayer.prim))

  SDFUI.store.dispatch(ACT.sceneNewEditItem(currLayer.primType))

  SDFUI.layers.push(createEditLayer(SDFUI.state.scene.editItems[SDFUI.state.scene.editItem]));

  this.toggle = !this.toggle;
  return;
}

//Ring buffer of states, type agnostic
class StateStack{
  constructor(state, MAX){
    this.MAX = MAX || 10;
    this.index = 0;
    this.stack = [];
    this.stack[0] = state;
    this.firstIndex = 0;

    for (let i = 1; i < this.MAX; i++){
      this.stack.push(null);
    }
  }

  //return current state, object is not cloned here
  curr(){
    return this.stack[this.index];
  }

  //current state is replaced by modified state object
  modCurr(newState){
    this.stack[this.index] = newState;
  }

  //push new state
  push(_state){
    //clone the state before push
    let state;
    if(_state.clone) {
      state = _state.clone();
    } else {
      state = _state;
    }

    this.incrementIndex();

    this.stack[this.index] = state;
  }

  //return previous state, decrement index
  undo(){
    if (this.index == this.firstIndex){
      return this.curr();
    }
    this.decrementIndex();
    return this.curr();
  }

  //return next state, increment index
  redo(){
    this.incrementIndex();
    return this.curr();
  }

  //increment index, wraps index
  incrementIndex(){
    this.index++;
    this.index = (this.index % this.MAX);

    if (this.index == this.firstIndex){
      this.firstIndex++;
      this.firstIndex = (this.firstIndex % this.MAX);
    }
  }

  //decrement index, wraps index
  decrementIndex(){
    this.index -= 1;
    if(this.index < 0){
      this.index = 9;
    }
  }
}

//idea is to allow the creation of modes if/when that's necessary
//modes are going to be collections of UIModifiers
class UIMode{
  //bool, [], functions
  // constructor(name, toggle, modifiers, enter, exit, mv, up, dwn){
  constructor(name, modifiers, enter, exit, update, _events, _options){
    this.name = name;
    // this.toggle = toggle;
    this.modifiers = modifiers;
    this.enter = enter.bind(this);
    this.exit = exit.bind(this);
    this.update = update.bind(this);

    this.toggle = true;

    //these should basically all be defined for every mode
    if(_events.mv) this.mv = _events.mv;
    if(_events.up) this.up = _events.up;
    if(_events.dwn) this.dwn = _events.dwn;
    if(_events.scrll) this.scrll = _events.scrll;

    this.options = _options || {factor:1.0};
  }
}

//simple class to hold modifiers
class UIModifier{
  //clck
  constructor(name, tag, keyCut, events, _pulse, _options, _elem){
    this.name = name;
    //tag e.g. snap, edit, view, export
    this.tag = tag;
    this.keyCut = keyCut;

    this.toggle = false;
    //whether this modifiers move function should be called on move or onUpdate
    if(events.update){
      this.update = events.update;
    }
    if(events.act){
      this.act = events.act;
      this.clck = this.dispatch;
    }
    if(events.clck){
      this.clck = events.clck.bind(this);
    }
    if(events.mv){
      this.mv = events.mv.bind(this);
    }
    if(events.up){
      this.up = events.up.bind(this);
    }
    if(events.dwn){
      this.dwn = events.dwn.bind(this);
    }
    if(events.scrll){
      this.scrll = events.scrll.bind(this);
    }

    if(typeof _pulse == "boolean"){
       this.pulse = _pulse;
     }else{
       this.pulse = false;
     }

    this.options = _options || {};

    //button element
    this.elem = _elem || "";
    if (this.elem != ""){
      this.innerHTML = this.elem.innerHTML;

      let style = window.getComputedStyle(elem);
      this.top = style.getPropertyValue('top');
      this.left = style.getPropertyValue('left');

      elem.onclick = this.clck;
    }
  }

  addButton(){
    // let elem = HINT.addButtonHint(this);

    //button element
    this.elem = elem;
    this.innerHTML = this.elem.innerHTML;

    let style = window.getComputedStyle(this.elem);
    this.top = style.getPropertyValue('top');
    this.left = style.getPropertyValue('left');

    elem.onclick = this.clck;
  }

  dispatch(){
    SDFUI.store.dispatch(this.act);
    if(this.pulse){
      // HINT.pulseActive(this);
    }else{
      // HINT.toggleActive(this);
    }
  }
}

export {GhostUI};
