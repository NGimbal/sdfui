"use strict";

import * as THREE from './libjs/three.module.js';
import * as SNAP from './fluentSnap.js';
import * as HINT from './fluentHints.js';

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
    this.editWeight = .002;
    this.editOpacity = 0.0;
    this.drawing = true;
    this.editPolyLn = false;

    //MODIFIERS
    //Eventually will implement a UIMode update function
    //right now some things rely on their move functions to update which stinks
    //only because the function takes effect after moving the mouse
    let pauseShader = new UIModifier("pauseShader", "view", "/", true, pauseShaderClck, false, {}, pauseShaderUpdate);
    let hideGrid = new UIModifier("hideGrid", "view", ".", true, hideGridClck, false, {grid:true}, hideGridUpdate);

    let snapPt = new UIModifier("snapPt", "snap", "p", false, SNAP.snapPtClck, false, {dist:200}, SNAP.snapPtMv, SNAP.snapPtUp);
    let snapRef = new UIModifier("snapRef", "snap", "s", false, SNAP.snapRefClck, false, {angle:45}, SNAP.snapRefMv, SNAP.snapRefUp);
    let snapGlobal = new UIModifier("snapGlobal", "snap", "Shift", false, SNAP.snapGlobalClck, false, {angle:90}, SNAP.snapGlobalMv, SNAP.snapGlobalUp);
    let snapGrid = new UIModifier("snapGrid", "snap", "g", false, SNAP.snapGridClck, false, {}, SNAP.snapGridMv, SNAP.snapGridUp);

    let drawPLine = new UIModifier("drawPLine", "edit", "Space", true, drawPLineClck, false, {}, drawPLineMv);
    let lineWeight = new UIModifier("lineWeight", "edit", "w", true, lineWeightClck, true, {weight:0.002}, lineWeightMv);
    let endPLine = new UIModifier("endPLine", "edit", "Enter", true, endPLineClck, false, {}, endPLineUpdate);
    let escPLine = new UIModifier("escPLine", "edit", "Escape", true, escPLineClck, false, {}, escPLineUpdate);

    let screenshot = new UIModifier("screenshot", "export", "l", true, screenshotClck, false, {}, screenshotUpdate);

    //MODES
    //constructor(toggle, modifiers, enter, exit, mv, up, dwn){
    //for the short term, keyUp is called automatically
    let globalMods = [pauseShader, hideGrid, screenshot];
    let drawMods = [snapGlobal, snapRef, snapGrid, snapPt, lineWeight, endPLine, escPLine];
    drawMods = globalMods.concat(drawMods);
    this.modes = [
      new UIMode("draw", true, drawMods, drawEnter, drawExit, drawMv, drawUp)
    ]

    this.initUIModeButtons();

    this.modes[0].enter();

    document.getElementById("draw-shapes").addEventListener('mouseup', this.mouseUp.bind(this));
    //bind to docStack[];
    window.addEventListener('mousemove', this.mouseMove.bind(this));
    //cntrl+z
    this.cntlPressed = false;
    this.zPressed = false;

    window.addEventListener('keyup', this.keyUp.bind(this));
    window.addEventListener('keydown', this.keyDown.bind(this));

    return this;
  }

  initUIModeButtons(){
    let tags = [];
    for(let m of this.modes[0].modifiers){
      if (!tags.includes(m.tag)){
        tags.push(m.tag);
        HINT.addButtonHeading(m);
      }
      let newButton = new Button(HINT.addButtonHint(m), m)
      m.button = newButton;
    }
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
    // Create a 2D canvas to store the result
    for (let p of pixels){
      console.log(p);
    }

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
  //takes care of functions that need to run before mousemv
  update(){
    let fluentDoc = this.fluentStack.curr().clone();

    for (let mode of this.modes){
      if(mode.toggle){
        for(let m of mode.modifiers){
          if(m.toggle && m.onUpdate){
            // console.log(mode.name);
            let newDoc = m.mv(null, fluentDoc);
            if (newDoc) fluentDoc = newDoc;
          }
        }
      }
    }
    this.fluentStack.modCurr(fluentDoc);
  }

  mouseUp( e ) {

    let fluentDoc = this.fluentStack.curr().clone();

    for (let mode of this.modes){
      if(mode.toggle == true){
        // console.log(mode.name);
        let newDoc = mode.up(e, fluentDoc);
        if (newDoc) fluentDoc = newDoc;
      }
    }
    this.fluentStack.modCurr(fluentDoc);
    this.fluentStack.push(fluentDoc);
  }

  mouseMove(e) {

    let evPt = {
      x: e.clientX,
      y: e.clientY
    };

    let fluentDoc = this.fluentStack.curr().clone();

    fluentDoc.mPt.x = evPt.x / fluentDoc.elem.width;
    fluentDoc.mPt.y = (fluentDoc.elem.height - evPt.y) / fluentDoc.elem.height;

    //should use uiModeStack like document state stack
    for (let mode of this.modes){
      if(mode.toggle == true){
        let newDoc = mode.mv(e, fluentDoc);
        if (newDoc) fluentDoc = newDoc;
      }
    }
    this.fluentStack.modCurr(fluentDoc);
  }

  //cnrl Z
  keyUp(e){
    let key = e.key;

    if(key == "z") this.zPressed = false;
    else if(key == "Meta") this.cntlPressed = false;
    else if(key == "Control") this.cntlPressed = false;

    let fluentDoc = this.fluentStack.curr().clone();

    //should use uiModeStack like document state stack
    for (let mode of this.modes){
      if(mode.toggle == true){
        for (let m of mode.modifiers){
          if(m.keyCut == key){
            let newDoc = m.clck(fluentDoc);
            if (newDoc) fluentDoc = newDoc;
          }
        }
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
      console.log("Control Z!");
      // console.log(this.fluentStack);
      // if (this.fluentStack.index > 0){
        let fluentDoc = this.fluentStack.undo();
        if (!fluentDoc) {
          let newDoc = new FluentDoc(this.elem, this.shader);
          this.fluentStack.modCurr(newDoc);
        }
        else {
          fluentDoc.shaderUpdate = true;
        }
    }
  }
}

function drawEnter(){
  // pushPopModeHint(this.name, "Begin Drawing!");
  HINT.pushModeHint(this.name, "Begin Drawing!");
  //turns on snapping to pts by default
  //function should take some default settings at some point
  var index = this.modifiers.findIndex(i => i.name === "snapPt");

  this.modifiers[index].clck();
}

function drawExit(){
  HINT.snackHint("End Drawing!");
}

function drawMv(e, fluentDoc){
  if (this.toggle == false) return null;

  for (let m of this.modifiers){
    if(!m.mv) continue;
    if(!m.toggle) continue;
    let modState = m.mv(e, fluentDoc);
    if(!modState) continue;
    else fluentDoc = modState;
  }
  return fluentDoc;
}

function drawUp(e, fluentDoc){
  if (this.toggle == false) return null;
  // let fluentDoc = Object.assign({}, _fluentDoc);

  let addPt = {
    x: 0,
    y: 0,
    tag: "none",
  }

  for (let m of this.modifiers){
    if(!m.up) continue;
    let modState = m.up(e, fluentDoc)
    if(!modState) continue;
    fluentDoc = modState;
    addPt = fluentDoc.addPt;
    // this.fluentDoc.mPt = modState.mPt
  }
  if(addPt.tag === "none"){
    addPt.x = fluentDoc.mPt.x * fluentDoc.resolution.x;
    addPt.y = fluentDoc.elem.height - (fluentDoc.mPt.y * fluentDoc.resolution.y);
    addPt.tag = "plPoint";
  }

  let plPt = fluentDoc.currEditItem.addPoint(addPt.x, addPt.y, addPt.tag);

  //important to keep a simple array of pts for reconstructing
  //tree on cloneing
  fluentDoc.pts.push(plPt);
  fluentDoc.tree.insert(plPt);
  fluentDoc.currEditItem.cTexel += 1;

  return fluentDoc;
}

function screenshotClck(e){
  this.toggle = !this.toggle;
  HINT.pulseActive(this);
}

function hideGridClck(fluentDoc){
  this.toggle = !this.toggle;
  HINT.pulseActive(this);
}

function pauseShaderClck(e){
  this.toggle = !this.toggle;
  HINT.pulseActive(this);
}

function endPLineClck(fluentDoc){
  this.toggle = !this.toggle;
  HINT.pulseActive(this);
}

function drawPLineClck(fluentDoc){
  return null;
}

function drawPLineMv(fluentDoc){
  return null;
}

function escPLineClck(fluentDoc){
  this.toggle = !this.toggle;
  HINT.pulseActive(this);
}

function lineWeightClck(e){
  // console.log(this);
  if(!this.button.input){
    let weight = this.factors.weight;
    let uiSlider = '<input type="range" min="1" max="20" value="' + weight + '" class="slider" id="myRange">';
    // this.elem.style.width = '15vmin';
    this.button.elem.classList.toggle("input-slider");
    this.button.elem.innerHTML = uiSlider;
    this.button.input = true;
  }
  else if(this.button.input){
    //evaluates false when closing slider
    if(e.srcElement.value){
      this.factors.weight = parseInt(event.srcElement.value) / 2500;
      // fluentDoc.currEditItem.weight = parseInt(event.srcElement.value) / 2500;
      // fluentDoc.editWeight = parseInt(event.srcElement.value) / 2500;
    }

    if(e.target != this.button.elem) return;

    this.button.elem.classList.toggle("input-slider");
    window.setTimeout(function(){this.button.elem.innerHTML = this.button.innerHTML;}.bind(this), 100);
    this.button.input = false;
  }
}

function pauseShaderUpdate(e, fluentDoc){
  fluentDoc.shaderPause = !fluentDoc.shaderPause;

  this.toggle = !this.toggle;
  return fluentDoc;
}

function hideGridUpdate(e, fluentDoc){
  let toggleString = "0\n";

  if (!this.factors.grid){
    toggleString = "1\n";
  }

  let shader = fluentDoc.shader;
  //change #define
  let insString = "#define BG_GRID ";
  let insIndex = shader.indexOf(insString);
  insIndex += insString.length;

  let startShader = shader.slice(0, insIndex);
  let endShader = shader.slice(insIndex+2);

  startShader += toggleString;
  shader = startShader + endShader;
  fluentDoc.shader = shader;
  fluentDoc.shaderUpdate = true;

  this.factors.grid = !this.factors.grid;

  this.toggle = !this.toggle;
  return fluentDoc;
}

function endPLineUpdate(e, fluentDoc){

  let shaderUpdate = fluentDoc.currEditItem.bakePolyLineFunction(fluentDoc.shader);
  fluentDoc.shader = fluentDoc.currEditItem.bakePolyLineCall(shaderUpdate);
  fluentDoc.shaderUpdate = true;

  fluentDoc.currEditItem = new PolyLine(fluentDoc.resolution, fluentDoc.editWeight, fluentDoc.dataSize);
  fluentDoc.editItems.push(fluentDoc.currEditItem);

  fluentDoc.editItemIndex++;

  this.toggle = !this.toggle;
  return fluentDoc;
}

function escPLineUpdate(e, fluentDoc){
  //remove all points from curr edit item before ending this polyline
  for (let p of fluentDoc.currEditItem.pts){
    var index = fluentDoc.pts.findIndex(i => i.id === p.id);

    fluentDoc.pts.splice(index, 1);
    fluentDoc.tree.remove(p);
  }

  fluentDoc.currEditItem = new PolyLine(fluentDoc.resolution, fluentDoc.editWeight, fluentDoc.dataSize);

  this.toggle = !this.toggle;
  return fluentDoc;
}

function screenshotUpdate(e, fluentDoc){
  fluentDoc.screenshot = true;
  this.toggle = !this.toggle;
  return fluentDoc;
}


//not ideal behaviour because one has to move mouse
//someday may implement a modifier update function
function lineWeightMv(e, fluentDoc){
  if (this.toggle == false) return null;

  if (fluentDoc.editWeight != this.factors.weight){
    fluentDoc.editWeight = this.factors.weight;
    fluentDoc.currEditItem.weight = this.factors.weight;
    return fluentDoc;
  }

  return null;
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
    let state = _state.clone();

    this.incrementIndex();

    this.stack[this.index] = state;

    console.log(this);
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

    //List of polyline objects
    //Eventually this will become a full scene graph of some sort
    //current editItem
    this.editWeight = 0.001;
    this.editItemIndex = 0;
    this.currEditItem = new PolyLine(this.resolution, this.editWeight, this.dataSize);
    this.editItems = [this.currEditItem];

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
    // let elem = Object.assign({}, this.elem);

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

    newDoc.editWeight = this.editWeight;
    newDoc.editItemIndex = this.editItemIndex;

    let currEditItem = this.currEditItem.clone();
    let editItems = [];
    for (let item of this.editItems){editItems.push(item.clone());}
    newDoc.editItems = editItems;

    newDoc.currEditItem = currEditItem;
    newDoc.editItems = editItems;

    return newDoc;
  }
}

