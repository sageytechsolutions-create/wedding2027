import Link from "next/link";
import { PolicyPage } from "@/components/PolicyPage";
import { site } from "@/lib/config";

export const metadata = { title: "Terms of service" };

// DRAFT: have this reviewed before launch (see LAUNCH.md).
export default function Terms() {
  return (
    <PolicyPage title="Terms of service" updated="October 2026">
      <p>
        {site.name} is a marketplace operated by {site.legalName}. By placing an order you agree to these terms, our{" "}
        <Link href="/shipping">Shipping &amp; refunds</Link> policy, and our <Link href="/privacy">Privacy policy</Link>.
      </p>

      <h2>Who you&apos;re buying from</h2>
      <p>
        Each product is made and sold by the shop listed on it. We run the marketplace, take your payment on the shop&apos;s behalf, and help
        coordinate delivery and customer service.
      </p>

      <h2>Kosher certification and allergens</h2>
      <p>
        Each shop is responsible for its kosher certification and for accurate product details. The certifying agency, and whether an item is meat,
        dairy or pareve, are shown as provided by the shop. If you have questions about a certification or about allergens, please contact us
        before ordering and we&apos;ll check with the shop. We are not a kosher certifying agency.
      </p>

      <h2>Orders and prices</h2>
      <ul>
        <li>Prices are in US dollars. Delivery fees and dates are shown at checkout before you pay.</li>
        <li>Your order is confirmed once payment goes through and you receive a confirmation email.</li>
        <li>Shops may occasionally be unable to fulfill an order; in that case you&apos;re refunded in full for that shop&apos;s part.</li>
        <li>We may refuse or cancel orders that appear fraudulent or were placed with an obvious pricing error, with a full refund.</li>
      </ul>

      <h2>Store hours</h2>
      <p>The site is closed for ordering on Shabbat and Yom Tov, from 2:00 PM ET beforehand until one hour after sunset when it ends.</p>

      <h2>Limitation of liability</h2>
      <p>
        To the extent the law allows, our responsibility for any order is limited to the amount you paid for it. We aren&apos;t responsible for
        delays caused by carriers, weather, or events outside our control, though we&apos;ll always work to make things right.
      </p>

      <h2>Changes</h2>
      <p>We may update these terms from time to time. The version posted when you place an order applies to that order.</p>

      <h2>Governing law</h2>
      <p>These terms are governed by the laws of the State of New York.</p>
    </PolicyPage>
  );
}
