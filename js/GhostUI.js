"use strict";

import * as THREE from './libjs/three.module.js';
import * as SNAP from './fluentSnap.js';
import * as HINT from './fluentHints.js';
import * as PRIM from './fluentPrim.js';


//GhostUI coordinates all UI functions, keeps FluentDocStack, and UI State
//Implements UIMode and UIModifiers
//UIMode is a collection of UIModifiers along with enter & exit functions
//UIModifier is a collection of functions that are fired by events within uiModes
class GhostUI{

  constructor(elem, shader){
    // "Out of the box" element and shader
    this.elem = elem;
    this.shader = shader;
    //GLOBAL CONSTANTS
    //square datatexture
    this.dataSize = 16;
    //texel offset to access center of texel
    this.oTexel = 1 / this.dataSize / 2.0;

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
        // what should the response be? fuck you?
        // this.endianness = 2;
        break;
      default:
        // what should the response be? fuck you?
        // this.endianness = 2;
        break;
    }

    console.log(endianNess());


    //DOCUMENT STATE
    let fluentDoc = new FluentDoc(this.elem, this.shader);
    this.fluentStack = new StateStack(fluentDoc, 10);

    //MODE STATE
    this.drawing = true;
    this.editPolyLn = false;

    //MODIFIERS
    //Clck could be a built in function - looks like it will generally be a simple toggle
    let pauseShader = new UIModifier("pauseShader", "view", "/", false, {clck:pauseShaderClck, update:pauseShaderUpdate}, {});
    let hideGrid = new UIModifier("hideGrid", "view", ".", false, {clck:hideGridClck, update:hideGridUpdate}, {grid:true});
    let showPts = new UIModifier("showPts", "view", "r", false, {clck:showPtsClck, update:showPtsUpdate}, {pts:false});

    let screenshot = new UIModifier("screenshot", "export", "l", false, {clck:screenshotClck, update:screenshotUpdate}, {});
    let printShader = new UIModifier("printShader", "export", "c", false, {clck:printShaderClck, update:printShaderUpdate}, {});

    let snapPt = new UIModifier("snapPt", "snap", "p", false, {clck:SNAP.snapPtClck, mv:SNAP.snapPtMv, up:SNAP.snapPtUp}, {dist:100});
    let snapRef = new UIModifier("snapRef", "snap", "s", false, {clck:SNAP.snapRefClck, mv:SNAP.snapRefMv, up:SNAP.snapRefUp}, {angle:30});
    let snapGlobal = new UIModifier("snapGlobal", "snap", "Shift", false, {clck:SNAP.snapGlobalClck, mv:SNAP.snapGlobalMv, up:SNAP.snapGlobalUp}, {angle:45});
    let snapGrid = new UIModifier("snapGrid", "snap", "g", false, {clck:SNAP.snapGridClck, mv:SNAP.snapGridMv, up:SNAP.snapGridUp}, {});

    //lineweight modifier is broken
    let endDraw = new UIModifier("endDraw", "edit", "Enter", false, {clck:endDrawClck, update:endDrawUpdate}, {exit:false});
    let escDraw = new UIModifier("escDraw", "edit", "Escape", false, {clck:escDrawClck, update:escDrawUpdate}, {exit:false});

    //MODES
    let globalMods = [pauseShader, hideGrid, showPts, screenshot, printShader];
    let drawMods = [snapGlobal, snapRef, snapGrid, snapPt, endDraw, escDraw];
    drawMods = globalMods.concat(drawMods);

    let selMods = [pauseShader, hideGrid, screenshot];

    //if no drawing tools are selected, drawExit();
    let draw = new UIMode("draw", drawMods, drawEnter, drawExit, drawUpdate, {mv:drawMv, up:drawUp}, {currEditItem:"PolyLine", strokeColor:"#0063ae", filter:"None"});
    let select = new UIMode("select", selMods, selEnter, selExit, selUpdate, {mv:selMv});
    // let edit = new UIMode("select", false, edit)
    // let

    //modeStack is successful
    //eventually modeStack will become part of FluentDoc
    //not really important enough to worry about in the short term
    this.modeStack = new StateStack(draw, 5);
    //default mode
    this.modeStack.curr().enter();

    //should this be bound to docStack[] or this?
    document.getElementById("draw-shapes").addEventListener('mouseup', this.mouseUp.bind(this));
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
    let fluentDoc = this.fluentStack.curr().clone();
    let mode = this.modeStack.curr();
    if(!mode.update)return;

