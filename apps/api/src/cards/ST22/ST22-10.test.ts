import { describe, it, expect } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import { advance } from "../../engine/testkit/advance.js";

const ST22 = "ST22-10";
const OPP_DIGIMON = "BT10-075";

describe("ST22-10 OnDiscardSecurity (effect trashes this card from security)", () => {
  it("trashing ST22-10 from security by an effect gives 1 opponent Digimon -9000 DP", async () => {
    const s = setupEngine(
      {
        0: { security: [{ card: ST22, as: "st22", faceUp: true }] },
        1: { battleArea: [{ card: OPP_DIGIMON, dp: 12000, as: "oppPerm" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p0 = s.state.players[0]!;
    const st22Id = s.inst("st22").instanceId;
    const oppPerm = s.perm("oppPerm");

    await advance(s.engine).verb.trash([st22Id]);
    await settle(() => oppPerm.currentDP !== 12000);

    expect(oppPerm.currentDP).toBe(3000);
    expect(p0.trash.some((c) => c.instanceId === st22Id)).toBe(true);
    expect(p0.security.some((c) => c.instanceId === st22Id)).toBe(false);
  });

  it("does nothing when the opponent has no Digimon (CanActivate gate)", async () => {
    const s = setupEngine(
      { 0: { security: [{ card: ST22, as: "st22", faceUp: true }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p0 = s.state.players[0]!;
    const st22Id = s.inst("st22").instanceId;

    await advance(s.engine).verb.trash([st22Id]);
    await settle(() => p0.trash.some((c) => c.instanceId === st22Id));

    expect(p0.trash.some((c) => c.instanceId === st22Id)).toBe(true);
  });

  it("trashes itself from face-up security to prevent a named Digimon's effect deletion", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: ST22, as: "st22", faceUp: true }],
          battleArea: [{ card: "ST22-03", as: "taomon" }],
        },
        1: { battleArea: [{ card: OPP_DIGIMON, dp: 12000, as: "oppPerm" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();

    await advance(s.engine).verb.deletePermanent([s.perm("taomon").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("st22").instanceId));

    expect(s.state.players[0]!.battleArea.some((perm) => perm.permanentId === s.perm("taomon").permanentId)).toBe(true);
    expect(s.state.players[0]!.security.some((card) => card.instanceId === s.inst("st22").instanceId)).toBe(false);
    expect(s.perm("oppPerm").currentDP).toBe(3000);
  });
});
