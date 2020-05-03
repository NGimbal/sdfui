//layers.js
'use strict';

// https://webgl2fundamentals.org/webgl/lessons/webgl-render-to-texture.html
// https://webgl2fundamentals.org/webgl/lessons/webgl-data-textures.html
// https://webgl2fundamentals.org/webgl/lessons/webgl-2d-matrix-stack.html
// https://twgljs.org/docs/index.html

//layer is created by a primitive, or shader function
//the texture and the vert and the frag can be generated by prim
//uniforms are generated from prim properties

//one difference between "Edit" frags and "Stub" frags is that
//edit frags need to get mPt and dPt automatically, maybe other uniforms
//need to be able to convert between edit and baked layer

//layers also should be able to be created by combining multiple prims

//dimensional constraints could be at the point level
//point.x = 7
//point a = point b
//point = (scene.points.['id']) => { scene.points.['id'] }
//point a = 5units from point b
//point = (scene.points.['id'], dist) => { (scene.points.['id'] - point) * dist }

import {gl, state, resolution, mPt, dPt} from './index.js';
import * as FS from './frag/frags.js';
import * as BAKE from './bakeLayer.js';
import * as PRIM from './primitives.js';

// to be treated as a drawObject by twgl we need these properties
// { programInfo: programInfo,
//   bufferInfo: plane,
//   uniforms: this.uniforms,}
// can't have property named "type"
export class Layer {
  constructor(prim, vert, frag, _uniforms){
    let uniforms = _uniforms || getUniforms(prim.type);

    if(typeof prim != 'object' || typeof vert != 'string' || typeof frag != 'string' || typeof uniforms != 'object'){
      console.log('layer constructor is invalid, check inputs');
      return;
    }
    //not allowed to have prop named type
    this.primType = prim.type.slice();

    this.vert = vert.slice();
    this.frag = frag.slice();
    this.uniforms = {...uniforms};

    // if this is really associated with a primitive
    if(prim.id){
      this.prim = prim.id.slice();  
      // data texture
      this.editTex = new PRIM.PolyPoint(16);
      this.uniforms.u_eTex = this.editTex;
      this.uniforms.u_cTex = this.editTex.cTexel;
      this.uniforms.u_idCol = twgl.v3.copy(prim.idCol);
    }
    
    //layer properties
    this.properties = {...state.ui.properties};
    //bbox is set on bake
    this.bbox = null;
    this.needsUpdate = false;
    this.id = (+new Date).toString(36).slice(-8);

    //creates a full screen layer
    this.matrix = twgl.m4.ortho(0, gl.canvas.clientWidth, gl.canvas.clientHeight, 0, -1, 1);
    this.matrix = twgl.m4.translate(this.matrix, twgl.v3.create(0, 0, 0));
    this.matrix = twgl.m4.scale(this.matrix, twgl.v3.create(gl.canvas.width, gl.canvas.height, 1));

    this.uniforms.u_matrix = this.matrix;

    //create program
    this.programInfo = twgl.createProgramInfo(gl, [vert, frag]);

    //create plane
    let positions = new Float32Array([0,0, 0,1, 1,0, 1,0, 0,1, 1,1,]);

    let texcoords = new Float32Array([0,0, 0,1, 1,0, 1,0, 0,1, 1,1,]);

    var arrays = {
      position: {numComponents: 2, data: positions},
      texcoord: {numComponents: 2, data:texcoords}
    }

    // this is the plane
    this.bufferInfo = twgl.createBufferInfoFromArrays(gl, arrays);

    gl.useProgram(this.programInfo.program);

    twgl.setBuffersAndAttributes(gl, this.programInfo, this.bufferInfo);
  }
}

export function setBoundingBox(layer){
  if(layer.primType == 'polygon' || layer.primType == 'polyline' || layer.primType == 'rectangle'){
    layer.bbox = new PRIM.bbox(layer.editTex.pts);
  } else if (layer.primType == 'circle'){
    // here 1 should be radius
    // this is kind of weird. 
    layer.bbox = new PRIM.bbox([layer.editTex.pts[0]], 1.);
  }

  // console.log(layer.bbox);
  updateMatrices(layer);
}

