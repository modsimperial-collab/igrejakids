import React, { useState } from 'react';
import { X, AlertTriangle, Bell, PhoneCall } from 'lucide-react';
import { solicitarChamadaEmergencia } from '../services/supabase';

export default function EmergencyCallModal({ child, parent, voluntarioId, onClose, onSuccess }) {
  const [motivo, setMotivo] = useState('Choro persistente e necessidade de acolhimento dos pais');
  const [motivoPersonalizado, setMotivoPersonalizado] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const motivosPredefinidos = [
    'Choro persistente e necessidade de acolhimento dos pais',
    'Necessidade de troca de fralda ou banheiro',
    'Sintoma de indisposição / mal-estar',
    'Criança chamando pelos pais ativamente',
    'Outro motivo (Especifique)'
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    const motivoFinal = motivo === 'Outro motivo (Especifique)' ? motivoPersonalizado : motivo;
    
    if (!motivoFinal) {
      setError('Por favor, especifique o motivo da chamada.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const childId = child?.id || child?.filho?.id;
      const respId = child?.responsavel_id || child?.responsavel?.uid || parent?.uid || parent?.id || child?.filho?.responsavel_id;

      await solicitarChamadaEmergencia(
        childId,
        respId,
        voluntarioId,
        motivoFinal
      );

      // Também abre o WhatsApp com a mensagem de aviso urgente
      const telefone = child?.responsavel?.telefone || parent?.telefone;
      const childName = child?.nome || child?.filho?.nome || 'sua criança';
      if (telefone) {
        const cleanPhone = telefone.replace(/\D/g, '');
        const mensagem = `🚨 *IGREJA KIDS - AVISO URGENTE*\nOlá! Solicitamos a sua presença na salinha do Igreja Kids para acompanhar o(a) filho(a) *${childName}*.\n\n*Motivo:* ${motivoFinal}`;
        window.open(`https://wa.me/55${cleanPhone}?text=${encodeURIComponent(mensagem)}`, '_blank');
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || 'Erro ao emitir chamada de emergência.');
    } finally {
      setLoading(false);
    }
  };

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
        border: '1.5px solid #ef4444',
        borderRadius: '16px',
        maxWidth: '480px',
        width: '100%',
        padding: '1.5rem',
        boxShadow: '0 20px 25px -5px rgba(239, 68, 68, 0.3)',
        animation: 'fadeIn 0.2s ease-out'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', padding: '0.5rem', borderRadius: '10px' }}>
              <AlertTriangle size={22} />
            </div>
            <div>
              <h3 className="heading-font" style={{ margin: 0, fontSize: '1.1rem', color: '#fff' }}>Solicitar Presença do Responsável</h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Criança: <strong>{child.nome || child.filho?.nome}</strong></span>
            </div>
          </div>
          <button 
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.3rem' }}
          >
            <X size={20} />
          </button>
        </div>

        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#fca5a5', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Selecione o Motivo da Chamada</label>
            <select
              className="form-input"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              style={{ background: 'var(--bg-input)', color: '#fff', appearance: 'auto' }}
            >
              {motivosPredefinidos.map((m, idx) => (
                <option key={idx} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {motivo === 'Outro motivo (Especifique)' && (
            <div className="form-group">
              <label className="form-label">Descreva o Motivo</label>
              <textarea
                className="form-input"
                placeholder="Explique resumidamente o motivo..."
                value={motivoPersonalizado}
                onChange={(e) => setMotivoPersonalizado(e.target.value)}
                rows={3}
                style={{ height: 'auto', padding: '0.6rem' }}
                required
              />
            </div>
          )}

          <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
            <p style={{ margin: 0, fontSize: '0.75rem', color: '#fca5a5', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Bell size={14} />
              <span>Esta ação exibirá um alerta em tempo real no app do pai e enviará uma mensagem no WhatsApp.</span>
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button
              type="button"
              className="btn"
              onClick={onClose}
              style={{ flex: 1, background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn"
              disabled={loading}
              style={{ flex: 2, background: '#ef4444', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontWeight: 600 }}
            >
              {loading ? (
                <div className="spinner" style={{ width: '18px', height: '18px' }}></div>
              ) : (
                <>
                  <PhoneCall size={18} />
                  <span>Disparar Chamada Urgente</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
