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
export const addChild = async (responsavelId, { nome, dataNascimento, apelido, neurodivergente, neurodivergenciaDetalhe, comoAcalmar, alergias, termoAceito, selfie }) => {
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
        alergias: alergias || '',
        termo_aceito: !!termoAceito,
        selfie: selfie || null,
        data_cadastro: new Date().toISOString()
      }
    ])
    .select();
  
  if (error) throw new Error(error.message);
  return data[0];
};

export const updateChild = async (childId, { nome, dataNascimento, apelido, neurodivergente, neurodivergenciaDetalhe, comoAcalmar, alergias, selfie }) => {
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

  const updateData = {
    nome,
    idade: calculatedAge,
    data_nascimento: dataNascimento || null,
    apelido: apelido || '',
    neurodivergente: !!neurodivergente,
    neurodivergencia_detalhe: neurodivergente ? neurodivergenciaDetalhe : '',
    como_acalmar: comoAcalmar || '',
    alergias: alergias || ''
  };

  if (selfie) {
    updateData.selfie = selfie;
  }

  const { data, error } = await supabase
    .from('filhos')
    .update(updateData)
    .eq('id', childId)
    .select();

  if (error) throw new Error(error.message);
  return data[0];
};

export const deleteChild = async (childId) => {
  const { error } = await supabase
    .from('filhos')
    .delete()
    .eq('id', childId);

  if (error) throw new Error(error.message);
  return true;
};

export const registrarPresenca = async (filhoId, responsavelId, voluntarioId) => {
  // Pegar registros das últimas 24h para determinar se a ação é entrada ou saída
  const vinteEQuatroHorasAtras = new Date(Date.now() - 24 * 60 * 60 * 1000);

  let finalResponsavelId = responsavelId;
  if (!finalResponsavelId) {
    const { data: childData } = await supabase
      .from('filhos')
      .select('responsavel_id')
      .eq('id', filhoId)
      .maybeSingle();
    finalResponsavelId = childData?.responsavel_id || voluntarioId;
  }

  const { data: ultimas, error: fetchError } = await supabase
    .from('registro_presencas')
    .select('*')
    .eq('filho_id', filhoId)
    .gte('data_registro', vinteEQuatroHorasAtras.toISOString())
    .order('data_registro', { ascending: false })
    .limit(1);

  if (fetchError && fetchError.message?.includes('schema cache')) {
    throw new Error("A tabela 'registro_presencas' ainda não foi criada no banco de dados Supabase. Execute o script 'schema.sql' no SQL Editor do Supabase.");
  }

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
        responsavel_id: finalResponsavelId,
        voluntario_id: voluntarioId,
        tipo_transacao: novoTipo,
        data_registro: new Date().toISOString()
      }
    ])
    .select();

  if (error) {
    if (error.message?.includes('schema cache')) {
      throw new Error("A tabela 'registro_presencas' ainda não foi criada no banco de dados Supabase. Execute o script 'schema.sql' no SQL Editor do Supabase.");
    }
    throw new Error(error.message);
  }
  return data[0];
};

