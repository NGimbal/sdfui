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
    // m.redraw();
  }

  return {
    view: () => (
      <div style="padding:14px;
                    margin:auto;
                    display:flex;
                    flex-direction:row;">
        <ControlGroup style="margin-left:auto;
                              margin-right:auto;"> 
          {/* it is possible to mix mithril syntax m() */}
          {/* <Input contentLeft={<Icon name={Icons.SEARCH}/>}
                  placeholder={"Input placeholder..."}
                  style="width:200px"/> */}
          <Button iconLeft={Icons.DROPLET}
                size={"x0"}/>
          <Button iconLeft={Icons.GRID}
                size={"x0"}/>
          <Button iconLeft={Icons.CROSSHAIR}
                size={"x0"}/>
          <Select options={primList} onchange={primitiveChange}/>
        </ControlGroup>
      </div>
    )
  }
}

export default FloatingMenu;