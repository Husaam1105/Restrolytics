import { canonical } from "@/lib/seo";
import { createFileRoute } from "@tanstack/react-router";

import { LegalPage, LegalSection } from "@/components/marketing/legal-page";

export const Route = createFileRoute("/privacy")({
  component: PrivacyPage,
  head: () => ({
    meta: [
      { title: "Privacy policy · Restrolytics" },
      {
        name: "description",
        content:
          "What data Restrolytics collects, why, where it's stored and how to get it deleted.",
      },
    ],
    links: canonical("/privacy"),
  }),
});

function PrivacyPage() {
  return (
    <LegalPage title="Privacy policy" updated="October 23, 2026">
      <LegalSection title="The short version">
        <p>
          Restrolytics stores your restaurant's operating data so you and your team can use it. We
          don't sell it, we don't use it for advertising, and each restaurant's data is kept
          separate from every other restaurant's.
        </p>
      </LegalSection>

      <LegalSection title="What we collect">
        <ul>
          <li>Account details: name, email or staff username, and your role in each restaurant.</li>
          <li>
            Restaurant data you add or import: sales and delivery-app reports, inventory, vendors
            and invoices, schedules, clock-ins, checklists and photos, payroll and tips.
          </li>
          <li>Messages you write in IQ Copilot and to your Restrolytics manager.</li>
          <li>Details you send us through the contact form or by email.</li>
        </ul>
      </LegalSection>

      <LegalSection title="How we use it">
        <ul>
          <li>
            To run the service: show your reports, calculate payroll, and keep your team's work in
            sync.
          </li>
          <li>
            To answer IQ Copilot questions, using only the data your account is allowed to see.
          </li>
          <li>To support you, and to keep the service secure and working.</li>
        </ul>
        <p>We don't sell personal data and we don't share it with advertisers.</p>
      </LegalSection>

      <LegalSection title="Who sees what">
        <p>
          Owners and managers see their restaurant's sales, costs and team pay. Staff see only their
          own hours, pay, schedule and tasks. These rules are enforced in the database, not only in
          the app. Restrolytics support staff can see a restaurant's data when helping that
          restaurant.
        </p>
      </LegalSection>

      <LegalSection title="Service providers">
        <p>We use a small number of providers to run Restrolytics:</p>
        <ul>
          <li>Supabase, for the database, sign-in and file storage.</li>
          <li>Our hosting provider, to serve the website and app.</li>
          <li>
            An AI model provider, only when IQ Copilot or the invoice reader is used. The question
            and the relevant restaurant data are sent to answer it.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="Cookies and local storage">
        <p>
          We keep your sign-in session and your light or dark theme choice in your browser's local
          storage. We don't use advertising or cross-site tracking cookies.
        </p>
      </LegalSection>

      <LegalSection title="How long we keep it">
        <p>
          We keep restaurant data while the restaurant has an active account. When an account
          closes, we delete its data within 90 days unless the law requires us to keep part of it
          longer, for example payroll records.
        </p>
      </LegalSection>

      <LegalSection title="Your choices">
        <p>
          You can ask for a copy of your data, ask us to correct it, or ask us to delete it. Staff
          can update their own contact details in the app. Email{" "}
          <a href="mailto:hello@restrolytics.com">hello@restrolytics.com</a> for anything else and
          we'll reply within 30 days.
        </p>
      </LegalSection>

      <LegalSection title="Changes">
        <p>
          If we change this policy in a way that matters, we'll tell account owners by email before
          it takes effect.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
