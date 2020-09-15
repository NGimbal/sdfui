//primitives.js
/*

//Not yet implemented
Dist() //returns distance to primitive at a point for selection
getSharer() //returns shader function for object
SVG() //returns svg of polyline
3dm() //returns RhinoCompute representation

*/

'use strict';

// import * as THREE from './libjs/three.module.js';
import {gl, dPt, state} from './draw.js';
import { Float16Array, getFloat16, setFloat16, hfround } from "@petamoriken/float16";
import * as chroma from 'chroma-js';
import * as twgl from 'twgl.js';

//simple class for packaging shader and polypoint
export class DataShader{
  constructor(shader, parameters){
    this.shader = shader;
    this.parameters = parameters;
  }
}

//simple point, color vector
export class vec{
  constructor(x, y, z, w, pId, id, update){
    this.x = x || 0;
    this.y = y || 0;
    this.z = z || 0;
    this.w = w || 0;
    //parentId
    this.parentId = pId || "";

    this.id = id || (+new Date).toString(36).slice(-8);
    this.update = update || false;
  }
}

export function vecSet(vec, x, y, z, w){
  vec.x = x || vec.x;
  vec.y = y || vec.y;
  vec.z = z || vec.z;
  vec.w = w || vec.w;
  return vec;
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

export class bbox{
  //input array of points calculate min, max, width, height
  constructor(points, _offset){
    let offset;
    if(typeof _offset == 'undefined') offset = 0.05;
    else offset = _offset;

    points.sort((a,b) => (a.x < b.x) ? -1 : 1);
    let minX = points[0].x - offset;
    let maxX = points[points.length-1].x + offset;
    
    points.sort((a,b) => (a.y < b.y) ? -1 : 1);
    let minY = points[0].y - offset;
    let maxY = points[points.length-1].y + offset;

    this.min = new vec(minX, minY);
    this.max = new vec(maxX, maxY);
    this.width = maxX - minX;
    this.height = maxY - minY;
  }
}

export var propsDefault = {
  type:"",
  filter:"",
  stroke: "#ffa724",
  fill: "#0600b5",
  weight:0.001,
  radius:0.001,
  opacity:0.85,
}

export class prim{
  constructor(type, pts, _props, id, pId, merge){
    this.type = type;
    //list of point ids
    this.pts = pts || [];
    this.properties = _props || {...propsDefault};
    this.needsUpdate = false;
    this.id = id ||  (+new Date).toString(36).slice(-8);
    //parent id
    this.pId = pId || "";

    let idCol = chroma.random();
    this.idCol = twgl.v3.create(idCol.gl()[0], idCol.gl()[1], idCol.gl()[2]);
    this.idColHex = idCol.hex();

    //scene merge
    this.merge = merge || "union";
  }
}

//PolyPoint is an array of points, a texture representation and properties
//Another class e.g. PolyLine extends PolyPoint to manipulate and bake
export class PolyPoint{

  //creates empty PolyPoint object
  constructor(_dataSize){
    // this.properties = properties;
    this.dataSize = _dataSize || 16;

    //list of points
    this.pts=[];

    //cTexel is incremented at beginning of AddPoint
    //that way after adding a point reading cTexel gives current texel referemce
    this.cTexel = -1.0;

    this.data = new Uint16Array(4 * this.dataSize * this.dataSize);

    this.texture = twgl.createTexture(gl, {
        unpackAlignnment: 1,
        minMag: gl.NEAREST,
        src: this.data,
        width: this.dataSize,
        height: this.dataSize,
        wrap: gl.CLAMP_TO_EDGE,
        internalFormat: gl.RGBA16F,
        format: gl.RGBA,
        type: gl.HALF_FLOAT,
        wrap: gl.CLAMP_TO_EDGE,
      });

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

    this.texture = twgl.createTexture(gl, {
        unpackAlignnment: 1,
        minMag: gl.NEAREST,
        src: data,
        width: dataSize,
        height: dataSize,
        wrap: gl.CLAMP_TO_EDGE,
        internalFormat: gl.RGBA16F,
        format: gl.RGBA,
        type: gl.HALF_FLOAT,
        wrap: gl.CLAMP_TO_EDGE,
      });

    newPolyPoint.data = data;
    newPolyPoint.ptsTex = ptsTex;

    let id = this.id;
    newPolyPoint.id = id;

    return newPolyPoint;
  }

  //adds point to polyPoint
  //point x, y, z, w are stored as HalfFloat16
  //https://github.com/petamoriken/float16
  addPoint(_pt, pId){
    let x = _pt.x;
    let y = _pt.y;
    let z = _pt.z || 1.0;
    let w = _pt.w || 1.0;

    let pt = new vec(x, y, z, w, pId);

    this.cTexel++;

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

    //this seems to be working...
    this.data[index] = view.getUint16(0, endD);
    this.data[index + 1] = view.getUint16(16, endD);
    this.data[index + 2] = view.getUint16(32, endD);
    this.data[index + 3] = view.getUint16(48, endD);

    twgl.setTextureFromArray(gl, this.texture, this.data, {
      internalFormat: gl.RGBA16F,
      format: gl.RGBA,
      type: gl.HALF_FLOAT,
    });

    let texData = [view.getUint16(0, endD), view.getUint16(16, endD), view.getUint16(32, endD), view.getUint16(48, endD)];

    this.pts.push(pt);

    return pt;
  }

}

//https://www.iquilezles.org/www/articles/distfunctions2d/distfunctions2d.htm
export function distPrim(_mPt, prim){
  let mPt = {};
  //until we switch out mPt for a twgl.v3
  if (_mPt.x){
    mPt = twgl.v3.create(_mPt.x, _mPt.y, _mPt.z);
  } else {
    mPt = _mPt;
  }

  let dist = 1000;
  switch (prim.type){
    case  "polyline":
      dist = Math.min(dist, pLineDist(mPt, prim));
      break;
    case "polygon":
      dist = Math.min(dist, polygonDist(mPt, prim));
      break;
    case "circle":
      dist = Math.min(dist, circleDist(mPt, prim));
      break;
    case "rectangle":

      // dist = Math.min(dist, polygonDist(p, prim));
      break;
    default:
      break;
  }
  return dist;
}

//returns distance to a poly line
function pLineDist(mPt, prim){
  if (prim.type != "polyline"){
    console.log("pLineDist() called on primitive of " + prim.type + " type.");
    console.log(prim);
    return 1000;
  }
  let dist = 1000;
  let prev;
  for (let _p of prim.pts){
    let p = state.scene.pts.find(pt => pt.id == _p);

    if(typeof prev === 'undefined'){
      prev = p;
      continue;
    }

    dist = Math.min(dist, lineDist(mPt, prev, p, prim.properties.weight));

    prev = p;
  }
  return dist;
}

//returns distance to a poly line
function polygonDist(mPt, prim){
  if (prim.type != "polygon"){
    console.log("polygonDist() called on primitive of " + prim.type + " type.");
    // console.log(prim);
    return 1000;
  }
  // let dist = 1000;
  let _prev = state.scene.pts.find(pt => pt.id == prim.pts[prim.pts.length - 1]);
  let prev = twgl.v3.create(_prev.x, _prev.y, 0);
  
  let _first = state.scene.pts.find(pt => pt.id == prim.pts[0]);
  let first = twgl.v3.create(_first.x, _first.y, 0);
  first = twgl.v3.subtract(mPt, first);

  let dist = twgl.v3.dot(first,first);
  let s = 1;

  for (let _p of prim.pts){
    let _pt = state.scene.pts.find(pt => pt.id == _p);
    let p = twgl.v3.create(_pt.x, _pt.y, 0);

    let e = twgl.v3.subtract(prev, p);
    let w = twgl.v3.subtract(mPt, p);

    let b = twgl.v3.subtract(w, twgl.v3.mulScalar(e, clamp(twgl.v3.dot(w,e) / twgl.v3.dot(e,e), 0.0, 1.0)));

    dist = Math.min(dist, twgl.v3.dot(b,b));

    let c = {
      x: mPt[1] >= p[1],
      y: mPt[1] < prev[1],
      z: e[0] * w[1] > e[1] * w[0]
    }

    if( (c.x && c.y && c.z) || (!c.x && !c.y && !c.z) ) s *= -1;

    prev = p;
  }
  dist = s * Math.sqrt(dist);
  return dist;
}

//returns distance to a poly line
function circleDist(mPt, prim){
  if (prim.type != "circle"){
    console.log("circleDist() called on primitive of " + prim.type + " type.");
    console.log(prim);
    return 1000;
  }
  let dist = 1000;
  console.log(prim);
  return dist;
}

//returns distance to a line
function lineDist(p, _a, _b, w){
  let a, b;
  if (_a.x){
    a = twgl.v3.create(_a.x, _a.y, 0);
  } else {
    a = _a;
  }

  if (_b.x){
    b = twgl.v3.create(_b.x, _b.y, 0);
  } else {
    b = _b;
  }

  let pa = twgl.v3.subtract(p, a);
  let ba = twgl.v3.subtract(b, a);
  let dot = twgl.v3.dot(pa,ba) / twgl.v3.dot(ba,ba);
  let h =  clamp(dot, 0.0, 1.0);
  //don't know why w needs to be squared here
  return twgl.v3.length(twgl.v3.subtract(pa, twgl.v3.mulScalar(ba, h))) - w * 5;
}

function clamp (a, low, high){
  return Math.min(Math.max(a, low), high);
}