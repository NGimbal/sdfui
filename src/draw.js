"use strict";

import {GhostUI} from './ghostUI.js';

import * as PRIM from './primitives.js';

import * as ACT from './actions.js';
import { reducer } from './reducers.js';

import * as SF from './frags.js';
import {Layer, updateMatrices} from './layer.js';

import * as chroma from 'chroma-js';
import * as twgl from 'twgl.js';
import * as ubilabs from 'kd-tree-javascript';
import {createStore} from 'redux';
// import * as rbush from 'rbush';

import firebaseConfig from './firebaseConfig.js';

import * as firebase from 'firebase/app';
import 'firebase/firestore';
import "firebase/auth";

var canvas, ctx, ui;

//twgl world
export var gl;
export var layers;

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
export var dPt = new twgl.v3.create(0, 0, 64);
export var ptTree = new ubilabs.kdTree([], pointDist, ["x", "y"]);

firebase.initializeApp(firebaseConfig);
export var db = firebase.firestore();

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
  // return null;
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
  let offY = scaleY * 0.1;

  //scaleX, scaleY, offsetX, offsetY
  let gridScale = {x:scaleX, y:scaleY, z:offX, w:offY};
  // console.log(gridScale);
  store.dispatch(ACT.cursorGrid(gridScale));
}

