"use strict";

import * as chroma from 'chroma-js';
import * as twgl from 'twgl.js';
import {createStore} from 'redux';
import * as RBush from 'rbush';

// import firebaseConfig from './firebaseConfig.js';
// import * as firebase from 'firebase/app';
// import 'firebase/firestore';
// import "firebase/auth";

import * as ACT from '../store/actions.js';
import { reducer } from '../store/reducers.js';

import {DrawUI} from './drawUI.js';
import * as PRIM from './primitives.js';
import * as SF from './frags.js';
import {Layer, updateMatrices} from './layer.js';

var canvas, ctx, ui;
var view;

//twgl
export var gl;

export const store = createStore(reducer);
export var state = store.getState();

export var resolution;
export var mPt = new PRIM.vec(0, 0);

//dPt z is scale
export var dPt = new twgl.v3.create(0, 0, 64);
export var ptTree = new RBush();
export var bboxTree = new RBush();

// firebase.initializeApp(firebaseConfig);
// export var db = firebase.firestore();

//Expose part of state
function listener(){

  state = store.getState();
  resolution = state.status.resolution;
  
  //update mouse position variable
  mPt = PRIM.vecSet(mPt, state.cursor.pos.x, state.cursor.pos.y);
  
  //update kdTree of points
  for(let p of state.scene.pts){
    //will need to find and move, or find remove and add when update means moving points around
    if(p.update == true){
      ptTree.insert(p);
      //TODO: create a reducer that changes this parameter
      p.update = false;
    }
  }
  for(let pId of state.scene.rmPts){
    //normal tree search function doesnt work
    ptTree.remove(pId, (a, pId) => {
      return a.id === pId;
    });
    store.dispatch(ACT.sceneFinRmvPt(pId));
  }
  return state;
};

//subscribe to store changes - run listener to set relevant variables
store.subscribe(() => console.log(listener()));
// store.subscribe(() => listener());

function setGrid(scale){
  let rX = resolution.x / resolution.y; //resolution.x
  // let rY = 1.0; resolution.y
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
  
  view = {
    minX: (0.0 - dPt[0]) * (64 / dPt[2]),
    minY: (0.0 - dPt[1]) * (64 / dPt[2]),
    maxX: (resolution.x / resolution.y) * (64 / dPt[2]) - dPt[0] ,
    maxY: 1.0 * (64 / dPt[2]) - dPt[1],
  }

  if (!gl){
    console.log("your browser/OS/drivers do not support WebGL2");
    return;
  }
  // console.log(gl.getSupportedExtensions());

  ui = new DrawUI();

  canvasContainer.addEventListener('mousedown', startDrag);

  canvasContainer.onwheel = scrollPan;

  //new edit layer is full screen layer that allows for user to input data

  //full screen texture matrix
  let texMatrix = twgl.m4.translation(twgl.v3.create(0,0,0));
  texMatrix = twgl.m4.scale(texMatrix, twgl.v3.create(1, 1, 1));

  let gridUniforms = {
    u_textureMatrix: twgl.m4.copy(texMatrix),
    u_resolution: twgl.v3.create(gl.canvas.width, gl.canvas.height, 0),
    u_dPt: dPt,
  }

  // grid layer
  let gridLayer = new Layer({type:"grid"}, SF.simpleVert, SF.gridFrag, gridUniforms);
  store.dispatch(ACT.layerPush(gridLayer));

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

  // edit layer
  let plineLayer = new Layer(state.scene.editItems[state.scene.editItem], SF.simpleVert, SF.pLineEdit);

  store.dispatch(ACT.layerPush(plineLayer));

  //this is excellent
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  // would like to try and render "distance" to accumulating buffer like color
  // gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, targetTexture, 0);

  requestAnimationFrame(render);
//------------------------------------------------------------------------------
}

