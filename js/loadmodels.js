// const ENABLE_DROP = true;

//Prevent screw up when dropping files outside of dropzone
// window.addEventListener("dragover",function(e){
//   e = e || event;
//   e.preventDefault();
// },false);
//
// window.addEventListener("drop",function(e){
//   e = e || event;
//   e.preventDefault();
// },false);

// ondrop="dropHandler(event);" ondragover="dragOverHandler(event);"

var dropHandler = function(ev){
  console.log('File(s) dropped');

  // Prevent default behavior (Prevent file from being opened)
  ev.preventDefault();

  if (ev.dataTransfer.items) {
    // Use DataTransferItemList interface to access the file(s)
    for (var i = 0; i < ev.dataTransfer.items.length; i++) {
      // If dropped items aren't files, reject them
      if (ev.dataTransfer.items[i].kind === 'file') {
        var file = ev.dataTransfer.items[i].getAsFile();
        console.log('... file[' + i + '].name = ' + file.name);
      }
    }
  } else {
    // Use DataTransfer interface to access the file(s)
    for (var i = 0; i < ev.dataTransfer.files.length; i++) {
      console.log('... file[' + i + '].name = ' + ev.dataTransfer.files[i].name);
    }
  }
}

var dragOverHandler = function(ev){
  console.log("hi");
  console.log(ev);
  console.log('File(s) in drop zone');

  // Prevent default behavior (Prevent file from being opened)
  ev.preventDefault();
}

// document.getElementById("drop_zone").addEventListener("drop", dropHandler);
// document.getElementById("drop_zone").addEventListener("dragover", dragOverHandler);
window.addEventListener("drop", dropHandler);
window.addEventListener("dragover", dragOverHandler);
