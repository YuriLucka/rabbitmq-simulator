import { BaseNode } from '../BaseNode';
import { Transfer } from '../Transfer';
import { QUEUE, CONSUMER, COLORS, BORDER_COLORS, Q_WIDTH, Q_HEIGHT } from '../types';
import type { Simulator } from '../Simulator';
import type { Edge } from '../Edge';

export class Queue extends BaseNode {
  private messages: Transfer[] = [];
  anonBinding: Edge | null = null;

  constructor(sim: Simulator, name: string, x: number, y: number) {
    super(sim, name, COLORS[QUEUE], x, y);
  }

  getType(): number { return QUEUE; }
  accepts(n: BaseNode): boolean { return n.getType() === CONSUMER; }
  canStartConnection(): boolean { return true; }

  setAnonBinding(e: Edge): void { this.anonBinding = e; }

  connectWith(n: BaseNode, endpoint: number): void {
    super.connectWith(n, endpoint);
    this.maybeDeliverMessage();
  }

  removeConnections(): void {
    this.disconnectOutgoing();
    this.disconnectIncoming();
  }

  changeName(name: string): void { this.label = name; }

  trasnferArrived(transfer: Transfer): void {
    this.messages.push(transfer);
    this.maybeDeliverMessage();
  }

  transferDelivered(transfer: Transfer): void {
    this.incoming.push(transfer.getTo());
    this.maybeDeliverMessage();
  }

  maybeDeliverMessage(): void {
    if (this.messages.length > 0 && this.incoming.length > 0) {
      const consumer = this.incoming[0];
      if (consumer.disabled) return; // accumulate until re-enabled
      this.incoming.shift();
      const transfer = this.messages.shift()!;
      this.sim.stage.addTransfer(new Transfer(this.sim.stage, this, consumer, transfer.getData()));
    }
  }

  mouseClicked(): void {
    this.sim.ui?.showQueueForm(this.label, this.label);
  }

  remove(): void {
    this.sim.disconnectNode(this);
    this.sim.removeNode(this);
  }

  isBelowMouse(mx: number, my: number): boolean {
    return Math.abs(mx - this.x) < Q_WIDTH / 2 + 4 && Math.abs(my - this.y) < Q_HEIGHT / 2 + 8;
  }

  drawLabel(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = this.disabled ? '#475569' : '#cbd5e1';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '12px Inter, system-ui, sans-serif';
    ctx.fillText(this.getLabel(), this.x, this.y + Q_HEIGHT / 2 + 14);
  }

  drawDisabledOverlay(ctx: CanvasRenderingContext2D): void {
    if (!this.disabled) return;
    ctx.save();
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = '#0f1117';
    ctx.beginPath();
    ctx.roundRect(this.x - Q_WIDTH / 2 - 2, this.y - Q_HEIGHT / 2 - 2, Q_WIDTH + 4, Q_HEIGHT + 4, Q_HEIGHT / 2 + 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(this.x, this.y, 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(this.x - 5, this.y + 5);
    ctx.lineTo(this.x + 5, this.y - 5);
    ctx.stroke();
    ctx.restore();
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const cx = this.x, cy = this.y;
    const msgs = this.messages.length;
    const half = Q_HEIGHT / 2;

    ctx.save();
    if (this.disabled) ctx.globalAlpha = 0.4;

    ctx.shadowColor = 'rgba(0,0,0,0.32)';
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 4;
    // Pill shape
    ctx.beginPath();
    ctx.roundRect(cx - Q_WIDTH / 2, cy - half, Q_WIDTH, Q_HEIGHT, half);
    ctx.fillStyle = this.nodeColor;
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.strokeStyle = BORDER_COLORS[QUEUE];
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Fixed queue icon: 3 horizontal lines
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    const lineW = Q_WIDTH * 0.38;
    const lineX = cx - lineW / 2;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(lineX, cy + i * 4);
      ctx.lineTo(lineX + lineW, cy + i * 4);
      ctx.stroke();
    }

    ctx.restore();
    this.drawLabel(ctx);

    // Count badge
    ctx.fillStyle = msgs > 0 ? this.nodeColor : '#475569';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `bold 13px Inter, system-ui, sans-serif`;
    ctx.fillText(`${msgs}`, cx, cy - half - 9);

    this.drawDisabledOverlay(ctx);
  }
}
