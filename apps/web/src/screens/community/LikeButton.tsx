import { useState } from "react";
import type { CommunityDeckSummary } from "@aegis/shared";
import { communityApi } from "../../community/client";
import { Icons } from "../../design/icons";
import { useTranslation } from "../../i18n";

/**
 * The heart and its count. It flips at once and rolls back if the api refuses. Guests and the
 * author see the count without the toggle, since only another account's like is counted.
 */
export function LikeButton({
  deck,
  signedIn,
  ownDeck,
  size = "sm",
  onChange,
}: {
  deck: Pick<CommunityDeckSummary, "id" | "name" | "likeCount" | "likedByMe">;
  signedIn: boolean;
  ownDeck: boolean;
  size?: "sm" | "lg";
  onChange?: (liked: boolean, likeCount: number) => void;
}) {
  const { t } = useTranslation();
  const [state, setState] = useState({ liked: deck.likedByMe, likeCount: deck.likeCount });
  const [pending, setPending] = useState(false);
  const canLike = signedIn && !ownDeck;
  const label = !signedIn
    ? t("community.signInToLike")
    : ownDeck
      ? t("community.ownDeck")
      : t(state.liked ? "community.unlike" : "community.like", { name: deck.name });

  const toggle = async () => {
    if (!canLike || pending) return;
    const previous = state;
    const liked = !state.liked;
    setState({ liked, likeCount: state.likeCount + (liked ? 1 : -1) });
    setPending(true);
    try {
      const result = await communityApi.setLike(deck.id, liked);
      setState(result);
      onChange?.(result.liked, result.likeCount);
    } catch {
      setState(previous);
    } finally {
      setPending(false);
    }
  };

  return (
    <button
      type="button"
      className={`community-like community-like--${size}${state.liked ? " is-liked" : ""}`}
      aria-pressed={canLike ? state.liked : undefined}
      aria-label={`${label} · ${t("community.likes", { count: state.likeCount })}`}
      // Only a blocked heart needs a tooltip; an active one already says what it does.
      title={canLike ? undefined : label}
      disabled={!canLike}
      onClick={toggle}
    >
      <Icons.Heart size={size === "lg" ? 18 : 16} />
      {size === "lg" ? (
        <span className="community-like__label">
          {t(state.liked ? "community.likedAction" : "community.likeAction")}
        </span>
      ) : null}
      <span className="community-like__count">{state.likeCount}</span>
    </button>
  );
}
