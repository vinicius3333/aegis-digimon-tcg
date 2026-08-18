import { useMemo, useState } from "react";
import { useTranslation } from "../i18n";
import { DIGIMON_WORLD_AVATARS, digimonAvatarUrl, type DigimonWorldAvatarId } from "./avatars";

export function DigimonAvatarPicker({
  selectedAvatarId,
  onSelect,
}: {
  selectedAvatarId: DigimonWorldAvatarId | null;
  onSelect: (avatarId: DigimonWorldAvatarId) => Promise<void>;
}) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [pendingAvatarId, setPendingAvatarId] = useState<DigimonWorldAvatarId>();
  const [status, setStatus] = useState<{ tone: "success" | "error"; name?: string }>();
  const visibleAvatars = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    if (!normalizedQuery) return DIGIMON_WORLD_AVATARS;
    return DIGIMON_WORLD_AVATARS.filter(({ name }) => name.toLocaleLowerCase().includes(normalizedQuery));
  }, [query]);

  async function selectAvatar(avatarId: DigimonWorldAvatarId) {
    if (avatarId === selectedAvatarId || pendingAvatarId) return;
    setPendingAvatarId(avatarId);
    setStatus(undefined);
    try {
      await onSelect(avatarId);
      const selected = DIGIMON_WORLD_AVATARS.find(({ id }) => id === avatarId);
      setStatus({ tone: "success", name: selected?.name ?? "Digimon" });
    } catch {
      setStatus({ tone: "error" });
    } finally {
      setPendingAvatarId(undefined);
    }
  }

  return (
    <section className="account-avatar-picker" aria-labelledby="account-avatar-picker-title">
      <div className="account-avatar-picker__heading">
        <div>
          <h3 id="account-avatar-picker-title">{t("account.avatar.title")}</h3>
          <p>{t("account.avatar.copy")}</p>
        </div>
        <label className="account-avatar-picker__search">
          <span>{t("account.avatar.search")}</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("account.avatar.searchPlaceholder")}
          />
        </label>
      </div>

      {visibleAvatars.length ? (
        <div className="account-avatar-picker__grid" role="group" aria-label={t("account.avatar.gridAria")}>
          {visibleAvatars.map((avatar) => {
            const selected = avatar.id === selectedAvatarId;
            const pending = avatar.id === pendingAvatarId;
            return (
              <button
                key={avatar.id}
                type="button"
                className="account-avatar-option"
                aria-label={t("account.avatar.use", { name: avatar.name })}
                aria-pressed={selected}
                disabled={pendingAvatarId !== undefined}
                onClick={() => void selectAvatar(avatar.id)}
              >
                <span className="account-avatar-option__image">
                  <img
                    src={digimonAvatarUrl(avatar.id)}
                    alt=""
                    width={150}
                    height={150}
                    loading="lazy"
                    decoding="async"
                  />
                  {selected ? (
                    <span className="account-avatar-option__selected" aria-hidden="true">
                      ✓
                    </span>
                  ) : null}
                </span>
                <span>{pending ? t("account.avatar.saving") : avatar.name}</span>
              </button>
            );
          })}
        </div>
      ) : (
        <p className="account-avatar-picker__empty" role="status">
          {t("account.avatar.empty")}
        </p>
      )}

      {status ? (
        <p className="account-avatar-picker__status" data-tone={status.tone} role="status" aria-live="polite">
          {status.tone === "success" ? t("account.avatar.saved", { name: status.name ?? "" }) : t("account.avatar.error")}
        </p>
      ) : null}
    </section>
  );
}