export function initDraw() {
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
    u_dPt: dPt,//twgl.v3.create(dPt.x, dPt.y, dPt.z),
  }

  // grid layer
  let gridLayer = new Layer({type:"grid"}, SF.simpleVert, SF.gridFrag, gridUniforms);

  layers.push(gridLayer);
  // layerPush does not work at the moment
  // store.dispatch(ACT.layerPush(gridLayer));
  // console.log(state);

  let image = twgl.createTexture(gl, {
    src: "../assets/textures/leaves.jpg",
    color: [0.125, 0.125, 0.125, 0.125],
  }, () => {
    // console.log(image);
  });

  //twgl.loadTextureFromUrl(gl, image);

  let imgUniforms = {
    // u_matrix: matrix,
    u_textureMatrix: twgl.m4.copy(texMatrix),
    u_resolution: twgl.v3.create(gl.canvas.width, gl.canvas.height, 0),
    u_dPt: dPt,//twgl.v3.create(dPt.x, dPt.y, dPt.z),
    u_img: image,
  }
  
  let imgLayer = new Layer({type:"img"}, SF.simpleVert, SF.imgFrag, imgUniforms);
  imgLayer.bbox = new PRIM.bbox([{x:0.25, y:0.25}], 0.5);
  
  updateMatrices(imgLayer);

  // layers.push(imgLayer);
  let demoUniforms = {
    // u_matrix: matrix,
    u_textureMatrix: twgl.m4.copy(texMatrix),
    u_resolution: twgl.v3.create(gl.canvas.width, gl.canvas.height, 0),
    u_dPt: dPt,//twgl.v3.create(dPt.x, dPt.y, dPt.z),
    u_eTex: {},
  }

  // grid layer
  let demoLayer = new Layer({type:"demo"}, SF.simpleVert, SF.demoFrag, demoUniforms);
  // demoLayer.set
  demoLayer.bbox = new PRIM.bbox([{x:0.1250, y:0.1250}, {x:0.3125, y:0.3125}], 0.0);
  
  updateMatrices(demoLayer);
  // layers.push(demoLayer);

  // edit layer
  let plineLayer = new Layer(state.scene.editItems[state.scene.editItem], SF.simpleVert, SF.pLineEdit);

  layers.push(plineLayer);

  // console.log(layers);

  // layers[1].uniforms.u_eTex = layers[2].uniforms.u_eTex;

  //this is excellent
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  // would like to try and render "distance" to accumulating buffer like color
  // gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, targetTexture, 0);

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
      // switch(layer.name){
      //   case "polyline":
      //     BAKE.polyLine(prim, dataShader);
      //     break;
      //   case "polygon":
      //     BAKE.polygon(prim, dataShader);
      //     break;
      //   case "circle":
      //     BAKE.circle(prim, dataShader);
      //     break;
      //   case "rectangle":
      //     BAKE.rectangle(prim, dataShader);
      //     break;
      //   default:
      //     break;
      // }
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
      layer.uniforms.u_dPt = dPt;
      // layer.uniforms.u_dPt['0'] = dPt.x;
      // layer.uniforms.u_dPt['1'] = dPt.y;
      // layer.uniforms.u_dPt['2'] = dPt.z;
    }
    if (layer.prim == state.scene.editItems[state.scene.editItem].id){
      if(typeof layer.uniforms.u_stroke === 'object'){
        layer.uniforms.u_stroke = chroma(state.ui.properties.stroke).gl().slice(0,3);
      }
      if(typeof layer.uniforms.u_fill === 'object'){
        layer.uniforms.u_fill = chroma(state.ui.properties.fill).gl().slice(0,3);
      }
      if(typeof layer.uniforms.u_weight === 'number'){
        layer.uniforms.u_weight = state.ui.properties.weight;
      }
      if(typeof layer.uniforms.u_weight === 'number'){
        layer.uniforms.u_weight = state.ui.properties.weight;
      }
      if(typeof layer.uniforms.u_opacity  === 'number'){
        layer.uniforms.u_opacity = state.ui.properties.opacity;
      }
      if(typeof layer.uniforms.u_radius  === 'number'){
        layer.uniforms.u_radius = state.ui.properties.radius;
      }
    }
    
    //does this work? How many times is this going to trip me up
    if(typeof layer.uniforms.u_cTex === 'number'){
      layer.uniforms.u_cTex = layer.uniforms.u_eTex.cTexel;
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

  if(state.status.raster){
    canvas.toBlob((blob) => {
      saveBlob(blob, `screencapture-${canvas.width}x${canvas.height}.png`);
    });
    store.dispatch(ACT.statusRaster(false));
  }
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
    dPt[2] = Math.max(1., dPt[2] + e.deltaY * 0.1);
    // console.log(dPt.z);
  } else {
    dPt[0] += e.deltaX * 0.001;
    dPt[1] += e.deltaY * 0.001;
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

  
  let selDist = sceneDist();
  let dist = selDist.d;
  let selPrim = selDist.sel;

  pixelPt = {
    x: mPt.x,
    y: mPt.y
  }

  pixelPt.x = ((mPt.x * (64. / dPt[2]) + dPt[0]) * resolution.x) * (resolution.y/resolution.x);
  pixelPt.y = ((mPt.y * (64. / dPt[2]) + dPt[1]) * resolution.y);

  let mPtString = '(' + mPt.x.toFixed(3) + ', ' + mPt.y.toFixed(3) + ')';

  ctx.fillStyle = 'black';
  ctx.fillText("Cursor: " + mPtString, pixelPt.x + 10, pixelPt.y);
  
  if(typeof selPrim !== "undefined" && dist < 0){
  // if(typeof selPrim !== "undefined"){

    // console.log(selPrim.properties.weight);
    ctx.fillStyle = selPrim.idColHex;
    ctx.fillText("Sel Item: " + dist, pixelPt.x + 10, pixelPt.y + 12);
  }
}


//need mPt, SDFUI.state.scene if in another file...
function sceneDist(){
  let dist = 1000;
  let selPrim;
  for (let prim of state.scene.editItems){
    if (prim.id == state.scene.editItems[state.scene.editItem].id) continue;
    // also should have a "broad phase" check here on bounding box
    // this is where some spatial hashing could go
    let currDist = PRIM.distPrim(mPt, prim);
    if (currDist < dist){
      selPrim = prim;
      dist = currDist;
    }
  }
  return {d:dist, sel:selPrim};
}

const saveBlob = (function() {
  const a = document.createElement('a');
  document.body.appendChild(a);
  a.style.display = 'none';
  return function saveData(blob, fileName) {
     const url = window.URL.createObjectURL(blob);
     a.href = url;
     a.download = fileName;
     a.click();
  };
}());

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
// main();