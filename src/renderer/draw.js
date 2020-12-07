"use strict";

import * as chroma from 'chroma-js';
import * as twgl from 'twgl.js';
import {createStore} from 'redux';
import * as RBush from 'rbush';

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

export var layers = [];

var mouseDragStart = new PRIM.vec(0, 0);

// update local shit from state
// layers, ptTree, bboxTree should all be updated here
function listener(){

  state = store.getState();
  resolution = state.status.resolution;
  
  // update mouse position variable
  mPt = PRIM.vecSet(mPt, state.cursor.pos.x, state.cursor.pos.y);
  
  // update kdTree of points
  for(let p of state.scene.pts){
    // will need to find and move, or find remove and add when update means moving points around
    if(p.update == true){
      ptTree.insert(p);
      //TODO: create a reducer that changes this parameter
      p.update = false;
    }
  }

  for(let pId of state.scene.rmPts){
    // so a = pId, b are the points we're mapping over
    ptTree.remove(pId, (a, b) => {
      return a === b.id;
    });
    // console.log(ptTree.all());
    store.dispatch(ACT.sceneFinRmvPt(pId));
  }
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
  let gridLayer = new Layer({type:"grid"}, SF.simpleVert, SF.gridFrag, gridUniforms);
  // store.dispatch(ACT.layerPush(gridLayer));
  layers.push(gridLayer);

  // demo shader
  // let demoUniforms = {
  //   u_textureMatrix: twgl.m4.copy(texMatrix),
  //   u_resolution: twgl.v3.create(gl.canvas.width, gl.canvas.height, 0),
  //   u_dPt: dPt,
  //   u_eTex: {},
  // }

  // let demoLayer = new Layer({type:"demo"}, SF.simpleVert, SF.raymarchFrag, demoUniforms);
  // demoLayer.bbox = new PRIM.bbox([{x:0., y:0.}, {x:1.0, y:1.0}], "demo"); 
  // updateMatrices(demoLayer);
  // store.dispatch(ACT.layerPush(demoLayer));

  // full screen edit layer
  let currItem = state.scene.editItems.find(i => i.id === state.scene.editItem);
  let plineLayer = new Layer(currItem, SF.simpleVert, SF.pLineEdit);
  // store.dispatch(ACT.layerPush(plineLayer));
  layers.push(plineLayer);

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  // would like to try and render "distance" to accumulating buffer like color
  // gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, targetTexture, 0);

  requestAnimationFrame(render);
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

  // store.dispatch(ACT.layerPushImage(imgLayer));
  layers.push(imgLayer);
}

function update() {

  ui.update();

  let selDist = sceneDist();
  // console.log(selDist);
  if(selDist.d < 0.01 && state.ui.mode === "select" && selDist.sel){
    document.getElementById("canvasContainer").style.cursor = "grab";
    store.dispatch(ACT.editHoverSet(selDist.sel.id))
  } else if (state.scene.hover !== "") {
    document.getElementById("canvasContainer").style.cursor = "auto"
    store.dispatch(ACT.editHoverClr())
  }

  updateCtx(selDist);

  let resize = twgl.resizeCanvasToDisplaySize(gl.canvas);

  if(resize){
    twgl.resizeCanvasToDisplaySize(ctx.canvas);
    store.dispatch(ACT.statusRes({x:gl.canvas.clientWidth, y:gl.canvas.clientHeight}));
  }

  //update uniforms - might want a needsUpdate on these at some point
  //also might want to switch this to loop over edit items
  //and only edit items in view
  layers.forEach(function(layer) {

    if(layer.bbox){ updateMatrices(layer); }

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
    
    //keep layer uniforms aligned with drawObject
    let drawObject = state.scene.editItems.find(a => a.id === layer.prim);

    if(layer.primType === "demo") console.log(layer.uniforms);

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
        if (layer.uniforms.u_sel < 1.0) layer.uniforms.u_sel += 0.15;
      } else if (state.scene.hover === drawObject.id) {
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
  });
}

function draw() {

  // Tell WebGL how to convert from clip space to pixels
  gl.viewport(0, 0, gl.canvas.clientWidth, gl.canvas.clientHeight);

  // Clear the canvas
  gl.clearColor(1, 1, 1, 1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // bringing objects in and out of the render list causes the framerate to drop
  // spatial indexing / hashing for rendering
  // let bboxSearch = bboxTree.search(view).map(b => b.id);
  // let inView = state.render.layers.filter(l => bboxSearch.includes(l.id) || 
                                              // state.scene.editItems[state.scene.editItem].id === l.prim || 
                                              // l.primType === "grid");
  
  // console.log(inView);
  twgl.drawObjectList(gl, layers);

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
  // console.log(mouse);
  // console.log(bboxSearch);
  let inMouse = state.scene.editItems.filter(i => bboxSearch.includes(i.id))
  if(inMouse.length > 0) console.log(inMouse);
  for (let prim of inMouse){
    // let prim = state.scene.editItems.find(p => p.id === layer.prim);
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