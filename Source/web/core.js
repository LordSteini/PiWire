(function(root){
'use strict';
const translate = text => root.piWireTranslate?.(text) ?? text;
const pins=['3V3','5V','GPIO2 · SDA','5V','GPIO3 · SCL','GND','GPIO4','GPIO14 · TX','GND','GPIO15 · RX','GPIO17','GPIO18 · PWM','GPIO27','GND','GPIO22','GPIO23','3V3','GPIO24','GPIO10 · MOSI','GND','GPIO9 · MISO','GPIO25','GPIO11 · SCLK','GPIO8 · CE0','GND','GPIO7 · CE1','GPIO0 · ID_SD','GPIO1 · ID_SC','GPIO5','GND','GPIO6','GPIO12 · PWM','GPIO13 · PWM','GND','GPIO19','GPIO16','GPIO26','GPIO20','GND','GPIO21'];
const catalog=[['pi','Raspberry Pi','40-Pin-Header',[]],['resistor','Widerstand','220 Ω',['1','2']],['led','LED','Rot',['A','K']],['lamp','Lampe','12 V',['1','2']],['switch','Schalter','',['1','2']],['button','Taster','',['1','2']],['capacitor','Kondensator','100 nF',['1','2']],['elco','Elko','100 µF',['+','−']],['diode','Diode','1N4148',['A','K']],['npn','Transistor NPN','BC547',['B','C','E']],['mosfet','MOSFET N','',['G','D','S']],['pot','Potentiometer','10 kΩ',['1','2','W']],['relay','Relais','',['A1','A2','COM','NO','NC']],['motor','DC-Motor','',['+','−']],['servo','Servo','',['VCC','GND','PWM']],['buzzer','Summer','',['+','−']],['battery','Batterie','3 V',['+','−']],['supply','DC-Netzteil','5 V',['+','−']],['ground','Masse','',['GND']],['junction','Verbindungsknoten','',['1']],['i2c','I²C-Modul','3,3 V',['VCC','GND','SDA','SCL']],['spi','SPI-Modul','3,3 V',['VCC','GND','MOSI','MISO','SCLK','CS']],['sensor','Sensor','',['VCC','GND','OUT']],['fuse','Sicherung','500 mA',['1','2']],['connector','Steckverbinder','',['1','2','3','4']],['inductor','Spule','10 mH',['1','2']],['transformer','Transformator','',['P1','P2','S1','S2']],['changeover','Wechselschalter','',['COM','NO','NC']],['closedSwitch','Öffnerkontakt','',['1','2']],['zener','Zenerdiode','5,1 V',['A','K']],['opamp','Operationsverstärker','',['+','−','OUT']],['voltmeter','Voltmeter','',['+','−']],['ammeter','Amperemeter','',['+','−']],['custom','Eigenes Bauteil','',['1','2']]].map(([kind,name,value,pins])=>({kind,name,value,pins}));
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));let serial=0;const id=()=>globalThis.crypto?.randomUUID?.()||`p-${Date.now()}-${++serial}`;
const line=(a,b,c,d)=>`<path d="M${a} ${b}L${c} ${d}"/>`;
const txt=(s,x,y,anchor='middle',size=13)=>`<text x="${x}" y="${y}" text-anchor="${anchor}" font-size="${size}" fill="currentColor" stroke="none">${esc(s)}</text>`;
function body(k){let leads='<path d="M-50 0H-20M20 0H50"/>',diode='<path d="M-16 -18L16 0L-16 18ZM16 -20V20"/>';switch(k){
case'resistor':return '<path d="M-50 0H-28M28 0H50"/><rect x="-28" y="-10" width="56" height="20"/>';
case'led':return '<path d="M-50 0H-16M16 0H50"/>'+diode+'<path d="M-2 -24L13 -39M4 -39H13V-30M13 -19L28 -34M19 -34H28V-25"/>';
case'inductor':return '<path d="M-50 0H-30a7.5 12 0 0 1 15 0a7.5 12 0 0 1 15 0a7.5 12 0 0 1 15 0a7.5 12 0 0 1 15 0H50"/>';
case'transformer':return '<path d="M-50 -20H-22a9 5 0 0 1 0 10a9 5 0 0 1 0 10a9 5 0 0 1 0 10a9 5 0 0 1 0 10H-50M50 -20H22a9 5 0 0 0 0 10a9 5 0 0 0 0 10a9 5 0 0 0 0 10a9 5 0 0 0 0 10H50M-4 -25V25M4 -25V25"/>';
case'changeover':return '<path d="M-50 0H-19M-16 -2L16 -18M22 -20H50M22 20H50"/><circle cx="-18" r="2"/><circle cx="20" cy="-20" r="2"/><circle cx="20" cy="20" r="2"/>';
case'closedSwitch':return '<path d="M-50 0H-19M19 0H50M-18 0H18M-5 -15L5 15"/><circle cx="-18" r="2"/><circle cx="18" r="2"/>';
case'zener':return '<path d="M-50 0H-16M16 0H50M-16 -18L16 0L-16 18ZM9 -20H16V20H23"/>';
case'opamp':return '<path d="M-50 -15H-22M-50 15H-22M-22 -32L35 0L-22 32ZM35 0H50"/>'+txt('+',-13,-11,'middle',10)+txt('−',-13,19,'middle',10);
case'voltmeter':return leads+'<circle r="22"/>'+txt('V',0,6,'middle',17);
case'ammeter':return leads+'<circle r="22"/>'+txt('A',0,6,'middle',17);
case'diode':return '<path d="M-50 0H-16M16 0H50"/>'+diode;
case'lamp':return leads+'<circle r="22"/><path d="M-15 -15L15 15M-15 15L15 -15"/>';
case'switch':return '<path d="M-50 0H-19M19 0H50M-16 -2L16 -22"/><circle cx="-18" r="2"/><circle cx="18" r="2"/>';
case'button':return '<path d="M-50 0H-19M19 0H50M-25 -12H25M0 -12V-25M-12 -25H12"/><circle cx="-18" r="2"/><circle cx="18" r="2"/>';
case'capacitor':return '<path d="M-50 0H-7M7 0H50M-7 -24V24M7 -24V24"/>';
case'elco':return '<path d="M-50 0H-7M7 0H50M-7 -24V24M12 -24Q2 0 12 24M-25 -24H-13M-19 -30V-18"/>';
case'motor':return leads+'<circle r="22"/>'+txt('M',0,7,'middle',20);
case'servo':return '<rect x="-28" y="-32" width="56" height="64"/><path d="M-50 -20H-28M-50 20H-28M28 0H50"/>'+txt('M',0,7,'middle',20);
case'battery':return '<path d="M-50 0H-8M8 0H50M-8 -25V25M8 -12V12"/>'+txt('+',-23,-17);
case'supply':return leads+'<circle r="22"/>'+txt('+',-9,5)+txt('−',10,5);
case'buzzer':return leads+'<path d="M-20 -17H2L20 -29V29L2 17H-20ZM28 -20Q44 0 28 20"/>';
case'ground':return '<path d="M0 -50V0M-25 0H25M-16 9H16M-6 18H6"/>';
case'junction':return '<circle r="4" fill="currentColor"/>';
case'fuse':return leads+'<rect x="-20" y="-10" width="40" height="20"/><path d="M-20 0H20"/>';
case'pot':return leads+'<rect x="-20" y="-10" width="40" height="20"/><path d="M0 -50V-12M-5 -19L0 -12L5 -19"/>';
case'npn':return '<circle r="30"/><path d="M-50 0H-12M-12 -22V22M-12 -12L20 -30V-50M-12 12L20 30V50"/><path d="M20 30L8 28L14 19Z" fill="currentColor"/>';
case'mosfet':return '<circle r="30"/><path d="M-50 0H-15M-15 -22V22M-7 -22V-10M-7 -5V5M-7 10V22M-7 -18H20V-50M-7 18H20V50M20 0H-7"/><path d="M-6 0L3 -5V5Z" fill="currentColor"/>';
case'relay':return '<rect x="-30" y="-22" width="25" height="44"/><path d="M-50 -20H-30M-50 20H-30M50 30H24V10L15 -13M50 -30H15V-22M50 0H35"/><path d="M-5 0H8" stroke-dasharray="3 3"/>';
case'pi':return '<rect x="-28" y="-35" width="56" height="70"/>'+txt('GPIO',0,5,'middle',12)+'<path d="M28 -20H50M28 0H50M28 20H50"/>';
default:return '<rect x="-28" y="-30" width="56" height="60"/><path d="M-50 -18H-28M-50 18H-28M28 -18H50M28 18H50"/>'+txt(k==='i2c'?'I²C':k==='spi'?'SPI':k==='connector'?'J':'IC',0,5,'middle',15);
}}
const icon=k=>`<svg viewBox="-60 -55 120 110" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">${body(k)}</g></svg>`;
function make(kind,x,y){let t=catalog.find(c=>c.kind===kind)||catalog.at(-1);return{id:id(),kind:t.kind,name:translate(t.name),value:translate(t.value),pins:[...t.pins],x,y,rotation:0,piPins:kind==='pi'?[1,11,25]:[]};}
const piHeight=p=>Math.max(480,(p.piPins.length+2)*40);
const GRID_SIZE = 20;
const grid = value => Math.round(value / GRID_SIZE) * GRID_SIZE;
const partOrigin = p => p.kind === 'pi' ? {x:grid(p.x), y:grid(p.y)} : p;
const hexColor = value => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);

