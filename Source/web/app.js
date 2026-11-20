'use strict';
const C=PiWire,$=id=>document.getElementById(id);let doc=C.blankProject(),saved=JSON.stringify(doc),selected=null,undo=[],redo=[],pending=null,bends=[],drag=null,view={x:0,y:0,w:1100,h:800},requestID=0,requests=new Map(),dirtyState=false;
function native(action,data={}){if(window.desktop)return window.desktop.request(action,data);if(window.webkit?.messageHandlers.bridge)return new Promise((resolve,reject)=>{let id=++requestID;requests.set(id,{resolve,reject});window.webkit.messageHandlers.bridge.postMessage({id,action,data})});return Promise.reject(Error(tr('Diese Funktion ist in der Desktop-App verfügbar.')));}
window.nativeReply=(id,result,error)=>{let p=requests.get(id);if(p){requests.delete(id);error?p.reject(Error(error)):p.resolve(result)}};
let toastTimer;function toast(s){$('toast').textContent=s;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),4000)}
function checkpoint(){undo.push(JSON.stringify(doc));if(undo.length>100)undo.shift();redo=[]}
function changed(){let dirty=JSON.stringify(doc)!==saved;if(dirty!==dirtyState){dirtyState=dirty;native('dirty',{dirty}).catch(()=>{})}$('dirty').textContent=dirty?tr('Ungespeicherte Änderungen'):tr('Gespeichert');$('undo').disabled=!undo.length;$('redo').disabled=!redo.length;render()}
let wireRoutes = [];
let tourPreview = null;
let symbolLibrary = [];
function render(recalculate = true) {
  const project = tourPreview?.project ?? doc;
  const selection = tourPreview ? tourPreview.selection : selected;
  if (recalculate) wireRoutes = C.routes(project);
  const routes = drag?.preview ? wireRoutes.map((wire, index) => index === drag.wireIndex ? drag.preview : wire) : wireRoutes;
  const handleRadius = 5 * view.w / Math.max(1, $('canvas').clientWidth);
  $('scene').innerHTML = C.svg(project, {content:true, selected:selection, routes, handleRadius});
  $('title').textContent = project.title || tr('Schaltplan');
  $('status').textContent = tr('Bauteile: {0} · Leitungen: {1}',project.parts.length,project.wires.length);
}
function setView(){let r=$('stage').getBoundingClientRect();view.h=view.w*r.height/r.width;$('canvas').setAttribute('viewBox',`${view.x} ${view.y} ${view.w} ${view.h}`);$('zoomLabel').textContent=Math.round(r.width/view.w*100)+' %'}
function fit(){let b=C.bounds(tourPreview?.project ?? doc,wireRoutes),r=$('stage').getBoundingClientRect();view.w=Math.max(b.w,b.h*r.width/r.height);view.x=b.x-(view.w-b.w)/2;view.y=b.y;setView();render(false)}
function zoom(f,p){let r=$('stage').getBoundingClientRect(),anchor=p||{x:view.x+view.w/2,y:view.y+view.h/2},newW=Math.max(250,Math.min(12000,view.w*f)),scale=newW/view.w;view.x=anchor.x-(anchor.x-view.x)*scale;view.y=anchor.y-(anchor.y-view.y)*scale;view.w=newW;setView();render(false)}
function position(e){let r=$('canvas').getBoundingClientRect();return{x:view.x+(e.clientX-r.left)*view.w/r.width,y:view.y+(e.clientY-r.top)*view.h/r.height}}
const wireSnap = p => ({x:Math.round(p.x / 10) * 10, y:Math.round(p.y / 10) * 10});
const snap = p => ({x:C.grid(p.x), y:C.grid(p.y)});
function palette() {
  const query = $('search').value.toLowerCase();
  const custom = symbolLibrary;
  const builtIn = C.catalog.filter(item => tr(item.name).toLowerCase().includes(query)).map(item =>
    `<button class="part-button" data-kind="${item.kind}">${C.icon(item.kind)}<span>${C.esc(tr(item.name))}</span></button>`);
  custom.forEach((symbol, index) => {
    if (symbol.name.toLowerCase().includes(query)) {
      builtIn.push(`<button class="part-button" data-symbol="${index}">${C.symbolSVG(symbol)}<span>${C.esc(symbol.name)}</span></button>`);
    }
  });
  $('palette').innerHTML = builtIn.join('');
  $('templateCount').textContent = tr('{0} Vorlagen', C.catalog.length + custom.length);
}
$('search').oninput = palette;
$('palette').onclick = event => {
  const button = event.target.closest('[data-kind],[data-symbol]');
  if (!button) return;
  if (doc.parts.length >= 200) return toast(tr('Maximal 200 Bauteile pro Projekt.'));
  const p = snap({x:view.x+view.w/2, y:view.y+view.h/2});
  insertPart(button.dataset.symbol === undefined ? C.make(button.dataset.kind,p.x,p.y)
    : C.makeSymbol(symbolLibrary[Number(button.dataset.symbol)],p.x,p.y));
};
function insertPart(part) {
  checkpoint();
  doc.parts.push(part);
  selected = part.id;
  cancelWire();
  changed();
  inspect();
  $('canvas').focus();
}

