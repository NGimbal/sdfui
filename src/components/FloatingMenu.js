import m from "mithril";
import { ControlGroup, Classes, Button, Icons, CustomSelect, PopoverMenu, MenuItem } from 'construct-ui';
// import '../../node_modules/construct-ui/lib/index.css';
import * as SDFUI from '../renderer/draw'
import * as ACT from '../store/actions'
import {bakeLayer, createEditLayer} from '../renderer/layer';

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
  let primList = ["Polyline", "Polygon", "Circle", "Rectangle"];

  function primitiveChange(e){
    primSel = e.toLowerCase();
    console.log(primSel);
    let type = SDFUI.state.scene.editItems[SDFUI.state.scene.editItem].type;

    // this is nice
    if(type != primSel){
      let nextPrim = {};
      let newLayer = {};

      let currItem = SDFUI.state.scene.editItems[SDFUI.state.scene.editItem];
      let currLayer = SDFUI.state.render.layers[SDFUI.state.render.layers.length - 1];
      
      if(currItem && currItem.pts.length > 1){
        bakeLayer(currLayer);
        currItem = SDFUI.state.scene.editItems[SDFUI.state.scene.editItem];
        
        SDFUI.store.dispatch(ACT.scenePushEditItem(currItem.type));
      } else {

        SDFUI.store.dispatch(ACT.layerPop(currLayer.id));
        SDFUI.store.dispatch(ACT.sceneNewEditItem(primSel));
      }

      nextPrim = SDFUI.state.scene.editItems[SDFUI.state.scene.editItem];
      newLayer = createEditLayer(nextPrim);

      SDFUI.store.dispatch(ACT.layerPush(newLayer));
    }
    m.redraw();
  }

  function toggleSnapAngle(e) {
    SDFUI.store.dispatch(ACT.cursorSnapRef());
  }

  function toggleSnapPt(e) {
    SDFUI.store.dispatch(ACT.cursorSnapPt());
  }

  function toggleSnapGlobal(e){
    SDFUI.store.dispatch(ACT.cursorSnapGlobal());
  }

  function toggleSnapGrid(e){
    SDFUI.store.dispatch(ACT.cursorSnapGrid());
  }

  function strokeWeightChange(e){
    SDFUI.store.dispatch(ACT.editWeight(e.target.value / 10000, SDFUI.state.scene.editItem));
  }

  function strokeColorChange(e){
    SDFUI.store.dispatch(ACT.editStroke(chroma(e.target.value).hex(), SDFUI.state.scene.editItem));
  }

  function fillOpacityChange(e){
    SDFUI.store.dispatch(ACT.editOpacity(e.currentTarget.value / 100, SDFUI.state.scene.editItem));
  }

  function fillColorChange(e){
    SDFUI.store.dispatch(ACT.editFill(chroma(e.currentTarget.value).hex(), SDFUI.state.scene.editItem));
  }

  return {
    view: () => (
      <div style={{top:"8%",
                  padding:"14px",
                  // marginTop:"50px",
                  display:"flex",
                  flexDirection:"row"}}>
        
          <ControlGroup style="margin-left:auto;
                              margin-right:auto;"> 

          <PopoverMenu content={[
                            // <hr style={dividerStyle}/>,
                            <h6 class={Classes.Muted} style={inputLabelStyle}>Stroke Color</h6>,
                            <input type="color" style={{margin:"auto", width:"100%"}} value={SDFUI.state.scene.editItems[SDFUI.state.scene.editItem].properties.stroke} oninput={strokeColorChange}/>,
                            
                            <hr style={dividerStyle}/>,
                            <h6 class={Classes.Muted} style={inputLabelStyle}>Fill Color</h6>,
                            <input type="color" style={{margin:"auto", width:"100%"}} oninput={fillColorChange} value={SDFUI.state.scene.editItems[SDFUI.state.scene.editItem].properties.fill}/>,
                            // <hr style={dividerStyle}/>
                          ]}
                        trigger={m(Button, { iconLeft: Icons.DROPLET })}
                        menuAttrs={{style:{padding:"8px"}}}
                        />

            <PopoverMenu content={[
                        <h6 class={Classes.Muted} style={inputLabelStyle}>Stroke Weight</h6>,
                        <input type="range" oninput={strokeWeightChange} min="0" max="100" value={SDFUI.state.scene.editItems[SDFUI.state.scene.editItem].properties.weight * 10000}/>,
                        
                        <hr style={dividerStyle}/>,
                        <h6 class={Classes.Muted} style={inputLabelStyle}>Opacity</h6>,
                        <input type="range" oninput={fillOpacityChange} min="0" max="100" value={SDFUI.state.scene.editItems[SDFUI.state.scene.editItem].properties.opacity * 100}/>,
                      
                        ]}
                        trigger={m(Button, { iconLeft: Icons.PEN_TOOL })}
                        menuAttrs={{style:{padding:"8px"}}}
                        />

            <PopoverMenu content={[
                            <MenuItem iconLeft={Icons.GRID}
                              active={SDFUI.state.cursor.snapGrid}
                              onclick={toggleSnapGrid}
                              label={"Snap to Grid"}/>,
                            <MenuItem iconLeft={Icons.CROSSHAIR}
                              active={SDFUI.state.cursor.snapPt}
                              onclick={toggleSnapPt}
                              label={"Snap to Points"}/>,
                            <MenuItem iconLeft={Icons.GLOBE}
                              active={SDFUI.state.cursor.snapGlobal}
                              onclick={toggleSnapGlobal}
                              label={"Snap to Global"}/>,
                            <MenuItem iconLeft={Icons.TRIANGLE}
                              active={SDFUI.state.cursor.snapRef}
                              onclick={toggleSnapAngle}
                              label={"Snap to Relative"}/>]}
                        trigger={m(Button, { iconLeft: Icons.SETTINGS })}
                        />
          
            <CustomSelect options={primList} defaultValue={"Polyline"} onSelect={primitiveChange}/>
        
        </ControlGroup>
      </div>
    )
  }
}

export default FloatingMenu;