function readSymbol(raw) {
  const bad = () => { throw Error(translate('Ungültiges Symbol.')); };
  const coordinate = n => Number.isFinite(n) && Math.abs(n) <= 100;
  if (!raw || raw.version !== 1 || typeof raw.name !== 'string' || !raw.name.trim() ||
      raw.name.length > 100 || !Array.isArray(raw.shapes) || !raw.shapes.length || raw.shapes.length > 100 ||
      !Array.isArray(raw.pins) || raw.pins.length > 40) bad();
  const shapes = raw.shapes.map(shape => {
    if (!shape || !['line', 'rect', 'ellipse'].includes(shape.type) ||
        ![shape.x1, shape.y1, shape.x2, shape.y2].every(coordinate)) bad();
    const {type, x1, y1, x2, y2} = shape;
    return {type, x1, y1, x2, y2};
  });
  const locations = new Set();
  const terminals = raw.pins.map(pin => {
    if (!pin || !coordinate(pin.x) || !coordinate(pin.y) ||
        ![[-1,0],[1,0],[0,-1],[0,1]].some(([dx,dy]) => pin.dx === dx && pin.dy === dy) ||
        typeof pin.label !== 'string' || !pin.label.trim() || pin.label.length > 80) bad();
    const {x, y, dx, dy, label} = pin;
    const key = x + ',' + y;
    if (locations.has(key)) bad();
    locations.add(key);
    return {x, y, dx, dy, label};
  });
  return {version:1, name:raw.name.trim(), shapes, pins:terminals};
}