    if (mode.toggle == false){
      mode = this.modeStack.undo();
      mode.enter();
    }

    let newDoc = mode.update(fluentDoc);
    if (newDoc) fluentDoc = newDoc;

    this.fluentStack.modCurr(fluentDoc);
  }

  mouseUp(e) {
    let fluentDoc = this.fluentStack.curr().clone();
    let mode = this.modeStack.curr();
    if(!mode.up)return;

    let newDoc = mode.up(e, fluentDoc);
    if (newDoc) fluentDoc = newDoc;

    this.fluentStack.modCurr(fluentDoc);
    this.fluentStack.push(fluentDoc);
  }

  mouseMove(e) {

    let evPt = {
      x: e.clientX,
      y: e.clientY
    };

    let fluentDoc = this.fluentStack.curr().clone();

    //default action to show mouse target point
    fluentDoc.mPt.x = evPt.x / fluentDoc.elem.width;
    fluentDoc.mPt.y = (fluentDoc.elem.height - evPt.y) / fluentDoc.elem.height;

    let mode = this.modeStack.curr();

    if(!mode.mv)return;

    let newDoc = mode.mv(e, fluentDoc);
    if (newDoc) fluentDoc = newDoc;

    this.fluentStack.modCurr(fluentDoc);
  }

  //cnrl Z
  keyUp(e){
    let key = e.key;

    if(key == "z") this.zPressed = false;
    else if(key == "Meta") this.cntlPressed = false;
    else if(key == "Control") this.cntlPressed = false;

    let fluentDoc = this.fluentStack.curr().clone();

    let mode = this.modeStack.curr();

    for (let m of mode.modifiers){
      if(m.keyCut == key){
        let newDoc = m.clck(fluentDoc);
        if (newDoc) fluentDoc = newDoc;
      }
    }

    this.fluentStack.modCurr(fluentDoc);
  }


  keyDown(e){
    let key = e.key;

    if(key == "z") this.zPressed = true;
    else if(key == "Meta") this.cntlPressed = true;
    else if(key == "Control") this.cntlPressed = true;

    if (this.zPressed && this.cntlPressed){
      this.zPressed = false;
      // console.log("Control Z!");
      let fluentDoc = this.fluentStack.undo();
      if (!fluentDoc) {
        let newDoc = new FluentDoc(this.elem, this.shader);
        this.fluentStack.modCurr(newDoc);
      } else {
        fluentDoc.shaderUpdate = true;
      }
    }
  }
}

//this might as well just be taken care of in draw update
function selectPrimitive(e){
  let sel = document.getElementById("primitive-select");
  console.log(sel.value);
}

//---SELECT---------------------------
function selEnter(){
  HINT.pushModeHint(this.name, "Select Mode!");
  // console.log(this);
  HINT.modButtonStack();
  // this.initUIModeButtons();
}

function selExit(){
  console.log(this);
}

function selUpdate(){
  console.log(this);
}

function selMv(){
  console.log(this);
}
//---SELECT---------------------------

//---DRAW-----------------------------
function drawEnter(){
  // pushPopModeHint(this.name, "Begin Drawing!");
  HINT.pushModeHint(this.name, "Begin Drawing!");
  this.initUIModeButtons();

  //add event to primitive select element
  //this is going to move somewhere...
  let sel = document.getElementById("primitive-select");
  sel.addEventListener("change", selectPrimitive);

  //turns on snapping to pts by default
  //function should take some default settings at some point
  var index = this.modifiers.findIndex(i => i.name === "snapPt");
  this.modifiers[index].clck();

  var index = this.modifiers.findIndex(i => i.name === "showPts");
  this.modifiers[index].clck();

  // var index = this.modifiers.findIndex(i => i.name === "drawPLine");
  // this.modifiers[index].clck();
}

function drawExit(){
  HINT.snackHint("End Drawing!");
  console.log(this);
  //This should be more global
  let pauseShader = new UIModifier("pauseShader", "view", "/", false, {clck:pauseShaderClck, update:pauseShaderUpdate}, {});
  let hideGrid = new UIModifier("hideGrid", "view", ".", false, {clck:hideGridClck, update:hideGridUpdate}, {grid:true});
  let screenshot = new UIModifier("screenshot", "export", "l", false, {clck:screenshotClck, update:screenshotUpdate}, {});

  let selMods = [pauseShader, hideGrid, screenshot];
  let select = new UIMode("select", selMods, selEnter, selExit, selUpdate, {mv:selMv});
}

