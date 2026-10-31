// A live diagnostics panel, shown with F3.
import { diag } from './diag';
import type { Game } from './game';

const esc = (s: string) => s.replace(/[&<>]/g, (c) => `&#${c.charCodeAt(0)};`);

export class DebugPanel {
  private el = document.createElement('div');
  private body = document.createElement('div');
  private copy = document.createElement('button');

  constructor(private game: () => Game | undefined) {
    this.el.id = 'debug';
    this.el.hidden = true;
    this.copy.textContent = '📋 Copy for Claude';
    this.copy.onclick = () => this.copySnapshot();
    this.el.append(this.copy, this.body);
    document.body.appendChild(this.el);
  }

  toggle() {
    this.el.hidden = !this.el.hidden;
    this.refresh();
  }

  // Copies the full snapshot, which has much more than the panel shows.
  private async copySnapshot() {
    const text = diag.snapshot();
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const area = document.createElement('textarea');
      area.value = text;
      document.body.appendChild(area);
      area.select();
      document.execCommand('copy');
      area.remove();
    }
    this.copy.textContent = '✅ Copied';
    setTimeout(() => (this.copy.textContent = '📋 Copy for Claude'), 1500);
  }

  refresh() {
    if (this.el.hidden) return;
    const p = diag.perf;
    const g = this.game();
    const issues = [...diag.issues.values()];
    this.body.innerHTML = [
      `<h4>Performance</h4>${(1000 / Math.max(1, p.frameMs)).toFixed(0)} fps · frame ${p.frameMs.toFixed(1)} ms<br>` +
        `update ${p.updateMs.toFixed(1)} ms · draw ${p.drawMs.toFixed(1)} ms · worst ${p.worstMs.toFixed(0)} ms`,
      `<h4>Settlers out (${g?.settlers.size ?? 0}) · idle in the HQ (${g?.pool ?? 0})</h4>${esc(diag.settlers())}`,
      `<h4>Looks stuck (${issues.length})</h4>` +
        (issues.length ? issues.map((i) => `<div class="issue">${esc(i.text)}</div>`).join('') : 'Nothing'),
      `<h4>Recent events</h4>${diag.events.slice(-12).reverse().map(esc).join('<br>')}`,
    ].join('');
  }
}
