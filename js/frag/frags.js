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
//---------------------------------------------
export const imgFrag =
`#version 300 es
precision highp float;
 
in vec2 v_texcoord;
 
uniform sampler2D u_img;
uniform vec3 u_resolution;
uniform vec3 u_dPt;

out vec4 outColor;
 
void main() {
  vec2 uv = vec2(v_texcoord);
  uv.x *= u_resolution.x / u_resolution.y;
  uv -= u_dPt.xy;
  uv *= u_dPt.z / 64.;

  outColor = texture(u_img, uv);
}`
//---------------------------------------------
// export const gridFrag =
// `#version 300 es
// #define saturate(a) clamp(a, 0.0, 1.0)

// precision mediump float;

// in vec2 v_texcoord;

// uniform vec3 u_resolution;
// uniform vec3 u_dPt;

// out vec4 outColor;

// float repeat(float x) { return abs(fract(x*0.5+0.5)-0.5)*2.0; }

// void main() {
//   outColor = vec4(1.0);
//   vec2 uv = vec2(v_texcoord);
//   uv.x *= u_resolution.x / u_resolution.y;
//   uv -= u_dPt.xy;
//   uv *= u_dPt.z;
//   // uv.y -= u_dPt.y;
//   outColor -= vec4(1.0, 1.0, 0.2, 1.0) * saturate(repeat(uv.x) - 0.92)*4.0;
//   outColor -= vec4(1.0, 1.0, 0.2, 1.0) * saturate(repeat(uv.y) - 0.92)*4.0;
// }`;
//---------------------------------------------
export const gridFrag =
`#version 300 es
#define saturate(a) clamp(a, 0.0, 1.0)

precision mediump float;

in vec2 v_texcoord;

uniform vec3 u_resolution;
uniform vec3 u_dPt;

out vec4 outColor;

// float repeat(float x) { return abs(fract(x*0.5+0.5)-0.5)*2.0; }
float gridMnr(float x) { return abs(fract(x*0.5+0.5)-0.5) * 2.; }
float gridMjr(float x) { return abs(fract(x*0.5+0.5)-0.5) * 2.; }

void main() {
  outColor = vec4(1.0);
  vec2 uv = vec2(v_texcoord);
  uv.x *= u_resolution.x / u_resolution.y;
  vec2 q = vec2(v_texcoord);
  uv -= u_dPt.xy;
  uv *= u_dPt.z;

  // vec2 q = uv-0.5;

  //https://www.shadertoy.com/view/XtVcWc - beautiful grid
  // vec3 col = vec3(1.0) - smoothstep(0.018,0.0, abs(uv.x-0.05))*vec3(.25,0.17,0.02);
  // col -= smoothstep(0.018,0.0, abs(uv.y-0.05))*vec3(.25,0.17,0.02);
  // vec2 rp = mod(uv,0.75)-0.05;
  // vec2 rp = fract(x*0.5+0.5)-0.5;
  
  vec3 col = vec3(1.) - smoothstep( (u_dPt.z * 0.001),0.0, abs(gridMnr(uv.x)))*vec3(.25,0.15,0.02);
  col -= smoothstep((u_dPt.z * 0.001), 0.0, abs(gridMnr(uv.y)))*vec3(.25,0.15,0.02);
  
  col -= (smoothstep( (u_dPt.z * 0.0002),0.0, abs(gridMnr(uv.x / 12.)))*vec3(0.,0.77,0.7)) * 0.25;
  col -= (smoothstep((u_dPt.z * 0.0002), 0.0, abs(gridMnr(uv.y / 12.)))*vec3(0.,0.77,0.7)) * 0.25;
  
  // subtle paper texture
  // col *= (smoothstep(0.26,.25,(fract(sin(dot(uv.x, uv.y))*150130.1)))*0.03+0.97)*vec3(1.005,1.,0.99);
  //vignette
  // col *= clamp(pow( 256.0*q.x*q.y*(1.0-q.x)*(1.0-q.y), .09 ),0.,1.)*.325+0.7;

  outColor = vec4(col,1.0);
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
uniform float u_opacity;

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
  d = 1.0 - smoothstep(0.0,0.00004 * u_dPt.z,abs(d));
  return d;
}

vec3 drawPt(vec2 uv, vec2 p, float dist, vec3 col){
    vec3 color = mix(col, vec3(1.0, 0.25, 0.25), dist);
    return color;
}

float ao2D_simple(float d, float pixSize, float width, float coef)
{
	float max_dist = pixSize * width * 3.0;
	float dRef = max_dist * coef;
	if (d <= max_dist)
		return clamp(d, 0.0, dRef) / dRef;
	return 1.0;
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

  // float ao = dist;

  dist = line(dist, u_weight);
  vec3 col = mix(vec3(1.0), u_stroke, dist);
  
  //ao interface hint for edit object...would be nice
  // can't figure out how to properly set opacity with this
  // ao = 0.75 + 0.25*smoothstep( 0.0, 0.13, sqrt(ao) );
  // col *= ao;
  if ( dist < 0.001) discard;



  // outColor = vec4(col, (dist + ao) * 0.5);
  outColor = vec4(col, dist * u_opacity);
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
uniform float u_opacity;

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
  d = 1.0 - smoothstep(0.0,0.00004 * u_dPt.z,abs(d));
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

  if ( dist < 0.0000000000000001){
    discard;
  }

  // if ( dist > 0.0000000000000001){
  //   outColor = vec4(col, dist);
  // }

  outColor = vec4(col, dist * u_opacity);

  //TODO: try alpha = dist, enable gl.BLEND
  
}`;
//---------------------------------------------
export const polygonEdit =
`#version 300 es
#define saturate(a) clamp(a, 0.0, 1.0)

precision mediump float;

in vec2 v_texcoord;

uniform vec3 u_resolution;
uniform vec3 u_dPt;

uniform vec3 u_mPt;

uniform sampler2D u_eTex;
uniform float u_cTex;
uniform float u_weight;
uniform vec3 u_stroke;
uniform vec3 u_fill;
uniform float u_opacity;

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
  d = 1.0 - smoothstep(0.0,0.00004 * u_dPt.z,abs(d));
  return d;
}

// fill
float fillMask(float dist){
	return smoothstep(0.0,0.003, clamp(-dist, 0.0, 1.0));
}

vec3 drawPt(vec2 uv, vec2 p, float dist, vec3 col){
    vec3 color = mix(col, vec3(1.0, 0.25, 0.25), dist);
    return color;
}

float AO(vec2 p, float dist, float radius, float intensity){
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

  vec2 first = texture(u_eTex, vec2(0./16. + texelOffset, 0./16. + texelOffset)).xy;

  float iX = (mod(u_cTex, 16.) / 16.) + texelOffset;
  float iY = (floor(u_cTex / 16.) / 16.) + texelOffset;

  vec2 last = texture(u_eTex, vec2(iX, iY)).xy;
  dist = dot(uv - first, uv - first);
  vec2 prevPt = last;

  //may need another texture to display current mouse pos
  // if(prevPt == vec2(0.)) {discard;}
  
  float s = 1.0;
  for (float i = 0.; i < 16.; i++ ){
    float yIndex = i / 16. + texelOffset;
    for (float j = 0.; j < 16.; j++ ){
      float xIndex = j / 16.  + texelOffset;
      vec2 vIndex = vec2(xIndex, yIndex);

      vec2 tPt = texture(u_eTex, vIndex).xy;

      if (tPt == vec2(0.)){ break; }

      // https://www.shadertoy.com/view/wdBXRW iq signed distance to polygon
      if (prevPt != vec2(0.)){
        vec2 e = prevPt - tPt;
        vec2 w = uv - tPt;
        vec2 b = w - e*clamp( dot(w,e)/dot(e,e), 0.0, 1.0 );
        dist = min( dist, dot(b,b) );

        // winding number from http://geomalgorithms.com/a03-_inclusion.html
        bvec3 cond = bvec3( uv.y>=tPt.y, uv.y<prevPt.y, e.x*w.y>e.y*w.x );
        if( all(cond) || all(not(cond)) ) s*=-1.0;

        prevPt = tPt;
      }
    }
  }

  dist = s*sqrt(dist);


  float fill = fillMask(dist);
  vec4 fillCol = mix(vec4(vec3(1.),0.), vec4(u_fill, u_opacity), fill);

  if (prevPt != vec2(0.)){
    dist = min(dist, drawLine(uv, prevPt, u_mPt.xy, u_weight / 2., 0.0));
    dist = min(dist, drawLine(uv, u_mPt.xy, first, u_weight / 2., 0.0));
  }

  float stroke = line(dist, u_weight);
  vec4 strokeCol = mix(vec4(vec3(1.),0.), vec4(u_stroke,stroke) , stroke);
  
  dist = min(stroke, fill);
  
  if ( dist > 1.) discard;

  outColor = vec4(vec3(fillCol.rgb * strokeCol.rgb), fillCol.a + strokeCol.a);
}`;

