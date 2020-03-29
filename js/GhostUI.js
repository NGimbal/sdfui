"use strict";

import * as THREE from './libjs/three.module.js';
// import * as SNAP from './fluentSnap.js';
import * as HINT from './fluentHints.js';
import * as PRIM from './fluentPrim.js';

import * as SDFUI from './sdfui.js';

import * as ACT from './actions.js';

//GhostUI coordinates all UI functions, keeps FluentDocStack, and UI State
//Implements UIMode and UIModifiers
//UIMode is a collection of UIModifiers along with enter & exit functions
//UIModifier is a collection of functions that are fired by events within uiModes
class GhostUI{

  constructor(){
    // "Out of the box" element and shader
    // this.elem = elem;
    // this.resolution = _resolution || new THREE.Vector2(window.innerWidth, window.innerHeight);

    //need to check endianess for half float usage
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

    console.log(endianNess());

    let editOptions = {
      // resolution: this.resolution,
      currEditItem:"PolyLine",
      strokeColor:"#0063ae",
      filter:"None",
      weight:0.003,
      stroke:new THREE.Vector3(0.0, 0.0, 0.0),
      fill:new THREE.Vector3(0.0, 0.384, 0.682),
      fillToggle:false,
      radius:0.125,
      grid: true,
      points: false,
    };

    //Doc State
    this.fluentDoc = new FluentDoc();
    // this.fluentDoc.editItems.push(new PRIM.PolyLine(editOptions));
    // this.fluentDoc.currEditItem = this.fluentDoc.editItems[this.fluentDoc.editItems.length - 1];

    // this.fluentStack = new StateStack(fluentDoc, 10);

    //MODIFIERS
    //Clck could be a built in function - looks like it will generally be a simple toggle
    let pauseShader = new UIModifier("pauseShader", "view", "/", {act:ACT.uiPause()},false, {});
    let hideGrid = new UIModifier("hideGrid", "view", ".", {act:ACT.uiGrid()},false, {});
    let showPts = new UIModifier("showPts", "view", "r", {act:ACT.uiPoints()},false, {});

    let screenshot = new UIModifier("screenshot", "export", "l", {act:ACT.statusRaster()},true, {});
    let printShader = new UIModifier("printShader", "export", "c", {act:ACT.statusExport()},true, {});

    let snapPt = new UIModifier("snapPt", "snap", "p", {act:ACT.cursorSnapPt()},false, {dist:100});
    let snapRef = new UIModifier("snapRef", "snap", "s", {act:ACT.cursorSnapRef()},false, {angle:30});
    let snapGlobal = new UIModifier("snapGlobal", "snap", "Shift", {act:ACT.cursorSnapGlobal()},false, {angle:45});
    let snapGrid = new UIModifier("snapGrid", "snap", "g", {act:ACT.cursorSnapGrid()},false, {});

    let endDraw = new UIModifier("endDraw", "edit", "Enter", {clck:endDrawClck, update:endDrawUpdate},true, {exit:false});
    let escDraw = new UIModifier("escDraw", "edit", "Escape", {clck:escDrawClck, update:escDrawUpdate},true, {exit:false});

    //MODES
    let globalMods = [pauseShader, hideGrid, showPts, screenshot, printShader];
    let drawMods = [snapGlobal, snapRef, snapGrid, snapPt, endDraw, escDraw];
    drawMods = globalMods.concat(drawMods);

    let selMods = [pauseShader, hideGrid, screenshot];

    //if no drawing tools are selected, drawExit();
    let draw = new UIMode("draw", drawMods, drawEnter, drawExit, drawUpdate, {mv:drawMv, up:drawUp}, editOptions);
    let select = new UIMode("select", selMods, selEnter, selExit, selUpdate, {mv:selMv});
    // let edit = new UIMode("select", false, edit)
    // let move

    //stack of UIModes
    this.modeStack = new StateStack(draw, 5);
    this.modeStack.curr().enter();

    //could pass elem around but...
    document.querySelector('#c').addEventListener('mouseup', this.mouseUp.bind(this));
    window.addEventListener('mousemove', this.mouseMove.bind(this));

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

  // Placeholder
  // Helper to save a HalfFloat16 data texture
  saveDataTHalfFloat16(pixels, name, width, height){
    // let buffer = new ArrayBuffer(10);
    // let view = new DataView(buffer);
    //
    // for (let i = 0; i<pixels.length; i++){
    //   view.setUint16(0, p.texData[0]);
    //   let floatX = getFloat16(view, 0);
    //   // console.log(getFloat16(view, 0));
    //   // console.log(getFloat16(view, 0) * window.innerWidth);
    //
    //   view.setUint16(0, p.texData[1]);
    //   let floatY = getFloat16(view, 0);
    // }

    // Create a 2D canvas to store the results
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
    // let fluentDoc = this.fluentStack.curr().clone();
    let mode = this.modeStack.curr();
    if(!mode.update)return;

    if (mode.toggle == false){
      mode = this.modeStack.undo();
      mode.enter();
    }

    let newDoc = mode.update(this.fluentDoc);
    if (newDoc && newDoc != "exit") this.fluentDoc = newDoc;
    else if (newDoc == "exit"){

      //enter, how to actually make this  a little more modular?
      // let pauseShader = new UIModifier("pauseShader", "view", "/", false, {clck:pauseShaderClck, update:pauseShaderUpdate}, {});
      // let hideGrid = new UIModifier("hideGrid", "view", ".", false, {clck:hideGridClck, update:hideGridUpdate}, {grid:true});
      // let screenshot = new UIModifier("screenshot", "export", "l", false, {clck:screenshotClck, update:screenshotUpdate}, {});

      let selMods = [pauseShader, hideGrid, screenshot];
      let select = new UIMode("select", selMods, selEnter, selExit, selUpdate, {mv:selMv});
      this.modeStack.push(select);
      this.modeStack.curr().enter();
    }

    // this.fluentStack.modCurr(fluentDoc);
  }

  mouseUp(e) {
    // let fluentDoc = this.fluentStack.curr().clone();
    let mode = this.modeStack.curr();
    if(!mode.up)return;

    let newDoc = mode.up(e, this.fluentDoc);
    if (newDoc) this.fluentDoc = newDoc;

    // this.fluentStack.modCurr(thifluentDoc);
    // this.fluentStack.push(fluentDoc);
  }

  mouseMove(e) {
    let resolution = SDFUI.resolution;
    // let resolution = SDFUI.store.getState().resolution;
    // let resolution = SDFUI.state.resolution;
    let evPt = {
      x: e.clientX,
      y: e.clientY
    };

    // transforms window / js space to sdf / frag space
    evPt.x = ((evPt.x / resolution.x) - 0.5) * resolution.x/resolution.y;
    evPt.y = ((resolution.y - evPt.y) / resolution.y) - 0.5;

    evPt.x = (evPt.x * resolution.x) / (resolution.x * 0.5);
    evPt.y = (evPt.y * resolution.y) / (resolution.y * 0.5);

    SDFUI.store.dispatch(ACT.cursorSet({x:evPt.x, y:evPt.y}));

    let mode = this.modeStack.curr();

    if(!mode.mv)return;

    let newDoc = mode.mv(e, this.fluentDoc);
    if (newDoc) this.fluentDoc = newDoc;
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
        let newDoc = m.clck(this.fluentDoc);
        if (newDoc) this.fluentDoc = newDoc;
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
      // let fluentDoc = this.fluentStack.undo();
      // if (!fluentDoc) {
      //   let newDoc = new FluentDoc();
      //   this.fluentStack.modCurr(newDoc);
      // } else {
      //   // fluentDoc.shaderUpdate = true;
      //   SDFUI.store.dispatch(ACT.statusUpdate(true));
      //   fluentDoc.currEditItem.needsUpdate = true;
      // }
    }
  }
}

