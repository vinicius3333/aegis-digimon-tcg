import { expect, it } from "vitest";
import { getResultStats } from "@/game/screen/layout/getResultStats";

const t = (key: string) => key;
const base = { turnCount: 9, opponentBoardCount: 2, viewerSecurityCount: 3, t };

it("shows how long the match lasted next to the turn count", () => {
  expect(getResultStats({ ...base, durationSeconds: 754, spectating: false })).toEqual([
    { value: 9, label: "game.stats.turns" },
    { value: "12:34", label: "game.stats.duration" },
    { value: 2, label: "game.stats.oppBoard" },
    { value: 3, label: "game.stats.yourSecurity" },
  ]);
});

it("omits the duration when the server did not record the match start", () => {
  expect(getResultStats({ ...base, durationSeconds: 0, spectating: true })).toEqual([
    { value: 9, label: "game.stats.turns" },
  ]);
});
