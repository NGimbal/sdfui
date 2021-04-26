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