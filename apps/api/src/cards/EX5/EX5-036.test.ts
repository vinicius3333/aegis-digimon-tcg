import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./EX5-036.js";

describe("EX5-036 Aquilamon", () => {
  it("has Fortitude and gains 1000 DP while suspended", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.keywords).toMatchObject([
      { keyword: "Fortitude" },
    ]);
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")).toMatchObject({
      isInherited: true,
      actions: [
        {
          kind: "Aura",
          target: { filter: { isSelfRef: true }, isSelf: true },
          effect: { kind: "modifyDP", amount: 1000 },
          while: { kind: "selfIsSuspended" },
        },
      ],
    });
  });

  it("replays itself for free when deleted with a digivolution card", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX5-036", as: "aquilamon", under: ["BT1-009"] }] } });
    const instanceId = s.inst("aquilamon").instanceId;

    await advance(s.engine).verb.deletePermanent([s.perm("aquilamon").permanentId], "byEffect");
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === instanceId),
    );

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === instanceId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === instanceId)).toBe(false);
    expect(s.state.memory).toBe(0);
  });

  it("does not replay when deleted without digivolution cards", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX5-036", as: "aquilamon" }] } });
    const instanceId = s.inst("aquilamon").instanceId;

    await advance(s.engine).verb.deletePermanent([s.perm("aquilamon").permanentId], "byEffect");
    await settle();

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === instanceId)).toBe(
      false,
    );
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === instanceId)).toBe(true);
  });

  it("applies its inherited DP boost only while the host is suspended", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-010", as: "host", under: ["EX5-036"] }] } });
    const host = s.perm("host");
    const baseDP = host.baseDP;
    await s.ready();

    expect(observe(s.engine).hasKeyword(host, "Fortitude")).toBe(false);
    expect(host.currentDP).toBe(baseDP);
    await advance(s.engine).verb.suspend([host.permanentId]);
    await settle(() => host.currentDP === baseDP + 1000);
    expect(host.currentDP).toBe(baseDP + 1000);
    await advance(s.engine).verb.unsuspend([host.permanentId]);
    await settle(() => host.currentDP === baseDP);
    expect(host.currentDP).toBe(baseDP);
  });
});
