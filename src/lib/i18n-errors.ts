// Traduz mensagens comuns do Supabase Auth (em inglês) para português.
export function translateAuthError(input: unknown): string {
  const msg = input instanceof Error ? input.message : String(input ?? "");
  const lower = msg.toLowerCase();

  const map: Array<[RegExp, string]> = [
    [/invalid login credentials/i, "Email ou senha inválidos."],
    [/invalid email or password/i, "Email ou senha inválidos."],
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
    [/network|failed to fetch/i, "Falha de conexão. Verifique sua internet."],
    [/new password should be different/i, "A nova senha deve ser diferente da atual."],
    [/same as the old password/i, "A nova senha deve ser diferente da atual."],
    [/user is banned/i, "Sua conta está bloqueada. Contate o administrador."],
    [/anonymous sign-ins are disabled/i, "Login anônimo desabilitado."],
    [/otp expired/i, "O código expirou. Solicite um novo."],
  ];

  for (const [re, pt] of map) {
    if (re.test(lower)) return msg.replace(re, pt);
  }
  return msg || "Ocorreu um erro. Tente novamente.";
}
