// Pre-built document templates for construction / project management.
// Each preset provides ready-to-use fields and an A4 HTML layout with {{key}} tokens.

import type { TemplateField } from "./template-render";

export interface DefaultTemplate {
  code: string;
  name: string;
  category: string; // human-readable category label
  category_code: string; // logical group: pre_project | execution | quality | safety | closeout | finance
  type: string; // e.g. "quotation"
  description: string;
  icon: string; // lucide-react icon name
  paper_size: "A4" | "A5" | "Letter";
  orientation: "portrait" | "landscape";
  requires_approval: boolean;
  fields: TemplateField[];
  body_html: string;
}

// ---- Shared HTML helpers ---------------------------------------------------

const baseCss = `
<style>
  .doc { font-family: 'Sarabun','Noto Sans Thai',system-ui,-apple-system,sans-serif; color:#0f172a; font-size:14px; line-height:1.65; padding:8px 4px; }
  .doc h1 { font-size:26px; margin:0; font-weight:700; letter-spacing:.3px; color:#0f172a; }
  .doc h2 { font-size:15px; margin:22px 0 10px; font-weight:700; color:#0f172a; text-transform:uppercase; letter-spacing:1.2px; padding:6px 0 6px 10px; border-left:3px solid #1e3a8a; background:linear-gradient(90deg,#f1f5f9 0%,transparent 100%); }
  .doc table { width:100%; border-collapse:collapse; }
  .doc table.items { font-size:13px; margin-top:6px; }
  .doc table.items th, .doc table.items td { border:1px solid #cbd5e1; padding:8px 10px; }
  .doc table.items th { background:#1e3a8a; color:#ffffff; font-weight:600; text-align:left; font-size:12.5px; letter-spacing:.3px; }
  .doc table.items tbody tr:nth-child(even) td { background:#f8fafc; }
  .doc table.info { font-size:13.5px; }
  .doc table.info td { padding:5px 8px; vertical-align:top; }
  .doc table.info td.lbl { color:#475569; width:140px; font-weight:500; }
  .doc .head { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:3px double #1e3a8a; padding-bottom:14px; margin-bottom:18px; }
  .doc .brand { font-weight:700; font-size:17px; color:#0f172a; line-height:1.4; }
  .doc .brand .sub { display:block; font-weight:400; color:#64748b; font-size:12px; margin-top:4px; max-width:340px; }
  .doc .brand .logo-mark { display:inline-block; width:36px; height:36px; background:#1e3a8a; color:#fff; border-radius:8px; text-align:center; line-height:36px; font-size:18px; font-weight:700; margin-right:10px; vertical-align:middle; }
  .doc .docmeta { text-align:right; font-size:12.5px; color:#374151; line-height:1.7; }
  .doc .docmeta .title { font-size:22px; font-weight:700; color:#1e3a8a; letter-spacing:.5px; margin-bottom:4px; }
  .doc .docmeta .doc-no { font-size:13px; color:#0f172a; }
  .doc .sign-grid { display:grid; grid-template-columns:1fr 1fr; gap:32px; margin-top:42px; }
  .doc .sign { border-top:1.5px solid #0f172a; padding-top:8px; text-align:center; font-size:12.5px; }
  .doc .sign .name-slot { height:54px; display:flex; align-items:flex-end; justify-content:center; padding-bottom:4px; font-weight:600; }
  .doc .totals { width:46%; margin-left:auto; margin-top:10px; font-size:13.5px; }
  .doc .totals td { padding:7px 10px; border-bottom:1px solid #e2e8f0; }
  .doc .totals td:first-child { color:#475569; }
  .doc .totals tr.grand td { border-top:2px solid #1e3a8a; border-bottom:2px solid #1e3a8a; font-weight:700; font-size:15px; color:#1e3a8a; background:#f1f5f9; }
  .doc .note { background:#fafbfc; border:1px solid #e2e8f0; border-left:3px solid #1e3a8a; padding:12px 14px; border-radius:4px; white-space:pre-wrap; font-size:13.5px; color:#334155; }
  .doc .checklist td { border-bottom:1px dashed #e2e8f0; padding:8px 4px; }
  .doc .pill { display:inline-block; background:#fef2f2; color:#dc2626; padding:3px 10px; border-radius:999px; font-size:11px; font-weight:600; letter-spacing:.3px; }
  .doc .muted { color:#64748b; }
  .doc .photos { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:10px; }
  .doc .photo-box { border:1px dashed #cbd5e1; aspect-ratio:4/3; display:flex; align-items:center; justify-content:center; color:#94a3b8; font-size:12px; border-radius:6px; background:#f8fafc; }
  .doc .footer-strip { margin-top:28px; padding-top:10px; border-top:1px solid #e2e8f0; font-size:11px; color:#94a3b8; text-align:center; letter-spacing:.5px; }
</style>`;

function header(title: string, docNoLabel: string, docNoKey: string, dateKey: string) {
  return `
<div class="head">
  <div class="brand">
    <span class="logo-mark">B</span>บริษัทของคุณ จำกัด
    <span class="sub">123 ถนนตัวอย่าง แขวง/ตำบล เขต/อำเภอ กรุงเทพฯ 10000<br/>โทร 02-000-0000 · อีเมล info@company.co.th</span>
  </div>
  <div class="docmeta">
    <div class="title">${title}</div>
    <div class="doc-no">${docNoLabel}: <b>{{${docNoKey}}}</b></div>
    <div>วันที่: {{${dateKey}}}</div>
  </div>
</div>`;
}

function signBlock(left: string, leftKey: string, right: string, rightKey: string) {
  return `
<div class="sign-grid">
  <div>
    <div class="name-slot">{{${leftKey}}}</div>
    <div class="sign"><span class="muted">(${left})</span><br/>วันที่ ......... / ......... / .........</div>
  </div>
  <div>
    <div class="name-slot">{{${rightKey}}}</div>
    <div class="sign"><span class="muted">(${right})</span><br/>วันที่ ......... / ......... / .........</div>
  </div>
</div>
<div class="footer-strip">เอกสารโครงการ · ออกโดยระบบบริหารโครงการก่อสร้าง</div>`;
}

// ---- Templates -------------------------------------------------------------

