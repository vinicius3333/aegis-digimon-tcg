import { Phase, type Seat } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT2-004.js";

async function unsuspendForActivePhase(engine: Parameters<typeof advance>[0], seat: Seat): Promise<string[]> {
  return (engine as unknown as { unsuspendForActivePhase(seat: Seat): Promise<string[]> }).unsuspendForActivePhase(
    seat,
  );
}

describe("BT2-004 Argomon", () => {
  it("gains 1 memory when its host becomes unsuspended in the active phase", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-043", as: "host", under: ["BT2-004"], suspended: true }] },
    });
    s.state.phase = Phase.Active;
    s.state.memory = 0;
    await s.ready();
    await unsuspendForActivePhase(s.engine, 0);
    expect(s.state.memory).toBe(1);
  });

  it("Q994 does not gain memory when the host is already active during the active phase", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT2-043", as: "host", under: ["BT2-004"] }] } });
    s.state.phase = Phase.Active;
    s.state.memory = 0;
    await unsuspendForActivePhase(s.engine, 0);
    expect(s.state.memory).toBe(0);
  });

  it("does not gain memory when the host unsuspends during the main phase", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-043", as: "host", under: ["BT2-004"], suspended: true }] },
    });
    s.state.memory = 0;
    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    expect(s.state.memory).toBe(0);
  });

  it("does not gain memory when its host unsuspends during the opponent's active phase", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-043", as: "host", under: ["BT2-004"], suspended: true }] },
    });
    s.state.turnSeat = 1;
    s.state.phase = Phase.Active;
    s.state.memory = 0;
    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    expect(s.state.memory).toBe(0);
  });
});
