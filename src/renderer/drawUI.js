"use strict";
import * as twgl from 'twgl.js';

import * as ACT from '../store/actions.js';

import * as SDFUI from './draw.js';
import {bakeLayer, createEditLayer} from './layer.js';

import * as PRIM from './primitives'

import * as chroma from 'chroma-js';

//So this is going to be a way to register
//sets of functions to different UI modes
//Try to move as much as this as possible to the redux store
//will still need something that calls dispatch on events
//like mouse move and keyup
//so this is what will make sure that the right events are
//registered / the right functions will be called on an event

//store ui.state = "draw", "select", 
//DrawUI.states = {draw: draw, select: select}
export class DrawUI{

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

    //MODIFIERS
    // constructor(name, tag, keyCut, events, _pulse){
    let targetHome = new UIModifier("Return Home", "view", "h", {act:ACT.uiTargetHome(true)},true);

    let screenshot = new UIModifier("Screenshot", "export", "l", {act:ACT.statusRaster(true)},true);

    let snapPt = new UIModifier("Snap Point", "snap", "p", {act:ACT.cursorSnapPt()});
    let snapRef = new UIModifier("Snap Ref", "snap", "s", {act:ACT.cursorSnapRef()});
    let snapGlobal = new UIModifier("Snap Global", "snap", "Shift", {act:ACT.cursorSnapGlobal()});
    let snapGrid = new UIModifier("Snap Grid", "snap", "g", {act:ACT.cursorSnapGrid()});

    let endDraw = new UIModifier("End Draw", "edit", "Enter", {clck:endDrawClck, update:endDrawUpdate},true);
    let escDraw = new UIModifier("Esc Draw", "edit", "Escape", {clck:escDrawClck, update:escDrawUpdate},true);

    // hard cancel, clears selection
    let endSel = new UIModifier("End Sel", "select", "Escape", {clck:endSelClck, update:endSelUpdate});

    //MODES
    let drawMods = [targetHome, screenshot, snapGlobal, snapRef, snapGrid, snapPt, endDraw, escDraw];

    let selMods = [targetHome, screenshot, endSel];

    //if no drawing tools are selected, drawExit();
    let draw = new UIMode("draw", drawMods, {mv:drawMv, up:drawUp});
    let select = new UIMode("select", selMods, {mv:selMv, up:selUp, dwn:selDwn});

    //would like this to be kept track of in the redux store
    this.modes = [draw, select];
    // console.log(this.modes);
    
    document.querySelector('#canvasContainer').addEventListener('mouseup', this.mouseUp.bind(this));
    document.querySelector('#canvasContainer').addEventListener('mousedown', this.mouseDown.bind(this));
    document.querySelector('#canvasContainer').addEventListener('mousemove', this.mouseMove.bind(this));

    //cntrl+z
    this.cntlPressed = false;
    this.zPressed = false;
    window.addEventListener('keyup', this.keyUp.bind(this));
    window.addEventListener('keydown', this.keyDown.bind(this));

