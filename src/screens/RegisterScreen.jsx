import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import SelfieCapture from '../components/SelfieCapture';
import DocumentUpload from '../components/DocumentUpload';
import { 
  User, 
  Mail, 
  Lock, 
  UserPlus, 
  ShieldAlert, 
  Heart, 
  Shield, 
  AlertCircle, 
  Phone, 
  MapPin, 
  Baby, 
  FileText 
} from 'lucide-react';

export default function RegisterScreen({ onNavigateToLogin }) {
  const { signUp } = useAuth();
  const [tipoUsuario, setTipoUsuario] = useState('voluntario'); // 'voluntario' ou 'responsavel'
  
  // Dados Gerais / Comuns
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Novos campos para o Responsável
  const [telefone, setTelefone] = useState('');
  const [endereco, setEndereco] = useState('');
  const [membroIgreja, setMembroIgreja] = useState(false);
  const [selfie, setSelfie] = useState(null);
  const [nomeIgreja, setNomeIgreja] = useState('');
  const [ministerio, setMinisterio] = useState('');
  const [antecedentes, setAntecedentes] = useState(null);
  const [voluntarioTermoAceito, setVoluntarioTermoAceito] = useState(false);

  // Novos campos para a Criança do Responsável
  const [childName, setChildName] = useState('');
  const [childBirthdate, setChildBirthdate] = useState('');
  const [childNickname, setChildNickname] = useState('');
  const [neurodivergente, setNeurodivergente] = useState(false);
  const [neurodivergenciaDetalhe, setNeurodivergenciaDetalhe] = useState('');
  const [comoAcalmar, setComoAcalmar] = useState('');
  const [termoAceito, setTermoAceito] = useState(false);
  const [childSelfie, setChildSelfie] = useState(null);

  const formatBirthdate = (dateString) => {
    if (!dateString) return '___/___/______';
    const parts = dateString.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateString;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nome || !email || !password || !confirmPassword) {
      setError('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    // Validações adicionais para Responsável
    if (tipoUsuario === 'responsavel') {
      if (!telefone || !endereco || !childName || !childBirthdate) {
        setError('Por favor, preencha todas as informações do Responsável e da Criança.');
        return;
      }
      if (!selfie) {
        setError('Por favor, tire ou envie uma selfie do responsável para identificação visual.');
        return;
      }
      if (!childSelfie) {
        setError('Por favor, tire ou envie uma selfie da criança para identificação visual.');
        return;
      }
      if (!termoAceito) {
        setError('Você precisa ler e aceitar o Termo de Autorização de Imagem e Voz.');
        return;
      }
    }

    // Validações adicionais para Voluntário
    if (tipoUsuario === 'voluntario') {
      if (!ministerio) {
        setError('Por favor, informe o seu ministério ou igreja de origem.');
        return;
      }
      if (!selfie) {
        setError('Por favor, tire ou envie uma selfie para identificação visual.');
        return;
      }
      if (!antecedentes) {
        setError('É obrigatório anexar a Certidão de Antecedentes Criminais para o cadastro de voluntário.');
        return;
      }
      if (!voluntarioTermoAceito) {
        setError('Você precisa ler e aceitar o Termo de Compromisso e Responsabilidade do Voluntário.');
        return;
      }
    }

    setLoading(true);
    setError('');

    try {
      const extraData = tipoUsuario === 'responsavel' ? {
        telefone,
        endereco,
        membroIgreja,
        nomeIgreja: membroIgreja ? nomeIgreja : '',
        selfie,
        childName,
        childBirthdate,
        childNickname,
        neurodivergente,
        neurodivergenciaDetalhe: neurodivergente ? neurodivergenciaDetalhe : '',
        comoAcalmar,
        termoAceito,
        childSelfie
      } : {
        ministerio,
        selfie,
        antecedentesCriminais: antecedentes,
        voluntarioTermoAceito
      };

      await signUp(email, password, nome, tipoUsuario, extraData);
      setSuccess(true);
    } catch (err) {
      setError(err || 'Erro ao realizar cadastro.');
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="auth-card" style={{ textAlign: 'center', maxWidth: '550px' }}>
        <div className="auth-header">
          <img src="/logo.svg" alt="Igreja da Criança Logo" />
          <h1 className="auth-title heading-font">Cadastro Realizado!</h1>
        </div>

        <div className="info-banner" style={{ margin: '1.5rem 0', flexDirection: 'column', textAlign: 'center', gap: '0.75rem' }}>
          <ShieldAlert size={24} style={{ color: '#818cf8' }} />
          <p className="auth-subtitle" style={{ fontSize: '0.9rem', lineHeight: '1.4' }}>
            Seu cadastro foi realizado com sucesso e está **pendente de aprovação** pelo Administrador do sistema.
          </p>
        </div>

        <button className="btn btn-primary" onClick={onNavigateToLogin} style={{ width: '100%' }}>
          <span>Acessar Login</span>
        </button>
      </div>
    );
  }

  return (
    <div className="auth-card" style={{ maxWidth: tipoUsuario === 'responsavel' ? '650px' : '450px', transition: 'max-width 0.3s ease' }}>
      <div className="auth-header">
        <img src="/logo.svg" alt="Igreja da Criança AD Madureira Logo" />
        <h1 className="auth-title heading-font" style={{ fontSize: '1.8rem', marginTop: '0.5rem' }}>Criar Conta</h1>
        <p className="auth-subtitle">Cadastre-se no fluxo da Igreja da Criança AD Madureira</p>
      </div>

      {error && (
        <div className="error-banner" style={{ marginBottom: '1.25rem' }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        
        {/* Tipo de Usuário (Custom Cards) */}
        <div className="form-group">
          <label className="form-label">Eu sou...</label>
          <div className="role-picker">
            <label className="role-option">
              <input
                type="radio"
                name="tipoUsuario"
                value="voluntario"
                checked={tipoUsuario === 'voluntario'}
                onChange={() => setTipoUsuario('voluntario')}
                disabled={loading}
              />
              <div className="role-card">
                <Heart size={20} />
                <span className="role-card-title">Voluntário</span>
                <span className="role-card-desc">Precisa de aprovação</span>
              </div>
            </label>

            <label className="role-option">
              <input
                type="radio"
                name="tipoUsuario"
                value="responsavel"
                checked={tipoUsuario === 'responsavel'}
                onChange={() => setTipoUsuario('responsavel')}
                disabled={loading}
              />
              <div className="role-card">
                <Shield size={20} />
                <span className="role-card-title">Responsável</span>
                <span className="role-card-desc">Precisa de aprovação</span>
              </div>
            </label>
          </div>
        </div>

        {/* ==================== SEÇÃO 1: DADOS GERAIS DE ACESSO ==================== */}
        <div style={{
          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
          paddingBottom: '1rem'
        }}>
          <h3 className="heading-font" style={{ fontSize: '1rem', marginBottom: '0.75rem', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <User size={16} />
            <span>Dados de Acesso</span>
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div className="form-group">
              <label className="form-label">Nome Completo do Responsável</label>
              <div className="input-wrapper">
                <input
                  type="text"
                  placeholder="Seu nome completo"
                  className="form-input"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  disabled={loading}
                  required
                />
                <User className="input-icon" size={18} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">E-mail</label>
              <div className="input-wrapper">
                <input
                  type="email"
                  placeholder="seuemail@exemplo.com"
                  className="form-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  required
                />
                <Mail className="input-icon" size={18} />
              </div>
            </div>
          </div>
        </div>

        {/* ==================== SEÇÃO 2: DADOS COMPLEMENTARES DO RESPONSÁVEL ==================== */}
        {tipoUsuario === 'responsavel' && (
          <div style={{
            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
            paddingBottom: '1rem'
          }}>
            <h3 className="heading-font" style={{ fontSize: '1rem', marginBottom: '0.75rem', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Shield size={16} />
              <span>Dados do Responsável (Foco Pastoral)</span>
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div className="form-group">
                <label className="form-label">Celular (com WhatsApp)</label>
                <div className="input-wrapper">
                  <input
                    type="tel"
                    placeholder="(00) 00000-0000"
                    className="form-input"
                    value={telefone}
                    onChange={(e) => setTelefone(e.target.value)}
                    disabled={loading}
                    required
                  />
                  <Phone className="input-icon" size={18} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Endereço Residencial</label>
                <div className="input-wrapper">
                  <input
                    type="text"
                    placeholder="Rua, número, bairro, cidade"
                    className="form-input"
                    value={endereco}
                    onChange={(e) => setEndereco(e.target.value)}
                    disabled={loading}
                    required
                  />
                  <MapPin className="input-icon" size={18} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Membro da Igreja Assembleia de Deus Madureira?</label>
                <select 
                  className="form-input" 
                  value={membroIgreja ? 'sim' : 'nao'} 
                  onChange={(e) => setMembroIgreja(e.target.value === 'sim')}
                  disabled={loading}
                  style={{ background: 'var(--bg-input)', color: '#fff', appearance: 'auto' }}
                >
                  <option value="nao">Não (Sou Visitante)</option>
                  <option value="sim">Sim (Sou Membro)</option>
                </select>
              </div>

              {membroIgreja && (
                <div className="form-group" style={{ animation: 'fadeIn 0.2s ease-out' }}>
                  <label className="form-label">Qual congregação / igreja?</label>
                  <div className="input-wrapper">
                    <input
                      type="text"
                      placeholder="Ex: Templo Sede, Congregação Jardim..."
                      className="form-input"
                      value={nomeIgreja}
                      onChange={(e) => setNomeIgreja(e.target.value)}
                      disabled={loading}
                      required
                    />
                    <MapPin className="input-icon" size={18} />
                  </div>
                </div>
              )}

              {/* Captura de Selfie */}
              <SelfieCapture onCapture={setSelfie} initialValue={selfie} />
            </div>
          </div>
        )}

        {/* ==================== SEÇÃO 2B: DADOS COMPLEMENTARES DO VOLUNTÁRIO ==================== */}
        {tipoUsuario === 'voluntario' && (
          <div style={{
            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
            paddingBottom: '1rem'
          }}>
            <h3 className="heading-font" style={{ fontSize: '1rem', marginBottom: '0.75rem', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Heart size={16} />
              <span>Dados de Voluntário</span>
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div className="form-group">
                <label className="form-label">Qual o seu ministério na igreja? / Igreja de origem</label>
                <div className="input-wrapper">
                  <input
                    type="text"
                    placeholder="Ex: Ministério Infantil, Louvor, AD Ibitinga..."
                    className="form-input"
                    value={ministerio}
                    onChange={(e) => setMinisterio(e.target.value)}
                    disabled={loading}
                    required
                  />
                  <Heart className="input-icon" size={18} />
                </div>
              </div>

              {/* Captura de Selfie do Voluntário */}
              <SelfieCapture onCapture={setSelfie} initialValue={selfie} />

              {/* Anexo de Antecedentes Criminais (Obrigatório) */}
              <DocumentUpload
                label="Certidão de Antecedentes Criminais"
                onUpload={setAntecedentes}
                initialValue={antecedentes}
                required={true}
                disabled={loading}
              />
            </div>
          </div>
        )}

        {/* ==================== SEÇÃO 3: DADOS DA CRIANÇA ==================== */}
        {tipoUsuario === 'responsavel' && (
          <div style={{
            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
            paddingBottom: '1rem'
          }}>
            <h3 className="heading-font" style={{ fontSize: '1rem', marginBottom: '0.75rem', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Baby size={16} />
              <span>Dados da Criança</span>
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div className="form-group">
                <label className="form-label">Nome Completo da Criança</label>
                <div className="input-wrapper">
                  <input
                    type="text"
                    placeholder="Nome completo da criança"
                    className="form-input"
                    value={childName}
                    onChange={(e) => setChildName(e.target.value)}
                    disabled={loading}
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
                  disabled={loading}
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
                    disabled={loading}
                  />
                  <Heart className="input-icon" size={18} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Possui alguma neurodivergência?</label>
                <select 
                  className="form-input" 
                  value={neurodivergente ? 'sim' : 'nao'} 
                  onChange={(e) => setNeurodivergente(e.target.value === 'sim')}
                  disabled={loading}
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
                      disabled={loading}
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
                      disabled={loading}
                      rows={3}
                      style={{ height: 'auto', padding: '10px 12px' }}
                    />
                  </div>
                </>
              )}

              {/* Captura de Selfie da Criança */}
              <div style={{ marginTop: '0.5rem' }}>
                <label className="form-label" style={{ marginBottom: '0.4rem', display: 'block' }}>Selfie de Identificação da Criança</label>
                <SelfieCapture onCapture={setChildSelfie} initialValue={childSelfie} />
              </div>
            </div>
          </div>
        )}

        {/* ==================== SEÇÃO 4: TERMO DE AUTORIZAÇÃO ==================== */}
        {tipoUsuario === 'responsavel' && (
          <div style={{
            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
            paddingBottom: '1rem'
          }}>
            <h3 className="heading-font" style={{ fontSize: '1rem', marginBottom: '0.75rem', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <FileText size={16} />
              <span>Termo de Responsabilidade</span>
            </h3>
            
            {/* Caixa de Texto do Termo */}
            <div style={{
              background: 'rgba(0, 0, 0, 0.25)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              borderRadius: '8px',
              padding: '1rem',
              maxHeight: '180px',
              overflowY: 'auto',
              fontSize: '0.75rem',
              color: 'var(--text-secondary)',
              lineHeight: '1.5',
              textAlign: 'justify',
              marginBottom: '0.75rem'
            }}>
              <strong>TERMO DE AUTORIZAÇÃO DE USO DE IMAGEM E VOZ DE MENOR</strong>
              <p style={{ margin: '0.5rem 0' }}>
                Por este instrumento, na qualidade de responsável legal pelo(a) menor aqui cadastrado(a), 
                <span style={{ color: '#fff', fontWeight: 600 }}> {childName || '________________________'} </span>, 
                nascido(a) em <span style={{ color: '#fff', fontWeight: 600 }}> {formatBirthdate(childBirthdate)} </span>, 
                <strong> AUTORIZO </strong> de forma gratuita, a <strong>Igreja Assembleia de Deus Madureira Ibitinga / Ministério Infantil</strong>, 
                inscrita no CNPJ sob o nº <strong>49.275.118/0001-11</strong>, com sede na Rua Alberto Janes, 390, Paineiras 1, 
                a utilizar a imagem e a voz do(a) referido(a) menor.
              </p>
              <p style={{ margin: '0.5rem 0' }}>
                Com base na Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018), a igreja se compromete a cumprir com todos os requisitos legais que protejam o menor de qualquer exposição indevida, garantindo que o uso se limite exclusivamente a fins informativos, litúrgicos ou de comunicação interna do Ministério Infantil.
              </p>
            </div>

            {/* Checkbox de Aceite */}
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', cursor: 'pointer', fontSize: '0.8rem' }}>
              <input
                type="checkbox"
                checked={termoAceito}
                onChange={(e) => setTermoAceito(e.target.checked)}
                disabled={loading}
                required
                style={{ marginTop: '3px' }}
              />
              <span style={{ color: termoAceito ? '#fff' : 'var(--text-secondary)' }}>
                Li e aceito os termos de autorização de imagem e voz da criança descritos acima.
              </span>
            </label>
          </div>
        )}

        {/* ==================== SEÇÃO 4B: TERMO DE RESPONSABILIDADE DO VOLUNTÁRIO ==================== */}
        {tipoUsuario === 'voluntario' && (
          <div style={{
            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
            paddingBottom: '1rem'
          }}>
            <h3 className="heading-font" style={{ fontSize: '1rem', marginBottom: '0.75rem', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <FileText size={16} />
              <span>Termo de Compromisso e Responsabilidade</span>
            </h3>
            
            {/* Caixa de Texto do Termo */}
            <div style={{
              background: 'rgba(0, 0, 0, 0.25)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              borderRadius: '8px',
              padding: '1rem',
              maxHeight: '180px',
              overflowY: 'auto',
              fontSize: '0.75rem',
              color: 'var(--text-secondary)',
              lineHeight: '1.5',
              textAlign: 'justify',
              marginBottom: '0.75rem'
            }}>
              <strong>TERMO DE COMPROMISSO, RESPONSABILIDADE E CONDUTA DO VOLUNTÁRIO</strong>
              <p style={{ margin: '0.5rem 0' }}>
                Pelo presente instrumento, eu, voluntário(a) devidamente cadastrado(a), assumo o compromisso de atuar de forma voluntária no Ministério Infantil (Igreja da Criança) da <strong>Igreja Assembleia de Deus Madureira Ibitinga / Ministério Infantil</strong>, inscrita no CNPJ sob o nº <strong>49.275.118/0001-11</strong>, com sede na Rua Alberto Janes, 390, Paineiras 1, declarando estar ciente e de acordo com as seguintes condições respaldadas na legislação brasileira (Lei do Voluntariado nº 9.608/1998 e Estatuto da Criança e do Adolescente - ECA - Lei nº 8.069/1990):
              </p>
              <ol style={{ margin: '0.5rem 0', paddingLeft: '1.2rem' }}>
                <li style={{ marginBottom: '0.45rem' }}><strong>DO ZELO E PROTEÇÃO (ECA, Art. 4º, 18 e 70):</strong> Comprometo-me a zelar pela integridade física, moral, psicológica e espiritual de todas as crianças sob minha guarda e supervisão durante as atividades, protegendo-as de qualquer forma de negligência, discriminação, violência, crueldade ou opressão.</li>
                <li style={{ marginBottom: '0.45rem' }}><strong>DO CUIDADO EXCLUSIVO:</strong> Declaro ter ciência de que as crianças sob os cuidados do Ministério Infantil não devem ser deixadas sozinhas ou entregues a terceiros não autorizados em hipótese alguma, devendo ser devolvidas estritamente ao responsável cadastrado mediante verificação de QR Code ou documento de identidade.</li>
                <li style={{ marginBottom: '0.45rem' }}><strong>DA LEI DO VOLUNTARIADO (Lei nº 9.608/98):</strong> Declaro celeridade de que a atividade desempenhada é de natureza puramente voluntária, de caráter gratuito, cívico e religioso, não gerando qualquer vínculo empregatício, previdenciário ou afins com a instituição.</li>
                <li style={{ marginBottom: '0.45rem' }}><strong>DO SIGILO E LGPD (Lei nº 13.709/18):</strong> Obrigo-me a manter absoluto sigilo sobre quaisquer dados pessoais, imagens ou informações médicas/familiares das crianças e de seus responsáveis acessados durante as atividades.</li>
              </ol>
              <p style={{ margin: '0.5rem 0' }}>
                Ao marcar este termo, atesto minha idoneidade moral para lidar com o público infantil e aceito integralmente as responsabilidades civis e criminais inerentes à guarda temporária das crianças.
              </p>
            </div>

            {/* Checkbox de Aceite */}
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', cursor: 'pointer', fontSize: '0.8rem' }}>
              <input
                type="checkbox"
                checked={voluntarioTermoAceito}
                onChange={(e) => setVoluntarioTermoAceito(e.target.checked)}
                disabled={loading}
                required
                style={{ marginTop: '3px' }}
              />
              <span style={{ color: voluntarioTermoAceito ? '#fff' : 'var(--text-secondary)' }}>
                Li e aceito os termos do compromisso e responsabilidade de voluntariado descritos acima.
              </span>
            </label>
          </div>
        )}

        {/* ==================== SEÇÃO 5: SENHAS ==================== */}
        <div>
          {tipoUsuario === 'voluntario' && (
            <h3 className="heading-font" style={{ fontSize: '1rem', marginBottom: '0.75rem', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Lock size={16} />
              <span>Senha de Acesso</span>
            </h3>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div className="form-group">
              <label className="form-label">Senha</label>
              <div className="input-wrapper">
                <input
                  type="password"
                  placeholder="Crie sua senha (mín. 6 caracteres)"
                  className="form-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  required
                />
                <Lock className="input-icon" size={18} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Confirmar Senha</label>
              <div className="input-wrapper">
                <input
                  type="password"
                  placeholder="Confirme a senha"
                  className="form-input"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                  required
                />
                <Lock className="input-icon" size={18} />
              </div>
            </div>
          </div>
        </div>

        <button type="submit" className="btn btn-primary" style={{ marginTop: '0.75rem' }} disabled={loading}>
          {loading ? (
            <>
              <div className="spinner" style={{ width: '18px', height: '18px', borderWidth: '2px' }}></div>
              <span>Cadastrando...</span>
            </>
          ) : (
            <>
              <UserPlus size={18} />
              <span>Concluir Cadastro</span>
            </>
          )}
        </button>
      </form>

      <div className="auth-footer">
        <span>Já tem uma conta? </span>
        <span className="auth-link" onClick={onNavigateToLogin}>
          Faça login
        </span>
      </div>
    </div>
  );
}
