"use strict";

//import * as THREE from 'https://unpkg.com/three@0.108.0/build/three.module.js';
// import * as THREE from './libjs/three.module.js';

import * as PRIM from './primitives.js';
import * as BAKE from './bakePrim.js';
import {GhostUI} from './ghostUI.js';

import * as ACT from './actions.js';
import { reducer } from './reducers.js';

import * as SF from './frag/frags.js';
import {Layer, updateMatrices} from './layer.js';


import {createStore} from './libjs/redux.js';

var canvas, ctx, renderer, camera, ui, scene, plane, screenMesh;
var material, uniforms;

//------
//twgl world
export var gl;
var vao;
var matrixLocation, textureLocation;
export var layers;
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
//dPt z is scale
export var dPt = new PRIM.vec(0, 0, 64);

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

  let canvasContainer = document.querySelector('#canvasContainer');

  let textCanvas = document.querySelector('#text');
  ctx = textCanvas.getContext('2d');

  canvas = document.querySelector('#c');
  //alpha: false, antialias:false
  gl = canvas.getContext( 'webgl2', { premultipliedAlpha: false } );

  twgl.setDefaults({attribPrefix: "a_"});
  twgl.resizeCanvasToDisplaySize(gl.canvas);
  twgl.resizeCanvasToDisplaySize(ctx.canvas);

  //set the document resolution
  store.dispatch(ACT.statusRes({x:canvas.width, y:canvas.height}));

  store.dispatch(ACT.cursorGridScale(64));
  setGrid(state.cursor.scale);

  if (!gl){
    console.log("your browser/OS/drivers do not support WebGL2");
    return;
  }
  console.log(gl.getSupportedExtensions());

  ui = new GhostUI();

  canvasContainer.addEventListener('mousedown', startDrag);

  canvasContainer.onwheel = scrollPan;

  // let pts = [
  //   {x:0.5, y:0.5},
  //   {x:1.0, y:0.0},
  //   {x:0.0, y:1.0},
  //   {x:1.0, y:1.0},
  //   {x:0.3, y:0.3},
  //   {x:0.4, y:0.5},
  //   {x:0.2, y:0.8},
  // ]
  // for(let p of pts){
  //   editTex.addPoint(p);
  // }

//------------------------------------------------------------------------------

  //eventually this is going to come from layers in redux store
  //new edit layer is full screen layer that allows for user to input data
  layers = [];

  //full screen texture matrix
  let texMatrix = twgl.m4.translation(twgl.v3.create(0,0,0));
  texMatrix = twgl.m4.scale(texMatrix, twgl.v3.create(1, 1, 1));

  let gridUniforms = {
    // u_matrix: matrix,
    u_textureMatrix: twgl.m4.copy(texMatrix),
    u_resolution: twgl.v3.create(gl.canvas.width, gl.canvas.height, 0),
    u_dPt: twgl.v3.create(dPt.x, dPt.y, dPt.z),
  }

  // grid layer
  let gridLayer = new Layer({type:"grid"}, SF.simpleVert, SF.gridFrag, gridUniforms);

  layers.push(gridLayer);

  let editUniforms = {
    // u_matrix: matrix,
    u_textureMatrix: twgl.m4.copy(texMatrix),
    u_resolution: twgl.v3.create(gl.canvas.width, gl.canvas.height, 0),
    u_panOffset: twgl.v3.create(dPt.x, dPt.y, 0),
    u_mPt: twgl.v3.create(mPt.x, mPt.y, 0),
    u_dPt: twgl.v3.create(dPt.x, dPt.y, 0),
    u_eTex: new PRIM.PolyPoint(16),
    u_weight: state.ui.properties.weight,
    u_stroke: twgl.v3.create(0.0, 0.435, 0.3137),
  }

  // edit layer
  let editLayer = new Layer(state.scene.editItems[state.scene.editItem], SF.simpleVert, SF.pLineEdit, editUniforms);

  layers.push(editLayer);

  //this is excellent
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  requestAnimationFrame(render);

//------------------------------------------------------------------------------
}

