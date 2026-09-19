"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, type ReactNode } from "react";
import type {
  Campaign,
  Email,
  Prospect,
  ProspectList,
  ProspectStatus,
  SavedBrief,
  Search,
  Suppression,
  WorkspaceSettings,
} from "@/lib/schemas";
import { prospectStatus } from "@/lib/schemas";
import { newId } from "@/lib/utils";

/**
 * Client-side persistence. LeadLoop is a single-user app, so everything lives
 * in localStorage. The shape mirrors what workspace tables would look like
 * if persistence were moved server-side later.
 */

const STORAGE_KEY = "leadloop.v1";

type State = {
  hydrated: boolean;
  searches: Search[];
  prospects: Record<string, Prospect>;
  briefs: SavedBrief[];
  lists: ProspectList[];
  campaigns: Campaign[];
  suppressions: Suppression[];
  settings: WorkspaceSettings;
};

type Action =
  | { type: "hydrate"; state: Omit<State, "hydrated"> }
  | { type: "addSearch"; search: Search }
  | { type: "upsertProspect"; prospect: Prospect }
  | { type: "patchProspect"; id: string; patch: Partial<Prospect> }
  | { type: "addEmail"; id: string; email: Email }
  | { type: "saveBrief"; brief: SavedBrief }
  | { type: "deleteBrief"; id: string }
  | { type: "upsertList"; list: ProspectList }
  | { type: "deleteList"; id: string }
  | { type: "upsertCampaign"; campaign: Campaign }
  | { type: "deleteCampaign"; id: string }
  | { type: "addSuppression"; item: Suppression }
  | { type: "removeSuppression"; id: string }
  | { type: "updateSettings"; settings: Partial<WorkspaceSettings> }
  | { type: "clearAll" };

const defaultSettings: WorkspaceSettings = { name: "My workspace", companyName: "", website: "" };
const initial: State = {
  hydrated: false,
  searches: [],
  prospects: {},
  briefs: [],
  lists: [],
  campaigns: [],
  suppressions: [],
  settings: defaultSettings,
};

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
    case "saveBrief":
      return { ...state, briefs: [action.brief, ...state.briefs.filter((b) => b.id !== action.brief.id)] };
    case "deleteBrief":
      return { ...state, briefs: state.briefs.filter((b) => b.id !== action.id) };
    case "upsertList":
      return { ...state, lists: [action.list, ...state.lists.filter((l) => l.id !== action.list.id)] };
    case "deleteList": {
      const nextProspects = { ...state.prospects };
      for (const p of Object.values(nextProspects)) {
        if (p.listIds?.includes(action.id)) {
          nextProspects[p.id] = { ...p, listIds: p.listIds.filter((id) => id !== action.id) };
        }
      }
      return {
        ...state,
        lists: state.lists.filter((l) => l.id !== action.id),
        campaigns: state.campaigns.map((c) => (c.listId === action.id ? { ...c, listId: undefined } : c)),
        prospects: nextProspects,
      };
    }
    case "upsertCampaign":
      return { ...state, campaigns: [action.campaign, ...state.campaigns.filter((c) => c.id !== action.campaign.id)] };
    case "deleteCampaign":
      return { ...state, campaigns: state.campaigns.filter((c) => c.id !== action.id) };
    case "addSuppression":
      return { ...state, suppressions: [action.item, ...state.suppressions] };
    case "removeSuppression":
      return { ...state, suppressions: state.suppressions.filter((s) => s.id !== action.id) };
    case "updateSettings":
      return { ...state, settings: { ...state.settings, ...action.settings } };
    case "clearAll":
      return { ...initial, hydrated: true, settings: state.settings };
  }
}

