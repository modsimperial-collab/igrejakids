import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://placeholder-url.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "placeholder-anon-key";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Escutar alterações em tempo real no perfil do usuário logado.
 * Isso permite redirecionar voluntários imediatamente quando são aprovados/desativados.
 */
export const subscribeToUserDoc = (uid, callback) => {
  // Busca inicial
  supabase
    .from('usuarios')
    .select('*')
    .eq('uid', uid)
    .maybeSingle()
    .then(({ data, error }) => {
      if (error) {
        console.error("Erro ao obter perfil do usuário:", error);
      }
      callback(data || null);
    });

  // Escuta realtime para o perfil do usuário
  const channel = supabase
    .channel(`user-profile-${uid}`)
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
          callback(null);
        } else {
          callback(payload.new);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};

/**
 * Obter fluxo em tempo real (Stream) de voluntários com base no status de aprovação.
 * Utilizado pelo Administrador Mestre.
 */
export const subscribeToVolunteers = (aprovado, callback) => {
  // Busca inicial
  supabase
    .from('usuarios')
    .select('*')
    .neq('tipo_usuario', 'admin')
    .eq('aprovado', aprovado)
    .order('nome', { ascending: true })
    .then(({ data, error }) => {
      if (!error && data) {
        callback(data);
      }
    });

  // Escuta realtime para qualquer alteração na tabela de usuários
  const channel = supabase
    .channel(`volunteers-realtime-${aprovado}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'usuarios'
      },
      async () => {
        const { data, error } = await supabase
          .from('usuarios')
          .select('*')
          .neq('tipo_usuario', 'admin')
          .eq('aprovado', aprovado)
          .order('nome', { ascending: true });
        if (!error && data) {
          callback(data);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};

/**
 * Aprovar voluntário (altera aprovado para true no Supabase)
 */
export const approveVolunteer = async (uid) => {
  const { error } = await supabase
    .from('usuarios')
    .update({ aprovado: true })
    .eq('uid', uid);
  if (error) throw new Error(error.message);
};

/**
 * Recusar/Remover voluntário (exclui o registro dele no banco de dados)
 */
export const rejectVolunteer = async (uid) => {
  const { error } = await supabase
    .from('usuarios')
    .delete()
    .eq('uid', uid);
  if (error) throw new Error(error.message);
};

/**
 * Revogar acesso de voluntário ativo (altera aprovado de volta para false)
 */
export const revokeVolunteer = async (uid) => {
  const { error } = await supabase
    .from('usuarios')
    .update({ aprovado: false })
    .eq('uid', uid);
  if (error) throw new Error(error.message);
};

/**
 * Escutar em tempo real os filhos cadastrados para um responsável específico.
 */
export const subscribeToChildren = (responsavelId, callback) => {
  // Busca inicial
  supabase
    .from('filhos')
    .select('*')
    .eq('responsavel_id', responsavelId)
    .order('nome', { ascending: true })
    .then(({ data, error }) => {
      if (!error && data) {
        callback(data);
      }
    });

  // Escuta realtime para filhos do responsável
  const channel = supabase
    .channel(`filhos-list-${responsavelId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'filhos',
        filter: `responsavel_id=eq.${responsavelId}`
      },
      async () => {
        const { data, error } = await supabase
          .from('filhos')
          .select('*')
          .eq('responsavel_id', responsavelId)
          .order('nome', { ascending: true });
        if (!error && data) {
          callback(data);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};

/**
 * Adicionar uma nova criança na tabela 'filhos' referenciando o responsável
 */
export const addChild = async (responsavelId, { nome, dataNascimento, apelido, neurodivergente, neurodivergenciaDetalhe, comoAcalmar, termoAceito, selfie }) => {
  let calculatedAge = 0;
  if (dataNascimento) {
    const birth = new Date(dataNascimento);
    const today = new Date();
    calculatedAge = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      calculatedAge--;
    }
  }

  const { data, error } = await supabase
    .from('filhos')
    .insert([
      {
        responsavel_id: responsavelId,
        nome,
        idade: calculatedAge,
        data_nascimento: dataNascimento || null,
        apelido: apelido || '',
        neurodivergente: !!neurodivergente,
        neurodivergencia_detalhe: neurodivergente ? neurodivergenciaDetalhe : '',
        como_acalmar: comoAcalmar || '',
        termo_aceito: !!termoAceito,
        selfie: selfie || null,
        data_cadastro: new Date().toISOString()
      }
    ])
    .select();
  
  if (error) throw new Error(error.message);
  return data[0];
};

export const registrarPresenca = async (filhoId, responsavelId, voluntarioId) => {
  // 1. Buscar última transação de hoje para este filho
  const hojeInicio = new Date();
  hojeInicio.setHours(0, 0, 0, 0);

  const { data: ultimas, error: fetchError } = await supabase
    .from('registro_presencas')
    .select('*')
    .eq('filho_id', filhoId)
    .gte('data_registro', hojeInicio.toISOString())
    .order('data_registro', { ascending: false })
    .limit(1);

  let novoTipo = 'entrada';
  if (!fetchError && ultimas && ultimas.length > 0) {
    if (ultimas[0].tipo_transacao === 'entrada') {
      novoTipo = 'saida';
    }
  }

  const { data, error } = await supabase
    .from('registro_presencas')
    .insert([
      {
        filho_id: filhoId,
        responsavel_id: responsavelId,
        voluntario_id: voluntarioId,
        tipo_transacao: novoTipo,
        data_registro: new Date().toISOString()
      }
    ])
    .select();

  if (error) throw new Error(error.message);
  return data[0];
};

export const subscribeToDailyAttendance = (callback) => {
  const hojeInicio = new Date();
  hojeInicio.setHours(0, 0, 0, 0);

  const fetchAttendance = async () => {
    const { data, error } = await supabase
      .from('registro_presencas')
      .select(`
        id,
        tipo_transacao,
        data_registro,
        filho:filho_id(id, nome, data_nascimento, apelido, neurodivergente, neurodivergencia_detalhe, como_acalmar, selfie),
        responsavel:responsavel_id(uid, nome, telefone),
        voluntario:voluntario_id(uid, nome)
      `)
      .gte('data_registro', hojeInicio.toISOString())
      .order('data_registro', { ascending: false });

    if (!error && data) {
      callback(data);
    } else if (error) {
      console.error("Erro ao carregar presenças do dia:", error);
    }
  };

  fetchAttendance();

  const channel = supabase
    .channel('daily-attendance-realtime')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'registro_presencas'
      },
      () => {
        fetchAttendance();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};

export const obterEstatisticasFilho = async (filhoId) => {
  // Obter todas as entradas ('entrada')
  const { data, error } = await supabase
    .from('registro_presencas')
    .select('data_registro')
    .eq('filho_id', filhoId)
    .eq('tipo_transacao', 'entrada')
    .order('data_registro', { ascending: false });

  if (error) throw new Error(error.message);

  const totalCheckins = data ? data.length : 0;
  
  // Encontrar o último check-in anterior a hoje
  let ultimoCheckin = null;
  const hojeInicio = new Date();
  hojeInicio.setHours(0, 0, 0, 0);

  if (data && data.length > 0) {
    const primeiro = new Date(data[0].data_registro);
    if (primeiro >= hojeInicio && data.length > 1) {
      ultimoCheckin = data[1].data_registro;
    } else if (primeiro < hojeInicio) {
      ultimoCheckin = data[0].data_registro;
    }
  }

  // Calcular dias desde o último check-in
  let diasAusente = null;
  if (ultimoCheckin) {
    const diffTime = Math.abs(new Date() - new Date(ultimoCheckin));
    diasAusente = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  return {
    totalCheckins,
    ultimoCheckin,
    diasAusente
  };
};
