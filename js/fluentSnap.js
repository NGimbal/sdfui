"use strict";
import * as THREE from './libjs/three.module.js';
import * as HINT from './fluentHints.js';

//fluentSnap.js
//Implements all snapping logic

function snapPtClck(e){
  this.toggle = !this.toggle;
  this.button.elem.classList.toggle("snap-active");
}

function snapRefClck(e){
  this.toggle = !this.toggle;
  this.button.elem.classList.toggle("snap-active");
}

function snapGlobalClck(e){
  this.toggle = !this.toggle;
  this.button.elem.classList.toggle("snap-active");
}

function snapGridClck(e){
  this.toggle = !this.toggle;
  this.button.elem.classList.toggle("snap-active");
}

//Returns cloned modified fluentDoc or null
function snapPtMv(e, fluentDoc){
  if (this.toggle == false) return null;
  // let fluentDoc = _fluentDoc.clone();

  let evPt = {
    x: e.clientX,
    y: e.clientY
  };

  let ptNear = fluentDoc.tree.nearest(evPt, 1);

  if (ptNear.length > 0 && ptNear[0][1] < this.options.dist){
    ptNear = ptNear[0][0];
    fluentDoc.mPt.x = ptNear.x / fluentDoc.resolution.x;
    fluentDoc.mPt.y = (fluentDoc.resolution.y - ptNear.y) / fluentDoc.resolution.y;

    return fluentDoc;
  }
  else{
    return null;
  }
}

//Returns cloned modified fluentDoc or null
function snapRefMv(e, fluentDoc){
  if (this.toggle == false) return null;
  // let fluentDoc = _fluentDoc.clone();

  let evPt = {
    x: e.clientX,
    y: e.clientY
  };

  if (fluentDoc.currEditItem.pts.length > 1){
    let ptPrevEnd = fluentDoc.currEditItem.pts[fluentDoc.currEditItem.pts.length - 1];
    let ptPrevBeg = fluentDoc.currEditItem.pts[fluentDoc.currEditItem.pts.length - 2];

    //previous line, syntax?
    let lnPrev = new THREE.Vector2().subVectors(ptPrevEnd, ptPrevBeg);
    let lnCurr = new THREE.Vector2().subVectors(ptPrevEnd, evPt);
    let lnCurrN = new THREE.Vector2().subVectors(ptPrevEnd, evPt);

    let dot = lnPrev.normalize().dot(lnCurrN.normalize());
    let det = lnPrev.x * lnCurrN.y - lnPrev.y * lnCurrN.x

    let angle = Math.atan2(det, dot) * (180 / Math.PI);

    let snapA = (Math.round(angle / this.options.angle) * this.options.angle);

    snapA = (snapA * (Math.PI / 180) + lnPrev.angle());

    let snapX = ptPrevEnd.x - lnCurr.length() * Math.cos(snapA);
    let snapY = ptPrevEnd.y - lnCurr.length() * Math.sin(snapA);

    fluentDoc.mPt.x = snapX / fluentDoc.elem.width;
    fluentDoc.mPt.y = (fluentDoc.elem.height - snapY) / fluentDoc.elem.height;

    return fluentDoc;
  }
  else{
    return null;
  }
}

//Returns cloned modified fluentDoc or null
function snapGlobalMv(e, fluentDoc){
  if (this.toggle == false) return null;
  // let fluentDoc = _fluentDoc.clone();

  let evPt = {
    x: e.clientX,
    y: e.clientY
  };

  if (fluentDoc.currEditItem.pts.length > 0){
    let prevX = 0;
    let prevY = 0;

    if (fluentDoc.currEditItem.pts.length >= 1){
      prevX = fluentDoc.currEditItem.pts[fluentDoc.currEditItem.pts.length - 1].x;
      prevY = fluentDoc.currEditItem.pts[fluentDoc.currEditItem.pts.length - 1].y;
    }

    let prevPt = {
      x: prevX,
      y: prevY
    };

    //previous line
    let lnCurr = new THREE.Vector2().subVectors(prevPt, evPt);

    let angle = lnCurr.angle()* (180 / Math.PI);

    //global angle
    let gAngle = this.options.angle;

    let snapA = (Math.round(angle / gAngle) * gAngle);
    snapA = (snapA * (Math.PI / 180));

    let snapX = prevPt.x - lnCurr.length() * Math.cos(snapA);
    let snapY = prevPt.y - lnCurr.length() * Math.sin(snapA);

    fluentDoc.mPt.x = snapX / fluentDoc.elem.width;
    fluentDoc.mPt.y = (fluentDoc.elem.height - snapY) / fluentDoc.elem.height;

    return fluentDoc;
  }
  else{
    return null;
  }
}

