import m from "mithril";
import { Button, Icons, List, ListItem, Size, Switch } from 'construct-ui';

import * as SDFUI from "../renderer/draw";
import * as ACT from '../store/actions';

import chroma from 'chroma-js';

function LayerTree() {

  function strokeColorChange(e){
    let id = e.target.getAttribute('data-id');
    let index = SDFUI.state.scene.editItems.findIndex(item => item.id === id);
    SDFUI.store.dispatch(ACT.editStroke(chroma(e.target.value).hex(), index));
  }

  function trashObject(e){
    console.log(this)
    // this doesn't work yet - will need more time to figure out I think >.<
    // SDFUI.store.dispatch(ACT.sceneRmvItem(this));
  }

  return {
    view: () => (
      <div>
        <List>
          {
            SDFUI.state.scene.editItems.map(item => <ListItem label={item.type + " " + item.id} contentRight={
              <div style={{display:"flex", flexDirection:"row", width:"100px"}}>
              <input type="color" style={{margin:"auto", width:"100%", backgroundColor:"white", border:"none"}} value={item.properties.stroke} data-id={item.id} oninput={strokeColorChange}/>
              <input type="color" style={{margin:"auto", width:"100%", backgroundColor:"white", border:"none"}} value={item.properties.fill} data-id={item.id}/>
              <Button iconLeft={Icons.TRASH_2}
                size={"x0"}
                basic={"true"}
                //there's gotta be a better way to do this
                onclick={trashObject.bind(item.id)}
                />
              </div>
            }/>)
          }
        </List>
      </div>
    )
  }
}

export default LayerTree;