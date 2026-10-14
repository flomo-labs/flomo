import "server-only";
import { withUser } from "@/infra/db/client";
import { findOwnProfile } from "@/infra/db/profile-repository";
import type { CurrentUser } from "../_auth/session";

export function getOwnProfile(user: CurrentUser) {
  return withUser(user.claims, (tx) => findOwnProfile(tx, user.id));
}
