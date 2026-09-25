import { getCardDefinition } from "@aegis/shared";
import { describe, it, expect } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX10-073.js";
import "../index.js";

const COST3 = "BT1-010";
const COST5 = "AD1-001";

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
    const linkedIds = deusmon.linked.map(({ instanceId }) => instanceId);
    expect(linkedIds).toContain(s.inst("handLink").instanceId);
    expect(linkedIds).toHaveLength(2);
    const stackIds = deusmon.stack.map(({ instanceId }) => instanceId);
    expect(stackIds).toHaveLength(1);
    expect([s.inst("warudamon").instanceId, s.inst("cometmon").instanceId]).toContain(stackIds[0]);
    expect(linkedIds).toContain(
      stackIds[0] === s.inst("warudamon").instanceId ? s.inst("cometmon").instanceId : s.inst("warudamon").instanceId,
    );
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("noLink").instanceId);
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand).toHaveLength(2);
    expect(s.events.some((event) => event.kind === "actionRejected")).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(
      s.decisions
        .filter(({ req }) => req.kind === "optional" && req.sourceCardId === "EX10-073")
        .map(({ req }) => req.options?.effectTextPart),
    ).toEqual([
      "[When Digivolving] [End of Opponent's Turn] You may link 1 Digimon card from your hand to this Digimon " +
        "without paying the cost.",
      "Then, you may link 1 Digimon card from this Digimon's digivolution cards to this Digimon without paying the cost.",
    ]);
  });

  it("＜Link +1＞: both links survive the rule-check sweep at an attack", async () => {
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

    expect(s.perm("deusmon").linked).toHaveLength(0);

    advance(s.engine).endMainPhaseIfOpen(0);
    await settle(() => s.perm("deusmon").linked.length === 2, 2000);

    expect(new Set(s.perm("deusmon").linked.map(({ instanceId }) => instanceId))).toEqual(
      new Set([s.inst("handLink").instanceId, s.inst("sourceLink").instanceId]),
    );
    expect(s.perm("neighbor").linked).toHaveLength(0);
    expect(s.perm("deusmon").stack).toHaveLength(0);
    expect(s.state.players[1]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("noLink").instanceId);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("grants itself ＜Security A. +1＞ as a live continuous grant carrying the printed +1", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX10-073", as: "deusmon" }] } });
    await s.ready();
    await s.engine.recomputeContinuousEffects();

    expect(observe(s.engine).keywordAmount(s.perm("deusmon"), "SecurityAttack")).toBe(1);
    expect(observe(s.engine).hasKeyword(s.perm("deusmon"), "SecurityAttack")).toBe(true);
  });

  it("takes the second link ONLY from its own digivolution stack, never another Digimon's", async () => {
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

    expect(s.state.players[1]?.battleArea.find((p) => p.permanentId === oppLowId)).toBeUndefined();
    expect(s.state.players[1]?.battleArea.find((p) => p.permanentId === oppHighId)).toBeDefined();
  });

  it("trashing THIS Digimon's link card deletes ONLY the opponent's lowest-cost Digimon (cost-3 over cost-5)", async () => {
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

    await s.engine.recomputeContinuousEffects();

    await advance(s.engine).verb.trash([linkCard.instanceId]);
    await settle(() => s.state.players[1]!.battleArea.find((p) => p.permanentId === oppLowId) === undefined, 200);

    expect(deusmon.linked.length).toBe(0);
    const offeredCost5 = s.decisions.some(
      (d) => d.req.kind === "chooseTargets" && (d.req.options?.candidateInstanceIds ?? []).includes(oppHighId),
    );
    expect(offeredCost5).toBe(false);
    expect(s.state.players[1]?.battleArea.find((p) => p.permanentId === oppLowId)).toBeUndefined();
    expect(s.state.players[1]?.battleArea.find((p) => p.permanentId === oppHighId)).toBeDefined();
  });

  it("trashing ANOTHER Digimon's link card does NOT fire (this-Digimon-only self-gate)", async () => {
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

    expect(s.state.players[1]?.battleArea.find((p) => p.permanentId === oppLowId)).toBeDefined();
  });

  it("Q5188 does not trigger when link-limit replacement trashes one of Deusmon's links", async () => {
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

    expect(s.perm("deusmon").linked).toHaveLength(2);
    const trashedIds = s.state.players[0]!.trash.map(({ instanceId }) => instanceId);
    expect(
      trashedIds.filter((id) => id === s.inst("oldLink1").instanceId || id === s.inst("oldLink2").instanceId),
    ).toHaveLength(1);
    expect(s.state.players[1]!.battleArea.some(({ topCard }) => topCard.cardId === COST3)).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
  });
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
    const { s, preferred } = crossFireBoard();
    preferred.push(s.perm("oppHigh").permanentId);
    const oppLowId = s.perm("oppLow").permanentId;
    const oppHighId = s.perm("oppHigh").permanentId;
    await s.engine.recomputeContinuousEffects();

    await advance(s.engine).verb.trash([s.inst("deusLink").instanceId]);
    await settle(() => s.state.players[1]!.battleArea.find((p) => p.permanentId === oppLowId) === undefined, 300);
    await settle(() => false, 60);

    expect(s.state.players[1]!.battleArea.map((p) => p.permanentId)).toEqual([oppHighId]);
    expect(s.perm("oppHigh").currentDP).toBe(20_000);
    expect(s.perm("deusmon").linked).toHaveLength(0);
    expect(s.perm("cometmon").linked.map(({ instanceId }) => instanceId)).toEqual([s.inst("cometLink").instanceId]);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([s.inst("deusLink").instanceId]);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.events.some((event) => event.kind === "actionRejected")).toBe(false);
  });

  it("peer isolation: trashing COMETMON's link card fires Cometmon's -8000 and NOT Deusmon's delete", async () => {
    const { s, preferred } = crossFireBoard();
    preferred.push(s.perm("oppHigh").permanentId);
    const oppLowId = s.perm("oppLow").permanentId;
    const oppHighId = s.perm("oppHigh").permanentId;
    await s.engine.recomputeContinuousEffects();

    await advance(s.engine).verb.trash([s.inst("cometLink").instanceId]);
    await settle(() => s.perm("oppHigh").currentDP === 12_000, 300);
    await settle(() => false, 60);

    expect(s.perm("oppHigh").currentDP).toBe(12_000);
    expect(s.state.players[1]!.battleArea.map((p) => p.permanentId)).toEqual([oppLowId, oppHighId]);
    expect(s.perm("oppLow").currentDP).toBe(20_000);
    expect(s.perm("cometmon").linked).toHaveLength(0);
    expect(s.perm("deusmon").linked.map(({ instanceId }) => instanceId)).toEqual([s.inst("deusLink").instanceId]);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([s.inst("cometLink").instanceId]);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.events.some((event) => event.kind === "actionRejected")).toBe(false);
  });

  it("public linked Mienumon effect pays its link-trash cost and triggers Deusmon", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX10-073", as: "deusmon", linked: [] },
            { card: "BT1-009", as: "attacker" },
          ],
          hand: [{ card: "EX10-017", as: "mienumon" }],
          deck: [{ card: "BT1-013", as: "drawn" }],
        },
        1: {
          battleArea: [
            { card: "BT1-031", as: "blocker" },
            { card: COST3, as: "oppLow" },
            { card: COST5, as: "oppHigh" },
          ],
          security: ["BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    await s.ready();
    s.state.memory = 2;
    const oppLowId = s.perm("oppLow").permanentId;
    const oppHighId = s.perm("oppHigh").permanentId;
    preferred.push(s.perm("oppLow").topCard.instanceId);

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("mienumon").instanceId,
        targetPermanentId: s.perm("deusmon").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("deusmon").linked.some(({ instanceId }) => instanceId === s.inst("mienumon").instanceId));
    expect(s.state.memory).toBe(0);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(
      s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: s.perm("blocker").permanentId }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("deusmon").linked.length === 0 &&
        s.state.players[1]!.battleArea.every((permanent) => permanent.permanentId !== oppLowId) &&
        s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("drawn").instanceId),
    );

    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("mienumon").instanceId);
    expect(s.perm("deusmon").linked).toHaveLength(0);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("drawn").instanceId);
    expect(s.state.memory).toBe(1);
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([oppHighId]);
    expect(s.state.players[1]!.trash.map(({ cardId }) => cardId)).toContain("BT1-031");
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.events.some((event) => event.kind === "actionRejected")).toBe(false);
  });
});
