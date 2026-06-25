export const NOTE_COLORS = ['#fef3c7', '#dbeafe', '#dcfce7', '#fce7f3', '#f3e8ff'];

export const NOTE_W = 190;
export const NOTE_H = 120;
const RESIZE_HANDLE = 16;

export class StickyNote {
  constructor(
    public x: number,
    public y: number,
    public text: string = '',
    public color: string = '#fef3c7',
    public width: number = NOTE_W,
    public height: number = NOTE_H,
  ) {}

  isBelowMouse(mx: number, my: number): boolean {
    return mx >= this.x && mx <= this.x + this.width &&
           my >= this.y && my <= this.y + this.height;
  }

  isOnResizeHandle(mx: number, my: number): boolean {
    return mx >= this.x + this.width - RESIZE_HANDLE &&
           mx <= this.x + this.width &&
           my >= this.y + this.height - RESIZE_HANDLE &&
           my <= this.y + this.height;
  }

  draw(ctx: CanvasRenderingContext2D, selected = false): void {
    // Body + shadow
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.35)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 4;
    ctx.beginPath();
    ctx.roundRect(this.x, this.y, this.width, this.height, 3);
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.restore();

    // Dog-ear fold (top-right)
    const fold = 18;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(this.x + this.width - fold, this.y);
    ctx.lineTo(this.x + this.width, this.y + fold);
    ctx.lineTo(this.x + this.width - fold, this.y + fold);
    ctx.closePath();
    ctx.fillStyle = 'rgba(0,0,0,0.14)';
    ctx.fill();
    ctx.restore();

    // Selection ring
    if (selected) {
      ctx.save();
      ctx.strokeStyle = '#f97316';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 3]);
      ctx.beginPath();
      ctx.roundRect(this.x - 3, this.y - 3, this.width + 6, this.height + 6, 5);
      ctx.stroke();
      ctx.restore();
    }

    // Resize handle (bottom-right grip)
    ctx.save();
    ctx.strokeStyle = 'rgba(0,0,0,0.28)';
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    const hx = this.x + this.width - 4;
    const hy = this.y + this.height - 4;
    for (let i = 0; i < 3; i++) {
      const d = 4 + i * 4;
      ctx.beginPath();
      ctx.moveTo(hx - d + 2, hy);
      ctx.lineTo(hx, hy - d + 2);
      ctx.stroke();
    }
    ctx.restore();

    // Text content — clip strictly to note bounds
    ctx.save();
    ctx.beginPath();
    ctx.rect(this.x + 4, this.y + 4, this.width - 8, this.height - 8);
    ctx.clip();
    const textMaxY = this.y + this.height - 14;
    ctx.textAlign = 'left';
    if (this.text) {
      ctx.fillStyle = '#1e293b';
      ctx.font = '12px Inter, system-ui, sans-serif';
      ctx.textBaseline = 'top';
      wrapText(ctx, this.text, this.x + 12, this.y + 14, this.width - 28, 16, textMaxY);
    } else {
      ctx.fillStyle = 'rgba(30,41,59,0.38)';
      ctx.font = 'italic 11px Inter, system-ui, sans-serif';
      ctx.textBaseline = 'top';
      ctx.fillText('Duplo clique para criar · clique para editar', this.x + 10, this.y + 16);
    }
    ctx.restore();
  }
}

function buildLines(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const lines: string[] = [];
  for (const rawLine of text.split('\n')) {
    const words = rawLine.split(' ');
    let line = '';
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > maxW && line) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
    }
    lines.push(line);
  }
  return lines;
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number, startY: number,
  maxW: number, lineH: number,
  maxY: number,
): void {
  const allLines = buildLines(ctx, text, maxW);
  let y = startY;

  for (let i = 0; i < allLines.length; i++) {
    if (y > maxY) break;

    const hasMore = i < allLines.length - 1;
    const nextY = y + lineH;

    if (hasMore && nextY > maxY) {
      // Last visible line — truncate with ellipsis
      let line = allLines[i];
      while (line.length > 0 && ctx.measureText(line + '…').width > maxW) {
        line = line.slice(0, -1);
      }
      ctx.fillText(line + '…', x, y);
      break;
    }

    ctx.fillText(allLines[i], x, y);
    y += lineH;
  }
}
