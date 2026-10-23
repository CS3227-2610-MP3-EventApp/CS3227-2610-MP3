import { useEffect, useId, useRef, useState } from "react";
import { Alert, Box, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, FormControlLabel, FormLabel, LinearProgress, Link, Paper, Radio, RadioGroup, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from "@mui/material";
import { Link as RouterLink, useLocation, useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../Auth";
import { AppearanceControl } from "../Appearance";
import { displayDate } from "../displayDate";
import { clearMarkers, readMarkers, removeMarker, safeReadMarkers, writeMarker, isMarkerKey, type MarkerState } from "./markers";
import {
  accessFailure, errorMessage, indeterminate, loadProposals, parseReceipt, parseShortlist, parseView, proposalApi, resolveChoices, sgd, usableApproval,
  uuid, validEmail, validRequestText, NON_COMMITTING, ProposalError,
  type ActionType, type Choice, type Context, type Entry, type ItemInput, type Proposal, type ProposalInput, type Revision, type Shortlist,
} from "./model";

type Phase = "invalid" | "loading" | "blocked" | "ready";
// A dialog is bound to the exact revision and digest the owner opened it on.
type DialogState = null | { kind: "approve" | "cancel" | "revise"; key: string; revision: number; digest: string };
const typeLabel = (t: ActionType) => t === "quotation_request" ? "Quotation request" : "Purchase/cart proposal";
const stateLabel: Record<string, string> = { open: "Open", cancelled: "Cancelled", simulated: "Simulated in sandbox", failed: "Simulation failed", uncertain: "Simulation outcome uncertain" };
const reasonLabel: Record<string, string> = { source_price_unknown: "the source price is unknown", quantity_mismatch: "the quantity differs from the researched quantity", arithmetic_overflow: "the amount is too large to calculate" };
const choiceKey = (c: { snapshotId: string; offerId: string }) => `${c.snapshotId}:${c.offerId}`;
const STORAGE_MESSAGE = "Browser storage is unavailable or holds an unreadable simulation marker, so simulation is disabled on this device. Sign out and back in to reset it.";
const INDETERMINATE_MESSAGE = "The simulation result could not be confirmed. It was not retried. Simulation stays disabled for this revision; create a new revision to continue.";

/** Business-only F09-US03 workflow: create, revise, approve and separately simulate sandbox procurement proposals. */
export function ProcurementProposals() {
  const { actor, setActor, revalidate } = useAuth(), location = useLocation(), navigate = useNavigate();
  const values = new URLSearchParams(location.search).getAll("participationId");
  const participationId = values.length === 1 && uuid(values[0]) ? values[0] : "";
  const context: Context | null = actor && participationId ? { actorId: actor.id, participationId, businessIds: actor.businessMemberships.filter((m) => m.status === "active" && m.role === "owner").map((m) => m.businessId) } : null;

  const [phase, setPhase] = useState<Phase>(participationId ? "loading" : "invalid");
  const [shortlist, setShortlist] = useState<Shortlist | null>(null);
  const [choices, setChoices] = useState<Choice[] | "unavailable" | null>(null);
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [listReloading, setListReloading] = useState(false);
  const [openKey, setOpenKey] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [actionType, setActionType] = useState<ActionType>("purchase_cart");
  const [recipient, setRecipient] = useState(""), [requestText, setRequestText] = useState("");
  const [busy, setBusy] = useState(false), [locked, setLocked] = useState<string[]>([]);
  const [markers, setMarkers] = useState<MarkerState>(() => actor ? safeReadMarkers(actor.id) : { map: new Map(), broken: false });
  const [error, setError] = useState(""), [notice, setNotice] = useState(""), [signingOut, setSigningOut] = useState(false);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [revision, setRevision] = useState<{ quantities: string[]; recipient: string; requestText: string }>({ quantities: [], recipient: "", requestText: "" });
  const epoch = useRef(0), mutex = useRef(false), markersRef = useRef(markers), errorRef = useRef<HTMLDivElement>(null), noticeRef = useRef<HTMLDivElement>(null);
  const entriesRef = useRef(entries);
  markersRef.current = markers; entriesRef.current = entries;
  const ids = { recipient: useId(), request: useId(), snapshotHint: useId() };

  function clearQuoteFields() { setRecipient(""); setRequestText(""); setRevision({ quantities: [], recipient: "", requestText: "" }); }
  /** Clears every private proposal/quotation value from memory and shows a fixed message. */
  function wipe(message: string) {
    epoch.current += 1;
    setShortlist(null); setChoices(null); setEntries(null); setSelected([]); setOpenKey(""); setDialog(null); setLocked([]); setListReloading(false); clearQuoteFields();
    setNotice(""); setError(message); setPhase("blocked");
  }
  const live = (v: number) => epoch.current === v;
  const refreshMarkers = () => { if (actor) setMarkers(safeReadMarkers(actor.id)); };

  /** Drops markers proven obsolete by canonical state: a receipt for that revision or a newer revision. */
  function reconcile(list: Entry[]) {
    if (!actor) return;
    const state = safeReadMarkers(actor.id);
    for (const [proposalId, revisionNumber] of state.map) {
      const entry = list.find((e) => e.valid && e.proposal.proposalId === proposalId);
      if (!entry?.valid) continue;
      const p = entry.proposal, same = p.current.proposalRevision === revisionNumber ? p.current : p.history.find((h) => h.valid && h.revision.proposalRevision === revisionNumber);
      const receipt = same && ("receipt" in same ? same.receipt : same.valid ? same.revision.receipt : null);
      if (p.proposalRevision > revisionNumber || receipt) removeMarker(proposalId);
    }
    refreshMarkers();
  }

  async function load() {
    const v = ++epoch.current;
    mutex.current = false; setBusy(false); setLocked([]); setListReloading(false); setDialog(null); setError(""); setNotice("");
    setShortlist(null); setChoices(null); setEntries(null);
    if (!context) { setPhase("invalid"); return; }
    setPhase("loading");
    try {
      let saved: Shortlist;
      try { saved = parseShortlist(await proposalApi.shortlist(participationId), participationId); }
      catch (failure) { if (accessFailure(failure)) throw failure; if (live(v)) { setPhase("blocked"); setError("Unavailable. This participation's saved shortlist could not be confirmed."); } return; }
      if (!live(v)) return;
      setShortlist(saved);
      const resolving = (async () => {
        const snapshotIds = [...new Set(saved.selectedOffers.map((r) => r.snapshotId))];
        const reads = await Promise.all(snapshotIds.map(async (s) => [s, await proposalApi.snapshot(s)] as const));
        return resolveChoices(saved, new Map(reads));
      })().catch((failure: unknown) => {
        // A missing snapshot is an unavailable shortlist entry, not a lost participation; 401/403 still clear everything.
        if (failure instanceof ProposalError && (failure.status === 401 || failure.status === 403)) throw failure;
        return "unavailable" as const;
      });
      const [resolved, list] = await Promise.all([resolving, loadProposals(context)]);
      if (!live(v)) return;
      setChoices(resolved); setEntries(list); reconcile(list); setPhase("ready");
    } catch (failure) {
      if (!live(v)) return;
      wipe(accessFailure(failure) ? errorMessage(failure) : "Unavailable. Saved proposals could not be loaded completely, so none are shown. Reload to try again.");
    }
  }
  useEffect(() => { void load(); return () => { epoch.current += 1; mutex.current = false; }; }, [actor?.id, participationId]);

  // Cross-tab marker changes: suppress immediately; a cleared marker needs a canonical reload before controls return.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (!actor || event.storageArea && event.storageArea !== window.localStorage || !isMarkerKey(event.key)) return;
      const before = markersRef.current, after = safeReadMarkers(actor.id);
      setMarkers(after);
      for (const proposalId of before.map.keys()) if (!after.map.has(proposalId)) void reloadDetail(proposalId);
    };
    // Back-forward-cache restores must not show earlier private quote text.
    const onShow = (event: PageTransitionEvent) => { if (event.persisted) { clearQuoteFields(); void load(); } };
    window.addEventListener("storage", onStorage); window.addEventListener("pageshow", onShow);
    return () => { window.removeEventListener("storage", onStorage); window.removeEventListener("pageshow", onShow); };
  });
  useEffect(() => { if (error) errorRef.current?.focus(); }, [error]);
  useEffect(() => { if (notice && !error) noticeRef.current?.focus(); }, [notice]);

  const lock = (key: string, on: boolean) => setLocked((old) => on ? [...old.filter((k) => k !== key), key] : old.filter((k) => k !== key));
  function replace(entry: Entry) {
    const old = entriesRef.current;
    if (!old) return;
    const next = old.some((e) => e.key === entry.key) ? old.map((e) => e.key === entry.key ? entry : e) : [entry, ...old];
    entriesRef.current = next; setEntries(next); reconcile(next);
  }
  /** Reloads canonical detail; mutations for the proposal stay disabled until it succeeds. Returns the parsed entry or null. */
  async function reloadDetail(proposalId: string): Promise<Entry | null> {
    if (!context) return null;
    const v = epoch.current;
    lock(proposalId, true);
    try {
      const entry = parseView(await proposalApi.detail(proposalId), context, proposalId);
      if (!live(v)) return null;
      if (entry.key !== proposalId) { setError((old) => old || "The latest proposal state could not be confirmed. Reload before continuing."); return null; }
      replace(entry); lock(proposalId, false);
      return entry;
    } catch (failure) {
      if (live(v)) { if (accessFailure(failure)) wipe(errorMessage(failure)); else setError((old) => old || "The latest proposal state could not be loaded. Reload before continuing."); }
      return null;
    }
  }
  async function run(action: (v: number) => Promise<void>) {
    if (mutex.current) return;
    mutex.current = true; setBusy(true); setError(""); setNotice("");
    const v = epoch.current;
    try { await action(v); }
    catch (failure) { if (live(v)) { if (accessFailure(failure)) wipe(errorMessage(failure)); else setError(errorMessage(failure)); } }
    finally { if (live(v)) { mutex.current = false; setBusy(false); } }
  }

  async function reloadList(v: number) {
    if (!context) return;
    setListReloading(true);
    try {
      const list = await loadProposals(context);
      if (live(v)) { setEntries(list); reconcile(list); setListReloading(false); }
    } catch (failure) {
      if (live(v)) wipe(accessFailure(failure) ? errorMessage(failure) : "Unavailable. Saved proposals could not be loaded completely, so none are shown. Reload to try again.");
    }
  }

  const chosen = Array.isArray(choices) ? choices.filter((c) => selected.includes(choiceKey(c))) : [];
  const snapshotInUse = chosen[0]?.snapshotId ?? null;
  const quotation = actionType === "quotation_request";
  const recipientError = quotation && recipient.trim() && !validEmail(recipient.trim()) ? "Enter one valid email address of up to 254 characters." : "";
  const textError = quotation && !validRequestText(requestText) ? "Use up to 1,000 characters." : "";
  const canCreate = phase === "ready" && !busy && !listReloading && Array.isArray(choices) && !!shortlist?.id && chosen.length > 0 && !recipientError && !textError;

  function quoteFields(email: string, body: string) {
    return { ...(email.trim() ? { recipientEmail: email.trim() } : {}), ...(body.trim() ? { requestText: body.trim() } : {}) };
  }
  async function create() {
    if (!canCreate || !shortlist?.id || !context) return;
    const body: ProposalInput = { participationId, actionType, shortlistId: shortlist.id, expectedShortlistRevision: shortlist.revision,
      items: chosen.map((c): ItemInput => ({ snapshotId: c.snapshotId, offerId: c.offerId, quantity: c.quantity })), ...(quotation ? quoteFields(recipient, requestText) : {}) };
    await run(async (v) => {
      try {
        const entry = parseView(await proposalApi.create(body), context, "created");
        if (!live(v)) return;
        setSelected([]); clearQuoteFields(); setOpenKey(entry.key);
        await reloadList(v);
        if (live(v)) setNotice(`${typeLabel(actionType)} saved privately. Review it before approving; nothing has been sent.`);
      } catch (failure) {
        if (!live(v) || accessFailure(failure)) throw failure;
        // Create has no idempotency key: never repeat it, and reload the list before another explicit create.
        setError(failure instanceof ProposalError && failure.status !== 0 && failure.code !== "invalid_response" ? errorMessage(failure) : "The create request could not be confirmed and was not repeated. Saved proposals were reloaded; check them before creating again.");
        await reloadList(v);
        await refreshShortlist(v);
      }
    });
  }
  /** After a rejected create/revise, refresh the saved shortlist revision so the next explicit attempt is not stale. */
  async function refreshShortlist(v: number) {
    try {
      const saved = parseShortlist(await proposalApi.shortlist(participationId), participationId);
      if (live(v)) setShortlist(saved);
    } catch (failure) { if (live(v) && accessFailure(failure)) wipe(errorMessage(failure)); }
  }

  function controls(entry: Entry | undefined) {
    const none = { revise: false, approve: false, simulate: false, cancel: false };
    if (!entry?.valid || busy || locked.includes(entry.key) || listReloading) return none;
    const p = entry.proposal, current = p.current;
    if (current.state !== "open") return none;
    if (!current.payload.amountsValid) return { ...none, cancel: true };
    const marked = markers.map.has(p.proposalId);
    const approval = usableApproval(current);
    return { revise: !!shortlist?.id, approve: !marked && !approval, simulate: !marked && !!approval && !markers.broken, cancel: true };
  }

  async function approve(p: Proposal) {
    await run(async (v) => {
      try {
        const response = await proposalApi.approve(p.proposalId, p.proposalRevision);
        const matches = (() => { try { return !!response && typeof response === "object" && (response as Record<string, unknown>).proposalRevision === p.proposalRevision && (response as Record<string, unknown>).payloadDigest === p.current.payloadDigest && (response as Record<string, unknown>).approvedBy === actor?.id && (response as Record<string, unknown>).state === "valid"; } catch { return false; } })();
        const fresh = await reloadDetail(p.proposalId);
        if (!live(v)) return;
        if (!matches) { lock(p.proposalId, true); setError("The approval response did not match the displayed revision, so this proposal's actions are disabled. Reload proposals before continuing."); }
        else if (fresh) setNotice(`Revision ${p.proposalRevision} approved. It is not yet simulated; simulate it separately before the approval expires.`);
      } catch (failure) {
        if (!live(v) || accessFailure(failure)) throw failure;
        setError(errorMessage(failure));
        await reloadDetail(p.proposalId);
      }
    });
  }
  async function cancel(p: Proposal) {
    await run(async (v) => {
      try {
        const entry = parseView(await proposalApi.cancel(p.proposalId, p.proposalRevision), context!, p.proposalId);
        if (!live(v)) return;
        if (!entry.valid || entry.proposal.proposalId !== p.proposalId) { setError("The cancellation response could not be confirmed. The latest saved state was reloaded."); await reloadDetail(p.proposalId); return; }
        replace(entry); setNotice("Proposal cancelled. No seller was contacted.");
      } catch (failure) {
        if (!live(v) || accessFailure(failure)) throw failure;
        setError(errorMessage(failure));
        await reloadDetail(p.proposalId);
      }
    });
  }
  const bind = (kind: "approve" | "cancel" | "revise", p: Proposal) => ({ kind, key: p.proposalId, revision: p.proposalRevision, digest: p.current.payloadDigest });
  function startRevision(p: Proposal) {
    setRevision({ quantities: p.current.payload.lines.map((l) => String(l.quantity)), recipient: p.current.payload.recipientEmail ?? "", requestText: p.current.payload.requestText ?? "" });
    setDialog(bind("revise", p));
  }
  const revisionQuote = (p: Proposal) => p.current.actionType === "quotation_request";
  const revisionInvalid = (p: Proposal) => revision.quantities.some((q) => !/^[1-9][0-9]{0,6}$/.test(q) || Number(q) > 1_000_000)
    || revisionQuote(p) && (!!revision.recipient.trim() && !validEmail(revision.recipient.trim()) || !validRequestText(revision.requestText));
  async function revise(p: Proposal) {
    if (!shortlist?.id || !context || revisionInvalid(p)) return;
    const body = { participationId, actionType: p.current.actionType, shortlistId: shortlist.id, expectedShortlistRevision: shortlist.revision,
      items: p.current.payload.lines.map((l, i) => ({ snapshotId: l.snapshotId, offerId: l.offerId, quantity: Number(revision.quantities[i] ?? l.quantity) })),
      ...(revisionQuote(p) ? quoteFields(revision.recipient, revision.requestText) : {}), expectedProposalRevision: p.proposalRevision };
    await run(async (v) => {
      try {
        const entry = parseView(await proposalApi.revise(p.proposalId, body), context, p.proposalId);
        if (!live(v)) return;
        if (!entry.valid || entry.proposal.proposalId !== p.proposalId) { setError("The revision response could not be confirmed. The latest saved state was reloaded."); await reloadDetail(p.proposalId); return; }
        clearQuoteFields(); replace(entry);
        setNotice(`Revision ${entry.proposal.proposalRevision} saved. Earlier approvals no longer apply; review and approve this revision before simulating.`);
      } catch (failure) {
        if (!live(v) || accessFailure(failure)) throw failure;
        setError(errorMessage(failure));
        await reloadDetail(p.proposalId);
        await refreshShortlist(v);
      }
    });
  }

  async function simulate(p: Proposal) {
    const approval = usableApproval(p.current);
    if (mutex.current || !actor || !approval) return;
    // Persist the no-retry marker before dispatch; any storage problem fails closed without sending Execute.
    try {
      const before = readMarkers(actor.id);
      if (before.broken || before.map.has(p.proposalId)) { setMarkers(before); if (before.broken) setError(STORAGE_MESSAGE); return; }
      writeMarker(actor.id, p.proposalId, p.proposalRevision);
      const after = readMarkers(actor.id);
      if (after.broken || after.map.get(p.proposalId) !== p.proposalRevision) throw new Error("marker");
      setMarkers(after);
    } catch {
      setMarkers({ map: markersRef.current.map, broken: true }); setError(STORAGE_MESSAGE);
      return;
    }
    await run(async (v) => {
      let response: unknown;
      try { response = await proposalApi.execute(approval.approvalId, crypto.randomUUID()); }
      catch (failure) {
        if (!live(v) || accessFailure(failure)) throw failure;
        if (indeterminate(failure)) { setError(INDETERMINATE_MESSAGE); await reloadDetail(p.proposalId); return; }
        setError(errorMessage(failure));
        const fresh = await reloadDetail(p.proposalId);
        // Clear only after canonical state confirms the same open revision has no receipt.
        if (fresh?.valid && fresh.proposal.proposalRevision === p.proposalRevision && fresh.proposal.current.state === "open" && !fresh.proposal.current.receipt && failure instanceof ProposalError && NON_COMMITTING.has(failure.code)) {
          removeMarker(p.proposalId); refreshMarkers();
        }
        return;
      }
      let outcome = "";
      try { outcome = parseReceipt(response, p.proposalRevision, p.current.approvals, actor.id).outcome; } catch { outcome = ""; }
      if (!live(v)) return;
      if (!outcome) { setError(INDETERMINATE_MESSAGE); await reloadDetail(p.proposalId); return; }
      removeMarker(p.proposalId); refreshMarkers();
      await reloadDetail(p.proposalId);
      if (live(v)) setNotice(outcome === "simulated" ? "Sandbox simulation receipt recorded. No seller was contacted and no order or payment was made." : `The sandbox simulation ended as ${outcome}. This outcome is final and is not retried.`);
    });
  }

  async function signOut() {
    setSigningOut(true);
    try { await api.logout(); clearMarkers(null); setActor(null); navigate("/login", { replace: true }); }
    catch { setSigningOut(false); setError("Sign-out could not be confirmed. Check your session before trying again."); }
  }

  const openEntry = entries?.find((e) => e.key === openKey);
  const dialogEntry = dialog ? entries?.find((e) => e.key === dialog.key) : undefined;
  // If the entry changed underneath an open dialog, it closes rather than confirming an unreviewed revision.
  const dialogProposal = dialogEntry?.valid && dialog && dialogEntry.proposal.proposalRevision === dialog.revision && dialogEntry.proposal.current.payloadDigest === dialog.digest ? dialogEntry.proposal : null;
  const dialogAllowed = !!dialogProposal && !!dialog && controls(dialogEntry)[dialog.kind];
  const ownEntries = entries ?? [];

  return <Box component="main" sx={{ maxWidth: 1100, mx: "auto", p: { xs: 2, md: 4 }, overflowWrap: "anywhere" }}><Stack spacing={3}>
    <Stack direction="row" sx={{ flexWrap: "wrap", gap: 2, alignItems: "center", justifyContent: "space-between" }}>
      <Stack direction="row" sx={{ flexWrap: "wrap", gap: 1 }}><Button component={RouterLink} to="/business">Business workspace</Button><Button component={RouterLink} to="/business/supplier-research">Supplier research</Button></Stack>
      <Stack direction="row" sx={{ flexWrap: "wrap", gap: 1 }}><AppearanceControl /><Button disabled={signingOut} onClick={signOut}>Sign out</Button></Stack>
    </Stack>
    <Typography component="h1" variant="h2" data-page-heading tabIndex={-1}>Procurement proposals</Typography>
    <Alert severity="info" role="note">Turn saved shortlist offers into a private quotation request or purchase/cart proposal, review it, approve it, then separately simulate it. This is a sandbox: no seller is contacted and no order, booking or payment is made.</Alert>
    {error && <Alert severity="error" role="alert" ref={errorRef} tabIndex={-1}>{error}</Alert>}
    {notice && <Alert severity="success" role="status" ref={noticeRef} tabIndex={-1}>{notice}</Alert>}
    {busy && <><LinearProgress aria-label="Request in progress" /><Typography role="status">Working on your request…</Typography></>}
    {phase === "invalid" && <Alert severity="warning" role="note">Procurement proposals are unavailable for this link. Open them from supplier research for one participation.</Alert>}
    {phase === "loading" && <Typography role="status">Loading your saved shortlist and proposals…</Typography>}
    {phase === "blocked" && <Stack direction="row" sx={{ flexWrap: "wrap", gap: 2 }}>
      {/sign in/i.test(error) ? <Button variant="contained" onClick={revalidate}>Check sign-in</Button> : <Button variant="contained" onClick={() => void load()}>Reload page</Button>}
    </Stack>}
    {phase === "ready" && <>
      <Paper variant="outlined" component="section" sx={{ p: { xs: 2, md: 3 } }}><Stack spacing={2}>
        <Typography component="h2" variant="h5">Create a proposal</Typography>
        <Box component="fieldset" sx={{ border: 0, p: 0, m: 0 }}>
          <FormLabel component="legend">Proposal type</FormLabel>
          <RadioGroup value={actionType} onChange={(e) => setActionType(e.target.value as ActionType)}>
            <FormControlLabel value="purchase_cart" control={<Radio />} label="Purchase/cart proposal — a saved cart draft; no order is placed" disabled={busy} />
            <FormControlLabel value="quotation_request" control={<Radio />} label="Quotation request — a saved draft; it is never sent and is not a supplier quotation" disabled={busy} />
          </RadioGroup>
        </Box>
        <Typography component="h3" variant="h6">Saved shortlist entries</Typography>
        {choices === "unavailable" ? <Alert severity="warning" role="status">Saved shortlist entries are unavailable because their supplier research could not be confirmed. Creating proposals is disabled; existing proposals remain available below.</Alert>
          : !choices?.length ? <Typography>No saved shortlist entries yet. Save offers in supplier research first.</Typography>
          : <Stack spacing={1}>
            <Typography variant="body2" id={ids.snapshotHint}>One proposal uses offers from one research snapshot. Clear the current selection to choose offers from a different snapshot.</Typography>
            {choices.map((c) => {
              const key = choiceKey(c), checked = selected.includes(key), blocked = !checked && snapshotInUse !== null && snapshotInUse !== c.snapshotId;
              return <Box key={key}>
                <FormControlLabel label={`${c.productDescription} — ${c.supplierName}`} control={<Checkbox checked={checked} disabled={busy || blocked} slotProps={{ input: blocked ? { "aria-describedby": ids.snapshotHint } : {} }}
                  onChange={(e) => setSelected((old) => e.target.checked ? [...old, key] : old.filter((k) => k !== key))} />} />
                <Typography variant="body2" sx={{ ml: 4 }}>Quantity {c.quantity} (from the research request) · {c.priceKnown ? "Estimate shown after the proposal is saved" : "Price unknown"}</Typography>
              </Box>;
            })}
            <Box><Button disabled={busy || !selected.length} onClick={() => setSelected([])}>Clear selection</Button></Box>
          </Stack>}
        {quotation && <>
          <TextField id={ids.recipient} label="Recipient email (unverified, never sent)" value={recipient} disabled={busy} onChange={(e) => setRecipient(e.target.value)} autoComplete="off"
            error={!!recipientError} helperText={recipientError || "Optional. Kept private in this simulation; it is not used as an email destination."} slotProps={{ htmlInput: { spellCheck: false, maxLength: 254 } }} />
          <TextField id={ids.request} label="Request text" value={requestText} disabled={busy} onChange={(e) => setRequestText(e.target.value)} multiline minRows={3} autoComplete="off"
            error={!!textError} helperText={textError || `Optional. ${Array.from(requestText.trim()).length}/1,000 characters.`} slotProps={{ htmlInput: { spellCheck: false } }} />
        </>}
        <Box><Button variant="contained" disabled={!canCreate} onClick={create}>Create proposal</Button></Box>
        <Typography variant="body2">The server derives the seller, source evidence and estimates from your saved research and rechecks freshness. Nothing is sent to a seller.</Typography>
      </Stack></Paper>

      <Box component="section"><Stack spacing={2}>
        <Stack direction="row" sx={{ flexWrap: "wrap", gap: 2, alignItems: "center", justifyContent: "space-between" }}><Typography component="h2" variant="h5">Saved proposals</Typography><Button disabled={busy} onClick={() => void load()}>Reload proposals</Button></Stack>
        {listReloading && <Typography role="status">Reloading saved proposals…</Typography>}
        {!ownEntries.length ? <Typography>No proposals yet for this participation.</Typography>
          : <Typography>{ownEntries.length === 1 ? "1 proposal" : `${ownEntries.length} proposals`} for this participation.</Typography>}
        {ownEntries.map((entry) => <Paper key={entry.key} variant="outlined" sx={{ p: 2 }}><Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ justifyContent: "space-between", alignItems: { sm: "center" } }}>
          {entry.valid ? <Box>
            <Typography sx={{ fontWeight: 600 }}>{typeLabel(entry.proposal.current.actionType)} · {entry.proposal.current.payload.supplierName}</Typography>
            <Typography variant="body2">Revision {entry.proposal.proposalRevision} · {stateLabel[entry.proposal.current.state]} · {entry.proposal.current.payload.lines.length === 1 ? "1 item" : `${entry.proposal.current.payload.lines.length} items`}</Typography>
          </Box> : <Typography>Data error: this proposal cannot be shown.</Typography>}
          <Button variant={openKey === entry.key ? "contained" : "outlined"} aria-pressed={openKey === entry.key} onClick={() => setOpenKey(entry.key)}>Open proposal</Button>
        </Stack></Paper>)}
      </Stack></Box>

      {openEntry && <ProposalDetail entry={openEntry} controls={controls(openEntry)} marked={openEntry.valid && markers.map.has(openEntry.proposal.proposalId)} storageBroken={markers.broken}
        onRevise={startRevision} onApprove={(p) => setDialog(bind("approve", p))} onCancel={(p) => setDialog(bind("cancel", p))} onSimulate={simulate} />}
    </>}

    <Dialog open={!!dialogProposal} onClose={() => setDialog(null)} transitionDuration={0} aria-labelledby="proposal-dialog-title" fullWidth maxWidth="sm">
      {dialogProposal && dialog && <>
        <DialogTitle id="proposal-dialog-title">{dialog.kind === "approve" ? `Approve revision ${dialogProposal.proposalRevision}?` : dialog.kind === "cancel" ? "Cancel this proposal?" : "Create a new revision"}</DialogTitle>
        <DialogContent><Stack spacing={2} sx={{ pt: 1 }}>
          {dialog.kind === "approve" && <DialogContentText>Approval binds exactly this revision and expires 15 minutes after the server records it. It does not run the simulation; you will simulate separately.</DialogContentText>}
          {dialog.kind === "cancel" && <DialogContentText>Cancellation is final for this proposal. No seller has been contacted.</DialogContentText>}
          {dialog.kind === "revise" && <>
            <DialogContentText>A new immutable revision is saved from your current shortlist evidence. Earlier approvals no longer apply.</DialogContentText>
            {dialogProposal.current.payload.lines.map((l, i) => <TextField key={`${l.snapshotId}:${l.offerId}`} label={`Quantity for ${l.productDescription}`} value={revision.quantities[i] ?? ""} inputMode="numeric"
              onChange={(e) => setRevision((old) => ({ ...old, quantities: old.quantities.map((q, j) => j === i ? e.target.value : q) }))} />)}
            {revisionQuote(dialogProposal) && <>
              <TextField label="Recipient email (unverified, never sent)" value={revision.recipient} autoComplete="off" slotProps={{ htmlInput: { spellCheck: false, maxLength: 254 } }} onChange={(e) => setRevision((old) => ({ ...old, recipient: e.target.value }))} />
              <TextField label="Request text" value={revision.requestText} multiline minRows={3} autoComplete="off" slotProps={{ htmlInput: { spellCheck: false } }} onChange={(e) => setRevision((old) => ({ ...old, requestText: e.target.value }))} />
            </>}
          </>}
        </Stack></DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog(null)}>Go back</Button>
          <Button variant="contained" disabled={!dialogAllowed || dialog.kind === "revise" && revisionInvalid(dialogProposal)} onClick={() => {
            const p = dialogProposal, kind = dialog.kind;
            if (!dialogAllowed) return;
            setDialog(null);
            void (kind === "approve" ? approve(p) : kind === "cancel" ? cancel(p) : revise(p));
          }}>{dialog.kind === "approve" ? "Confirm approval" : dialog.kind === "cancel" ? "Confirm cancellation" : "Save new revision"}</Button>
        </DialogActions>
      </>}
    </Dialog>
  </Stack></Box>;
}

