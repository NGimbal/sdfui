//actions.js
"use strict";

//actions named with reducer_property
//action functions named with reducerProperty()
//goal is clarity for future debugging easy

//ACTION TYPE CONSTANTS

//main types
export const status = 'status';
export const scene = 'scene';
export const cursor = 'cursor';
export const ui = 'ui';
export const render = 'render';

//sub types
//STATUS
export const STATUS_RES         = 'STATUS_RES'; //resolution
export const STATUS_EXPORT      = 'STATUS_EXPORT'; //resolution
export const STATUS_RASTER      = 'STATUS_RASTER'; //resolution

//UI 
export const UI_TARGETHOME       = 'UI_TARGETHOME'; //return to origin rendering
export const UI_MODE             = 'UI_MODE'; //toggle show points
export const UI_DRAGGING         = 'UI_DRAGGING'; //dragging state
export const UI_DRAGSTART        = 'UI_DRAGSTART'; //start drag state
//CURSOR 
export const CURSOR_SET          = 'CURSOR_SET';  //curr cursor position
export const CURSOR_SNAPGRID     = 'CURSOR_SNAPGRID'; //snap to grid
export const CURSOR_SNAPPT       = 'CURSOR_SNAPPT';  //snap to points
export const CURSOR_SNAPGLOBAL   = 'CURSOR_SNAPGLOBAL'; //snap global angle
export const CURSOR_SNAPREF      = 'CURSOR_SNAPREF'; // snap reference angle
export const CURSOR_GRIDSCALE    = 'CURSOR_GRIDSCALE'; //gridscale, int
export const CURSOR_GRID         = 'CURSOR_GRID'; //grid, vec
//DRAW 
export const DRAW_DRAWING        = "DRAW_DRAWING"; //are we drawing?
export const DRAW_EDITITEM       = "DRAW_EDITITEM"; //curr edit item
export const EDIT_FILTER         = "DRAW_FILTER"; //curr filter
// 
export const EDIT_STROKE         = "EDIT_STROKE"; //stroke color
export const EDIT_FILL           = "EDIT_FILL"; //fill color
export const EDIT_WEIGHT         = "EDIT_WEIGHT"; //stroke weight
export const EDIT_RADIUS         = "EDIT_RADIUS"; //shape radius
export const EDIT_OPACITY        = "EDIT_OPACITY"; //shape radius
export const EDIT_SETSEL         = "EDIT_SETSEL"; //set selection state
//LAYERS 
export const LAYER_PUSH          = "LAYER_PUSH"; //push a new layer
export const LAYER_PUSHIMAGE     = "LAYER_PUSHIMAGE"; //push a new layer
export const LAYER_POP           = "LAYER_POP"; //pop a layer, should be addressed by id
export const LAYER_UPDATE        = "LAYER_UPDATE"; //update a layer, should be addressed by id
 
//SCENE 
export const SCENE_SETEDITITEM   = 'SCENE_SETEDITITEM' //sets edit item
export const SCENE_ADDPT         = 'SCENE_ADDPT'; //add point to scene
export const SCENE_RMVPT         = 'SCENE_RMVPT'; //stages pt for removal
export const SCENE_FINRMVPT      = 'SCENE_FINRMVPT'; //finishes removing pt from state
export const SCENE_PUSHEDITITEM  = 'SCENE_PUSHEDITITEM';
export const SCENE_RMVITEM       = 'SCENE_RMVITEM'; //remove item w/ id - must also remove points

export const EDIT_HOVERSET       = 'EDIT_HOVERSET'; // set current hover item
export const EDIT_HOVERCLR       = 'EDIT_HOVERCLR'; // set current hover item
export const EDIT_SELECTINS      = 'EDIT_SELECTINS'; //add selected item
export const EDIT_SELECTRMV      = 'EDIT_SELECTRMV'; //Remove selected item
export const EDIT_SELECTCLR      = 'EDIT_SELECTCLR'; //clears selection

export const EDIT_TRANSLATE      = 'EDIT_TRANSLATE'; //translates edit object
export const EDIT_BBOX           = 'EDIT_BBOX'; //sets the bbox of a prim
//ACTION CREATORS

//establishes grid offset
export function statusRes(vec2){
  return{
    type: status,
    subtype: STATUS_RES,
    vec2
  }
}

//print shader (for now)
export function statusExport(toggle){
  return{
    type: status,
    subtype: STATUS_EXPORT,
    toggle
  }
}

//download raster image
export function statusRaster(toggle){
  return{
    type: status,
    subtype: STATUS_RASTER,
    toggle
  }
}

//toggle pause shader rendering
export function uiPause(toggle){
  return{
    type: ui,
    subtype: UI_PAUSE,
    toggle,
  }
}

//toggle show grid
// export function uiGrid(toggle){
//   return{
//     type: ui,
//     subtype: UI_GRID,
//     toggle,
//   }
// }

//
export function uiTargetHome(toggle){
  return{
    type: ui,
    subtype: UI_TARGETHOME,
    toggle,
  }
}

export function uiDragStart(toggle, pt){
  return{
    type: ui,
    subtype: UI_DRAGSTART,
    toggle,
    pt,
  }
}