//---------------------------------------------
export const polygonStub =
`#version 300 es
#define saturate(a) clamp(a, 0.0, 1.0)

precision mediump float;

in vec2 v_texcoord;

uniform vec3 u_resolution;
uniform vec3 u_dPt;

uniform vec3 u_scale;

uniform sampler2D u_eTex;
uniform float u_cTex;
uniform float u_weight;
uniform vec3 u_stroke;
uniform vec3 u_fill;
uniform float u_opacity;

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
  d = 1.0 - smoothstep(0.0,0.00004 * u_dPt.z,abs(d));
  return d;
}

// fill
float fillMask(float dist){
	return smoothstep(0.0,0.003, clamp(-dist, 0.0, 1.0));
}

vec3 drawPt(vec2 uv, vec2 p, float dist, vec3 col){
    vec3 color = mix(col, vec3(1.0, 0.25, 0.25), dist);
    return color;
}

//smooth sdf Iso
vec3 sdf(vec2 uv, float d){
  vec3 col = vec3(1.0) - sign(d)*vec3(0.1,0.4,0.7);
	col *= 1.0 - exp(-3.0*abs(d));
	col *= 0.8 + 0.2*cos(150.0*d);
	col = mix( col, vec3(1.0), 1.0-smoothstep(0.0,0.003,abs(d)));
  return col;
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
  outColor = vec4(u_idCol, 0.25);
  vec2 uv = vec2(v_texcoord);
  uv.x *= u_resolution.x / u_resolution.y;
  uv -= u_dPt.xy;
  uv *= (u_dPt.z / 64.);

  vec4 scene = sceneDist(uv);
  float d = scene.w;

  float fill = fillMask(d);
  vec4 fillCol = mix(vec4(vec3(1.),0.), vec4(u_fill, u_opacity), fill);
  float stroke = line(d, u_weight);
  vec4 strokeCol = mix(vec4(vec3(1.),0.), vec4(u_stroke,stroke) , stroke);
  
  float dist = min(stroke, fill);

  if ( dist > 1.){
    discard;
  }

  outColor = vec4(vec3(fillCol.rgb * strokeCol.rgb), fillCol.a + strokeCol.a);
  // outColor = vec4(vec3(0.), scene.w);
}`;

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

