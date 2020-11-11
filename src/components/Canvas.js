import m from "mithril";

import '../sdfui.css';

import {initDraw, addImage} from '../renderer/draw';
import SpeedDial from "./SpeedDial/SpeedDial";

function Canvas() {
  function handleDragEnter(e){
    e.preventDefault();
    e.stopPropagation();
    document.querySelector('#canvasContainer').classList.add('dragOver');
  }

  function handleDragOver(e){
    e.preventDefault();
    e.stopPropagation();
    document.querySelector('#canvasContainer').classList.add('dragOver');
  }

  function handleDragLeave(e){
    e.preventDefault();
    e.stopPropagation();
    document.querySelector('#canvasContainer').classList.remove('dragOver');
  }

  function handleDrop(e){
    e.preventDefault();
    e.stopPropagation();
    let canvas = document.querySelector('#canvasContainer');
    canvas.classList.remove('dragOver');
    
    // console.log (e);
    let dt = e.dataTransfer;
    let files = dt.files;
    
    // looks like this works
    var regex = new RegExp("([a-zA-Z0-9\s_\\.\-:])+(.jpg|.jpeg|.png|.gif)$");

    if (FileReader && files && files.length && 
                      regex.test(files[0].name.toLowerCase())){
      let fr = new FileReader();

      fr.onload = function (obj) {

        var image = new Image();
        image.src = fr.result;

        image.onload = function () {
          let dims = {
            width: this.width,
            height: this.height,
          }

          let rect = canvas.getBoundingClientRect();
      
          let evPt = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
          };

          addImage(this.src, dims, evPt);
        }
      }
      fr.readAsDataURL(files[0]);
    } else {
      //failure message, toast em prolly
      console.log("media import failed!")``
    }
  }

  return {
    oncreate: () => {
      initDraw();
      
      document.querySelector("#canvasContainer").addEventListener('dragenter', handleDragEnter)
      document.querySelector("#canvasContainer").addEventListener('dragleave', handleDragLeave)      
      document.querySelector("#canvasContainer").addEventListener('dragover', handleDragOver)
      document.querySelector("#canvasContainer").addEventListener('drop', handleDrop)

    },
    view: () => (
      <div id="canvasContainer" className="canvas">
        <canvas id="c" className="canvas"></canvas>
        <canvas id="text" className="canvas"></canvas>
      </div>
    )
  }
}

export default Canvas;