function drawUpdate(fluentDoc){
  //exit draw condition
  //no primitive tool active
  if(this.factors.currEditItem == null){
    this.exit();
    return;
  }

  let sel = document.getElementById("primitive-select");

  if(this.factors.currEditItem != sel.value){
    fluentDoc = fluentDoc.currEditItem.end(fluentDoc);
    fluentDoc.shaderUpdate = true;
    switch(sel.value){
      case "PolyLine":
        this.factors.currEditItem = "PolyLine";
        fluentDoc.currEditItem = new PRIM.PolyLine(fluentDoc.resolution, fluentDoc.editOptions, fluentDoc.dataSize);
        fluentDoc.editItems.push(fluentDoc.currEditItem);
        fluentDoc.shader = modifyDefine(fluentDoc.shader, "EDIT_SHAPE", "1");
        break;
      case "Polygon":
        this.factors.currEditItem = "Polygon";
        fluentDoc.currEditItem = new PRIM.Polygon(fluentDoc.resolution, fluentDoc.editOptions, fluentDoc.dataSize);
        fluentDoc.editItems.push(fluentDoc.currEditItem);
        fluentDoc.shader = modifyDefine(fluentDoc.shader, "EDIT_SHAPE", "5");
        break;
      case "PolyCircle":
        this.factors.currEditItem = "PolyCircle";
        fluentDoc.currEditItem = new PRIM.PolyCircle(fluentDoc.resolution, fluentDoc.editOptions, fluentDoc.dataSize);
        fluentDoc.editItems.push(fluentDoc.currEditItem);
        fluentDoc.shader = modifyDefine(fluentDoc.shader, "EDIT_SHAPE", "2");
        break;
      case "Circle":
        this.factors.currEditItem = "Circle";
        fluentDoc.currEditItem = new PRIM.Circle(fluentDoc.resolution, fluentDoc.editOptions);
        fluentDoc.editItems.push(fluentDoc.currEditItem);
        fluentDoc.shader = modifyDefine(fluentDoc.shader, "EDIT_SHAPE", "3");
        break;
      case "Rectangle":
        // console.log("Rectangle not yet implemented!");
        this.factors.currEditItem = "Rectangle";
        fluentDoc.currEditItem = new PRIM.Rectangle(fluentDoc.resolution, fluentDoc.editOptions, fluentDoc.dataSize);
        fluentDoc.editItems.push(fluentDoc.currEditItem);
        fluentDoc.shader = modifyDefine(fluentDoc.shader, "EDIT_SHAPE", "4");
        break;
    }
    fluentDoc.shaderUpdate = true;
  }

  sel = document.getElementById("filter-select");

  if(this.factors.filter != sel.value){
    this.factors.filter = sel.value;
    switch(sel.value){
      case "None":
        fluentDoc.shader = modifyDefine(fluentDoc.shader, "FILTER", "0");
        break;
      case "Pencil":
        fluentDoc.shader = modifyDefine(fluentDoc.shader, "FILTER", "1");
        break;
      case "Crayon":
        fluentDoc.shader = modifyDefine(fluentDoc.shader, "FILTER", "2");
        break;
      case "SDF":
        fluentDoc.shader = modifyDefine(fluentDoc.shader, "FILTER", "3");
        break;
    }
    fluentDoc.shaderUpdate = true;
  }

  sel = document.getElementById("strokeColor-select");
  if(this.factors.strokeColor != sel.value){
    // console.log(sel.value);
    // console.log(hexToRgb(sel.value));
    this.factors.strokeColor = sel.value;
    let rgb = hexToRgb(sel.value);
    let newColor = new THREE.Vector3(rgb.r / 255, rgb.g / 255, rgb.b/255);
    fluentDoc.editOptions.stroke = newColor;
    fluentDoc.currEditItem.options.stroke = newColor;
    // fluentDoc.shaderUpdate = true;
  }

  sel = document.getElementById("strokeWeight-range");
  if(this.factors.strokeWeight != sel.value){
    // console.log(sel.value);
    // console.log(hexToRgb(sel.value));
    this.factors.strokeWeight = sel.value;
    fluentDoc.editOptions.weight = sel.value / 2000;
    fluentDoc.currEditItem.options.weight = sel.value / 2000;
    // fluentDoc.shaderUpdate = true;
  }

  sel = document.getElementById("radius-range");
  if(this.factors.strokeWeight != sel.value){
    // console.log(sel.value);
    // console.log(hexToRgb(sel.value));
    this.factors.radius = sel.value;
    fluentDoc.editOptions.radius = sel.value / 100;
    fluentDoc.currEditItem.options.radius = sel.value / 100;
    // fluentDoc.shaderUpdate = true;
  }

  for(let m of this.modifiers){
    //each update will deal with m.toggle on an individual basis
    if(m.update){
      let newDoc = m.update(fluentDoc);
      if (newDoc) fluentDoc = newDoc;
      if (m.factors.exit && m.factors.exit == true){
        this.exit()
      }
    }
  }

}