function update() {

  ui.update();

  updateCtx();

  let resize = twgl.resizeCanvasToDisplaySize(gl.canvas);

  if(resize){
    twgl.resizeCanvasToDisplaySize(ctx.canvas);
    store.dispatch(ACT.statusRes({x:gl.canvas.width, y:gl.canvas.height}));
  }
  //update uniforms - might want a needsUpdate on these at some point
  layers.forEach(function(layer) {
    //this is better but still not perfect
    if(layer.bbox){ updateMatrices(layer); }
    if(layer.needsUpdate){
      switch(layer.name){
        case "polyline":
          dataShader = BAKE.polyLine(prim, dataShader);
          break;
        case "polygon":
          dataShader = BAKE.polygon(prim, dataShader);
          break;
        case "polycircle":
          dataShader = BAKE.polyCircle(prim, dataShader);
          break;
        case "circle":
          dataShader = BAKE.circle(prim, dataShader);
          break;
        case "rectangle":
          dataShader = BAKE.rectangle(prim, dataShader);
          break;
        case "pointlight":
          dataShader = BAKE.pointLight(prim, dataShader);
          break;
        default:
          break;
      }
      store.dispatch(ACT.sceneItemUpdate(index, false));
    }

    gl.useProgram(layer.programInfo.program);
    if(resize){
      layer.uniforms.u_resolution['0'] = gl.canvas.width;
      layer.uniforms.u_resolution['1'] = gl.canvas.height;
    }
    if(layer.uniforms.u_mPt){
      layer.uniforms.u_mPt['0'] = mPt.x;
      layer.uniforms.u_mPt['1'] = mPt.y;
    }
    if(layer.uniforms.u_dPt){
      layer.uniforms.u_dPt['0'] = dPt.x;
      layer.uniforms.u_dPt['1'] = dPt.y;
      layer.uniforms.u_dPt['2'] = dPt.z;
    }
    if(layer.uniforms.u_stroke){
      layer.uniforms.u_stroke['0'] = state.ui.properties.stroke[0];
      layer.uniforms.u_stroke['1'] = state.ui.properties.stroke[1];
      layer.uniforms.u_stroke['2'] = state.ui.properties.stroke[2];
    }
    if(layer.uniforms.u_weight){
      layer.uniforms.u_weight = state.ui.properties.weight;
    }
    twgl.setUniforms(layer.programInfo, layer.uniforms);
  });
}

function draw() {

  // Tell WebGL how to convert from clip space to pixels
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

  // Clear the canvas
  gl.clearColor(1, 1, 1, 1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  twgl.drawObjectList(gl, layers);
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

let mouseDragStart = new PRIM.vec(0, 0);

// var scale = 64;
function scrollPan(e){
  e.preventDefault();

  if (e.ctrlKey) {
    // Your zoom/scale factor
    dPt.z += e.deltaY * 0.1;
  } else {
    dPt.x += e.deltaX * 0.001;
    dPt.y += e.deltaY * 0.001;
  }

}

function startDrag(e){
  if(!state.ui.drag)return;
  PRIM.vecSet(mouseDragStart, state.cursor.pos.x, state.cursor.pos.y);
  // console.log('start drag');
  canvasContainer.addEventListener('mousemove', doDrag);
  canvasContainer.addEventListener('mouseup', endDrag);
}

function doDrag(e){
  PRIM.vecSet(dPt, (state.cursor.pos.x - mouseDragStart.x), (state.cursor.pos.y - mouseDragStart.y));
  console.log(dPt);
}

function endDrag(e){
  // console.log('endDrag');
  canvasContainer.removeEventListener('mousemove', doDrag);
  canvasContainer.removeEventListener('mouseup', endDrag);
}

function updateCtx(){
  ctx.clearRect(0,0, ctx.canvas.width, ctx.canvas.height);

  let pixelPt = {x:0, y:0};

  // for(let p of state.scene.pts){
  //   pixelPt = {
  //     x: p.x,
  //     y: p.y
  //   }

  //   pixelPt.x = ((p.x * (64. / dPt.z) + dPt.x) * resolution.x) * (resolution.y/resolution.x) ;
  //   pixelPt.y = ((p.y * (64. / dPt.z) + dPt.y) * resolution.y);

  //   let mPtString = '(' + p.x.toFixed(3) + ', ' + p.y.toFixed(3) + ')';

  //   ctx.fillText(mPtString, pixelPt.x, pixelPt.y);
  // }

  pixelPt = {
    x: mPt.x,
    y: mPt.y
  }

  pixelPt.x = ((mPt.x * (64. / dPt.z) + dPt.x) * resolution.x) * (resolution.y/resolution.x);
  pixelPt.y = ((mPt.y * (64. / dPt.z) + dPt.y) * resolution.y);

  let mPtString = '(' + mPt.x.toFixed(3) + ', ' + mPt.y.toFixed(3) + ')';

  ctx.fillText(mPtString, pixelPt.x, pixelPt.y);
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
//x   resizeRendererToDisplaySize(renderer);
//
//x   ui.update();
//
//   screenMesh.material.uniforms.posTex.value = editTex.ptsTex;
//   screenMesh.material.uniforms.editCTexel.value = editTex.cTexel;
//
//   // let uiOptions = ui.modeStack.curr().options;
//   let uiOptions = state.ui.properties;
//
//   //mPt is converted into a vector3 in the listener at the top
//x   screenMesh.material.uniforms.mousePt.value = mPt;
//x  screenMesh.material.uniforms.editWeight.value = state.ui.properties.weight;
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

//Run-----------------------------------------------------------
main();
