import { Stage } from './Stage';
import { Edge } from './Edge';
import { TmpEdge } from './TmpEdge';
import { Transfer } from './Transfer';
import { BaseNode } from './BaseNode';
import { Exchange } from './nodes/Exchange';
import { AnonExchange } from './nodes/AnonExchange';
import { Queue } from './nodes/Queue';
import { Producer } from './nodes/Producer';
import { Consumer } from './nodes/Consumer';
import { ToolbarItem } from './ToolbarItem';
import { StickyNote } from './StickyNote';
import { Message } from './Message';
import type { UI } from './UI';
import type { FlowData } from './FlowStore';
import {
  EXCHANGE, QUEUE, PRODUCER, CONSUMER, ANON_EXCHANGE, STICKY_NOTE,
  SOURCE, DESTINATION, TOOLBAR_WIDTH, ANON_X, ANON_Y,
  NODE_TYPE_NAMES, EXCHANGE_TYPE_FROM_NAME,
} from './types';

export class Simulator {
  readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  stage: Stage;
  readonly anonExchange: AnonExchange;

  private nodes: (BaseNode | null)[] = [];
  private nodeCount = 0;
  private nodeTable = new Map<string, BaseNode>();
  private edges: Edge[] = [];
  private toolbarItems: ToolbarItem[] = [];

  advancedMode = false;
  isPlayer = false;

  private tmpEdge: TmpEdge | null = null;
  private tmpNode: BaseNode | null = null;
  private fromNode: BaseNode | null = null;
  private altOrShift = false;
  private animId: number | null = null;
  private paused = false;

  // Sticky notes
  notes: StickyNote[] = [];
  selectedNote: StickyNote | null = null;
  private tmpNote: StickyNote | null = null;
  private draggingNote: StickyNote | null = null;
  private noteOffsetX = 0;
  private noteOffsetY = 0;
  private resizingNote: StickyNote | null = null;
  private resizeStartX = 0;
  private resizeStartY = 0;
  private resizeStartW = 0;
  private resizeStartH = 0;

  // Selection
  selectedNodes: Set<BaseNode> = new Set();
  selectedEdges: Set<Edge> = new Set();

  // Hover for connection port
  private hoveredNode: BaseNode | null = null;

  // Camera / viewport
  private camX = 0;
  private camY = 0;
  private camScale = 1;
  private isPanning = false;
  private panStartX = 0;
  private panStartY = 0;
  private panCamX = 0;
  private panCamY = 0;
  private spaceDown = false;

  ui: UI | null = null;

  get width(): number { return this.canvas.width; }
  get height(): number { return this.canvas.height; }

  constructor(canvasId: string) {
    this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.stage = new Stage();
    this.anonExchange = new AnonExchange(this, 'anon-exchange', ANON_X, ANON_Y);
    this.buildToolbar();
    this.setupEvents();
    this.startLoop();
    setTimeout(() => {
      this.fitCanvas();
      new ResizeObserver(() => this.fitCanvas()).observe(this.canvas);
    }, 50);
  }

  private buildToolbar(): void {
    this.toolbarItems = [
      new ToolbarItem(EXCHANGE, 'exchange', 30, 22),
      new ToolbarItem(QUEUE, 'queue', 30, 70),
      new ToolbarItem(PRODUCER, 'producer', 30, 118),
      new ToolbarItem(CONSUMER, 'consumer', 30, 166),
      new ToolbarItem(STICKY_NOTE, 'note', 30, 218),
    ];
  }

