import { appFusionCostFor, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
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

  it("accepts all six distinct App Fusion pairs and rejects duplicate material, per Q5240", () => {
    const names = ["Dokamon", "Perorimon", "Musclemon"];
    for (const topName of names) {
      for (const linkedName of names.filter((name) => name !== topName)) {
        expect(appFusionCostFor("BT23-021", { topName, linkedNames: [linkedName] })).toBe(0);
      }
      expect(appFusionCostFor("BT23-021", { topName, linkedNames: [topName] })).toBeUndefined();
    }
  });
});
