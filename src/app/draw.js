"use strict";

import * as chroma from 'chroma-js';
import * as twgl from 'twgl.js';
import {createStore} from 'redux';
import * as RBush from 'rbush';

import * as ACT from '../store/actions.js';
import { reducer } from '../store/reducers.js';

import {DrawUI} from './drawUI.js';
import * as PRIM from '../renderer/primitives.js';
import * as SF from '../renderer/shaders/shaders.js';
import {Layer, updateMatrices} from '../renderer/layer.js';
// import { DrawerPosition } from 'construct-ui';

var canvas, ctx, ui;
var view;

export var gl;

export const store = createStore(reducer);
export var state = store.getState();

export var resolution;
export var mPt = new PRIM.vec(0, 0);

//dPt z is scale
export var dPt = new twgl.v3.create(0, 0, 64);

export var ptTree = new RBush();
export var bboxTree = new RBush();

export var layers = [];

var distBuffer, distTex, sceneTex;

var mouseDragStart = new PRIM.vec(0, 0);

var resize = false;

// layers, ptTree, bboxTree should all be updated here
function listener(){

  state = store.getState();

  resolution = state.status.resolution;
  
  // update mouse position variable
  mPt = PRIM.vecSet(mPt, state.cursor.pos.x, state.cursor.pos.y);

  // update kdTree - this seems inefficient but whatever
  ptTree = new RBush();

  let pts = state.scene.editItems.reduce((prev, curr, index, arr) => {
    if(state.ui.dragging && state.scene.selected.includes(curr.id)) return prev;
    return [...prev, ...curr.pts.map((p,i,a) => PRIM.addVec(p, curr.translate))];
  },[]);

  ptTree.load(pts);

  bboxTree = new RBush();

  let boxes = state.scene.editItems.reduce((prev, curr, index, arr) => {
    if(state.scene.editItem === curr.id || curr.bbox === null) return prev;
    return [...prev, ...[curr.bbox]];
  }, []);

  bboxTree.load(boxes)

  return state;
}; 


//subscribe to store changes - run listener to set relevant variables
// store.subscribe(() => console.log(listener()));
store.subscribe(() => listener());

export function initDraw() {
  let canvasContainer = document.querySelector('#canvasContainer');

  let textCanvas = document.querySelector('#text');
  ctx = textCanvas.getContext('2d');

  canvas = document.querySelector('#c');

  gl = canvas.getContext( 'webgl2', { premultipliedAlpha: false } );

  twgl.setDefaults({attribPrefix: "a_"});
  twgl.resizeCanvasToDisplaySize(gl.canvas);
  twgl.resizeCanvasToDisplaySize(ctx.canvas);

  //set the document resolution
  store.dispatch(ACT.statusRes({x:canvas.clientWidth, y:canvas.clientHeight}));

  store.dispatch(ACT.cursorGridScale(64));
  store.dispatch(ACT.cursorGrid(64));
  
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

  // this ends up being an identity matrix
  let texMatrix = twgl.m4.translation(twgl.v3.create(0,0,0));
  texMatrix = twgl.m4.scale(texMatrix, twgl.v3.create(1, 1, 1));

  let gridUniforms = {
    u_textureMatrix: twgl.m4.copy(texMatrix),
    u_resolution: twgl.v3.create(gl.canvas.width, gl.canvas.height, 0),
    u_dPt: dPt,
  }

  // grid layer
  let gridLayer = new Layer({type:"grid"}, SF.simpleVert, SF.gridFrag, 0, gridUniforms);
  layers.push(gridLayer);

  let uiUniforms = {
    u_textureMatrix: twgl.m4.copy(texMatrix),
    u_resolution: twgl.v3.create(gl.canvas.width, gl.canvas.height, 0),
    u_dPt: dPt,
    u_mPt: mPt.v3,
    u_eTex: {},
    u_weight: 0.001,
    u_stroke: chroma("#ffa724").gl().slice(0,3),
    u_boxSel: twgl.v3.create(),
    u_boxState: state.ui.boxSelectState,
  }

  // grid layer
  let uiLayer = new Layer({type:"ui"}, SF.simpleVert, SF.uiFrag, 10000, uiUniforms);
  layers.push(uiLayer);

  // demo shader
  // need to make it easier to add primitives to the scene...
  // let demoUniforms = {
  //   u_textureMatrix: twgl.m4.copy(texMatrix),
  //   u_resolution: twgl.v3.create(gl.canvas.width, gl.canvas.height, 0),
  //   u_dPt: dPt,
  //   u_eTex: {},
  // }

  // let demoLayer = new Layer({type:"demo"}, SF.simpleVert, SF.raymarchFrag, 1, demoUniforms);
  // demoLayer.bbox = new PRIM.bbox([{x:0., y:0.}, {x:1.0, y:1.0}], "demo"); 
  // updateMatrices(demoLayer);
  // layers.push(emoLayer);
  console.log(resolution)
  // full screen edit layer
  let currItem = state.scene.editItems.find(i => i.id === state.scene.editItem);
  let plineLayer = new Layer(currItem, SF.simpleVert, SF.pLineEdit, state.scene.editItems.length);
  layers.push(plineLayer);
  //---
  distTex = twgl.createTexture(gl, {
    level: 0,
    width: gl.canvas.width,
    height: gl.canvas.height,
    min: gl.LINEAR,
    wrap: gl.CLAMP_TO_EDGE,
  })

  sceneTex = twgl.createTexture(gl, {
    level: 0,
    width: gl.canvas.width,
    height: gl.canvas.height,
    min: gl.LINEAR,
    wrap: gl.CLAMP_TO_EDGE,
  })

  // eventually would like 
  distBuffer = twgl.createFramebufferInfo(gl, [
    {attachment:sceneTex, attachmentPoint:gl.COLOR_ATTACHMENT0},
    {attachment:distTex, attachmentPoint:gl.COLOR_ATTACHMENT1}
  ], gl.canvas.width, gl.canvas.height)

  addDistImg(distTex, {width:gl.canvas.width, height:gl.canvas.height}, {x: 0, y: 0})

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  
  requestAnimationFrame(render);
}

