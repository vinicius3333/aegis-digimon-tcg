import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT8-065.js";

describe("BT8-065 CatchMamemon", () => {
  it("returns Mamemon cards from hand and trash to deck top and de-digivolves after returning at least 3", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-061", as: "base" }],
          hand: [{ card: "BT8-065", as: "evolving" }, "BT3-071", "BT6-063"],
          trash: ["BT6-064"],
        },
        1: { battleArea: [{ card: "BT8-067", under: ["BT1-009", "BT1-015"], as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "BT8-065"));
    expect(s.state.players[0]!.deck).toHaveLength(3);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.perm("target").topCard?.cardId).toBe("BT1-015");
  });

  it("uses the printed Mamemon name-only filter", () => {
    expect(compiled?.effects[0]?.actions[0]).toMatchObject({
      kind: "Return",
      target: {
        filter: {
          nameOrTrait: [{ match: "name", tokens: ["Mamemon"] }],
        },
      },
    });
  });
});

describe("BT8-065 CatchMamemon — KB Q&A rulings", () => {
  it("returns up to 4 Mamemon cards in any combination of hand and trash (Q1747)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-061", as: "base" }],
          hand: [
            { card: "BT8-065", as: "evolving" },
            { card: "BT3-071", as: "handOne" },
            { card: "BT6-063", as: "handTwo" },
            { card: "BT6-064", as: "handLeftover" },
          ],
          trash: [
            { card: "BT6-064", as: "trashOne" },
            { card: "BT3-071", as: "trashTwo" },
          ],
        },
        1: { battleArea: [{ card: "BT8-067", under: ["BT1-009", "BT1-015"], as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    const returnedAliases = ["handOne", "handTwo", "trashOne", "trashTwo"];
    preferred.push(...returnedAliases.map((alias) => s.inst(alias).instanceId));
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "BT8-065"));

    const player = s.state.players[0]!;
    expect(player.deck.map((card) => card.instanceId).sort()).toEqual(
      returnedAliases.map((alias) => s.inst(alias).instanceId).sort(),
    );
    expect(player.trash).toHaveLength(0);
    expect(player.hand.map((card) => card.instanceId)).toEqual([s.inst("handLeftover").instanceId]);
    expect(s.perm("target").topCard?.cardId).toBe("BT1-015");
    // Only the hand cards were private; the trash cards were already public.
    const revealed = s.events.flatMap((event) => (event.kind === "cardRevealed" ? [event.cardId] : []));
    expect(revealed.sort()).toEqual(["BT3-071", "BT6-063"]);
  });
});
