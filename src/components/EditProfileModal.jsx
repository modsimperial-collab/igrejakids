import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import { X, User, Phone, MapPin, Camera, Save, Heart, Shield } from 'lucide-react';
import SelfieCapture from './SelfieCapture';
import DocumentUpload from './DocumentUpload';

export default function EditProfileModal({ user, onClose }) {
  const [nome, setNome] = useState(user?.nome || '');
  const [selfie, setSelfie] = useState(user?.selfie || null);
  
  // Responsavel fields
  const [telefone, setTelefone] = useState(user?.telefone || '');
  const [endereco, setEndereco] = useState(user?.endereco || '');
  const [membroIgreja, setMembroIgreja] = useState(user?.membro_igreja || false);
  const [nomeIgreja, setNomeIgreja] = useState(user?.nome_igreja || '');

  // Voluntario fields
  const [ministerio, setMinisterio] = useState(user?.ministerio || '');
  const [antecedentes, setAntecedentes] = useState(user?.antecedentes_criminais || null);

  const [saving, setSaving] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!nome.trim()) {
      alert('Por favor, informe seu nome completo.');
      return;
    }
    if (!selfie) {
      alert('Por favor, tire ou envie uma foto (selfie) para verificação visual.');
      return;
    }

    if (user.tipo_usuario === 'responsavel') {
      if (!telefone.trim() || !endereco.trim()) {
        alert('Por favor, informe telefone e endereço.');
        return;
      }
    } else if (user.tipo_usuario === 'voluntario') {
      if (!ministerio.trim()) {
        alert('Por favor, informe seu ministério ou igreja de origem.');
        return;
      }
      if (!antecedentes) {
        alert('É obrigatório anexar a Certidão de Antecedentes Criminais.');
        return;
      }
    }

    setSaving(false);
    
    // Confirmação do usuário
    const confirmEdits = window.confirm(
      'Atenção: Ao salvar as alterações de perfil, sua conta precisará ser aprovada novamente pelo Administrador por motivos de segurança. Você ficará temporariamente sem acesso até a aprovação. Deseja continuar?'
    );
    if (!confirmEdits) return;

    setSaving(true);

    try {
      const updateData = {
        nome,
        selfie,
        aprovado: false, // Envia de volta para aprovação do admin
      };

      if (user.tipo_usuario === 'responsavel') {
        updateData.telefone = telefone;
        updateData.endereco = endereco;
        updateData.membro_igreja = membroIgreja;
        updateData.nome_igreja = membroIgreja ? nomeIgreja : '';
      } else if (user.tipo_usuario === 'voluntario') {
        updateData.ministerio = ministerio;
        updateData.antecedentes_criminais = antecedentes;
      }

      const { error } = await supabase
        .from('usuarios')
        .update(updateData)
        .eq('uid', user.uid);

      if (error) throw error;

      alert('Perfil atualizado com sucesso! Aguarde a aprovação do administrador.');
      onClose();
    } catch (err) {
      console.error('Erro ao atualizar perfil:', err);
      alert('Erro ao atualizar perfil: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(15, 23, 42, 0.85)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '1rem',
      overflowY: 'auto'
    }} onClick={onClose}>
      <div style={{
        width: '100%',
        maxWidth: '480px',
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
      }} onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <User size={18} style={{ color: 'var(--accent-primary)' }} />
            <h2 className="heading-font" style={{ fontSize: '1.1rem', margin: 0, color: '#fff' }}>Editar Perfil</h2>
          </div>
          <button 
            onClick={onClose} 
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.2rem' }}
            disabled={saving}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          {/* Nome Completo */}
          <div className="form-group">
            <label className="form-label">Nome Completo</label>
            <input
              type="text"
              className="form-input"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Digite seu nome completo"
              required
              disabled={saving}
            />
          </div>

          {/* Telefone e Endereço para Responsável */}
          {user.tipo_usuario === 'responsavel' && (
            <>
              <div className="form-group">
                <label className="form-label">Telefone (WhatsApp)</label>
                <input
                  type="tel"
                  className="form-input"
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  placeholder="(00) 00000-0000"
                  required
                  disabled={saving}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Endereço Residencial</label>
                <input
                  type="text"
                  className="form-input"
                  value={endereco}
                  onChange={(e) => setEndereco(e.target.value)}
                  placeholder="Rua, Número, Bairro"
                  required
                  disabled={saving}
                />
              </div>

              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                  <input
                    type="checkbox"
                    checked={membroIgreja}
                    onChange={(e) => setMembroIgreja(e.target.checked)}
                    disabled={saving}
                  />
                  <span>Sou membro da Assembleia de Deus</span>
                </label>
              </div>

              {membroIgreja && (
                <div className="form-group">
                  <label className="form-label">Qual congregação/igreja?</label>
                  <input
                    type="text"
                    className="form-input"
                    value={nomeIgreja}
                    onChange={(e) => setNomeIgreja(e.target.value)}
                    placeholder="Ex: Templo Sede, Setor 4..."
                    required
                    disabled={saving}
                  />
                </div>
              )}
            </>
          )}

          {/* Ministério para Voluntário */}
          {user.tipo_usuario === 'voluntario' && (
            <>
              <div className="form-group">
                <label className="form-label">Ministério ou Igreja de Origem</label>
                <input
                  type="text"
                  className="form-input"
                  value={ministerio}
                  onChange={(e) => setMinisterio(e.target.value)}
                  placeholder="Ex: Ministério Infantil Sede, Igreja Parceira X..."
                  required
                  disabled={saving}
                />
              </div>

              <DocumentUpload
                label="Certidão de Antecedentes Criminais"
                onUpload={setAntecedentes}
                initialValue={antecedentes}
                required={true}
                disabled={saving}
              />
            </>
          )}

          {/* Selfie Capture */}
          <div style={{ marginTop: '0.25rem' }}>
            <label className="form-label" style={{ marginBottom: '0.4rem', display: 'block' }}>Minha Foto (Selfie)</label>
            <SelfieCapture onCapture={setSelfie} initialValue={selfie} />
          </div>

          {/* Aviso de Segurança */}
          <div style={{
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            color: '#f87171',
            padding: '0.75rem',
            borderRadius: '8px',
            fontSize: '0.75rem',
            lineHeight: '1.4',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.4rem'
          }}>
            <Shield size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
            <span>
              <strong>Atenção:</strong> Ao salvar as alterações, seu perfil será enviado para análise do Administrador e ficará bloqueado temporariamente até a aprovação.
            </span>
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={onClose} 
              style={{ flex: 1 }}
              disabled={saving}
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ flex: 1 }}
              disabled={saving}
            >
              <Save size={16} />
              <span>{saving ? 'Salvando...' : 'Salvar Alterações'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
