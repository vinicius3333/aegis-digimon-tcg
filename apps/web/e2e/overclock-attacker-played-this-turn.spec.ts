import fixture from "../../api/src/engine/scenarios/overclock-attacker-played-this-turn.fixture";
import { test, expect } from "./scenario-page";

const WARNING = "No attack can be declared right now. You can still pay the cost, but no attack will follow.";

test("Overclock warns that no attack follows when its Digimon was played this turn", async ({ scenario }) => {
  const { page } = scenario;
  const refs = await scenario.openFixture(fixture, "normal", "none");
  await scenario.resolveUntil((state) => state.phase === "Main" && state.turnSeat === 0 && !state.pendingDecision);
  const endedTurn = (await scenario.snapshot()).turnCount;
  await page.getByRole("button", { name: /^End turn$/i }).click();
  await expect(page.getByText(WARNING)).toBeVisible();
  const overclockPromptKeys: unknown[] = [];
  await scenario.resolveUntil(
    (state) => state.turnCount > endedTurn,
    (decision) => {
      if (decision.kind === "optional" && decision.sourceCardId === "ST19-08") {
        overclockPromptKeys.push(decision.options.promptKey);
        return { accept: false };
      }
      return {};
    },
  );
  expect(overclockPromptKeys).toEqual(["attackUnavailable"]);
  const after = await scenario.snapshot();
  expect(after.players[0]!.battleArea.map((permanent) => permanent.permanentId)).toContain(refs.permanentId("shoemon"));
  expect(after.players[1]!.securityCount).toBe(1);
  expect((await scenario.presentation()).events.some((event) => event.kind === "attackDeclared")).toBe(false);
  expect(scenario.errors).toEqual([]);
});
