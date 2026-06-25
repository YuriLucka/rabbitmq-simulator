import type { BaseNode } from './BaseNode';

export class TmpEdge {
  constructor(
    public from: BaseNode,
    public toX: number,
    public toY: number,
  ) {}

  update(x: number, y: number): void { this.toX = x; this.toY = y; }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(this.from.x, this.from.y);
    ctx.lineTo(this.toX, this.toY);
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.globalAlpha = 0.75;
    ctx.stroke();
    ctx.restore();
  }
}
