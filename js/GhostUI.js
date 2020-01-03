"use strict";
//keeps KD Tree of points to interact with
//adds eventListeners to points
//updates dataTexture with locations of those points
import * as THREE from './libjs/three.module.js';

class GhostUI{
  //renderer docElem necessary, others optional
  constructor(elem, shader, _resolution){
    this.elem = elem;
    this.resolution = new THREE.Vector2(elem.width, elem.height) || _resolution;

    this.shader = shader;
    this.shaderUpdate = false;

    //square datatexture
    this.dataSize = 16;

    //mousePos
    this.mPt = new THREE.Vector3(0, 0, 1.0);

    //currentTexel
    //this.cTexel =  0;
    //texel offset to access center of texel
    this.oTexel = 1 / this.dataSize / 2.0;

    //grid scale
    this.scale = 48;

    //all Points for KD Tree
    this.pts = [];

    //all clickable / snappable points
    this.tree = new kdTree(this.pts, this.pointDist, ["x", "y"]);

    this.editWeight = .002;

    //current Polyline
    this.currPolyLineIndex = 0;
    this.currPolyLine = new PolyLine(this.resolution, this.editWeight, this.dataSize);

    //List of polyline objects
    this.pLines = [this.currPolyLine];

    //are we drawing?
    this.drawing = true;

    //Snap to previous line by snap angle
    this.snapPrev = false;
    this.snapGlobal = false;
    this.snapAngle = 45;
    this.snapGrid = false;

    // below are unused as of now
    this.snapGrid = false;
    this.snapObj = true;

    this.grid = {
      offX : 0.0,
      offY : 0.0,
      scaleX : 0.0,
      scaleY : 0.0
    }

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

    document.getElementById("draw-shapes").addEventListener('mouseup', this.mouseUp.bind(this));
    window.addEventListener('mousemove', this.mouseMove.bind(this));

    window.addEventListener('keyup', this.keyUp.bind(this));
    window.addEventListener('keydown', this.keyDown.bind(this));

    //establishes grid offsets
    this.drawGrid();

    return this;
  }

  //distance function used by kdTree
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

    this.grid.scaleX = scaleX;
    this.grid.scaleY = scaleY;

    //There has got to be a more elegant way to do this...
    //Is the remainder odd or even?
    let r = ((this.resolution.x / scaleX) - (this.resolution.x / scaleX) % 1) % 2;
    //If even, add scaleX * 0.5;
    r = Math.abs(r - 1);
    // let offX = (((this.resolution.x / scaleX) % 2) * scaleX) * 0.5 + scaleX * 0.5;
    let offX = (((this.resolution.x / scaleX) % 1) * scaleX) * 0.5 + ((scaleX * 0.5) * r);

    let offY = scaleY * 0.5;

    this.grid.offX = offX;
    this.grid.offY = offY;

    // console.log("this.scale = " + this.scale);
    // console.log("offX = " + offX);
    // console.log("offY = " + offY);
    // console.log("scaleX = " + scaleX);
    // console.log("scaleY = " + scaleY);

    // console.log(this.grid);