// addDistImage function
export function addDistImg(distTex, dims, evPt) {

  let texMatrix = twgl.m4.translation(twgl.v3.create(0,0,0));
  // texMatrix = twgl.m4.scale(texMatrix, twgl.v3.create(1, 1, 1));

  let imgUniforms = {
    u_textureMatrix: twgl.m4.copy(texMatrix),
    u_resolution: twgl.v3.create(gl.canvas.width, gl.canvas.height, 0),
    u_dPt: dPt,
    u_distTex: distTex,
  }

  // I have no idea where this number comes from
  let width = dims.width/ dims.height;
  let height = dims.height/ dims.height;

  // transforms window / js space to sdf / frag space
  evPt.x = ((evPt.x/resolution.x) * (resolution.x/resolution.y)) - dPt[0];
  evPt.y = (evPt.y/resolution.y)  - dPt[1];
  evPt.x = evPt.x * (dPt[2] / 64.);
  evPt.y = evPt.y * (dPt[2] / 64.);

  let pt0 = new PRIM.vec(evPt.x + width, evPt.y + height);
  let pt1 = new PRIM.vec(evPt.x, evPt.y);
  let pts = [pt0, pt1];

  let imgPrim = new PRIM.prim("img", pts, {}, PRIM.uuid());
  let imgLayer = new Layer(imgPrim, SF.imgVert, SF.distFrag, state.scene.editItems.length, imgUniforms, 10);

  let bbox = new PRIM.bbox(imgPrim,0.0);
  
  imgPrim.bbox = bbox;
  imgLayer.bbox = {...bbox};
    
  store.dispatch(ACT.scenePushEditItem(imgPrim, state.scene.editItem))

  updateMatrices(imgLayer);

  layers.push(imgLayer);
}

// addImage function
export function addImage(_src, dims, evPt, _uName) {
  let src, image;
  switch(typeof _src){
    case "string":
      src = _src;
      break;
    default :
      src = "../assets/textures/leaves.jpg";
      break;
  }

  let texMatrix = twgl.m4.translation(twgl.v3.create(0,0,0));
  texMatrix = twgl.m4.scale(texMatrix, twgl.v3.create(1, 1, 1));

  image = twgl.createTexture(gl, {
    src: src,
    color: [0.125, 0.125, 0.125, 0.125],
  }, () => {
    // console.log(image);
  });

  twgl.loadTextureFromUrl(gl, image);  
  
  let imgUniforms = {
    u_textureMatrix: twgl.m4.copy(texMatrix),
    u_resolution: twgl.v3.create(gl.canvas.width, gl.canvas.height, 0),
    u_dPt: dPt,
    u_img: image,
  }
  
  // Will want to add some cool image processing stuff at some point...
  // Blending, edge detection, img -> sdf in some way :)
  
  let width = dims.width/dims.height;
  let height = dims.height/dims.height; 

  // transforms window / js space to sdf / frag space
  evPt.x = ((evPt.x/resolution.x) * (resolution.x/resolution.y)) - dPt[0];
  evPt.y = (evPt.y/resolution.y)  - dPt[1];
  evPt.x = evPt.x * (dPt[2] / 64.);
  evPt.y = evPt.y * (dPt[2] / 64.);

  let pt0 = new PRIM.vec(evPt.x, evPt.y);
  let pt1 = new PRIM.vec(evPt.x + width, evPt.y + height);
  let pts = [pt0, pt1];

  let imgPrim = new PRIM.prim("img", pts, {}, PRIM.uuid());
  let imgLayer = new Layer(imgPrim, SF.imgVert, SF.imgFrag, state.scene.editItems.length, imgUniforms, 10);

  let bbox = new PRIM.bbox(imgPrim,0.0);
  
  imgPrim.bbox = bbox;
  imgLayer.bbox = {...bbox};
    
  store.dispatch(ACT.scenePushEditItem(imgPrim, state.scene.editItem))

  updateMatrices(imgLayer);

  layers.push(imgLayer);
}

