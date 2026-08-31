import { describe, expect, it } from "vitest";
import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT26-103.js";
import "../index.js";

describe("BT26-103 compiled fidelity", () => {
  it("shares the Counter/When Digivolving recovery budget and security-removal penalty while exposing Succession seam", () => {
    const card = compiled;
    expect(getCardDefinition("BT26-103")).toMatchObject({
      nameEn: "Jupitermon: Wrath Mode",
      colors: ["Yellow", "Red", "Black"],
      kinds: ["Digimon"],
      level: 7,
      playCost: 16,
      dp: 16000,
      types: ["Shaman", "Olympos XII", "Iliad", "TS"],
    });
    expect(card?.coverage).toBe("full");
    expect(card?.residual).toEqual([]);
    expect(card?.keywords).toEqual([
      expect.objectContaining({ keyword: "Piercing" }),
      expect.objectContaining({ keyword: "Reboot" }),
      expect.objectContaining({ keyword: "Blocker" }),
      expect.objectContaining({ keyword: "Succession" }),
    ]);
    expect(card?.effects?.[0]).toMatchObject({
      trigger: "WhenDigivolving",
      frequency: "OncePerTurn",
      sharedUseKey: "BT26-103/trash-recover",
    });
    expect(card?.effects?.[1]).toMatchObject({
      trigger: "Counter",
      frequency: "OncePerTurn",
      sharedUseKey: "BT26-103/trash-recover",
    });
    expect(card?.effects?.[2]?.actions).toMatchObject([
      { kind: "GrantStatic", grant: "effects", topmostOnly: true, duration: "permanent" },
    ]);
    expect(card?.effects?.[3]).toMatchObject({
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        { kind: "SubTrigger", event: "whenSecurityRemoved", sourceFilter: { controller: "any" } },
        { kind: "SubTrigger", event: "whenEffectRemovesFromSecurity", sourceFilter: { controller: "any" } },
      ],
    });
  });

  it("trashes one security card and recovers two when digivolving", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT26-103", as: "wrathMode" }],
        security: ["BT1-001"],
        deck: ["BT1-010", "BT1-011"],
      },
    });

    await advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("wrathMode"));

    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT1-001")).toBe(true);
  });

  it("Q7188: recovers two even with no security card to trash", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT26-103", as: "wrathMode" }],
        deck: ["BT1-010", "BT1-011"],
      },
    });

    await advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("wrathMode"));

    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(s.state.players[0]!.trash).toHaveLength(0);
  });

  it("activates from the defending Counter window and spends the shared recovery use", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "attacker", dp: 9000 }] },
      1: {
        battleArea: [{ card: "BT26-103", as: "wrathMode" }],
        security: ["BT1-001"],
        deck: ["BT1-010", "BT1-011", "BT1-012", "BT1-013"],
      },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "counterWindowOpened"));
    const opened = s.events.find((event) => event.kind === "counterWindowOpened");
    if (opened?.kind !== "counterWindowOpened") throw new Error("counter window did not open");
    const counter = opened.eligibleCounters.find(
      (entry) => entry.instanceId === s.perm("wrathMode").topCard.instanceId,
    );
    expect(counter).toBeDefined();

    expect(
      s.engine.applyIntent(1, {
        type: "respondCounter",
        sourceInstanceId: counter!.instanceId,
        effectKey: counter!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.deck.length === 2);
    expect(s.state.players[1]!.trash.map(({ cardId }) => cardId)).toContain("BT1-001");

    const securityAfterCounter = s.state.players[1]!.security.length;
    await advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("wrathMode"));
    expect(s.state.players[1]!.security).toHaveLength(securityAfterCounter);
    expect(s.state.players[1]!.deck).toHaveLength(2);
  });

  it("Succession gains the topmost Jupitermon's effects", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT26-103", as: "wrathMode", under: [{ card: "BT24-101", as: "jupitermon" }] }],
        security: ["BT1-001"],
        deck: ["BT1-002", "BT1-003"],
      },
      1: { battleArea: [{ card: "BT1-009", as: "target", dp: 14000 }] },
    });
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("wrathMode"));

    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("BT1-001");
    expect(s.state.players[1]!.trash.map(({ cardId }) => cardId)).toContain("BT1-009");
  });

  it("Succession excludes lower Jupitermon cards when a different Jupitermon is topmost", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          {
            card: "BT26-103",
            as: "wrathMode",
            under: [
              { card: "BT24-101", as: "lowerJupitermon" },
              { card: "BT26-033", as: "topmostJupitermon" },
            ],
          },
        ],
        security: ["BT1-001"],
        deck: ["BT1-002", "BT1-003"],
      },
      1: { battleArea: [{ card: "BT1-009", as: "target", dp: 14000 }] },
    });
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("wrathMode"));

    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.perm("target").currentDP).toBe(14000);
  });

  it("applies the security-removal DP penalty only once across both event routes", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-103", as: "wrathMode" }],
          security: ["BT1-001", "BT1-002"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "first", dp: 16000 },
            { card: "BT1-010", as: "second", dp: 16000 },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("first").permanentId);
    await s.ready();

    await advance(s.engine).verb.trashFromSecurity(0, 1);
    preferred.splice(0, preferred.length, s.perm("second").permanentId);
    await advance(s.engine).verb.trashFromSecurity(0, 1);

    expect(s.perm("first").currentDP).toBe(1000);
    expect(s.perm("second").currentDP).toBe(16000);
  });

  it("reacts when the opponent's security stack is removed", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT26-103", as: "wrathMode" }] },
      1: {
        security: ["BT1-001"],
        battleArea: [{ card: "BT1-009", as: "opponent", dp: 16000 }],
      },
    });
    await s.ready();

    await advance(s.engine).verb.trashFromSecurity(1, 1);

    expect(s.perm("opponent").currentDP).toBe(1000);
  });
});
