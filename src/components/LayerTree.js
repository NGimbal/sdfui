import m from "mithril";
import { Button, Icon, Icons, List, ListItem, Size, Switch } from 'construct-ui';

import * as SDFUI from "../renderer/draw";
import * as ACT from '../store/actions';
import {deleteItem}  from '../renderer/drawUI'

import chroma from 'chroma-js';

function LayerTree() {

  function strokeColorChange(e){
    let id = e.target.getAttribute('data-id');
    let index = SDFUI.state.scene.editItems.findIndex(item => item.id === id);
    SDFUI.store.dispatch(ACT.editStroke(chroma(e.target.value).hex(), index));
  }

  function fillColorChange(e){
    let id = e.target.getAttribute('data-id');
    let index = SDFUI.state.scene.editItems.findIndex(item => item.id === id);
    SDFUI.store.dispatch(ACT.editFill(chroma(e.target.value).hex(), index));
  }

  function trashObject(e){
    // console.log(this)
    let index = SDFUI.state.scene.editItems.findIndex(i => i.id === this);
    console.log( "delete " + this + " at " + index);
    deleteItem(index);
    // this doesn't work yet - will need more time to figure out I think >.<
    // SDFUI.store.dispatch(ACT.sceneRmvItem(this));
  }

  function rowBeginDrag(e){
    console.log("row begin drag");
    console.log(e);
  }

  function selectObject(e){

    let item = SDFUI.state.scene.editItems.find(item => item.id === this);
    
    if(SDFUI.state.scene.selected.filter(id => id === this).length > 0){
      SDFUI.store.dispatch(ACT.editSelectRmv(this));
    } else {
      SDFUI.store.dispatch(ACT.editSelectIns(this));
    }

    if(SDFUI.state.scene.selected.length > 0){
      SDFUI.store.dispatch(ACT.uiMode("select"));
    } else {
      SDFUI.store.dispatch(ACT.uiMode("draw"));
    }
  }

  return {
    view: () => (
      <div>
        <List style={{height:"100%", maxHeight:"unset"}}>
          {
            SDFUI.state.scene.editItems.map(item => <ListItem label={item.type.charAt(0).toUpperCase() + item.type.slice(1)} 
                    onclick={selectObject.bind(item.id)}
                    selected={SDFUI.state.scene.selected.includes(item.id)}
                    contentRight={
                      <div style={{display:"flex", flexDirection:"row", width:"100px"}}>
                        <input type="color" style={{margin:"auto", width:"100%", backgroundColor:"white", border:"none"}} value={item.properties.stroke} data-id={item.id} oninput={strokeColorChange}/>
                        <input type="color" style={{margin:"auto", width:"100%", backgroundColor:"white", border:"none"}} value={item.properties.fill} data-id={item.id} oninput={fillColorChange}/>
                        <Button iconLeft={Icons.TRASH_2}
                          size={"x0"}
                          basic={"true"}

                          onclick={trashObject.bind(item.id)}
                          />
                      </div>
                    }
                    contentLeft={
                      <Icon
                        style={{cursor:"move"}}
                        name={Icons.MORE_VERTICAL}
                        onclick={rowBeginDrag}
                      />
                    }
            />)
          }
        </List>
      </div>
    )
  }
}

export default LayerTree;