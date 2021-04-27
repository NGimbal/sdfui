//SDF Functions
export const sdCircle = `
float sdCircle(vec2 uv, vec2 p, float r){
  uv = uv - p;
  return length(uv) - r;
}
`

export const sdBox=`
//uv, p translation point, b 1/2 length, width, r radius
float sdBox( in vec2 uv, in vec2 p, in vec2 b , in float r)
{
    b -= r;
    uv = (uv-p);
    vec2 d = abs(uv)-b;
    return length(max(d,vec2(0))) + min(max(d.x,d.y),0.0) - r;
}
`

export const sdLine =`
//https://www.shadertoy.com/view/4tc3DX
float sdLine(vec2 uv, vec2 pA, vec2 pB, float thick, float dashOn) {
    // float rounded = thick;

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
    float disty = abs(dpy) - thick + thick;
    float distx = abs(dpx) - lenD * 0.5 - thick + thick;

    float dist = length(vec2(max(0.0, distx), max(0.0,disty))) - thick;
    dist = min(dist, max(distx, disty));

    return dist;
}
`

// Filters
export const filterLine =`
float line(float d, float w){
  d = clamp(abs(d) - w, 0.0, 1.0);
  d = 1.0 - smoothstep(0.0,0.00004 * u_dPt.z,abs(d));
  return d;
}
`

export const filterFill =`
// fill
float fillMask(float dist){
	return smoothstep(0.0,0.003, clamp(-dist, 0.0, 1.0));
}
`

export const filterSDF=`
//smooth sdf Iso
vec3 sdf(vec2 uv, float d){
  vec3 col = vec3(1.0) - sign(d)*vec3(0.1,0.4,0.7);
	col *= 1.0 - exp(-3.0*abs(d));
	col *= 0.8 + 0.2*cos(150.0*d);
	col = mix( col, vec3(1.0), 1.0-smoothstep(0.0,0.003,abs(d)));
  return col;
}
`

// Helpers
export const drawPt =`
vec3 drawPt(vec2 uv, vec2 p, float dist, vec3 col){
  vec3 color = mix(col, vec3(1.0, 0.25, 0.25), dist);
  return color;
}
`

