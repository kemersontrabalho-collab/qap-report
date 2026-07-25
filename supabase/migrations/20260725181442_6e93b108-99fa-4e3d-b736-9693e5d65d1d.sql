-- Tabela de configurações do app (preços, chave PIX, termo de aceite)
CREATE TABLE public.app_settings (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT ON public.app_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_settings TO service_role;
GRANT ALL ON public.app_settings TO authenticated;

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read public app settings"
  ON public.app_settings FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Only founders can manage app settings"
  ON public.app_settings FOR ALL
  TO authenticated USING (public.has_role(auth.uid(), 'fundador'))
  WITH CHECK (public.has_role(auth.uid(), 'fundador'));

-- Valores padrão
INSERT INTO public.app_settings (key, value) VALUES
  ('monthly_price', '10.00'),
  ('yearly_price', '90.00'),
  ('pix_key', 'dc748121-4fd1-4277-b987-7b4b5aa2de0f'),
  ('pix_holder_name', 'Kemerson'),
  ('pix_holder_cpf', '053.279.850-32'),
  ('pix_bank_name', 'Mercado Pago'),
  ('terms_of_use', 'Ao assinar o QAP Report, você concorda em pagar o valor do plano escolhido. O primeiro acesso inclui 7 dias gratuitos. Após o trial, a assinatura deve ser renovada mensal ou anualmente. Não há reembolso após a confirmação do pagamento. O preço pode ser alterado apenas na renovação, nunca no meio do ciclo ativo. O cancelamento impede novas cobranças, mas o acesso permanece até o fim do período pago.')
ON CONFLICT (key) DO NOTHING;

-- Tabela de assinaturas
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'trial' CHECK (status IN ('trial', 'active', 'canceled', 'expired', 'past_due')),
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'monthly', 'yearly')),
  trial_ends_at TIMESTAMP WITH TIME ZONE,
  current_period_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  current_period_end TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  canceled_at TIMESTAMP WITH TIME ZONE,
  external_id TEXT,
  payment_method TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_subscriptions_user_id ON public.subscriptions(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own subscription"
  ON public.subscriptions FOR ALL
  TO authenticated USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Founders can read all subscriptions"
  ON public.subscriptions FOR SELECT
  TO authenticated USING (public.has_role(auth.uid(), 'fundador'));

-- Tabela de cupons
CREATE TABLE public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  duration_months INTEGER NOT NULL CHECK (duration_months > 0),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  max_uses INTEGER NOT NULL DEFAULT 1 CHECK (max_uses > 0),
  used_count INTEGER NOT NULL DEFAULT 0 CHECK (used_count >= 0),
  expires_at TIMESTAMP WITH TIME ZONE,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT ON public.coupons TO authenticated;
GRANT ALL ON public.coupons TO service_role;

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founders can manage coupons"
  ON public.coupons FOR ALL
  TO authenticated USING (public.has_role(auth.uid(), 'fundador'))
  WITH CHECK (public.has_role(auth.uid(), 'fundador'));

CREATE POLICY "Users can read coupons they know the code"
  ON public.coupons FOR SELECT
  TO authenticated USING (true);

-- Tabela de resgate de cupons
CREATE TABLE public.coupon_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  redeemed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (coupon_id, user_id)
);

GRANT SELECT, INSERT ON public.coupon_redemptions TO authenticated;
GRANT ALL ON public.coupon_redemptions TO service_role;

ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see their own redemptions"
  ON public.coupon_redemptions FOR SELECT
  TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Founders see all redemptions"
  ON public.coupon_redemptions FOR SELECT
  TO authenticated USING (public.has_role(auth.uid(), 'fundador'));

CREATE POLICY "Users can redeem coupons"
  ON public.coupon_redemptions FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());

-- Tabela de pagamentos
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  external_id TEXT,
  external_payment_method_id TEXT,
  amount NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
  currency TEXT NOT NULL DEFAULT 'BRL',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled', 'refunded', 'in_process')),
  payment_method TEXT CHECK (payment_method IN ('pix', 'credit_card', 'debit_card', 'unknown')),
  plan TEXT NOT NULL CHECK (plan IN ('monthly', 'yearly')),
  pix_qr_code TEXT,
  pix_copy_paste TEXT,
  pix_expiration TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see their own payments"
  ON public.payments FOR SELECT
  TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Founders see all payments"
  ON public.payments FOR SELECT
  TO authenticated USING (public.has_role(auth.uid(), 'fundador'));

CREATE POLICY "Users can create payments"
  ON public.payments FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Service can update payments"
  ON public.payments FOR UPDATE
  TO authenticated USING (public.has_role(auth.uid(), 'fundador') OR user_id = auth.uid())
  WITH CHECK (public.has_role(auth.uid(), 'fundador') OR user_id = auth.uid());

-- Função de atualização automática de updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$function$;

-- Triggers de updated_at
CREATE TRIGGER set_app_settings_updated_at BEFORE UPDATE ON public.app_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_coupons_updated_at BEFORE UPDATE ON public.coupons
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_payments_updated_at BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Função: criar trial de 7 dias na criação do perfil
CREATE OR REPLACE FUNCTION public.create_trial_subscription()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.subscriptions (
    user_id, status, plan, trial_ends_at, current_period_start, current_period_end
  ) VALUES (
    NEW.id, 'trial', 'free',
    now() + interval '7 days',
    now(),
    now() + interval '7 days'
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER create_trial_subscription_on_profile
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.create_trial_subscription();

-- Função: verificar se usuário tem acesso premium
CREATE OR REPLACE FUNCTION public.is_premium_user(_user_id UUID)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions s
    WHERE s.user_id = _user_id
      AND s.status IN ('trial', 'active')
      AND s.current_period_end > now()
  )
  OR EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = _user_id AND ur.role = 'fundador'
  );
$function$;

-- Função: resgatar cupom (usada no backend, mas definida aqui para referência)
CREATE OR REPLACE FUNCTION public.is_coupon_valid(_code TEXT)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.coupons c
    WHERE lower(c.code) = lower(_code)
      AND c.active = true
      AND (c.expires_at IS NULL OR c.expires_at > now())
      AND c.used_count < c.max_uses
  );
$function$;

-- Garantir que fundadores existentes também tenham trial premium (permanente via has_role)
UPDATE public.subscriptions
SET status = 'active', plan = 'yearly', current_period_end = (now() + interval '100 years')
WHERE user_id IN (
  SELECT ur.user_id FROM public.user_roles ur WHERE ur.role = 'fundador'
);
