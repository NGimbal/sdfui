import {sdCircle, filterLine, filterFill, drawPt, sdLine, sdBox} from "./shaderFunctions"

export const rectangleEdit =
`#version 300 es
#define saturate(a) clamp(a, 0.0, 1.0)

precision mediump float;

in vec2 v_texcoord;

uniform vec3 u_resolution;
uniform vec3 u_dPt;

uniform vec3 u_mPt;

uniform sampler2D u_eTex;
uniform float u_weight;
uniform vec3 u_stroke;
uniform vec3 u_fill;
uniform float u_opacity;
uniform float u_radius;

// out vec4 outColor;
layout(location = 0) out vec4 outColor;
layout(location = 1) out vec4 outColorDist;

${sdCircle}
${sdBox}
${filterLine}
${filterFill}

void main(){
  outColor = vec4(1.0);
  vec2 uv = v_texcoord;
  uv.x *= u_resolution.x / u_resolution.y;
  uv -= u_dPt.xy;
  uv *= (u_dPt.z / 64.);

  float texelOffset = 0.5 * (1. / (16. * 16.));

  vec2 topLeft = texture(u_eTex, vec2(texelOffset, texelOffset)).xy;
  vec2 rect = vec2(0.20225, 0.125);
  vec2 flipX = vec2(-1.0, -1.0);

  vec2 center = u_mPt.xy - rect * flipX;

  float dist = sdBox(uv, center, rect, u_radius);

  if(topLeft.x != 0.0){
    center = 0.5 * (u_mPt.xy - topLeft.xy) + topLeft.xy;
    vec2 rPt = abs(u_mPt.xy - center);
    dist = sdBox(uv, center, rPt, u_radius);
  }

  //stroke
  float stroke = line(dist, u_weight);
  vec4 strokeCol = mix(vec4(vec3(1.),0.), vec4(u_stroke,stroke) , stroke);
  float fill = fillMask(dist);
  vec4 fillCol = mix(vec4(vec3(1.),0.), vec4(u_fill, u_opacity), fill);

  dist = min(stroke, fill);

  if ( dist + fill < 0.01) discard;

  outColor = vec4(vec3(fillCol.rgb * strokeCol.rgb), fillCol.a + strokeCol.a);
  outColorDist = vec4(vec3(fill),1.0);
}`;

//---------------------------------------------
export const rectangleStub =
`#version 300 es
#define saturate(a) clamp(a, 0.0, 1.0)

precision mediump float;

in vec2 v_texcoord;

uniform vec3 u_resolution;
uniform vec3 u_dPt;

uniform vec3 u_scale;

uniform sampler2D u_eTex;
uniform float u_weight;
uniform vec3 u_stroke;
uniform vec3 u_fill;
uniform float u_opacity;
uniform float u_radius;

uniform vec3 u_idCol;

// out vec4 outColor;
layout(location = 0) out vec4 outColor;
layout(location = 1) out vec4 outColorDist;

${sdCircle}
${sdBox}
${filterLine}
${filterFill}
${drawPt}

void main(){
  outColor = vec4(u_idCol, 0.125);
  vec2 uv = v_texcoord;
  uv.x *= u_resolution.x / u_resolution.y;
  uv -= u_dPt.xy;
  uv *= (u_dPt.z / 64.);
  float d = 0.0;

  //$INSERT CALL$------

  //$ENDINSERT CALL$---
  
  outColorDist = vec4(vec3(d),1.0);
}`;