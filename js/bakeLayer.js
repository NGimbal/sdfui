//bakePrim.js
"use strict";

import * as PRIM from './primitives.js';
import * as SDFUI from './sdfui.js';
import * as LAYER from './layer.js';

//could also get frag stub here
export function bake(layer){
  let prim = {};
  switch(layer.primType){
    case'polyline':
      prim = SDFUI.state.scene.editItems.find(e => e.id === layer.prim);
      return polyLine(prim, layer);
    case'polygon':
      prim = SDFUI.state.scene.editItems.find(e => e.id === layer.prim);
      return polygon(prim, layer);
    case'circle':
      prim = SDFUI.state.scene.editItems.find(e => e.id === layer.prim);
      return circle(prim, layer);
    case'rectangle':
      prim = SDFUI.state.scene.editItems.find(e => e.id === layer.prim);
      return rectangle(prim, layer);
    default:
      prim = SDFUI.state.scene.editItems.find(e => e.id === layer.prim);
      return polyLine(prim, layer);
  }
}

//POLYLINE-------------------------------------------------------
//takes prim and datashader and bakes as a polyline
function polyLine(prim, layer){
  let shader = LAYER.getFragStub(prim.type, false);
  let parameters = layer.editTex;

  //every layer gets its own parameters texture
  shader = polyLineFunc(prim, shader, parameters);
  shader = polyLineCall(prim, shader);
  
  //need to recompile layer program
  //probably after returning the compiled shader
  return shader;
}

//prim is the shape, dataShader is the fragShader + parameters tex
function polyLineFunc(prim, shader, parameters){
  // let shader = dataShader.shader;
  // let parameters = dataShader.parameters;

  //insert new function
  let insString = "//$INSERT FUNCTION$------";
  let insIndex = shader.indexOf(insString);
  insIndex += insString.length;

  let startShader = shader.slice(0, insIndex);
  let endShader = shader.slice(insIndex);

  // if function exists start and end should be before beginning and after end
  let exFuncStr = '//$START-' + prim.id;

  let exFuncIndex = shader.indexOf(exFuncStr);

  //if function exists
  if(exFuncIndex >= 0){
    startShader = shader.slice(0, exFuncIndex);

    let postFuncStr = '//$END-' + prim.id;
    let postIndex = shader.indexOf(postFuncStr);
    postIndex += postFuncStr.length;
    endShader = shader.slice(postIndex);
  }

  //create function
  let posString = '\n';
  posString += '//$START-' + prim.id + '\n';

  // p is a translation for polyLine
  posString += 'vec4 ' + prim.id + '(vec2 uv, vec2 p) {';

  posString += '\n\tvec2 tUv = uv - p;';

  let indexX = 0;
  let indexY = 0;

  let texelOffset = 0.5 * (1.0 / (parameters.dataSize * parameters.dataSize));
  let dataSize = parameters.dataSize;

  // let rgbStroke = prim.properties.stroke;
  // let colorStroke = 'vec3(' + rgbStroke[0].toFixed(4) + ',' + rgbStroke[1].toFixed(4) + ',' + rgbStroke[2].toFixed(4) +')';
  // let weight = prim.properties.weight.toFixed(6);

  // let count = 0;

  //is this unreliable?
  let cTexel = 0;
  for (let _p of prim.pts){

    if(cTexel == 0){
      indexX = (cTexel % dataSize) / dataSize + texelOffset;
      indexY = (Math.floor(cTexel / dataSize)) / dataSize  + texelOffset;
      posString += '\n\tvec3 finalColor = vec3(1.0);';
      posString += '\n\tvec2 pos = vec2(0.0);';
      posString += '\n\tfloat d = 0.0;';
      posString += '\n\tfloat accumD = 100.0;';
      posString += '\n\tvec2 index = vec2(' + indexX + ',' + indexY + ');';
      posString += '\n\tvec2 oldPos = texture(u_eTex, index).xy;';
      cTexel++;
      continue;
    }else{
      indexX = (cTexel % dataSize) / dataSize + texelOffset;
      indexY = (Math.floor(cTexel / dataSize)) / dataSize  + texelOffset;

      posString += '\n\tindex = vec2(' + indexX + ',' + indexY + ');';
      posString += '\n\tpos = texture(u_eTex, index).xy;';
      posString += '\n\td = drawLine(tUv, oldPos, pos, u_weight, 0.0);';
      posString += '\n\taccumD = min(accumD, d);';
      posString += '\n\toldPos = pos;';

      cTexel++;
    }
  }
  
  posString += '\n\taccumD = line(accumD, u_weight);\n';
  posString += '\n\tfinalColor = mix(finalColor, u_stroke, accumD);';
  posString += '\n\treturn vec4(finalColor, accumD);';
  posString += '\n}\n';
  posString += '//$END-' + prim.id + '\n';

  // prim.fragShader = posString;
  startShader += posString;
  let fragShader = startShader + endShader;

  return fragShader;
}

