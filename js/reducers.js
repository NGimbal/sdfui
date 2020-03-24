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

class vec{
  constructor(x, y, z, w, id, _new, update, remove, pId){
    this.x = x || 0;
    this.y = y || 0;
    this.z = z || 0;
    this.w = w || 0;
    this.id = id || "";
    this.new = _new || true;
    this.update = update || false;
    this.remove = remove || false;
    //parentId
    this.parentId = pId || "";
  }
}

var propsDefault = {
  type:"",
  filter:"",
  stroke:"",
  fill:"",
  weight:0,
  radius:0
}

class prim{
  constructor(pts, _props, id, pId, merge){
    //scene merge
    this.merge = merge || "";
    this.properties = _props || {...propsDefault};
    this.id = id || "";
    this.pId = pId || "";
    this.merge = merge || "union";
  }
}

const statusInit = {
  resolution: new vec(0,0),
  shaderUpdate: false,
}

const uiInit = {
  drawing: true,
  editElem: new PRIM.PolyLine(),
  filter: null,
  strokeColor: 0x000000,
  fillColor: 0x000000,
  strokeWeight: 0.02,
  radius: 0.02,
}

const cursorInit = {
  prev: new vec(0, 0),
  pos: new vec(0, 0),
  snapPt: true,
  snapGlobal: false,
  snapGlobalAngle: 45,
  snapGrid: false,
  snapRef: false,
  snapRefAngle: 45,
  //grid properties that are important to snapping
  //scaleX, scaleY, offsetX, offsetY
  grid: new vec(0,0,0,0),
  scale: 48,
}

const sceneInit = {
  pts:[],
}

const initialState={
  status: statusInit,
  ui: uiInit,
  cursor: cursorInit,
  scene: sceneInit,
}

//app level status, resolution, update
function status(_state=initialState, action){
  let state = _state.status;
  switch(action.subtype){
    case ACT.STATUS_RES:
      return Object.assign({}, state,{
        resolution: new vec(action.vec2.x, action.vec2.y)
      });
    case ACT.STATUS_UPDATE:
      return Object.assign({}, state,{
        shaderUpdate: action.update
      });
    default:
      return state;
  }
}

function ui(_state=initialState, action){
  let state = _state.ui;
  switch(action.subtype){
    default:
      return state;
  }
}

//state related to a user's view
function cursor(_state=initialState, action) {
  let state = _state.cursor;
  switch(action.subtype) {
    case ACT.CURSOR_SET:
      let pt = {x:action.vec2.x, y:action.vec2.y};
      if(snapPt){
        let ptNear = ptTree.nearest(pt, 1);
        if (ptNear.length > 0 && ptNear[0][1] < 0.001){
          pt = ptNear[0][0];
          return Object.assign({}, state,{
            prev: {...state.pos},
            pos: pt
          });
        }
      } if(state.snapGrid) {
        pt.x = Math.round(((pt.x) * (1 + state.grid.x)) / state.grid.y) * state.grid.x - state.grid.z;
        pt.y = Math.round(((pt.y) * (1 + state.grid.y)) / state.grid.y) * state.grid.y + state.grid.w;

        return Object.assign({}, state,{
          prev: {...state.pos},
          pos: pt
        });
      } if(state.snapGlobal) {
        if (!(state.prev.x==0 && state.prev.y==0)){
          //previous line
          let line = {...state.prev};
          // let lnCurr = new THREE.Vector2().subVectors(prevPt, evPt);
          line.x = line.x - pt.x;
          line.y = line.y - pt.y;
          console.log(line);

          // let angle = lnCurr.angle()* (180 / Math.PI);
          let angle = (Math.atan2( - line.y, - line.x ) + Math.PI) * (180 / Math.PI);
          console.log((Math.atan2( - line.y, - line.x ) + Math.PI) * (180 / Math.PI));

          // snap to global angle
          let snapA = (Math.round(angle / state.snapGlobalAngle) * state.snapGlobalAngle);
          snapA = (snapA * (Math.PI / 180));

          //length
          let length = (Math.sqrt( line.x * line.x + line.y * line.y ));
          pt.x = state.prev.x - length * Math.cos(snapA);
          pt.y = state.prev.y - length * Math.sin(snapA);

          // pt.x = snapX / resolution.x;
          // pt.y = (resolution.y - snapY) / resolution.y;

          return Object.assign({}, state,{
            prev: {...state.pos},
            pos: pt
          });
        }
      } if(state.snapRef) {


      } return Object.assign({}, state,{
        prev: {...state.pos},
        pos: pt
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
function scene(_state=initialState, action) {
  let state = _state.scene;
  switch(action.subtype){
    case ACT.ADD_PT:
      return Object.assign({}, state,{
        pts: [
          ...state.pts,
          {
            pt: action.pt
          }
        ]
      });
      // return [
      //   ...state,
      //   {
      //     pt: action.pt
      //   }
      // ]
    default:
      return state;
  }
};

export const reducer = function(state = initialState, action){
  if (!state) {
    console.error('Reducer got null state. Should be initialized');
    return initialState;
  }
  // console.log(initialState);
  switch (action.type) {
    case ACT.status:
      return Object.assign({}, state,{
        status: status(state, action),
      });
    case ACT.scene:
      return Object.assign({}, state,{
        scene: scene(state, action),
      });
    case ACT.cursor:
      return Object.assign({}, state,{
        cursor: cursor(state, action),
      });
    case ACT.ui:
      return Object.assign({}, state,{
        ui: ui(state, action),
      });
    default:
      // Redux sends a weird/opaque init method with action which does not conform to ReducerAction and falls through here.
      return state;
  }
}
