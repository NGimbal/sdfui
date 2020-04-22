'use strict';

export const simpleFrag =
`#version 300 es
precision mediump float;

in vec2 v_texcoord;

uniform sampler2D u_texture;

out vec4 outColor;

void main() {
   outColor = texture(u_texture, v_texcoord);
}`;
//---------------------------------------------
export const simpleVert =
`#version 300 es

in vec4 a_position;
in vec2 a_texcoord;

uniform mat4 u_matrix;
uniform mat4 u_textureMatrix;

out vec2 v_texcoord;

void main() {
  gl_Position = u_matrix * a_position;
  v_texcoord = (u_textureMatrix * vec4(a_texcoord, 0, 1)).xy;
}`;

export const gridFrag =
`#version 300 es
#define saturate(a) clamp(a, 0.0, 1.0)

precision mediump float;

in vec2 v_texcoord;

uniform vec3 u_resolution;
uniform vec3 u_dPt;

out vec4 outColor;

float repeat(float x) { return abs(fract(x*0.25+0.25)-0.5)*2.0; }

void main() {
  outColor = vec4(1.0);
  vec2 uv = vec2(v_texcoord);
  uv.x *= u_resolution.x / u_resolution.y;
  uv -= u_dPt.xy;
  uv *= u_dPt.z;
  // uv.y -= u_dPt.y;
  outColor -= vec4(1.0, 1.0, 0.2, 1.0) * saturate(repeat(uv.x) - 0.92)*4.0;
  outColor -= vec4(1.0, 1.0, 0.2, 1.0) * saturate(repeat(uv.y) - 0.92)*4.0;
}`;
//---------------------------------------------
export const pLineEdit =
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

out vec4 outColor;

//https://www.shadertoy.com/view/4tc3DX
float LineDistField(vec2 uv, vec2 pA, vec2 pB, vec2 thick, float rounded, float dashOn) {
    // Don't let it get more round than circular.
    rounded = min(thick.y, rounded);

    vec2 mid = (pB + pA) * 0.5;
    vec2 delta = pB - pA;
    float lenD = length(delta);
    vec2 unit = delta / lenD;

    // Check for when line endpoints are the same
    if (lenD < 0.0001) unit = vec2(1.0, 0.0);	// if pA and pB are same
    
    // Perpendicular vector to unit - also length 1.0
    vec2 perp = unit.yx * vec2(-1.0, 1.0);
    
    // position along line from midpoint
    float dpx = dot(unit, uv - mid);
    
    // distance away from line at a right angle
    float dpy = dot(perp, uv - mid);
    
    // Make a distance function that is 0 at the transition from black to white
    float disty = abs(dpy) - thick.y + rounded;
    float distx = abs(dpx) - lenD * 0.5 - thick.x + rounded;

    float dist = length(vec2(max(0.0, distx), max(0.0,disty))) - rounded;
    dist = min(dist, max(distx, disty));

    return dist;
}

float drawLine(vec2 uv, vec2 pA, vec2 pB, float weight, float dash){
  float line = LineDistField(uv, pA, pB, vec2(weight), weight, dash);
  // line = 1.0 - smoothstep(0.0, 0.003, line);
  return line;
}

float sdCircle(vec2 uv, vec2 p, float r){
  uv = uv - p;
  return length(uv) - r;
}

//smooth Line Filter
float line(float d, float w){
  d = clamp(abs(d) - w, 0.0, 1.0);
  d = 1.0 - smoothstep(0.0,0.001 * (u_dPt.z * 0.07),abs(d));
  return d;
}

vec3 drawPt(vec2 uv, vec2 p, float dist, vec3 col){
    vec3 color = mix(col, vec3(1.0, 0.25, 0.25), dist);
    return color;
}

float AO(vec2 p, float dist, float radius, float intensity)
{
	float a = clamp(dist / radius, 0.0, 1.0) - 1.0;
	return 1.0 - (pow(abs(a), 5.0) + 1.0) * intensity + (1.0 - intensity);
	//return smoothstep(0.0, 1.0, dist / radius);
}

