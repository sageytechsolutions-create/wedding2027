import { site } from "../config";
import { formatDeliveryDate, methodLabel } from "../fulfillment";
import { formatMoney } from "../money";

// Plain data in, { subject, html, text } out, so templates are easy to test.
// Everything customer-supplied is HTML-escaped.

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

const e = escapeHtml;

interface Item {
  name: string;
  quantity: number;
  unitPrice: number;
}

interface ShipTo {
  name: string;
  address1: string;
  address2: string | null;
  city: string;
  state: string;
  zip: string;
}

export interface Rendered {
  subject: string;
  html: string;
  text: string;
}

const BRAND = "#c2410c";

function layout(preheader: string, body: string): string {
  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#fffaf3;font-family:Helvetica,Arial,sans-serif;color:#1c1917">
<span style="display:none;max-height:0;overflow:hidden">${e(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #e7e5e4;border-radius:16px">
<tr><td style="padding:24px 28px;border-bottom:1px solid #f5f5f4">
<span style="font-family:Georgia,serif;font-size:22px;font-weight:bold;color:${BRAND}">${e(site.name)}</span>
</td></tr>
<tr><td style="padding:24px 28px;font-size:15px;line-height:1.5">${body}</td></tr>
<tr><td style="padding:16px 28px;border-top:1px solid #f5f5f4;font-size:12px;color:#78716c">
${e(site.name)} · Questions? Reply to this email or write to ${e(site.supportEmail)}.
</td></tr>
</table></td></tr></table></body></html>`;
}

function button(href: string, label: string): string {
  return `<p style="margin:24px 0"><a href="${e(href)}" style="display:inline-block;background:${BRAND};color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:999px">${e(label)}</a></p>`;
}

function itemRows(items: Item[]): string {
  return items
    .map(
      (i) =>
        `<tr><td style="padding:4px 0">${i.quantity} × ${e(i.name)}</td><td align="right" style="padding:4px 0">${formatMoney(i.unitPrice * i.quantity)}</td></tr>`,
    )
    .join("");
}

const itemLines = (items: Item[]) => items.map((i) => `  ${i.quantity} x ${i.name}  ${formatMoney(i.unitPrice * i.quantity)}`).join("\n");

function addressHtml(a: ShipTo): string {
  return `${e(a.name)}<br>${e(a.address1)}${a.address2 ? `, ${e(a.address2)}` : ""}<br>${e(a.city)}, ${e(a.state)} ${e(a.zip)}`;
}

const addressText = (a: ShipTo) => `${a.name}\n${a.address1}${a.address2 ? `, ${a.address2}` : ""}\n${a.city}, ${a.state} ${a.zip}`;

const firstName = (name: string) => name.trim().split(/\s+/)[0] || "there";

// --- Customer: order confirmation -------------------------------------------------

export interface OrderConfirmationData {
  number: string;
  orderUrl: string;
  shipTo: ShipTo;
  giftMessage: string | null;
  subtotal: number;
  shippingTotal: number;
  total: number;
  shipments: {
    vendorName: string;
    method: string;
    deliveryDate: Date;
    priority: boolean;
    holidayName: string | null;
    shippingFee: number;
    items: Item[];
  }[];
}

export function orderConfirmationEmail(d: OrderConfirmationData): Rendered {
  const shipmentsHtml = d.shipments
    .map(
      (s) => `
<div style="margin:16px 0;padding:14px 16px;border:1px solid #e7e5e4;border-radius:12px">
  <div style="font-weight:bold">${e(s.vendorName)}</div>
  <div style="color:#047857;font-size:14px;margin:2px 0 8px">${e(methodLabel(s.method))} · arrives ${e(formatDeliveryDate(s.deliveryDate))}${
    s.priority ? ` · <strong>⚡ Priority before ${e(s.holidayName ?? "Yom Tov")}</strong>` : ""
  }</div>
  <table role="presentation" width="100%" style="font-size:14px">${itemRows(s.items)}
  <tr><td style="padding:4px 0;color:#78716c">${s.priority ? "Priority delivery" : "Delivery"}</td><td align="right" style="padding:4px 0;color:#78716c">${s.shippingFee === 0 ? "Free" : formatMoney(s.shippingFee)}</td></tr></table>
</div>`,
    )
    .join("");

  const html = layout(
    `Order ${d.number} is confirmed.`,
    `<h1 style="font-family:Georgia,serif;font-size:24px;margin:0 0 8px">Thanks, ${e(firstName(d.shipTo.name))}!</h1>
<p style="margin:0">Your order <strong>${e(d.number)}</strong> is confirmed. Each shop ships its part separately; we'll email you as each one is on its way.</p>
${shipmentsHtml}
<table role="presentation" width="100%" style="font-size:14px;margin-top:8px">
<tr><td>Subtotal</td><td align="right">${formatMoney(d.subtotal)}</td></tr>
<tr><td>Delivery</td><td align="right">${formatMoney(d.shippingTotal)}</td></tr>
<tr><td style="font-weight:bold;padding-top:6px;border-top:1px solid #e7e5e4">Total</td><td align="right" style="font-weight:bold;padding-top:6px;border-top:1px solid #e7e5e4">${formatMoney(d.total)}</td></tr>
</table>
<p style="margin:20px 0 4px;font-weight:bold">Delivering to</p>
<p style="margin:0;color:#57534e">${addressHtml(d.shipTo)}</p>
${d.giftMessage ? `<p style="margin:12px 0 0;font-style:italic;color:#57534e">Gift note: “${e(d.giftMessage)}”</p>` : ""}
${button(d.orderUrl, "View your order")}`,
  );

  const text = [
    `Thanks, ${firstName(d.shipTo.name)}! Your order ${d.number} is confirmed.`,
    "",
    ...d.shipments.flatMap((s) => [
      `${s.vendorName}: ${methodLabel(s.method)}, arrives ${formatDeliveryDate(s.deliveryDate)}${s.priority ? ` (priority before ${s.holidayName ?? "Yom Tov"})` : ""}`,
      itemLines(s.items),
      `  Delivery  ${s.shippingFee === 0 ? "Free" : formatMoney(s.shippingFee)}`,
      "",
    ]),
    `Subtotal ${formatMoney(d.subtotal)} · Delivery ${formatMoney(d.shippingTotal)} · Total ${formatMoney(d.total)}`,
    "",
    "Delivering to:",
    addressText(d.shipTo),
    ...(d.giftMessage ? ["", `Gift note: "${d.giftMessage}"`] : []),
    "",
    `View your order: ${d.orderUrl}`,
  ].join("\n");

  return { subject: `Order confirmed: ${d.number}`, html, text };
}

// --- Customer: shipped / out for delivery -----------------------------------------

export interface ShippedData {
  number: string;
  orderUrl: string;
  customerName: string;
  vendorName: string;
  method: string;
  status: "shipped" | "out_for_delivery";
  deliveryDate: Date;
  carrier: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  items: Item[];
  perishable: boolean;
}

const COLD_NOTE = "Perishable items are packed cold. Please refrigerate them as soon as they arrive.";

export function shippedEmail(d: ShippedData): Rendered {
  const local = d.status === "out_for_delivery";
  const headline = local ? `Your ${d.vendorName} order is out for delivery` : `Your ${d.vendorName} order has shipped`;
  const when = `Expected ${formatDeliveryDate(d.deliveryDate)}.`;
  const tracking = d.trackingNumber ? `${d.carrier ? `${d.carrier} ` : ""}tracking number ${d.trackingNumber}` : null;

  const html = layout(
    `${headline}. ${when}`,
    `<h1 style="font-family:Georgia,serif;font-size:24px;margin:0 0 8px">${e(headline)} ${local ? "🚚" : "📦"}</h1>
<p style="margin:0">Hi ${e(firstName(d.customerName))}, ${local ? "our courier is on the way with" : "good news: here's"} your part of order <strong>${e(d.number)}</strong>. ${e(when)}</p>
<table role="presentation" width="100%" style="font-size:14px;margin:16px 0">${itemRows(d.items)}</table>
${tracking ? `<p style="margin:0;color:#57534e">${e(tracking)}</p>` : ""}
${d.trackingUrl ? button(d.trackingUrl, "Track your package") : button(d.orderUrl, "View your order")}
${d.perishable ? `<p style="margin:0;font-size:13px;color:#78716c">${e(COLD_NOTE)}</p>` : ""}`,
  );

  const text = [
    `${headline}. ${when}`,
    "",
    `Order ${d.number}:`,
    itemLines(d.items),
    ...(tracking ? ["", tracking] : []),
    ...(d.trackingUrl ? [`Track it: ${d.trackingUrl}`] : []),
    `View your order: ${d.orderUrl}`,
    ...(d.perishable ? ["", COLD_NOTE] : []),
  ].join("\n");

  return { subject: `${headline} (${d.number})`, html, text };
}

// --- Vendor: new order -------------------------------------------------------------

export interface VendorNewOrderData {
  vendorName: string;
  number: string;
  portalUrl: string;
  method: string;
  shipDate: Date;
  deliveryDate: Date;
  priority: boolean;
  holidayName: string | null;
  scheduled?: boolean;
  items: Item[];
  shipTo: ShipTo;
  giftMessage: string | null;
  payout: number;
}

export function vendorNewOrderEmail(d: VendorNewOrderData): Rendered {
  const local = d.method === "local_delivery";
  const due = local ? `Courier pickup ${formatDeliveryDate(d.shipDate)}` : `Ship by ${formatDeliveryDate(d.shipDate)}`;
  const priority = d.priority
    ? `⚡ PRIORITY: must arrive before ${d.holidayName ?? "Yom Tov"}. `
    : d.scheduled
      ? `📅 SCHEDULED for ${formatDeliveryDate(d.deliveryDate)}: don't send before ${formatDeliveryDate(d.shipDate)}. `
      : "";

  const html = layout(
    `${priority}New order ${d.number}. ${due}.`,
    `<h1 style="font-family:Georgia,serif;font-size:24px;margin:0 0 8px">New order ${e(d.number)}</h1>
${d.priority ? `<p style="margin:0 0 8px;padding:8px 12px;background:#fef3c7;border-radius:8px;color:#92400e"><strong>⚡ Priority:</strong> pack this first. It must arrive before ${e(d.holidayName ?? "Yom Tov")}.</p>` : ""}
${d.scheduled ? `<p style="margin:0 0 8px;padding:8px 12px;background:#e0f2fe;border-radius:8px;color:#075985"><strong>📅 Scheduled delivery:</strong> the customer chose ${e(formatDeliveryDate(d.deliveryDate))}. Please don't send it before ${e(formatDeliveryDate(d.shipDate))}.</p>` : ""}
<p style="margin:0"><strong>${e(methodLabel(d.method))}</strong> · ${e(due)} · arrives ${e(formatDeliveryDate(d.deliveryDate))}</p>
<table role="presentation" width="100%" style="font-size:14px;margin:16px 0">${itemRows(d.items)}</table>
<p style="margin:0 0 4px;font-weight:bold">${local ? "Delivering to" : "Ship to"}</p>
<p style="margin:0;color:#57534e">${addressHtml(d.shipTo)}</p>
${d.giftMessage ? `<p style="margin:12px 0 0;font-style:italic;color:#57534e">Gift note to include: “${e(d.giftMessage)}”</p>` : ""}
<p style="margin:16px 0 0">Your payout for this order: <strong>${formatMoney(d.payout)}</strong></p>
${button(d.portalUrl, "Open your vendor portal")}`,
  );

  const text = [
    `${priority}New order ${d.number} for ${d.vendorName}`,
    `${methodLabel(d.method)} · ${due} · arrives ${formatDeliveryDate(d.deliveryDate)}`,
    "",
    itemLines(d.items),
    "",
    `${local ? "Delivering to" : "Ship to"}:`,
    addressText(d.shipTo),
    ...(d.giftMessage ? ["", `Gift note to include: "${d.giftMessage}"`] : []),
    "",
    `Your payout: ${formatMoney(d.payout)}`,
    `Vendor portal: ${d.portalUrl}`,
  ].join("\n");

  return { subject: `${d.priority ? "⚡ Priority " : d.scheduled ? "📅 Scheduled " : ""}New order ${d.number}: ${due}`, html, text };
}

// --- Customer: part of the order cancelled and refunded ------------------------------

export interface RefundData {
  number: string;
  orderUrl: string;
  customerName: string;
  vendorName: string;
  items: Item[];
  amount: number;
  reason: string;
  // false in demo mode, when no card was charged
  toCard: boolean;
}

export function refundEmail(d: RefundData): Rendered {
  const headline = `Your ${d.vendorName} order was cancelled`;
  const refundLine = d.toCard
    ? `We've refunded ${formatMoney(d.amount)} to your original payment method. It usually appears within 5–10 business days.`
    : `You won't be charged ${formatMoney(d.amount)} for it.`;

  const html = layout(
    `${headline}. ${refundLine}`,
    `<h1 style="font-family:Georgia,serif;font-size:24px;margin:0 0 8px">${e(headline)}</h1>
<p style="margin:0">Hi ${e(firstName(d.customerName))}, we're sorry. ${e(d.vendorName)} couldn't fulfill their part of order <strong>${e(d.number)}</strong>.</p>
${d.reason ? `<p style="margin:12px 0 0;color:#57534e">Reason: ${e(d.reason)}</p>` : ""}
<table role="presentation" width="100%" style="font-size:14px;margin:16px 0">${itemRows(d.items)}</table>
<p style="margin:0;padding:12px 14px;background:#ecfdf5;border-radius:10px;color:#065f46"><strong>${e(refundLine)}</strong></p>
<p style="margin:16px 0 0">Anything else in your order from other shops is not affected and will arrive as scheduled.</p>
${button(d.orderUrl, "View your order")}`,
  );

  const text = [
    `${headline}.`,
    "",
    `Hi ${firstName(d.customerName)}, we're sorry. ${d.vendorName} couldn't fulfill their part of order ${d.number}.`,
    ...(d.reason ? [`Reason: ${d.reason}`] : []),
    "",
    itemLines(d.items),
    "",
    refundLine,
    "Anything else in your order from other shops is not affected and will arrive as scheduled.",
    "",
    `View your order: ${d.orderUrl}`,
  ].join("\n");

  return { subject: `${headline}: ${formatMoney(d.amount)} refunded (${d.number})`, html, text };
}

// --- Customer: late priority order, priority fee refunded -----------------------------

export interface PriorityRefundData {
  number: string;
  orderUrl: string;
  customerName: string;
  vendorName: string;
  holidayName: string | null;
  amount: number;
  toCard: boolean;
}

export function priorityRefundEmail(d: PriorityRefundData): Rendered {
  const holiday = d.holidayName ?? "Yom Tov";
  const refundLine = d.toCard
    ? `We've refunded your ${formatMoney(d.amount)} priority fee to your original payment method. It usually appears within 5–10 business days.`
    : `We've refunded your ${formatMoney(d.amount)} priority fee.`;

  const html = layout(
    `Your priority delivery was late. ${refundLine}`,
    `<h1 style="font-family:Georgia,serif;font-size:24px;margin:0 0 8px">We're sorry your delivery was late</h1>
<p style="margin:0">Hi ${e(firstName(d.customerName))}, you paid for priority delivery of your ${e(d.vendorName)} order <strong>${e(d.number)}</strong> before ${e(holiday)}, and it didn't arrive on time.</p>
<p style="margin:16px 0 0;padding:12px 14px;background:#ecfdf5;border-radius:10px;color:#065f46"><strong>${e(refundLine)}</strong></p>
${button(d.orderUrl, "View your order")}`,
  );

  const text = [
    "We're sorry your delivery was late.",
    "",
    `Hi ${firstName(d.customerName)}, you paid for priority delivery of your ${d.vendorName} order ${d.number} before ${holiday}, and it didn't arrive on time.`,
    "",
    refundLine,
    "",
    `View your order: ${d.orderUrl}`,
  ].join("\n");

  return { subject: `Priority fee refunded: ${formatMoney(d.amount)} (${d.number})`, html, text };
}

// --- Customer: delivered (and please review) ---------------------------------------

export interface DeliveredData {
  number: string;
  orderUrl: string;
  reviewUrl: string;
  customerName: string;
  vendorName: string;
  items: Item[];
  perishable: boolean;
  deliveredOn: Date;
}

export function deliveredEmail(d: DeliveredData): Rendered {
  const headline = `Your ${d.vendorName} order has arrived`;
  const when = formatDeliveryDate(d.deliveredOn);
  const problem = `Something wrong? If anything arrived damaged, spoiled or missing, reply to this email within 48 hours with a photo and we'll make it right.`;

  const html = layout(
    `${headline}. Delivered ${when}.`,
    `<h1 style="font-family:Georgia,serif;font-size:24px;margin:0 0 8px">${e(headline)} 🎉</h1>
<p style="margin:0">Hi ${e(firstName(d.customerName))}, your part of order <strong>${e(d.number)}</strong> was delivered ${e(when)}.</p>
<table role="presentation" width="100%" style="font-size:14px;margin:16px 0">${itemRows(d.items)}</table>
${d.perishable ? `<p style="margin:0 0 12px;padding:10px 14px;background:#eff6ff;border-radius:10px;color:#1e3a8a"><strong>❄️ Please refrigerate perishable items right away.</strong></p>` : ""}
<p style="margin:0;font-size:14px;color:#57534e">${e(problem)}</p>
<p style="margin:20px 0 0">Enjoying it? A quick review helps other customers and means a lot to a small kitchen.</p>
${button(d.reviewUrl, "★ Leave a review")}
<p style="margin:0;font-size:13px"><a href="${e(d.orderUrl)}" style="color:#78716c">View your order</a></p>`,
  );

  const text = [
    `${headline}. Delivered ${when}.`,
    "",
    `Order ${d.number}:`,
    itemLines(d.items),
    ...(d.perishable ? ["", "Please refrigerate perishable items right away."] : []),
    "",
    problem,
    "",
    `Enjoying it? Leave a review: ${d.reviewUrl}`,
    `View your order: ${d.orderUrl}`,
  ].join("\n");

  return { subject: `Delivered: your ${d.vendorName} order (${d.number})`, html, text };
}

// --- Partner: password reset ---------------------------------------------------------

export function passwordResetEmail(d: { resetUrl: string; minutes: number }): Rendered {
  const html = layout(
    "Reset your password",
    `<h1 style="font-family:Georgia,serif;font-size:24px;margin:0 0 8px">Reset your password</h1>
<p style="margin:0">Someone (hopefully you) asked to reset the password for your ${e(site.name)} partner account.</p>
${button(d.resetUrl, "Choose a new password")}
<p style="margin:0;font-size:13px;color:#78716c">This link works once and expires in ${d.minutes} minutes. If you didn't ask for this, you can ignore this email; your password won't change.</p>`,
  );
  const text = [
    `Reset your ${site.name} password`,
    "",
    "Someone (hopefully you) asked to reset the password for your partner account.",
    `Choose a new password: ${d.resetUrl}`,
    "",
    `This link works once and expires in ${d.minutes} minutes. If you didn't ask for this, ignore this email; your password won't change.`,
  ].join("\n");
  return { subject: `Reset your ${site.name} password`, html, text };
}