function inspect() {
  const project = tourPreview?.project ?? doc;
  const selection = tourPreview ? tourPreview.selection : selected;
  const part = project.parts.find(p => p.id === selection), wire = project.wires.find(w => w.id === selection);
  $('partInspector').hidden = !part;
  $('wireInspector').hidden = !wire;
  $('emptyInspector').hidden = !!(part || wire);
  if (wire) $('wireColor').value = wire.color;
  if (!part) return;
  const raspberry = part.kind === 'pi';
  const editablePins = !part.symbol && C.moduleKind(part.kind);
  $('partName').value = part.name;
  $('partValue').value = part.value;
  $('partHideName').checked = !!part.hideName;
  $('partHideValue').checked = !!part.hideValue;
  $('hideValueText').textContent = tr(raspberry ? 'GPIO-Funktionen ausblenden' : 'Wert ausblenden');
  $('partColorLabel').hidden = part.kind !== 'led';
  $('partColor').value = part.color ?? '#bd2c43';
  $('pinsTitle').textContent = tr(raspberry ? 'Sichtbare Pins (physisch)' : 'Anschlüsse');
  $('partPins').value = (raspberry ? part.piPins : part.pins).join(', ');
  $('partPins').disabled = !raspberry && !editablePins;
  $('pinHelp').textContent = tr(raspberry ? 'Beispiel: 1, 11, 25 · alle Pins: 1-40' :
    editablePins ? 'Kommagetrennt. Änderungen lösen vorhandene Leitungen.' : 'Feste Anschlüsse dieses Schaltsymbols.');
  $('rotate').disabled = raspberry;
  $('pinLegend').innerHTML = raspberry ? part.piPins.map(pin => `Pin ${pin} → ${C.esc(C.pins[pin-1])}`).join('<br>') :
    C.ports(part).map(pin => C.esc(pin.label)).join(' · ');
}

for (const [control, key] of [['partHideName','hideName'], ['partHideValue','hideValue'], ['partColor','color']]) {
  $(control).onchange = event => {
    const part = doc.parts.find(p => p.id === selected);
    if (!part) return;
    checkpoint();
    part[key] = key === 'color' ? event.target.value : event.target.checked;
    changed();
  };
}

function cancelWire() {
  pending = null;
  bends = [];
  $('canvas').classList.remove('drawing-wire');
  $('preview').setAttribute('d', '');
}

function terminalAt(target, position) {
  const pin = target.closest('[data-pin]');
  if (pin) return {part: pin.dataset.owner, pin: pin.dataset.pin};
  const segment = target.closest('[data-segment]');
  if (!segment) return null;
  const wireIndex = doc.wires.findIndex(item => item.id === segment.dataset.wire);
  const wire = doc.wires[wireIndex];
  const points = wireRoutes[wireIndex];
  const index = Number(segment.dataset.segment);
  const location = C.splitPoint(points, index, position);
  if (C.samePoint(location, points[0])) return wire.a;
  if (C.samePoint(location, points.at(-1))) return wire.b;
  return {wire, points, index, location};
}

function targetPoint(target) {
  return target.location ?? C.endpoint(doc, target);
}

