import type { Simulator } from './Simulator';
import { SOURCE, DESTINATION, TOOLBAR_WIDTH, NODE_RADII } from './types';

export abstract class BaseNode {
  x: number;
  y: number;
  readonly radii = NODE_RADII;
  label: string;
  nodeColor: string;
  disabled = false;

  incoming: BaseNode[] = [];
  outgoing: BaseNode[] = [];

  constructor(
    protected sim: Simulator,
    label: string,
    nodeColor: string,
    x: number,
    y: number,
  ) {
    this.label = label;
    this.nodeColor = nodeColor;
    this.x = x;
    this.y = y;
  }

  abstract getType(): number;
  abstract accepts(n: BaseNode): boolean;
  abstract canStartConnection(): boolean;
  abstract draw(ctx: CanvasRenderingContext2D): void;

  getLabel(): string { return this.label; }
  getExchangeType(): number { return -1; }
  getExchangeTypeString(): string { return ''; }

  isBelowMouse(mx: number, my: number): boolean {
    const dx = mx - this.x, dy = my - this.y;
    return Math.sqrt(dx * dx + dy * dy) < this.radii + 8;
  }

  connectWith(n: BaseNode, endpoint: number): void {
    if (endpoint === DESTINATION) this.outgoing.push(n);
    else this.incoming.push(n);
  }

  disconnectFrom(n: BaseNode, endpoint: number): void {
    if (endpoint === DESTINATION) this.outgoing = this.outgoing.filter(x => x !== n);
    else this.incoming = this.incoming.filter(x => x !== n);
  }

  disconnectOutgoing(): void { this.disconnectNodes(SOURCE); }
  disconnectIncoming(): void { this.disconnectNodes(DESTINATION); }

  private disconnectNodes(endpoint: number): void {
    const nodes = endpoint === DESTINATION ? [...this.incoming] : [...this.outgoing];
    for (const n of nodes) n.disconnectFrom(this, endpoint);
    if (endpoint === DESTINATION) this.incoming = [];
    else this.outgoing = [];
  }

  removeConnections(): void {}

  mouseDragged(mx: number, my: number): void {
    this.x = mx;
    this.y = my;
  }

  mouseClicked(): void {}
  remove(): void {}

  drawLabel(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = this.disabled ? '#475569' : '#cbd5e1';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '12px Inter, system-ui, sans-serif';
    ctx.fillText(this.getLabel(), this.x, this.y + this.radii + 14);
  }

  drawDisabledOverlay(ctx: CanvasRenderingContext2D): void {
    if (!this.disabled) return;
    ctx.save();
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = '#0f1117';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radii + 3, 0, Math.PI * 2);
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
}
