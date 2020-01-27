"use strict";
//fluentHints.js

//implements all left pane UI functionality
//needs cleaning up / standardization, ideally all these functions would take uiMod
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

function addButtonHeading(uiMod){
  let buttonStack = document.getElementById('button-stack');
  let stack = buttonStack.children;

  let buttonHint = document.createElement("div");
  buttonHint.id = uiMod.tag;// + "-header";

  buttonHint.classList.add("button-header");
  buttonHint.classList.add("enter-left");

  let bgColor = "rgba(172, 172, 180, 0.00)";
  buttonHint.innerText = uiMod.tag.charAt(0).toUpperCase() + uiMod.tag.substring(1);
  buttonHint.style.backgroundColor = bgColor;

  buttonStack.appendChild(buttonHint);

  return buttonHint;
}

function addButtonHint(uiMod){
  let buttonStack = document.getElementById('button-stack');
  let stack = buttonStack.children;

  let buttonHint = document.createElement("div");
  buttonHint.id = uiMod.name;

  buttonHint.classList.add("button-hint");
  buttonHint.classList.add("enter-left");
  buttonHint.classList.add(uiMod.tag);

  // might want to add a "button description or something"
  buttonHint.innerText = uiMod.keyCut + " : " + uiMod.name;

  buttonStack.appendChild(buttonHint);

  return buttonHint;
}

function modButtonStack(uiMode){
  let buttonStack = document.getElementById('button-stack');
  let stack = buttonStack.children;

  //if a modifier is in the button stack don't do anything
  //if a modifier isn't in the button stack add it under the correct heading
  //if a stack element isn't in the mode's list of modifiers, remove it

  //for each element in the stack
  //is it one of the mode's modifiers?
  //if no, remove
  //if yes, do nothing

  //for each modifier
  //is it on the stack?
  //if no, add it in the correct place


  // for (let m of uiMode.modifiers){
  //   for (let e of stack){
  //     if(m.tag == e.id){
  //       let buttonHint = document.createElement("div");
  //       buttonHint.id = uiMod.name;
  //
  //       buttonHint.classList.add("button-hint");
  //       buttonHint.classList.add("enter-left");
  //       buttonHint.classList.add(uiMod.tag);
  //
  //       // might want to add a "button description or something"
  //       buttonHint.innerText = uiMod.keyCut + " : " + uiMod.name;
  //
  //       buttonStack.insertAfter(buttonHint, e);
  //       continue;
  //     }
  //     addButtonHeading(m);
  //     addButtonHint(m);
  //   }
  // }
}

function insertAfter(el, referenceNode) {
  referenceNode.parentNode.insertBefore(el, referenceNode.nextSibling);
}


function toggleActive(uiMod){
  let classAct = uiMod.tag + "-active";
  uiMod.button.elem.classList.toggle(classAct);
}

function pulseActive(uiMod){
  let classAct = uiMod.tag + "-active";
  uiMod.button.elem.classList.toggle(classAct);
  window.setTimeout(function(){uiMod.button.elem.classList.toggle(classAct);}.bind(uiMod), 250);
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

function snackHint(text, _bgColor){
  let snackbar = document.getElementById('snackbar');

  if(snackbar.classList.contains('show')) return;

  let bgColor = _bgColor || "rgba(237, 55, 67, .75)";

  snackbar.innerHTML = text;
  snackbar.style.background = bgColor;

  snackbar.classList.toggle('show');
  setTimeout(function(){ snackbar.classList.toggle('show'); }, 2000);
}

//this fails for buttons will have to fix
function getModeHintID(id){
  let modeHints = document.getElementById("mode-stack").children;
  for (let m of modeHints){
    if(m.id === id) return m;
  }
  //if no mode hint exists
  return null;
}

export {pushModeHint, addButtonHeading, addButtonHint, popModeHint,
        pushPopModeHint, snackHint, getModeHintID, pulseActive, toggleActive,
      modButtonStack};
