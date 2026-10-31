"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";

import { useAuth } from "./AuthProvider";
import { PortalApiError, portalErrorMessage } from "../lib/errors";
import {
  EMPTY_SEARCH_GROUPS,
  GLOBAL_SEARCH_DEBOUNCE_MS,
  GLOBAL_SEARCH_EMPTY,
  GLOBAL_SEARCH_LOADING,
  GLOBAL_SEARCH_PLACEHOLDER,
  buildSearchGroups,
  flattenSearchHits,
  merchantsSearchPath,
  normalizeSearchQuery,
  searchHasDirectoryHits,
  usersSearchPath,
  type GlobalSearchGroups,
  type GlobalSearchHit,
} from "../lib/globalSearch";
import { fetchAdminMerchants } from "../lib/merchantsApi";
import { fetchAdminUsers } from "../lib/usersApi";

const GROUP_LABELS = {
  users: "Utilisateurs",
  merchants: "Marchands",
  transactions: "Transactions",
} as const;

export function GlobalSearch() {
  const router = useRouter();
  const { logout } = useAuth();
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const seq = useRef(0);
  const [draft, setDraft] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [groups, setGroups] = useState<GlobalSearchGroups>(EMPTY_SEARCH_GROUPS);
  const [active, setActive] = useState(0);
  const [searched, setSearched] = useState("");

  const query = normalizeSearchQuery(draft);
  const hits = useMemo(() => flattenSearchHits(groups), [groups]);

  useEffect(() => {
    if (!query) {
      seq.current += 1;
      setGroups(EMPTY_SEARCH_GROUPS);
      setLoading(false);
      setError(null);
      setActive(0);
      setSearched("");
      return;
    }
    setOpen(true);
    setLoading(true);
    const handle = window.setTimeout(() => {
      const requestId = ++seq.current;
      void (async () => {
        try {
          const [users, merchants] = await Promise.all([
            fetchAdminUsers(usersSearchPath(query)),
            fetchAdminMerchants(merchantsSearchPath(query)),
          ]);
          if (requestId !== seq.current) {
            return;
          }
          setGroups(buildSearchGroups(query, users.results, merchants.results));
          setError(null);
          setActive(0);
          setSearched(query);
        } catch (err) {
          if (requestId !== seq.current) {
            return;
          }
          if (err instanceof PortalApiError && err.status === 401) {
            logout();
            return;
          }
          setGroups(EMPTY_SEARCH_GROUPS);
          setSearched(query);
          if (err instanceof PortalApiError && err.status === 403) {
            setError("Accès interdit. La recherche est réservée aux administrateurs.");
            return;
          }
          setError(portalErrorMessage(err));
        } finally {
          if (requestId === seq.current) {
            setLoading(false);
          }
        }
      })();
    }, GLOBAL_SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [logout, query]);

  useEffect(() => {
    function onPointer(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, []);

  function close() {
    setOpen(false);
    setActive(0);
  }

  function go(hit: GlobalSearchHit) {
    close();
    setDraft("");
    router.push(hit.href);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      inputRef.current?.blur();
      return;
    }
    if (!open || !hits.length) {
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((value) => (value + 1) % hits.length);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((value) => (value - 1 + hits.length) % hits.length);
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const hit = hits[active];
      if (hit) {
        go(hit);
      }
    }
  }

  const pending = Boolean(query) && (loading || searched !== query);
  const showPanel = open && Boolean(query);
  const emptyDirectory = searched === query && !pending && !error && !searchHasDirectoryHits(groups);

  return (
    <div ref={rootRef} className="relative min-w-0 flex-1">
      <label className="relative block">
        <span className="sr-only">{GLOBAL_SEARCH_PLACEHOLDER}</span>
        <svg
          viewBox="0 0 24 24"
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden
        >
          <circle cx="11" cy="11" r="6.5" />
          <path d="M16 16l4 4" />
        </svg>
        <input
          ref={inputRef}
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            if (query) {
              setOpen(true);
            }
          }}
          onKeyDown={onKeyDown}
          placeholder={GLOBAL_SEARCH_PLACEHOLDER}
          autoComplete="off"
          role="combobox"
          aria-expanded={showPanel}
          aria-controls={listId}
          aria-autocomplete="list"
          className="w-full truncate rounded-lg bg-blue-low py-2 pl-9 pr-3 text-xs text-navy outline-none placeholder:text-muted sm:text-sm"
        />
      </label>
      {showPanel ? (
        <div
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 z-30 mt-1 max-h-[min(24rem,70vh)] overflow-y-auto rounded-xl bg-white py-2 shadow-card"
        >
          {pending ? <p className="px-3 py-2 text-xs text-muted">{GLOBAL_SEARCH_LOADING}</p> : null}
          {!pending && error ? <p className="px-3 py-2 text-xs text-danger">{error}</p> : null}
          {!pending && !error ? (
            <>
              {emptyDirectory ? <p className="px-3 py-2 text-xs text-muted">{GLOBAL_SEARCH_EMPTY}</p> : null}
              {(["users", "merchants", "transactions"] as const).map((category) => {
                const rows = groups[category];
                if (!rows.length) {
                  return null;
                }
                return (
                  <section key={category} className="px-1 py-1">
                    <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted">
                      {GROUP_LABELS[category]}
                    </p>
                    <ul>
                      {rows.map((hit) => {
                        const index = hits.findIndex((item) => item.key === hit.key);
                        const selected = index === active;
                        return (
                          <li key={hit.key}>
                            <Link
                              href={hit.href}
                              role="option"
                              aria-selected={selected}
                              onMouseEnter={() => setActive(index)}
                              onClick={(event) => {
                                event.preventDefault();
                                go(hit);
                              }}
                              className={`block rounded-lg px-3 py-2 ${selected ? "bg-blue-low" : "hover:bg-blue-low"}`}
                            >
                              <p className="truncate text-sm font-semibold text-navy">{hit.title}</p>
                              <p className="truncate text-[11px] text-muted">{hit.subtitle}</p>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                );
              })}
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
