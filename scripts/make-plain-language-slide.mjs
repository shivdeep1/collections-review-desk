import fs from 'node:fs/promises';
import path from 'node:path';
import { Presentation, PresentationFile } from '@oai/artifact-tool';

const root = process.cwd();
const out = path.join(root, 'public', 'collections-review-plain-language-slide.pptx');
const preview = path.join(root, '.scratch', 'runtime', 'pitch', 'plain-language-slide.png');
await fs.mkdir(path.dirname(preview), { recursive: true });

const p = Presentation.create({ slideSize: { width: 1280, height: 720 } });
const s = p.slides.add();
s.background.fill = '#FFFFFF';
const green = '#173F39';
const ink = '#203731';
const muted = '#526861';
const pale = '#F0F5EC';
const sand = '#F8F2E6';

function box(x, y, w, h, fill) {
  return s.shapes.add({ geometry: 'rect', position: { left: x, top: y, width: w, height: h }, fill, line: { fill: 'none', width: 0 } });
}
function txt(text, x, y, w, h, size, color = ink, bold = false) {
  const shape = s.shapes.add({ geometry: 'textbox', position: { left: x, top: y, width: w, height: h }, fill: 'none', line: { fill: 'none', width: 0 } });
  shape.text = text;
  shape.text.style = { typeface: 'Arial', fontSize: size, color, bold, autoFit: 'none', verticalAlignment: 'middle' };
  return shape;
}

box(0, 0, 1280, 132, green);
txt('Collections Review Desk', 60, 24, 1150, 56, 43, '#FFFFFF', true);
txt("A second pair of eyes for the bank's collection calls", 60, 80, 1150, 35, 23, '#DCE8DA');

txt('When a customer misses a loan payment, an agent calls and writes a case note.', 60, 154, 1160, 38, 23);
txt('Our tool checks whether the note matches what the customer actually said.', 60, 190, 1160, 34, 23);

box(60, 250, 557, 168, pale);
box(639, 250, 581, 168, sand);
txt('THE AGENT WRITES', 80, 267, 520, 27, 17, muted, true);
txt('"Customer promised to pay Rs. 18,500 by Friday."', 80, 307, 510, 91, 28);
txt('THE CUSTOMER ACTUALLY SAYS', 659, 267, 535, 27, 17, muted, true);
txt('"I disagree with the amount. Explain the charges first. I cannot promise payment yet."', 659, 303, 530, 102, 25);

txt('The tool flags the mismatch and shows the exact words from the call.', 60, 441, 1160, 41, 25, green, true);
txt('It also checks payment requests against the bank\'s approved address list.', 60, 482, 1160, 35, 22);

box(60, 546, 1160, 2, '#DBE4D9');
txt('1  AI turns the call into text and compares it with the note and bank rules.', 60, 562, 1160, 33, 21);
txt('2  A supervisor replays the call, checks the evidence and decides what to do.', 60, 598, 1160, 33, 21);
txt('3  The app saves the decision, reason and follow-up.', 60, 634, 1160, 33, 21);
txt('Synthetic Hindi-English demo with Sarvam AI. A flag prompts investigation; the supervisor makes the decision.', 60, 685, 1160, 19, 13, muted);

s.speakerNotes.textFrame.setText('Synthetic example. The full one-page solution description is available in collections-review-one-pager.pdf.');
await (await PresentationFile.exportPptx(p)).save(out);
const png = await p.export({ slide: s, format: 'png', scale: 1 });
await fs.writeFile(preview, new Uint8Array(await png.arrayBuffer()));
console.log(out);
console.log(preview);
