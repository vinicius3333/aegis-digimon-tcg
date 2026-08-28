import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT12-062.js";

describe("BT12-062 Greymon", () => {
  it("plays Tai Kamiya from hand when digivolving while no Tai is in play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT12-059", as: "base" }],
          hand: [
            { card: "BT12-062", as: "evo" },
            { card: "BT1-085", as: "tai" },
          ],
          deck: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evo").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "BT1-085"));
    expect(s.state.memory).toBe(0);
    expect(s.perm("base").stack.map(({ cardId }) => cardId)).toEqual(["BT12-059"]);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT1-009"]);
  });

  it("rejects the alternate route from a level 3 without Agumon in its name", () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "base" }], hand: [{ card: "BT12-062", as: "evo" }] },
    });
    s.state.memory = 2;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evo").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.state.memory).toBe(2);
  });

  it("accepts compound-name Tai Kamiya & Matt Ishida and places that exact card in battle", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT12-059", as: "base" }],
          hand: [
            { card: "BT12-062", as: "evo" },
            { card: "BT5-093", as: "compoundTai" },
          ],
          deck: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const taiId = s.inst("compoundTai").instanceId;
    s.state.memory = 2;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evo").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === taiId));
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.instanceId)).toContain(taiId);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).not.toContain(taiId);
  });

  it("grants inherited DP on a realistic stack created through public evolution", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT12-062", as: "greymon" }],
        hand: [{ card: "BT12-068", as: "metalGreymon" }],
        deck: ["BT1-009"],
      },
    });
    s.state.memory = 4;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("greymon").permanentId,
        instanceId: s.inst("metalGreymon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("greymon").topCard.cardId === "BT12-068");
    expect(s.perm("greymon").stack.map(({ cardId }) => cardId)).toEqual(["BT12-062"]);
    expect(s.perm("greymon").currentDP).toBe(s.perm("greymon").baseDP + 1000);
  });

  it.each(["BT1-015", "BT1-084"])("gives a Greymon or Omnimon host %s +1000 DP", async (host) => {
    const s = setupEngine({ 0: { battleArea: [{ card: host, as: "host", under: ["BT12-062"] }] } });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP + 1000);
  });

  it("does not give an unrelated host +1000 DP", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-009", as: "host", under: ["BT12-062"] }] } });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP);
  });

  it("does not play another Tai Kamiya when one is already in play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT10-058", as: "base" },
            { card: "BT1-085", as: "existingTai" },
          ],
          hand: [
            { card: "BT12-062", as: "evo" },
            { card: "BT1-085", as: "extraTai" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT12-062");
    expect(s.state.players[0]!.battleArea.filter(({ topCard }) => topCard?.cardId === "BT1-085")).toHaveLength(1);
    expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("extraTai").instanceId)).toBe(true);
  });

  it("may decline playing Tai Kamiya", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT12-059", as: "base" }],
          hand: [
            { card: "BT12-062", as: "evo" },
            { card: "BT5-093", as: "tai" },
          ],
          deck: ["BT1-009"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evo").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT12-062");
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("tai").instanceId);
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["BT12-062"]);
  });
});
