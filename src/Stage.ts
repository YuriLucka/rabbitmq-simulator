import { Transfer } from './Transfer';

export class Stage {
  private transfers: Transfer[] = [];

  addTransfer(t: Transfer): void {
    this.transfers.push(t);
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (let i = this.transfers.length - 1; i >= 0; i--) {
      const t = this.transfers[i];
      t.update();
      t.draw(ctx);
      t.afterDraw();
      if (t.isFinished()) this.transfers.splice(i, 1);
    }
  }
}
