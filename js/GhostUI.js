
"use strict";
//keeps KD Tree of points to interact with
//adds eventListeners to points
//updates dataTexture with locations of those points
import * as THREE from './libjs/three.module.js';

class GhostUI{
  //renderer docElem necessary, others optional
  constructor(elem, shader){
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
    this.fluentDoc = new FluentDoc(elem, shader);

    //array.unshift / array.shift to push and pop from array[0];
    //this is a cool idea - will implement soon
    //this.docState = [fluentDoc];

    //MODE STATE
    this.editWeight = .002;
    this.editOpacity = 0.0;
    this.drawing = true;
    this.editPolyLn = false;

    //MODIFIERS
    // constructor(name, tag, clck, keyCut, _toggle, _factors, mv, up, dwn)
    let snapPt = new UIModifier("snapPt", "snap", "p", snapPtClck, true, {dist:200}, snapPtMv, snapPtUp);
    let snapRef = new UIModifier("snapRef", "snap", "s", snapRefClck, false, {angle:45}, snapRefMv, snapRefUp);
    let snapGlobal = new UIModifier("snapGlobal", "snap", "Shift", snapGlobalClck, false, {angle:90}, snapGlobalMv, snapGlobalUp);
    let snapGrid = new UIModifier("snapGrid", "snap", "g", snapGridClck, false, {}, snapGridMv, snapGridUp);

    let lineWeight = new UIModifier("lineWeight", "edit", "w", lineWeightClck, true, {weight:0.002}, lineWeightMv);

    //global modifiers get GhostUI context bound
    let screenshot = new UIModifier("screenshot", "global", "l", screenshotClck.bind(this), true);
    this.initButton(screenshot);
    let pauseShader = new UIModifier("pauseShader", "global", "/", pauseShaderClck.bind(this), true);
    this.initButton(pauseShader);
    let endPLine = new UIModifier("endPLine", "global", "Enter", endPLineClck.bind(this), true);

    //MODES
    //constructor(toggle, modifiers, enter, exit, mv, up, dwn){
    this.modes = [
      new UIMode("draw", true, [snapGlobal, snapRef, snapGrid, snapPt, lineWeight], drawEnter, drawExit, drawMv, drawUp)
    ]

    this.initUIModeButtons();

    this.modes[0].enter();

    document.getElementById("draw-shapes").addEventListener('mouseup', this.mouseUp.bind(this));
    window.addEventListener('mousemove', this.mouseMove.bind(this));

    return this;
  }

  initUIModeButtons(){
    for(let m of this.modes[0].modifiers){
      let buttonElem = document.getElementById(m.name);
      if (!buttonElem) continue;
      let newButton = new Button(buttonElem, m)
      m.button = newButton;
    }
  }

