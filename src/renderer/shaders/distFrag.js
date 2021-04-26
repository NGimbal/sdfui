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
  uv.x = (u_resolution.x/1000.0) - uv.x - 0.5;
  
  vec4 dist = texture(u_distTex, uv);
  outColor = mix(dist, vec4(1.0,0.0,0.0,0.25), dist.x);
}`