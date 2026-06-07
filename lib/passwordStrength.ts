export type PasswordRule = {
  key: string;
  label: string;
  test: (pwd: string) => boolean;
};

export const PASSWORD_RULES: PasswordRule[] = [
  { key: "length",  label: "8 caractères minimum",         test: (p) => p.length >= 8 },
  { key: "upper",   label: "1 majuscule",                  test: (p) => /[A-Z]/.test(p) },
  { key: "lower",   label: "1 minuscule",                  test: (p) => /[a-z]/.test(p) },
  { key: "digit",   label: "1 chiffre",                    test: (p) => /\d/.test(p) },
  { key: "special", label: "1 caractère spécial (!@#…)",   test: (p) => /[^A-Za-z0-9]/.test(p) },
];

export type PasswordStrength = "weak" | "medium" | "strong";

export function getPasswordStrength(pwd: string): { passed: number; total: number; strength: PasswordStrength } {
  const passed = PASSWORD_RULES.filter((r) => r.test(pwd)).length;
  const total = PASSWORD_RULES.length;
  const strength: PasswordStrength =
    passed <= 2 ? "weak" : passed <= 3 ? "medium" : "strong";
  return { passed, total, strength };
}

export function isPasswordValid(pwd: string): boolean {
  return PASSWORD_RULES.every((r) => r.test(pwd));
}

export function getPasswordError(pwd: string, confirm?: string): string | null {
  if (!isPasswordValid(pwd)) return "Le mot de passe ne remplit pas tous les critères.";
  if (confirm !== undefined && pwd !== confirm) return "Les mots de passe ne correspondent pas.";
  return null;
}
