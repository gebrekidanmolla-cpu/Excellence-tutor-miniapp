import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ArrowDown, ArrowUpRight, Check, FileText, Lock, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { CopyButton } from "@/components/shared/CopyButton";
import { ethiopic, fraunces } from "@/lib/fonts";
import { legalCertificateHref, type LegalCertificate } from "@/lib/legal-certificates";
import { getCurrentTutor } from "@/lib/session";
import { cn } from "@/lib/utils";

/*
 * Signed-in tutors only, so there is nothing here for a search engine. Not
 * blocked in robots.txt either: the footer links here from every public
 * page, and the redirect to `/login` is what keeps it out of the index (the
 * same reasoning as `/jobs`, see `robots.ts`).
 */
export const metadata: Metadata = {
  title: "License & legality",
  description:
    "Excellence Tutor's commercial registration, trade name registration and business license, issued by the Addis Ababa City Administration Trade Bureau.",
  robots: { index: false, follow: false },
};

/* =========================================================
   PARTICULARS — transcribed from the two certificates the
   Addis Ababa City Administration Trade Bureau issued in
   September 2026. Their own dates are Ethiopian calendar
   (day/month/year); the Gregorian dates are the ones printed
   beside them. The owner's photograph, phone number and
   house number are left out of this transcription; they
   stay on the originals, which each card links to
   (`src/lib/legal-certificates.ts`).
========================================================= */

const TIN = "0103025456";
const REGISTRATION_NO = "AACATB/1/0293051/2019";
const LICENSE_NO = "AACATB/14/707/50592534/2019";
const OWNER = "Alazer Gebrekidan Molla";
const TRADE_NAME = "Excellence Tutor";
const TRADE_NAME_AM = "ኤክሰለንስ ቲቶር";
const AUTHORITY = "Addis Ababa City Administration Trade Bureau";
const AUTHORITY_AM = "በአዲስ አበባ ከተማ አስተዳደር ንግድ ቢሮ";
const PROCLAMATION = "Proclamation No. 980/2016";

/**
 * Where the QR code printed on the commercial registration certificate
 * points: the government's eTrade license checker, looked up by TIN.
 */
const ETRADE_CHECKER_URL = `https://etrade.gov.et/business-license-checker?tin=${TIN}`;

type Particular = {
  label: string;
  value: string;
  /** The same value in Amharic, shown beside it. */
  am?: string;
  /** A registration number: set in mono, with a copy button. */
  code?: boolean;
};

type Certificate = {
  /** Also names the original PDF, served by `/api/legal/[certificate]`. */
  id: LegalCertificate;
  title: string;
  titleAm: string;
  purpose: string;
  particulars: Particular[];
  issued: { iso: string; gregorian: string; ethiopian: string };
};

const CERTIFICATES: Certificate[] = [
  {
    id: "commercial-registration",
    title: "Commercial Registration Certificate",
    titleAm: "የንግድ ምዝገባ ምስክር ወረቀት",
    purpose: "Enters the business in the commercial register.",
    particulars: [
      { label: "Principal registration no.", value: REGISTRATION_NO, code: true },
      { label: "Taxpayer ID (TIN)", value: TIN, code: true },
      { label: "Owner", value: OWNER },
      { label: "General manager", value: OWNER },
      { label: "Nationality", value: "Ethiopian" },
      {
        label: "Registered activity",
        value: "Community, social and personal services (category 9)",
      },
      { label: "Registered capital", value: "ETB 60,000.00" },
    ],
    issued: {
      iso: "2026-09-21",
      gregorian: "21 September 2026",
      ethiopian: "11 Meskerem 2019 E.C.",
    },
  },
  {
    id: "trade-name-registration",
    title: "Trade Name Registration Certificate",
    titleAm: "የንግድ ስም ምስክር ወረቀት",
    purpose:
      "Registers “Excellence Tutor” as the name the business trades under, and records its business license.",
    particulars: [
      { label: "Trade name", value: TRADE_NAME, am: TRADE_NAME_AM },
      { label: "Trade name registration no.", value: REGISTRATION_NO, code: true },
      { label: "Business license no.", value: LICENSE_NO, code: true },
      {
        label: "Field of business",
        value: "Short-term technical education and training services (TVET)",
      },
      { label: "Manager", value: OWNER },
    ],
    issued: {
      iso: "2026-09-25",
      gregorian: "25 September 2026",
      ethiopian: "15 Meskerem 2019 E.C.",
    },
  },
];

