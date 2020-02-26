//fluentPrim.js
/*
fluentPrim API
Methods:
AddPoint() //adds a new point
BakeFunctionCall(fluentDoc)

BakeFunctionParams(fluentDoc) (optional)
BakeFunctionAbsolute(fluentDoc) (optional)

Clone()
Create() //this returns a new prim of the same type

//Not yet implemented
Dist() //returns distance to primitive at a point for selection
getSharer() //returns shader function for object
SVG() //returns svg of polyline
3dm() //returns RhinoCompute representation

Members:
StrokeColor : rgba
FillColor: rgba

FillPattern: string / int / float TBD
SceneMergeOp: string / int / float TBD

Weight: 0.001 - 0.01
Radius: 0 - 1 (* iResolution.x / iResolution.y);

FillToggle: boolean
Ambient Occlusion: boolean
*/

/*
There are really two types of primitives, polyPoint primitives
and true primitives that are just a parameterized function call.
Luckily I tackled the former first and worked out the complications
there first. For the latter, BakeFunctionParams and bakeFunctionAbsolute
are irrelevant.

In the near future, I will start having to think about a "scene graph"
of sorts and how that is implemented. Additionally, grouping, copying and pasting
primitives together should be relatively simple by baking function calls
into other function calls.
*/


"use strict";

import * as THREE from './libjs/three.module.js';
import * as SNAP from './fluentSnap.js';
import * as HINT from './fluentHints.js';

//Two primitive types, PointPrim and PolyPoint
//PointPrim is for primitives that take 2 xy values + options
//PolyPoint is a datastructure that holds many xy values
class PointPrim{
  constructor(resolution, options){
    this.resolution = resolution;

    //input is 1 to 20 divided by 2500
    this.weight = options.weight || .002;
    this.options = {...options};
    this.pointPrim = new THREE.Vector4(0.0, 0.0, 0.0, 0.0);

    //list of points
    this.pts=[];

    this.id = (+new Date).toString(36).slice(-8);
  }

  //really just going to add 1 of 2 points to this.pts
  addPoint(x, y, tag){
    let hFloatX = x / this.resolution.x;
    let hFloatY = y / this.resolution.y;
    let hFloatYFlip = (this.resolution.y - y) / this.resolution.y;

    let dpr = window.devicePixelRatio;

    hFloatX -= 0.5;
    hFloatYFlip -= 0.5;
    hFloatX *= this.resolution.x / this.resolution.y;

    //where does dpr fit into this?
    hFloatX = (hFloatX * this.resolution.x) / (this.resolution.x * 0.5);
    hFloatYFlip = (hFloatYFlip * this.resolution.y) / (this.resolution.y * 0.5);

    if(this.pts.length == 0){
      this.pointPrim.x = hFloatX;
      this.pointPrim.y = hFloatYFlip;
    }else{
      this.pointPrim.z = hFloatX;
      this.pointPrim.w = hFloatYFlip;
    }

    // console.log(this.pointPrim);

    let pt = new Point(x, y, 0, [], this.id, "circlePt");

    this.pts.push(pt);

    return pt;
  }

}
//PolyPoint is an array of points, a texture representation and properties
//Another class e.g. PolyLine extends PolyPoint to manipulate and bake
class PolyPoint {

  //creates empty PolyPoint object
  constructor(resolution, options, _dataSize){
    this.resolution = resolution;

    this.dataSize = _dataSize || 16;

    //input is 1 to 20 divided by 2000
    this.weight = options.weight || .002,
    //this can probably be relegated to the actual primitives? idk
    this.options = {...options};
    //list of points
    this.pts=[];

    //cTexel is incremented at beginning of AddPoint
    //that way after adding a point reading cTexel gives current texel referemce
    this.cTexel = -1.0;

    this.data = new Uint16Array(4 * this.dataSize * this.dataSize);

    this.ptsTex = new THREE.DataTexture(this.data, this.dataSize, this.dataSize, THREE.RGBAFormat, THREE.HalfFloatType);

    this.ptsTex.magFilter = THREE.NearestFilter;
    this.ptsTex.minFilter = THREE.NearestFilter;

    this.id = (+new Date).toString(36).slice(-8);
  }

