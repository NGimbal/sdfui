import m from "mithril";
import { Button, Icons, List, ListItem, Size, Switch } from 'construct-ui';

import * as SDFUI from "../renderer/draw";
import * as ACT from '../store/actions';

function LayerTree() {

  function strokeColorChange(e){
    SDFUI.store.dispatch(ACT.editStroke(chroma(e.target.value).hex()));
  }

  return {
    view: () => (
      <div>
        <List>
          {
            SDFUI.state.scene.editItems.map(item => <ListItem label={item.type + " " + item.id} contentRight={
              <div style={{display:"flex", flexDirection:"row", width:"50px"}}>
              <input type="color" style={{margin:"auto", width:"100%"}} value={item.properties.stroke}/>
              <input type="color" style={{margin:"auto", width:"100%"}} value={item.properties.fill}/>
              </div>
            }/>)
          }
        </List>
      </div>
    )
  }
}

export default LayerTree;