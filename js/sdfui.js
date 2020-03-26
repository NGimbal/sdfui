"use strict";

//import * as THREE from 'https://unpkg.com/three@0.108.0/build/three.module.js';
import * as THREE from './libjs/three.module.js';

import * as PRIM from './fluentPrim.js';
import {GhostUI} from './GhostUI.js';

import * as ACT from './actions.js';
import { reducer } from './reducers.js';


import {sdfPrimFrag} from './frag.js';
import {sdfPrimVert} from './vert.js';

var material, uniforms;
var dataShader;
var canvas, renderer, camera, ui, scene, plane, screenMesh;


export const store = Redux.createStore(reducer);
export var state = store.getState();


function pointDist (a, b){
    var dx = a.x - b.x;
    var dy = a.y - b.y;
    return dx*dx + dy*dy;
}

export var resolution;
export var mPt = new PRIM.Point(0, 0);

export var ptTree = new kdTree([], pointDist, ["x", "y"]);

//This is how I'm letting other parts of the app
//have quick access to parts of the state
function listener(){
  state = store.getState();
  //update resolution variable
  resolution = state.status.resolution;
  //update mouse position variable
  mPt.setXY(state.cursor.pos.x, state.cursor.pos.y);
  //update kdTree of points
  for(let p of state.scene.pts){
    if(p.pt.update == true){
      ptTree.insert(p.pt);
      p.pt.update = false;
    }
  }
  return state;
};



//substcribe to store changes - run listener to set relevant variables
store.subscribe(() => console.log(listener()));
// store.subscribe(() => listener());

function setGrid(scale){
  let rX = resolution.x / resolution.y; //resolution.x
  let rY = 1.0; //resolution.y
  let scaleX = 2.0 / scale;
  let scaleY = 2.0 / scale;

  //There has got to be a more elegant way to do this...
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
  //let res = new THREE.Vector3(window.innerWidth, window.innerHeight, 1.0);
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
  let fluentDoc = ui.fluentStack.curr();

  resizeRendererToDisplaySize(renderer);

  //the copy of ui Options in parameters will trigger shader recompilation
  //basically a record of what has actually been instantiated in the shader
  //versus the ui state
  let parameters = new PRIM.PolyPoint({...ui.modeStack.curr().options}, 128);

  uniforms = {
    iResolution:  { value: new THREE.Vector3(resolution.x, resolution.y, resolution.z)},
    //uniform for rect, circle, primitives based on two points
    pointPrim: {value: new THREE.Vector4(0.0,0.0,0.0,0.0) },
    //uniform for curr edit polypoint prims, should be factored out
    posTex: { value: fluentDoc.currEditItem.ptsTex},
    //resolution for curr edit poly point prims
    posTexRes: {value: new THREE.Vector2(16.0, 16.0)},
    //global points texture
    parameters: {value: parameters},
    //current mouse position - surprised mPt works here
    mousePt: {value: mPt},
    //index of texel being currently edited
    editCTexel : {value: fluentDoc.currEditItem.cTexel},
    //current edit options
    editWeight : {value: ui.modeStack.curr().options.weight},
    strokeColor: {value: new THREE.Vector3(0.0, 0.0, 0.0)},
    fillColor: {value: new THREE.Vector3(0.0, 0.384, 0.682)},
    editRadius : {value: ui.modeStack.curr().options.radius},
    //global scale variables, mostly unused
    scale: {value: fluentDoc.scale},
    hiDPR: {value: window.devicePixelRatio}
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
    //this is convoluted
    ui.fluentStack.curr().shaderUpdate = true;
  }

  return needResize;
}

