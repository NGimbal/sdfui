//actions.js
import * as PRIM from './primitives.js';

//ACTION TYPE CONSTANTS

//STATUS
export const STATUS_SHADERUPDATE = 'SHADER_UPDATE';
//SET
export const SET_CURSOR = 'SET_CURSOR';  //curr cursor position
export const SET_RES = 'SET_RESOLUTION'; //resolution
export const SET_GRID = 'SET_GRID';     //grid offsets
//ADD
export const ADD_PT = 'ADD_PT';
//TOGGLE
export const TOGGLE_SNAPGRID = 'TOGGLE_SNAPGRID';

//ACTION CREATORS

//records when shader needs to be recompiled
export function statusShaderUpdate(toggle){
  return{
    type: STATUS_SHADERUPDATE,
    toggle,
  }
}

//records cursor position
export function setCursor(x, y){
  return {
    type: SET_CURSOR,
    x,
    y,
  };
}

//establishes grid offset
export function setResolution(vec3){
  return{
    type: SET_RES,
    vec3
  }
}

//establishes grid offset
export function setGrid(x, y){
  return{
    type: SET_GRID,
    x,
    y
  }
}

//toggles snap to grid
export function setSnapGrid(toggle){
  return{
    type: TOGGLE_SNAPGRID,
    toggle,
  }
}

//adds point
export function addPt(pt){
  return {
    type: ADD_PT,
    pt
  };
}
