import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT16-026.js";
import "../index.js";

describe("BT16-026", () => {
  it("matches Vikemon's catalog identity and alternate evolution route", () => {
    expect(getCardDefinition("BT16-026")).toMatchObject({
      nameEn: "Vikemon",
      colors: ["Blue", "Black"],
      level: 6,
      playCost: 7,
      dp: 12000,
      evoCosts: [
        { color: "Blue", level: 5, memoryCost: 4 },
        { color: "Black", level: 5, memoryCost: 4 },
      ],
      types: ["Beastkin"],
      isAce: true,
      overflowMemory: 4,
    });
    expect(compiled.digivolutionRequirement).toEqual([{ names: ["Shakkoumon", "Zudomon"], cost: 3, isAlternate: true }]);
  });

  it("models Blast Digivolve", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "Counter",
      isFromHand: true,
      keywords: [{ keyword: "BlastDigivolve" }],
    });
  });

  it("de-digivolves and suspends opposing Digimon", () => {
    for (const effect of compiled.effects?.slice(1, 3) ?? []) {
      expect(effect.actions?.[0]).toMatchObject({ kind: "DeDigivolve", amount: 2 });
      expect(effect.actions?.[1]).toMatchObject({
        kind: "Restrict",
        restriction: "suspend",
        duration: "untilOpponentTurnEnd",
      });
    }
    expect(compiled.effects?.[3]).toMatchObject({
      trigger: "WhenAttacking",
      actions: [{ kind: "Delete", target: expect.objectContaining({ count: 1 }) }],
    });
  });

  it("restricts only opposing Digimon with one or fewer digivolution cards", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT16-026", as: "source" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "noSources" },
            { card: "BT1-010", as: "twoSources", under: ["BT1-011", "BT1-009"] },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("noSources").permanentId);
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(s.perm("noSources"), "suspend"));

    expect(observe(s.engine).isRestricted(s.perm("noSources"), "suspend")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("twoSources"), "suspend")).toBe(false);
  });

  it("Blast Digivolves from hand during the natural opponent Counter Timing without paying memory", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
        1: {
          battleArea: [{ card: "BT1-041", as: "base" }],
          hand: [{ card: "BT16-026", as: "vikemon" }],
          deck: ["BT1-001"],
          security: ["BT1-001"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 0;
    await s.ready();

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
    const eligible = opened.eligibleCounters.find((entry) => entry.instanceId === s.inst("vikemon").instanceId);
    expect(eligible).toBeDefined();

    expect(
      s.engine.applyIntent(1, {
        type: "respondCounter",
        sourceInstanceId: eligible!.instanceId,
        effectKey: eligible!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT16-026");

    expect(s.perm("base").topCard?.cardId).toBe("BT16-026");
    expect(s.state.memory).toBe(0);
  });

  it("naturally deletes an opposing Digimon with one or fewer digivolution cards when attacking", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT16-026", as: "vikemon" }], security: ["BT1-001"] },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("vikemon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some(({ cardId }) => cardId === "BT1-009"));

    expect(s.state.players[1]!.trash.some(({ cardId }) => cardId === "BT1-009")).toBe(true);
  });
});
