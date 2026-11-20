const C=require('./web/core.js'),fs=require('node:fs'),assert=require('node:assert/strict');
let doc=C.example();assert.deepEqual(C.importDoc(JSON.parse(JSON.stringify(doc))),doc);assert.equal(C.pins.length,40);
for(let t of C.catalog){let p=C.make(t.kind,100,100);for(let angle of [0,90,180,270]){p.rotation=p.kind==='pi'?0:angle;let d={version:2,title:'Test',parts:[p],wires:[]};assert.doesNotThrow(()=>C.importDoc(d));assert(C.svg(d,{printing:true}).includes('<svg'));}}
for(let w of doc.wires){let route=C.route(doc,w);assert(route.length>=2);assert.equal(route[0].x,C.endpoint(doc,w.a).x);assert.equal(route.at(-1).y,C.endpoint(doc,w.b).y);for(let i=1;i<route.length;i++)assert(route[i-1].x===route[i].x||route[i-1].y===route[i].y)}
for(let mutate of [d=>d.wires[0].a.pin='999',d=>d.parts[0].piPins=[0],d=>d.parts[0].x=NaN,d=>d.wires[0].color='url(bad)']){let broken=structuredClone(doc);mutate(broken);assert.throws(()=>C.importDoc(broken));}
let svg=C.svg(doc,{printing:true});for(let token of ['data-pin','pattern','#008373'])assert(!svg.includes(token));assert(svg.includes('stroke="#000"'));
let obstacle=C.make('resistor',490,370);doc.parts.push(obstacle);let routed=C.route(doc,doc.wires[0]);assert(routed.length>2);
let malicious=C.make('resistor',1,1);malicious.name='<script>alert(1)</script>';let safe=C.svg({parts:[malicious],wires:[],title:'x'},{printing:true});assert(!safe.includes('<script>'));assert(safe.includes('&lt;script&gt;'));
console.log('PASS: all templates, rotation, persistence, validation, route detour, monochrome export, text escaping');

const joint = (x, y) => C.make('junction', x, y);
const terminal = part => ({part: part.id, pin: '0'});
const connection = (a, b, extra = {}) => ({
  id: C.id(), a: terminal(a), b: terminal(b), bends: [], color: '#23323b', ...extra,
});
const orthogonal = points => points.slice(1).every((p, i) => p.x === points[i].x || p.y === points[i].y);

const straight = [{x:0,y:0}, {x:100,y:0}];
const shifted = C.moveSegment(straight, 0, {x:30,y:40});
assert.deepEqual(shifted, [{x:0,y:0}, {x:0,y:40}, {x:100,y:40}, {x:100,y:0}]);
const bent = [{x:0,y:0}, {x:80,y:0}, {x:80,y:100}];
const corner = C.moveCorner(bent, 1, {x:20,y:-20});
assert(C.samePoint(corner[0], bent[0]));
assert(C.samePoint(corner.at(-1), bent.at(-1)));
assert(corner.some(p => p.x === 100 && p.y === -20));
assert(orthogonal(corner));

let [a, b, c, e] = [joint(0, 0), joint(150, 0), joint(50, 0), joint(210, 0)];
let project = {version:2, title:'Track separation', parts:[a, b, c, e], wires:[connection(a,b), connection(c,e)]};
for (const manual of [false, true]) {
  project.wires.forEach(wire => { wire.manual = manual; });
  const [first, second] = C.routes(project);
  assert(first.length >= 2 && orthogonal(second));
  assert.equal(C.overlapLength(first, [second]), 0);
  assert.equal(C.selfOverlap(second), 0);
}
assert(C.routes(C.example()).every(points => C.selfOverlap(points) === 0));

const branch = joint(80, 70);
project = {version:2, title:'Junction split', parts:[a, b, branch], wires:[connection(a,b)]};
const original = project.wires[0];
const points = C.route(project, original);
const location = C.splitPoint(points, 0, {x:82,y:6});
assert.deepEqual(location, {x:80,y:0});
const node = C.splitWire(project, original, points, 0, location);
project.wires.push({...connection(branch, branch), b:node});
assert.equal(project.parts.length, 4);
assert.equal(project.wires.filter(wire => C.sameEnd(wire.a, node) || C.sameEnd(wire.b, node)).length, 3);
assert.deepEqual(C.routes(project).slice(0,2), [[{x:0,y:0},location], [location,{x:150,y:0}]]);
assert.deepEqual(C.importDoc(JSON.parse(JSON.stringify(project))), project);
const selectedWire = project.wires[0].id;
assert(C.svg(project, {content:true, selected:selectedWire}).includes('data-segment="0"'));
assert(!C.svg(project, {printing:true}).includes('data-segment'));

