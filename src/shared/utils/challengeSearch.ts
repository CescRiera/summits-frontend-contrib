type ChallengeSearchable = {
  name?: string | null | undefined;
  list_name?: string | null | undefined;
  creator_name?: string | null | undefined;
};

type ChallengeKeyable = ChallengeSearchable & {
  list_id?: number | null | undefined;
};

const normalizeSearchValue = (value?: string | null) =>
  (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

export const getChallengeDisplayName = (
  challenge: Pick<ChallengeSearchable, "name" | "list_name">
) => challenge.name?.trim() || challenge.list_name?.trim() || "";

export const matchesChallengeSearch = (
  challenge: ChallengeSearchable,
  query: string
) => {
  const normalizedQuery = normalizeSearchValue(query);

  if (!normalizedQuery) {
    return true;
  }

  const title = normalizeSearchValue(getChallengeDisplayName(challenge));
  const creator = normalizeSearchValue(challenge.creator_name);

  return title.includes(normalizedQuery) || creator.includes(normalizedQuery);
};

export const getChallengeItemKey = (
  challenge: ChallengeKeyable,
  index: number,
  prefix = "challenge"
) => {
  if (typeof challenge.list_id === "number" && Number.isFinite(challenge.list_id)) {
    return `${prefix}-${challenge.list_id}`;
  }

  const title = getChallengeDisplayName(challenge) || "untitled";
  const creator = challenge.creator_name?.trim() || "unknown";

  return `${prefix}-${title}-${creator}-${index}`;
};
