import { EffectDuration, appFusionCostFor, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT23-021.js";

describe("BT23-021 Dosukomon", () => {
  it("shares one Once Per Turn link effect across digivolving and attacking", () => {
    expect(getCardDefinition("BT23-021")).toMatchObject({
      cardId: "BT23-021",
      nameEn: "Dosukomon",
      colors: ["Blue", "Green"],
      level: 4,
      playCost: 6,
      dp: 6000,
      evoCosts: [
        { color: "Blue", level: 3, memoryCost: 3 },
        { color: "Green", level: 3, memoryCost: 3 },
      ],
      forms: ["Sup.", "Appmon"],
      attributes: ["Game"],
      types: ["Fighting"],
      linkDp: 3000,
      linkEffect: "[When Linking] This Digimon can't be deleted in battle until your opponent's turn ends.",
      linkRequirement: "[Link] [Appmon]\u00a0trait: Cost 2",
    });
    expect(compiled.effects.filter(({ trigger }) => ["WhenDigivolving", "WhenAttacking"].includes(trigger))).toEqual([
      expect.objectContaining({ frequency: "OncePerTurn", sharedUseKey: "ir-shared-0" }),
      expect.objectContaining({ frequency: "OncePerTurn", sharedUseKey: "ir-shared-0" }),
    ]);
    for (const trigger of ["WhenDigivolving", "WhenAttacking"]) {
      expect(compiled.effects.find((entry) => entry.trigger === trigger)).toMatchObject({
        actions: [{ target: { source: "thisDigimon" } }],
      });
    }
  });

  it("installs only the printed Your Turn linked battle-deletion immunity", () => {
    const effect = compiled.effects.find(({ trigger }) => trigger === "YourTurn")!;
    expect(effect).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenLinked",
          sourceFilter: { isSelfRef: true },
          actions: [{ kind: "Restrict", restriction: "beDeletedInBattle", duration: "untilOpponentTurnEnd" }],
        },
      ],
    });
    expect(compiled.effects.find(({ trigger }) => trigger === "WhenLinking")).toMatchObject({
      isLinked: true,
      actions: [{ kind: "Restrict", restriction: "beDeletedInBattle", duration: "untilOpponentTurnEnd" }],
    });
    expect(compiled.linkRequirement).toEqual([{ traits: ["Appmon"], cost: 2 }]);
    expect(compiled.appFusionRequirement).toEqual([{ names: ["Dokamon", "Perorimon", "Musclemon"], cost: 0 }]);
  });

  it("links Dosukomon to an Appmon for 2 and applies its linked battle immunity", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT21-009", as: "host" }],
        hand: [{ card: "BT23-021", as: "dosukomon" }],
      },
    });
    s.state.memory = 5;
    const baseDp = s.perm("host").currentDP;
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("dosukomon").instanceId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").linked.some((card) => card.instanceId === s.inst("dosukomon").instanceId));
    expect(s.state.memory).toBe(3);
    expect(s.perm("host").currentDP).toBe(baseDp + 3000);
    expect(observe(s.engine).isRestricted(s.perm("host"), "beDeletedInBattle")).toBe(true);
  });

  it("rejects the printed Link onto a non-Appmon without moving the card", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "host" }], hand: [{ card: "BT23-021", as: "dosukomon" }] },
    });
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("dosukomon").instanceId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: false, reason: "link-requirement-unmet" });
    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("dosukomon").instanceId);
  });

  it("when digivolving links only a level-3 card that carries Link, per Q5241", async () => {
    const valid = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-017", as: "base" }],
          hand: [
            { card: "BT23-021", as: "dosukomon" },
            { card: "BT23-007", as: "link" },
          ],
          deck: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    valid.state.memory = 3;
    expect(
      valid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: valid.perm("base").permanentId,
        instanceId: valid.inst("dosukomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => valid.perm("base").linked.some((card) => card.instanceId === valid.inst("link").instanceId));
    expect(valid.state.memory).toBe(0);

    const invalid = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-017", as: "base" }],
          hand: [
            { card: "BT23-021", as: "dosukomon" },
            { card: "BT23-017", as: "noLink" },
          ],
          deck: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    invalid.state.memory = 3;
    expect(
      invalid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: invalid.perm("base").permanentId,
        instanceId: invalid.inst("dosukomon").instanceId,
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
            { card: "BT23-017", as: "base", under: [{ card: "BT23-007", as: "ownLink" }] },
            { card: "BT23-017", as: "otherHost", under: [{ card: "BT23-007", as: "otherLink" }] },
          ],
          hand: [{ card: "BT23-021", as: "dosukomon" }],
          deck: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("dosukomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").linked.some((card) => card.instanceId === s.inst("ownLink").instanceId));

    expect(s.perm("base").linked.map((card) => card.instanceId)).toContain(s.inst("ownLink").instanceId);
    expect(s.perm("otherHost").stack.map((card) => card.instanceId)).toContain(s.inst("otherLink").instanceId);
    expect(s.perm("otherHost").linked.map((card) => card.instanceId)).not.toContain(s.inst("otherLink").instanceId);
  });

  it("accepts all six distinct App Fusion pairs and rejects duplicate material, per Q5240", () => {
    const names = ["Dokamon", "Perorimon", "Musclemon"];
    for (const topName of names) {
      for (const linkedName of names.filter((name) => name !== topName)) {
        expect(appFusionCostFor("BT23-021", { topName, linkedNames: [linkedName] })).toBe(0);
      }
      expect(appFusionCostFor("BT23-021", { topName, linkedNames: [topName] })).toBeUndefined();
    }
  });
  it("public Eri App Fusion moves the chosen link under Dosukomon and draws", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT23-079", as: "eri" },
          { card: "BT23-016", as: "host" },
        ],
        hand: [
          { card: "BT23-039", as: "partner" },
          { card: "BT23-021", as: "dosukomon" },
        ],
        deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
      },
      1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
    });
    const oldTopId = s.perm("host").topCard!.instanceId;
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("partner").instanceId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.decisions.some(({ req }) => req.kind === "optional"));
    for (let step = 0; step < 12; step += 1) {
      const pending = s.decisions.find(({ req }) => req.decisionId === s.state.pendingDecision?.decisionId)?.req;
      if (pending === undefined) {
        await settle(() => s.state.pendingDecision !== undefined || s.perm("host").topCard?.cardId === "BT23-021");
        continue;
      }
      const response = (() => {
        if (pending.kind === "optional")
          return { kind: "optional" as const, accept: pending.sourceCardId !== "BT23-021" };
        if (pending.kind === "selectCards") {
          const ids = pending.options?.candidateInstanceIds;
          if (ids === undefined) throw new Error("selectCards decision omitted candidates");
          return { kind: "selectCards" as const, instanceIds: ids.slice(0, 1) };
        }
        const keys = pending.options?.triggerKeys;
        if (keys === undefined) throw new Error("orderTriggers decision omitted keys");
        return { kind: "orderTriggers" as const, order: keys.slice(0, 1) };
      })();
      expect(s.engine.applyIntent(0, { type: "respondDecision", decisionId: pending.decisionId, response })).toEqual({
        ok: true,
      });
      await settle(
        () => s.state.pendingDecision === undefined || s.state.pendingDecision.decisionId !== pending.decisionId,
      );
      if (s.perm("host").topCard?.cardId === "BT23-021") break;
    }
    await settle(() => s.perm("host").topCard?.cardId === "BT23-021", 1000);
    const bonus = s.state.players[0]!.hand.find((card) => card.cardId === "BT1-009");
    expect(s.perm("host").topCard?.cardId).toBe("BT23-021");
    expect(s.perm("host").linked).toHaveLength(0);
    expect(s.perm("host").stack.map((card) => card.instanceId)).toEqual([oldTopId, s.inst("partner").instanceId]);
    expect(bonus).toBeDefined();
  });

  it("public Eri App Fusion lets the controller choose the second of two linked materials", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-079", as: "eri" },
            { card: "BT23-016", as: "host", linked: [{ card: "BT23-039", as: "first" }] },
          ],
          hand: [
            { card: "BT23-007", as: "second" },
            { card: "BT23-021", as: "dosukomon" },
          ],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoSelectCards: false },
    );
    const host = s.perm("host");
    const oldTopId = host.topCard!.instanceId;
    const firstId = s.inst("first").instanceId;
    const secondId = s.inst("second").instanceId;
    advance(s.engine).ledgers.continuous.addLinkMaxGrant(host.permanentId, 1, EffectDuration.UntilEachTurnEnd);
    await advance(s.engine).recompute();
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, { type: "linkCard", instanceId: secondId, targetPermanentId: host.permanentId }),
    ).toEqual({ ok: true });
    await settle(() => s.decisions.some(({ req }) => req.kind === "optional"));
    let selected = false;
    for (let step = 0; step < 16 && host.topCard?.cardId !== "BT23-021"; step += 1) {
      const pending = s.decisions.find(({ req }) => req.decisionId === s.state.pendingDecision?.decisionId)?.req;
      if (pending === undefined) {
        await settle(() => s.state.pendingDecision !== undefined || host.topCard?.cardId === "BT23-021");
        continue;
      }
      const response = (() => {
        if (pending.kind === "optional")
          return { kind: "optional" as const, accept: pending.sourceCardId !== "BT23-021" };
        if (pending.kind === "selectCards") {
          const ids = pending.options?.candidateInstanceIds;
          if (ids === undefined) throw new Error("selectCards decision omitted candidates");
          return { kind: "selectCards" as const, instanceIds: ids.includes(secondId) ? [secondId] : ids.slice(0, 1) };
        }
        const keys = pending.options?.triggerKeys;
        if (keys === undefined) throw new Error("orderTriggers decision omitted keys");
        return { kind: "orderTriggers" as const, order: keys.slice(0, 1) };
      })();
      if (
        pending.kind === "selectCards" &&
        pending.promptText === "App Fusion: choose the linked card used as fusion material."
      ) {
        const ids = pending.options?.candidateInstanceIds;
        if (ids === undefined) throw new Error("App Fusion selection omitted candidates");
        expect(ids).toEqual(expect.arrayContaining([firstId, secondId]));
        expect(ids).toHaveLength(2);
        expect(pending.options?.min).toBe(1);
        expect(pending.options?.max).toBe(1);
        selected = ids.includes(secondId);
      }
      expect(s.engine.applyIntent(0, { type: "respondDecision", decisionId: pending.decisionId, response })).toEqual({
        ok: true,
      });
      await settle(
        () => s.state.pendingDecision === undefined || s.state.pendingDecision.decisionId !== pending.decisionId,
      );
    }
    const trailing = s.decisions.find(({ req }) => req.decisionId === s.state.pendingDecision?.decisionId)?.req;
    if (trailing?.kind === "optional" && trailing.sourceCardId === "BT23-021") {
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: trailing.decisionId,
          response: { kind: "optional", accept: false },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.pendingDecision === undefined, 100);
    }
    expect(selected).toBe(true);
    expect(host.topCard?.cardId).toBe("BT23-021");
    expect(host.stack.map((card) => card.instanceId)).toEqual([oldTopId, secondId]);
    expect(host.linked.map((card) => card.instanceId)).toEqual([firstId]);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT1-009");
    expect(s.state.memory).toBe(4);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("rejects public App Fusion when the linked partner repeats the top name", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-079", as: "eri" },
            { card: "BT23-016", as: "host" },
          ],
          hand: [
            { card: "BT23-016", as: "duplicate" },
            { card: "BT23-021", as: "dosukomon" },
          ],
          deck: ["BT1-009"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).recompute();
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("duplicate").instanceId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").linked.length === 1);
    await settle();
    expect(s.perm("host").topCard?.cardId).toBe("BT23-016");
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("dosukomon").instanceId);
  });
});
