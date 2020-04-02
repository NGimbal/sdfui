//bakePrim.js
"use strict";

import * as PRIM from './primitives.js';
import * as SDFUI from './sdfui.js';

//POLYLINE-------------------------------------------------------
//takes prim and datashader and bakes as a polyline
export function polyLine(prim, dataShader){
  let shader = dataShader.shader;
  let parameters = dataShader.parameters;

  if(prim.pts.length == 0) return dataShader;

  dataShader = polyLineFunc(prim, dataShader);
  dataShader.shader = polyLineCall(prim, dataShader);

  return dataShader;
}

//prim is the shape, dataShader is the fragShader + parameters tex
export function polyLineFunc(prim, dataShader){
  let shader = dataShader.shader;
  let parameters = dataShader.parameters;

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
  posString += 'float ' + prim.id + '(vec2 uv, vec2 p, inout vec3 finalColor) {';

  posString += '\n\tvec2 tUv = uv - p;\n';

  let buffer = new ArrayBuffer(10);
  let view = new DataView(buffer);

  let oldPosX = 0;
  let oldPosY = 0;

  let indexX = 0;
  let indexY = 0;

  let texelOffset = 0.5 * (1.0 / (parameters.dataSize * parameters.dataSize));
  let dataSize = parameters.dataSize;

  let rgbStroke = hexToRgb(prim.properties.stroke);
  let colorStroke = 'vec3(' + rgbStroke.r/255 + ',' + rgbStroke.g/255 + ',' + rgbStroke.b/255 +')';
  let weight = prim.properties.weight.toFixed(4);

  let count = 0;

  for (let _p of prim.pts){
    let i = SDFUI.state.scene.pts.findIndex(i => i.id === _p);
    let p = SDFUI.state.scene.pts[i];

    parameters.addPoint(p, prim.id);
    let cTexel = parameters.cTexel;

    if(count == 0){
      indexX = (cTexel % dataSize) / dataSize + texelOffset;
      indexY = (Math.floor(cTexel / dataSize)) / dataSize  + texelOffset;

      posString += '\n\tvec2 pos = vec2(0.0);\n';
      posString += '\n\tfloat d = 0.0;\n';
      posString += '\n\tfloat accumD = 100.0;\n';
      posString += '\n\tvec2 index = vec2(' + indexX + ',' + indexY + ');\n';
      posString += '\n\tvec2 oldPos = texture2D(parameters, index).xy;\n';

      count++;
      continue;
    }else{
      indexX = (cTexel % dataSize) / dataSize + texelOffset;
      indexY = (Math.floor(cTexel / dataSize)) / dataSize  + texelOffset;

      posString += '\n\tindex = vec2(' + indexX + ',' + indexY + ');\n';
      posString += '\n\tpos = texture2D(parameters, index).xy;\n';
      posString += '\n\td = drawLine(tUv, oldPos, pos,'+ weight + ',0.0);\n';
      posString += '\n\taccumD = min(accumD, d);\n';
      posString += '\tfinalColor = mix(finalColor, ' + colorStroke + ', line(tUv, d, '+weight+'));\n';
      posString += '\toldPos = pos;\n';

      count++;
    }
  }

  posString += '\n\treturn accumD;';

  posString += '\n}\n';
  posString += '//$END-' + prim.id + '\n';

  prim.fragShaer = posString;
  startShader += posString;
  let fragShader = startShader + endShader;

  return new PRIM.DataShader(fragShader, parameters);
}

//creates function call for prim specific function
export function polyLineCall(prim, dataShader){
  let shader = dataShader.shader;
  let parameters = dataShader.parameters;

  let insString = "//$INSERT CALL$------";
  let insIndex = shader.indexOf(insString);
  insIndex += insString.length;

  let startShader = shader.slice(0, insIndex);
  let endShader = shader.slice(insIndex);

  //create function
  let posString = '\n';

  // p here vec2(0.0,0.0) is a translation for polygon
  posString += '\t accumD = min(accumD, ' + prim.id + '(uv, vec2(0.0,0.0), finalColor));\n';
  startShader += posString;

  let fragShader = startShader + endShader;

  return fragShader;
}

//POLYLINE-------------------------------------------------------

//POLYGON--------------------------------------------------------
//takes prim and datashader and bakes as a polyline
export function polygon(prim, dataShader){
  let shader = dataShader.shader;
  let parameters = dataShader.parameters;

  if(prim.pts.length == 0) return dataShader;

  dataShader = polgonFunc(prim, dataShader);
  dataShader.shader = polygonCall(prim, dataShader);

  return dataShader;
}