  initButton(uiMod){
    let buttonElem = document.getElementById(uiMod.name);
    if (!buttonElem) return;
    let newButton = new Button(buttonElem, uiMod);
    uiMod.button = newButton;
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

  mouseUp( e ) {

    // let evPt = {
    //   x: e.clientX,
    //   y: e.clientY
    // };

    for (let mode of this.modes){
      if(mode.toggle == true){
        console.log(mode.name);
        this.fluentDoc = mode.up(e, this.fluentDoc);
      }
    }
  }

  mouseMove(e) {

    let evPt = {
      x: e.clientX,
      y: e.clientY
    };

    this.fluentDoc.mPt.x = evPt.x / this.fluentDoc.elem.width;
    this.fluentDoc.mPt.y = (this.fluentDoc.elem.height - evPt.y) / this.fluentDoc.elem.height;

    for (let mode of this.modes){
      if(mode.toggle == true){
        this.fluentDoc = mode.mv(e, this.fluentDoc);
      }
    }
  }
}

function snackHint(text, _bgColor){
  let snackbar = document.getElementById('snackbar');

  if(snackbar.classList.contains('show')) return;

  let bgColor = _bgColor || "rgba(237, 55, 67, .75)";

  snackbar.innerHTML = text;
  snackbar.style.background = bgColor;

  snackbar.classList.toggle('show');
  setTimeout(function(){ snackbar.classList.toggle('show'); }, 2000);
}

function drawEnter(){
  console.log(this);
  snackHint("Begin Drawing!");
}

function drawExit(){
  snackHint("End Drawing!");
}


//okay so this is one idea that may become necessary
// function drawUpdate(_fluentDoc){
//   for (let m of this.modifiers){
//     if(!m.update) continue;
//
//   }
// }

function drawMv(e, _fluentDoc){
  if (this.toggle == false) return null;
  let fluentDoc = Object.assign({}, _fluentDoc);

  for (let m of this.modifiers){
    if(!m.mv) continue;
    let modState = m.mv(e, fluentDoc)
    if(!modState) continue;
    fluentDoc = modState;
  }
  return fluentDoc;
}

function drawUp(e, _fluentDoc){
  if (this.toggle == false) return null;
  let fluentDoc = Object.assign({}, _fluentDoc);

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

  fluentDoc.tree.insert(plPt);
  fluentDoc.currEditItem.cTexel += 1;

  return fluentDoc;
}

//for right now Global UI Modifiers get GhostUI bound
function screenshotClck(_fluentDoc){
  this.fluentDoc.screenshot = true;
}

//for right now Global UI Modifiers get GhostUI bound
function pauseShaderClck(_fluentDoc){
    this.fluentDoc.shaderPause = !this.fluentDoc.shaderPause;
}

//for right now Global UI Modifiers get GhostUI bound
function endPLineClck(_fluentDoc){
    // console.log(this);

    let shaderUpdate = this.fluentDoc.currEditItem.bakePolyLineFunction(this.fluentDoc.shader);
    this.fluentDoc.shader = this.fluentDoc.currEditItem.bakePolyLineCall(shaderUpdate);
    this.fluentDoc.shaderUpdate = true;

    this.fluentDoc.currEditItem = new PolyLine(this.fluentDoc.resolution, this.fluentDoc.editWeight, this.fluentDoc.dataSize);
    this.fluentDoc.editItems.push(this.fluentDoc.currEditItem);

    this.fluentDoc.editItemIndex++;
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
    // this.elem.style.width = '5vmin';
    window.setTimeout(function(){this.button.elem.innerHTML = this.button.innerHTML;}.bind(this), 900);
    this.button.input = false;
  }
}


function snapPtClck(e){
  snackHint("Snap to a Previous Point");
  this.toggle = !this.toggle;
}

function snapRefClck(e){
  snackHint("Snap to Angle From Previous Line");
  this.toggle = !this.toggle;
}

function snapGlobalClck(e){
  snackHint("Snap to Global Angle");
  this.toggle = !this.toggle;
}

function snapGridClck(e){
  snackHint("Snap to Grid");
  this.toggle = !this.toggle;
}

//not ideal behaviour because one has to move mouse
//someday may implement the modifier update function
function lineWeightMv(e, _fluentDoc){
  if (this.toggle == false) return null;
  let fluentDoc = Object.assign({}, _fluentDoc);
  // console.log(this);
  if (fluentDoc.editWeight != this.factors.weight){
    fluentDoc.editWeight = this.factors.weight;
    fluentDoc.currEditItem.weight = this.factors.weight;
    return fluentDoc;
  }

  return null;
}

function snapPtMv(e, _fluentDoc){
  if (this.toggle == false) return null;
  let fluentDoc = Object.assign({}, _fluentDoc);

  let evPt = {
    x: e.clientX,
    y: e.clientY
  };

  let ptNear = fluentDoc.tree.nearest(evPt, 1);

  if (ptNear.length > 0 && ptNear[0][1] < this.factors.dist){
    ptNear = ptNear[0][0];
    fluentDoc.mPt.x = ptNear.x / fluentDoc.resolution.x;
    fluentDoc.mPt.y = (fluentDoc.resolution.y - ptNear.y) / fluentDoc.resolution.y;

    return fluentDoc;
  }
  else{
    return null;
  }
}

