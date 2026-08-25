import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT20-045.js";
import "./index.js";

describe("BT20-045 Examon ACE", () => {
  it("keeps Blast DNA Digivolve in hand and returns highest-DP opposing Digimon only on DNA digivolving", () => {
    expect(compiled.effects.find((effect) => effect.trigger === "Counter")).toMatchObject({
      isFromHand: true,
      keywords: [{ keyword: "BlastDNADigivolve" }],
    });
    expect(compiled.effects.find((effect) => effect.trigger === "WhenDigivolving")).toMatchObject({
      actions: [
        {
          kind: "Return",
          condition: { kind: "isDnaDigivolving" },
          to: "deckBottom",
          target: { filter: { controller: "opponent", kind: ["Digimon"], superlative: "highestDP" }, count: "all" },
        },
      ],
    });
  });

  it("may unsuspend this battle-area Digimon when any Digimon suspends, once per turn", () => {
    expect(compiled.effects.find((effect) => effect.trigger === "AllTurns")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSuspended",
          sourceFilter: { controller: "any", kind: ["Digimon"] },
          actions: [
            {
              kind: "Unsuspend",
              optional: true,
              target: { filter: { isSelfRef: true, zone: "battleArea" }, isSelf: true },
            },
          ],
        },
      ],
    });
  });

  it("carries ACE metadata and all four battle keywords", async () => {
    expect(getCardDefinition("BT20-045")).toMatchObject({ isAce: true, overflowMemory: 5, dp: 15000, playCost: 9 });
    const s = setupEngine({ 0: { battleArea: [{ card: "BT20-045", as: "examon" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("examon"), "Raid")).toBe(true);
    expect(observe(s.engine).hasPierce(s.perm("examon"))).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("examon"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("examon"), "Evade")).toBe(true);
  });

  it("Blast DNA digivolves from the two field aliases and bottoms every highest-DP opponent", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT20-042", as: "groundramon" },
            { card: "BT20-025", as: "wingdramon" },
          ],
          hand: [{ card: "BT20-045", as: "examon" }],
        },
        1: {
          battleArea: [
            { card: "BT20-010", dp: 8000, as: "highA" },
            { card: "BT20-011", dp: 8000, as: "highB" },
            { card: "BT20-012", dp: 7000, as: "low" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 0;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "dnaDigivolve",
        materialPermanentIds: [s.perm("groundramon").permanentId, s.perm("wingdramon").permanentId],
        instanceId: s.inst("examon").instanceId,
        useBlastDigivolve: true,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT20-045") &&
        s.state.players[1]!.battleArea.length === 1,
    );
    expect(s.perm("low").topCard.cardId).toBe("BT20-012");
    expect(s.state.players[1]!.deck.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT20-010", "BT20-011"]),
    );
    expect(s.state.memory).toBe(0);
  });

  it("unsuspends once when either player's Digimon suspends", async () => {
    for (const suspendingSeat of [0, 1] as const) {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "BT20-045", suspended: true, as: "examon" },
              ...(suspendingSeat === 0 ? [{ card: "BT20-010", as: "trigger" }] : []),
            ],
          },
          1: {
            battleArea: suspendingSeat === 1 ? [{ card: "BT20-010", as: "trigger" }] : [],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      await s.ready();
      await advance(s.engine).verb.suspend([s.perm("trigger").permanentId], suspendingSeat);
      await settle(() => !s.perm("examon").isSuspended);
    }
  });
});
