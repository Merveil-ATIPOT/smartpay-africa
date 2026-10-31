"use client";

import Link from "next/link";

import {
  HELP_DEMO_NOTE,
  HELP_FAQ,
  HELP_GUIDES,
  HELP_REGTEST_BADGE,
  HELP_SECURITY_NOTE,
  HELP_SUBTITLE,
  HELP_TITLE,
  HELP_UNAVAILABLE_SUPPORT,
} from "../../lib/helpDirectory";

function UnavailableBadge() {
  return <span className="rounded-full bg-blue-low px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted">Indisponible</span>;
}

export function HelpView() {
  return (
    <div className="mx-auto max-w-[1280px] overflow-x-hidden">
      <div className="mb-4 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-display text-xl font-semibold text-navy">{HELP_TITLE}</h1>
          <span className="rounded-full bg-[#FFDCBF] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#6B3B00]">
            {HELP_REGTEST_BADGE}
          </span>
        </div>
        <p className="mt-1 text-sm text-muted">{HELP_SUBTITLE}</p>
        <p className="mt-1 text-xs text-muted">{HELP_DEMO_NOTE}</p>
      </div>

      <section className="mb-4">
        <h2 className="mb-3 font-display text-base font-semibold text-navy">Centre d&apos;aide</h2>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {HELP_GUIDES.map((guide) => (
            <article key={guide.id} className="flex min-w-0 flex-col rounded-xl bg-white p-4 shadow-card">
              <h3 className="font-display text-sm font-semibold text-navy">{guide.title}</h3>
              <p className="mt-2 flex-1 text-sm text-muted">{guide.body}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {guide.actions.map((action) => (
                  <Link
                    key={action.href}
                    href={action.href}
                    className="inline-flex min-h-8 items-center rounded-lg bg-navy px-3 py-1.5 text-xs font-semibold text-white"
                  >
                    {action.label}
                  </Link>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mb-4 rounded-xl bg-white p-4 shadow-card">
        <h2 className="font-display text-base font-semibold text-navy">FAQ administrateur</h2>
        <p className="mt-1 text-[11px] text-muted">Réponses limitées au fonctionnement actuel du laboratoire Regtest.</p>
        <div className="mt-3 space-y-2">
          {HELP_FAQ.map((item) => (
            <details key={item.id} className="rounded-lg bg-blue-low px-3 py-2">
              <summary className="cursor-pointer text-sm font-semibold text-navy">{item.question}</summary>
              <p className="mt-2 text-sm text-muted">{item.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="mb-4 rounded-xl bg-white p-4 shadow-card">
        <h2 className="font-display text-base font-semibold text-navy">Demandes d&apos;assistance et signalements</h2>
        <p className="mt-1 text-[11px] text-muted">Aucun backend de ticket. Aucun contact, incident ou statistique n&apos;est inventé.</p>
        <ul className="mt-3 space-y-2">
          {HELP_UNAVAILABLE_SUPPORT.map((item) => (
            <li key={item.id} className="flex flex-col gap-1 rounded-lg bg-blue-low px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-medium text-navy">{item.label}</p>
                <p className="text-[11px] text-muted">{item.note}</p>
              </div>
              <UnavailableBadge />
            </li>
          ))}
        </ul>
      </section>

      <p className="text-[11px] text-muted">{HELP_SECURITY_NOTE}</p>
    </div>
  );
}