function shapeMarkup(shape) {
  const {type, x1, y1, x2, y2} = shape;
  if (type === 'line') return line(x1, y1, x2, y2);
  const w = Math.abs(x2 - x1), h = Math.abs(y2 - y1);
  return type === 'rect'
    ? `<rect x="${Math.min(x1,x2)}" y="${Math.min(y1,y2)}" width="${w}" height="${h}"/>`
    : `<ellipse cx="${(x1+x2)/2}" cy="${(y1+y2)/2}" rx="${w/2}" ry="${h/2}"/>`;
}

function symbolBox(symbol) {
  const xs = symbol.shapes.flatMap(s => [s.x1, s.x2]).concat(symbol.pins.map(p => p.x));
  const ys = symbol.shapes.flatMap(s => [s.y1, s.y2]).concat(symbol.pins.map(p => p.y));
  const x = Math.min(...xs) - 7, y = Math.min(...ys) - 7;
  return {x, y, w:Math.max(...xs)-x+7, h:Math.max(...ys)-y+7};
}

function symbolSVG(symbol) {
  const {x,y,w,h} = symbolBox(symbol);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${x} ${y} ${w} ${h}"><title>${esc(symbol.name)}</title><g fill="none" stroke="#172a32" stroke-width="1.6" stroke-linecap="round">${symbol.shapes.map(shapeMarkup).join('')}</g></svg>`;
}

function makeSymbol(symbol, x, y) {
  const drawing = readSymbol(symbol);
  return {...make('custom', x, y), name:drawing.name, pins:drawing.pins.map(p => p.label), symbol:drawing};
}

const additionalPorts = {
  changeover: [[-50,0,-1,0],[50,-20,1,0],[50,20,1,0]],
  transformer: [[-50,-20,-1,0],[-50,20,-1,0],[50,-20,1,0],[50,20,1,0]],
  opamp: [[-50,-15,-1,0],[-50,15,-1,0],[50,0,1,0]],
};

const moduleKind=k=>['i2c','spi','sensor','connector','custom'].includes(k);
function localPorts(p){if(p.kind==='pi'){let n=p.piPins.length,h=piHeight(p);return p.piPins.map((pin,i)=>({key:String(pin),label:`Pin ${pin}`,detail:pins[pin-1],x:80,y:n===1?0:grid(-h/2+40+i*(h-80)/(n-1)),dx:1,dy:0}));}if(p.kind==='ground')return[{key:'0',label:'GND',x:0,y:-50,dx:0,dy:-1}];if(p.kind==='junction')return[{key:'0',label:'',x:0,y:0,dx:1,dy:0}];if(p.symbol)return p.symbol.pins.map((pin,i)=>({...pin,key:String(i)}));
let c;
if(additionalPorts[p.kind])c=additionalPorts[p.kind];
else if(p.kind==='npn'||p.kind==='mosfet')c=[[-50,0,-1,0],[20,-50,0,-1],[20,50,0,1]];
else if(p.kind==='pot')c=[[-50,0,-1,0],[50,0,1,0],[0,-50,0,-1]];
else if(p.kind==='servo')c=[[-50,-20,-1,0],[-50,20,-1,0],[50,0,1,0]];
else if(p.kind==='relay')c=[[-50,-20,-1,0],[-50,20,-1,0],[50,30,1,0],[50,-30,1,0],[50,0,1,0]];
else if(p.pins.length===2&&!moduleKind(p.kind))c=[[-50,0,-1,0],[50,0,1,0]];
else c=p.pins.map((_,i)=>[i%2===0?-65:65,Math.floor(i/2)*25-(Math.ceil(p.pins.length/2)-1)*12.5,i%2===0?-1:1,0]);return p.pins.map((label,i)=>({key:String(i),label,x:c[i][0],y:c[i][1],dx:c[i][2],dy:c[i][3]}));}
function ports(p){let r=p.rotation*Math.PI/180,c=Math.cos(r),s=Math.sin(r),o=partOrigin(p);return localPorts(p).map(q=>({...q,x:Math.round((o.x+q.x*c-q.y*s)*100)/100,y:Math.round((o.y+q.x*s+q.y*c)*100)/100,dx:Math.round(q.dx*c-q.dy*s)||0,dy:Math.round(q.dx*s+q.dy*c)||0}));}
function endpoint(d,e){let p=d.parts.find(p=>p.id===e.part);return p&&ports(p).find(q=>q.key===String(e.pin));}
function rect(p) {
  if (p.kind === 'pi') {
    const {x,y} = partOrigin(p);
    return {x:x-80, y:y-piHeight(p)/2, w:160, h:piHeight(p)};
  }
  if (p.symbol) {
    const {x,y,w,h} = symbolBox(p.symbol);
    const corners = [[x,y],[x+w,y],[x,y+h],[x+w,y+h]].map(([x,y]) => {
      for (let turn = 0; turn < p.rotation/90; turn++) [x,y] = [-y,x];
      return {x:p.x+x,y:p.y+y};
    });
    const left = Math.min(...corners.map(p => p.x)), top = Math.min(...corners.map(p => p.y));
    return {x:left,y:top,w:Math.max(...corners.map(p => p.x))-left,h:Math.max(...corners.map(p => p.y))-top};
  }
  let h = moduleKind(p.kind) ? Math.max(60, Math.ceil(p.pins.length/2)*25+20) : 64;
  let w = moduleKind(p.kind) ? 80 : 64;
  if (p.rotation%180) [w,h] = [h,w];
  return {x:p.x-w/2, y:p.y-h/2, w, h};
}
const point = ({x, y}) => ({x, y});
const samePoint = (a, b) => a.x === b.x && a.y === b.y;
const distance = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
const sameEnd = (a, b) => a.part === b.part && String(a.pin) === String(b.pin);

