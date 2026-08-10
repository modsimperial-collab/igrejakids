-- SCRIPT DE CONFIGURAÇÃO DO BANCO DE DADOS NO SUPABASE
-- Execute este script no Painel do Supabase -> SQL Editor -> New Query

-- 1. CRIAR A TABELA DE USUÁRIOS
CREATE TABLE IF NOT EXISTS public.usuarios (
  uid TEXT PRIMARY KEY, -- ID do usuário gerado pelo Supabase Auth (auth.users.id)
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  tipo_usuario TEXT NOT NULL CHECK (tipo_usuario IN ('responsavel', 'voluntario', 'admin')),
  aprovado BOOLEAN NOT NULL DEFAULT false,
  telefone TEXT, -- NOVO: Telefone de contato (WhatsApp)
  endereco TEXT, -- NOVO: Endereço residencial
  membro_igreja BOOLEAN NOT NULL DEFAULT false, -- NOVO: Indica se é membro da AD
  selfie TEXT, -- NOVO: Foto do responsável em formato Base64
  ministerio TEXT, -- NOVO: Ministério do voluntário
  nome_igreja TEXT, -- NOVO: Nome da congregação/igreja do membro
  antecedentes_criminais TEXT, -- NOVO: Certidão de Antecedentes Criminais (PDF ou Foto em Base64)
  data_cadastro TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. CRIAR A TABELA DE FILHOS (MIGRADO DE SUBCOLEÇÃO DO FIRESTORE)
CREATE TABLE IF NOT EXISTS public.filhos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  responsavel_id TEXT REFERENCES public.usuarios(uid) ON DELETE CASCADE NOT NULL,
  nome TEXT NOT NULL,
  idade INTEGER, -- Mantido por retrocompatibilidade
  data_nascimento DATE, -- NOVO: Data de nascimento
  apelido TEXT, -- NOVO: Apelido da criança
  neurodivergente BOOLEAN NOT NULL DEFAULT false, -- NOVO: Possui neurodivergência
  neurodivergencia_detalhe TEXT, -- NOVO: Qual neurodivergência
  como_acalmar TEXT, -- NOVO: Como acalmar em crise
  alergias TEXT, -- NOVO: Alergias e restrições alimentares
  termo_aceito BOOLEAN NOT NULL DEFAULT false, -- NOVO: Aceitou o termo de imagem e voz
  selfie TEXT, -- NOVO: Foto (selfie) da criança em Base64
  visitante BOOLEAN NOT NULL DEFAULT false, -- NOVO: Criança cadastrada via Check-in Express
  data_cadastro TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. HABILITAR ROW LEVEL SECURITY (RLS)
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.filhos ENABLE ROW LEVEL SECURITY;

-- 4. CRIAR POLÍTICAS DE ACESSO PARA USUÁRIOS
CREATE POLICY "Permitir leitura geral de perfis para autenticados" 
  ON public.usuarios FOR SELECT TO authenticated USING (true);

CREATE POLICY "Permitir inserção de perfil pelo próprio usuário" 
  ON public.usuarios FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Permitir atualização pelo próprio usuário ou admin" 
  ON public.usuarios FOR UPDATE TO authenticated USING (true);

-- 5. CRIAR POLÍTICAS DE ACESSO PARA FILHOS
CREATE POLICY "Permitir acesso completo a filhos para autenticados" 
  ON public.filhos FOR ALL TO authenticated USING (true);

-- 6. CRIAR TABELAS DE MURAL (POSTS E COMENTÁRIOS)
CREATE TABLE IF NOT EXISTS public.posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  autor_id TEXT REFERENCES public.usuarios(uid) ON DELETE CASCADE NOT NULL,
  autor_nome TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('foto', 'aviso')),
  conteudo TEXT NOT NULL,
  imagem TEXT, -- Imagem Base64 compactada
  data_criacao TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.comentarios (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  autor_id TEXT REFERENCES public.usuarios(uid) ON DELETE CASCADE NOT NULL,
  autor_nome TEXT NOT NULL,
  conteudo TEXT NOT NULL,
  data_criacao TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comentarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir acesso completo a posts para autenticados" ON public.posts FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Permitir acesso completo a comentarios para autenticados" ON public.comentarios FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 6.5. TABELA DE PESSOAS AUTORIZADAS A RETIRAR A CRIANÇA
CREATE TABLE IF NOT EXISTS public.autorizados_retirada (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  filho_id UUID REFERENCES public.filhos(id) ON DELETE CASCADE NOT NULL,
  nome TEXT NOT NULL,
  parentesco TEXT NOT NULL,
  telefone TEXT,
  documento TEXT,
  selfie TEXT, -- Selfie da pessoa autorizada em Base64 compactado
  data_cadastro TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.autorizados_retirada ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir acesso completo a autorizados para autenticados" 
  ON public.autorizados_retirada FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 6.7. TABELA DE REGISTRO DE PRESENÇAS (CHECK-IN / CHECK-OUT)
CREATE TABLE IF NOT EXISTS public.registro_presencas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  filho_id UUID REFERENCES public.filhos(id) ON DELETE CASCADE NOT NULL,
  responsavel_id TEXT REFERENCES public.usuarios(uid) ON DELETE CASCADE NOT NULL,
  voluntario_id TEXT REFERENCES public.usuarios(uid) ON DELETE CASCADE NOT NULL,
  tipo_transacao TEXT CHECK (tipo_transacao IN ('entrada', 'saida')) NOT NULL,
  data_registro TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.registro_presencas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir acesso completo a presencas para autenticados" 
  ON public.registro_presencas FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 6.8. TABELA DE DIÁRIO DE BORDO (FEEDBACK DO CULTO)
CREATE TABLE IF NOT EXISTS public.diario_bordo (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  filho_id UUID REFERENCES public.filhos(id) ON DELETE CASCADE NOT NULL,
  voluntario_id TEXT REFERENCES public.usuarios(uid) ON DELETE CASCADE NOT NULL,
  tags TEXT[], -- Ex: ['Lanchou bem', 'Participou das brincadeiras']
  observacoes TEXT,
  data_registro TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.diario_bordo ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir acesso completo ao diario de bordo para autenticados" ON public.diario_bordo FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 6.9. TABELA DE ESCALA DE VOLUNTÁRIOS
CREATE TABLE IF NOT EXISTS public.escala_voluntarios (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  voluntario_id TEXT REFERENCES public.usuarios(uid) ON DELETE CASCADE NOT NULL,
  data_culto DATE NOT NULL,
  turno TEXT NOT NULL DEFAULT 'Manhã',
  funcao TEXT DEFAULT 'Recepção / Cuidado',
  solicitou_troca BOOLEAN DEFAULT false,
  observacao_troca TEXT,
  data_cadastro TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.escala_voluntarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir acesso completo a escalas para autenticados" ON public.escala_voluntarios FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 6.10. TABELA DE CHAMADAS DE EMERGÊNCIA (PAIS NO CULTO)
CREATE TABLE IF NOT EXISTS public.chamadas_emergencia (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  filho_id UUID REFERENCES public.filhos(id) ON DELETE CASCADE NOT NULL,
  responsavel_id TEXT REFERENCES public.usuarios(uid) ON DELETE CASCADE NOT NULL,
  voluntario_id TEXT REFERENCES public.usuarios(uid) ON DELETE CASCADE NOT NULL,
  motivo TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ativa' CHECK (status IN ('ativa', 'atendida', 'cancelada')),
  data_chamada TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.chamadas_emergencia ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir acesso completo a chamadas para autenticados" ON public.chamadas_emergencia FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 6.11. TABELA DE PROGRAMAÇÃO DE CULTOS E PREGADORES (SEM NECESSIDADE DE CADASTRO)
CREATE TABLE IF NOT EXISTS public.programacao_cultos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  data_culto DATE NOT NULL,
  turno TEXT NOT NULL DEFAULT 'Manhã',
  pregador_nome TEXT NOT NULL,
  tema_culto TEXT,
  observacoes TEXT,
  foto_pregador TEXT,
  data_cadastro TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.programacao_cultos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir leitura da programacao para autenticados" ON public.programacao_cultos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Permitir acesso completo a programacao para autenticados" ON public.programacao_cultos FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 7. HABILITAR REPLICAÇÃO EM TEMPO REAL (REALTIME) SEGURO
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'usuarios') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.usuarios;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'filhos') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.filhos;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'posts') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'comentarios') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.comentarios;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'autorizados_retirada') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.autorizados_retirada;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'registro_presencas') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.registro_presencas;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'diario_bordo') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.diario_bordo;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'escala_voluntarios') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.escala_voluntarios;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'chamadas_emergencia') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chamadas_emergencia;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'programacao_cultos') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.programacao_cultos;
  END IF;
