// Shared client helpers for rendering templates to HTML and to PDF

export interface TemplateField {
  key: string;
  label: string;
  type: "text" | "textarea" | "number" | "date" | "select" | "table";
  required?: boolean;
  placeholder?: string;
  options?: string[];
  columns?: { key: string; label: string; type?: "text" | "number" }[];
}

const escapeHtml = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

function formatValue(v: any, field?: TemplateField): string {
  if (v === null || v === undefined || v === "") return "";
  if (field?.type === "table" && Array.isArray(v)) {
    const cols = field.columns ?? [];
    const head = cols
      .map(
        (c) =>
          `<th style="border:1px solid #d1d5db;padding:6px 8px;background:#f3f4f6;text-align:left">${escapeHtml(
            c.label,
          )}</th>`,
      )
      .join("");
    const rows = v
      .map((row: any) => {
        const tds = cols
          .map((c) => {
            const cellRaw = row?.[c.key];
            const cell =
              c.type === "number" && cellRaw !== "" && cellRaw != null
                ? Number(cellRaw).toLocaleString("th-TH", {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 2,
                  })
                : (cellRaw ?? "");
            return `<td style="border:1px solid #d1d5db;padding:6px 8px;${c.type === "number" ? "text-align:right" : ""}">${escapeHtml(
              String(cell),
            )}</td>`;
          })
          .join("");
        return `<tr>${tds}</tr>`;
      })
      .join("");
    return `<table style="width:100%;border-collapse:collapse;margin:8px 0;font-size:13px"><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table>`;
  }
  if (field?.type === "date" && typeof v === "string") {
    try {
      const d = new Date(v);
      return d.toLocaleDateString("th-TH", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return escapeHtml(String(v));
    }
  }
  if (field?.type === "number") {
    const n = Number(v);
    if (!Number.isNaN(n)) return n.toLocaleString("th-TH");
  }
  if (field?.type === "textarea") {
    return escapeHtml(String(v)).replace(/\n/g, "<br>");
  }
  return escapeHtml(String(v));
}

export function renderTemplate(
  bodyHtml: string,
  fields: TemplateField[],
  values: Record<string, any>,
): string {
  let out = bodyHtml || "";
  const fieldMap = new Map(fields.map((f) => [f.key, f]));
  // Replace {{key}} tokens
  out = out.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) => {
    const f = fieldMap.get(key);
    return formatValue(values[key], f);
  });
  return out;
}

export function defaultBodyHtml(fields: TemplateField[]): string {
  const rows = fields
    .map(
      (f) => `<tr>
  <td style="padding:6px 8px;background:#f9fafb;font-weight:600;width:30%;border:1px solid #e5e7eb">${escapeHtml(
    f.label,
  )}</td>
  <td style="padding:6px 8px;border:1px solid #e5e7eb">{{${f.key}}}</td>
</tr>`,
    )
    .join("\n");
  return `<h1 style="font-size:20px;margin:0 0 12px">เอกสาร</h1>
<table style="width:100%;border-collapse:collapse;font-size:13px">
<tbody>
${rows}
</tbody>
</table>`;
}

export async function htmlToPdfBlob(
  html: string,
  paperSize: "A4" | "A5" | "Letter" = "A4",
  orientation: "portrait" | "landscape" = "portrait",
): Promise<Blob> {
  const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
    import("jspdf"),
    import("html2canvas"),
  ]);
  // PDF dimensions in mm
  const sizes: Record<string, [number, number]> = {
    A4: [210, 297],
    A5: [148, 210],
    Letter: [216, 279],
  };
  const [w, h] = sizes[paperSize] ?? sizes.A4;
  const pageW = orientation === "landscape" ? h : w;
  const pageH = orientation === "landscape" ? w : h;

  // Build offscreen container
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-10000px";
  container.style.top = "0";
  // Width in px @ 96dpi: mm * 96/25.4
  const widthPx = Math.round((pageW - 20) * (96 / 25.4)); // 10mm margin each side
  container.style.width = `${widthPx}px`;
  container.style.padding = "24px";
  container.style.background = "white";
  container.style.color = "black";
  container.style.fontFamily =
    "'Sarabun', 'Noto Sans Thai', system-ui, -apple-system, sans-serif";
  container.style.fontSize = "13px";
  container.style.lineHeight = "1.5";
  container.innerHTML = html;
  document.body.appendChild(container);
  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
    });
    const imgData = canvas.toDataURL("image/jpeg", 0.92);
    const pdf = new jsPDF({
      unit: "mm",
      format: paperSize.toLowerCase() as any,
      orientation,
    });
    const imgW = pageW - 20;
    const imgH = (canvas.height * imgW) / canvas.width;
    let heightLeft = imgH;
    let position = 10;
    pdf.addImage(imgData, "JPEG", 10, position, imgW, imgH);
    heightLeft -= pageH - 20;
    while (heightLeft > 0) {
      position = heightLeft - imgH + 10;
      pdf.addPage();
      pdf.addImage(imgData, "JPEG", 10, position, imgW, imgH);
      heightLeft -= pageH - 20;
    }
    return pdf.output("blob");
  } finally {
    container.remove();
  }
}