function drawMv(e, fluentDoc){

  for (let m of this.modifiers){
    if(!m.mv) continue;
    if(!m.toggle) continue;
    if(m.update) continue;
    let modState = m.mv(e, fluentDoc);
    if(!modState) continue;
    else fluentDoc = modState;
  }
  return fluentDoc;
}

function drawUp(e, fluentDoc){

  for (let m of this.modifiers){
    if(!m.up) continue;
    let modState = m.up(e, fluentDoc)
    if(!modState) continue;
    fluentDoc = modState;
  }

  let addPt = {
    x: 0,
    y: 0,
    tag: "none",
  }

  addPt.x = fluentDoc.mPt.x * fluentDoc.resolution.x;
  addPt.y = fluentDoc.elem.height - (fluentDoc.mPt.y * fluentDoc.resolution.y);
  addPt.tag = "plPoint";

  //could have this return true / false to determine wether point should be pushed to tree
  let plPt = fluentDoc.currEditItem.addPoint(addPt.x, addPt.y, addPt.tag);

  //important to keep a simple array of pts for reconstructingree
  fluentDoc.pts.push(plPt);
  fluentDoc.tree.insert(plPt);

  if (fluentDoc.currEditItem.pointPrim && fluentDoc.currEditItem.pts.length == 2) {
    fluentDoc.shader = fluentDoc.currEditItem.bakeFunctionCall(fluentDoc);
    fluentDoc.editItemIndex++;
    fluentDoc.currEditItem = fluentDoc.currEditItem.create(fluentDoc.resolution, fluentDoc.editOptions);
    fluentDoc.editItems.push(fluentDoc.currEditItem);
    fluentDoc.shaderUpdate = true;
  }

  return fluentDoc;
}

//---DRAW-----------------------------

function screenshotClck(){
  this.toggle = !this.toggle;
  HINT.pulseActive(this);
}

function printShaderClck(){
  this.toggle = !this.toggle;
  HINT.pulseActive(this);
}

function hideGridClck(){
  this.toggle = !this.toggle;
  HINT.pulseActive(this);
}

function pauseShaderClck(){
  this.toggle = !this.toggle;
  HINT.pulseActive(this);
}

function endDrawClck(){
  this.toggle = !this.toggle;
  HINT.pulseActive(this);
}

function escDrawClck(fluentDoc){
  this.toggle = !this.toggle;
  HINT.pulseActive(this);
}

function showPtsClck(fluentDoc){
  this.toggle = !this.toggle;
  HINT.toggleActive(this);
}

function pauseShaderUpdate(fluentDoc){
  if(!this.toggle) return null;

  fluentDoc.shaderPause = !fluentDoc.shaderPause;

  this.toggle = !this.toggle;
  return fluentDoc;
}

function hideGridUpdate(fluentDoc){
  if(!this.toggle) return null;

  let valString = "0";

  if (!this.factors.grid) valString = "1";

  fluentDoc.shader = modifyDefine(fluentDoc.shader, "BG_GRID", valString);
  fluentDoc.shaderUpdate = true;

  this.factors.grid = !this.factors.grid;

  this.toggle = !this.toggle;
  return fluentDoc;
}

