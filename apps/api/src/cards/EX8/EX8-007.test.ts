import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "./index.js";
import { compiled } from "./EX8-007.js";

describe("EX8-007", () => {
  it("matches the catalog's Agumon identity, evolution costs, and printed text", () =>
    expect(getCardDefinition("EX8-007")).toMatchObject({
      cardId: "EX8-007",
      nameEn: "Agumon",
      colors: ["Red", "Green"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 1000,
      evoCosts: [
        { color: "Red", level: 2, memoryCost: 1 },
        { color: "Green", level: 2, memoryCost: 1 },
      ],
      types: ["Reptile", "LIBERATOR"],
      effectText:
        "[Digivolve][Koromon]: Cost 0 \n\n[On Play] Reveal the top 3 cards of your deck. Add 1 card with [Tyrannomon]\u00a0in its name or the [Reptile]/[Dinosaur]\u00a0trait and 1 [Ryutaro Williams] among them to the hand. Return the rest to the bottom of the deck.",
      inheritedEffectText: "[Your Turn] This Digimon gets +2000 DP.",
    }));

  it("reveals 3 for a Tyrannomon, Reptile, Dinosaur, or Ryutaro Williams card", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({
      kind: "RevealAdd",
      revealCount: 3,
      add: [
        { count: 1, to: "hand" },
        { count: 1, to: "hand" },
      ],
      rest: "deckBottom",
    }));
  it("inherits +2000 DP during your turn", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)?.actions[0]).toMatchObject({
      kind: "ModifyDP",
      amount: 2000,
      duration: "permanent",
    }));
  it.each([
    ["BT1-024", "name-only MetalTyrannomon"],
    ["BT1-010", "Reptile-only Agumon"],
    ["AD1-001", "Dinosaur-only Greymon"],
  ] as const)("selects %s and Ryutaro Williams from the live reveal (%s)", async (candidate, _label) => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX8-007", as: "agumon" }],
          deck: [
            { card: candidate, as: "candidate" },
            { card: "EX11-056", as: "ryutaro" },
            { card: "BT1-045", as: "decoy" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("agumon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.hand.some((card) => card.cardId === candidate) &&
        s.state.players[0]!.hand.some((card) => card.cardId === "EX11-056"),
    );
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(
      expect.arrayContaining([candidate, "EX11-056"]),
    );
    expect(s.state.players[0]!.deck.at(-1)?.cardId).toBe("BT1-045");
  });

  it("returns a reveal with no matching search cards to the bottom of the deck", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX8-007", as: "agumon" }],
          deck: [
            { card: "BT1-045", as: "mammal" },
            { card: "BT1-046", as: "holyBeast" },
            { card: "BT1-047", as: "fairy" },
            { card: "BT1-048", as: "anchor" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("agumon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.deck.length === 4);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-048", "BT1-045", "BT1-046", "BT1-047"]);
  });

  it("still adds Ryutaro Williams when the first search category is absent", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX8-007", as: "agumon" }],
          deck: [
            { card: "BT1-045", as: "mammal" },
            { card: "EX11-056", as: "ryutaro" },
            { card: "BT1-046", as: "holyBeast" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("agumon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "EX11-056"));
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["EX11-056"]);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-045", "BT1-046"]);
  });

  it("applies its inherited +2000 DP during its controller's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "host", under: [{ card: "EX8-007", as: "agumon" }] }] },
    });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(5000);
    s.state.turnSeat = 1;
    await advance(s.engine).recompute();
    expect(s.perm("host").currentDP).toBe(3000);
  });

  it("digivolves from Koromon for 0 and rejects an off-color non-Koromon egg", async () => {
    const eligible = setupEngine({
      0: { breeding: { card: "EX8-001", as: "koromon" }, hand: [{ card: "EX8-007", as: "agumon" }] },
    });
    eligible.state.memory = 0;
    await eligible.ready();
    expect(
      eligible.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: eligible.perm("koromon").permanentId,
        instanceId: eligible.inst("agumon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => eligible.perm("koromon").topCard.instanceId === eligible.inst("agumon").instanceId);
    expect(eligible.state.memory).toBe(0);

    const ineligible = setupEngine({
      0: { breeding: { card: "BT2-005", as: "blackEgg" }, hand: [{ card: "EX8-007", as: "agumon" }] },
    });
    await ineligible.ready();
    expect(
      ineligible.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: ineligible.perm("blackEgg").permanentId,
        instanceId: ineligible.inst("agumon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });

  it.each([
    ["EX8-001", "red Koromon"],
    ["EX8-004", "green Motimon"],
  ] as const)("digivolves for 1 from the printed %s standard path (%s)", async (egg, _label) => {
    const s = setupEngine({
      0: { breeding: { card: egg, as: "egg" }, hand: [{ card: "EX8-007", as: "agumon" }] },
    });
    s.state.memory = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("egg").permanentId,
        instanceId: s.inst("agumon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("egg").topCard.instanceId === s.inst("agumon").instanceId);
    expect(s.state.memory).toBe(0);
    expect(s.perm("egg").stack.map((card) => card.cardId)).toEqual([egg]);
  });

  it("rejects the blue Lv.2 standard path", async () => {
    const s = setupEngine({
      0: { breeding: { card: "EX8-002", as: "blueEgg" }, hand: [{ card: "EX8-007", as: "agumon" }] },
    });
    s.state.memory = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("blueEgg").permanentId,
        instanceId: s.inst("agumon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });
});
