//primitives.js
'use strict';

import {gl, state} from '../app/draw.js';
import {getFloat16, setFloat16} from "@petamoriken/float16";

import * as chroma from 'chroma-js';
import * as twgl from 'twgl.js';

//uuid function
export function uuid(){
  return (+new Date).toString(36).slice(-8);
}

// https://stackoverflow.com/questions/105034/how-to-create-a-guid-uuid
// export function uuid() {
//   var d = new Date().getTime();//Timestamp
//   var d2 = (performance && performance.now && (performance.now()*1000)) || 0;//Time in microseconds since page-load or 0 if unsupported
//   return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
//       var r = Math.random() * 16;//random number between 0 and 16
//       if(d > 0){//Use timestamp until depleted
//           r = (d + r)%16 | 0;
//           d = Math.floor(d/16);
//       } else {//Use microseconds since page-load if supported
//           r = (d2 + r)%16 | 0;
//           d2 = Math.floor(d2/16);
//       }
//       return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
//   });
// }

//simple class for packaging shader and polypoint
export class DataShader{
  constructor(shader, parameters){
    this.shader = shader;
    this.parameters = parameters;
  }
}

// simple point, color vector
// ideally this would be a thin wrapper around twgl v3
export class vec{
  constructor(x, y, z, w, pId, id, update){
    this.v3 = twgl.v3.create(x, y, 0.0);

    this.x = x || 0;
    this.y = y || 0;
    this.z = z || 0.0;
    this.w = w || 0.0;

    //this is to conform to rbush data structure req
    this.minX = x;
    this.maxX = x;
    this.minY = y;
    this.maxY = y;

    //parentId
    this.parent = pId || "";

    this.id = id || uuid();
    this.update = update || false;
  }
}