function endDrawUpdate(fluentDoc){
  if(!this.toggle) return null;

  if(fluentDoc.currEditItem.pts.length == 0) {
    this.factors.exit = true;
    return null;
  }

  fluentDoc.shader = fluentDoc.currEditItem.end(fluentDoc).shader;
  // fluentDoc.shader = fluentDoc.currEditItem.bakeFunctionParams(fluentDoc);
  // fluentDoc.shader = fluentDoc.currEditItem.bakeFunctionCall(fluentDoc);
  fluentDoc.shaderUpdate = true;

  fluentDoc.currEditItem = fluentDoc.currEditItem.create(fluentDoc.resolution, fluentDoc.editOptions, fluentDoc.dataSize);

  fluentDoc.editItems.push(fluentDoc.currEditItem);

  fluentDoc.editItemIndex++;

  this.toggle = !this.toggle;
  return fluentDoc;
}

function escDrawUpdate(fluentDoc){
  if(!this.toggle) return null;

  if(fluentDoc.currEditItem.pts.length == 0) {
    this.factors.exit = true;
    return null;
  }

  //remove all points from curr edit item before ending this polyline
  for (let p of fluentDoc.currEditItem.pts){
    var index = fluentDoc.pts.findIndex(i => i.id === p.id);

    fluentDoc.pts.splice(index, 1);
    fluentDoc.tree.remove(p);
  }

  fluentDoc.currEditItem = fluentDoc.currEditItem.create(fluentDoc.resolution, fluentDoc.editOptions, fluentDoc.dataSize);

  this.toggle = !this.toggle;
  return fluentDoc;
}

function showPtsUpdate(fluentDoc){
  if(!this.toggle) return null;

  let valString = "0";

  if (!this.factors.pts) valString = "1";

  fluentDoc.shader = modifyDefine(fluentDoc.shader, "SHOW_PTS", valString);
  fluentDoc.shaderUpdate = true;

  this.factors.pts = !this.factors.pts;

  this.toggle = !this.toggle;
  return fluentDoc;
}

function screenshotUpdate(fluentDoc){
  if(!this.toggle) return null;

  fluentDoc.screenshot = true;
  this.toggle = !this.toggle;
  return fluentDoc;
}

function printShaderUpdate(fluentDoc){
  if(!this.toggle) return null;

  console.log(fluentDoc.shader);
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

//Ring buffer of states
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

  //should the object be cloned here?
  curr(){
    return this.stack[this.index];
  }

  modCurr(newState){
    this.stack[this.index] = newState;
  }

  pop(){

  }

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

  undo(){
    if (this.index == this.firstIndex){
      return this.curr();
    }
    this.decrementIndex();
    return this.curr();
  }

  redo(){
    this.incrementIndex();
    return this.curr();
  }

  incrementIndex(){
    this.index++;
    this.index = (this.index % this.MAX);

    if (this.index == this.firstIndex){
      this.firstIndex++;
      this.firstIndex = (this.firstIndex % this.MAX);
    }
  }

  decrementIndex(){
    this.index -= 1;
    if(this.index < 0){
      this.index = 9;
    }
  }
}

//FluentDoc State
class FluentDoc{
  // new fluent doc from elem
  // should move shader logic in here
  // maybe this class should get moved to sdfui
  constructor(elem, shader){
    this.elem = elem;
    this.resolution = new THREE.Vector2(elem.width, elem.height);

    //uniforms might want to get moved here
    this.shader = shader;
    this.shaderUpdate = false;
    this.shaderPause = false;
    this.screenshot = false;

    //mouse target position
    this.mPt = new THREE.Vector3(0, 0, 1.0);

    //grid scale
    this.scale = 48;

    this.addPt = {
      x: 0,
      y: 0,
      tag: "",
    };

    //list of kdTree points, might not be necessary?
    this.pts = [];
    //all clickable / snappable points
    this.tree = new kdTree(this.pts, this.pointDist, ["x", "y"]);

    //current editItem
    //this might want to get moved to UIMode some day...
    this.editOptions = {
      weight:0.003,
      stroke:new THREE.Vector3(0.0, 0.384, 0.682),
      fill:"0063ae",
      fillToggle:false,
      radius:0.125
    }

    this.editItemIndex = 0;
    this.currEditItem = new PRIM.PolyLine(this.resolution, this.editOptions, this.dataSize);
    this.editItems = [this.currEditItem];

    //document registry of paramters
    this.parameters = new PRIM.PolyPoint(this.resolution, this.editOptions, 128);

    //establishes grid offsets
    //actually don't think this instantiation is necessary
    this.gridOffX = 0.0;
    this.gridOffY = 0.0;
    this.scaleX = 0.0;
    this.scaleyY = 0.0;
    this.drawGrid();
  }

