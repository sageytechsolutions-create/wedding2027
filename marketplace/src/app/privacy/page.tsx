import { PolicyPage } from "@/components/PolicyPage";
import { site } from "@/lib/config";

export const metadata = { title: "Privacy policy" };

// DRAFT: have this reviewed before launch (see LAUNCH.md).
export default function PrivacyPolicy() {
  return (
    <PolicyPage title="Privacy policy" updated="October 2026">
      <p>
        This policy explains what information {site.legalName} (&ldquo;we&rdquo;) collects when you use {site.name}, and how we use it.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li><strong>Order details:</strong> your name, email, phone number (if you give it), delivery address, gift message, and what you ordered.</li>
        <li><strong>Payment:</strong> payments are processed by Stripe. We never see or store your full card number.</li>
        <li><strong>Partner accounts:</strong> for shop staff and our team, an email address and a securely hashed password.</li>
      </ul>

      <h2>How we use it</h2>
      <ul>
        <li>To take your payment, fulfill and deliver your order, and send you order and delivery emails.</li>
        <li>To help with questions, refunds and problems with an order.</li>
        <li>To prevent fraud and keep the site secure.</li>
      </ul>
      <p>We don&apos;t sell your information, and we don&apos;t send marketing emails unless you&apos;ve asked for them.</p>

      <h2>Who we share it with</h2>
      <ul>
        <li><strong>The shops you order from</strong> see your name, delivery address, gift message and order, so they can prepare and send it.</li>
        <li><strong>Delivery partners</strong> (our local courier and shipping carriers) receive what they need to deliver.</li>
        <li><strong>Service providers</strong> that run the site for us: Stripe (payments), our email provider, and our hosting and database providers.</li>
        <li>Authorities, when the law requires it.</li>
      </ul>

      <h2>Cookies and storage</h2>
      <p>
        Your cart is saved in your own browser. Partner sign-in uses a single secure cookie. We don&apos;t use advertising or tracking cookies.
      </p>

      <h2>How long we keep it</h2>
      <p>We keep order records as long as needed for accounting, tax and legal purposes, and then delete them.</p>

      <h2>Your choices</h2>
      <p>
        You can ask us for a copy of your information, to correct it, or to delete it (unless we must keep it by law) by emailing{" "}
        <a href={`mailto:${site.supportEmail}`}>{site.supportEmail}</a>.
      </p>
    </PolicyPage>
  );
}
