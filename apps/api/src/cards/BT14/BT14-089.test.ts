import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-089.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";

describe("BT14-089", () => {
  it("deletes a 6000 DP or lower Digimon without Greymon, otherwise the lowest DP Digimon", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "Main", actions: [{ kind: "Delete" }, { kind: "Delete" }] });
    expect(compiled.effects?.[0]?.actions[0]).toMatchObject({ target: { filter: { dp: { op: "lte", value: 6000 } } } });
    expect(compiled.effects?.[0]?.actions[1]).toMatchObject({ target: { filter: { superlative: "lowestDP" } } });
  });

  it("activates the main effect in security", () => {
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "Security",
      isSecurity: true,
      actions: [{ kind: "ActivateMain" }],
    });
  });

  it("deletes a 6000 DP or lower opposing Digimon without a Greymon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT14-007", as: "redSource" }],
          hand: [{ card: "BT14-089", as: "option" }],
        },
        1: {
          battleArea: [
            { card: "BT14-069", as: "lowest", dp: 2000 },
            { card: "BT14-074", as: "higher", dp: 6000 },
          ],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.state.players[1]!.battleArea.some((perm) => perm.topCard?.cardId === "BT14-069"));
    expect(s.state.players[1]!.battleArea.some((perm) => perm.topCard?.cardId === "BT14-069")).toBe(false);
    expect(s.state.players[1]!.battleArea.some((perm) => perm.topCard?.cardId === "BT14-074")).toBe(true);
  });

  it("deletes the lowest-DP opposing Digimon when a Greymon is present", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT14-012", as: "greymon" }], hand: [{ card: "BT14-089", as: "option" }] },
        1: {
          battleArea: [
            { card: "BT14-069", as: "lowest", dp: 2000 },
            { card: "BT14-074", as: "higher", dp: 6000 },
          ],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    expect(s.state.players[1]!.battleArea.some((perm) => perm.topCard?.cardId === "BT14-069")).toBe(false);
    expect(s.state.players[1]!.battleArea.some((perm) => perm.topCard?.cardId === "BT14-074")).toBe(true);
  });

  it("naturally activates its Main effect from a Security check", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT14-058", as: "attacker", dp: 7000 },
            { card: "BT14-069", as: "lowest", dp: 2000 },
            { card: "BT14-074", as: "higher", dp: 6000 },
          ],
        },
        1: {
          security: [{ card: "BT14-089", as: "securityOption" }],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT14-069"));
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT14-069")).toBe(false);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT14-074")).toBe(true);
  });
});