function simplify(points) {
  const result = [];
  for (const p of points) {
    const last = result.at(-1);
    if (last && samePoint(last, p)) continue;
    const previous = result.at(-2);
    if (previous && distance(previous, last) + distance(last, p) === distance(previous, p) &&
        (previous.x === last.x && last.x === p.x || previous.y === last.y && last.y === p.y)) {
      result.pop();
    }
    result.push(point(p));
  }
  return result;
}

function orthogonal(points) {
  const result = [];
  for (const p of points) {
    const previous = result.at(-1);
    if (previous && previous.x !== p.x && previous.y !== p.y) {
      const before = result.at(-2);
      const horizontalFirst = before ? before.x === previous.x : Math.abs(previous.x - p.x) >= Math.abs(previous.y - p.y);
      result.push(horizontalFirst ? {x:p.x, y:previous.y} : {x:previous.x, y:p.y});
    }
    result.push(p);
  }
  return simplify(result);
}

function moveSegment(points, index, movement) {
  const a = points[index], b = points[index + 1];
  const axis = a.y === b.y ? 'y' : 'x';
  const shiftedA = {...a, [axis]: a[axis] + movement[axis]};
  const shiftedB = {...b, [axis]: b[axis] + movement[axis]};
  const left = index === 0 ? [a, shiftedA] : [shiftedA];
  const right = index + 1 === points.length - 1 ? [shiftedB, b] : [shiftedB];
  return orthogonal([...points.slice(0, index), ...left, ...right, ...points.slice(index + 2)]);
}

function moveCorner(points, index, movement) {
  const result = points.map(point);
  const corner = points[index];
  const before = points[index - 1], after = points[index + 1];
  const moved = {x: corner.x + movement.x, y: corner.y + movement.y};
  result[index] = moved;
  const beforeAxis = before.x === corner.x ? 'x' : 'y';
  const afterAxis = after.x === corner.x ? 'x' : 'y';
  if (index + 1 === points.length - 1) {
    result.splice(index + 1, 0, {...after, [afterAxis]: moved[afterAxis]});
  } else {
    result[index + 1][afterAxis] = moved[afterAxis];
  }
  if (index === 1) {
    result.splice(index, 0, {...before, [beforeAxis]: moved[beforeAxis]});
  } else {
    result[index - 1][beforeAxis] = moved[beforeAxis];
  }
  return orthogonal(result);
}

function splitPoint(points, index, position) {
  const a = points[index], b = points[index + 1];
  const axis = a.x === b.x ? 'y' : 'x';
  const lo = Math.min(a[axis], b[axis]), hi = Math.max(a[axis], b[axis]);
  const value = Math.abs(position[axis] - lo) <= 5 ? lo :
    Math.abs(position[axis] - hi) <= 5 ? hi : Math.round(position[axis] / 10) * 10;
  return {...a, [axis]: Math.max(lo, Math.min(hi, value))};
}

function splitWire(d, wire, points, index, split) {
  if (samePoint(split, points[0])) return wire.a;
  if (samePoint(split, points.at(-1))) return wire.b;
  const junction = make('junction', split.x, split.y);
  const node = {part: junction.id, pin: '0'};
  const first = simplify([...points.slice(0, index + 1), split]);
  const last = simplify([split, ...points.slice(index + 1)]);
  const start = {...wire, b: node, manual: true, bends: first.slice(1, -1)};
  const end = {...wire, id: id(), a: node, manual: true, bends: last.slice(1, -1)};
  d.parts.push(junction);
  d.wires.splice(d.wires.indexOf(wire), 1, start, end);
  return node;
}

function tracks() {
  return {horizontal: new Map(), vertical: new Map()};
}

function segment(a, b) {
  const vertical = a.x === b.x;
  const axis = vertical ? 'y' : 'x';
  return {
    direction: vertical ? 'vertical' : 'horizontal',
    line: vertical ? a.x : a.y,
    lo: Math.min(a[axis], b[axis]),
    hi: Math.max(a[axis], b[axis]),
  };
}

function addTracks(occupied, points) {
  for (let i = 1; i < points.length; i++) {
    const {direction, line, lo, hi} = segment(points[i - 1], points[i]);
    const lines = occupied[direction];
    if (!lines.has(line)) lines.set(line, []);
    lines.get(line).push({lo, hi});
  }
}

function overlap(occupied, a, b) {
  const {direction, line, lo, hi} = segment(a, b);
  return (occupied[direction].get(line) ?? []).reduce((length, span) =>
    length + Math.max(0, Math.min(hi, span.hi) - Math.max(lo, span.lo)), 0);
}

function overlapLength(points, others) {
  const occupied = tracks();
  for (const other of others) addTracks(occupied, other);
  return points.slice(1).reduce((length, p, i) => length + overlap(occupied, points[i], p), 0);
}

