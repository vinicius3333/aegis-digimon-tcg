import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT17-044.js";
import "./index.js";

describe("BT17-044 Morphomon", () => {
  it("matches the catalog identity and evolution route", () => {
    expect(getCardDefinition("BT17-044")).toMatchObject({
      cardId: "BT17-044",
      colors: ["Green"],
      level: 3,
      playCost: 3,
      dp: 1000,
      evoCosts: [{ color: "Green", level: 2, memoryCost: 0 }],
    });
  });

  it("reduces its own Eosmon digivolution by one during your turn", () => {
    expect(
      compiled.effects.find((entry) => entry.trigger === "YourTurn" && !entry.isInherited)?.actions[0],
    ).toMatchObject({
      event: "wouldDigivolve",
      sourceFilter: { isSelfRef: true },
      into: { nameOrTrait: [{ tokens: ["Eosmon"], match: "name" }] },
      actions: [{ kind: "Replacement", mode: "reduceCost", amount: 1 }],
    });
  });

  it("once per turn may evolve into Eosmon for three less when another Eosmon is played", () => {
    const effect = compiled.effects.find((entry) => entry.isInherited);
    expect(effect).toMatchObject({
      trigger: "YourTurn",
      frequency: "OncePerTurn",
      actions: [
        {
          event: "whenPlayed",
          sourceFilter: {
            controllerDefault: "mine",
            excludeSelf: true,
            nameOrTrait: [{ tokens: ["Eosmon"], match: "name" }],
          },
          actions: [
            {
              kind: "Digivolve",
              from: ["hand"],
              payCost: true,
              reduceCost: 3,
              optional: true,
              into: { nameOrTrait: [{ tokens: ["Eosmon"], match: "name" }] },
            },
          ],
        },
      ],
    });
  });

  it("naturally evolves Morphomon into the second Eosmon when one is played", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-074", under: ["BT17-044"], as: "morphomonHost" }],
          hand: [
            { card: "BT17-074", as: "playedEosmon" },
            { card: "BT17-075", as: "evolvedEosmon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    const evolvedEosmonId = s.inst("evolvedEosmon").instanceId;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("playedEosmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("morphomonHost").topCard?.instanceId === evolvedEosmonId);

    expect(s.perm("morphomonHost").topCard?.cardId).toBe("BT17-075");
    expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === evolvedEosmonId)).toBe(false);
    expect(s.state.memory).toBe(0);
  });
});
