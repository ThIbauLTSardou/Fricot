import * as Crypto from "expo-crypto";

// Identifiant unique, fonctionne sur mobile et web.
export function newId(): string {
  return Crypto.randomUUID();
}
