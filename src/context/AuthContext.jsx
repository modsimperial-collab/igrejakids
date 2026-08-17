import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabase';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const activeChannelRef = useRef(null);
  const isFetchingRef = useRef(false);

  useEffect(() => {
    const fetchAndSubscribeProfile = async (uid, email, currentSession) => {
      // Se já está buscando o perfil deste usuário, evita requisições simultâneas em paralelo
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;
      setLoading(true);

      // Limpar canal de realtime anterior se houver
      if (activeChannelRef.current) {
        supabase.removeChannel(activeChannelRef.current);
        activeChannelRef.current = null;
      }

      let profileData = null;
      let errorMessage = '';

      // Tentar buscar perfil na tabela pública (com até 3 retentativas para dar tempo da trigger do banco rodar)
      for (let attempt = 0; attempt < 3; attempt++) {
        const { data, error } = await supabase
          .from('usuarios')
          .select('uid, nome, email, tipo_usuario, aprovado, telefone, endereco, membro_igreja, ministerio, nome_igreja, selfie, data_cadastro')
          .eq('uid', uid)
          .maybeSingle();

        if (error) {
          console.error(`Erro ao buscar perfil (tentativa ${attempt + 1}):`, error);
          errorMessage = error.message;
          break;
        }

        if (data) {
          profileData = data;
          break;
        }

        // Aguarda 500ms antes da próxima tentativa
        if (attempt < 2) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      // Se após as retentativas o perfil não existir e não houver erro de rede, executa o fallback com UPSERT
      if (!profileData && !errorMessage && currentSession?.user) {
        const metadata = currentSession.user.user_metadata || {};
        const nome = metadata.nome || 'Usuário';
        const tipoUsuario = metadata.tipo_usuario || 'voluntario';

        const newProfileObj = {
          uid: uid,
          nome: nome,
          email: email,
          tipo_usuario: tipoUsuario,
          aprovado: tipoUsuario === 'admin' ? true : false,
          data_cadastro: new Date().toISOString()
        };

        if (tipoUsuario === 'responsavel') {
          newProfileObj.telefone = metadata.telefone || '';
          newProfileObj.endereco = metadata.endereco || '';
          newProfileObj.membro_igreja = !!metadata.membro_igreja;
          newProfileObj.nome_igreja = metadata.nome_igreja || '';
        } else if (tipoUsuario === 'voluntario') {
          newProfileObj.ministerio = metadata.ministerio || '';
        }

        // Usa upsert em vez de insert para evitar conflitos de chave primária
        const { data: newProfile, error: upsertError } = await supabase
          .from('usuarios')
          .upsert([newProfileObj])
          .select()
          .maybeSingle();

        if (upsertError) {
          console.error("Erro ao auto-criar perfil público de usuário via fallback:", upsertError);
          errorMessage = `Falha ao carregar perfil: ${upsertError.message}`;
        } else {
          profileData = newProfile;
        }
      }

      setUser(profileData || null);
      if (errorMessage) {
        setUser({ _error: errorMessage });
      }
      setLoading(false);
      isFetchingRef.current = false;

      // Escutar atualizações do perfil em tempo real
      if (uid) {
        activeChannelRef.current = supabase
          .channel(`user-profile-channel-${uid}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'usuarios',
              filter: `uid=eq.${uid}`
            },
            (payload) => {
              if (payload.eventType === 'DELETE') {
                setUser(null);
              } else {
                setUser(payload.new);
              }
            }
          )
          .subscribe();
      }
    };

    // Escutar mudanças no estado de autenticação (única fonte de verdade para mudanças de sessão)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      if (newSession?.user) {
        fetchAndSubscribeProfile(newSession.user.id, newSession.user.email, newSession);
      } else {
        setUser(null);
        setLoading(false);
        isFetchingRef.current = false;
        if (activeChannelRef.current) {
          supabase.removeChannel(activeChannelRef.current);
          activeChannelRef.current = null;
        }
      }
    });

    return () => {
      subscription.unsubscribe();
      if (activeChannelRef.current) {
        supabase.removeChannel(activeChannelRef.current);
      }
    };
  }, []);

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw translateSupabaseError(error);
    return data;
  };

  const signUp = async (email, password, nome, tipoUsuario, extraData = {}) => {
    // 1. Criar usuário na Auth do Supabase enviando APENAS metadados leves de texto.
    // Evitamos enviar arquivos/Base64 grandes dentro do user_metadata do Auth para não estourar o limite de payload (400 Bad Request / 520).
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          nome,
          tipo_usuario: tipoUsuario,
          telefone: extraData.telefone || '',
          endereco: extraData.endereco || '',
          membro_igreja: !!extraData.membroIgreja,
          nome_igreja: extraData.membroIgreja ? (extraData.nomeIgreja || '') : '',
          ministerio: extraData.ministerio || '',
          voluntario_termo_aceito: !!extraData.voluntarioTermoAceito,
          
          // Dados leves do Filho
          child_name: extraData.childName || '',
          child_birthdate: extraData.childBirthdate || '',
          child_nickname: extraData.childNickname || '',
          child_neurodivergente: !!extraData.neurodivergente,
          child_neurodivergencia_detalhe: extraData.neurodivergente ? (extraData.neurodivergenciaDetalhe || '') : '',
          child_como_acalmar: extraData.comoAcalmar || '',
          child_alergias: extraData.alergias || '',
          child_termo_aceito: !!extraData.termoAceito
        }
      }
    });

    if (error) throw translateSupabaseError(error);

    // 2. Se o cadastro no Auth tiver sido criado com sucesso, salvamos a Selfie e a Certidão de Antecedentes Criminais
    // diretamente na tabela pública `public.usuarios` e `public.filhos` (que suportam colunas de texto grandes sem limite).
    if (data?.user) {
      const uid = data.user.id;

      try {
        // Aguarda um pequeno instante para a trigger do banco criar a linha base
        await new Promise(resolve => setTimeout(resolve, 300));

        // Atualizar foto de selfie e antecedentes criminais do usuário na tabela usuarios
        const userUpdates = {};
        if (extraData.selfie) userUpdates.selfie = extraData.selfie;
        if (extraData.antecedentesCriminais) userUpdates.antecedentes_criminais = extraData.antecedentesCriminais;

        if (Object.keys(userUpdates).length > 0) {
          const { error: updateError } = await supabase
            .from('usuarios')
            .update(userUpdates)
            .eq('uid', uid);

          if (updateError) {
            console.error("Erro ao salvar arquivos do perfil em usuarios:", updateError.message);
          }
        }

        // Se for responsável e tiver selfie da criança, atualiza na tabela de filhos
        if (tipoUsuario === 'responsavel' && extraData.childSelfie) {
          const { error: childSelfieErr } = await supabase
            .from('filhos')
            .update({ selfie: extraData.childSelfie })
            .eq('responsavel_id', uid);

          if (childSelfieErr) {
            console.error("Erro ao salvar selfie da criança em filhos:", childSelfieErr.message);
          }
        }
      } catch (err) {
        console.warn("Aviso ao salvar anexos adicionais:", err);
      }
    }

    return data.user;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw translateSupabaseError(error);
  };

  const translateSupabaseError = (error) => {
    const message = error.message;
    if (message.includes('Invalid login credentials')) {
      return 'E-mail ou senha incorretos.';
    }
    if (message.includes('Email already in use') || message.includes('already registered')) {
      return 'Este endereço de e-mail já está sendo utilizado por outra conta.';
    }
    if (message.includes('Password should be')) {
      return 'A senha digitada é muito fraca.';
    }
    if (message.includes('invalid email') || message.includes('Unable to validate email')) {
      return 'O formato do e-mail é inválido.';
    }
    return message || 'Ocorreu um erro ao processar sua solicitação. Tente novamente.';
  };

  return (
    <AuthContext.Provider value={{ session, user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
