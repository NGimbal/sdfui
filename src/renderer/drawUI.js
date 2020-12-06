"use strict";
import * as twgl from 'twgl.js';

import * as ACT from '../store/actions.js';

import {gl, store, state, resolution, mPt, dPt, bboxTree} from './draw.js';
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
    let mode = this.modes.find(a => a.name == state.ui.mode)

    if(!mode)return;

    //I'm pretty sure that this should always be an option?
    //Might get more confusing if we want to define other targets?
    if(state.ui.targeting){
      if(twgl.v3.distanceSq(state.ui.target, dPt) > 0.00001){
        twgl.v3.lerp(dPt, state.ui.target, 0.1, dPt);
      } else {
        store.dispatch(ACT.uiTargetHome(false));
      }
    }

    // I don't know where the right place for this is... yet
    if(state.ui.mode === "select" && state.ui.dragging){
      for (let id of state.scene.selected){
        if(id === state.scene.editItem) continue;
        // let layer =  state.render.layers.find(layer => layer.prim === id);
        // let currItem = state.scene.editItems.find(item => item.id === id);


        let mouse = twgl.v3.create(mPt.x, mPt.y, 1.0);
        // let origin = twgl.v3.create(state.ui.dragOrigin.x, state.ui.dragOrigin.y, 1.0);

        let translate = twgl.v3.subtract(mouse, state.ui.dragOrigin);

        store.dispatch(ACT.editTranslate(id, translate));
        // let diff = twgl.v3.subtract(translate, currItem.translate);
        // console.log(diff);
        // twgl.v3.add(currItem.translate, diff, currItem.translate);

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
    let mode = this.modes.find(a => a.name == state.ui.mode)

    if(!mode.up)return;

    mode.up(e);
  }

  mouseDown(e) {
    let mode = this.modes.find(a => a.name == state.ui.mode)

    if(!mode.dwn)return;

    mode.dwn(e);
  }

  mouseMove(e) {
    // record mouse position
    let canvas = gl.canvas;
    let rect = canvas.getBoundingClientRect();

    let evPt = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };

    // transforms window / js space to sdf / frag space
    evPt.x = ((evPt.x/resolution.x) * (resolution.x/resolution.y)) - dPt[0];
    evPt.y = (evPt.y/resolution.y)  - dPt[1];
    evPt.x = evPt.x * (dPt[2] / 64.);
    evPt.y = evPt.y * (dPt[2] / 64.);

    store.dispatch(ACT.cursorSet({x:evPt.x, y:evPt.y}));

    // get mode
    let mode = this.modes.find(a => a.name == state.ui.mode)
    if(!mode.up)return;

    mode.mv(e);
  }

  keyUp(e){
    let key = e.key;
    let mode = this.modes.find(a => a.name == state.ui.mode)
    
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

  let currItem  = state.scene.editItems.find(item => item.id === state.scene.editItem);
  let currLayer = state.render.layers.find(l => l.prim === currItem.id);

  // I feel like the following line should also go in a reducer
  let pt = currLayer.uniforms.u_eTex.addPoint(mPt, state.scene.editItem);

  store.dispatch(ACT.sceneAddPt(pt));
  
  // this condition isn't great but seems to work
  if ( (currItem.type == "circle" || currItem.type == "rectangle") && currItem.pts.length >= 1 ){
    bakeLayer(currLayer);
    store.dispatch(ACT.scenePushEditItem(currItem.type));
    let newItem = state.scene.editItems.find(i=> i.id === state.scene.editItem);
    // is this pattern reliable?
    let newLayer = createEditLayer(newItem);
    store.dispatch(ACT.layerPush(newLayer));
  }

  return;
}

function endSelClck(){
  this.toggle = true;
}

function endSelUpdate(){
  if(!this.toggle) return null;
  store.dispatch(ACT.uiMode("draw"));
  store.dispatch(ACT.editSelectClr());
  this.toggle = false;
}