  private fitCanvas(): void {
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width > 10 && rect.height > 10) {
      this.canvas.width = Math.floor(rect.width);
      this.canvas.height = Math.floor(rect.height);
    }
  }

  private setupEvents(): void {
    this.canvas.addEventListener('mousedown', e => this.onMouseDown(e));
    this.canvas.addEventListener('mousemove', e => this.onMouseMove(e));
    this.canvas.addEventListener('mouseup', e => this.onMouseUp(e));
    this.canvas.addEventListener('click', e => this.onClick(e));
    this.canvas.addEventListener('dblclick', e => this.onDblClick(e));
    this.canvas.addEventListener('wheel', e => this.onWheel(e), { passive: false });
    this.canvas.addEventListener('contextmenu', e => e.preventDefault());
    window.addEventListener('keydown', e => {
      if (e.key === 'Alt' || e.key === 'Shift') this.altOrShift = true;
      if (e.key === ' ') { this.spaceDown = true; this.canvas.style.cursor = 'grab'; e.preventDefault(); }
      if ((e.ctrlKey || e.metaKey) && e.key === '0') { e.preventDefault(); this.resetZoom(); }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const tag = (document.activeElement as HTMLElement)?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;
        if (this.selectedNote) {
          this.removeNote(this.selectedNote);
          this.ui?.hideNoteForm();
          return;
        }
        for (const n of this.selectedNodes) n.remove();
        for (const edge of this.selectedEdges) this.removeEdge(edge);
        this.selectedNodes.clear();
        this.selectedEdges.clear();
        this.ui?.updateSelectionBar(0, []);
      }
    });
    window.addEventListener('keyup', e => {
      if (e.key === 'Alt' || e.key === 'Shift') this.altOrShift = false;
      if (e.key === ' ') { this.spaceDown = false; this.canvas.style.cursor = 'crosshair'; }
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.stopRendering();
      else if (this.paused) this.startLoop();
    });
  }

  // Screen ↔ world coordinate conversion
  private toWorld(sx: number, sy: number): { x: number; y: number } {
    return { x: (sx - this.camX) / this.camScale, y: (sy - this.camY) / this.camScale };
  }

  worldToScreen(wx: number, wy: number): { x: number; y: number } {
    return { x: wx * this.camScale + this.camX, y: wy * this.camScale + this.camY };
  }

  private getPos(e: MouseEvent): { sx: number; sy: number; wx: number; wy: number } {
    const rect = this.canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
    const { x: wx, y: wy } = this.toWorld(sx, sy);
    return { sx, sy, wx, wy };
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    const { sx, sy } = this.getPos(e);
    if (sx < TOOLBAR_WIDTH) return; // ignore wheel on toolbar
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    const newScale = Math.min(4, Math.max(0.15, this.camScale * factor));
    const wx = (sx - this.camX) / this.camScale;
    const wy = (sy - this.camY) / this.camScale;
    this.camScale = newScale;
    this.camX = sx - wx * this.camScale;
    this.camY = sy - wy * this.camScale;
  }

  private onMouseDown(e: MouseEvent): void {
    const { sx, sy, wx, wy } = this.getPos(e);

    // Middle mouse or space+left = pan
    if (e.button === 1 || (e.button === 0 && this.spaceDown)) {
      this.isPanning = true;
      this.panStartX = sx; this.panStartY = sy;
      this.panCamX = this.camX; this.panCamY = this.camY;
      this.canvas.style.cursor = 'grabbing';
      return;
    }

    // Toolbar drag
    for (const item of this.toolbarItems) {
      if (item.isBelowMouse(sx, sy)) {
        if (item.type === STICKY_NOTE) {
          this.tmpNote = new StickyNote(wx - 95, wy - 60);
        } else {
          this.tmpNode = this.createNodeByType(item.type, item.label, wx, wy);
        }
        return;
      }
    }

    // Port click (connection handle on right side of hovered node)
    if (this.hoveredNode && this.isOnPort(this.hoveredNode, wx, wy) && this.hoveredNode.canStartConnection()) {
      this.fromNode = this.hoveredNode;
      this.tmpEdge = new TmpEdge(this.fromNode, wx, wy);
      return;
    }

    // Note resize handle (check before drag)
    for (let i = this.notes.length - 1; i >= 0; i--) {
      const n = this.notes[i];
      if (n.isOnResizeHandle(wx, wy)) {
        this.resizingNote = n;
        this.resizeStartX = wx;
        this.resizeStartY = wy;
        this.resizeStartW = n.width;
        this.resizeStartH = n.height;
        return;
      }
    }

    // Note drag
    const noteHit = this.noteBelowMouse(wx, wy);
    if (noteHit) {
      this.draggingNote = noteHit;
      this.noteOffsetX = wx - noteHit.x;
      this.noteOffsetY = wy - noteHit.y;
      return;
    }

    // Sync flag from event — prevents stale state when keyup missed (focus loss)
    if (!e.altKey && !e.shiftKey) this.altOrShift = false;

    const isConnecting = this.altOrShift || e.altKey || e.shiftKey;
    this.fromNode = this.nodeBelowMouse(wx, wy);
    if (this.fromNode && isConnecting && this.fromNode.canStartConnection()) {
      this.tmpEdge = new TmpEdge(this.fromNode, wx, wy);
    }
  }

  private isOnPort(n: BaseNode, wx: number, wy: number): boolean {
    const px = n.x + n.radii + 10;
    const py = n.y;
    const dx = wx - px, dy = wy - py;
    return dx * dx + dy * dy < 64; // 8px radius
  }

  private onMouseMove(e: MouseEvent): void {
    const { sx, sy, wx, wy } = this.getPos(e);

    if (this.isPanning) {
      this.camX = this.panCamX + (sx - this.panStartX);
      this.camY = this.panCamY + (sy - this.panStartY);
      this.ui?.hideNodePopover();
      return;
    }

    if (this.resizingNote) {
      this.resizingNote.width = Math.max(100, this.resizeStartW + (wx - this.resizeStartX));
      this.resizingNote.height = Math.max(60, this.resizeStartH + (wy - this.resizeStartY));
      return;
    }

    if (this.draggingNote) {
      this.draggingNote.x = wx - this.noteOffsetX;
      this.draggingNote.y = wy - this.noteOffsetY;
      return;
    }

    if (this.tmpNote) {
      this.tmpNote.x = wx - this.tmpNote.width / 2;
      this.tmpNote.y = wy - this.tmpNote.height / 2;
      return;
    }

    if (this.fromNode && this.tmpEdge) {
      this.tmpEdge.update(wx, wy);
    } else if (this.fromNode) {
      this.fromNode.mouseDragged(wx, wy);
    }
    if (this.tmpNode) this.tmpNode.mouseDragged(wx, wy);

    // Cursor update
    if (!this.fromNode && !this.tmpNode) {
      const onResizeHandle = this.notes.some(n => n.isOnResizeHandle(wx, wy));
      const onPort = this.hoveredNode && this.isOnPort(this.hoveredNode, wx, wy);
      this.canvas.style.cursor = onResizeHandle ? 'nwse-resize' : (onPort ? 'crosshair' : (this.spaceDown ? 'grab' : 'default'));
    }
  }

  private onMouseUp(e: MouseEvent): void {
    if (this.isPanning) {
      this.isPanning = false;
      this.canvas.style.cursor = this.spaceDown ? 'grab' : 'crosshair';
      return;
    }

    const { wx, wy } = this.getPos(e);

    if (this.resizingNote) {
      this.resizingNote = null;
      return;
    }

    if (this.draggingNote) {
      this.draggingNote = null;
      return;
    }

    if (this.tmpNote) {
      this.notes.push(this.tmpNote);
      this.selectedNote = this.tmpNote;
      this.ui?.showNoteForm(this.tmpNote);
      this.tmpNote = null;
      this.fromNode = null;
      this.tmpEdge = null;
      return;
    }

    if (this.tmpNode) {
      const n = this.addNodeByType(this.tmpNode.getType(), this.randomName(), wx, wy);
      if (n?.getType() === QUEUE) this.bindToAnonExchange(n as Queue);
    }

    if (this.tmpEdge && this.fromNode) {
      const toNode = this.nodeBelowMouse(wx, wy);
      if (toNode && toNode !== this.fromNode && toNode.accepts(this.fromNode)) {
        this.addConnection(this.fromNode, toNode);
        this.hoveredNode = null; // hide port after connecting
      }
    }

    this.fromNode = null;
    this.tmpEdge = null;
    this.tmpNode = null;
  }

  private onClick(e: MouseEvent): void {
    if (this.isPanning) return;
    const { wx, wy } = this.getPos(e);

    // Notes are rendered on top — check them before nodes
    const noteHit = this.noteBelowMouse(wx, wy);
    if (noteHit) {
      this.selectedNote = noteHit;
      // Bring to front: move to end of array
      const idx = this.notes.indexOf(noteHit);
      if (idx >= 0 && idx < this.notes.length - 1) {
        this.notes.splice(idx, 1);
        this.notes.push(noteHit);
      }
      this.selectedNodes.clear(); this.selectedEdges.clear();
      this.hoveredNode = null;
      this.ui?.hideNodePopover();
      this.ui?.updateSelectionBar(0, []);
      this.ui?.showNoteForm(noteHit);
      return;
    }

    // Node click
    const target = this.nodeBelowMouse(wx, wy);
    if (target) {
      this.selectedNodes.clear(); this.selectedEdges.clear();
      this.selectedNodes.add(target);
      this.hoveredNode = target;
      this.selectedNote = null;
      this.ui?.hideNoteForm();
      this.ui?.updateSelectionBar(0, []);
      target.mouseClicked();
      const screen = this.worldToScreen(target.x, target.y);
      const rect = this.canvas.getBoundingClientRect();
      this.ui?.showNodePopover(target, rect.left + screen.x, rect.top + screen.y);
      return;
    }

    this.hoveredNode = null;
    this.selectedNote = null;
    this.ui?.hideNodePopover();
    this.ui?.hideNoteForm();

    // Check edge click
    for (let i = this.edges.length - 1; i >= 0; i--) {
      const edge = this.edges[i];
      if (edge.isNearMouse(wx, wy)) {
        this.selectedNodes.clear(); this.selectedEdges.clear();
        this.selectedEdges.add(edge);
        this.ui?.updateSelectionBar(0, []);
        if (edge.labelClicked(wx, wy)) {
          this.ui?.showBindingForm(i, edge.getBindingKey(), edge.connectedToAnonExchange());
        }
        return;
      }
    }

    // Click on empty → clear selection
    this.selectedNodes.clear(); this.selectedEdges.clear();
    this.ui?.updateSelectionBar(0, []);
  }

  private onDblClick(e: MouseEvent): void {
    const { sx, sy, wx, wy } = this.getPos(e);
    if (sx < TOOLBAR_WIDTH) return;
    if (this.nodeBelowMouse(wx, wy) || this.noteBelowMouse(wx, wy)) return;
    const note = new StickyNote(wx - 95, wy - 60);
    this.notes.push(note);
    this.selectedNote = note;
    this.ui?.showNoteForm(note);
  }

  private noteBelowMouse(mx: number, my: number): StickyNote | null {
    for (let i = this.notes.length - 1; i >= 0; i--) {
      if (this.notes[i].isBelowMouse(mx, my)) return this.notes[i];
    }
    return null;
  }

  removeNote(note: StickyNote): void {
    const i = this.notes.indexOf(note);
    if (i >= 0) this.notes.splice(i, 1);
    if (this.selectedNote === note) this.selectedNote = null;
  }

  private nodeBelowMouse(mx: number, my: number): BaseNode | null {
    for (let i = 0; i < this.nodeCount; i++) {
      const n = this.nodes[i];
      if (n && n.isBelowMouse(mx, my)) return n;
    }
    if (this.anonExchange.isBelowMouse(mx, my)) return this.anonExchange;
    return null;
  }

  private startLoop(): void {
    this.paused = false;
    const loop = () => {
      this.draw();
      this.animId = requestAnimationFrame(loop);
    };
    this.animId = requestAnimationFrame(loop);
  }

  stopRendering(): void {
    this.paused = true;
    if (this.animId !== null) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
    for (let i = 0; i < this.nodeCount; i++) {
      const n = this.nodes[i];
      if (n instanceof Producer) n.pausePublisher();
    }
  }

  private draw(): void {
    const ctx = this.ctx;
    const w = this.width, h = this.height;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#0f1117';
    ctx.fillRect(0, 0, w, h);

    // World content with camera transform
    ctx.save();
    ctx.translate(this.camX, this.camY);
    ctx.scale(this.camScale, this.camScale);

    this.drawGrid(ctx);

    for (const edge of this.edges) edge.draw(ctx, this.advancedMode, this.selectedEdges.has(edge));
    this.tmpEdge?.draw(ctx);
    this.stage.draw(ctx);
    this.anonExchange.draw(ctx);
    for (let i = 0; i < this.nodeCount; i++) this.nodes[i]?.draw(ctx);

    // Selection highlights for nodes
    ctx.save();
    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 4]);
    for (const n of this.selectedNodes) {
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.radii + 7, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.restore();

    // Connection port on hovered node
    if (this.hoveredNode && !this.fromNode && !this.tmpNode && this.hoveredNode.canStartConnection()) {
      const n = this.hoveredNode;
      const px = n.x + n.radii + 10;
      const py = n.y;
      ctx.save();
      ctx.beginPath();
      ctx.arc(px, py, 7, 0, Math.PI * 2);
      ctx.fillStyle = '#f97316';
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      // Plus icon
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5;
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(px - 3, py); ctx.lineTo(px + 3, py); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(px, py - 3); ctx.lineTo(px, py + 3); ctx.stroke();
      ctx.restore();
    }

    this.tmpNode?.draw(ctx);

    // Sticky notes on top of all elements; selected note drawn last (frontmost)
    for (const note of this.notes) {
      if (note !== this.selectedNote) note.draw(ctx, false);
    }
    if (this.selectedNote) this.selectedNote.draw(ctx, true);
    this.tmpNote?.draw(ctx, false);

    ctx.restore();

    // Toolbar is screen-space (drawn on top, no camera transform)
    this.drawToolbar(ctx);
  }

  private drawGrid(ctx: CanvasRenderingContext2D): void {
    const step = 32;
    const left = -this.camX / this.camScale;
    const top = -this.camY / this.camScale;
    const right = (this.width - this.camX) / this.camScale;
    const bottom = (this.height - this.camY) / this.camScale;
    const startX = Math.floor(left / step) * step;
    const startY = Math.floor(top / step) * step;

    // World x where toolbar ends (toolbar is TOOLBAR_WIDTH px in screen space)
    const toolbarWorldX = (TOOLBAR_WIDTH - this.camX) / this.camScale;
    ctx.fillStyle = '#252a3d';
    for (let x = startX; x <= right; x += step) {
      if (x < toolbarWorldX) continue;
      for (let y = startY; y <= bottom; y += step) {
        ctx.fillRect(x - 0.75, y - 0.75, 1.5, 1.5);
      }
    }
  }

  private drawToolbar(ctx: CanvasRenderingContext2D): void {
    // Toolbar background
    ctx.fillStyle = '#13161f';
    ctx.fillRect(0, 0, TOOLBAR_WIDTH, this.height);

    // Separator
    ctx.beginPath();
    ctx.moveTo(TOOLBAR_WIDTH, 0);
    ctx.lineTo(TOOLBAR_WIDTH, this.height);
    ctx.strokeStyle = '#2d3148';
    ctx.lineWidth = 1;
    ctx.stroke();

    for (const item of this.toolbarItems) item.draw(ctx);
  }

  private createNodeByType(type: number, label: string, x: number, y: number): BaseNode | null {
    switch (type) {
      case EXCHANGE: return new Exchange(this, label, x, y);
      case QUEUE: return new Queue(this, label, x, y);
      case PRODUCER: return new Producer(this, label, x, y);
      case CONSUMER: return new Consumer(this, label, x, y);
      default: return null;
    }
  }

  addNodeByType(type: number, label: string, x: number, y: number): BaseNode | null {
    const n = this.createNodeByType(type, label, x, y);
    if (!n) return null;
    this.nodeTable.set(label, n);
    this.nodes[this.nodeCount++] = n;
    return n;
  }

  findNode(label: string): BaseNode | undefined {
    return this.nodeTable.get(label);
  }

  // Resolve a node by label scoped to its type. nodeTable is keyed by label
  // alone, so a name shared across types (e.g. a service that is both producer
  // and consumer, or an exchange and queue with the same name) would resolve to
  // the wrong node. Form actions always know the target type, so they use this.
  findNodeByType(type: number, label: string): BaseNode | undefined {
    for (let i = 0; i < this.nodeCount; i++) {
      const n = this.nodes[i];
      if (n && n.getType() === type && n.label === label) return n;
    }
    return undefined;
  }

  removeNode(n: BaseNode): void {
    for (let i = 0; i < this.nodeCount; i++) {
      if (this.nodes[i] === n) { this.nodes[i] = null; }
    }
    this.nodeTable.delete(n.label);
  }

  disconnectNode(n: BaseNode): void {
    for (let i = this.edges.length - 1; i >= 0; i--) {
      const e = this.edges[i];
      if (e.from === n || e.to === n) {
        if (e.to.getType() === EXCHANGE && (e.from.getType() === QUEUE || e.from.getType() === EXCHANGE)) {
          e.remove();
        }
        this.edges.splice(i, 1);
      }
    }
    n.removeConnections();
  }

  addEdge(from: BaseNode, to: BaseNode): Edge | null {
    for (const e of this.edges) {
      if ((e.from === from && e.to === to) || (e.to === from && e.from === to)) return null;
    }
    const edge = new Edge(from, to);
    this.edges.push(edge);
    return edge;
  }

  addConnection(from: BaseNode, to: BaseNode): Edge | null {
    const e = this.addEdge(from, to);
    if (e) {
      from.connectWith(to, DESTINATION);
      to.connectWith(from, SOURCE);
    }
    return e;
  }

  bindToAnonExchange(q: Queue): void {
    const e = this.addEdge(q, this.anonExchange);
    if (e) {
      q.connectWith(this.anonExchange, DESTINATION);
      q.setAnonBinding(e);
      this.anonExchange.connectWith(q, SOURCE);
      e.setBindingKey(q.getLabel());
    }
  }

  getNodes(): (BaseNode | null)[] { return this.nodes.slice(0, this.nodeCount); }

  nodeTypeToString(type: number): string { return NODE_TYPE_NAMES[type] ?? 'unknown'; }

  toggleAdvancedMode(on: boolean): void { this.advancedMode = on; }

  publishMessage(uuid: string, payload: string, routingKey: string): void {
    (this.findNodeByType(PRODUCER, uuid) as Producer | undefined)?.publishMessage(payload, routingKey);
  }

  editProducer(uuid: string, name: string): void {
    (this.findNodeByType(PRODUCER, uuid) as Producer | undefined)?.updateName(name);
  }

  setProducerMessage(uuid: string, payload: string, routingKey: string): void {
    (this.findNodeByType(PRODUCER, uuid) as Producer | undefined)?.setMessage(payload, routingKey);
  }

  editConsumer(uuid: string, name: string): void {
    (this.findNodeByType(CONSUMER, uuid) as Consumer | undefined)?.updateName(name);
  }

  editQueue(oldName: string, name: string): void {
    if (!name) return;
    const n = this.findNodeByType(QUEUE, oldName) as Queue | undefined;
    if (!n) return;
    this.nodeTable.delete(oldName);
    n.changeName(name);
    this.nodeTable.set(name, n);
    n.anonBinding?.updateBindingKey(name);
  }

  editExchange(oldName: string, name: string, type: number): void {
    if (!name) return;
    const n = this.findNodeByType(EXCHANGE, oldName) as Exchange | undefined;
    if (!n) return;
    this.nodeTable.delete(oldName);
    n.changeName(name);
    n.setExchangeType(type);
    this.nodeTable.set(name, n);
  }

  deleteNode(uuid: string, type?: number): void {
    const n = type !== undefined ? this.findNodeByType(type, uuid) : this.findNode(uuid);
    n?.remove();
  }

  setProducerInterval(uuid: string, id: ReturnType<typeof setInterval>, seconds: number): void {
    (this.findNodeByType(PRODUCER, uuid) as Producer | undefined)?.setIntervalId(id, seconds);
  }

  stopPublisher(uuid: string): void {
    (this.findNodeByType(PRODUCER, uuid) as Producer | undefined)?.stopPublisher();
  }

  updateBindingKey(edgeIndex: number, bk: string): void {
    this.edges[edgeIndex]?.updateBindingKey(bk);
  }

  removeBinding(edgeIndex: number): void {
    const e = this.edges[edgeIndex];
    if (e) { e.remove(); this.edges.splice(edgeIndex, 1); }
  }

  removeEdge(edge: Edge): void {
    const i = this.edges.indexOf(edge);
    if (i >= 0) { edge.remove(); this.edges.splice(i, 1); }
  }

  publishMsgWithInterval(seconds: number, uuid: string, payload: string, routingKey: string): void {
    this.stopPublisher(uuid);
    const id = setInterval(() => this.publishMessage(uuid, payload, routingKey), seconds * 1000);
    this.setProducerInterval(uuid, id, seconds);
  }

  buildExport(): object {
    const out: { exchanges: object[]; queues: object[]; bindings: object[] } = {
      exchanges: [], queues: [], bindings: [],
    };
    for (let i = 0; i < this.nodeCount; i++) {
      const n = this.nodes[i];
      if (!n) continue;
      if (n.getType() === EXCHANGE) {
        const x = n as Exchange;
        out.exchanges.push({ name: x.getLabel(), vhost: '/', type: x.getExchangeTypeString(), durable: true, auto_delete: false, internal: false, arguments: [] });
        for (const [rk, dests] of x.getAllBindings()) {
          for (const dest of dests) {
            out.bindings.push({ source: x.getLabel(), vhost: '/', destination: dest.getLabel(), destination_type: this.nodeTypeToString(dest.getType()), routing_key: rk, arguments: [] });
          }
        }
      } else if (n.getType() === QUEUE) {
        out.queues.push({ name: n.getLabel(), vhost: '/', durable: true, auto_delete: false, arguments: [] });
      }
    }
    return out;
  }

  exportToPlayer(): object {
    const out: { exchanges: object[]; queues: object[]; bindings: object[]; producers: object[]; consumers: object[]; advanced_mode: boolean; notes: object[] } = {
      exchanges: [], queues: [], bindings: [], producers: [], consumers: [], advanced_mode: this.advancedMode,
      notes: this.notes.map(n => ({ text: n.text, x: Math.round(n.x), y: Math.round(n.y), color: n.color, width: Math.round(n.width), height: Math.round(n.height) })),
    };
    for (let i = 0; i < this.nodeCount; i++) {
      const n = this.nodes[i];
      if (!n) continue;
      switch (n.getType()) {
        case EXCHANGE: {
          const x = n as Exchange;
          out.exchanges.push({ name: x.getLabel(), type: x.getExchangeType(), x: x.x, y: x.y });
          for (const [rk, dests] of x.getAllBindings()) {
            for (const dest of dests) {
              out.bindings.push({ source: x.getLabel(), vhost: '/', destination: dest.getLabel(), destination_type: this.nodeTypeToString(dest.getType()), routing_key: rk, arguments: [] });
            }
          }
          break;
        }
        case QUEUE:
          out.queues.push({ name: n.getLabel(), x: n.x, y: n.y });
          break;
        case PRODUCER: {
          const p = n as Producer;
          const publish = p.outgoing.length > 0
            ? { to: p.outgoing[0].getLabel(), payload: p.msg?.payload ?? '', routing_key: p.msg?.routingKey ?? '' }
            : null;
          out.producers.push({ name: p.getLabel(), x: p.x, y: p.y, interval: p.intervalSeconds, publish });
          break;
        }
        case CONSUMER: {
          const c = n as Consumer;
          const consumes = c.outgoing.map(q => q.getLabel());
          out.consumers.push({ name: c.getLabel(), x: c.x, y: c.y, consume: consumes[0] ?? null, consumes });
          break;
        }
      }
    }
    return out;
  }

  importNodes(data: { exchanges: { name: string; type: string }[]; queues: { name: string }[]; bindings: { source: string; destination: string; destination_type: string; routing_key: string }[] }): number {
    const sections = 5;
    const impExchanges = new Map<string, BaseNode>();
    const impQueues = new Map<string, BaseNode>();

    data.exchanges.forEach((v, k) => {
      const x = (this.width / sections) * 2;
      const y = ((this.height - 50) / (data.exchanges.length + 1)) * (k + 1);
      const n = this.addNodeByType(EXCHANGE, v.name, x, y)!;
      (n as Exchange).setExchangeType(EXCHANGE_TYPE_FROM_NAME[v.type] ?? 0);
      impExchanges.set(v.name, n);
    });

    data.queues.forEach((v, k) => {
      const x = (this.width / sections) * 3;
      const y = ((this.height - 50) / (data.queues.length + 1)) * (k + 1);
      const n = this.addNodeByType(QUEUE, v.name, x, y)!;
      this.bindToAnonExchange(n as Queue);
      impQueues.set(v.name, n);
    });

    data.bindings.forEach(v => {
      const dest = v.destination_type === 'queue' ? impQueues.get(v.destination) : impExchanges.get(v.destination);
      const src = impExchanges.get(v.source);
      if (dest && src) {
        const edge = this.addConnection(dest, src);
        edge?.updateBindingKey(v.routing_key);
      }
    });

    return data.exchanges.length + data.queues.length + data.bindings.length;
  }

  clearNodes(): void {
    for (let i = 0; i < this.nodeCount; i++) {
      const n = this.nodes[i];
      if (n?.getType() === PRODUCER) (n as Producer).stopPublisher();
    }
    this.edges = [];
    for (let i = 0; i < this.nodeCount; i++) this.nodes[i] = null;
    this.nodeCount = 0;
    this.nodeTable.clear();
    this.anonExchange.incoming = [];
    this.anonExchange.outgoing = [];
    this.stage = new Stage();
    this.notes = [];
    this.selectedNote = null;
    this.tmpNote = null;
    this.resizingNote = null;
  }

  loadFlow(data: FlowData): void {
    this.clearNodes();
    // Resolve references per node type, not by bare name. A RabbitMQ/MassTransit
    // topology legitimately reuses a name across types (an endpoint exchange and
    // its queue share a name; a service is both producer and consumer), so a
    // single name-keyed map would collide and mis-wire (or crash) on reload.
    const exchanges = new Map<string, BaseNode>();
    const queues = new Map<string, BaseNode>();
    const producers = new Map<string, BaseNode>();
    const consumers = new Map<string, BaseNode>();

    for (const e of data.exchanges) {
      const n = this.addNodeByType(EXCHANGE, e.name, e.x, e.y)!;
      (n as Exchange).setExchangeType(e.type);
      exchanges.set(e.name, n);
    }
    for (const q of data.queues) {
      const n = this.addNodeByType(QUEUE, q.name, q.x, q.y)!;
      this.bindToAnonExchange(n as Queue);
      queues.set(q.name, n);
    }
    for (const p of data.producers) {
      producers.set(p.name, this.addNodeByType(PRODUCER, p.name, p.x, p.y)!);
    }
    for (const c of data.consumers) {
      consumers.set(c.name, this.addNodeByType(CONSUMER, c.name, c.x, c.y)!);
    }

    // Bindings: source is always an exchange; destination is an exchange or a
    // queue per destination_type. addConnection(dest, source) registers the
    // binding on the source exchange so it routes to dest.
    for (const b of data.bindings) {
      const source = exchanges.get(b.source);
      const dest = b.destination_type === 'queue'
        ? queues.get(b.destination)
        : exchanges.get(b.destination);
      if (source && dest) {
        const edge = this.addConnection(dest, source);
        edge?.updateBindingKey(b.routing_key);
      }
    }
    // Producer → Exchange (+ restore the saved message draft and interval).
    for (const p of data.producers) {
      const prod = producers.get(p.name) as Producer | undefined;
      if (!prod) continue;
      if (p.publish) {
        const exch = exchanges.get(p.publish.to);
        if (exch) this.addConnection(prod, exch);
        prod.setMessage(p.publish.payload, p.publish.routing_key);
      }
      prod.intervalSeconds = p.interval ?? 0;
    }
    // Consumer → Queue (supports a consumer bound to multiple queues)
    for (const c of data.consumers) {
      const cons = consumers.get(c.name);
      if (!cons) continue;
      const targets = c.consumes ?? (c.consume ? [c.consume] : []);
      for (const qName of targets) {
        const q = queues.get(qName);
        if (q) this.addConnection(cons, q);
      }
    }

    if (data.advanced_mode !== this.advancedMode) this.toggleAdvancedMode(data.advanced_mode);

    if (data.notes) {
      for (const n of data.notes) {
        this.notes.push(new StickyNote(n.x, n.y, n.text, n.color, n.width, n.height));
      }
    }
  }

  toggleNodeDisabled(n: BaseNode): void {
    n.disabled = !n.disabled;
    if (n.disabled && n.getType() === PRODUCER) (n as Producer).pausePublisher();
    if (!n.disabled) {
      // Re-enable: drain any queues that were waiting on this consumer
      for (let i = 0; i < this.nodeCount; i++) {
        const node = this.nodes[i];
        if (node && node.getType() === QUEUE) {
          (node as import('./nodes/Queue').Queue).maybeDeliverMessage();
        }
      }
    }
  }

  resetZoom(): void {
    this.camScale = 1;
    this.camX = 0;
    this.camY = 0;
  }

  // Auto-arrange nodes into tidy columns by data-flow stage
  // (producer → exchange → queue → consumer). Within each column, nodes are
  // ordered by the barycenter of their neighbors in the previous column to
  // reduce edge crossings, then spread evenly over the canvas height.
  autoLayout(): void {
    const nodes = this.getNodes().filter((n): n is BaseNode => n !== null);
    if (nodes.length === 0) return;

    const colX: Record<number, number> = {
      [PRODUCER]: 150, [EXCHANGE]: 400, [QUEUE]: 650, [CONSUMER]: 900,
    };
    // Start below any header notes that overlap the column band, so the first
    // row is not hidden behind legend cards pinned to the top.
    const colMinX = colX[PRODUCER] - 30;
    const colMaxX = colX[CONSUMER] + 30;
    let top = 110;
    for (const note of this.notes) {
      const noteRight = note.x + (note.width ?? 200);
      const noteBottom = note.y + (note.height ?? 100);
      if (note.y < 200 && noteRight > colMinX && note.x < colMaxX) {
        top = Math.max(top, noteBottom + 25);
      }
    }
    const bottom = Math.max(top + 80, this.height - 55);
    const byType = (t: number) => nodes.filter(n => n.getType() === t);

    const rowOf = new Map<BaseNode, number>();
    const place = (arr: BaseNode[]): void => {
      const gap = arr.length > 1 ? (bottom - top) / (arr.length - 1) : 0;
      arr.forEach((n, i) => {
        n.x = colX[n.getType()];
        n.y = arr.length > 1 ? top + i * gap : (top + bottom) / 2;
        rowOf.set(n, i);
      });
    };
    const barycenter = (neighbors: BaseNode[]): number => {
      const rows = neighbors.map(x => rowOf.get(x)).filter((v): v is number => v != null);
      return rows.length ? rows.reduce((s, v) => s + v, 0) / rows.length : Number.MAX_SAFE_INTEGER;
    };

    const producers = byType(PRODUCER).sort((a, b) => a.y - b.y);
    const exchanges = byType(EXCHANGE);
    const queues = byType(QUEUE);
    const consumers = byType(CONSUMER);

    // Data-flow adjacency: producer.outgoing=[exchange], queue.outgoing=[exchange],
    // consumer.outgoing=[queue]. Sort each column by its upstream neighbors' rows.
    place(producers);
    exchanges.sort((a, b) =>
      barycenter(producers.filter(p => p.outgoing.includes(a))) -
      barycenter(producers.filter(p => p.outgoing.includes(b))));
    place(exchanges);
    queues.sort((a, b) => barycenter(a.outgoing) - barycenter(b.outgoing));
    place(queues);
    consumers.sort((a, b) => barycenter(a.outgoing) - barycenter(b.outgoing));
    place(consumers);

    this.resetZoom();
  }

  snapshotFlow(): Omit<FlowData, 'id' | 'name' | 'updatedAt'> {
    return this.exportToPlayer() as Omit<FlowData, 'id' | 'name' | 'updatedAt'>;
  }

  private randomName(): string {
    return 'sim.gen-' + Math.random().toString(36).substring(2, 14);
  }
}