// addImage function
export function addImage(_srcURL, dims, evPt) {
  let srcURL = _srcURL || "../assets/textures/leaves.jpg";

  let texMatrix = twgl.m4.translation(twgl.v3.create(0,0,0));
  texMatrix = twgl.m4.scale(texMatrix, twgl.v3.create(1, 1, 1));

  let image = twgl.createTexture(gl, {
    src: srcURL,
    color: [0.125, 0.125, 0.125, 0.125],
  }, () => {
    // console.log(image);
  });

  twgl.loadTextureFromUrl(gl, image);

  let imgUniforms = {
    // u_matrix: matrix,
    u_textureMatrix: twgl.m4.copy(texMatrix),
    u_resolution: twgl.v3.create(gl.canvas.width, gl.canvas.height, 0),
    u_dPt: dPt,//twgl.v3.create(dPt.x, dPt.y, dPt.z),
    u_img: image,
  }
  
  let imgLayer = new Layer({type:"img"}, SF.imgVert, SF.imgFrag, imgUniforms);
  
  // Will want to add some cool image processing stuff at some point...
  // Blending, edge detection, img -> sdf in some way :)
  
  // let aspect = dims.width / dims.height;
  let width = dims.width/1000;
  let height = dims.height/1000; 

  // transforms window / js space to sdf / frag space
  evPt.x = ((evPt.x/resolution.x) * (resolution.x/resolution.y)) - dPt[0];
  evPt.y = (evPt.y/resolution.y)  - dPt[1];
  evPt.x = evPt.x * (dPt[2] / 64.);
  evPt.y = evPt.y * (dPt[2] / 64.);
  // console.log(imgLayer);
  imgLayer.bbox = new PRIM.bbox([{x: evPt.x, y: evPt.y},
                                 {x: evPt.x + width, y: evPt.y + height}],imgLayer.id,
                                 0.0, '');

  bboxTree.insert(imgLayer.bbox);

  updateMatrices(imgLayer);

  store.dispatch(ACT.layerPushImage(imgLayer));
}

