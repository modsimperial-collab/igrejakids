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
  if (!user) {
    return (
      <div className="app-container">
        <div className="blocked-card">
          <h2 className="blocked-title heading-font">Criando Perfil...</h2>
          <p className="blocked-text">
            Seu registro está sendo configurado. Se o problema persistir, saia e entre novamente.
          </p>
          <button className="btn btn-secondary" onClick={signOut}>
            Sair da Conta
          </button>
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
