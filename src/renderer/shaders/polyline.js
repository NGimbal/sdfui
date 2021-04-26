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