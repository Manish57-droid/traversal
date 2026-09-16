// Shared minimum-strength rule for every "set a new password" flow
// (profile change, OTP reset) — kept in one place so the rule can't
// drift between the two forms.
export function passwordStrengthError(password: string): string | null {
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (!/\d/.test(password)) return "Password must include at least one number.";
  return null;
}
