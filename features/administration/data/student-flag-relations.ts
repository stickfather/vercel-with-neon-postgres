import { isMissingRelationError } from "@/lib/db/client";

export const STUDENT_FLAG_RELATION_CANDIDATES = [
  "public.student_flags_v",
] as const;

export function isMissingStudentFlagRelation(
  error: unknown,
  relation: string,
): boolean {
  if (isMissingRelationError(error, relation)) {
    return true;
  }

  const relationName = relation.includes(".")
    ? relation.slice(relation.indexOf(".") + 1)
    : relation;

  return isMissingRelationError(error, relationName);
}
