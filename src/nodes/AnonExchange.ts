import { BaseNode } from '../BaseNode';
import { Transfer } from '../Transfer';
import { Stage } from '../Stage';
import { Message } from '../Message';
import { ANON_EXCHANGE, ANON, PRODUCER, QUEUE, COLORS } from '../types';
import type { Simulator } from '../Simulator';

export class AnonExchange extends BaseNode {
  private bindings = new Map<string, BaseNode>();
  private initialSides = 3;

  constructor(sim: Simulator, name: string, x: number, y: number) {
    super(sim, name, COLORS[ANON_EXCHANGE], x, y);
  }

  getType(): number { return ANON_EXCHANGE; }
  getExchangeType(): number { return ANON; }

  accepts(n: BaseNode): boolean { return n.getType() === PRODUCER; }
  canStartConnection(): boolean { return false; }

  connectWith(n: BaseNode, endpoint: number): void {
    if (n.getType() === QUEUE) this.addBinding(n, n.getLabel());
    if (n.getType() === PRODUCER) this.incoming.push(n);
  }

  addBinding(n: BaseNode, bindingKey: string): boolean {
    this.bindings.set(bindingKey, n);
    return true;
  }

  updateBinding(n: BaseNode, oldBk: string, newBk: string): boolean {
    if (oldBk !== newBk) {
      this.removeBinding(n, oldBk);
      this.addBinding(n, newBk);
      return true;
    }
    return false;
  }

  removeBinding(_n: BaseNode, bk: string): boolean {
    this.bindings.delete(bk);
    return true;
  }

  trasnferArrived(transfer: Transfer): void {
    const msg = transfer.getData();
    const q = this.bindings.get(msg.routingKey);
    if (q) this.sim.stage.addTransfer(new Transfer(this.sim.stage, this, q, msg));
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (!this.sim.advancedMode) return;
    const sides = this.initialSides + this.bindings.size;
    const r = this.radii + 4;
    drawPolygon(ctx, sides, this.x, this.y, r, -Math.PI / 2, this.nodeColor);
    this.drawLabel(ctx);
  }
}

function drawPolygon(
  ctx: CanvasRenderingContext2D,
  n: number,
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  fill: string,
): void {
  const angle = (Math.PI * 2) / n;
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const x = cx + r * Math.cos(startAngle + angle * i);
    const y = cy + r * Math.sin(startAngle + angle * i);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}
