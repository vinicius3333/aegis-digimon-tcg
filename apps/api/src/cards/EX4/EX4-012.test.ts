import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX4-012.js";
import "../index.js";

describe("EX4-012 VictoryGreymon", () => {
  it("raises the DP deletion ceiling by 2000 per opponent Digimon", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions?.[0]).toMatchObject({ kind: "Delete", dpCeiling: 6000, dpCeilingScaling: { per: 1, amount: 2000, unit: "cards", filter: { zone: "battleArea", controller: "opponent", kind: ["Digimon"] } } });
  });
  it("deletes the highest-DP opposing Digimon after another deletion if a Tamer is in play", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions?.[0]).toMatchObject({ kind: "SubTrigger", event: "onDeletionOf", condition: { kind: "youHave", filter: { zone: "battleArea", controllerDefault: "mine", kind: ["Tamer"] } }, actions: [{ kind: "Delete", target: { filter: { controller: "opponent", kind: ["Digimon"], superlative: "highestDP" }, count: 1 } }] });
  });

  it("scales the digivolution deletion ceiling by opposing Digimon in play", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX4-012", as: "victory" }] }, 1: { battleArea: [{ card: "BT1-009", as: "target", dp: 10000 }, { card: "BT1-009", as: "other", dp: 1000 }] } }, { autoSelectCards: true });
    await s.ready();

    await advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("victory"));
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("deletes the opposing highest-DP Digimon after an opponent deletion when a Tamer is present", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX4-012", as: "victory" }, { card: "BT1-085", as: "tamer" }] }, 1: { battleArea: [{ card: "BT1-009", as: "first", dp: 3000 }, { card: "BT1-009", as: "highest", dp: 7000 }] } });
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.None, s.perm("victory"));

    await advance(s.engine).verb.deletePermanent([s.perm("first").permanentId], "byEffect");
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});
