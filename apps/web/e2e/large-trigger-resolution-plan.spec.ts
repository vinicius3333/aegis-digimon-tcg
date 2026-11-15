import { test, expect } from "./scenario-page";
import fixture from "../../api/src/engine/scenarios/large-trigger-resolution-plan.fixture";

for (const { width, partialPreset } of [
  { width: 1440, partialPreset: false },
  { width: 390, partialPreset: false },
  { width: 1440, partialPreset: true },
]) {
  test(`submits a large trigger order with ${partialPreset ? "one preset" : "optional presets"} without reconnecting at ${width}px`, async ({
    scenario,
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    const frames: number[] = [];
    const closed: string[] = [];
    page.on("websocket", (socket) => {
      socket.on("framesent", ({ payload }) => {
        frames.push(Buffer.byteLength(payload));
      });
      socket.on("close", () => closed.push(socket.url().split("?")[0]!));
    });
    const refs = await scenario.openFixture(fixture, "normal", "none");
    await scenario.evolve("Lucemon (X Antibody)", refs.permanentId("lucemon"), true);
    await scenario.resolveUntil((state) => state.pendingDecision?.kind === "orderTriggers");
    const before = await scenario.snapshot();
    const beforeFirst = before.players[0];
    const beforeSecond = before.players[1];
    if (!beforeFirst || !beforeSecond) {
      throw new Error("Trigger-order fixture requires both initial player seats");
    }
    const dialog = page.getByRole("dialog");
    if (partialPreset) {
      await dialog
        .getByRole("group", { name: /Answer for Dokuson/ })
        .first()
        .getByRole("button", { name: "No", exact: true })
        .click();
    } else {
      await dialog.getByRole("button", { name: "No to all", exact: true }).click();
      const divineCruz = dialog.getByRole("group", { name: /Answer for Seventh Divine Cruz/ });
      await expect(divineCruz).toHaveCount(2);
      for (let index = 0; index < 2; index += 1) {
        await divineCruz.nth(index).getByRole("button", { name: "Ask", exact: true }).click();
      }
    }
    const framesBeforeResponse = frames.length;
    await dialog.getByRole("button", { name: "Resolve in this order", exact: true }).click();
    await expect.poll(() => frames.length).toBeGreaterThan(framesBeforeResponse);
    expect(Math.max(...frames)).toBeLessThan(4 * 1024);
    await scenario.resolveUntil((state) => !state.pendingDecision && !state.combatWindow);
    expect(closed).toEqual([]);
    const choices = (await scenario.presentation()).events.filter((event) => event.kind === "resolutionOrderChosen");
    expect(choices.some((event) => event.entries.length >= 4)).toBe(true);
    const after = await scenario.snapshot();
    const player = after.players[0];
    const opponent = after.players[1];
    if (!player || !opponent) {
      throw new Error("Trigger-order fixture requires both resolved player seats");
    }
    expect(player.trash.filter((card) => card.cardId === "BT19-094")).toHaveLength(0);
    expect(player.deckCount).toBe(beforeFirst.deckCount + 2);
    expect(opponent.securityCount).toBe(beforeSecond.securityCount - 2);
    const dokusons = player.battleArea.filter((permanent) => permanent.topCard.cardId === "EX11-067");
    expect(dokusons).toHaveLength(2);
    expect(dokusons.filter((permanent) => permanent.isSuspended)).toHaveLength(partialPreset ? 1 : 0);
    await testInfo.attach("transport-message-sizes", {
      body: JSON.stringify({ maxFrameBytes: Math.max(...frames), closedConnections: closed.length }),
      contentType: "application/json",
    });
    await scenario.healthy();
  });
}