//updates position and texture clipping matrices for layer
export function updateMatrices(layer){
  // texture clipping per:
  // https://webgl2fundamentals.org/webgl/lessons/webgl-2d-drawimage.html
  let minX = ((layer.bbox.min.x * (64. / dPt[2]) + dPt[0]) * resolution.x) * (resolution.y/resolution.x);
  let minY = ((layer.bbox.min.y * (64. / dPt[2]) + dPt[1]) * resolution.y);
  
  let width = ((layer.bbox.width * (64. / dPt[2])) * resolution.x) * (resolution.y/resolution.x);
  let height = (layer.bbox.height * (64. / dPt[2])) * resolution.y;
  
  //matrix transformation, transformation can be baked into layer
  layer.matrix = twgl.m4.ortho(0, gl.canvas.clientWidth, gl.canvas.clientHeight, 0, -1, 1);

  layer.matrix = twgl.m4.translate(layer.matrix, twgl.v3.create(minX, minY, 0));
  // scale our 1 unit quad - from 1 unit to texWidth, texHeight units
  layer.matrix = twgl.m4.scale(layer.matrix, twgl.v3.create(width, height, 1));

  layer.uniforms.u_matrix = layer.matrix;

  let texMatrix = twgl.m4.translation(twgl.v3.create(minX / resolution.x, minY / resolution.y, 0));
  texMatrix = twgl.m4.scale(texMatrix, twgl.v3.create(width / resolution.x, height / resolution.y, 1));
  // layer.uniforms.u_resolution = twgl.v3.create(width, height, 0);
  layer.uniforms.u_textureMatrix = texMatrix;
}

//bakes layer
export function bakeLayer(layer){
  //set bounding box
  setBoundingBox(layer);
  
  let fs = BAKE.bake(layer);
  layer.frag = fs;

  layer.programInfo = twgl.createProgramInfo(gl, [layer.vert, fs]);
  
  gl.useProgram(layer.programInfo.program);
  twgl.setUniforms(layer.programInfo, layer.uniforms);
}

//create new edit layer of a certain primitive type
export function createEditLayer(prim){
  let uniforms = getUniforms(prim.type);

  //get program stub for prim type
  let fs = getFragStub(prim.type, true);
  
  let vs = FS.simpleVert.slice();

  //return new Layer
  let layer = new Layer(prim, vs, fs, uniforms);
  
  return layer;
}

export function bakePrim(prim){
  let layer = createLayerFromPrim(prim);
  bakeLayer(layer);
}

//create a layer from a fully fledged primitive
export function createLayerFromPrim(prim, edit, _uniforms){
  let uniforms = {};
  if(_uniforms){
    uniforms = {..._uniforms};
  } else {
    uniforms = getUniforms(prim.type);
  }

  //get program stub for prim type
  let fs = getFragStub(prim.type, edit);
  
  let vs = FS.simpleVert.slice();
  
  //get the points
  let pts = [];
  if(prim.pts.length > 0){
    for (let p of state.scene.pts){
      if(prim.pts.includes(p.id)){
        pts.push(p);
      }
    }
  }
  // which of these methods is better?
  // scenePts = [...state.scene.pts];
  // scenePts.filter(p => prim.pts.includes(p.id));

  //return new Layer
  let layer = new Layer(prim, vs, fs, uniforms);
  
  for(let p of pts){
    layer.uniforms.u_eTex.addPoint(p);
  }
  //also if edit = false;
  //maybe we have prim points but we want to be editing?
  if(prim.pts.length > 0){
    setBoundingBox(layer);
  }
  return layer;
}

//does this function need to be public?
//returns edit frag or stub frag depending on edit param
export function getFragStub(type, edit){
  switch(type){
    case'polyline':
      return edit ? FS.pLineEdit.slice() : FS.pLineStub.slice();
    case'polygon':
      return edit ? FS.polygonEdit.slice() : FS.polygonStub.slice();
    case'circle':
      return edit ? FS.circleEdit.slice() : FS.circleStub.slice();
    case'rectangle':
      return edit ? FS.rectangleEdit.slice() : FS.rectangleStub.slice();
    default:
      return FS.pLineStub.slice();
  }
}