function snapRefMv(e, _fluentDoc){
  let fluentDoc = Object.assign({}, _fluentDoc);
  if (this.toggle == false) return null;

  let evPt = {
    x: e.clientX,
    y: e.clientY
  };

  if (fluentDoc.currEditItem.pts.length > 1){
    let ptPrevEnd = fluentDoc.currEditItem.pts[fluentDoc.currEditItem.pts.length - 1];
    let ptPrevBeg = fluentDoc.currEditItem.pts[fluentDoc.currEditItem.pts.length - 2];

    //previous line, syntax?
    let lnPrev = new THREE.Vector2().subVectors(ptPrevEnd, ptPrevBeg);
    let lnCurr = new THREE.Vector2().subVectors(ptPrevEnd, evPt);
    let lnCurrN = new THREE.Vector2().subVectors(ptPrevEnd, evPt);

    let dot = lnPrev.normalize().dot(lnCurrN.normalize());
    let det = lnPrev.x * lnCurrN.y - lnPrev.y * lnCurrN.x

    let angle = Math.atan2(det, dot) * (180 / Math.PI);

    let snapA = (Math.round(angle / this.factors.angle) * this.factors.angle);

    snapA = (snapA * (Math.PI / 180) + lnPrev.angle());

    let snapX = ptPrevEnd.x - lnCurr.length() * Math.cos(snapA);
    let snapY = ptPrevEnd.y - lnCurr.length() * Math.sin(snapA);

    fluentDoc.mPt.x = snapX / fluentDoc.elem.width;
    fluentDoc.mPt.y = (fluentDoc.elem.height - snapY) / fluentDoc.elem.height;

    return fluentDoc;
  }
  else{
    return null;
  }
}

function snapGlobalMv(e, _fluentDoc){
  if (this.toggle == false) return null;
  let fluentDoc = Object.assign({}, _fluentDoc);

  let evPt = {
    x: e.clientX,
    y: e.clientY
  };

  if (fluentDoc.currEditItem.pts.length > 0){
    let prevX = 0;
    let prevY = 0;

    if (fluentDoc.currEditItem.pts.length >= 1){
      prevX = fluentDoc.currEditItem.pts[fluentDoc.currEditItem.pts.length - 1].x;
      prevY = fluentDoc.currEditItem.pts[fluentDoc.currEditItem.pts.length - 1].y;
    }

    let prevPt = {
      x: prevX,
      y: prevY
    };

    //previous line
    let lnCurr = new THREE.Vector2().subVectors(prevPt, evPt);

    let angle = lnCurr.angle()* (180 / Math.PI);

    //global angle
    let gAngle = 90;

    let snapA = (Math.round(angle / gAngle) * gAngle);
    snapA = (snapA * (Math.PI / 180));

    let snapX = prevPt.x - lnCurr.length() * Math.cos(snapA);
    let snapY = prevPt.y - lnCurr.length() * Math.sin(snapA);

    fluentDoc.mPt.x = snapX / fluentDoc.elem.width;
    fluentDoc.mPt.y = (fluentDoc.elem.height - snapY) / fluentDoc.elem.height;

    return fluentDoc;
  }
  else{
    return null;
  }
}

function snapGridMv(e, _fluentDoc){
  if (this.toggle == false) return null;
  let fluentDoc = Object.assign({}, _fluentDoc);

  let evPt = {
    x: e.clientX,
    y: e.clientY
  };

  //offset and scale deteremined in drawGrid()
  //current position, divided by grid.scaleX, round, times scaleX
  let x = Math.round((evPt.x - 0.5 * fluentDoc.gridScaleX) / fluentDoc.gridScaleX) * fluentDoc.gridScaleX + fluentDoc.gridOffX;
  let y = Math.round((evPt.y - 0.5 * fluentDoc.gridScaleY) / fluentDoc.gridScaleY) * fluentDoc.gridScaleY + fluentDoc.gridOffY;

  fluentDoc.mPt.x = x / fluentDoc.elem.width;
  fluentDoc.mPt.y = (fluentDoc.elem.height - y) / fluentDoc.elem.height;

  return fluentDoc;
}