interface DetailProps {
  entry: Entry; controls: { revise: boolean; approve: boolean; simulate: boolean; cancel: boolean }; marked: boolean; storageBroken: boolean;
  onRevise: (p: Proposal) => void; onApprove: (p: Proposal) => void; onCancel: (p: Proposal) => void; onSimulate: (p: Proposal) => void;
}
function ProposalDetail({ entry, controls, marked, storageBroken, onRevise, onApprove, onCancel, onSimulate }: DetailProps) {
  if (!entry.valid) return <Paper variant="outlined" component="section" sx={{ p: { xs: 2, md: 3 } }}><Stack spacing={2}>
    <Typography component="h2" variant="h5">Proposal details</Typography>
    <Alert severity="error" role="note">Data error: this proposal's saved data cannot be shown, so all of its actions are disabled. Reload to try again.</Alert>
  </Stack></Paper>;
  const p = entry.proposal, current = p.current, approval = usableApproval(current), expiredOnly = !approval && current.approvals.some((a) => a.state === "expired");
  return <Paper variant="outlined" component="section" sx={{ p: { xs: 2, md: 3 } }}><Stack spacing={2}>
    <Typography component="h2" variant="h5">Proposal details</Typography>
    <Typography sx={{ fontWeight: 600 }}>{typeLabel(current.actionType)} · Current revision {p.proposalRevision} · {stateLabel[current.state]}</Typography>
    {current.actionType === "quotation_request" && <Typography variant="body2">A quotation request draft is not a supplier quotation. It is never sent.</Typography>}
    <RevisionBody revision={current} />
    {current.state === "open" && <Box>
      {approval ? <Typography>Approved by you for revision {p.proposalRevision} — not yet simulated. Approval expires {displayDate(approval.expiresAt)}; the server decides whether it is still valid.</Typography>
        : expiredOnly ? <Typography>The earlier approval for this revision expired. Approve again before simulating.</Typography>
        : <Typography>Not yet approved. Review the details above, then approve this exact revision.</Typography>}
      {marked && <Alert severity="warning" role="note" sx={{ mt: 1 }}>A simulation request for this revision may already have been sent and its result is not confirmed. Approve and Simulate stay disabled; create a new revision to continue.</Alert>}
      {storageBroken && <Alert severity="warning" role="note" sx={{ mt: 1 }}>{STORAGE_MESSAGE}</Alert>}
      {!current.payload.amountsValid && <Typography sx={{ mt: 1 }}>Only cancellation is available until valid saved data is reloaded.</Typography>}
    </Box>}
    <ReceiptText revision={current} />
    <Stack direction="row" sx={{ flexWrap: "wrap", gap: 1.5 }}>
      <Button variant="outlined" disabled={!controls.revise} onClick={() => onRevise(p)}>Revise proposal</Button>
      <Button variant="outlined" disabled={!controls.approve} onClick={() => onApprove(p)}>Approve proposal</Button>
      <Button variant="contained" disabled={!controls.simulate} onClick={() => onSimulate(p)}>Simulate approved proposal</Button>
      <Button color="error" disabled={!controls.cancel} onClick={() => onCancel(p)}>Cancel proposal</Button>
    </Stack>
    {p.history.length > 0 && <Box>
      <Typography component="h3" variant="h6">Earlier revisions</Typography>
      {p.history.map((h, i) => h.valid
        ? <Box key={h.revision.proposalRevision} component="details" sx={{ mt: 1 }}>
          <Typography component="summary" sx={{ cursor: "pointer" }}>Revision {h.revision.proposalRevision} · {h.revision.state === "open" ? "Superseded (view only)" : stateLabel[h.revision.state]} · saved {displayDate(h.revision.createdAt)}</Typography>
          <Stack spacing={1} sx={{ mt: 1 }}><RevisionBody revision={h.revision} /><ReceiptText revision={h.revision} /></Stack>
        </Box>
        : <Typography key={`invalid-${i}`} sx={{ mt: 1 }}>Revision {h.proposalRevision ?? "unknown"}: data error, this revision cannot be shown.</Typography>)}
    </Box>}
  </Stack></Paper>;
}