export const subscribeToDailyAttendance = (callback) => {
  // Pegar registros das últimas 24 horas para cobrir qualquer variação de fuso horário
  const vinteEQuatroHorasAtras = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const fetchAttendance = async () => {
    // 1. Tentar busca relacional direta via Supabase PostgREST
    let rawData = null;
    try {
      const { data: relationalData, error: relError } = await supabase
        .from('registro_presencas')
        .select('*, filho:filhos(*), responsavel:usuarios!responsavel_id(*), voluntario:usuarios!voluntario_id(*)')
        .gte('data_registro', vinteEQuatroHorasAtras.toISOString())
        .order('data_registro', { ascending: false });

      if (!relError && relationalData) {
        rawData = relationalData;
      }
    } catch (e) {
      console.warn("Busca relacional falhou, tentando fallback simples:", e);
    }

    if (!rawData) {
      const { data: simpleData, error } = await supabase
        .from('registro_presencas')
        .select('*')
        .gte('data_registro', vinteEQuatroHorasAtras.toISOString())
        .order('data_registro', { ascending: false });

      if (error || !simpleData || simpleData.length === 0) {
        callback([]);
        return;
      }
      rawData = simpleData;
    }

    if (!rawData || rawData.length === 0) {
      callback([]);
      return;
    }

    // 2. Buscar TODOS os filhos e usuários para mapeamento em memória
    let { data: allFilhos } = await supabase.from('filhos').select('*');
    let { data: allUsuarios } = await supabase.from('usuarios').select('*');

    const filhosMap = {};
    const filhosByParentMap = {};
    if (allFilhos) {
      allFilhos.forEach(f => {
        if (!f || !f.id) return;
        const idStr = String(f.id).trim().toLowerCase();
        filhosMap[idStr] = f;

        if (f.responsavel_id) {
          const pId = String(f.responsavel_id).trim().toLowerCase();
          if (!filhosByParentMap[pId]) filhosByParentMap[pId] = [];
          filhosByParentMap[pId].push(f);
        }
      });
    }

    const usersMap = {};
    if (allUsuarios) {
      allUsuarios.forEach(u => {
        if (!u || !u.uid) return;
        const uidStr = String(u.uid).trim().toLowerCase();
        usersMap[uidStr] = u;
      });
    }

    const formatted = rawData.map(rec => {
      // Tratar se rec.filho já veio preenchido da query relacional
      let fObj = (rec.filho && rec.filho.nome && rec.filho.nome !== 'Criança') ? rec.filho : null;
      let rObj = (rec.responsavel && rec.responsavel.nome) ? rec.responsavel : null;
      let vObj = (rec.voluntario && rec.voluntario.nome) ? rec.voluntario : null;

      // Tratar caso rec.filho_id venha em formato JSON ou com aspas extras
      let cleanFilhoId = rec.filho_id;
      if (typeof rec.filho_id === 'string' && rec.filho_id.startsWith('{')) {
        try {
          const parsed = JSON.parse(rec.filho_id);
          cleanFilhoId = parsed.childId || parsed.id || rec.filho_id;
        } catch (e) {}
      }

      const fidStr = cleanFilhoId ? String(cleanFilhoId).trim().toLowerCase() : '';
      const rId = rec.responsavel_id || fObj?.responsavel_id;
      const rIdStr = rId ? String(rId).trim().toLowerCase() : '';

      // Tentar encontrar fObj via filhosMap se não veio da query relacional
      if (!fObj && fidStr && filhosMap[fidStr]) {
        fObj = filhosMap[fidStr];
      }

      // Fallback: Se a criança não foi encontrada diretamente pelo filho_id, mas temos o responsável
      if (!fObj && rIdStr && filhosByParentMap[rIdStr] && filhosByParentMap[rIdStr].length > 0) {
        const parentKids = filhosByParentMap[rIdStr];
        if (parentKids.length === 1) {
          fObj = parentKids[0];
        } else {
          // Se o pai tem múltiplos filhos, tentar encontrar por ID ou nome se disponível
          const matchedById = parentKids.find(k => String(k.id).toLowerCase() === fidStr);
          const matchedByName = rec.filho?.nome ? parentKids.find(k => k.nome.toLowerCase().includes(rec.filho.nome.toLowerCase())) : null;
          fObj = matchedById || matchedByName || null;
        }
      }

      if (!rObj && rIdStr && usersMap[rIdStr]) {
        rObj = usersMap[rIdStr];
      }

      const vId = rec.voluntario_id;
      const vIdStr = vId ? String(vId).trim().toLowerCase() : '';
      if (!vObj && vIdStr && usersMap[vIdStr]) {
        vObj = usersMap[vIdStr];
      }

      // Determinar nome legível para a criança
      const childNameFallback = fObj?.nome || (rObj?.nome ? `Filho(a) de ${rObj.nome}` : 'Criança');

      return {
        ...rec,
        filho: fObj 
          ? { ...fObj }
          : { id: cleanFilhoId || rec.filho_id, nome: childNameFallback, responsavel_id: rId, selfie: rObj?.selfie || null },
        responsavel: rObj || { uid: rId, nome: 'Responsável' },
        voluntario: vObj || { uid: rec.voluntario_id, nome: 'Voluntário' }
      };
    });

    callback(formatted);
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

  if (error) {
    if (error.message?.includes('schema cache')) {
      return { totalCheckins: 0, ultimoCheckin: null, diasAusente: null };
    }
    throw new Error(error.message);
  }

  if (!data || data.length === 0) {
    return {
      totalCheckins: 0,
      ultimoCheckin: null,
      diasAusente: null
    };
  }

  // Contar apenas DIAS/CULTOS ÚNICOS em horário local (mesmo se teve mais de uma entrada no mesmo dia)
  const datasUnicas = new Set(
    data.map(item => new Date(item.data_registro).toLocaleDateString('pt-BR'))
  );
  const totalCheckins = datasUnicas.size;
  
  // Encontrar o último check-in de um DIA ANTERIOR a hoje
  const hojeInicio = new Date();
  hojeInicio.setHours(0, 0, 0, 0);

  let ultimoCheckin = null;
  const datasAnteriores = data.filter(item => new Date(item.data_registro) < hojeInicio);
  if (datasAnteriores.length > 0) {
    ultimoCheckin = datasAnteriores[0].data_registro;
  }

  // Calcular dias desde o último check-in de culto anterior
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

/**
 * 1. Diário de Bordo (Feedback do Culto)
 */
export const saveDiarioBordo = async (filhoId, voluntarioId, tags, observacoes) => {
  const { data, error } = await supabase
    .from('diario_bordo')
    .insert([{
      filho_id: filhoId,
      voluntario_id: voluntarioId,
      tags: tags || [],
      observacoes: observacoes || '',
      data_registro: new Date().toISOString()
    }])
    .select();

  if (error) throw new Error(error.message);
  return data[0];
};

export const getDiarioBordoByFilho = async (filhoId) => {
  const { data, error } = await supabase
    .from('diario_bordo')
    .select(`
      id,
      tags,
      observacoes,
      data_registro,
      voluntario:voluntario_id(uid, nome)
    `)
    .eq('filho_id', filhoId)
    .order('data_registro', { ascending: false });

  if (error) {
    if (error.message?.includes('schema cache') || error.message?.includes('does not exist')) return [];
    throw new Error(error.message);
  }
  return data || [];
};

/**
 * 2. Chamadas de Emergência em Tempo Real
 */
export const solicitarChamadaEmergencia = async (filhoId, responsavelId, voluntarioId, motivo) => {
  let targetResponsavelId = responsavelId;

  // Se o responsavelId veio nulo ou indefinido, busca diretamente da criança na tabela 'filhos'
  if (!targetResponsavelId && filhoId) {
    const { data: childData } = await supabase
      .from('filhos')
      .select('responsavel_id')
      .eq('id', filhoId)
      .maybeSingle();
    targetResponsavelId = childData?.responsavel_id;
  }

  if (!targetResponsavelId) {
    throw new Error('Não foi possível identificar o responsável desta criança para emitir a chamada.');
  }

  const { data, error } = await supabase
    .from('chamadas_emergencia')
    .insert([{
      filho_id: filhoId,
      responsavel_id: targetResponsavelId,
      voluntario_id: voluntarioId,
      motivo,
      status: 'ativa',
      data_chamada: new Date().toISOString()
    }])
    .select();

  if (error) throw new Error(error.message);
  return data[0];
};

export const atenderChamadaEmergencia = async (chamadaId) => {
  const { data, error } = await supabase
    .from('chamadas_emergencia')
    .update({ status: 'atendida' })
    .eq('id', chamadaId)
    .select();

  if (error) throw new Error(error.message);
  return data[0];
};

export const subscribeToChamadasEmergencia = (responsavelId, callback) => {
  const fetchChamadas = async () => {
    let query = supabase
      .from('chamadas_emergencia')
      .select(`
        id,
        motivo,
        status,
        data_chamada,
        filho:filho_id(id, nome),
        voluntario:voluntario_id(uid, nome, telefone)
      `)
      .eq('status', 'ativa')
      .order('data_chamada', { ascending: false });

    if (responsavelId) {
      query = query.eq('responsavel_id', responsavelId);
    }

    const { data, error } = await query;
    if (!error && data) {
      callback(data);
    }
  };

  fetchChamadas();

  const channel = supabase
    .channel('realtime_chamadas_emergencia')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'chamadas_emergencia' },
      () => fetchChamadas()
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};

export const subscribeToChamadasEmergenciaResponsavel = subscribeToChamadasEmergencia;

/**
 * 3. Escala de Voluntários & Trocas
 */
export const getTodasEscalas = async () => {
  const { data, error } = await supabase
    .from('escala_voluntarios')
    .select(`
      id,
      data_culto,
      turno,
      funcao,
      solicitou_troca,
      observacao_troca,
      voluntario:voluntario_id(uid, nome, telefone)
    `)
    .order('data_culto', { ascending: true });

  if (error) {
    if (error.message?.includes('schema cache') || error.message?.includes('does not exist')) return [];
    throw new Error(error.message);
  }
  return data || [];
};

export const solicitarTrocaEscala = async (escalaId, observacao) => {
  const { data, error } = await supabase
    .from('escala_voluntarios')
    .update({ 
      solicitou_troca: true,
      observacao_troca: observacao || 'Solicitado via aplicativo'
    })
    .eq('id', escalaId)
    .select();

  if (error) throw new Error(error.message);
  return data[0];
};

export const criarEscala = async ({ voluntarioId, dataCulto, turno, funcao }) => {
  const { data, error } = await supabase
    .from('escala_voluntarios')
    .insert([{
      voluntario_id: voluntarioId,
      data_culto: dataCulto,
      turno: turno || 'Manhã',
      funcao: funcao || 'Recepção / Cuidado'
    }])
    .select();

  if (error) throw new Error(error.message);
  return data[0];
};

export const deletarEscala = async (escalaId) => {
  const { error } = await supabase
    .from('escala_voluntarios')
    .delete()
    .eq('id', escalaId);

  if (error) throw new Error(error.message);
  return true;
};

export const substituirVoluntarioEscala = async (escalaId, novoVoluntarioId) => {
  const { data, error } = await supabase
    .from('escala_voluntarios')
    .update({ 
      voluntario_id: novoVoluntarioId,
      solicitou_troca: false,
      observacao_troca: null
    })
    .eq('id', escalaId)
    .select();

  if (error) throw new Error(error.message);
  return data[0];
};

export const recusarSolicitacaoTroca = async (escalaId) => {
  const { data, error } = await supabase
    .from('escala_voluntarios')
    .update({ 
      solicitou_troca: false,
      observacao_troca: null
    })
    .eq('id', escalaId)
    .select();

  if (error) throw new Error(error.message);
  return data[0];
};

export const assumirTrocaEscala = async (escalaId, voluntarioId) => {
  const { data, error } = await supabase
    .from('escala_voluntarios')
    .update({ 
      voluntario_id: voluntarioId,
      solicitou_troca: false,
      observacao_troca: null
    })
    .eq('id', escalaId)
    .select();

  if (error) throw new Error(error.message);
  return data[0];
};

/**
 * 4. Check-in Express para Visitantes (Primeira Vez)
 */
export const cadastrarFilhoExpressVisitante = async ({ nome, dataNascimento, responsavelNome, responsavelTelefone, responsavelFoto, filhoFoto, voluntarioId }) => {
  // 1. Verificar se existe usuário responsável temporário para o visitante
  let tempUserId = null;
  const tempEmail = `visitante_${Date.now()}@igrejakids.temp`;

  // Tentar buscar responsável visitante com o mesmo telefone
  const { data: usuarioExistente } = await supabase
    .from('usuarios')
    .select('uid')
    .eq('telefone', responsavelTelefone)
    .maybeSingle();

  if (usuarioExistente) {
    tempUserId = usuarioExistente.uid;
    if (responsavelFoto) {
      await supabase
        .from('usuarios')
        .update({ selfie: responsavelFoto })
        .eq('uid', tempUserId);
    }
  } else {
    // Criar um usuário visitante na tabela usuarios diretamente
    const fakeUid = `visitante_${Date.now()}`;
    const { data: novousuario, error: userError } = await supabase
      .from('usuarios')
      .insert([{
        uid: fakeUid,
        nome: `${responsavelNome} (Visitante)`,
        email: tempEmail,
        tipo_usuario: 'responsavel',
        aprovado: true,
        telefone: responsavelTelefone,
        membro_igreja: false,
        selfie: responsavelFoto || null
      }])
      .select();

    if (userError) throw new Error(userError.message);
    tempUserId = novousuario[0].uid;
  }

  // 2. Cadastrar filho marcado como visitante
  let calculatedAge = 0;
  if (dataNascimento) {
    const birth = new Date(dataNascimento);
    const today = new Date();
    calculatedAge = today.getFullYear() - birth.getFullYear();
  }

  const { data: novoFilho, error: filhoError } = await supabase
    .from('filhos')
    .insert([{
      responsavel_id: tempUserId,
      nome: `${nome} (Visitante)`,
      data_nascimento: dataNascimento || null,
      idade: calculatedAge,
      visitante: true,
      termo_aceito: true,
      selfie: filhoFoto || null
    }])
    .select();

  if (filhoError) throw new Error(filhoError.message);

  // 3. Fazer o check-in automático de entrada
  await supabase
    .from('registro_presencas')
    .insert([{
      filho_id: novoFilho[0].id,
      responsavel_id: tempUserId,
      voluntario_id: voluntarioId,
      tipo_transacao: 'entrada',
      data_registro: new Date().toISOString()
    }]);

  return novoFilho[0];
};
