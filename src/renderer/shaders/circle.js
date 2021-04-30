import {sdCircle, filterLine, filterFill, drawPt} from "./shaderFunctions"

//---------------------------------------------
export const circleEdit =
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

layout(location = 0) out vec4 outColor;
layout(location = 1) out vec4 outColorDist;

${sdCircle}
${filterLine}
${filterFill}

void main(){
  outColor = vec4(1.0);
  vec2 uv = v_texcoord;
  uv.x *= u_resolution.x / u_resolution.y;
  uv -= u_dPt.xy;
  uv *= (u_dPt.z / 64.);

  float texelOffset = 0.5 * (1. / (16. * 16.));

  float dist = sdCircle(uv, u_mPt.xy, 0.125);
  
  vec2 center = texture(u_eTex, vec2(texelOffset, texelOffset)).xy;

  if(center.x != 0.0){
    vec2 rPt = u_mPt.xy;
    float radius = distance(center, rPt);
    dist = sdCircle(uv, center, radius);
  }

  //stroke
  float stroke = line(dist, u_weight);
  vec4 strokeCol = mix(vec4(vec3(1.),0.), vec4(u_stroke,stroke) , stroke);
  float fill = fillMask(dist);
  vec4 fillCol = mix(vec4(vec3(1.),0.), vec4(u_fill, u_opacity), fill);

  dist = min(stroke, fill);

  if ( stroke + fill < 0.01) discard;

  outColor = vec4(vec3(fillCol.rgb * strokeCol.rgb), fillCol.a + strokeCol.a);
  outColorDist = vec4(vec3(dist),1.0);
}`;

//---------------------------------------------
export const circleStub =
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

uniform vec3 u_idCol;

// out vec4 outColor;
layout(location = 0) out vec4 outColor;
layout(location = 1) out vec4 outColorDist;

${sdCircle}
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
  outColorDist = vec4(vec3(d), 1.0);
}`;