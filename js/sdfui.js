"use strict";

//import * as THREE from 'https://unpkg.com/three@0.108.0/build/three.module.js';
import * as THREE from './libjs/three.module.js';

import {GhostUI, Button} from './GhostUI.js';

import {sdfLines} from './frag.js';
import {sdfPrimVert} from './vert.js';


var material, uniforms;
var canvas, renderer, camera, ui, scene, plane, screenMesh;

const state = {
  time: 0,
  pauseR: false,
};

function main() {
  canvas = document.querySelector('#c');
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

  // const targOptions = {
  //   wrapS: 'ClampToEdgeWrapping',
  //   wrapT: 'ClampToEdgeWrapping',
  //   magFilter: 'LinearFilter',
  //   minFilter: 'LinearFilter',
  //   format: 'RGBAFormat',
  //   type: 'UnsignedByteType',
  //   anisotropy: 1,
  //   encoding: 'LinearEncoding',
  //   depthBuffer: false,
  //   stencilBuffer: false,
  // }
  //let frame = new THREE.WebGLRenderTarget(canvas.innerWidth, canvas.innerHeight);

  //gotta do this otherwise GhostUI doesn't get the proper dimensions
  resizeRendererToDisplaySize(renderer);

  ui = new GhostUI(canvas, sdfLines, new THREE.Vector2(canvas.width, canvas.height));

  let save = document.getElementById("save");
  let saveButton = new Button(save, screenshot, "Download PNG");
  // console.log(testButton);

  let pause = document.getElementById("pause");
  let pauseButton = new Button(pause, pauseShader, "Pause Shader", "p");

  let plus = document.getElementById("plus");
  let plusButton = new Button(plus, zoomPlus, "Zoom In", "+");

  let minus = document.getElementById("minus");
  let minusButton = new Button(minus, zoomMinus, "Zoom Out", "-");

  let snapGrid = document.getElementById("snapGrid");
  let snapGridButton = new Button(snapGrid, snapGridClick, "Snap Grid", "g");

  let snapPrev = document.getElementById("snapPrev");
  let snapPrevButton = new Button(snapPrev, snapPrevClick, "Snap to Previous Line", "s");

  let snapWorld = document.getElementById("snapWorld");
  let snapWorldButton = new Button(snapWorld, snapWorldClick, "Snap to Global Angle");

  let lineWeight = document.getElementById("lineWeight");
  let lineWeightButton = new Button(lineWeight, lineWeightClick, "Edit Lineweight", "w", Button.linearSlider);

  let selectPt = document.getElementById("selectPt");
  let selectPtButton = new Button(selectPt, selectPtClick, "Select Point", "a");

  // let circle = document.getElementById("circle");
  // let circleButton = new Button(circle, circleClick);

  // let bezier = document.getElementById("bezier");
  // let bezierButton = new Button(bezier, bezierClick);

// linearSlider
  uniforms = {
    iTime: { value: 0 },
    iResolution:  { value: new THREE.Vector3(canvas.width, canvas.height, 1) },
    iFrame: { value: 0 },
    posTex: { value: ui.currPolyLine.ptsTex},
    posTexRes: {value: new THREE.Vector2(16.0, 16.0)},
    mousePt: {value: ui.mPt},
    editWeight : {value: ui.editWeight},
    editOpacity : {value: ui.editOpacity},
    //this should be coming from GhostUI
    scale: {value: ui.scale},
    hiDPR: {value: window.devicePixelRatio}
  };

  scene = new THREE.Scene();
  plane = new THREE.PlaneBufferGeometry(2, 2);

  let fragmentShader = ui.shader;
  let vertexShader = sdfPrimVert;

  material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader
  });

  //console.log(material);
  screenMesh = new THREE.Mesh(plane, material);
  scene.add(screenMesh);

  requestAnimationFrame(animate);
}

function resizeRendererToDisplaySize(renderer) {
  const canvas = renderer.domElement;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;

  const needResize = canvas.width !== width || canvas.height !== height;

  if (needResize) {
    renderer.setSize(width, height, false);
  }

  return needResize;
}

