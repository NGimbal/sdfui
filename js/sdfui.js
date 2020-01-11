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

  //gotta do this otherwise GhostUI doesn't get the proper dimensions
  resizeRendererToDisplaySize(renderer);

  ui = new GhostUI(canvas, sdfLines);

// linearSlider
  uniforms = {
    iTime: { value: 0 },
    iResolution:  { value: new THREE.Vector3(canvas.width, canvas.height, 1) },
    iFrame: { value: 0 },
    posTex: { value: ui.fluentDoc.currEditItem.ptsTex},
    posTexRes: {value: new THREE.Vector2(16.0, 16.0)},
    mousePt: {value: ui.fluentDoc.mPt},
    editWeight : {value: ui.fluentDoc.editWeight},
    editOpacity : {value: ui.fluentDoc.editOpacity},
    //this should be coming from GhostUI
    scale: {value: ui.fluentDoc.scale},
    hiDPR: {value: window.devicePixelRatio}
  };

  scene = new THREE.Scene();
  plane = new THREE.PlaneBufferGeometry(2, 2);

  let fragmentShader = ui.fluentDoc.shader;
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

  if (ui.fluentDoc.shaderUpdate){
    uniforms.iResolution.value.set(canvas.width, canvas.height, 1);

    let vertexShader = sdfPrimVert;
    let fragmentShader = ui.fluentDoc.shader;

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
  screenMesh.material.uniforms.posTex.value = ui.fluentDoc.currEditItem.ptsTex;

  screenMesh.material.uniforms.mousePt.value = ui.fluentDoc.mPt;
  screenMesh.material.uniforms.needsUpdate = true;

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
