import { appFusionCostFor, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT23-022.js";

describe("BT23-022 Oujamon", () => {
  it("declares Raid", () => {
    expect(getCardDefinition("BT23-022")).toMatchObject({
      cardId: "BT23-022",
      nameEn: "Oujamon",
      colors: ["Blue", "Red"],
      level: 5,
      playCost: 9,
      dp: 9000,
      forms: ["Ult.", "Appmon"],
      attributes: ["Game"],
      types: ["Battle"],
      linkDp: 4000,
      linkEffect: "＜Security A. +1＞",
      linkRequirement: "[Link] [Appmon]\u00a0trait: Cost 3",
    });
    const staticEffect = compiled.effects.find((entry) => entry.trigger === "Static" && !entry.isLinked) as any;
    expect(staticEffect.keywords).toEqual([{ keyword: "Raid", raw: "＜Raid＞" }]);
  });

  it("shares one Once Per Turn link activation across When Digivolving and When Attacking", () => {
    for (const trigger of ["WhenDigivolving", "WhenAttacking"]) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger) as any;
      expect(effect).toMatchObject({ frequency: "OncePerTurn", sharedUseKey: "ir-shared-0" });
      expect(effect.actions[0]).toMatchObject({
        kind: "Link",
        target: {
          source: "thisDigimon",
          filter: { controller: "mine", kind: ["Digimon"], levelComparison: { op: "lte", value: 4 } },
          count: 1,
        },
        payCost: false,
        optional: true,
      });
    }
  });

  it("once per turn may unsuspend only when this Digimon gets linked", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "AllTurns") as any;
    expect(effect.frequency).toBe("OncePerTurn");
    expect(effect.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenLinked",
      sourceFilter: { isSelfRef: true },
      actions: [{ kind: "Unsuspend", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, optional: true }],
    });
    expect(compiled.linkRequirement).toEqual([{ traits: ["Appmon"], cost: 3 }]);
    expect(compiled.effects.find((entry) => entry.isLinked)).toMatchObject({
      trigger: "Static",
      keywords: [{ keyword: "SecurityAttack", amount: 1 }],
    });
    expect(appFusionCostFor("BT23-022", { topName: "Dosukomon", linkedNames: ["Coachmon"] })).toBe(0);
    expect(appFusionCostFor("BT23-022", { topName: "Coachmon", linkedNames: ["Dosukomon"] })).toBe(0);
  });

  it("links onto an Appmon for 3, adds 4000 DP, and grants Security Attack +1", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT21-009", as: "host" }], hand: [{ card: "BT23-022", as: "oujamon" }] },
      1: { security: ["BT1-001", "BT1-001", "BT1-001"] },
    });
    s.state.memory = 5;
    const baseDp = s.perm("host").currentDP;
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("oujamon").instanceId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").linked.some((card) => card.instanceId === s.inst("oujamon").instanceId));
    expect(s.state.memory).toBe(2);
    expect(s.perm("host").currentDP).toBe(baseDp + 4000);
    expect(observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack")).toBe(1);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.players[1]!.security.length === 1);
    expect(observe(s.engine).isAttacking()).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("publicly uses Raid to redirect a player attack to the highest-DP unsuspended Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT23-022", as: "oujamon", dp: 9000 }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "low", dp: 4000 },
            { card: "BT1-010", as: "high", dp: 8000 },
          ],
          security: ["BT1-001", "BT1-002"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    const highId = s.perm("high").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("oujamon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === highId));
    expect(s.state.players[1]!.security).toHaveLength(2);
    expect(s.state.players[1]!.battleArea.map((p) => p.permanentId)).toEqual([s.perm("low").permanentId]);
  });

  it("shares the link use across public evolution and attack, then resets next turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-020", as: "base" }],
          hand: [
            { card: "BT23-022", as: "oujamon" },
            { card: "BT23-007", as: "firstLink" },
            { card: "BT23-007", as: "secondLink" },
          ],
          deck: ["BT1-001", "BT1-002", "BT1-003"],
        },
        1: {
          hand: [{ card: "ST1-02", as: "neutralPlay" }],
          security: ["BT1-001", "BT1-002", "BT1-003"],
          deck: ["BT1-004", "BT1-005", "BT1-006"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 5;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("oujamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").linked.length === 1);
    expect(s.perm("base").linked.map((card) => card.instanceId)).toEqual([s.inst("firstLink").instanceId]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("base").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(observe(s.engine).isAttacking()).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(2);
    expect(s.perm("base").linked.map((card) => card.instanceId)).toEqual([s.inst("firstLink").instanceId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("secondLink").instanceId);
    const firstLinkId = s.inst("firstLink").instanceId;
    const secondLinkId = s.inst("secondLink").instanceId;
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("base").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.perm("base").linked).toHaveLength(1);
    expect(s.perm("base").linked.map((card) => card.instanceId)).toEqual([secondLinkId]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(firstLinkId);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(observe(s.engine).isAttacking()).toBe(false);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("rejects Link onto a non-Appmon without spending memory", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "host" }], hand: [{ card: "BT23-022", as: "oujamon" }] },
    });
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("oujamon").instanceId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: false, reason: "link-requirement-unmet" });
    expect(s.state.memory).toBe(5);
  });

  it("when digivolving links a level-4 Link card for free and excludes a no-Link peer, per Q5243", async () => {
    const valid = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-020", as: "base" }],
          hand: [
            { card: "BT23-022", as: "oujamon" },
            { card: "BT23-021", as: "link" },
          ],
          deck: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    valid.state.memory = 4;
    expect(
      valid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: valid.perm("base").permanentId,
        instanceId: valid.inst("oujamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => valid.perm("base").linked.some((card) => card.instanceId === valid.inst("link").instanceId));
    expect(valid.state.memory).toBe(0);

    const invalid = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-020", as: "base" }],
          hand: [
            { card: "BT23-022", as: "oujamon" },
            { card: "BT23-018", as: "noLink" },
          ],
          deck: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    invalid.state.memory = 4;
    expect(
      invalid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: invalid.perm("base").permanentId,
        instanceId: invalid.inst("oujamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(invalid.perm("base").linked).toHaveLength(0);
    expect(invalid.state.players[0]!.hand.map((card) => card.instanceId)).toContain(invalid.inst("noLink").instanceId);
  });

  it("when digivolving links from this Digimon's stack, not another friendly stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-020", as: "base", under: [{ card: "BT23-007", as: "ownLink" }] },
            { card: "BT23-020", as: "otherHost", under: [{ card: "BT23-007", as: "otherLink" }] },
          ],
          hand: [{ card: "BT23-022", as: "oujamon" }],
          deck: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("oujamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").linked.some((card) => card.instanceId === s.inst("ownLink").instanceId));

    expect(s.perm("base").linked.map((card) => card.instanceId)).toContain(s.inst("ownLink").instanceId);
    expect(s.perm("otherHost").stack.map((card) => card.instanceId)).toContain(s.inst("otherLink").instanceId);
    expect(s.perm("otherHost").linked.map((card) => card.instanceId)).not.toContain(s.inst("otherLink").instanceId);
  });

  it("may unsuspend when it gets linked and may refuse", async () => {
    for (const accept of [true, false]) {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "BT23-022", as: "oujamon", suspended: true }],
            hand: [{ card: "BT23-007", as: "link" }],
          },
        },
        accept ? { autoAcceptOptional: true } : { autoDeclineOptional: true },
      );
      s.state.memory = 3;
      expect(
        s.engine.applyIntent(0, {
          type: "linkCard",
          instanceId: s.inst("link").instanceId,
          targetPermanentId: s.perm("oujamon").permanentId,
        }),
      ).toEqual({ ok: true });
      await settle();
      expect(s.perm("oujamon").isSuspended).toBe(!accept);
    }
  });
});
