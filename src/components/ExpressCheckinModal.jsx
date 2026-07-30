import React, { useState } from 'react';
import { X, UserCheck, User, Phone, Calendar, Sparkles, Camera } from 'lucide-react';
import { cadastrarFilhoExpressVisitante } from '../services/supabase';
import SelfieCapture from './SelfieCapture';

export default function ExpressCheckinModal({ voluntarioId, onClose, onSuccess }) {
  const [childName, setChildName] = useState('');
  const [childBirthdate, setChildBirthdate] = useState('');
  const [parentName, setParentName] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [parentFoto, setParentFoto] = useState(null);
  const [childFoto, setChildFoto] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!childName || !parentName || !parentPhone) {
      setError('Preencha o nome da criança, nome do responsável e telefone.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await cadastrarFilhoExpressVisitante({
        nome: childName,
        dataNascimento: childBirthdate,
        responsavelNome: parentName,
        responsavelTelefone: parentPhone,
        responsavelFoto: parentFoto,
        filhoFoto: childFoto,
        voluntarioId
      });

      if (onSuccess) onSuccess(result);
      onClose();
    } catch (err) {
      setError(err.message || 'Erro ao realizar check-in express.');
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
        border: '1px solid rgba(14, 165, 233, 0.3)',
        borderRadius: '16px',
        maxWidth: '520px',
        maxHeight: '90vh',
        overflowY: 'auto',
        width: '100%',
        padding: '1.5rem',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        animation: 'fadeIn 0.2s ease-out'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ background: 'rgba(14, 165, 233, 0.15)', color: 'var(--accent-primary)', padding: '0.5rem', borderRadius: '10px' }}>
              <Sparkles size={20} />
            </div>
            <div>
              <h3 className="heading-font" style={{ margin: 0, fontSize: '1.1rem', color: '#fff' }}>Check-in Express (Visitantes)</h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Cadastro ultra-rápido para primeira vez</span>
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
            <label className="form-label">Nome da Criança *</label>
            <div className="input-wrapper">
              <input
                type="text"
                placeholder="Ex: Pedro Henrique"
                className="form-input"
                value={childName}
                onChange={(e) => setChildName(e.target.value)}
                required
              />
              <User className="input-icon" size={18} />
            </div>
          </div>

          <SelfieCapture
            label="Foto da Criança (Selfie)"
            initialValue={childFoto}
            onCapture={(photo) => setChildFoto(photo)}
          />

          <div className="form-group">
            <label className="form-label">Data de Nascimento (Opcional)</label>
            <div className="input-wrapper">
              <input
                type="date"
                className="form-input"
                value={childBirthdate}
                onChange={(e) => setChildBirthdate(e.target.value)}
                style={{ colorScheme: 'dark' }}
              />
              <Calendar className="input-icon" size={18} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Nome do Responsável *</label>
            <div className="input-wrapper">
              <input
                type="text"
                placeholder="Ex: Carlos Silva"
                className="form-input"
                value={parentName}
                onChange={(e) => setParentName(e.target.value)}
                required
              />
              <User className="input-icon" size={18} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Telefone / WhatsApp do Responsável *</label>
            <div className="input-wrapper">
              <input
                type="tel"
                placeholder="Ex: (11) 99999-8888"
                className="form-input"
                value={parentPhone}
                onChange={(e) => setParentPhone(e.target.value)}
                required
              />
              <Phone className="input-icon" size={18} />
            </div>
          </div>

          <SelfieCapture
            label="Foto do Responsável (Selfie)"
            initialValue={parentFoto}
            onCapture={(photo) => setParentFoto(photo)}
          />

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
              className="btn btn-primary"
              disabled={loading}
              style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
            >
              {loading ? (
                <div className="spinner" style={{ width: '18px', height: '18px' }}></div>
              ) : (
                <>
                  <UserCheck size={18} />
                  <span>Cadastrar & Check-in</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
