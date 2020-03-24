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
export const STATUS_UPDATE = 'STATUS_UPDATE';
//GRID
export const STATUS_RES = 'STATUS_RES'; //resolution
// export const SET_GRID = 'SET_GRID';     //grid offsets
//ADD
export const ADD_PT = 'ADD_PT';
//CURSOR
//SET
export const CURSOR_SET = 'CURSOR_SET';  //curr cursor position

export const CURSOR_SNAPGRID = 'CURSOR_SNAPGRID';
export const CURSOR_SNAPPT = 'CURSOR_SNAPPT';
export const CURSOR_SNAPGLOBAL = 'CURSOR_SNAPLOBAL';
export const CURSOR_SNAPREF = 'CURSOR_SNAPREF';
export const CURSOR_ADDPT = 'CURSOR_ADDPT';

export const CURSOR_GRIDSCALE = 'CURSOR_GRIDSCALE';
export const CURSOR_GRID = 'CURSOR_GRID';
//DRAW
export const DRAW_DRAWING = "DRAW_DRAWING";
export const DRAW_EDITITEM = "DRAW_EDITITEM";
export const DRAW_FILTER = "DRAW_FILTER";
export const DRAW_STROKE = "DRAW_STROKE";
export const DRAW_FILL = "DRAW_FILL";
export const DRAW_WEIGHT = "DRAW_WEIGHT";
export const DRAW_RADIUS = "DRAW_RADIUS";

//ACTION CREATORS
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
export function cursorSnapGrid(toggle){
  return{
    type: cursor,
    subtype: CURSOR_SNAPGRID,
    toggle,
  }
}

//toggles snap to grid
export function cursorSnapPt(toggle){
  return{
    type: cursor,
    subtype: CURSOR_SNAPPT,
    toggle,
  }
}

//toggles snap to grid
export function cursorSnapGlobal(toggle){
  return{
    type: cursor,
    subtype: CURSOR_SNAPGLOBAL,
    toggle,
  }
}

//toggles snap to grid
export function cursorSnapRef(toggle){
  return{
    type: cursor,
    subtype: CURSOR_SNAPREF,
    toggle,
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


//adds point
export function addPt(pt){
  return {
    type: scene,
    subtype: ADD_PT,
    pt
  };
}
