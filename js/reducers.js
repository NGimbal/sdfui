//reducers
//current naive thinking
//ui - state related to a user's view of the world
//document - state related to a shared scene
import * as THREE from './libjs/three.module.js';

import * as PRIM from './fluentPrim.js';
import * as ACT from './actions.js';

//would rather not have this but I have a feeling werner wouldn't
//want me to put it in the state
//although why not? state can always be updated
//let's keep it out for now
import { ptTree } from './sdfui.js';

var statusInit = {
  resolution: new THREE.Vector3(0.0),
  shaderUpdate: false,
}

//app level status, resolution, update
function status(state=statusInit, action){
  switch(action.type){
    case ACT.STATUS_RES:
      return Object.assign({}, state,{
        resolution: action.vec3
      });
    case ACT.STATUS_UPDATE:
      return Object.assign({}, state,{
        shaderUpdate: action.update
      });
    default:
      return state;
  }
}

var drawToolInit = {
  drawing: true,
  editElem: new PRIM.PolyLine(),
  filter: null,
  strokeColor: 0x000000,
  fillColor: 0x000000,
  strokeWeight: 0.02,
  radius: 0.02,
}

function drawTool(state=drawToolInit, action){
  switch(action.type){
    default:
      return state;
  }
}

var cursorInit = {
  prevPos: new PRIM.Point(0.0, 0.0),
  pos: new PRIM.Point(0.0, 0.0),
  snapPt: true,
  snapGlobal: false,
  snapGrid: true,
  snapRef: false,
  //grid properties that are important to snapping
  //scaleX, scaleY, offsetX, offsetY
  grid: new THREE.Vector4(0.0),
  scale: 48,
}

//state related to a user's view
function cursor(state=cursorInit, action) {
  switch(action.type) {
    case ACT.CURSOR_SET:
      let pt = {x:action.x, y:action.y};
      if(state.snapPt){
        let ptNear = ptTree.nearest(pt, 1);
        if (ptNear.length > 0 && ptNear[0][1] < 0.001){
          pt = ptNear[0][0];
        }
      } if(state.snapGlobal) {

      } if(state.snapGrid) {
        pt.x = Math.floor((pt.x * (1 + state.grid.x)) / state.grid.y) * state.grid.x + state.grid.z;
        pt.y = Math.floor((pt.y * (1 + state.grid.y)) / state.grid.y) * state.grid.y + state.grid.w;
      } if(state.snapRef) {

      } return Object.assign({}, state,{
        prevPos: state.pos.clone(),
        //do I really need to return a new point everytime?
        //could this be a particular case where you want the
        //mouse position to be independent of a historical state?
        //pos: state.pos.setXY(pt.x, pt.y)
        //will trust documentation for now
        pos: new PRIM.Point(pt.x, pt.y)
      });
    case ACT.CURSOR_SNAPGLOBAL:
      return Object.assign({}, state,{
        snapGlobal: !state.snapGlobal
      });
    case ACT.CURSOR_SNAPREF:
      return Object.assign({}, state,{
        snapRef: !state.snapRef
      });
    case ACT.CURSOR_SNAPGRID:
      return Object.assign({}, state,{
        snapGrid: !state.snapGrid
      });
    case ACT.CURSOR_SNAPPT:
      return Object.assign({}, state,{
        snapPt: !state.snapPt
      });
    case ACT.CURSOR_GRIDSCALE:
      return Object.assign({}, state,{
        scale: action.int
      });
    case ACT.CURSOR_GRID:
      return Object.assign({}, state,{
        grid: action.vec4
      });
    default:
      return state;
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
  status,
  drawTool,
  cursor,
  points
});

export { reducer };
