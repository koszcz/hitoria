// A live diagnostics panel, shown with F3.
import { diag } from './diag';

const esc = (s: string) => s.replace(/[&<>]/g, (c) => `&#${c.charCodeAt(0)};`);

export class DebugPanel {
  private el = document.createElement('div');

  constructor() {
    this.el.id = 'debug';
    this.el.hidden = true;
    document.body.appendChild(this.el);
  }

  toggle() {
    this.el.hidden = !this.el.hidden;
    this.refresh();
  }

  refresh() {
    if (this.el.hidden) return;
    const p = diag.perf;
    const issues = [...diag.issues.values()];
    this.el.innerHTML = [
      `<h4>Performance</h4>${(1000 / Math.max(1, p.frameMs)).toFixed(0)} fps · frame ${p.frameMs.toFixed(1)} ms<br>` +
        `update ${p.updateMs.toFixed(1)} ms · draw ${p.drawMs.toFixed(1)} ms · worst ${p.worstMs.toFixed(0)} ms`,
      `<h4>Settlers out</h4>${esc(diag.settlers())}`,
      `<h4>Looks stuck (${issues.length})</h4>` +
        (issues.length ? issues.map((i) => `<div class="issue">${esc(i.text)}</div>`).join('') : 'Nothing'),
      `<h4>Recent events</h4>${diag.events.slice(-12).reverse().map(esc).join('<br>')}`,
    ].join('');
  }
}
