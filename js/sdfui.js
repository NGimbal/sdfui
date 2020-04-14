"use strict";

//import * as THREE from 'https://unpkg.com/three@0.108.0/build/three.module.js';
// import * as THREE from './libjs/three.module.js';

import * as PRIM from './primitives.js';
import * as BAKE from './bakePrim.js';
import {GhostUI} from './ghostUI.js';

import * as ACT from './actions.js';
import { reducer } from './reducers.js';

import {sdfPrimFrag} from './frag/frag.js';
import {sdfPrimVert} from './vert.js';

import * as SF from './frag/simpleFrag.js';

import {createStore} from './libjs/redux.js';

var canvas, renderer, camera, ui, scene, plane, screenMesh;
var material, uniforms;

//------
//twgl world
export var gl;
var vao;
var matrixLocation, textureLocation;
var layers;
//------

export var dataShader;

export var editTex;

export const store = createStore(reducer);
export var state = store.getState();

function pointDist (a, b){
    var dx = a.x - b.x;
    var dy = a.y - b.y;
    return dx*dx + dy*dy;
}

export var resolution;
export var mPt = new PRIM.vec(0, 0);

export var ptTree = new kdTree([], pointDist, ["x", "y"]);

//This is how I'm letting other parts of the app
//have quick access to parts of the state
function listener(){
  state = store.getState();
  //update resolution variable
  resolution = state.status.resolution;
  //update mouse position variable
  mPt = PRIM.vecSet(mPt, state.cursor.pos.x, state.cursor.pos.y);
  //update kdTree of points
  for(let p of state.scene.pts){
    //will need to find and move, or find remove and add when update means moving points around
    if(p.update == true){
      ptTree.insert(p);
      //am I allowed to do this? Prolly not...
      p.update = false;
    }
  }
  for(let pId of state.scene.rmPts){
    //normal tree search function doesnt work
    let rmPt = searchTree(ptTree.root, pId);
    ptTree.remove(rmPt);
    store.dispatch(ACT.sceneFinRmvPt(pId));
    //will also want to remove from parameters texture here as well
  }
  return state;
};

//searchKDTree for point by id
function searchTree(node, id){
  if(!node) return null;
  if(node.obj.id == id) {
    return node.obj;
  } else {
    let left = searchTree(node.left, id);
    return left ? left : searchTree(node.right, id);
  }
  return null;
}

//substcribe to store changes - run listener to set relevant variables
// store.subscribe(() => console.log(listener()));
store.subscribe(() => listener());

function setGrid(scale){
  let rX = resolution.x / resolution.y; //resolution.x
  let rY = 1.0; //resolution.y
  let scaleX = 2.0 / scale;
  let scaleY = 2.0 / scale;

  //Is the remainder odd or even?
  let r = ((rX / scaleX) - (rX / scaleX) % 1) % 2;
  //If even, add scaleX * 0.5;
  r = Math.abs(r - 1);

  // let offX = (((rX / scaleX) % 1) * scaleX) * 0.5 + ((scaleX * 0.5) * r);
  let offX = scaleX * 0.5;
  let offY = scaleY * 0.5;

  //scaleX, scaleY, offsetX, offsetY
  let gridScale = {x:scaleX, y:scaleY, z:offX, w:offY};

  store.dispatch(ACT.cursorGrid(gridScale));
}

