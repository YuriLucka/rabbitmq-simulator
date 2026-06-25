import type { BaseNode } from './BaseNode';
import { ANON_EXCHANGE, EXCHANGE, QUEUE, CONSUMER, FANOUT, DEFAULT_BINDING_KEY } from './types';
import { Exchange } from './nodes/Exchange';
import { AnonExchange } from './nodes/AnonExchange';

export class Edge {
  private bindingKeyLabel = DEFAULT_BINDING_KEY;
  private connectedAt = Date.now();
  private static FLASH_MS = 1200;

  constructor(
    public from: BaseNode,
    public to: BaseNode,
    private edgeColor = '#6b7280',
  ) {}

  middleX(): number { return (this.from.x + this.to.x) / 2; }
  middleY(): number { return (this.from.y + this.to.y) / 2; }

  connectedToAnonExchange(): boolean {
    return this.from.getType() === ANON_EXCHANGE || this.to.getType() === ANON_EXCHANGE;
  }

  setBindingKey(bk: string): void {
    this.bindingKeyLabel = bk === '' ? DEFAULT_BINDING_KEY : bk;
  }

  getBindingKey(): string {
    return this.bindingKeyLabel === DEFAULT_BINDING_KEY ? '' : this.bindingKeyLabel;
  }

  updateBindingKey(bk: string): void {
    if (this.to.getType() === EXCHANGE || this.to.getType() === ANON_EXCHANGE) {
      const x = this.to as Exchange | AnonExchange;
      const oldBk = this.getBindingKey();
      if (x.updateBinding(this.from, oldBk, bk)) {
        this.setBindingKey(bk);
      }
    }
  }

  remove(): void {
    const x = this.to as Exchange | AnonExchange;
    x.removeBinding(this.from, this.getBindingKey());
  }

  isNearMouse(mx: number, my: number, threshold = 8): boolean {
    const { x: x1, y: y1 } = this.from;
    const { x: x2, y: y2 } = this.to;
    const dx = x2 - x1, dy = y2 - y1;
    const len2 = dx * dx + dy * dy;
    if (len2 === 0) return false;
    const t = Math.max(0, Math.min(1, ((mx - x1) * dx + (my - y1) * dy) / len2));
    const px = x1 + t * dx - mx;
    const py = y1 + t * dy - my;
    return px * px + py * py < threshold * threshold;
  }

  labelClicked(mx: number, my: number): boolean {
    const ctx = document.createElement('canvas').getContext('2d')!;
    ctx.font = '12px SansSerif';
    const w = ctx.measureText(this.bindingKeyLabel).width / 2;
    const cx = this.middleX(), cy = this.middleY();
    return mx >= cx - w && mx <= cx + w && my >= cy - 10 && my <= cy + 10;
  }

  draw(ctx: CanvasRenderingContext2D, advancedMode: boolean, selected = false): void {
    if (!advancedMode && this.connectedToAnonExchange()) return;

    const dimmed = this.from.disabled || this.to.disabled;
    ctx.save();
    if (dimmed) ctx.globalAlpha = 0.2;

    const elapsed = Date.now() - this.connectedAt;
    const t = Math.min(1, elapsed / Edge.FLASH_MS);
    const strokeColor = selected ? '#f97316' : (t < 1 ? lerpColor('#22c55e', this.edgeColor, t) : this.edgeColor);

    ctx.beginPath();
    ctx.moveTo(this.from.x, this.from.y);
    ctx.lineTo(this.to.x, this.to.y);
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = selected ? 3 : 2;
    ctx.stroke();

    this.drawArrowHead(ctx);

    const fromType = this.from.getType();
    if ((fromType === QUEUE || fromType === EXCHANGE) && this.to.getExchangeType() !== FANOUT) {
      const cx = this.middleX(), cy = this.middleY();
      const label = this.bindingKeyLabel;
      const tw = ctx.measureText(label).width;
      ctx.fillStyle = '#1e2235';
      ctx.beginPath();
      ctx.roundRect(cx - tw / 2 - 4, cy - 8, tw + 8, 16, 4);
      ctx.fill();
      ctx.fillStyle = '#94a3b8';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '11px Inter, system-ui, sans-serif';
      ctx.fillText(label, cx, cy);
    }

    ctx.restore();
  }

  private drawArrowHead(ctx: CanvasRenderingContext2D): void {
    const fromType = this.from.getType();
    const atStart = fromType === QUEUE || fromType === CONSUMER || fromType === EXCHANGE;
    const distance = atStart ? 0.1 : 0.9;

    let x0: number, y0: number, x1: number, y1: number;
    if (atStart) {
      x0 = this.from.x + distance * (this.to.x - this.from.x);
      y0 = this.from.y + distance * (this.to.y - this.from.y);
      x1 = this.to.x; y1 = this.to.y;
      arrowhead(ctx, x0, y0, Math.atan2(y1 - y0, x1 - x0), Math.PI / 6);
    } else {
      x0 = this.from.x; y0 = this.from.y;
      x1 = this.from.x + distance * (this.to.x - this.from.x);
      y1 = this.from.y + distance * (this.to.y - this.from.y);
      arrowhead(ctx, x1, y1, Math.atan2(y0 - y1, x0 - x1), Math.PI / 6);
    }
  }
}

function lerpColor(a: string, b: string, t: number): string {
  const parse = (h: string) => [
    parseInt(h.slice(1, 3), 16),
    parseInt(h.slice(3, 5), 16),
    parseInt(h.slice(5, 7), 16),
  ];
  const [ar, ag, ab] = parse(a);
  const [br, bg, bb] = parse(b);
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return `rgb(${r},${g},${bl})`;
}

function arrowhead(ctx: CanvasRenderingContext2D, x0: number, y0: number, lineAngle: number, arrowAngle: number): void {
  const SIZE = 8;
  const x2 = x0 + SIZE * Math.cos(lineAngle + arrowAngle);
  const y2 = y0 + SIZE * Math.sin(lineAngle + arrowAngle);
  const x3 = x0 + SIZE * Math.cos(lineAngle - arrowAngle);
  const y3 = y0 + SIZE * Math.sin(lineAngle - arrowAngle);
  ctx.beginPath();
  ctx.moveTo(x0, y0); ctx.lineTo(x2, y2);
  ctx.moveTo(x0, y0); ctx.lineTo(x3, y3);
  ctx.strokeStyle = '#6b7280';
  ctx.lineWidth = 1.5;
  ctx.stroke();
}
