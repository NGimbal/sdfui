import m from "mithril";
import { Button, Icon, Icons } from 'construct-ui';
import ConstructSlider from "./ConstructSlider";
// import { ControlGroup, Button, Icons, Icon, Input, Select, Spinner, CustomSelect } from 'construct-ui';

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
    // console.log(e);
  }

  function doDrag(e) {
    // if(e.target.id != "contextMenu") return;
    // console.log("mousemove");
    if(!dragging) return;
    e.preventDefault();
    posX = e.clientX;
    posY = e.clientY;
    m.redraw();
  }

  function endDrag(e) {
    // if(e.target.id != "contextMenu") return;
    if(dragging) e.preventDefault();
    // console.log("mouseup");
    dragging = false;
    hovering = false;
    m.redraw();
    // console.log(e);
  }

  function closeMenu(e){
    e.preventDefault();
    visibility = false;
    hovering = false;
    dragging = false;
  }

  function hover(e){
    console.log("mouseover");
    hovering = true;
    m.redraw();
  }

  function endHover(e){
    console.log("mouseout");
    hovering = false;
    m.redraw();
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
        
        <ConstructSlider/>
        
        <input type="color" style={{margin:"auto", width:"100%"}}/>
      </div>
    )
  }
}

export default ContextMenu;