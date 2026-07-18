import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Html5Qrcode } from 'html5-qrcode';
import { 
  Camera, 
  CameraOff, 
  QrCode, 
  LogOut, 
  CheckCircle, 
  AlertTriangle,
  UserCheck,
  RefreshCw,
  Megaphone,
  User
} from 'lucide-react';
import SocialWall from '../components/SocialWall';
import EditProfileModal from '../components/EditProfileModal';
import { supabase, registrarPresenca, obterEstatisticasFilho } from '../services/supabase';

export default function VolunteerDashboard({ user }) {
  const { signOut } = useAuth();
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [cameraError, setCameraError] = useState('');
  const qrScannerRef = useRef(null);
  const scannerId = "web-qr-reader";
  const [activeTab, setActiveTab] = useState('scan'); // 'scan' ou 'mural'
  const [scannedAuthorized, setScannedAuthorized] = useState([]);
  const [lastTransaction, setLastTransaction] = useState(null);
  const [registeringPresence, setRegisteringPresence] = useState(false);
  const [scannedChildStats, setScannedChildStats] = useState(null);
  const [scannedChildData, setScannedChildData] = useState(null);

  // Buscar pessoas autorizadas a retirar e registrar presença quando o QR Code é lido
  useEffect(() => {
    if (!scanResult) {
      setScannedAuthorized([]);
      setLastTransaction(null);
      setScannedChildStats(null);
      setScannedChildData(null);
      return;
    }
    try {
      const parsed = JSON.parse(scanResult);
      if (!parsed || !parsed.childId) return;

      const performCheckInAndFetchDetails = async () => {
        setRegisteringPresence(true);
        try {
          // Registrar transação de entrada/saída (check-in / check-out)
          const tx = await registrarPresenca(parsed.childId, parsed.parentId, user.uid);
          setLastTransaction(tx);

          // Buscar estatísticas do filho
          const stats = await obterEstatisticasFilho(parsed.childId);
          setScannedChildStats(stats);

          // Buscar dados do filho (incluindo selfie)
          const { data: childDb, error: childDbError } = await supabase
            .from('filhos')
            .select('*')
            .eq('id', parsed.childId)
            .maybeSingle();
          if (!childDbError && childDb) {
            setScannedChildData(childDb);
          }

          // Buscar autorizados
          const { data, error } = await supabase
            .from('autorizados_retirada')
            .select('*')
            .eq('filho_id', parsed.childId);
          if (!error && data) {
            setScannedAuthorized(data);
          }
        } catch (err) {
          console.error("Erro no fluxo de presença:", err);
          alert("Erro ao registrar presença: " + err.message);
        } finally {
          setRegisteringPresence(false);
        }
      };

      performCheckInAndFetchDetails();
    } catch (e) {
      // Ignorar se não for JSON válido
    }
  }, [scanResult, user]);

  const handleTabChange = async (tab) => {
    if (tab === 'mural') {
      await stopScanner();
    }
    setActiveTab(tab);
  };

  const handleSignOut = async () => {
    // Parar scanner antes de sair se estiver ativo
    await stopScanner();
    try {
      await signOut();
    } catch (error) {
      console.error('Erro ao sair:', error);
    }
  };

  const getParsedResult = (result) => {
    try {
      return JSON.parse(result);
    } catch (e) {
      return null;
    }
  };

  const startScanner = async () => {
    setCameraError('');
    setScanResult(null);

    try {
      const qrScanner = new Html5Qrcode(scannerId);
      qrScannerRef.current = qrScanner;

      // Configuração para abrir a câmera traseira preferencialmente
      await qrScanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: (width, height) => {
            const size = Math.min(width, height) * 0.7;
            return { width: size, height: size };
          }
        },
        (decodedText) => {
          // Callback de sucesso
          setScanResult(decodedText);
          setScanning(false);
          // Parar o leitor de QR após leitura de sucesso
          qrScanner.stop().then(() => {
            qrScannerRef.current = null;
          }).catch(err => console.error("Erro ao parar scanner:", err));
        },
        (errorMessage) => {
          // Silenciosamente capturando logs do frame de busca por QR
        }
      );
      setScanning(true);
    } catch (err) {
      console.error("Erro ao iniciar câmera:", err);
      setCameraError("Não foi possível acessar a câmera traseira. Certifique-se de conceder permissão de acesso.");
      setScanning(false);
    }
  };

  const stopScanner = async () => {
    if (qrScannerRef.current) {
      try {
        await qrScannerRef.current.stop();
        qrScannerRef.current = null;
      } catch (err) {
        console.error("Erro ao parar leitor:", err);
      }
    }
    setScanning(false);
  };

  // Limpar recursos do leitor no unmount
  useEffect(() => {
    return () => {
      if (qrScannerRef.current) {
        qrScannerRef.current.stop().catch(err => console.log(err));
      }
    };
  }, []);

  return (
    <div className="vol-container">
      {/* Header */}
      <header className="app-header">
        <div className="app-logo-area">
          <img src="/logo.svg" alt="Logo" />
          <div>
            <h1 className="app-title-main heading-font">Check-In</h1>
            <p className="app-subtitle-main">Portal do Voluntário</p>
          </div>
        </div>
        <button className="logout-btn-round" onClick={handleSignOut} title="Sair da Conta">
          <LogOut size={16} />
        </button>
      </header>

      {/* Volunteer Profile Info */}
      <div className="vol-profile-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div className="avatar-circle" style={{ margin: 0 }}>
            {user?.nome ? user.nome.substring(0, 2).toUpperCase() : 'VL'}
          </div>
          <div className="vol-info">
            <span className="vol-name">{user?.nome || 'Voluntário'}</span>
            <span className="vol-badge">
              <UserCheck size={12} />
              Voluntário Ativo
            </span>
          </div>
        </div>
        <button 
          onClick={() => setShowEditProfile(true)} 
          className="btn btn-secondary" 
          style={{ width: 'auto', padding: '0.45rem 0.85rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
        >
          <User size={14} />
          <span>Editar Perfil</span>
        </button>
      </div>

      {/* Tabs Selector */}
      <div className="tabs-container" style={{ margin: '1rem 0' }}>
        <button 
          className={`tab-btn ${activeTab === 'scan' ? 'active' : ''}`}
          onClick={() => handleTabChange('scan')}
        >
          <QrCode size={16} />
          <span>Check-In (Leitor)</span>
        </button>
        <button 
          className={`tab-btn ${activeTab === 'mural' ? 'active' : ''}`}
          onClick={() => handleTabChange('mural')}
        >
          <Megaphone size={16} />
          <span>Mural de Mídia</span>
        </button>
      </div>

      {activeTab === 'scan' ? (
        <>
          {/* Scanner Main Box */}
          <div className="scanner-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="scanner-box">
              <div id={scannerId} style={{ width: '100%', height: '100%', objectFit: 'cover' }}></div>
              
              {!scanning && !scanResult && (
                <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', color: 'var(--text-secondary)' }}>
                  <QrCode size={48} style={{ color: 'var(--accent-primary)', opacity: 0.8 }} />
                  <span className="scanner-instructions">O scanner está desligado.</span>
                </div>
              )}

              {scanning && (
                <div className="scanner-overlay">
                  <div className="scanner-target">
                    <div className="scanner-laser"></div>
                  </div>
                </div>
              )}
            </div>

            {/* Action Controls */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {!scanning ? (
                <button className="btn btn-primary" onClick={startScanner}>
                  <Camera size={18} />
                  <span>{scanResult ? 'Escanear Outro QR Code' : 'Iniciar Câmera / Scanner'}</span>
                </button>
              ) : (
                <button className="btn btn-danger" onClick={stopScanner}>
                  <CameraOff size={18} />
                  <span>Desligar Scanner</span>
                </button>
              )}
            </div>

            {/* Error Messages */}
            {cameraError && (
              <div className="error-banner" style={{ marginTop: '0.5rem' }}>
                <AlertTriangle size={18} style={{ flexShrink: 0 }} />
                <span>{cameraError}</span>
              </div>
            )}

            {/* Scan Success Popup / Info */}
            {scanResult && (() => {
              const parsed = getParsedResult(scanResult);
              return (
                <div className="info-banner" style={{ 
                  background: 'rgba(16, 185, 129, 0.15)', 
                  border: '1px solid rgba(16, 185, 129, 0.3)', 
                  color: '#a7f3d0', 
                  marginTop: '0.5rem',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  gap: '0.5rem',
                  padding: '1rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <CheckCircle size={20} style={{ color: 'var(--accent-success)' }} />
                    <strong style={{ fontSize: '0.95rem' }}>
                      {registeringPresence ? 'Registrando presença...' : (lastTransaction?.tipo_transacao === 'saida' ? 'Saída Confirmada! (Check-Out)' : 'Entrada Confirmada! (Check-In)')}
                    </strong>
                  </div>
                  {parsed ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%' }}>
                      {scannedChildData?.selfie && (
                        <div style={{ display: 'flex', justifyContent: 'center', margin: '0.5rem 0 0.85rem 0' }}>
                          <img 
                            src={scannedChildData.selfie} 
                            alt={parsed.childName} 
                            style={{ 
                              width: '90px', 
                              height: '90px', 
                              borderRadius: '50%', 
                              objectFit: 'cover', 
                              border: '3px solid var(--accent-success)',
                              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)'
                            }} 
                          />
                        </div>
                      )}
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Criança: <strong style={{ color: '#fff' }}>{parsed.childName}</strong></p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>ID do Filho: <span style={{ color: '#fff', fontFamily: 'monospace' }}>{parsed.childId}</span></p>

                      {/* Estatísticas de Frequência e Alerta Pastoral */}
                      {scannedChildStats && (
                        <div style={{ 
                          background: 'rgba(255, 255, 255, 0.03)', 
                          padding: '0.6rem', 
                          borderRadius: '6px', 
                          marginTop: '0.25rem',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.25rem',
                          fontSize: '0.75rem'
                        }}>
                          <span style={{ color: 'var(--text-secondary)' }}>
                            Frequência Total: <strong style={{ color: '#fff' }}>{scannedChildStats.totalCheckins} cultos</strong>
                          </span>
                          {scannedChildStats.ultimoCheckin ? (
                            <span style={{ color: 'var(--text-secondary)' }}>
                              Última vez aqui: <strong style={{ color: '#fff' }}>
                                {new Date(scannedChildStats.ultimoCheckin).toLocaleDateString('pt-BR')} ({scannedChildStats.diasAusente} dias atrás)
                              </strong>
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                              Primeira vez participando! 🎉
                            </span>
                          )}

                          {/* Alerta de ausência prolongada (> 30 dias) */}
                          {scannedChildStats.diasAusente && scannedChildStats.diasAusente > 30 && (
                            <div style={{ 
                              background: 'rgba(245, 158, 11, 0.15)', 
                              border: '1px solid rgba(245, 158, 11, 0.3)', 
                              color: '#fbbf24', 
                              padding: '0.5rem', 
                              borderRadius: '4px',
                              marginTop: '0.4rem',
                              fontWeight: 600,
                              fontSize: '0.7rem',
                              lineHeight: '1.25'
                            }}>
                              ⚠️ ALERTA PASTORAL: Esta criança está ausente há {scannedChildStats.diasAusente} dias (mais de 1 mês)! 
                              Por favor, demonstre carinho extra, acolha com alegria e verifique com os responsáveis se está tudo bem ou se precisam de apoio.
                            </div>
                          )}
                        </div>
                      )}

                      {/* Authorized Pickup Persons */}
                      <div style={{ 
                        borderTop: '1px dashed rgba(16, 185, 129, 0.3)', 
                        paddingTop: '0.5rem', 
                        marginTop: '0.25rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.4rem',
                        width: '100%'
                      }}>
                        <strong style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', display: 'block' }}>
                          Pessoas Autorizadas a Retirar:
                        </strong>
                        {scannedAuthorized.length === 0 ? (
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                            Apenas os responsáveis cadastrados.
                          </span>
                        ) : (
                          scannedAuthorized.map(auth => (
                            <div key={auth.id} style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '0.5rem',
                              background: 'rgba(255,255,255,0.03)',
                              padding: '0.4rem',
                              borderRadius: '6px',
                              border: '1px solid rgba(255,255,255,0.05)',
                              width: '100%'
                            }}>
                              {auth.selfie ? (
                                <img src={auth.selfie} alt={auth.nome} style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }} />
                              ) : (
                                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <UserCheck size={12} style={{ color: 'var(--text-secondary)' }} />
                                </div>
                              )}
                              <div style={{ flex: 1 }}>
                                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#fff', display: 'block' }}>{auth.nome}</span>
                                <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>{auth.parentesco} {auth.documento && `| Doc: ${auth.documento}`}</span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  ) : (
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', wordBreak: 'break-all' }}>
                      Código lido: <span style={{ color: '#fff', fontFamily: 'monospace' }}>{scanResult}</span>
                    </p>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Instructions card */}
          <div className="auth-card" style={{ padding: '1.25rem', marginTop: 'auto', gap: '0.5rem', background: 'rgba(255,255,255,0.01)' }}>
            <h3 className="heading-font" style={{ fontSize: '0.9rem', fontWeight: 700 }}>Como Funciona:</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              1. Aponte a câmera traseira do celular para o QR Code gerado pelo celular do Responsável.
              <br />
              2. O aplicativo reconhecerá e efetuará o fluxo de check-in/check-out da criança no sistema da Igreja da Criança Assembleia de Deus Madureira automaticamente.
            </p>
          </div>
        </>
      ) : (
        <SocialWall user={user} />
      )}

      {showEditProfile && (
        <EditProfileModal user={user} onClose={() => setShowEditProfile(false)} />
      )}
    </div>
  );
}
