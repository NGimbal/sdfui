//reducers
//current naive thinking
//ui - state related to a user's view of the world
//document - state related to a shared scene
import * as THREE from './libjs/three.module.js';

import * as PRIM from './primitives.js';
import * as ACT from './actions.js';

//state related to a user's view
function cursor(state=new THREE.Vector3(0.0,0.0,0.0), action) {
  switch(action.type) {
    case ACT.SET_CURSOR:
      return new PRIM.Point(action.x, action.y);
    default:
      return state;
    }
}

function resolution(state=0, action){
  switch(action.type) {
    case ACT.SET_RES:
      return action.vec3;
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
  resolution,
  cursor,
  points
});

export { reducer };
