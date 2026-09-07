import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT22-049.js";
import "./index.js";

async function endCurrentTurn(s: ReturnType<typeof setupEngine>): Promise<void> {
  const turn = s.engine.runOneTurn();
  const mainPhase = (s.engine as unknown as { mainPhase: { isOpen: boolean } }).mainPhase;
  for (let i = 0; i < 500 && !mainPhase.isOpen; i += 1) await Promise.resolve();
  expect(mainPhase.isOpen).toBe(true);
  expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
  await turn;
}

describe("BT22-049 Vegiemon", () => {
  it("requires all three face-down Ver.2 trash cards for the end-turn digivolution", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "EndOfYourTurn");
    expect(effect).toMatchObject({ frequency: "OncePerTurn" });
    expect(effect?.actions[0]).toMatchObject({
      kind: "Digivolve",
      from: ["hand", "trash"],
      payCost: true,
      optional: true,
      into: { controllerDefault: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Ver.2"], match: "trait" }] },
      cost: {
        kind: "place",
        destination: "digivolutionStack",
        position: "bottom",
        faceDown: true,
        target: {
          filter: {
            zone: "trash",
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["Ver.2"], match: "trait" }],
          },
          count: 3,
          from: ["trash"],
        },
      },
    });
  });

  it("retains inherited Piercing", () => {
    expect(compiled.effects.find((entry) => entry.isInherited)?.keywords).toMatchObject([{ keyword: "Piercing" }]);
  });

  it("pays all 3 face-down Ver.2 cards and evolves from hand at end of turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT22-049", as: "vegiemon" }],
          hand: [{ card: "EX9-018", as: "nonReducingVer2" }],
          trash: ["BT22-049", "BT22-049", "BT22-049"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 3;

    await endCurrentTurn(s);
    await settle(() => s.perm("vegiemon").topCard?.cardId === "EX9-018");

    // EX9-018 has no cost-reduction effect, so the printed cost 2/normal evolution
    // cost remains observable after the three face-down cards are placed.
    // Ending the turn crosses the gauge from +3 to -3; EX9-018's normal cost 3
    // then pays exactly three more memory.
    expect(s.state.memory).toBe(-6);
  });

  it("cannot satisfy Q4902 with only 2 eligible trash cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT22-049", as: "vegiemon" }],
          hand: [{ card: "EX9-018", as: "nonReducingVer2" }],
          trash: ["BT22-049", "BT22-049"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 3;

    await endCurrentTurn(s);
    await settle();

    expect(s.perm("vegiemon").topCard?.cardId).toBe("BT22-049");
    expect(s.state.players[0]!.trash.filter((card) => card.cardId === "BT22-049")).toHaveLength(2);
  });

  it("uses the printed alternate cost 2 only from a level-3 DM stack", async () => {
    const legal = setupEngine({
      0: { battleArea: [{ card: "EX9-014", as: "dmBase" }], hand: [{ card: "BT22-049", as: "vegiemon" }] },
    });
    await legal.ready();
    legal.state.memory = 2;
    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("dmBase").permanentId,
        instanceId: legal.inst("vegiemon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => legal.perm("dmBase").topCard?.cardId === "BT22-049");
    expect(legal.state.memory).toBe(0);

    const invalid = setupEngine({
      0: { battleArea: [{ card: "BT22-030", as: "nonDmBase" }], hand: [{ card: "BT22-049", as: "vegiemon" }] },
    });
    await invalid.ready();
    invalid.state.memory = 2;
    expect(
      invalid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: invalid.perm("nonDmBase").permanentId,
        instanceId: invalid.inst("vegiemon").instanceId,
        useAlternateCost: true,
      }),
    ).toMatchObject({ ok: false });
    expect(invalid.state.memory).toBe(2);
  });
});