  clone(){
    let resolution = this.resolution.clone();
    let weight = this.weight;
    let options  = {...this.options};
    let dataSize = this.dataSize;

    let newPolyPoint = new PolyPoint(resolution, options, dataSize);

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
    this.cTexel++;

    let index = this.cTexel * 4;

    let hFloatX = x / this.resolution.x;
    let hFloatY = y / this.resolution.y;
    let hFloatYFlip = (this.resolution.y - y) / this.resolution.y;


    let dpr = window.devicePixelRatio;

    //The following matches the screenPt function in the fragment shader
    hFloatX -= 0.5;
    hFloatYFlip -= 0.5;
    hFloatX *= this.resolution.x / this.resolution.y;
    //I think 1.0 is where scale should go for zoom
    hFloatX = (hFloatX * this.resolution.x) / (this.resolution.x / 2.0 * 1.0);
    hFloatYFlip = (hFloatYFlip * this.resolution.y) / (this.resolution.y / 2.0 * 1.0);

    //use view.setFloat16() to set the digits in the DataView
    //then use view.getUint16 to retrieve and write to data Texture
    let buffer = new ArrayBuffer(64);
    let view = new DataView(buffer);

    view.getFloat16 = (...args) => getFloat16(view, ...args);
    view.setFloat16 = (...args) => setFloat16(view, ...args);

    //assume little endian
    let endD = false;

    view.setFloat16(0, hFloatX, endD);
    view.setFloat16(16, hFloatYFlip, endD);
    //in the case of the point prims so far z and w have already been transformed as above
    //maybe should turn that into a little function we can call...
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

  //takes x, y, and tag
  //adds point to polyPoint
  //point x, y are stored as HalfFloat16
  //https://github.com/petamoriken/float16
  addPointPrim(x, y, z, w, tag){
    this.cTexel++;

    let index = this.cTexel * 4;
    //pointPrim points are already transformed
    //could think about unifying this with addPoint, wouldn't be too hard

    //use view.setFloat16() to set the digits in the DataView
    //then use view.getUint16 to retrieve and write to data Texture
    let buffer = new ArrayBuffer(64);
    let view = new DataView(buffer);

    view.getFloat16 = (...args) => getFloat16(view, ...args);
    view.setFloat16 = (...args) => setFloat16(view, ...args);

    //assume little endian
    let endD = false;

    view.setFloat16(0, x, endD);
    view.setFloat16(16, y, endD);
    //in the case of the point prims so far z and w have already been transformed as above
    //maybe should turn that into a little function we can call...
    view.setFloat16(32, z, endD);
    view.setFloat16(48, w, endD);

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

//Simple point class (for insertion into kdTree)
//Holds information for kdTree / UI and for fragment shader
class Point{
  constructor(x, y, _texRef, _texData, _shapeID, _tag){
    this.x = x;
    this.y = y;
    //texture coordinates can be reconstructed from this and dataSize
    this.texRef = _texRef || 0;

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

class Circle extends PointPrim{
  constructor(resolution, options){
    super(resolution, options);

    this.fragFunction = "";
  }

  //going to add each of the 2 points to fluentDoc.params
  bakeFunctionCall(fluentDoc){
    let shader = fluentDoc.shader;

    //bakes pointPrim data the fluentDoc.parameters
    let p = this.pointPrim;
    fluentDoc.parameters.addPointPrim(p.x, p.y,p.z, p.w, "Circle");

    let cTexel = fluentDoc.parameters.cTexel;
    let dataSize = fluentDoc.parameters.dataSize;

    let texelOffset = 0.5 * (1.0 / (fluentDoc.parameters.dataSize * fluentDoc.parameters.dataSize));

    let indexX = (cTexel % dataSize) / dataSize + texelOffset;
    let indexY = (Math.floor(cTexel / dataSize)) / dataSize  + texelOffset;


    //eventually address these functions using id in place of d
    //then perform scene merge operation when modifying finalColor
    let insString = "//$INSERT CALL$------";
    let insIndex = shader.indexOf(insString);
    insIndex += insString.length;

    let startShader = shader.slice(0, insIndex);
    let endShader = shader.slice(insIndex);

    let buffer = new ArrayBuffer(10);
    let view = new DataView(buffer);

    //create function call
    let posString = '\n';

    let rgb = this.options.stroke;

    let color = 'vec3(' + rgb.x + ',' + rgb.y + ',' + rgb.z +')';
    let weight = this.options.weight;

    posString += '\tindex = vec2(' + indexX + ', ' + indexY + ');\n';
    posString += '\tradius = distance(texture2D(parameters, index).xy, texture2D(parameters, index).zw);\n';
    posString += '\td = sdCircle(uv, texture2D(parameters, index).xy, radius);\n';
    posString += '\td = clamp(abs(d) - '+ weight +', 0.0, 1.0);\n';
    posString += '\tfinalColor = mix( finalColor, ' + color + ', 1.0-smoothstep(0.0,0.003,abs(d)) );\n'

    startShader += posString;
    let fragShader = startShader + endShader;

    // console.log(fragShader);

    return fragShader;

  }

  // bakeFunctionAbsolute

  clone(){
    let resolution = this.resolution;
    let options = {...this.options};
    let pointPrim = this.pointPrim.clone();
    //may need to clone this in a better way
    let id = this.id;

    //list of points
    let pts = [];
    for (let p of this.pts){ pts.push(p.clone());};
    let newCircle = new Circle(resolution, options);
    newCircle.pointPrim = pointPrim;
    newCircle.id = id;
    newCircle.pts = pts;

    return newCircle;
  }

  create(resolution, options){
    return new Circle(resolution, options);
  }

  end(fluentDoc){
    if(this.pts.length == 0) return fluentDoc;
    // fluentDoc.editItemIndex++;
    fluentDoc.shader = this.bakeFunctionCall(fluentDoc);
    return fluentDoc;
  }
}

//maybe create a PointPrim class like PolyPoint
class Rectangle extends PointPrim{
  constructor(resolution, options){
    super(resolution, options);

    this.fragFunction = "";
  }

  //going to add each of the 2 points to fluentDoc.params
  bakeFunctionCall(fluentDoc){
    let shader = fluentDoc.shader;

    //bakes pointPrim data the fluentDoc.parameters
    let p = this.pointPrim;
    fluentDoc.parameters.addPointPrim(p.x, p.y,p.z, p.w, "blah");

    let cTexel = fluentDoc.parameters.cTexel;
    let dataSize = fluentDoc.parameters.dataSize;

    let texelOffset = 0.5 * (1.0 / (fluentDoc.parameters.dataSize * fluentDoc.parameters.dataSize));

    let indexX = (cTexel % dataSize) / dataSize + texelOffset;
    let indexY = (Math.floor(cTexel / dataSize)) / dataSize  + texelOffset;


    //eventually address these functions using id in place of d
    //then perform scene merge operation when modifying finalColor
    let insString = "//$INSERT CALL$------";
    let insIndex = shader.indexOf(insString);
    insIndex += insString.length;

    let startShader = shader.slice(0, insIndex);
    let endShader = shader.slice(insIndex);

    let buffer = new ArrayBuffer(10);
    let view = new DataView(buffer);

    //create function call
    let posString = '\n';

    let rgb = this.options.stroke;
    let color = 'vec3(' + rgb.x + ',' + rgb.y + ',' + rgb.z +')';
    let radius = this.options.radius.toFixed(4);
    let weight = this.options.weight.toFixed(4);

    posString += '\tindex = vec2(' + indexX + ', ' + indexY + ');\n';

    // posString += '\td = sdBox(uv, texture2D(parameters, index).xy, (abs(texture2D(parameters, index).zw - texture2D(parameters, index).xy)), ' + radius + ');\n';
    posString += '\trect1 = texture2D(parameters, index).xy;\n';
    posString += '\trect2 = texture2D(parameters, index).zw;\n';
    posString += '\td = sdBox(uv, 0.5 * (rect2 - rect1) + rect1, abs(rect2 - (0.5 * (rect2 - rect1) + rect1)), '+radius+');\n';
    posString += '\tfinalColor = mix( finalColor, ' + color + ', 1.0-smoothstep(0.0,0.003,abs(d)) );\n'

    startShader += posString;
    let fragShader = startShader + endShader;

    // console.log(fragShader);

    return fragShader;

  }

  // bakeFunctionAbsolute

  clone(){
    let resolution = this.resolution;
    // let weight = this.weight;
    let options = {...this.options};
    let pointPrim = this.pointPrim.clone();
    //may need to clone this in a better way
    let id = this.id;

    //list of points
    let pts = [];
    for (let p of this.pts){ pts.push(p.clone());};
    let newRect = new Rectangle(resolution, options);
    newRect.pointPrim = pointPrim;
    newRect.id = id;
    newRect.pts = pts;

    return newRect;
  }

  create(resolution, options){
    return new Rectangle(resolution, options);
  }

  end(fluentDoc){
    if(this.pts.length == 0) return fluentDoc;
    // fluentDoc.editItemIndex++;
    fluentDoc.shader = this.bakeFunctionCall(fluentDoc);
    return fluentDoc;
  }
}

class PolyLine extends PolyPoint {

  constructor(resolution, options, _dataSize){
    //super is how PolyPoint class is constructed
    //https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes/extends
    super(resolution, options, _dataSize);

    this.fragFunction = "";
  }

  clone(){
    let resolution = this.resolution.clone();
    let weight = this.weight;
    let options = {...this.options};
    let dataSize = this.dataSize;

    let newPolyLine = new PolyLine(resolution, options, dataSize);

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

    //is there a bug here? should I clone id this way?
    var fragFunction = (' ' + this.fragFunction).slice(1);

    newPolyLine.fragFunction = fragFunction;

    return newPolyLine;
  }

  //takes shader as argument, modifies string, returns modified shader
  //the inputs to these functions e.g. position will be parameterized
  bakeFunctionAbsolute(fluentDoc){
    let shader = fluentDoc.shader;

    //insert new function
    let insString = "//$INSERT FUNCTION$------";
    let insIndex = shader.indexOf(insString);
    insIndex += insString.length;

    let startShader = shader.slice(0, insIndex);
    let endShader = shader.slice(insIndex);

    // if function exists start and end should be before beginning and after end
    let exFuncStr = '//$START-' + this.id;

    let exFuncIndex = shader.indexOf(exFuncStr);

    //if function exists
    if(exFuncIndex >= 0){
      startShader = shader.slice(0, exFuncIndex);

      let postFuncStr = '//$END-' + this.id;
      let postIndex = shader.indexOf(postFuncStr);
      postIndex += postFuncStr.length;
      endShader = shader.slice(postIndex);
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

    let rgb = this.options.stroke;
    let color = 'vec3(' + rgb.x + ',' + rgb.y + ',' + rgb.z +')';
    let weight = this.options.weight.toFixed(4);

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

      if(oldPosX == 0 && oldPosY ==0){
        oldPosX = floatX;
        oldPosY = floatY;

        posString += '\n\tvec2 pos = vec2(0.0);\n';
        posString += '\n\tfloat d = 0.0;\n';
        posString += '\n\tvec2 oldPos = vec2(' + oldPosX + ',' + oldPosY + ');\n';

        continue;
      }else{
        posString += '\n\tpos = vec2(' + floatX + ',' + floatY + ');\n';
        posString += '\n\td = drawLine(tUv, oldPos, pos,'+ weight + ',0.0);\n';

        posString += '\tfinalColor = mix(finalColor, ' + color + ', line(tUv, d, '+weight+'));\n';

        posString += '\toldPos = pos;\n';

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

    return fragShader;
  }

  //takes shader as argument, modifies string, returns modified shader
  //the inputs to these functions e.g. position will be parameterized
  bakeFunctionParams(fluentDoc){

    let shader = fluentDoc.shader;

    //insert new function
    let insString = "//$INSERT FUNCTION$------";
    let insIndex = shader.indexOf(insString);
    insIndex += insString.length;

    let startShader = shader.slice(0, insIndex);
    let endShader = shader.slice(insIndex);

    // if function exists start and end should be before beginning and after end
    let exFuncStr = '//$START-' + this.id;

    let exFuncIndex = shader.indexOf(exFuncStr);

    //if function exists
    if(exFuncIndex >= 0){
      startShader = shader.slice(0, exFuncIndex);

      let postFuncStr = '//$END-' + this.id;
      let postIndex = shader.indexOf(postFuncStr);
      postIndex += postFuncStr.length;
      endShader = shader.slice(postIndex);
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

    let indexX = 0;
    let indexY = 0;

    //this should be a property of GhostUI
    let dpr = window.devicePixelRatio;

    let texelOffset = 0.5 * (1.0 / (fluentDoc.parameters.dataSize * fluentDoc.parameters.dataSize));
    let dataSize = fluentDoc.parameters.dataSize;

    let rgb = this.options.stroke;
    let color = 'vec3(' + rgb.x + ',' + rgb.y + ',' + rgb.z +')';
    let weight = this.options.weight.toFixed(4);

    let count = 0;

    for (let p of this.pts){

      fluentDoc.parameters.addPoint(p.x, p.y, p.tag);
      let cTexel = fluentDoc.parameters.cTexel;

      if(count == 0){
        //what are x, y texel indices?
        indexX = (cTexel % dataSize) / dataSize + texelOffset;
        indexY = (Math.floor(cTexel / dataSize)) / dataSize  + texelOffset;
        posString += '\n\tvec2 pos = vec2(0.0);\n';
        posString += '\n\tfloat d = 0.0;\n';

        posString += '\n\tvec2 index = vec2(' + indexX + ',' + indexY + ');\n';

        posString += '\n\tvec2 oldPos = texture2D(parameters, index).xy;\n';

        count++;
        continue;
      }else{
        indexX = (cTexel % dataSize) / dataSize + texelOffset;
        indexY = (Math.floor(cTexel / dataSize)) / dataSize  + texelOffset;
        //texture2D(posTex, vIndex).xy;
        // posString += '\n\tpos = vec2(' + floatX + ',' + floatY + ');\n';
        posString += '\n\tindex = vec2(' + indexX + ',' + indexY + ');\n';
        posString += '\n\tpos = texture2D(parameters, index).xy;\n';

        posString += '\n\td = drawLine(tUv, oldPos, pos,'+ weight + ',0.0);\n';

        posString += '\tfinalColor = mix(finalColor, ' + color + ', line(tUv, d, '+weight+'));\n';

        posString += '\toldPos = pos;\n';

        count++;
      }
    }

    posString += '\n}\n';
    posString += '//$END-' + this.id + '\n';
    // console.log(posString);
    this.fragShaer = posString;

    startShader += posString;

    let fragShader = startShader + endShader;

    // console.log(fragShader);

    return fragShader;
  }

  //takes shader as argument, modifies string, returns modified shader
  //creates function calls that calls function already created
  //the inputs to these functions e.g. position will be parameterized
  bakeFunctionCall(fluentDoc){
    let shader = fluentDoc.shader;
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

  create(resolution, options, _dataSize){
    return new PolyLine(resolution, options, _dataSize);
  }

  //should clone and probably push to state stack prior to this
  end(fluentDoc){
    if(this.pts.length == 0) return fluentDoc;
    fluentDoc.shader = this.bakeFunctionParams(fluentDoc);
    fluentDoc.shader = this.bakeFunctionCall(fluentDoc);
    // fluentDoc.editItemIndex++;
    return fluentDoc;
  }
}

class Polygon extends PolyPoint {

  constructor(resolution, options, _dataSize){
    //super is how PolyPoint class is constructed
    //https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes/extends
    super(resolution, options, _dataSize);

    this.fragFunction = "";
  }

  clone(){
    let resolution = this.resolution.clone();
    let weight = this.weight;
    let options = {...this.options};
    let dataSize = this.dataSize;

    let newPolyLine = new Polygon(resolution, options, dataSize);

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

    //is there a bug here? should I clone id this way?
    var fragFunction = (' ' + this.fragFunction).slice(1);

    newPolyLine.fragFunction = fragFunction;

    return newPolyLine;
  }

  //takes shader as argument, modifies string, returns modified shader
  //the inputs to these functions e.g. position will be parameterized
  bakeFunctionAbsolute(fluentDoc){
    let shader = fluentDoc.shader;

    //insert new function
    let insString = "//$INSERT FUNCTION$------";
    let insIndex = shader.indexOf(insString);
    insIndex += insString.length;

    let startShader = shader.slice(0, insIndex);
    let endShader = shader.slice(insIndex);

    // if function exists start and end should be before beginning and after end
    let exFuncStr = '//$START-' + this.id;

    let exFuncIndex = shader.indexOf(exFuncStr);

    //if function exists
    if(exFuncIndex >= 0){
      startShader = shader.slice(0, exFuncIndex);

      let postFuncStr = '//$END-' + this.id;
      let postIndex = shader.indexOf(postFuncStr);
      postIndex += postFuncStr.length;
      endShader = shader.slice(postIndex);
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

    let rgb = this.options.stroke;
    let color = 'vec3(' + rgb.x + ',' + rgb.y + ',' + rgb.z +')';
    let weight = this.options.weight.toFixed(4);

    for (let p of this.pts){
      view.setUint16(0, p.texData[0]);
      let floatX = getFloat16(view, 0);
      // console.log(getFloat16(view, 0));
      // console.log(getFloat16(view, 0) * window.innerWidth);

      let dpr = window.devicePixelRatio;

      view.setUint16(0, p.texData[1]);
      let floatY = getFloat16(view, 0);
      // console.log(getFloat16(view, 0));
      // console.log(window.innerHeight - getFloat16(view, 0) * window.innerHeight);

      if(oldPosX == 0 && oldPosY ==0){
        oldPosX = floatX;
        oldPosY = floatY;

        posString += '\n\tvec2 pos = vec2(0.0);\n';
        posString += '\n\tfloat d = 0.0;\n';
        posString += '\n\tvec2 oldPos = vec2(' + oldPosX + ',' + oldPosY + ');\n';

        continue;
      }else{
        posString += '\n\tpos = vec2(' + floatX + ',' + floatY + ');\n';
        posString += '\n\td = drawLine(tUv, oldPos, pos,'+ weight + ',0.0);\n';

        posString += '\tfinalColor = mix(finalColor, ' + color + ', line(tUv, d, '+weight+'));\n';

        posString += '\toldPos = pos;\n';

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

    return fragShader;
  }

  //takes shader as argument, modifies string, returns modified shader
  //the inputs to these functions e.g. position will be parameterized
  bakeFunctionParams(fluentDoc){

    let shader = fluentDoc.shader;

    //insert new function
    let insString = "//$INSERT FUNCTION$------";
    let insIndex = shader.indexOf(insString);
    insIndex += insString.length;

    let startShader = shader.slice(0, insIndex);
    let endShader = shader.slice(insIndex);

    // if function exists start and end should be before beginning and after end
    let exFuncStr = '//$START-' + this.id;

    let exFuncIndex = shader.indexOf(exFuncStr);

    //if function exists
    if(exFuncIndex >= 0){
      startShader = shader.slice(0, exFuncIndex);

      let postFuncStr = '//$END-' + this.id;
      let postIndex = shader.indexOf(postFuncStr);
      postIndex += postFuncStr.length;
      endShader = shader.slice(postIndex);
    }

    //create function
    let posString = '\n';
    posString += '//$START-' + this.id + '\n';

    let buffer = new ArrayBuffer(10);
    let view = new DataView(buffer);

    let oldPosX = 0;
    let oldPosY = 0;

    let indexX = 0;
    let indexY = 0;

    //this should be a property of GhostUI
    let dpr = window.devicePixelRatio;

    let texelOffset = 0.5 * (1.0 / (fluentDoc.parameters.dataSize * fluentDoc.parameters.dataSize));
    let dataSize = fluentDoc.parameters.dataSize;

    let rgb = this.options.stroke;
    let color = 'vec3(' + rgb.x + ',' + rgb.y + ',' + rgb.z +')';
    let weight = this.options.weight.toFixed(4);
    let radius = this.options.radius.toFixed(4);

    // p is a translation for polygon
    // eventually this will be a reference to another data texture
    posString += 'void ' + this.id + '(vec2 uv, vec2 p, inout vec3 finalColor) {';

    posString += '\n\tvec2 tUv = uv - p;\n';
    posString += '\tfloat radius='+radius+';\n';
    // scaling this way doesn't work
    // posString += '\ttUv = tUv/(1.0-radius);\n';

    let count = 0;
    for (let p of this.pts){

      fluentDoc.parameters.addPoint(p.x, p.y, p.tag);

      let cTexel = fluentDoc.parameters.cTexel;

      if(count == 0){
        //what are x, y texel indices?
        indexX = (cTexel % dataSize) / dataSize + texelOffset;
        indexY = (Math.floor(cTexel / dataSize)) / dataSize  + texelOffset;

        posString += '\n\tvec2 pos = vec2(0.0);\n';

        posString += '\n\tvec2 index = vec2(' + indexX + ',' + indexY + ');\n';

        posString += '\tvec2 first = texture2D(parameters, index).xy;\n';
        //scaling/rounding this way doesn't seem to work
        // posString += '\tfirst = (first/radius)*radius;\n';

        //get the last point in absolute terms
        view.setUint16(0, this.pts[this.pts.length - 1].texData[0]);
        let floatX = getFloat16(view, 0);

        view.setUint16(0, this.pts[this.pts.length - 1].texData[1]);
        let floatY = getFloat16(view, 0);

        posString += '\tvec2 last = vec2('+floatX+', '+floatY+');\n';
        // posString += '\tlast = (last/radius)*radius;\n';
        posString += '\tfloat d = dot(tUv - first, tUv - first);\n';
        posString += '\tfloat s = 1.0;\n';
        posString += '\tvec2 oldPos = first;\n';
        //         vec2 e = v[j] - v[i];
        posString += '\tvec2 e = last - first;\n';
        //         vec2 w =    p - v[i];
        posString += '\tvec2 w = tUv - first;\n';
        //         vec2 b = w - e*clamp( dot(w,e)/dot(e,e), 0.0, 1.0 );
        posString += '\tvec2 b = w - e*clamp( dot(w,e)/dot(e,e), 0.0, 1.0 );\n';
        //         d = min( d, dot(b,b) );
        posString += '\td = min(d, dot(b,b));\n';
        // winding number from http://geomalgorithms.com/a03-_inclusion.html
        //         bvec3 cond = bvec3( p.y>=v[i].y, p.y<v[j].y, e.x*w.y>e.y*w.x );
        posString += '\tbvec3 cond = bvec3( tUv.y>=first.y, tUv.y<last.y, e.x*w.y>e.y*w.x );\n';
        //         if( all(cond) || all(not(cond)) ) s*=-1.0;
        posString += '\tif(all(cond) || all(not(cond))) s*=-1.0;\n';
        count++;
        continue;
      }else{
        indexX = (cTexel % dataSize) / dataSize + texelOffset;
        indexY = (Math.floor(cTexel / dataSize)) / dataSize  + texelOffset;

        posString += '\n\tindex = vec2(' + indexX + ',' + indexY + ');\n';
        posString += '\tpos = texture2D(parameters, index).xy;\n';
        // posString += '\tpos = (pos/radius)*radius;\n';
        // vec2 e = v[j] - v[i];
        posString += '\te = oldPos - pos;\n';
        //         vec2 w =    p - v[i];
        posString += '\tw = tUv - pos;\n';
        //         vec2 b = w - e*clamp( dot(w,e)/dot(e,e), 0.0, 1.0 );
        posString += '\tb = w - e*clamp( dot(w,e)/dot(e,e), 0.0, 1.0 );\n';
        //         d = min( d, dot(b,b) );
        posString += '\td = min(d, dot(b,b));\n';
        //         // winding number from http://geomalgorithms.com/a03-_inclusion.html
        //         bvec3 cond = bvec3( p.y>=v[i].y, p.y<v[j].y, e.x*w.y>e.y*w.x );
        posString += '\tcond = bvec3( tUv.y>=pos.y, tUv.y<oldPos.y, e.x*w.y>e.y*w.x );\n';
        //         if( all(cond) || all(not(cond)) ) s*=-1.0;
        posString += '\tif(all(cond) || all(not(cond))) s*=-1.0;\n';
        posString += '\toldPos = pos;\n';

        count++;
      }
    }

    //     return s*sqrt(d);
    posString += '\td = s*sqrt(d) - radius;\n';
    // posString += '\tfloat line = d;\n';
    posString += '\tfloat line = d;\n';
    posString += '\td = 1.0 - smoothstep(0.0,0.003,clamp(d,0.0,1.0));\n';
    posString += '\tfinalColor = mix(finalColor, ' + color + ', d);\n';

    posString += '\tline = clamp(abs(line) - '+weight+', 0.0, 1.0);\n';
    color = 'vec3(0.,0.,0.)';
    posString += '\tline = 1.0 - smoothstep(0.0,0.003,abs(line));\n';
    posString += '\tfinalColor = mix(finalColor, ' + color + ', line);\n';

    posString += '\n}\n';
    posString += '//$END-' + this.id + '\n';

    this.fragShaer = posString;

    startShader += posString;

    let fragShader = startShader + endShader;

    // console.log(fragShader);

    return fragShader;
  }

  //takes shader as argument, modifies string, returns modified shader
  //creates function calls that calls function already created
  //the inputs to these functions e.g. position will be parameterized
  bakeFunctionCall(fluentDoc){
    let shader = fluentDoc.shader;
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

  create(resolution, options, _dataSize){
    return new Polygon(resolution, options, _dataSize);
  }

  //should clone and probably push to state stack prior to this
  end(fluentDoc){
    if(this.pts.length == 0) return fluentDoc;
    fluentDoc.shader = this.bakeFunctionParams(fluentDoc);
    fluentDoc.shader = this.bakeFunctionCall(fluentDoc);
    // fluentDoc.editItemIndex++;
    return fluentDoc;
  }
}

class PolyCircle extends PolyPoint {

  constructor(resolution, options, _dataSize){
    //super is how PolyPoint class is constructed
    //https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes/extends
    super(resolution, options, _dataSize);

    this.fragFunction = "";

  }

  clone(){
    let resolution = this.resolution.clone();
    let weight = this.weight;
    let options = {...this.options};
    let dataSize = this.dataSize;

    let newPolyCircle = new PolyCircle(resolution, options, dataSize);

    let pts = [];
    for (let p of this.pts){ pts.push(p.clone());};
    let cTexel = this.cTexel;

    newPolyCircle.pts = pts;
    newPolyCircle.cTexel = cTexel;

    let data = new Uint16Array(this.data);
    let ptsTex = new THREE.DataTexture(data, dataSize, dataSize, THREE.RGBAFormat, THREE.HalfFloatType);

    newPolyCircle.data = data;
    newPolyCircle.ptsTex = ptsTex;

    let id = this.id;
    newPolyCircle.id = id;

    var fragFunction = (' ' + this.fragFunction).slice(1);

    newPolyCircle.fragFunction = fragFunction;

    return newPolyCircle;
  }

  bakeFunctionParams(fluentDoc){
        let shader = fluentDoc.shader;

        //insert new function
        let insString = "//$INSERT FUNCTION$------";
        let insIndex = shader.indexOf(insString);
        insIndex += insString.length;

        let startShader = shader.slice(0, insIndex);
        let endShader = shader.slice(insIndex);

        // if function exists start and end should be before beginning and after end
        let exFuncStr = '//$START-' + this.id;

        let exFuncIndex = shader.indexOf(exFuncStr);

        //if function exists
        if(exFuncIndex >= 0){
          startShader = shader.slice(0, exFuncIndex);

          let postFuncStr = '//$END-' + this.id;
          let postIndex = shader.indexOf(postFuncStr);
          postIndex += postFuncStr.length;
          endShader = shader.slice(postIndex);
        }

        //create function
        let posString = '\n';
        posString += '//$START-' + this.id + '\n';

        // p is a translation for polygon
        // eventually this will be a reference to another data texture
        posString += 'void ' + this.id + '(vec2 uv, vec2 p, inout vec3 finalColor) {';

        posString += '\n\tvec2 tUv = uv - p;\n';

        let indexX = 0;
        let indexY = 0;

        let first = true;

        let dpr = window.devicePixelRatio;

        let texelOffset = 0.5 * (1.0 / (fluentDoc.parameters.dataSize * fluentDoc.parameters.dataSize));
        let dataSize = fluentDoc.parameters.dataSize;

        let rgb = this.options.stroke;
        let color = 'vec3(' + rgb.x + ',' + rgb.y + ',' + rgb.z +')';
        let radius = this.options.radius;

        for (let p of this.pts){
          //there is a more efficient way of doing this
          //should have an addPoint from point thing
          fluentDoc.parameters.addPoint(p.x, p.y, p.tag);
          let cTexel = fluentDoc.parameters.cTexel;

          //should factor out oldPosX and oldPosY but too tired now
          if(first){
            first = false;
            //what are x, y texel indices?
            indexX = (cTexel % dataSize) / dataSize + texelOffset;
            indexY = (Math.floor(cTexel / dataSize)) / dataSize  + texelOffset;
            posString += '\n\tvec2 pos = vec2(0.0);';
            posString += '\n\t float oldDist = 1000.0;';

            posString += '\n\tvec2 index = vec2(' + indexX + ',' + indexY + ');';

            posString += '\n\tpos = texture2D(parameters, index).xy;';

            posString += '\n\tfloat d = sdCircle(uv, pos, ' + radius + ');';
            posString += '\n\td = opSmoothUnion(d, oldDist, 0.05);';
            posString += '\n\toldDist = d;\n';

          }else{
            indexX = (cTexel % dataSize) / dataSize + texelOffset;
            indexY = (Math.floor(cTexel / dataSize)) / dataSize  + texelOffset;

            posString += '\n\tindex = vec2(' + indexX + ',' + indexY + ');';
            posString += '\n\tpos = texture2D(parameters, index).xy;';

            posString += '\n\td = sdCircle(uv, pos, ' + radius + ');';
            posString += '\n\td = opSmoothUnion(d, oldDist, 0.05);';
            posString += '\n\toldDist = d;';
            // posString += '\n\tvec3 cCol = vec3(0.0, 0.384, 0.682);';
            // posString += '\n\tfinalColor = mix( finalColor, cCol , 1.0-smoothstep(0.0,editWeight,abs(d)) );';

          }
        }
        posString += '\n';

        // posString += '\n\tvec3 cCol = vec3(0.0, 0.384, 0.682);';
        posString += '\n\tfinalColor = mix( finalColor, ' + color + ' , 1.0-smoothstep(0.0,'+ this.weight + '+0.002,abs(d)));';

        // posString += '\tfinalColor = mix(finalColor, vec3(1.0), editOpacity);\n}\n';
        posString += '\n}\n';
        posString += '//$END-' + this.id + '\n';
        console.log(posString);
        this.fragShaer = posString;
        // console.log(posString);

        startShader += posString;

        let fragShader = startShader + endShader;

        // console.log(fragShader);

        return fragShader;
  }

  bakeFunctionCall(fluentDoc){
    let shader = fluentDoc.shader;
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

  create(resolution, options, _dataSize){
    return new PolyCircle(resolution, options, _dataSize);
  }

  //should clone and probably push to state stack prior to this
  end(fluentDoc){
    if(this.pts.length == 0) return fluentDoc;
    // fluentDoc.editItemIndex++;
    fluentDoc.shader = this.bakeFunctionParams(fluentDoc);
    fluentDoc.shader = this.bakeFunctionCall(fluentDoc);
    return fluentDoc;
  }
}

export {Point, Circle, Rectangle, PolyPoint, PolyLine, Polygon, PolyCircle};
