import m from "mithril";
import { Button, Icons, Icon } from 'construct-ui';
// import '../../node_modules/construct-ui/lib/index.css';
import {initDraw} from '../draw'
import FloatingMenu from "./floatingMenu";

//Main UI scheme:
//Narrow vertical toolbar w/ high level tool options
//"Floating Action Menu" at top (or bottom?) for each context
//Big canvas
//  -Draw
//    -Save
//    -Share link
//    -Choose tool
//      -Awk to have a menu in a FAB
//      -Awk to have a menu in a vertical toolbar as well
//  -Edit
//  -Profile / Settings


function Root() {
  return {
    oncreate: () => {
      initDraw();
    },
    view: () => (
      <main>
        <div id="canvasContainer">
          <canvas id="c"></canvas>
          <canvas id="text"></canvas>
        </div>
        <div style="position:absolute; 
                    width:60px; 
                    height:100%; 
                    top:0px; 
                    left:0px; 
                    padding:10px; 
                    background-color:white;
                    display: flex;
                    flex-direction: column;
                    -webkit-box-shadow: 8px 0px 9px -8px rgba(0,0,0,0.35);
                    -moz-box-shadow: 8px 0px 9px -8px rgba(0,0,0,0.35);
                    box-shadow: 8px 0px 9px -8px rgba(0,0,0,0.35);
                    ">

        <Button iconLeft={Icons.FILTER}
                size={"x0"}
                basic={"true"}
                style="margin: 20px 0px 10px 0px;" />
        
        <Button iconLeft={Icons.SETTINGS}
                size={"x0"}
                basic={"true"}
                style="margin: 0px 0px 10px 0px;"  />

        <Button iconLeft={Icons.PEN_TOOL}
                size={"x0"}
                basic={"true"}
                style="margin: 0px 0px 10px 0px;"  />
                
        </div>
        <FloatingMenu/>
      </main>
    )
  }
}

export default Root;