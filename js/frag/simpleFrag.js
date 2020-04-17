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

export const simpleVert =
`#version 300 es

in vec4 a_position;
in vec2 a_texcoord;

uniform mat4 u_matrix;

out vec2 v_texcoord;

void main() {
  gl_Position = u_matrix * a_position;
  v_texcoord = a_texcoord;
}`;

export const gridFrag =
`#version 300 es
#define saturate(a) clamp(a, 0.0, 1.0)

precision mediump float;

in vec2 v_texcoord;

uniform vec3 u_resolution;
uniform vec3 u_dPt;

out vec4 outColor;

float repeat(float x) { return abs(fract(x*0.5+0.5)-0.5)*2.0; }

void main() {
  outColor = vec4(1.0);
  vec2 uv = vec2(v_texcoord);
  uv.x *= u_resolution.x / u_resolution.y;
  uv -= u_dPt.xy;
  // uv.y -= u_dPt.y;
  outColor -= vec4(1.0, 1.0, 0.2, 1.0) * saturate(repeat(64.0 * uv.x) - 0.92)*4.0;
  outColor -= vec4(1.0, 1.0, 0.2, 1.0) * saturate(repeat(64.0 * uv.y) - 0.92)*4.0;
}`;


export const circleFrag =
`#version 300 es
#define saturate(a) clamp(a, 0.0, 1.0)

precision mediump float;

in vec2 v_texcoord;

uniform vec3 u_resolution;
uniform vec3 u_dPt;

uniform vec3 u_mPt;

uniform sampler2D u_eTex;

out vec4 outColor;

float sdCircle(vec2 uv, vec2 p, float r){
  uv = uv - p;
  return length(uv) - r;
}

vec3 drawPt(vec2 uv, vec2 p, float dist, vec3 col){
    vec3 color = mix(col, vec3(1.0, 0.25, 0.25), dist);
    return color;
}

void main(){
  outColor = vec4(1.0);
  vec2 uv = vec2(v_texcoord);
  uv.x *= u_resolution.x / u_resolution.y;
  uv -= u_dPt.xy;

  float texelOffset = 0.5 * (1. / (16. * 16.));

  float dist = sdCircle(uv, u_mPt.xy, 0.003);

  for (float i = 0.; i < 1.; i++ ){
    float yIndex = i / 16. + texelOffset;

    for (float j = 0.; j < 7.; j++ ){
      float xIndex = j / 16.  + texelOffset;
      vec2 vIndex = vec2(xIndex, yIndex);

      vec2 tPt = texture(u_eTex, vIndex).xy;
      dist = min(dist, sdCircle(uv, tPt, 0.003));
    }
  }

  if ( dist > 0.004) discard;

  dist = 1.0 - smoothstep(0.0,0.005,clamp(dist, 0.0, 1.0));

  //TODO: try alpha = dist, enable gl.BLEND
  outColor = vec4(drawPt(uv, u_mPt.xy, dist, vec3(1., 1., 1.)), 1.0);
}`;