END $$;

-- 8. TRIGGER PARA CRIAÇÃO AUTOMÁTICA DE PERFIL (E FILHOS) COM PRIVILÉGIOS DE SISTEMA
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Inserir ou atualizar na tabela public.usuarios
  INSERT INTO public.usuarios (
    uid, 
    nome, 
    email, 
    tipo_usuario, 
    aprovado,
    telefone,
    endereco,
    membro_igreja,
    selfie,
    ministerio,
    nome_igreja,
    antecedentes_criminais
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', 'Usuário'),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'tipo_usuario', 'voluntario'),
    false, -- Todos os novos usuários começam pendentes de aprovação pelo admin
    NEW.raw_user_meta_data->>'telefone',
    NEW.raw_user_meta_data->>'endereco',
    COALESCE((NEW.raw_user_meta_data->>'membro_igreja')::boolean, false),
    NEW.raw_user_meta_data->>'selfie',
    NEW.raw_user_meta_data->>'ministerio',
    NEW.raw_user_meta_data->>'nome_igreja',
    NEW.raw_user_meta_data->>'antecedentes_criminais'
  )
  ON CONFLICT (uid) DO UPDATE SET
    nome = EXCLUDED.nome,
    telefone = EXCLUDED.telefone,
    endereco = EXCLUDED.endereco,
    membro_igreja = EXCLUDED.membro_igreja,
    selfie = EXCLUDED.selfie,
    ministerio = EXCLUDED.ministerio,
    nome_igreja = EXCLUDED.nome_igreja,
    antecedentes_criminais = EXCLUDED.antecedentes_criminais;

  -- Se for responsável e tiver dados do filho no metadata, insere automaticamente na tabela de filhos
  IF COALESCE(NEW.raw_user_meta_data->>'tipo_usuario', 'voluntario') = 'responsavel' AND NEW.raw_user_meta_data->>'child_name' IS NOT NULL AND NEW.raw_user_meta_data->>'child_name' <> '' THEN
    INSERT INTO public.filhos (
      responsavel_id,
      nome,
      data_nascimento,
      apelido,
      neurodivergente,
      neurodivergencia_detalhe,
      como_acalmar,
      alergias,
      termo_aceito,
      selfie
    ) VALUES (
      NEW.id,
      NEW.raw_user_meta_data->>'child_name',
      NULLIF(NEW.raw_user_meta_data->>'child_birthdate', '')::DATE,
      NEW.raw_user_meta_data->>'child_nickname',
      COALESCE((NEW.raw_user_meta_data->>'child_neurodivergente')::boolean, false),
      NEW.raw_user_meta_data->>'child_neurodivergencia_detalhe',
      NEW.raw_user_meta_data->>'child_como_acalmar',
      NEW.raw_user_meta_data->>'child_alergias',
      COALESCE((NEW.raw_user_meta_data->>'child_termo_aceito')::boolean, false),
      NEW.raw_user_meta_data->>'child_selfie'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- SCRIPT DE ATUALIZAÇÃO PARA BANCOS JÁ EXISTENTES:
-- ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS antecedentes_criminais TEXT;
-- ALTER TABLE public.filhos ADD COLUMN IF NOT EXISTS alergias TEXT;
-- 
-- CREATE TABLE IF NOT EXISTS public.programacao_cultos (
--   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
--   data_culto DATE NOT NULL,
--   turno TEXT NOT NULL DEFAULT 'Manhã',
--   pregador_nome TEXT NOT NULL,
--   tema_culto TEXT,
--   observacoes TEXT,
--   foto_pregador TEXT,
--   data_cadastro TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
-- );
-- ALTER TABLE public.programacao_cultos ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Permitir leitura da programacao para autenticados" ON public.programacao_cultos FOR SELECT TO authenticated USING (true);
-- CREATE POLICY "Permitir acesso completo a programacao para autenticados" ON public.programacao_cultos FOR ALL TO authenticated USING (true) WITH CHECK (true);
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.programacao_cultos;


