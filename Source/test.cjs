const C=require('./web/core.js'),fs=require('node:fs'),assert=require('node:assert/strict');
let doc=C.example();assert.deepEqual(C.importDoc(JSON.parse(JSON.stringify(doc))),doc);assert.equal(C.pins.length,40);
for(let t of C.catalog){let p=C.make(t.kind,100,100);for(let angle of [0,90,180,270]){p.rotation=p.kind==='pi'?0:angle;let d={version:2,title:'Test',parts:[p],wires:[]};assert.doesNotThrow(()=>C.importDoc(d));assert(C.svg(d,{printing:true}).includes('<svg'));}}
for(let w of doc.wires){let route=C.route(doc,w);assert(route.length>=2);assert.equal(route[0].x,C.endpoint(doc,w.a).x);assert.equal(route.at(-1).y,C.endpoint(doc,w.b).y);for(let i=1;i<route.length;i++)assert(route[i-1].x===route[i].x||route[i-1].y===route[i].y)}
for(let mutate of [d=>d.wires[0].a.pin='999',d=>d.parts[0].piPins=[0],d=>d.parts[0].x=NaN,d=>d.wires[0].color='url(bad)']){let broken=structuredClone(doc);mutate(broken);assert.throws(()=>C.importDoc(broken));}
let svg=C.svg(doc,{printing:true});for(let token of ['data-pin','pattern','#008373'])assert(!svg.includes(token));assert(svg.includes('stroke="#000"'));
let obstacle=C.make('resistor',490,370);doc.parts.push(obstacle);let routed=C.route(doc,doc.wires[0]);assert(routed.length>2);
let malicious=C.make('resistor',1,1);malicious.name='<script>alert(1)</script>';let safe=C.svg({parts:[malicious],wires:[],title:'x'},{printing:true});assert(!safe.includes('<script>'));assert(safe.includes('&lt;script&gt;'));
console.log('PASS: 26 templates, rotation, persistence, validation, route detour, monochrome export, text escaping');
