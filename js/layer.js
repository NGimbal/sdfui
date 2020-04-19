//layers.js
'use strict';

// https://webgl2fundamentals.org/webgl/lessons/webgl-render-to-texture.html
// https://webgl2fundamentals.org/webgl/lessons/webgl-data-textures.html
//https://webgl2fundamentals.org/webgl/lessons/webgl-2d-matrix-stack.html
// https://twgljs.org/docs/index.html

//Instead of an array of edit items, we are going to end up with an array of layers
//order of array will create layer order
//layers are a pre rendered sdf tile with its transform and bounding box
//Additionally layers will have reference to the object data (points),
//      sdf shader program, method for compiling / updateing shader, uniforms
//      and override composite program if relevant
//The edit layer will be rendered first by default, defaults to fullscreen,
//      with a pre compiled program for whatever edit tool is active

import {gl, state} from './sdfui.js';

// to be treated as a drawObject by twgl we need these properties
// {
//   programInfo: programInfo,
//   bufferInfo: plane,
//   uniforms: this.uniforms,
// }
export class Layer {
  constructor(prim, vert, frag, uniforms){
    if(typeof prim != 'object' || typeof vert != 'string' || typeof frag != 'string' || typeof uniforms != 'object'){
      console.log('layer constructor is invalid, check inputs');
      return;
    }

    this.prim = prim;
    this.vert = vert;
    this.frag = frag;
    this.uniforms = uniforms;

    // data texture
    // this.editTex = new PRIM.PolyPoint(16);
    this.editTex = uniforms.u_eTex;

    //layer properties
    this.properties = {...state.ui.properties};
    //bbox is set on bake
    this.bbox = null;
    this.needsUpdate = false;

    //creates a full screen layer
    //matrix transformation, transformation can be baked into layer
    this.matrix = twgl.m4.ortho(0, gl.canvas.clientWidth, gl.canvas.clientHeight, 0, -1, 1);
    // translate our quad to dstX, dstY
    this.matrix = twgl.m4.translate(this.matrix, twgl.v3.create(0, 0, 0));
    // scale our 1 unit quad - from 1 unit to texWidth, texHeight units
    // will also want to translate/rotate plane at some point
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

  //returns new layer of this same type?
  bakeLayer(){
    setBoundingBox();


  }

  setBoundingBox(){
    this.bbox = new PRIM.bbox(this.editTex.pts);
  }

  compileShader(){
    //bakes a more performant sha
  }

  // this is an idea for the future
  // renderToTexture(){
  //
  // }
}

//
// //creates full screen layer
// export function createLayer(name, programInfo, uniforms){
//
//   //matrix transformation, transformation can be baked into textureInfo
//   let matrix = twgl.m4.ortho(0, gl.canvas.clientWidth, gl.canvas.clientHeight, 0, -1, 1);
//   // translate our quad to dstX, dstY
//   matrix = twgl.m4.translate(matrix, twgl.v3.create(0, 0, 0));
//
//   // scale our 1 unit quad
//   // from 1 unit to texWidth, texHeight units
//   // will also want to translate/rotate plane at some point
//   matrix = twgl.m4.scale(matrix, twgl.v3.create(gl.canvas.width, gl.canvas.height, 1));
//
//   uniforms.u_matrix = matrix;
//
//   //create plane
//   let positions = new Float32Array([0,0, 0,1, 1,0, 1,0, 0,1, 1,1,]);
//
//   let texcoords = new Float32Array([0,0, 0,1, 1,0, 1,0, 0,1, 1,1,]);
//
//   var arrays = {
//     position: {numComponents: 2, data: positions},
//     texcoord: {numComponents: 2, data:texcoords}
//   }
//
//   let plane = twgl.createBufferInfoFromArrays(gl, arrays);
//
//   gl.useProgram(programInfo.program);
//
//   twgl.setBuffersAndAttributes(gl, programInfo, plane);
//
//   // this method is not working
//   // let plane = twgl.primitives.createPlaneBufferInfo(gl);
//
//   return({
//     name: name,
//     needsUpdate: false,
//     programInfo: programInfo,
//     bufferInfo: plane,
//     uniforms: uniforms,
//   });
// }
