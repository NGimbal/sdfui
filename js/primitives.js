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
import * as HINT from './uihints.js';
import {gl, dPt} from './sdfui.js';

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
    let offset = _offset || 0.05;

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
    this.pId = pId || "";
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

    //---------------------------This is the new paradigm

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


    // this.ptsTex = new THREE.DataTexture(this.data, this.dataSize, this.dataSize, THREE.RGBAFormat, THREE.HalfFloatType);

    // this.ptsTex.magFilter = THREE.NearestFilter;
    // this.ptsTex.minFilter = THREE.NearestFilter;
    //---------------------------This is the new paradigm

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
    // let ptsTex = new THREE.DataTexture(data, dataSize, dataSize, THREE.RGBAFormat, THREE.HalfFloatType);
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
    //
    // this.ptsTex.image.data[index] = view.getUint16(0, endD);
    // this.ptsTex.image.data[index + 1] = view.getUint16(16, endD);
    // this.ptsTex.image.data[index + 2] = view.getUint16(32, endD);
    // this.ptsTex.image.data[index + 3] = view.getUint16(48, endD);

    // this.ptsTex.needsUpdate = true;

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

    // console.log(this.textures.data);

    let texData = [view.getUint16(0, endD), view.getUint16(16, endD), view.getUint16(32, endD), view.getUint16(48, endD)];

    this.pts.push(pt);

    return pt;
  }

}
