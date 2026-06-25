import { BaseNode } from '../BaseNode';
import { Transfer } from '../Transfer';
import { Message } from '../Message';
import { PRODUCER, COLORS, BORDER_COLORS } from '../types';
import type { Simulator } from '../Simulator';

export class Producer extends BaseNode {
  name: string | null = null;
  msg: Message | null = null;
  intervalId: ReturnType<typeof setInterval> | null = null;
  intervalSeconds = 0;

  constructor(sim: Simulator, label: string, x: number, y: number) {
    super(sim, label, COLORS[PRODUCER], x, y);
  }

  getType(): number { return PRODUCER; }
  getLabel(): string { return this.name ?? this.label; }
  accepts(_n: BaseNode): boolean { return false; }
  canStartConnection(): boolean { return this.outgoing.length < 1; }

  removeConnections(): void { this.disconnectOutgoing(); }

  updateName(name: string): void { this.name = name; }

  publishMessage(payload: string, routingKey: string): void {
    if (this.disabled) return;
    if (this.outgoing.length > 0) {
      const n = this.outgoing[0];
      this.msg = new Message(payload, routingKey);
      this.sim.stage.addTransfer(new Transfer(this.sim.stage, this, n, this.msg));
    }
  }

  setIntervalId(id: ReturnType<typeof setInterval>, seconds: number): void {
    this.intervalId = id;
    this.intervalSeconds = seconds;
  }

  stopPublisher(): void {
    this.pausePublisher();
    this.intervalSeconds = 0;
  }

  pausePublisher(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  mouseClicked(): void {
    this.sim.ui?.showProducerForm(
      this.label,
      this.name ?? this.label,
      this.intervalId !== null,
      this.msg,
    );
  }

  remove(): void {
    this.stopPublisher();
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
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = this.nodeColor;
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.strokeStyle = BORDER_COLORS[PRODUCER];
    ctx.lineWidth = 2.5;
    ctx.stroke();
    // Play arrow
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    const s = r * 0.42;
    ctx.beginPath();
    ctx.moveTo(x - s * 0.7, y - s);
    ctx.lineTo(x + s, y);
    ctx.lineTo(x - s * 0.7, y + s);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    this.drawLabel(ctx);
    this.drawDisabledOverlay(ctx);
  }
}
