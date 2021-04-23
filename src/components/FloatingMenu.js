import m from "mithril";
import { ControlGroup, Classes, Button, Icons, CustomSelect, PopoverMenu, MenuItem } from 'construct-ui';
// import '../../node_modules/construct-ui/lib/index.css';
import {state, store, layers, deleteLayer, pushLayer} from '../app/draw'
import * as ACT from '../store/actions'
import {bakeLayer, createLayer} from '../renderer/layer';
import * as PRIM from '../renderer/primitives'

import chroma from 'chroma-js';

let inputLabelStyle = {
  marginBottom:"4px",
  marginTop:"6px",
  color:"#546e7a",
}

let dividerStyle =   {
  width:"100%",
  boxShadow:"0 1px 0 #eef1f2;",
  color:"#546e7a",
  borderRadius:"2px",
  marginTop:"6px",
  marginBottom:"2px",
  opacity:"0.5",
}

function FloatingMenu() {
  let primSel = "Circle";
  let primList = ["Polyline", "Polygon", "Circle", "Ellipse", "Rectangle", "Point Light"];

  function primitiveChange(e){
    primSel = e.replace(/\s+/g, '').toLowerCase();
    console.log(primSel);
    
    let currItem = state.scene.editItems.find(i => i.id === state.scene.editItem);
    let type = currItem.type;

    // this is nice
    if(type != primSel){
      // let nextPrim = {};
      let newLayer = {};
      
      let currLayer = layers.find(l => l.id === currItem.id);

      let newPrim = new PRIM.prim(primSel, [], {...currItem.properties});

      if(currItem && currItem.pts.length > 1 && currLayer.primType !== 'pointlight'){
        bakeLayer(currLayer);
        store.dispatch(ACT.scenePushEditItem(newPrim));
      } else {
        deleteLayer(currLayer.id);
        store.dispatch(ACT.sceneRmvItem(currItem.id));
        store.dispatch(ACT.scenePushEditItem(newPrim));
      }

      newLayer = createLayer(newPrim);
      
      pushLayer(newLayer);
    }
    m.redraw();
  }

  function toggleSnapAngle(e) {
    store.dispatch(ACT.cursorSnapRef());
  }

  function toggleSnapPt(e) {
    store.dispatch(ACT.cursorSnapPt());
  }

  function toggleSnapGlobal(e){
    store.dispatch(ACT.cursorSnapGlobal());
  }

  function toggleSnapGrid(e){
    store.dispatch(ACT.cursorSnapGrid());
  }

  function strokeWeightChange(e){
    for (let sel of state.scene.selected){
      store.dispatch(ACT.editWeight(e.target.value / 10000, sel));
    }
  }

  function strokeColorChange(e){
    for (let sel of state.scene.selected){
      store.dispatch(ACT.editStroke(chroma(e.target.value).hex(), sel));
    }
  }

  function fillOpacityChange(e){
    for (let sel of state.scene.selected){
      store.dispatch(ACT.editOpacity(e.currentTarget.value / 100, sel));
    }
  }

  function fillColorChange(e){
    for (let sel of state.scene.selected){
      store.dispatch(ACT.editFill(chroma(e.currentTarget.value).hex(), sel));
    }
  }

  function draw(){
    return(
      <div>    
        <PopoverMenu content={[
                      // <hr style={dividerStyle}/>,
                      <h6 class={Classes.Muted} style={inputLabelStyle}>Stroke Color</h6>,
                      <input type="color" style={{margin:"auto", width:"100%"}} value={state.scene.editItems.find(i => i.id === state.scene.editItem).properties.stroke } oninput={strokeColorChange}/>,
                      
                      <hr style={dividerStyle}/>,
                      <h6 class={Classes.Muted} style={inputLabelStyle}>Fill Color</h6>,
                      <input type="color" style={{margin:"auto", width:"100%"}} oninput={fillColorChange} value={state.scene.editItems.find(i => i.id === state.scene.editItem).properties.fill}/>,
                      // <hr style={dividerStyle}/>
                    ]}
                  trigger={m(Button, { iconLeft: Icons.DROPLET })}
                  menuAttrs={{style:{padding:"8px"}}}
                  />

      <PopoverMenu content={[
                  <h6 class={Classes.Muted} style={inputLabelStyle}>Stroke Weight</h6>,
                  <input type="range" oninput={strokeWeightChange} min="1" max="100" value={state.scene.editItems.find(i => i.id === state.scene.editItem).properties.weight * 10000}/>,
                  
                  <hr style={dividerStyle}/>,
                  <h6 class={Classes.Muted} style={inputLabelStyle}>Opacity</h6>,
                  <input type="range" oninput={fillOpacityChange} min="0" max="100" value={state.scene.editItems.find(i => i.id === state.scene.editItem).properties.opacity * 100}/>,
                
                  ]}
                  trigger={m(Button, { iconLeft: Icons.PEN_TOOL })}
                  menuAttrs={{style:{padding:"8px"}}}
                  />

      <PopoverMenu content={[
                      <MenuItem iconLeft={Icons.GRID}
                        active={state.cursor.snapGrid}
                        onclick={toggleSnapGrid}
                        label={"Snap to Grid"}/>,
                      <MenuItem iconLeft={Icons.CROSSHAIR}
                        active={state.cursor.snapPt}
                        onclick={toggleSnapPt}
                        label={"Snap to Points"}/>,
                      <MenuItem iconLeft={Icons.GLOBE}
                        active={state.cursor.snapGlobal}
                        onclick={toggleSnapGlobal}
                        label={"Snap to Global"}/>,
                      <MenuItem iconLeft={Icons.TRIANGLE}
                        active={state.cursor.snapRef}
                        onclick={toggleSnapAngle}
                        label={"Snap to Relative"}/>]}
                  trigger={m(Button, { iconLeft: Icons.SETTINGS })}
                  />

      <CustomSelect options={primList} defaultValue={"Polyline"} onSelect={primitiveChange}/>
    </div>
  )}

  function select(){
    return(
      <div>    
        <PopoverMenu content={[
                      // <hr style={dividerStyle}/>,
                      <h6 class={Classes.Muted} style={inputLabelStyle}>Stroke Color</h6>,
                      <input type="color" style={{margin:"auto", width:"100%"}} value={state.scene.editItems.find(i => i.id === state.scene.editItem).properties.stroke } oninput={strokeColorChange}/>,
                      
                      <hr style={dividerStyle}/>,
                      <h6 class={Classes.Muted} style={inputLabelStyle}>Fill Color</h6>,
                      <input type="color" style={{margin:"auto", width:"100%"}} oninput={fillColorChange} value={state.scene.editItems.find(i => i.id === state.scene.editItem).properties.fill}/>,
                      // <hr style={dividerStyle}/>
                    ]}
                  trigger={m(Button, { iconLeft: Icons.DROPLET })}
                  menuAttrs={{style:{padding:"8px"}}}
                  />

        <PopoverMenu content={[
                  <h6 class={Classes.Muted} style={inputLabelStyle}>Stroke Weight</h6>,
                  <input type="range" oninput={strokeWeightChange} min="1" max="100" value={state.scene.editItems.find(i => i.id === state.scene.editItem).properties.weight * 10000}/>,
                  
                  <hr style={dividerStyle}/>,
                  <h6 class={Classes.Muted} style={inputLabelStyle}>Opacity</h6>,
                  <input type="range" oninput={fillOpacityChange} min="0" max="100" value={state.scene.editItems.find(i => i.id === state.scene.editItem).properties.opacity * 100}/>,
                
                  ]}
                  trigger={m(Button, { iconLeft: Icons.PEN_TOOL })}
                  menuAttrs={{style:{padding:"8px"}}}
                  />

        <PopoverMenu content={[
                      <MenuItem iconLeft={Icons.GRID}
                        active={state.cursor.snapGrid}
                        onclick={toggleSnapGrid}
                        label={"Snap to Grid"}/>,
                      <MenuItem iconLeft={Icons.CROSSHAIR}
                        active={state.cursor.snapPt}
                        onclick={toggleSnapPt}
                        label={"Snap to Points"}/>,
                      <MenuItem iconLeft={Icons.GLOBE}
                        active={state.cursor.snapGlobal}
                        onclick={toggleSnapGlobal}
                        label={"Snap to Global"}/>,
                      <MenuItem iconLeft={Icons.TRIANGLE}
                        active={state.cursor.snapRef}
                        onclick={toggleSnapAngle}
                        label={"Snap to Relative"}/>]}
                  trigger={m(Button, { iconLeft: Icons.SETTINGS })}
                  />
    </div>
  )}

  return {
    view: () => (
      <div style={{top:"8%",
                  padding:"14px",
                  // marginTop:"50px",
                  display:"flex",
                  flexDirection:"row"}}>
        
          <ControlGroup style="margin-left:auto;
                              margin-right:auto;"> 

          {
            state.ui.mode === "draw"   ? draw()   : 
            state.ui.mode === "select" ? select() :
            draw()
          }
        
        </ControlGroup>
      </div>
    )
  }
}

export default FloatingMenu;