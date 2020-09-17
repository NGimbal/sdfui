import m from "mithril";
import { Button, Icons, Icon } from 'construct-ui';
// import '../../node_modules/construct-ui/lib/index.css';
import {initDraw} from '../draw'
import FloatingMenu from "./FloatingMenu";
import ContextMenu from "./ContextMenu";
import LeftToolBar from "./LeftToolBar";

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
        <div id="canvasContainer" className="canvas">
          <canvas id="c" className="canvas"></canvas>
          <canvas id="text" className="canvas"></canvas>
        </div>
        <ContextMenu/>
        <LeftToolBar/>
        <FloatingMenu/>
      </main>
    )
  }
}

export default Root;