import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, RefreshCw, AlertCircle, CheckCircle, User, Check } from 'lucide-react';
import { getTodasEscalas, solicitarTrocaEscala, assumirTrocaEscala } from '../services/supabase';

export default function VolunteerScheduleModal({ voluntario, onClose }) {
  const [escalas, setEscalas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [obsTroca, setObsTroca] = useState('');
  const [selectedEscalaId, setSelectedEscalaId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchEscalas();
  }, []);

  const fetchEscalas = async () => {
    setLoading(true);
    try {
      const data = await getTodasEscalas();
      setEscalas(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSolicitarTroca = async (e) => {
    e.preventDefault();
    if (!selectedEscalaId) return;

    setSaving(true);
    try {
      await solicitarTrocaEscala(selectedEscalaId, obsTroca);
      setMessage('Solicitação de troca enviada com sucesso! A liderança e a equipe serão notificadas.');
      setSelectedEscalaId(null);
      setObsTroca('');
      fetchEscalas();
    } catch (err) {
      alert('Erro ao solicitar troca: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAssumirTroca = async (escalaId) => {
    if (!window.confirm("Deseja assumir esta escala no lugar do colega?")) return;
    setSaving(true);
    try {
      await assumirTrocaEscala(escalaId, voluntario.uid);
      setMessage('Você assumiu esta escala com sucesso! Obrigado pelo apoio.');
      fetchEscalas();
    } catch (err) {
      alert('Erro ao assumir troca: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const minhasEscalas = escalas.filter(e => e.voluntario?.uid === voluntario.uid);
  const outrasEscalas = escalas.filter(e => e.voluntario?.uid !== voluntario.uid);

  return (
    <div className="modal-overlay" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.85)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '1rem'
    }}>
      <div className="modal-content" style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        borderRadius: '16px',
        maxWidth: '540px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        padding: '1.5rem',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
        animation: 'fadeIn 0.2s ease-out'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ background: 'rgba(14, 165, 233, 0.15)', color: 'var(--accent-primary)', padding: '0.5rem', borderRadius: '10px' }}>
              <Calendar size={20} />
            </div>
            <div>
              <h3 className="heading-font" style={{ margin: 0, fontSize: '1.1rem', color: '#fff' }}>Escala de Voluntários</h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Verifique seus dias de serviço e solicite trocas</span>
            </div>
          </div>
          <button 
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.3rem' }}
          >
            <X size={20} />
          </button>
        </div>

        {message && (
          <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10b981', color: '#6ee7b7', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem' }}>
            {message}
          </div>
        )}

        {/* Minhas Escalas */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h4 style={{ fontSize: '0.9rem', color: 'var(--accent-primary)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Clock size={16} />
            <span>Meus Turnos Escalados</span>
          </h4>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '1rem' }}><div className="spinner"></div></div>
          ) : minhasEscalas.length === 0 ? (
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontStyle: 'italic', background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: '8px' }}>
              Você não possui escalas cadastradas para os próximos cultos.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {minhasEscalas.map(e => (
                <div key={e.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <strong style={{ color: '#fff', fontSize: '0.9rem' }}>
                        {new Date(e.data_culto + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
                      </strong>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                        Turno: <strong>{e.turno}</strong> | Função: <strong>{e.funcao}</strong>
                      </div>
                    </div>
                    {e.solicitou_troca ? (
                      <span style={{ fontSize: '0.7rem', background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', padding: '0.2rem 0.5rem', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <RefreshCw size={12} />
                        <span>Troca solicitada</span>
                      </span>
                    ) : (
                      <button
                        onClick={() => setSelectedEscalaId(selectedEscalaId === e.id ? null : e.id)}
                        className="btn"
                        style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', background: 'rgba(14, 165, 233, 0.15)', color: 'var(--accent-primary)' }}
                      >
                        Pedir Troca
                      </button>
                    )}
                  </div>

                  {/* Form de solicitação de troca */}
                  {selectedEscalaId === e.id && (
                    <form onSubmit={handleSolicitarTroca} style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px dashed var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Motivo da Solicitação de Troca:</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Ex: Viagem de trabalho / Imprevisto"
                        value={obsTroca}
                        onChange={(e) => setObsTroca(e.target.value)}
                        style={{ fontSize: '0.8rem', padding: '0.5rem' }}
                        required
                      />
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button type="button" className="btn" onClick={() => setSelectedEscalaId(null)} style={{ flex: 1, padding: '0.3rem', fontSize: '0.75rem' }}>Cancelar</button>
                        <button type="submit" className="btn btn-primary" disabled={saving} style={{ flex: 1, padding: '0.3rem', fontSize: '0.75rem' }}>
                          {saving ? 'Enviando...' : 'Confirmar Troca'}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quadro Geral de Escalas */}
        <div>
          <h4 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <User size={16} />
            <span>Escala Geral da Equipe</span>
          </h4>

          {outrasEscalas.length === 0 ? (
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>Nenhum outro voluntário escalado ainda.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '220px', overflowY: 'auto' }}>
              {outrasEscalas.map(e => (
                <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.15)', padding: '0.6rem 0.75rem', borderRadius: '8px', fontSize: '0.8rem' }}>
                  <div>
                    <strong style={{ color: '#fff' }}>{e.voluntario?.nome || 'Voluntário'}</strong>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block' }}>
                      {e.data_culto} ({e.turno}) - {e.funcao}
                    </span>
                    {e.observacao_troca && (
                      <span style={{ fontSize: '0.7rem', color: '#fbbf24', fontStyle: 'italic', display: 'block', marginTop: '0.1rem' }}>
                        Motivo: {e.observacao_troca}
                      </span>
                    )}
                  </div>
                  {e.solicitou_troca ? (
                    <button
                      onClick={() => handleAssumirTroca(e.id)}
                      disabled={saving}
                      className="btn btn-primary"
                      style={{ padding: '0.3rem 0.6rem', fontSize: '0.7rem', background: '#10b981', borderColor: '#10b981', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                    >
                      <Check size={12} />
                      <span>Assumir Turno</span>
                    </button>
                  ) : (
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', padding: '0.15rem 0.4rem', borderRadius: '4px', background: 'rgba(255,255,255,0.05)' }}>
                      Confirmado
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ marginTop: '1.2rem', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn" onClick={onClose} style={{ background: 'rgba(255,255,255,0.05)', color: '#fff' }}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