out vec4 outColor;

float sdCircle(vec2 uv, vec2 p, float r){
  uv = uv - p;
  return length(uv) - r;
}

//smooth Line Filter
float line(float d, float w){
  d = clamp(abs(d) - w, 0.0, 1.0);
  d = 1.0 - smoothstep(0.0,0.00004 * u_dPt.z,abs(d));
  return d;
}

// fill
float fillMask(float dist){
	return smoothstep(0.0,0.003, clamp(-dist, 0.0, 1.0));
}

vec3 drawPt(vec2 uv, vec2 p, float dist, vec3 col){
    vec3 color = mix(col, vec3(1.0, 0.25, 0.25), dist);
    return color;
}

float AO(vec2 p, float dist, float radius, float intensity){
	float a = clamp(dist / radius, 0.0, 1.0) - 1.0;
	return 1.0 - (pow(abs(a), 5.0) + 1.0) * intensity + (1.0 - intensity);
}

void main(){
  outColor = vec4(1.0);
  vec2 uv = vec2(v_texcoord);
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

  if ( dist > 1.) discard;

  outColor = vec4(vec3(fillCol.rgb * strokeCol.rgb), fillCol.a + strokeCol.a);
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

out vec4 outColor;

float sdCircle(vec2 uv, vec2 p, float r){
  uv = uv - p;
  return length(uv) - r;
}

//smooth Line Filter
float line(float d, float w){
  d = clamp(abs(d) - w, 0.0, 1.0);
  //very simple lod
  d = 1.0 - smoothstep(0.0,0.00004 * u_dPt.z,abs(d));
  return d;
}

// fill
float fillMask(float dist){
	return smoothstep(0.0,0.003, clamp(-dist, 0.0, 1.0));
}

vec3 drawPt(vec2 uv, vec2 p, float dist, vec3 col){
    vec3 color = mix(col, vec3(1.0, 0.25, 0.25), dist);
    return color;
}

void main(){
  outColor = vec4(u_idCol, 0.125);
  vec2 uv = vec2(v_texcoord);
  uv.x *= u_resolution.x / u_resolution.y;
  uv -= u_dPt.xy;
  uv *= (u_dPt.z / 64.);

  //$INSERT CALL$------

  //$ENDINSERT CALL$---
}`;
//---------------------------------------------

//RECTANGLE
//---------------------------------------------
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

out vec4 outColor;

float sdCircle(vec2 uv, vec2 p, float r){
  uv = uv - p;
  return length(uv) - r;
}

//uv, p translation point, b 1/2 length, width, r radius
float sdBox( in vec2 uv, in vec2 p, in vec2 b , in float r)
{
    b -= r;
    uv = (uv-p);
    vec2 d = abs(uv)-b;
    return length(max(d,vec2(0))) + min(max(d.x,d.y),0.0) - r;
}

//smooth Line Filter
float line(float d, float w){
  d = clamp(abs(d) - w, 0.0, 1.0);
  d = 1.0 - smoothstep(0.0,0.00004 * u_dPt.z,abs(d));
  return d;
}

// fill
float fillMask(float dist){
	return smoothstep(0.0,0.003, clamp(-dist, 0.0, 1.0));
}

vec3 drawPt(vec2 uv, vec2 p, float dist, vec3 col){
    vec3 color = mix(col, vec3(1.0, 0.25, 0.25), dist);
    return color;
}

float AO(vec2 p, float dist, float radius, float intensity){
	float a = clamp(dist / radius, 0.0, 1.0) - 1.0;
	return 1.0 - (pow(abs(a), 5.0) + 1.0) * intensity + (1.0 - intensity);
}

void main(){
  outColor = vec4(1.0);
  vec2 uv = vec2(v_texcoord);
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

  if ( dist > 1.) discard;

  outColor = vec4(vec3(fillCol.rgb * strokeCol.rgb), fillCol.a + strokeCol.a);
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

out vec4 outColor;

float sdCircle(vec2 uv, vec2 p, float r){
  uv = uv - p;
  return length(uv) - r;
}

//uv, p translation point, b 1/2 length, width, r radius
float sdBox( in vec2 uv, in vec2 p, in vec2 b , in float r)
{
    b -= r;
    uv = (uv-p);
    vec2 d = abs(uv)-b;
    return length(max(d,vec2(0))) + min(max(d.x,d.y),0.0) - r;
}


//smooth Line Filter
float line(float d, float w){
  d = clamp(abs(d) - w, 0.0, 1.0);
  //very simple lod
  d = 1.0 - smoothstep(0.0,0.00004 * u_dPt.z,abs(d));
  return d;
}

// fill
float fillMask(float dist){
	return smoothstep(0.0,0.003, clamp(-dist, 0.0, 1.0));
}

vec3 drawPt(vec2 uv, vec2 p, float dist, vec3 col){
    vec3 color = mix(col, vec3(1.0, 0.25, 0.25), dist);
    return color;
}

void main(){
  outColor = vec4(u_idCol, 0.125);
  vec2 uv = vec2(v_texcoord);
  uv.x *= u_resolution.x / u_resolution.y;
  uv -= u_dPt.xy;
  uv *= (u_dPt.z / 64.);

  //$INSERT CALL$------

  //$ENDINSERT CALL$---
}`;
//---------------------------------------------