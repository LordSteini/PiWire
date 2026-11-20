'use strict';

const tourSteps = [
  {
    title: 'Eine Ampel als erster Schaltplan',
    text: 'Drei LEDs bilden die Ampel. Der Fußgängertaster ist ein Eingang am Raspberry Pi. In der Tour siehst du, wie du den Plan liest und bearbeitest.',
  },
  {
    title: 'Bauteile einsetzen',
    text: 'Wähle links ein Bauteil aus, um es auf der Zeichenfläche einzusetzen. Du kannst es verschieben und mit R drehen.',
    highlight: 'partsPane',
  },
  {
    title: 'GPIO-Anschlüsse erkennen',
    text: 'Am Raspberry Pi stehen die physischen Pin-Nummern und die GPIO-Funktionen. Unter Eigenschaften kannst du ändern, welche Pins sichtbar sind.',
    kind: 'pi',
    highlight: 'inspector',
  },
  {
    title: 'Eine Leitung verlegen',
    text: 'Klicke erst den Startanschluss und dann den Zielanschluss an. Ein Klick aufs Raster setzt eine Ecke. Ziehe später einen Abschnitt oder Eckgriff, um die Leitung anzupassen.',
    wire: true,
  },
  {
    title: 'Gemeinsame Masse verbinden',
    text: 'Die dunklen Leitungen führen alle zu GND. Ein Punkt markiert einen echten Abzweig. Klickst du beim Verkabeln auf eine Leitung, setzt PiWire dort einen solchen Knoten.',
    kind: 'junction',
  },
  {
    title: 'Bauteile beschriften',
    text: 'Wähle ein Bauteil aus, um Werte und Beschriftungen rechts zu bearbeiten. Der Wert steht direkt im Widerstand. Für LEDs kannst du dort auch eine Farbe einstellen.',
    kind: 'resistor',
    highlight: 'inspector',
  },
  {
    title: 'Plan benennen, speichern und exportieren',
    text: 'Klicke oben auf den Projektnamen, um ihn zu ändern. Im Dateimenü speicherst du den bearbeitbaren Plan als .piwire oder exportierst ihn als PDF oder SVG.',
    highlight: 'renameProject',
  },
];

function startTour(firstLaunch = false) {
  if (tourPreview) return;
  const example = C.tourExample();
  if (firstLaunch) showProject(example);
  const panes = [document.querySelector('.editor-toolbar'), $('partsPane'), $('inspector'), $('stage')];
  tourPreview = {
    project:example, firstLaunch, panes,
    selection:null, step:0, previousView:{...view},
    previousPanels:{partsHidden:$('partsPane').hidden, inspectorHidden:$('inspector').hidden},
  };
  cancelWire();
  restorePanelLayout({});
  panes.forEach(pane => { pane.inert = true; });
  document.body.classList.add('tour-active');
  $('tourPanel').hidden = false;
  renderTourStep();
  fit();
}

function renderTourStep() {
  const {project, step} = tourPreview;
  const current = tourSteps[step];
  const last = step === tourSteps.length - 1;
  document.querySelector('.tour-highlight')?.classList.remove('tour-highlight');
  if (current.highlight) $(current.highlight).classList.add('tour-highlight');
  tourPreview.selection = current.wire ? project.wires[1].id : project.parts.find(p => p.kind === current.kind)?.id;
  $('tourTitle').textContent = tr(current.title);
  $('tourDescription').textContent = tr(current.text);
  $('tourProgress').textContent = tr('Schritt {0} von {1}', step + 1, tourSteps.length);
  $('tourBack').disabled = step === 0;
  $('tourNext').textContent = tr(last ? 'Fertig' : 'Weiter');
  render();
  inspect();
  $('tourTitle').focus();
}

function finishTour() {
  if (!tourPreview) return;
  const {firstLaunch, previousView, previousPanels, panes} = tourPreview;
  tourPreview = null;
  document.querySelector('.tour-highlight')?.classList.remove('tour-highlight');
  document.body.classList.remove('tour-active');
  $('tourPanel').hidden = true;
  panes.forEach(pane => { pane.inert = false; });
  restorePanelLayout(previousPanels);
  view = previousView;
  render();
  inspect();
  if (firstLaunch) fit();
  else setView();
  $('canvas').focus();
  document.dispatchEvent(new Event('piwire-tour-finished'));
}

$('tourExit').onclick = finishTour;
$('tourBack').onclick = () => {
  if (tourPreview.step === 0) return;
  tourPreview.step--;
  renderTourStep();
};
$('tourNext').onclick = () => {
  if (tourPreview.step + 1 === tourSteps.length) return finishTour();
  tourPreview.step++;
  renderTourStep();
};
$('restartTour').onclick = () => {
  $('settingsDialog').close();
  startTour();
  native('preferences', {tourSeen:true}).catch(() => {});
};
