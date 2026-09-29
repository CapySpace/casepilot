import type { ProjectPerson } from "./dal";

/**
 * A Member's current display name, or `fallback` if they've since left the Project.
 *
 * Pure — the caller already holds `listProjectPeople`'s result (the only door onto a Member's name
 * from another Member's page, see that function's own comment), so this is just the lookup, not
 * another fetch. Takes its own fallback message rather than assuming one, since the wording belongs
 * to whichever feature is asking (`testCaseMessages.personNoLongerInProject`,
 * `testResultMessages.personNoLongerInProject` — the same fact, said the same way, from two modules
 * that shouldn't import each other's copy).
 */
export function nameForPerson(people: ProjectPerson[], userId: string, fallback: string): string {
  return people.find((person) => person.userId === userId)?.fullName ?? fallback;
}
