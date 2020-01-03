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
  let saveButton = new Button(save, screenshot);
  // console.log(testButton);

  let pause = document.getElementById("pause");
  let pauseButton = new Button(pause, pauseShader);

  let plus = document.getElementById("plus");
  let plusButton = new Button(plus, zoomPlus);

  let minus = document.getElementById("minus");
  let minusButton = new Button(minus, zoomMinus);

  let snapGrid = document.getElementById("snapGrid");
  let snapGridButton = new Button(snapGrid, snapGridClick);

  let snapPrev = document.getElementById("snapPrev");
  let snapPrevButton = new Button(snapPrev, snapPrevClick);

  let snapWorld = document.getElementById("snapWorld");
  let snapWorldButton = new Button(snapWorld, snapWorldClick);

  let lineWeight = document.getElementById("lineWeight");
  let lineWeightButton = new Button(lineWeight, lineWeightClick, Button.linearSlider);

  let bezier = document.getElementById("bezier");
  let bezierButton = new Button(bezier, bezierClick);

// linearSlider
  uniforms = {
    iTime: { value: 0 },
    iResolution:  { value: new THREE.Vector3(canvas.width, canvas.height, 1) },
    iFrame: { value: 0 },
    posTex: { value: ui.currPolyLine.ptsTex},
    posTexRes: {value: new THREE.Vector2(16.0, 16.0)},
    mousePt: {value: ui.mPt},
    editWeight : {value: ui.editWeight},
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
}

function pauseShader(e){
    e.stopPropagation();
    e.stopImmediatePropagation();
    e.cancelBubble = true;
    // console.log(e);

    state.pauseR = !state.pauseR;
}

function zoomMinus(e){
    e.stopPropagation();
    e.stopImmediatePropagation();
    e.cancelBubble = true;

    let oldVal = screenMesh.material.uniforms.scale.value;
    screenMesh.material.uniforms.scale.value = oldVal + 0.25;
    screenMesh.material.uniforms.needsUpdate = true;
}

function zoomPlus(e){
    e.stopPropagation();
    e.stopImmediatePropagation();
    e.cancelBubble = true;

    let oldVal = screenMesh.material.uniforms.scale.value;
    screenMesh.material.uniforms.scale.value = oldVal - 0.25;
    screenMesh.material.uniforms.needsUpdate = true;
}

function snapGridClick(){
  ui.snapGrid = !ui.snapGrid;
}

function snapWorldClick(){
  ui.snapGlobal = !ui.snapGlobal;
}

function snapPrevClick(){
  ui.snapPrev = !ui.snapPrev;
}

function lineWeightClick(event){
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
}

function bezierClick(event){
  console.log("bezierClick");
  console.log(event);
  console.log(this);
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