function selfOverlap(points) {
  const occupied = tracks();
  let length = 0;
  for (let i = 1; i < points.length; i++) {
    length += overlap(occupied, points[i - 1], points[i]);
    addTracks(occupied, [points[i - 1], points[i]]);
  }
  return length;
}

function lead(d, terminal, p) {
  return d.parts.find(part => part.id === terminal.part)?.kind === 'junction' ? point(p) :
    {x: p.x + p.dx * 20, y: p.y + p.dy * 20};
}

function crossesPart(a, b, r) {
  return a.x === b.x
    ? a.x > r.x && a.x < r.x + r.w && Math.max(a.y, b.y) > r.y && Math.min(a.y, b.y) < r.y + r.h
    : a.y > r.y && a.y < r.y + r.h && Math.max(a.x, b.x) > r.x && Math.min(a.x, b.x) < r.x + r.w;
}

function searchRoute(start, end, obstacles, occupied, leads) {
  const spacing = 12;
  const coordinates = (a, b, edges, used) => {
    const margin = 45;
    const lo = Math.min(a, b, ...edges) - margin;
    const hi = Math.max(a, b, ...edges) + margin;
    const lanes = [...used.keys()].filter(value => value >= lo && value <= hi);
    return [...new Set([a, b, a - spacing, a + spacing, b - spacing, b + spacing, ...edges,
      ...lanes.flatMap(value => [value - spacing, value + spacing])])].sort((x, y) => x - y);
  };
  const xs = coordinates(start.x, end.x, obstacles.flatMap(r => [r.x, r.x + r.w]), occupied.vertical);
  const ys = coordinates(start.y, end.y, obstacles.flatMap(r => [r.y, r.y + r.h]), occupied.horizontal);
  const width = xs.length, height = ys.length;
  const key = p => ys.indexOf(p.y) * width + xs.indexOf(p.x);
  const at = n => ({x: xs[n % width], y: ys[Math.floor(n / width)]});
  const first = key(start), last = key(end);
  const queue = [];
  function push(node, g) {
    const entry = {node, g, priority: g + distance(at(node), end)};
    let index = queue.length;
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (queue[parent].priority <= entry.priority) break;
      queue[index] = queue[parent];
      index = parent;
    }
    queue[index] = entry;
  }
  function pop() {
    const root = queue[0], last = queue.pop();
    if (!queue.length) return root;
    let index = 0;
    while (index * 2 + 1 < queue.length) {
      let child = index * 2 + 1;
      if (queue[child + 1]?.priority < queue[child].priority) child++;
      if (queue[child].priority >= last.priority) break;
      queue[index] = queue[child];
      index = child;
    }
    queue[index] = last;
    return root;
  }
  const score = new Map([[first, 0]]), previous = new Map();
  push(first, 0);
  for (let iterations = 0; queue.length && iterations < 18000; iterations++) {
    const {node, g} = pop();
    if (g !== score.get(node)) continue;
    if (node === last) {
      const result = [];
      for (let index = node; index !== undefined; index = previous.get(index)) result.push(at(index));
      return result.reverse();
    }
    const x = node % width, y = Math.floor(node / width);
    const next = [];
    if (x > 0) next.push(node - 1);
    if (x + 1 < width) next.push(node + 1);
    if (y > 0) next.push(node - width);
    if (y + 1 < height) next.push(node + width);
    const a = at(node);
    for (const neighbor of next) {
      const b = at(neighbor);
      if (obstacles.some(r => crossesPart(a, b, r)) ||
          overlap(occupied, a, b) > 0 || overlap(leads, a, b) > 0) continue;
      const prior = previous.get(node);
      const turns = prior !== undefined && at(prior).x !== b.x && at(prior).y !== b.y;
      const cost = g + distance(a, b) + (turns ? 10 : 0.01);
      if (cost >= (score.get(neighbor) ?? Infinity)) continue;
      score.set(neighbor, cost);
      previous.set(neighbor, node);
      push(neighbor, cost);
    }
  }
  return null;
}

function routeWire(d, wire, occupied, obstacles) {
  const a = endpoint(d, wire.a), b = endpoint(d, wire.b);
  if (!a || !b) return [];
  if (samePoint(a, b)) return [point(a), point(b)];
  const start = lead(d, wire.a, a), end = lead(d, wire.b, b);
  if (wire.manual || wire.bends?.length) {
    const manual = orthogonal([a, ...wire.bends, b]);
    const overlapAllowance = overlap(occupied, a, start) + overlap(occupied, end, b);
    const unwanted = manual.slice(1).reduce((length, p, i) => length + overlap(occupied, manual[i], p), 0);
    if (unwanted <= overlapAllowance && !selfOverlap(manual)) return manual;
  }
  if ((a.x === b.x || a.y === b.y) && !overlap(occupied, a, b) &&
      !obstacles.some(r => crossesPart(a, b, r))) return simplify([a, b]);
  const leads = tracks();
  addTracks(leads, [a, start]);
  addTracks(leads, [end, b]);
  const avoid = searchRoute(start, end, obstacles, occupied, leads);
  if (avoid) return orthogonal([a, ...avoid, b]);
  const unobstructed = searchRoute(start, end, [], occupied, leads);
  return orthogonal([a, ...(unobstructed ?? [start, end]), b]);
}

