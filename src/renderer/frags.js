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
export const imgVert =
`#version 300 es

in vec4 a_position;
in vec2 a_texcoord;

uniform mat4 u_matrix;

out vec2 v_texcoord;

void main() {
  gl_Position = u_matrix * a_position;
  v_texcoord = a_texcoord;
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
  vec2 uv = v_texcoord;

  outColor = texture(u_img, uv);
}`

//---------------------------------------------
export const distFrag =
`#version 300 es
precision highp float;
 
in vec2 v_texcoord;
 
uniform sampler2D u_distTex;
uniform vec3 u_resolution;
uniform vec3 u_dPt;

out vec4 outColor;

void main() {
  vec2 uv = v_texcoord;
  // flip x for some reason
  // uv.x = abs(uv.x - (u_resolution.x/1000.0)) - 0.5;
  uv.x = (u_resolution.x/1000.0) - uv.x - 0.5;
  
  vec4 dist = texture(u_distTex, uv);
  outColor = mix(dist, vec4(1.0,0.0,0.0,0.25), dist.x);
}`
//---------------------------------------------
export const demoFrag =
`#version 300 es
precision mediump float;

in vec2 v_texcoord;

uniform sampler2D u_eTex;
uniform vec3 u_dPt;
uniform vec3 u_resolution;

out vec4 outColor;

void main() {
  vec2 uv = v_texcoord;
  uv.x *= u_resolution.x / u_resolution.y;
  uv -= u_dPt.xy;
  uv *= u_dPt.z;

  outColor = vec4(uv.x, uv.y, 0.0, 1.0);
}`;
//---------------------------------------------
export const raymarchFrag =
`#version 300 es

#define MAX_STEPS 100
#define SURF_DIST 0.053
#define MAX_DIST 100.0

precision mediump float;

in vec2 v_texcoord;

uniform sampler2D u_eTex;
uniform vec3 u_dPt;
uniform vec3 u_resolution;

out vec4 outColor;

//vec4 sphere is (xyz, r)
float sdSphere(vec3 p, vec4 sphere){
	return length(p - sphere.xyz) - sphere.w;
}

float sdYPlane(vec3 p, float y){
	return p.y - y;
}

float sceneDist(vec3 p) {
	float d1 = sdSphere(p, vec4(2.25,2.25,8.0,1.0));
  float d2 = sdYPlane(p, 0.);
  return d1;
}


vec3 getNormal(vec3 p){
	float d = sceneDist(p);
  vec2 e = vec2(0.01, 0.);
  
  vec3 n = d - vec3(sceneDist(p-e.xyy),
                    sceneDist(p-e.yxy),
                    sceneDist(p-e.yyx));
  
  return normalize(n);                    
}


float raymarch(vec3 ro, vec3 rd){
	float dO = 0.;
    for(int i = 0; i<MAX_STEPS; i++){
    	vec3 p = ro + dO*rd;
        float dS = sceneDist(p);
        dO += dS;
        if(dS < SURF_DIST || dO>MAX_DIST) break;
    }
    return dO;
}


float getLight(vec3 p){
	vec3 lightPos = vec3(2., 1., 6.);
    //light direction
    vec3 lightDir = normalize(lightPos - p);
    vec3 n = getNormal(p);
    
    float dif = clamp(dot(n,lightDir), 0., 1.);
    
    float d = raymarch(p + n * SURF_DIST, lightDir);
    if( d < length(lightPos - p)) dif *= .1;
    return dif;
}

void main(){
  // Normalized pixel coordinates (from 0 to 1)
  vec2 uv = v_texcoord;
  uv.x *= u_resolution.x / u_resolution.y;
  //vec2 uv = (v_texcoord-0.5*u_resolution.xy)/u_resolution.y;
  uv -= u_dPt.xy;
  uv *= u_dPt.z / 100.;

  //ray origin ray direction, simple camera
  vec3 ro = vec3(.125, 0.125, 0.01);
  vec3 rd = normalize(vec3(uv.x,uv.y,1.));
  
  float d = raymarch(ro, rd);
  //d /= 10.0;
  
  vec3 p = ro + rd * d;
  float dif = getLight(p);
  
  //vec3 col = vec3(d);
  vec3 col = vec3(getLight(p));
      
  // Output to screen
  outColor = vec4(col,smoothstep(0.0, 0.001, 1.0 - (d / 7.75)));
}`;
//---------------------------------------------
export const gridFrag =
`#version 300 es
#define saturate(a) clamp(a, 0.0, 1.0)

precision mediump float;

in vec2 v_texcoord;

uniform vec3 u_resolution;
uniform vec3 u_dPt;

// out vec4 outColor;
layout(location = 0) out vec4 outColor;
layout(location = 1) out vec4 outColorDist;

// float repeat(float x) { return abs(fract(x*0.5+0.5)-0.5)*2.0; }
float gridMnr(float x) { return abs(fract(x*0.5+0.5)-0.5) * 2.; }

void main() {
  // outColor = vec4(1.00);

  vec2 uv = v_texcoord;
  uv.x *= u_resolution.x / u_resolution.y;
  uv -= u_dPt.xy;
  uv *= u_dPt.z;

  vec2 q = v_texcoord;

  //https://www.shadertoy.com/view/XtVcWc - beautiful grid
  
  // red lines
  // vec3(x) is background color
  vec3 col = vec3(1.0) - smoothstep( (u_dPt.z * 0.001),0.0, abs(gridMnr(uv.x)))*vec3(.25,0.15,0.02);
  col -= smoothstep((u_dPt.z * 0.001), 0.0, abs(gridMnr(uv.y)))*vec3(.25,0.15,0.02);
  
  // blue lines
  col -= (smoothstep( (u_dPt.z * 0.00015),0.0, abs(gridMnr(uv.x / 12.)))*vec3(0.,0.77,0.7)) * 0.25;
  col -= (smoothstep((u_dPt.z * 0.00015), 0.0, abs(gridMnr(uv.y / 12.)))*vec3(0.,0.77,0.7)) * 0.25;
  
  // subtle paper texture
  //col *= (smoothstep(0.26,.25,(fract(sin(dot(uv.x, uv.y))*150130.1)))*0.03+0.97)*vec3(1.005,1.,0.99);
  //vignette
  //col *= clamp(pow( 256.0*q.x*q.y*(1.0-q.x)*(1.0-q.y), .09 ),0.,1.)*.325+0.7;

  outColor = vec4(col,1.0);
  outColorDist = vec4(0.0);
}`;
//---------------------------------------------
export const uiFrag =
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

