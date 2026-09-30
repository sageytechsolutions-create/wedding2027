import Link from "next/link";
import { PolicyPage } from "@/components/PolicyPage";
import { localDelivery, site } from "@/lib/config";
import { formatMoney } from "@/lib/money";

export const metadata = { title: "Shipping & refunds" };

// DRAFT: have this reviewed before launch (see LAUNCH.md).
export default function ShippingPolicy() {
  return (
    <PolicyPage title="Shipping & refunds" updated="October 2026">
      <p>
        Every order on {site.name} is prepared and sent by the shop you bought from. If your cart has items from more than one shop,
        each shop&apos;s part arrives separately, with its own delivery date.
      </p>

      <h2>Delivery options</h2>
      <ul>
        <li>
          <strong>Local next-day delivery (New York City):</strong> our courier delivers the day after you order, for {formatMoney(localDelivery.fee)} per shop,
          when you order before 2:00 PM ET.
        </li>
        <li><strong>Overnight shipping (nationwide):</strong> arrives the next business day after the shop ships it.</li>
        <li><strong>2-day shipping:</strong> a lower-cost option for shelf-stable items like chocolate and pantry goods.</li>
      </ul>
      <p>Your exact delivery date and fee for each shop are shown at checkout before you pay.</p>

      <h2>Shabbat and Yom Tov</h2>
      <p>
        We close at 2:00 PM ET before Shabbat and Yom Tov and reopen one hour after sunset when it ends. Nothing is prepared or delivered on
        Shabbat or Yom Tov. Perishable orders ship Monday to Thursday only, and never the day before Yom Tov, so they never sit in a warehouse.
      </p>

      <h2>Priority delivery before Yom Tov</h2>
      <p>
        In the two weeks before a holiday, you can add priority delivery at checkout. Priority orders are packed first and guaranteed to arrive
        before the holiday begins.
      </p>

      <h2>Perishable food</h2>
      <p>
        Perishable items are packed cold. Please make sure someone can bring the package inside, and refrigerate it as soon as it arrives. We
        can&apos;t be responsible for food left outside after delivery.
      </p>

      <h2>Cancellations</h2>
      <p>
        If a shop can&apos;t fulfill your order, they&apos;ll cancel their part and you&apos;ll receive a full refund for it, including delivery,
        with an email explaining why. Refunds go back to your original payment method and usually appear within 5–10 business days. The rest of
        your order is not affected.
      </p>
      <p>
        Need to change or cancel an order yourself? Email us as soon as possible. Once a shop has started preparing your food we may not be able
        to cancel it.
      </p>

      <h2>Damaged, missing or late orders</h2>
      <p>
        If something arrives damaged, spoiled or missing, email us within 48 hours of delivery with your order number and a photo. We&apos;ll make
        it right with a replacement or refund. Please double-check your delivery address at checkout: we can&apos;t refund orders delivered to an
        incorrect address that was entered at checkout.
      </p>

      <p>
        You can check on any order at <Link href="/track">Track order</Link>.
      </p>
    </PolicyPage>
  );
}
