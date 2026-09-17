// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { Pile } from "./boardPieces";
import { Side } from "./side";

afterEach(cleanup);

it("shows the public security DP modifier and removes it when the effect expires", () => {
  const { rerender } = render(
    <Pile shield={Side.Opponent} count={5} label="Opponent security" securityDpDelta={-3000} />,
  );
  expect(screen.getByText("−3000 DP")).toBeTruthy();
  expect(screen.getByRole("img").getAttribute("aria-label")).toContain("−3000 DP");
  rerender(<Pile shield={Side.Opponent} count={5} label="Opponent security" securityDpDelta={0} />);
  expect(screen.queryByText("−3000 DP")).toBeNull();
  rerender(
    <Pile shield={Side.Viewer} count={5} label="Your security" securityDpDelta={2000} attackLabel="Security attack" />,
  );
  expect(screen.getByText("+2000 DP")).toBeTruthy();
  expect(screen.getByText("Security attack")).toBeTruthy();
});

it("uses the server effective DP for the security battle, including zero", async () => {
  const { buildSecurityRevealScene, settleSecurityClashScene } = await import("./securityClash");
  const scene = buildSecurityRevealScene({
    key: 1,
    revealedCardId: "BT1-009",
    defenderSeat: 1,
    viewerSeat: 0,
    securityCardDP: 0,
    attackerDP: 2000,
    attacker: { seat: 0, cardId: "BT7-031" },
  });
  expect(scene.revealed.dp).toBe(0);
  expect(scene.attacker?.dp).toBe(2000);
  const settled = settleSecurityClashScene(scene, {
    resolution: "battle",
    battle: { attackerDeleted: false, securityDigimonDeleted: true, attackerDP: 4000, securityCardDP: 1000 },
  });
  expect(settled.revealed.dp).toBe(1000);
  expect(settled.attacker?.dp).toBe(4000);
});
