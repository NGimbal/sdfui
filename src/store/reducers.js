//reducers
"use strict";

import * as PRIM from '../renderer/primitives.js';
import * as ACT from './actions.js';
import * as twgl from 'twgl.js';

import { ptTree } from '../renderer/draw.js';
import { scale } from 'chroma-js';

var knn = require('rbush-knn');

// import * as Automerge from 'automerge';

const statusInit = {
  resolution: new PRIM.vec(0,0),
  shaderUpdate: false,
  raster: false,
  export: false,
}

const uiInit = {
  pause: false, //pause shader
  grid: false, //show background grid
  dragging: false,
  dragStart: false,
  dragOrigin: twgl.v3.create(),
  //are we moving towards a target
  targeting: false,
  //where is the view moving
  // targets:[] someday could have multiple tagets for prezi like effect
  target: twgl.v3.create(0,0,64),
  // properties: {...PRIM.propsDefault},
  mode: "draw"
}

const cursorInit = {
  pos: new PRIM.vec(0, 0),
  snapPt: false,
  snapGlobal: false,
  snapGlobalAngle: 45,
  snapGrid: false,
  snapRef: false,
  snapRefAngle: 15,
  grid: new PRIM.vec(0,0,0,0),
  scale: 48,
}

// const layersInit = {
//   layers: [],
// }

// will need some kind of update counter
// to know when a collaborator should update a prim
// const updateCounterInit = {
//   updateList = [{
//     id: ,
//     counter: 0,
//   },]
// }
// if (primUpdate[prim.id].counter != prim.updateCount){
//  layer.update();
// }

let firstPrim = new PRIM.prim("polyline", [], {...PRIM.propsDefault});

const sceneInit = {
  editItem:firstPrim.id.slice(),//id of item points are being added to
  // pts:[], //all points in scene
  rmPts:[],   //points staged to be removed
  editItems:[firstPrim], //all items in scene
  hover:{},
  selected:[firstPrim.id.slice()], //all items who's properties can be edited by ui
}

// const sceneDoc = Automerge.from(sceneInit);

const initialState={
  status: statusInit,
  ui: uiInit,
  cursor: cursorInit,
  // render: layersInit,
  //automerge object
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
    // case ACT.UI_PAUSE:
    //   return Object.assign({}, state,{
    //     pause: !state.pause
    //   });
    // case ACT.UI_GRID:
    //   return Object.assign({}, state,{
    //     grid: !state.grid
    //   });
    case ACT.UI_TARGETHOME:
      return Object.assign({}, state,{
        targeting : action.toggle,
      });
    case ACT.UI_MODE:
      return Object.assign({}, state,{
        mode: action.mode
      });
    case ACT.UI_DRAGGING:
      return Object.assign({}, state,{
        dragging: action.toggle
      });
    case ACT.UI_DRAGSTART:
      return Object.assign({}, state,{
        dragStart: action.toggle,
        dragOrigin: twgl.v3.create(action.pt.x, action.pt.y, 1.0),
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
      // let pts = _state.scene.pts;
      // let editPts = _state.scene.editItems[_state.scene.editItem].pts;
      let editPts = _state.scene.editItems.find(item => item.id === _state.scene.editItem).pts;

      if(state.snapPt){
        let ptNear = knn(ptTree, pt.x, pt.y, 1,null,0.01);

        if (ptNear.length > 0){
          pt = ptNear[0];

          return Object.assign({}, state,{
            pos: pt
          });
        }
      } if(state.snapGrid) {
        pt.x = Math.round(pt.x / state.grid.x) * state.grid.x + 0.000000000000000001;
        pt.y = Math.round(pt.y / state.grid.y) * state.grid.y + 0.000000000000000001;
        return Object.assign({}, state,{
          pos: pt
        });
      } if(state.snapGlobal && editPts.length > 0) {
          let prev = {...editPts[editPts.length - 1]};
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
        let prev = {...editPts[editPts.length - 1]};
        let prevPrev = {...editPts[editPts.length - 2]};
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
        grid: {
          x:2.0/action.scale, 
          y:2.0/action.scale,
          z:action.scale,
          w:(2.0/action.scale) * 0.1
        }
      });
    default:
      return state;
    }
}

