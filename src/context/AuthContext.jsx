import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabase';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let activeChannel = null;

    const fetchAndSubscribeProfile = async (uid, email, currentSession) => {
      setLoading(true);

      // Limpar canal anterior se houver
      if (activeChannel) {
        supabase.removeChannel(activeChannel);
        activeChannel = null;
      }

      // Buscar perfil na tabela pública
      let { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('uid', uid)
        .maybeSingle();

      let errorMessage = '';

      if (error) {
        console.error("Erro ao buscar perfil:", error);
        errorMessage = error.message;
      }

      // Se o perfil não existir e não for um erro de rede, pode ser um delay da trigger do banco.
      // Vamos aguardar 1 segundo e tentar novamente antes de tentar o insert manual.
      if (!data && !error && currentSession?.user) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        const { data: retryData, error: retryError } = await supabase
          .from('usuarios')
          .select('*')
          .eq('uid', uid)
          .maybeSingle();
        
        if (retryData) {
          data = retryData;
        } else if (retryError) {
          errorMessage = retryError.message;
        }
      }

      // Se ainda não existir na tabela 'usuarios', tentamos criar automaticamente como fallback
      if (!data && !errorMessage && currentSession?.user) {
        const metadata = currentSession.user.user_metadata || {};
        const nome = metadata.nome || 'Usuário';
        const tipoUsuario = metadata.tipo_usuario || 'voluntario';

        const newProfileObj = {
          uid: uid,
          nome: nome,
          email: email,
          tipo_usuario: tipoUsuario,
          aprovado: tipoUsuario === 'admin' ? true : false,
          selfie: metadata.selfie || null,
          data_cadastro: new Date().toISOString()
        };

        if (tipoUsuario === 'responsavel') {
          newProfileObj.telefone = metadata.telefone || '';
          newProfileObj.endereco = metadata.endereco || '';
          newProfileObj.membro_igreja = !!metadata.membro_igreja;
          newProfileObj.nome_igreja = metadata.nome_igreja || '';
        } else if (tipoUsuario === 'voluntario') {
          newProfileObj.ministerio = metadata.ministerio || '';
          newProfileObj.antecedentes_criminais = metadata.antecedentes_criminais || null;
        }

        const { data: newProfile, error: insertError } = await supabase
          .from('usuarios')
          .insert([newProfileObj])
          .select()
          .maybeSingle();

        if (insertError) {
          console.error("Erro ao auto-criar perfil público de usuário:", insertError);
          // Se falhou o insert (possivelmente por RLS ou unique constraint), vamos tentar buscar mais uma vez
          const { data: finalCheck } = await supabase.from('usuarios').select('*').eq('uid', uid).maybeSingle();
          if (finalCheck) {
            data = finalCheck;
          } else {
            errorMessage = `Falha ao criar perfil: ${insertError.message || insertError.code}. Verifique as permissões do banco.`;
          }
        } else {
          data = newProfile;

          // Se for responsável e tiver dados do filho nos metadados, criar o filho também no fallback
          if (tipoUsuario === 'responsavel' && metadata.child_name) {
            // Verificar se o filho já existe
            const { data: existingKids } = await supabase
              .from('filhos')
              .select('id')
              .eq('responsavel_id', uid)
              .eq('nome', metadata.child_name);

            if (!existingKids || existingKids.length === 0) {
              let calculatedAge = 0;
              if (metadata.child_birthdate) {
                const birth = new Date(metadata.child_birthdate);
                const today = new Date();
                calculatedAge = today.getFullYear() - birth.getFullYear();
                const m = today.getMonth() - birth.getMonth();
                if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
                  calculatedAge--;
                }
              }

              const { error: childError } = await supabase
                .from('filhos')
                .insert([
                  {
                    responsavel_id: uid,
                    nome: metadata.child_name,
                    idade: calculatedAge,
                    data_nascimento: metadata.child_birthdate || null,
                    apelido: metadata.child_nickname || '',
                    neurodivergente: !!metadata.child_neurodivergente,
                    neurodivergencia_detalhe: metadata.child_neurodivergencia_detalhe || '',
                    como_acalmar: metadata.child_como_acalmar || '',
                    termo_aceito: !!metadata.child_termo_aceito,
                    selfie: metadata.child_selfie || null,
                    data_cadastro: new Date().toISOString()
                  }
                ]);

              if (childError) {
                console.error("Erro ao cadastrar filho no fallback de login:", childError.message);
              }
            }
          }
        }
      }

      setUser(data || null);
      if (errorMessage) {
        setUser({ _error: errorMessage }); // Armazenar erro no user temporariamente para UI
      }
      setLoading(false);

      // Escutar atualizações do perfil do usuário em tempo real
      activeChannel = supabase
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
    };

    // 1. Obter sessão atual
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      if (currentSession?.user) {
        fetchAndSubscribeProfile(currentSession.user.id, currentSession.user.email, currentSession);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    // 2. Escutar mudanças no estado de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession?.user) {
        fetchAndSubscribeProfile(newSession.user.id, newSession.user.email, newSession);
      } else {
        setUser(null);
        setLoading(false);
        if (activeChannel) {
          supabase.removeChannel(activeChannel);
          activeChannel = null;
        }
      }
    });

    return () => {
      subscription.unsubscribe();
      if (activeChannel) {
        supabase.removeChannel(activeChannel);
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
    // 1. Criar usuário na Auth do Supabase (passando metadados completos para o trigger seguro do banco)
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
          selfie: extraData.selfie || null,
          ministerio: extraData.ministerio || '',
          antecedentes_criminais: extraData.antecedentesCriminais || null,
          voluntario_termo_aceito: !!extraData.voluntarioTermoAceito,
          
          // Dados do Filho
          child_name: extraData.childName || '',
          child_birthdate: extraData.childBirthdate || '',
          child_nickname: extraData.childNickname || '',
          child_neurodivergente: !!extraData.neurodivergente,
          child_neurodivergencia_detalhe: extraData.neurodivergente ? (extraData.neurodivergenciaDetalhe || '') : '',
          child_como_acalmar: extraData.comoAcalmar || '',
          child_alergias: extraData.alergias || '',
          child_termo_aceito: !!extraData.termoAceito,
          child_selfie: extraData.childSelfie || null
        }
      }
    });

    if (error) throw translateSupabaseError(error);

    // 2. Tentar inserir via API cliente (será redundante se o trigger já rodou, mas serve de fallback imediato)
    if (data?.user) {
      try {
        // Verificar se o usuário já existe na tabela pública (se o trigger já o criou)
        const { data: existingUser } = await supabase
          .from('usuarios')
          .select('uid')
          .eq('uid', data.user.id)
          .maybeSingle();

        if (!existingUser) {
          const userPayload = {
            uid: data.user.id,
            nome,
            email,
            tipo_usuario: tipoUsuario,
            aprovado: false,
            data_cadastro: new Date().toISOString()
          };

          if (tipoUsuario === 'responsavel') {
            userPayload.telefone = extraData.telefone || '';
            userPayload.endereco = extraData.endereco || '';
            userPayload.membro_igreja = !!extraData.membroIgreja;
            userPayload.selfie = extraData.selfie || null;
            userPayload.nome_igreja = extraData.nomeIgreja || '';
          } else if (tipoUsuario === 'voluntario') {
            userPayload.ministerio = extraData.ministerio || '';
            userPayload.selfie = extraData.selfie || null;
            userPayload.antecedentes_criminais = extraData.antecedentesCriminais || null;
          }

          const { error: dbError } = await supabase
            .from('usuarios')
            .insert([userPayload]);
          
          if (dbError) {
            console.error("Erro ao criar perfil público no signup:", dbError.message);
          }
        }

        // 3. Se for responsável e tiver dados do filho, verificar se o filho já existe
        if (tipoUsuario === 'responsavel' && extraData.childName) {
          const { data: existingChildren } = await supabase
            .from('filhos')
            .select('id')
            .eq('responsavel_id', data.user.id)
            .eq('nome', extraData.childName);

          if (!existingChildren || existingChildren.length === 0) {
            let calculatedAge = 0;
            if (extraData.childBirthdate) {
              const birth = new Date(extraData.childBirthdate);
              const today = new Date();
              calculatedAge = today.getFullYear() - birth.getFullYear();
              const m = today.getMonth() - birth.getMonth();
              if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
                calculatedAge--;
              }
            }

            const { error: childError } = await supabase
              .from('filhos')
              .insert([
                {
                  responsavel_id: data.user.id,
                  nome: extraData.childName,
                  idade: calculatedAge,
                  data_nascimento: extraData.childBirthdate || null,
                  apelido: extraData.childNickname || '',
                  neurodivergente: !!extraData.neurodivergente,
                  neurodivergencia_detalhe: extraData.neurodivergenciaDetalhe || '',
                  como_acalmar: extraData.comoAcalmar || '',
                  termo_aceito: !!extraData.termoAceito,
                  selfie: extraData.childSelfie || null,
                  data_cadastro: new Date().toISOString()
                }
              ]);

            if (childError) {
              console.error("Erro ao cadastrar filho no signup:", childError.message);
            }
          }
        }
      } catch (dbErr) {
        console.warn("Erro ao rodar fallback no cadastro:", dbErr);
      }
    }

    return data.user;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw translateSupabaseError(error);
  };

  // Tradutor de erros de autenticação do Supabase
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
