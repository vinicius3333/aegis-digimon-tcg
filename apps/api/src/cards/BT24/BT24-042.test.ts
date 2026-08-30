import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled as BT24_042 } from "./BT24-042.js";
import "../index.js";

describe("BT24-042 Goblimon", () => {
  it("reduces Demon/Titan digivolution costs on your turn", () => {
    const replacement = BT24_042.effects?.find(
      (entry) => entry.trigger === "YourTurn" && entry.actions?.[0]?.kind === "Replacement",
    );
    expect(replacement?.actions?.[0]).toMatchObject({
      event: "wouldDigivolve",
      sourceFilter: { isSelfRef: true, zone: "battleArea" },
      into: { nameOrTrait: [{ tokens: ["Demon", "Titan"], match: "trait" }] },
    });
  });
  it("keeps the inherited once-per-turn trash-triggered digivolution", () => {
    const inherited = BT24_042.effects?.find((entry) => entry.isInherited);
    expect(inherited).toMatchObject({ trigger: "YourTurn", frequency: "OncePerTurn" });
    expect((inherited?.actions?.[0] as any).event).toBe("whenHandTrashed");
    expect((inherited?.actions?.[0] as any).sourceFilter).toEqual({ controller: "mine" });
    expect((inherited?.actions?.[0] as any).actions[0].target).toMatchObject({
      filter: {
        isSelfRef: true,
        nameOrTrait: [{ tokens: ["Demon", "Titan"], match: "trait" }],
      },
      isSelf: true,
    });
  });

  it("uses exact Tsunomon and alternate TS egg routes", () => {
    expect(BT24_042.digivolutionRequirement).toEqual([
      { namesExact: ["Tsunomon"], cost: 0, isAlternate: true },
      { level: 2, traits: ["TS"], cost: 0, isAlternate: true },
    ]);
  });

  it("reduces a Demon evolution by 1 in battle", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT24-042", as: "goblimon" }],
        hand: [{ card: "BT24-045", as: "ogremon" }],
      },
    });
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("goblimon").permanentId,
        instanceId: s.inst("ogremon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("goblimon").topCard.instanceId === s.inst("ogremon").instanceId);
    expect(s.state.memory).toBe(3);
  });

  it("does not reduce the same evolution in breeding (Q5630)", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT24-042", as: "goblimon" },
        hand: [{ card: "BT24-045", as: "ogremon" }],
      },
    });
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("goblimon").permanentId,
        instanceId: s.inst("ogremon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("goblimon").topCard.instanceId === s.inst("ogremon").instanceId);
    expect(s.state.memory).toBe(2);
  });

  it("pays the reduced cost to inherited-evolve its own host after its owner's hand is trashed", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-072", as: "host", under: ["BT24-042"] },
            { card: "BT24-072", as: "other" },
          ],
          hand: [
            { card: "BT24-045", as: "ogremon" },
            { card: "BT1-009", as: "ownCost" },
          ],
          trash: [{ card: "P-209", as: "titamon" }],
        },
        1: { battleArea: [{ card: "BT1-010", as: "suspendTarget" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("ogremon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.cardId === "P-209");
    await settle(() => observe(s.engine).hasKeyword(s.perm("host"), "Alliance"));

    expect(s.perm("other").topCard.cardId).toBe("BT24-072");
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("ownCost").instanceId);
    expect(s.state.memory).toBe(4);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Alliance")).toBe(true);
  });

  it("does not inherited-evolve a non-Demon/Titan host after its owner's hand is trashed", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT24-046", as: "host", under: ["BT24-042"] }],
        hand: [{ card: "BT1-009", as: "cost" }],
        trash: [{ card: "P-209", as: "titamon" }],
      },
    });
    await s.ready();

    await advance(s.engine).verb.trash([s.inst("cost").instanceId], 0);

    expect(s.perm("host").topCard.cardId).toBe("BT24-046");
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("titamon").instanceId);
  });

  it.each([
    ["exact Tsunomon", "ST2-01", 0],
    ["TS Digi-Egg", "BT24-002", 1],
  ])("digivolves for 0 through the %s route", async (_label, egg, alternateRequirementIndex) => {
    const s = setupEngine({
      0: {
        breeding: { card: egg, as: "egg" },
        hand: [{ card: "BT24-042", as: "goblimon" }],
      },
    });
    s.state.memory = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("egg").permanentId,
        instanceId: s.inst("goblimon").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("egg").topCard.instanceId === s.inst("goblimon").instanceId);

    expect(s.state.memory).toBe(1);
  });
});