function main() {
  canvas = document.querySelector('#c');

  //set the document resolution
  store.dispatch(ACT.statusRes({x:window.innerWidth, y:window.innerHeight}));
  store.dispatch(ACT.cursorGridScale(48));
  setGrid(state.cursor.scale);

  gl = canvas.getContext( 'webgl2', { alpha: false, antialias: false } );

  if (!gl){
    console.log("your browser/OS/drivers do not support WebGL2");
    return;
  }

  console.log(gl.getSupportedExtensions());

  // renderer = new THREE.WebGLRenderer({canvas: canvas, context: gl});
  // renderer.autoClearColor = false;

  // camera = new THREE.OrthographicCamera(
  //   -1, // left
  //    1, // right
  //    1, // top
  //   -1, // bottom
  //   -1, // near,
  //    1, // far
  // );

  ui = new GhostUI();

  twgl.resizeCanvasToDisplaySize(gl.canvas);

  //the copy of ui Options in parameters will trigger shader recompilation
  //basically a record of what has actually been instantiated in the shader
  //versus the ui state
  let parameters = new PRIM.PolyPoint({...state.ui.properties}, 128);
  editTex = new PRIM.PolyPoint({...state.ui.properties}, 16);
  //
  // uniforms = {
  //   iResolution:  { value: twgl.vec3.create(resolution.x, resolution.y, resolution.z)},
  //   //uniform for curr edit polypoint prims, should be factored out
  //   posTex: { value: editTex},
  //   //index of texel being currently edited
  //   editCTexel : {value: editTex.cTexel},
  //   //global points texture
  //   parameters: {value: parameters},
  //   //current mouse position - surprised mPt works here
  //   mousePt: {value: mPt},
  //   //current edit options
  //   editWeight : {value: state.ui.properties.weight},
  //   strokeColor: {value: twgl.vec3.create(0.0, 0.0, 0.0)},
  //   fillColor: {value: twgl.vec3.create(0.0, 0.384, 0.682)},
  //   editRadius : {value: state.ui.properties.radius},
  //   //global scale variables, mostly unused
  //   scale: {value: state.cursor.scale},
  // };
  //
  // scene = new THREE.Scene();
  // plane = new THREE.PlaneBufferGeometry(2, 2);
  //
  // let fragmentShader = sdfPrimFrag;
  // let vertexShader = sdfPrimVert;
  //
  // material = new THREE.ShaderMaterial({
  //   uniforms,
  //   vertexShader,
  //   fragmentShader
  // });

//------------------------------------------------------------------------------

  var program = twgl.createProgramFromSources(gl, [SF.simpleVert, SF.gridFrag]);
  // look up where the vertex data needs to go.
  var positionAttributeLocation = gl.getAttribLocation(program, "a_position");
  var texcoordAttributeLocation = gl.getAttribLocation(program, "a_texcoord");
  // lookup uniforms
  matrixLocation = gl.getUniformLocation(program, "u_matrix");
  textureLocation = gl.getUniformLocation(program, "u_texture");

  // Create a vertex array object (attribute state)
  vao = gl.createVertexArray();

  // and make it the one we're currently working with
  gl.bindVertexArray(vao);

  // create the position buffer, make it the current ARRAY_BUFFER
  // and copy in the color values
  var positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  // Put a unit quad in the buffer
  var positions = [
    0, 0,
    0, 1,
    1, 0,
    1, 0,
    0, 1,
    1, 1,
  ];

  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
  // Turn on the attribute
  gl.enableVertexAttribArray(positionAttributeLocation);

  // Tell the attribute how to get data out of positionBuffer (ARRAY_BUFFER)
  var size = 2;          // 2 components per iteration
  var type = gl.FLOAT;   // the data is 32bit floats
  var normalize = false; // don't normalize the data
  var stride = 0;        // 0 = move forward size * sizeof(type) each iteration to get the next position
  var offset = 0;        // start at the beginning of the buffer
  gl.vertexAttribPointer(
      positionAttributeLocation, size, type, normalize, stride, offset);

  // create the texcoord buffer, make it the current ARRAY_BUFFER
  // and copy in the texcoord values
  var texcoordBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);
  // Put texcoords in the buffer
  var texcoords = [
   0, 0,
   0, 1,
   1, 0,
   1, 0,
   0, 1,
   1, 1,
  ];
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texcoords), gl.STATIC_DRAW);

  // Turn on the attribute
  gl.enableVertexAttribArray(texcoordAttributeLocation);

  // Tell the attribute how to get data out of colorBuffer (ARRAY_BUFFER)
  var size = 2;          // 3 components per iteration
  var type = gl.FLOAT;   // the data is 32bit floats
  var normalize = true;  // convert from 0-255 to 0.0-1.0
  var stride = 0;        // 0 = move forward size * sizeof(type) each iteration to get the next color
  var offset = 0;        // start at the beginning of the buffer
  gl.vertexAttribPointer(
      texcoordAttributeLocation, size, type, normalize, stride, offset);

  // creates a texture info { width: w, height: h, texture: tex }
  // The texture will start with 1x1 pixels and be updated
  // when the image has loaded
  function loadImageAndCreateTextureInfo(url) {
    var tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    // Fill the texture with a 1x1 blue pixel.
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
                  new Uint8Array([0, 0, 255, 255]));

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    var textureInfo = {
      width: 1,   // we don't know the size until it loads
      height: 1,
      texture: tex,
    };
    var img = new Image();
    img.addEventListener('load', function() {
      textureInfo.width = gl.canvas.width;
      textureInfo.height = gl.canvas.height;

      gl.bindTexture(gl.TEXTURE_2D, textureInfo.texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      gl.generateMipmap(gl.TEXTURE_2D);
    });
    img.src = url;

    return textureInfo;
  }

  var textureInfos = [
    loadImageAndCreateTextureInfo('../assets/textures/star.jpg'),
    loadImageAndCreateTextureInfo('../assets/textures/leaves.jpg'),
    loadImageAndCreateTextureInfo('../assets/textures/keyboard.jpg'),
  ];

  //eventually this is going to come from layers in redux store
  //new edit layer is full screen layer that allows for user to input data
  layers = [];
  var numToDraw = layers.length;
  for (var ii = 0; ii <  1; ++ii) {
    var drawInfo = {
      program: program,
      x: 0,//gl.canvas.width / 2.0,
      y: 0,//gl.canvas.height / 2.0,
      dx: Math.random() > 0.5 ? -1 : 1,
      dy: Math.random() > 0.5 ? -1 : 1,
      textureInfo: textureInfos[Math.random() * textureInfos.length | 0],
    };
    layers.push(drawInfo);
  }

  requestAnimationFrame(render);

