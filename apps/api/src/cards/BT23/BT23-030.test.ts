import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT23-030.js";

/** The public effect key BT23-030 advertises for its [Main] activation. */
function mainEffectKey(s: ReturnType<typeof setupEngine>): string {
  const advertised = JSON.parse(s.perm("etemon").activatableEffectsJson ?? "[]") as Array<{ effectKey?: string }>;
  const key = advertised.find((effect) => effect.effectKey?.startsWith("BT23-030/"))?.effectKey;
  expect(key).toBeDefined();
  return key!;
}

describe("BT23-030 Etemon", () => {
  it("pays exactly 1, plays only an eligible card free and grants both keywords to one Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-030", as: "etemon" }],
          hand: [
            { card: "BT23-049", as: "eligible" },
            { card: "BT23-055", as: "tooExpensive" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    const eligibleId = s.inst("eligible").instanceId;

    await advance(s.engine).fire(EffectTiming.OnDeclaration, s.perm("etemon"));

    expect(s.state.memory).toBe(4);
    expect(s.state.players[0]!.battleArea.some((card) => card.topCard?.instanceId === eligibleId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT23-055")).toBe(true);
    const recipients = s.state.players[0]!.battleArea.filter(
      (card) => observe(s.engine).hasKeyword(card, "Reboot") && observe(s.engine).hasKeyword(card, "Blocker"),
    );
    expect(recipients).toHaveLength(1);
  });

  it("activates Main through the advertised public effect and pays exactly 1", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-030", as: "etemon" },
            { card: "BT1-009", as: "recipient" },
          ],
          hand: [{ card: "BT23-049", as: "eligible" }],
          deck: ["BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 5;
    const advertised = JSON.parse(s.perm("etemon").activatableEffectsJson ?? "[]") as Array<{ effectKey?: string }>;
    const effectKey = advertised.find((effect) => effect.effectKey?.startsWith("BT23-030/"))?.effectKey;
    expect(effectKey).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.inst("etemon").instanceId,
        effectKey: effectKey!,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 4 && s.state.pendingDecision === undefined);
    await s.ready();
    expect(s.state.memory).toBe(4);
    expect(s.perm("recipient").currentDP).toBe(3000);
    const recipients = s.state.players[0]!.battleArea.filter(
      (permanent) =>
        observe(s.engine).hasKeyword(permanent, "Reboot") && observe(s.engine).hasKeyword(permanent, "Blocker"),
    );
    expect(recipients).toHaveLength(1);
  });

  it("declares Alliance", () => {
    expect(getCardDefinition("BT23-030")).toMatchObject({
      cardId: "BT23-030",
      nameEn: "Etemon",
      colors: ["Yellow", "Black"],
      level: 5,
      playCost: 7,
      dp: 7000,
      evoCosts: [
        { color: "Yellow", level: 4, memoryCost: 4 },
        { color: "Black", level: 4, memoryCost: 4 },
      ],
      forms: ["Ultimate"],
      attributes: ["Virus"],
      types: ["Puppet", "CS"],
      inheritedEffectText: "＜Alliance＞",
    });
    const staticEffect = compiled.effects.find((entry) => entry.trigger === "Static") as any;
    expect(staticEffect.keywords).toEqual([{ keyword: "Alliance", raw: "＜Alliance＞" }]);
  });

  it("once per turn pays 1 cost before optionally playing an eligible card", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "Main") as any;
    expect(effect.frequency).toBe("OncePerTurn");
    expect(effect.actions[0]).toMatchObject({
      kind: "CostGatedBlock",
      cost: { kind: "payMemory", memory: 1 },
      optional: true,
      abortOnDecline: true,
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              playCostLte: 3,
              nameOrTrait: [
                { tokens: ["Chuumon", "Sukamon"], match: "name" },
                { tokens: ["CS"], match: "trait" },
              ],
            },
            count: 1,
            upTo: true,
          },
          optional: true,
        },
        expect.objectContaining({ kind: "GainKeyword", keyword: { keyword: "Reboot", raw: "＜Reboot＞" } }),
        expect.objectContaining({ kind: "GainKeyword", keyword: { keyword: "Blocker", raw: "＜Blocker＞" } }),
      ],
    });
  });

  it("gives the same level 3-or-higher Digimon both Reboot and Blocker", () => {
    const actions = (compiled.effects.find((entry) => entry.trigger === "Main") as any).actions[0].actions;
    expect(actions[1]).toMatchObject({ kind: "GainKeyword", keyword: { keyword: "Reboot" }, target: { count: 1 } });
    expect(actions[2]).toMatchObject({
      kind: "GainKeyword",
      keyword: { keyword: "Blocker" },
      target: { count: 1, sameTarget: true },
      duration: "untilOpponentTurnEnd",
    });
  });

  it("declares inherited Alliance", () => {
    expect(compiled.effects.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "Static",
      isInherited: true,
      keywords: [{ keyword: "Alliance" }],
    });
  });

  it("may decline the play only after paying 1 and still grants both mandatory keywords, per Q5273-Q5274", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT23-030", as: "etemon" }], hand: [{ card: "BT23-049", as: "eligible" }] },
    });
    s.state.memory = 5;
    const resolution = advance(s.engine).fire(EffectTiming.OnDeclaration, s.perm("etemon"));
    await settle(() => s.decisions.filter(({ req }) => req.kind === "optional").length >= 1);
    const costPrompt = s.decisions.filter(({ req }) => req.kind === "optional")[0]!.req;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: costPrompt.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.decisions.filter(({ req }) => req.kind === "optional").length >= 2);
    const playPrompt = s.decisions.filter(({ req }) => req.kind === "optional")[1]!.req;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: playPrompt.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await resolution;
    expect(s.state.memory).toBe(4);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("eligible").instanceId);
    expect(observe(s.engine).hasKeyword(s.perm("etemon"), "Reboot")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("etemon"), "Blocker")).toBe(true);
  });

  it("may decline the By payment before spending memory or granting the dependent keywords", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT23-030", as: "etemon" }], hand: [{ card: "BT23-049", as: "eligible" }] } },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await advance(s.engine).fire(EffectTiming.OnDeclaration, s.perm("etemon"));
    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("eligible").instanceId);
    expect(observe(s.engine).hasKeyword(s.perm("etemon"), "Reboot")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("etemon"), "Blocker")).toBe(false);
  });

  it("does not free-play an opponent card or a cost-4/near-trait card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-030", as: "etemon" },
            { card: "BT1-009", as: "recipient" },
          ],
          hand: [
            { card: "BT23-055", as: "tooExpensive" },
            { card: "BT1-009", as: "near" },
          ],
        },
        1: { hand: [{ card: "BT23-049", as: "opponentCard" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 5;
    const advertised = JSON.parse(s.perm("etemon").activatableEffectsJson ?? "[]") as Array<{ effectKey?: string }>;
    const effectKey = advertised.find((effect) => effect.effectKey?.startsWith("BT23-030/"))?.effectKey;
    expect(effectKey).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.inst("etemon").instanceId,
        effectKey: effectKey!,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 4 && s.state.pendingDecision === undefined);
    expect(
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard.instanceId === s.inst("tooExpensive").instanceId,
      ),
    ).toBe(false);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("tooExpensive").instanceId)).toBe(true);
    expect(s.state.players[1]!.hand.some((card) => card.instanceId === s.inst("opponentCard").instanceId)).toBe(true);
  });

  it("plays a cost-3 Chuumon-name card for free and grants both keywords to one target until opponent end", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-030", as: "etemon" },
            { card: "BT1-009", as: "first" },
            { card: "BT1-009", as: "second" },
          ],
          hand: [{ card: "BT11-036", as: "chuumon" }],
          deck: Array(10).fill("BT1-010"),
        },
        1: { deck: Array(10).fill("BT1-011") },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 5;
    const advertised = JSON.parse(s.perm("etemon").activatableEffectsJson ?? "[]") as Array<{ effectKey?: string }>;
    const effectKey = advertised.find((effect) => effect.effectKey?.startsWith("BT23-030/"))?.effectKey;
    expect(effectKey).toBeDefined();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.inst("etemon").instanceId,
        effectKey: effectKey!,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 4 && s.state.pendingDecision === undefined);
    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("chuumon").instanceId),
    ).toBe(true);
    const recipients = s.state.players[0]!.battleArea.filter(
      (permanent) =>
        observe(s.engine).hasKeyword(permanent, "Reboot") && observe(s.engine).hasKeyword(permanent, "Blocker"),
    );
    expect(recipients).toHaveLength(1);
    expect(recipients[0]!.permanentId).not.toBe(s.perm("second").permanentId);
    expect(observe(s.engine).hasKeyword(s.perm("second"), "Reboot")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("second"), "Blocker")).toBe(false);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(recipients[0]!.permanentId).toBeDefined();
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    expect(observe(s.engine).hasKeyword(recipients[0]!, "Reboot")).toBe(false);
    expect(observe(s.engine).hasKeyword(recipients[0]!, "Blocker")).toBe(false);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("free-plays a cost-3 CS Tamer as a word-card eligible target", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-030", as: "etemon" }],
          hand: [{ card: "BT23-078", as: "tamer" }],
          deck: ["BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 5;
    const advertised = JSON.parse(s.perm("etemon").activatableEffectsJson ?? "[]") as Array<{ effectKey?: string }>;
    const effectKey = advertised.find((effect) => effect.effectKey?.startsWith("BT23-030/"))?.effectKey;
    expect(effectKey).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.inst("etemon").instanceId,
        effectKey: effectKey!,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 4 && s.state.pendingDecision === undefined);
    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("tamer").instanceId),
    ).toBe(true);
  });

  it("rejects a same-source Main reactivation in the same turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT23-030", as: "etemon" }], deck: ["BT1-010", "BT1-011"] } });
    await s.ready();
    s.state.memory = 5;
    const advertised = JSON.parse(s.perm("etemon").activatableEffectsJson ?? "[]") as Array<{ effectKey?: string }>;
    const effectKey = advertised.find((effect) => effect.effectKey?.startsWith("BT23-030/"))?.effectKey;
    expect(effectKey).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.inst("etemon").instanceId,
        effectKey: effectKey!,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 4 && s.state.pendingDecision === undefined);
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.inst("etemon").instanceId,
        effectKey: effectKey!,
      }),
    ).toMatchObject({ ok: false });
  });

  it.each([
    ["normal yellow", "BT1-051", undefined, 4],
    ["normal black", "BT10-061", undefined, 4],
    ["exact Sukamon name", "BT11-040", 0, 3],
    ["CS level 4", "BT23-041", 1, 3],
  ])("publicly evolves Etemon from %s", async (_label, sourceCard, alternateRequirementIndex, cost) => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: sourceCard, as: "source" }],
        hand: [{ card: "BT23-030", as: "etemon" }],
        deck: [{ card: "BT1-009", as: "drawn" }, "BT1-010"],
      },
    });
    s.state.memory = cost;
    const sourceId = s.inst("source").instanceId;
    const etemonId = s.inst("etemon").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: etemonId,
        ...(alternateRequirementIndex === undefined ? {} : { useAlternateCost: true, alternateRequirementIndex }),
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").topCard.instanceId === etemonId);
    expect(s.perm("source").topCard.instanceId).toBe(etemonId);
    expect(s.perm("source").stack.map((card) => card.instanceId)).toEqual([sourceId]);
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand[0]!.instanceId).toBe(s.inst("drawn").instanceId);
  });
  it("free-plays PlatinumSukamon because [Sukamon] in name is a substring gate", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-030", as: "etemon" }],
          hand: [{ card: "BT13-065", as: "platinumSukamon" }],
          deck: ["BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.inst("etemon").instanceId,
        effectKey: mainEffectKey(s),
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 4 && s.state.pendingDecision === undefined);
    expect(
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard.instanceId === s.inst("platinumSukamon").instanceId,
      ),
    ).toBe(true);
    expect(s.state.players[0]!.hand).toHaveLength(0);
  });

  it("refuses a cost-4 name match and a near-trait card, yet still pays 1 and grants both keywords", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-030", as: "etemon" }],
          hand: [
            { card: "BT10-073", as: "costFourChuuChuumon" },
            { card: "BT16-039", as: "abadinElectronics" },
          ],
          deck: ["BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.inst("etemon").instanceId,
        effectKey: mainEffectKey(s),
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 4 && s.state.pendingDecision === undefined);
    expect(s.state.memory).toBe(4);
    expect(s.state.players[0]!.hand.map((card) => card.cardId).sort()).toEqual(["BT10-073", "BT16-039"]);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(observe(s.engine).hasKeyword(s.perm("etemon"), "Reboot")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("etemon"), "Blocker")).toBe(true);
  });

  it("never grants the keywords to the non-Digimon CS card it just played", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-030", as: "etemon" }],
          hand: [{ card: "BT23-078", as: "tamer" }],
          deck: ["BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.inst("etemon").instanceId,
        effectKey: mainEffectKey(s),
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 4 && s.state.pendingDecision === undefined);
    const tamer = s.state.players[0]!.battleArea.find(
      (permanent) => permanent.topCard.instanceId === s.inst("tamer").instanceId,
    );
    expect(tamer).toBeDefined();
    expect(observe(s.engine).hasKeyword(tamer!, "Reboot")).toBe(false);
    expect(observe(s.engine).hasKeyword(tamer!, "Blocker")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("etemon"), "Reboot")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("etemon"), "Blocker")).toBe(true);
  });

  it("granted Reboot unsuspends the target in the opponent's turn and granted Blocker blocks an attack", async () => {
    const prefer: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-030", as: "etemon" },
            { card: "BT1-009", as: "control" },
          ],
          hand: [{ card: "BT1-010", as: "spare" }],
          deck: Array(12).fill("BT1-010"),
          security: ["BT1-009", "BT1-009"],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "raider" }],
          deck: Array(12).fill("BT1-011"),
          security: ["BT1-010", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: prefer },
    );
    await s.ready();
    prefer.push(s.perm("etemon").topCard.instanceId);
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.inst("etemon").instanceId,
        effectKey: mainEffectKey(s),
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 4 && s.state.pendingDecision === undefined);
    expect(observe(s.engine).hasKeyword(s.perm("etemon"), "Reboot")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("etemon"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("control"), "Reboot")).toBe(false);

    s.perm("etemon").isSuspended = true;
    s.perm("control").isSuspended = true;
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);

    expect(s.perm("etemon").isSuspended).toBe(false);
    expect(s.perm("control").isSuspended).toBe(true);

    const securityBefore = s.state.players[0]!.security.length;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("raider").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("etemon").permanentId })).toEqual(
      { ok: true },
    );
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[0]!.security).toHaveLength(securityBefore);
    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === s.perm("etemon").permanentId),
    ).toBe(true);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("resets the once per turn limit for the same physical Etemon on its controller's next turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-030", as: "etemon" }],
          hand: [{ card: "BT1-010", as: "spare" }],
          deck: Array(12).fill("BT1-010"),
        },
        1: { deck: Array(12).fill("BT1-011") },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const etemonPermanentId = s.perm("etemon").permanentId;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 5;
    const effectKey = mainEffectKey(s);
    expect(
      s.engine.applyIntent(0, { type: "activateEffect", sourceInstanceId: s.inst("etemon").instanceId, effectKey }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 4 && s.state.pendingDecision === undefined);
    expect(
      s.engine.applyIntent(0, { type: "activateEffect", sourceInstanceId: s.inst("etemon").instanceId, effectKey }),
    ).toMatchObject({ ok: false });
    expect(s.perm("etemon").activatableEffectsJson ?? "").not.toContain("BT23-030/");
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(s.perm("etemon").activatableEffectsJson ?? "").not.toContain("BT23-030/");
    expect(
      s.engine.applyIntent(0, { type: "activateEffect", sourceInstanceId: s.inst("etemon").instanceId, effectKey }),
    ).toMatchObject({ ok: false });
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);

    expect(s.perm("etemon").permanentId).toBe(etemonPermanentId);
    const memoryBefore = (s.state.memory = 5);
    expect(
      s.engine.applyIntent(0, { type: "activateEffect", sourceInstanceId: s.inst("etemon").instanceId, effectKey }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === memoryBefore - 1 && s.state.pendingDecision === undefined);
    expect(s.state.memory).toBe(4);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it.each([
    ["printed", { card: "BT23-030", as: "attacker" }],
    ["inherited", { card: "BT1-016", as: "attacker", under: [{ card: "BT23-030" }] }],
  ])("publicly accepts %s Alliance and suspends the chosen ally", async (_label, attackerSpec) => {
    const s = setupEngine({
      0: { battleArea: [attackerSpec as never, { card: "BT1-009", as: "ally" }], deck: Array(8).fill("BT1-010") },
      1: { security: ["BT1-009", "BT1-009", "BT1-009"], deck: Array(8).fill("BT1-011") },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "alliancePrompt"));
    expect(s.engine.applyIntent(0, { type: "respondAlliance", allyPermanentId: s.perm("ally").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.events.some((event) => event.kind === "allianceResolved") && !observe(s.engine).isAttacking());
    expect(s.perm("attacker").isSuspended).toBe(true);
    expect(s.perm("ally").isSuspended).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it.each([
    ["printed", { card: "BT23-030", as: "attacker" }],
    ["inherited", { card: "BT1-016", as: "attacker", under: [{ card: "BT23-030" }] }],
  ])("publicly refuses %s Alliance and leaves the ally unsuspended", async (_label, attackerSpec) => {
    const s = setupEngine({
      0: { battleArea: [attackerSpec as never, { card: "BT1-009", as: "ally" }], deck: Array(8).fill("BT1-010") },
      1: { security: ["BT1-009", "BT1-009", "BT1-009"], deck: Array(8).fill("BT1-011") },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "alliancePrompt"));
    expect(s.engine.applyIntent(0, { type: "respondAlliance" })).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "allianceResolved") && !observe(s.engine).isAttacking());
    expect(s.perm("attacker").isSuspended).toBe(true);
    expect(s.perm("ally").isSuspended).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(2);
  });
});
