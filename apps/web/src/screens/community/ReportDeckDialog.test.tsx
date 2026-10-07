// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../../i18n";
import { ReportDeckDialog } from "./ReportDeckDialog";

const DECK_ID = "e9db0e41-aff5-495c-a971-45f61e84546e";

function mockReport(status: number) {
  const fetchMock = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>(
    async () => new Response(status === 204 ? null : JSON.stringify({}), { status }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function renderDialog(onReported = vi.fn<() => void>()) {
  render(
    <I18nProvider>
      <ReportDeckDialog deckId={DECK_ID} deckName="Rude deck" onReported={onReported} onClose={() => undefined} />
    </I18nProvider>,
  );
  return onReported;
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("reporting a community deck", () => {
  it("sends the chosen reason and the details to the deck's report route", async () => {
    const fetchMock = mockReport(204);
    const onReported = renderDialog();
    fireEvent.click(screen.getByRole("radio", { name: "Spam" }));
    fireEvent.change(screen.getByLabelText("Details (optional)"), { target: { value: "Same deck posted ten times" } });
    fireEvent.click(screen.getByRole("button", { name: "Send report" }));

    await waitFor(() => expect(onReported).toHaveBeenCalled());
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(new URL(String(url)).pathname).toBe(`/community/decks/${DECK_ID}/reports`);
    expect(init?.method).toBe("POST");
    expect(JSON.parse(String(init?.body))).toEqual({ reason: "spam", details: "Same deck posted ten times" });
  });

  it("leaves blank details out", async () => {
    const fetchMock = mockReport(204);
    renderDialog();
    fireEvent.change(screen.getByLabelText("Details (optional)"), { target: { value: "   " } });
    fireEvent.click(screen.getByRole("button", { name: "Send report" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(JSON.parse(String(fetchMock.mock.calls[0]![1]?.body))).toEqual({ reason: "offensive_name" });
  });

  it("explains a refused report and stays open", async () => {
    mockReport(429);
    const onReported = renderDialog();
    fireEvent.click(screen.getByRole("button", { name: "Send report" }));

    expect(await screen.findByText(/Wait a minute and try again/)).toBeTruthy();
    expect(onReported).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Send report" })).toBeTruthy();
  });
});
