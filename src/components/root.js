import m from "mithril";
import { FocusManager } from 'construct-ui';
// require('../../node_modules/construct-ui/lib/index.css');
import '../../node_modules/construct-ui/lib/index.css';
import '../sdfui.css';

import {initDraw} from '../renderer/draw';

import FloatingMenu from "./FloatingMenu";
import ContextMenu from "./ContextMenu";
import LeftToolBar from "./LeftToolBar";
import AppBar from "./AppBar";

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
      FocusManager.showFocusOnlyOnTab();
    },
    view: () => (
      <main>
        <AppBar/>
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