function update() {

  ui.update();

  let selDist = sceneDist();
  
  // Style mouse for hover - could also do tooltip at some point
  if(selDist.d < 0.01 && state.ui.mode === "select" && selDist.sel){
    if(state.scene.hover !== selDist.sel.id){
      document.getElementById("canvasContainer").style.cursor = "grab";
      store.dispatch(ACT.editHoverSet(selDist.sel.id))
    }
  } else if (state.scene.hover !== "") {
    document.getElementById("canvasContainer").style.cursor = "auto"
    store.dispatch(ACT.editHoverClr())
  }

  updateCtx(selDist);

  resize = twgl.resizeCanvasToDisplaySize(gl.canvas);

  if(resize){
    twgl.resizeCanvasToDisplaySize(ctx.canvas);
    twgl.resizeTexture(gl, distTex, {
      level: 0,
      width: gl.canvas.width,
      height: gl.canvas.height,
      min: gl.LINEAR,
      wrap: gl.CLAMP_TO_EDGE,
    })
    twgl.resizeTexture(gl, sceneTex, {
      level: 0,
      width: gl.canvas.width,
      height: gl.canvas.height,
      min: gl.LINEAR,
      wrap: gl.CLAMP_TO_EDGE,
    })
    store.dispatch(ACT.statusRes({x:gl.canvas.clientWidth, y:gl.canvas.clientHeight}));
  }

  layers.forEach(function(layer){
    let prim = state.scene.editItems.find(a => a.id === layer.id);
    
    if(layer.primType === "ui") {
      prim = state.scene.editItems.find(item => item.id === state.scene.editItem);
    }
    // This is probably fine to do this at render...
    updateUniforms(prim, layer);
    
    if(layer.bbox){ updateMatrices(layer); }
  })
}

function updateUniforms(prim, layer){
  
  gl.useProgram(layer.programInfo.program);

  if(resize){
    layer.uniforms.u_resolution['0'] = gl.canvas.clientWidth;
    layer.uniforms.u_resolution['1'] = gl.canvas.clientHeight;
  }

  if(layer.uniforms.u_mPt){
    layer.uniforms.u_mPt['0'] = mPt.x;
    layer.uniforms.u_mPt['1'] = mPt.y;
  }
  if(layer.uniforms.u_dPt){
    layer.uniforms.u_dPt = dPt;
  }
  
  // edit item array and layer array may become out of sync temporarily
  // as edit items are added and removed
  if(!prim) return;

  if(typeof layer.uniforms.u_stroke === 'object'){
    layer.uniforms.u_stroke = chroma(prim.properties.stroke).gl().slice(0,3);
  }
  if(typeof layer.uniforms.u_fill === 'object'){
    layer.uniforms.u_fill = chroma(prim.properties.fill).gl().slice(0,3);
  }
  if(typeof layer.uniforms.u_weight === 'number'){
    layer.uniforms.u_weight = prim.properties.weight;
  }
  if(typeof layer.uniforms.u_opacity  === 'number'){
    layer.uniforms.u_opacity = prim.properties.opacity;
  }
  if(typeof layer.uniforms.u_radius  === 'number'){
    layer.uniforms.u_radius = prim.properties.radius; 
  }
  if(typeof layer.uniforms.u_distTex  === 'object'){
    layer.uniforms.u_distTex = distTex;
  }

  // box select
  if(typeof layer.uniforms.u_boxSel  === 'object'){
    layer.uniforms.u_boxSel = twgl.v3.copy(state.ui.boxSel);
  }
  // box select state 0, 1
  if(typeof layer.uniforms.u_boxState  === 'number'){
    layer.uniforms.u_boxState = state.ui.boxSelectState; 
  }

  if(typeof layer.uniforms.u_sel  === 'number'){
    if(state.scene.selected.includes(prim.id)){
      if (layer.uniforms.u_sel < 1.0) layer.uniforms.u_sel += 0.15;
    } else if (state.scene.hover === prim.id) {
      if (layer.uniforms.u_sel < 0.7) layer.uniforms.u_sel += 0.06;
    } else {
      if (layer.uniforms.u_sel > 0.0) layer.uniforms.u_sel -= 0.15;
    }
  }
  
  // weird but probably okay
  if(typeof layer.uniforms.u_cTex === 'number'){
    layer.uniforms.u_cTex = layer.uniforms.u_eTex.cTexel;
  }

  twgl.setUniforms(layer.programInfo, layer.uniforms);
}

