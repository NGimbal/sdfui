
function snapPtClck(e){
  this.toggle = !this.toggle;

  if(this.toggle){
    pushModeHint(this.name, "Snap to a Point");
  } else {
    popModeHint(getModeHintID(this.name));
  }
}

function snapRefClck(e){
  this.toggle = !this.toggle;

  if(this.toggle){
    pushModeHint(this.name, "Snap to Relative Angle");
  } else {
    popModeHint(getModeHintID(this.name));
  }
}

function snapGlobalClck(e){
  this.toggle = !this.toggle;

  if(this.toggle){
    pushModeHint(this.name, "Snap to Global Angle");
  } else {
    popModeHint(getModeHintID(this.name));
  }
}

function snapGridClck(e){
  this.toggle = !this.toggle;

  if(this.toggle){
    pushModeHint(this.name, "Snap to Grid");
  } else {
    popModeHint(getModeHintID(this.name));
  }
}

//--These are defined twice which is not ideal
function pushModeHint(id, text, _bgColor){
  let modeStack = document.getElementById('mode-stack');
  let stack = modeStack.children;

  let modeSnack = document.createElement("div");
  modeSnack.id = id;

  modeSnack.classList.add("mode-hint");
  modeSnack.classList.add("enter-left");

  let bgColor = _bgColor || "rgba(237, 55, 67, .75)";
  modeSnack.innerText = text;
  modeSnack.style.backgroundColor = bgColor;

  if(stack.length>0){
    modeStack.insertBefore(modeSnack, stack[0]);
  } else {
    modeStack.appendChild(modeSnack);
  }
  return modeSnack;
}

function popModeHint(elem){
  elem.classList.remove("enter-left");
  elem.classList.add("exit-left");

  setTimeout(function(){this.remove();}.bind(elem), 1000);
}

function pushPopModeHint(id, text, _bgColor){
  let modeHint = pushModeHint(id, text, _bgColor);
  setTimeout(function(){popModeHint(this);}.bind(modeHint), 3000);
}

export {snapPtClck, snapRefClck, snapGlobalClck, snapGridClck};
