import m from "mithril";
import { Button, Icons, List, ListItem, Size, Switch } from 'construct-ui';

import * as SDFUI from "../renderer/draw";
import * as ACT from '../store/actions';

function LayerTree() {

  function strokeColorChange(e){
    SDFUI.store.dispatch(ACT.drawStroke(chroma(e.target.value).hex()));
  }

  // let layers = [];

  //Expose part of state
  //There might be another way to listen to changes on the
  //shared doc that this becomes at some point
  // function listener(){
  //   layers = [...SDFUI.store.getState().scene.editItems];
  //   m.redraw();
  // };

  //subscribe to store changes - run listener to set relevant variables
  // SDFUI.store.subscribe(() => listener());

  return {
    view: () => (
      <div>
        <List>
          {
            layers.map(item => <ListItem label={item.type + " " + item.id} contentRight={
              <div style={{display:"flex", flexDirection:"row", width:"50px"}}>
              <input type="color" style={{margin:"auto", width:"100%"}} value={item.properties.stroke}/>
              <input type="color" style={{margin:"auto", width:"100%"}} value={item.properties.fill}/>
              </div>
            }/>)
          }
          {/* <input type="color" style={{margin:"auto", width:"100px"}} value={SDFUI.state.ui.properties.stroke} oninput={strokeColorChange}/> */}
        </List>
      </div>
    )
  }
}

export default LayerTree;