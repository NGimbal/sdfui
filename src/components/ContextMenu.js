import m from "mithril";
import { Button, Icon, Icons } from 'construct-ui';
// import ConstructSlider from "./ConstructSlider";
import { Classes } from 'construct-ui';
// import { ControlGroup, Button, Icons, Icon, Input, Select, Spinner, CustomSelect } from 'construct-ui';

import * as SDFUI from "../draw";
import * as ACT from '../actions';

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

function ContextMenu() {
  let visibility = false;

  let posX = 0;
  let posY = 0;

  let dragging = false;
  let hovering = false;
  let opacity = 0.9;

  function showContextMenu(e) {
    visibility = true;
    e.preventDefault();
    posX = e.clientX;
    posY = e.clientY;
    m.redraw();
  }

  function startDrag(e) {
    if(e.target.id != "contextMenu") return;
    dragging = true;
  }

  function doDrag(e) {
    if(!dragging) return;
    e.stopPropagation();
    e.preventDefault();
    posX = e.clientX;
    posY = e.clientY;
    m.redraw();
  }

  function endDrag(e) {
    if(dragging) e.preventDefault();
    dragging = false;
    hovering = false;
    m.redraw();
  }

  function closeMenu(e){
    e.preventDefault();
    visibility = false;
    hovering = false;
    dragging = false;
  }

  function hover(e){
    hovering = true;
    m.redraw();
  }

  function endHover(e){
    hovering = false;
    m.redraw();
  }


  function strokeWeightChange(e){
    SDFUI.store.dispatch(ACT.drawWeight(e.target.value / 10000));
  }

  function strokeColorChange(e){
    SDFUI.store.dispatch(ACT.drawStroke(chroma(e.target.value).hex()));
  }

  function fillOpacityChange(e){
    SDFUI.store.dispatch(ACT.drawOpacity(e.currentTarget.value / 100));
  }

  function fillColorChange(e){
    SDFUI.store.dispatch(ACT.drawFill(chroma(e.currentTarget.value).hex()));
  }

  return {
    oncreate: ()=>{
      document.querySelector('#canvasContainer').addEventListener("contextmenu", showContextMenu);
      // dragging
      document.querySelector('#contextMenu').addEventListener("mousedown", startDrag);
      document.querySelector('#contextMenu').addEventListener("mouseover", hover);
      document.querySelector('#contextMenu').addEventListener("mouseout", endHover);

      window.addEventListener("mousemove", doDrag);
      window.addEventListener("mouseup", endDrag);
    },

    view: ()=>(
      <div id="contextMenu" style={{position:"absolute",
                  top: posY + "px",
                  left: posX + "px",
                  padding:"16px",
                  background: "linear-gradient(180deg,#fff 10.5%,#f4f6f7 100%)",
                  borderRadius:"3px",
                  display:"flex",
                  flexDirection:"column",
                  cursor: "move",
                  border:"1px solid #c5cdd1",
                  boxShadow: "0 1px 0 #eef1f2",
                  opacity: hovering || dragging ? 0.9 : 0.6,
                  transition: "opacity 100ms linear",
                  // boxShadow:"10px 6px 13px -8px rgba(0,0,0,0.22)",
                  visibility: visibility ? "visible" : "hidden",}}>
        
        <Icon name={Icons.X_CIRCLE} onclick={closeMenu} style={{width:"fit-content",
                                                                alignSelf:"flex-end",
                                                                marginBottom:"5px"}}/>
        <h6 class={Classes.Muted} style={inputLabelStyle}>Stroke Weight</h6>
        <input type="range" oninput={strokeWeightChange} min="0" max="100" value={SDFUI.state.ui.properties.weight * 10000}/>
        
        <hr style={dividerStyle}/>
        <h6 class={Classes.Muted} style={inputLabelStyle}>Opacity</h6>
        <input type="range" oninput={fillOpacityChange} min="0" max="100" value={SDFUI.state.ui.properties.opacity * 100}/>
        
        <hr style={dividerStyle}/>
        <h6 class={Classes.Muted} style={inputLabelStyle}>Stroke Color</h6>
        <input type="color" style={{margin:"auto", width:"100%"}} value={SDFUI.state.ui.properties.stroke} oninput={strokeColorChange}/>
        
        <hr style={dividerStyle}/>
        <h6 class={Classes.Muted} style={inputLabelStyle}>Fill Color</h6>
        <input type="color" style={{margin:"auto", width:"100%"}} oninput={fillColorChange} value={SDFUI.state.ui.properties.fill}/>
      
      </div>
    )
  }
}

export default ContextMenu;