function render() {

  resizeRendererToDisplaySize(renderer);

  const canvas = renderer.domElement;

  //Why does this have to happen every frame?
  screenMesh.material.uniforms.iResolution.value.set(canvas.width, canvas.height, 1);
  screenMesh.material.uniforms.editWeight.value = ui.editWeight;
  screenMesh.material.uniforms.editOpacity.value = ui.editOpacity;

  if (ui.shaderUpdate){
    uniforms.iResolution.value.set(canvas.width, canvas.height, 1);

    let vertexShader = sdfPrimVert;
    let fragmentShader = ui.shader;

    material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader,
    });

    screenMesh.material = material;
  }

  renderer.render(scene, camera);
}

function animate(time){
  state.time = time * 0.001; //convert to seconds

  if(!state.pauseR){ render(); }

  //proper way to update uniforms!
  screenMesh.material.uniforms.posTex.value = ui.currPolyLine.ptsTex;

  screenMesh.material.uniforms.mousePt.value = ui.mPt;
  screenMesh.material.uniforms.needsUpdate = true;

  requestAnimationFrame(animate);
}

//UI Button functions-----------------------------------------------

function screenshot(e){
  e.stopPropagation();
  e.stopImmediatePropagation();
  e.cancelBubble = true;

  if(!this.click) return;

  render();
  canvas.toBlob((blob) => {
    saveBlob(blob, `screencapture-${canvas.width}x${canvas.height}.png`);
  });
  this.snackHint();
}

function pauseShader(e){
    e.stopPropagation();
    e.stopImmediatePropagation();
    e.cancelBubble = true;
    // console.log(e);

    state.pauseR = !state.pauseR;
    this.snackHint();
}

function zoomMinus(e){
    e.stopPropagation();
    e.stopImmediatePropagation();
    e.cancelBubble = true;

    let oldVal = screenMesh.material.uniforms.scale.value;
    screenMesh.material.uniforms.scale.value = oldVal + 0.25;
    screenMesh.material.uniforms.needsUpdate = true;
    this.snackHint();
}

function zoomPlus(e){
    e.stopPropagation();
    e.stopImmediatePropagation();
    e.cancelBubble = true;

    let oldVal = screenMesh.material.uniforms.scale.value;
    screenMesh.material.uniforms.scale.value = oldVal - 0.25;
    screenMesh.material.uniforms.needsUpdate = true;
    this.snackHint();
}

function snapGridClick(e){
  ui.snapGrid = !ui.snapGrid;
  this.snackHint();
}

function snapWorldClick(e){
  ui.snapGlobal = !ui.snapGlobal;
  this.snackHint();
}

function snapPrevClick(e){
  ui.snapPrev = !ui.snapPrev;
  this.snackHint();
}

function lineWeightClick(e){
  // console.log(this);

  if(!this.click) return;

  if(!this.input){
    let weight = ui.editWeight;
    let uiSlider = '<input type="range" min="1" max="20" value="' + weight + '" class="slider" id="myRange">';
    // this.elem.style.width = '15vmin';
    this.elem.classList.toggle("input-slider");
    this.elem.innerHTML = uiSlider;
    this.input = true;
  }
  else if(this.input){
    //evaluates false when closing slider
    if(event.srcElement.value){
      ui.currPolyLine.weight = parseInt(event.srcElement.value) / 2500;
      ui.editWeight = parseInt(event.srcElement.value) / 2500;
    }

    if(event.target != this.elem) return;

    this.elem.classList.toggle("input-slider");
    // this.elem.style.width = '5vmin';
    window.setTimeout(function(){this.elem.innerHTML = this.innerHTML;}.bind(this), 900);
    this.input = false;
  }
  this.snackHint();
}

function selectPtClick(event){
  console.log("selectPt");
  console.log(event);
  console.log(this);
  this.snackHint();
}

function circleClick(event){
  console.log("circle");
  console.log(event);
  console.log(this);
  this.snackHint();
}

function bezierClick(event){
  console.log("bezierClick");
  console.log(event);
  console.log(this);
  this.snackHint();
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

//Run-----------------------------------------------------------
main();