void main(){
  outColor = vec4(1.0);
  vec2 uv = vec2(v_texcoord);
  uv.x *= u_resolution.x / u_resolution.y;
  uv -= u_dPt.xy;
  uv *= (u_dPt.z / 64.);

  float texelOffset = 0.5 * (1. / (16. * 16.));

  float dist = sdCircle(uv, u_mPt.xy, 0.003);

  vec2 prevPt = texture(u_eTex, vec2(texelOffset, texelOffset)).xy;
  float one = 1.0;
  //may need another texture to display current mouse pos
  if(prevPt == vec2(0.)) {discard;}

  for (float i = 0.; i < 16.; i++ ){
    float yIndex = i / 16. + texelOffset;

    for (float j = 0.; j < 16.; j++ ){
      //this is to skip the first point only;
      j += one;
      one = 0.;

      float xIndex = j / 16.  + texelOffset;
      vec2 vIndex = vec2(xIndex, yIndex);
      vec2 tPt = texture(u_eTex, vIndex).xy;

      if (tPt == vec2(0.)){ break; }

      dist = min(dist, drawLine(uv, prevPt, tPt, u_weight, 0.0));
      dist = min(dist, sdCircle(uv, tPt, 0.003));

      prevPt = tPt;
    }
  }

  dist = min(dist, drawLine(uv, prevPt, u_mPt.xy, u_weight, 1.0));
  dist = line(dist, u_weight);
  vec3 col = mix(vec3(1.0), u_stroke, dist);

  // this is the prev. implementation
  // finalColor = mix(finalColor, strokeColor, 1.0 - clamp(AO(uv, accumD, 0.06, 0.5), 0.0, 1.0));
  // this is not working :(
  // float ao = 1.0 - clamp(AO(uv, dist, 0.06, 0.5), 0.0, 1.0);
  // col = mix(col, u_stroke, ao);
  if ( dist < .0001) discard;

  // dist = 1.0 - smoothstep(0.0,0.005,clamp(dist, 0.0, 1.0));

  //TODO: try alpha = dist, enable gl.BLEND
  outColor = vec4(col, dist);
}`;

//---------------------------------------------
export const pLineStub =
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

uniform vec3 u_idCol;

out vec4 outColor;

//https://www.shadertoy.com/view/4tc3DX
float LineDistField(vec2 uv, vec2 pA, vec2 pB, vec2 thick, float rounded, float dashOn) {
    // Don't let it get more round than circular.
    rounded = min(thick.y, rounded);

    vec2 mid = (pB + pA) * 0.5;
    vec2 delta = pB - pA;
    float lenD = length(delta);
    vec2 unit = delta / lenD;

    // Check for when line endpoints are the same
    if (lenD < 0.0001) unit = vec2(1.0, 0.0);	// if pA and pB are same
    
    // Perpendicular vector to unit - also length 1.0
    vec2 perp = unit.yx * vec2(-1.0, 1.0);
    
    // position along line from midpoint
    float dpx = dot(unit, uv - mid);
    
    // distance away from line at a right angle
    float dpy = dot(perp, uv - mid);
    
    // Make a distance function that is 0 at the transition from black to white
    float disty = abs(dpy) - thick.y + rounded;
    float distx = abs(dpx) - lenD * 0.5 - thick.x + rounded;

    float dist = length(vec2(max(0.0, distx), max(0.0,disty))) - rounded;
    dist = min(dist, max(distx, disty));

    return dist;
}

float drawLine(vec2 uv, vec2 pA, vec2 pB, float weight, float dash){
  float line = LineDistField(uv, pA, pB, vec2(weight), weight, dash);
  // line = 1.0 - smoothstep(0.0, 0.003, line);
  return line;
}

float sdCircle(vec2 uv, vec2 p, float r){
  uv = uv - p;
  return length(uv) - r;
}

//smooth Line Filter
float line(float d, float w){
  d = clamp(abs(d) - w, 0.0, 1.0);
  //very simple lod
  d = 1.0 - smoothstep(0.0,0.001 * (u_dPt.z * 0.07),abs(d));
  return d;
}

vec3 drawPt(vec2 uv, vec2 p, float dist, vec3 col){
    vec3 color = mix(col, vec3(1.0, 0.25, 0.25), dist);
    return color;
}

//$INSERT FUNCTION$------

//$ENDINSERT FUNCTION$---

vec4 sceneDist(vec2 uv) {
  //temp distance
  float d = 1.0;
  //xyz:color, w:cumulative distance 
  vec4 colDist = vec4(1.);
  //index in parameters texture
  vec2 index = vec2(0.);
  //$INSERT CALL$------

  //$ENDINSERT CALL$---
  return colDist;
}

void main(){
  outColor = vec4(u_idCol, 0.125);
  vec2 uv = vec2(v_texcoord);
  uv.x *= u_resolution.x / u_resolution.y;
  // uv.xy = u_scale.xy;
  uv -= u_dPt.xy;
  uv *= (u_dPt.z / 64.);

  vec4 scene = sceneDist(uv);
  vec3 col = scene.xyz;
  float dist = scene.w;

  // dist = line(dist, u_weight);
  // col = mix(vec3(1.0), col, dist);

  // if ( dist < 0.0000000000000001){
  //   discard;
  // }

  if ( dist > 0.0000000000000001){
    outColor = vec4(col, dist);
  }

  // outColor = vec4(col, dist);

  //TODO: try alpha = dist, enable gl.BLEND
  
}`;