uniform vec3 u_boxSel;
uniform float u_boxState;

// out vec4 outColor;
layout(location = 0) out vec4 outColor;
layout(location = 1) out vec4 outColorDist;

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

// fill
float fillMask(float dist){
	return smoothstep(0.0,0.003, clamp(-dist, 0.0, 1.0));
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

void main(){
  outColor = vec4(1.0);
  vec2 uv = v_texcoord;
  uv.x *= u_resolution.x / u_resolution.y;
  uv -= u_dPt.xy;
  uv *= (u_dPt.z / 64.);

  float texelOffset = 0.5 * (1. / (16. * 16.));

  float dist = line(sdCircle(uv, u_mPt.xy, 0.008 + u_weight), 0.00075);

  vec2 center = 0.5 * (u_mPt.xy - u_boxSel.xy) + u_boxSel.xy;
  vec2 rPt = abs(u_mPt.xy - center);
  float box = sdBox(uv, center, rPt, 0.001);

  float stroke = line(box, 0.0);
  vec3 strokeCol = mix(vec3(1.), vec3(0.2745, 0.5098, 0.7059), stroke);
  strokeCol *= u_boxState;
  
  dist = max(dist, min(stroke, u_boxState));

  vec3 col = mix(vec3(1.0),u_stroke, dist);

  if ( dist < 0.0001) discard;

  outColor = vec4(col, dist);
  outColorDist = vec4(0.0);
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

// out vec4 outColor;
layout(location = 0) out vec4 outColor;
layout(location = 1) out vec4 outColorDist;

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

void main(){
  outColor = vec4(1.0);
  vec2 uv = v_texcoord;
  uv.x *= u_resolution.x / u_resolution.y;
  uv -= u_dPt.xy;
  uv *= (u_dPt.z / 64.);

  float texelOffset = 0.5 * (1. / (16. * 16.));

  float dist = 10.0;

  vec2 prevPt = texture(u_eTex, vec2(texelOffset, texelOffset)).xy;
  float one = 1.0;

  if(prevPt == vec2(0.)) {discard;}

  //drop shadow
  vec2 dShTrans = normalize(vec2(-1. * u_weight, u_weight))*u_weight;
  float dSh = 10.0;

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
      dSh = min(dSh, drawLine(uv - dShTrans, prevPt, tPt, u_weight, 0.0));
      //dist = min(dist, sdCircle(uv, tPt, 0.003));

      prevPt = tPt;
    }
  }

  dist = min(dist, drawLine(uv, prevPt, u_mPt.xy, u_weight, 1.0));
  dSh = min(dSh, drawLine(uv - dShTrans, prevPt, u_mPt.xy, u_weight, 1.0));

  dist = line(dist, u_weight);
  vec3 col = mix(vec3(1.0), u_stroke, dist);
  dSh = (1. - smoothstep(0., 0.15, sqrt(dSh)))*.25;
  //col = mix(col, vec3(0), dSh);

  if ( dist + dSh < 0.001) discard;

  //outColor = vec4(col, dist + (1. - smoothstep(0., 0.15, sqrt(dSh))));
  outColor = vec4(col * vec3(max(dSh, dist)), (dist + dSh) * u_opacity);
  outColorDist = vec4(vec3(dist),1.0);
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
uniform float u_sel;

// out vec4 outColor;
layout(location = 0) out vec4 outColor;
layout(location = 1) out vec4 outColorDist;

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

  vec2 uv = v_texcoord;
  uv.x *= u_resolution.x / u_resolution.y;
  uv -= u_dPt.xy;
  uv *= (u_dPt.z / 64.);

  vec4 scene = sceneDist(uv);

  outColorDist = vec4(vec3(scene.w),1.0);

  vec3 col = scene.xyz;
  float dist = line(scene.w, u_weight);

  //drop shadow
  vec2 dShTrans = normalize(vec2(-1. * u_weight, u_weight))*u_weight;

  float dSh = sceneDist(uv - dShTrans).w;
  dSh = (1. - smoothstep(0., 0.15, sqrt(dSh)))*.25;
  dSh *= u_sel;
  
  if ( dist + dSh < 0.01){
    discard;
  }

  outColor = vec4(col * vec3(max(dSh, dist)), (dist + dSh) * u_opacity);
  outColorDist = vec4(vec3(dist),1.0);
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

// out vec4 outColor;
layout(location = 0) out vec4 outColor;
layout(location = 1) out vec4 outColorDist;

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

void main(){
  outColor = vec4(1.0);
  vec2 uv = v_texcoord;
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

  //drop shadow
  vec2 dShTrans = normalize(vec2(-0.125, 0.125))*.01;
  float dSh = 10.0;

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

        // vec2 wDSh = (uv - dShTrans) - tPt;
        // vec2 bDSh = wDSh - e*clamp( dot(wDSh,e)/dot(e,e), 0.0, 1.0 );
        // dSh = min(dSh, dot(bDSh, bDSh));

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

    // dSh = min(dSh, drawLine(uv - dShTrans, prevPt, u_mPt.xy, u_weight / 2.0, 0.0));
    // dSh = min(dSh, drawLine(uv - dShTrans, u_mPt.xy, first, u_weight / 2.0, 0.0));
  }

  float stroke = line(dist, u_weight);
  vec4 strokeCol = mix(vec4(vec3(1.),0.), vec4(u_stroke,stroke) , stroke);
  
  // dSh = (1. - smoothstep(0., 0.15, sqrt(dSh)))*.25;

  dist = min(stroke, fill);
  
  if ( stroke + fill < 0.01) discard;

  outColor = vec4(vec3(fillCol.rgb * strokeCol.rgb), fillCol.a + strokeCol.a);
  outColorDist = vec4(vec3(dist),1.0);
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

// out vec4 outColor;
layout(location = 0) out vec4 outColor;
layout(location = 1) out vec4 outColorDist;

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
  vec2 uv = v_texcoord;
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

  if ( stroke + fill < 0.01) discard;

  outColor = vec4(vec3(fillCol.rgb * strokeCol.rgb), fillCol.a + strokeCol.a);
  outColorDist = vec4(vec3(dist),1.0);
}`;
//CIRCLE
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

// out vec4 outColor;
layout(location = 0) out vec4 outColor;
layout(location = 1) out vec4 outColorDist;

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
  vec2 uv = v_texcoord;
  uv.x *= u_resolution.x / u_resolution.y;
  uv -= u_dPt.xy;
  uv *= (u_dPt.z / 64.);
  float d = 0.0;

  //$INSERT CALL$------

  //$ENDINSERT CALL$---
  outColorDist = vec4(vec3(d), 1.0);
}`;
//---------------------------------------------
//ELLIPSE
//---------------------------------------------
export const ellipseEdit =
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