function draw() {
  // spatial indexing / hashing for rendering
  // filtering the render list causes the framerate to drop, does using .active work better?
  // only show edit item when state.ui.mode === "draw"
  let bboxSearch = bboxTree.search(view).map(b => b.id);

  layers.forEach(l => l.active = bboxSearch.includes(l.id) 
                                 || (state.scene.editItem === l.id && state.ui.mode === "draw")
                                 && l.primType !== 'pointlight'
                                 && l.visible);
  
  // console.log(layers)
  
  // draw to distTex
  twgl.bindFramebufferInfo(gl, distBuffer)
  gl.viewport(0, 0, gl.canvas.clientWidth, gl.canvas.clientHeight);
  gl.drawBuffers([
    gl.COLOR_ATTACHMENT0,
    gl.COLOR_ATTACHMENT1
  ])
  // Clear
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  twgl.drawObjectList(gl, layers.sort((a,b)=> a.order - b.order));

  //
  // an optimization could be to render sceneTex to the screen instead of re-rendering the scene
  layers.forEach(l => l.active = bboxSearch.includes(l.id) || 
                                 (state.scene.editItem === l.id && state.ui.mode === "draw") 
                                 || l.primType === "grid" || l.primType === "ui" 
                                 && l.visible);

  // draw to canvas
  twgl.bindFramebufferInfo(gl, null)
  // Clear the canvas
  gl.clearColor(1, 1, 1, 0.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  // Tell WebGL how to convert from clip space to pixels
  gl.viewport(0, 0, gl.canvas.clientWidth, gl.canvas.clientHeight);
  twgl.drawObjectList(gl, layers.sort((a,b)=> a.order - b.order));

  // save raster image
  if(state.status.raster){
    canvas.toBlob((blob) => {
      saveBlob(blob, `screencapture-${canvas.width}x${canvas.height}.png`);
    });
    store.dispatch(ACT.statusRaster(false));
  }
}

function render() {
  update();
  draw();
  requestAnimationFrame(render);
}

// var scale = 64;
function scrollPan(e){
  e.preventDefault();

  if (e.ctrlKey) {
    // Your zoom/scale factor
    dPt[2] = Math.max(1., dPt[2] + e.deltaY * 0.1);
  } else {
    dPt[0] += e.deltaX * 0.001;
    dPt[1] += e.deltaY * 0.001;
  }

  view = {
    minX: (0.0 - dPt[0]) / (64 / dPt[2]),
    minY: (0.0 - dPt[1]) / (64 / dPt[2]),
    maxX: ((resolution.x / resolution.y) - dPt[0]) / (64 / dPt[2]) ,
    maxY: (1.0 - dPt[1]) / (64 / dPt[2]) ,
  }
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

  // display current mouse pos
  ctx.fillStyle = 'black';
  let mPtString = '(' + mPt.x.toFixed(3) + ', ' + mPt.y.toFixed(3) + ')';
  ctx.fillText("Cursor: " + mPtString, pixelPt.x + 12, pixelPt.y);
  
  if(typeof selPrim !== "undefined" && dist < 0){
    ctx.fillStyle = selPrim.idColHex;
    ctx.fillText(selPrim.type + ': ' + selPrim.id, pixelPt.x + 12, pixelPt.y + 14);
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
  
  let inMouse = state.scene.editItems.filter(i => bboxSearch.includes(i.id))
  
  // if(inMouse.length > 0) console.log(inMouse);
  
  for (let prim of inMouse){

    if (prim.id === state.scene.editItem) continue;

    let currDist = PRIM.distPrim(mPt, prim);

    if (currDist < dist){
      selPrim = prim;
      dist = currDist;
    }
  }
  return {d:dist, sel:selPrim};
}

export function deleteLayer(id){
  layers = layers.filter(l => l.id !== id);
}

export function pushLayer(layer){
  layers.push(layer);
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
  
  // console.log(shader);
  
  return shader;
}