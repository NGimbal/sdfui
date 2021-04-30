import {sdCircle, filterLine, filterFill, drawPt, sdLine} from "./shaderFunctions"

export const polygonEdit =
`#version 300 es
#define saturate(a) clamp(a, 0.0, 1.0)

precision mediump float;

in vec2 v_texcoord;

uniform vec3 u_resolution;
uniform vec3 u_dPt;

uniform vec3 u_mPt;

uniform sampler2D u_eTex;
uniform float u_cTex;
uniform float u_weight;
uniform vec3 u_stroke;
uniform vec3 u_fill;
uniform float u_opacity;

// out vec4 outColor;
layout(location = 0) out vec4 outColor;
layout(location = 1) out vec4 outColorDist;

${sdLine}
${sdCircle}
${filterLine}
${filterFill}

void main(){
  outColor = vec4(1.0);
  vec2 uv = v_texcoord;
  uv.x *= u_resolution.x / u_resolution.y;
  uv -= u_dPt.xy;
  uv *= (u_dPt.z / 64.);

  float texelOffset = 0.5 * (1. / (16. * 16.));

  float dist = sdCircle(uv, u_mPt.xy, 0.003);

  vec2 first = texture(u_eTex, vec2(0./16. + texelOffset, 0./16. + texelOffset)).xy;

  float iX = (mod(u_cTex, 16.) / 16.) + texelOffset;
  float iY = (floor(u_cTex / 16.) / 16.) + texelOffset;

  vec2 last = texture(u_eTex, vec2(iX, iY)).xy;
  dist = dot(uv - first, uv - first);
  vec2 prevPt = last;

  //drop shadow
  vec2 dShTrans = normalize(vec2(-0.125, 0.125))*.01;
  float dSh = 10.0;

  float s = 1.0;
  for (float i = 0.; i < 16.; i++ ){
    float yIndex = i / 16. + texelOffset;
    for (float j = 0.; j < 16.; j++ ){
      float xIndex = j / 16.  + texelOffset;
      vec2 vIndex = vec2(xIndex, yIndex);

      vec2 tPt = texture(u_eTex, vIndex).xy;

      if (tPt == vec2(0.)){ break; }

      // https://www.shadertoy.com/view/wdBXRW iq signed distance to polygon
      if (prevPt != vec2(0.)){
        vec2 e = prevPt - tPt;
        vec2 w = uv - tPt;
        vec2 b = w - e*clamp( dot(w,e)/dot(e,e), 0.0, 1.0 );
        dist = min( dist, dot(b,b) );

        // vec2 wDSh = (uv - dShTrans) - tPt;
        // vec2 bDSh = wDSh - e*clamp( dot(wDSh,e)/dot(e,e), 0.0, 1.0 );
        // dSh = min(dSh, dot(bDSh, bDSh));

        // winding number from http://geomalgorithms.com/a03-_inclusion.html
        bvec3 cond = bvec3( uv.y>=tPt.y, uv.y<prevPt.y, e.x*w.y>e.y*w.x );
        if( all(cond) || all(not(cond)) ) s*=-1.0;

        prevPt = tPt;
      }
    }
  }

  dist = s*sqrt(dist);


  float fill = fillMask(dist);
  vec4 fillCol = mix(vec4(vec3(1.),0.), vec4(u_fill, u_opacity), fill);

  if (prevPt != vec2(0.)){
    dist = min(dist, sdLine(uv, prevPt, u_mPt.xy, u_weight / 2., 0.0));
    dist = min(dist, sdLine(uv, u_mPt.xy, first, u_weight / 2., 0.0));

    // dSh = min(dSh, sdLine(uv - dShTrans, prevPt, u_mPt.xy, u_weight / 2.0, 0.0));
    // dSh = min(dSh, sdLine(uv - dShTrans, u_mPt.xy, first, u_weight / 2.0, 0.0));
  }

  float stroke = line(dist, u_weight);
  vec4 strokeCol = mix(vec4(vec3(1.),0.), vec4(u_stroke,stroke) , stroke);
  
  // dSh = (1. - smoothstep(0., 0.15, sqrt(dSh)))*.25;

  dist = min(stroke, fill);
  
  if ( stroke + fill < 0.01) discard;

  outColor = vec4(vec3(fillCol.rgb * strokeCol.rgb), fillCol.a + strokeCol.a);
  outColorDist = vec4(vec3(dist),1.0);
}`;

//---------------------------------------------
export const polygonStub =
`#version 300 es
#define saturate(a) clamp(a, 0.0, 1.0)

precision mediump float;

in vec2 v_texcoord;

uniform vec3 u_resolution;
uniform vec3 u_dPt;

uniform vec3 u_scale;

uniform sampler2D u_eTex;
uniform float u_cTex;
uniform float u_weight;
uniform vec3 u_stroke;
uniform vec3 u_fill;
uniform float u_opacity;

uniform vec3 u_idCol;

// out vec4 outColor;
layout(location = 0) out vec4 outColor;
layout(location = 1) out vec4 outColorDist;

${sdLine}
${sdCircle}
${filterLine}
${filterFill}

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
  outColor = vec4(u_idCol, 0.25);
  vec2 uv = v_texcoord;
  uv.x *= u_resolution.x / u_resolution.y;
  uv -= u_dPt.xy;
  uv *= (u_dPt.z / 64.);

  vec4 scene = sceneDist(uv);
  float d = scene.w;

  float fill = fillMask(d);
  vec4 fillCol = mix(vec4(vec3(1.),0.), vec4(u_fill, u_opacity), fill);
  float stroke = line(d, u_weight);
  vec4 strokeCol = mix(vec4(vec3(1.),0.), vec4(u_stroke,stroke) , stroke);
  
  float dist = min(stroke, fill);

  if ( stroke + fill < 0.01) discard;

  outColor = vec4(vec3(fillCol.rgb * strokeCol.rgb), fillCol.a + strokeCol.a);
  outColorDist = vec4(vec3(dist),1.0);
}`;