    // for (let i = offY; i <= this.resolution.y; i+=scaleY){
    //   for (let j = offX; j <= this.resolution.x; j+=scaleX){
    //     this.addSVGCircle("blah", j, i, 2);
    //   }
    // }
  }

  //returns svg element
  //id as string; x & y as pixel coords; opacity as 0 -1, fill & stroke as colors
  addSVGCircle(id, x, y, r, opacity, fill, stroke, strokeWeight){
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

  // Helper to save a HalfFloat16 data texture
  // Doesn't work yet
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

  mouseUp( event ) {
    if (!this.drawing && this.currPolyLine.pts.length >= 1) return;

    let currPt = {
      x: event.clientX,
      y: event.clientY
    };

    let addPt = {
      x: 0,
      y: 0,
      tag: ""
    }

    let ptNear = this.tree.nearest({x: currPt.x, y: currPt.y}, 1);

    if (ptNear.length > 0 && ptNear[0][1] < 100){
      let pt = ptNear[0][0];
      addPt.x = pt.x;
      addPt.y = pt.y;
      addPt.tag = "plPoint";
    }
    else if ((this.currPolyLine.pts.length >= 1 && this.snapGlobal) || (this.currPolyLine.pts.length > 1 && this.snapPrev) || this.snapGrid){
      //would like for there to just be one point representation in js
      addPt.x = this.mPt.x * this.resolution.x;
      addPt.y = this.elem.height - (this.mPt.y * this.resolution.y);
      addPt.tag = "plPoint";
    }
    else{
      addPt.x = currPt.x;
      addPt.y = currPt.y;
      addPt.tag = "plPoint";
    }

    let plPt = this.currPolyLine.addPoint(addPt.x, addPt.y, addPt.tag);

    this.tree.insert(plPt);

    this.currPolyLine.cTexel += 1;
  }

  //On mouse move, contains snapping logic, would be good to factor out
  //Task: factor out snapping logic and set mPt at the end
  mouseMove( event ) {

    let evPt = {
      x: event.clientX,
      y: event.clientY
    };

    let ptNear = this.tree.nearest(evPt, 1);

    //Object snap on pt closer than 200, excluding most recent point
    if (ptNear.length > 0 && ptNear[0][1] < 100){
      // console.log(ptNear[0][0]);
      // console.log(this.currPolyLine.pts[this.currPolyLine.pts.length - 1].screenPt);

      ptNear = ptNear[0][0];
      this.mPt.x = ptNear.x / this.elem.width;
      this.mPt.y = (this.elem.height - ptNear.y) / this.elem.height;
    }
    //Snap grid
    else if (this.snapGrid){
      //offset and scale deteremined in drawGrid()
      //current position, divided by grid.scaleX, round, times scaleX
      let x = Math.round((evPt.x - 0.5 * this.grid.scaleX) / this.grid.scaleX) * this.grid.scaleX + this.grid.offX;
      let y = Math.round((evPt.y - 0.5 * this.grid.scaleY) / this.grid.scaleY) * this.grid.scaleY + this.grid.offY;

      this.mPt.x = x / this.elem.width;
      this.mPt.y = (this.elem.height - y) / this.elem.height;
    }
    //Snap global angle
    else if (this.snapGlobal && this.currPolyLine.pts.length >= 1){
      // console.log(this.pts.length);
      let prevX = 0;
      let prevY = 0;

      if (this.currPolyLine.pts.length >= 1){
        prevX = this.currPolyLine.pts[this.currPolyLine.pts.length - 1].screenPt.x;
        prevY = this.currPolyLine.pts[this.currPolyLine.pts.length - 1].screenPt.y;
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

      this.mPt.x = snapX / this.elem.width;
      this.mPt.y = (this.elem.height - snapY) / this.elem.height;
    }
    //Snap prev
    else if (this.snapPrev && this.currPolyLine.pts.length > 1){
      let ptPrevEnd = this.currPolyLine.pts[this.currPolyLine.pts.length - 1].screenPt;
      let ptPrevBeg = this.currPolyLine.pts[this.currPolyLine.pts.length - 2].screenPt;

      //previous line, syntax?
      let lnPrev = new THREE.Vector2().subVectors(ptPrevEnd, ptPrevBeg);
      let lnCurr = new THREE.Vector2().subVectors(ptPrevEnd, evPt);
      let lnCurrN = new THREE.Vector2().subVectors(ptPrevEnd, evPt);

      let dot = lnPrev.normalize().dot(lnCurrN.normalize());
      let det = lnPrev.x * lnCurrN.y - lnPrev.y * lnCurrN.x

      let angle = Math.atan2(det, dot) * (180 / Math.PI);

      let snapA = (Math.round(angle / this.snapAngle) * this.snapAngle);

      snapA = (snapA * (Math.PI / 180) + lnPrev.angle());

      let snapX = ptPrevEnd.x - lnCurr.length() * Math.cos(snapA);
      let snapY = ptPrevEnd.y - lnCurr.length() * Math.sin(snapA);

      this.mPt.x = snapX / this.elem.width;
      this.mPt.y = (this.elem.height - snapY) / this.elem.height;
    }
    //Typ
    else{
      this.mPt.x = evPt.x / this.elem.width;
      this.mPt.y = (this.elem.height - evPt.y) / this.elem.height;
    }
  }

  //would like to move these to buttons
  keyUp(event){
  	var key = event.key;
    console.log(key);

  	switch(key){
      //rebuild kdTree
      case "r":
        console.log(this.tree.balanceFactor());
        this.tree = new kdTree(this.pts, this.pointDist, ["x", "y"]);
        console.log(this.tree.balanceFactor());
        break;
      //save dataTexture
      case "x":
        // console.log(this.ptsTex);
        this.saveDataTHalfFloat16(this.currPolyLine.ptsTex.image.data, "ptsTex", 16, 16);
        break;
      //snapPrev
      case "s":
        this.snapPrev = !this.snapPrev;
        // console.log(this.snapPrev);
        break;
      //snapGrid
      case "g":
        this.snapGrid = !this.snapGrid;
        // console.log(this.snapPrev);
        break;
      //snapGlobal, on hold of Shift
      case "Shift":
        this.snapGlobal = false;
        break;
      //End drawing
      case "Escape":
        console.log(this.tree);
        for (let p of this.currPolyLine.pts){
          this.tree.remove(p.screenPt);
          // console.log(this.tree);
        }

        this.currPolyLine = new PolyLine(this.resolution, this.editWeight, this.dataSize);
        break;
      //End drawing
      case "Enter":
        // this.drawing = !this.drawing;
        // this.mPt.z *= -1.0;
        //
        // if (this.drawing){
          this.currPolyLine.bakePolyLine(this.fragShader);

          this.currPolyLine = new PolyLine(this.resolution, this.editWeight, this.dataSize);
          this.pLines.push(this.currPolyLine);
          console.log(this.pLines);
          this.currPolyLineIndex++;
        // }

        break;
  	}
  }

  keyDown(event){
  	var key = event.key;
  	switch(key){
      //snapGlobal, on hold of Shift
      case "Shift":
        this.snapGlobal = true;
        console.log(this.snapGlobal);
        break;
      case "s":
        break;
  	}
  }

  // update(){
  //   this.currPolyLine.weight = this.currWeight;
  // }

}

//clickable draggable button, onclick is a function
class Button{
  constructor(elem, onclick, _ondblclick){
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

    //dbl click functions for picking
    if (_ondblclick){
      elem.ondblclick = _ondblclick.bind(this);
    }
    // console.log(onclick);

    //original positions
    let style = window.getComputedStyle(elem);
    this.top = style.getPropertyValue('top');
    this.left = style.getPropertyValue('left');

    //what happens onclick
    elem.onclick = onclick.bind(this);

    elem.onmousedown = this.dragMouseDown.bind(this);
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

  //experiment to add double click functionality
  static linearSlider(event){
    console.log(event);
    console.log(this);
  }

}

//Simple point class for insertion into kdTree
//Holds information for kdTree / UI and for fragment shader
class Point{
  constructor(x, y, texRef, _texData, _tag){
    this.x = x;
    this.y = y;
    //texture coordinates can be reconstructed from this and dataSize
    this.texRef = texRef;

    //half float data will be stored here for future use in bake function
    this.texData = _texData || [];

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

    let pt = new Point(x, y, this.cTexel, texData, _tag);

    // this needs to be at the GhostUI level
    // this.kdTree.insert(pt);

    // here's an idea
    // this.ptsTexNeedsUpdate = true;

    //this.addSVGCircle(tag, x, y, 2);

    this.pts.push(pt);

    //console.log(twoPts);
    return pt;
  }
}

class PolyLine extends PolyPoint {

  constructor(resolution, _weight, _dataSize){
    //super is how PolyPoint class is constructed
    //https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes/extends
    super(resolution, _weight, _dataSize);
  }

  //takes shader as argument, modifies string, returns modified shader
  //this will be rewritten to bake each shape as a function and a function call
  //the inputs to these functions e.g. position will be parameterized
  bakePolyLine(_fragShader){
    let shader = _fragShader;
    let insString = "//$INSERT$------";
    let insIndex = shader.indexOf(insString);
    insIndex += insString.length;

    let startShader = shader.slice(0, insIndex);
    let endShader = shader.slice(insIndex);

    let buffer = new ArrayBuffer(10);
    let view = new DataView(buffer);

    let oldPosX = 0;
    let oldPosY = 0;

    for (let p of polyLine.pts){
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
      floatX -= 0.5;
      floatY -= 0.5;
      floatX *= this.resolution.x / this.resolution.y;
      //I think 1.0 is where scale should go for zoom
      floatX = (floatX * this.resolution.x) / (this.resolution.x / dpr * 1.0);
      floatY = (floatY * this.resolution.y) / (this.resolution.y / dpr * 1.0);

      if(oldPosX == 0 && oldPosY ==0){
        oldPosX = floatX;
        oldPosY = floatY;

        let posString = '\n\tpos = vec2(' + oldPosX + ',' + oldPosY + ');\n';
        // don't draw points
        // posString += '\tDrawPoint(uv, pos, finalColor);\n';
        startShader += posString;

        continue;
      }else{
        let posString = '\n\tpos = vec2(' + floatX + ',' + floatY + ');\n';
        posString += '\toldPos = vec2(' + oldPosX + ',' + oldPosY + ');\n';
        // don't draw points
        // posString += '\tfinalColor *= FillLinePix(uv, oldPos, pos, vec2(1.0, 1.0), 0.0);\n';
        posString += '\tfinalColor *= FillLine(uv, oldPos, pos, vec2('+ polyLine.weight +', '+ polyLine.weight +'), '+ polyLine.weight +');\n';
        // posString += '\tDrawPoint(uv, pos, finalColor);';
        startShader += posString;
        oldPosX = floatX;
        oldPosY = floatY;
      }

      // console.log(p);
    }


    let fragShader = startShader + endShader;
    // console.log(fragShader);

    this.shader = fragShader;
    this.shaderUpdate = true;
  }
}


//Reference shit
//adding and removing pts / svg
//this.tree.remove(point);
//this.pts.splice(this.pts.indexOf(point), 1);
//let e = document.getElementById(point.id);
//e.remove();

//rebuild tree
// console.log(this.tree.balanceFactor());
//this.tree = new kdTree(this.pts, this.pointDist, ["x", "y"]);

// Transform screen space pt to shader space
// vec2 screenPt(vec2 p) {
//   vec2 pos = p;
//   //0 to 1 => -.5 to .5
//   pos -= 0.5;
//   pos.x *= iResolution.x / iResolution.y;
//
//   // 1. represents scale if uv *= scale ends up making sense
//   pos.x = (pos.x * iResolution.x) / (iResolution.x / (hiDPR * 1.));
//   pos.y = (pos.y * iResolution.y) / (iResolution.y / (hiDPR * 1.));
//   return pos;
// }

export {GhostUI, Button};
