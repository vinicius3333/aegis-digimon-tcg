import { type SavedReplay } from "@aegis/shared";
import { accountApi, AccountApiError, request } from "../account/client";

export interface ReplayLibraryView {
  enabled: boolean;
  limit: number;
  replays: SavedReplay[];
}
export const replayApi = {
  visibility: (id: string, visibility: SavedReplay["visibility"]) =>
    request<SavedReplay>(`/account/replays/${encodeURIComponent(id)}/visibility`, {
      method: "PUT",
      body: JSON.stringify({ visibility }),
    }),
  shared: (id: string) => request<SavedReplay>(`/replays/${encodeURIComponent(id)}`),
  async sharedFile(id: string): Promise<Blob> {
    const response = await fetch(`${accountApi.base}/replays/${encodeURIComponent(id)}/file`, {
      credentials: "include",
      cache: "no-store",
    });
    if (!response.ok) throw new AccountApiError(response.status);
    return response.blob();
  },
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

export const replayPath = (id: string) => `/replays/${encodeURIComponent(id)}`;
export const replayLink = (id: string) => new URL(replayPath(id), location.origin).href;
