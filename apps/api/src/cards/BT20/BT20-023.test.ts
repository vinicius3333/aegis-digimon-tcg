import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT20-023.js";
import "./index.js";

describe("BT20-023 Coredramon", () => {
  it("reacts only to green Digimon with Dracomon or Examon in their text", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "Static")?.keywords).toEqual([
      { keyword: "Jamming", raw: "＜Jamming＞" },
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
            colors: ["Green"],
            nameOrTrait: [{ tokens: ["Dracomon", "Examon"], match: "text" }],
          },
          actions: [
            {
              kind: "Digivolve",
              from: ["hand"],
              payCost: true,
              reduceCost: 2,
              optional: true,
              into: { nameOrTrait: [{ tokens: ["Wingdramon"], match: "name" }] },
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

  it("pays Wingdramon's cost reduced by 2 only after a qualifying green text match is played", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-023", as: "coredramon" }],
          hand: [
            { card: "BT20-040", as: "greenTextMatch" },
            { card: "BT20-025", as: "wingdramon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferOptionIndex: 0 },
    );
    await s.ready();
    s.state.memory = 7;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("greenTextMatch").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("coredramon").topCard.cardId === "BT20-025");
    expect(s.state.memory).toBe(0);
    expect(s.perm("coredramon").stack.map((card) => card.cardId)).toContain("BT20-023");

    const negative = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-023", as: "coredramon" }],
          hand: [
            { card: "BT20-023", as: "nonGreenTextMatch" },
            { card: "BT20-025", as: "wingdramon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    negative.state.memory = 9;
    expect(
      negative.engine.applyIntent(0, { type: "playCard", instanceId: negative.inst("nonGreenTextMatch").instanceId }),
    ).toEqual({ ok: true });
    await settle(() => false, 50);
    expect(negative.perm("coredramon").topCard.cardId).toBe("BT20-023");
  });

  it("also reacts to a green Digimon whose name supplies the Examon text match", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-023", as: "coredramon" }],
          hand: [
            { card: "BT20-045", as: "examonMatch" },
            { card: "BT20-025", as: "wingdramon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferOptionIndex: 0 },
    );
    s.state.memory = 14;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("examonMatch").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("coredramon").topCard.cardId === "BT20-025");
    expect(s.perm("coredramon").topCard.cardId).toBe("BT20-025");
  });

  it("has Jamming and grants inherited +2000 DP only on its controller's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT20-025", dp: 7000, as: "host", under: ["BT20-023"] }] },
    });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Jamming")).toBe(false);
    expect(s.perm("host").currentDP).toBe(9000);
    s.state.turnSeat = 1;
    await advance(s.engine).recompute();
    expect(s.perm("host").currentDP).toBe(7000);

    const direct = setupEngine({ 0: { battleArea: [{ card: "BT20-023", as: "coredramon" }] } });
    await direct.ready();
    expect(observe(direct.engine).hasKeyword(direct.perm("coredramon"), "Jamming")).toBe(true);
  });

  it("survives a public security battle through Jamming", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT20-023", as: "coredramon" }] },
      1: { security: [{ card: "BT20-001", as: "securityEgg" }] },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("coredramon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.perm("coredramon").topCard.cardId).toBe("BT20-023");
  });

  it("reaches Coredramon from a legal Dracomon stack through public evolution", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT20-007", as: "dracomon" }], hand: [{ card: "BT20-023", as: "coredramon" }] },
    });
    s.state.memory = 2;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("dracomon").permanentId,
        instanceId: s.inst("coredramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("dracomon").topCard.cardId === "BT20-023");
    expect(s.perm("dracomon").topCard.cardId).toBe("BT20-023");
    expect(s.perm("dracomon").stack.map((card) => card.cardId)).toEqual(["BT20-007"]);
  });
});
