import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  subscribeToVolunteers, 
  approveVolunteer, 
  rejectVolunteer, 
  revokeVolunteer,
  subscribeToDailyAttendance,
  obterEstatisticasFilho,
  getTodasEscalas,
  criarEscala,
  supabase
} from '../services/supabase';
import { 
  Users, 
  UserCheck, 
  UserX, 
  AlertCircle, 
  Check, 
  Trash2, 
  ShieldAlert,
  LogOut,
  Sparkles,
  Clock,
  FileText,
  Megaphone,
  User,
  Save,
  Calendar,
  Plus
} from 'lucide-react';
import SocialWall from '../components/SocialWall';
import SelfieCapture from '../components/SelfieCapture';
import DocumentUpload from '../components/DocumentUpload';

export default function AdminDashboard({ user }) {
  const { signOut } = useAuth();
  const [activeTab, setActiveTab] = useState('pendentes'); // 'pendentes' ou 'ativos'
  const [pendingVolunteers, setPendingVolunteers] = useState([]);
  const [activeVolunteers, setActiveVolunteers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Estados para Ficha de Usuário (Modal)
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedUserChildren, setSelectedUserChildren] = useState([]);
  const [selectedChildrenAuthorized, setSelectedChildrenAuthorized] = useState([]);

  const [isEditingUser, setIsEditingUser] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editMembro, setEditMembro] = useState(false);
  const [editNomeIgreja, setEditNomeIgreja] = useState('');
  const [editSelfie, setEditSelfie] = useState('');
  const [editMinisterio, setEditMinisterio] = useState('');
  const [editAntecedentes, setEditAntecedentes] = useState(null);
  const [savingUserEdit, setSavingUserEdit] = useState(false);

  // Estados para Escala de Voluntários
  const [escalas, setEscalas] = useState([]);
  const [loadingEscalas, setLoadingEscalas] = useState(false);
  const [escalaVoluntarioId, setEscalaVoluntarioId] = useState('');
  const [escalaDataCulto, setEscalaDataCulto] = useState('');
  const [escalaTurno, setEscalaTurno] = useState('Manhã');
  const [escalaFuncao, setEscalaFuncao] = useState('Recepção / Cuidado');
  const [savingEscala, setSavingEscala] = useState(false);

  useEffect(() => {
    fetchEscalas();
  }, []);

  const fetchEscalas = async () => {
    setLoadingEscalas(true);
    try {
      const data = await getTodasEscalas();
      setEscalas(data);
    } catch (e) {
      console.error("Erro ao buscar escalas:", e);
    } finally {
      setLoadingEscalas(false);
    }
  };

  const handleCriarEscala = async (e) => {
    e.preventDefault();
    if (!escalaVoluntarioId || !escalaDataCulto) {
      alert("Selecione um voluntário e informe a data do culto.");
      return;
    }
    setSavingEscala(true);
    try {
      await criarEscala({
        voluntarioId: escalaVoluntarioId,
        dataCulto: escalaDataCulto,
        turno: escalaTurno,
        funcao: escalaFuncao
      });
      alert("Escala criada com sucesso!");
      setEscalaVoluntarioId('');
      setEscalaDataCulto('');
      fetchEscalas();
    } catch (err) {
      alert("Erro ao criar escala: " + err.message);
    } finally {
      setSavingEscala(false);
    }
  };

  const startEditing = () => {
    if (!selectedUser) return;
    setEditName(selectedUser.nome || '');
    setEditPhone(selectedUser.telefone || '');
    setEditAddress(selectedUser.endereco || '');
    setEditMembro(!!selectedUser.membro_igreja);
    setEditNomeIgreja(selectedUser.nome_igreja || '');
    setEditSelfie(selectedUser.selfie || '');
    setEditMinisterio(selectedUser.ministerio || '');
    setEditAntecedentes(selectedUser.antecedentes_criminais || null);
    setIsEditingUser(true);
  };

  const closeUserModal = () => {
    setSelectedUser(null);
    setIsEditingUser(false);
  };

  const handleSaveUserEdit = async () => {
    if (!editName.trim()) {
      alert("O nome é obrigatório.");
      return;
    }
    setSavingUserEdit(true);
    try {
      const updateData = {
        nome: editName,
        selfie: editSelfie,
      };
      if (selectedUser.tipo_usuario === 'responsavel') {
        updateData.telefone = editPhone;
        updateData.endereco = editAddress;
        updateData.membro_igreja = editMembro;
        updateData.nome_igreja = editMembro ? editNomeIgreja : '';
      } else if (selectedUser.tipo_usuario === 'voluntario') {
        updateData.ministerio = editMinisterio;
        updateData.antecedentes_criminais = editAntecedentes;
      }

      const { error } = await supabase
        .from('usuarios')
        .update(updateData)
        .eq('uid', selectedUser.uid);

      if (error) throw error;

      // Atualizar localmente a referência do selectedUser para refletir as alterações no modal
      setSelectedUser(prev => ({
        ...prev,
        ...updateData
      }));
      setIsEditingUser(false);
      alert("Cadastro atualizado com sucesso!");
    } catch (err) {
      console.error("Erro ao salvar alterações do usuário:", err);
      alert("Erro ao salvar alterações: " + err.message);
    } finally {
      setSavingUserEdit(false);
    }
  };

  // Escutar voluntários pendentes
  useEffect(() => {
    const unsubscribePending = subscribeToVolunteers(false, (volunteers) => {
      setPendingVolunteers(volunteers);
      setLoading(false);
    });

    return () => unsubscribePending();
  }, []);

  // Escutar voluntários ativos
  useEffect(() => {
    const unsubscribeActive = subscribeToVolunteers(true, (volunteers) => {
      setActiveVolunteers(volunteers);
    });

    return () => unsubscribeActive();
  }, []);

  // Escutar presenças do dia em tempo real
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  useEffect(() => {
    const unsubscribeAttendance = subscribeToDailyAttendance((logs) => {
      setAttendanceLogs(logs);
    });

    return () => unsubscribeAttendance();
  }, []);

  const getPresentChildren = () => {
    const latestByChild = {};
    attendanceLogs.forEach((log) => {
      if (log.filho && !latestByChild[log.filho.id]) {
        latestByChild[log.filho.id] = log;
      }
    });
    return Object.values(latestByChild).filter(
      (log) => log.tipo_transacao === 'entrada'
    );
  };

  const presentChildren = getPresentChildren();
  const presentCount = presentChildren.length;

  // Estado para armazenar estatísticas de presenças de cada filho indexado por ID
  const [childrenStats, setChildrenStats] = useState({});

  // Efeito para buscar estatísticas de presenças das crianças nos logs de hoje
  useEffect(() => {
    if (attendanceLogs.length === 0) return;
    const childIds = [...new Set(attendanceLogs.map(log => log.filho?.id).filter(Boolean))];
    const fetchAllStats = async () => {
      const newStats = { ...childrenStats };
      let updated = false;
      for (const id of childIds) {
        if (!newStats[id]) {
          try {
            const stats = await obterEstatisticasFilho(id);
            newStats[id] = stats;
            updated = true;
          } catch (e) {
            console.error("Erro ao obter estatísticas para o filho:", id, e);
          }
        }
      }
      if (updated) {
        setChildrenStats(newStats);
      }
    };
    fetchAllStats();
  }, [attendanceLogs]);

  // Efeito para buscar estatísticas das crianças da ficha de responsável exibida no modal
  useEffect(() => {
    if (selectedUserChildren.length === 0) return;
    const fetchStatsForModal = async () => {
      const newStats = { ...childrenStats };
      let updated = false;
      for (const child of selectedUserChildren) {
        if (!newStats[child.id]) {
          try {
            const stats = await obterEstatisticasFilho(child.id);
            newStats[child.id] = stats;
            updated = true;
          } catch (e) {
            console.error("Erro ao obter estatísticas para modal do filho:", e);
          }
        }
      }
      if (updated) {
        setChildrenStats(newStats);
      }
    };
    fetchStatsForModal();
  }, [selectedUserChildren]);

  // Buscar filhos e autorizados do responsável selecionado para a ficha
  useEffect(() => {
    if (selectedUser?.uid && selectedUser.tipo_usuario === 'responsavel') {
      supabase
        .from('filhos')
        .select('*')
        .eq('responsavel_id', selectedUser.uid)
        .then(async ({ data: filhosData, error: filhosError }) => {
          if (!filhosError && filhosData) {
            setSelectedUserChildren(filhosData);

            if (filhosData.length > 0) {
              const childIds = filhosData.map(c => c.id);
              const { data: authData, error: authError } = await supabase
                .from('autorizados_retirada')
                .select('*')
                .in('filho_id', childIds);
              
              if (!authError && authData) {
                setSelectedChildrenAuthorized(authData);
              } else {
                setSelectedChildrenAuthorized([]);
              }
            } else {
              setSelectedChildrenAuthorized([]);
            }
          } else {
            setSelectedUserChildren([]);
            setSelectedChildrenAuthorized([]);
          }
        });
    } else {
      setSelectedUserChildren([]);
      setSelectedChildrenAuthorized([]);
    }
  }, [selectedUser]);

  const handleApprove = async (uid) => {
    try {
      await approveVolunteer(uid);
    } catch (error) {
      alert('Erro ao aprovar cadastro: ' + error.message);
    }
  };

  const handleReject = async (uid) => {
    if (window.confirm('Deseja realmente recusar e remover este cadastro?')) {
      try {
        await rejectVolunteer(uid);
        if (selectedUser?.uid === uid) {
          setSelectedUser(null);
        }
      } catch (error) {
        alert('Erro ao remover cadastro: ' + error.message);
      }
    }
  };

  const handleRevoke = async (uid) => {
    if (window.confirm('Deseja realmente revogar o acesso deste usuário? Ele voltará para a lista de pendentes.')) {
      try {
        await revokeVolunteer(uid);
        if (selectedUser?.uid === uid) {
          setSelectedUser(null);
        }
      } catch (error) {
        alert('Erro ao revogar acesso: ' + error.message);
      }
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Erro ao sair:', error);
    }
  };

  return (
    <div className="admin-container">
      {/* Header */}
      <header className="app-header">
        <div className="app-logo-area">
          <img src="/logo.svg" alt="Logo" />
          <div>
            <h1 className="app-title-main heading-font">Administração</h1>
            <p className="app-subtitle-main">Igreja da Criança AD Madureira</p>
          </div>
        </div>
        <button className="logout-btn-round" onClick={handleSignOut} title="Sair da Conta">
          <LogOut size={16} />
        </button>
      </header>

      {/* Admin Profile Card */}
      <div className="vol-profile-bar" style={{ background: 'rgba(99, 102, 241, 0.05)', borderColor: 'rgba(99, 102, 241, 0.15)' }}>
        <div className="avatar-circle" style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #312e81 100%)' }}>
          AD
        </div>
        <div className="vol-info">
          <span className="vol-name">{user?.nome || 'Administrador'}</span>
          <span className="vol-badge" style={{ color: '#a5b4fc' }}>
            <Sparkles size={12} />
            Administrador Mestre
          </span>
        </div>
      </div>

      {/* Tabs Selector */}
      <div className="tabs-container">
        <button 
          className={`tab-btn ${activeTab === 'pendentes' ? 'active' : ''}`}
          onClick={() => setActiveTab('pendentes')}
        >
          <Clock size={16} />
          <span>Pendentes ({pendingVolunteers.length})</span>
        </button>
        <button 
          className={`tab-btn ${activeTab === 'ativos' ? 'active' : ''}`}
          onClick={() => setActiveTab('ativos')}
        >
          <UserCheck size={16} />
          <span>Ativos ({activeVolunteers.length})</span>
        </button>
        <button 
          className={`tab-btn ${activeTab === 'presencas' ? 'active' : ''}`}
          onClick={() => setActiveTab('presencas')}
        >
          <Clock size={16} style={{ color: '#10b981' }} />
          <span>Presentes Hoje ({presentCount})</span>
        </button>
        <button 
          className={`tab-btn ${activeTab === 'escala' ? 'active' : ''}`}
          onClick={() => setActiveTab('escala')}
        >
          <Calendar size={16} />
          <span>Escala de Serviço ({escalas.length})</span>
        </button>
        <button 
          className={`tab-btn ${activeTab === 'mural' ? 'active' : ''}`}
          onClick={() => setActiveTab('mural')}
        >
          <Megaphone size={16} />
          <span>Mural de Mídia</span>
        </button>
      </div>

      {/* Volunteers/Mural Content Section */}
      {activeTab === 'escala' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '1rem' }}>
          {/* Formulário de Criação de Escala */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '1.25rem' }}>
            <h3 className="heading-font" style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-primary)' }}>
              <Plus size={18} />
              <span>Escalar Voluntário para o Culto</span>
            </h3>

            <form onSubmit={handleCriarEscala} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="grid-2-col">
                <div className="form-group">
                  <label className="form-label">Selecione o Voluntário *</label>
                  <select 
                    className="form-input" 
                    value={escalaVoluntarioId} 
                    onChange={(e) => setEscalaVoluntarioId(e.target.value)}
                    required
                  >
                    <option value="">-- Selecione um Voluntário Ativo --</option>
                    {activeVolunteers.map(vol => (
                      <option key={vol.uid} value={vol.uid}>
                        {vol.nome} ({vol.ministerio || 'Voluntário'})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Data do Culto *</label>
                  <input 
                    type="date" 
                    className="form-input" 
                    value={escalaDataCulto} 
                    onChange={(e) => setEscalaDataCulto(e.target.value)} 
                    required 
                  />
                </div>
              </div>

              <div className="grid-2-col">
                <div className="form-group">
                  <label className="form-label">Turno do Culto</label>
                  <select 
                    className="form-input" 
                    value={escalaTurno} 
                    onChange={(e) => setEscalaTurno(e.target.value)}
                  >
                    <option value="Manhã">Manhã</option>
                    <option value="Noite">Noite</option>
                    <option value="Tarde">Tarde</option>
                    <option value="Especial">Culto Especial</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Função / Ministério</label>
                  <select 
                    className="form-input" 
                    value={escalaFuncao} 
                    onChange={(e) => setEscalaFuncao(e.target.value)}
                  >
                    <option value="Recepção / Cuidado">Recepção / Cuidado</option>
                    <option value="Pregação Infantil">Pregação Infantil</option>
                    <option value="Louvor Infantil">Louvor Infantil</option>
                    <option value="Teatrinho / Animação">Teatrinho / Animação</option>
                    <option value="Apoio Geral">Apoio Geral</option>
                  </select>
                </div>
              </div>

              <button 
                type="submit" 
                className="btn btn-primary" 
                disabled={savingEscala}
                style={{ width: '100%', marginTop: '0.5rem', padding: '0.75rem', justifyContent: 'center' }}
              >
                {savingEscala ? 'Adicionando à Escala...' : 'Cadastrar na Escala'}
              </button>
            </form>
          </div>

          {/* Lista de Escalas */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '1.25rem' }}>
            <h3 className="heading-font" style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Calendar size={18} style={{ color: 'var(--accent-primary)' }} />
              <span>Quadro Geral de Escalas</span>
            </h3>

            {loadingEscalas ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}><div className="spinner"></div></div>
            ) : escalas.length === 0 ? (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontStyle: 'italic', margin: 0 }}>
                Nenhuma escala cadastrada no momento. Preencha o formulário acima para agendar voluntários!
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {escalas.map(item => (
                  <div 
                    key={item.id} 
                    style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      background: 'rgba(255, 255, 255, 0.02)', 
                      border: '1px solid var(--border-color)', 
                      borderRadius: '10px', 
                      padding: '0.85rem 1rem' 
                    }}
                  >
                    <div>
                      <strong style={{ color: '#fff', fontSize: '0.95rem', display: 'block' }}>
                        {item.voluntario?.nome || 'Voluntário'}
                      </strong>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        Data: <strong>{new Date(item.data_culto + 'T00:00:00').toLocaleDateString('pt-BR')}</strong> ({item.turno}) • Função: <strong>{item.funcao}</strong>
                      </span>
                    </div>

                    {item.solicitou_troca && (
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '0.75rem', background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', padding: '0.25rem 0.6rem', borderRadius: '6px', fontWeight: 600, display: 'inline-block' }}>
                          ⚠️ Pediu Troca de Turno
                        </span>
                        {item.observacao_troca && (
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', marginTop: '0.2rem' }}>
                            Motivo: {item.observacao_troca}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : activeTab === 'mural' ? (
        <div style={{ marginTop: '1rem' }}>
          <SocialWall user={user} />
        </div>
      ) : activeTab === 'presencas' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
          {/* Dashboard de Presenças (Métricas) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem' }}>
            <div style={{ background: 'var(--bg-card)', border: '1px solid rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '12px', textAlign: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Presentes Agora</span>
              <h3 className="heading-font" style={{ fontSize: '1.75rem', margin: '0.25rem 0 0 0', color: '#10b981' }}>{presentCount}</h3>
            </div>
            <div style={{ background: 'var(--bg-card)', border: '1px solid rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '12px', textAlign: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Total de Movimentações</span>
              <h3 className="heading-font" style={{ fontSize: '1.75rem', margin: '0.25rem 0 0 0', color: 'var(--accent-primary)' }}>{attendanceLogs.length}</h3>
            </div>
          </div>

          {/* Histórico do Dia */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '1rem' }}>
            <h3 className="heading-font" style={{ fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Users size={18} style={{ color: 'var(--accent-primary)' }} />
              <span>Linha do Tempo de Presenças (Hoje)</span>
            </h3>

            {attendanceLogs.length === 0 ? (
              <div className="empty-state" style={{ padding: '2rem 1rem' }}>
                <Clock size={32} style={{ color: 'var(--text-secondary)', opacity: 0.5 }} />
                <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem' }}>Nenhum check-in ou check-out registrado hoje.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {attendanceLogs.map((log) => {
                  const isEntrada = log.tipo_transacao === 'entrada';
                  const child = log.filho || { nome: 'Criança desconhecida' };
                  const parent = log.responsavel || { nome: 'Não cadastrado', telefone: '' };
                  const vol = log.voluntario || { nome: 'Voluntário' };

                  // Mensagem pré-definida de WhatsApp para o responsável
                  const msgWpp = encodeURIComponent(`Olá, ${parent.nome}! Precisamos do seu apoio com o(a) ${child.nome} aqui no Ministério Infantil (Igreja da Criança) AD Madureira. Pode comparecer à recepção, por favor?`);
                  const wppLink = parent.telefone ? `https://wa.me/55${parent.telefone.replace(/\D/g, '')}?text=${msgWpp}` : null;

                  return (
                    <div 
                      key={log.id} 
                      style={{
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid rgba(255, 255, 255, 0.04)',
                        borderRadius: '8px',
                        padding: '0.75rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5rem',
                        transition: 'transform 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'center' }}>
                          {child.selfie ? (
                            <img 
                              src={child.selfie} 
                              alt={child.nome} 
                              style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover', border: '1.5px solid var(--accent-primary)', flexShrink: 0 }} 
                            />
                          ) : (
                            <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'rgba(255, 255, 255, 0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed rgba(255,255,255,0.1)', flexShrink: 0 }}>
                              <Users size={16} style={{ color: 'var(--text-secondary)' }} />
                            </div>
                          )}
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                              <span style={{ fontWeight: 600, color: '#fff', fontSize: '0.9rem' }}>{child.nome}</span>
                              {child.apelido && (
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.05)', padding: '1px 6px', borderRadius: '4px' }}>
                                  ({child.apelido})
                                </span>
                              )}
                              {child.neurodivergente && (
                                <span 
                                  title={child.neurodivergencia_detalhe || 'Neurodivergente'}
                                  style={{ 
                                    fontSize: '0.7rem', 
                                    background: 'rgba(245, 158, 11, 0.15)', 
                                    color: '#f59e0b', 
                                    padding: '1px 6px', 
                                    borderRadius: '4px',
                                    fontWeight: 600
                                  }}
                                >
                                  {child.neurodivergencia_detalhe || 'Neurodivergente'}
                                </span>
                              )}
                            </div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>
                              Responsável: {parent.nome}
                            </span>
                            {/* Exibir Frequência e Alerta de Ausência */}
                            {(() => {
                              const stats = childrenStats[child.id];
                              if (!stats) return null;
                              return (
                                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.2rem', flexWrap: 'wrap', fontSize: '0.75rem', color: 'var(--text-secondary)', alignItems: 'center' }}>
                                  <span>Frequência: <strong style={{ color: '#fff' }}>{stats.totalCheckins} cultos</strong></span>
                                  {stats.ultimoCheckin && (
                                    <span>• Último: <strong style={{ color: '#fff' }}>{new Date(stats.ultimoCheckin).toLocaleDateString('pt-BR')} ({stats.diasAusente} dias)</strong></span>
                                  )}
                                  {stats.diasAusente && stats.diasAusente > 30 && (
                                    <span style={{ 
                                      background: 'rgba(245, 158, 11, 0.15)', 
                                      color: '#fbbf24', 
                                      padding: '1px 6px', 
                                      borderRadius: '4px',
                                      fontSize: '0.7rem',
                                      fontWeight: 600
                                    }}>
                                      ⚠️ Ausente há mais de 1 mês!
                                    </span>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.2rem' }}>
                          <span style={{
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            padding: '2px 8px',
                            borderRadius: '10px',
                            background: isEntrada ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                            color: isEntrada ? '#10b981' : '#f87171'
                          }}>
                            {isEntrada ? 'Entrada' : 'Saída'}
                          </span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                            {log.data_registro ? new Date(log.data_registro).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : ''}
                          </span>
                        </div>
                      </div>

                      {/* Informações adicionais do voluntário e botões de ação rápidos */}
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        borderTop: '1px solid rgba(255,255,255,0.03)', 
                        paddingTop: '0.4rem',
                        fontSize: '0.75rem',
                        color: 'var(--text-secondary)'
                      }}>
                        <span>
                          Registrado por: <strong style={{ color: 'var(--text-primary)' }}>{vol.nome}</strong>
                        </span>

                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          {child.neurodivergente && child.como_acalmar && (
                            <button 
                              onClick={() => alert(`Como acalmar ${child.nome}:\n\n${child.como_acalmar}`)}
                              style={{ 
                                background: 'rgba(245, 158, 11, 0.1)', 
                                border: '1px solid rgba(245, 158, 11, 0.2)',
                                color: '#f59e0b',
                                fontSize: '0.7rem',
                                padding: '3px 8px',
                                borderRadius: '4px',
                                cursor: 'pointer'
                              }}
                            >
                              Como Acalmar
                            </button>
                          )}
                          {wppLink && (
                            <a 
                              href={wppLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ 
                                background: 'rgba(16, 185, 129, 0.1)', 
                                border: '1px solid rgba(16, 185, 129, 0.2)',
                                color: '#10b981',
                                fontSize: '0.7rem',
                                padding: '3px 8px',
                                borderRadius: '4px',
                                textDecoration: 'none',
                                fontWeight: 500
                              }}
                            >
                              Chamar no WhatsApp
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="volunteers-list">
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
              <div className="spinner"></div>
            </div>
          ) : activeTab === 'pendentes' ? (
            pendingVolunteers.length === 0 ? (
              <div className="empty-state">
                <UserCheck size={40} />
                <p>Nenhum cadastro pendente de aprovação.</p>
              </div>
            ) : (
              pendingVolunteers.map((vol) => (
                <div className="volunteer-card" key={vol.uid}>
                  <div className="volunteer-header">
                    <div className="vol-card-info">
                      <span className="vol-card-name">{vol.nome}</span>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', marginTop: '0.2rem' }}>
                        <span className="vol-card-email">{vol.email}</span>
                        <span style={{ 
                          fontSize: '0.7rem', 
                          padding: '1px 6px', 
                          borderRadius: '10px', 
                          background: vol.tipo_usuario === 'responsavel' ? 'rgba(236, 72, 153, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                          color: vol.tipo_usuario === 'responsavel' ? '#f472b6' : '#a5b4fc'
                        }}>
                          {vol.tipo_usuario === 'responsavel' ? 'Responsável' : 'Voluntário'}
                        </span>
                      </div>
                    </div>
                    <span className="vol-badge" style={{ color: '#fca5a5', background: 'rgba(239, 68, 68, 0.08)', padding: '2px 8px', borderRadius: '4px' }}>
                      Pendente
                    </span>
                  </div>
                  <div className="volunteer-actions" style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end', marginTop: '0.75rem' }}>
                    <button 
                      className="btn btn-secondary" 
                      onClick={() => setSelectedUser(vol)} 
                      style={{ marginRight: 'auto', padding: '6px 12px', fontSize: '0.75rem' }}
                    >
                      <span>Ver Ficha</span>
                    </button>
                    <button className="btn btn-success" onClick={() => handleApprove(vol.uid)} style={{ padding: '6px 12px', fontSize: '0.75rem' }}>
                      <Check size={14} />
                      <span>Aprovar</span>
                    </button>
                    <button className="btn btn-danger" onClick={() => handleReject(vol.uid)} style={{ padding: '6px 12px', fontSize: '0.75rem' }}>
                      <Trash2 size={14} />
                      <span>Recusar</span>
                    </button>
                  </div>
                </div>
              ))
            )
          ) : (
            activeVolunteers.length === 0 ? (
              <div className="empty-state">
                <Users size={40} />
                <p>Nenhum cadastro ativo encontrado.</p>
              </div>
            ) : (
              activeVolunteers.map((vol) => (
                <div className="volunteer-card" key={vol.uid}>
                  <div className="volunteer-header">
                    <div className="vol-card-info">
                      <span className="vol-card-name">{vol.nome}</span>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', marginTop: '0.2rem' }}>
                        <span className="vol-card-email">{vol.email}</span>
                        <span style={{ 
                          fontSize: '0.7rem', 
                          padding: '1px 6px', 
                          borderRadius: '10px', 
                          background: vol.tipo_usuario === 'responsavel' ? 'rgba(236, 72, 153, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                          color: vol.tipo_usuario === 'responsavel' ? '#f472b6' : '#a5b4fc'
                        }}>
                          {vol.tipo_usuario === 'responsavel' ? 'Responsável' : 'Voluntário'}
                        </span>
                      </div>
                    </div>
                    <span className="vol-badge" style={{ color: '#86efac', background: 'rgba(16, 185, 129, 0.08)', padding: '2px 8px', borderRadius: '4px' }}>
                      Ativo
                    </span>
                  </div>
                  <div className="volunteer-actions" style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end', marginTop: '0.75rem' }}>
                    <button 
                      className="btn btn-secondary" 
                      onClick={() => setSelectedUser(vol)} 
                      style={{ marginRight: 'auto', padding: '6px 12px', fontSize: '0.75rem' }}
                    >
                      <span>Ver Ficha</span>
                    </button>
                    <button 
                      className="btn btn-secondary" 
                      onClick={() => handleRevoke(vol.uid)} 
                      style={{ border: '1px solid rgba(244, 63, 94, 0.2)', color: '#f43f5e', padding: '6px 12px', fontSize: '0.75rem' }}
                    >
                      <UserX size={14} />
                      <span>Revogar Acesso</span>
                    </button>
                  </div>
                </div>
              ))
            )
          )}
        </div>
      )}

      {selectedUser && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
            padding: '1rem'
          }} 
          onClick={closeUserModal}
        >
          <div 
            className="auth-card" 
            style={{
              maxWidth: '500px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              background: 'var(--bg-card)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              padding: '1.5rem',
              borderRadius: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.4)'
            }} 
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header do Modal */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '0.75rem' }}>
              <h2 className="heading-font" style={{ fontSize: '1.1rem', margin: 0, color: '#fff' }}>
                {isEditingUser ? 'Editar Cadastro' : 'Ficha Cadastral'}
              </h2>
              <button 
                onClick={closeUserModal} 
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.2rem' }}
              >
                ✕
              </button>
            </div>

            {isEditingUser ? (
              /* MODO EDIÇÃO */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Selfie */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                  <label className="form-label">Selfie de Identificação</label>
                  <div style={{ width: '100%', maxWidth: '280px' }}>
                    <SelfieCapture onCapture={setEditSelfie} initialValue={editSelfie} />
                  </div>
                </div>

                {/* Nome */}
                <div className="form-group">
                  <label className="form-label">Nome Completo</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={editName} 
                    onChange={e => setEditName(e.target.value)} 
                    disabled={savingUserEdit}
                  />
                </div>

                {/* Campos do Responsável */}
                {selectedUser.tipo_usuario === 'responsavel' && (
                  <>
                    <div className="form-group">
                      <label className="form-label">Telefone (WhatsApp)</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        value={editPhone} 
                        onChange={e => setEditPhone(e.target.value)} 
                        disabled={savingUserEdit}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Endereço Residencial</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        value={editAddress} 
                        onChange={e => setEditAddress(e.target.value)} 
                        disabled={savingUserEdit}
                      />
                    </div>
                    <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginTop: '0.25rem' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                        <input 
                          type="checkbox" 
                          checked={editMembro} 
                          onChange={e => setEditMembro(e.target.checked)} 
                          disabled={savingUserEdit}
                        />
                        <span>Membro da Assembleia de Deus</span>
                      </label>
                    </div>
                    {editMembro && (
                      <div className="form-group">
                        <label className="form-label">Congregação / Igreja</label>
                        <input 
                          type="text" 
                          className="form-input" 
                          value={editNomeIgreja} 
                          onChange={e => setEditNomeIgreja(e.target.value)} 
                          disabled={savingUserEdit}
                        />
                      </div>
                    )}
                  </>
                )}

                {/* Campos do Voluntário */}
                {selectedUser.tipo_usuario === 'voluntario' && (
                  <>
                    <div className="form-group">
                      <label className="form-label">Ministério / Igreja de Origem</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        value={editMinisterio} 
                        onChange={e => setEditMinisterio(e.target.value)} 
                        disabled={savingUserEdit}
                      />
                    </div>
                    <DocumentUpload
                      label="Certidão de Antecedentes Criminais"
                      onUpload={setEditAntecedentes}
                      initialValue={editAntecedentes}
                      required={true}
                      disabled={savingUserEdit}
                    />
                  </>
                )}

                {/* Ações de Edição */}
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                  <button 
                    className="btn btn-secondary" 
                    onClick={() => setIsEditingUser(false)} 
                    style={{ flex: 1 }}
                    disabled={savingUserEdit}
                  >
                    Cancelar
                  </button>
                  <button 
                    className="btn btn-primary" 
                    onClick={handleSaveUserEdit} 
                    style={{ flex: 1 }}
                    disabled={savingUserEdit}
                  >
                    <Save size={16} />
                    <span>{savingUserEdit ? 'Salvando...' : 'Salvar Alterações'}</span>
                  </button>
                </div>
              </div>
            ) : (
              /* MODO VISUALIZAÇÃO */
              <>
                {/* Foto (Selfie) */}
                {selectedUser.tipo_usuario !== 'admin' && (
                  <div style={{ display: 'flex', justifyContent: 'center', margin: '0.5rem 0' }}>
                    {selectedUser.selfie ? (
                      <img 
                        src={selectedUser.selfie} 
                        alt="Selfie Responsável" 
                        style={{
                          width: '130px',
                          height: '130px',
                          borderRadius: '50%',
                          objectFit: 'cover',
                          border: '3px solid var(--accent-primary)',
                          boxShadow: '0 4px 10px rgba(0,0,0,0.3)'
                        }}
                      />
                    ) : (
                      <div style={{
                        width: '130px',
                        height: '130px',
                        borderRadius: '50%',
                        background: 'rgba(255,255,255,0.02)',
                        border: '2px dashed rgba(255,255,255,0.1)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'center',
                        color: 'var(--text-secondary)'
                      }}>
                        <AlertCircle size={24} style={{ opacity: 0.5 }} />
                        <span style={{ fontSize: '0.7rem', marginTop: '0.25rem' }}>Sem Foto</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Informações Gerais */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  <p style={{ margin: 0 }}><strong style={{ color: '#fff' }}>Nome Completo:</strong> {selectedUser.nome}</p>
                  <p style={{ margin: 0 }}><strong style={{ color: '#fff' }}>E-mail:</strong> {selectedUser.email}</p>
                  <p style={{ margin: 0 }}>
                    <strong style={{ color: '#fff' }}>Tipo de Perfil:</strong> 
                    <span style={{ 
                      marginLeft: '0.5rem',
                      fontSize: '0.75rem', 
                      padding: '2px 8px', 
                      borderRadius: '10px', 
                      background: selectedUser.tipo_usuario === 'responsavel' ? 'rgba(236, 72, 153, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                      color: selectedUser.tipo_usuario === 'responsavel' ? '#f472b6' : '#a5b4fc'
                    }}>
                      {selectedUser.tipo_usuario === 'responsavel' ? 'Responsável' : 'Voluntário'}
                    </span>
                  </p>

                  {/* Informações Adicionais do Responsável */}
                  {selectedUser.tipo_usuario === 'responsavel' && (
                    <>
                      <p style={{ margin: 0 }}>
                        <strong style={{ color: '#fff' }}>Telefone:</strong> {selectedUser.telefone || 'Não cadastrado'}
                        {selectedUser.telefone && (
                          <a 
                            href={`https://wa.me/55${selectedUser.telefone.replace(/\D/g, '')}`} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            style={{ marginLeft: '0.75rem', color: '#10b981', textDecoration: 'underline', fontWeight: 600 }}
                          >
                            WhatsApp
                          </a>
                        )}
                      </p>
                      <p style={{ margin: 0 }}><strong style={{ color: '#fff' }}>Endereço:</strong> {selectedUser.endereco || 'Não cadastrado'}</p>
                      <p style={{ margin: 0 }}>
                        <strong style={{ color: '#fff' }}>Relacionamento com a Igreja:</strong> {selectedUser.membro_igreja ? 'Membro da Assembleia de Deus' : 'Visitante'}
                      </p>
                      {selectedUser.membro_igreja && selectedUser.nome_igreja && (
                        <p style={{ margin: 0 }}>
                          <strong style={{ color: '#fff' }}>Congregação / Igreja:</strong> {selectedUser.nome_igreja}
                        </p>
                      )}
                    </>
                  )}

                  {/* Informações Adicionais do Voluntário */}
                  {selectedUser.tipo_usuario === 'voluntario' && (
                    <>
                      <p style={{ margin: 0 }}>
                        <strong style={{ color: '#fff' }}>Ministério / Igreja de Origem:</strong> {selectedUser.ministerio || 'Não informado'}
                      </p>
                      <div style={{ marginTop: '0.5rem' }}>
                        <strong style={{ color: '#fff', display: 'block', marginBottom: '0.35rem' }}>Antecedentes Criminais:</strong>
                        {selectedUser.antecedentes_criminais ? (
                          <DocumentUpload 
                            label="Certidão de Antecedentes"
                            initialValue={selectedUser.antecedentes_criminais}
                            disabled={true}
                            onUpload={() => {}}
                          />
                        ) : (
                          <span style={{ color: '#f87171', fontSize: '0.8rem', fontStyle: 'italic' }}>
                            ⚠️ Documento de antecedentes não anexado
                          </span>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {/* Informações da Criança */}
                {selectedUser.tipo_usuario === 'responsavel' && (
                  <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '0.75rem' }}>
                    <h3 className="heading-font" style={{ fontSize: '0.95rem', color: 'var(--accent-primary)', marginBottom: '0.65rem' }}>
                      Crianças Associadas ({selectedUserChildren.length})
                    </h3>
                    {selectedUserChildren.length === 0 ? (
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>Nenhuma criança associada encontrada ou carregando...</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {selectedUserChildren.map((child) => (
                          <div 
                            key={child.id} 
                            style={{
                              background: 'rgba(255, 255, 255, 0.02)',
                              border: '1px solid rgba(255, 255, 255, 0.04)',
                              padding: '0.85rem',
                              borderRadius: '10px',
                              fontSize: '0.8rem',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '0.35rem'
                            }}
                          >
                            {child.selfie && (
                              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.5rem' }}>
                                <img 
                                  src={child.selfie} 
                                  alt={child.nome} 
                                  style={{ 
                                    width: '75px', 
                                    height: '75px', 
                                    borderRadius: '50%', 
                                    objectFit: 'cover', 
                                    border: '2px solid var(--accent-primary)',
                                    boxShadow: '0 4px 6px rgba(0,0,0,0.15)'
                                  }} 
                                />
                              </div>
                            )}
                            <p style={{ margin: 0 }}><strong style={{ color: '#fff' }}>Nome Completo:</strong> {child.nome}</p>
                            <p style={{ margin: 0 }}>
                              <strong style={{ color: '#fff' }}>Data de Nascimento:</strong> {child.data_nascimento ? new Date(child.data_nascimento).toLocaleDateString('pt-BR', {timeZone: 'UTC'}) : 'Não informada'}
                            </p>
                            <p style={{ margin: 0 }}><strong style={{ color: '#fff' }}>Apelido:</strong> {child.apelido || 'Nenhum'}</p>
                            <p style={{ margin: 0 }}>
                              <strong style={{ color: '#fff' }}>Possui Neurodivergência:</strong> {child.neurodivergente ? 'Sim' : 'Não'}
                            </p>
                            {child.neurodivergente && (
                              <>
                                <p style={{ margin: 0 }}><strong style={{ color: '#fca5a5' }}>Qual neurodivergência:</strong> {child.neurodivergencia_detalhe || 'Não detalhado'}</p>
                                <p style={{ margin: 0 }}><strong style={{ color: '#fca5a5' }}>Como acalmar em crise:</strong> {child.como_acalmar || 'Sem instruções'}</p>
                              </>
                            )}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#6ee7b7', marginTop: '0.25rem', fontWeight: 500 }}>
                              <FileText size={14} />
                              <span>Termo de Imagem e Voz: {child.termo_aceito ? 'Aceito' : 'Não Aceito'}</span>
                            </div>

                            {/* Estatísticas de Frequência Pastoral */}
                            {childrenStats[child.id] && (() => {
                              const stats = childrenStats[child.id];
                              return (
                                <div style={{ 
                                  marginTop: '0.4rem', 
                                  padding: '0.6rem', 
                                  borderRadius: '6px', 
                                  background: 'rgba(255,255,255,0.03)',
                                  border: '1px solid rgba(255,255,255,0.05)',
                                  fontSize: '0.75rem',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '0.25rem'
                                }}>
                                  <span style={{ color: 'var(--text-secondary)' }}>
                                    Frequência Total: <strong style={{ color: '#fff' }}>{stats.totalCheckins} cultos</strong>
                                  </span>
                                  {stats.ultimoCheckin ? (
                                    <span style={{ color: 'var(--text-secondary)' }}>
                                      Último Check-In: <strong style={{ color: '#fff' }}>
                                        {new Date(stats.ultimoCheckin).toLocaleDateString('pt-BR')} ({stats.diasAusente} dias atrás)
                                      </strong>
                                    </span>
                                  ) : (
                                    <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                                      Nenhum check-in registrado ainda.
                                    </span>
                                  )}

                                  {stats.diasAusente && stats.diasAusente > 30 && (
                                    <div style={{ 
                                      color: '#fbbf24', 
                                      fontWeight: 600, 
                                      marginTop: '0.25rem',
                                      background: 'rgba(245, 158, 11, 0.15)',
                                      border: '1px solid rgba(245, 158, 11, 0.2)',
                                      padding: '0.4rem',
                                      borderRadius: '4px',
                                      lineHeight: '1.25'
                                    }}>
                                      ⚠️ Ausente há mais de 1 mês ({stats.diasAusente} dias)! Entre em contato com os pais para saber como a família está.
                                    </div>
                                  )}
                                </div>
                              );
                            })()}

                            {/* Authorized Pickup Persons */}
                            <div style={{ 
                              marginTop: '0.5rem', 
                              paddingTop: '0.5rem', 
                              borderTop: '1px dashed rgba(255,255,255,0.05)',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '0.35rem'
                            }}>
                              <strong style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', display: 'block' }}>
                                Pessoas Autorizadas a Retirar:
                              </strong>
                              {selectedChildrenAuthorized.filter(auth => auth.filho_id === child.id).length === 0 ? (
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                                  Apenas os responsáveis cadastrados.
                                </span>
                              ) : (
                                selectedChildrenAuthorized.filter(auth => auth.filho_id === child.id).map(auth => (
                                  <div key={auth.id} style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '0.5rem',
                                    background: 'rgba(255,255,255,0.02)',
                                    padding: '0.4rem',
                                    borderRadius: '6px',
                                    border: '1px solid rgba(255,255,255,0.04)'
                                  }}>
                                    {auth.selfie ? (
                                      <img src={auth.selfie} alt={auth.nome} style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }} />
                                    ) : (
                                      <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <User size={10} style={{ color: 'var(--text-secondary)' }} />
                                      </div>
                                    )}
                                    <div>
                                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#fff', display: 'block' }}>{auth.nome}</span>
                                      <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
                                        {auth.parentesco} {auth.telefone && `| Tel: ${auth.telefone}`} {auth.documento && `| Doc: ${auth.documento}`}
                                      </span>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Ações Rápidas no Modal */}
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button 
                      className="btn btn-secondary" 
                      onClick={startEditing} 
                      style={{ flex: 1, border: '1px solid var(--accent-primary)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}
                    >
                      <span>Editar Cadastro</span>
                    </button>
                    {!selectedUser.aprovado ? (
                      <button 
                        className="btn btn-success" 
                        onClick={() => {
                          handleApprove(selectedUser.uid);
                          closeUserModal();
                        }} 
                        style={{ flex: 1 }}
                      >
                        Aprovar Conta
                      </button>
                    ) : (
                      <button 
                        className="btn btn-danger" 
                        onClick={() => {
                          handleRevoke(selectedUser.uid);
                          closeUserModal();
                        }} 
                        style={{ flex: 1, border: '1px solid rgba(244, 63, 94, 0.2)', color: '#f43f5e' }}
                      >
                        Revogar Acesso
                      </button>
                    )}
                  </div>

                  {!selectedUser.aprovado && (
                    <button 
                      className="btn btn-danger" 
                      onClick={() => {
                        handleReject(selectedUser.uid);
                        closeUserModal();
                      }} 
                      style={{ width: '100%' }}
                    >
                      Recusar Conta
                    </button>
                  )}

                  <button className="btn btn-secondary" onClick={closeUserModal} style={{ width: '100%' }}>
                    Fechar Ficha
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
