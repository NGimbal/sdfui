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