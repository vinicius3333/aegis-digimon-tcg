import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT20-040.js";
import "./index.js";

describe("BT20-040 Coredramon", () => {
  it("reacts to blue Digimon with Dracomon or Examon in their text and optionally reduces Groundramon evolution", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "Static")?.keywords).toEqual([
      { keyword: "Raid", raw: "＜Raid＞" },
    ]);
    const effect = compiled.effects.find((entry) => entry.trigger === "YourTurn" && !entry.isInherited);
    expect(effect).toMatchObject({
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
            colors: ["Blue"],
            nameOrTrait: [{ tokens: ["Dracomon", "Examon"], match: "text" }],
          },
          actions: [
            {
              kind: "Digivolve",
              from: ["hand"],
              reduceCost: 2,
              payCost: true,
              optional: true,
              into: { nameOrTrait: [{ tokens: ["Groundramon"], match: "name" }] },
            },
          ],
        },
      ],
    });
    expect(compiled.effects.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "YourTurn",
      actions: [{ kind: "ModifyDP", amount: 2000, duration: "permanent" }],
    });
  });

  it("evolves for 2 less only after a qualifying blue full-text Digimon is played", async () => {
    const matching = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-040", as: "coredramon" }],
          hand: [
            { card: "BT20-023", as: "played" },
            { card: "BT20-042", as: "groundramon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferOptionIndex: 1 },
    );
    matching.state.memory = 10;
    await matching.ready();
    expect(
      matching.engine.applyIntent(0, { type: "playCard", instanceId: matching.inst("played").instanceId }),
    ).toEqual({
      ok: true,
    });
    await settle(() => matching.perm("coredramon").topCard.cardId === "BT20-042");
    expect(matching.state.memory).toBe(4);

    const printedRequirement = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-040", as: "coredramon" }],
          hand: [
            { card: "BT20-023", as: "played" },
            { card: "BT20-042", as: "groundramon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferOptionIndex: 0 },
    );
    printedRequirement.state.memory = 10;
    await printedRequirement.ready();
    expect(
      printedRequirement.engine.applyIntent(0, {
        type: "playCard",
        instanceId: printedRequirement.inst("played").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => printedRequirement.perm("coredramon").topCard.cardId === "BT20-042");
    expect(printedRequirement.state.memory).toBe(3);

    const nonmatching = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-040", as: "coredramon" }],
          hand: [
            { card: "BT20-024", as: "played" },
            { card: "BT20-042", as: "groundramon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    nonmatching.state.memory = 10;
    await nonmatching.ready();
    expect(
      nonmatching.engine.applyIntent(0, { type: "playCard", instanceId: nonmatching.inst("played").instanceId }),
    ).toEqual({ ok: true });
    await settle(() => nonmatching.state.players[0]!.battleArea.length === 2);
    expect(nonmatching.perm("coredramon").topCard.cardId).toBe("BT20-040");
  });

  it("supports the printed Dracomon evolution and preserves an optional response when declined", async () => {
    const evolved = setupEngine({
      0: { battleArea: [{ card: "BT11-022", as: "dracomon" }], hand: [{ card: "BT20-040", as: "coredramon" }] },
    });
    evolved.state.memory = 2;
    expect(
      evolved.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: evolved.perm("dracomon").permanentId,
        instanceId: evolved.inst("coredramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () => evolved.perm("dracomon").topCard.cardId === "BT20-040" && evolved.state.pendingDecision === undefined,
    );
    expect(evolved.perm("dracomon").stack.map((card) => card.cardId)).toEqual(["BT11-022"]);

    const declined = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-040", as: "coredramon" }],
          hand: [
            { card: "BT20-023", as: "played" },
            { card: "BT20-042", as: "groundramon" },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    declined.state.memory = 10;
    await declined.ready();
    expect(
      declined.engine.applyIntent(0, { type: "playCard", instanceId: declined.inst("played").instanceId }),
    ).toEqual({ ok: true });
    await settle(
      () => declined.state.players[0]!.battleArea.length === 2 && declined.state.pendingDecision === undefined,
    );
    expect(declined.perm("coredramon").topCard.cardId).toBe("BT20-040");
    expect(declined.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT20-042");
  });

  it("uses Raid and grants its inherited host +2000 DP only on its controller's turn", async () => {
    const raid = setupEngine({
      0: { battleArea: [{ card: "BT20-040", dp: 5000, as: "coredramon" }] },
      1: {
        battleArea: [{ card: "BT20-010", dp: 1000, as: "raidTarget" }],
        security: ["BT20-001"],
      },
    });
    expect(
      raid.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: raid.perm("coredramon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => raid.state.players[1]!.battleArea.length === 0);
    expect(raid.state.players[1]!.security).toHaveLength(1);

    const inherited = setupEngine({
      0: { battleArea: [{ card: "BT20-042", dp: 7000, under: ["BT20-040"], as: "host" }] },
    });
    await inherited.ready();
    expect(inherited.perm("host").currentDP).toBe(9000);
    inherited.state.turnSeat = 1;
    await advance(inherited.engine).recompute();
    expect(inherited.perm("host").currentDP).toBe(7000);
  });
});
