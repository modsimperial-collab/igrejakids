import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  subscribeToChildren, 
  addChild, 
  updateChild,
  deleteChild,
  supabase, 
  subscribeToChamadasEmergenciaResponsavel, 
  atenderChamadaEmergencia, 
  getDiarioBordoByFilho,
  subscribeToProgramacaoCultos
} from '../services/supabase';
import { 
  Plus, 
  Baby, 
  QrCode, 
  LogOut, 
  Heart,
  User,
  Phone,
  Calendar,
  X,
  Megaphone,
  Users,
  Camera,
  Trash2,
  FileText,
  AlertTriangle,
  Bell,
  Check,
  BookOpen,
  Edit3,
  Mic
} from 'lucide-react';
import SocialWall from '../components/SocialWall';
import SelfieCapture from '../components/SelfieCapture';
import EditProfileModal from '../components/EditProfileModal';

export default function ResponsavelDashboard({ user }) {
  const { signOut } = useAuth();
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeEmergencies, setActiveEmergencies] = useState([]);
  const [diariosByChild, setDiariosByChild] = useState({});
  const [showAddForm, setShowAddForm] = useState(false);

  // Estados de edição de filho
  const [editingChild, setEditingChild] = useState(null);
  const [editChildName, setEditChildName] = useState('');
  const [editChildBirthdate, setEditChildBirthdate] = useState('');
  const [editChildNickname, setEditChildNickname] = useState('');
  const [editChildAlergias, setEditChildAlergias] = useState('');
  const [editNeurodivergente, setEditNeurodivergente] = useState(false);
  const [editNeurodivergenciaDetalhe, setEditNeurodivergenciaDetalhe] = useState('');
  const [editComoAcalmar, setEditComoAcalmar] = useState('');
  const [editChildSelfie, setEditChildSelfie] = useState(null);
  const [savingChildEdit, setSavingChildEdit] = useState(false);
  const [childName, setChildName] = useState('');
  const [childBirthdate, setChildBirthdate] = useState('');
  const [childNickname, setChildNickname] = useState('');
  const [childAlergias, setChildAlergias] = useState('');
  const [neurodivergente, setNeurodivergente] = useState(false);
  const [neurodivergenciaDetalhe, setNeurodivergenciaDetalhe] = useState('');
  const [comoAcalmar, setComoAcalmar] = useState('');
  const [termoAceito, setTermoAceito] = useState(false);
  const [childSelfie, setChildSelfie] = useState(null);
  const [selectedChild, setSelectedChild] = useState(null); // Filho selecionado para exibir o QR Code
  const [activeTab, setActiveTab] = useState('filhos'); // 'filhos' ou 'mural'

  const [authorizedPeople, setAuthorizedPeople] = useState([]);
  const [activeAuthChildId, setActiveAuthChildId] = useState(null);
  const [showAddAuthForm, setShowAddAuthForm] = useState(false);
  const [authName, setAuthName] = useState('');
  const [authRelationship, setAuthRelationship] = useState('Avô / Avó');
  const [authPhone, setAuthPhone] = useState('');
  const [authDoc, setAuthDoc] = useState('');
  const [authSelfie, setAuthSelfie] = useState('');
  const [savingAuth, setSavingAuth] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [programacaoCultos, setProgramacaoCultos] = useState([]);

  // Escutar programação do culto (quem vai pregar) em tempo real
  useEffect(() => {
    const unsubscribe = subscribeToProgramacaoCultos((list) => {
      setProgramacaoCultos(list);
    });
    return () => unsubscribe();
  }, []);

  // Escutar chamadas de emergência em tempo real para este responsável
  useEffect(() => {
    if (!user?.uid) return;

    const unsubscribe = subscribeToChamadasEmergenciaResponsavel(user.uid, (chamadas) => {
      const ativas = chamadas.filter(c => c.status === 'ativa' || c.status === 'pendente');
      setActiveEmergencies(ativas);
    });

    return () => unsubscribe();
  }, [user]);

  // Carregar Diário de Bordo para os filhos do responsável
  useEffect(() => {
    if (children.length === 0) return;

    const fetchDiarios = async () => {
      const map = {};
      for (const child of children) {
        try {
          const logs = await getDiarioBordoByFilho(child.id);
          map[child.id] = logs;
        } catch (e) {
          console.error(e);
        }
      }
      setDiariosByChild(map);
    };

    fetchDiarios();
  }, [children]);

  // Escutar filhos no Supabase
  useEffect(() => {
    if (!user?.uid) return;

    const unsubscribe = subscribeToChildren(user.uid, (list) => {
      setChildren(list);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Buscar e escutar pessoas autorizadas a retirar
  useEffect(() => {
    if (children.length === 0) {
      setAuthorizedPeople([]);
      return;
    }

    const childIds = children.map(c => c.id);

    const fetchAuthorized = async () => {
      const { data, error } = await supabase
        .from('autorizados_retirada')
        .select('*')
        .in('filho_id', childIds);
      if (!error && data) {
        setAuthorizedPeople(data);
      }
    };

    fetchAuthorized();

    const channel = supabase
      .channel('realtime_autorizados')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'autorizados_retirada' 
      }, (payload) => {
        fetchAuthorized();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [children]);

  const getAuthorizedForChild = (childId) => {
    return authorizedPeople.filter(p => p.filho_id === childId);
  };

  const handleAddChild = async (e) => {
    e.preventDefault();
    if (!childName || !childBirthdate) {
      alert('Por favor, preencha o nome e a data de nascimento.');
      return;
    }
    if (!childSelfie) {
      alert('Por favor, tire ou envie uma selfie da criança para identificação visual.');
      return;
    }
    if (!termoAceito) {
      alert('Você precisa aceitar o Termo de Autorização de Imagem e Voz.');
      return;
    }

    try {
      await addChild(user.uid, {
        nome: childName,
        dataNascimento: childBirthdate,
        apelido: childNickname,
        neurodivergente,
        neurodivergenciaDetalhe: neurodivergente ? neurodivergenciaDetalhe : '',
        comoAcalmar,
        alergias: childAlergias,
        termoAceito,
        selfie: childSelfie
      });

      setChildName('');
      setChildBirthdate('');
      setChildNickname('');
      setChildAlergias('');
      setNeurodivergente(false);
      setNeurodivergenciaDetalhe('');
      setComoAcalmar('');
      setTermoAceito(false);
      setChildSelfie(null);
      setShowAddForm(false);
    } catch (err) {
      alert('Erro ao cadastrar filho: ' + err.message);
    }
  };

  const handleStartEditChild = (child) => {
    setEditingChild(child);
    setEditChildName(child.nome || '');
    setEditChildBirthdate(child.data_nascimento || '');
    setEditChildNickname(child.apelido || '');
    setEditChildAlergias(child.alergias || '');
    setEditNeurodivergente(!!child.neurodivergente);
    setEditNeurodivergenciaDetalhe(child.neurodivergencia_detalhe || '');
    setEditComoAcalmar(child.como_acalmar || '');
    setEditChildSelfie(child.selfie || null);
  };

  const handleSaveChildEdit = async (e) => {
    e.preventDefault();
    if (!editChildName.trim()) {
      alert('O nome da criança é obrigatório.');
      return;
    }
    setSavingChildEdit(true);
    try {
      await updateChild(editingChild.id, {
        nome: editChildName,
        dataNascimento: editChildBirthdate,
        apelido: editChildNickname,
        neurodivergente: editNeurodivergente,
        neurodivergenciaDetalhe: editNeurodivergente ? editNeurodivergenciaDetalhe : '',
        comoAcalmar: editComoAcalmar,
        alergias: editChildAlergias,
        selfie: editChildSelfie
      });
      alert('Dados da criança atualizados com sucesso!');
      setEditingChild(null);
    } catch (err) {
      alert('Erro ao atualizar criança: ' + err.message);
    } finally {
      setSavingChildEdit(false);
    }
  };

  const handleDeleteChildClick = async (childId, name) => {
    if (window.confirm(`Tem certeza que deseja excluir o cadastro de "${name}"?`)) {
      try {
        await deleteChild(childId);
        alert('Cadastro de filho removido com sucesso!');
        if (editingChild?.id === childId) setEditingChild(null);
      } catch (err) {
        alert('Erro ao excluir filho: ' + err.message);
      }
    }
  };

  const handleAddAuthorized = async (e) => {
    e.preventDefault();
    if (!authName || !activeAuthChildId) return;

    setSavingAuth(true);
    try {
      const { error } = await supabase
        .from('autorizados_retirada')
        .insert({
          filho_id: activeAuthChildId,
          nome: authName,
          parentesco: authRelationship,
          telefone: authPhone,
          documento: authDoc,
          selfie: authSelfie || null
        });

      if (error) throw error;

      // Reset form
      setAuthName('');
      setAuthPhone('');
      setAuthDoc('');
      setAuthSelfie('');
      setAuthRelationship('Avô / Avó');
      setShowAddAuthForm(false);
    } catch (err) {
      console.error("Erro ao adicionar pessoa autorizada:", err);
      alert("Não foi possível cadastrar a pessoa autorizada. Tente novamente.");
    } finally {
      setSavingAuth(false);
    }
  };

  const handleDeleteAuthorized = async (id) => {
    if (!window.confirm("Deseja realmente remover esta autorização de retirada?")) return;

    try {
      const { error } = await supabase
        .from('autorizados_retirada')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (err) {
      console.error("Erro ao remover pessoa autorizada:", err);
      alert("Erro ao remover a pessoa autorizada.");
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
    <div className="resp-container">
      {/* Header */}
      <header className="app-header">
        <div className="app-logo-area">
          <img src="/logo.svg" alt="Logo" />
          <div>
            <h1 className="app-title-main heading-font">Igreja da Criança</h1>
            <p className="app-subtitle-main">AD Madureira • Responsável</p>
          </div>
        </div>
        <button className="logout-btn-round" onClick={handleSignOut} title="Sair da Conta">
          <LogOut size={16} />
        </button>
      </header>

      {/* ALERTA DE CHAMADA DE EMERGÊNCIA EM TEMPO REAL */}
      {activeEmergencies.length > 0 && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.95) 0%, rgba(220, 38, 38, 0.95) 100%)',
          border: '2px solid #fee2e2',
          borderRadius: '16px',
          padding: '1.2rem',
          marginBottom: '1rem',
          color: '#fff',
          boxShadow: '0 10px 25px rgba(239, 68, 68, 0.4)',
          animation: 'pulse 2s infinite'
        }}>
          {activeEmergencies.map(call => (
            <div key={call.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Bell size={24} style={{ color: '#fff', animation: 'bounce 1s infinite' }} />
                <div>
                  <h3 className="heading-font" style={{ margin: 0, fontSize: '1.1rem', color: '#fff' }}>
                    🚨 SOLICITAÇÃO DE PRESENÇA URGENTE!
                  </h3>
                  <span style={{ fontSize: '0.85rem', color: '#fee2e2' }}>
                    Criança: <strong>{call.filho?.nome}</strong>
                  </span>
                </div>
              </div>

              <p style={{ margin: 0, fontSize: '0.9rem', background: 'rgba(0,0,0,0.2)', padding: '0.6rem 0.8rem', borderRadius: '8px' }}>
                <strong>Motivo informado pela equipe:</strong> {call.motivo}
              </p>

              <button
                onClick={async () => {
                  try {
                    await atenderChamadaEmergencia(call.id);
                    alert('Resposta enviada à equipe! Por favor, dirija-se à salinha.');
                  } catch (e) {
                    alert('Erro ao confirmar: ' + e.message);
                  }
                }}
                className="btn"
                style={{
                  background: '#fff',
                  color: '#dc2626',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  padding: '0.6rem 1rem',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  marginTop: '0.4rem',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                }}
              >
                <Check size={20} />
                <span>Estou a caminho! (Atender Chamada)</span>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Parent Welcome Bar */}
      <div className="vol-profile-bar" style={{ background: 'rgba(255, 255, 255, 0.01)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {user?.selfie ? (
            <img 
              src={user.selfie} 
              alt={user.nome} 
              className="avatar-circle" 
              style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--accent-primary)', margin: 0 }} 
            />
          ) : (
            <div className="avatar-circle" style={{ background: 'linear-gradient(135deg, var(--accent-primary) 0%, #ec4899 100%)', margin: 0 }}>
              {user?.nome ? user.nome.substring(0, 2).toUpperCase() : 'PA'}
            </div>
          )}
          <div className="vol-info">
            <span className="vol-name">Família {user?.nome?.split(' ')[0] || 'Responsável'}</span>
            <span className="vol-badge" style={{ color: '#ec4899' }}>
              <Heart size={12} fill="#ec4899" />
              Responsável Ativo
            </span>
          </div>
        </div>
        <button 
          onClick={() => setShowEditProfile(true)} 
          className="btn btn-secondary" 
          style={{ width: 'auto', padding: '0.45rem 0.85rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
        >
          <User size={14} />
          <span>Editar Perfil</span>
        </button>
      </div>

      {/* CARD DE PROGRAMAÇÃO DO CULTO (QUEM VAI PREGAR) */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.95) 100%)',
        border: '1px solid rgba(245, 158, 11, 0.4)',
        borderRadius: '16px',
        padding: '1rem 1.25rem',
        marginTop: '0.85rem',
        marginBottom: '1rem',
        boxShadow: '0 8px 20px rgba(0, 0, 0, 0.25)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute',
          top: '-20px',
          right: '-20px',
          width: '90px',
          height: '90px',
          background: 'radial-gradient(circle, rgba(245, 158, 11, 0.15) 0%, transparent 70%)',
          borderRadius: '50%'
        }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.6rem' }}>
          <div style={{
            width: '34px',
            height: '34px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            boxShadow: '0 4px 10px rgba(245, 158, 11, 0.4)'
          }}>
            <BookOpen size={18} />
          </div>
          <div>
            <h3 className="heading-font" style={{ margin: 0, fontSize: '0.95rem', color: '#fbbf24', letterSpacing: '0.5px' }}>
              PROGRAMAÇÃO DO PRÓXIMO CULTO
            </h3>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
              Saiba o que seu filho(a) vai aprender na igreja!
            </span>
          </div>
        </div>

        {programacaoCultos.length > 0 ? (
          (() => {
            const proximo = programacaoCultos[0];
            const dataFormatada = new Date(proximo.data_culto + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' });
            return (
              <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: '12px', padding: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#60a5fa', textTransform: 'capitalize' }}>
                    📅 {dataFormatada} • Turno da {proximo.turno}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span>🎤 Pregador(a):</span>
                    <span style={{ color: '#fbbf24' }}>{proximo.pregador_nome}</span>
                  </div>

                  {proximo.tema_culto && (
                    <div style={{ fontSize: '0.88rem', color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span>📖 Tema:</span>
                      <strong>"{proximo.tema_culto}"</strong>
                    </div>
                  )}

                  {proximo.observacoes && (
                    <p style={{ margin: '0.3rem 0 0 0', fontSize: '0.78rem', color: 'var(--text-secondary)', fontStyle: 'italic', background: 'rgba(0,0,0,0.2)', padding: '0.4rem 0.6rem', borderRadius: '6px' }}>
                      💡 {proximo.observacoes}
                    </p>
                  )}
                </div>
              </div>
            );
          })()
        ) : (
          <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '0.75rem', borderRadius: '10px', fontSize: '0.8rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
            Nenhum pregador cadastrado para o próximo culto ainda. Em breve a programação estará disponível aqui!
          </div>
        )}
      </div>

      {/* Tabs Selector */}
      <div className="tabs-container" style={{ margin: '1rem 0' }}>
        <button 
          className={`tab-btn ${activeTab === 'filhos' ? 'active' : ''}`}
          onClick={() => setActiveTab('filhos')}
        >
          <Baby size={16} />
          <span>Meus Filhos</span>
        </button>
        <button 
          className={`tab-btn ${activeTab === 'mural' ? 'active' : ''}`}
          onClick={() => setActiveTab('mural')}
        >
          <Megaphone size={16} />
          <span>Mural de Mídia</span>
        </button>
      </div>

      {activeTab === 'filhos' ? (
        <>
          {/* Children list header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.5rem', marginBottom: '1rem' }}>
            <h2 className="heading-font" style={{ fontSize: '1.2rem', fontWeight: 700 }}>Crianças Cadastradas</h2>
            {!showAddForm && (
              <button className="btn btn-primary" onClick={() => setShowAddForm(true)} style={{ padding: '0.4rem 0.8rem', width: 'auto', fontSize: '0.85rem' }}>
                <Plus size={16} />
                <span>Adicionar</span>
              </button>
            )}
          </div>

          {/* Add Child Form Overlay or Inline */}
          {showAddForm && (
            <form onSubmit={handleAddChild} className="auth-card" style={{ margin: '0 0 1.25rem 0', background: 'rgba(30, 41, 59, 0.95)', border: '1px solid var(--accent-primary)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 className="heading-font" style={{ fontSize: '1rem' }}>Nova Criança</h3>
                <X size={20} style={{ cursor: 'pointer', color: 'var(--text-secondary)' }} onClick={() => setShowAddForm(false)} />
              </div>
              <div className="form-group">
                <label className="form-label">Nome Completo da Criança</label>
                <div className="input-wrapper">
                  <input
                    type="text"
                    placeholder="Nome completo da criança"
                    className="form-input"
                    value={childName}
                    onChange={(e) => setChildName(e.target.value)}
                    required
                  />
                  <User className="input-icon" size={18} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Data de Nascimento</label>
                <input
                  type="date"
                  className="form-input"
                  value={childBirthdate}
                  onChange={(e) => setChildBirthdate(e.target.value)}
                  required
                  style={{ colorScheme: 'dark' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Apelido (Como gosta de ser chamada)</label>
                <div className="input-wrapper">
                  <input
                    type="text"
                    placeholder="Apelido para acolhimento"
                    className="form-input"
                    value={childNickname}
                    onChange={(e) => setChildNickname(e.target.value)}
                  />
                  <Heart className="input-icon" size={18} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Alergias ou Restrições Alimentares / Médicas</label>
                <div className="input-wrapper">
                  <input
                    type="text"
                    placeholder="Ex: Amendoim, Lactose, Dipirona, nenhuma..."
                    className="form-input"
                    value={childAlergias}
                    onChange={(e) => setChildAlergias(e.target.value)}
                  />
                  <AlertTriangle className="input-icon" size={18} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Possui alguma neurodivergência?</label>
                <select 
                  className="form-input" 
                  value={neurodivergente ? 'sim' : 'nao'} 
                  onChange={(e) => setNeurodivergente(e.target.value === 'sim')}
                  style={{ background: 'var(--bg-input)', color: '#fff', appearance: 'auto' }}
                >
                  <option value="nao">Não</option>
                  <option value="sim">Sim</option>
                </select>
              </div>

              {neurodivergente && (
                <>
                  <div className="form-group">
                    <label className="form-label">Qual neurodivergência?</label>
                    <input
                      type="text"
                      placeholder="Ex: TEA, TDAH, etc."
                      className="form-input"
                      value={neurodivergenciaDetalhe}
                      onChange={(e) => setNeurodivergenciaDetalhe(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Como acalmar em caso de crise?</label>
                    <textarea
                      placeholder="Instruções para auxiliar os voluntários..."
                      className="form-input"
                      value={comoAcalmar}
                      onChange={(e) => setComoAcalmar(e.target.value)}
                      rows={3}
                      style={{ height: 'auto', padding: '10px 12px' }}
                    />
                  </div>
                </>
              )}

              {/* Captura de Selfie da Criança */}
              <div style={{ marginTop: '0.5rem' }}>
                <label className="form-label" style={{ marginBottom: '0.4rem', display: 'block' }}>Foto (Selfie) de Identificação da Criança</label>
                <SelfieCapture onCapture={setChildSelfie} initialValue={childSelfie} />
              </div>

              {/* Termo de imagem e voz */}
              <div style={{ marginTop: '0.5rem', background: 'rgba(0,0,0,0.15)', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', lineHeight: '1.3', margin: 0, maxHeight: '80px', overflowY: 'auto' }}>
                  <strong>TERMO DE AUTORIZAÇÃO DE USO DE IMAGEM E VOZ DE MENOR:</strong> Por este instrumento, autorizo a Igreja Assembleia de Deus Madureira Ibitinga / Ministério Infantil de forma gratuita, a veicular a imagem e voz do menor cadastrado em fotos, vídeos e posts na aba Mídia/Mural do aplicativo.
                </p>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.4rem', fontSize: '0.75rem', color: '#fff', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={termoAceito} 
                    onChange={(e) => setTermoAceito(e.target.checked)} 
                    style={{ cursor: 'pointer' }}
                  />
                  <span>Li e aceito os termos do uso de imagem e voz.</span>
                </label>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  <span>Cadastrar Criança</span>
                </button>
                <button type="button" className="btn btn-danger" style={{ flex: 1 }} onClick={() => setShowAddForm(false)}>
                  <span>Cancelar</span>
                </button>
              </div>
            </form>
          )}

          {/* Children list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
                <div className="spinner"></div>
              </div>
            ) : children.length === 0 ? (
              <div className="empty-state" style={{ background: 'rgba(255,255,255,0.01)', border: '1px dashed var(--border-color)', borderRadius: '12px' }}>
                <Baby size={32} />
                <p>Nenhuma criança cadastrada ainda.</p>
              </div>
            ) : (
              children.map((child) => (
                <div className="kid-card" key={child.id}>
                  <div className="kid-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      {child.selfie ? (
                        <img 
                          src={child.selfie} 
                          alt={child.nome} 
                          className="avatar-circle" 
                          style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', border: '1.5px solid var(--accent-primary)', margin: 0 }} 
                        />
                      ) : (
                        <div className="avatar-circle" style={{ background: 'var(--bg-tertiary)', width: '36px', height: '36px', fontSize: '0.9rem' }}>
                          <Baby size={16} />
                        </div>
                      )}
                      <div>
                        <span className="kid-name">{child.nome}</span>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{child.idade} {child.idade === 1 ? 'ano' : 'anos'}</p>
                        {child.alergias && (
                          <div style={{ marginTop: '0.2rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.7rem', color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>
                            <AlertTriangle size={10} />
                            <span><strong>Alergia:</strong> {child.alergias}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                      <button 
                        type="button"
                        className="btn btn-secondary" 
                        onClick={() => handleStartEditChild(child)}
                        style={{ width: 'auto', padding: '0.45rem 0.65rem', fontSize: '0.78rem' }}
                        title="Editar Ficha da Criança"
                      >
                        <Edit3 size={13} />
                        <span>Editar</span>
                      </button>
                      <button 
                        type="button"
                        className="btn btn-primary" 
                        onClick={() => setSelectedChild(selectedChild?.id === child.id ? null : child)}
                        style={{ width: 'auto', padding: '0.45rem 0.65rem', fontSize: '0.78rem' }}
                      >
                        <QrCode size={13} />
                        <span>{selectedChild?.id === child.id ? 'Fechar QR' : 'QR Code'}</span>
                      </button>
                    </div>
                  </div>

                  {/* QR Code display */}
                  {selectedChild?.id === child.id && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem', animation: 'fadeIn 0.3s ease-out' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
                        Apresente este QR Code para o voluntário realizar o check-in/check-out.
                      </span>
                      <div className="qr-placeholder">
                        <img 
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(JSON.stringify({ parentId: user.uid, childId: child.id, childName: child.nome }))}`} 
                          alt="QR Code do Filho" 
                        />
                      </div>
                      <strong style={{ fontSize: '0.9rem', color: 'var(--accent-primary)' }}>{child.nome}</strong>
                    </div>
                  )}

                  {/* Authorized Persons Section */}
                  <div style={{ borderTop: '1px solid var(--border-color)', marginTop: '0.75rem', paddingTop: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <button 
                        type="button" 
                        onClick={() => {
                          if (activeAuthChildId === child.id) {
                            setActiveAuthChildId(null);
                            setShowAddAuthForm(false);
                          } else {
                            setActiveAuthChildId(child.id);
                            setShowAddAuthForm(false);
                          }
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: activeAuthChildId === child.id ? 'var(--accent-primary)' : 'var(--text-secondary)',
                          fontSize: '0.8rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          padding: 0
                        }}
                      >
                        <Users size={14} />
                        <span>Autorizados a retirar ({getAuthorizedForChild(child.id).length})</span>
                      </button>

                      {activeAuthChildId === child.id && !showAddAuthForm && (
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={() => setShowAddAuthForm(true)}
                          style={{ width: 'auto', padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                        >
                          <Plus size={12} />
                          <span>Adicionar</span>
                        </button>
                      )}
                    </div>

                    {activeAuthChildId === child.id && (
                      <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', animation: 'fadeIn 0.2s ease-out' }}>
                        {/* List current authorized */}
                        {getAuthorizedForChild(child.id).length === 0 && !showAddAuthForm && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                            Nenhum terceiro autorizado cadastrado para esta criança.
                          </span>
                        )}

                        {getAuthorizedForChild(child.id).map(auth => (
                          <div key={auth.id} style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            background: 'rgba(255,255,255,0.02)',
                            border: '1px solid rgba(255,255,255,0.05)',
                            padding: '0.5rem',
                            borderRadius: '8px'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              {auth.selfie ? (
                                <img src={auth.selfie} alt={auth.nome} style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} />
                              ) : (
                                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <User size={14} style={{ color: 'var(--text-secondary)' }} />
                                </div>
                              )}
                              <div>
                                <span style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block' }}>{auth.nome}</span>
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{auth.parentesco} {auth.documento && `| Doc: ${auth.documento}`}</span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeleteAuthorized(auth.id)}
                              style={{ background: 'none', border: 'none', color: '#f43f5e', cursor: 'pointer', padding: '0.25rem' }}
                              title="Remover"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}

                        {/* Add form */}
                        {showAddAuthForm && (
                          <form onSubmit={handleAddAuthorized} style={{
                            background: 'rgba(255,255,255,0.01)',
                            border: '1px solid var(--border-color)',
                            padding: '0.75rem',
                            borderRadius: '8px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.5rem'
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <strong style={{ fontSize: '0.8rem', color: 'var(--accent-primary)' }}>Novo Autorizado</strong>
                              <X size={16} style={{ cursor: 'pointer', color: 'var(--text-secondary)' }} onClick={() => setShowAddAuthForm(false)} />
                            </div>

                            <div className="form-group" style={{ margin: 0 }}>
                              <label className="form-label" style={{ fontSize: '0.7rem' }}>Nome Completo</label>
                              <input 
                                type="text" 
                                className="form-input" 
                                style={{ padding: '0.35rem 0.5rem', fontSize: '0.8rem' }}
                                value={authName}
                                onChange={e => setAuthName(e.target.value)}
                                required 
                              />
                            </div>

                            <div className="form-group" style={{ margin: 0 }}>
                              <label className="form-label" style={{ fontSize: '0.7rem' }}>Parentesco</label>
                              <select 
                                className="form-input" 
                                style={{ padding: '0.35rem 0.5rem', fontSize: '0.8rem', background: 'var(--bg-secondary)' }}
                                value={authRelationship}
                                onChange={e => setAuthRelationship(e.target.value)}
                              >
                                <option value="Avô / Avó">Avô / Avó</option>
                                <option value="Tio / Tia">Tio / Tia</option>
                                <option value="Irmão / Irmã">Irmão / Irmã</option>
                                <option value="Padrasto / Madrasta">Padrasto / Madrasta</option>
                                <option value="Amigo(a)">Amigo(a)</option>
                                <option value="Outro">Outro</option>
                              </select>
                            </div>

                            <div className="form-group" style={{ margin: 0 }}>
                              <label className="form-label" style={{ fontSize: '0.7rem' }}>Telefone</label>
                              <input 
                                type="text" 
                                className="form-input" 
                                style={{ padding: '0.35rem 0.5rem', fontSize: '0.8rem' }}
                                value={authPhone}
                                onChange={e => setAuthPhone(e.target.value)}
                                placeholder="Opcional"
                              />
                            </div>

                            <div className="form-group" style={{ margin: 0 }}>
                              <label className="form-label" style={{ fontSize: '0.7rem' }}>Documento (RG ou CPF)</label>
                              <input 
                                type="text" 
                                className="form-input" 
                                style={{ padding: '0.35rem 0.5rem', fontSize: '0.8rem' }}
                                value={authDoc}
                                onChange={e => setAuthDoc(e.target.value)}
                                placeholder="Opcional"
                              />
                            </div>

                            {/* Camera Selfie capture */}
                            <div className="form-group" style={{ margin: 0 }}>
                              <label className="form-label" style={{ fontSize: '0.7rem' }}>Foto / Selfie (Opcional)</label>
                              {authSelfie ? (
                                <div style={{ position: 'relative', width: '80px', height: '80px', margin: '0.25rem 0' }}>
                                  <img src={authSelfie} alt="Selfie do Autorizado" style={{ width: '80px', height: '80px', borderRadius: '8px', objectFit: 'cover', border: '1px solid var(--accent-primary)' }} />
                                  <button 
                                    type="button"
                                    onClick={() => setAuthSelfie('')}
                                    style={{
                                      position: 'absolute',
                                      top: '-6px',
                                      right: '-6px',
                                      background: '#f43f5e',
                                      border: 'none',
                                      borderRadius: '50%',
                                      color: '#fff',
                                      cursor: 'pointer',
                                      width: '18px',
                                      height: '18px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center'
                                    }}
                                  >
                                    <X size={10} />
                                  </button>
                                </div>
                              ) : (
                                <SelfieCapture onCapture={(photo) => setAuthSelfie(photo)} />
                              )}
                            </div>

                            <button 
                              type="submit" 
                              className="btn btn-primary" 
                              style={{ padding: '0.4rem', fontSize: '0.8rem', marginTop: '0.25rem' }}
                              disabled={savingAuth}
                            >
                              <span>{savingAuth ? 'Salvando...' : 'Salvar Autorização'}</span>
                            </button>
                          </form>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Diário de Bordo do Culto (Feedback para os Pais) */}
                  <div style={{ borderTop: '1px solid var(--border-color)', marginTop: '0.75rem', paddingTop: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem' }}>
                      <BookOpen size={14} style={{ color: 'var(--accent-primary)' }} />
                      <strong style={{ fontSize: '0.8rem', color: '#fff' }}>Diário de Bordo do Culto</strong>
                    </div>

                    {!diariosByChild[child.id] || diariosByChild[child.id].length === 0 ? (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                        Nenhuma observação registrada pela equipe no último culto.
                      </span>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        {diariosByChild[child.id].slice(0, 2).map(log => (
                          <div key={log.id} style={{ background: 'rgba(255,255,255,0.02)', padding: '0.5rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>
                              {new Date(log.data_registro || log.created_at || Date.now()).toLocaleDateString('pt-BR')} • Tia/Tio: {log.voluntario?.nome || 'Equipe'}
                            </div>
                            {log.tags && log.tags.length > 0 && (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginBottom: '0.2rem' }}>
                                {log.tags.map((t, idx) => (
                                  <span key={idx} style={{ fontSize: '0.65rem', background: 'rgba(14, 165, 233, 0.15)', color: '#7dd3fc', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>
                                    {t}
                                  </span>
                                ))}
                              </div>
                            )}
                            {log.observacoes && (
                              <p style={{ margin: 0, fontSize: '0.75rem', color: '#fff' }}>{log.observacoes}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      ) : (
        <SocialWall user={user} />
      )}

      {/* MODAL DE EDIÇÃO DE FILHO */}
      {editingChild && (
        <div className="modal-overlay" style={{ animation: 'fadeIn 0.2s ease-out' }}>
          <div className="modal-content" style={{ maxWidth: '520px', width: '95%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Edit3 className="accent-text" size={20} />
                <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Editar Dados de {editingChild.nome}</h3>
              </div>
              <button 
                type="button"
                className="btn-icon" 
                onClick={() => setEditingChild(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveChildEdit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Foto / Selfie de Identificação</label>
                <SelfieCapture 
                  onCapture={(photoData) => setEditChildSelfie(photoData)} 
                  initialImage={editChildSelfie}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Nome Completo da Criança *</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={editChildName} 
                  onChange={(e) => setEditChildName(e.target.value)} 
                  required 
                />
              </div>

              <div className="grid-2-col">
                <div className="form-group">
                  <label className="form-label">Data de Nascimento *</label>
                  <input 
                    type="date" 
                    className="form-input" 
                    value={editChildBirthdate} 
                    onChange={(e) => setEditChildBirthdate(e.target.value)} 
                    required 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Apelido (opcional)</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={editChildNickname} 
                    onChange={(e) => setEditChildNickname(e.target.value)} 
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Alergias ou Restrições Alimentares</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Ex: Leite, Amendoim, Nenhuma..."
                  value={editChildAlergias} 
                  onChange={(e) => setEditChildAlergias(e.target.value)} 
                />
              </div>

              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', fontWeight: 600 }}>
                  <input 
                    type="checkbox" 
                    checked={editNeurodivergente} 
                    onChange={(e) => setEditNeurodivergente(e.target.checked)} 
                  />
                  <span>A criança possui necessidades especiais ou neurodivergência? (ex: Autismo, TDAH)</span>
                </label>

                {editNeurodivergente && (
                  <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="Qual a condição / diagnóstico?"
                      value={editNeurodivergenciaDetalhe} 
                      onChange={(e) => setEditNeurodivergenciaDetalhe(e.target.value)} 
                    />
                    <textarea 
                      className="form-input" 
                      placeholder="Dicas para a equipe acalmar ou acolher a criança melhor..."
                      value={editComoAcalmar} 
                      onChange={(e) => setEditComoAcalmar(e.target.value)} 
                      rows={2}
                    />
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  disabled={savingChildEdit} 
                  style={{ flex: 2 }}
                >
                  {savingChildEdit ? 'Salvando...' : 'Salvar Alterações'}
                </button>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => handleDeleteChildClick(editingChild.id, editingChild.nome)} 
                  style={{ flex: 1, borderColor: '#ef4444', color: '#ef4444' }}
                >
                  <Trash2 size={16} />
                  <span>Excluir</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditProfile && (
        <EditProfileModal user={user} onClose={() => setShowEditProfile(false)} />
      )}
    </div>
  );
}
