import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX6-067.js";

describe("EX6-067 Final Excalibur", () => {
  it("unsuspends one Angel-family Digimon without Dominimon, or all with Dominimon", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "Main")?.actions).toMatchObject([
      { kind: "Unsuspend", target: { count: 1 }, condition: { kind: "youHaveNone" } },
      { kind: "Unsuspend", target: { count: "all" }, condition: { kind: "youHave" } },
    ]));
  it("recovers one and adds itself to hand from security", () =>
    expect(compiled.effects?.find((entry) => entry.isSecurity)?.actions).toMatchObject([
      { kind: "GainKeyword", keyword: { keyword: "Recovery", amount: 1 } },
      { kind: "AddToHandSelf" },
    ]));
  it("publicly unsuspends one Angel without Dominimon and all Angels with Dominimon", async () => {
    const single = setupEngine(
      { 0: { hand: [{ card: "EX6-067", as: "option" }], battleArea: [{ card: "BT1-053", as: "angelOne", suspended: true }, { card: "BT1-055", as: "angelTwo", suspended: true }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    single.state.memory = 10;
    await single.ready();
    expect(single.engine.applyIntent(0, { type: "playCard", instanceId: single.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => single.state.players[0]!.battleArea.some((perm) => !perm.isSuspended));
    expect(single.state.players[0]!.battleArea.filter((perm) => !perm.isSuspended)).toHaveLength(1);

    const all = setupEngine(
      { 0: { hand: [{ card: "EX6-067", as: "option" }], battleArea: [{ card: "BT1-053", as: "angelOne", suspended: true }, { card: "EX6-030", as: "dominimon" }, { card: "BT1-055", as: "angelTwo", suspended: true }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    all.state.memory = 10;
    await all.ready();
    expect(all.engine.applyIntent(0, { type: "playCard", instanceId: all.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => all.state.players[0]!.battleArea.filter((perm) => !perm.isSuspended).length === 3);
    expect(all.state.players[0]!.battleArea.filter((perm) => !perm.isSuspended)).toHaveLength(3);
  });
});
