export interface NoteData {
  text: string;
  x: number;
  y: number;
  color: string;
  width?: number;
  height?: number;
}

export interface FlowData {
  id: string;
  name: string;
  updatedAt: number;
  exchanges: { name: string; type: number; x: number; y: number }[];
  queues: { name: string; x: number; y: number }[];
  producers: { name: string; x: number; y: number; interval: number; publish: { to: string; payload: string; routing_key: string } | null }[];
  consumers: { name: string; x: number; y: number; consume: string | null }[];
  bindings: { source: string; vhost: string; destination: string; destination_type: string; routing_key: string; arguments: unknown[] }[];
  advanced_mode: boolean;
  notes?: NoteData[];
}

const FLOWS_KEY = 'rabbitmq-sim-flows';
const CURRENT_KEY = 'rabbitmq-sim-current';

export class FlowStore {
  static all(): FlowData[] {
    try { return JSON.parse(localStorage.getItem(FLOWS_KEY) ?? '[]'); }
    catch { return []; }
  }

  static get(id: string): FlowData | undefined {
    return this.all().find(f => f.id === id);
  }

  static upsert(flow: FlowData): void {
    const flows = this.all();
    const i = flows.findIndex(f => f.id === flow.id);
    if (i >= 0) flows[i] = flow; else flows.push(flow);
    localStorage.setItem(FLOWS_KEY, JSON.stringify(flows));
  }

  static remove(id: string): void {
    const remaining = this.all().filter(f => f.id !== id);
    localStorage.setItem(FLOWS_KEY, JSON.stringify(remaining));
    if (this.current() === id) this.setCurrent(remaining[0]?.id ?? null);
  }

  static current(): string | null { return localStorage.getItem(CURRENT_KEY); }

  static setCurrent(id: string | null): void {
    if (id) localStorage.setItem(CURRENT_KEY, id);
    else localStorage.removeItem(CURRENT_KEY);
  }

  static makeId(): string {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }
}