//get uniforms by prim type
function getUniforms(type){
  //full screen texture matrix
  let texMatrix = twgl.m4.translation(twgl.v3.create(0,0,0));
  texMatrix = twgl.m4.scale(texMatrix, twgl.v3.create(1, 1, 1));
  
  switch(type){
    case'polyline':
      return {
        // u_matrix: matrix,
        // u_idColor: [3],
        u_textureMatrix: twgl.m4.copy(texMatrix),
        u_resolution: twgl.v3.create(gl.canvas.width, gl.canvas.height, 0),
        u_mPt: twgl.v3.create(mPt.x, mPt.y, 0),
        u_dPt: twgl.v3.create(dPt[0], dPt[1], 0),
        u_eTex: {},
        u_weight: state.ui.properties.weight,
        u_opacity: state.ui.properties.opacity,
        u_stroke: chroma(state.ui.properties.stroke).gl().slice(0,3),
      }
    case'polygon':
      return {
        // u_matrix: matrix,
        // u_idColor: [3],
        u_textureMatrix: twgl.m4.copy(texMatrix),
        u_resolution: twgl.v3.create(gl.canvas.width, gl.canvas.height, 0),
        u_mPt: twgl.v3.create(mPt.x, mPt.y, 0),
        u_dPt: twgl.v3.create(dPt[0], dPt[1], 0),
        u_eTex: {},
        u_cTex: -1,
        u_weight: state.ui.properties.weight,
        u_opacity: state.ui.properties.opacity,
        u_stroke: chroma(state.ui.properties.stroke).gl().slice(0,3),
        u_fill: chroma(state.ui.properties.fill).gl().slice(0,3),
      }
    case'circle':
      return {
        // u_matrix: matrix,
        // u_idColor: [3],
        u_textureMatrix: twgl.m4.copy(texMatrix),
        u_resolution: twgl.v3.create(gl.canvas.width, gl.canvas.height, 0),
        u_mPt: twgl.v3.create(mPt[0], mPt[1], 0),
        u_dPt: twgl.v3.create(dPt[0], dPt[1], 0),
        u_eTex: {},
        u_cTex: -1,
        u_weight: state.ui.properties.weight,
        u_opacity: state.ui.properties.opacity,
        u_stroke: chroma(state.ui.properties.stroke).gl().slice(0,3),
        u_fill: chroma(state.ui.properties.fill).gl().slice(0,3),
      }
    case'rectangle':
      return {
        // u_matrix: matrix,
        // u_idColor: [3],
        u_textureMatrix: twgl.m4.copy(texMatrix),
        u_resolution: twgl.v3.create(gl.canvas.width, gl.canvas.height, 0),
        u_mPt: twgl.v3.create(mPt.x, mPt.y, 0),
        u_dPt: twgl.v3.create(dPt[0], dPt[1], 0),
        u_eTex: {},
        u_cTex: -1,
        u_weight: state.ui.properties.weight,
        u_opacity: state.ui.properties.opacity,
        u_stroke: chroma(state.ui.properties.stroke).gl().slice(0,3),
        u_fill: chroma(state.ui.properties.fill).gl().slice(0,3),
        u_radius: 0.01,
      }
    default:
      return {
        // u_matrix: matrix,
        // u_idColor: [3],
        u_textureMatrix: twgl.m4.copy(texMatrix),
        u_resolution: twgl.v3.create(gl.canvas.width, gl.canvas.height, 0),
        u_mPt: twgl.v3.create(mPt.x, mPt.y, 0),
        u_dPt: twgl.v3.create(dPt[0], dPt[1], 0),
        u_eTex: {},
        u_weight: state.ui.properties.weight,
        u_opacity: state.ui.properties.opacity,
        u_stroke: chroma(state.ui.properties.stroke).gl().slice(0,3),
      }
  }
}