function routes(d) {
  const occupied = tracks();
  const obstacles = d.parts.filter(p => p.kind !== 'junction').map(p => {
    const r = rect(p);
    return {x:r.x - 7, y:r.y - 7, w:r.w + 14, h:r.h + 14};
  });
  const result = new Array(d.wires.length);
  const place = (wire, index) => {
    result[index] = routeWire(d, wire, occupied, obstacles);
    addTracks(occupied, result[index]);
  };
  const manual = wire => wire.manual || wire.bends?.length > 0;
  d.wires.forEach((wire, i) => { if (manual(wire)) place(wire, i); });
  d.wires.forEach((wire, i) => { if (!manual(wire)) place(wire, i); });
  return result;
}

function route(d, wire) {
  const index = d.wires.indexOf(wire);
  return index === -1 ? routes({...d, wires: [...d.wires, wire]}).at(-1) : routes(d)[index];
}

function visiblePaths(routes) {
  const horizontal = new Map();
  routes.forEach((points, wire) => {
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1], b = points[i];
      if (a.y !== b.y) continue;
      if (!horizontal.has(a.y)) horizontal.set(a.y, []);
      horizontal.get(a.y).push({...segment(a, b), wire});
    }
  });
  const rows = [...horizontal.keys()].sort((a, b) => a - b);
  return routes.map((points, wire) => {
    let result = points.length ? 'M' + points[0].x + ' ' + points[0].y : '';
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1], b = points[i];
      if (a.x === b.x) {
        const lo = Math.min(a.y, b.y), hi = Math.max(a.y, b.y);
        const breaks = [];
        let left = 0, right = rows.length;
        while (left < right) {
          const middle = Math.floor((left + right) / 2);
          if (rows[middle] <= lo + 5) left = middle + 1;
          else right = middle;
        }
        for (let j = left; j < rows.length && rows[j] < hi - 5; j++) {
          const y = rows[j];
          if (horizontal.get(y).some(track => track.wire !== wire && track.lo < a.x && a.x < track.hi)) {
            const last = breaks.at(-1);
            if (last && y - 4 <= last[1]) last[1] = y + 4;
            else breaks.push([y - 4, y + 4]);
          }
        }
        if (a.y > b.y) breaks.reverse().forEach(gap => gap.reverse());
        for (const [before, after] of breaks) result += 'L' + a.x + ' ' + before + 'M' + a.x + ' ' + after;
      }
      result += 'L' + b.x + ' ' + b.y;
    }
    return result;
  });
}

