import React, { useState, useEffect } from 'react';
import { 
  X, 
  User, 
  Phone, 
  Heart, 
  Smile, 
  Calendar, 
  Users, 
  UserCheck, 
  AlertCircle, 
  MessageCircle,
  Clock,
  Sparkles,
  Gift,
  AlertTriangle,
  BookOpen,
  Plus,
  Send,
  PhoneCall
} from 'lucide-react';
import { supabase, obterEstatisticasFilho, saveDiarioBordo, getDiarioBordoByFilho } from '../services/supabase';
import EmergencyCallModal from './EmergencyCallModal';

export default function ChildDetailsModal({ child, parent, voluntarioId, onClose }) {
  const [authorizedList, setAuthorizedList] = useState([]);
  const [stats, setStats] = useState(null);
  const [diarioLogs, setDiarioLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Diário de Bordo Form State
  const [showAddDiario, setShowAddDiario] = useState(false);
  const [selectedTags, setSelectedTags] = useState([]);
  const [obsDiario, setObsDiario] = useState('');
  const [savingDiario, setSavingDiario] = useState(false);

  // Emergency Modal State
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);

  const availableTags = [
    '🍎 Lanchou bem',
    '🎨 Participou das atividades',
    '💚 Ficou muito calmo',
    '💧 Chorou no início',
    '💤 Dormiu um pouco',
    '🤝 Fez novos amiguinhos'
  ];

  useEffect(() => {
    if (!child?.id) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        // Buscar estatísticas de presença
        const statsData = await obterEstatisticasFilho(child.id);
        setStats(statsData);

        // Buscar autorizados a retirar
        const { data: authData, error: authError } = await supabase
          .from('autorizados_retirada')
          .select('*')
          .eq('filho_id', child.id);

        if (!authError && authData) {
          setAuthorizedList(authData);
        }

        // Buscar diário de bordo
        const logs = await getDiarioBordoByFilho(child.id);
        setDiarioLogs(logs);
      } catch (err) {
        console.error("Erro ao carregar detalhes da criança:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [child]);

  const checarAniversario = (dataNasc) => {
    if (!dataNasc) return null;
    const hoje = new Date();
    const nascido = new Date(dataNasc);
    const mHoje = hoje.getMonth();
    const mNasc = nascido.getMonth();
    const dHoje = hoje.getDate();
    const dNasc = nascido.getDate();

    if (mHoje === mNasc) {
      if (dHoje === dNasc) return { tipo: 'hoje', texto: '🎂 É HOJE! Feliz Aniversário!' };
      const diffDias = Math.abs(dHoje - dNasc);
      if (diffDias <= 7) return { tipo: 'semana', texto: `🎉 Aniversariante da Semana! (${dNasc}/${mNasc + 1})` };
      return { tipo: 'mes', texto: `🎈 Aniversariante do Mês! (${dNasc}/${mNasc + 1})` };
    }
    return null;
  };

  const niverInfo = checarAniversario(child?.data_nascimento);

  const toggleTag = (tag) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleSaveDiario = async (e) => {
    e.preventDefault();
    if (!voluntarioId) {
      alert('Você precisa estar logado como voluntário para registrar o diário de bordo.');
      return;
    }

    setSavingDiario(true);
    try {
      await saveDiarioBordo(child.id, voluntarioId, selectedTags, obsDiario);
      const updatedLogs = await getDiarioBordoByFilho(child.id);
      setDiarioLogs(updatedLogs);
      setSelectedTags([]);
      setObsDiario('');
      setShowAddDiario(false);
    } catch (err) {
      alert('Erro ao salvar diário de bordo: ' + err.message);
    } finally {
      setSavingDiario(false);
    }
  };

  // Função para calcular a idade a partir da data de nascimento
  const calcularIdade = (dataNasc) => {
    if (!dataNasc) return null;
    const hoje = new Date();
    const nascido = new Date(dataNasc);
    let idade = hoje.getFullYear() - nascido.getFullYear();
    const m = hoje.getMonth() - nascido.getMonth();
    if (m < 0 || (m === 0 && hoje.getDate() < nascido.getDate())) {
      idade--;
    }
    return idade > 0 ? `${idade} anos` : 'Menos de 1 ano';
  };

  const idadeTexto = calcularIdade(child?.data_nascimento);

  // Link do WhatsApp com mensagem pré-formatada
  const msgWpp = encodeURIComponent(`Olá, ${parent?.nome || 'Responsável'}! Sou voluntário(a) da Igreja da Criança AD Madureira e estou acompanhando o(a) ${child?.nome}. Gostaria de falar com você.`);
  const wppLink = parent?.telefone ? `https://wa.me/55${parent.telefone.replace(/\D/g, '')}?text=${msgWpp}` : null;

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(6px)',
        zIndex: 1000,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '1rem'
      }}
      onClick={onClose}
    >
      <div 
        style={{
          maxWidth: '520px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          background: 'var(--bg-card)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '1.5rem',
          borderRadius: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.15rem',
          boxShadow: '0 20px 30px rgba(0,0,0,0.5)',
          position: 'relative'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header do Modal */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', paddingBottom: '0.75rem' }}>
          <h2 className="heading-font" style={{ fontSize: '1.15rem', margin: 0, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Smile size={20} style={{ color: 'var(--accent-primary)' }} />
            <span>Ficha da Criança</span>
          </h2>
          <button 
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.2rem', padding: '4px' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* BANNER DE ANIVERSÁRIO (SE HOUVER) */}
        {niverInfo && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.2) 0%, rgba(168, 85, 247, 0.2) 100%)',
            border: '1px solid rgba(236, 72, 153, 0.4)',
            padding: '0.75rem 1rem',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            color: '#f472b6',
            boxShadow: '0 4px 12px rgba(236, 72, 153, 0.15)'
          }}>
            <Gift size={22} style={{ color: '#ec4899', shrink: 0 }} />
            <div>
              <strong style={{ fontSize: '0.85rem', display: 'block', color: '#fff' }}>{niverInfo.texto}</strong>
              <span style={{ fontSize: '0.75rem', color: '#fbcfe8' }}>Lembre-se de parabenizar a criança e os pais! 🎈</span>
            </div>
          </div>
        )}

        {/* Header da Criança (Foto e Nome) */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
          {child?.selfie ? (
            <img 
              src={child.selfie} 
              alt={child.nome} 
              style={{
                width: '110px',
                height: '110px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '3px solid var(--accent-primary)',
                boxShadow: '0 6px 16px rgba(0,0,0,0.3)'
              }}
            />
          ) : (
            <div style={{
              width: '110px',
              height: '110px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '2px dashed rgba(255, 255, 255, 0.15)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              color: 'var(--text-secondary)'
            }}>
              <User size={36} style={{ opacity: 0.5 }} />
              <span style={{ fontSize: '0.7rem', marginTop: '0.2rem' }}>Sem Foto</span>
            </div>
          )}
          <h3 className="heading-font" style={{ fontSize: '1.25rem', color: '#fff', margin: 0, textAlign: 'center' }}>
            {child?.nome}
          </h3>
          {child?.apelido && (
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.05)', padding: '2px 10px', borderRadius: '12px' }}>
              Chamado(a) carinhosamente de: <strong style={{ color: '#fff' }}>"{child.apelido}"</strong>
            </span>
          )}
          {idadeTexto && (
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <Calendar size={14} /> Idade: <strong style={{ color: '#fff' }}>{idadeTexto}</strong>
            </span>
          )}

          {/* BOTÃO DE CHAMADA DE EMERGÊNCIA */}
          <button
            onClick={() => setShowEmergencyModal(true)}
            className="btn"
            style={{
              marginTop: '0.4rem',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid #ef4444',
              color: '#fca5a5',
              fontSize: '0.8rem',
              padding: '0.4rem 0.8rem',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              cursor: 'pointer'
            }}
          >
            <PhoneCall size={16} />
            <span>Chamar Pais Urgentemente</span>
          </button>
        </div>

        {/* SEÇÃO 1: CUIDADOS ESPECIAIS E COMO ACALMAR */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          borderRadius: '14px',
          padding: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem'
        }}>
          <h4 style={{ fontSize: '0.9rem', color: 'var(--accent-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Heart size={16} />
            <span>Informações de Apoio ao Voluntário</span>
          </h4>

          {/* Neurodivergência */}
          {child?.neurodivergente ? (
            <div style={{
              background: 'rgba(245, 158, 11, 0.12)',
              border: '1px solid rgba(245, 158, 11, 0.25)',
              color: '#fbbf24',
              padding: '0.75rem',
              borderRadius: '10px',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.25rem'
            }}>
              <span style={{ fontWeight: 700, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Sparkles size={16} /> Neurodivergente
              </span>
              <p style={{ margin: 0, fontSize: '0.8rem', lineHeight: '1.4', color: '#fef08a' }}>
                {child.neurodivergencia_detalhe || 'Diagnóstico/Atendimento Especializado informado pelo responsável.'}
              </p>
            </div>
          ) : (
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              • Neurodivergência: Não especificada
            </span>
          )}

          {/* Como Acalmar a Criança */}
          <div style={{
            background: child?.como_acalmar ? 'rgba(99, 102, 241, 0.08)' : 'rgba(255,255,255,0.02)',
            border: child?.como_acalmar ? '1px solid rgba(99, 102, 241, 0.2)' : '1px solid rgba(255,255,255,0.04)',
            padding: '0.75rem',
            borderRadius: '10px'
          }}>
            <strong style={{ fontSize: '0.8rem', color: '#fff', display: 'block', marginBottom: '0.3rem' }}>
              💡 Como acalmar ou interagir com a criança:
            </strong>
            <p style={{ margin: 0, fontSize: '0.8rem', color: child?.como_acalmar ? '#c7d2fe' : 'var(--text-secondary)', fontStyle: child?.como_acalmar ? 'normal' : 'italic', lineHeight: '1.4' }}>
              {child?.como_acalmar ? `"${child.como_acalmar}"` : 'Nenhuma recomendação de como acalmar preenchida.'}
            </p>
          </div>
        </div>

        {/* SEÇÃO 2: DIÁRIO DE BORDO (FEEDBACK PÓS-CULTO) */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          borderRadius: '14px',
          padding: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 style={{ fontSize: '0.9rem', color: 'var(--accent-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <BookOpen size={16} />
              <span>Diário de Bordo ({diarioLogs.length})</span>
            </h4>
            <button
              onClick={() => setShowAddDiario(!showAddDiario)}
              className="btn"
              style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem', background: 'rgba(14, 165, 233, 0.15)', color: 'var(--accent-primary)' }}
            >
              {showAddDiario ? 'Cancelar' : '+ Registrar Hoje'}
            </button>
          </div>

          {/* Form para adicionar Diário */}
          {showAddDiario && (
            <form onSubmit={handleSaveDiario} style={{ background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Selecione as observações do culto de hoje:</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {availableTags.map((tag, idx) => (
                  <button
                    type="button"
                    key={idx}
                    onClick={() => toggleTag(tag)}
                    style={{
                      fontSize: '0.7rem',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '6px',
                      border: selectedTags.includes(tag) ? '1px solid var(--accent-primary)' : '1px solid rgba(255,255,255,0.1)',
                      background: selectedTags.includes(tag) ? 'rgba(14, 165, 233, 0.25)' : 'rgba(255,255,255,0.03)',
                      color: selectedTags.includes(tag) ? '#fff' : 'var(--text-secondary)',
                      cursor: 'pointer'
                    }}
                  >
                    {tag}
                  </button>
                ))}
              </div>

              <textarea
                placeholder="Observação detalhada (opcional)..."
                value={obsDiario}
                onChange={(e) => setObsDiario(e.target.value)}
                className="form-input"
                style={{ fontSize: '0.75rem', height: '50px', padding: '0.4rem' }}
              />

              <button
                type="submit"
                className="btn btn-primary"
                disabled={savingDiario}
                style={{ padding: '0.4rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}
              >
                {savingDiario ? 'Salvando...' : <><Send size={14} /> Salvar Registro</>}
              </button>
            </form>
          )}

          {/* Histórico do Diário */}
          {diarioLogs.length === 0 ? (
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
              Nenhum registro no diário de bordo ainda.
            </span>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '140px', overflowY: 'auto' }}>
              {diarioLogs.map(log => (
                <div key={log.id} style={{ background: 'rgba(255,255,255,0.03)', padding: '0.5rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>
                    <span>{new Date(log.created_at).toLocaleDateString('pt-BR')}</span>
                    <span>Voluntário(a): {log.voluntario?.nome || 'Equipe'}</span>
                  </div>
                  {log.tags && log.tags.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.2rem', marginBottom: '0.2rem' }}>
                      {log.tags.map((t, idx) => (
                        <span key={idx} style={{ fontSize: '0.65rem', background: 'rgba(14, 165, 233, 0.15)', color: '#7dd3fc', padding: '0.1rem 0.35rem', borderRadius: '4px' }}>
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

        {/* SEÇÃO 3: DADOS DO RESPONSÁVEL E WHATSAPP */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          borderRadius: '14px',
          padding: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem'
        }}>
          <h4 style={{ fontSize: '0.9rem', color: 'var(--accent-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Users size={16} />
            <span>Contato dos Responsáveis</span>
          </h4>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff', display: 'block' }}>
                {parent?.nome || 'Responsável cadastrado'}
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Telefone: {parent?.telefone || 'Não informado'}
              </span>
            </div>

            {wppLink && (
              <a
                href={wppLink}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: '#fff',
                  padding: '8px 14px',
                  borderRadius: '10px',
                  textDecoration: 'none',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  boxShadow: '0 4px 10px rgba(16, 185, 129, 0.25)'
                }}
              >
                <MessageCircle size={16} />
                <span>Chamar no WhatsApp</span>
              </a>
            )}
          </div>
        </div>

        {/* SEÇÃO 4: PESSOAS AUTORIZADAS A RETIRAR */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          borderRadius: '14px',
          padding: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem'
        }}>
          <h4 style={{ fontSize: '0.9rem', color: 'var(--accent-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <UserCheck size={16} />
            <span>Pessoas Autorizadas a Retirar ({authorizedList.length})</span>
          </h4>

          {authorizedList.length === 0 ? (
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
              Apenas os responsáveis diretos têm permissão para retirada.
            </span>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {authorizedList.map(auth => (
                <div key={auth.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.65rem',
                  background: 'rgba(255,255,255,0.03)',
                  padding: '0.6rem',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.05)'
                }}>
                  {auth.selfie ? (
                    <img src={auth.selfie} alt={auth.nome} style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <User size={16} style={{ color: 'var(--text-secondary)' }} />
                    </div>
                  )}
                  <div>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#fff', display: 'block' }}>{auth.nome}</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                      Parentesco: {auth.parentesco} {auth.documento && `| Doc: ${auth.documento}`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SEÇÃO 5: HISTÓRICO E FREQUÊNCIA DA CRIANÇA */}
        {stats && (
          <div style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            borderRadius: '14px',
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.4rem',
            fontSize: '0.8rem',
            color: 'var(--text-secondary)'
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Clock size={14} style={{ color: 'var(--accent-primary)' }} />
              Frequência Total: <strong style={{ color: '#fff' }}>{stats.totalCheckins} cultos presenciais</strong>
            </span>
            {stats.ultimoCheckin && (
              <span>
                • Último check-in antes de hoje: <strong style={{ color: '#fff' }}>{new Date(stats.ultimoCheckin).toLocaleDateString('pt-BR')} ({stats.diasAusente} dias)</strong>
              </span>
            )}
          </div>
        )}

        <button 
          className="btn btn-secondary" 
          onClick={onClose} 
          style={{ width: '100%', padding: '10px', fontSize: '0.85rem', marginTop: '0.25rem' }}
        >
          Fechar Ficha
        </button>

        {/* MODAL DE CHAMADA DE EMERGÊNCIA */}
        {showEmergencyModal && (
          <EmergencyCallModal
            child={child}
            parent={parent}
            voluntarioId={voluntarioId}
            onClose={() => setShowEmergencyModal(false)}
            onSuccess={() => {
              alert('Chamada de emergência disparada com sucesso!');
              setShowEmergencyModal(false);
            }}
          />
        )}
      </div>
    </div>
  );
}
