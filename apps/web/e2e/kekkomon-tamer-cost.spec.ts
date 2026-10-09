import { test, expect } from "./scenario-page";

for (const payer of [0, 1]) {
  test(`Kekkomon consumes the selected suspended Tamer's bottom source (payer ${payer})`, async ({ scenario }) => {
    await scenario.open("arena-github5332-kekkomon-cost");
    await scenario.resolveUntil(
      (s) => s.phase === "Main" && !s.pendingDecision,
      () => ({ accept: false }),
    );
    const initial = await scenario.snapshot();
    const [attacker, helper, ...tamers] = initial.players[0]!.battleArea;
    await scenario.attack(helper!.permanentId);
    let optional = 0;
    await scenario.resolveUntil(
      (s) => s.players[1]!.securityCount === 2 && !s.pendingDecision && !s.combatWindow,
      (d) => {
        if (d.kind === "optional") {
          optional++;
          return { accept: optional !== 2 };
        }
        if (d.options.purpose === "cost") return { instanceId: tamers[0]!.topCard.instanceId };
        if (d.kind === "chooseTargets") return { instanceId: helper!.permanentId };
        return {};
      },
    );
    const prepared = await scenario.snapshot();
    expect(prepared.players[0]!.battleArea.slice(2).map((p) => p.isSuspended)).toEqual([true, true]);
    const selected = prepared.players[0]!.battleArea.slice(2)[payer]!;
    const paymentId = selected.stack[0]!.instanceId;
    expect(selected.stack[0]!.faceUp).toBe(false);
    await scenario.attack(attacker!.permanentId);
    let evolutionSelected = false;
    await scenario.resolveUntil(
      (s) => s.players[1]!.securityCount === 1 && !s.pendingDecision && !s.combatWindow,
      (d) => {
        if (d.options.purpose === "cost") return { instanceId: selected.topCard.instanceId };
        if (d.options.candidateInstanceIds?.includes("dev-5332-evolution-0")) {
          evolutionSelected = true;
          return { instanceId: "dev-5332-evolution-0" };
        }
        return { accept: !evolutionSelected };
      },
    );
    const final = await scenario.snapshot();
    expect(final.players[0]!.battleArea[0]!.topCard.cardId).toBe("ST23-07");
    expect(final.players[0]!.battleArea.slice(2).map((p) => p.stack.length)).toEqual(payer === 0 ? [0, 4] : [1, 3]);
    expect(final.players[0]!.trash.some((c) => c.instanceId === paymentId)).toBe(true);
    expect(final.memory).toBe(10);
    await scenario.healthy();
  });
}
