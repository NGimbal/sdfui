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