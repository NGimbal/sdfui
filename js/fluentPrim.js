//primitives.js
/*

//Not yet implemented
Dist() //returns distance to primitive at a point for selection
getSharer() //returns shader function for object
SVG() //returns svg of polyline
3dm() //returns RhinoCompute representation

*/


"use strict";

import * as THREE from './libjs/three.module.js';
// import * as SNAP from './fluentSnap.js';
import * as HINT from './fluentHints.js';

import { resolution } from './sdfui.js';

//simple class for returning shader and polypoint
class DataShader{
  constructor(shader, parameters){
    this.shader = shader;
    this.parameters = parameters;
  }
}


export class vec{
  constructor(x, y, z, w, id, update, pId){
    this.x = x || 0;
    this.y = y || 0;
    this.z = z || 0;
    this.w = w || 0;
    this.id = id || (+new Date).toString(36).slice(-8);
    this.update = update || false;
    //parentId
    this.parentId = pId || "";
  }
}

export function lengthVec(_vec){
  return Math.sqrt(_vec.x * _vec.x + _vec.y * _vec.y);
}

export function normVec(_vec){
  let vec = {..._vec};
  let l = lengthVec(vec);
  vec.x = vec.x / l;
  vec.y = vec.y / l;
  return vec;
}

export function dotVec(_vecA, _vecB){
  let x = _vecA.x * _vecB.x;
  let y = _vecA.y * _vecB.y;
  return x + y;
}

export function angleVec(_vec){
  return (Math.atan2( - _vec.y, - _vec.x ) + Math.PI);
}

export var propsDefault = {
  type:"",
  filter:"",
  stroke:"",
  fill:"",
  weight:0,
  radius:0
}

export class prim{
  constructor(type, pts, _props, id, pId, merge){
    this.type = type;
    //list of point ids
    this.pts = pts || [];
    this.properties = _props || {...propsDefault};
    this.needsUpdate = false;
    this.id = id ||  (+new Date).toString(36).slice(-8);
    this.pId = pId || "";
    //scene merge
    this.merge = merge || "union";
  }
}

//PolyPoint is an array of points, a texture representation and properties
//Another class e.g. PolyLine extends PolyPoint to manipulate and bake
class PolyPoint {

  //creates empty PolyPoint object
  constructor(properties, _dataSize){
    this.properties = properties;
    this.dataSize = _dataSize || 16;
    //input is 1 to 20 divided by 2000
    // this.weight = options.weight || .002,
    //this can probably be relegated to the actual primitives? idk
    // this.options = {...options};
    //list of points
    this.pts=[];

    //cTexel is incremented at beginning of AddPoint
    //that way after adding a point reading cTexel gives current texel referemce
    this.cTexel = -1.0;

    this.data = new Uint16Array(4 * this.dataSize * this.dataSize);

    this.ptsTex = new THREE.DataTexture(this.data, this.dataSize, this.dataSize, THREE.RGBAFormat, THREE.HalfFloatType);

    this.ptsTex.magFilter = THREE.NearestFilter;
    this.ptsTex.minFilter = THREE.NearestFilter;

    this.needsUpdate = false;
    this.id = (+new Date).toString(36).slice(-8);
  }

  clone(){
    let weight = this.weight;
    let properties  = {...this.properties};
    let dataSize = this.dataSize;

    let newPolyPoint = new PolyPoint(properties, dataSize);

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
  addPoint(_pt, tag){
    let x = _pt.x;
    let y = _pt.y;
    let z = _pt.z || 1.0;
    let w = _pt.w || 1.0;

    let pt = new vec(x, y, z, w);

    this.cTexel++;
    console.log(this.cTexel);
    console.log(this);
    let index = this.cTexel * 4;
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
    view.setFloat16(32, z, endD);
    view.setFloat16(48, w, endD);

    this.ptsTex.image.data[index] = view.getUint16(0, endD);
    this.ptsTex.image.data[index + 1] = view.getUint16(16, endD);
    this.ptsTex.image.data[index + 2] = view.getUint16(32, endD);
    this.ptsTex.image.data[index + 3] = view.getUint16(48, endD);

    this.ptsTex.needsUpdate = true;

    let _tag = tag || "none";
    let texData = [view.getUint16(0, endD), view.getUint16(16, endD), view.getUint16(32, endD), view.getUint16(48, endD)];

    //why is this important? want to get rid of this point class
    // let ptpt = new Point(x, y, this.cTexel, texData, this.id, _tag);

    // this.pts.push(ptpt);
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

//Simple point class for insertion into kdTree
//Holds information for kdTree / UI
class Point{
  constructor(x, y, _texRef, _texData, _shapeID, _tag){
    //shader aligned X, Y
    //committing to shader align coords LATER (lol)
    //vals are x = [0 - screenY / screenX]
    //         y = [0 - 1.0]
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

    this.insert = true;
    this.update = false;
    this.remove = false;

    this.id = (+new Date).toString(36).slice(-8);

    this.primType = "Point";
  }

  setXY(x, y){
    this.x = x || this.x;
    this.y = y || this.y;
    return this;
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

export {DataShader, Point, PolyPoint};
