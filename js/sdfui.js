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

  ui = new GhostUI(canvas, sdfLines);
  let fluentDoc = ui.fluentStack.curr();

  resizeRendererToDisplaySize(renderer);

  uniforms = {
    iTime: { value: 0 },
    iResolution:  { value: new THREE.Vector3(canvas.width, canvas.height, 1) },
    //initialized to 0 - how does this get set?
    //in a lot of ways this uniforms should be a member of fluentDoc
    pointPrim: {value: new THREE.Vector4(0.0,0.0,0.0,0.0) },
    posTex: { value: fluentDoc.currEditItem.ptsTex},
    posTexRes: {value: new THREE.Vector2(16.0, 16.0)},

    parameters: {value: fluentDoc.parameters.ptsTex},
    mousePt: {value: fluentDoc.mPt},
    editWeight : {value: fluentDoc.editWeight},
    editOpacity : {value: fluentDoc.editOpacity},
    scale: {value: fluentDoc.scale},
    hiDPR: {value: window.devicePixelRatio}
  };

  scene = new THREE.Scene();
  plane = new THREE.PlaneBufferGeometry(2, 2);

  let fragmentShader = fluentDoc.shader;
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

    ui.fluentStack.curr().shaderUpdate = true;
  }

  return needResize;
}

function render() {

  resizeRendererToDisplaySize(renderer);

  //global update to run functions that have been cued by a button press
  //takes care of functions that need to run before mousemv
  ui.update();

  const canvas = renderer.domElement;
  let fluentDoc = ui.fluentStack.curr();

  //update uniforms
  if(fluentDoc.currEditItem.ptsTex){
    screenMesh.material.uniforms.posTex.value = fluentDoc.currEditItem.ptsTex;
  }
  if(fluentDoc.currEditItem.pointPrim){
    screenMesh.material.uniforms.pointPrim.value = fluentDoc.currEditItem.pointPrim;
  }

  screenMesh.material.uniforms.parameters.value = fluentDoc.parameters.ptsTex;
  screenMesh.material.uniforms.mousePt.value = fluentDoc.mPt;
  screenMesh.material.uniforms.editWeight.value = fluentDoc.editWeight;
  screenMesh.material.uniforms.editOpacity.value = fluentDoc.editOpacity;

  screenMesh.material.uniforms.needsUpdate = true;

  if (fluentDoc.shaderUpdate){
    console.log("shader update!")
    uniforms.iResolution.value.set(canvas.width, canvas.height, 1);
    uniforms.parameters.value = fluentDoc.parameters.ptsTex;

    //annoying that this is set in so many places
    //in the future refactor resolution so it always just reads element size
    fluentDoc.resolution = new THREE.Vector2(canvas.width, canvas.height);
    fluentDoc.currEditItem.resolution = fluentDoc.resolution;
    fluentDoc.parameters.resolution = fluentDoc.resolution;

    let vertexShader = sdfPrimVert;
    let fragmentShader = fluentDoc.shader;

    material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader,
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
  state.time = time * 0.001; //convert to seconds
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
