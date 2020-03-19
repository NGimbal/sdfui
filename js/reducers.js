//reducers
//current naive thinking
//ui - state related to a user's view of the world
//document - state related to a shared scene
import * as THREE from './libjs/three.module.js';

import * as PRIM from './fluentPrim.js';
import * as ACT from './actions.js';

import { resolution, mPt, ptTree } from './sdfui.js';

var cursorInit = {
  pos: new PRIM.Point(0.0, 0.0),
  snapPt: true,
  snapGlobal: false,
  snapdGrid: false,
  snapRef: false
}

//state related to a user's view
function cursor(state=cursorInit, action) {
  switch(action.type) {
    case ACT.SET_CURSOR:
      let pt = {x:action.x, y:action.y};
      if(state.snapPt){
        let ptNear = ptTree.nearest(pt, 1);
        if (ptNear.length > 0 && ptNear[0][1] < 0.001){
          pt = ptNear[0][0];
        }
      } if(state.snapGlobal) {

      } if(state.snapGrid) {

      } if(state.snapRef) {

      } return Object.assign({}, state,{
        pos: new PRIM.Point(pt.x, pt.y)
      });
    default:
      return state;
    }
}

//initial state of grid object
var gridInit = {
  resolution: new THREE.Vector3(0.0),
  grid: new THREE.Vector3(0.0)
}

function grid(state=gridInit, action){
  switch(action.type) {
    case ACT.SET_RES:
      return Object.assign({}, state,{
        resolution: action.vec3
      });
    case ACT.SET_GRID:
      return Object.assign({}, state,{
        grid: action.vec3
      });
    default:
      return {...state};
    }
}

//state related to the scene
function points(state = [], action) {
  switch(action.type){
    case ACT.ADD_PT:
      return [
        ...state,
        {
          pt: action.pt
        }
      ]
    default:
      return state;
  }
};

//combine those reducers
const reducer = Redux.combineReducers({
  grid,
  cursor,
  points
});

export { reducer };
