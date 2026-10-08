import { type SavedReplay } from "@aegis/shared";
import { accountApi, AccountApiError, request } from "../account/client";

export interface ReplayLibraryView {
  enabled: boolean;
  limit: number;
  replays: SavedReplay[];
}
export const replayApi = {
  list: () => request<ReplayLibraryView>("/account/replays"),
  remove: (id: string) => request<{ ok: true }>(`/account/replays/${encodeURIComponent(id)}`, { method: "DELETE" }),
  async file(id: string): Promise<Blob> {
    const response = await fetch(`${accountApi.base}/account/replays/${encodeURIComponent(id)}/file`, {
      credentials: "include",
    });
    if (!response.ok) throw new AccountApiError(response.status);
    return response.blob();
  },
};

export function downloadSavedReplay(id: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `aegis-${id}.aegis-replay`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
