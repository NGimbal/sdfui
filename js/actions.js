//actions.js
//actions named with reducer_property
//action functions named with reducerProperty()
//goal is clarity for future debugging easy
import * as PRIM from './fluentPrim.js';

//ACTION TYPE CONSTANTS

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

export const CURSOR_GRIDSCALE = 'CURSOR_GRIDSCALE';
export const CURSOR_GRID = 'CURSOR_GRID';
//DRAW
export const DRAW_DRAWING = "DRAW_DRAWING";
export const DRAW_EDITITEM = "DRAW_EDITITEM";
export const DRAW_FILTER = "DRAW_FILTER";
export const DRAW_SCOLOR = "DRAW_SCOLOR";
export const DRAW_FCOLOR = "DRAW_FCOLOR";
export const DRAW_SWEIGHT = "DRAW_SWEIGHT";
export const DRAW_RADIUS = "DRAW_RADIUS";


var drawToolInit = {
  drawing: true,
  editElem: new PRIM.PolyLine(),
  filter: null,
  strokeColor: 0x000000,
  fillColor: 0x000000,
  strokeWeight: 0.02,
  radius: 0.02
}


//ACTION CREATORS

//records when shader needs to be recompiled
export function statusUpdate(toggle){
  return{
    type: STATUS_UPDATE,
    toggle,
  }
}

//establishes grid offset
export function statusRes(vec3){
  return{
    type: STATUS_RES,
    vec3
  }
}

//records cursor position
export function cursorSet(x, y){
  return {
    type: CURSOR_SET,
    x,
    y,
  };
}


//establishes grid offset
export function cursorGrid(vec4){
  return{
    type: CURSOR_GRID,
    vec4
  }
}

//toggles snap to grid
export function cursorSnapGrid(toggle){
  return{
    type: CURSOR_SNAPGRID,
    toggle,
  }
}

//toggles snap to grid
export function cursorSnapPt(toggle){
  return{
    type: CURSOR_SNAPPT,
    toggle,
  }
}

//toggles snap to grid
export function cursorSnapGlobal(toggle){
  return{
    type: CURSOR_SNAPGLOBAL,
    toggle,
  }
}

//toggles snap to grid
export function cursorSnapRef(toggle){
  return{
    type: CURSOR_SNAPREF,
    toggle,
  }
}

//sets grid scale
export function cursorGridScale(int){
  return{
    type: CURSOR_GRIDSCALE,
    int,
  }
}


//adds point
export function addPt(pt){
  return {
    type: ADD_PT,
    pt
  };
}
