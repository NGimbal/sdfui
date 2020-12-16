import m from "mithril";
import { Button, Icons, Drawer, DrawerPosition } from 'construct-ui';
import LayerTree from './LayerTree';
import ghlogo from '../../assets/ghlogo.svg';
// import '../../node_modules/construct-ui/lib/index.css';

import * as SDFUI from "../app/draw";
import * as ACT from '../store/actions';

// import {stressTest} from '../app/drawUI'

let dividerStyle =   {
  width:"100%",
  boxShadow:"0 1px 0 #eef1f2;",
  color:"#546e7a",
  borderRadius:"2px",
  marginTop:"10px",
  marginBottom:"24px",
  opacity:"0.5",
}

function LeftToolBar() {
  let drawerOpen = false;

  return {
    view: () => (
      <div style={{
                    display:"flex",
                    }}>
        <div style={{
                    width:"60px",
                    height:"100%",
                    padding:"10px",
                    background: "linear-gradient(-270deg,#fff 10.5%,#f4f6f7 100%)",
                    display:"flex",
                    zIndex:"21",
                    flexDirection:"column",
                    borderRight:"1px solid #c5cdd1",
                    boxShadow: "3px 0px 4px 3px #eef1f2",
                    }}>

        <Button iconLeft={Icons.USER}
                size={"x0"}
                // onclick={stressTest}
                basic={"true"}
                style="margin: 12px 0px 10px 0px;" />

        {/* <Button iconLeft={Icons.SHARE_2}
                size={"x0"}
                basic={"true"}
                style="margin: 0px 0px 10px 0px;" /> */}

        <hr style={dividerStyle}/>
        
        <Button iconLeft={Icons.MOUSE_POINTER}
                active={SDFUI.state.ui.mode === "select"}
                size={"x0"}
                basic={"true"}
                onclick={() => SDFUI.store.dispatch(ACT.uiMode("select"))}
                style="margin: 0px 0px 10px 0px;"  />

        <Button iconLeft={Icons.PEN_TOOL}
                active={SDFUI.state.ui.mode === "draw"}
                size={"x0"}
                basic={"true"}
                onclick={() => SDFUI.store.dispatch(ACT.uiMode("draw"))}
                style="margin: 0px 0px 10px 0px;"  />
        
        <Button iconLeft={Icons.LAYERS}
                active={drawerOpen}
                size={"x0"}
                basic={"true"}
                onclick={() => drawerOpen = !drawerOpen}
                style="margin: 0px 0px 10px 0px;"  />
        
        <a href='https://github.com/NGimbal/sdfui' target='_blank'>
          <div style={{padding:'8px',position:'absolute',bottom:'50px',cursor:'pointer'}}>
            <img src={ghlogo} style={{width:"24px"}}/>
          </div>
        </a>
        
        </div>
        <Drawer closeOnEscapeKey={false} 
                closeOnOutsideClick={false}
                content={
                  <LayerTree/>
                }
                style={{
                  position:"relative",
                }}
                isOpen={drawerOpen}
                hasBackdrop={false}
                inline={true}
                position={"left"}
                onClose={() => drawerOpen = false}
                />
      </div>
    )
  }
}

export default LeftToolBar;