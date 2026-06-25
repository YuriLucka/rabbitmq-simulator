import type { Simulator } from './Simulator';
import type { Message } from './Message';
import type { BaseNode } from './BaseNode';
import type { StickyNote } from './StickyNote';
import { FlowStore, type FlowData } from './FlowStore';
import { CONSUMER } from './types';

export class UI {
  private currentFlowId: string | null = null;
  private currentFlowName = 'My Flow';

  constructor(private sim: Simulator) {
    sim.ui = this;
    this.initForms();
    this.initFlows();
    this.initTabs();
  }

  private initForms(): void {
    // hide all forms initially
    this.hideAllForms();

    document.getElementById('edit_producer_form')?.addEventListener('submit', e => {
      e.preventDefault();
      const uuid = (document.getElementById('edit_producer_id') as HTMLInputElement).value;
      const name = (document.getElementById('edit_producer_name') as HTMLInputElement).value;
      this.sim.editProducer(uuid, name);
    });

    document.getElementById('producer_delete')?.addEventListener('click', () => {
      const uuid = (document.getElementById('edit_producer_id') as HTMLInputElement).value;
      this.sim.deleteNode(uuid);
      this.hideAllForms();
    });

    document.getElementById('edit_consumer_form')?.addEventListener('submit', e => {
      e.preventDefault();
      const uuid = (document.getElementById('edit_consumer_id') as HTMLInputElement).value;
      const name = (document.getElementById('edit_consumer_name') as HTMLInputElement).value;
      this.sim.editConsumer(uuid, name);
    });

    document.getElementById('consumer_delete')?.addEventListener('click', () => {
      const uuid = (document.getElementById('edit_consumer_id') as HTMLInputElement).value;
      this.sim.deleteNode(uuid);
      this.hideAllForms();
    });

    document.getElementById('new_message_form')?.addEventListener('submit', e => {
      e.preventDefault();
      const uuid = (document.getElementById('new_message_producer_id') as HTMLInputElement).value;
      const payload = (document.getElementById('new_message_producer_payload') as HTMLInputElement).value;
      const routingKey = (document.getElementById('new_message_producer_routing_key') as HTMLInputElement).value;
      const secondsRaw = parseInt((document.getElementById('new_message_producer_seconds') as HTMLInputElement).value, 10);
      const seconds = isNaN(secondsRaw) ? 0 : secondsRaw;

      if (seconds > 0) {
        this.sim.publishMsgWithInterval(seconds, uuid, payload, routingKey);
        this.enableButton('#new_message_stop');
      } else {
        this.disableButton('#new_message_stop');
      }
      this.sim.publishMessage(uuid, payload, routingKey);
    });

    document.getElementById('new_message_stop')?.addEventListener('click', () => {
      const uuid = (document.getElementById('new_message_producer_id') as HTMLInputElement).value;
      this.sim.stopPublisher(uuid);
      (document.getElementById('new_message_producer_seconds') as HTMLInputElement).value = '';
      this.disableButton('#new_message_stop');
    });

    document.getElementById('bindings_form')?.addEventListener('submit', e => {
      e.preventDefault();
      const idx = parseInt((document.getElementById('binding_id') as HTMLInputElement).value, 10);
      const bk = (document.getElementById('binding_key') as HTMLInputElement).value.trim();
      this.sim.updateBindingKey(idx, bk);
    });

    document.getElementById('binding_delete')?.addEventListener('click', () => {
      const idx = parseInt((document.getElementById('binding_id') as HTMLInputElement).value, 10);
      this.sim.removeBinding(idx);
      this.hideAllForms();
    });

    document.getElementById('queue_form')?.addEventListener('submit', e => {
      e.preventDefault();
      const oldName = (document.getElementById('queue_id') as HTMLInputElement).value;
      const name = (document.getElementById('queue_name') as HTMLInputElement).value.trim();
      this.sim.editQueue(oldName, name);
      (document.getElementById('queue_id') as HTMLInputElement).value = name;
    });

    document.getElementById('queue_delete')?.addEventListener('click', () => {
      const uuid = (document.getElementById('queue_id') as HTMLInputElement).value;
      this.sim.deleteNode(uuid);
      this.hideAllForms();
    });

    document.getElementById('exchange_form')?.addEventListener('submit', e => {
      e.preventDefault();
      const oldName = (document.getElementById('exchange_id') as HTMLInputElement).value;
      const name = (document.getElementById('exchange_name') as HTMLInputElement).value.trim();
      const type = parseInt((document.getElementById('exchange_type') as HTMLSelectElement).value, 10);
      this.sim.editExchange(oldName, name, type);
      (document.getElementById('exchange_id') as HTMLInputElement).value = name;
    });

    document.getElementById('exchange_delete')?.addEventListener('click', () => {
      const uuid = (document.getElementById('exchange_id') as HTMLInputElement).value;
      this.sim.deleteNode(uuid);
      this.hideAllForms();
    });

    // Note form
    document.getElementById('note_text')?.addEventListener('input', e => {
      if (!this.sim.selectedNote) return;
      this.sim.selectedNote.text = (e.target as HTMLTextAreaElement).value;
    });

    document.querySelectorAll('.note-color-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!this.sim.selectedNote) return;
        const color = (btn as HTMLElement).dataset.color!;
        this.sim.selectedNote.color = color;
        document.querySelectorAll('.note-color-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });

    document.getElementById('note_delete')?.addEventListener('click', () => {
      if (!this.sim.selectedNote) return;
      this.sim.removeNote(this.sim.selectedNote);
      this.hideAllForms();
    });

    document.getElementById('advanced_mode')?.addEventListener('click', () => {
      const btn = document.getElementById('advanced_mode')!;
      const isOn = btn.textContent === 'Advanced Mode';
      btn.textContent = isOn ? 'Basic Mode' : 'Advanced Mode';
      btn.classList.toggle('btn-warning', isOn);
      this.sim.toggleAdvancedMode(isOn);
    });
  }

  showProducerForm(id: string, name: string, hasInterval: boolean, msg: Message | null, intervalSeconds = 0): void {
    this.showForms('#edit_producer_form', '#new_message_form');

    (document.getElementById('edit_producer_id') as HTMLInputElement).value = id;
    (document.getElementById('edit_producer_name') as HTMLInputElement).value = name;
    this.enableForm('#edit_producer_form');

    (document.getElementById('new_message_producer_id') as HTMLInputElement).value = id;
    if (msg) {
      (document.getElementById('new_message_producer_payload') as HTMLInputElement).value = msg.payload;
      (document.getElementById('new_message_producer_routing_key') as HTMLInputElement).value = msg.routingKey;
    }
    if (intervalSeconds > 0) {
      (document.getElementById('new_message_producer_seconds') as HTMLInputElement).value = String(intervalSeconds);
    }
    this.enableForm('#new_message_form');
    if (hasInterval) this.enableButton('#new_message_stop');
    else this.disableButton('#new_message_stop');
  }

  showConsumerForm(id: string, name: string): void {
    this.showForms('#edit_consumer_form');
    (document.getElementById('edit_consumer_id') as HTMLInputElement).value = id;
    (document.getElementById('edit_consumer_name') as HTMLInputElement).value = name;
    this.enableForm('#edit_consumer_form');
  }

  showQueueForm(id: string, name: string): void {
    this.showForms('#queue_form');
    (document.getElementById('queue_id') as HTMLInputElement).value = id;
    (document.getElementById('queue_name') as HTMLInputElement).value = name;
    this.enableForm('#queue_form');
  }

  showExchangeForm(id: string, name: string, type: number): void {
    this.showForms('#exchange_form');
    (document.getElementById('exchange_id') as HTMLInputElement).value = id;
    (document.getElementById('exchange_name') as HTMLInputElement).value = name;
    (document.getElementById('exchange_type') as HTMLSelectElement).value = String(type);
    this.enableForm('#exchange_form');
  }

  showBindingForm(idx: number, key: string, isAnon: boolean): void {
    this.showForms('#bindings_form');
    (document.getElementById('binding_id') as HTMLInputElement).value = String(idx);
    (document.getElementById('binding_key') as HTMLInputElement).value = key;
    if (isAnon) this.disableForm('#bindings_form');
    else this.enableForm('#bindings_form');
  }

  showMessage(consumerId: string, payload: string): void {
    const log = document.getElementById('msg-log')!;
    const pre = document.createElement('pre');
    pre.innerHTML = `<span class="consumer-label">${consumerId}</span> <span style="color:#475569">←</span> <span class="msg-payload">${payload}</span>`;
    log.appendChild(pre);
    log.scrollTop = log.scrollHeight;
  }

  private initTabs(): void {
    const tabProps = document.getElementById('tab-properties')!;
    const tabFlows = document.getElementById('tab-flows')!;
    const panelProps = document.getElementById('panel-properties')!;
    const panelFlows = document.getElementById('panel-flows')!;

    tabProps.addEventListener('click', () => {
      tabProps.classList.add('active'); tabFlows.classList.remove('active');
      panelProps.classList.remove('hidden'); panelFlows.classList.remove('active');
    });
    tabFlows.addEventListener('click', () => {
      tabFlows.classList.add('active'); tabProps.classList.remove('active');
      panelFlows.classList.add('active'); panelProps.classList.add('hidden');
      this.renderFlowsList();
    });
  }

  private initFlows(): void {
    // Navbar buttons
    document.getElementById('btn-new-flow')?.addEventListener('click', () => this.newFlow());
    document.getElementById('btn-save-flow')?.addEventListener('click', () => this.saveFlow());
    document.getElementById('btn-export-flow')?.addEventListener('click', () => this.exportFlow());
    document.getElementById('import-file')?.addEventListener('change', (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) this.importFlow(file);
      (e.target as HTMLInputElement).value = '';
    });

    // Flows panel buttons
    document.getElementById('btn-save-flow-panel')?.addEventListener('click', () => this.saveFlow());
    document.getElementById('btn-new-flow-panel')?.addEventListener('click', () => this.newFlow());

    // Restore last active flow
    const lastId = FlowStore.current();
    if (lastId) {
      const flow = FlowStore.get(lastId);
      if (flow) {
        this.currentFlowId = flow.id;
        this.currentFlowName = flow.name;
        this.sim.loadFlow(flow);
        this.updateFlowNameInput();
      }
    }
  }

  private saveFlow(): void {
    const nameInput = document.getElementById('flow-name-input') as HTMLInputElement;
    const name = nameInput?.value.trim() || this.currentFlowName || 'My Flow';
    this.currentFlowName = name;

    if (!this.currentFlowId) this.currentFlowId = FlowStore.makeId();

    const flow: FlowData = {
      id: this.currentFlowId,
      name,
      updatedAt: Date.now(),
      ...this.sim.snapshotFlow(),
    };
    FlowStore.upsert(flow);
    FlowStore.setCurrent(this.currentFlowId);
    this.renderFlowsList();
    this.flashSave();
    this.toast(`"${name}" saved`, 'success');
  }

  private newFlow(): void {
    this.currentFlowId = null;
    this.currentFlowName = 'New Flow';
    this.sim.clearNodes();
    this.updateFlowNameInput();
    this.hideAllForms();
  }

  private exportFlow(): void {
    const data = { name: this.currentFlowName, ...this.sim.snapshotFlow() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.currentFlowName.replace(/\s+/g, '-').toLowerCase() || 'flow'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  private importFlow(file: File): void {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const raw = JSON.parse(e.target!.result as string);
        const name = raw.name ?? file.name.replace(/\.json$/, '');
        const id = FlowStore.makeId();
        const flow: FlowData = { id, name, updatedAt: Date.now(), ...raw };
        FlowStore.upsert(flow);
        this.currentFlowId = id;
        this.currentFlowName = name;
        FlowStore.setCurrent(id);
        this.sim.loadFlow(flow);
        this.updateFlowNameInput();
        this.renderFlowsList();
        this.hideAllForms();
      } catch {
        this.toast('Failed to import: invalid JSON file.', 'error');
      }
    };
    reader.readAsText(file);
  }

  private loadFlowById(id: string): void {
    const flow = FlowStore.get(id);
    if (!flow) return;
    this.currentFlowId = flow.id;
    this.currentFlowName = flow.name;
    FlowStore.setCurrent(id);
    this.sim.loadFlow(flow);
    this.updateFlowNameInput();
    this.hideAllForms();
  }

  private deleteFlow(id: string): void {
    FlowStore.remove(id);
    if (this.currentFlowId === id) {
      this.currentFlowId = null;
      this.currentFlowName = 'My Flow';
      this.sim.clearNodes();
      this.updateFlowNameInput();
    }
    this.renderFlowsList();
  }

  private renderFlowsList(): void {
    const container = document.getElementById('flows-list')!;
    const flows = FlowStore.all();
    if (flows.length === 0) {
      container.innerHTML = '<div class="flows-empty">No saved flows yet.<br>Click Save to save the current flow.</div>';
      return;
    }
    container.innerHTML = flows
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .map(f => `
        <div class="flow-item${f.id === this.currentFlowId ? ' current' : ''}" data-id="${f.id}">
          <span class="flow-item-name" title="${this.esc(f.name)}">${this.esc(f.name)}</span>
          <span class="flow-item-date">${this.relTime(f.updatedAt)}</span>
          <button class="flow-item-del" data-del="${f.id}" title="Delete">×</button>
        </div>
      `).join('');

    container.querySelectorAll('.flow-item').forEach(el => {
      el.addEventListener('click', (e) => {
        if ((e.target as HTMLElement).dataset.del) return;
        this.loadFlowById((el as HTMLElement).dataset.id!);
        this.renderFlowsList();
      });
    });
    container.querySelectorAll('[data-del]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const name = FlowStore.get((btn as HTMLElement).dataset.del!)?.name ?? 'this flow';
        const ok = await this.confirm('Delete flow', `"${name}" will be permanently deleted.`);
        if (ok) this.deleteFlow((btn as HTMLElement).dataset.del!);
      });
    });
  }

  private updateFlowNameInput(): void {
    const input = document.getElementById('flow-name-input') as HTMLInputElement;
    if (input) input.value = this.currentFlowName;
  }

  private flashSave(): void {
    const btn = document.getElementById('btn-save-flow');
    if (!btn) return;
    btn.textContent = '✓ Saved';
    btn.classList.add('active');
    setTimeout(() => { btn.textContent = '⭳ Save'; btn.classList.remove('active'); }, 1500);
  }

  showNodePopover(node: BaseNode, screenX: number, screenY: number): void {
    const pop = document.getElementById('node-popover')!;
    pop.classList.remove('visible'); // reset before re-showing

    // Close when clicking outside the popover
    const outsideHandler = (e: MouseEvent) => {
      if (!pop.contains(e.target as Node)) {
        pop.classList.remove('visible');
        document.removeEventListener('mousedown', outsideHandler, true);
      }
    };
    document.addEventListener('mousedown', outsideHandler, true);

    const toggleBtn = document.getElementById('popover-toggle')!;
    const deleteBtn = document.getElementById('popover-delete')!;

    const isConsumer = node.getType() === CONSUMER;
    toggleBtn.style.display = isConsumer ? '' : 'none';

    if (isConsumer) {
      toggleBtn.textContent = node.disabled ? 'Enable' : 'Disable';
      toggleBtn.className = node.disabled ? 'popover-btn warn' : 'popover-btn';
    }

    // Clone to remove old listeners
    const newToggle = toggleBtn.cloneNode(true) as HTMLElement;
    const newDelete = deleteBtn.cloneNode(true) as HTMLElement;
    toggleBtn.replaceWith(newToggle);
    deleteBtn.replaceWith(newDelete);

    if (isConsumer) {
      newToggle.addEventListener('click', () => {
        this.sim.toggleNodeDisabled(node);
        newToggle.textContent = node.disabled ? 'Enable' : 'Disable';
        newToggle.className = node.disabled ? 'popover-btn warn' : 'popover-btn';
      });
    }
    newDelete.addEventListener('click', () => {
      this.hideNodePopover();
      node.remove();
      this.hideAllForms();
    });

    pop.style.left = screenX + 'px';
    pop.style.top = (screenY - 14) + 'px';
    pop.classList.add('visible');
  }

  hideNodePopover(): void {
    document.getElementById('node-popover')?.classList.remove('visible');
  }

  updateSelectionBar(count: number, nodes: BaseNode[]): void {
    const bar = document.getElementById('selection-bar')!;
    if (count < 2) { bar.classList.remove('visible'); return; }
    document.getElementById('selection-count')!.textContent = `${count} selecionados`;
    bar.classList.add('visible');

    const enableBtn = document.getElementById('sel-enable')!;
    const disableBtn = document.getElementById('sel-disable')!;
    const deleteBtn = document.getElementById('sel-delete')!;

    // Re-wire buttons each time selection changes (clone to remove old listeners)
    const en = enableBtn.cloneNode(true) as HTMLElement;
    const dis = disableBtn.cloneNode(true) as HTMLElement;
    const del = deleteBtn.cloneNode(true) as HTMLElement;
    enableBtn.replaceWith(en); disableBtn.replaceWith(dis); deleteBtn.replaceWith(del);

    en.addEventListener('click', () => {
      for (const n of nodes) if (n.getType() === CONSUMER) n.disabled = false;
      this.sim.selectedNodes.clear();
      bar.classList.remove('visible');
    });
    dis.addEventListener('click', () => {
      for (const n of nodes) if (n.getType() === CONSUMER) n.disabled = true;
      this.sim.selectedNodes.clear();
      bar.classList.remove('visible');
    });
    del.addEventListener('click', async () => {
      if (!await this.confirm('Delete selection', `Delete ${count} nodes?`)) return;
      for (const n of nodes) n.remove();
      this.sim.selectedNodes.clear();
      bar.classList.remove('visible');
    });
  }

  private confirm(title: string, body: string): Promise<boolean> {
    return new Promise(resolve => {
      const overlay = document.getElementById('sim-overlay')!;
      document.getElementById('modal-title')!.textContent = title;
      document.getElementById('modal-body')!.textContent = body;
      overlay.classList.add('open');

      const close = (result: boolean) => {
        overlay.classList.remove('open');
        confirmBtn.replaceWith(confirmBtn.cloneNode(true));
        cancelBtn.replaceWith(cancelBtn.cloneNode(true));
        resolve(result);
      };

      const confirmBtn = document.getElementById('modal-confirm')!;
      const cancelBtn = document.getElementById('modal-cancel')!;
      confirmBtn.addEventListener('click', () => close(true), { once: true });
      cancelBtn.addEventListener('click', () => close(false), { once: true });
      overlay.addEventListener('click', (e) => { if (e.target === overlay) close(false); }, { once: true });
    });
  }

  private toast(message: string, type: 'success' | 'error' = 'success'): void {
    const container = document.getElementById('toast-container')!;
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `<span class="toast-dot"></span><span>${this.esc(message)}</span>`;
    container.appendChild(el);
    setTimeout(() => {
      el.classList.add('fade');
      el.addEventListener('animationend', () => el.remove());
    }, 3000);
  }

  private esc(s: string): string {
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  private relTime(ts: number): string {
    const diff = (Date.now() - ts) / 1000;
    if (diff < 60) return 'now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return new Date(ts).toLocaleDateString();
  }

  showNoteForm(note: StickyNote): void {
    this.showForms('#note_form');
    (document.getElementById('note_text') as HTMLTextAreaElement).value = note.text;
    document.querySelectorAll('.note-color-btn').forEach(btn => {
      (btn as HTMLElement).classList.toggle('active', (btn as HTMLElement).dataset.color === note.color);
    });
  }

  hideNoteForm(): void {
    if ((document.getElementById('note_form') as HTMLElement)?.style.display !== 'none') {
      this.hideAllForms();
    }
  }

  private hideAllForms(): void {
    document.getElementById('inspector-msg')!.style.display = '';
    for (const id of ['edit_producer_form', 'edit_consumer_form', 'new_message_form', 'bindings_form', 'queue_form', 'exchange_form', 'note_form']) {
      const el = document.getElementById(id) as HTMLFormElement;
      el.style.display = 'none';
    }
  }

  private showForms(...ids: string[]): void {
    document.getElementById('inspector-msg')!.style.display = 'none';
    for (const id of ['edit_producer_form', 'edit_consumer_form', 'new_message_form', 'bindings_form', 'queue_form', 'exchange_form', 'note_form']) {
      const el = document.getElementById(id) as HTMLFormElement;
      el.style.display = ids.includes('#' + id) ? 'block' : 'none';
    }
  }

  private enableForm(selector: string): void {
    const form = document.querySelector(selector);
    form?.querySelectorAll('input,button,select').forEach(el => (el as HTMLElement & { disabled: boolean }).disabled = false);
  }

  private disableForm(selector: string): void {
    const form = document.querySelector(selector);
    form?.querySelectorAll('input,button,select').forEach(el => (el as HTMLElement & { disabled: boolean }).disabled = true);
  }

  private enableButton(selector: string): void {
    const btn = document.querySelector(selector) as HTMLButtonElement;
    if (btn) { btn.disabled = false; btn.classList.remove('disabled'); }
  }

  private disableButton(selector: string): void {
    const btn = document.querySelector(selector) as HTMLButtonElement;
    if (btn) { btn.disabled = true; btn.classList.add('disabled'); }
  }
}
