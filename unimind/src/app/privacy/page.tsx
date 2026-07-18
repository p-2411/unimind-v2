import Link from "next/link";
import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — Mastify",
};

const CONTACT = "arnavgupta09au@gmail.com";
const EFFECTIVE = "15 July 2026";

export default function PrivacyPage() {
  return (
    <div className="min-h-svh bg-[#0d0f17] text-[#dce1ea]">
      <div className="mx-auto max-w-2xl px-6 py-16">

        {/* Header */}
        <div className="mb-12">
          <Link
            href="/"
            className="mb-8 inline-block font-mono text-[11px] uppercase tracking-[0.24em] text-[#7cff6b]"
          >
            Mastify
          </Link>
          <h1 className="mt-4 font-mono text-[32px] font-semibold leading-tight tracking-tight">
            Privacy Policy
          </h1>
          <p className="mt-2 font-mono text-[12px] text-[#5a6474]">
            Effective {EFFECTIVE}
          </p>
        </div>

        <div className="space-y-10 font-sans text-[15px] leading-relaxed text-[#9aa3b2]">

          <section>
            <p>
              Mastify is a study tool that helps computer science students practice course material
              through spaced-repetition flashcards and exam-style problems. This policy explains
              what data we collect, why we collect it, and how it is handled.
            </p>
          </section>

          <section>
            <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.24em] text-[#5a6474]">
              1. What we collect
            </h2>
            <ul className="space-y-2 pl-4">
              <li><span className="text-[#dce1ea]">Account data</span> — your name and email address, provided when you sign up.</li>
              <li><span className="text-[#dce1ea]">Study activity</span> — your answers to practice questions, timestamps, and self-assessment ratings on exam problems.</li>
              <li><span className="text-[#dce1ea]">Progress data</span> — XP, level, streak, and per-topic mastery scores derived from your activity.</li>
              <li><span className="text-[#dce1ea]">Session data</span> — a session token stored in your browser to keep you logged in.</li>
            </ul>
            <p className="mt-3">
              We do not collect payment information, location data, or any data from the websites
              you visit beyond what is needed to operate the Chrome extension (see below).
            </p>
          </section>

          <section>
            <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.24em] text-[#5a6474]">
              2. Chrome extension
            </h2>
            <p>
              The Mastify browser extension blocks distracting websites and shows a flashcard
              before granting access. The extension:
            </p>
            <ul className="mt-2 space-y-2 pl-4">
              <li>Reads the hostname of the page you visit to determine if it is on your blocked list.</li>
              <li>Stores your blocked-site list and session token in Chrome local storage — this data never leaves your device except to communicate with <span className="font-mono text-[#dce1ea]">mastify.app</span>.</li>
              <li>Does <span className="text-[#dce1ea]">not</span> read page content, track browsing history, or send data to any third party.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.24em] text-[#5a6474]">
              3. How we use your data
            </h2>
            <ul className="space-y-2 pl-4">
              <li>To operate the app — schedule questions, track mastery, and display your progress.</li>
              <li>To send transactional emails — password reset and account-related notifications only. We do not send marketing email.</li>
              <li>To diagnose errors — unhandled runtime errors are emailed to the developer to help fix bugs.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.24em] text-[#5a6474]">
              4. Third-party services
            </h2>
            <p>We use the following sub-processors:</p>
            <ul className="mt-2 space-y-2 pl-4">
              <li><span className="text-[#dce1ea]">Neon</span> — Postgres database hosting (your data at rest).</li>
              <li><span className="text-[#dce1ea]">Vercel</span> — web app hosting and edge infrastructure.</li>
              <li><span className="text-[#dce1ea]">Resend</span> — transactional email delivery.</li>
            </ul>
            <p className="mt-3">
              No data is sold or shared with advertisers or data brokers.
            </p>
          </section>

          <section>
            <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.24em] text-[#5a6474]">
              5. Data retention and deletion
            </h2>
            <p>
              Your data is kept for as long as your account is active. You can delete your account
              at any time from the Settings page — this permanently removes your account, all study
              history, and progress data. Backups may retain data for up to 30 days after deletion.
            </p>
          </section>

          <section>
            <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.24em] text-[#5a6474]">
              6. Security
            </h2>
            <p>
              Passwords are hashed and never stored in plaintext. All data in transit is encrypted
              via HTTPS. Session tokens are stored in HTTP-only cookies where possible.
            </p>
          </section>

          <section>
            <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.24em] text-[#5a6474]">
              7. Children
            </h2>
            <p>
              Mastify is intended for university students (18+). We do not knowingly collect data
              from anyone under 13.
            </p>
          </section>

          <section>
            <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.24em] text-[#5a6474]">
              8. Changes to this policy
            </h2>
            <p>
              If we make material changes, we will update the effective date at the top of this
              page. Continued use of Mastify after changes are posted constitutes acceptance.
            </p>
          </section>

          <section>
            <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.24em] text-[#5a6474]">
              9. Contact
            </h2>
            <p>
              Questions or requests (access, correction, deletion):{" "}
              <a
                href={`mailto:${CONTACT}`}
                className="font-mono text-[#7cff6b] underline underline-offset-2 hover:text-[#a0ff93]"
              >
                {CONTACT}
              </a>
            </p>
          </section>

        </div>

        <div className="mt-16 border-t border-[#1c2029] pt-8">
          <Link
            href="/"
            className="font-mono text-[11px] text-[#5a6474] transition-colors hover:text-[#9aa3b2]"
          >
            ← Back to Mastify
          </Link>
        </div>

      </div>
    </div>
  );
}