//render the scene
function render() {

  resizeRendererToDisplaySize(renderer);

  ui.update();

  // const canvas = renderer.domElement;
  let fluentDoc = ui.fluentStack.curr();

  //update uniforms
  if(fluentDoc.currEditItem.ptsTex){
    //next this is going to come out of polyPointPrim
    screenMesh.material.uniforms.posTex.value = fluentDoc.currEditItem.ptsTex;
    screenMesh.material.uniforms.editCTexel.value = fluentDoc.currEditItem.cTexel;
  }
  if(fluentDoc.currEditItem.pointPrim){
    screenMesh.material.uniforms.pointPrim.value = fluentDoc.currEditItem.pointPrim;
  }

  let uiOptions = ui.modeStack.curr().options;

  //surprised that mPt works here
  screenMesh.material.uniforms.mousePt.value = mPt;
  screenMesh.material.uniforms.editWeight.value = uiOptions.weight;
  screenMesh.material.uniforms.strokeColor.value = uiOptions.stroke;
  screenMesh.material.uniforms.fillColor.value = uiOptions.fill;
  screenMesh.material.uniforms.editRadius.value = uiOptions.radius;

  screenMesh.material.uniforms.needsUpdate = true;

  let shaderUpdate = false;

  //change current edit item in shader
  if (uiOptions.currEditItem != dataShader.parameters.properties.currEditItem){
    dataShader.parameters.properties.currEditItem = uiOptions.currEditItem;
    switch(uiOptions.currEditItem){
      case "PolyLine":
        dataShader.shader = modifyDefine(dataShader.shader, "EDIT_SHAPE", "1");
        break;
      case "Polygon":
        dataShader.shader = modifyDefine(dataShader.shader, "EDIT_SHAPE", "5");
        break;
      case "PolyCircle":
        dataShader.shader = modifyDefine(dataShader.shader, "EDIT_SHAPE", "2");
        break;
      case "Circle":
        dataShader.shader = modifyDefine(dataShader.shader, "EDIT_SHAPE", "3");
        break;
      case "Rectangle":
        dataShader.shader = modifyDefine(dataShader.shader, "EDIT_SHAPE", "4");
        break;
    }
    shaderUpdate = true;
  }

  //change filter in shader
  if (uiOptions.filter != dataShader.parameters.properties.filter){
    dataShader.parameters.properties.filter = uiOptions.filter;
    switch(uiOptions.filter){
      case "None":
        dataShader.shader = modifyDefine(dataShader.shader, "FILTER", "0");
        break;
      case "Pencil":
        dataShader.shader = modifyDefine(dataShader.shader, "FILTER", "1");
        break;
      case "Crayon":
        dataShader.shader = modifyDefine(dataShader.shader, "FILTER", "2");
        break;
      case "SDF":
        dataShader.shader = modifyDefine(dataShader.shader, "FILTER", "3");
        break;
    }
    shaderUpdate = true;
  }

  //keep shader update for now
  if (fluentDoc.shaderUpdate || shaderUpdate){
    console.log("shader update!");
    let vertexShader = sdfPrimVert;

    uniforms.iResolution.value = new THREE.Vector3(resolution.x, resolution.y, resolution.z);

    for (let item of fluentDoc.editItems){
      if(item.needsUpdate){
        dataShader = item.end(dataShader.shader, dataShader.parameters);
        item.needsUpdate = false;
      }
    }

    uniforms.parameters.value = dataShader.parameters.ptsTex;

    let fragmentShader = dataShader.shader;

    material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader,
    });

    screenMesh.material = material;

    fluentDoc.shaderUpdate = false;
  }

  renderer.render(scene, camera);

  //this hack is necessary because saving has to happen
  //while framebuffer still has data
  if(fluentDoc.screenshot){
    canvas.toBlob((blob) => {
      saveBlob(blob, `screencapture-${canvas.width}x${canvas.height}.png`);
    });
    fluentDoc.screenshot = false;
  }
}

function animate(time){
  //currently can't unpause for some reason
  let fluentDoc = ui.fluentStack.curr();
  if(!fluentDoc.shaderPause){ render(); }

  requestAnimationFrame(animate);
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

function modifyDefine(shader, define, val){
  //change #define
  let insString = "#define " + define + " ";
  let insIndex = shader.indexOf(insString);
  insIndex += insString.length;

  let startShader = shader.slice(0, insIndex);
  let endShader = shader.slice(insIndex+2);

  startShader += val + "\n";
  shader = startShader + endShader;

  return shader;
}

//Run-----------------------------------------------------------
main();