//creates function call that draws prim as a polygon
export function polgonFunc(prim, dataShader){
  let shader = dataShader.shader;
  let parameters = dataShader.parameters;

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

  let oldPosX = 0;
  let oldPosY = 0;

  let indexX = 0;
  let indexY = 0;

  let texelOffset = 0.5 * (1.0 / (parameters.dataSize * parameters.dataSize));
  let dataSize = parameters.dataSize;

  let rgbFill = hexToRgb(prim.properties.fill);
  let colorFill = 'vec3(' + rgbFill.r/255 + ',' + rgbFill.g/255 + ',' + rgbFill.b/255 +')';
  let rgbStroke = hexToRgb(prim.properties.stroke);
  let colorStroke = 'vec3(' + rgbStroke.r/255 + ',' + rgbStroke.g/255 + ',' + rgbStroke.b/255 +')';
  let weight = prim.properties.weight.toFixed(4);
  let radius = prim.properties.radius.toFixed(4);

  // p is a translation for polygon
  posString += 'float ' + prim.id + '(vec2 uv, vec2 p, inout vec3 finalColor) {';

  posString += '\n\tvec2 tUv = uv - p;\n';
  posString += '\tfloat radius='+radius+';\n';
  // scaling/rounding corners this way doesn't work
  // posString += '\ttUv = tUv/(1.0-radius);\n';
  posString += '\n\tvec2 pos = vec2(0.0);\n';
  posString += '\n\tfloat accumD  = 100.0;\n';

  let count = 0;
  for (let _p of prim.pts){
    let i = SDFUI.state.scene.pts.findIndex(i => i.id === _p);
    let p = SDFUI.state.scene.pts[i];

    parameters.addPoint(p, prim.id);

    let cTexel = parameters.cTexel;

    if(count == 0){
      indexX = (cTexel % dataSize) / dataSize + texelOffset;
      indexY = (Math.floor(cTexel / dataSize)) / dataSize  + texelOffset;


      posString += '\n\tvec2 index = vec2(' + indexX + ',' + indexY + ');\n';

      posString += '\tvec2 first = texture2D(parameters, index).xy;\n';
      //scaling/rounding corners this way doesn't seem to work
      // posString += '\tfirst = (first/radius)*radius;\n';

      //get the last point in absolute terms
      let lastPtId = prim.pts[prim.pts.length - 1];
      let lastPtIndex = SDFUI.state.scene.pts.findIndex(i => i.id === lastPtId);
      let lastPt = SDFUI.state.scene.pts[lastPtIndex];

      posString += '\tvec2 last = vec2('+lastPt.x+', '+lastPt.y+');\n';
      posString += '\tfloat d = dot(tUv - first, tUv - first);\n';
      posString += '\n\taccumD = min(accumD, d);\n';
      posString += '\tfloat s = 1.0;\n';
      posString += '\tvec2 oldPos = first;\n';
      posString += '\tvec2 e = last - first;\n';
      posString += '\tvec2 w = tUv - first;\n';
      posString += '\tvec2 b = w - e*clamp( dot(w,e)/dot(e,e), 0.0, 1.0 );\n';
      posString += '\td = min(d, dot(b,b));\n';
      // winding number from http://geomalgorithms.com/a03-_inclusion.html
      posString += '\tbvec3 cond = bvec3( tUv.y>=first.y, tUv.y<last.y, e.x*w.y>e.y*w.x );\n';
      posString += '\tif(all(cond) || all(not(cond))) s*=-1.0;\n';

      count++;
      continue;
    }else{
      indexX = (cTexel % dataSize) / dataSize + texelOffset;
      indexY = (Math.floor(cTexel / dataSize)) / dataSize  + texelOffset;

      posString += '\n\tindex = vec2(' + indexX + ',' + indexY + ');\n';
      posString += '\tpos = texture2D(parameters, index).xy;\n';
      posString += '\te = oldPos - pos;\n';
      posString += '\tw = tUv - pos;\n';
      posString += '\tb = w - e*clamp( dot(w,e)/dot(e,e), 0.0, 1.0 );\n';
      posString += '\td = min(d, dot(b,b));\n'
      posString += '\n\taccumD = min(accumD, d);\n';
      // winding number from http://geomalgorithms.com/a03-_inclusion.html
      posString += '\tcond = bvec3( tUv.y>=pos.y, tUv.y<oldPos.y, e.x*w.y>e.y*w.x );\n';
      posString += '\tif(all(cond) || all(not(cond))) s*=-1.0;\n';
      posString += '\toldPos = pos;\n';

      count++;
    }
  }

  posString += '\td = s*sqrt(d) - radius;\n';
  posString += '\tfloat line = d;\n';
  posString += '\td = 1.0 - smoothstep(0.0,0.003,clamp(d,0.0,1.0));\n';
  posString += '\tfinalColor = mix(finalColor, ' + colorFill + ', d);\n';
  posString += '\tline = clamp(abs(line) - '+weight+', 0.0, 1.0);\n';
  posString += '\tline = 1.0 - smoothstep(0.0,0.003,abs(line));\n';
  posString += '\tfinalColor = mix(finalColor, ' + colorStroke + ', line);\n';
  posString += '\n\treturn accumD;\n';
  posString += '\n}\n';
  posString += '//$END-' + prim.id + '\n';

  startShader += posString;
  let fragShader = startShader + endShader;

  return new PRIM.DataShader(fragShader, parameters);
}

