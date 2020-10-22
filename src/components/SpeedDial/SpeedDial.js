import m from "mithril";
import { Colors} from 'construct-ui';
import './SpeedDial.css';

// FAB with expanding sub fabs on hover
// https://material-ui.com/components/speed-dial/
// Primary function will be new canvas
// Secondary will be screenshot, svg, share, download json

function SpeedDial() {

  function rotate(e){
    // console.log(e.target);
    // Should this be using classList?
    let el = e.target;
    el.className = "";

    requestAnimationFrame(() => {
      el.className = el.mouseIn ? 'rotateIn' : 'rotateOut';

      let subs = Array.from(document.getElementsByClassName("subFab"));

      subs.map((sub, index) => sub.style.bottom = !el.mouseIn ? '60px' : index * 50 + 110 + 'px');

      el.mouseIn = !el.mouseIn;
    });
  }
  
  return {
    oncreate: () => {
      let fab = document.querySelector('#fab');
      
      fab.addEventListener('mouseenter', rotate);
      fab.addEventListener('mouseleave', rotate);
      
      fab.mouseIn = true;
    },
    view: () => (
      <div>
        <div id='fabContainer'>
          <button id='fab'>
            <i class="material-icons">add</i>
          </button>
        </div>
        <button id='subFab-1' className='subFab'>
          <i class="material-icons-outlined iSmall">photo_camera</i>
        </button>
        <button id='subFab-2' className='subFab'>
          <i class="material-icons-outlined iSmall">save_alt</i>
        </button>
        <button id='subFab-3' className='subFab'>
          <i class="material-icons-outlined iSmall">share</i>
        </button>
      </div>

    )
  }
}

export default SpeedDial;