//creates function call for prim specific function
function polyLineCall(prim, shader){

  let insString = "//$INSERT CALL$------";
  let insIndex = shader.indexOf(insString);
  insIndex += insString.length;

  let startShader = shader.slice(0, insIndex);
  let endShader = shader.slice(insIndex);

  //create function
  let posString = '\n';

  // p here vec2(0.0,0.0) is a translation for polygon
  posString += '\t colDist = ' + prim.id + '(uv, vec2(0.0,0.0));\n';
  startShader += posString;

  let fragShader = startShader + endShader;

  return fragShader;
}

//POLYLINE-------------------------------------------------------

//POLYGON--------------------------------------------------------
//takes prim and datashader and bakes as a polyline
function polygon(prim, layer){
  let shader = LAYER.getFragStub(prim.type, false);
  let parameters = layer.editTex;

  shader = polgonFunc(prim, shader, parameters);
  shader = polygonCall(prim, shader);

  //need to recompile layer program after returning the compiled shader
  return shader;
}

//creates function call that draws prim as a polygon
function polgonFunc(prim, shader, parameters){

  //insert new function
  let insString = "//$INSERT FUNCTION$------";
  let insIndex = shader.indexOf(insString);
  insIndex += insString.length;

  let startShader = shader.slice(0, insIndex);
  let endShader = shader.slice(insIndex);

  // if function exists start and end should be before beginning and after end
  let exFuncStr = '//$START-' + prim.id;

  let exFuncIndex = shader.indexOf(exFuncStr);

  //if function exists
  if(exFuncIndex >= 0){
    startShader = shader.slice(0, exFuncIndex);

    let postFuncStr = '//$END-' + prim.id;
    let postIndex = shader.indexOf(postFuncStr);
    postIndex += postFuncStr.length;
    endShader = shader.slice(postIndex);
  }

  //create function
  let posString = '\n';
  posString += '//$START-' + prim.id + '\n';

  let indexX = 0;
  let indexY = 0;

  let texelOffset = 0.5 * (1.0 / (parameters.dataSize * parameters.dataSize));
  let dataSize = parameters.dataSize;

  // let rgbFill = hexToRgb(prim.properties.fill);
  // let colorFill = 'vec3(' + rgbFill.r/255 + ',' + rgbFill.g/255 + ',' + rgbFill.b/255 +')';
  // let rgbStroke = hexToRgb(prim.properties.stroke);
  // let colorStroke = 'vec3(' + rgbStroke.r/255 + ',' + rgbStroke.g/255 + ',' + rgbStroke.b/255 +')';
  // let weight = prim.properties.weight.toFixed(4);
  // let radius = prim.properties.radius.toFixed(4);

  // p is a translation for polygon
  posString += 'vec4 ' + prim.id + '(vec2 uv, vec2 p) {';

  posString += '\n\tvec2 tUv = uv - p;\n';

  let cTexel = 0;
  for (let _p of prim.pts){

    if(cTexel == 0){
      indexX = (cTexel % dataSize) / dataSize + texelOffset;
      indexY = (Math.floor(cTexel / dataSize)) / dataSize  + texelOffset;
     
      // posString += '\n\tvec3 finalColor = vec3(1.0);';
      posString += '\n\tvec2 pos = vec2(0.0);';
      posString += '\n\tfloat accumD = 100.0;';

      posString += '\n\tvec2 index = vec2(' + indexX + ',' + indexY + ');\n';

      posString += '\tvec2 first = texture(u_eTex, index).xy;\n';

      //last point
      indexX = (parameters.cTexel % dataSize) / dataSize + texelOffset;
      indexY = (Math.floor(parameters.cTexel / dataSize)) / dataSize  + texelOffset;
      posString += '\n\tindex = vec2(' + indexX + ',' + indexY + ');\n';
      posString += '\tvec2 last = texture(u_eTex, index).xy;\n';

      posString += '\tfloat d = dot(tUv - first, tUv - first);\n';

      posString += '\tfloat s = 1.0;\n';
      posString += '\tvec2 oldPos = first;\n';
      posString += '\tvec2 e = last - first;\n';
      posString += '\tvec2 w = tUv - first;\n';
      posString += '\tvec2 b = w - e*clamp( dot(w,e)/dot(e,e), 0.0, 1.0 );\n';
      posString += '\td = min(d, dot(b,b));\n';
      // winding number from http://geomalgorithms.com/a03-_inclusion.html
      posString += '\tbvec3 cond = bvec3( tUv.y>=first.y, tUv.y<last.y, e.x*w.y>e.y*w.x );\n';
      posString += '\tif(all(cond) || all(not(cond))) s*=-1.0;\n';

      cTexel++;
      continue;
    }else{
      indexX = (cTexel % dataSize) / dataSize + texelOffset;
      indexY = (Math.floor(cTexel / dataSize)) / dataSize  + texelOffset;

      posString += '\n\tindex = vec2(' + indexX + ',' + indexY + ');\n';
      posString += '\tpos = texture(u_eTex, index).xy;\n';
      posString += '\te = oldPos - pos;\n';
      posString += '\tw = tUv - pos;\n';
      posString += '\tb = w - e*clamp( dot(w,e)/dot(e,e), 0.0, 1.0 );\n';
      posString += '\td = min(d, dot(b,b));\n'
      // winding number from http://geomalgorithms.com/a03-_inclusion.html
      posString += '\tcond = bvec3( tUv.y>=pos.y, tUv.y<oldPos.y, e.x*w.y>e.y*w.x );\n';
      posString += '\tif(all(cond) || all(not(cond))) s*=-1.0;\n';
      posString += '\toldPos = pos;\n';

      cTexel++;
    }
  }

  posString += '\td = s*sqrt(d);\n';

  //fill
  posString += '\tfloat fill = 1.0 - smoothstep(0.0,0.003,clamp(d,0.0,1.0));\n';
  posString += '\tvec3 finalColor = mix(vec3(1.0), u_fill, fill);\n';
  posString += '\tfinalColor = mix(finalColor, u_stroke, line(d, u_weight));\n';

  posString += '\n\treturn vec4(finalColor, fill);\n';
  posString += '\n}\n';
  posString += '//$END-' + prim.id + '\n';

  startShader += posString;
  let fragShader = startShader + endShader;

  return fragShader;
}

