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
  termo_aceito BOOLEAN NOT NULL DEFAULT false, -- NOVO: Aceitou o termo de imagem e voz
  selfie TEXT, -- NOVO: Foto (selfie) da criança em Base64
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

-- 7. HABILITAR REPLICAÇÃO EM TEMPO REAL (REALTIME)
ALTER PUBLICATION supabase_realtime ADD TABLE public.usuarios;
ALTER PUBLICATION supabase_realtime ADD TABLE public.filhos;
ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.comentarios;
ALTER PUBLICATION supabase_realtime ADD TABLE public.autorizados_retirada;
ALTER PUBLICATION supabase_realtime ADD TABLE public.registro_presencas;

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
    nome_igreja
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
    NEW.raw_user_meta_data->>'nome_igreja'
  )
  ON CONFLICT (uid) DO UPDATE SET
    nome = EXCLUDED.nome,
    telefone = EXCLUDED.telefone,
    endereco = EXCLUDED.endereco,
    membro_igreja = EXCLUDED.membro_igreja,
    selfie = EXCLUDED.selfie,
    ministerio = EXCLUDED.ministerio,
    nome_igreja = EXCLUDED.nome_igreja;

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
