"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { portalDisplayName, portalRoleLabel } from "../lib/adminGate";
import { ADMIN_HOME_HREF, ADMIN_NAV_GROUPS, isNavItemActive } from "../lib/nav";
import { useAuth } from "./AuthProvider";
import { GlobalSearch } from "./GlobalSearch";

function NavIcon({ id }: { id: string }) {
  const common = "h-[18px] w-[18px] shrink-0";
  switch (id) {
    case "w02":
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
        </svg>
      );
    case "w07":
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <path d="M7 3h8l4 4v14H7z" />
          <path d="M15 3v5h5M9 13h6M9 17h4" />
        </svg>
      );
    case "w08":
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
        </svg>
      );
    case "w03":
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <circle cx="9" cy="8" r="3" />
          <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
          <circle cx="17" cy="9" r="2.2" />
          <path d="M16 19a4.2 4.2 0 0 1 4.5-3.8" />
        </svg>
      );
    case "w05":
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <path d="M4 10h16l-1 10H5z" />
          <path d="M8 10V7a4 4 0 0 1 8 0v3" />
        </svg>
      );
    case "w09":
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <circle cx="12" cy="12" r="2.2" />
          <circle cx="5" cy="7" r="1.8" />
          <circle cx="19" cy="7" r="1.8" />
          <circle cx="5" cy="17" r="1.8" />
          <circle cx="19" cy="17" r="1.8" />
          <path d="M7 8l3.2 2.6M17 8l-3.2 2.6M7 16l3.2-2.6M17 16l-3.2-2.6" />
        </svg>
      );
    case "audit":
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <path d="M12 3 5 6v6c0 4.2 2.8 7.4 7 8.5 4.2-1.1 7-4.3 7-8.5V6z" />
        </svg>
      );
    case "settings":
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <circle cx="12" cy="12" r="3" />
          <path d="M12 3v2.2M12 18.8V21M4.9 6.5l1.6 1.6M17.5 15.9l1.6 1.6M3 12h2.2M18.8 12H21M4.9 17.5l1.6-1.6M17.5 8.1l1.6-1.6" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <circle cx="12" cy="12" r="8" />
          <path d="M12 8v5M12 16.5v.5" />
        </svg>
      );
  }
}

function NavGroups({ pathname, onNavigate }: { pathname: string; onNavigate: () => void }) {
  return (
    <nav className="flex flex-1 flex-col gap-4 overflow-y-auto px-3 py-2">
      {ADMIN_NAV_GROUPS.map((group) => (
        <div key={group.id}>
          <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-gray-400">{group.title}</p>
          <ul className="flex flex-col gap-0.5">
            {group.items.map((item) => {
              const active = isNavItemActive(item, pathname);
              const rowClass = "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[13px] leading-4 transition-colors";
              return (
                <li key={item.id}>
                  {item.available && item.href ? (
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={`${rowClass} ${
                        active
                          ? "bg-navy-mid font-semibold text-white"
                          : "text-gray-300 hover:bg-navy-mid hover:text-white"
                      }`}
                    >
                      <NavIcon id={item.id} />
                      <span className="min-w-0 flex-1 leading-4">{item.label}</span>
                    </Link>
                  ) : (
                    <button
                      type="button"
                      disabled
                      aria-disabled="true"
                      title={item.note}
                      className={`${rowClass} text-left text-gray-500`}
                    >
                      <NavIcon id={item.id} />
                      <span className="min-w-0 flex-1 leading-4">{item.label}</span>
                      <span className="shrink-0 rounded-full bg-[#111827] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-gray-400">
                        Indisponible
                      </span>
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function AdminShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const name = user ? portalDisplayName(user) : "";
  const role = user ? portalRoleLabel(user.role) : "";

  return (
    <div className="min-h-screen bg-surface text-navy">
      {open ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-navy-deep/60 lg:hidden"
          aria-label="Fermer le menu"
          onClick={() => setOpen(false)}
        />
      ) : null}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col bg-navy-deep text-white shadow-[0_1px_8px_rgba(0,0,0,0.04)] transition-transform lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center gap-2 px-6 pb-4 pt-6">
          <Link href={ADMIN_HOME_HREF} className="flex min-w-0 items-center gap-2" onClick={() => setOpen(false)}>
            <img
              src="/Logo_SmartPay_Africa.png"
              alt=""
              width={40}
              height={40}
              className="h-10 w-10 shrink-0 rounded-lg object-contain"
            />
            <span className="flex min-w-0 flex-col">
              <span className="truncate font-display text-lg font-bold leading-5 tracking-tight text-white">SmartPay</span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#FFDCBF]">Africa Admin</span>
            </span>
          </Link>
        </div>
        <div className="mx-4 mb-4 flex items-center justify-between rounded-lg bg-navy-mid px-2 py-1.5">
          <span className="text-[11px] font-semibold text-white">Environnement Regtest</span>
          <span className="rounded-full bg-navy-deep px-1.5 py-0.5 text-[10px] font-semibold uppercase text-[#FFDCBF]">
            Sandbox
          </span>
        </div>
        <NavGroups pathname={pathname} onNavigate={() => setOpen(false)} />
        <div className="mx-4 mb-4 rounded-xl bg-navy-mid p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#FFDCBF]">Regtest Network</p>
          <p className="mt-1 text-xs text-gray-400">Dakar Bitcoin Hack 2026 Sandbox</p>
        </div>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-line bg-surface/80 px-4 backdrop-blur-xl sm:px-6">
          <button
            type="button"
            className="rounded-lg border border-line px-2.5 py-1.5 text-sm lg:hidden"
            onClick={() => setOpen(true)}
          >
            Menu
          </button>
          <img
            src="/Logo_SmartPay_Africa.png"
            alt="SmartPay Africa"
            width={36}
            height={36}
            className="hidden h-9 w-9 rounded-lg object-contain sm:block"
          />
          <GlobalSearch />
          <div className="hidden items-center gap-2 lg:flex">
            <span className="whitespace-nowrap rounded-full bg-blue-low px-2.5 py-1.5 text-[11px] font-semibold text-navy">
              Environnement Regtest
            </span>
            <span className="whitespace-nowrap rounded-full bg-[#FFDCBF] px-2.5 py-1.5 text-[11px] font-semibold text-[#6B3B00]">
              Mode Démonstration Regtest
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <div className="hidden text-right sm:block">
              <p className="max-w-[9rem] truncate text-xs font-semibold leading-4 xl:max-w-none">{name}</p>
              <p className="text-[10px] uppercase tracking-wide text-muted">{role}</p>
            </div>
            <button type="button" onClick={logout} className="rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-danger sm:text-sm">
              Déconnexion
            </button>
          </div>
        </header>
        <div className="overflow-x-hidden px-4 py-6 sm:px-6">{children}</div>
      </div>
    </div>
  );
}
