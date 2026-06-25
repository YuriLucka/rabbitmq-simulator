import { BaseNode } from '../BaseNode';
import { Transfer } from '../Transfer';
import { Message } from '../Message';
import { TrieST } from '../TrieST';
import { EXCHANGE, QUEUE, PRODUCER, DIRECT, FANOUT, TOPIC, COLORS, BORDER_COLORS, EXCHANGE_TYPE_NAMES, SOURCE, DESTINATION } from '../types';
import type { Simulator } from '../Simulator';

export class Exchange extends BaseNode {
  private initialSides = 3;
  private exchangeType = DIRECT;
  private bindings = new TrieST<BaseNode>();

  constructor(sim: Simulator, name: string, x: number, y: number) {
    super(sim, name, COLORS[EXCHANGE], x, y);
  }

  getType(): number { return EXCHANGE; }
  getExchangeType(): number { return this.exchangeType; }
  getExchangeTypeString(): string { return EXCHANGE_TYPE_NAMES[this.exchangeType]; }

  setExchangeType(t: number): void { this.exchangeType = t; }
  changeName(name: string): void { this.label = name; }

  getAllBindings(): Map<string, BaseNode[]> {
    return this.bindings.allValues();
  }

  accepts(n: BaseNode): boolean {
    return n.getType() === EXCHANGE || n.getType() === QUEUE || n.getType() === PRODUCER;
  }

  canStartConnection(): boolean { return true; }

  removeConnections(): void {
    this.disconnectOutgoing();
    this.disconnectIncoming();
  }

  connectWith(n: BaseNode, endpoint: number): void {
    super.connectWith(n, endpoint);
    if (endpoint === SOURCE && (n.getType() === QUEUE || n.getType() === EXCHANGE)) {
      this.addBinding(n, '');
    }
  }

  addBinding(n: BaseNode, bindingKey: string): boolean {
    this.bindings.put(bindingKey, n);
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

  removeBinding(n: BaseNode, bk: string): boolean {
    this.bindings.delete(bk, n);
    return true;
  }

  trasnferArrived(transfer: Transfer): void {
    switch (this.exchangeType) {
      case DIRECT: this.directRouting(transfer); break;
      case FANOUT: this.fanoutRouting(transfer); break;
      case TOPIC: this.topicRouting(transfer); break;
    }
  }

  private directRouting(transfer: Transfer): void {
    const msg = transfer.getData();
    const nodes = this.bindings.getValue(msg.routingKey);
    if (nodes) this.deliverToNodes(msg, nodes);
  }

  private fanoutRouting(transfer: Transfer): void {
    const msg = transfer.getData();
    for (const nodes of this.bindings.allValues().values()) {
      this.deliverToNodes(msg, nodes);
    }
  }

  private topicRouting(transfer: Transfer): void {
    const msg = transfer.getData();
    for (const nodes of this.bindings.valuesForRoutingKey(msg.routingKey).values()) {
      this.deliverToNodes(msg, nodes);
    }
  }

  private deliverToNodes(msg: Message, nodes: BaseNode[]): void {
    for (const n of nodes) {
      this.sim.stage.addTransfer(new Transfer(this.sim.stage, this, n, msg));
    }
  }

  mouseClicked(): void {
    this.sim.ui?.showExchangeForm(this.label, this.label, this.exchangeType);
  }

  remove(): void {
    this.sim.disconnectNode(this);
    this.sim.removeNode(this);
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    if (this.disabled) ctx.globalAlpha = 0.4;
    const sides = this.initialSides + this.bindings.itemCount();
    const r = this.radii + 4;
    ctx.shadowColor = 'rgba(0,0,0,0.32)';
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 4;
    drawPolygon(ctx, sides, this.x, this.y, r, -Math.PI / 2, this.nodeColor, BORDER_COLORS[EXCHANGE]);
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    // Fork/route icon
    const { x, y } = this;
    const s = 5;
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 1.8;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x - s, y); ctx.lineTo(x + 1, y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + 1, y); ctx.lineTo(x + s, y - s * 0.75); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + 1, y); ctx.lineTo(x + s, y + s * 0.75); ctx.stroke();
    ctx.restore();
    this.drawLabel(ctx);
    this.drawDisabledOverlay(ctx);
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
  stroke?: string,
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
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2.5;
    ctx.stroke();
  }
}