//---SELECT---------------------------
function selEnter(){
  HINT.pushModeHint(this.name, "Select Mode!");
  HINT.modButtonStack();
}

function selExit(){
  console.log(this);
}

function selUpdate(fluentDoc){
  for (let e of fluentDoc.editItems){
    if (e.primType && e.primType == "Circle" && e.pts.length > 0){

    }
  }
}

function selMv(){

}
//---SELECT---------------------------

//---DRAW-----------------------------
function drawEnter(){
  HINT.pushModeHint(this.name, "Begin Drawing!");
  this.initUIModeButtons();

  //turns on pt snapping by default
  let snapPt = this.modifiers.find(mod => mod.name == "snapPt");
  snapPt.clck();
}

function drawExit(){
  HINT.snackHint("End Drawing!");
  // not implemented
}

//happens on every frame of draw mode
function drawUpdate(fluentDoc){
  let resolution = SDFUI.resolution;

  //exit draw condition - no primitive tool active
  if(this.options.currEditItem == null){
    this.exit();
    return;
  }

  let sel = document.getElementById("primitive-select");
  let type = SDFUI.state.scene.editItems[SDFUI.state.scene.editItem].type;

  if(type != sel.value){
    switch(sel.value){
      case "polyline":
        SDFUI.store.dispatch(ACT.sceneEditUpdate(true));
        SDFUI.store.dispatch(ACT.scenePushEditItem("polyline"));
        SDFUI.modifyDefine(SDFUI.dataShader, "EDIT_SHAPE", "1");
        SDFUI.newEditTex();
        break;
      case "polygon":
        SDFUI.store.dispatch(ACT.sceneEditUpdate(true));
        SDFUI.store.dispatch(ACT.scenePushEditItem("polygon"));
        SDFUI.modifyDefine(SDFUI.dataShader, "EDIT_SHAPE", "5");
        SDFUI.newEditTex();
        break;
      case "polycircle":
        SDFUI.store.dispatch(ACT.sceneEditUpdate(true));
        SDFUI.store.dispatch(ACT.scenePushEditItem("polycircle"));
        SDFUI.modifyDefine(SDFUI.dataShader, "EDIT_SHAPE", "2");
        SDFUI.newEditTex();
        break;
      case "circle":
        SDFUI.store.dispatch(ACT.sceneEditUpdate(true));
        SDFUI.store.dispatch(ACT.scenePushEditItem("circle"));
        SDFUI.modifyDefine(SDFUI.dataShader, "EDIT_SHAPE", "3");
        SDFUI.newEditTex();
        break;
      case "rectangle":
        SDFUI.store.dispatch(ACT.sceneEditUpdate(true));
        SDFUI.store.dispatch(ACT.scenePushEditItem("rectangle"));
        SDFUI.modifyDefine(SDFUI.dataShader, "EDIT_SHAPE", "4");
        SDFUI.newEditTex();
        break;
    }
    SDFUI.store.dispatch(ACT.statusUpdate(true));
  }

  sel = document.getElementById("filter-select");
  if(SDFUI.state.ui.properties.filter != sel.value){
    SDFUI.store.dispatch(ACT.drawFilter(sel.value));
    SDFUI.store.dispatch(ACT.sceneEditProps());
  }

  sel = document.getElementById("strokeColor-select");
  if(SDFUI.state.ui.properties.stroke != sel.value){
    SDFUI.store.dispatch(ACT.drawStroke(sel.value));
    SDFUI.store.dispatch(ACT.sceneEditProps());
  }

  sel = document.getElementById("fillColor-select");

  if(SDFUI.state.ui.properties.fill != sel.value){
    SDFUI.store.dispatch(ACT.drawFill(sel.value));
    SDFUI.store.dispatch(ACT.sceneEditProps());
  }

  sel = document.getElementById("strokeWeight-range");
  if(SDFUI.state.ui.properties.weight != sel.value){
    SDFUI.store.dispatch(ACT.drawWeight(sel.value / 2000));
    SDFUI.store.dispatch(ACT.sceneEditProps());
  }

  sel = document.getElementById("radius-range");
  if(SDFUI.state.ui.properties.radius != sel.value / 100){
    SDFUI.store.dispatch(ACT.drawRadius(sel.value / 100));
    SDFUI.store.dispatch(ACT.sceneEditProps());
  }

  for(let m of this.modifiers){
    //each update will deal with m.toggle on an individual basis
    if(m.update){
      let newDoc = m.update(fluentDoc);
      if (newDoc) fluentDoc = newDoc;
      if (m.options.exit && m.options.exit == true){
        this.exit();
        return "exit";
      }
    }
  }
  return fluentDoc;
}

