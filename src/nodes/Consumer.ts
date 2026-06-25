import { BaseNode } from '../BaseNode';
import { Transfer } from '../Transfer';
import { CONSUMER, COLORS, BORDER_COLORS } from '../types';
import type { Simulator } from '../Simulator';

export class Consumer extends BaseNode {
  name: string | null = null;

  constructor(sim: Simulator, label: string, x: number, y: number) {
    super(sim, label, COLORS[CONSUMER], x, y);
  }

  getType(): number { return CONSUMER; }
  getLabel(): string { return this.name ?? this.label; }
  accepts(_n: BaseNode): boolean { return false; }
  canStartConnection(): boolean { return true; }
  removeConnections(): void { this.disconnectOutgoing(); }

  updateName(name: string): void { this.name = name; }

  trasnferArrived(transfer: Transfer): void {
    if (this.disabled) return;
    if (!this.sim.isPlayer) {
      const msg = transfer.getData();
      this.sim.ui?.showMessage(this.getLabel(), msg.payload);
    }
  }

  mouseClicked(): void {
    this.sim.ui?.showConsumerForm(this.label, this.name ?? this.label);
  }

  remove(): void {
    this.sim.disconnectNode(this);
    this.sim.removeNode(this);
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    if (this.disabled) ctx.globalAlpha = 0.4;
    const { x, y } = this;
    const r = this.radii;
    ctx.shadowColor = 'rgba(0,0,0,0.32)';
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 4;
    // Rounded square
    ctx.beginPath();
    ctx.roundRect(x - r, y - r, r * 2, r * 2, 5);
    ctx.fillStyle = this.nodeColor;
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.strokeStyle = BORDER_COLORS[CONSUMER];
    ctx.lineWidth = 2.5;
    ctx.stroke();
    // Inbox / receive arrow
    const s = r * 0.42;
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y - s);
    ctx.lineTo(x, y + s * 0.1);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - s, y - s * 0.2);
    ctx.lineTo(x, y + s * 0.7);
    ctx.lineTo(x + s, y - s * 0.2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    this.drawLabel(ctx);
    this.drawDisabledOverlay(ctx);
  }
}
