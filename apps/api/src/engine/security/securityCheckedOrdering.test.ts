import { describe, expect, it } from "vitest";
import { settle, setupEngine } from "../testkit/harness.js";
import "../../cards/index.js";

describe("securityChecked ordering around an attacker deleted by a Security Digimon", () => {
  it("closes the check before the deleted attacker's [On Deletion] effect announces itself", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "AD1-002", as: "attacker" }],
        hand: [{ card: "AD1-002", as: "hybridInHand" }],
      },
      1: { security: [{ card: "BT18-019", as: "millenniummon" }] },
    });
    const attackerPermanentId = s.perm("attacker").permanentId;
    const attackerInstanceId = s.inst("attacker").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });

    await settle(() => s.decisions.some(({ req }) => req.sourceCardId === "AD1-002"));

    const movedIndex = s.events.findIndex(
      (event) =>
        event.kind === "cardsMoved" &&
        (event.deletedPermanents ?? []).some((deleted) => deleted.instanceId === attackerInstanceId),
    );
    const checkedIndex = s.events.findIndex((event) => event.kind === "securityChecked");
    const triggeredIndex = s.events.findIndex(
      (event) => event.kind === "effectTriggered" && event.sourceCardId === "AD1-002",
    );

    expect(movedIndex).toBeGreaterThanOrEqual(0);
    expect(checkedIndex).toBeGreaterThan(movedIndex);
    expect(triggeredIndex).toBeGreaterThan(checkedIndex);

    const checked = s.events[checkedIndex];
    expect(checked && checked.kind === "securityChecked" ? checked : undefined).toMatchObject({
      resolution: "battle",
      battle: { attackerDeleted: true, securityDigimonDeleted: false, securityCardDP: 14000 },
    });
    expect(s.events.filter((event) => event.kind === "securityChecked")).toHaveLength(1);
  });

  it("closes the check right after the compare when ＜Jamming＞ spares the losing attacker", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT16-008", as: "attacker" }] },
      1: { security: [{ card: "BT18-019", as: "millenniummon" }] },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });

    await settle(() => s.events.some((event) => event.kind === "securityChecked"));

    const checked = s.events.find((event) => event.kind === "securityChecked");
    expect(checked).toMatchObject({
      resolution: "battle",
      battle: { attackerDeleted: false, securityDigimonDeleted: false },
    });
    expect(s.events.filter((event) => event.kind === "securityChecked")).toHaveLength(1);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
  });
});
