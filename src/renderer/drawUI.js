"use strict";
import * as twgl from 'twgl.js';

import * as ACT from '../store/actions.js';

import * as SDFUI from './draw.js';
import {bakeLayer, createEditLayer} from './layer.js';

//So this is going to be a way to register
//sets of functions to different UI modes
//Try to move as much as this as possible to the redux store
//will still need something that calls dispatch on events
//like mouse move and keyup
//so this is what will make sure that the right events are
//registered / the right functions will be called on an event

//store ui.state = "draw", "select", 
//DrawUI.states = {draw: drad, select: select}
class DrawUI{

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

    //MODES
    let drawMods = [targetHome, screenshot, snapGlobal, snapRef, snapGrid, snapPt, endDraw, escDraw];

    let selMods = [targetHome, screenshot];

    //if no drawing tools are selected, drawExit();
    let draw = new UIMode("draw", drawMods, {mv:drawMv, up:drawUp});
    let select = new UIMode("select", selMods, {mv:selMv, up:selUp});

    //would like this to be kept track of in the redux store
    this.modes = [draw, select];
    
    document.querySelector('#canvasContainer').addEventListener('mouseup', this.mouseUp.bind(this));
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

    // if(!mode.update)return;

    //I'm pretty sure that this should always be an option?
    //Might get more confusing if we want to define other targets?
    if(SDFUI.state.ui.targeting){
      if(twgl.v3.distanceSq(SDFUI.state.ui.target, SDFUI.dPt) > 0.00001){
        twgl.v3.lerp(SDFUI.dPt, SDFUI.state.ui.target, 0.1, SDFUI.dPt);
      } else {
        SDFUI.store.dispatch(ACT.uiTargetHome(false));
      }
    }

    for(let m of mode.modifiers){
      //each update will deal with m.toggle on an individual basis
      if(m.update){
        m.update();
      }
    }

    // mode.update();
  }

  mouseUp(e) {
    let mode = this.modes.find(a => a.name == SDFUI.state.ui.mode)

    // if(!mode.up)return;

    mode.up(e);
  }

  mouseMove(e) {
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
  }

  //cnrl Z
  keyUp(e){
    let key = e.key;

    let mode = this.modes.find(a => a.name == SDFUI.state.ui.mode)

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

  let currLayer = SDFUI.state.render.layers[SDFUI.state.render.layers.length - 1];
  let pt = currLayer.uniforms.u_eTex.addPoint(SDFUI.mPt, SDFUI.state.scene.editItems[SDFUI.state.scene.editItem].id);

  SDFUI.store.dispatch(ACT.sceneAddPt(pt));

  let item = SDFUI.state.scene.editItems[SDFUI.state.scene.editItem];
  
  if ( (item.type == "circle" || item.type == "rectangle") && item.pts.length == 2){
    bakeLayer(currLayer);
    SDFUI.store.dispatch(ACT.scenePushEditItem(item.type));
    let nextPrim = SDFUI.state.scene.editItems[SDFUI.state.scene.editItem];
    let newLayer = createEditLayer(nextPrim);
    SDFUI.store.dispatch(ACT.layerPush(newLayer));
  }
  return;
}

function selMv(){
  //eval sdf scene at mouse
  //is there a hover item thing?
  //need to figure out how to add ui indication for 
  //edit item
}

function selUp(){
  // dispatch set curr item
}
//---SELECT----------------------------


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
 
  let layer = SDFUI.state.render.layers[SDFUI.state.render.layers.length - 1];
  
  bakeLayer(layer);
  
  let currItem = SDFUI.state.scene.editItems[SDFUI.state.scene.editItem];
  
  SDFUI.store.dispatch(ACT.scenePushEditItem(currItem.type));

  //next item
  let newLayer = createEditLayer(SDFUI.state.scene.editItems[SDFUI.state.scene.editItem]);

  SDFUI.store.dispatch(ACT.layerPush(newLayer));

  this.toggle = !this.toggle;
}

function escDrawUpdate(){
  if(!this.toggle) return null;

  let currLayer = SDFUI.state.render.layers[SDFUI.state.render.layers.length - 1];
  SDFUI.store.dispatch(ACT.layerPop(currLayer.id));

  for (let p of currLayer.uniforms.u_eTex.pts){
    SDFUI.store.dispatch(ACT.sceneRmvPt(p));
  }

  SDFUI.store.dispatch(ACT.sceneRmvItem(currLayer.prim))

  SDFUI.store.dispatch(ACT.sceneNewEditItem(currLayer.primType))

  SDFUI.store.dispatch(ACT.layerPush(createEditLayer(SDFUI.state.scene.editItems[SDFUI.state.scene.editItem])));

  this.toggle = !this.toggle;
  return;
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

export {DrawUI};
