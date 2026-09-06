import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT20-076.js";
import "./BT20-016.js";
import "./BT20-020.js";
import "./BT20-074.js";
import "./index.js";

describe("BT20-076 Imperialdramon: Dragon Mode", () => {
  it("provides Blast DNA Digivolve from hand", () => {
    expect(compiled.effects.find((effect) => effect.trigger === "Counter")).toMatchObject({
      isFromHand: true,
      keywords: [{ keyword: "BlastDNADigivolve" }],
    });
  });

  it("deletes one opposing Digimon at 11000 DP or less on play and digivolving", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)?.actions[0]).toMatchObject({
        kind: "Delete",
        target: { filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 11000 } }, count: 1 },
      });
    }
  });

  it("only on DNA digivolving may digivolve this Digimon into Fighter Mode from hand or trash", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)?.actions[1]).toMatchObject({
        kind: "Digivolve",
        from: ["hand", "trash"],
        payCost: false,
        optional: true,
        condition: { kind: "isDnaDigivolving" },
        target: { filter: { isSelfRef: true }, isSelf: true },
        into: { nameOrTrait: [{ tokens: ["Imperialdramon: Fighter Mode"], match: "name" }] },
      });
    }
  });

  it("publishes the printed ACE stats, evolution routes, and Overflow -4", () => {
    expect(getCardDefinition("BT20-076")).toMatchObject({
      level: 6,
      playCost: 7,
      dp: 12000,
      isAce: true,
      overflowMemory: 4,
      evoCosts: [
        { color: "Purple", level: 5, memoryCost: 4 },
        { color: "Red", level: 5, memoryCost: 4 },
      ],
    });
  });

  it("normal play and evolution delete 11000 DP but preserve 12000 and do not evolve to Fighter Mode", async () => {
    for (const mode of ["play", "digivolve"] as const) {
      const s = setupEngine(
        {
          0: {
            ...(mode === "digivolve" ? { battleArea: [{ card: "BT20-074", as: "base" }] } : {}),
            hand: [
              { card: "BT20-076", as: "dragon" },
              { card: "BT20-020", as: "fighter" },
            ],
            deck: ["BT20-047"],
          },
          1: {
            battleArea: [
              { card: "BT20-059", dp: 11000, as: "eleven" },
              { card: "BT20-076", dp: 12000, as: "twelve" },
            ],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      const elevenId = s.perm("eleven").permanentId;
      s.state.memory = mode === "play" ? 7 : 4;
      const result =
        mode === "play"
          ? s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("dragon").instanceId })
          : s.engine.applyIntent(0, {
              type: "digivolve",
              permanentId: s.perm("base").permanentId,
              instanceId: s.inst("dragon").instanceId,
            });
      expect(result).toEqual({ ok: true });
      await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === elevenId));
      expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(["BT20-076"]);
      expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT20-020");
    }
  });

  it("Blast DNA accepts exact materials and free-evolves into Fighter Mode from hand or trash", async () => {
    for (const fighterZone of ["hand", "trash"] as const) {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "BT20-074", as: "dinobeemon" }],
            hand: [
              { card: "BT20-076", as: "dragon" },
              { card: "BT20-016", as: "paildramon" },
              ...(fighterZone === "hand" ? [{ card: "BT20-020", as: "fighter" }] : []),
            ],
            ...(fighterZone === "trash" ? { trash: [{ card: "BT20-020", as: "fighter" }] } : {}),
            deck: ["BT20-047"],
          },
          1: {
            battleArea: [
              { card: "BT20-059", dp: 11000, as: "target" },
              { card: "BT20-069", as: "attacker" },
            ],
            security: ["BT20-047"],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.turnSeat = 1;
      await s.ready();
      expect(
        s.engine.applyIntent(1, {
          type: "attack",
          attackerPermanentId: s.perm("attacker").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.events.some((event) => event.kind === "counterWindowOpened"));
      const opened = s.events.find((event) => event.kind === "counterWindowOpened");
      if (opened?.kind !== "counterWindowOpened") throw new Error("counter window did not open");
      const choice = opened.eligibleCounters.find((entry) => entry.instanceId === s.inst("dragon").instanceId);
      expect(choice).toBeDefined();
      expect(
        s.engine.applyIntent(0, {
          type: "respondCounter",
          sourceInstanceId: choice!.instanceId,
          effectKey: choice!.effectKey,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT20-020"));
      const fighter = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.cardId === "BT20-020")!;
      expect(fighter.stack.map((card) => card.cardId)).toEqual(
        expect.arrayContaining(["BT20-076", "BT20-074", "BT20-016"]),
      );
      expect(s.state.players[1]!.battleArea).toHaveLength(0);
    }
  });

  it("charges Overflow -4 when the ACE leaves battle", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT20-076", as: "dragon" }] } });
    s.state.memory = 0;
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("dragon").permanentId], "byEffect");
    expect(s.state.memory).toBe(-4);
  });
});