//creates function calls that draws prim as a polygon
export function polygonCall(prim, dataShader){
  let shader = dataShader.shader;
  let parameters = dataShader.parameters;

  let insString = "//$INSERT CALL$------";
  let insIndex = shader.indexOf(insString);
  insIndex += insString.length;

  let startShader = shader.slice(0, insIndex);
  let endShader = shader.slice(insIndex);

  // let buffer = new ArrayBuffer(10);
  // let view = new DataView(buffer);

  let oldPosX = 0;
  let oldPosY = 0;

  //create function
  let posString = '\n';

  // p here vec2(0.0,0.0) is a translation for polygon
  // eventually this will be a reference to another data texture
  posString += '\taccumD = min(accumD,' + prim.id + '(uv, vec2(0.0,0.0), finalColor));\n';
  startShader += posString;

  let fragShader = startShader + endShader;

  return fragShader;
}

//POLYGON--------------------------------------------------------

//POLYCIRCLE-----------------------------------------------------
//takes prim and datashader and bakes as a polyCircle
export function polyCircle(prim, dataShader){
  let shader = dataShader.shader;
  let parameters = dataShader.parameters;

  if(prim.pts.length == 0) return dataShader;

  dataShader = polyCircleFunc(prim, dataShader);
  dataShader.shader = polyCircleCall(prim, dataShader);

  return dataShader;
}

//bakes function call that draws prim as a PolyCircle
export function polyCircleFunc(prim, dataShader){
  let shader = dataShader.shader;
  let parameters = dataShader.parameters;

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

  // p is a translation for polycircle
  // eventually this will be a reference to another data texture
  posString += 'float ' + prim.id + '(vec2 uv, vec2 p, inout vec3 finalColor) {';

  posString += '\n\tvec2 tUv = uv - p;\n';

  let indexX = 0;
  let indexY = 0;

  let first = true;

  let texelOffset = 0.5 * (1.0 / (parameters.dataSize * parameters.dataSize));
  let dataSize = parameters.dataSize;

  let rgbFill = hexToRgb(prim.properties.fill);
  let colorFill = 'vec3(' + rgbFill.r/255 + ',' + rgbFill.g/255 + ',' + rgbFill.b/255 +')';
  let rgbStroke = hexToRgb(prim.properties.stroke);
  let colorStroke = 'vec3(' + rgbStroke.r/255 + ',' + rgbStroke.g/255 + ',' + rgbStroke.b/255 +')';
  let weight = prim.properties.weight.toFixed(4);
  let radius = prim.properties.radius.toFixed(4);

  posString += '\n\tvec2 pos = vec2(0.0);';
  posString += '\n\tfloat oldDist = 1000.0;';
  posString += '\n\tfloat accumD = 100.0;';

  for (let _p of prim.pts){
    let i = SDFUI.state.scene.pts.findIndex(i => i.id === _p);
    let p = SDFUI.state.scene.pts[i];

    parameters.addPoint(p, prim.id);

    let cTexel = parameters.cTexel;

    if(first){
      first = false;

      //what are x, y texel indices?
      indexX = (cTexel % dataSize) / dataSize + texelOffset;
      indexY = (Math.floor(cTexel / dataSize)) / dataSize  + texelOffset;

      posString += '\n\tvec2 index = vec2(' + indexX + ',' + indexY + ');';

      posString += '\n\tpos = texture2D(parameters, index).xy;';

      posString += '\n\tfloat d = sdCircle(uv, pos, ' + radius + ');';
      posString += '\n\taccumD = min(accumD, d);\n';

      posString += '\n\td = opSmoothUnion(d, oldDist, 0.05);';
      posString += '\n\toldDist = d;\n';

    }else{
      indexX = (cTexel % dataSize) / dataSize + texelOffset;
      indexY = (Math.floor(cTexel / dataSize)) / dataSize  + texelOffset;

      posString += '\n\tindex = vec2(' + indexX + ',' + indexY + ');';
      posString += '\n\tpos = texture2D(parameters, index).xy;';

      posString += '\n\td = sdCircle(uv, pos, ' + radius + ');';
      posString += '\n\td = opSmoothUnion(d, oldDist, 0.05);';
      posString += '\n\taccumD = min(accumD, d);\n';
      posString += '\n\toldDist = d;';
      // posString += '\n\tvec3 cCol = vec3(0.0, 0.384, 0.682);';
      // posString += '\n\tfinalColor = mix( finalColor, cCol , 1.0-smoothstep(0.0,editWeight,abs(d)) );';

    }
  }
  posString += '\n';

  posString += '\n\tfinalColor = mix( finalColor, ' + colorStroke + ' , 1.0-smoothstep(0.0,'+ weight + '+0.002,abs(d)));';

  posString += '\n\treturn accumD;\n';

  posString += '\n}\n';
  posString += '//$END-' + prim.id + '\n';

  startShader += posString;

  let fragShader = startShader + endShader;

  return new PRIM.DataShader(fragShader, parameters);
}