// out vec4 outColor;
layout(location = 0) out vec4 outColor;
layout(location = 1) out vec4 outColorDist;

float msign(in float x) { return (x<0.0)?-1.0:1.0; }

float sdCircle(vec2 uv, vec2 p, float r){
  uv = uv - p;
  return length(uv) - r;
}

// https://www.shadertoy.com/view/tt3yz7
float sdEllipse( vec2 p, vec2 e )
{
    vec2 pAbs = abs(p);
    vec2 ei = 1.0 / e;
    vec2 e2 = e*e;
    vec2 ve = ei * vec2(e2.x - e2.y, e2.y - e2.x);
    
    vec2 t = vec2(0.70710678118654752, 0.70710678118654752);
    for (int i = 0; i < 3; i++) {
        vec2 v = ve*t*t*t;
        vec2 u = normalize(pAbs - v) * length(t * e - v);
        vec2 w = ei * (v + u);
        t = normalize(clamp(w, 0.0, 1.0));
    }
    
    vec2 nearestAbs = t * e;
    float dist = length(pAbs - nearestAbs);
    return dot(pAbs, pAbs) < dot(nearestAbs, nearestAbs) ? -dist : dist;
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

//smooth sdf Iso
vec3 sdfMask(vec2 uv, float d){
  vec3 col = vec3(1.0) - sign(d)*vec3(0.1,0.4,0.7);
	col *= 1.0 - exp(-3.0*abs(d));
	col *= 0.8 + 0.2*cos(150.0*d);
	col = mix( col, vec3(1.0), 1.0-smoothstep(0.0,0.003,abs(d)));
  return col;
}

void main(){
  outColor = vec4(1.0);
  vec2 uv = v_texcoord;
  uv.x *= u_resolution.x / u_resolution.y;
  uv -= u_dPt.xy;
  uv *= (u_dPt.z / 64.);

  float texelOffset = 0.5 * (1. / (16. * 16.));

  float dist = sdEllipse(uv - u_mPt.xy, vec2(0.125, 0.0625));
  
  vec2 center = texture(u_eTex, vec2(texelOffset, texelOffset)).xy;

  if(center.x != 0.0){
    // vec2 rPt = u_mPt.xy;
    // float radius = distance(center, rPt);
    dist = sdEllipse(uv - center, max(abs(u_mPt.xy - center), vec2(0.01,0.01)));
  }

  //stroke
  float stroke = line(dist, u_weight);
  vec4 strokeCol = mix(vec4(vec3(1.),0.), vec4(u_stroke,stroke) , stroke);
  float fill = fillMask(dist);
  vec4 fillCol = mix(vec4(vec3(1.),0.), vec4(u_fill, u_opacity), fill);

  dist = min(stroke, fill);

  if ( fill + stroke < 0.01) discard;

  outColor = vec4(vec3(fillCol.rgb * strokeCol.rgb), fillCol.a + strokeCol.a);
  outColorDist = vec4(vec3(dist),1.0);
}`;

//---------------------------------------------
export const ellipseStub =
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

float msign(in float x) { return (x<0.0)?-1.0:1.0; }

float sdCircle(vec2 uv, vec2 p, float r){
  uv = uv - p;
  return length(uv) - r;
}

// https://www.shadertoy.com/view/tt3yz7
float sdEllipse( vec2 p, vec2 e )
{
    vec2 pAbs = abs(p);
    vec2 ei = 1.0 / e;
    vec2 e2 = e*e;
    vec2 ve = ei * vec2(e2.x - e2.y, e2.y - e2.x);
    
    vec2 t = vec2(0.70710678118654752, 0.70710678118654752);
    for (int i = 0; i < 3; i++) {
        vec2 v = ve*t*t*t;
        vec2 u = normalize(pAbs - v) * length(t * e - v);
        vec2 w = ei * (v + u);
        t = normalize(clamp(w, 0.0, 1.0));
    }
    
    vec2 nearestAbs = t * e;
    float dist = length(pAbs - nearestAbs);
    return dot(pAbs, pAbs) < dot(nearestAbs, nearestAbs) ? -dist : dist;
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
  vec2 uv = v_texcoord;
  uv.x *= u_resolution.x / u_resolution.y;
  uv -= u_dPt.xy;
  uv *= (u_dPt.z / 64.);
  float d = 0.0;

  //$INSERT CALL$------

  //$ENDINSERT CALL$---  
  outColorDist = vec4(vec3(d),1.0);
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

// out vec4 outColor;
layout(location = 0) out vec4 outColor;
layout(location = 1) out vec4 outColorDist;

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
  vec2 uv = v_texcoord;
  uv.x *= u_resolution.x / u_resolution.y;
  uv -= u_dPt.xy;
  uv *= (u_dPt.z / 64.);
  float d = 0.0;

  //$INSERT CALL$------

  //$ENDINSERT CALL$---
  outColorDist = vec4(vec3(d),1.0);
}`;
//---------------------------------------------
export const pointLightEdit = 
`#version 300 es
#define saturate(a) clamp(a, 0.0, 1.0)

precision mediump float;

in vec2 v_texcoord;

uniform vec3 u_resolution;

uniform vec3 u_mPt;
uniform vec3 u_dPt;

uniform vec3 u_scale;

// might be worth it to pack multiple lights into the same shader
uniform sampler2D u_eTex;
uniform sampler2D u_distTex;

uniform float u_cTex;
uniform float u_weight;
uniform vec3 u_stroke;
uniform vec3 u_fill;
uniform float u_opacity;
uniform float u_radius;

// uniform vec3 u_idCol;

out vec4 outColor;

float sdCircle(vec2 uv, vec2 p, float r){
  uv = uv - p;
  return length(uv) - r;
}

// fill
float fillMask(float dist){
	return smoothstep(0.0,0.003, clamp(-dist, 0.0, 1.0));
}

float sceneDist(vec2 uv) {
  // need to figure out how to align uv to distTex
  //
  // uv.x = abs(uv.x - (u_resolution.x/1000.0))
  uv *= (64. / u_dPt.z);
  uv += u_dPt.xy;
  uv.x *= u_resolution.y / u_resolution.x;

  uv.y = (u_resolution.y/1000.0) - uv.y + 0.22;
  
  float d = 0.0 - texture(u_distTex, uv).x;
  return d;
}

float shadow(vec2 p, vec2 pos, float radius)
{
	vec2 dir = normalize(pos - p);
	float dl = length(p - pos);
	// fraction of light visible, starts at one radius (second half added in the end);
	float lf = radius * dl;
	// distance traveled
	float dt = 0.000001;
	for (int i = 0; i < 100; ++i)
	{
		// distance to scene at current position
		float sd = sceneDist(p + dir * dt);
    // early out when this ray is guaranteed to be full shadow
    // if (sd < -radius){
    //   return 0.0;
    // }
    if (sd < 0.){
      return 0.0;
    }
		// width of cone-overlap at light
		// 0 in center, so 50% overlap: add one radius outside of loop to get total coverage
		// should be '(sd / dt) * dl', but '*dl' outside of loop
		lf = min(lf, sd / dt);
		// move ahead
		dt += max(0.001, abs(sd));
		if (dt > dl) break;
	}
	// multiply by dl to get the real projected overlap (moved out of loop)
	// add one radius, before between -radius and + radius
	// normalize to 1 ( / 2*radius)
	lf = clamp((lf*dl + radius) / (2.0 * radius), 0.0, 1.0);
	lf = smoothstep(0.00, 1.0, lf);
	return lf;
}

vec3 drawLight(vec2 p, vec2 pos, vec3 color, float range, float radius)
{
	// distance to light
	float ld = length(p - pos);
	// out of range
	if (ld > range) return vec3(0.0);
	// shadow and falloff
	float shad = shadow(p, pos, range);
	float fall = (range - ld)/range;
	fall *= fall;
	float source = fillMask(sdCircle(p - pos, vec2(0.,0.), radius));
  return (shad * fall + source) * color;
}

float luminance(vec3 col)
{
	return 0.2126 * col.r + 0.7152 * col.g + 0.0722 * col.b;
}

vec3 setLuminance(vec3 col, float lum)
{
	lum /= luminance(col);
	return col *= lum;
}

// float AO(vec2 p, float dist, float radius, float intensity)
// {
// 	float a = clamp(dist / radius, 0.0, 1.0) - 1.0;
// 	return 1.0 - (pow(abs(a), 5.0) + 1.0) * intensity + (1.0 - intensity);
// 	//return smoothstep(0.0, 1.0, dist / radius);
// }

vec3 drawPt(vec2 uv, vec2 p, float dist, vec3 col){
    vec3 color = mix(col, vec3(1.0, 0.25, 0.25), dist);
    return color;
}

void main(){
  outColor = vec4(0.0);
  vec2 uv = v_texcoord;
  uv.x *= u_resolution.x / u_resolution.y;
  uv -= u_dPt.xy;
  uv *= (u_dPt.z / 64.);

  //fill color
  //set luminance
  vec3 col = drawLight(uv, u_mPt.xy, setLuminance(u_fill, 0.8), 0.125, u_weight * 20.);

  outColor = vec4(col, 0.5);
}
`