function update() {

  ui.update();

  let selDist = sceneDist();

  if(selDist.d < 0.01 && state.ui.mode === "select" && selDist.sel){
    document.getElementById("canvasContainer").style.cursor = "grab";
    store.dispatch(ACT.editHoverSet(selDist.sel.id)) // add item to hover state
  } else {
    document.getElementById("canvasContainer").style.cursor = "auto"
    // clear state.hover
    store.dispatch(ACT.editHoverClr())
  }

  updateCtx(selDist);

  let resize = twgl.resizeCanvasToDisplaySize(gl.canvas);

  if(resize){
    twgl.resizeCanvasToDisplaySize(ctx.canvas);
    store.dispatch(ACT.statusRes({x:gl.canvas.width, y:gl.canvas.height}));
  }
  //update uniforms - might want a needsUpdate on these at some point
  //also might want to switch this to loop over edit items
  //and only edit items in view
  state.render.layers.forEach(function(layer) {

    if(layer.bbox){ updateMatrices(layer); }

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
    }
    
    //keep layer uniforms aligned with drawObject
    let drawObject = state.scene.editItems.find(a => a.id === layer.prim);
    
    // edit item array and layer array may become out of sync temporarily
    // as edit items are added and removed
    if(!drawObject) return;

    // could put check here to see if the layer uniforms need to be updated
    // update on every render seems fine at the moment
    
    if(typeof layer.uniforms.u_stroke === 'object'){
      layer.uniforms.u_stroke = chroma(drawObject.properties.stroke).gl().slice(0,3);
    }
    if(typeof layer.uniforms.u_fill === 'object'){
      layer.uniforms.u_fill = chroma(drawObject.properties.fill).gl().slice(0,3);
    }
    if(typeof layer.uniforms.u_weight === 'number'){
      layer.uniforms.u_weight = drawObject.properties.weight;
    }
    if(typeof layer.uniforms.u_weight === 'number'){
      layer.uniforms.u_weight = drawObject.properties.weight;
    }
    if(typeof layer.uniforms.u_opacity  === 'number'){
      layer.uniforms.u_opacity = drawObject.properties.opacity;
    }
    if(typeof layer.uniforms.u_radius  === 'number'){
      layer.uniforms.u_radius = drawObject.properties.radius;
    }

    if(typeof layer.uniforms.u_sel  === 'number'){
      if(state.scene.selected.includes(drawObject.id)){
        layer.uniforms.u_sel = 1.0;
      } else {
        layer.uniforms.u_sel = 0.0;
      }
    }
    
    // weird but probably okay
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

  //spatial indexing / hashing for rendering
  let bboxSearch = bboxTree.search(view).map(b => b.id);

  let inView = state.render.layers.filter(l => bboxSearch.includes(l.id) || 
                                              state.scene.editItems[state.scene.editItem].id === l.prim || 
                                              l.primType === "grid");
  // console.log(inView);
  twgl.drawObjectList(gl, inView);

  // save raster image
  if(state.status.raster){
    canvas.toBlob((blob) => {
      saveBlob(blob, `screencapture-${canvas.width}x${canvas.height}.png`);
    });
    store.dispatch(ACT.statusRaster(false));
  }
}

function render(time) {

  update();
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

  // This appears to be correct
  view = {
    minX: (0.0 - dPt[0]) / (64 / dPt[2]),
    minY: (0.0 - dPt[1]) / (64 / dPt[2]),
    maxX: ((resolution.x / resolution.y) - dPt[0]) / (64 / dPt[2]) ,
    maxY: (1.0 - dPt[1]) / (64 / dPt[2]) ,
  }
  // console.log(dPt);
  // console.log(view);
}

// mouse dragging - I think this is disabled at the moment
// would be good with touchstart / touchend
function startDrag(e){
  if(!state.ui.drag)return;
  PRIM.vecSet(mouseDragStart, state.cursor.pos.x, state.cursor.pos.y);
  // console.log('start drag');
  canvasContainer.addEventListener('mousemove', doDrag);
  canvasContainer.addEventListener('mouseup', endDrag);
}

function doDrag(e){
  PRIM.vecSet(dPt, (state.cursor.pos.x - mouseDragStart.x), (state.cursor.pos.y - mouseDragStart.y));
}

function endDrag(e){
  canvasContainer.removeEventListener('mousemove', doDrag);
  canvasContainer.removeEventListener('mouseup', endDrag);
}

function updateCtx(selDist){
  ctx.clearRect(0,0, ctx.canvas.width, ctx.canvas.height);

  let pixelPt = {x:0, y:0};

  // let selDist = sceneDist();
  let dist = selDist.d;
  let selPrim = selDist.sel;

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

  let mouse = {
    minX: mPt.x,
    maxX: mPt.x,
    minY: mPt.y,
    maxY: mPt.y,
  }

  let bboxSearch = bboxTree.search(mouse).map(b => b.id);

  let inMouse = state.render.layers.filter(l => bboxSearch.includes(l.id) || 
                                              state.scene.editItems[state.scene.editItem].id === l.prim || 
                                              l.primType === "grid");

  for (let layer of inMouse){
    if(!layer.prim) continue;
    let prim = state.scene.editItems.find(p => p.id === layer.prim);
    if (prim.id == state.scene.editItems[state.scene.editItem].id) continue;
    // also should have a "broad phase" check here on bounding box
    // this is where some spatial hashing could go
    let currDist = PRIM.distPrim(mPt, prim);
    // console.log(prim);

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

// this is not being called currently
// could this be used for selection?
export function modifyDefine(_shader, define, val){
  let shader = _shader.slice();
  //change #define
  let insString = "#define " + define + " ";
  let insIndex = shader.indexOf(insString);
  insIndex += insString.length;

  let startShader = shader.slice(0, insIndex);
  let endShader = shader.slice(insIndex+2);

  startShader += val + "\n";
  shader = startShader + endShader;
  
  console.log(shader);
  
  return shader;
}