function render(_state=initialState, action) {
  let state = _state.render;
  switch(action.subtype){
    case ACT.LAYER_PUSH:
      return {
        ...state,
        layers: [...state.layers, action.layer]
      }
    case ACT.LAYER_PUSHIMAGE:
      let layers =  [...state.layers]
      layers.splice(1, 0, action.layer)
      return {
        ...state,
        layers: layers
      }
    case ACT.LAYER_POP:
      return Object.assign({}, state, {
        layers: state.layers.filter((l) => l.id !== action.layerID)
      });
    case ACT.LAYER_UPDATE:
      return;
    default:
      return state;
  }
}

//state related to the scene
function scene(_state=initialState, action) {
  console.log(action);
  let state = _state.scene;
  switch(action.subtype){
    case ACT.SCENE_SETEDITITEM:
      return Object.assign({}, state,{
        editItem: action.editItem
      });
    case ACT.SCENE_ADDPT:
      // let pt = new PRIM.vec(action.pt.x, action.pt.y, action.pt.z, action.pt.w, state.editItems[state.editItem].id , action.pt.id, true);
      let pt = new PRIM.vec(action.pt.x, action.pt.y, action.pt.z, action.pt.w, state.editItem, action.pt.id, true);
      return Object.assign({}, state,{
        editItems: state.editItems.map(item => {
          if(item.id !== state.editItem) return item;
          return Object.assign({}, item, {
            pts: [...item.pts, pt]
          })
        }),
        // pts:[...state.pts, pt]
      });
    case ACT.SCENE_RMVPT:
      let parent = state.editItems.find(i => i.id === action.pt.parent);
      // let editPtIndex = parent.pts.findIndex(pt => pt.id === action.pt.id);
      return Object.assign({}, state,{
        editItems: state.editItems.map(item => {
          // if(index !== state.editItem) return item;
          if(item.id !== parent.id) return item;
          return Object.assign({}, item, {
            pts: parent.pts.filter(pt => pt.id !== action.pt.id)
          })
        }),
        // pts: state.pts.filter(i => i !== action.pt.id),
        rmPts: [...state.rmPts, action.pt.id.slice()]
      });
    case ACT.SCENE_FINRMVPT:
      //remove point from rmPts array this may be on a per user basis
      return Object.assign({}, state,{
        rmPts: state.rmPts.filter(id => id !== action.id)
      });
    case ACT.SCENE_PUSHEDITITEM: //takes prim type, appends to edit items and sel array
      // console.log(action);
      return Object.assign({}, state,{
        editItems: [...state.editItems, action.prim],
        selected: [...state.selected, action.prim.id.slice()],
        editItem: typeof action.edit === "string" ? action.edit.slice() : action.prim.id.slice(),
      });
    case ACT.SCENE_RMVITEM:
      // let index = state.editItems.findIndex(i => i.id === action.id);
      return Object.assign({}, state,{
        editItems: state.editItems.filter(i => i.id !== action.id),
        // pts: state.pts.filter(pt => pt.parent !== action.id),
        rmPts: [...state.rmPts, 
          state.editItems.find(i => i.id === action.id).pts.map(pt => pt.id)],
        selected: state.selected.filter(i => i !== action.id)
      });
    case ACT.EDIT_WEIGHT:
      return Object.assign({}, state,{
        editItems: state.editItems.map((item) => {
          if(item.id !== action.id) return item;
          return Object.assign({}, item, {
            properties: {...item.properties, weight:action.weight}
          })
        }),
      });
    case ACT.EDIT_RADIUS:
      return Object.assign({}, state,{
        editItems: state.editItems.map((item) => {
          if(item.id !== action.id) return item;
          return Object.assign({}, item, {
            properties: {...item.properties, radius: action.radius}
          })
        }),
      });
    case ACT.EDIT_OPACITY:
      return Object.assign({}, state,{
        editItems: state.editItems.map((item) => {
          if(item.id !== action.id) return item;
          return Object.assign({}, item, {
            properties: {...item.properties, opacity: action.opacity}
          })
        }),
      });
    case ACT.EDIT_FILL:
      return Object.assign({}, state,{
        editItems: state.editItems.map((item) => {
          if(item.id !== action.id) return item;
          return Object.assign({}, item, {
            properties: {...item.properties, fill: action.hex}
          })
        }),
      });
    case ACT.EDIT_STROKE:
      return Object.assign({}, state,{
        editItems: state.editItems.map((item) => {
          if(item.id !== action.id) return item;
          return Object.assign({}, item, {
            properties: {...item.properties, stroke: action.hex.slice()}
          })
        }),
      });
    case ACT.EDIT_SETSEL:
      //action.id action.state
      return Object.assign({}, state,{
        editItems: state.editItems.map((item) => {
          if(item.id !== action.id) return item;
          return Object.assign({}, item, {
            properties: {...item.properties, sel: action.state}
          })
        }),
      });
    case ACT.EDIT_FILTER:
      return Object.assign({}, state,{
        editItems: state.editItems.map((item) => {
          if(item.id !== action.id) return item;
          return Object.assign({}, item, {
            properties: {...item.properties, filter: action.filter}
          })
        }),
      });
    case ACT.EDIT_HOVERSET:
      return Object.assign({}, state,{
        hover: action.id
      });
    case ACT.EDIT_HOVERCLR:
      return Object.assign({}, state,{
        hover: ""
      });
    // Selection array
    case ACT.EDIT_SELECTAPND:
      return Object.assign({}, state,{
        selected: [...state.selected, action.sel]
      });
    // Selection array
    case ACT.EDIT_SELECTRMV:
      return Object.assign({}, state,{
        selected: state.selected.filter(item => item !== action.sel)
      });
    // Selection array
    case ACT.EDIT_SELECTCLR:
      return Object.assign({}, state,{
        selected: []
      });
    case ACT.EDIT_TRANSLATE:
      return Object.assign({}, state,{
        editItems: state.editItems.map((item) => {
          if(item.id !== action.id) return item;
          let translate = twgl.v3.subtract(action.v3, item.translate);
          return Object.assign({}, item, {
            translate: twgl.v3.add(item.translate, translate),
            bbox: Object.assign({}, item.bbox, {
              maxX : item.bbox.maxX + translate[0],
              minX : item.bbox.minX + translate[0],
              
              maxY : item.bbox.maxY + translate[1],
              minY : item.bbox.minY + translate[1],

              min : new PRIM.vec(item.bbox.minX + translate[0], 
                                 item.bbox.minY + translate[1]),
              max : new PRIM.vec(item.bbox.maxX + translate[0],
                                 item.bbox.maxY + translate[1])
            })
          })
        }),
      });
    case ACT.EDIT_BBOX:
      return Object.assign({}, state,{
        editItems: state.editItems.map((item) => {
          if(item.id !== action.id) return item;
          return Object.assign({}, item, {
            bbox: {...action.bbox} //should the new bbox be made here?
          })
        }),
      });
    default:
      return state;
  }
};

