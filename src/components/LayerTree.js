import m from "mithril";
import { Button, Icon, Icons, List, ListItem, Size, Switch } from 'construct-ui';

import * as SDFUI from "../app/draw";
import * as ACT from '../store/actions';
import {deleteItem}  from '../app/drawUI'

import chroma from 'chroma-js';

function LayerTree() {

  function strokeColorChange(e){
    let id = e.target.getAttribute('data-id');
    SDFUI.store.dispatch(ACT.editStroke(chroma(e.target.value).hex(), id));
  }

  function fillColorChange(e){
    let id = e.target.getAttribute('data-id');
    SDFUI.store.dispatch(ACT.editFill(chroma(e.target.value).hex(), id));
  }

  function trashObject(e){
    console.log( "delete " + this);
    deleteItem(this);
  }

  function rowBeginDrag(e){
    console.log("row begin drag");
    console.log(e);
  }

  function selectObject(e){

    let item = SDFUI.state.scene.editItems.find(item => item.id === this);
    console.log(this);
    if(SDFUI.state.scene.selected.filter(id => id === this).length > 0){
      SDFUI.store.dispatch(ACT.editSelectRmv(this));
    } else {
      SDFUI.store.dispatch(ACT.editSelectApnd([this]));
    }

    // doesn't need to kick you to selection mode if you 
    // use the LayerTree to select something
    // if(SDFUI.state.scene.selected.length > 0){
    //   SDFUI.store.dispatch(ACT.uiMode("select"));
    // } else {
    //   SDFUI.store.dispatch(ACT.uiMode("draw"));
    // }
  }

  return {
    view: () => (
      <div>
        <List style={{height:"100%", maxHeight:"unset"}}>
          {
            SDFUI.state.scene.editItems.map(item => {
            if(item.pts.length === 0 && item.type !== "image") return;
            return (
                  <ListItem label={item.type.charAt(0).toUpperCase() + item.type.slice(1)} 
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
                  />
                )
              }
            )
          }
        </List>
      </div>
    )
  }
}

export default LayerTree;