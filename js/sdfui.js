"use strict";

//import * as THREE from 'https://unpkg.com/three@0.108.0/build/three.module.js';
import * as THREE from './libjs/three.module.js';

import * as PRIM from './primitives.js';
import * as BAKE from './bakePrim.js';
import {GhostUI} from './ghostUI.js';

import * as ACT from './actions.js';
import { reducer } from './reducers.js';

import {sdfPrimFrag} from './frag.js';
import {sdfPrimVert} from './vert.js';

import {createStore} from './libjs/redux.js';

var canvas, renderer, camera, ui, scene, plane, screenMesh;
var material, uniforms;

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
  for(let p of state.scene.rmPts){
    //normal tree search function doesnt work
    let rmPt = searchTree(ptTree.root, p.id);
    ptTree.remove(rmPt);
    store.dispatch(ACT.sceneFinRmvPt(p));
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
store.subscribe(() => console.log(listener()));
// store.subscribe(() => listener());

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

  const context = canvas.getContext( 'webgl2', { alpha: false, antialias: false } );

  if (!context){
    console.log("your browser/OS/drivers do not support WebGL2");
    return;
  }

  console.log(context.getSupportedExtensions());

  renderer = new THREE.WebGLRenderer({canvas: canvas, context: context});
  renderer.autoClearColor = false;

  camera = new THREE.OrthographicCamera(
    -1, // left
     1, // right
     1, // top
    -1, // bottom
    -1, // near,
     1, // far
  );

  ui = new GhostUI();

  resizeRendererToDisplaySize(renderer);

  //the copy of ui Options in parameters will trigger shader recompilation
  //basically a record of what has actually been instantiated in the shader
  //versus the ui state
  let parameters = new PRIM.PolyPoint({...state.ui.properties}, 128);
  editTex = new PRIM.PolyPoint({...state.ui.properties}, 16);

  uniforms = {
    iResolution:  { value: new THREE.Vector3(resolution.x, resolution.y, resolution.z)},
    //uniform for curr edit polypoint prims, should be factored out
    posTex: { value: editTex},
    //index of texel being currently edited
    editCTexel : {value: editTex.cTexel},
    //global points texture
    parameters: {value: parameters},
    //current mouse position - surprised mPt works here
    mousePt: {value: mPt},
    //current edit options
    editWeight : {value: state.ui.properties.weight},
    strokeColor: {value: new THREE.Vector3(0.0, 0.0, 0.0)},
    fillColor: {value: new THREE.Vector3(0.0, 0.384, 0.682)},
    editRadius : {value: state.ui.properties.radius},
    //global scale variables, mostly unused
    scale: {value: state.cursor.scale},
  };

  scene = new THREE.Scene();
  plane = new THREE.PlaneBufferGeometry(2, 2);

  let fragmentShader = sdfPrimFrag;
  let vertexShader = sdfPrimVert;

  material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader
  });

  //simple data structure for combination of fragment shader and texture
  //both are generated from the list / tree of primitives in the scene
  dataShader = new PRIM.DataShader(fragmentShader, parameters);

  screenMesh = new THREE.Mesh(plane, material);
  scene.add(screenMesh);

  requestAnimationFrame(animate);
}

//gotta resize the screen sometimes
function resizeRendererToDisplaySize(renderer) {
  const canvas = renderer.domElement;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;

  const needResize = canvas.width !== width || canvas.height !== height;

  if (needResize) {
    renderer.setSize(resolution.x, resolution.y, false);
    store.dispatch(ACT.statusRes({x:width, y:height}));
    store.dispatch(ACT.cursorGridScale(48));
    store.dispatch(ACT.statusUpdate(true));
  }

  return needResize;
}

//render the scene
function render() {

  resizeRendererToDisplaySize(renderer);

  ui.update();

  screenMesh.material.uniforms.posTex.value = editTex.ptsTex;
  screenMesh.material.uniforms.editCTexel.value = editTex.cTexel;

  // let uiOptions = ui.modeStack.curr().options;
  let uiOptions = state.ui.properties;

  //mPt is converted into a vector3 in the listener at the top
  screenMesh.material.uniforms.mousePt.value = mPt;
  screenMesh.material.uniforms.editWeight.value = state.ui.properties.weight;

  //should be able to get more expressive colors at some point...
  let stroke = hexToRgb(state.ui.properties.stroke);
  screenMesh.material.uniforms.strokeColor.value.set(stroke.r/255, stroke.g/255, stroke.b/255);
  let fill = hexToRgb(state.ui.properties.fill);
  screenMesh.material.uniforms.fillColor.value.set(fill.r/255, fill.g/255, fill.b/255);

  screenMesh.material.uniforms.editRadius.value = state.ui.properties.radius;

  screenMesh.material.uniforms.needsUpdate = true;

  //if we're changing the status of showing/hiding the background grid
  if (state.ui.grid != dataShader.parameters.properties.grid){
    dataShader.parameters.properties.grid = state.ui.grid;
    let valString = "0";

    if (!state.ui.grid) valString = "1";
    modifyDefine(dataShader, "BG_GRID", valString);

    store.dispatch(ACT.statusUpdate(true));
  }

  //if we're changing the status of showing/hiding points
  if (state.ui.points != dataShader.parameters.properties.points){
    dataShader.parameters.properties.points = state.ui.points;
    let valString = "0";

    if (!state.ui.points) valString = "1";
    modifyDefine(dataShader, "SHOW_PTS", valString);

    store.dispatch(ACT.statusUpdate(true));
  }

  //keep shader update for now
  if (state.status.shaderUpdate){
    console.log("shader update!");
    let vertexShader = sdfPrimVert;

    uniforms.iResolution.value = new THREE.Vector3(resolution.x, resolution.y, resolution.z);

    //this is where primitives get rebaked to shader if they need it
    let index = 0;
    for (let prim of state.scene.editItems){
      if(prim.needsUpdate){
        switch(prim.type){
          case "polyline":
            dataShader = BAKE.polyLine(prim, dataShader);
            store.dispatch(ACT.sceneItemUpdate(index, false));
            break;
          case "polygon":
            dataShader = BAKE.polygon(prim, dataShader);
            store.dispatch(ACT.sceneItemUpdate(index, false));
            break;
          case "polycircle":
            dataShader = BAKE.polyCircle(prim, dataShader);
            store.dispatch(ACT.sceneItemUpdate(index, false));
            break;
          case "circle":
            dataShader = BAKE.circle(prim, dataShader);
            store.dispatch(ACT.sceneItemUpdate(index, false));
            break;
          case "rectangle":
            dataShader = BAKE.rectangle(prim, dataShader);
            store.dispatch(ACT.sceneItemUpdate(index, false));
          default:
            break;
        }
      }
      index++;
    }

    uniforms.parameters.value = dataShader.parameters.ptsTex;

    let fragmentShader = dataShader.shader;

    material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader,
    });

    screenMesh.material = material;

    store.dispatch(ACT.statusUpdate(false));
  }

  renderer.render(scene, camera);

  //this hack is necessary because saving has to happen
  //while framebuffer still has data
  if(state.status.raster){
    canvas.toBlob((blob) => {
      saveBlob(blob, `screencapture-${canvas.width}x${canvas.height}.png`);
    });
    store.dispatch(ACT.statusRaster());
  }
}

function animate(time){
  if(!state.ui.pause){ render(); }

  requestAnimationFrame(animate);
}

export function newEditTex(){
  editTex = new PRIM.PolyPoint({...state.ui.properties}, 16);
}

//Utility Functions-----------------------------------------------

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