//Returns cloned modified fluentDoc or null
function snapGridMv(e, fluentDoc){
  if (this.toggle == false) return null;
  // let fluentDoc = _fluentDoc.clone();

  let evPt = {
    x: e.clientX,
    y: e.clientY
  };

  //offset and scale deteremined in drawGrid()
  //current position, divided by grid.scaleX, round, times scaleX
  let x = Math.round((evPt.x - 0.5 * fluentDoc.gridScaleX) / fluentDoc.gridScaleX) * fluentDoc.gridScaleX + fluentDoc.gridOffX;
  let y = Math.round((evPt.y - 0.5 * fluentDoc.gridScaleY) / fluentDoc.gridScaleY) * fluentDoc.gridScaleY + fluentDoc.gridOffY;

  fluentDoc.mPt.x = x / fluentDoc.elem.width;
  fluentDoc.mPt.y = (fluentDoc.elem.height - y) / fluentDoc.elem.height;

  return fluentDoc;
}

//Returns cloned modified fluentDoc or null
function snapPtUp(e, _fluentDoc){
  if (this.toggle == false) return null;
  let fluentDoc = _fluentDoc.clone();

  let evPt = {
    x: e.clientX,
    y: e.clientY
  };

  let ptNear = fluentDoc.tree.nearest({x: evPt.x, y: evPt.y}, 1);

  if (ptNear.length > 0 && ptNear[0][1] < 100){
    let pt = ptNear[0][0];
    fluentDoc.addPt.x = pt.x;
    fluentDoc.addPt.y = pt.y;
    fluentDoc.addPt.tag = "plPoint";

    return fluentDoc;
  }
  else{
    return null;
  }
}

//Returns cloned modified fluentDoc or null
function snapRefUp(e, _fluentDoc){
  let fluentDoc = _fluentDoc.clone();
  if (this.toggle == false) return null;

  let addPt = {
    x: 0,
    y: 0,
    tag: ""
  }

  if (fluentDoc.currEditItem.pts.length > 1){
    //would like for there to just be one point representation in js
    fluentDoc.addPt.x = fluentDoc.mPt.x * fluentDoc.resolution.x;
    fluentDoc.addPt.y = fluentDoc.elem.height - (fluentDoc.mPt.y * fluentDoc.resolution.y);
    fluentDoc.addPt.tag = "plPoint";

    return fluentDoc;
  }
  else{
    return null;
  }
}

//Returns cloned modified fluentDoc or null
function snapGlobalUp(e, _fluentDoc){
  if (this.toggle == false) return null;
  let fluentDoc = _fluentDoc.clone();

  let addPt = {
    x: 0,
    y: 0,
    tag: ""
  }

  if (fluentDoc.currEditItem.pts.length > 1){
    //would like for there to just be one point representation in js
    fluentDoc.addPt.x = fluentDoc.mPt.x * fluentDoc.resolution.x;
    fluentDoc.addPt.y = fluentDoc.elem.height - (fluentDoc.mPt.y * fluentDoc.resolution.y);
    fluentDoc.addPt.tag = "plPoint";

    return fluentDoc;
  }
  else{
    return null;
  }
}

//Returns cloned modified fluentDoc or null
function snapGridUp(e, _fluentDoc){
  if (this.toggle == false) return null;
  let fluentDoc = _fluentDoc.clone();

  //would like for there to just be one point representation in js
  fluentDoc.addPt.x = fluentDoc.mPt.x * fluentDoc.resolution.x;
  fluentDoc.addPt.y = fluentDoc.elem.height - (fluentDoc.mPt.y * fluentDoc.resolution.y);
  fluentDoc.addPt.tag = "plPoint";

  return fluentDoc;
}

export {snapPtClck, snapRefClck, snapGlobalClck, snapGridClck, snapPtMv,
        snapRefMv, snapGlobalMv, snapGridMv, snapPtUp, snapRefUp,
        snapGlobalUp, snapGridUp};