export const DEFAULT_TEMPLATES: DefaultTemplate[] = [
  // 1. ใบเสนอราคา
  {
    code: "QUOTATION_STANDARD",
    name: "ใบเสนอราคา",
    category: "เอกสารก่อนเริ่มโครงการ",
    category_code: "pre_project",
    type: "quotation",
    description: "แม่แบบใบเสนอราคามาตรฐาน พร้อมตารางรายการสินค้า/บริการ ส่วนลด VAT และเงื่อนไขการชำระเงิน",
    icon: "FileText",
    paper_size: "A4",
    orientation: "portrait",
    requires_approval: true,
    fields: [
      { key: "quotation_no", label: "เลขที่ใบเสนอราคา", type: "text", required: true, placeholder: "QT-2026-001" },
      { key: "quotation_date", label: "วันที่เสนอราคา", type: "date", required: true },
      { key: "customer_name", label: "ชื่อลูกค้า", type: "text", required: true },
      { key: "customer_contact", label: "ผู้ติดต่อ", type: "text" },
      { key: "customer_address", label: "ที่อยู่ลูกค้า", type: "textarea" },
      { key: "project_name", label: "ชื่อโครงการ", type: "text", required: true },
      { key: "project_location", label: "สถานที่โครงการ", type: "text" },
      {
        key: "items",
        label: "รายการสินค้า/บริการ",
        type: "table",
        required: true,
        columns: [
          { key: "no", label: "ลำดับ", type: "text" },
          { key: "desc", label: "รายละเอียด", type: "text" },
          { key: "qty", label: "จำนวน", type: "number" },
          { key: "unit", label: "หน่วย", type: "text" },
          { key: "price", label: "ราคา/หน่วย", type: "number" },
          { key: "amount", label: "รวม", type: "number" },
        ],
      },
      { key: "subtotal", label: "รวมก่อนส่วนลด", type: "number" },
      { key: "discount", label: "ส่วนลด", type: "number" },
      { key: "vat", label: "VAT 7%", type: "number" },
      { key: "grand_total", label: "ยอดรวมสุทธิ", type: "number", required: true },
      { key: "payment_terms", label: "เงื่อนไขการชำระเงิน", type: "textarea" },
      { key: "delivery_term", label: "ระยะเวลาส่งมอบ", type: "text" },
      { key: "valid_until", label: "ใบเสนอราคามีอายุถึง", type: "date" },
      { key: "remark", label: "หมายเหตุ", type: "textarea" },
      { key: "issued_by", label: "ผู้จัดทำ", type: "text" },
      { key: "approved_by", label: "ผู้อนุมัติ", type: "text" },
    ],
    body_html: `${baseCss}
<div class="doc">
  ${header("ใบเสนอราคา / QUOTATION", "เลขที่", "quotation_no", "quotation_date")}
  <table class="info"><tbody>
    <tr><td class="lbl">ลูกค้า</td><td><b>{{customer_name}}</b></td>
        <td class="lbl">โครงการ</td><td><b>{{project_name}}</b></td></tr>
    <tr><td class="lbl">ผู้ติดต่อ</td><td>{{customer_contact}}</td>
        <td class="lbl">สถานที่</td><td>{{project_location}}</td></tr>
    <tr><td class="lbl">ที่อยู่</td><td colspan="3">{{customer_address}}</td></tr>
  </tbody></table>

  <h2>รายการสินค้า/บริการ</h2>
  {{items}}

  <table class="totals"><tbody>
    <tr><td>รวมก่อนส่วนลด</td><td style="text-align:right">{{subtotal}}</td></tr>
    <tr><td>ส่วนลด</td><td style="text-align:right">{{discount}}</td></tr>
    <tr><td>VAT 7%</td><td style="text-align:right">{{vat}}</td></tr>
    <tr class="grand"><td>ยอดสุทธิ (บาท)</td><td style="text-align:right">{{grand_total}}</td></tr>
  </tbody></table>

  <h2>เงื่อนไข</h2>
  <table class="info"><tbody>
    <tr><td class="lbl">การชำระเงิน</td><td>{{payment_terms}}</td></tr>
    <tr><td class="lbl">ระยะเวลาส่งมอบ</td><td>{{delivery_term}}</td></tr>
    <tr><td class="lbl">ใบเสนอราคามีอายุถึง</td><td>{{valid_until}}</td></tr>
  </tbody></table>

  <h2>หมายเหตุ</h2>
  <div class="note">{{remark}}</div>

  ${signBlock("ผู้จัดทำ", "issued_by", "ผู้อนุมัติ", "approved_by")}
</div>`,
  },

  // 2. สัญญาจ้าง
  {
    code: "CONTRACT_STANDARD",
    name: "สัญญาจ้าง",
    category: "เอกสารก่อนเริ่มโครงการ",
    category_code: "pre_project",
    type: "contract",
    description: "สัญญาจ้างทำงาน/รับเหมาก่อสร้างมาตรฐาน ระบุคู่สัญญา ขอบเขตงาน มูลค่า และเงื่อนไข",
    icon: "FileSignature",
    paper_size: "A4",
    orientation: "portrait",
    requires_approval: true,
    fields: [
      { key: "contract_no", label: "เลขที่สัญญา", type: "text", required: true },
      { key: "contract_date", label: "วันที่ทำสัญญา", type: "date", required: true },
      { key: "party_a", label: "ผู้ว่าจ้าง (คู่สัญญาฝ่าย ก)", type: "text", required: true },
      { key: "party_a_address", label: "ที่อยู่ผู้ว่าจ้าง", type: "textarea" },
      { key: "party_b", label: "ผู้รับจ้าง (คู่สัญญาฝ่าย ข)", type: "text", required: true },
      { key: "party_b_address", label: "ที่อยู่ผู้รับจ้าง", type: "textarea" },
      { key: "project_name", label: "ชื่อโครงการ/งาน", type: "text", required: true },
      { key: "scope_of_work", label: "ขอบเขตงาน", type: "textarea", required: true },
      { key: "contract_value", label: "มูลค่าสัญญา (บาท)", type: "number", required: true },
      { key: "start_date", label: "วันเริ่มงาน", type: "date" },
      { key: "end_date", label: "วันส่งมอบ", type: "date" },
      { key: "warranty", label: "ระยะเวลารับประกัน", type: "text" },
      { key: "penalty", label: "ค่าปรับกรณีล่าช้า", type: "text" },
      { key: "payment_terms", label: "เงื่อนไขการชำระเงิน (งวด)", type: "textarea" },
      { key: "sign_party_a", label: "ลงนามผู้ว่าจ้าง", type: "text" },
      { key: "sign_party_b", label: "ลงนามผู้รับจ้าง", type: "text" },
    ],
    body_html: `${baseCss}
<div class="doc">
  ${header("สัญญาจ้าง / CONTRACT", "เลขที่สัญญา", "contract_no", "contract_date")}

  <h2>คู่สัญญา</h2>
  <table class="info"><tbody>
    <tr><td class="lbl">ผู้ว่าจ้าง</td><td><b>{{party_a}}</b><br/><span class="muted">{{party_a_address}}</span></td></tr>
    <tr><td class="lbl">ผู้รับจ้าง</td><td><b>{{party_b}}</b><br/><span class="muted">{{party_b_address}}</span></td></tr>
  </tbody></table>

  <h2>โครงการ: {{project_name}}</h2>
  <div class="note">{{scope_of_work}}</div>

  <h2>มูลค่าและกำหนดงาน</h2>
  <table class="info"><tbody>
    <tr><td class="lbl">มูลค่าสัญญา</td><td><b>{{contract_value}}</b> บาท</td>
        <td class="lbl">รับประกัน</td><td>{{warranty}}</td></tr>
    <tr><td class="lbl">วันเริ่มงาน</td><td>{{start_date}}</td>
        <td class="lbl">วันส่งมอบ</td><td>{{end_date}}</td></tr>
    <tr><td class="lbl">ค่าปรับ</td><td colspan="3">{{penalty}}</td></tr>
  </tbody></table>

  <h2>เงื่อนไขการชำระเงิน</h2>
  <div class="note">{{payment_terms}}</div>

  ${signBlock("ผู้ว่าจ้าง", "sign_party_a", "ผู้รับจ้าง", "sign_party_b")}
</div>`,
  },

  // 3. ใบสั่งซื้อ
  {
    code: "PURCHASE_ORDER",
    name: "ใบสั่งซื้อ (PO)",
    category: "การจัดซื้อ",
    category_code: "pre_project",
    type: "purchase_order",
    description: "ใบสั่งซื้อวัสดุ/อุปกรณ์จากผู้ขาย พร้อมรายการและยอดรวม",
    icon: "ShoppingCart",
    paper_size: "A4",
    orientation: "portrait",
    requires_approval: true,
    fields: [
      { key: "po_no", label: "เลขที่ใบสั่งซื้อ", type: "text", required: true },
      { key: "po_date", label: "วันที่สั่งซื้อ", type: "date", required: true },
      { key: "supplier_name", label: "ผู้ขาย", type: "text", required: true },
      { key: "supplier_contact", label: "ผู้ติดต่อผู้ขาย", type: "text" },
      { key: "project_name", label: "ใช้กับโครงการ", type: "text" },
      { key: "delivery_address", label: "สถานที่ส่งของ", type: "textarea" },
      { key: "delivery_date", label: "วันที่ต้องการรับของ", type: "date" },
      {
        key: "items",
        label: "รายการสั่งซื้อ",
        type: "table",
        required: true,
        columns: [
          { key: "no", label: "ลำดับ", type: "text" },
          { key: "desc", label: "รายการ", type: "text" },
          { key: "qty", label: "จำนวน", type: "number" },
          { key: "unit", label: "หน่วย", type: "text" },
          { key: "price", label: "ราคา/หน่วย", type: "number" },
          { key: "amount", label: "รวม", type: "number" },
        ],
      },
      { key: "grand_total", label: "ยอดรวม (บาท)", type: "number", required: true },
      { key: "payment_terms", label: "เงื่อนไขการชำระเงิน", type: "textarea" },
      { key: "remark", label: "หมายเหตุ", type: "textarea" },
      { key: "requested_by", label: "ผู้ขอซื้อ", type: "text" },
      { key: "approved_by", label: "ผู้อนุมัติ", type: "text" },
    ],
    body_html: `${baseCss}
<div class="doc">
  ${header("ใบสั่งซื้อ / PURCHASE ORDER", "เลขที่ PO", "po_no", "po_date")}
  <table class="info"><tbody>
    <tr><td class="lbl">ผู้ขาย</td><td><b>{{supplier_name}}</b></td>
        <td class="lbl">ผู้ติดต่อ</td><td>{{supplier_contact}}</td></tr>
    <tr><td class="lbl">โครงการ</td><td>{{project_name}}</td>
        <td class="lbl">วันที่รับของ</td><td>{{delivery_date}}</td></tr>
    <tr><td class="lbl">ส่งของที่</td><td colspan="3">{{delivery_address}}</td></tr>
  </tbody></table>

  <h2>รายการสั่งซื้อ</h2>
  {{items}}
  <table class="totals"><tbody>
    <tr class="grand"><td>ยอดรวม (บาท)</td><td style="text-align:right">{{grand_total}}</td></tr>
  </tbody></table>

  <h2>เงื่อนไข & หมายเหตุ</h2>
  <table class="info"><tbody>
    <tr><td class="lbl">การชำระเงิน</td><td>{{payment_terms}}</td></tr>
    <tr><td class="lbl">หมายเหตุ</td><td>{{remark}}</td></tr>
  </tbody></table>

  ${signBlock("ผู้ขอซื้อ", "requested_by", "ผู้อนุมัติ", "approved_by")}
</div>`,
  },

  // 4. BOQ
  {
    code: "BOQ_STANDARD",
    name: "BOQ (Bill of Quantities)",
    category: "เอกสารก่อนเริ่มโครงการ",
    category_code: "pre_project",
    type: "boq",
    description: "บัญชีแสดงปริมาณงานและราคา แยกตามหมวดงาน พร้อมยอดรวม",
    icon: "Table2",
    paper_size: "A4",
    orientation: "landscape",
    requires_approval: true,
    fields: [
      { key: "boq_no", label: "เลขที่ BOQ", type: "text", required: true },
      { key: "boq_date", label: "วันที่", type: "date", required: true },
      { key: "project_name", label: "ชื่อโครงการ", type: "text", required: true },
      { key: "customer_name", label: "ลูกค้า", type: "text" },
      {
        key: "items",
        label: "รายการปริมาณงาน",
        type: "table",
        required: true,
        columns: [
          { key: "no", label: "ลำดับ", type: "text" },
          { key: "category", label: "หมวดงาน", type: "text" },
          { key: "desc", label: "รายการ", type: "text" },
          { key: "qty", label: "ปริมาณ", type: "number" },
          { key: "unit", label: "หน่วย", type: "text" },
          { key: "mat_price", label: "ราคาวัสดุ", type: "number" },
          { key: "lab_price", label: "ค่าแรง", type: "number" },
          { key: "total", label: "รวม", type: "number" },
        ],
      },
      { key: "subtotal", label: "รวมทั้งสิ้น", type: "number", required: true },
      { key: "vat", label: "VAT 7%", type: "number" },
      { key: "grand_total", label: "ยอดสุทธิ", type: "number", required: true },
      { key: "remark", label: "หมายเหตุ", type: "textarea" },
      { key: "prepared_by", label: "ผู้จัดทำ", type: "text" },
      { key: "approved_by", label: "ผู้อนุมัติ", type: "text" },
    ],
    body_html: `${baseCss}
<div class="doc">
  ${header("BOQ – บัญชีปริมาณงานและราคา", "เลขที่", "boq_no", "boq_date")}
  <table class="info"><tbody>
    <tr><td class="lbl">โครงการ</td><td><b>{{project_name}}</b></td>
        <td class="lbl">ลูกค้า</td><td>{{customer_name}}</td></tr>
  </tbody></table>

  <h2>รายการปริมาณงาน</h2>
  {{items}}

  <table class="totals"><tbody>
    <tr><td>รวมทั้งสิ้น</td><td style="text-align:right">{{subtotal}}</td></tr>
    <tr><td>VAT 7%</td><td style="text-align:right">{{vat}}</td></tr>
    <tr class="grand"><td>ยอดสุทธิ (บาท)</td><td style="text-align:right">{{grand_total}}</td></tr>
  </tbody></table>

  <h2>หมายเหตุ</h2>
  <div class="note">{{remark}}</div>

  ${signBlock("ผู้จัดทำ", "prepared_by", "ผู้อนุมัติ", "approved_by")}
</div>`,
  },

  // 5. รายงานประจำวัน
  {
    code: "DAILY_REPORT",
    name: "รายงานประจำวัน (Daily Report)",
    category: "การดำเนินงาน",
    category_code: "execution",
    type: "daily_report",
    description: "รายงานความคืบหน้างานหน้างานรายวัน สภาพอากาศ แรงงาน เครื่องจักร ปัญหา แผนวันถัดไป",
    icon: "ClipboardList",
    paper_size: "A4",
    orientation: "portrait",
    requires_approval: false,
    fields: [
      { key: "report_no", label: "เลขที่รายงาน", type: "text" },
      { key: "report_date", label: "วันที่รายงาน", type: "date", required: true },
      { key: "project_name", label: "ชื่อโครงการ", type: "text", required: true },
      { key: "location", label: "สถานที่", type: "text" },
      { key: "reporter", label: "ผู้รายงาน", type: "text", required: true },
      {
        key: "weather",
        label: "สภาพอากาศ",
        type: "select",
        options: ["แจ่มใส", "มีเมฆบางส่วน", "ครึ้มฟ้า", "ฝนเล็กน้อย", "ฝนตกหนัก", "ร้อนจัด"],
      },
      { key: "workers_count", label: "จำนวนแรงงาน (คน)", type: "number" },
      { key: "equipment", label: "เครื่องจักรที่ใช้", type: "textarea" },
      { key: "work_done", label: "งานที่ดำเนินการวันนี้", type: "textarea", required: true },
      { key: "issues", label: "ปัญหาที่พบ", type: "textarea" },
      { key: "next_plan", label: "แผนงานวันถัดไป", type: "textarea" },
      { key: "remark", label: "หมายเหตุ", type: "textarea" },
      { key: "reporter_sign", label: "ลายเซ็นผู้รายงาน", type: "text" },
      { key: "supervisor_sign", label: "ลายเซ็นผู้ตรวจ", type: "text" },
    ],
    body_html: `${baseCss}
<div class="doc">
  ${header("รายงานประจำวัน / DAILY REPORT", "เลขที่", "report_no", "report_date")}
  <table class="info"><tbody>
    <tr><td class="lbl">โครงการ</td><td><b>{{project_name}}</b></td>
        <td class="lbl">สถานที่</td><td>{{location}}</td></tr>
    <tr><td class="lbl">ผู้รายงาน</td><td>{{reporter}}</td>
        <td class="lbl">สภาพอากาศ</td><td><span class="pill">{{weather}}</span></td></tr>
    <tr><td class="lbl">แรงงาน</td><td>{{workers_count}} คน</td>
        <td class="lbl">เครื่องจักร</td><td>{{equipment}}</td></tr>
  </tbody></table>

  <h2>งานที่ดำเนินการวันนี้</h2>
  <div class="note">{{work_done}}</div>

  <h2>ปัญหาที่พบ</h2>
  <div class="note">{{issues}}</div>

  <h2>แผนงานวันถัดไป</h2>
  <div class="note">{{next_plan}}</div>

  <h2>ภาพถ่ายหน้างาน</h2>
  <div class="photos">
    <div class="photo-box">รูปที่ 1</div>
    <div class="photo-box">รูปที่ 2</div>
  </div>

  <h2>หมายเหตุ</h2>
  <div class="note">{{remark}}</div>

  ${signBlock("ผู้รายงาน", "reporter_sign", "ผู้ตรวจ", "supervisor_sign")}
</div>`,
  },

  // 6. รายงานความคืบหน้า
  {
    code: "PROGRESS_REPORT",
    name: "รายงานความคืบหน้าโครงการ",
    category: "การดำเนินงาน",
    category_code: "execution",
    type: "progress_report",
    description: "รายงานสรุปความคืบหน้าโครงการรายงวด/รายสัปดาห์ ระบุ % งาน และสถานะ",
    icon: "TrendingUp",
    paper_size: "A4",
    orientation: "portrait",
    requires_approval: true,
    fields: [
      { key: "report_no", label: "เลขที่รายงาน", type: "text" },
      { key: "period", label: "งวด/ช่วงเวลา", type: "text", required: true },
      { key: "report_date", label: "วันที่รายงาน", type: "date", required: true },
      { key: "project_name", label: "ชื่อโครงการ", type: "text", required: true },
      { key: "overall_progress", label: "ความคืบหน้ารวม (%)", type: "number", required: true },
      { key: "planned_progress", label: "ตามแผน (%)", type: "number" },
      {
        key: "items",
        label: "รายละเอียดความคืบหน้า",
        type: "table",
        required: true,
        columns: [
          { key: "no", label: "ลำดับ", type: "text" },
          { key: "task", label: "งาน", type: "text" },
          { key: "planned", label: "แผน (%)", type: "number" },
          { key: "actual", label: "ทำได้ (%)", type: "number" },
          { key: "status", label: "สถานะ", type: "text" },
        ],
      },
      { key: "summary", label: "สรุปภาพรวม", type: "textarea" },
      { key: "issues", label: "ปัญหาและอุปสรรค", type: "textarea" },
      { key: "next_period", label: "แผนงวดถัดไป", type: "textarea" },
      { key: "prepared_by", label: "ผู้จัดทำ", type: "text" },
      { key: "approved_by", label: "ผู้อนุมัติ", type: "text" },
    ],
    body_html: `${baseCss}
<div class="doc">
  ${header("รายงานความคืบหน้าโครงการ", "เลขที่", "report_no", "report_date")}
  <table class="info"><tbody>
    <tr><td class="lbl">โครงการ</td><td><b>{{project_name}}</b></td>
        <td class="lbl">งวด</td><td>{{period}}</td></tr>
    <tr><td class="lbl">ความคืบหน้ารวม</td><td><b>{{overall_progress}}%</b></td>
        <td class="lbl">ตามแผน</td><td>{{planned_progress}}%</td></tr>
  </tbody></table>

  <h2>รายละเอียดความคืบหน้า</h2>
  {{items}}

  <h2>สรุปภาพรวม</h2>
  <div class="note">{{summary}}</div>

  <h2>ปัญหาและอุปสรรค</h2>
  <div class="note">{{issues}}</div>

  <h2>แผนงวดถัดไป</h2>
  <div class="note">{{next_period}}</div>

  ${signBlock("ผู้จัดทำ", "prepared_by", "ผู้อนุมัติ", "approved_by")}
</div>`,
  },

  // 7. แบบฟอร์มตรวจงาน
  {
    code: "INSPECTION_FORM",
    name: "แบบฟอร์มตรวจงาน",
    category: "การควบคุมคุณภาพ",
    category_code: "quality",
    type: "inspection",
    description: "ตรวจรับงานตาม Checklist พร้อมผลการตรวจและภาพถ่าย",
    icon: "ClipboardCheck",
    paper_size: "A4",
    orientation: "portrait",
    requires_approval: true,
    fields: [
      { key: "insp_no", label: "เลขที่ตรวจงาน", type: "text", required: true },
      { key: "insp_date", label: "วันที่ตรวจ", type: "date", required: true },
      { key: "project_name", label: "ชื่อโครงการ", type: "text", required: true },
      { key: "work_area", label: "พื้นที่/หมวดงาน", type: "text", required: true },
      { key: "inspector", label: "ผู้ตรวจ", type: "text", required: true },
      {
        key: "checklist",
        label: "รายการตรวจ",
        type: "table",
        required: true,
        columns: [
          { key: "no", label: "ลำดับ", type: "text" },
          { key: "item", label: "รายการ", type: "text" },
          { key: "standard", label: "เกณฑ์", type: "text" },
          { key: "result", label: "ผล (ผ่าน/ไม่ผ่าน)", type: "text" },
          { key: "note", label: "หมายเหตุ", type: "text" },
        ],
      },
      {
        key: "overall_result",
        label: "ผลรวม",
        type: "select",
        required: true,
        options: ["ผ่าน", "ผ่านมีเงื่อนไข", "ไม่ผ่าน"],
      },
      { key: "defects", label: "ข้อบกพร่อง", type: "textarea" },
      { key: "corrective_action", label: "แนวทางแก้ไข", type: "textarea" },
      { key: "inspector_sign", label: "ลายเซ็นผู้ตรวจ", type: "text" },
      { key: "contractor_sign", label: "ลายเซ็นผู้รับเหมา", type: "text" },
    ],
    body_html: `${baseCss}
<div class="doc">
  ${header("แบบฟอร์มตรวจงาน / INSPECTION", "เลขที่", "insp_no", "insp_date")}
  <table class="info"><tbody>
    <tr><td class="lbl">โครงการ</td><td><b>{{project_name}}</b></td>
        <td class="lbl">พื้นที่/หมวด</td><td>{{work_area}}</td></tr>
    <tr><td class="lbl">ผู้ตรวจ</td><td>{{inspector}}</td>
        <td class="lbl">ผลรวม</td><td><span class="pill">{{overall_result}}</span></td></tr>
  </tbody></table>

  <h2>รายการตรวจ</h2>
  {{checklist}}

  <h2>ข้อบกพร่อง</h2>
  <div class="note">{{defects}}</div>

  <h2>แนวทางแก้ไข</h2>
  <div class="note">{{corrective_action}}</div>

  ${signBlock("ผู้ตรวจ", "inspector_sign", "ผู้รับเหมา", "contractor_sign")}
</div>`,
  },

  // 8. รายงานความปลอดภัย
  {
    code: "SAFETY_REPORT",
    name: "รายงานความปลอดภัย",
    category: "ความปลอดภัย",
    category_code: "safety",
    type: "safety",
    description: "บันทึกการตรวจความปลอดภัยหน้างาน อุบัติเหตุ และมาตรการแก้ไข",
    icon: "ShieldCheck",
    paper_size: "A4",
    orientation: "portrait",
    requires_approval: true,
    fields: [
      { key: "safety_no", label: "เลขที่รายงาน", type: "text", required: true },
      { key: "safety_date", label: "วันที่ตรวจ", type: "date", required: true },
      { key: "project_name", label: "ชื่อโครงการ", type: "text", required: true },
      { key: "inspector", label: "ผู้ตรวจความปลอดภัย", type: "text", required: true },
      {
        key: "items",
        label: "รายการตรวจความปลอดภัย",
        type: "table",
        required: true,
        columns: [
          { key: "no", label: "ลำดับ", type: "text" },
          { key: "item", label: "รายการ", type: "text" },
          { key: "result", label: "ผล", type: "text" },
          { key: "risk", label: "ระดับความเสี่ยง", type: "text" },
          { key: "action", label: "การแก้ไข", type: "text" },
        ],
      },
      { key: "incidents", label: "อุบัติเหตุ/เหตุการณ์ที่เกิดขึ้น", type: "textarea" },
      { key: "preventive_action", label: "มาตรการป้องกัน", type: "textarea" },
      { key: "remark", label: "หมายเหตุ", type: "textarea" },
      { key: "inspector_sign", label: "ลายเซ็นผู้ตรวจ", type: "text" },
      { key: "pm_sign", label: "ลายเซ็นผู้จัดการโครงการ", type: "text" },
    ],
    body_html: `${baseCss}
<div class="doc">
  ${header("รายงานความปลอดภัย / SAFETY REPORT", "เลขที่", "safety_no", "safety_date")}
  <table class="info"><tbody>
    <tr><td class="lbl">โครงการ</td><td><b>{{project_name}}</b></td>
        <td class="lbl">ผู้ตรวจ</td><td>{{inspector}}</td></tr>
  </tbody></table>

  <h2>รายการตรวจความปลอดภัย</h2>
  {{items}}

  <h2>อุบัติเหตุ/เหตุการณ์</h2>
  <div class="note">{{incidents}}</div>

  <h2>มาตรการป้องกัน</h2>
  <div class="note">{{preventive_action}}</div>

  <h2>หมายเหตุ</h2>
  <div class="note">{{remark}}</div>

  ${signBlock("ผู้ตรวจ", "inspector_sign", "ผู้จัดการโครงการ", "pm_sign")}
</div>`,
  },

  // 9. ใบขอเปลี่ยนแปลงงาน
  {
    code: "CHANGE_ORDER",
    name: "ใบขอเปลี่ยนแปลงงาน (Change Order)",
    category: "การควบคุมการเปลี่ยนแปลง",
    category_code: "execution",
    type: "change_order",
    description: "ใบขอเปลี่ยนแปลงขอบเขตงาน/แบบ/มูลค่า พร้อมผลกระทบและการอนุมัติ",
    icon: "GitBranch",
    paper_size: "A4",
    orientation: "portrait",
    requires_approval: true,
    fields: [
      { key: "co_no", label: "เลขที่ Change Order", type: "text", required: true },
      { key: "co_date", label: "วันที่", type: "date", required: true },
      { key: "project_name", label: "ชื่อโครงการ", type: "text", required: true },
      { key: "requested_by", label: "ผู้ขอเปลี่ยนแปลง", type: "text", required: true },
      { key: "change_reason", label: "เหตุผลในการเปลี่ยนแปลง", type: "textarea", required: true },
      { key: "change_detail", label: "รายละเอียดสิ่งที่เปลี่ยนแปลง", type: "textarea", required: true },
      { key: "impact_cost", label: "ผลกระทบต่อมูลค่า (บาท)", type: "number" },
      { key: "impact_schedule", label: "ผลกระทบต่อเวลา (วัน)", type: "number" },
      { key: "impact_other", label: "ผลกระทบอื่นๆ", type: "textarea" },
      { key: "approver_decision", label: "ผลการอนุมัติ", type: "select", options: ["อนุมัติ", "ไม่อนุมัติ", "ขอข้อมูลเพิ่ม"] },
      { key: "approver_note", label: "บันทึกผู้อนุมัติ", type: "textarea" },
      { key: "requester_sign", label: "ลายเซ็นผู้ขอ", type: "text" },
      { key: "approver_sign", label: "ลายเซ็นผู้อนุมัติ", type: "text" },
    ],
    body_html: `${baseCss}
<div class="doc">
  ${header("ใบขอเปลี่ยนแปลงงาน / CHANGE ORDER", "เลขที่", "co_no", "co_date")}
  <table class="info"><tbody>
    <tr><td class="lbl">โครงการ</td><td><b>{{project_name}}</b></td>
        <td class="lbl">ผู้ขอ</td><td>{{requested_by}}</td></tr>
  </tbody></table>

  <h2>เหตุผลในการเปลี่ยนแปลง</h2>
  <div class="note">{{change_reason}}</div>

  <h2>รายละเอียดการเปลี่ยนแปลง</h2>
  <div class="note">{{change_detail}}</div>

  <h2>ผลกระทบ</h2>
  <table class="info"><tbody>
    <tr><td class="lbl">มูลค่า</td><td><b>{{impact_cost}}</b> บาท</td>
        <td class="lbl">เวลา</td><td><b>{{impact_schedule}}</b> วัน</td></tr>
    <tr><td class="lbl">อื่นๆ</td><td colspan="3">{{impact_other}}</td></tr>
  </tbody></table>

  <h2>การอนุมัติ</h2>
  <p><span class="pill">{{approver_decision}}</span></p>
  <div class="note">{{approver_note}}</div>

  ${signBlock("ผู้ขอ", "requester_sign", "ผู้อนุมัติ", "approver_sign")}
</div>`,
  },

  // 10. ใบเบิกวัสดุ
  {
    code: "MATERIAL_REQUISITION",
    name: "ใบเบิกวัสดุ",
    category: "การจัดซื้อ",
    category_code: "execution",
    type: "material_requisition",
    description: "ใบเบิกวัสดุจากคลัง พร้อมรายการและผู้รับ",
    icon: "PackageOpen",
    paper_size: "A4",
    orientation: "portrait",
    requires_approval: true,
    fields: [
      { key: "mr_no", label: "เลขที่ใบเบิก", type: "text", required: true },
      { key: "mr_date", label: "วันที่เบิก", type: "date", required: true },
      { key: "project_name", label: "โครงการ", type: "text", required: true },
      { key: "work_area", label: "พื้นที่/งาน", type: "text" },
      {
        key: "items",
        label: "รายการวัสดุ",
        type: "table",
        required: true,
        columns: [
          { key: "no", label: "ลำดับ", type: "text" },
          { key: "desc", label: "รายการ", type: "text" },
          { key: "qty", label: "จำนวน", type: "number" },
          { key: "unit", label: "หน่วย", type: "text" },
          { key: "purpose", label: "ใช้งาน", type: "text" },
        ],
      },
      { key: "remark", label: "หมายเหตุ", type: "textarea" },
      { key: "requester", label: "ผู้ขอเบิก", type: "text", required: true },
      { key: "approver", label: "ผู้อนุมัติ", type: "text" },
      { key: "issuer", label: "ผู้จ่ายของ", type: "text" },
    ],
    body_html: `${baseCss}
<div class="doc">
  ${header("ใบเบิกวัสดุ / MATERIAL REQUISITION", "เลขที่", "mr_no", "mr_date")}
  <table class="info"><tbody>
    <tr><td class="lbl">โครงการ</td><td><b>{{project_name}}</b></td>
        <td class="lbl">พื้นที่/งาน</td><td>{{work_area}}</td></tr>
  </tbody></table>

  <h2>รายการวัสดุ</h2>
  {{items}}

  <h2>หมายเหตุ</h2>
  <div class="note">{{remark}}</div>

  ${signBlock("ผู้ขอเบิก / ผู้อนุมัติ", "requester", "ผู้จ่ายของ", "issuer")}
</div>`,
  },

  // 11. ใบส่งมอบงาน
  {
    code: "DELIVERY_NOTE",
    name: "ใบส่งมอบงาน",
    category: "การส่งมอบ",
    category_code: "closeout",
    type: "delivery_note",
    description: "เอกสารส่งมอบงานพร้อม Checklist และช่องลงนามผู้ส่ง/ผู้รับ",
    icon: "PackageCheck",
    paper_size: "A4",
    orientation: "portrait",
    requires_approval: true,
    fields: [
      { key: "delivery_no", label: "เลขที่เอกสารส่งมอบ", type: "text", required: true },
      { key: "delivery_date", label: "วันที่ส่งมอบ", type: "date", required: true },
      { key: "project_name", label: "ชื่อโครงการ", type: "text", required: true },
      { key: "customer_name", label: "ลูกค้า", type: "text", required: true },
      { key: "scope_delivered", label: "รายละเอียดงานที่ส่งมอบ", type: "textarea", required: true },
      {
        key: "checklist",
        label: "รายการตรวจรับ",
        type: "table",
        required: true,
        columns: [
          { key: "no", label: "ลำดับ", type: "text" },
          { key: "item", label: "รายการ", type: "text" },
          { key: "status", label: "สถานะ", type: "text" },
          { key: "note", label: "หมายเหตุ", type: "text" },
        ],
      },
      { key: "remark", label: "หมายเหตุ", type: "textarea" },
      { key: "deliverer", label: "ผู้ส่งมอบ", type: "text", required: true },
      { key: "receiver", label: "ผู้รับมอบ", type: "text", required: true },
    ],
    body_html: `${baseCss}
<div class="doc">
  ${header("ใบส่งมอบงาน / DELIVERY NOTE", "เลขที่", "delivery_no", "delivery_date")}
  <table class="info"><tbody>
    <tr><td class="lbl">โครงการ</td><td><b>{{project_name}}</b></td>
        <td class="lbl">ลูกค้า</td><td>{{customer_name}}</td></tr>
  </tbody></table>

  <h2>รายละเอียดงานที่ส่งมอบ</h2>
  <div class="note">{{scope_delivered}}</div>

  <h2>รายการตรวจรับ</h2>
  {{checklist}}

  <h2>ภาพ Before / After</h2>
  <div class="photos">
    <div class="photo-box">Before</div>
    <div class="photo-box">After</div>
  </div>

  <h2>หมายเหตุ</h2>
  <div class="note">{{remark}}</div>

  ${signBlock("ผู้ส่งมอบ", "deliverer", "ผู้รับมอบ", "receiver")}
</div>`,
  },

  // 12. รายงานปิดโครงการ
  {
    code: "PROJECT_CLOSEOUT",
    name: "รายงานปิดโครงการ",
    category: "การปิดโครงการ",
    category_code: "closeout",
    type: "project_closeout",
    description: "สรุปผลโครงการเมื่อปิดงาน รวมผลงาน งบประมาณ บทเรียน และเอกสารแนบ",
    icon: "FlagTriangleRight",
    paper_size: "A4",
    orientation: "portrait",
    requires_approval: true,
    fields: [
      { key: "report_no", label: "เลขที่รายงาน", type: "text", required: true },
      { key: "report_date", label: "วันที่รายงาน", type: "date", required: true },
      { key: "project_name", label: "ชื่อโครงการ", type: "text", required: true },
      { key: "customer_name", label: "ลูกค้า", type: "text" },
      { key: "start_date", label: "วันเริ่มโครงการ", type: "date" },
      { key: "end_date", label: "วันสิ้นสุดโครงการ", type: "date" },
      { key: "contract_value", label: "มูลค่าสัญญา", type: "number" },
      { key: "actual_cost", label: "ค่าใช้จ่ายจริง", type: "number" },
      { key: "summary", label: "สรุปผลโครงการ", type: "textarea", required: true },
      { key: "lessons_learned", label: "บทเรียนที่ได้", type: "textarea" },
      { key: "outstanding_items", label: "รายการคงค้าง", type: "textarea" },
      { key: "warranty_period", label: "ระยะเวลารับประกัน", type: "text" },
      { key: "pm_sign", label: "ผู้จัดการโครงการ", type: "text" },
      { key: "client_sign", label: "ผู้ว่าจ้าง", type: "text" },
    ],
    body_html: `${baseCss}
<div class="doc">
  ${header("รายงานปิดโครงการ / CLOSEOUT", "เลขที่", "report_no", "report_date")}
  <table class="info"><tbody>
    <tr><td class="lbl">โครงการ</td><td><b>{{project_name}}</b></td>
        <td class="lbl">ลูกค้า</td><td>{{customer_name}}</td></tr>
    <tr><td class="lbl">เริ่มโครงการ</td><td>{{start_date}}</td>
        <td class="lbl">สิ้นสุด</td><td>{{end_date}}</td></tr>
    <tr><td class="lbl">มูลค่าสัญญา</td><td><b>{{contract_value}}</b> บาท</td>
        <td class="lbl">ค่าใช้จ่ายจริง</td><td><b>{{actual_cost}}</b> บาท</td></tr>
    <tr><td class="lbl">รับประกัน</td><td colspan="3">{{warranty_period}}</td></tr>
  </tbody></table>

  <h2>สรุปผลโครงการ</h2>
  <div class="note">{{summary}}</div>

  <h2>บทเรียนที่ได้</h2>
  <div class="note">{{lessons_learned}}</div>

  <h2>รายการคงค้าง</h2>
  <div class="note">{{outstanding_items}}</div>

  ${signBlock("ผู้จัดการโครงการ", "pm_sign", "ผู้ว่าจ้าง", "client_sign")}
</div>`,
  },

  // 13. ใบแจ้งหนี้
  {
    code: "INVOICE_STANDARD",
    name: "ใบแจ้งหนี้ (Invoice)",
    category: "การเงิน",
    category_code: "finance",
    type: "invoice",
    description: "ใบแจ้งหนี้ตามงวดงาน พร้อมยอดเงิน VAT และเงื่อนไขการชำระ",
    icon: "Receipt",
    paper_size: "A4",
    orientation: "portrait",
    requires_approval: true,
    fields: [
      { key: "invoice_no", label: "เลขที่ใบแจ้งหนี้", type: "text", required: true },
      { key: "invoice_date", label: "วันที่", type: "date", required: true },
      { key: "due_date", label: "ครบกำหนดชำระ", type: "date" },
      { key: "customer_name", label: "ลูกค้า", type: "text", required: true },
      { key: "customer_address", label: "ที่อยู่/เลขผู้เสียภาษี", type: "textarea" },
      { key: "project_name", label: "โครงการ", type: "text" },
      { key: "period", label: "งวดงาน", type: "text" },
      {
        key: "items",
        label: "รายการ",
        type: "table",
        required: true,
        columns: [
          { key: "no", label: "ลำดับ", type: "text" },
          { key: "desc", label: "รายละเอียด", type: "text" },
          { key: "amount", label: "จำนวนเงิน", type: "number" },
        ],
      },
      { key: "subtotal", label: "รวมก่อน VAT", type: "number" },
      { key: "vat", label: "VAT 7%", type: "number" },
      { key: "withholding_tax", label: "หัก ณ ที่จ่าย", type: "number" },
      { key: "grand_total", label: "ยอดที่ต้องชำระ", type: "number", required: true },
      { key: "bank_info", label: "ข้อมูลการชำระเงิน", type: "textarea" },
      { key: "remark", label: "หมายเหตุ", type: "textarea" },
      { key: "issued_by", label: "ผู้ออกใบแจ้งหนี้", type: "text" },
    ],
    body_html: `${baseCss}
<div class="doc">
  ${header("ใบแจ้งหนี้ / INVOICE", "เลขที่", "invoice_no", "invoice_date")}
  <table class="info"><tbody>
    <tr><td class="lbl">ลูกค้า</td><td><b>{{customer_name}}</b></td>
        <td class="lbl">ครบกำหนด</td><td>{{due_date}}</td></tr>
    <tr><td class="lbl">โครงการ</td><td>{{project_name}}</td>
        <td class="lbl">งวด</td><td>{{period}}</td></tr>
    <tr><td class="lbl">ที่อยู่</td><td colspan="3">{{customer_address}}</td></tr>
  </tbody></table>

  <h2>รายการ</h2>
  {{items}}

  <table class="totals"><tbody>
    <tr><td>รวมก่อน VAT</td><td style="text-align:right">{{subtotal}}</td></tr>
    <tr><td>VAT 7%</td><td style="text-align:right">{{vat}}</td></tr>
    <tr><td>หัก ณ ที่จ่าย</td><td style="text-align:right">{{withholding_tax}}</td></tr>
    <tr class="grand"><td>ยอดที่ต้องชำระ (บาท)</td><td style="text-align:right">{{grand_total}}</td></tr>
  </tbody></table>

  <h2>การชำระเงิน</h2>
  <div class="note">{{bank_info}}</div>

  <h2>หมายเหตุ</h2>
  <div class="note">{{remark}}</div>

  <div class="sign-grid">
    <div></div>
    <div>
      <div style="height:48px"></div>
      <div class="sign">{{issued_by}}<br/><span class="muted">ผู้ออกใบแจ้งหนี้</span></div>
    </div>
  </div>
</div>`,
  },

  // 14. ใบเสร็จรับเงิน
  {
    code: "RECEIPT_STANDARD",
    name: "ใบเสร็จรับเงิน",
    category: "การเงิน",
    category_code: "finance",
    type: "receipt",
    description: "ใบเสร็จรับเงินตามใบแจ้งหนี้",
    icon: "BadgeCheck",
    paper_size: "A4",
    orientation: "portrait",
    requires_approval: false,
    fields: [
      { key: "receipt_no", label: "เลขที่ใบเสร็จ", type: "text", required: true },
      { key: "receipt_date", label: "วันที่รับเงิน", type: "date", required: true },
      { key: "invoice_ref", label: "อ้างอิงใบแจ้งหนี้", type: "text" },
      { key: "customer_name", label: "ได้รับจาก", type: "text", required: true },
      { key: "amount", label: "จำนวนเงิน (บาท)", type: "number", required: true },
      { key: "amount_in_words", label: "จำนวนเงิน (ตัวอักษร)", type: "text" },
      { key: "payment_method", label: "วิธีชำระ", type: "select", options: ["เงินสด", "โอน", "เช็ค", "บัตรเครดิต"] },
      { key: "remark", label: "หมายเหตุ", type: "textarea" },
      { key: "issued_by", label: "ผู้รับเงิน", type: "text" },
    ],
    body_html: `${baseCss}
<div class="doc">
  ${header("ใบเสร็จรับเงิน / RECEIPT", "เลขที่", "receipt_no", "receipt_date")}
  <table class="info"><tbody>
    <tr><td class="lbl">อ้างอิงใบแจ้งหนี้</td><td>{{invoice_ref}}</td></tr>
    <tr><td class="lbl">ได้รับเงินจาก</td><td><b>{{customer_name}}</b></td></tr>
    <tr><td class="lbl">จำนวนเงิน</td><td><b>{{amount}} บาท</b> ({{amount_in_words}})</td></tr>
    <tr><td class="lbl">วิธีชำระ</td><td><span class="pill">{{payment_method}}</span></td></tr>
  </tbody></table>

  <h2>หมายเหตุ</h2>
  <div class="note">{{remark}}</div>

  <div class="sign-grid">
    <div></div>
    <div>
      <div style="height:48px"></div>
      <div class="sign">{{issued_by}}<br/><span class="muted">ผู้รับเงิน</span></div>
    </div>
  </div>
</div>`,
  },
];

export function getDefaultTemplate(code: string): DefaultTemplate | undefined {
  return DEFAULT_TEMPLATES.find((t) => t.code === code);
}
