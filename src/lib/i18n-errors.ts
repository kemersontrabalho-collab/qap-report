// Traduz mensagens comuns do Supabase Auth (em inglês) para português.
export function translateAuthError(input: unknown): string {
  const msg = input instanceof Error ? input.message : String(input ?? "");
  const lower = msg.toLowerCase();

  const map: Array<[RegExp, string]> = [
    [/invalid login credentials/i, "Email ou senha inválidos."],
    [/invalid email or password/i, "Email ou senha inválidos."],
    [/invalid_credentials/i, "Email ou senha inválidos."],
    [/email not confirmed/i, "Email ainda não confirmado. Verifique sua caixa de entrada."],
    [/email link is invalid or has expired/i, "O link do email é inválido ou expirou."],
    [/token has expired or is invalid/i, "O link expirou ou é inválido. Solicite um novo."],
    [/user already registered/i, "Este email já está cadastrado."],
    [/user not found/i, "Usuário não encontrado."],
    [/password should be at least (\d+) characters/i, "A senha deve ter no mínimo $1 caracteres."],
    [/password is too short/i, "A senha é muito curta."],
    [/weak password/i, "Senha muito fraca. Escolha uma senha mais forte."],
    [/unable to validate email address/i, "Não foi possível validar o endereço de email."],
    [/invalid email/i, "Email inválido."],
    [/signup requires a valid password/i, "Cadastro requer uma senha válida."],
    [/signups not allowed/i, "Cadastros não estão habilitados no momento."],
    [/rate limit|too many requests/i, "Muitas tentativas. Aguarde alguns instantes e tente novamente."],
    [/email rate limit exceeded/i, "Limite de envios de email atingido. Tente novamente mais tarde."],
    [/network|failed to fetch|networkerror/i, "Falha de conexão. Verifique sua internet."],
    [/new password should be different/i, "A nova senha deve ser diferente da atual."],
    [/same as the old password/i, "A nova senha deve ser diferente da atual."],
    [/user is banned/i, "Sua conta está bloqueada. Contate o administrador."],
    [/anonymous sign-ins are disabled/i, "Login anônimo desabilitado."],
    [/otp expired/i, "O código expirou. Solicite um novo."],
    [/password recovery requires an email/i, "Recuperação de senha requer um email."],
    [/auth session missing/i, "Sessão expirada. Faça login novamente."],
  ];

  // Suporta também `error.code` (Supabase v2 novo formato)
  const code = (input as any)?.code ? String((input as any).code).toLowerCase() : "";
  if (code === "invalid_credentials") return "Email ou senha inválidos.";
  if (code === "email_not_confirmed") return "Email ainda não confirmado. Verifique sua caixa de entrada.";
  if (code === "user_banned") return "Sua conta está bloqueada. Contate o administrador.";
  if (code === "weak_password") return "Senha muito fraca. Escolha uma senha mais forte.";
  if (code === "over_email_send_rate_limit") return "Limite de envios de email atingido. Tente novamente mais tarde.";

  for (const [re, pt] of map) {
    if (re.test(lower)) return msg.replace(re, pt);
  }
  return msg || "Ocorreu um erro. Tente novamente.";
}

// Traduz erros vindos do Postgrest / cliente Supabase (Data API) para PT-BR.
export function translateDbError(input: unknown): string {
  const err = input as { message?: string; code?: string; details?: string } | undefined;
  const msg = err?.message ?? (input instanceof Error ? input.message : String(input ?? ""));
  const code = err?.code ?? "";

  // Códigos PostgREST/Postgres
  const codeMap: Record<string, string> = {
    "23505": "Registro duplicado. Este valor já está em uso.",
    "23503": "Referência inválida. O registro relacionado não existe.",
    "23502": "Campo obrigatório em falta.",
    "23514": "Valor não permitido para este campo.",
    "42501": "Sem permissão para esta operação.",
    "PGRST116": "Registro não encontrado.",
    "PGRST301": "Sessão expirada. Faça login novamente.",
    "PGRST204": "Operação inválida.",
  };
  if (code && codeMap[code]) return codeMap[code];

  const lower = msg.toLowerCase();
  if (/jwt|not authenticated|unauthorized/i.test(lower)) return "Sessão expirada. Faça login novamente.";
  if (/network|failed to fetch|networkerror/i.test(lower)) return "Falha de conexão. Verifique sua internet.";
  if (/violates row-level security|permission denied/i.test(lower)) return "Sem permissão para esta operação.";
  if (/duplicate key/i.test(lower)) return "Registro duplicado. Este valor já está em uso.";
  if (/timeout|timed out/i.test(lower)) return "Tempo esgotado. Tente novamente.";

  return msg || "Não foi possível concluir a operação.";
}

// Traduz erros do GeolocationPositionError do navegador.
export function translateGeolocationError(err: GeolocationPositionError): string {
  switch (err.code) {
    case 1:
      return "Permissão de localização negada. Ative nas configurações do navegador.";
    case 2:
      return "Não foi possível determinar sua localização no momento.";
    case 3:
      return "Tempo esgotado ao obter sua localização. Tente novamente.";
    default:
      return "Falha ao obter localização.";
  }
}
