//reducers
"use strict";

//current naive thinking
//ui - state related to a user's view of the world
//document - state related to a shared scene

import * as PRIM from './primitives.js';
import * as ACT from './actions.js';

//would rather not have this but I have a feeling werner wouldn't
//want me to put it in the state
//although why not? state can always be updated
//let's keep it out for now

//also need to add a list of layers

//item needs update new idea:
//prim has counter, 
//  every time prim is updated, counter is incremented
//state.status has list of key: vals
//  key is prim.id
//  val is per user increment count
//if (prim.counter != state.status[prim.id]) {
// state.status[prim.id] = prim.counter 
// update(prim);
//}

import { ptTree } from './sdfui.js';

// console.log(Automerge);

const statusInit = {
  resolution: new PRIM.vec(0,0),
  shaderUpdate: false,
  raster: false,
  export: false,
}

const uiInit = {
  drawing: true,
  //properties
  properties: {...PRIM.propsDefault},
  pause: false, //pause shader
  grid: false, //show background grid
  points: false, //show points
  darkmode: false, //toggle darkmode
  drag: false,
}

const cursorInit = {
  pos: new PRIM.vec(0, 0),
  snapPt: false,
  snapGlobal: false,
  snapGlobalAngle: 45,
  snapGrid: false,
  snapRef: false,
  snapRefAngle: 15,
  //grid properties that are important to snapping
  //scaleX, scaleY, offsetX, offsetY
  grid: new PRIM.vec(0,0,0,0),
  scale: 48,
}

const sceneInit = {
  //curr edit Item - an index in editItems
  editItem:0,
  //all points in scene - eventually move to a Automerge.Table?
  pts:[],
  //points in scene to be removed - eventually move to a Automerge.Table?
  rmPts:[],
  //all items in scene
  editItems:[new PRIM.prim("polyline", [], {...PRIM.propsDefault})],
}

const sceneDoc = Automerge.from(sceneInit);

const initialState={
  status: statusInit,
  ui: uiInit,
  cursor: cursorInit,
  //automerge object
  scene: sceneDoc,
}

//app level status, resolution, update
function status(_state=initialState, action){
  let state = _state.status;
  switch(action.subtype){
    case ACT.STATUS_RES:
      return Object.assign({}, state,{
        resolution: new PRIM.vec(action.vec2.x, action.vec2.y)
      });
    case ACT.STATUS_RASTER:
      return Object.assign({}, state,{
        raster: !state.raster,
      });
    case ACT.STATUS_EXPORT:
      return Object.assign({}, state,{
        export: !state.export,
      });
    default:
      return state;
  }
}

