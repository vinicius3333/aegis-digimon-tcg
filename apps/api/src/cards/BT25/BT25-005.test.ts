import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled as BT25_005 } from "./BT25-005.js";
import "../index.js";

describe("BT25-005 Pagumon", () => {
  it("matches the catalog identity and Three Musketeers trigger traits", () => {
    expect(getCardDefinition("BT25-005")).toMatchObject({
      cardId: "BT25-005",
      nameEn: "Pagumon",
      colors: ["Black"],
      kinds: ["DigiEgg"],
      level: 2,
      playCost: -1,
      forms: ["In-Training"],
      types: ["Lesser", "Iliad", "TS"],
    });
  });

  it("digivolves this Digimon when a Three Musketeers card is added underneath", () => {
    const effect = BT25_005.effects?.find((entry) => entry.isInherited);
    expect(effect).toMatchObject({ trigger: "YourTurn", frequency: "OncePerTurn" });
    const watcher = effect?.actions?.[0] as {
      event?: string;
      sourceFilter?: unknown;
      triggerFilter?: unknown;
      addedDigivolutionCardFilter?: unknown;
    };
    expect(watcher).toMatchObject({
      kind: "SubTrigger",
      event: "onAddDigivolutionCards",
      sourceFilter: { controllerDefault: "mine" },
      triggerFilter: { isSelfRef: true },
      addedDigivolutionCardFilter: {
        nameOrTrait: [{ tokens: ["Three Musketeers"], match: "trait" }],
      },
    });
    expect((watcher as { actions?: unknown[] }).actions?.[0]).toMatchObject({
      kind: "Digivolve",
      reduceCost: 2,
      payCost: true,
      from: ["hand"],
      optional: true,
      preserveOncePerTurnOnDecline: true,
    });
  });

  it("actually digivolves this stack into a matching hand Digimon for 2 less after a natural evolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-015", as: "host", under: ["BT25-005"] }],
          hand: [
            { card: "BT25-085", as: "target" },
            { card: "BT25-081", as: "nonmatch" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 6;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("target").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard?.cardId === "BT25-085");

    expect(s.perm("host").topCard?.cardId).toBe("BT25-085");
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["BT25-005", "BT25-015"]);
    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT25-081"]);
  });
});
