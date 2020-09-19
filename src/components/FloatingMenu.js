import m from "mithril";
import { ControlGroup, Classes, Button, Icons, CustomSelect, PopoverMenu, MenuItem } from 'construct-ui';
// import '../../node_modules/construct-ui/lib/index.css';
import * as SDFUI from '../draw'
import * as ACT from '../store/actions'
import {bakeLayer, createEditLayer} from '../layer';


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
      
      if(currItem && currItem.pts.length > 1){
        bakeLayer(SDFUI.layers[SDFUI.layers.length - 1]);
        let currItem = SDFUI.state.scene.editItems[SDFUI.state.scene.editItem];
        SDFUI.store.dispatch(ACT.scenePushEditItem(currItem.type));
      } else {
        SDFUI.layers.pop();
        SDFUI.store.dispatch(ACT.sceneNewEditItem(primSel));
      }

      nextPrim = SDFUI.state.scene.editItems[SDFUI.state.scene.editItem];
      newLayer = createEditLayer(nextPrim);
      SDFUI.layers.push(newLayer); 
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

  function strokeColorChange(e){
    SDFUI.store.dispatch(ACT.drawStroke(chroma(e.target.value).hex()));
  }

  function fillColorChange(e){
    SDFUI.store.dispatch(ACT.drawFill(chroma(e.currentTarget.value).hex()));
  }

  return {
    view: () => (
      <div style={{top:"8%",
                  padding:"14px",
                  marginTop:"50px",
                  display:"flex",
                  flexDirection:"row"}}>
        
          <ControlGroup style="margin-left:auto;
                              margin-right:auto;"> 

          <PopoverMenu content={[
                            // <hr style={dividerStyle}/>,
                            <h6 class={Classes.Muted} style={inputLabelStyle}>Stroke Color</h6>,
                            <input type="color" style={{margin:"auto", width:"100%"}} value={SDFUI.state.ui.properties.stroke} oninput={strokeColorChange}/>,
                            
                            <hr style={dividerStyle}/>,
                            <h6 class={Classes.Muted} style={inputLabelStyle}>Fill Color</h6>,
                            <input type="color" style={{margin:"auto", width:"100%"}} oninput={fillColorChange} value={SDFUI.state.ui.properties.fill}/>,
                            // <hr style={dividerStyle}/>
                          ]}
                        trigger={m(Button, { iconLeft: Icons.DROPLET })}
                        menuAttrs={{style:{padding:"8px"}}}
                        // style={{padding:"4px"}}
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