const STANDING = [
  { label: "Commercial registration", status: "Registered", detail: REGISTRATION_NO, code: true },
  { label: "Trade name registration", status: "Registered", detail: TRADE_NAME, am: TRADE_NAME_AM },
  { label: "Business license", status: "Issued", detail: LICENSE_NO, code: true },
];

/**
 * License & legality: the agency's registration particulars, for tutors
 * deciding whether to trust it with their documents and their time.
 *
 * Requests without a session cookie never reach this page: `next.config.ts`
 * redirects them to `/login?next=/legal` in the routing layer, so a footer
 * click from the landing page costs no function invocation.
 */
export default async function LegalPage() {
  const tutor = await getCurrentTutor();

  /* A cookie that no longer checks out (expired, or from before a password
     reset) gets past the routing-layer redirect, so it is caught here. */
  if (!tutor) {
    redirect("/login?next=/legal");
  }

  return (
    <>
      <PublicHeader tutor={{ fullName: tutor.fullName }} />

      <main className={cn(fraunces.variable, "flex-1 overflow-x-clip")}>
        <Overview />
        <Certificates />
        <BasisAndVerification />
      </main>

      <PublicFooter />
    </>
  );
}

/* =========================================================
   SHARED
========================================================= */

const container = "mx-auto w-full max-w-7xl px-5 sm:px-8";

/** Section marker: a Ge'ez numeral beside a short label, as on the landing page. */
function Marker({ numeral, children }: { numeral: string; children: React.ReactNode }) {
  return (
    <p className="flex items-baseline gap-3 text-[0.8125rem] font-medium text-muted-foreground">
      <span
        aria-hidden="true"
        className={cn(ethiopic.className, "text-xl leading-none text-highlight")}
      >
        {numeral}
      </span>
      <span aria-hidden="true" className="h-px w-8 self-center bg-foreground/20" />
      {children}
    </p>
  );
}

function Amharic({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span lang="am" className={cn(ethiopic.className, className)}>
      {children}
    </span>
  );
}

/**
 * One label/value pair. `row` puts the label beside the value from `sm` up,
 * which the certificate cards have room for; `stack` keeps it above, for
 * narrow columns where a long registration number would otherwise wrap.
 */
function Field({
  label,
  value,
  am,
  code,
  layout = "row",
}: Particular & { layout?: "row" | "stack" }) {
  return (
    <div
      className={cn(
        "border-t border-foreground/10 py-3",
        layout === "row" && "sm:grid sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-4"
      )}
    >
      <dt className="text-[0.8125rem] text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "mt-1 flex min-w-0 items-start justify-between gap-3",
          layout === "row" && "sm:mt-0"
        )}
      >
        <span
          className={cn(
            "min-w-0 text-sm font-medium wrap-anywhere",
            code && "font-mono tracking-tight tabular-nums"
          )}
        >
          {value}
          {am ? (
            <Amharic className="ml-2 font-normal text-muted-foreground">{am}</Amharic>
          ) : null}
        </span>

        {code ? (
          <CopyButton
            value={value}
            variant="ghost"
            size="icon-sm"
            aria-label={`Copy ${label}`}
            successMessage={`${label} copied`}
            className="-my-1 shrink-0 text-muted-foreground"
          />
        ) : null}
      </dd>
    </div>
  );
}

function ExternalArrow() {
  return (
    <ArrowUpRight
      aria-hidden="true"
      className="size-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
    />
  );
}

const inkButton =
  "group inline-flex h-12 items-center justify-center gap-2.5 rounded-md bg-foreground px-6 text-[0.9375rem] font-medium text-background transition-colors duration-300 hover:bg-primary focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none";

/* =========================================================
   OVERVIEW
========================================================= */

