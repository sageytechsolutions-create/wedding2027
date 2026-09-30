import { db } from "./db";
import { sendEmail } from "./email/send";
import { orderConfirmationEmail, priorityRefundEmail, refundEmail, deliveredEmail, shippedEmail, vendorNewOrderEmail } from "./email/templates";
import { siteUrl } from "./stripe";
import { localNow } from "./time";
import { trackingUrl } from "./tracking";

const orderUrl = (o: { number: string; email: string }) => `${siteUrl()}/orders/${o.number}?email=${encodeURIComponent(o.email)}`;

// Once an order is paid: confirmation to the customer, and a heads-up to each vendor's logins.
export async function notifyOrderPaid(orderId: string) {
  const order = await db.order.findUniqueOrThrow({
    where: { id: orderId },
    include: { vendorOrders: { include: { items: true, vendor: { include: { users: true } } } } },
  });
  if (order.paymentStatus !== "paid") return;

  const shipTo = { name: order.name, address1: order.address1, address2: order.address2, city: order.city, state: order.state, zip: order.zip };
  const confirmation = orderConfirmationEmail({
    number: order.number,
    orderUrl: orderUrl(order),
    shipTo,
    giftMessage: order.giftMessage,
    subtotal: order.subtotal,
    shippingTotal: order.shippingTotal,
    total: order.total,
    shipments: order.vendorOrders.map((vo) => ({
      vendorName: vo.vendor.name,
      method: vo.method,
      deliveryDate: vo.deliveryDate,
      priority: vo.priority,
      holidayName: vo.holidayName,
      shippingFee: vo.shippingFee,
      items: vo.items,
    })),
  });
  await sendEmail({ key: `order-confirmation:${order.id}`, to: order.email, ...confirmation });

  for (const vo of order.vendorOrders) {
    const email = vendorNewOrderEmail({
      vendorName: vo.vendor.name,
      number: order.number,
      portalUrl: `${siteUrl()}/vendor/${vo.vendor.slug}`,
      method: vo.method,
      shipDate: vo.shipDate,
      deliveryDate: vo.deliveryDate,
      priority: vo.priority,
      holidayName: vo.holidayName,
      items: vo.items,
      shipTo,
      giftMessage: order.giftMessage,
      payout: vo.vendorPayout,
    });
    for (const user of vo.vendor.users) {
      await sendEmail({ key: `vendor-new-order:${vo.id}:${user.id}`, to: user.email, ...email });
    }
  }
}

// When a vendor marks their part shipped (carrier), out for delivery (courier), or delivered (with a review request).
export async function notifyVendorOrderStatus(vendorOrderId: string) {
  const vo = await db.vendorOrder.findUniqueOrThrow({
    where: { id: vendorOrderId },
    include: { order: true, vendor: true, items: { include: { product: { select: { perishable: true } } } } },
  });
  if (vo.order.paymentStatus !== "paid") return;

  if (vo.status === "delivered") {
    const email = deliveredEmail({
      number: vo.order.number,
      orderUrl: orderUrl(vo.order),
      reviewUrl: `${orderUrl(vo.order)}#reviews`,
      customerName: vo.order.name,
      vendorName: vo.vendor.name,
      items: vo.items,
      perishable: vo.items.some((i) => i.product.perishable),
      // The calendar day in New York, so an evening delivery isn't shown as the next day.
      deliveredOn: localNow(vo.deliveredAt ?? new Date()).day,
    });
    // Sent once per shipment, even if the status is changed back and forth.
    await sendEmail({ key: `delivered:${vo.id}`, to: vo.order.email, ...email });
    return;
  }
  if (vo.status !== "shipped" && vo.status !== "out_for_delivery") return;

  const email = shippedEmail({
    number: vo.order.number,
    orderUrl: orderUrl(vo.order),
    customerName: vo.order.name,
    vendorName: vo.vendor.name,
    method: vo.method,
    status: vo.status,
    deliveryDate: vo.deliveryDate,
    carrier: vo.carrier,
    trackingNumber: vo.trackingNumber,
    trackingUrl: trackingUrl(vo.carrier, vo.trackingNumber),
    items: vo.items,
    perishable: vo.items.some((i) => i.product.perishable),
  });
  // One "on its way" email per shipment, even if the status is toggled back and forth.
  await sendEmail({ key: `shipped:${vo.id}`, to: vo.order.email, ...email });
}

// When a shipment is cancelled and refunded.
export async function notifyRefund(vendorOrderId: string) {
  const vo = await db.vendorOrder.findUniqueOrThrow({ where: { id: vendorOrderId }, include: { order: true, vendor: true, items: true } });
  if (vo.status !== "cancelled" || vo.refundAmount == null) return;
  const email = refundEmail({
    number: vo.order.number,
    orderUrl: orderUrl(vo.order),
    customerName: vo.order.name,
    vendorName: vo.vendor.name,
    items: vo.items,
    amount: vo.refundAmount,
    reason: vo.cancelReason ?? "",
    toCard: vo.order.stripePaymentIntentId != null,
  });
  await sendEmail({ key: `refund:${vo.id}`, to: vo.order.email, ...email });
}

// When a late priority order's priority fee is refunded.
export async function notifyPriorityRefund(vendorOrderId: string) {
  const vo = await db.vendorOrder.findUniqueOrThrow({ where: { id: vendorOrderId }, include: { order: true, vendor: true } });
  if (!vo.priorityRefundedAt) return;
  const email = priorityRefundEmail({
    number: vo.order.number,
    orderUrl: orderUrl(vo.order),
    customerName: vo.order.name,
    vendorName: vo.vendor.name,
    holidayName: vo.holidayName,
    amount: vo.priorityFee,
    toCard: vo.order.stripePaymentIntentId != null,
  });
  await sendEmail({ key: `priority-refund:${vo.id}`, to: vo.order.email, ...email });
}