export function vecSet(vec, x, y, z, w){
  vec.x = x || vec.x;
  vec.y = y || vec.y;
  vec.z = z || vec.z;
  vec.w = w || vec.w;

  this.v3 = twgl.v3.create(vec.x, vec.y, vec.z);

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

export function dotVec(a, b){
  let x = a.x * b.x;
  let y = a.y * b.y;
  return x + y;
}

export function angleVec(_vec){
  return (Math.atan2( - _vec.y, - _vec.x ) + Math.PI);
}

export function distVec (a, b){
  let dx = a.x - b.x;
  let dy = a.y - b.y;
  return Math.sqrt(dx*dx + dy*dy);
}

export function addVec(a, b){
  // this is to handle adding vec and twgl v3
  let x, y;
  if(b.x) {
    // return new vec(a.x + b.x, a.y + b.y);
    x = a.x + b.x;
    y = a.y + b.y;
  } else {
    // return new vec(a.x + b[0], a.y + b[1]);
    x = a.x + b[0];
    y = a.y + b[1];
  }
  return {...a, 
             x: x, 
             y: y,
             minX:x,
             maxX:x,
             minY:y,
             maxY:y,
             v3: twgl.v3.create(x, y, 0.0)}
}

export function subVec (a, b){
  let bInv = vecSet(b, b.x * -1, b.y * -1);
  return addVec(a, bInv);
}

export class bbox{
  // input prim calculate bbox
  // sometimes has to operate on a layer
  constructor(prim, _offset){
    let points = prim.pts ? [...prim.pts] : [...prim.uniforms.u_eTex.pts];
    let type = prim.type ? prim.type : prim.primType;
    let offset = _offset ? _offset : 0.05;

    if(!prim.id) {console.log("Bounding box created with no object Id")}
    else {this.id = prim.id.slice()}

    switch(type){
      //polygon, polyline, rectangle all can default to this
      case('polyline'):
        points.sort((a,b) => (a.x < b.x) ? -1 : 1);
        this.minX = points[0].x - offset;
        this.maxX = points[points.length-1].x + offset;

        points.sort((a,b) => (a.y < b.y) ? -1 : 1);
        this.minY = points[0].y - offset;
        this.maxY = points[points.length-1].y + offset;

        break;
      case('polygon'):
        points.sort((a,b) => (a.x < b.x) ? -1 : 1);
        this.minX = points[0].x - offset;
        this.maxX = points[points.length-1].x + offset;

        points.sort((a,b) => (a.y < b.y) ? -1 : 1);
        this.minY = points[0].y - offset;
        this.maxY = points[points.length-1].y + offset;

        break;
      case('circle'):
        let radius = distVec(points[0], points[1]);
        this.minX = points[0].x - radius - offset;
        this.maxX = points[0].x + radius + offset;
        this.minY = points[0].y - radius - offset;
        this.maxY = points[0].y + radius + offset;
        break;
      case('ellipse'): // this is a quite wasteful but whatevs
        let dims = absV3(twgl.v3.subtract(points[0].v3, points[1].v3));
        this.minX = points[0].x - dims[0] - offset;
        this.maxX = points[0].x + dims[0] + offset;
        this.minY = points[0].y - dims[1] - offset;
        this.maxY = points[0].y + dims[1] + offset;
        break;
      case('rectangle'):
        this.minX = Math.min(points[0].x, points[1].x) - offset;
        this.maxX = Math.max(points[0].x, points[1].x) + offset;
        this.minY = Math.min(points[0].y, points[1].y) - offset;
        this.maxY = Math.max(points[0].y, points[1].y) + offset;
        break;
      case('img'):
        this.minX = points[0].x;
        this.minY = points[0].y;
        this.maxX = points[1].x;
        this.maxY = points[1].y;
    }

    this.min = new vec(this.minX, this.minY);
    this.max = new vec(this.maxX, this.maxY);
    this.width = this.maxX - this.minX;
    this.height = this.maxY - this.minY;

  }
}

export var propsDefault = {
  type:"",
  filter:"",
  stroke: "#4682b4",
  fill: "#efefef",
  weight:0.001,
  radius:0.001,
  opacity:1.0,
  sel: 0.0,  //deselected by default when it's "baked"
}

export class prim{
  constructor(type, pts, _props, id, _bbox){
    this.type = type;
    //list of point ids
    this.pts = pts || [];
    this.properties = _props || {...propsDefault};
    
    this.update = false;
        
    this.id = id ||  uuid();

    let idCol = chroma.random();
    this.idCol = twgl.v3.create(idCol.gl()[0], idCol.gl()[1], idCol.gl()[2]);
    this.idColHex = idCol.hex();

    this.translate = twgl.v3.create();

    // if(typeof _bbox !== "object") console.log(_bbox);

    this.bbox = _bbox || null;
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
    this.id = uuid();
  }

  clone(){
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

  // adds point to polyPoint
  // point x, y, z, w are stored as HalfFloat16
  // https://github.com/petamoriken/float16
  addPoint(_pt, pId){
    let x = _pt.x;
    let y = _pt.y;
    let z = _pt.z || 0.0;
    let w = _pt.w || 0.0;

    let pt = new vec(x, y, z, w, pId);

    this.cTexel++;

    let index = this.cTexel * 4;

    // use view.setFloat16() to set the digits in the DataView
    // then use view.getUint16 to retrieve and write to data Texture
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

  // let mPt = twgl.v3.copy(_mPt.v3);

  let tPt = twgl.v3.subtract(mPt, prim.translate);
  // let tPt = mPt;
  
  let dist = 1000;
  switch (prim.type){
    case  "polyline":
      dist = Math.min(dist, pLineDist(tPt, prim));
      break;
    case "polygon":
      dist = Math.min(dist, polygonDist(tPt, prim));
      break;
    case "circle":
      dist = Math.min(dist, circleDist(tPt, prim));
      break;
    case "ellipse":
      dist = Math.min(dist, ellipseDist(tPt, prim));
      break;
    case "rectangle":
      dist = Math.min(dist, rectDist(tPt, prim));
      break;
    case "img":
      dist = Math.min(dist, rectDist(tPt, prim));
      break;
    default:
      break;
  }
  return dist;
}

//return distance to a rectangle
function rectDist(mPt, prim){

  let ptA = twgl.v3.copy(prim.pts[0].v3);
  let ptB = twgl.v3.copy(prim.pts[1].v3);

  let center = twgl.v3.add(twgl.v3.mulScalar(twgl.v3.subtract(ptB, ptA), 0.5), ptA);
  let b = twgl.v3.subtract(ptB, center);
  b = twgl.v3.create(Math.abs(b[0]), Math.abs(b[1]));

  let radius = twgl.v3.create(prim.properties.radius, prim.properties.radius);

  twgl.v3.subtract(b, radius, b);

  let uv = twgl.v3.subtract(mPt, center);
  let d = twgl.v3.subtract(twgl.v3.create(Math.abs(uv[0]), Math.abs(uv[1])), b);

  let dist = twgl.v3.length(twgl.v3.max(d,twgl.v3.create(0,0))) + Math.min(Math.max(d[0], d[1]),0) - radius[0];
  
  return dist;
}

//returns distance to a poly line
function pLineDist(mPt, prim){
  if (prim.type != "polyline"){ return 1000; }

  let dist = 1000;
  let prev;
  for (let p of prim.pts){
    
    if(typeof prev === 'undefined'){
      prev = p;
      continue;
    }

    // TODO: return h from lineDist
    let lD = lineDist(mPt, prev, p, prim.properties.weight);

    // TODO: if lD < dist, return (dist, {a: prev, b: p}, h)
    dist = Math.min(dist, lD);
    
    prev = p;
  }
  return dist;
}

//returns distance to a poly line
function polygonDist(mPt, prim){

  let prev = twgl.v3.copy(prim.pts[prim.pts.length - 1].v3);

  let first = twgl.v3.copy(prim.pts[0].v3);
  first = twgl.v3.subtract(mPt, first);

  let dist = twgl.v3.dot(first,first);
  let s = 1;

  for (let _p of prim.pts){
    // let _pt = state.scene.pts.find(pt => pt.id == _p);
    let p = twgl.v3.copy(_p.v3);

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

//returns distance to a circle
function circleDist(mPt, prim){

  let ptA = twgl.v3.copy(prim.pts[0].v3);
  let ptB = twgl.v3.copy(prim.pts[1].v3);
  
  let radius = twgl.v3.distance(ptA, ptB);
  let uv = twgl.v3.subtract(mPt, ptA);

  let dist = twgl.v3.length(uv) - radius;

  return dist;
}

// twgl.v3 a, twgl.v3 b
function clampV3(a, _min, _max){
  let min = twgl.v3.create(_min,_min,0.0);
  let max = twgl.v3.create(_max,_max,0.0);

  return twgl.v3.min(twgl.v3.max(a,min),max);
}

function absV3(a){
  return twgl.v3.create(Math.abs(a[0]),
                        Math.abs(a[1]),
                        Math.abs(a[2]));
}

// returns distance to an ellipse
function ellipseDist(mPt, prim){

  // ptA is center of the ellipse
  let ptA = twgl.v3.copy(prim.pts[0].v3);

  let ptB = twgl.v3.copy(prim.pts[1].v3);
  let e = twgl.v3.max(twgl.v3.subtract(ptB, ptA), twgl.v3.create(0.1,0.1,0.0));

  let pAbs = absV3(twgl.v3.subtract(mPt, ptA));
  
  // not sure if the z value should be 0 or 1
  let ei = twgl.v3.divide(twgl.v3.create(1.0,1.0,1.0), e);
  let e2 = twgl.v3.multiply(e, e);
  let ve = twgl.v3.multiply(ei, twgl.v3.create(e2[0] - e2[1], e2[1] - e2[0], 0.0));

  let t = twgl.v3.create(0.70710678118654752, 0.70710678118654752, 0.0);

  for(let i = 0; i < 3; i++){
    let v = twgl.v3.multiply(ve, t);
    twgl.v3.multiply(v,t,v);
    twgl.v3.multiply(v,t,v);
    let u = twgl.v3.normalize(twgl.v3.subtract(pAbs, v));
    twgl.v3.multiply(u,twgl.v3.length(twgl.v3.subtract(twgl.v3.multiply(t,e),v)),u);
    let w = twgl.v3.multiply(ei, twgl.v3.add(v, u));
    t = twgl.v3.normalize(clampV3(w, 0.0, 1.0));
  }

  let nearestAbs = twgl.v3.multiply(t, e);
  let dist = twgl.v3.length(twgl.v3.subtract(pAbs, nearestAbs));

  return twgl.v3.dot(pAbs, pAbs) < twgl.v3.dot(nearestAbs, nearestAbs) ?
         -1 * dist : dist;

  // shader code -----
  // vec2 pAbs = abs(p);
  // vec2 ei = 1.0 / e;
  // vec2 e2 = e*e;
  // vec2 ve = ei * vec2(e2.x - e2.y, e2.y - e2.x);
  
  // vec2 t = vec2(0.70710678118654752, 0.70710678118654752);
  // for (int i = 0; i < 3; i++) {
  //     vec2 v = ve*t*t*t;
  //     vec2 u = normalize(pAbs - v) * length(t * e - v);
  //     vec2 w = ei * (v + u);
  //     t = normalize(clamp(w, 0.0, 1.0));
  // }
  
  // vec2 nearestAbs = t * e;
  // float dist = length(pAbs - nearestAbs);
  // return dot(pAbs, pAbs) < dot(nearestAbs, nearestAbs) ? -dist : dist;
  // shader code ------
  // function call ----
  // dist = sdEllipse(uv - center, max(abs(u_mPt.xy - center), vec2(0.01,0.01)));

}

//returns distance to a line
function lineDist(p, _a, _b, w){

  let a = twgl.v3.copy(_a.v3);
  let b = twgl.v3.copy(_b.v3);

  let pa = twgl.v3.subtract(p, a);
  let ba = twgl.v3.subtract(b, a);
  let dot = twgl.v3.dot(pa,ba) / twgl.v3.dot(ba,ba);
  let h =  clamp(dot, 0.0, 1.0);

  return twgl.v3.length(twgl.v3.subtract(pa, twgl.v3.mulScalar(ba, h))) - w;
}

function clamp (a, low, high){
  return Math.min(Math.max(a, low), high);
}