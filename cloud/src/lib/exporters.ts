// Browser-only exporters. Call from event handlers.

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function slug(s: string) {
  return (s || "conteudo")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50) || "conteudo";
}

export function downloadTxt(text: string, title: string) {
  downloadBlob(new Blob(["\uFEFF" + text], { type: "text/plain;charset=utf-8" }), `${slug(title)}.txt`);
}

const W = 1080;
const H = 1350;
const SAFE = 96;

function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number) {
  const lines: string[] = [];
  for (const para of text.split("\n")) {
    const words = para.split(/\s+/).filter(Boolean);
    let line = "";
    for (const w of words) {
      const test = line ? line + " " + w : w;
      if (ctx.measureText(test).width > maxW && line) {
        lines.push(line);
        line = w;
      } else line = test;
    }
    lines.push(line);
  }
  return lines;
}

export async function renderSlidePNG(text: string, index: number, total: number, handle: string): Promise<Blob> {
  await document.fonts?.ready;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d")!;
  const cover = index === 0;
  ctx.fillStyle = cover ? "#2b2a33" : "#f7f4ee";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#b9a3dc";
  ctx.fillRect(SAFE, SAFE, 80, 8);

  ctx.fillStyle = cover ? "#f7f4ee" : "#2b2a33";
  ctx.textBaseline = "top";
  const maxW = W - SAFE * 2;
  let size = cover ? 86 : 64;
  let lines: string[] = [];
  const fontFamily = cover ? "Fraunces, Georgia, serif" : "Manrope, system-ui, sans-serif";
  for (; size >= 34; size -= 4) {
    ctx.font = `${cover ? 500 : 600} ${size}px ${fontFamily}`;
    lines = wrap(ctx, text, maxW);
    if (lines.length * size * 1.25 <= H - SAFE * 2 - 220) break;
  }
  const lh = size * 1.25;
  const blockH = lines.length * lh;
  let y = Math.max(SAFE + 80, (H - blockH) / 2 - 40);
  for (const l of lines) {
    ctx.fillText(l, SAFE, y);
    y += lh;
  }

  ctx.font = `600 30px Manrope, system-ui, sans-serif`;
  ctx.fillStyle = cover ? "#d8cbee" : "#6b6875";
  ctx.textBaseline = "alphabetic";
  if (handle) ctx.fillText(handle.startsWith("@") ? handle : "@" + handle, SAFE, H - SAFE);
  const num = `${index + 1}/${total}`;
  ctx.fillText(num, W - SAFE - ctx.measureText(num).width, H - SAFE);

  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("Falha ao gerar PNG"))), "image/png"));
}

export async function downloadCarousel(slides: string[], handle: string, title: string) {
  for (let i = 0; i < slides.length; i++) {
    const blob = await renderSlidePNG(slides[i] ?? "", i, slides.length, handle);
    downloadBlob(blob, `${slug(title)}-slide-${String(i + 1).padStart(2, "0")}.png`);
    await new Promise((r) => setTimeout(r, 250));
  }
}