function snapPtUp(e, _fluentDoc){
  if (this.toggle == false) return null;
  let fluentDoc = Object.assign({}, _fluentDoc);

  let evPt = {
    x: e.clientX,
    y: e.clientY
  };

  let ptNear = fluentDoc.tree.nearest({x: evPt.x, y: evPt.y}, 1);

  if (ptNear.length > 0 && ptNear[0][1] < 100){
    let pt = ptNear[0][0];
    fluentDoc.addPt.x = pt.x;
    fluentDoc.addPt.y = pt.y;
    fluentDoc.addPt.tag = "plPoint";

    return fluentDoc;
  }
  else{
    return null;
  }
}

function snapRefUp(e, _fluentDoc){
  let fluentDoc = Object.assign({}, _fluentDoc);
  if (this.toggle == false) return null;

  let addPt = {
    x: 0,
    y: 0,
    tag: ""
  }

  if (fluentDoc.currEditItem.pts.length > 1){
    //would like for there to just be one point representation in js
    fluentDoc.addPt.x = fluentDoc.mPt.x * fluentDoc.resolution.x;
    fluentDoc.addPt.y = fluentDoc.elem.height - (fluentDoc.mPt.y * fluentDoc.resolution.y);
    fluentDoc.addPt.tag = "plPoint";

    return fluentDoc;
  }
  else{
    return null;
  }
}

function snapGlobalUp(e, _fluentDoc){
  let fluentDoc = Object.assign({}, _fluentDoc);
  if (this.toggle == false) return null;

  let addPt = {
    x: 0,
    y: 0,
    tag: ""
  }

  if (fluentDoc.currEditItem.pts.length > 1){
    //would like for there to just be one point representation in js
    fluentDoc.addPt.x = fluentDoc.mPt.x * fluentDoc.resolution.x;
    fluentDoc.addPt.y = fluentDoc.elem.height - (fluentDoc.mPt.y * fluentDoc.resolution.y);
    fluentDoc.addPt.tag = "plPoint";

    return fluentDoc;
  }
  else{
    return null;
  }
}

function snapGridUp(e, _fluentDoc){
  let fluentDoc = Object.assign({}, _fluentDoc);
  if (this.toggle == false) return null;

  //would like for there to just be one point representation in js
  fluentDoc.addPt.x = fluentDoc.mPt.x * fluentDoc.resolution.x;
  fluentDoc.addPt.y = fluentDoc.elem.height - (fluentDoc.mPt.y * fluentDoc.resolution.y);
  fluentDoc.addPt.tag = "plPoint";

  return fluentDoc;
}

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
    // so scaleX and scaleY are the same, set scale to 1 for explanation
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

//let's say it returns a new fluentDoc
//we can also include a list of what's changed
//or we could check that it is a valid state for the program
//I think there are ways of handling problems that might arise later
class UIModifier{
  //clck
  constructor(name, tag, keyCut, clck, _toggle, _factors, mv, up, dwn){
    this.name = name;
    this.tag = tag;
    this.keyCut = keyCut;

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

    window.addEventListener('keyup', this.keyUp.bind(this));
  }

  keyUp(e){
    if(e.key == this.keyCut){
      this.clck();
      // console.log(e);
      // console.log(this);
    }
  }

  // createButton(){
  //
  // }
}