const path=pts=>pts.map((p,i)=>`${i?'L':'M'}${p.x} ${p.y}`).join('');
function drawPart(p, {printing=false, selected=false} = {}) {
  const o = partOrigin(p), r = rect(p);
  const color = printing ? '#000' : p.kind === 'led' ? p.color ?? '#bd2c43' : '#172a32';
  let out = `<g data-part="${esc(p.id)}" class="part" transform="translate(${o.x} ${o.y})" color="${esc(color)}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">`;
  if (!printing && p.kind === 'junction') {
    out += `<circle r="10" fill="transparent" stroke="${selected?'#008373':'none'}" stroke-dasharray="3 2"/>`;
  } else if (!printing) {
    out += `<rect x="${r.x-o.x-10}" y="${r.y-o.y-10}" width="${r.w+20}" height="${r.h+20}" rx="5" fill="${selected?'#e1f3ed':'transparent'}" stroke="${selected?'#008373':'none'}" stroke-dasharray="4 3"/>`;
  }

  if (p.kind === 'pi') {
    const h = piHeight(p);
    out += `<rect x="-80" y="${-h/2}" width="160" height="${h}" fill="white"/>` + txt('GPIO',-24,-h/2+25,'middle',15);
    if (!p.hideName) out += txt(p.name,0,-h/2-8,'middle',15);
    for (const pin of localPorts(p)) {
      out += `<path d="M-70 ${pin.y-13}H38L58 ${pin.y}L38 ${pin.y+13}H-70Z"/>` +
        line(58,pin.y,80,pin.y) + txt(pin.label,-10,pin.y+5,'middle',14);
      if (!p.hideValue) out += txt(pin.detail,91,pin.y-7,'start',12);
    }
  } else {
    out += `<g transform="rotate(${p.rotation})">`;
    if (p.symbol) {
      out += p.symbol.shapes.map(shapeMarkup).join('');
    } else if (moduleKind(p.kind)) {
      const h = Math.max(60, Math.ceil(p.pins.length/2)*25+20);
      out += `<rect x="-40" y="${-h/2}" width="80" height="${h}" fill="white"/>`;
      for (const pin of localPorts(p)) {
        out += line(pin.x,pin.y,pin.x<0?-40:40,pin.y) + txt(pin.label,pin.x<0?-35:35,pin.y-4,pin.x<0?'start':'end',10);
      }
    } else {
      if (p.kind === 'led' && !printing) out += '<path d="M-16 -18L16 0L-16 18Z" fill="currentColor" fill-opacity=".2" stroke="none"/>';
      out += body(p.kind);
      if (p.kind === 'resistor' && !p.hideValue && p.value) {
        const length = Array.from(p.value).length;
        const fit = length > 8 ? ' textLength="49" lengthAdjust="spacingAndGlyphs"' : '';
        out += `<text transform="rotate(${p.rotation >= 180 ? 180 : 0})" y="3.5" text-anchor="middle" font-size="10.5" fill="currentColor" stroke="none"${fit}>${esc(p.value)}</text>`;
      }
    }
    out += '</g>';

    if (!['junction','ground'].includes(p.kind)) {
      const vertical = p.rotation % 180 !== 0;
      const halfWidth = p.kind === 'resistor' && vertical ? 10 : p.x-r.x;
      const top = p.kind === 'resistor' && !vertical ? -10 : r.y-p.y;
      const labels = [!p.hideName ? p.name : '', p.kind !== 'resistor' && !p.hideValue ? p.value : ''].filter(Boolean);
      labels.forEach((label, i) => {
        const y = vertical ? (i-(labels.length-1)/2)*14+4 : top-6-(labels.length-1-i)*14;
        out += txt(label,vertical?-halfWidth-7:0,y,vertical?'end':'middle',12);
      });
    }
  }
  if (!printing) for (const pin of ports(p)) {
    out += `<circle data-pin="${esc(pin.key)}" data-owner="${esc(p.id)}" cx="${pin.x-o.x}" cy="${pin.y-o.y}" r="5" fill="white" stroke="#008373" stroke-width="2"><title>${esc(pin.detail ? pin.label+' · '+pin.detail : pin.label)}</title></circle>`;
  }
  return out+'</g>';
}
function bounds(d,routes=[]){let x=Infinity,y=Infinity,X=-Infinity,Y=-Infinity;function add(a,b){x=Math.min(x,a);y=Math.min(y,b);X=Math.max(X,a);Y=Math.max(Y,b)}for(let p of d.parts){let r=rect(p);add(r.x-130,r.y-75);add(r.x+r.w+170,r.y+r.h+75)}for(let r of routes)for(let p of r)add(p.x,p.y);return isFinite(x)?{x:x-20,y:y-20,w:X-x+40,h:Y-y+40}:{x:0,y:0,w:900,h:650};}
function svg(d, opts = {}) {
  const printing = !!opts.printing;
  const paths = opts.routes ?? routes(d);
  const visible = visiblePaths(paths);
  const boundsOfDrawing = bounds(d, paths);
  let content = d.wires.map((wire, index) => {
    const active = !printing && opts.selected === wire.id;
    const color = printing ? '#000' : esc(wire.color);
    const width = active ? 3.2 : 1.6;
    return `<path d="${visible[index]}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linejoin="round"${printing ? '' : ' pointer-events="none"'}/>`;
  }).join('');
  if (!printing) {
    content += paths.map((points, wireIndex) => points.slice(1).map((p, index) =>
      samePoint(p, points[index]) ? '' : `<path class="wire-hit" data-wire="${esc(d.wires[wireIndex].id)}" data-segment="${index}" data-axis="${points[index].x === p.x ? 'x' : 'y'}" d="${path([points[index], p])}" vector-effect="non-scaling-stroke"/>`).join('')).join('');
  }
  content += d.parts.map(p => drawPart(p, {printing, selected: opts.selected === p.id})).join('');
  const links = new Map();
  for (const wire of d.wires) for (const terminal of [wire.a, wire.b]) {
    const key = terminal.part + ':' + terminal.pin;
    links.set(key, {terminal, count: (links.get(key)?.count ?? 0) + 1});
  }
  for (const {terminal, count} of links.values()) {
    const p = endpoint(d, terminal);
    if (p && count > 1) content += `<circle cx="${p.x}" cy="${p.y}" r="3.5" fill="#000" pointer-events="none"/>`;
  }
  if (!printing && opts.selected) {
    const points = paths[d.wires.findIndex(wire => wire.id === opts.selected)] ?? [];
    const r = opts.handleRadius ?? 5;
    content += points.slice(1, -1).map((p, index) =>
      `<circle class="wire-corner" data-wire="${esc(opts.selected)}" data-corner="${index + 1}" cx="${p.x}" cy="${p.y}" r="${r}" vector-effect="non-scaling-stroke"/>`).join('');
  }
  if (opts.content) return content;
  const {x, y, w, h} = boundsOfDrawing;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.ceil(w)}" height="${Math.ceil(h)}" viewBox="${x} ${y} ${w} ${h}" style="background:white;font-family:Georgia,'Times New Roman',serif"><title>${esc(d.title || translate('Schaltplan'))}</title>${content}</svg>`;
}
function blankProject() {
  const pi = make('pi', 260, 460);
  pi.piPins = Array.from({length:40}, (_, index) => index + 1);
  return {version:2, title:translate('Neuer Schaltplan'), parts:[pi], wires:[]};
}

function tourExample() {
  const pi = make('pi', 260, 460);
  pi.piPins = [11, 13, 15, 16, 25];
  const parts = [pi], wires = [];
  const signal = '#246e97', ground = '#374953';
  const wire = (a, ap, b, bp, color, bends = []) => wires.push({
    id:id(), a:{part:a.id, pin:String(ap)}, b:{part:b.id, pin:String(bp)}, color, manual:true, bends,
  });
  const colors = [
    ['Rot', '#bd2c43', 11, 260],
    ['Gelb', '#a77312', 13, 360],
    ['Grün', '#087953', 15, 460],
  ];
  let previous;
  for (const [label, color, pin, y] of colors) {
    const resistor = make('resistor', 540, y);
    resistor.value = '330 Ω';
    resistor.hideName = true;
    const led = make('led', 720, y);
    led.color = color;
    led.value = translate(label);
    const junction = make('junction', 880, y);
    parts.push(resistor, led, junction);
    wire(pi,pin,resistor,0,signal);
    wire(resistor,1,led,0,signal);
    wire(led,1,junction,0,ground);
    if (previous) wire(previous,0,junction,0,ground);
    previous = junction;
  }
  const button = make('button', 630, 560);
  button.name = translate('Fußgängertaster');
  const returnNode = make('junction', 880, 560);
  parts.push(button, returnNode);
  wire(pi,16,button,0,signal);
  wire(button,1,returnNode,0,ground);
  wire(previous,0,returnNode,0,ground);
  wire(returnNode,0,pi,25,ground,[{x:880,y:660}]);
  return {version:2, title:translate('Beispiel: Ampel mit Fußgängertaster'), parts, wires};
}

