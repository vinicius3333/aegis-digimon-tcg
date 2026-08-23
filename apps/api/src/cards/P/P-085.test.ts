import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-085.js";

describe("P-085 Dracmon", () => {
  it("digivolves into a legal Undead from trash and pays its digivolution cost", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "P-085", as: "source" }],
          trash: [{ card: "BT10-076", as: "troopmon" }],
          battleArea: [{ card: "BT4-097", as: "tamer" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    const troopmonId = s.inst("troopmon").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("source").instanceId,
      }),
    ).toEqual({ ok: true });

    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT10-076"));

    const evolved = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.cardId === "BT10-076");
    expect(evolved).toBeDefined();
    expect(evolved?.topCard?.instanceId).toBe(troopmonId);
    expect(evolved?.stack.some((card) => card.cardId === "P-085")).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === troopmonId)).toBe(false);
    expect(s.state.memory).toBe(5); // 3 to play Dracmon, then 2 to digivolve.
  });

  it("does not ignore the trash card's digivolution requirements", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "P-085", as: "source" }],
          trash: [{ card: "BT1-023", as: "skullgreymon" }],
          battleArea: [{ card: "BT4-097", as: "tamer" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    const skullGreymonId = s.inst("skullgreymon").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("source").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "P-085")).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === skullGreymonId)).toBe(true);
    expect(s.state.memory).toBe(7); // Only Dracmon's play cost was paid.
  });

  it("does not digivolve without a purple Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "P-085", as: "source" }],
          trash: [{ card: "BT10-076", as: "troopmon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    const troopmonId = s.inst("troopmon").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("source").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "P-085")).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === troopmonId)).toBe(true);
    expect(s.state.memory).toBe(7);
  });

  it("may decline the optional trash digivolution", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "P-085", as: "source" }],
          trash: [{ card: "BT10-076", as: "troopmon" }],
          battleArea: [{ card: "BT4-097", as: "tamer" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    const trashDigimonId = s.inst("troopmon").instanceId;
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle();

    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "P-085")).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === trashDigimonId)).toBe(true);
    expect(s.state.memory).toBe(7);
  });
});