//idea is to allow the creation of modes if/when that's necessary
//modes are going to be collections of UIModifiers
class UIMode{
  //bool, [], functions
  constructor(name, toggle, modifiers, enter, exit, mv, up, dwn){
    this.name = name;
    this.toggle = toggle;
    this.modifiers = modifiers;
    this.enter = enter;
    this.exit = exit;
    //these should basically all be defined for every mode
    if(mv) this.mv = mv;
    if(up) this.up = up;
    if(dwn) this.dwn = dwn;
  }
}

//Modifier functions return null or a cloned modified FluentDoc
//we can also include a list of what's changed
//or we could check that it is a valid state for the program
//I think there are ways of handling problems that might arise later
class UIModifier{
  //clck
  constructor(name, tag, keyCut, onUpdate, clck, _toggle, _factors, mv, up, dwn){
    this.name = name;
    this.tag = tag;
    this.keyCut = keyCut;

    //whether this modifiers move function should be called on move or onUpdate
    this.onUpdate = onUpdate;

    //tag is either snap, edit, view, export
    this.clck = clck.bind(this);
    this.toggle = _toggle || false;
    this.factors = _factors || {factor:1.0};

    this.button = null;

    if(mv){
      this.mv = mv.bind(this);
    }
    if(up){
      this.up = up.bind(this);
    }
    if(dwn){
      this.dwn = dwn.bind(this);
    }

    // window.addEventListener('keyup', this.keyUp.bind(this));
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

//Simple point class (for insertion into kdTree)
//Holds information for kdTree / UI and for fragment shader
class Point{
  constructor(x, y, texRef, _texData, _shapeID, _tag){
    this.x = x;
    this.y = y;
    //texture coordinates can be reconstructed from this and dataSize
    this.texRef = texRef;

    //half float data will be stored here for future use in bake function
    this.texData = _texData || [];

    //for selection by point
    this.shapeID = _shapeID || "";

    //for filtering point selection
    this.tag = _tag || "none";

    this.id = (+new Date).toString(36).slice(-8);
  }
  clone(){
    let x = this.x;
    let y = this.y;
    let texRef = this.texRef;
    let texData = [];
    let shapeID = this.shapeID;
    let tag = this.tag;
    let id = this.id;

    for (let t of this.texData) texData.push(t);

    let newPt = new Point(x, y, texRef, texData, shapeID, tag);
    newPt.id = id;

    return newPt;
  }
}

//PolyPoint is an array of points, a texture representation and properties
//Another class e.g. PolyLine extends PolyPoint to manipulate and bake
class PolyPoint {

  //creates empty PolyPoint object
  constructor(resolution, _weight, _dataSize){
    this.resolution = resolution;

    this.dataSize = _dataSize || 16;

    //input is 1 to 20 divided by 2500
    this.weight = _weight || .002,

    //list of points
    this.pts=[];

    this.cTexel = 0;

    this.data = new Uint16Array(4 * this.dataSize * this.dataSize);

    this.ptsTex = new THREE.DataTexture(this.data, this.dataSize, this.dataSize, THREE.RGBAFormat, THREE.HalfFloatType);

    this.ptsTex.magFilter = THREE.NearestFilter;
    this.ptsTex.minFilter = THREE.NearestFilter;

    this.id = (+new Date).toString(36).slice(-8);
  }

  clone(){
    let resolution = this.resolution.clone();
    let weight = this.weight;
    let dataSize = this.dataSize;

    let newPolyPoint = new PolyPoint(resolution, weight, dataSize);

    let pts = [];
    for (let p of this.pts){ pts.push(p.clone());};
    let cTexel = this.cTexel;

    newPolyPoint.pts = pts;
    newPolyPoint.cTexel = cTexel;

    let data = new Uint16Array(this.data);
    let ptsTex = new THREE.DataTexture(data, dataSize, dataSize, THREE.RGBAFormat, THREE.HalfFloatType);

    newPolyPoint.data = data;
    newPolyPoint.ptsTex = ptsTex;

    let id = this.id;
    newPolyPoint.id = id;

    return newPolyPoint;
  }

  //takes x, y, and tag
  //adds point to polyPoint
  //point x, y are stored as HalfFloat16
  //https://github.com/petamoriken/float16
  addPoint(x, y, tag){
    let index = this.cTexel * 4;

    let hFloatX = x / this.resolution.x;
    let hFloatY = y / this.resolution.y;
    let hFloatYFlip = (this.resolution.y - y) / this.resolution.y;

    //use view.setFloat16() to set the digits in the DataView
    //then use view.getUint16 to retrieve and write to data Texture
    let buffer = new ArrayBuffer(64);
    let view = new DataView(buffer);

    view.getFloat16 = (...args) => getFloat16(view, ...args);
    view.setFloat16 = (...args) => setFloat16(view, ...args);

    let endD = this.endD;

    // console.log(this.endD);

    view.setFloat16(0, hFloatX, endD);
    view.setFloat16(16, hFloatYFlip, endD);
    view.setFloat16(32, 1.0, endD);
    view.setFloat16(48, 1.0, endD);

    this.ptsTex.image.data[index] = view.getUint16(0, endD);
    this.ptsTex.image.data[index + 1] = view.getUint16(16, endD);
    this.ptsTex.image.data[index + 2] = view.getUint16(32, endD);
    this.ptsTex.image.data[index + 3] = view.getUint16(48, endD);

    this.ptsTex.needsUpdate = true;

    let _tag = tag || "none";
    let texData = [view.getUint16(0, endD), view.getUint16(16, endD), view.getUint16(32, endD), view.getUint16(48, endD)];

    let pt = new Point(x, y, this.cTexel, texData, this.id, _tag);

    this.pts.push(pt);

    return pt;
  }
}

class PolyLine extends PolyPoint {

  constructor(resolution, _weight, _dataSize){
    //super is how PolyPoint class is constructed
    //https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes/extends
    super(resolution, _weight, _dataSize);

    this.fragFunction = "";

  }

  clone(){
    let resolution = this.resolution.clone();
    let weight = this.weight;
    let dataSize = this.dataSize;

    let newPolyLine = new PolyLine(resolution, weight, dataSize);

    let pts = [];
    for (let p of this.pts){ pts.push(p.clone());};
    let cTexel = this.cTexel;

    newPolyLine.pts = pts;
    newPolyLine.cTexel = cTexel;

    let data = new Uint16Array(this.data);
    let ptsTex = new THREE.DataTexture(data, dataSize, dataSize, THREE.RGBAFormat, THREE.HalfFloatType);

    newPolyLine.data = data;
    newPolyLine.ptsTex = ptsTex;

    let id = this.id;
    newPolyLine.id = id;

    var fragFunction = (' ' + this.fragFunction).slice(1);

    newPolyLine.fragFunction = fragFunction;

    return newPolyLine;
  }

  //takes shader as argument, modifies string, returns modified shader
  //this will be rewritten to bake each shape as a function and a function call
  //the inputs to these functions e.g. position will be parameterized
  bakePolyLineFunction(_fragShader){
    let shader = _fragShader;

    //insert new function
    let insString = "//$INSERT FUNCTION$------";
    let insIndex = shader.indexOf(insString);
    insIndex += insString.length;

    let startShader = shader.slice(0, insIndex);
    let endShader = shader.slice(insIndex);

    // if function exists start and end should be before and after end
    let exFuncStr = '//$START-' + this.id;
    // console.log(this.id);
    // console.log(exFuncStr);
    let exFuncIndex = shader.indexOf(exFuncStr);

    if(exFuncIndex >= 0){
      startShader = shader.slice(0, exFuncIndex);
      // console.log(startShader);

      let postFuncStr = '//$END-' + this.id;
      let postIndex = shader.indexOf(postFuncStr);
      postIndex += postFuncStr.length;
      endShader = shader.slice(postIndex);
      // console.log(postFuncStr);
    }

    //create function
    let posString = '\n';
    posString += '//$START-' + this.id + '\n';

    // p is a translation for polygon
    // eventually this will be a reference to another data texture
    posString += 'void ' + this.id + '(vec2 uv, vec2 p, inout vec3 finalColor) {';

    posString += '\n\tvec2 tUv = uv - p;\n';

    let buffer = new ArrayBuffer(10);
    let view = new DataView(buffer);

    let oldPosX = 0;
    let oldPosY = 0;

    for (let p of this.pts){
      view.setUint16(0, p.texData[0]);
      let floatX = getFloat16(view, 0);
      // console.log(getFloat16(view, 0));
      // console.log(getFloat16(view, 0) * window.innerWidth);

      //this should be a property of GhostUI
      let dpr = window.devicePixelRatio;

      view.setUint16(0, p.texData[1]);
      let floatY = getFloat16(view, 0);
      // console.log(getFloat16(view, 0));
      // console.log(window.innerHeight - getFloat16(view, 0) * window.innerHeight);

      //The following matches the screenPt function in the fragment shader
      //Could think about moving this code entirely to javascript, probably smart
      floatX -= 0.5;
      floatY -= 0.5;
      floatX *= this.resolution.x / this.resolution.y;
      //I think 1.0 is where scale should go for zoom
      floatX = (floatX * this.resolution.x) / (this.resolution.x / dpr * 1.0);
      floatY = (floatY * this.resolution.y) / (this.resolution.y / dpr * 1.0);

      if(oldPosX == 0 && oldPosY ==0){
        oldPosX = floatX;
        oldPosY = floatY;

        posString += '\n\tvec2 pos = vec2(0.0);\n';
        posString += '\n\tvec2 oldPos = vec2(0.0);\n';

        // posString += '\tDrawPoint(uv, pos, finalColor);\n';

        continue;
      }else{
        posString += '\n\tpos = vec2(' + floatX + ',' + floatY + ');\n';
        posString += '\toldPos = vec2(' + oldPosX + ',' + oldPosY + ');\n';

        posString += '\tfinalColor = min(finalColor, vec3(FillLine(tUv, oldPos, pos, vec2('+ this.weight +', '+ this.weight +'), '+ this.weight +')));\n';

        // don't draw points
        // posString += '\tDrawPoint(uv, pos, finalColor);';
        oldPosX = floatX;
        oldPosY = floatY;
      }
    }

    // posString += '\tfinalColor = mix(finalColor, vec3(1.0), editOpacity);\n}\n';
    posString += '\n}\n';
    posString += '//$END-' + this.id + '\n';

    this.fragShaer = posString;
    // console.log(posString);

    startShader += posString;

    let fragShader = startShader + endShader;

    // console.log(fragShader);

    return fragShader;
  }

  //takes shader as argument, modifies string, returns modified shader
  //creates function calls that calls function already created
  //the inputs to these functions e.g. position will be parameterized
  bakePolyLineCall(_fragShader){
    let shader = _fragShader;
    let insString = "//$INSERT CALL$------";
    let insIndex = shader.indexOf(insString);
    insIndex += insString.length;

    let startShader = shader.slice(0, insIndex);
    let endShader = shader.slice(insIndex);

    let buffer = new ArrayBuffer(10);
    let view = new DataView(buffer);

    let oldPosX = 0;
    let oldPosY = 0;

    //create function
    let posString = '\n';

    // p here vec2(0.0,0.0) is a translation for polygon
    // eventually this will be a reference to another data texture
    posString += '\t' + this.id + '(uv, vec2(0.0,0.0), finalColor);\n';
    startShader += posString;

    let fragShader = startShader + endShader;

    // console.log(fragShader);

    return fragShader;
  }
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
