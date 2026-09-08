import { getCardDefinition } from "@aegis/shared";
import { describe, it, expect } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX10-073.js";
// Boot side-effect: self-register every compiled-IR card module (so EX10-073's real IR loads).
import "../index.js";

const COST3 = "BT1-010"; // a real cost-3 Digimon
const COST5 = "AD1-001"; // a real cost-5 Digimon

describe("A3 EX10-073 — whenLinkTrashed consumer: delete opponent's lowest-play-cost Digimon", () => {
  it("records the exact catalog, App Fusion, keyword, and two-zone Link contracts", () => {
    expect(getCardDefinition("EX10-073")).toMatchObject({
      nameEn: "Deusmon",
      colors: ["Black", "White"],
      level: 6,
      playCost: 13,
      dp: 13000,
      evoCosts: [{ color: "Black", level: 5, memoryCost: 5 }],
      forms: ["God", "Appmon"],
      attributes: ["God"],
      types: ["Omnipotence", "Leviathan"],
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.appFusionRequirement).toEqual([{ names: ["Warudamon", "Cometmon"], cost: 0 }]);
    expect(compiled.effects.find((effect) => effect.trigger === "Static" && effect.keywords?.length)?.keywords).toEqual(
      [{ keyword: "Link", amount: 1, raw: "＜Link +1＞" }],
    );
    // ＜Security A. +1＞ carries its printed magnitude. `securityStrikeCount` reads `amount ?? 1`,
    // so a wrong POSITIVE value (2, 3) changes the security-check count; this pins it to the
    // printed +1 rather than leaving the engine default to stand in for the printed text.
    expect(
      compiled.effects.find((effect) => effect.trigger === "Static" && effect.actions.length > 0)?.actions[0],
    ).toMatchObject({
      kind: "GainKeyword",
      keyword: { keyword: "SecurityAttack", amount: 1 },
      duration: "permanent",
      target: { isSelf: true, filter: { isSelfRef: true } },
    });
    for (const trigger of ["WhenDigivolving", "EndOfOpponentsTurn"]) {
      const actions = compiled.effects.find((effect) => effect.trigger === trigger)!.actions;
      expect(actions).toMatchObject([{ from: ["hand"] }, { from: ["digivolutionCards"] }]);
      for (const action of actions) {
        expect(action).toMatchObject({
          kind: "Link",
          payCost: false,
          optional: true,
          target: { filter: { hasLinkRequirement: true } },
          recipient: { filter: { isSelfRef: true }, isSelf: true },
        });
      }
      expect(JSON.stringify(actions[0])).not.toContain("hostFilter");
      expect(JSON.stringify(actions[1])).toContain('"hostFilter":{"isSelfRef":true}');
    }
  });

  it("Q5396 + [When Digivolving] + [App Fusion]: the public appFusion intent fuses at cost 0 and links two legal cards", async () => {
    // ONE fully public route proving four printed clauses at once. `appFusion` is a real
    // digivolution intent, so it fires EX10-073's [When Digivolving] the way a game does —
    // no injected timing.
    //  * [App Fusion] [Warudamon] & [Cometmon]: Cost 0 — Warudamon on top, Cometmon linked.
    //  * [When Digivolving] link 1 from HAND + 1 from THIS Digimon's digivolution cards.
    //  * Q5396 — a card without ＜Link＞ (BT1-009, no `linkRequirement`) is never eligible,
    //    even though `preferInstanceIds` offers it FIRST.
    //  * "without paying the cost" — both link cards print [Link] ... Cost 3, so a paying
    //    implementation would spend 6 memory; memory stays at 0.
    //  * ＜Link +1＞ — base linkMax is 1, so a second link only survives the rule-check
    //    sweep because of the printed +1.
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX10-019", as: "warudamon", linked: [{ card: "EX10-030", as: "cometmon" }] }],
          hand: [
            { card: "EX10-073", as: "deusmon" },
            { card: "BT26-010", as: "handLink" },
            { card: "BT1-009", as: "noLink" },
          ],
          deck: ["BT1-013", "BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("noLink").instanceId, s.inst("handLink").instanceId);
    await s.ready();
    s.state.memory = 0;

    expect(
      s.engine.applyIntent(0, {
        type: "appFusion",
        permanentId: s.perm("warudamon").permanentId,
        instanceId: s.inst("deusmon").instanceId,
        linkedInstanceId: s.inst("cometmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("warudamon").topCard.cardId === "EX10-073" && s.perm("warudamon").linked.length === 2);

    const deusmon = s.perm("warudamon");
    expect(deusmon.topCard.cardId).toBe("EX10-073");
    // The hand link landed, and the second link came out of Deusmon's OWN digivolution cards:
    // the fusion left [EX10-019, EX10-030] beneath it, and exactly one of them moved to `linked`.
    const linkedIds = deusmon.linked.map(({ instanceId }) => instanceId);
    expect(linkedIds).toContain(s.inst("handLink").instanceId);
    expect(linkedIds).toHaveLength(2);
    const stackIds = deusmon.stack.map(({ instanceId }) => instanceId);
    expect(stackIds).toHaveLength(1);
    expect([s.inst("warudamon").instanceId, s.inst("cometmon").instanceId]).toContain(stackIds[0]);
    expect(linkedIds).toContain(
      stackIds[0] === s.inst("warudamon").instanceId ? s.inst("cometmon").instanceId : s.inst("warudamon").instanceId,
    );
    // Q5396: the ＜Link＞-less card was offered first and still never left the hand.
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("noLink").instanceId);
    // Cost 0 fusion + two cost-free links. CR 8-4-3-3: the fusion procedure itself draws 1.
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand).toHaveLength(2);
    expect(s.events.some((event) => event.kind === "actionRejected")).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("＜Link +1＞: both links survive the rule-check sweep at an attack", async () => {
    // The LinkedMax sweep (CR §4-8-5 / §17-1-3-2-5) runs at rule check and trims links above
    // linkMax(recipient). Base linkMax is 1.
    // FAILS-WHEN-REVERTED: drop the ＜Link +1＞ keyword effect and the sweep trashes the excess
    // link on this attack, so `linked` drops to 1.
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "EX10-073",
              as: "deusmon",
              linked: [
                { card: "BT21-009", as: "linkA" },
                { card: "BT21-041", as: "linkB" },
              ],
            },
          ],
          security: ["BT1-009"],
        },
        1: { security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    // ＜Link +1＞ is NOT a `grantedKeywords` entry: `board.ts` routes the "Link" keyword to
    // `grantLinkMax`, and `mindLink.linkMax` sums that delta onto the base 1 (mindLink.ts
    // BASE_LINK_MAX). So the observable is the linkMax delta, not the keyword list.
    expect(observe(s.engine).linkMaxDelta(s.perm("deusmon"))).toBe(1);
    expect(s.engine.linkMaxOf(s.perm("deusmon"))).toBe(2);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("deusmon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0, 400);

    expect(s.perm("deusmon").linked.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("linkA").instanceId,
      s.inst("linkB").instanceId,
    ]);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).not.toContain(s.inst("linkB").instanceId);
  });

  it("[App Fusion] refuses through the public intent when only one required name is present", async () => {
    // Warudamon on top, but the linked material is Calendamon, not Cometmon => the printed
    // [Warudamon] & [Cometmon] header is unmet.
    // FAILS-WHEN-REVERTED: change either name in `appFusionRequirement` to [Calendamon] and
    // `appFusionCostFor` returns a cost, so the intent is accepted instead of refused.
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX10-019", as: "warudamon", linked: [{ card: "BT21-041", as: "wrongMaterial" }] }],
          hand: [{ card: "EX10-073", as: "deusmon" }],
          deck: ["BT1-009"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const handBefore = s.state.players[0]!.hand.map(({ instanceId }) => instanceId);

    expect(
      s.engine.applyIntent(0, {
        type: "appFusion",
        permanentId: s.perm("warudamon").permanentId,
        instanceId: s.inst("deusmon").instanceId,
        linkedInstanceId: s.inst("wrongMaterial").instanceId,
      }),
    ).toMatchObject({ ok: false });
    expect(s.perm("warudamon").topCard.cardId).toBe("EX10-019");
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual(handBefore);
  });

  it("[End of Opponent's Turn] fires in the REAL turn loop, at the end of the opponent's turn only", async () => {
    // Deusmon sits on seat 1, so seat 0's turn IS "the opponent's turn" for it. Nothing is
    // injected: `startTurnLoop` runs seat 0's turn and its own end step fires the clause.
    // FAILS-WHEN-REVERTED: drop the EndOfOpponentsTurn twin (the printed clause carries BOTH
    // timings) and nothing links in this window.
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { deck: ["BT1-013", "BT1-014", "BT1-009"], hand: ["BT1-013"], security: ["BT1-009"] },
        1: {
          battleArea: [
            { card: "EX10-073", as: "deusmon", under: [{ card: "BT24-036", as: "sourceLink" }] },
            { card: "BT21-009", as: "neighbor" },
          ],
          hand: [
            { card: "BT26-010", as: "handLink" },
            { card: "BT1-009", as: "noLink" },
          ],
          deck: ["BT1-013", "BT1-014", "BT1-009"],
          security: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("noLink").instanceId, s.inst("handLink").instanceId, s.inst("sourceLink").instanceId);
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    // Nothing has fired yet: seat 0's turn has not ended.
    expect(s.perm("deusmon").linked).toHaveLength(0);

    advance(s.engine).endMainPhaseIfOpen(0);
    await settle(() => s.perm("deusmon").linked.length === 2, 2000);

    expect(new Set(s.perm("deusmon").linked.map(({ instanceId }) => instanceId))).toEqual(
      new Set([s.inst("handLink").instanceId, s.inst("sourceLink").instanceId]),
    );
    // "from THIS Digimon's digivolution cards" / recipient is THIS Digimon: the neighbour is
    // neither a source nor a recipient.
    expect(s.perm("neighbor").linked).toHaveLength(0);
    expect(s.perm("deusmon").stack).toHaveLength(0);
    // Q5396 again: the ＜Link＞-less hand card was preferred first and still stayed put.
    expect(s.state.players[1]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("noLink").instanceId);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("grants itself ＜Security A. +1＞ as a live continuous grant carrying the printed +1", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX10-073", as: "deusmon" }] } });
    await s.ready();
    await s.engine.recomputeContinuousEffects();

    // FAILS-WHEN-REVERTED: drop `amount: 1` from the SecurityAttack keyword and the ledger grant
    // carries no amount, so this reads 0 (`observe.keywordAmount` sums `grant.amount ?? 0`).
    expect(observe(s.engine).keywordAmount(s.perm("deusmon"), "SecurityAttack")).toBe(1);
    expect(observe(s.engine).hasKeyword(s.perm("deusmon"), "SecurityAttack")).toBe(true);
  });

  it("takes the second link ONLY from its own digivolution stack, never another Digimon's", async () => {
    // Public route: the same `appFusion` intent, but now a NEIGHBOUR also holds a ＜Link＞-capable
    // card in its digivolution stack, and `preferInstanceIds` offers that foreign card FIRST.
    // No ＜Link＞ card sits in hand, so the hand Link finds nothing and only the
    // "from THIS Digimon's digivolution cards" Link has anything to do.
    // FAILS-WHEN-REVERTED: drop `hostFilter: { isSelfRef: true }` => `candidateLooseInstances`
    // pools every permanent's stack, the preference steers the pick to the NEIGHBOUR's card,
    // and both assertions below go red.
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX10-019", as: "warudamon", linked: [{ card: "EX10-030", as: "cometmon" }] },
            { card: "BT1-009", as: "neighbor", under: [{ card: "BT21-041", as: "foreignSource" }] },
          ],
          hand: [{ card: "EX10-073", as: "deusmon" }],
          deck: ["BT1-013", "BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("foreignSource").instanceId);
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "appFusion",
        permanentId: s.perm("warudamon").permanentId,
        instanceId: s.inst("deusmon").instanceId,
        linkedInstanceId: s.inst("cometmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("warudamon").topCard.cardId === "EX10-073" && s.perm("warudamon").linked.length === 1);

    const linkedIds = s.perm("warudamon").linked.map(({ instanceId }) => instanceId);
    expect(linkedIds).toHaveLength(1);
    expect(linkedIds).not.toContain(s.inst("foreignSource").instanceId);
    expect([s.inst("warudamon").instanceId, s.inst("cometmon").instanceId]).toContain(linkedIds[0]);
    expect(s.perm("neighbor").stack.map(({ instanceId }) => instanceId)).toContain(s.inst("foreignSource").instanceId);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("[Once Per Turn]: a second link-card trash in the same turn deletes nothing more", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "EX10-073",
              dp: 12000,
              as: "deusmon",
              linked: [
                { card: "BT1-009", as: "linkA" },
                { card: "BT1-010", as: "linkB" },
              ],
            },
          ],
        },
        1: {
          battleArea: [
            { card: COST3, dp: 3000, as: "oppLow" },
            { card: COST5, dp: 7000, as: "oppHigh" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const oppLowId = s.perm("oppLow").permanentId;
    const oppHighId = s.perm("oppHigh").permanentId;
    await s.engine.recomputeContinuousEffects();

    await advance(s.engine).verb.trash([s.inst("linkA").instanceId]);
    await settle(() => s.state.players[1]!.battleArea.find((p) => p.permanentId === oppLowId) === undefined, 200);
    await advance(s.engine).verb.trash([s.inst("linkB").instanceId]);
    await settle(() => false, 60);

    // FAILS-WHEN-REVERTED: drop `frequency: "OncePerTurn"` => the second trash fires the watcher
    // again and the (now lowest-cost) cost-5 Digimon is deleted too.
    expect(s.state.players[1]?.battleArea.find((p) => p.permanentId === oppLowId)).toBeUndefined();
    expect(s.state.players[1]?.battleArea.find((p) => p.permanentId === oppHighId)).toBeDefined();
  });

  it("trashing THIS Digimon's link card deletes ONLY the opponent's lowest-cost Digimon (cost-3 over cost-5)", async () => {
    // EX10-073 Deusmon on the controller's field, carrying a LINK card (the genuine link-trash
    // subject). The opponent has a cost-3 and a cost-5 Digimon.
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX10-073", dp: 12000, as: "deusmon", linked: [{ card: "BT1-009", as: "linkCard" }] }],
        },
        1: {
          battleArea: [
            { card: COST3, dp: 3000, as: "oppLow" },
            { card: COST5, dp: 7000, as: "oppHigh" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const deusmon = s.perm("deusmon");
    const linkCard = s.inst("linkCard");
    const oppLowId = s.perm("oppLow").permanentId;
    const oppHighId = s.perm("oppHigh").permanentId;

    // Install EX10-073's continuous whenLinkTrashed watcher.
    await s.engine.recomputeContinuousEffects();

    // Trash THIS Digimon's link card via the REAL production seam (fires whenLinkTrashed).
    await advance(s.engine).verb.trash([linkCard.instanceId]);
    await settle(() => s.state.players[1]!.battleArea.find((p) => p.permanentId === oppLowId) === undefined, 200);

    expect(deusmon.linked.length).toBe(0); // the link card genuinely left the linked list
    // The server narrowed the delete-target prompt to the lowest-cost pool: the cost-5 Digimon was
    // NEVER offered as a candidate (V5 input validation runs over the narrowed set; the candidate
    // ids the engine emits for a permanent target are permanentIds).
    // FAILS-WHEN-REVERTED (lever 1): drop the lowestPlayCost narrowing => the cost-5's permanentId
    // appears in a chooseTargets candidate list => this assertion goes RED.
    const offeredCost5 = s.decisions.some(
      (d) => d.req.kind === "chooseTargets" && (d.req.options?.candidateInstanceIds ?? []).includes(oppHighId),
    );
    expect(offeredCost5).toBe(false);
    // ...and only the cost-3 was deleted; the cost-5 survives.
    expect(s.state.players[1]?.battleArea.find((p) => p.permanentId === oppLowId)).toBeUndefined();
    expect(s.state.players[1]?.battleArea.find((p) => p.permanentId === oppHighId)).toBeDefined();
  });

  it("trashing ANOTHER Digimon's link card does NOT fire (this-Digimon-only self-gate)", async () => {
    // EX10-073 with NO link card of its own. A DIFFERENT friendly Digimon carries the link card
    // that gets trashed.
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX10-073", dp: 12000, as: "deusmon" },
            { card: "BT1-009", dp: 3000, as: "other", linked: [{ card: "BT1-009", as: "otherLink" }] },
          ],
        },
        1: { battleArea: [{ card: COST3, dp: 3000, as: "oppLow" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const otherLink = s.inst("otherLink");
    const oppLowId = s.perm("oppLow").permanentId;

    await s.engine.recomputeContinuousEffects();

    await advance(s.engine).verb.trash([otherLink.instanceId]);
    await settle(() => false, 40);

    // The trashed link card belonged to a DIFFERENT Digimon, not EX10-073 => the watcher must NOT
    // fire => the opponent's Digimon survives.
    // FAILS-WHEN-REVERTED (lever 2): drop the isSelfRef self-gate => the watcher fires on any
    // Digimon's link trash => the opponent's cost-3 is wrongly deleted => this assertion RED.
    expect(s.state.players[1]?.battleArea.find((p) => p.permanentId === oppLowId)).toBeDefined();
  });

  it("Q5188 does not trigger when link-limit replacement trashes one of Deusmon's links", async () => {
    // The auto-responders are load-bearing: the §17-1-3-2-5 sweep asks the controller WHICH
    // excess link card to give up (`GameEngine.chooseExcessLinkCards`, Q6370). Without them
    // that decision hangs, the trim never happens, and the "opponent survived" assertion
    // below would pass for the wrong reason.
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "EX10-073",
              as: "deusmon",
              linked: [
                { card: "BT24-036", as: "oldLink1" },
                { card: "BT26-010", as: "oldLink2" },
              ],
            },
          ],
          hand: [{ card: "BT24-036", as: "newLink" }],
        },
        1: { battleArea: [{ card: COST3, as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("newLink").instanceId,
        targetPermanentId: s.perm("deusmon").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("deusmon").linked.some(({ instanceId }) => instanceId === s.inst("newLink").instanceId));
    await settle(() => s.perm("deusmon").linked.length === 2, 200);

    // The premise must be REAL, or the survival assertion below is vacuous: the third link
    // pushed Deusmon over its linkMax (1 base + ＜Link +1＞ = 2), so the rule sweep trimmed one
    // of the OLD links into the trash. That is a genuine trash of one of THIS Digimon's link
    // cards — and Q5188 says the [All Turns] watcher still must not fire, because a by-rule
    // link-limit trim is suppressed at the trash seam (primitives.ts, whenLinkTrashed).
    expect(s.perm("deusmon").linked).toHaveLength(2);
    const trashedIds = s.state.players[0]!.trash.map(({ instanceId }) => instanceId);
    expect(
      trashedIds.filter((id) => id === s.inst("oldLink1").instanceId || id === s.inst("oldLink2").instanceId),
    ).toHaveLength(1);
    // Q5188: no delete. The opponent's Digimon is untouched.
    expect(s.state.players[1]!.battleArea.some(({ topCard }) => topCard.cardId === COST3)).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
  });
  // ---------------------------------------------------------------------------------------
  // Peer comparison on ONE board. EX10-030 Cometmon prints the SAME shape as Deusmon's
  // clause 5 — `[All Turns] [Once Per Turn]` -> SubTrigger `whenLinkTrashed` with
  // `sourceFilter: { isSelfRef: true }` — but a different payload (-8000 DP for the turn
  // instead of "delete the lowest play cost"). Both sit on the same field, each carrying its
  // own link card, and exactly ONE link card is trashed per test. Only the owning Digimon's
  // watcher may fire, in both directions.
  //
  // `preferInstanceIds` names the cost-5 Digimon so that IF Cometmon's watcher wrongly fired
  // in the Deusmon direction it would land on the card the assertion reads — the isolation
  // assertion is decisive, not lucky. Deusmon's own Delete is narrowed to `lowestPlayCost`,
  // so the same preference cannot steer it.
  const crossFireBoard = () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "EX10-073",
              dp: 12_000,
              as: "deusmon",
              linked: [{ card: "BT1-009", as: "deusLink" }],
            },
            {
              card: "EX10-030",
              dp: 12_000,
              as: "cometmon",
              linked: [{ card: "BT1-013", as: "cometLink" }],
            },
          ],
        },
        1: {
          battleArea: [
            { card: COST3, dp: 20_000, as: "oppLow" },
            { card: COST5, dp: 20_000, as: "oppHigh" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    return { s, preferred };
  };

  it("peer isolation: trashing DEUSMON's link card fires Deusmon's delete and NOT Cometmon's -8000", async () => {
    // FAILS-WHEN-REVERTED: drop `isSelfRef` from EITHER card's `whenLinkTrashed` sourceFilter
    // and the neighbouring watcher cross-fires — Cometmon's -8000 lands on the cost-5 Digimon.
    const { s, preferred } = crossFireBoard();
    preferred.push(s.perm("oppHigh").permanentId);
    const oppLowId = s.perm("oppLow").permanentId;
    const oppHighId = s.perm("oppHigh").permanentId;
    await s.engine.recomputeContinuousEffects();

    await advance(s.engine).verb.trash([s.inst("deusLink").instanceId]);
    await settle(() => s.state.players[1]!.battleArea.find((p) => p.permanentId === oppLowId) === undefined, 300);
    await settle(() => false, 60);

    // Deusmon's payload ran: the lowest-play-cost Digimon is gone.
    expect(s.state.players[1]!.battleArea.map((p) => p.permanentId)).toEqual([oppHighId]);
    // Cometmon's payload did NOT run: the survivor keeps its printed DP even though it was the
    // preferred pick for any -8000 that had fired.
    expect(s.perm("oppHigh").currentDP).toBe(20_000);
    // Only Deusmon lost a link card; Cometmon's own link is untouched.
    expect(s.perm("deusmon").linked).toHaveLength(0);
    expect(s.perm("cometmon").linked.map(({ instanceId }) => instanceId)).toEqual([s.inst("cometLink").instanceId]);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([s.inst("deusLink").instanceId]);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.events.some((event) => event.kind === "actionRejected")).toBe(false);
  });

  it("peer isolation: trashing COMETMON's link card fires Cometmon's -8000 and NOT Deusmon's delete", async () => {
    // The other direction on the same board. FAILS-WHEN-REVERTED: drop `isSelfRef` from
    // Deusmon's `whenLinkTrashed` sourceFilter and the cost-3 Digimon is wrongly deleted here.
    const { s, preferred } = crossFireBoard();
    preferred.push(s.perm("oppHigh").permanentId);
    const oppLowId = s.perm("oppLow").permanentId;
    const oppHighId = s.perm("oppHigh").permanentId;
    await s.engine.recomputeContinuousEffects();

    await advance(s.engine).verb.trash([s.inst("cometLink").instanceId]);
    await settle(() => s.perm("oppHigh").currentDP === 12_000, 300);
    await settle(() => false, 60);

    // Cometmon's payload ran on the preferred target, for the turn.
    expect(s.perm("oppHigh").currentDP).toBe(12_000);
    // Deusmon's payload did NOT run: nothing was deleted, and the cost-3 Digimon — the one
    // Deusmon's `lowestPlayCost` Delete would have taken — is still on the board at full DP.
    expect(s.state.players[1]!.battleArea.map((p) => p.permanentId)).toEqual([oppLowId, oppHighId]);
    expect(s.perm("oppLow").currentDP).toBe(20_000);
    // Only Cometmon lost a link card; Deusmon's own link is untouched.
    expect(s.perm("cometmon").linked).toHaveLength(0);
    expect(s.perm("deusmon").linked.map(({ instanceId }) => instanceId)).toEqual([s.inst("deusLink").instanceId]);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([s.inst("cometLink").instanceId]);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.events.some((event) => event.kind === "actionRejected")).toBe(false);
  });
});
