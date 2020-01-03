//vert js
const sdfPrimVert = `
//#version 300 es

varying vec2 vUv;

void main() {
  gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
  vUv = gl_Position.xy;
}

`;

export {sdfPrimVert}
