import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./P-239.js";

describe("P-239 DemiDevimon", () => {
  it("has Blocker", () => {
    expect(runtimeCompiledCard("P-239")!.effects).toContainEqual(
      expect.objectContaining({ trigger: "Static", keywords: [{ keyword: "Blocker", raw: "＜Blocker＞" }] }),
    );
  });

  it("places itself under a Myotismon-text Digimon before optional hand digivolution", () => {
    expect(runtimeCompiledCard("P-239")!.effects).toContainEqual(
      expect.objectContaining({
        trigger: "OnDeletion",
        actions: [
          expect.objectContaining({
            kind: "Digivolve",
            from: ["hand"],
            payCost: false,
            optional: true,
            abortOnDecline: true,
            cost: expect.objectContaining({
              kind: "place",
              destination: "digivolutionStack",
              position: "bottom",
              host: "target",
            }),
          }),
        ],
      }),
    );
  });

  it("trashes a hand card to delete an opposing level 4 or lower Digimon", () => {
    expect(runtimeCompiledCard("P-239")!.effects).toContainEqual(
      expect.objectContaining({
        trigger: "OnDeletion",
        isInherited: true,
        actions: [
          expect.objectContaining({
            kind: "Delete",
            optional: true,
            abortOnDecline: true,
            cost: expect.objectContaining({
              kind: "trash",
              target: { filter: { zone: "hand", controller: "mine" }, count: 1 },
            }),
          }),
        ],
      }),
    );
  });
});
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";

describe("P-239 inherited engine behavior", () => {
  it("trashes a hand card and deletes an opposing level-4 Digimon on host deletion", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT1-001", as: "cost" }],
          battleArea: [{ card: "BT15-076", as: "host", under: [{ card: "P-239", as: "demidevimon" }] }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId]);
    await settle();
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("cost").instanceId)).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});

describe("P-239 continuous behavior", () => {
  it("grants Blocker to a resident DemiDevimon", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "P-239", as: "demidevimon" }] } });
    await s.ready();
    const ledger = (s.engine as unknown as { continuous: { hasKeyword(id: string, keyword: string): boolean } })
      .continuous;
    expect(ledger.hasKeyword(s.perm("demidevimon").permanentId, "Blocker")).toBe(true);
  });
});