function drawMv(e, fluentDoc){

  for (let m of this.modifiers){
    if(!m.mv || !m.toggle || m.update) continue;

    let modState = m.mv(e, fluentDoc, this.options);
    if(!modState) continue;
    else fluentDoc = modState;
  }
  return fluentDoc;
}

function drawUp(e, fluentDoc){
  let resolution = SDFUI.resolution;
  // let resolution = SDFUI.state.resolution;

  for (let m of this.modifiers){
    if(!m.up) continue;
    let modState = m.up(e, fluentDoc)
    if(!modState) continue;
    fluentDoc = modState;
  }

  //returns a new point of type PRIM.vec()
  let pt = SDFUI.editTex.addPoint(SDFUI.mPt, "plPoint");

  SDFUI.store.dispatch(ACT.sceneAddPt(pt));
  //
  // if (fluentDoc.currEditItem.pointPrim && fluentDoc.currEditItem.pts.length == 2) {
  //   // fluentDoc.shader = fluentDoc.currEditItem.bakeFunctionCall(fluentDoc);
  //   fluentDoc.currEditItem.needsUpdate = true;
  //
  //   fluentDoc.editItems.push(fluentDoc.currEditItem.create(resolution, this.options));
  //   fluentDoc.currEditItem = fluentDoc.editItems[fluentDoc.editItems.length - 1];
  //
  //   // fluentDoc.shaderUpdate = true;
  //   SDFUI.store.dispatch(ACT.statusUpdate(true));
  // }
  let item = SDFUI.state.scene.editItems[SDFUI.state.scene.editItem];
  if ( (item.type == "circle" || item.type == "rectangle") && item.pts.length == 2){
    SDFUI.store.dispatch(ACT.sceneItemUpdate(SDFUI.state.scene.editItem, true));
    SDFUI.store.dispatch(ACT.scenePushEditItem(item.type));
    SDFUI.store.dispatch(ACT.statusUpdate(true));
    SDFUI.newEditTex();
  }


  return fluentDoc;
}

