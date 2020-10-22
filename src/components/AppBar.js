import m from "mithril";
import {Icons, Icon, Colors } from 'construct-ui';

function AppBar() {

  return {
    view: () => (
      <div style={{
                  width:"100%",
                  height:"55px",
                  top:"0px",
                  left:"0px",
                  padding:"10px",
                  background: Colors.RED400,
                  borderBottom:"2px solid #c5cdd1",
                  boxShadow: "0px 2px 2px 1px rgba(55,71,79,0.125)",
                  zIndex:"10",
                  display:"flex",
                  alignItems: "center",
                  justifyContent:"flex-end",
                }}>
      </div>
    )
  }
}

export default AppBar;