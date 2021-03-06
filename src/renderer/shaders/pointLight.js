import {sdCircle, filterLine, filterFill, drawPt} from "./shaderFunctions"

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

${sdCircle}
${filterFill}
${drawPt}

float sceneDist(vec2 uv) {
// reverse transformation of uv
	uv *= (64. / u_dPt.z);
  uv += u_dPt.xy;
  uv.x *= u_resolution.y / u_resolution.x;

	// flip y
	uv.y = 1.0 - uv.y;
  
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
	for (int i = 0; i < 1000; ++i)
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

vec4 drawLight(vec2 p, vec2 pos, vec3 color, float range, float radius)
{
	// distance to light
	float ld = length(p - pos);
	// out of range
	if (ld > range) return vec4(0.0);
	// shadow and falloff
	float shad = shadow(p, pos, range);
	float fall = (range - ld)/range;
	fall *= fall;
	float source = fillMask(sdCircle(p - pos, vec2(0.,0.), radius));
  return vec4((shad * fall + source) * color, shad * fall);
	// return mix(color, vec3(1.0), shad * fall + source));
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

void main(){
  outColor = vec4(0.0);
  vec2 uv = v_texcoord;
  uv.x *= u_resolution.x / u_resolution.y;
  uv -= u_dPt.xy;
  uv *= (u_dPt.z / 64.);

	vec2 q = v_texcoord;

  //fill color
  //set luminance
  vec4 col = drawLight(uv, u_mPt.xy, setLuminance(u_fill, 0.9), u_weight * 100., u_weight);

	//vignette
  float vignette = clamp(pow( 256.0*q.x*q.y*(1.0-q.x)*(1.0-q.y), .125 ),0.,1.)*.5;

  outColor = col + vec4(vec3(vignette), abs(vignette - 1.0));
}
`