function Overview() {
  return (
    <section className="border-b bg-paper">
      <div className={cn(container, "grid gap-12 py-14 sm:py-20 lg:grid-cols-12 lg:py-24")}>
        <div className="lg:col-span-7 lg:pr-6">
          <p className="flex items-center gap-3 text-[0.8125rem] font-medium text-muted-foreground">
            <span aria-hidden="true" className="h-px w-8 bg-highlight" />
            Legal
          </p>

          <h1 className="mt-6 font-display text-[clamp(2.5rem,6vw,4.75rem)] leading-[0.98] font-light text-balance">
            License &amp; legality
          </h1>

          <p className="mt-7 max-w-xl text-lg leading-8 text-pretty text-foreground/70">
            Excellence Tutor is a registered business, licensed by the{" "}
            {AUTHORITY} under Ethiopian commercial law. The particulars below
            are taken from its certificates, so you know exactly who you are
            working with.
          </p>

          <div className="mt-9 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-8">
            <a
              href={ETRADE_CHECKER_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={inkButton}
            >
              Verify on eTrade
              <span className="sr-only">(opens etrade.gov.et in a new tab)</span>
              <ExternalArrow />
            </a>

            <a
              href="#certificates"
              className="group inline-flex items-center justify-center gap-2 text-[0.9375rem] font-medium"
            >
              <span className="bg-[linear-gradient(currentColor,currentColor)] bg-size-[0%_1px] bg-bottom-left bg-no-repeat pb-0.5 transition-[background-size] duration-500 group-hover:bg-size-[100%_1px]">
                View the certificates
              </span>
              <ArrowDown
                aria-hidden="true"
                className="size-4 text-muted-foreground transition-transform duration-300 group-hover:translate-y-0.5"
              />
            </a>
          </div>

          <p className="mt-12 flex items-center gap-2 text-sm text-muted-foreground">
            <Lock aria-hidden="true" className="size-4 shrink-0" />
            Shown only to signed-in tutors.
          </p>
        </div>

        <div className="lg:col-span-5">
          <div className="rounded-xl bg-card p-5 shadow-[0_18px_40px_-28px_color-mix(in_oklch,var(--shade)_55%,transparent)] ring-1 ring-foreground/10 sm:p-6">
            <div className="flex items-start gap-3 pb-4">
              <span
                aria-hidden="true"
                className="flex size-10 shrink-0 items-center justify-center rounded-full bg-success/10 text-success-strong"
              >
                <ShieldCheck className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="font-medium">Registered and licensed</p>
                <p className="mt-0.5 text-[0.8125rem] leading-5 text-muted-foreground">
                  {AUTHORITY}
                </p>
              </div>
            </div>

            <dl>
              <Field label="Trade name" value={TRADE_NAME} am={TRADE_NAME_AM} layout="stack" />
              <Field label="Taxpayer ID (TIN)" value={TIN} code layout="stack" />
              <Field label="Business license no." value={LICENSE_NO} code layout="stack" />
              <Field label="Registered since" value="21 September 2026" layout="stack" />
            </dl>
          </div>
        </div>
      </div>
    </section>
  );
}

/* =========================================================
   CERTIFICATES
========================================================= */

function Certificates() {
  return (
    <section id="certificates" className="scroll-mt-16 border-b">
      <div className={cn(container, "py-16 sm:py-24")}>
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-6">
            <Marker numeral="፩">Certificates</Marker>
            <h2 className="mt-6 font-display text-[clamp(2rem,3.6vw,3rem)] leading-[1.04] font-light text-balance">
              Certificates of registration
            </h2>
          </div>

          <p className="max-w-md leading-7 text-foreground/70 lg:col-span-5 lg:col-start-8 lg:self-end">
            Both were issued in Addis Ababa under {PROCLAMATION}. Each date is
            given as printed: the Gregorian date, with the Ethiopian calendar
            date beside it. Open either original to see the stamped
            certificate as issued.
          </p>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          {CERTIFICATES.map((certificate, index) => (
            <CertificateCard key={certificate.id} certificate={certificate} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}

function CertificateCard({
  certificate,
  index,
}: {
  certificate: Certificate;
  index: number;
}) {
  const headingId = `${certificate.id}-title`;

  return (
    <article
      aria-labelledby={headingId}
      className="flex flex-col overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10"
    >
      <header className="flex items-start justify-between gap-4 border-b px-5 py-3.5 sm:px-6">
        <div className="min-w-0 text-xs leading-5 text-muted-foreground">
          <p>{AUTHORITY}</p>
          <p>
            <Amharic>{AUTHORITY_AM}</Amharic>
          </p>
        </div>
        <span className="font-mono text-xs text-muted-foreground tabular-nums">
          {String(index + 1).padStart(2, "0")}
        </span>
      </header>

      <div className="px-5 pt-6 sm:px-6">
        <h3
          id={headingId}
          className="font-display text-[1.75rem] leading-tight font-light text-balance"
        >
          {certificate.title}
        </h3>
        <p className="mt-1.5 text-base text-muted-foreground">
          <Amharic>{certificate.titleAm}</Amharic>
        </p>
        <p className="mt-4 text-sm leading-6 text-foreground/70">{certificate.purpose}</p>
      </div>

      <dl className="mt-5 mb-2 px-5 sm:px-6">
        {certificate.particulars.map((particular) => (
          <Field key={particular.label} {...particular} />
        ))}
      </dl>

      <footer className="mt-auto flex flex-col gap-4 border-t bg-paper px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="text-xs leading-5 text-muted-foreground">
          <p>Issued in Addis Ababa</p>
          <p>
            <time dateTime={certificate.issued.iso} className="font-medium text-foreground">
              {certificate.issued.gregorian}
            </time>
            <span aria-hidden="true"> · </span>
            <span className="sr-only">, </span>
            {certificate.issued.ethiopian}
          </p>
        </div>

        <Button
          render={
            <a
              href={legalCertificateHref(certificate.id)}
              target="_blank"
              rel="noopener noreferrer"
            />
          }
          variant="outline"
          size="lg"
          className="group shrink-0 self-start sm:self-auto"
        >
          <FileText data-icon="inline-start" aria-hidden="true" />
          View original
          <span className="sr-only">
            {certificate.title} (PDF, opens in a new tab)
          </span>
          <ExternalArrow />
        </Button>
      </footer>
    </article>
  );
}

/* =========================================================
   LEGAL BASIS + VERIFICATION
========================================================= */

function BasisAndVerification() {
  return (
    /* The footer is on paper too; the rule keeps the two apart. */
    <section className="border-b bg-paper">
      <div className={cn(container, "grid gap-16 py-16 sm:py-24 lg:grid-cols-12 lg:gap-12")}>
        <div className="lg:col-span-6">
          <Marker numeral="፪">Legal basis</Marker>
          <h2 className="mt-6 font-display text-[clamp(2rem,3.6vw,3rem)] leading-[1.04] font-light text-balance">
            Registered and licensed under Ethiopian commercial law.
          </h2>
          <p className="mt-6 max-w-lg leading-7 text-pretty text-foreground/70">
            Commercial registration, trade names and business licenses in
            Ethiopia are governed by the Commercial Registration and Business
            Licensing {PROCLAMATION}{" "}
            <span className="whitespace-nowrap">(980/2008 E.C.)</span>. Both
            certificates were issued under it, and together they record three
            things.
          </p>

          <ul className="mt-8 border-t border-foreground/15">
            {STANDING.map((item) => (
              <li
                key={item.label}
                className="flex items-start gap-4 border-b border-foreground/15 py-4"
              >
                <Check aria-hidden="true" className="mt-1 size-4 shrink-0 text-success-strong" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{item.label}</p>
                  <p
                    className={cn(
                      "mt-0.5 text-sm text-muted-foreground wrap-anywhere",
                      item.code && "font-mono tracking-tight"
                    )}
                  >
                    {item.detail}
                    {item.am ? <Amharic className="ml-2">{item.am}</Amharic> : null}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success-strong">
                  {item.status}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="lg:col-span-5 lg:col-start-8">
          <Marker numeral="፫">Verification</Marker>
          <h2 className="mt-6 font-display text-[clamp(2rem,3.6vw,3rem)] leading-[1.04] font-light text-balance">
            Check it with the government.
          </h2>
          <p className="mt-6 leading-7 text-pretty text-foreground/70">
            The QR code on the commercial registration certificate opens the
            government&rsquo;s eTrade registration and licensing system, which
            looks a business up by its taxpayer ID. The button below opens the
            same record.
          </p>

          <a
            href={ETRADE_CHECKER_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(inkButton, "mt-8")}
          >
            Open the eTrade license checker
            <span className="sr-only">(opens etrade.gov.et in a new tab)</span>
            <ExternalArrow />
          </a>

          <p className="mt-8 text-sm leading-6 text-muted-foreground">
            You can also quote either number below to the {AUTHORITY}.
          </p>
          <dl className="mt-3">
            <Field label="Taxpayer ID (TIN)" value={TIN} code layout="stack" />
            <Field label="Principal registration no." value={REGISTRATION_NO} code layout="stack" />
          </dl>
        </div>
      </div>

      <div className={cn(container, "pb-16 sm:pb-20")}>
        <p className="max-w-3xl border-t border-foreground/15 pt-6 text-xs leading-5 text-muted-foreground">
          The particulars on this page are transcribed from the original
          certificates. Where they differ, the originals, available from each
          card above, prevail.
        </p>
      </div>
    </section>
  );
}
