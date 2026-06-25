import { EXCHANGE, QUEUE, PRODUCER, CONSUMER, STICKY_NOTE, COLORS } from './types';

const TQ_W = 28;
const TQ_H = 14;

export class ToolbarItem {
  constructor(
    public readonly type: number,
    public readonly label: string,
    public readonly x: number,
    public readonly y: number,
    private readonly radii = 12,
  ) {}

  isBelowMouse(mx: number, my: number): boolean {
    const dx = mx - this.x, dy = my - this.y;
    return Math.sqrt(dx * dx + dy * dy) < 22;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const color = COLORS[this.type];
    const { x, y } = this;
    switch (this.type) {
      case EXCHANGE:
        drawExchange(ctx, x, y, this.radii + 2, color);
        break;
      case QUEUE:
        drawPill(ctx, x, y, TQ_W, TQ_H, color);
        break;
      case PRODUCER:
        drawProducer(ctx, x, y, this.radii, color);
        break;
      case CONSUMER:
        drawConsumer(ctx, x, y, this.radii, color);
        break;
      case STICKY_NOTE:
        drawStickyNoteIcon(ctx, x, y);
        break;
    }

    ctx.save();
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '11px Inter, system-ui, sans-serif';
    ctx.fillText(this.label, x, y + 22);
    ctx.restore();
  }
}

function drawProducer(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string): void {
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  const s = r * 0.42;
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.7, cy - s);
  ctx.lineTo(cx + s, cy);
  ctx.lineTo(cx - s * 0.7, cy + s);
  ctx.closePath();
  ctx.fill();
}

function drawExchange(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string): void {
  // Triangle (3 sides, pointing up)
  const angle = (Math.PI * 2) / 3;
  const start = -Math.PI / 2;
  ctx.beginPath();
  for (let i = 0; i < 3; i++) {
    const x = cx + r * Math.cos(start + angle * i);
    const y = cy + r * Math.sin(start + angle * i);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  const s = r * 0.35;
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 1.5;
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(cx - s, cy + 1); ctx.lineTo(cx + 1, cy + 1); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx + 1, cy + 1); ctx.lineTo(cx + s, cy - s * 0.75 + 1); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx + 1, cy + 1); ctx.lineTo(cx + s, cy + s * 0.75 + 1); ctx.stroke();
}

function drawPill(ctx: CanvasRenderingContext2D, cx: number, cy: number, w: number, h: number, color: string): void {
  ctx.beginPath();
  ctx.roundRect(cx - w / 2, cy - h / 2, w, h, h / 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = 1.2;
  ctx.lineCap = 'round';
  const lw = w * 0.38;
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.moveTo(cx - lw / 2, cy + i * 3);
    ctx.lineTo(cx + lw / 2, cy + i * 3);
    ctx.stroke();
  }
}

function drawStickyNoteIcon(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
  const w = 22, h = 18;
  const x = cx - w / 2, y = cy - h / 2;
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.3)';
  ctx.shadowBlur = 4;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 2);
  ctx.fillStyle = '#fef3c7';
  ctx.fill();
  ctx.restore();
  const fold = 5;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x + w - fold, y);
  ctx.lineTo(x + w, y + fold);
  ctx.lineTo(x + w - fold, y + fold);
  ctx.closePath();
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.strokeStyle = 'rgba(30,41,59,0.45)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(x + 3, y + 4 + i * 4);
    ctx.lineTo(x + w - 7, y + 4 + i * 4);
    ctx.stroke();
  }
  ctx.restore();
}

function drawConsumer(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string): void {
  ctx.beginPath();
  ctx.roundRect(cx - r, cy - r, r * 2, r * 2, 4);
  ctx.fillStyle = color;
  ctx.fill();
  const s = r * 0.42;
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = 1.8;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx, cy - s);
  ctx.lineTo(cx, cy + s * 0.1);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - s, cy - s * 0.2);
  ctx.lineTo(cx, cy + s * 0.7);
  ctx.lineTo(cx + s, cy - s * 0.2);
  ctx.closePath();
  ctx.fill();
}