type Store = State & {
  addSearch: (s: Search) => void;
  upsertProspect: (p: Prospect) => void;
  patchProspect: (id: string, patch: Partial<Prospect>) => void;
  toggleSaved: (id: string) => void;
  addToQueue: (id: string, angleId?: string) => void;
  removeFromQueue: (id: string) => void;
  setStatus: (id: string, status: ProspectStatus) => void;
  setNotes: (id: string, notes: string) => void;
  addEmail: (id: string, email: Email) => void;
  setRecipient: (id: string, recipient: { email: string; name?: string } | undefined) => void;
  setApproved: (id: string, approved: boolean) => void;
  setContacts: (id: string, contacts: Prospect["contacts"], recipient?: Prospect["recipient"]) => void;
  markSent: (id: string, sent: NonNullable<Prospect["sent"]>) => void;
  saveBrief: (name: string, brief: SavedBrief["brief"]) => SavedBrief;
  deleteBrief: (id: string) => void;
  createList: (name: string, description?: string) => ProspectList;
  updateList: (id: string, patch: Partial<Pick<ProspectList, "name" | "description">>) => void;
  deleteList: (id: string) => void;
  addToList: (listId: string, prospectId: string) => void;
  removeFromList: (listId: string, prospectId: string) => void;
  createCampaign: (input: { name: string; objective: string; prospectIds: string[]; listId?: string; searchId?: string }) => Campaign;
  deleteCampaign: (id: string) => void;
  addSuppression: (item: Omit<Suppression, "id" | "createdAt">) => void;
  removeSuppression: (id: string) => void;
  updateSettings: (settings: Partial<WorkspaceSettings>) => void;
  clearAll: () => void;
  list: Prospect[];
  inbox: Prospect[];
  excludedDomains: string[];
  stats: {
    researched: number;
    highOpportunity: number;
    emailsPrepared: number;
    saved: number;
    queued: number;
    readyToContact: number;
    qualified: number;
    sent: number;
    inbox: number;
    kept: number;
    skipped: number;
  };
};

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initial);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<Omit<State, "hydrated">>;
        dispatch({
          type: "hydrate",
          state: {
            searches: parsed.searches ?? [],
            prospects: parsed.prospects ?? {},
            briefs: parsed.briefs ?? [],
            lists: parsed.lists ?? [],
            campaigns: parsed.campaigns ?? [],
            suppressions: parsed.suppressions ?? [],
            settings: { ...defaultSettings, ...parsed.settings },
          },
        });
        return;
      }
    } catch {
      /* corrupt storage — start fresh */
    }
    dispatch({
      type: "hydrate",
      state: {
        searches: [],
        prospects: {},
        briefs: [],
        lists: [],
        campaigns: [],
        suppressions: [],
        settings: defaultSettings,
      },
    });
  }, []);

  useEffect(() => {
    if (!state.hydrated) return;
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          searches: state.searches,
          prospects: state.prospects,
          briefs: state.briefs,
          lists: state.lists,
          campaigns: state.campaigns,
          suppressions: state.suppressions,
          settings: state.settings,
        })
      );
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
      if (!p) return;
      const nextSaved = !p.saved;
      dispatch({
        type: "patchProspect",
        id,
        patch: { saved: nextSaved, status: nextSaved ? "kept" : prospectStatus(p) === "kept" ? "inbox" : p.status },
      });
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
        patch: {
          inQueue: true,
          saved: true,
          status: "queued",
          queueAngleId: angleId ?? p.queueAngleId ?? p.opportunity.recommendedAngle.id,
        },
      });
    },
    [state.prospects]
  );
  const removeFromQueue = useCallback(
    (id: string) => dispatch({ type: "patchProspect", id, patch: { inQueue: false, status: "kept" } }),
    []
  );
  const setStatus = useCallback((id: string, status: ProspectStatus) => {
    const patch: Partial<Prospect> = { status };
    if (status === "kept") {
      patch.saved = true;
      patch.inQueue = false;
    }
    if (status === "skipped") {
      patch.inQueue = false;
      patch.saved = false;
    }
    if (status === "queued") {
      patch.inQueue = true;
      patch.saved = true;
    }
    if (status === "inbox") {
      patch.inQueue = false;
    }
    dispatch({ type: "patchProspect", id, patch });
  }, []);
  const setNotes = useCallback((id: string, notes: string) => dispatch({ type: "patchProspect", id, patch: { notes } }), []);
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
    (id: string, sent: NonNullable<Prospect["sent"]>) =>
      dispatch({ type: "patchProspect", id, patch: { sent, approved: false, status: "sent" } }),
    []
  );

  const saveBrief = useCallback((name: string, brief: SavedBrief["brief"]) => {
    const saved: SavedBrief = { id: newId("brief"), name, brief, createdAt: new Date().toISOString() };
    dispatch({ type: "saveBrief", brief: saved });
    return saved;
  }, []);
  const deleteBrief = useCallback((id: string) => dispatch({ type: "deleteBrief", id }), []);

  const createList = useCallback((name: string, description = "") => {
    const list: ProspectList = { id: newId("list"), name, description, createdAt: new Date().toISOString(), prospectIds: [] };
    dispatch({ type: "upsertList", list });
    return list;
  }, []);
  const updateList = useCallback(
    (id: string, patch: Partial<Pick<ProspectList, "name" | "description">>) => {
      const existing = state.lists.find((l) => l.id === id);
      if (existing) dispatch({ type: "upsertList", list: { ...existing, ...patch } });
    },
    [state.lists]
  );
  const deleteList = useCallback((id: string) => dispatch({ type: "deleteList", id }), []);
  const addToList = useCallback(
    (listId: string, prospectId: string) => {
      const list = state.lists.find((l) => l.id === listId);
      const prospect = state.prospects[prospectId];
      if (!list || !prospect) return;
      if (!list.prospectIds.includes(prospectId)) {
        dispatch({ type: "upsertList", list: { ...list, prospectIds: [...list.prospectIds, prospectId] } });
      }
      const ids = new Set(prospect.listIds ?? []);
      ids.add(listId);
      dispatch({ type: "patchProspect", id: prospectId, patch: { listIds: [...ids], saved: true, status: prospect.status === "inbox" ? "kept" : prospect.status } });
    },
    [state.lists, state.prospects]
  );
  const removeFromList = useCallback(
    (listId: string, prospectId: string) => {
      const list = state.lists.find((l) => l.id === listId);
      const prospect = state.prospects[prospectId];
      if (list) dispatch({ type: "upsertList", list: { ...list, prospectIds: list.prospectIds.filter((id) => id !== prospectId) } });
      if (prospect) dispatch({ type: "patchProspect", id: prospectId, patch: { listIds: (prospect.listIds ?? []).filter((id) => id !== listId) } });
    },
    [state.lists, state.prospects]
  );

  const createCampaign = useCallback(
    (input: { name: string; objective: string; prospectIds: string[]; listId?: string; searchId?: string }) => {
      const campaign: Campaign = { id: newId("camp"), createdAt: new Date().toISOString(), ...input };
      dispatch({ type: "upsertCampaign", campaign });
      return campaign;
    },
    []
  );
  const deleteCampaign = useCallback((id: string) => dispatch({ type: "deleteCampaign", id }), []);

  const addSuppression = useCallback((item: Omit<Suppression, "id" | "createdAt">) => {
    dispatch({
      type: "addSuppression",
      item: { ...item, id: newId("sup"), createdAt: new Date().toISOString() },
    });
  }, []);
  const removeSuppression = useCallback((id: string) => dispatch({ type: "removeSuppression", id }), []);
  const updateSettings = useCallback((settings: Partial<WorkspaceSettings>) => dispatch({ type: "updateSettings", settings }), []);

  const list = useMemo(
    () => Object.values(state.prospects).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [state.prospects]
  );

  const inbox = useMemo(() => list.filter((p) => prospectStatus(p) === "inbox"), [list]);

  const excludedDomains = useMemo(
    () => state.suppressions.map((s) => s.domain?.toLowerCase().replace(/^www\./, "")).filter((d): d is string => Boolean(d)),
    [state.suppressions]
  );

  const stats = useMemo(() => {
    const researched = list.length;
    const highOpportunity = list.filter((p) => p.opportunity.opportunityScore >= 80).length;
    const emailsPrepared = list.filter((p) => p.emails.length > 0).length;
    const saved = list.filter((p) => p.saved || prospectStatus(p) === "kept").length;
    const queued = list.filter((p) => p.inQueue).length;
    const readyToContact = list.filter((p) => p.inQueue && p.emails.length > 0 && !p.sent).length;
    const qualified = list.filter((p) => p.opportunity.icpFit >= 70).length;
    const sent = list.filter((p) => p.sent).length;
    return {
      researched,
      highOpportunity,
      emailsPrepared,
      saved,
      queued,
      readyToContact,
      qualified,
      sent,
      inbox: inbox.length,
      kept: list.filter((p) => prospectStatus(p) === "kept").length,
      skipped: list.filter((p) => prospectStatus(p) === "skipped").length,
    };
  }, [list, inbox]);

  const value: Store = {
    ...state,
    addSearch,
    upsertProspect,
    patchProspect,
    toggleSaved,
    addToQueue,
    removeFromQueue,
    setStatus,
    setNotes,
    addEmail,
    setRecipient,
    setApproved,
    setContacts,
    markSent,
    saveBrief,
    deleteBrief,
    createList,
    updateList,
    deleteList,
    addToList,
    removeFromList,
    createCampaign,
    deleteCampaign,
    addSuppression,
    removeSuppression,
    updateSettings,
    clearAll,
    list,
    inbox,
    excludedDomains,
    stats,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}
