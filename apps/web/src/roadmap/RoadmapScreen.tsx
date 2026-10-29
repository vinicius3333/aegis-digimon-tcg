import { RoadmapBoard } from "@/roadmap/RoadmapBoard";
import { RoadmapItemPage } from "@/roadmap/RoadmapItemPage";

type RoadmapScreenParams = {
  itemId?: number;
  signedIn: boolean;
  isAdmin: boolean;
  onSignIn: () => void;
  onOpen: (id?: number) => void;
  onDecks: () => void;
  onTournaments: () => void;
  onSuggest: () => void;
};

export function RoadmapScreen({
  itemId,
  signedIn,
  isAdmin,
  onSignIn,
  onOpen,
  onDecks,
  onTournaments,
  onSuggest,
}: RoadmapScreenParams) {
  if (itemId !== undefined)
    return (
      <RoadmapItemPage
        key={itemId}
        id={itemId}
        signedIn={signedIn}
        isAdmin={isAdmin}
        onSignIn={onSignIn}
        onBack={() => onOpen()}
      />
    );
  return (
    <RoadmapBoard
      signedIn={signedIn}
      onSignIn={onSignIn}
      onOpen={onOpen}
      onDecks={onDecks}
      onTournaments={onTournaments}
      onSuggest={onSuggest}
    />
  );
}