function example(){let pi=make('pi',260,370),r=make('resistor',650,420),l=make('led',650,520);r.rotation=l.rotation=90;let wire=(a,ap,b,bp)=>({id:id(),a:{part:a.id,pin:String(ap)},b:{part:b.id,pin:String(bp)},color:'#23323b',bends:[]});return{version:2,title:translate('LED am Raspberry Pi'),parts:[pi,r,l],wires:[wire(pi,11,r,0),wire(r,1,l,0),wire(l,1,pi,25)]};}
function importDoc(raw){let d=structuredClone(raw);if(d.version===1){let map={Pi:'pi',R:'resistor',LED:'led','⊗':'lamp',SW:'switch',C:'capacitor',D:'diode',Q:'npn',K:'relay',M:'motor',BZ:'buzzer',BAT:'battery',PS:'supply',GND:'ground','●':'junction',IC:'custom',F:'fuse',J:'connector'};d.parts=d.parts.map(p=>({...make(map[p.symbol]||'custom',p.x+100,p.y+70),id:p.id,name:p.name,value:p.value,pins:p.symbol==='Pi'?[]:p.pins,piPins:p.symbol==='Pi'?Array.from({length:40},(_,i)=>i+1):[]}));d.wires=d.wires.map(w=>({...w,color:'#263238',bends:[],a:{...w.a,pin:String(w.a.pin+(d.parts.find(p=>p.id===w.a.part)?.kind==='pi'?1:0))},b:{...w.b,pin:String(w.b.pin+(d.parts.find(p=>p.id===w.b.part)?.kind==='pi'?1:0))}}));d.version=2;d.title=translate('Importierter Schaltplan');}
if(d.version!==2||!Array.isArray(d.parts)||!Array.isArray(d.wires)||d.parts.length>200||d.wires.length>2000||typeof d.title!=='string'||d.title.length>200)throw Error(translate('Ungültiges oder zu großes Projekt.'));let ids=new Set();for(let p of d.parts){if(typeof p.id!=='string'||ids.has(p.id)||!catalog.some(t=>t.kind===p.kind)||![p.x,p.y].every(n=>Number.isFinite(n)&&Math.abs(n)<20000)||![0,90,180,270].includes(p.rotation)||typeof p.name!=='string'||p.name.length>200||typeof p.value!=='string'||p.value.length>500||!Array.isArray(p.pins)||p.pins.length>40||p.pins.some(s=>typeof s!=='string'||s.length>80))throw Error(translate('Ungültiges Bauteil.'));ids.add(p.id);if (p.color !== undefined && !hexColor(p.color) || ['hideName','hideValue'].some(key => p[key] !== undefined && typeof p[key] !== 'boolean')) throw Error(translate('Ungültiges Bauteil.'));
if (p.symbol !== undefined) {
  const symbol = readSymbol(p.symbol);
  if (p.kind !== 'custom' || symbol.pins.length !== p.pins.length ||
      symbol.pins.some((pin,i) => pin.label !== p.pins[i])) throw Error(translate('Ungültiges Symbol.'));
  p.symbol = symbol;
}
if(p.kind==='pi'&&(!Array.isArray(p.piPins)||!p.piPins.length||new Set(p.piPins).size!==p.piPins.length||p.piPins.some(n=>!Number.isInteger(n)||n<1||n>40)))throw Error(translate('Ungültige GPIO-Auswahl.'));if(p.kind!=='pi'&&!moduleKind(p.kind)&&p.pins.length!==catalog.find(t=>t.kind===p.kind).pins.length)throw Error(translate('Falsche Anzahl an Anschlüssen.'));if(moduleKind(p.kind)&&!p.symbol&&!p.pins.length)throw Error(translate('Mindestens ein Anschluss erforderlich.'));}ids=new Set();for(let w of d.wires){if(typeof w.id!=='string'||ids.has(w.id)||!w.a||!w.b||!endpoint(d,w.a)||!endpoint(d,w.b)||(w.manual!==undefined&&typeof w.manual!=='boolean')||!Array.isArray(w.bends)||w.bends.length>1000||w.bends.some(p=>![p.x,p.y].every(n=>Number.isFinite(n)&&Math.abs(n)<20000))||!/^#[0-9a-f]{6}$/i.test(w.color))throw Error(translate('Ungültige Leitung.'));ids.add(w.id);}return d;}
const api={GRID_SIZE,grid,readSymbol,shapeMarkup,symbolSVG,makeSymbol,pins,catalog,esc,id,body,icon,make,piHeight,moduleKind,ports,endpoint,rect,route,routes,path,orthogonal,sameEnd,samePoint,moveSegment,moveCorner,splitPoint,splitWire,selfOverlap,overlapLength,drawPart,bounds,svg,blankProject,tourExample,example,importDoc};if(typeof module!=='undefined')module.exports=api;root.PiWire=api;
})(typeof window==='undefined'?globalThis:window);
