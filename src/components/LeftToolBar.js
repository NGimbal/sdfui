import m from "mithril";
import { Button, Icons, Icon } from 'construct-ui';
// import '../../node_modules/construct-ui/lib/index.css';
import {initDraw} from '../draw'


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
  return {
    view: () => (
      <div>
        <div style={{position:"absolute",
                    width:"60px",
                    height:"100%",
                    top:"0px",
                    left:"0px",
                    padding:"10px",
                    background: "linear-gradient(-270deg,#fff 10.5%,#f4f6f7 100%)",
                    display:"flex",
                    flexDirection:"column",
                    borderRight:"1px solid #c5cdd1",
                    boxShadow: "3px 0px 4px 3px #eef1f2",
                    }}>

        <Button iconLeft={Icons.USER}
                size={"x0"}
                basic={"true"}
                style="margin: 90px 0px 10px 0px;" />

        <Button iconLeft={Icons.SHARE_2}
                size={"x0"}
                basic={"true"}
                style="margin: 0px 0px 10px 0px;" />

        <hr style={dividerStyle}/>

        <Button iconLeft={Icons.PEN_TOOL}
                active={true}
                size={"x0"}
                basic={"true"}
                style="margin: 0px 0px 10px 0px;"  />
        
        <Button iconLeft={Icons.LAYERS}
                size={"x0"}
                basic={"true"}
                style="margin: 0px 0px 10px 0px;"  />

        <Button iconLeft={Icons.EDIT_2}
                size={"x0"}
                basic={"true"}
                style="margin: 0px 0px 10px 0px;"  />
                
        </div>
      </div>
    )
  }
}

export default LeftToolBar;