function connect(target) {
  if (!pending) {
    pending = target;
    bends = [];
    $('canvas').classList.add('drawing-wire');
    toast(tr('Anschluss oder Leitung anklicken · Rasterklick setzt eine Ecke · Esc bricht ab'));
    return;
  }
  if (pending.wire && pending.wire === target.wire ||
      !pending.wire && !target.wire && (C.sameEnd(pending, target) || doc.wires.some(wire =>
        C.sameEnd(wire.a, pending) && C.sameEnd(wire.b, target) ||
        C.sameEnd(wire.b, pending) && C.sameEnd(wire.a, target)))) {
    cancelWire();
    return;
  }

  const junctions = Number(!!pending.wire) + Number(!!target.wire);
  if (doc.parts.length + junctions > 200 || doc.wires.length + junctions + 1 > 2000) {
    toast(tr('Projektlimit erreicht.'));
    cancelWire();
    return;
  }
  const resolve = joint => joint.wire ?
    C.splitWire(doc, joint.wire, joint.points, joint.index, joint.location) : joint;
  checkpoint();
  const a = resolve(pending), b = resolve(target);
  const wire = {id: C.id(), a, b, bends: [...bends], color: '#23323b'};
  doc.wires.push(wire);
  selected = wire.id;
  cancelWire();
  changed();
  inspect();
}

$('canvas').onpointerdown = event => {
  if (event.button !== 0 || drag) return;
  const location = position(event);
  const terminal = terminalAt(event.target, location);
  $('canvas').focus();
  if (terminal && (pending || event.shiftKey || event.target.closest('[data-pin]'))) {
    connect(terminal);
    return;
  }
  if (pending) {
    if (bends.length < 400) bends.push(wireSnap(location));
    return;
  }

  const part = event.target.closest('[data-part]');
  const wire = event.target.closest('[data-wire]');
  selected = part?.dataset.part ?? wire?.dataset.wire ?? null;
  const component = doc.parts.find(item => item.id === selected);
  if (component) {
    drag = {type: 'part', id: component.id, start: location, x: component.x, y: component.y};
  } else if (wire) {
    const wireIndex = doc.wires.findIndex(item => item.id === selected);
    const route = wireRoutes[wireIndex];
    const others = wireRoutes.filter((_, index) => index !== wireIndex);
    drag = {type: 'wire', id: selected, wireIndex, start: location, route, others,
      allowance: C.overlapLength(route, others), segment: Number(wire.dataset.segment), corner: Number(wire.dataset.corner)};
  } else {
    drag = {type: 'pan', start: {x: event.clientX, y: event.clientY}, x: view.x, y: view.y};
  }
  drag.pointer = event.pointerId;
  render(false);
  inspect();
  $('canvas').setPointerCapture(event.pointerId);
};

$('canvas').onpointermove = event => {
  const location = position(event);
  if (pending) {
    const target = terminalAt(event.target, location);
    const end = target ? targetPoint(target) : wireSnap(location);
    $('preview').setAttribute('d', C.path(C.orthogonal([targetPoint(pending), ...bends, end])));
    return;
  }
  if (!drag || event.pointerId !== drag.pointer) return;
  if (drag.type === 'pan') {
    const bounds = $('canvas').getBoundingClientRect();
    view.x = drag.x - (event.clientX - drag.start.x) * view.w / bounds.width;
    view.y = drag.y - (event.clientY - drag.start.y) * view.h / bounds.height;
    setView();
    return;
  }
  const movement = {x: location.x - drag.start.x, y: location.y - drag.start.y};
  if (drag.type === 'wire') {
    const snapped = wireSnap(movement);
    const route = Number.isInteger(drag.corner) ?
      C.moveCorner(drag.route, drag.corner, snapped) :
      C.moveSegment(drag.route, drag.segment, snapped);
    drag.blocked = route.length > 1002 || route.some(p => Math.abs(p.x) >= 20000 || Math.abs(p.y) >= 20000) ||
      C.selfOverlap(route) > 0 || C.overlapLength(route, drag.others) > drag.allowance;
    drag.preview = drag.blocked ? null : route;
    render(false);
    return;
  }

  const component = doc.parts.find(item => item.id === drag.id);
  if (!component) return;
  const pos = dragPosition(component, drag, movement);
  if (pos.x === component.x && pos.y === component.y) return;
  if (!drag.moved) checkpoint();
  drag.moved = true;
  component.x = pos.x;
  component.y = pos.y;
  render();
};

function dragPosition(component, drag, movement) {
  const target = {x: drag.x + movement.x, y: drag.y + movement.y};
  const position = component.kind === 'junction' ? wireSnap(target) : snap(target);
  return {x: Math.max(-19000, Math.min(19000, position.x)), y: Math.max(-19000, Math.min(19000, position.y))};
}

