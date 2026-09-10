import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { hasRegisteredCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX7-051.js";
import "../index.js";

async function stopLoop(s: ReturnType<typeof setupEngine>, loop: Promise<void>, seat: 0 | 1): Promise<void> {
  if (!s.state.gameOver && !s.engine.applyIntent(seat, { type: "surrender" }).ok)
    throw new Error("failed to stop loop");
  await loop;
}

describe("EX7-051 Sparrowmon", () => {
  it("matches the catalog and fully registered IR", () => {
    expect(getCardDefinition("EX7-051")).toMatchObject({
      cardId: "EX7-051",
      nameEn: "Sparrowmon",
      colors: ["Purple"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 1000,
      evoCosts: [{ color: "Purple", level: 2, memoryCost: 0 }],
      forms: ["Rookie"],
      attributes: ["Data"],
      types: ["Avian"],
    });
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 2, texts: ["Three Musketeers"], cost: 0, isAlternate: true },
    ]);
    expect(compiled.effects?.find((entry) => entry.trigger === "StartOfYourMainPhase")?.actions[0]).toMatchObject({
      kind: "Draw",
      amount: 1,
      optional: true,
      abortOnDecline: true,
      cost: {
        kind: "place",
        target: { filter: { controller: "mine", kind: ["Option"] }, from: ["hand", "trash"] },
        underFilter: { controller: "mine", kind: ["Digimon"] },
        destination: "digivolutionStack",
        position: "bottom",
      },
    });
    expect(compiled.effects?.find((entry) => entry.isInherited)?.keywords).toContainEqual({
      keyword: "Retaliation",
      raw: "＜Retaliation＞",
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(hasRegisteredCompiledCard("EX7-051")).toBe(true);
  });

  it.each(["hand", "trash"] as const)(
    "at a real Start of Main, places a Three Musketeers Option from %s at stack bottom and draws",
    async (zone) => {
      const option = { card: "EX7-066", as: "option" };
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "EX7-051", as: "sparrow" },
              { card: "BT1-015", as: "host", under: [{ card: "BT1-009", as: "existing" }] },
            ],
            ...(zone === "hand" ? { hand: [option] } : { trash: [option] }),
            deck: [{ card: "BT1-010", as: "drawn" }, "BT1-011"],
          },
          1: { deck: ["BT1-012", "BT1-013"] },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      const loop = s.engine.startTurnLoop();
      await advance(s.engine).waitForMainPhase(0);
      await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId));
      const recipient = s.state.players[0]!.battleArea.find((permanent) =>
        permanent.stack.some((card) => card.instanceId === s.inst("option").instanceId),
      )!;
      expect(recipient.stack.at(-1)?.instanceId).toBe(s.inst("option").instanceId);
      expect(s.state.players[0]![zone].some((card) => card.instanceId === s.inst("option").instanceId)).toBe(false);
      await stopLoop(s, loop, 0);
    },
  );

  it("may decline the Start of Main cost and does not draw", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX7-051", as: "sparrow" }],
          hand: [{ card: "EX7-066", as: "option" }],
          deck: [{ card: "BT1-010", as: "top" }, "BT1-011"],
        },
        1: { deck: ["BT1-012", "BT1-013"] },
      },
      { autoAcceptOptional: false, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("option").instanceId);
    expect(s.state.players[0]!.deck[0]?.instanceId).toBe(s.inst("top").instanceId);
    expect(s.perm("sparrow").stack).toHaveLength(0);
    await stopLoop(s, loop, 0);
  });

  it("uses the text-based level-2 route and rejects a level 2 without Three Musketeers text", async () => {
    const legal = setupEngine({
      0: {
        battleArea: [{ card: "EX7-005", as: "kapurimon" }],
        hand: [{ card: "EX7-051", as: "sparrow" }],
        deck: [{ card: "BT1-009", as: "drawn" }],
      },
    });
    legal.state.memory = 1;
    await legal.ready();
    const sourceId = legal.perm("kapurimon").topCard.instanceId;
    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("kapurimon").permanentId,
        instanceId: legal.inst("sparrow").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => legal.perm("kapurimon").topCard.cardId === "EX7-051");
    expect(legal.state.memory).toBe(1);
    expect(legal.perm("kapurimon").stack.map((card) => card.instanceId)).toEqual([sourceId]);
    expect(legal.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([legal.inst("drawn").instanceId]);

    const invalid = setupEngine({
      0: { battleArea: [{ card: "EX7-001", as: "demimeramon" }], hand: [{ card: "EX7-051", as: "sparrow" }] },
    });
    invalid.state.memory = 1;
    await invalid.ready();
    expect(
      invalid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: invalid.perm("demimeramon").permanentId,
        instanceId: invalid.inst("sparrow").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });

  it("inherits Retaliation and deletes the stronger opposing Digimon after public battle", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-015", as: "host", under: ["EX7-051"], dp: 1000 }] },
      1: { battleArea: [{ card: "BT1-020", as: "target", suspended: true, dp: 7000 }] },
    });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Retaliation")).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT1-015") &&
        !s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT1-020"),
    );
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT1-015", "EX7-051"]),
    );
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toContain("BT1-020");
  });
});