//creates function call that draws prim as a polyCircle
export function polyCircleCall(prim, dataShader){
  let shader = dataShader.shader;
  let parameters = dataShader.parameters;

  let insString = "//$INSERT CALL$------";
  let insIndex = shader.indexOf(insString);
  insIndex += insString.length;

  let startShader = shader.slice(0, insIndex);
  let endShader = shader.slice(insIndex);

  //create function
  let posString = '\n';

  // p here vec2(0.0,0.0) is a translation for polygon
  // eventually this will be a reference to another data texture
  posString += '\taccumD = min(accumD,' + prim.id + '(uv, vec2(0.0,0.0), finalColor));\n';
  startShader += posString;

  let fragShader = startShader + endShader;

  return fragShader;
}

//POLYCIRCLE-----------------------------------------------------

//CIRCLE---------------------------------------------------------
//takes prim and datashader and bakes as a circle
export function circle(prim, dataShader){
  let shader = dataShader.shader;
  let parameters = dataShader.parameters;

  if(prim.pts.length == 0) return dataShader;

  dataShader = circleCall(prim, dataShader);

  return dataShader;
}

//creates function call that draws prim - circle
export function circleCall(prim, dataShader){
  let shader = dataShader.shader;
  let parameters = dataShader.parameters;

  //bakes pointPrim data the fluentDoc.parameters
  let _pt0 = prim.pts[0];
  let _pt1 = prim.pts[1];

  let i = SDFUI.state.scene.pts.findIndex(i => i.id === _pt0);
  let pt0 = SDFUI.state.scene.pts[i];

  let j = SDFUI.state.scene.pts.findIndex(j => j.id === _pt1);
  let pt1 = SDFUI.state.scene.pts[j];

  let _pt = {x:pt0.x, y:pt0.y, z:pt1.x, w:pt1.y};
  parameters.addPoint(_pt, prim.id);

  let cTexel = parameters.cTexel;
  let dataSize = parameters.dataSize;

  let texelOffset = 0.5 * (1.0 / (parameters.dataSize * parameters.dataSize));

  let indexX = (cTexel % dataSize) / dataSize + texelOffset;
  let indexY = (Math.floor(cTexel / dataSize)) / dataSize  + texelOffset;

  //eventually address these functions using id in place of d
  //then perform scene merge operation when modifying finalColor
  let insString = "//$INSERT CALL$------";
  let insIndex = shader.indexOf(insString);
  insIndex += insString.length;

  let startShader = shader.slice(0, insIndex);
  let endShader = shader.slice(insIndex);

  //create function call
  let posString = '\n';

  let rgbFill = hexToRgb(prim.properties.fill);
  let colorFill = 'vec3(' + rgbFill.r/255 + ',' + rgbFill.g/255 + ',' + rgbFill.b/255 +')';
  let rgbStroke = hexToRgb(prim.properties.stroke);
  let colorStroke = 'vec3(' + rgbStroke.r/255 + ',' + rgbStroke.g/255 + ',' + rgbStroke.b/255 +')';
  let weight = prim.properties.weight.toFixed(4);
  let radius = prim.properties.radius.toFixed(4);

  posString += '\tindex = vec2(' + indexX + ', ' + indexY + ');\n';
  posString += '\tradius = distance(texture2D(parameters, index).xy, texture2D(parameters, index).zw);\n';
  posString += '\td = sdCircle(uv, texture2D(parameters, index).xy, radius);\n';
  posString += '\td = clamp(abs(d) - '+ weight +', 0.0, 1.0);\n';
  posString += '\tfinalColor = mix( finalColor, ' + colorStroke + ', 1.0-smoothstep(0.0,0.003,abs(d)) );\n'
  posString += '\taccumD = min(accumD, d);';

  startShader += posString;
  let fragShader = startShader + endShader;

  // console.log(posString);

  return new PRIM.DataShader(fragShader, parameters);
}
//CIRCLE-------------------------------------------------------------------

