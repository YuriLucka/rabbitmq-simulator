class TNode<Value> {
  val: Value[] | null = null;
  next = new Map<string, TNode<Value>>();
  nodeKey = '';
  length = 0;

  setLength(len: number) {
    if (len > this.length) this.length = len;
  }

  setNodeKey(words: string[]) {
    this.nodeKey = words.join('.');
  }
}

export class TrieST<Value> {
  private root: TNode<Value> | null = null;
  private _size = 0;
  private _itemCount = 0;

  getValue(aKey: string): Value[] | null {
    const words = aKey === '' ? [''] : aKey.split('.');
    const x = this.getTNode(this.root, words, 0);
    return x?.val ?? null;
  }

  private getTNode(x: TNode<Value> | null, words: string[], d: number): TNode<Value> | null {
    if (!x) return null;
    if (d === words.length) return x;
    return this.getTNode(x.next.get(words[d]) ?? null, words, d + 1);
  }

  private getParentNode(x: TNode<Value>): TNode<Value> | null {
    const keys = x.nodeKey.split('.');
    const parentKey = keys.slice(0, keys.length - 1);
    return this.getTNode(this.root, parentKey, 0);
  }

  put(bindingKey: string, val: Value): void {
    const words = bindingKey === '' ? [''] : bindingKey.split('.');
    this.root = this._put(this.root, words, val, 0);
  }

  private _put(x: TNode<Value> | null, words: string[], val: Value, d: number): TNode<Value> {
    if (!x) x = new TNode<Value>();
    x.setLength(words.length - d);
    x.setNodeKey(words.slice(0, d));

    if (d === words.length) {
      if (!x.val) {
        x.val = [];
        this._size++;
      }
      if (!x.val.includes(val)) {
        x.val.push(val);
        this._itemCount++;
      }
      return x;
    }

    const word = words[d];
    x.next.set(word, this._put(x.next.get(word) ?? null, words, val, d + 1));
    return x;
  }

  size(): number { return this._size; }
  itemCount(): number { return this._itemCount; }

  allValues(): Map<string, Value[]> {
    const acc = new Map<string, Value[]>();
    this.allChildValues(this.root, acc);
    return acc;
  }

  private allChildValues(x: TNode<Value> | null, acc: Map<string, Value[]>): void {
    if (!x) return;
    if (x.val) acc.set(x.nodeKey, x.val);
    for (const child of x.next.values()) this.allChildValues(child, acc);
  }

  valuesForRoutingKey(rkey: string): Map<string, Value[]> {
    const acc = new Map<string, Value[]>();
    const pattern = rkey === '' ? [''] : rkey.split('.');
    this.collectWithRoutingKey(this.root, pattern, pattern.length, acc);
    return acc;
  }

  private collectWithRoutingKey(
    x: TNode<Value> | null,
    pat: string[],
    remainPattern: number,
    acc: Map<string, Value[]>,
  ): void {
    if (!x) return;
    const word = pat[pat.length - remainPattern];
    if (remainPattern === 0) {
      if (x.val) acc.set(x.nodeKey, x.val);
      this.collectWithRoutingKeyHash(x.next.get('#') ?? null, pat, remainPattern, acc);
    } else {
      this.collectWithRoutingKey(x.next.get(word) ?? null, pat, remainPattern - 1, acc);
      this.collectWithRoutingKey(x.next.get('*') ?? null, pat, remainPattern - 1, acc);
      this.collectWithRoutingKeyHash(x.next.get('#') ?? null, pat, remainPattern, acc);
    }
  }

  private collectWithRoutingKeyHash(
    x: TNode<Value> | null,
    pat: string[],
    _remainPattern: number,
    acc: Map<string, Value[]>,
  ): void {
    for (let i = 0; i <= pat.length; i++) {
      this.collectWithRoutingKey(x, pat, i, acc);
    }
  }

  delete(aKey: string, val: Value): void {
    const words = aKey === '' ? [''] : aKey.split('.');
    this.root = this._delete(this.root, words, val, 0);
  }

  private _delete(
    x: TNode<Value> | null,
    words: string[],
    val: Value,
    d: number,
  ): TNode<Value> | null {
    if (!x) return null;
    if (d === words.length) {
      if (x.val) {
        const idx = x.val.indexOf(val);
        if (idx >= 0) { x.val.splice(idx, 1); this._itemCount--; }
        if (x.val.length === 0) x.val = null;
      }
    } else {
      const word = words[d];
      const child = this._delete(x.next.get(word) ?? null, words, val, d + 1);
      if (child) x.next.set(word, child);
      else x.next.delete(word);
    }

    if (x.val) return x;
    for (const child of x.next.values()) if (child) return x;
    return null;
  }
}
