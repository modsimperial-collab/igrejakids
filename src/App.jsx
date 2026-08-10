import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';

// Telas
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import BlockedScreen from './screens/BlockedScreen';
import VolunteerDashboard from './screens/VolunteerDashboard';
import AdminDashboard from './screens/AdminDashboard';
import ResponsavelDashboard from './screens/ResponsavelDashboard';

export default function App() {
  const { session, user, loading, signOut } = useAuth();
  const [currentScreen, setCurrentScreen] = useState('login'); // 'login' ou 'register' para deslogados

  // Exibir tela de loading inicial
  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p className="heading-font" style={{ fontSize: '0.95rem', fontWeight: 500, letterSpacing: '0.05em' }}>
          CARREGANDO SISTEMA...
        </p>
      </div>
    );
  }

  // FLUXO 1: Usuário Deslogado (sem sessão)
  if (!session) {
    return (
      <div className="app-container">
        {currentScreen === 'login' ? (
          <LoginScreen onNavigateToRegister={() => setCurrentScreen('register')} />
        ) : (
          <RegisterScreen onNavigateToLogin={() => setCurrentScreen('login')} />
        )}
      </div>
    );
  }

  // Se o usuário está logado mas os dados do perfil público no Supabase ainda não carregaram ou o documento não existe
  if (!user || user._error) {
    return (
      <div className="app-container">
        <div className="blocked-card">
          <h2 className="blocked-title heading-font">
            {user?._error ? 'Erro ao Carregar Perfil' : 'Carregando Perfil...'}
          </h2>
          <p className="blocked-text">
            {user?._error ? (
              <span style={{ color: '#fda4af' }}>
                Ocorreu um erro no banco de dados: <br/><strong>{user._error}</strong><br/>
                Por favor, verifique se rodou o script schema.sql ou as permissões de acesso (RLS).
              </span>
            ) : (
              'Seu registro está sendo configurado ou sincronizado com o banco de dados. Isso deve levar apenas alguns segundos.'
            )}
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
            <button className="btn btn-primary" onClick={() => window.location.reload()}>
              Recarregar Página
            </button>
            <button className="btn btn-secondary" onClick={signOut}>
              Sair da Conta
            </button>
          </div>
        </div>
      </div>
    );
  }

  // FLUXO 2: Roteamento baseado em Perfis (RBAC)
  return (
    <div className="app-container">
      {/* Administrador Mestre */}
      {user.tipo_usuario === 'admin' && (
        <AdminDashboard user={user} />
      )}

      {/* Responsável (Pais) */}
      {user.tipo_usuario === 'responsavel' && (
        user.aprovado === true ? (
          <ResponsavelDashboard user={user} />
        ) : (
          <BlockedScreen user={user} />
        )
      )}

      {/* Voluntário */}
      {user.tipo_usuario === 'voluntario' && (
        user.aprovado === true ? (
          <VolunteerDashboard user={user} />
        ) : (
          <BlockedScreen user={user} />
        )
      )}
    </div>
  );
}
