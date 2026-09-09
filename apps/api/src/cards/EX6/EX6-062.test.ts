import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX6-062.js";

describe("EX6-062 UltimateChaosmon", () => {
  it("has Partition and during DNA digivolving places up to two level 6 cards from trash under itself", () => {
    expect(compiled.effects?.find((entry) => !entry.isInherited)?.keywords?.[0]?.keyword).toBe("Partition");
    expect(compiled.dnaDigivolveRequirement).toEqual([
      {
        cost: 0,
        materials: [
          { color: "Yellow", level: 6 },
          { color: "Green", level: 6 },
        ],
      },
      {
        cost: 0,
        materials: [
          { color: "Yellow", level: 6 },
          { color: "Purple", level: 6 },
        ],
      },
      {
        cost: 0,
        materials: [
          { color: "Black", level: 6 },
          { color: "Green", level: 6 },
        ],
      },
      {
        cost: 0,
        materials: [
          { color: "Black", level: 6 },
          { color: "Purple", level: 6 },
        ],
      },
    ]);
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({
      kind: "PlaceUnder",
      condition: { kind: "isDnaDigivolving" },
      target: { count: 2, upTo: true, from: ["trash"], filter: { levels: [6] } },
    });
  });
  it("mandatorily returns an opposing Digimon for each level 6 stack card and grants Security Attack +3/Piercing at four", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[1]).toMatchObject({
      kind: "Return",
      to: "deckBottom",
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")?.actions).toMatchObject([
      {
        kind: "Aura",
        effect: { kind: "keyword", keyword: { keyword: "SecurityAttack", amount: 3 } },
        while: { kind: "selfDigivolutionStackCountAtLeast", count: 4 },
      },
      { kind: "Aura", effect: { kind: "keyword", keyword: { keyword: "Piercing" } } },
    ]);
  });
  it("publicly exposes the threshold keywords with four level 6 stack cards", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX6-062", as: "chaos", under: ["EX6-056", "EX6-057", "EX6-058", "EX6-059"] }] },
    });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("chaos"), "SecurityAttack")).toBe(true);
    expect(observe(s.engine).hasPierce(s.perm("chaos"))).toBe(true);
  });

  it("DNA digivolves the legal Yellow + Green pair, places two trash sources, and bottom-returns per level-6 card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST3-10", as: "yellowLv6" },
            { card: "BT1-080", as: "greenLv6" },
          ],
          hand: [{ card: "EX6-062", as: "chaos" }],
          trash: ["BT1-062", "BT1-080"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "one" },
            { card: "BT1-009", as: "two" },
            { card: "BT1-009", as: "three" },
            { card: "BT1-009", as: "four" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "dnaDigivolve",
        materialPermanentIds: [s.perm("yellowLv6").permanentId, s.perm("greenLv6").permanentId],
        instanceId: s.inst("chaos").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "EX6-062"));

    const merged = s.state.players[0]!.battleArea.find((perm) => perm.topCard?.cardId === "EX6-062")!;
    expect(merged.stack.map((card) => card.cardId)).toEqual(expect.arrayContaining(["ST3-10", "BT1-080", "BT1-062"]));
    expect(merged.stack.filter((card) => ["ST3-10", "BT1-080", "BT1-062"].includes(card.cardId))).toHaveLength(4);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.deck).toHaveLength(4);
  });

  it("rejects the illegal Yellow + Black DNA pairing required by Q3806", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "ST3-10", as: "yellowLv6" },
          { card: "BT2-064", as: "blackLv6" },
        ],
        hand: [{ card: "EX6-062", as: "chaos" }],
      },
    });
    s.state.memory = 0;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "dnaDigivolve",
        materialPermanentIds: [s.perm("yellowLv6").permanentId, s.perm("blackLv6").permanentId],
        instanceId: s.inst("chaos").instanceId,
      }).ok,
    ).toBe(false);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("chaos").instanceId)).toBe(true);
    expect(s.state.players[0]!.battleArea).toHaveLength(2);
  });

  it("resolves the return tail after a normal, non-DNA evolution (Q4736)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST3-10", as: "yellowLv6" }],
          hand: [{ card: "EX6-062", as: "chaos" }],
          trash: [{ card: "BT1-062", as: "unusedLv6" }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "one" },
            { card: "BT1-010", as: "two" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 7;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("yellowLv6").permanentId,
        instanceId: s.inst("chaos").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.deck.length === 1);

    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.deck).toHaveLength(1);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("unusedLv6").instanceId)).toBe(true);
  });
});