//------------------------------------------------------------------------------

  //simple data structure for combination of fragment shader and texture
  //both are generated from the list / tree of primitives in the scene
  dataShader = new PRIM.DataShader(fragmentShader, parameters);
}


function update(deltaTime) {
  let speed = 60;
  layers.forEach(function(drawInfo) {
    // drawInfo.x += drawInfo.dx * speed * deltaTime;
    // drawInfo.y += drawInfo.dy * speed * deltaTime;
    // if (drawInfo.x < 0) {
    //   drawInfo.dx = 1;
    // }
    // if (drawInfo.x >= gl.canvas.width) {
    //   drawInfo.dx = -1;
    // }
    // if (drawInfo.y < 0) {
    //   drawInfo.dy = 1;
    // }
    // if (drawInfo.y >= gl.canvas.height) {
    //   drawInfo.dy = -1;
    // }
  });
}

function draw() {
  twgl.resizeCanvasToDisplaySize(gl.canvas);

  // Tell WebGL how to convert from clip space to pixels
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

  // Clear the canvas
  gl.clearColor(1, 1, 1, 1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  layers.forEach(function(drawInfo) {
    drawImage(
      drawInfo.program,
      drawInfo.textureInfo.texture,
      drawInfo.textureInfo.width,
      drawInfo.textureInfo.height,
      drawInfo.x,
      drawInfo.y);
  });
}

var then = 0;
function render(time) {
  var now = time * 0.001;
  var deltaTime = Math.min(0.1, now - then);
  then = now;

  update(deltaTime);
  draw();

  requestAnimationFrame(render);
}

//gotta resize the screen sometimes
// function resizeRendererToDisplaySize(renderer) {
//   const canvas = renderer.domElement;
//   const width = canvas.clientWidth;
//   const height = canvas.clientHeight;
//
//   const needResize = canvas.width !== width || canvas.height !== height;
//
//   if (needResize) {
//     renderer.setSize(resolution.x, resolution.y, false);
//     store.dispatch(ACT.statusRes({x:width, y:height}));
//     store.dispatch(ACT.cursorGridScale(48));
//     store.dispatch(ACT.statusUpdate(true));
//   }
//
//   return needResize;
// }
//
// //render the scene
// function render() {
//
//   resizeRendererToDisplaySize(renderer);
//
//   ui.update();
//
//   screenMesh.material.uniforms.posTex.value = editTex.ptsTex;
//   screenMesh.material.uniforms.editCTexel.value = editTex.cTexel;
//
//   // let uiOptions = ui.modeStack.curr().options;
//   let uiOptions = state.ui.properties;
//
//   //mPt is converted into a vector3 in the listener at the top
//   screenMesh.material.uniforms.mousePt.value = mPt;
//   screenMesh.material.uniforms.editWeight.value = state.ui.properties.weight;
//
//   //should be able to get more expressive colors at some point...
//   let stroke = hexToRgb(state.ui.properties.stroke);
//   screenMesh.material.uniforms.strokeColor.value.set(stroke.r/255, stroke.g/255, stroke.b/255);
//   let fill = hexToRgb(state.ui.properties.fill);
//   screenMesh.material.uniforms.fillColor.value.set(fill.r/255, fill.g/255, fill.b/255);
//
//   screenMesh.material.uniforms.editRadius.value = state.ui.properties.radius;
//
//   screenMesh.material.uniforms.needsUpdate = true;
//
//   //if we're changing the status of showing/hiding the background grid
//   if (state.ui.grid != dataShader.parameters.properties.grid){
//     dataShader.parameters.properties.grid = state.ui.grid;
//     let valString = "0";
//
//     if (!state.ui.grid) valString = "1";
//     modifyDefine(dataShader, "BG_GRID", valString);
//
//     store.dispatch(ACT.statusUpdate(true));
//   }
//
//   //if we're changing the status of showing/hiding points
//   if (state.ui.points != dataShader.parameters.properties.points){
//     dataShader.parameters.properties.points = state.ui.points;
//     let valString = "0";
//
//     if (!state.ui.points) valString = "1";
//     modifyDefine(dataShader, "SHOW_PTS", valString);
//
//     store.dispatch(ACT.statusUpdate(true));
//   }
//
//   //if we're changing the status of showing/hiding points
//   if (state.ui.darkmode != dataShader.parameters.properties.darkmode){
//     dataShader.parameters.properties.darkmode = state.ui.darkmode;
//     let valString = "0";
//
//     if (state.ui.darkmode) valString = "1";
//     modifyDefine(dataShader, "DARK_MODE", valString);
//
//     store.dispatch(ACT.statusUpdate(true));
//   }
//
//   //keep shader update for now
//   if (state.status.shaderUpdate){
//     console.log("shader update!");
//     let vertexShader = sdfPrimVert;
//
//     uniforms.iResolution.value = new THREE.Vector3(resolution.x, resolution.y, resolution.z);
//
//     //this is where primitives get rebaked to shader if they need it
//     let index = 0;
//     for (let prim of state.scene.editItems){
//       if(prim.needsUpdate){
//         switch(prim.type){
//           case "polyline":
//             dataShader = BAKE.polyLine(prim, dataShader);
//             break;
//           case "polygon":
//             dataShader = BAKE.polygon(prim, dataShader);
//             break;
//           case "polycircle":
//             dataShader = BAKE.polyCircle(prim, dataShader);
//             break;
//           case "circle":
//             dataShader = BAKE.circle(prim, dataShader);
//             break;
//           case "rectangle":
//             dataShader = BAKE.rectangle(prim, dataShader);
//             break;
//           case "pointlight":
//             dataShader = BAKE.pointLight(prim, dataShader);
//             break;
//           default:
//             break;
//         }
//         store.dispatch(ACT.sceneItemUpdate(index, false));
//       }
//       index++;
//     }
//
//     uniforms.parameters.value = dataShader.parameters.ptsTex;
//
//     let fragmentShader = dataShader.shader;
//
//     material = new THREE.ShaderMaterial({
//       uniforms,
//       vertexShader,
//       fragmentShader,
//     });
//
//     screenMesh.material = material;
//
//     store.dispatch(ACT.statusUpdate(false));
//   }
//
//   renderer.render(scene, camera);
//
//   //this hack is necessary because saving has to happen
//   //while framebuffer still has data
//   if(state.status.raster){
//     canvas.toBlob((blob) => {
//       saveBlob(blob, `screencapture-${canvas.width}x${canvas.height}.png`);
//     });
//     store.dispatch(ACT.statusRaster());
//   }
// }
//
// function animate(time){
//   if(!state.ui.pause){ render(); }
//
//   requestAnimationFrame(animate);
// }

export function newEditTex(){
  editTex = new PRIM.PolyPoint({...state.ui.properties}, 16);
}

//Utility Functions-----------------------------------------------
// Unlike images, textures do not have a width and height associated
// with them so we'll pass in the width and height of the texture
function drawImage(program, tex, texWidth, texHeight, dstX, dstY) {
  gl.useProgram(program);

  // Setup the attributes for the quad
  gl.bindVertexArray(vao);

  var textureUnit = 0;
  // The the shader we're putting the texture on texture unit 0
  gl.uniform1i(textureLocation, textureUnit);

  // Bind the texture to texture unit 0
  gl.activeTexture(gl.TEXTURE0 + textureUnit);
  gl.bindTexture(gl.TEXTURE_2D, tex);

  // this matrix will convert from pixels to clip space
  var matrix = twgl.m4.ortho(
      0, gl.canvas.clientWidth, gl.canvas.clientHeight, 0, -1, 1);

  // translate our quad to dstX, dstY
  matrix = twgl.m4.translate(matrix, twgl.v3.create(dstX, dstY, 0));

  // scale our 1 unit quad
  // from 1 unit to texWidth, texHeight units
  matrix = twgl.m4.scale(matrix, twgl.v3.create(texWidth, texHeight, 1));

  // Set the matrix.
  gl.uniformMatrix4fv(matrixLocation, false, matrix);

  // draw the quad (2 triangles, 6 vertices)
  var offset = 0;
  var count = 6;
  gl.drawArrays(gl.TRIANGLES, offset, count);
}

const saveBlob = (function(){
  let a = document.createElement('a');
  document.body.appendChild(a);
  a.style.display = 'none';

  return function saveData(blob, fileName) {
     const url = window.URL.createObjectURL(blob);
     a.href = url;
     a.download = fileName;
     a.click();
  };
}());


export function modifyDefine(_dataShader, define, val){
  let shader = _dataShader.shader.slice();
  //change #define
  let insString = "#define " + define + " ";
  let insIndex = shader.indexOf(insString);
  insIndex += insString.length;

  let startShader = shader.slice(0, insIndex);
  let endShader = shader.slice(insIndex+2);

  startShader += val + "\n";
  shader = startShader + endShader;
  dataShader.shader = shader;
}

function hexToRgb(hex) {
  // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
  var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  hex = hex.replace(shorthandRegex, function(m, r, g, b) {
    return r + r + g + g + b + b;
  });

  var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

//Run-----------------------------------------------------------
main();
