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
  User,
  Users,
  Heart,
  MessageCircle,
  FileText,
  Sparkles,
  Smile,
  Clock,
  Search,
  Calendar,
  Zap
} from 'lucide-react';
import SocialWall from '../components/SocialWall';
import EditProfileModal from '../components/EditProfileModal';
import ChildDetailsModal from '../components/ChildDetailsModal';
import ExpressCheckinModal from '../components/ExpressCheckinModal';
import VolunteerScheduleModal from '../components/VolunteerScheduleModal';
import { supabase, registrarPresenca, obterEstatisticasFilho, subscribeToDailyAttendance } from '../services/supabase';

export default function VolunteerDashboard({ user }) {
  const { signOut } = useAuth();
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showExpressCheckin, setShowExpressCheckin] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [cameraError, setCameraError] = useState('');
  const qrScannerRef = useRef(null);
  const scannerId = "web-qr-reader";
  const [activeTab, setActiveTab] = useState('scan'); // 'scan', 'criancas', 'mural'
  const [scannedAuthorized, setScannedAuthorized] = useState([]);
  const [lastTransaction, setLastTransaction] = useState(null);
  const [registeringPresence, setRegisteringPresence] = useState(false);
  const [scannedChildStats, setScannedChildStats] = useState(null);
  const [scannedChildData, setScannedChildData] = useState(null);
  const [scannedParentData, setScannedParentData] = useState(null);

  // Estado para lista de crianças em supervisão (presentes)
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [selectedChildModal, setSelectedChildModal] = useState(null);
  const [searchFilter, setSearchFilter] = useState('');

  // Assinatura em tempo real de presenças do dia
  useEffect(() => {
    const unsubscribe = subscribeToDailyAttendance((records) => {
      setAttendanceRecords(records);
    });
    return () => unsubscribe();
  }, []);

  // Calcular lista de crianças que estão atualmente EM SUPERVISÃO (último registro hoje foi 'entrada')
  const presentChildren = React.useMemo(() => {
    const mapByChild = new Map();
    // Como os registros vêm ordenados por data decrescente (mais recentes primeiro):
    attendanceRecords.forEach(rec => {
      if (rec.filho?.id && !mapByChild.has(rec.filho.id)) {
        mapByChild.set(rec.filho.id, rec);
      }
    });

    const list = [];
    mapByChild.forEach(rec => {
      if (rec.tipo_transacao === 'entrada') {
        list.push(rec);
      }
    });
    return list;
  }, [attendanceRecords]);

  // Filtragem de crianças por nome
  const filteredChildren = presentChildren.filter(item => {
    if (!searchFilter.trim()) return true;
    const term = searchFilter.toLowerCase();
    const childName = item.filho?.nome?.toLowerCase() || '';
    const childNickname = item.filho?.apelido?.toLowerCase() || '';
    const parentName = item.responsavel?.nome?.toLowerCase() || '';
    return childName.includes(term) || childNickname.includes(term) || parentName.includes(term);
  });

  // Buscar pessoas autorizadas e dados ao ler o QR Code
  useEffect(() => {
    if (!scanResult) {
      setScannedAuthorized([]);
      setLastTransaction(null);
      setScannedChildStats(null);
      setScannedChildData(null);
      setScannedParentData(null);
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

          // Buscar dados do filho
          const { data: childDb } = await supabase
            .from('filhos')
            .select('*')
            .eq('id', parsed.childId)
            .maybeSingle();
          if (childDb) {
            setScannedChildData(childDb);
          }

          // Buscar dados do responsável
          const { data: parentDb } = await supabase
            .from('usuarios')
            .select('uid, nome, telefone')
            .eq('uid', parsed.parentId)
            .maybeSingle();
          if (parentDb) {
            setScannedParentData(parentDb);
          }

          // Buscar autorizados
          const { data: authDb } = await supabase
            .from('autorizados_retirada')
            .select('*')
            .eq('filho_id', parsed.childId);
          if (authDb) {
            setScannedAuthorized(authDb);
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
    if (tab !== 'scan') {
      await stopScanner();
    }
    setActiveTab(tab);
  };

  const handleSignOut = async () => {
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
          setScanResult(decodedText);
          setScanning(false);
          qrScanner.stop().then(() => {
            qrScannerRef.current = null;
          }).catch(err => console.error("Erro ao parar scanner:", err));
        },
        () => {}
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

      {/* QUICK ACTIONS BAR (Express Checkin & Escala) */}
      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem' }}>
        <button
          onClick={() => setShowExpressCheckin(true)}
          className="btn btn-primary"
          style={{
            flex: 1,
            padding: '0.6rem 0.8rem',
            fontSize: '0.8rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.4rem',
            background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
            boxShadow: '0 4px 12px rgba(14, 165, 233, 0.25)'
          }}
        >
          <Zap size={16} />
          <span>Check-in Express (Visitante)</span>
        </button>

        <button
          onClick={() => setShowScheduleModal(true)}
          className="btn"
          style={{
            flex: 1,
            padding: '0.6rem 0.8rem',
            fontSize: '0.8rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.4rem',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: '#fff'
          }}
        >
          <Calendar size={16} style={{ color: 'var(--accent-primary)' }} />
          <span>Ver Escala & Trocas</span>
        </button>
      </div>

      {/* Tabs Selector */}
      <div className="tabs-container" style={{ margin: '1rem 0' }}>
        <button 
          className={`tab-btn ${activeTab === 'scan' ? 'active' : ''}`}
          onClick={() => handleTabChange('scan')}
        >
          <QrCode size={16} />
          <span>Leitor QR</span>
        </button>
        <button 
          className={`tab-btn ${activeTab === 'criancas' ? 'active' : ''}`}
          onClick={() => handleTabChange('criancas')}
          style={{ position: 'relative' }}
        >
          <Users size={16} />
          <span>Crianças ({presentChildren.length})</span>
          {presentChildren.length > 0 && (
            <span style={{
              position: 'absolute',
              top: '-4px',
              right: '-4px',
              background: '#10b981',
              color: '#fff',
              fontSize: '0.65rem',
              width: '18px',
              height: '18px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700
            }}>
              {presentChildren.length}
            </span>
          )}
        </button>
        <button 
          className={`tab-btn ${activeTab === 'mural' ? 'active' : ''}`}
          onClick={() => handleTabChange('mural')}
        >
          <Megaphone size={16} />
          <span>Mural</span>
        </button>
      </div>

      {/* ABA 1: LEITOR QR (CHECK-IN / CHECK-OUT) */}
      {activeTab === 'scan' && (
        <>
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

            {/* Popup de Resultado de Scan */}
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
                  gap: '0.65rem',
                  padding: '1rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <CheckCircle size={20} style={{ color: 'var(--accent-success)' }} />
                    <strong style={{ fontSize: '0.95rem' }}>
                      {registeringPresence ? 'Registrando presença...' : (lastTransaction?.tipo_transacao === 'saida' ? 'Saída Confirmada! (Check-Out)' : 'Entrada Confirmada! (Check-In)')}
                    </strong>
                  </div>
                  {parsed ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', width: '100%' }}>
                      {scannedChildData?.selfie && (
                        <div style={{ display: 'flex', justifyContent: 'center', margin: '0.25rem 0' }}>
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
                      <div>
                        <p style={{ fontSize: '0.9rem', color: '#fff', margin: 0, fontWeight: 700 }}>{parsed.childName}</p>
                        {scannedChildData?.apelido && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            Apelido: <strong style={{ color: '#fff' }}>"{scannedChildData.apelido}"</strong>
                          </span>
                        )}
                      </div>

                      {/* Destaque Neurodivergência */}
                      {scannedChildData?.neurodivergente && (
                        <div style={{
                          background: 'rgba(245, 158, 11, 0.15)',
                          border: '1px solid rgba(245, 158, 11, 0.3)',
                          color: '#fbbf24',
                          padding: '0.5rem 0.75rem',
                          borderRadius: '8px',
                          fontSize: '0.75rem'
                        }}>
                          <strong>✨ Neurodivergente:</strong> {scannedChildData.neurodivergencia_detalhe || 'Atenção especial recomendada.'}
                        </div>
                      )}

                      {/* Destaque Como Acalmar */}
                      {scannedChildData?.como_acalmar && (
                        <div style={{
                          background: 'rgba(99, 102, 241, 0.12)',
                          border: '1px solid rgba(99, 102, 241, 0.25)',
                          color: '#c7d2fe',
                          padding: '0.5rem 0.75rem',
                          borderRadius: '8px',
                          fontSize: '0.75rem'
                        }}>
                          <strong>💡 Como acalmar a criança:</strong> "{scannedChildData.como_acalmar}"
                        </div>
                      )}

                      {/* Contato do Responsável + Botão WhatsApp */}
                      {scannedParentData && (
                        <div style={{
                          background: 'rgba(255,255,255,0.03)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          padding: '0.65rem',
                          borderRadius: '8px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '0.5rem'
                        }}>
                          <div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>Responsável:</span>
                            <strong style={{ fontSize: '0.8rem', color: '#fff' }}>{scannedParentData.nome}</strong>
                          </div>
                          {scannedParentData.telefone && (
                            <a
                              href={`https://wa.me/55${scannedParentData.telefone.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá, ${scannedParentData.nome}! Sou voluntário(a) da Igreja da Criança AD Madureira e estou acompanhando o(a) ${parsed.childName}.`)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                background: '#10b981',
                                color: '#fff',
                                padding: '6px 10px',
                                borderRadius: '8px',
                                textDecoration: 'none',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.3rem'
                              }}
                            >
                              <MessageCircle size={14} />
                              <span>WhatsApp</span>
                            </a>
                          )}
                        </div>
                      )}

                      {/* Botão de Ver Ficha Completa */}
                      {scannedChildData && (
                        <button
                          onClick={() => setSelectedChildModal({ child: scannedChildData, parent: scannedParentData })}
                          className="btn btn-secondary"
                          style={{ padding: '0.5rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', width: '100%', marginTop: '0.2rem' }}
                        >
                          <FileText size={16} />
                          <span>Ver Ficha Completa da Criança</span>
                        </button>
                      )}

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
                              Demonstre carinho extra, acolha com alegria e verifique com os responsáveis se precisam de apoio.
                            </div>
                          )}
                        </div>
                      )}

                      {/* Pessoas Autorizadas */}
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

          <div className="auth-card" style={{ padding: '1.25rem', marginTop: 'auto', gap: '0.5rem', background: 'rgba(255,255,255,0.01)' }}>
            <h3 className="heading-font" style={{ fontSize: '0.9rem', fontWeight: 700 }}>Instruções de Registro:</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              1. Aponte a câmera para o QR Code gerado no celular do Responsável.
              <br />
              2. O sistema registra a entrada/saída automaticamente e exibe as recomendações e fichas de acompanhamento.
            </p>
          </div>
        </>
      )}

      {/* ABA 2: CRIANÇAS EM SUPERVISÃO (PRESENTES HOJE) */}
      {activeTab === 'criancas' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Header da Aba com Busca */}
          <div className="auth-card" style={{ padding: '1rem', gap: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 className="heading-font" style={{ fontSize: '1.05rem', margin: 0, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Users size={18} style={{ color: 'var(--accent-primary)' }} />
                  <span>Crianças sob Supervisão</span>
                </h2>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0, marginTop: '2px' }}>
                  Crianças com Check-In ativo no departamento hoje ({presentChildren.length})
                </p>
              </div>
            </div>

            {/* Campo de Busca */}
            <div style={{ position: 'relative', width: '100%' }}>
              <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input
                type="text"
                placeholder="Buscar por criança ou responsável..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="form-input"
                style={{ paddingLeft: '32px', fontSize: '0.85rem' }}
              />
            </div>
          </div>

          {/* Lista de Crianças em Supervisão */}
          {filteredChildren.length === 0 ? (
            <div className="auth-card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <Smile size={40} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#fff', fontWeight: 600 }}>
                {presentChildren.length === 0 ? 'Nenhuma criança com Check-In no momento' : 'Nenhuma criança encontrada com este nome'}
              </p>
              <p style={{ margin: 0, fontSize: '0.75rem', marginTop: '0.25rem' }}>
                {presentChildren.length === 0 ? 'Assim que os responsáveis apresentarem o QR Code, as crianças aparecerão nesta lista.' : 'Tente buscar com outros termos.'}
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.85rem' }}>
              {filteredChildren.map(item => {
                const child = item.filho;
                const parent = item.responsavel;
                const checkInDate = new Date(item.data_registro);

                // Formatar link do WhatsApp
                const msgWpp = encodeURIComponent(`Olá, ${parent?.nome || 'Responsável'}! Sou voluntário(a) da Igreja da Criança AD Madureira e estou com o(a) ${child?.nome}.`);
                const wppLink = parent?.telefone ? `https://wa.me/55${parent.telefone.replace(/\D/g, '')}?text=${msgWpp}` : null;

                return (
                  <div key={item.id} className="auth-card" style={{
                    padding: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                    border: child?.neurodivergente ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)',
                    position: 'relative'
                  }}>
                    {/* Top Info Criança */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                      {child?.selfie ? (
                        <img 
                          src={child.selfie} 
                          alt={child.nome} 
                          style={{
                            width: '56px',
                            height: '56px',
                            borderRadius: '50%',
                            objectFit: 'cover',
                            border: '2px solid var(--accent-primary)',
                            flexShrink: 0
                          }}
                        />
                      ) : (
                        <div style={{
                          width: '56px',
                          height: '56px',
                          borderRadius: '50%',
                          background: 'rgba(255, 255, 255, 0.05)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          <User size={24} style={{ color: 'var(--text-secondary)' }} />
                        </div>
                      )}

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                          <strong style={{ fontSize: '0.95rem', color: '#fff' }}>{child?.nome}</strong>
                          {child?.apelido && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', fontWeight: 600 }}>
                              ("{child.apelido}")
                            </span>
                          )}
                        </div>

                        <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '2px' }}>
                          <Clock size={12} /> Check-In às {checkInDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>

                    {/* Destaque Neurodivergência */}
                    {child?.neurodivergente && (
                      <div style={{
                        background: 'rgba(245, 158, 11, 0.15)',
                        border: '1px solid rgba(245, 158, 11, 0.3)',
                        color: '#fbbf24',
                        padding: '0.45rem 0.65rem',
                        borderRadius: '8px',
                        fontSize: '0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem'
                      }}>
                        <Sparkles size={14} style={{ flexShrink: 0 }} />
                        <span><strong>Neurodivergente:</strong> {child.neurodivergencia_detalhe || 'Ver detalhes na ficha'}</span>
                      </div>
                    )}

                    {/* Destaque Como Acalmar se existir */}
                    {child?.como_acalmar && (
                      <div style={{
                        background: 'rgba(99, 102, 241, 0.12)',
                        border: '1px solid rgba(99, 102, 241, 0.25)',
                        color: '#c7d2fe',
                        padding: '0.5rem 0.65rem',
                        borderRadius: '8px',
                        fontSize: '0.75rem',
                        lineHeight: '1.35'
                      }}>
                        <strong>💡 Como acalmar a criança:</strong> "{child.como_acalmar}"
                      </div>
                    )}

                    {/* Rodapé do Card com Ações (WhatsApp + Abrir Ficha) */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                      paddingTop: '0.65rem',
                      gap: '0.5rem',
                      flexWrap: 'wrap'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', flex: 1, minWidth: '160px' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Resp:</span>
                        <strong style={{ fontSize: '0.75rem', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {parent?.nome || 'Desconhecido'}
                        </strong>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        {wppLink && (
                          <a
                            href={wppLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              background: '#10b981',
                              color: '#fff',
                              padding: '6px 10px',
                              borderRadius: '8px',
                              textDecoration: 'none',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem'
                            }}
                          >
                            <MessageCircle size={14} />
                            <span>WhatsApp</span>
                          </a>
                        )}

                        <button
                          onClick={() => setSelectedChildModal({ child, parent })}
                          className="btn btn-secondary"
                          style={{ padding: '6px 10px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                        >
                          <FileText size={14} />
                          <span>Ver Ficha</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ABA 3: MURAL DE MÍDIA */}
      {activeTab === 'mural' && (
        <SocialWall user={user} />
      )}

      {/* MODAL FICHA COMPLETA DA CRIANÇA */}
      {selectedChildModal && (
        <ChildDetailsModal
          child={selectedChildModal.child}
          parent={selectedChildModal.parent}
          voluntarioId={user?.uid}
          onClose={() => setSelectedChildModal(null)}
        />
      )}

      {/* MODAL EDITAR PERFIL DO VOLUNTÁRIO */}
      {showEditProfile && (
        <EditProfileModal user={user} onClose={() => setShowEditProfile(false)} />
      )}

      {/* MODAL CHECK-IN EXPRESS (VISITANTE) */}
      {showExpressCheckin && (
        <ExpressCheckinModal
          voluntarioId={user?.uid}
          onClose={() => setShowExpressCheckin(false)}
          onSuccess={() => alert('Check-in Express realizado com sucesso!')}
        />
      )}

      {/* MODAL ESCALA & TROCAS DE VOLUNTÁRIOS */}
      {showScheduleModal && (
        <VolunteerScheduleModal
          voluntario={user}
          onClose={() => setShowScheduleModal(false)}
        />
      )}
    </div>
  );
}
