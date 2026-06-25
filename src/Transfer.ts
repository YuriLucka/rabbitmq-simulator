import type { Stage } from './Stage';
import type { BaseNode } from './BaseNode';
import type { Message } from './Message';
import { BORDER_COLORS } from './types';

export class Transfer {
  x: number;
  y: number;
  private pct = 0;
  private readonly step = 0.013;
  private finished = false;

  constructor(
    private stage: Stage,
    private from: BaseNode,
    private to: BaseNode,
    private data: Message,
  ) {
    this.x = from.x;
    this.y = from.y;
  }

  getData(): Message { return this.data; }
  getFrom(): BaseNode { return this.from; }
  getTo(): BaseNode { return this.to; }
  isFinished(): boolean { return this.finished; }

  update(): void {
    if (this.pct < 1.0) {
      this.x = this.from.x + this.pct * (this.to.x - this.from.x);
      this.y = this.from.y + this.pct * (this.to.y - this.from.y);
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    this.pct += this.step;
    const { x, y } = this;
    const w = 24, h = 17;
    const fillColor = this.from.nodeColor;
    const strokeColor = BORDER_COLORS[this.from.getType()] ?? '#475569';
    ctx.save();
    // Body
    ctx.shadowColor = 'rgba(0,0,0,0.25)';
    ctx.shadowBlur = 5;
    ctx.shadowOffsetY = 2;
    ctx.beginPath();
    ctx.roundRect(x - w / 2, y - h / 2, w, h, 2);
    ctx.fillStyle = fillColor;
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // Flap V
    ctx.beginPath();
    ctx.moveTo(x - w / 2 + 1.5, y - h / 2);
    ctx.lineTo(x, y + 1.5);
    ctx.lineTo(x + w / 2 - 1.5, y - h / 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.restore();
  }

  afterDraw(): void {
    if (this.pct >= 1.0) {
      this.finished = true;
      this.from.transferDelivered?.(this);
      this.to.trasnferArrived?.(this);
    }
  }
}

// augment BaseNode to avoid TS errors for optional methods
declare module './BaseNode' {
  interface BaseNode {
    trasnferArrived?(transfer: Transfer): void;
    transferDelivered?(transfer: Transfer): void;
  }
}