function finishDrag(event, cancelled) {
  if (!drag || event.pointerId !== drag.pointer) return;
  const finished = drag;
  drag = null;
  if (finished.type === 'wire') {
    const wire = doc.wires.find(item => item.id === finished.id);
    if (wire && !cancelled && finished.preview && JSON.stringify(finished.preview) !== JSON.stringify(finished.route)) {
      checkpoint();
      wire.bends = finished.preview.slice(1, -1);
      wire.manual = true;
      changed();
    } else {
      render(false);
      if (finished.blocked && !cancelled) toast(tr('Die Leitung würde auf einer anderen Leitung liegen oder sich überlagern.'));
    }
  } else if (finished.moved) {
    changed();
  }
}

$('canvas').onpointerup = event => finishDrag(event, false);
$('canvas').onpointercancel = event => finishDrag(event, true);
$('canvas').onwheel = event => {
  event.preventDefault();
  if (!drag) zoom(event.deltaY > 0 ? 1.08 : 1 / 1.08, position(event));
};

function remove(){if(!selected)return;checkpoint();doc.parts=doc.parts.filter(p=>p.id!==selected);doc.wires=doc.wires.filter(w=>w.id!==selected&&w.a.part!==selected&&w.b.part!==selected);selected=null;cancelWire();changed();inspect()}
function rotate(){let p=doc.parts.find(p=>p.id===selected);if(!p||p.kind==='pi')return;checkpoint();p.rotation=(p.rotation+90)%360;changed();inspect()}
function duplicate() {
  const part = doc.parts.find(p => p.id === selected);
  if (part && doc.parts.length < 200) pastePart(part);
}

function pastePart(part) {
  const copy = structuredClone(part);
  copy.id = C.id();
  const offsets = [80, -80, 160, -160];
  for (const offset of offsets) {
    copy.x = Math.max(-19000, Math.min(19000, part.x+offset));
    copy.y = Math.max(-19000, Math.min(19000, part.y+offset));
    if (!doc.parts.some(p => p.x === copy.x && p.y === copy.y)) break;
  }
  insertPart(copy);
}

function textInput(node) {
  return node?.matches?.('input, textarea, select, [contenteditable="true"]');
}