function selUp(e){
  if(state.ui.dragging){
    store.dispatch(ACT.uiDragStart(false, mPt));
    store.dispatch(ACT.uiDragging(false));
  } else if (state.ui.dragStart){
    store.dispatch(ACT.uiDragStart(false, mPt));
  } else if (state.scene.hover !== "" && 
             state.scene.selected.includes(state.scene.hover)) {
      // console.log("deselect");
      store.dispatch(ACT.editSelectRmv(state.scene.hover));
      store.dispatch(ACT.uiDragStart(false, mPt));
  }
}

function selDwn(e){
  // dispatch set curr item
  if(state.scene.hover !== ""){
    if (!state.scene.selected.includes(state.scene.hover)){
      // console.log("select");
      store.dispatch(ACT.editSelectIns(state.scene.hover));
      store.dispatch(ACT.uiDragStart(true, mPt));
    }
  }
}

function selMv(){
  if(state.ui.dragStart && !state.ui.dragging){
    // console.log("dragging");
    store.dispatch(ACT.uiDragging(true));
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

  let currItem = state.scene.editItems.find(item => item.id === state.scene.editItem);

  if(currItem.pts.length < 1) {
    store.dispatch(ACT.uiMode("select"));
    this.toggle = false;
    return;
  }
  
  // is this right?
  let layer = state.render.layers.find(l => l.prim === currItem.id);

  bakeLayer(layer);
    
  store.dispatch(ACT.scenePushEditItem(currItem.type));

  let newItem = state.scene.editItems.find(item => item.id === state.scene.editItem);
  //next item
  let newLayer = createEditLayer(newItem);

  store.dispatch(ACT.layerPush(newLayer));

  this.toggle = false;
  return;
}

function escDrawUpdate(){
  if(!this.toggle) return null;
  
  let id = state.scene.editItem;
  // let currItem = state.scene.editItems.find(i => i.id === id);
  let layer = state.render.layers.find(l => l.prim === id);
  
  store.dispatch(ACT.scenePushEditItem(layer.primType))
  let newItem = state.scene.editItems.find(i => i.id === state.scene.editItem);
  store.dispatch(ACT.layerPush(createEditLayer(newItem)));

  let del = deleteItem(id);
  
  if (!del) {
    // store.dispatch(ACT.uiMode("select"));
    this.toggle = false;
    return;
  }

  this.toggle = false;
  return;
}

// Deletes item in editItems at index
export function deleteItem(id){

  let layer = state.render.layers.find(l => l.prim === id);
  let lId = layer.id;

  bboxTree.remove(lId, (a, b) => {
    return a.id === b;
  });

  store.dispatch(ACT.layerPop(layer.id));

  let item = state.scene.editItems.find(i => i.id === id);

  for (let p of item.pts){
    let point = state.scene.pts.find(pt => pt.id === p)
    store.dispatch(ACT.sceneRmvPt(point));
  }

  store.dispatch(ACT.sceneRmvItem(id))
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
    store.dispatch(this.act);
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
  
    store.dispatch(ACT.editStroke(stroke, state.scene.editItem));
  
    for(let j = 0; j < n; j++){
      let x = Math.random() + lociX;
      let y = Math.random() + lociY;
      let randPt = new PRIM.vec(x, y)
      let currLayer = state.render.layers[state.render.layers.length - 1];
      // I feel like the following line should also go in a reducer
      let pt = currLayer.uniforms.u_eTex.addPoint(randPt, state.scene.editItem);
      store.dispatch(ACT.sceneAddPt(pt));
    }
  
    let layer = state.render.layers[state.render.layers.length - 1];
    bakeLayer(layer);
    
    // let currItem = state.scene.editItems[state.scene.editItem];
    let currItem = state.scene.editItems.find(state.scene.editItem);

    store.dispatch(ACT.scenePushEditItem(currItem.type));
  
    //next item
    let newLayer = createEditLayer();

    store.dispatch(ACT.layerPush(newLayer));
  }
}