//creates function calls that draws prim as a polygon
function polygonCall(prim, shader){

  let insString = "//$INSERT CALL$------";
  let insIndex = shader.indexOf(insString);
  insIndex += insString.length;

  let startShader = shader.slice(0, insIndex);
  let endShader = shader.slice(insIndex);
  
  //create function
  let posString = '\n';

  // p here vec2(0.0,0.0) is a translation for polygon
  // eventually this will be a reference to another data texture
  posString += '\t colDist = ' + prim.id +' (uv, vec2(0.0,0.0));\n';
  startShader += posString;

  let fragShader = startShader + endShader;

  return fragShader;
}

//POLYGON--------------------------------------------------------

//CIRCLE---------------------------------------------------------
//takes prim and datashader and bakes as a circle
export function circle(prim, layer){
  // let shader = LAYER.getFragStub(prim.type, false);
  // let parameters = layer.editTex;

  // if(prim.pts.length == 0) return dataShader;

  let shader = circleCall(prim, layer);

  return shader;
}

//creates function call that draws prim - circle
export function circleCall(prim, layer){
  let shader = LAYER.getFragStub(prim.type, false);
  let parameters = layer.editTex;
  let dataSize = layer.editTex.dataSize;

  //bakes pointPrim data the fluentDoc.parameters
  // let _pt0 = prim.pts[0];
  // let _pt1 = prim.pts[1];

  // let i = SDFUI.state.scene.pts.findIndex(i => i.id === _pt0);
  // let pt0 = SDFUI.state.scene.pts[i];

  // let j = SDFUI.state.scene.pts.findIndex(j => j.id === _pt1);
  // let pt1 = SDFUI.state.scene.pts[j];

  // let _pt = {x:pt0.x, y:pt0.y, z:pt1.x, w:pt1.y};
  // parameters.addPoint(_pt, prim.id);

  // let cTexel = parameters.cTexel;
  // let dataSize = parameters.dataSize;

  let texelOffset = 0.5 * (1.0 / (parameters.dataSize * parameters.dataSize));


  //eventually address these functions using id in place of d
  //then perform scene merge operation when modifying finalColor
  let insString = "//$INSERT CALL$------";
  let insIndex = shader.indexOf(insString);
  insIndex += insString.length;

  let startShader = shader.slice(0, insIndex);
  let endShader = shader.slice(insIndex);

  //create function call
  let posString = '\n';

  let indexX = (0 % dataSize) / dataSize + texelOffset;
  let indexY = (Math.floor(0 / dataSize)) / dataSize  + texelOffset;

  posString += '\tvec2 pos = vec2(' + indexX + ', ' + indexY + ');\n';
  
  indexX = (1. % dataSize) / dataSize + texelOffset;
  indexY = (Math.floor(1. / dataSize)) / dataSize  + texelOffset;
 
  posString += '\tvec2 rad = vec2(' + indexX + ', ' + indexY + ');\n';

  posString += '\tfloat radius = distance(texture(u_eTex, pos).xy, texture(u_eTex, rad).xy);\n';
  posString += '\tfloat d = sdCircle(uv, texture(u_eTex, pos).xy, radius);\n';
  posString += '\tfloat stroke = line(d, u_weight);\n';
  posString += '\tvec4 strokeCol = mix(vec4(vec3(1.),0.), vec4(u_stroke,stroke) , stroke);\n';
  posString += '\tfloat fill = fillMask(d);';
  posString += '\tvec4 fillCol = mix(vec4(vec3(1.),0.), vec4(u_fill, u_opacity), fill);\n';
  posString += '\td = min(stroke, fill);\n';
  posString += '\tif ( d > 1.) discard;\n';
  posString += '\toutColor = vec4(vec3(fillCol.rgb * strokeCol.rgb), fillCol.a + strokeCol.a);\n';
 
  startShader += posString;
  let fragShader = startShader + endShader;

  // console.log(posString);

  return fragShader;
}
//CIRCLE-------------------------------------------------------------------


