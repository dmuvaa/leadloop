"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, type ReactNode } from "react";
import type { Email, Prospect, Search } from "@/lib/schemas";

/**
 * Client-side persistence. LeadLoop is a single-user app, so everything lives
 * in localStorage. The shape mirrors what a `searches` / `prospects` table
 * would look like if persistence were moved server-side later.
 */

const STORAGE_KEY = "leadloop.v1";

type State = {
  hydrated: boolean;
  searches: Search[];
  prospects: Record<string, Prospect>;
};

type Action =
  | { type: "hydrate"; state: Omit<State, "hydrated"> }
  | { type: "addSearch"; search: Search }
  | { type: "upsertProspect"; prospect: Prospect }
  | { type: "patchProspect"; id: string; patch: Partial<Prospect> }
  | { type: "addEmail"; id: string; email: Email }
  | { type: "clearAll" };

const initial: State = { hydrated: false, searches: [], prospects: {} };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "hydrate":
      return { ...action.state, hydrated: true };
    case "addSearch":
      return { ...state, searches: [action.search, ...state.searches.filter((s) => s.id !== action.search.id)] };
    case "upsertProspect": {
      const p = action.prospect;
      const searches = state.searches.map((s) =>
        s.id === p.searchId && !s.prospectIds.includes(p.id) ? { ...s, prospectIds: [...s.prospectIds, p.id] } : s
      );
      return { ...state, searches, prospects: { ...state.prospects, [p.id]: p } };
    }
    case "patchProspect": {
      const existing = state.prospects[action.id];
      if (!existing) return state;
      return { ...state, prospects: { ...state.prospects, [action.id]: { ...existing, ...action.patch } } };
    }
    case "addEmail": {
      const existing = state.prospects[action.id];
      if (!existing) return state;
      return {
        ...state,
        prospects: { ...state.prospects, [action.id]: { ...existing, emails: [action.email, ...existing.emails] } },
      };
    }
    case "clearAll":
      return { ...initial, hydrated: true };
  }
}

type Store = State & {
  addSearch: (s: Search) => void;
  upsertProspect: (p: Prospect) => void;
  patchProspect: (id: string, patch: Partial<Prospect>) => void;
  toggleSaved: (id: string) => void;
  addToQueue: (id: string, angleId?: string) => void;
  removeFromQueue: (id: string) => void;
  addEmail: (id: string, email: Email) => void;
  setRecipient: (id: string, recipient: { email: string; name?: string } | undefined) => void;
  setApproved: (id: string, approved: boolean) => void;
  setContacts: (id: string, contacts: Prospect["contacts"], recipient?: Prospect["recipient"]) => void;
  markSent: (id: string, sent: NonNullable<Prospect["sent"]>) => void;
  clearAll: () => void;
  list: Prospect[];
  stats: {
    researched: number;
    highOpportunity: number;
    emailsPrepared: number;
    saved: number;
    queued: number;
    readyToContact: number;
    qualified: number;
    sent: number;
  };
};

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initial);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Omit<State, "hydrated">;
        dispatch({ type: "hydrate", state: { searches: parsed.searches ?? [], prospects: parsed.prospects ?? {} } });
        return;
      }
    } catch {
      /* corrupt storage — start fresh */
    }
    dispatch({ type: "hydrate", state: { searches: [], prospects: {} } });
  }, []);

  useEffect(() => {
    if (!state.hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ searches: state.searches, prospects: state.prospects }));
    } catch {
      /* quota exceeded — ignore */
    }
  }, [state]);

  const addSearch = useCallback((search: Search) => dispatch({ type: "addSearch", search }), []);
  const upsertProspect = useCallback((prospect: Prospect) => dispatch({ type: "upsertProspect", prospect }), []);
  const patchProspect = useCallback((id: string, patch: Partial<Prospect>) => dispatch({ type: "patchProspect", id, patch }), []);
  const addEmail = useCallback((id: string, email: Email) => dispatch({ type: "addEmail", id, email }), []);
  const clearAll = useCallback(() => dispatch({ type: "clearAll" }), []);

  const toggleSaved = useCallback(
    (id: string) => {
      const p = state.prospects[id];
      if (p) dispatch({ type: "patchProspect", id, patch: { saved: !p.saved } });
    },
    [state.prospects]
  );
  const addToQueue = useCallback(
    (id: string, angleId?: string) => {
      const p = state.prospects[id];
      if (!p) return;
      dispatch({
        type: "patchProspect",
        id,
        patch: { inQueue: true, saved: true, queueAngleId: angleId ?? p.queueAngleId ?? p.opportunity.recommendedAngle.id },
      });
    },
    [state.prospects]
  );
  const removeFromQueue = useCallback((id: string) => dispatch({ type: "patchProspect", id, patch: { inQueue: false } }), []);
  const setRecipient = useCallback(
    (id: string, recipient: { email: string; name?: string } | undefined) => dispatch({ type: "patchProspect", id, patch: { recipient } }),
    []
  );
  const setApproved = useCallback((id: string, approved: boolean) => dispatch({ type: "patchProspect", id, patch: { approved } }), []);
  const setContacts = useCallback(
    (id: string, contacts: Prospect["contacts"], recipient?: Prospect["recipient"]) =>
      dispatch({ type: "patchProspect", id, patch: recipient ? { contacts, recipient } : { contacts } }),
    []
  );
  const markSent = useCallback(
    (id: string, sent: NonNullable<Prospect["sent"]>) => dispatch({ type: "patchProspect", id, patch: { sent, approved: false } }),
    []
  );

  const list = useMemo(
    () => Object.values(state.prospects).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [state.prospects]
  );

  const stats = useMemo(() => {
    const researched = list.length;
    const highOpportunity = list.filter((p) => p.opportunity.opportunityScore >= 80).length;
    const emailsPrepared = list.filter((p) => p.emails.length > 0).length;
    const saved = list.filter((p) => p.saved).length;
    const queued = list.filter((p) => p.inQueue).length;
    const readyToContact = list.filter((p) => p.inQueue && p.emails.length > 0 && !p.sent).length;
    const qualified = list.filter((p) => p.opportunity.icpFit >= 70).length;
    const sent = list.filter((p) => p.sent).length;
    return { researched, highOpportunity, emailsPrepared, saved, queued, readyToContact, qualified, sent };
  }, [list]);

  const value: Store = {
    ...state,
    addSearch,
    upsertProspect,
    patchProspect,
    toggleSaved,
    addToQueue,
    removeFromQueue,
    addEmail,
    setRecipient,
    setApproved,
    setContacts,
    markSent,
    clearAll,
    list,
    stats,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}
