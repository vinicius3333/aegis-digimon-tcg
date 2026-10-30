import { describe, expect, it } from "vitest";
import { translator } from "@/i18n/translator";
import { pendingMatchNotice } from "@/game/screen/model/pendingMatchNotice";

type Params = Partial<Parameters<typeof pendingMatchNotice>[0]>;

function getNotice(params: Params) {
  return pendingMatchNotice({
    status: "error",
    botError: undefined,
    error: undefined,
    vsBot: false,
    startMode: "casual",
    hostRoomCode: undefined,
    joinOptions: { displayName: "Tamer" },
    t: translator("en"),
    ...params,
  });
}

describe("connection notices", () => {
  it("explains an oversized selection while preserving automatic recovery", () => {
    expect(getNotice({ status: "reconnecting", error: "AEGIS_MESSAGE_TOO_LARGE" })).toMatchObject({
      title: "Reconnecting…",
      detail: "Your selection was too large to send. Reconnecting to restore the pending choice.",
      spinner: true,
    });
  });

  it("offers leaving after reconnection fails instead of showing the matchmaking spinner", () => {
    expect(getNotice({ status: "closed", error: "AEGIS_RECONNECT_FAILED" })).toMatchObject({
      detail: "We could not resume this match. Return to the lobby and try again.",
      spinner: false,
      exitTo: "lobby",
    });
  });

  it("does not infer a server outage from an abnormal closure", () => {
    expect(getNotice({ error: "AEGIS_CONNECTION_LOST" }).detail).toBe(
      "The connection to your match was interrupted. Please try reconnecting.",
    );
  });
});

describe("matchmaking cancellation", () => {
  it.each(["casual", "ranked", "unlimited", "beta"] as const)(
    "offers cancelling the %s queue without a loss",
    (startMode) => {
      expect(getNotice({ status: "connected", startMode })).toMatchObject({
        spinner: true,
        actionLabel: "Cancel search",
        exitTo: "lobby",
      });
    },
  );

  it("explains cancellation before an opponent joins", () => {
    expect(getNotice({ status: "connecting" }).detail).toContain(
      "Cancelling before an opponent joins does not count as a loss.",
    );
  });

  it("does not offer queue cancellation while reconnecting to a match", () => {
    expect(getNotice({ status: "reconnecting" }).actionLabel).toBeUndefined();
  });

  it.each(["bot", "private_host", "private_guest", "spectator"] as const)(
    "does not label %s as public matchmaking",
    (startMode) => {
      expect(getNotice({ status: "connected", startMode, vsBot: startMode === "bot" }).actionLabel).toBeUndefined();
    },
  );
});

it("does not offer cancelling a search once both players are seated", () => {
  expect(getNotice({ status: "connected", hasOpponent: true }).actionLabel).toBeUndefined();
});

describe("spectator notice", () => {
  it("tells a spectator they are watching instead of queued", () => {
    const notice = getNotice({ status: "connecting", startMode: "spectator", spectating: true });
    expect(notice).toMatchObject({ title: "Joining as a spectator…", spinner: true });
    expect(notice.detail).toContain("You are not in the queue");
    expect(notice.actionLabel).toBeUndefined();
  });
});