//RECTANGLE---------------------------------------------------------
//takes prim and datashader and bakes as a circle
export function rectangle(prim, layer){
  // let shader = LAYER.getFragStub(prim.type, false);
  // let parameters = layer.editTex;

  // if(prim.pts.length == 0) return dataShader;

  let shader = rectangleCall(prim, layer);

  return shader;
}

//creates function call that draws prim - circle
export function rectangleCall(prim, layer){
  let shader = LAYER.getFragStub(prim.type, false);
  let parameters = layer.editTex;
  let dataSize = layer.editTex.dataSize;

  let texelOffset = 0.5 * (1.0 / (parameters.dataSize * parameters.dataSize));

  let insString = "//$INSERT CALL$------";
  let insIndex = shader.indexOf(insString);
  insIndex += insString.length;

  let startShader = shader.slice(0, insIndex);
  let endShader = shader.slice(insIndex);

  //create function call
  let posString = '\n';

  let indexX = (0 % dataSize) / dataSize + texelOffset;
  let indexY = (Math.floor(0 / dataSize)) / dataSize  + texelOffset;
  let index = indexX + ", " + indexY;

  // posString += '\tfloat texelOffset =' + texelOffset +';\n';
  posString += '\tvec2 rect1 = texture(u_eTex, vec2('+index+')).xy;\n';

  indexX = (1. % dataSize) / dataSize + texelOffset;
  indexY = (Math.floor(1. / dataSize)) / dataSize  + texelOffset;
  index = indexX + ", " + indexY;

  posString += '\tvec2 rect2 = texture(u_eTex, vec2('+index+')).xy;\n';
  posString += '\tvec2 center = 0.5 * (rect2 - rect1) + rect1;\n';
  posString += '\tvec2 rPt = abs(rect2 - center);\n';
  posString += '\tfloat d = sdBox(uv, center, rPt, u_radius);\n';

  // posString += '\tfloat radius = distance(texture(u_eTex, pos).xy, texture(u_eTex, rad).xy);\n';
  // posString += '\tfloat d = sdCircle(uv, texture(u_eTex, pos).xy, radius);\n';

  posString += '\tfloat stroke = line(d, u_weight);\n';
  posString += '\tvec4 strokeCol = mix(vec4(vec3(1.),0.), vec4(u_stroke,stroke) , stroke);\n';
  posString += '\tfloat fill = fillMask(d);';
  posString += '\tvec4 fillCol = mix(vec4(vec3(1.),0.), vec4(u_fill, u_opacity), fill);\n';
  posString += '\td = min(stroke, fill);\n';
  posString += '\tif ( d > 1.) discard;\n';
  posString += '\toutColor = vec4(vec3(fillCol.rgb * strokeCol.rgb), fillCol.a + strokeCol.a);\n';
 
  startShader += posString;
  let fragShader = startShader + endShader;

  console.log(posString);

  return fragShader;
}
//CIRCLE-------------------------------------------------------------------
