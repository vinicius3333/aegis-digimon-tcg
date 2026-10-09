import { test, expect, type DecisionPolicy } from "./scenario-page";

test.use({ holdBotAfterTurn: 6 });

const OPTION = "dev-dragon-gene-security-option";
const HAND_DRACOMON = "dev-dragon-gene-security-hand";
const TRASH_DRACOMON = "dev-dragon-gene-security-trash";
const ESTABLISHED = "dev-field-0-dragon-gene-security-human";

for (const route of ["hand", "trash", "decline", "skip"] as const) {
  test(`Discord 1557553612228665396: BT20-093's security effect activates on a real security check (${route})`, async ({
    scenario,
    page,
  }) => {
    test.setTimeout(120_000);
    await scenario.open("arena-bt20-dragon-gene-security");
    await scenario.resolveUntil((s) => s.turnSeat === 0 && s.phase === "Main" && !s.pendingDecision);
    const initial = await scenario.snapshot();
    expect(initial.players[0]!.security.map((c) => c.instanceId)).toEqual([OPTION]);
    expect(initial.players[0]!.hand.some((c) => c.instanceId === HAND_DRACOMON)).toBe(true);
    expect(initial.players[0]!.trash.map((c) => c.instanceId)).toEqual([TRASH_DRACOMON]);
    expect(initial.players[0]!.battleArea.map((p) => p.topCard.instanceId)).toEqual([ESTABLISHED]);

    await page.getByRole("button", { name: /^end turn$/i }).click();
    // The bot plays its own Breeding and Main phases before it attacks.
    await expect
      .poll(async () => (await scenario.snapshot()).pendingDecision?.kind, { timeout: 60_000 })
      .toBe("optional");
    let consentSeen = false;
    let pickerCandidates: string[] | undefined;
    const finished = (s: Awaited<ReturnType<typeof scenario.snapshot>>) =>
      s.players[0]!.securityCount === 0 &&
      s.players[0]!.battleArea.some((p) => p.topCard.instanceId === OPTION) &&
      !s.pendingDecision &&
      !s.combatWindow;
    const policy: DecisionPolicy = (d) => {
      if (d.kind === "optional" && d.sourceCardId === "BT20-093") {
        consentSeen = true;
        return { accept: route !== "decline" };
      }
      if (d.sourceCardId === "BT20-093" && d.kind === "selectCards") {
        pickerCandidates = [...(d.options.candidateInstanceIds ?? [])];
        return { instanceId: route === "hand" ? HAND_DRACOMON : TRASH_DRACOMON };
      }
      return {};
    };
    if (route === "skip") {
      await scenario.resolveUntil(
        (s) => s.pendingDecision?.kind === "selectCards" && s.pendingDecision.payloadJson.includes(HAND_DRACOMON),
        policy,
      );
      const picker = (await scenario.snapshot()).pendingDecision!;
      pickerCandidates = [...JSON.parse(picker.payloadJson).candidateInstanceIds];
      // This picker answers "no card" with a single "None" button, which the shared policy does not drive.
      await page
        .getByRole("dialog", { name: "Unleash the Dragon Gene · effect" })
        .getByRole("button", { name: "None", exact: true })
        .click();
      await expect
        .poll(async () => (await scenario.snapshot()).pendingDecision?.decisionId, { timeout: 8_000 })
        .not.toBe(picker.decisionId);
    }
    await scenario.resolveUntil(finished, policy, 25_000);

    const final = await scenario.snapshot();
    const human = final.players[0]!;
    const played = route === "hand" ? [HAND_DRACOMON] : route === "trash" ? [TRASH_DRACOMON] : [];
    expect(consentSeen).toBe(true);
    if (route !== "decline") expect(pickerCandidates?.sort()).toEqual([HAND_DRACOMON, TRASH_DRACOMON].sort());
    expect(human.security).toHaveLength(0);
    expect(human.battleArea.map((p) => p.topCard.instanceId).sort()).toEqual([ESTABLISHED, OPTION, ...played].sort());
    expect(human.battleArea.find((p) => p.topCard.instanceId === OPTION)!.placedByEffect).toBe(true);
    expect(human.trash.some((c) => c.instanceId === OPTION)).toBe(false);
    expect(human.hand.some((c) => c.instanceId === HAND_DRACOMON)).toBe(route !== "hand");
    expect(human.trash.some((c) => c.instanceId === TRASH_DRACOMON)).toBe(route !== "trash");
    const probe = await scenario.presentation();
    expect(
      probe.events.some((e) => e.kind === "securityChecked"),
      "the bot's attack produced a real security check",
    ).toBe(true);
    expect(probe.visible?.players[0].securityCount).toBe(0);
    await scenario.healthy();
  });
}