    return this;
  }

  //global update to run functions that have been cued by a button press
  //most basic update pattern that will also be used in event handlers
  update(){
    let mode = this.modes.find(a => a.name == SDFUI.state.ui.mode)

    if(!mode)return;

    //I'm pretty sure that this should always be an option?
    //Might get more confusing if we want to define other targets?
    if(SDFUI.state.ui.targeting){
      if(twgl.v3.distanceSq(SDFUI.state.ui.target, SDFUI.dPt) > 0.00001){
        twgl.v3.lerp(SDFUI.dPt, SDFUI.state.ui.target, 0.1, SDFUI.dPt);
      } else {
        SDFUI.store.dispatch(ACT.uiTargetHome(false));
      }
    }

    // I don't know where the right place for this is... yet
    if(SDFUI.state.ui.mode === "select" && SDFUI.state.ui.dragging){
      for (let id of SDFUI.state.scene.selected){
        let layer = SDFUI.state.render.layers.find(layer => layer.prim === id);
        
        // let trans = PRIM.subVec(SDFUI.mPt, SDFUI.state.ui.dragOrigin);
        let mouse = twgl.v3.create(SDFUI.mPt.x, SDFUI.mPt.y, 1.0);
        let origin = twgl.v3.create(SDFUI.state.ui.dragOrigin.x, SDFUI.state.ui.dragOrigin.y, 1.0);

        //need to apply translation to edit Prim
        //for selection evaluation
        layer.translate = twgl.v3.subtract(mouse, origin);

        //this needs to modified by dPt
        let res = twgl.v3.create(SDFUI.resolution.x, SDFUI.resolution.y)
        layer.translate = twgl.v3.multiply(layer.translate, res);
      }
    }

    for(let m of mode.modifiers){
      //each update will deal with m.toggle on an individual basis
      if(m.update){
        m.update();
      }
    }
  }

  mouseUp(e) {
    let mode = this.modes.find(a => a.name == SDFUI.state.ui.mode)

    if(!mode.up)return;

    mode.up(e);
  }

  mouseDown(e) {
    let mode = this.modes.find(a => a.name == SDFUI.state.ui.mode)

    if(!mode.dwn)return;

    mode.dwn(e);
  }

  mouseMove(e) {
    // record mouse position
    let resolution = SDFUI.resolution;
    let canvas = SDFUI.gl.canvas;
    let rect = canvas.getBoundingClientRect();

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

    // get mode
    let mode = this.modes.find(a => a.name == SDFUI.state.ui.mode)
    if(!mode.up)return;

    mode.mv(e);
  }

  keyUp(e){
    let key = e.key;
    let mode = this.modes.find(a => a.name == SDFUI.state.ui.mode)
    
    for (let m of mode.modifiers){
      if(m.keyCut == key){
        m.clck();
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

  let currItem  = SDFUI.state.scene.editItems.find(item => item.id === SDFUI.state.scene.editItem);
  let currLayer = SDFUI.state.render.layers.find(l => l.prim === currItem.id);

  // I feel like the following line should also go in a reducer
  let pt = currLayer.uniforms.u_eTex.addPoint(SDFUI.mPt, SDFUI.state.scene.editItem);

  SDFUI.store.dispatch(ACT.sceneAddPt(pt));
  
  // this condition isn't great but seems to work
  if ( (currItem.type == "circle" || currItem.type == "rectangle") && currItem.pts.length >= 1 ){
    bakeLayer(currLayer);
    SDFUI.store.dispatch(ACT.scenePushEditItem(currItem.type));
    let newItem = SDFUI.state.scene.editItems.find(i=> i.id === SDFUI.state.scene.editItem);
    // is this pattern reliable?
    let newLayer = createEditLayer(newItem);
    SDFUI.store.dispatch(ACT.layerPush(newLayer));
  }

  return;
}

function endSelClck(){
  this.toggle = true;
}

function endSelUpdate(){
  if(!this.toggle) return null;
  SDFUI.store.dispatch(ACT.uiMode("draw"));
  SDFUI.store.dispatch(ACT.editSelectClr());
  this.toggle = false;
}

function selUp(e){
  if(SDFUI.state.ui.dragging){
    SDFUI.store.dispatch(ACT.uiDragStart(false, SDFUI.mPt));
    SDFUI.store.dispatch(ACT.uiDragging(false));
  } else if (SDFUI.state.ui.dragStart){
    SDFUI.store.dispatch(ACT.uiDragStart(false, SDFUI.mPt));
  } else if (SDFUI.state.scene.hover !== "" && 
             SDFUI.state.scene.selected.includes(SDFUI.state.scene.hover)) {
      // console.log("deselect");
      SDFUI.store.dispatch(ACT.editSelectRmv(SDFUI.state.scene.hover));
      SDFUI.store.dispatch(ACT.uiDragStart(false, SDFUI.mPt));
  }
}

function selDwn(e){
  // dispatch set curr item
  if(SDFUI.state.scene.hover !== ""){
    if (!SDFUI.state.scene.selected.includes(SDFUI.state.scene.hover)){
      // console.log("select");
      SDFUI.store.dispatch(ACT.editSelectIns(SDFUI.state.scene.hover));
      SDFUI.store.dispatch(ACT.uiDragStart(true, SDFUI.mPt));
    }
  }
}

function selMv(){
  if(SDFUI.state.ui.dragStart && !SDFUI.state.ui.dragging){
    // console.log("dragging");
    SDFUI.store.dispatch(ACT.uiDragging(true));
  }
}

//---SELECT----------------------------


function endDrawClck(){
  this.toggle = true;
}
//
function escDrawClck(){
  this.toggle = true;
}

function endDrawUpdate(){
  if(!this.toggle) return null;

  let currItem = SDFUI.state.scene.editItems.find(item => item.id === SDFUI.state.scene.editItem);

  if(currItem.pts.length < 1) {
    SDFUI.store.dispatch(ACT.uiMode("select"));
    this.toggle = false;
    return;
  }
  
  // is this right?
  let layer = SDFUI.state.render.layers.find(l => l.prim === currItem.id);

  bakeLayer(layer);
    
  SDFUI.store.dispatch(ACT.scenePushEditItem(currItem.type));

  let newItem = SDFUI.state.scene.editItems.find(item => item.id === SDFUI.state.scene.editItem);
  //next item
  let newLayer = createEditLayer(newItem);

  SDFUI.store.dispatch(ACT.layerPush(newLayer));

  this.toggle = false;
  return;
}

function escDrawUpdate(){
  if(!this.toggle) return null;
  
  let id = SDFUI.state.scene.editItem;
  let currItem = SDFUI.state.scene.editItems.find(i => i.id === id);
  let layer = SDFUI.state.render.layers.find(l => l.prim === id);
  
  SDFUI.store.dispatch(ACT.scenePushEditItem(layer.primType))
  let newItem = SDFUI.state.scene.editItems.find(i => i.id === SDFUI.state.scene.editItem);
  SDFUI.store.dispatch(ACT.layerPush(createEditLayer(newItem)));

  let del = deleteItem(currItem);
  
  if (!del) {
    // SDFUI.store.dispatch(ACT.uiMode("select"));
    this.toggle = false;
    return;
  }

  this.toggle = false;
  return;
}

// Deletes item in editItems at index
// this function needs examination
export function deleteItem(item){
  //which of these conditions are even possible?
  // if(index >= SDFUI.state.scene.editItems.length ||
  //   !SDFUI.state.scene.editItems[index] || 
  //   SDFUI.state.scene.editItems[index].pts.length < 1) {

  //   return false;
  // }

  // let item = SDFUI.state.scene.editItems[index];
  let layer = SDFUI.state.render.layers.find(l => l.prim === item.id);

  console.log("layer is : " + layer.id);

  SDFUI.store.dispatch(ACT.layerPop(layer.id));

  // questions re: why denormalzing scene this way. 
  // premature optimization?
  // might also be cool for multiple objects to reference same points
  for (let p of item.pts){
    let point = SDFUI.state.scene.pts.find(pt => pt.id === p)
    SDFUI.store.dispatch(ACT.sceneRmvPt(point));
  }

  SDFUI.store.dispatch(ACT.sceneRmvItem(item.id))
  return true;
} 

//modes are collections of UIModifiers
class UIMode{
  //bool, [], functions
  // constructor(name, toggle, modifiers, enter, exit, mv, up, dwn){
  constructor(name, modifiers, _events, _options){
    this.name = name;
    // this.toggle = toggle;
    this.modifiers = modifiers;
    // this.enter = enter.bind(this);
    // this.exit = exit.bind(this);
    // this.update = update.bind(this);

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
  constructor(name, tag, keyCut, events, _pulse){
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

//stress test
// create a lines of n points
// needs prim and chroma
export function stressTest(){
  console.log("stress test");
  for(let i = 0; i < 100; i++){
    let n = 50;
    let lociX = Math.random() * 6;
    let lociY = Math.random() * 6;
    let stroke = chroma.random().hex();
  
    SDFUI.store.dispatch(ACT.editStroke(stroke, SDFUI.state.scene.editItem));
  
    for(let j = 0; j < n; j++){
      let x = Math.random() + lociX;
      let y = Math.random() + lociY;
      let randPt = new PRIM.vec(x, y)
      let currLayer = SDFUI.state.render.layers[SDFUI.state.render.layers.length - 1];
      // I feel like the following line should also go in a reducer
      let pt = currLayer.uniforms.u_eTex.addPoint(randPt, SDFUI.state.scene.editItem);
      SDFUI.store.dispatch(ACT.sceneAddPt(pt));
    }
  
    let layer = SDFUI.state.render.layers[SDFUI.state.render.layers.length - 1];
    bakeLayer(layer);
    
    // let currItem = SDFUI.state.scene.editItems[SDFUI.state.scene.editItem];
    let currItem = SDFUI.state.scene.editItems.find(SDFUI.state.scene.editItem);

    SDFUI.store.dispatch(ACT.scenePushEditItem(currItem.type));
  
    //next item
    let newLayer = createEditLayer();

    SDFUI.store.dispatch(ACT.layerPush(newLayer));
  }
}