window.componentClipboard = command => {
  if (tourPreview || textInput(document.activeElement) || document.querySelector('dialog[open]') ||
      String(window.getSelection()).length) return false;
  if (command === 'copyComponent') {
    const part = doc.parts.find(p => p.id === selected);
    if (!part) return false;
    native(command, {text:JSON.stringify(part)}).catch(error => toast(error.message));
  } else {
    native(command).then(value => {
      if (!value) return;
      if (doc.parts.length >= 200) return toast(tr('Maximal 200 Bauteile pro Projekt.'));
      const project = C.importDoc({version:2,title:'',parts:[JSON.parse(value)],wires:[]});
      pastePart(project.parts[0]);
    }).catch(error => toast(error.message));
  }
  return true;
};
$('apply').onclick=async()=>{let p=doc.parts.find(p=>p.id===selected);if(!p)return;let name=$('partName').value.trim(),value=$('partValue').value;if(!name)return toast(tr('Bitte einen Namen eingeben.'));let newPins=[];if(p.kind==='pi'){for(let piece of $('partPins').value.split(',')){piece=piece.trim();if(/^\d+-\d+$/.test(piece)){let[a,b]=piece.split('-').map(Number);if(a>b||b-a>39)return toast(tr('Ungültiger Pinbereich.'));for(let i=a;i<=b;i++)newPins.push(i)}else if(/^\d+$/.test(piece))newPins.push(Number(piece));else return toast(tr('Pins als Zahlen oder Bereich angeben.'))}newPins=[...new Set(newPins)];if(!newPins.length||newPins.some(n=>n<1||n>40))return toast(tr('Pins müssen zwischen 1 und 40 liegen.'))}else if(p.symbol)newPins=p.pins;else newPins=$('partPins').value.split(',').map(s=>s.trim()).filter(Boolean);if(p.kind!=='pi'&&!p.symbol&&(!newPins.length||newPins.length>40||newPins.some(s=>s.length>80)))return toast(tr('1 bis 40 Anschlüsse mit maximal 80 Zeichen.'));let old=p.kind==='pi'?p.piPins:p.pins,modified=JSON.stringify(old)!==JSON.stringify(newPins),connected=doc.wires.some(w=>w.a.part===p.id||w.b.part===p.id);if(modified&&connected&&p.kind!=='pi'){let r=await native('confirm',{message:tr('Anschlüsse ändern?'),detail:tr('Vorhandene Leitungen dieses Bauteils werden entfernt.')});if(!r)return;}checkpoint();p.name=name;p.value=value;if(p.kind==='pi'){p.piPins=newPins;doc.wires=doc.wires.filter(w=>!(w.a.part===p.id&&!newPins.includes(Number(w.a.pin)))&&!(w.b.part===p.id&&!newPins.includes(Number(w.b.pin))))}else if(modified){p.pins=newPins;doc.wires=doc.wires.filter(w=>w.a.part!==p.id&&w.b.part!==p.id)}cancelWire();changed();inspect()};
$('rotate').onclick=rotate;$('duplicate').onclick=duplicate;$('deletePart').onclick=$('deleteWire').onclick=remove;
$('wireColor').onchange=()=>{let w=doc.wires.find(w=>w.id===selected);if(w){checkpoint();w.color=$('wireColor').value;changed()}};$('autoRoute').onclick=()=>{let w=doc.wires.find(w=>w.id===selected);if(w){checkpoint();w.bends=[];delete w.manual;changed()}};
function undoAction(){if(!undo.length)return;redo.push(JSON.stringify(doc));doc=JSON.parse(undo.pop());selected=null;cancelWire();changed();inspect()}
function redoAction(){if(!redo.length)return;undo.push(JSON.stringify(doc));doc=JSON.parse(redo.pop());selected=null;cancelWire();changed();inspect()}
$('undo').onclick=undoAction;$('redo').onclick=redoAction;
const panels = [
  {button:'toggleParts', panel:'partsPane', style:'hide-parts', key:'partsHidden'},
  {button:'toggleInspector', panel:'inspector', style:'hide-inspector', key:'inspectorHidden'},
];
function setPanel({button,panel,style}, hidden) {
  $(panel).hidden = hidden;
  $(button).setAttribute('aria-expanded', String(!hidden));
  document.body.classList.toggle(style, hidden);
}

function restorePanelLayout(settings) {
  for (const panel of panels) setPanel(panel, settings[panel.key] === true);
}

for (const panel of panels) {
  $(panel.button).onclick = () => {
    const rect = $('stage').getBoundingClientRect();
    const center = {x:view.x+view.w/2,y:view.y+view.h/2};
    const hidden = !$(panel.panel).hidden;
    setPanel(panel, hidden);
    const next = $('stage').getBoundingClientRect();
    view.w *= next.width / rect.width;
    view.x = center.x - view.w / 2;
    view.y = center.y - view.w * next.height / next.width / 2;
    setView();
    render(false);
    native('preferences', {[panel.key]:hidden}).catch(() => {});
  };
}

let renameTarget;
function renameProjectOrPart(part) {
  const dialog = $('renameDialog');
  if (dialog.open) return;
  renameTarget = part ?? null;
  $('renameHeading').textContent = tr(part ? 'Bauteil umbenennen' : 'Projekt umbenennen');
  $('renameValue').value = part?.name ?? doc.title;
  dialog.showModal();
  $('renameValue').focus();
  $('renameValue').select();
}
$('renameProject').onclick = () => renameProjectOrPart();
$('renamePart').onclick = () => {
  const part = doc.parts.find(item => item.id === selected);
  if (part) renameProjectOrPart(part);
};
$('cancelRename').onclick = () => $('renameDialog').close();
$('renameForm').onsubmit = event => {
  event.preventDefault();
  const input = $('renameValue');
  const value = input.value.trim();
  if (!value) {
    input.value = '';
    input.reportValidity();
    return;
  }
  const dialog = $('renameDialog');
  const target = renameTarget ?? doc;
  const key = renameTarget ? 'name' : 'title';
  if (target[key] !== value) {
    checkpoint();
    target[key] = value;
    changed();
    if (renameTarget) $('partName').value = value;
  }
  dialog.close();
};