function ReceiptText({ revision }: { revision: Revision }) {
  const receipt = revision.receipt;
  if (revision.state === "cancelled") return <Typography>This revision was cancelled. No seller was contacted.</Typography>;
  if (!receipt) return null;
  if (receipt.outcome === "simulated") return <Typography>Sandbox simulation receipt recorded {displayDate(receipt.completedAt)}. No seller was contacted and no order, booking or payment was made.</Typography>;
  return <Typography>Simulation {receipt.outcome === "failed" ? "failed" : "outcome uncertain"}. This outcome is final; no retry or reconciliation is available and no order or payment was made.</Typography>;
}

function RevisionBody({ revision }: { revision: Revision }) {
  const { payload } = revision, valid = payload.amountsValid;
  const known = payload.lines.filter((l) => l.amount?.known), unknown = payload.lines.length - known.length;
  const sum = known.reduce((total, l) => total + (l.amount?.known ? l.amount.minor : 0n), 0n);
  return <Stack spacing={1.5}>
    <Typography>Seller (unverified, from saved research): {payload.supplierName}</Typography>
    <Typography variant="body2">Source origin: {payload.origin}</Typography>
    {revision.actionType === "quotation_request" && <>
      <Typography>Recipient (unverified, never contacted): {payload.recipientEmail ?? "None entered"}</Typography>
      <Typography sx={{ whiteSpace: "pre-wrap" }}>Request text: {payload.requestText ?? "None entered"}</Typography>
    </>}
    {!valid && <Alert severity="error" role="note">Data error: this revision's estimated amounts cannot be shown. Saved proposal details are unchanged.</Alert>}
    <Box sx={{ overflowX: "auto" }}><Table size="small" aria-label={`Items in revision ${revision.proposalRevision}`}>
      <TableHead><TableRow><TableCell>Item</TableCell><TableCell>Quantity</TableCell><TableCell>Estimated subtotal</TableCell><TableCell>Source evidence</TableCell></TableRow></TableHead>
      <TableBody>{payload.lines.map((l) => <TableRow key={`${l.snapshotId}:${l.offerId}`}>
        <TableCell>{l.productDescription}</TableCell>
        <TableCell>{l.quantity}</TableCell>
        <TableCell>{!valid ? "Withheld" : l.amount?.known ? sgd(l.amount.minor) : `Unknown — ${reasonLabel[l.amount?.known === false ? l.amount.reason : "source_price_unknown"]}`}</TableCell>
        <TableCell>{l.sources.map((s) => <Typography key={s.sourceId} variant="body2" component="span" sx={{ display: "block" }}>{s.finalUrl} · retrieved {displayDate(s.retrievedAt)}</Typography>)}</TableCell>
      </TableRow>)}</TableBody>
    </Table></Box>
    {valid && (unknown === 0 ? <Typography sx={{ fontWeight: 600 }}>Estimated total: {sgd(sum)}</Typography>
      : known.length ? <Typography sx={{ fontWeight: 600 }}>Known-items subtotal: {sgd(sum)} · {unknown === 1 ? "1 line item with an unknown price is" : `${unknown} line items with unknown prices are`} not included</Typography>
      : <Typography sx={{ fontWeight: 600 }}>All item prices are unknown, so no subtotal is shown.</Typography>)}
    <Typography variant="body2">Estimates come from saved research only. Shipping, taxes and availability may be unknown and are not included.</Typography>
  </Stack>;
}