function ui(_state=initialState, action){
  let state = _state.ui;
  switch(action.subtype){
    case ACT.UI_PAUSE:
      return Object.assign({}, state,{
        pause: !state.pause
      });
    case ACT.UI_GRID:
      return Object.assign({}, state,{
        grid: !state.grid
      });
    case ACT.UI_POINTS:
      return Object.assign({}, state,{
        points: !state.points
      });
    case ACT.UI_DARKMODE:
      return Object.assign({}, state,{
        darkmode: action.toggle || !state.darkmode
      });
    case ACT.DRAW_WEIGHT:
      return Object.assign({}, state,{
        properties: Object.assign({}, state.properties,{
          weight: action.weight,
        }),
      });
    case ACT.DRAW_RADIUS:
      return Object.assign({}, state,{
        properties: Object.assign({}, state.properties,{
          radius: action.radius,
        }),
      });
    case ACT.DRAW_OPACITY:
      return Object.assign({}, state,{
        properties: Object.assign({}, state.properties,{
          opacity: action.opacity,
        }),
      });
    case ACT.DRAW_FILL:
      return Object.assign({}, state,{
        properties: Object.assign({}, state.properties,{
          fill: action.hex,
        }),
      });
    case ACT.DRAW_STROKE:
      return Object.assign({}, state,{
        properties: Object.assign({}, state.properties,{
          stroke: action.hex.slice(),
        }),
      });
    case ACT.DRAW_FILTER:
      return Object.assign({}, state,{
        properties: Object.assign({}, state.properties,{
          filter: action.filter,
        }),
      });
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
      let pts = _state.scene.pts;
      let editPts = _state.scene.editItems[_state.scene.editItem].pts;

      if(state.snapPt){
        let ptNear = ptTree.nearest(pt, 1);
        if (ptNear.length > 0 && ptNear[0][1] < 0.0001){
          pt = ptNear[0][0];
          return Object.assign({}, state,{
            pos: pt
          });
        }
      } if(state.snapGrid) {
        pt.x = Math.round(pt.x / state.grid.x) * state.grid.x + 0.000000000000000001;
        pt.y = Math.round(pt.y / state.grid.y) * state.grid.y + 0.000000000000000001;
        console.log(pt);
        return Object.assign({}, state,{
          pos: pt
        });
      } if(state.snapGlobal && editPts.length > 0) {
          let prev = {...pts[pts.length - 1]};
          let line = {...prev};

          line.x = line.x - pt.x;
          line.y = line.y - pt.y;
          // let angle = (Math.atan2( - line.y, - line.x ) + Math.PI) * (180 / Math.PI);
          let angle = PRIM.angleVec(line) * (180 / Math.PI);
          let snapA = (Math.round(angle / state.snapGlobalAngle) * state.snapGlobalAngle);
          snapA = (snapA * (Math.PI / 180));

          //length
          let length = PRIM.lengthVec(line);
          pt.x = prev.x - length * Math.cos(snapA);
          pt.y = prev.y - length * Math.sin(snapA);

          return Object.assign({}, state,{
            pos: pt
          });
      } if(state.snapRef && editPts.length > 1) {
        let prev = {...pts[pts.length - 1]};
        let prevPrev = {...pts[pts.length - 2]};
        let line = {...prev};
        let linePrev = {...prevPrev};

        //current line
        line.x = line.x - pt.x;
        line.y = line.y - pt.y;
        let lineN = PRIM.normVec(line);

        //previous line
        linePrev.x = prev.x - linePrev.x;
        linePrev.y = prev.y - linePrev.y;
        let linePrevN = PRIM.normVec(linePrev);

        //angle between two lines
        let dot = PRIM.dotVec(lineN, linePrevN);
        let det = linePrevN.x * lineN.y - linePrevN.y * lineN.x;
        let angle = Math.atan2(det, dot) * (180 / Math.PI);
        //snap angle
        let snapA = Math.round(angle / state.snapRefAngle) * state.snapRefAngle;
        snapA = snapA * (Math.PI / 180) + PRIM.angleVec(linePrev);

        pt.x = prev.x - (PRIM.lengthVec(line) * Math.cos(snapA));
        pt.y = prev.y - (PRIM.lengthVec(line) * Math.sin(snapA));
      } return Object.assign({}, state,{
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
  let ptIndex = -1;
  switch(action.subtype){
    case ACT.SCENE_ADDPT:
      let pt = new PRIM.vec(action.pt.x, action.pt.y, action.pt.z, action.pt.w, state.editItems[state.editItem].id , action.pt.id, true);
      return Automerge.change(state, 'added a point: ' + action.pt.id , doc=>{
          //add point to current edit item
          doc.editItems[doc.editItem].pts.push(pt.id);
          //add point to pts array
          doc.pts.push(pt);
      });
    case ACT.SCENE_RMVPT:
      ptIndex = state.pts.findIndex(i => i.id === action.pt.id);
      let editPtIndex = state.editItems[state.editItem].pts.findIndex(i => i === action.pt.id);
      return Automerge.change(state, 'staged a point for removal: ' + action.pt.id, doc=>{
        //remove point from current edit item
        doc.editItems[doc.editItem].pts.deleteAt(editPtIndex);
        //remove from kdTree and texture
        doc.rmPts.push(doc.pts[ptIndex].id.slice());
        //remove point from pts array
        //this should maybe be a table
        doc.pts.deleteAt(ptIndex);
      });
    case ACT.SCENE_FINRMVPT:
      //remove point from rmPts array
      //this also may be on a per user basis, kd tree needs to be updated by all users
      ptIndex = state.rmPts.findIndex(i => i === action.id);
      return Automerge.change(state, 'finished removing a pt: ' + action.id, doc=>{
        doc.rmPts.deleteAt(ptIndex);
      });
    case ACT.SCENE_EDITUPDATE:
      //this really needs to be true on a per user basis
      //like an item may need to be updated for someone but not for someone else
      return Automerge.change(state, 'updated edit item properties', doc=>{
        doc.editItems[doc.editItem].needsUpdate = true;
      });
    case ACT.SCENE_PUSHEDITITEM: //takes full prim
      return Automerge.change(state, 'push edit item', doc=>{
        doc.editItem = state.editItem + 1;
        doc.editItems.push(new PRIM.prim(action.prim, [], {..._state.ui.properties}));
      });
    case ACT.SCENE_NEWEDITITEM: //takes prim type
      return Automerge.change(state, 'new edit item', doc=>{
        doc.editItems[state.editItem] = new PRIM.prim(action.primType, [], {..._state.ui.properties});
      });
    case ACT.SCENE_RMVITEM:
      return Automerge.change(state, 'remove edit item ' + action.id, doc=>{
        let index = state.editItems.findIndex(i => i.id === action.id);
        doc.editItems.deleteAt(index);
      });
    case ACT.SCENE_EDITPROPS:
      return Automerge.change(state, 'update edit properties', doc=>{
        doc.editItems[doc.editItem].properties = {..._state.ui.properties};
      });
    case ACT.SCENE_ITEMUPDATE:
      return Automerge.change(state, 'edit item update', doc=>{
        doc.editItems[action.index].needsUpdate = action.toggle;
      });
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
