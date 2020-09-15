import m from "mithril";
import { Button, Icons } from 'construct-ui';
// import '../../node_modules/construct-ui/lib/index.css';
import {initDraw} from '../draw'

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
                    width:60; 
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
      </main>
    )
  }
}

export default Root;