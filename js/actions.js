//actions.js
//actions named with reducer_property
//action functions named with reducerProperty()
//goal is clarity for future debugging easy
import * as PRIM from './fluentPrim.js';

//ACTION TYPE CONSTANTS
//main types
export const status = 'status';
export const scene = 'scene';
export const cursor = 'cursor';
export const ui = 'ui';

//sub types
//STATUS
export const STATUS_UPDATE     = 'STATUS_UPDATE'; //update shader
export const STATUS_RES        = 'STATUS_RES'; //resolution
export const STATUS_EXPORT     = 'STATUS_EXPORT'; //resolution
export const STATUS_RASTER     = 'STATUS_RASTER'; //resolution

//UI
export const UI_PAUSE          = 'UI_PAUSE'; //pause rendering
export const UI_GRID           = 'UI_GRID'; //toggle grid
export const UI_POINTS         = 'UI_POINTS'; //toggle show points
//CURSOR
export const CURSOR_SET        = 'CURSOR_SET';  //curr cursor position
export const CURSOR_SNAPGRID   = 'CURSOR_SNAPGRID'; //snap to grid
export const CURSOR_SNAPPT     = 'CURSOR_SNAPPT';  //snap to points
export const CURSOR_SNAPGLOBAL = 'CURSOR_SNAPGLOBAL'; //snap global angle
export const CURSOR_SNAPREF    = 'CURSOR_SNAPREF'; // snap reference angle
export const CURSOR_GRIDSCALE  = 'CURSOR_GRIDSCALE'; //gridscale, int
export const CURSOR_GRID       = 'CURSOR_GRID'; //grid, vec
//DRAW
export const DRAW_DRAWING      = "DRAW_DRAWING"; //are we drawing?
export const DRAW_EDITITEM     = "DRAW_EDITITEM"; //curr edit item
export const DRAW_FILTER       = "DRAW_FILTER"; //curr filter
export const DRAW_STROKE       = "DRAW_STROKE"; //stroke color
export const DRAW_FILL         = "DRAW_FILL"; //fill color
export const DRAW_WEIGHT       = "DRAW_WEIGHT"; //stroke weight
export const DRAW_RADIUS       = "DRAW_RADIUS"; //shape radius
//SCENE
export const ADD_PT            = 'ADD_PT'; //add point to scene

//ACTION CREATORS

//records when shader needs to be recompiled - bool
export function statusUpdate(toggle){
  return{
    type: status,
    subtype: STATUS_UPDATE,
    toggle,
  }
}

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

//records when shader needs to be recompiled - bool
export function uiPause(toggle){
  return{
    type: ui,
    subtype: UI_PAUSE,
    toggle,
  }
}


//records when shader needs to be recompiled - bool
export function uiGrid(toggle){
  return{
    type: ui,
    subtype: UI_GRID,
    toggle,
  }
}

//records when shader needs to be recompiled - bool
export function uiPoints(toggle){
  return{
    type: ui,
    subtype: UI_POINTS,
    toggle,
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
export function cursorGrid(vec4){
  return{
    type: cursor,
    subtype: CURSOR_GRID,
    vec4
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
export function drawFilter(filter){
  return{
    type: ui,
    subtype: DRAW_EDITITEM,
    filter,
  }
}

//what is the current stroke color - vec(r, g, b, a)
export function drawStroke(stroke){
  return{
    type: ui,
    subtype: DRAW_STROKE,
    stroke,
  }
}

//what is the current fill color - vec(r, g, b, a)
export function drawFill(fill){
  return{
    type: ui,
    subtype: DRAW_FILL,
    fill,
  }
}

//what is the current fill weight - 0 - 1.0
export function drawWeight(weight){
  return{
    type: ui,
    subtype: DRAW_WEIGHT,
    weight,
  }
}


//adds point
export function addPt(pt){
  return {
    type: scene,
    subtype: ADD_PT,
    pt
  };
}
