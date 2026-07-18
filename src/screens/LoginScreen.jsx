import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, LogIn, AlertCircle } from 'lucide-react';

export default function LoginScreen({ onNavigateToRegister }) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Por favor, preencha todos os campos.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await signIn(email, password);
    } catch (err) {
      setError(err || 'Erro ao realizar login.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-card">
      <div className="auth-header">
        <img src="/logo.svg" alt="Igreja da Criança Logo" />
        <h1 className="auth-title heading-font" style={{ fontSize: '1.75rem', lineHeight: '1.2', margin: '0.5rem 0' }}>Igreja da Criança</h1>
        <p className="auth-subtitle" style={{ fontSize: '0.85rem', color: 'var(--accent-primary)', fontWeight: '600' }}>AD Madureira • Fluxo & Check-In</p>
      </div>

      {error && (
        <div className="error-banner">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div className="form-group">
          <label className="form-label">E-mail</label>
          <div className="input-wrapper">
            <input
              type="email"
              placeholder="exemplo@igreja.com"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
            />
            <Mail className="input-icon" size={18} />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Senha</label>
          <div className="input-wrapper">
            <input
              type="password"
              placeholder="Digite sua senha"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
            />
            <Lock className="input-icon" size={18} />
          </div>
        </div>

        <button type="submit" className="btn btn-primary" style={{ marginTop: '0.5rem' }} disabled={loading}>
          {loading ? (
            <>
              <div className="spinner" style={{ width: '18px', height: '18px', borderWidth: '2px' }}></div>
              <span>Entrando...</span>
            </>
          ) : (
            <>
              <LogIn size={18} />
              <span>Acessar Aplicativo</span>
            </>
          )}
        </button>
      </form>

      <div className="auth-footer">
        <span>Não tem uma conta? </span>
        <span className="auth-link" onClick={onNavigateToRegister}>
          Cadastre-se aqui
        </span>
      </div>
    </div>
  );
}