//RECTANGLE---------------------------------------------------------
//takes prim and datashader and bakes prim as rectangle
export function rectangle(prim, dataShader){
  let shader = dataShader.shader;
  let parameters = dataShader.parameters;

  if(prim.pts.length == 0) return dataShader;

  dataShader = rectangleCall(prim, dataShader);

  return dataShader;
}

//creates function calls that draws prim
export function rectangleCall(prim, dataShader){
  let shader = dataShader.shader;
  let parameters = dataShader.parameters;

  //bakes pointPrim data the fluentDoc.parameters
  let _pt0 = prim.pts[0];
  let _pt1 = prim.pts[1];

  let i = SDFUI.state.scene.pts.findIndex(i => i.id === _pt0);
  let pt0 = SDFUI.state.scene.pts[i];

  let j = SDFUI.state.scene.pts.findIndex(j => j.id === _pt1);
  let pt1 = SDFUI.state.scene.pts[j];

  let _pt = {x:pt0.x, y:pt0.y, z:pt1.x, w:pt1.y};
  parameters.addPoint(_pt, prim.id);

  let cTexel = parameters.cTexel;
  let dataSize = parameters.dataSize;

  let texelOffset = 0.5 * (1.0 / (parameters.dataSize * parameters.dataSize));

  let indexX = (cTexel % dataSize) / dataSize + texelOffset;
  let indexY = (Math.floor(cTexel / dataSize)) / dataSize  + texelOffset;

  //eventually address these functions using id in place of d
  //then perform scene merge operation when modifying finalColor
  let insString = "//$INSERT CALL$------";
  let insIndex = shader.indexOf(insString);
  insIndex += insString.length;

  let startShader = shader.slice(0, insIndex);
  let endShader = shader.slice(insIndex);

  //create function call
  let posString = '\n';

  let rgbFill = hexToRgb(prim.properties.fill);
  let colorFill = 'vec3(' + rgbFill.r/255 + ',' + rgbFill.g/255 + ',' + rgbFill.b/255 +')';
  let rgbStroke = hexToRgb(prim.properties.stroke);
  let colorStroke = 'vec3(' + rgbStroke.r/255 + ',' + rgbStroke.g/255 + ',' + rgbStroke.b/255 +')';
  let weight = prim.properties.weight.toFixed(4);
  let radius = prim.properties.radius.toFixed(4);

  posString += '\tindex = vec2(' + indexX + ', ' + indexY + ');\n';
  posString += '\trect1 = texture2D(parameters, index).xy;\n';
  posString += '\trect2 = texture2D(parameters, index).zw;\n';
  posString += '\td = sdBox(uv, 0.5 * (rect2 - rect1) + rect1, abs(rect2 - (0.5 * (rect2 - rect1) + rect1)), '+radius+');\n';
  posString += '\td = clamp(abs(d) - '+ weight +', 0.0, 1.0);\n';
  posString += '\tfinalColor = mix( finalColor, ' + colorStroke + ', 1.0-smoothstep(0.0,0.003,abs(d)) );\n'
  posString += '\taccumD = min(accumD, d);';

  startShader += posString;
  let fragShader = startShader + endShader;

  return new PRIM.DataShader(fragShader, parameters);
}
//RECTANGE-------------------------------------------------------------------

function hexToRgb(hex) {
  // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
  var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  hex = hex.replace(shorthandRegex, function(m, r, g, b) {
    return r + r + g + g + b + b;
  });

  var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}