export function uiDragging(toggle){
  return{
    type: ui,
    subtype: UI_DRAGGING,
    toggle,
  }
}

//
export function uiMode(mode){
  return{
    type: ui,
    subtype: UI_MODE,
    mode: mode,
  }
}


//records cursor position
export function cursorSet(vec2){
  return {
    type: cursor,
    subtype: CURSOR_SET,
    vec2
  };
}


//establishes grid offset
export function cursorGrid(scale){
  return{
    type: cursor,
    subtype: CURSOR_GRID,
    scale
  }
}

//toggles snap to grid
export function cursorSnapGrid(){
  return{
    type: cursor,
    subtype: CURSOR_SNAPGRID,
  }
}

//toggles snap to grid
export function cursorSnapPt(){
  return{
    type: cursor,
    subtype: CURSOR_SNAPPT,
  }
}

//toggles snap to grid
export function cursorSnapGlobal(){
  return{
    type: cursor,
    subtype: CURSOR_SNAPGLOBAL,
  }
}

//toggles snap to grid
export function cursorSnapRef(){
  return{
    type: cursor,
    subtype: CURSOR_SNAPREF,
  }
}

//sets grid scale
export function cursorGridScale(int){
  return{
    type: cursor,
    subtype: CURSOR_GRIDSCALE,
    int,
  }
}

//are we drawing? - bool
export function drawDrawing(toggle){
  return{
    type: ui,
    subtype: DRAW_DRAWING,
    toggle,
  }
}

//what is the current edit item - string
export function drawEditItem(primType){
  return{
    type: ui,
    subtype: DRAW_EDITITEM,
    primType,
  }
}

//what is the current filter - string
export function editFilter(filter, id){
  return{
    type: scene,
    subtype: EDIT_FILTER,
    filter,
    id,
  }
}

//what is the current stroke color - vec(r, g, b, a)
export function editStroke(hex, id){
  return{
    type: scene,
    subtype: EDIT_STROKE,
    hex,
    id,
  }
}

//current fill color
export function editFill(hex, id){
  return{
    type: scene,
    subtype: EDIT_FILL,
    hex,
    id
  }
}

//what is the current stroke weight int
export function editWeight(weight, id){
  return{
    type: scene,
    subtype: EDIT_WEIGHT,
    weight,
    id,
  }
}

//what is the current shape radius int
export function editRadius(radius, id){
  return{
    type: scene,
    subtype: EDIT_RADIUS,
    radius,
    id,
  }
}


//what is the current shape radius float
export function editOpacity(opacity, id){
  return{
    type: scene,
    subtype: EDIT_OPACITY,
    opacity,
    id,
  }
}

// can only hover over a single item
export function editHoverSet(id){
  return{
    type: scene,
    subtype: EDIT_HOVERSET,
    id,
  }
}

// can only hover over a single item
export function editHoverClr(){
  return{
    type: scene,
    subtype: EDIT_HOVERCLR,
  }
}
// array of selected items
// might want to have different types of selection?
export function editSelectIns(sel){
  return{
    type: scene,
    subtype: EDIT_SELECTINS,
    sel,
  }
}

// array of selected items
// might want to have different types of selection?
export function editSelectRmv(sel){
  return{
    type: scene,
    subtype: EDIT_SELECTRMV,
    sel,
  }
}

export function editSelectClr(){
  return{
    type: scene,
    subtype: EDIT_SELECTCLR,
  }
}

export function editBbox(id, bbox){
  return{
    type: scene,
    subtype: EDIT_BBOX,
    id,
    bbox
  }
}

export function editTranslate(id, v3){
  return{
    type: scene,
    subtype: EDIT_TRANSLATE,
    id,
    v3,
  }
}


//pushes a new layer onto the draw stack
// export function layerPush(layer){
//   return{
//     type: render,
//     subtype: LAYER_PUSH,
//     layer
//   }
// }

//pushes a new Image onto the draw stack
// export function layerPushImage(layer){
//   return{
//     type: render,
//     subtype: LAYER_PUSHIMAGE,
//     layer
//   }
// }

//pops a new layer from the draw stack
// export function layerPop(layerID){
//   return{
//     type: render,
//     subtype: LAYER_POP,
//     layerID
//   }
// }

export function setEditItem(editItem){
  return {
    type: scene,
    subtype: SCENE_SETEDITITEM,
    editItem: editItem,
  };
}

//adds point
export function sceneAddPt(pt){
  return {
    type: scene,
    subtype: SCENE_ADDPT,
    pt
  };
}

//remove point
export function sceneRmvPt(pt){
  return {
    type: scene,
    subtype: SCENE_RMVPT,
    pt
  };
}

//removes points from rmPts[] list
//call after points have been removed from kdTree or parameters tex
export function sceneFinRmvPt(id){
  return {
    type: scene,
    subtype: SCENE_FINRMVPT,
    id
  };
}

//pushes new item onto scene - prim is type
export function scenePushEditItem(primType){
  return {
    type: scene,
    subtype: SCENE_PUSHEDITITEM,
    primType
  };
}


//removes item, must also remove points
export function sceneRmvItem(id){
  return {
    type: scene,
    subtype: SCENE_RMVITEM,
    id
  };
}
