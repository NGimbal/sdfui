const sdfLines =`
//Eventually this should go point, circle, rect, polyline,polycircle
//0 = Nothing
//1 = PolyLine
//2 = PolyCircle
//3 = Circle
//4 = Rectangle
//5 = Polygon
#define EDIT_SHAPE 1
//Filter
//0 = None
//1 = Pencil
//2 = Crayon
#define FILTER 0
#define EDIT_VERTS 0
#define BG_GRID 1
#define SHOW_PTS 0

// https://www.shadertoy.com/view/4tc3DX
uniform vec3      iResolution;           // viewport resolution (in pixels)
uniform float     iTime;                 // shader playback time (in seconds)

//simple uniform for 2 xy coordinate based prims
uniform vec4       pointPrim;

//expandable structure for item being edited
uniform sampler2D  posTex;
uniform vec2       posTexRes;

//global parameter container for all parameterized properties
uniform sampler2D parameters;

//current mouse position
uniform vec3       mousePt;

//editUniforms
uniform int      editCTexel;

uniform float      editWeight;
uniform vec3       strokeColor;
uniform float      editRadius;

//scale
uniform float      scale;
uniform float      hiDPR;

varying vec2 vUv;

// Clamp [0..1] range
//#define saturate(a) clamp(a, 0.0, 1.0)

// Basically a triangle wave
float repeat(float x) { return abs(fract(x*0.5+0.5)-0.5)*2.0; }

//simplex noise by iq
//https://www.shadertoy.com/view/Msf3WH
vec2 hash( vec2 p ) // replace this by something better
{
	p = vec2( dot(p,vec2(127.1,311.7)), dot(p,vec2(269.5,183.3)) );
	return -1.0 + 2.0*fract(sin(p)*43758.5453123);
}

float simplex( in vec2 p )
{
    const float K1 = 0.366025404; // (sqrt(3)-1)/2;
    const float K2 = 0.211324865; // (3-sqrt(3))/6;

	  vec2  i = floor( p + (p.x+p.y)*K1 );
    vec2  a = p - i + (i.x+i.y)*K2;
    float m = step(a.y,a.x);
    vec2  o = vec2(m,1.0-m);
    vec2  b = a - o + K2;
    vec2  c = a - 1.0 + 2.0*K2;
    vec3  h = max( 0.5-vec3(dot(a,a), dot(b,b), dot(c,c) ), 0.0 );
    vec3  n = h*h*h*h*vec3( dot(a,hash(i+0.0)), dot(b,hash(i+o)), dot(c,hash(i+1.0)));
    return dot( n, vec3(70.0) );
}

//https://www.shadertoy.com/view/XdVBWd
//iq unsigned distance to bezier
float length2( in vec2 v ) { return dot(v,v); }

float sdSegmentSq( in vec2 p, in vec2 a, in vec2 b )
{
	vec2 pa = p-a, ba = b-a;
	float h = clamp( dot(pa,ba)/dot(ba,ba), 0.0, 1.0 );
	return length2( pa - ba*h );
}

float sdSegment( in vec2 p, in vec2 a, in vec2 b )
{
	return sqrt(sdSegmentSq(p,a,b));
}

// iq says this is slow, but I like the variable precision
// and the possibility of using it to calculate the signed distance
// for interior filled polygon. May implement something fancier later
vec2 udBezier(vec2 p0, vec2 p1, vec2 p2, vec2 p3, vec2 pos)
{
    const int kNum = 50;
    vec2 res = vec2(1e10,0.0);
    vec2 a = p0;
    for( int i=1; i<kNum; i++ ){
        float t = float(i)/float(kNum-1);
        float s = 1.0-t;
        vec2 b = p0*s*s*s + p1*3.0*s*s*t + p2*3.0*s*t*t + p3*t*t*t;
        float d = sdSegmentSq( pos, a, b );
        if( d<res.x ) res = vec2(d,t);
        a = b;
    }
    return vec2(sqrt(res.x),res.y);
}

// https://www.shadertoy.com/view/wdBXRW
// iq signed distance to polygon
float sdPoly( in vec2[16] v, int cTex, in vec2 p)
{
    const int num = v.length();
    float d = dot(p-v[0],p-v[0]);
    float s = 1.0;
    for( int i=0, j=cTex-1; i<num; j=i, i++ )
    {
        if (i == cTex) break;
        // distance
        vec2 e = v[j] - v[i];
        vec2 w =    p - v[i];
        vec2 b = w - e*clamp( dot(w,e)/dot(e,e), 0.0, 1.0 );
        d = min( d, dot(b,b) );

        // winding number from http://geomalgorithms.com/a03-_inclusion.html
        bvec3 cond = bvec3( p.y>=v[i].y, p.y<v[j].y, e.x*w.y>e.y*w.x );
        if( all(cond) || all(not(cond)) ) s*=-1.0;
    }

    return s*sqrt(d);
}

//uv, p translation point, b 1/2 length, width, r radius
float sdBox( in vec2 uv, in vec2 p, in vec2 b , in float r)
{
    b -= r;
    uv = (uv-p);
    vec2 d = abs(uv)-b;
    return length(max(d,vec2(0))) + min(max(d.x,d.y),0.0) - r;
}


//https://www.shadertoy.com/view/4tc3DX
float LineDistField(vec2 uv, vec2 pA, vec2 pB, vec2 thick, float rounded, float dashOn) {
    // Don't let it get more round than circular.
    rounded = min(thick.y, rounded);
    // midpoint
    vec2 mid = (pB + pA) * 0.5;
    // vector from point A to B
    vec2 delta = pB - pA;
    // Distance between endpoints
    float lenD = length(delta);
    // unit vector pointing in the line's direction
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
    float disty = abs(dpy) - thick.y + rounded;
    float distx = abs(dpx) - lenD * 0.5 - thick.x + rounded;

    // Too tired to remember what this does. Something like rounded endpoints for distance function.
    float dist = length(vec2(max(0.0, distx), max(0.0,disty))) - rounded;
    dist = min(dist, max(distx, disty));

    // This is for animated dashed lines. Delete if you don't like dashes.
    float dashScale = 2.0*thick.y;
    // Make a distance function for the dashes
    float dash = (repeat(dpx/dashScale + iTime)-0.5)*dashScale;
    // Combine this distance function with the line's.
    dist = max(dist, dash-(1.0-dashOn*1.0)*10000.0);

    return dist;
}

// This makes a dashed line in UV units. A 1.0 thick line will span a whole 0..1 in UV space.
float FillLineDash(vec2 uv, vec2 pA, vec2 pB, vec2 thick, float rounded) {
    float df = LineDistField(uv, pA, pB, vec2(thick), rounded, 1.0);
    return saturate(df / abs(dFdy(uv).y));
}

float drawLine(vec2 uv, vec2 pA, vec2 pB, float weight, float dash){
  float line = LineDistField(uv, pA, pB, vec2(weight), weight, dash);
  // line = 1.0 - smoothstep(0.0, 0.003, line);
  return line;
}

float sdCircle( vec2 uv, vec2 p, float r )
{
  uv = uv - p;
  return length(uv) - r;
}

void DrawPoint(vec2 uv, vec2 p, inout vec3 col) {
    col = mix(col, vec3(1.0, 0.25, 0.25), 1.0 - smoothstep(0.0,0.003,clamp(sdCircle(uv, p, 0.009), 0.0,1.0)));
}

// Transform screen space pt to shader space
vec2 screenPt(vec2 p) {
  vec2 pos = p;
  //0 to 1 => -.5 to .5
  pos -= 0.5;
  pos.x *= iResolution.x / iResolution.y;

  // 1. represents scale if uv *= scale ends up making sense
  pos.x = (pos.x * iResolution.x) / (iResolution.x / (hiDPR * 1.));
  pos.y = (pos.y * iResolution.y) / (iResolution.y / (hiDPR * 1.));
  return pos;
}

//Shadow and Light
//https://www.shadertoy.com/view/4dfXDn


//Merge Operations
//https://iquilezles.org/www/articles/distfunctions/distfunctions.htm
float opSmoothUnion( float d1, float d2, float k ) {
    float h = clamp( 0.5 + 0.5*(d2-d1)/k, 0.0, 1.0 );
    return mix( d2, d1, h ) - k*h*(1.0-h);
}

float fillMask(float d){
  return clamp(d, 0.0, 1.0);
}

//Filters take d and uv and return modified d
//smooth Line Filter
float line(vec2 uv, float d, float w){
  d = clamp(abs(d) - w, 0.0, 1.0);
  d = 1.0 - smoothstep(0.0,0.003,abs(d));
  return d;
}

//smooth sdf Iso
vec3 sdf(vec2 uv, float d){
  vec3 col = vec3(1.0) - sign(d)*vec3(0.1,0.4,0.7);
	col *= 1.0 - exp(-3.0*abs(d));
	col *= 0.8 + 0.2*cos(150.0*d);
	col = mix( col, vec3(1.0), 1.0-smoothstep(0.0,0.003,abs(d)));
  return col;
}

//Pencil Filter
float pencil(vec2 uv, float d, float w){
  d = repeat(3.0 * pow(1.0 - smoothstep(0.0, 0.02, abs(d) - 0.002 ), 2.0));
  return d;
}

//Crayon Filter
float crayon(vec2 uv, float d, float w){
  float dMask = repeat(3.0 * pow(1.0 - smoothstep(0.0, 0.013, abs(d) - (w / 2.0)), 2.0));
  d = clamp(abs(d) - editWeight, 0.0, 1.0);
  d = dMask * (1.0 - smoothstep(0.0,0.003,abs(d))) * (1.0 - smoothstep(0.4, 0.397, 0.5 + 0.5 * simplex(80.0 * uv)));
  return d;
}

//$INSERT FUNCTION$------

//$ENDINSERT FUNCTION$---

float sceneDist(vec2 uv, inout vec3 finalColor) {
  float d = 1.0;
  vec2 index = vec2(0.);
  float radius = 0.125;
  vec2 rect1 = vec2(0.);
  vec2 rect2 = vec2(0.);
  //$INSERT CALL$------
  //$ENDINSERT CALL$---
  return d;
}

void main(){

    vec2 uv = vUv;

    //makes space more square setting scale to 1 visualizes this effect pretty well.
    uv.x *= iResolution.x / iResolution.y;

    // Clear to white.
    //this should defintely be parameterized
    //also vingette
    vec3 finalColor = vec3(1.0);

    float texelOffset = 0.5 * (1. / (16. * 16.));

    vec2 oldPos = vec2(0.);
    float oldDist = 1000.0;

    float d = 1000.0;

    vec2 mPt = vec2(mousePt.x, mousePt.y);

    vec2 pos = vec2(0.);
    // vec2 index = vec2(0.);
    float radius = 0.125;

    d = sceneDist(uv, finalColor);

    //current Mouse Position
    DrawPoint(uv, screenPt(mPt), finalColor);

    //Circle--------
    #if EDIT_SHAPE == 3
    vec2 center = pointPrim.xy;
    d = sdCircle(uv, screenPt(mPt), 0.125);

    if(center.x != 0.0){
      vec2 rPt = screenPt(mPt).xy;
      radius = distance(center, rPt);
      d = sdCircle(uv, center, radius);
    }

    //fill
    // vec3 fill = vec3(0.98, 0.35, 0.0);
    // finalColor = mix(finalColor, fill, 1.0-smoothstep(0.0,0.003, fillMask(d)));

    //No filter
    #if FILTER == 0
    finalColor = mix(finalColor, strokeColor, line(uv, d, editWeight));
    #endif

    //Colored Penci
    #if FILTER == 1
    finalColor = mix(finalColor, strokeColor, pencil(uv, d, editWeight));
    #endif

    //Crayon
    #if FILTER == 2
    finalColor = mix(finalColor, strokeColor, crayon(uv, d, editWeight));
    #endif

    //sdf
    #if FILTER == 3
    finalColor = mix(finalColor, sdf(uv, d), 1.0 - clamp(d,0.0,1.0));
    #endif

    #endif
    //Circle--------

    //Rectange--------
    #if EDIT_SHAPE == 4
    vec2 rect = vec2(0.5, 0.25);
    vec2 flipX = vec2(-1.0, 1.0);

    vec2 center = screenPt(mPt).xy - rect * flipX;

    d = sdBox(uv, center, rect, editRadius);

    if(pointPrim.x != 0.0){
      center = 0.5 * (screenPt(mPt).xy - pointPrim.xy) + pointPrim.xy;
      vec2 rPt = abs(screenPt(mPt).xy - center);
      d = sdBox(uv, center, rPt, editRadius);
    }

    #if FILTER == 0
    finalColor = mix(finalColor, strokeColor, line(uv, d, editWeight));
    #endif

    //Colored Penci
    #if FILTER == 1
    finalColor = mix(finalColor, strokeColor, pencil(uv, d, editWeight));
    #endif

    //Crayon
    #if FILTER == 2
    finalColor = mix(finalColor, strokeColor, crayon(uv, d, editWeight));
    #endif

    //sdf
    #if FILTER == 3
    finalColor = mix(finalColor, sdf(uv, d), 1.0 - clamp(d,0.0,1.0));
    #endif

    #endif
    //Rectangle--------

    //Polyline-------
    #if EDIT_SHAPE == 1
    //Lines previously baked to the dataTexture
    for (float i = 0.; i < 16.; i++ ){
      float yIndex = i / 16. + texelOffset;

      for (float j = 0.; j < 16.; j++ ){
        float xIndex = j / 16.  + texelOffset;
        vec2 vIndex = vec2(xIndex, yIndex);

        vec2 pos = texture2D(posTex, vIndex).xy;
        if (pos == vec2(0.)){ break; }

        if (oldPos != vec2(0.)){
          d = drawLine(uv, oldPos, pos, editWeight, 0.0);

          #if FILTER == 0
          finalColor = mix(finalColor, strokeColor, line(uv, d, editWeight));
          #endif

          //Colored Penci
          #if FILTER == 1
          finalColor = mix(finalColor, strokeColor, pencil(uv, d, editWeight));
          #endif

          //Crayon
          #if FILTER == 2
          finalColor = mix(finalColor, strokeColor, crayon(uv, d, editWeight));
          #endif

          //sdf ideally this would show sdf of whole polyline not just each segment
          #if FILTER == 3
          finalColor = mix(finalColor, sdf(uv, d), 1.0 - clamp(d,0.0,1.0));
          #endif
        }

        #if SHOW_PTS == 1
        DrawPoint(uv, pos, finalColor);
        #endif

        oldPos = pos;
      }
    }

    //Next line while drawing
    if (oldPos != vec2(0.) && mousePt.z != -1.0){
      d = drawLine(uv, oldPos, screenPt(mPt), editWeight, 1.0);

      #if FILTER == 0
      finalColor = mix(finalColor, strokeColor, line(uv, d, editWeight));
      #endif

      //Colored Penci
      #if FILTER == 1
      finalColor = mix(finalColor, strokeColor, pencil(uv, d, editWeight));
      #endif

      //Crayon
      #if FILTER == 2
      finalColor = mix(finalColor, strokeColor, crayon(uv, d, editWeight));
      #endif

      //sdf
      #if FILTER == 3
      finalColor = mix(finalColor, sdf(uv, d), 1.0 - clamp(d,0.0,1.0));
      #endif
    }
    #endif
    //Polyline-------


    //Polygon-------
    #if EDIT_SHAPE == 5
    //Lines previously baked to the dataTexture
    int index = 0;
    // vec2 verts[16];
    vec2 first = texture2D(posTex, vec2(0./16. + texelOffset, 0./16. + texelOffset)).xy;
    // float love = 0.0;
    for (float i = 0.; i < 16.; i++ ){
      float yIndex = i / 16. + texelOffset;

      for (float j = 0.; j < 16.; j++ ){
        float xIndex = j / 16.  + texelOffset;
        vec2 vIndex = vec2(xIndex, yIndex);

        vec2 pos = texture2D(posTex, vIndex).xy;

        //add fist point to end and then break
        if (pos == vec2(0.)){
          // d = drawLine(uv, oldPos, first, editWeight, 0.0);
          // finalColor = mix(finalColor, strokeColor, line(uv, d, editWeight));
          break;
        }

        if (oldPos != vec2(0.)){
          d = drawLine(uv, oldPos, pos, editWeight, 0.0);

          #if FILTER == 0
          finalColor = mix(finalColor, strokeColor, line(uv, d, editWeight));
          #endif

          //Colored Penci
          #if FILTER == 1
          finalColor = mix(finalColor, strokeColor, pencil(uv, d, editWeight));
          #endif

          //Crayon
          #if FILTER == 2
          finalColor = mix(finalColor, strokeColor, crayon(uv, d, editWeight));
          #endif

          //sdf
          #if FILTER == 3
          finalColor = mix(finalColor, sdf(uv, d), 1.0 - clamp(d,0.0,1.0));
          #endif
        }

        #if SHOW_PTS == 1
        DrawPoint(uv, pos, finalColor);
        #endif

        oldPos = pos;
      }
    }

    //Next line while drawing
    if (oldPos != vec2(0.) && mousePt.z != -1.0){
      d = drawLine(uv, oldPos, screenPt(mPt), editWeight, 1.0);
      d = min(d, drawLine(uv, screenPt(mPt), first, editWeight, 1.0));

      #if FILTER == 0
      finalColor = mix(finalColor, strokeColor, line(uv, d, editWeight));
      #endif

      //Colored Penci
      #if FILTER == 1
      finalColor = mix(finalColor, strokeColor, pencil(uv, d, editWeight));
      #endif

      //Crayon
      #if FILTER == 2
      finalColor = mix(finalColor, strokeColor, crayon(uv, d, editWeight));
      #endif

      //sdf
      #if FILTER == 3
      finalColor = mix(finalColor, sdf(uv, d), 1.0 - clamp(d,0.0,1.0));
      #endif
    }
    #endif
    //Polygon-------

    //PolyCircle-----
    #if EDIT_SHAPE == 2
    for (float i = 0.; i < 16.; i++ ){
      float yIndex = (i / 16.) + texelOffset;

      for (float j = 0.; j < 16.; j++ ){
        float xIndex = j / 16.;
        vec2 vIndex = vec2(xIndex + texelOffset, yIndex);

        vec2 pos = texture2D(posTex, vIndex).xy;
        if (pos == vec2(0.)){ break; }

        #if EDIT_VERTS == 1
        DrawPoint(uv, pos, finalColor);
        #endif

        d = sdCircle(uv, pos, editRadius);
        d = opSmoothUnion(d, oldDist, 0.05);

        oldDist = d;
      }
    }

    d = sdCircle(uv, screenPt(mPt), editRadius);

    finalColor = mix( finalColor, strokeColor, 1.0-smoothstep(0.0,editWeight,abs(d)) );

    d = opSmoothUnion(d, oldDist, 0.05);

    vec3 cCol = vec3(0.98, 0.215, 0.262);

    #if FILTER == 0
    finalColor = mix(finalColor, strokeColor, line(uv, d, editWeight));
    #endif

    //Colored Penci
    #if FILTER == 1
    finalColor = mix(finalColor, strokeColor, pencil(uv, d, editWeight));
    #endif

    //Crayon
    #if FILTER == 2
    finalColor = mix(finalColor, strokeColor, crayon(uv, d, editWeight));
    #endif

    #endif
    //PolyCircle--------

    //Show points in parameters.
    #if SHOW_PTS == 1
    for (float i = 0.; i < 128.; i++ ){
      float yIndex = i / 128. + texelOffset;

      for (float j = 0.; j < 128.; j++ ){
        float xIndex = j / 128.  + texelOffset;
        vec2 vIndex = vec2(xIndex, yIndex);

        vec2 pos = texture2D(parameters, vIndex).xy;
        if (pos == vec2(0.)){ break; }
        DrawPoint(uv, pos, finalColor);

        pos = texture2D(parameters, vIndex).zw;
        if (pos == vec2(0.)){ continue; }
        DrawPoint(uv, pos, finalColor);
      }
    }
    #endif

    //background grid
    #if BG_GRID == 1
    // Blue grid lines
    finalColor -= vec3(1.0, 1.0, 0.2) * saturate(repeat(scale * uv.x) - 0.92)*4.0;
    finalColor -= vec3(1.0, 1.0, 0.2) * saturate(repeat(scale * uv.y) - 0.92)*4.0;
    #endif

    pc_fragColor = vec4(sqrt(saturate(finalColor)), 1.0);
}

`;
export {sdfLines};
