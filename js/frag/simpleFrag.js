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

out vec4 outColor;

float repeat(float x) { return abs(fract(x*0.5+0.5)-0.5)*2.0; }

void main() {
  outColor = vec4(1.0);
  //uv.x *= iResolution.x / iResolution.y;
  outColor -= vec4(1.0, 1.0, 0.2, 1.0) * saturate(repeat(96.0 * v_texcoord.x) - 0.92)*4.0;
  outColor -= vec4(1.0, 1.0, 0.2, 1.0) * saturate(repeat(96.0 * v_texcoord.y) - 0.92)*4.0;
}`;
