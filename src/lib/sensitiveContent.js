const SENSITIVE_NAME = /(?:firebase-adminsdk|google-services\.json|service[-_ ]?account|recovery[-_ ]?codes?|private[-_ ]?key|credentials?|^\.env(?:\.|$)|id_rsa|\.pem$)/i;

const SENSITIVE_VALUE = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/i,
  /"(?:private_key|client_secret|refresh_token)"\s*:/i,
  /"type"\s*:\s*"service_account"/i,
  /\b(?:sk-(?:proj-|or-v1-)?[A-Za-z0-9_-]{16,}|AIza[0-9A-Za-z_-]{30,}|AKIA[0-9A-Z]{16}|gh[pousr]_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,}|xox[baprs]-[A-Za-z0-9-]{10,})\b/i,
  /(?:api[_ -]?key|client[_ -]?secret|password|recovery[_ -]?code)\s*[:=]\s*["']?[A-Za-z0-9+/=_-]{12,}/i,
];

export function isSensitiveSource(title = "", content = "") {
  if (SENSITIVE_NAME.test(String(title))) return true;
  const text = String(content);
  return SENSITIVE_VALUE.some((pattern) => pattern.test(text));
}