const top = joint(70, -60), bottom = joint(70, 60);
const cross = {parts:[a,b,top,bottom], wires:[connection(a,b), connection(top,bottom)]};
assert(C.svg(cross, {printing:true}).includes('M70 -60L70 -4M70 4L70 60'));
assert(!C.svg(cross, {printing:true}).includes('r="3.5"'));
console.log('PASS: wire drags, overlap avoidance, junction split, project roundtrip, crossing gap');

const gridPi = C.make('pi', 237.5, -117);
for (const count of [1, 2, 3, 4, 7, 17, 40]) {
  gridPi.piPins = Array.from({length:count}, (_, i) => i+1);
  const pins = C.ports(gridPi);
  assert.equal(new Set(pins.map(pin => pin.y)).size, count);
  assert(pins.every(pin => pin.x % C.GRID_SIZE === 0 && pin.y % C.GRID_SIZE === 0));
}
const resistor = C.make('resistor', 0, 0);
resistor.value = '4,7 kΩ';
assert.match(C.drawPart(resistor), /rotate\(0\)" y="3.5"[^>]*>4,7 kΩ/);
resistor.hideValue = true;
resistor.hideName = true;
assert(!C.drawPart(resistor).includes('4,7 kΩ'));
assert(!C.drawPart(resistor).includes(resistor.name));
const led = C.make('led', 0, 0);
led.color = '#2345ab';
assert(C.drawPart(led).includes('color="#2345ab"'));
assert(!C.drawPart(led, {printing:true}).includes(led.color));

const drawing = C.readSymbol({
  version:1, name:'Test <symbol>', shapes:[{type:'line', x1:-50, y1:0, x2:50, y2:0}],
  pins:[{x:-50,y:0,dx:-1,dy:0,label:'A'},{x:50,y:0,dx:1,dy:0,label:'B'}],
});
const custom = C.makeSymbol(drawing, 100, 100);
custom.rotation = 90;
assert.deepEqual(C.ports(custom).map(({x,y,dx,dy})=>[x,y,dx,dy]), [[100,50,0,-1],[100,150,0,1]]);
const embedded = {version:2,title:'Embedded symbol',parts:[custom],wires:[]};
assert.deepEqual(C.importDoc(JSON.parse(JSON.stringify(embedded))), embedded);
assert(C.symbolSVG(drawing).includes('Test &lt;symbol&gt;'));
assert.throws(()=>C.readSymbol({...drawing, shapes:[{type:'script', x1:0,y1:0,x2:1,y2:1}]}));
assert.throws(()=>C.importDoc({...embedded, parts:[{...custom, color:'red" onclick="alert(1)'}]}));
console.log('PASS: GPIO grid alignment, resistance values, label visibility, LED color, embedded symbols and validation');

const blank = C.blankProject();
assert.equal(blank.parts.length, 1);
assert.equal(blank.parts[0].kind, 'pi');
assert.deepEqual(blank.parts[0].piPins, Array.from({length:40}, (_, index) => index + 1));
assert.equal(blank.wires.length, 0);
const tour = C.tourExample();
const examplePath = require('node:path').join(__dirname, 'Beispiel-Ampel.piwire');
const bundledExample = C.importDoc(JSON.parse(fs.readFileSync(examplePath)));
assert.equal(tour.parts.filter(part => part.kind === 'led').length, 3);
assert(tour.parts.some(part => part.kind === 'button'));
assert.equal(tour.parts.length, bundledExample.parts.length);
assert.equal(tour.wires.length, bundledExample.wires.length);
const tourRoutes = C.routes(tour);
tourRoutes.forEach((route, index) => {
  assert(orthogonal(route));
  assert.equal(C.overlapLength(route, tourRoutes.slice(0, index)), 0);
});
console.log('PASS: first-start example, bundled traffic light, routed branches and 40-pin blank project');
