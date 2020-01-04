#What problem does Fluent Solve?
More productive collaboration on technical documentation.

#What's the story?
Designing, engineering and building buildings is increasingly a collaborative effort that requires coordination of details between multiple offices across large distances. This has been caused by increasing regulatory and technological complexities that have required professionals to specialize and collaborate with other specialists. Today the bulk of this coordination is done through PDF’s that are edited and emailed back and forth between offices. Fluent will increase the productivity of this collaboration.

# Describe Fluent:
Fluent / SDFUI is a drafting application that uses signed distance fields to rendering 2d shapes and effects. The application holds a current edit object and some un-rendered geometry in javascript (GhostUI) and passes the geometry to a shader via a couple uniforms about UI state and a dataTexture. After a user finishes editing a shape (i.e. a polyline), GhostUI bakes the shape to a parameterized signed distance field function within the fragment shader. Ultimately calls to those shape functions will take parameter values from a uniform data texture that is edited by the user. That interaction will be managed in javascript.

# Sources and Links:
KD Tree:
https://github.com/ubilabs/kd-tree-javascript

HalfFloat16:
https://github.com/petamoriken/float16

UI:
Bret Victor:
http://worrydream.com/MediaForThinkingTheUnthinkable/

Michael Neilsen:
http://cognitivemedium.com/tat/index.html
