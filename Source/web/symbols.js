'use strict';

let symbolDraft;
let symbolHistory = [];
let symbolStart;
let symbolPointer;
const symbolDirections = {left:[-1,0], right:[1,0], up:[0,-1], down:[0,1]};
const symbolMessage = message => { $('symbolFeedback').textContent = message; };

function selectSymbol(index = -1) {
  $('symbolSelection').replaceChildren(new Option(tr('Neues Symbol'), '-1'),
    ...symbolLibrary.map((item, i) => new Option(item.name, String(i))));
  $('symbolSelection').value = String(index);
  symbolDraft = structuredClone(symbolLibrary[index] ?? {version:1, name:'', shapes:[], pins:[]});
  $('symbolName').value = symbolDraft.name;
  symbolHistory = [];
  symbolStart = null;
  drawSymbol();
  symbolMessage('');
}

function drawSymbol(preview) {
  const pins = symbolDraft.pins.map(pin => {
    const x = pin.x, y = pin.y;
    return `<path d="M${x} ${y}l${pin.dx*7} ${pin.dy*7}" stroke="#087f70"/><circle cx="${x}" cy="${y}" r="2.5" fill="white" stroke="#087f70"><title>${C.esc(pin.label)}</title></circle>`;
  });
  const shapes = symbolDraft.shapes.map(C.shapeMarkup);
  if (preview) shapes.push(C.shapeMarkup(preview));
  $('symbolDrawing').innerHTML = shapes.join('') + pins.join('');
  $('undoSymbol').disabled = !symbolHistory.length;
}

function symbolPosition(event) {
  const local = new DOMPoint(event.clientX, event.clientY)
    .matrixTransform($('symbolCanvas').getScreenCTM().inverse());
  const snap = value => Math.max(-100, Math.min(100, Math.round(value/10)*10));
  return {x:snap(local.x), y:snap(local.y)};
}

function makeShape(start, end) {
  return {type:$('symbolTool').value, x1:start.x, y1:start.y, x2:end.x, y2:end.y};
}

function rememberSymbolEdit() {
  symbolHistory.push(structuredClone(symbolDraft));
  if (symbolHistory.length > 100) symbolHistory.shift();
}

function currentSymbol() {
  return C.readSymbol({...symbolDraft, name:$('symbolName').value});
}

async function persistLibrary(next) {
  const payload = JSON.stringify(next);
  const saved = await native('symbolLibrary', {text:payload});
  if (saved !== payload) throw Error(tr('Symbol konnte nicht gespeichert werden.'));
  symbolLibrary = next;
  palette();
}

async function symbolAction(action) {
  try { await action(); }
  catch (error) { symbolMessage(error.message); }
}

$('symbols').onclick = () => {
  selectSymbol();
  $('symbolDialog').showModal();
};
$('closeSymbols').onclick = () => $('symbolDialog').close();
$('symbolSelection').onchange = () => selectSymbol(Number($('symbolSelection').value));
$('symbolTool').onchange = () => {
  $('symbolPinControls').hidden = $('symbolTool').value !== 'pin';
};
$('undoSymbol').onclick = () => {
  if (!symbolHistory.length) return;
  const name = $('symbolName').value;
  symbolDraft = symbolHistory.pop();
  $('symbolName').value = name;
  drawSymbol();
};

$('symbolCanvas').onpointerdown = event => {
  if (event.button !== 0 || symbolStart) return;
  const location = symbolPosition(event);
  if ($('symbolTool').value === 'pin') {
    if (symbolDraft.pins.length >= 40 || symbolDraft.pins.some(pin => C.samePoint(pin, location))) return;
    const [dx,dy] = symbolDirections[$('symbolPinDirection').value];
    const label = $('symbolPinName').value.trim() || String(symbolDraft.pins.length + 1);
    rememberSymbolEdit();
    symbolDraft.pins.push({...location, dx, dy, label});
    drawSymbol();
    return;
  }
  if (symbolDraft.shapes.length >= 100) return;
  symbolStart = location;
  symbolPointer = event.pointerId;
  $('symbolCanvas').setPointerCapture(event.pointerId);
};
$('symbolCanvas').onpointermove = event => {
  if (symbolStart && event.pointerId === symbolPointer) drawSymbol(makeShape(symbolStart, symbolPosition(event)));
};
$('symbolCanvas').onpointerup = event => {
  if (!symbolStart || event.pointerId !== symbolPointer) return;
  const end = symbolPosition(event);
  const shape = makeShape(symbolStart, end);
  if (!C.samePoint(symbolStart,end) && (shape.type === 'line' || shape.x1 !== shape.x2 && shape.y1 !== shape.y2)) {
    rememberSymbolEdit();
    symbolDraft.shapes.push(shape);
  }
  symbolStart = null;
  drawSymbol();
};
$('symbolCanvas').onpointercancel = () => {
  symbolStart = null;
  drawSymbol();
};

$('storeSymbol').onclick = () => symbolAction(async () => {
  const symbol = currentSymbol();
  const next = [...symbolLibrary];
  let index = Number($('symbolSelection').value);
  if (index < 0) {
    if (next.length >= 100) throw Error(tr('Projektlimit erreicht.'));
    index = next.length;
  }
  next[index] = symbol;
  await persistLibrary(next);
  selectSymbol(index);
  symbolMessage(tr('Symbol gespeichert.'));
});
$('importSymbol').onclick = () => symbolAction(async () => {
  const source = await native('openSymbol');
  if (!source) return;
  if (symbolLibrary.length >= 100) throw Error(tr('Projektlimit erreicht.'));
  const symbol = C.readSymbol(JSON.parse(source.text));
  await persistLibrary([...symbolLibrary, symbol]);
  selectSymbol(symbolLibrary.length - 1);
  symbolMessage(tr('Symbol importiert.'));
});
$('exportSymbol').onclick = () => symbolAction(async () => {
  const symbol = currentSymbol();
  if (await native('saveSymbol', {name:symbol.name, text:JSON.stringify(symbol, null, 2)})) {
    symbolMessage(tr('Symbol exportiert.'));
  }
});
$('exportSymbolSVG').onclick = () => symbolAction(async () => {
  const symbol = currentSymbol();
  if (await native('export', {type:'svg', title:symbol.name, svg:C.symbolSVG(symbol)})) {
    symbolMessage(tr('Symbol exportiert.'));
  }
});

native('symbolLibrary').then(raw => {
  const library = JSON.parse(raw);
  if (Array.isArray(library)) {
    symbolLibrary = library.slice(0, 100).flatMap(item => {
      try { return [C.readSymbol(item)]; } catch { return []; }
    });
  }
  palette();
}).catch(() => {});
