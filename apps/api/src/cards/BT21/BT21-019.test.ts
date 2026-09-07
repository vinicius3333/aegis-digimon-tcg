import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT21-019.js";
import "../index.js";

describe("BT21-019 BetelGammamon", () => {
  it("encodes the Gammamon evolution, bounded Hiro play, and inherited turn DP", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual ?? []).toEqual([]);
    expect(compiled.digivolutionRequirement).toEqual([{ namesExact: ["Gammamon"], cost: 2, isAlternate: true }]);
    expect(compiled.effects).toEqual([
      expect.objectContaining({
        trigger: "WhenDigivolving",
        actions: [
          expect.objectContaining({
            kind: "PlayWithoutCost",
            target: {
              filter: { controller: "mine", nameOrTrait: [{ tokens: ["Hiro Amanokawa"], match: "nameExact" }] },
              count: 1,
            },
            from: ["hand"],
            payCost: false,
            condition: {
              kind: "permanentCount",
              seat: "mine",
              filter: { controller: "mine", kind: ["Tamer"] },
              op: "lte",
              value: 1,
              raw: "you have 1 or fewer Tamers",
            },
            optional: true,
            abortOnDecline: true,
          }),
        ],
      }),
      expect.objectContaining({
        trigger: "YourTurn",
        isInherited: true,
        actions: [expect.objectContaining({ kind: "ModifyDP", amount: 2000, duration: "permanent" })],
      }),
    ]);
  });

  it.each([
    ["zero", []],
    ["one", ["BT1-085"]],
  ])("plays Hiro free after a Gammamon evolution with %s existing Tamers", async (_label, tamers) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-010", as: "gammamon" }, ...tamers.map((card) => ({ card }))],
          hand: [
            { card: "BT21-019", as: "betel" },
            { card: "BT21-080", as: "hiro" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("gammamon").permanentId,
        instanceId: s.inst("betel").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT21-080"));
    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    const evolved = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.cardId === "BT21-019")!;
    expect(evolved.topCard.cardId).toBe("BT21-019");
    expect(evolved.stack.map((card) => card.cardId)).toEqual(["BT21-010"]);
  });

  it("does not play Hiro with two Tamers and permits declining with one", async () => {
    async function evolve({ tamers, decline }: { tamers: string[]; decline: boolean }) {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "BT21-010", as: "gammamon" }, ...tamers.map((card) => ({ card }))],
            hand: [
              { card: "BT21-019", as: "betel" },
              { card: "BT21-080", as: "hiro" },
            ],
          },
        },
        decline ? { autoDeclineOptional: true } : { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.memory = 4;
      await s.ready();
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("gammamon").permanentId,
        instanceId: s.inst("betel").instanceId,
      });
      await settle(() => s.perm("gammamon").topCard.cardId === "BT21-019");
      return s;
    }
    const blocked = await evolve({ tamers: ["BT1-085", "BT1-087"], decline: false });
    expect(blocked.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT21-080");
    const declined = await evolve({ tamers: ["BT1-085"], decline: true });
    expect(declined.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT21-080");
  });

  it("grants inherited +2000 DP only during its controller's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT21-020", as: "host", under: ["BT21-019"] }] },
    });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(10000);
    s.state.turnSeat = 1;
    await advance(s.engine).recompute();
    expect(s.perm("host").currentDP).toBe(8000);
  });

  it("builds a legal Gammamon to BetelGammamon to Aldamon stack before checking inheritance", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT21-001", as: "egg" }],
        hand: [
          { card: "BT21-010", as: "gammamon" },
          { card: "BT21-019", as: "betel" },
          { card: "BT21-020", as: "aldamon" },
        ],
      },
    });
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("egg").permanentId,
        instanceId: s.inst("gammamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("egg").topCard.cardId === "BT21-010");
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("egg").permanentId,
        instanceId: s.inst("betel").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("egg").topCard.cardId === "BT21-019");
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("egg").permanentId,
        instanceId: s.inst("aldamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("egg").topCard.cardId === "BT21-020");
    expect(s.perm("egg").stack.map((card) => card.cardId)).toEqual(["BT21-001", "BT21-010", "BT21-019"]);
    expect(s.perm("egg").currentDP).toBe(12000);
  });
});