//clickable draggable button, onclick is a function
class Button{
  constructor(elem, uimodifier){
    //for offsets, could clean up these names
    this.pos1 = 0;
    this.pos2 = 0;
    this.pos3 = 0;
    this.pos4 = 0;

    this.elem = elem;

    this.innerHTML = this.elem.innerHTML;

    //bool for checking if we are dragging or clicking the button
    this.click = true;
    //bool for checking if input method is active
    this.input = false;
    //use for locking position of buttons
    this.pinned = false;

    this.uimodifier = uimodifier;

    //dbl click functions for picking
    // if (_ondblclick){
    //   elem.ondblclick = _ondblclick.bind(this);
    // }

    //original positions
    let style = window.getComputedStyle(elem);
    this.top = style.getPropertyValue('top');
    this.left = style.getPropertyValue('left');

    this.onclick = this.uimodifier.clck.bind(this.uimodifier);

    //what happens onclick
    elem.onclick = this.onclick;
    elem.onmousedown = this.dragMouseDown.bind(this);

    //interpret type and color from html element
    let classes = elem.classList;
    let buttonType = "";

    for (let c of classes){
      if(c.indexOf("edit") >= 0){
        buttonType = "edit";
        break;
      }
      if(c.indexOf("snap") >= 0){
        buttonType = "snap";
        break;
      }
      if(c.indexOf("view") >= 0){
        buttonType = "view";
        break;
      }
      if(c.indexOf("export") >= 0){
        buttonType = "export";
        break;
      }
    }

    // too finicky
    // let keyCutIndex = this.innerHTML.indexOf('button-dot') + 'button-dot'.length;
    // let _keyCut = this.innerHTML.slice(keyCutIndex);
    // keyCutIndex = _keyCut.indexOf('>') + 1;
    // this.keyCut = _keyCut.slice(keyCutIndex, keyCutIndex + 1);

    this.contents = {
      name: this.name,
      type: buttonType,
      background: style.background,
      innerHTML: this.innerHTML,
    }

    // console.log(this.contents);
  }

  dragMouseDown(e) {
    e = e || window.event;
    if (this.input) return;

    e.preventDefault();

    // get the mouse cursor position at startup:
    this.pos3 = e.clientX;
    this.pos4 = e.clientY;

    document.onmouseup = this.closeDragElement.bind(this);
    // call a function whenever the cursor moves:
    document.onmousemove = this.elementDrag.bind(this);
  }

  elementDrag(e) {
    e = e || window.event;
    e.preventDefault();

    let unit = Math.min(window.innerHeight, window.innerWidth);
    unit *= 0.05;

    //Crude snapping
    // let cliX = e.clientX - (e.clientX % unit) + 1/2 * unit;
    // let cliY = e.clientY - (e.clientY % unit) + 1/2 * unit;

    let cliX = e.clientX;
    let cliY = e.clientY;

    // calculate the new cursor position:
    this.pos1 = this.pos3 - cliX;
    this.pos2 = this.pos4 - cliY;
    this.pos3 = cliX;
    this.pos4 = cliY;

    // set the element's new position:
    this.elem.style.top = (this.elem.offsetTop - this.pos2) + "px";
    this.elem.style.left = (this.elem.offsetLeft - this.pos1) + "px";
  }

  closeDragElement() {
    let style = window.getComputedStyle(this.elem);

    if(this.top == style.getPropertyValue('top') && this.left == style.getPropertyValue('left')){
      this.click = true;
    }
    else{
      this.click = false;
    }

    this.top = style.getPropertyValue('top');
    this.left = style.getPropertyValue('left');

    // stop moving when mouse button is released:
    document.onmouseup = null;
    document.onmousemove = null;
  }

  snackHint(){
    let snackbar = document.getElementById('snackbar');

    if(snackbar.classList.contains('show')) return;

    snackbar.innerHTML = this.contents.name;
    snackbar.style.background = this.contents.background;

    snackbar.classList.toggle('show');
    setTimeout(function(){ snackbar.classList.toggle('show'); }, 2000);
  }

  //experiment to add double click functionality
  // static linearSlider(event){
  //   console.log(event);
  //   console.log(this);
  // }

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
}

//PolyPoint is an array of points, a texture representation and properties
//Another class e.g. PolyLine extends PolyPoint to manipulate and bake
//These classes are the sdfui primitives
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

    console.log(fragShader);

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
