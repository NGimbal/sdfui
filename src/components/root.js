import m from 'mithril';
import { FocusManager } from 'construct-ui';
// require('../../node_modules/construct-ui/lib/index.css');
import '../../node_modules/construct-ui/lib/index.css';
import '../sdfui.css';

import {store} from '../app/draw';

import FloatingMenu from './FloatingMenu';
import ContextMenu from './ContextMenu';
import LeftToolBar from './LeftToolBar';
import AppBar from './AppBar';
import Canvas from './Canvas';
import SpeedDial from './SpeedDial/SpeedDial';
//Main UI scheme:
//Narrow vertical toolbar w/ high level tool options
//'Floating Action Menu' at top (or bottom?) for each context
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
      FocusManager.showFocusOnlyOnTab();
    },
    view: () => (
      <main className="grid" style={{flexDirection:'column'}}>
        <AppBar/>
        <div className="grid" style={{flexDirection:'row'}}>
          <LeftToolBar/>
            <div className="grid" style={{flexDirection:'column'}}>
              <FloatingMenu/>
              <Canvas/>
            </div>
        </div>
        <ContextMenu/>
        <SpeedDial/>
      </main>
    )
  }
}

export default Root;