export const reducer = function(state = initialState, action){
  // console.log(action);
  if (!state) {
    console.error('Reducer got null state. Should be initialized');
    return initialState;
  }

  switch (action.type) {
    case ACT.status:
      return Object.assign({}, state,{
        status: status(state, action),
      });
    case ACT.cursor:
      return Object.assign({}, state,{
        cursor: cursor(state, action),
      });
    case ACT.ui:
      return Object.assign({}, state,{
        ui: ui(state, action),
      });
    case ACT.render:
      return Object.assign({}, state,{
        render: render(state, action),
      });
    case ACT.scene:
      return Object.assign({}, state,{
        scene: scene(state, action),
      });
    default:
      // Redux sends a weird/opaque init method with action which does not conform to ReducerAction and falls through here.
      return state;
  }
}

//Immutable pattern helpers
// insert action.arry at action.index
function insertItem(array, action) {
  let newArray = array.slice()
  newArray.splice(action.index, 0, action.item)
  return newArray
}

function appendItem(array, item) {
  let newArray = array.slice()
  newArray.splice(array.length, 0, item)
  return newArray
}

// function appendItem(array, item) {
//   return [...array, item];
// }

// remove array[action.index]
function removeItem(array, index) {
  return array.filter((item, i) => i !== index)
}

// set array[action.index] equal to action.item
function updateItem(array, action) {
  // want to also be able to update by key
  // let actIndex = action.index || array.findIndex((, i, arr) => action.key
  return array.map((item, index) => {
    if (index !== action.index) {
      // This isn't the item we care about - keep it as-is
      return item
    }

    // Otherwise, this is the one we want - return an updated value
    return {
      ...item,
      ...action.item
    }
  })
}