  pointDist(a, b){
    var dx = a.x - b.x;
    var dy = a.y - b.y;
    return dx*dx + dy*dy;
  }

  //Establishes grid aligned with the shader
  //Will be useful for document units
  drawGrid(){
    let scaleX = (this.resolution.x / this.scale) * (this.resolution.y / this.resolution.x);
    let scaleY = this.resolution.y / this.scale;

    this.gridScaleX = scaleX;
    this.gridScaleY = scaleY;

    //There has got to be a more elegant way to do this...
    //Is the remainder odd or even?
    let r = ((this.resolution.x / scaleX) - (this.resolution.x / scaleX) % 1) % 2;
    //If even, add scaleX * 0.5;
    r = Math.abs(r - 1);
    // let offX = (((this.resolution.x / scaleX) % 2) * scaleX) * 0.5 + scaleX * 0.5;
    let offX = (((this.resolution.x / scaleX) % 1) * scaleX) * 0.5 + ((scaleX * 0.5) * r);

    let offY = scaleY * 0.5;

    this.gridOffX = offX;
    this.gridOffY = offY;

    // console.log("this.scale = " + this.scale);
    // console.log("offX = " + offX);
    // console.log("offY = " + offY);
    // console.log("scaleX = " + scaleX);
    // console.log("scaleY = " + scaleY);

    // console.log(this.grid);

    // for (let i = offY; i <= this.resolution.y; i+=scaleY){
    //   for (let j = offX; j <= this.resolution.x; j+=scaleX){
    //     addSVGCircle("blah", j, i, 2);
    //   }
    // }
  }
  //
  clone(){
    //elem is probably the only thing we want to retain a reference to
    //also elem probably doesn't have to be a property of fluentDoc
    var shader = (' ' + this.shader).slice(1);

    let newDoc = new FluentDoc(this.elem, shader);

    newDoc.shaderPause = this.shaderPause;
    newDoc.shaderUpdate = this.shaderUpdate;
    newDoc.screenshot = this.screenshot;

    newDoc.mPt = this.mPt.clone();
    let pts = [];
    for (let p of this.pts){ pts.push(p.clone()) };

    newDoc.tree = new kdTree(pts, newDoc.pointDist, ["x", "y"]);

    newDoc.pts = pts;

    //this may have to get a little more sofisticated...
    newDoc.editOptions = {...this.editOptions};
    newDoc.editItemIndex = this.editItemIndex;

    let currEditItem = this.currEditItem.clone();
    let editItems = [];
    for (let item of this.editItems){editItems.push(item.clone());}
    newDoc.editItems = editItems;

    newDoc.parameters = this.parameters.clone();

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
  constructor(name, modifiers, enter, exit, update, _events, _factors){
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

    this.factors = _factors || {factor:1.0};
  }

  initUIModeButtons(){
    let tags = [];

    for (let m of this.modifiers){
      if (!tags.includes(m.tag)){
        tags.push(m.tag);
        HINT.addButtonHeading(m);
      }
      let newButton = new Button(HINT.addButtonHint(m), m)
      m.button = newButton;
    }
  }
}

//Modifier functions return null or a cloned modified FluentDoc
//we can also include a list of what's changed
//or we could check that it is a valid state for the program
//I think there are ways of handling problems that might arise later
class UIModifier{
  //clck
  constructor(name, tag, keyCut, toggle, events, _factors){
    this.name = name;
    //tag e.g. snap, edit, view, export
    this.tag = tag;
    this.keyCut = keyCut;

    this.toggle = toggle || false;
    //whether this modifiers move function should be called on move or onUpdate
    if(events.update){
      this.update = events.update;
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

    this.factors = _factors || {};

    this.button = null;
  }
}

class Button{
  constructor(elem, uimodifier){
    //for offsets, could clean up these names
    this.pos1 = 0;
    this.pos2 = 0;
    this.pos3 = 0;
    this.pos4 = 0;

    this.elem = elem;

    this.innerHTML = this.elem.innerHTML;

    //bool for checking if input method is active
    this.input = false;

    this.uimodifier = uimodifier;

    //original positions
    let style = window.getComputedStyle(elem);
    this.top = style.getPropertyValue('top');
    this.left = style.getPropertyValue('left');

    this.onclick = this.uimodifier.clck.bind(this.uimodifier);

    //what happens onclick
    elem.onclick = this.onclick;

    //interpret type and color from html element
    let classes = elem.classList;
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

export {GhostUI, Button};
