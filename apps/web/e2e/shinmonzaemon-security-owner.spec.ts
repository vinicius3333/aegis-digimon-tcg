import { test, expect } from "./scenario-page";

const monzaemonId = "dev-perm-0-dm-monzaemon";
const paymentId = "dev-dm-payment";

// Q4940: ShinMonzaemon may place either player's Digimon; each card goes to its owner's security.
for (const owner of [1, 0] as const) {
  const targetInstanceId = `dev-field-${owner}-dm-target`;
  const targetSourceId = `dev-stack-${owner}-dm-target-0`;
  const other = owner === 0 ? 1 : 0;
  const arena = owner === 1 ? "opponent" : "own";
  test(`Discord 1557652222744199228: ShinMonzaemon places the ${arena} Muchomon on its owner's security`, async ({
    scenario,
  }) => {
    test.setTimeout(120_000);
    await scenario.open(`arena-bt22-shinmonzaemon-${arena}-security`);
    await scenario.resolveUntil((s) => s.phase === "Main" && !s.pendingDecision);
    const initial = await scenario.snapshot();
    expect(initial.memory).toBe(8);
    expect(initial.players[0]!.securityCount).toBe(5);
    expect(initial.players[1]!.securityCount).toBe(5);
    const ownSecurity = initial.players[0]!.security.map((c) => c.instanceId);
    const target = initial.players[owner]!.battleArea.find((p) => p.topCard.instanceId === targetInstanceId)!;
    expect(target.topCard.cardId).toBe("BT1-013");

    await scenario.evolve("ShinMonzaemon", monzaemonId);
    const decisions: string[] = [];
    await scenario.resolveUntil(
      (s) => s.players[owner]!.securityCount === 6 && !s.pendingDecision,
      (d) => {
        decisions.push(d.kind);
        return d.kind === "chooseTargets" ? { instanceId: target.permanentId } : {};
      },
    );

    const final = await scenario.snapshot();
    const probe = await scenario.presentation();
    expect(decisions).toContain("optional");
    expect(final.memory).toBe(5);
    expect(probe.events.filter((e) => e.kind === "memoryChanged" && e.reason === "overflow")).toEqual([]);
    const shin = final.players[0]!.battleArea.find((p) => p.permanentId === monzaemonId)!;
    expect(shin.topCard.cardId).toBe("BT22-076");
    expect(shin.stack.map((c) => c.instanceId)).not.toContain(paymentId);
    expect(final.players[0]!.trash.map((c) => c.instanceId)).toContain(paymentId);
    expect(final.players[owner]!.battleArea.some((p) => p.permanentId === target.permanentId)).toBe(false);
    expect(final.players[owner]!.trash.map((c) => c.instanceId)).toContain(targetSourceId);
    expect(final.players[owner]!.securityCount).toBe(6);
    expect(final.players[other]!.securityCount).toBe(5);
    expect(
      probe.events.some(
        (e) => e.kind === "cardsMoved" && e.instanceIds.includes(targetInstanceId) && /security/i.test(e.to),
      ),
    ).toBe(true);
    if (owner === 0) {
      expect(final.players[0]!.security[0]).toMatchObject({ instanceId: targetInstanceId, faceUp: false });
      expect(final.players[0]!.security.slice(1).map((c) => c.instanceId)).toEqual(ownSecurity);
    } else {
      expect(final.players[0]!.security.map((c) => c.instanceId)).toEqual(ownSecurity);
    }
    expect(probe.visible?.players[owner].securityCount).toBe(6);
    expect(probe.visible?.players[other].securityCount).toBe(5);
    await scenario.healthy();
  });
}

test("Discord 1557652222744199228: declining ShinMonzaemon's payment leaves both security stacks unchanged", async ({
  scenario,
}) => {
  test.setTimeout(120_000);
  await scenario.open("arena-bt22-shinmonzaemon-opponent-security");
  await scenario.resolveUntil((s) => s.phase === "Main" && !s.pendingDecision);
  const initial = await scenario.snapshot();
  const ownSecurity = initial.players[0]!.security.map((c) => c.instanceId);

  await scenario.evolve("ShinMonzaemon", monzaemonId);
  let declined = false;
  await scenario.resolveUntil(
    (s) =>
      declined &&
      !s.pendingDecision &&
      s.players[0]!.battleArea.some((p) => p.permanentId === monzaemonId && p.topCard.cardId === "BT22-076"),
    (d) => {
      if (d.kind === "optional") {
        declined = true;
        return { accept: false };
      }
      return {};
    },
  );

  const final = await scenario.snapshot();
  expect(final.memory).toBe(5);
  expect(final.players[1]!.securityCount).toBe(5);
  expect(final.players[0]!.security.map((c) => c.instanceId)).toEqual(ownSecurity);
  expect(final.players[1]!.battleArea.map((p) => p.topCard.instanceId)).toEqual(["dev-field-1-dm-target"]);
  expect(
    final.players[0]!.battleArea.find((p) => p.permanentId === monzaemonId)!.stack.map((c) => c.instanceId),
  ).toContain(paymentId);
  expect(final.players[0]!.trash.map((c) => c.instanceId)).not.toContain(paymentId);
  await scenario.healthy();
});
