# Align API design

2D vector renderer + geometry library used by Align.

This library is still just a nascent project within a project. I need to figure out exactly how it's going to be broken out. Selection and geometric algorithms are implemented using the SDF representations and are part of this package. So it's more than just a rendering library, it's a rendering and geometry libary. The idea being that an SDF representation can make both rendering better and geometric functions easier (nearest point on curve.) 

"Secondaries" are something that I'm eager to begin exploring. Operations like 2D lighting simulation, boolean ops etc. should be possible, although a lot of that stuff could only be approximated in an SVG export. Which would be fine - incentive to stay in a platform that implements this drawing api.

### Align API

Object Hierarchy goes:
Points -> Prim -> Layers & Secondaries -> Groups

Points
vec3 + id + parent

Prim
Pts + Properties + Type + id

Layers
Prim

Secondaries (Not implemented)
Prim + dependencies

Groups (Not implmeneted)
Transform + bbox + list of prims

Properties = {
  fill:
  stroke:
  strokeWeight:
  radius:
  filter: //what's the syntax?
}

Type = Polyline || Polygon || Circle || Rectangle || CubicBez || QuadraticBez || Arc

Secondaries
- Dependencies are texture arrays + information about how they should be interpreted
- texture arrays hold distance info from previous renders

Selection
- knn points
- bounding box
- SDF prim evaluation

### Layers.js
constructor(prim)

addPt(pt)

updatePt(pt)

removePt(pt)

removeLayer(layer)

updateMatrices(layer)

bakeLayer(layer)

### Dependencies

RBush.js - Rtree implementation

twgl.js - WebGL library

### References
https://skia.org/user/api

https://two.js.org/#documentation

https://www.w3schools.com/tags/ref_canvas.asp

https://www.w3schools.com/graphics/svg_reference.asp