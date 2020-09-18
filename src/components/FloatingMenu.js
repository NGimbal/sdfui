import m from "mithril";
import { ControlGroup, Button, Icons, Icon, Input, Select, Spinner, CustomSelect } from 'construct-ui';
// import '../../node_modules/construct-ui/lib/index.css';
import * as SDFUI from '../draw'
import * as ACT from '../actions'
import {bakeLayer, createEditLayer} from '../layer';

function FloatingMenu() {
  let primSel = "Circle";
  let primList = ["Polyline", "Polygon", "Circle", "Rectangle"];

  function primitiveChange(e){
    primSel = e.currentTarget.value.toLowerCase();

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

  return {
    oncreate: () => {
      console.log(SDFUI.state);
    },
    view: () => (
      <div style={{top:"8%",
                  padding:"14px",
                  marginTop:"50px",
                  display:"flex",
                  flexDirection:"row"}}>
        
          <ControlGroup style="margin-left:auto;
                              margin-right:auto;"> 
          
          <Button iconLeft={Icons.DROPLET}
                  size={"x0"}/>

          <Button iconLeft={Icons.GRID}
                  active={SDFUI.state.cursor.snapGrid}
                  size={"x0"}
                  onclick={toggleSnapGrid}/>
          
          <Button iconLeft={Icons.CROSSHAIR}
                  active={SDFUI.state.cursor.snapPt}
                  size={"x0"}
                  onclick={toggleSnapPt}/>

          <Button iconLeft={Icons.GLOBE}
                  active={SDFUI.state.cursor.snapGlobal}
                  size={"x0"}
                  onclick={toggleSnapGlobal}/>

          <Button iconLeft={Icons.TRIANGLE}
                  active={SDFUI.state.cursor.snapRef}
                  size={"x0"}
                  onclick={toggleSnapAngle}/>
          
          <Select options={primList} onchange={primitiveChange}/>
        
        </ControlGroup>
      </div>
    )
  }
}

export default FloatingMenu;