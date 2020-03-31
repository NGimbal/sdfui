//reducers
"use strict";

//current naive thinking
//ui - state related to a user's view of the world
//document - state related to a shared scene
import * as THREE from './libjs/three.module.js';

import * as PRIM from './primitives.js';
import * as ACT from './actions.js';

//would rather not have this but I have a feeling werner wouldn't
//want me to put it in the state
//although why not? state can always be updated
//let's keep it out for now
import { ptTree } from './sdfui.js';

console.log(Automerge);

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
  //curr edit Item
  //this is just going to be an index in editItems
  //or should it be an id?
  editItem:0,
  //all points in doc
  pts:[],
  //points in doc to be removed
  rmPts:[],
  //all items in doc
  editItems:[new PRIM.prim("polyline", [], {...PRIM.propsDefault})],
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
        resolution: new PRIM.vec(action.vec2.x, action.vec2.y)
      });
    case ACT.STATUS_UPDATE:
      return Object.assign({}, state,{
        shaderUpdate: action.toggle,
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
    case ACT.DRAW_FILL:
      return Object.assign({}, state,{
        properties: Object.assign({}, state.properties,{
          fill: action.hexString,
        }),
      });
    case ACT.DRAW_STROKE:
      return Object.assign({}, state,{
        properties: Object.assign({}, state.properties,{
          stroke: action.hexString,
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

      if(state.snapPt){
        let ptNear = ptTree.nearest(pt, 1);
        if (ptNear.length > 0 && ptNear[0][1] < 0.001){
          pt = ptNear[0][0];
          return Object.assign({}, state,{
            pos: pt
          });
        }
      } if(state.snapGrid) {
        pt.x = Math.round(((pt.x) * (1 + state.grid.x)) / state.grid.y) * state.grid.x - state.grid.z;
        pt.y = Math.round(((pt.y) * (1 + state.grid.y)) / state.grid.y) * state.grid.y + state.grid.w;

        return Object.assign({}, state,{
          pos: pt
        });
      } if(state.snapGlobal && pts.length > 0) {
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
      } if(state.snapRef && pts.length > 1) {
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
      let pt = new PRIM.vec(action.pt.x, action.pt.y, action.pt.z, action.pt.w, action.pt.id, true);
      return Object.assign({}, state,{
          ...state,
          //add point to current edit item
          editItems: state.editItems.map((item, index) => {
            if(index !== state.editItem){
              return item;
            }
            return {
              ...item,
              pts: [...item.pts, pt.id],
            }
          }),
          //add point to pts array
          pts:[...state.pts, pt]
      });
    case ACT.SCENE_RMVPT:
      // let pt = action.pt;
      ptIndex = state.pts.findIndex(i => i.id === action.pt.id);
      return Object.assign({}, state,{
        ...state,
        //remove point from current edit item
        editItems: state.editItems.map((item, index) => {
          if(index !== state.editItem){
            return item;
          }
          return {
            ...item,
            pts: [
              ...item.pts.slice(0, ptIndex),
              ...item.pts.slice(ptIndex + 1)
            ],
          }
        }),
        //remove point from pts array
        pts: [
          ...state.pts.slice(0, ptIndex),
          ...state.pts.slice(ptIndex + 1)
        ],
        //add point to pts array, need to stage for removal from
        //kdTree and texture
        rmPts: [...state.rmPts, {...state.pts[ptIndex]}]
      });
    case ACT.SCENE_FINRMVPT:
      //remove point from rmPts array
      ptIndex = state.rmPts.findIndex(i => i.id === action.pt.id);
      return Object.assign({}, state,{
        ...state,
        rmPts: [
          ...state.rmPts.slice(0, ptIndex),
          ...state.rmPts.slice(ptIndex + 1)
        ]
      });
    case ACT.SCENE_EDITUPDATE:
      return Object.assign({}, state,{
        ...state,
        editItems: state.editItems.map((item, index) => {
          if(index !== state.editItem){
            return item;
          }
          return {
            ...item,
            needsUpdate: true,
          }
        })
      });
    case ACT.SCENE_PUSHEDITITEM:
      if(state.editItems[state.editItem].pts.length > 0){
        return Object.assign({}, state,{
          ...state,
          editItem: state.editItem = state.editItem + 1,
          editItems: [...state.editItems, new PRIM.prim(action.prim, [], {..._state.ui.properties})],
        });
      } else {
        return Object.assign({}, state,{
          ...state,
          // editItems: [...state.editItems, new prim(action.prim, [], {..._state.ui.properties})],
          editItems: [
            ...state.editItems.slice(0, state.editItem),
            new PRIM.prim(action.prim, [], {..._state.ui.properties}),
            ...state.editItems.slice(state.editItem + 1)
          ]
        });
      }
    case ACT.SCENE_EDITPROPS:
      return Object.assign({}, state,{
        ...state,
        editItems: state.editItems.map((item, index) => {
          if(index !== state.editItem){
            return item;
          }
          return {
            ...item,
            properties: {..._state.ui.properties},
          }
        })
      });
    case ACT.SCENE_ITEMUPDATE:
      return Object.assign({}, state,{
        ...state,
        editItems: state.editItems.map((item, index) => {
          if(index !== action.index){
            return item;
          }
          return {
            ...item,
            needsUpdate: action.toggle,
          }
        })
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
