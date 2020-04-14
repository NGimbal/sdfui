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

import * as SDFUI from './sdfui.js';

export class layer = {
  constructor(prim){
    this.prim = prim;
    // data texture (properties will be removed)
    this.editTex = new PRIM.PolyPoint({...SDFUI.state.ui.properties}, 16);
    //layer properties
    this.properties = {...SDFUI.state.ui.properties};
    //prerendered color texture / sdf tile
    this.bufferTexture;
    //transformed bounding box
    this.boundingBox;
  }

  setBoundingBox(){
    //just have to sort x, y of points and get min / max in each axis
  }

  compileShader(){

  }

  renderToTexture(){

  }
}