async function save(as=false){try{let snapshot=JSON.stringify(doc);let result=await native('save',{text:JSON.stringify(doc,null,2),name:doc.title||tr('Schaltplan'),as});if(result){saved=snapshot;changed();toast(tr('Projekt gespeichert.'));return true}}catch(e){toast(e.message)}return false}
async function mayDiscard(){if(JSON.stringify(doc)===saved)return true;let r=await native('unsaved',{});if(r==='save')return save();return r==='discard'}
$('save').onclick=()=>save();
$('saveAs').onclick=()=>{
  const dialog=$('saveAsDialog');
  if(dialog.open)return;
  $('saveFormat').value='piwire';
  dialog.returnValue='cancel';
  dialog.showModal();
};
$('saveAsDialog').onclose=()=>{
  if($('saveAsDialog').returnValue!=='save')return;
  const format=$('saveFormat').value;
  if(format==='piwire')save(true);
  else exportFile(format);
};
let projectQueue = Promise.resolve();
function projectAction(action) {
  const result = projectQueue.then(action).catch(error => { toast(error.message); return false; });
  projectQueue = result;
  return result;
}

function showProject(project) {
  doc = project;
  saved = JSON.stringify(doc);
  undo = [];
  redo = [];
  selected = null;
  cancelWire();
  changed();
  inspect();
  fit();
}

$('new').onclick = () => projectAction(async () => {
  if (!await mayDiscard()) return;
  await native('reset');
  showProject(C.blankProject());
});
$('open').onclick = () => projectAction(async () => {
  const source = await native('open');
  if (!source) return;
  const project = C.importDoc(JSON.parse(source.text));
  if (!await mayDiscard()) return;
  await native('opened');
  showProject(project);
  toast(tr('Projekt geöffnet.'));
});

window.openExternalProject = text => projectAction(async () => {
  const project = C.importDoc(JSON.parse(text));
  if (tourPreview) finishTour();
  let dialog = document.querySelector('dialog[open]');
  while (dialog) {
    await new Promise(resolve => dialog.addEventListener('close', resolve, {once:true}));
    dialog = document.querySelector('dialog[open]');
  }
  if (!await mayDiscard()) return false;
  showProject(project);
  toast(tr('Projekt geöffnet.'));
  return true;
});
async function exportFile(type){try{let svg=C.svg(doc,{printing:true});let r=await native('export',{type,svg,title:doc.title});if(r)toast(tr('{0} exportiert.', type.toUpperCase()))}catch(e){toast(e.message)}}
$('exportPDF').onclick=()=>exportFile('pdf');$('exportSVG').onclick=()=>exportFile('svg');$('fit').onclick=fit;$('zoomIn').onclick=()=>zoom(.85);$('zoomOut').onclick=()=>zoom(1.15);$('help').onclick=()=>$('helpDialog').showModal();$('closeHelp').onclick=()=>$('helpDialog').close();
window.onkeydown=e=>{if(tourPreview){if(e.key==='Escape'){e.preventDefault();finishTour()}return;}if(document.querySelector('dialog[open]')||['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName))return;if(e.metaKey||e.ctrlKey){let k=e.key.toLowerCase();if (['c','v'].includes(k) && window.componentClipboard(k==='c'?'copyComponent':'pasteComponent')) e.preventDefault();
if(['s','z','d','o','n'].includes(k)){e.preventDefault();if(k==='s')$(e.shiftKey?'saveAs':'save').click();if(k==='z')e.shiftKey?redoAction():undoAction();if(k==='d')duplicate();if(k==='o')$('open').click();if(k==='n')$('new').click();}}else if(e.key==='F2'){e.preventDefault();renameProjectOrPart(doc.parts.find(p=>p.id===selected))}else if(e.key==='Escape'){cancelWire()}else if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();remove()}else if(e.key.toLowerCase()==='r')rotate()};
window.requestClose=async()=>{try{if(tourPreview)finishTour();if(await mayDiscard())await native('close')}catch(e){toast(e.message)}};
window.menuAction=action=>{
  if(tourPreview||document.querySelector('dialog[open]'))return;
  if(action==='settings'){openSettings();return}
  if(action==='renameSelection'){renameProjectOrPart(doc.parts.find(p=>p.id===selected));return}
  $(action)?.click();
};
new ResizeObserver(()=>{setView();render(false)}).observe($('stage'));palette();changed();inspect();requestAnimationFrame(fit);
