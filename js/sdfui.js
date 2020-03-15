"use strict";

//import * as THREE from 'https://unpkg.com/three@0.108.0/build/three.module.js';
import * as THREE from './libjs/three.module.js';

import * as PRIM from './fluentPrim.js';
import {GhostUI, Button} from './GhostUI.js';

import {sdfPrimFrag} from './frag.js';
import {sdfPrimVert} from './vert.js';

var material, uniforms;
var fragShader;
var parameters;
var canvas, renderer, camera, ui, scene, plane, screenMesh;

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

  ui = new GhostUI(canvas, sdfPrimFrag);
  let fluentDoc = ui.fluentStack.curr();

  resizeRendererToDisplaySize(renderer);

  uniforms = {
    iTime: { value: 0 },
    iResolution:  { value: new THREE.Vector3(canvas.width, canvas.height, 1) },
    pointPrim: {value: new THREE.Vector4(0.0,0.0,0.0,0.0) },
    posTex: { value: fluentDoc.currEditItem.ptsTex},
    posTexRes: {value: new THREE.Vector2(16.0, 16.0)},
    parameters: {value: fluentDoc.parameters.ptsTex},
    mousePt: {value: fluentDoc.mPt},
    editCTexel : {value: fluentDoc.currEditItem.cTexel},
    editWeight : {value: fluentDoc.editOptions.weight},
    strokeColor: {value: new THREE.Vector3(0.0, 0.0, 0.0)},
    fillColor: {value: new THREE.Vector3(0.0, 0.384, 0.682)},
    editRadius : {value: fluentDoc.editOptions.radius},
    //global scale variables
    scale: {value: fluentDoc.scale},
    hiDPR: {value: window.devicePixelRatio}
  };

  scene = new THREE.Scene();
  plane = new THREE.PlaneBufferGeometry(2, 2);

  fragShader = sdfPrimFrag;
  let vertShader = sdfPrimVert;

  material = new THREE.ShaderMaterial({
    uniforms,
    vertShader,
    fragShader
  });

  parameters = new PRIM.PolyPoint(this.resolution, this.editOptions, 128);

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

    ui.fluentStack.curr().shaderUpdate = true;
  }

  return needResize;
}

function render() {

  resizeRendererToDisplaySize(renderer);

  ui.update();

  const canvas = renderer.domElement;
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

  screenMesh.material.uniforms.mousePt.value = fluentDoc.mPt;
  screenMesh.material.uniforms.editWeight.value = fluentDoc.editOptions.weight;
  screenMesh.material.uniforms.strokeColor.value = fluentDoc.editOptions.stroke;
  screenMesh.material.uniforms.fillColor.value = fluentDoc.editOptions.fill;
  screenMesh.material.uniforms.editRadius.value = fluentDoc.editOptions.radius;

  screenMesh.material.uniforms.needsUpdate = true;

  if (fluentDoc.shaderUpdate){
    console.log("shader update!")
    let vertexShader = sdfPrimVert;
    //it's probably not necessary to recompile shader when resizing
    uniforms.iResolution.value.set(canvas.width, canvas.height, 1);

    //annoying that this is set in so many places
    //in the future refactor resolution so it always just reads element size
    fluentDoc.resolution = new THREE.Vector2(canvas.width, canvas.height);
    fluentDoc.currEditItem.resolution = fluentDoc.resolution;
    fluentDoc.parameters.resolution = fluentDoc.resolution;

    //first this is going to come out of fluentDoc
    uniforms.parameters.value = fluentDoc.parameters.ptsTex;

    //disentangle
    for (let item of fluentDoc.editItems){
      if(item.needsUpdate) fragShader = item.end(fragShader, parameters);
      console.log(fragShader);
    }

    material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader,
      fluentDoc.shader,
    });

    screenMesh.material = material;

    fluentDoc.shaderUpdate = false;
  }

  renderer.render(scene, camera);

  //is this a workaround?
  //could actually do this in screenshotUpdate
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

//Run-----------------------------------------------------------
main();