//---DRAW-----------------------------
function endDrawClck(){
  this.toggle = !this.toggle;
  HINT.pulseActive(this);
}
//
function escDrawClck(fluentDoc){
  this.toggle = !this.toggle;
  HINT.pulseActive(this);
}

function endDrawUpdate(){
  if(!this.toggle) return null;
  console.log("///////////////////////////////////////////////");

  //get out of Draw UIMode
  if(SDFUI.editTex.pts.length == 0) {
    this.options.exit = true;
    return null;
  }

  SDFUI.store.dispatch(ACT.statusUpdate(true));
  SDFUI.store.dispatch(ACT.sceneEditUpdate(true));

  let type = SDFUI.state.scene.editItems[SDFUI.state.scene.editItem].type;

  SDFUI.store.dispatch(ACT.scenePushEditItem(type));
  SDFUI.newEditTex();

  this.toggle = !this.toggle;
}

function escDrawUpdate(fluentDoc){
  if(!this.toggle) return null;

  if(SDFUI.editTex.pts.length == 0) {
    this.options.exit = true;
    return null;
  }

  for (let p of SDFUI.editTex.pts){
    SDFUI.store.dispatch(ACT.sceneRmvPt(p));
  }

  // SDFUI.editTex = new PRIM.PolyPoint({...SDFUI.state.ui.properties}, 16);
  SDFUI.newEditTex();

  this.toggle = !this.toggle;
  return fluentDoc;
}

//this will eventually just operate on the shader
//should move this to sdfui
function showPtsUpdate(fluentDoc){
  if(!this.toggle) return null;

  let valString = "0";

  if (!this.options.pts) valString = "1";

  SDFUI.store.dispatch(ACT.statusUpdate(true));
  SDFUI.store.dispatch(ACT.uiPoints());

  this.options.pts = !this.options.pts;

  this.toggle = !this.toggle;
  return fluentDoc;
}

function printShaderUpdate(fluentDoc){
  if(!this.toggle) return null;

  // console.log(fluentDoc.shader);
  this.toggle = !this.toggle;
  return fluentDoc;
}

