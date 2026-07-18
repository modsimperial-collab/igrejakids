import React from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, LogOut, Clock } from 'lucide-react';

export default function BlockedScreen({ user }) {
  const { signOut } = useAuth();
  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Erro ao sair:', error);
    }
  };

  return (
    <div className="blocked-card">
      <div className="blocked-icon-container">
        <ShieldAlert size={40} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <h2 className="blocked-title heading-font">Acesso Pendente</h2>
        <p className="blocked-text">
          Olá, <strong style={{ color: '#fff' }}>{user?.nome || 'Voluntário'}</strong>!
          <br />
          Seu cadastro está pendente de aprovação pelo Administrador.
        </p>
      </div>

      <div className="info-banner" style={{ fontSize: '0.8rem', gap: '0.5rem' }}>
        <Clock size={16} style={{ flexShrink: 0 }} />
        <span>O aplicativo atualizará automaticamente assim que seu acesso for aprovado.</span>
      </div>

      <button className="btn btn-secondary" onClick={handleSignOut}>
        <LogOut size={16} />
        <span>Sair da Conta</span>
      </button>
    </div>
  );
}