function modifyDefine(shader, define, val){
  //change #define
  let insString = "#define " + define + " ";
  let insIndex = shader.indexOf(insString);
  insIndex += insString.length;

  let startShader = shader.slice(0, insIndex);
  let endShader = shader.slice(insIndex+2);

  startShader += val + "\n";
  shader = startShader + endShader;

  return shader;
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
    //this is hacky, need to figure out what to do
    //1. we don't need to clone the state (unlikely in the case of fluentDoc)
    //2. we clone the state before push
    //3. implement clone for UIMode
    let state;
    if(_state.clone) {
      state = _state.clone();
    } else {
      state = _state;
    }

    this.incrementIndex();

    this.stack[this.index] = state;

    //console.log(this);
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

//FluentDoc State state distince from ui state
class FluentDoc{
  // new Doc contains elem, curr shader, kd tree of all pts, curr editItem, editItems
  constructor(){
    // should move shader logic in here
    // maybe this class should get moved to sdfui
    // this.elem = elem;
    // this.resolution = new THREE.Vector2(elem.width, elem.height);

    //uniforms might want to get moved here
    // this.shader = shader;
    // this.shaderUpdate = false;
    // this.shaderPause = false;
    // this.screenshot = false;

    //mouse target position
    // this.mPt = new THREE.Vector3(0, 0, 1.0);

    //grid scale
    // this.scale = 48;

    this.addPt = {
      x: 0,
      y: 0,
      tag: "",
    };

    //list of kdTree points, might not be necessary?
    this.pts = [];
    //all clickable / snappable points
    // this.tree = new kdTree(this.pts, this.pointDist, ["x", "y"]);

    // this.editItemIndex = 0;
    this.currEditItem;
    this.editItems = [];

    // this.drawGrid();
  }

  // simple distance function for kdTree
  pointDist(a, b){
    var dx = a.x - b.x;
    var dy = a.y - b.y;
    return dx*dx + dy*dy;
  }

  //clones FluentDoc, essential for document stack
  clone(){
    //elem is probably the only thing we want to retain a reference to
    //also elem probably doesn't have to be a property of fluentDoc
    // var shader = (' ' + this.shader).slice(1);
    let newDoc = new FluentDoc();

    // newDoc.shaderPause = this.shaderPause;
    // newDoc.shaderUpdate = this.shaderUpdate;
    // newDoc.screenshot = this.screenshot;

    // newDoc.mPt = this.mPt.clone();
    let pts = [];
    for (let p of this.pts){ pts.push(p.clone()) };

    // newDoc.tree = new kdTree(pts, newDoc.pointDist, ["x", "y"]);

    newDoc.pts = pts;

    //this may have to get a little more sofisticated...
    // newDoc.editOptions = {...this.editOptions};
    // newDoc.editItemIndex = this.editItemIndex;

    // let currEditItem = this.currEditItem.clone();
    let editItems = [];
    for (let item of this.editItems){editItems.push(item.clone());}
    newDoc.editItems = editItems;
    let currEditItem = editItems[editItems.length - 1];

    // newDoc.parameters = this.parameters.clone();

    newDoc.currEditItem = currEditItem;
    newDoc.editItems = editItems;

    return newDoc;
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

  initUIModeButtons(){
    let tags = [];

    for (let m of this.modifiers){
      if (!tags.includes(m.tag)){
        tags.push(m.tag);
        HINT.addButtonHeading(m);
      }
      let newButton = m.addButton();
      m.button = newButton;
    }
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
    let elem = HINT.addButtonHint(this);

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
      HINT.pulseActive(this);
    }else{
      HINT.toggleActive(this);
    }
  }
}



function hexToRgb(hex) {
  // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
  var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  hex = hex.replace(shorthandRegex, function(m, r, g, b) {
    return r + r + g + g + b + b;
  });

  var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

// good for debugging and for reference
//returns svg element
//id as string; x & y as pixel coords; opacity as 0 -1, fill & stroke as colors
function addSVGCircle(id, x, y, r, opacity, fill, stroke, strokeWeight){
  var r = r || 15;
  var height = 2 * r;
  var width = 2 * r;
  var id = id || "no-id";
  var opacity = opacity || 0.85;
  var fill = fill || 'orange';
  var stroke = stroke || 'black';
  var strokeWeight = strokeWeight || 2.0;

  var svg = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  svg.setAttribute('width', String(width));
  svg.setAttribute('height', String(height));

  svg.setAttribute('class', 'annot');

  svg.setAttribute('cx', String(x));
  svg.setAttribute('cy', String(y));
  svg.setAttribute('r', String(r));
  svg.setAttribute('id', String(id));
  svg.setAttribute('opacity', opacity);
  svg.setAttribute('fill', fill);
  svg.setAttribute('stroke', stroke);
  svg.setAttribute('stroke-width', strokeWeight);

  document.getElementById('draw-shapes').appendChild(svg);
  return svg;
}

export {GhostUI};
