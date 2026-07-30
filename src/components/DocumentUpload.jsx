import React, { useState, useRef } from 'react';
import { FileText, Upload, Camera, Trash2, Eye, AlertCircle, FileCheck, Check, HelpCircle } from 'lucide-react';

export default function DocumentUpload({ 
  onUpload, 
  initialValue = null, 
  label = "Antecedentes Criminais",
  required = true,
  disabled = false,
  helpUrl = "https://www.gov.br/pt-br/servicos/emitir-certidao-de-antecedentes-criminais"
}) {
  const [documentData, setDocumentData] = useState(initialValue || null);
  const [fileName, setFileName] = useState(initialValue ? "Documento Anexado" : "");
  const [fileType, setFileType] = useState(initialValue?.startsWith('data:application/pdf') ? 'pdf' : 'image');
  const [error, setError] = useState('');
  const [useCamera, setUseCamera] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [stream, setStream] = useState(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  // Manipular upload de arquivos (PDF ou Imagem)
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setError('');
    
    // Verificar tamanho (máx 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('O arquivo é muito grande. O tamanho máximo permitido é 5MB.');
      return;
    }

    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    const isImage = file.type.startsWith('image/') || /\.(jpg|jpeg|png|webp)$/i.test(file.name);

    if (!isPdf && !isImage) {
      setError('Formato não suportado. Por favor, envie um arquivo PDF ou uma Imagem (JPG/PNG).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target.result;
      setDocumentData(result);
      setFileName(file.name);
      setFileType(isPdf ? 'pdf' : 'image');
      onUpload(result);
    };

    reader.onerror = () => {
      setError('Erro ao ler o arquivo. Tente novamente.');
    };

    reader.readAsDataURL(file);
  };

  // Funções de Câmera (Para fotografar o documento)
  const startCamera = async () => {
    setCameraError('');
    setUseCamera(true);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error('Erro ao acessar a câmera:', err);
      // Tentar câmera frontal como fallback
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err2) {
        setCameraError('Não foi possível acessar a câmera. Use a opção de anexo de arquivo.');
        setUseCamera(false);
      }
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setUseCamera(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      canvas.width = video.videoWidth || 800;
      canvas.height = video.videoHeight || 600;

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const base64Image = canvas.toDataURL('image/jpeg', 0.8);
      setDocumentData(base64Image);
      setFileName('Foto_Antecedentes.jpg');
      setFileType('image');
      onUpload(base64Image);
      stopCamera();
    }
  };

  const handleRemove = () => {
    setDocumentData(null);
    setFileName('');
    setError('');
    onUpload(null);
  };

  const handlePreview = () => {
    if (!documentData) return;
    
    if (documentData.startsWith('data:application/pdf')) {
      const pdfWindow = window.open("");
      if (pdfWindow) {
        pdfWindow.document.write(
          `<iframe width='100%' height='100%' src='${documentData}'></iframe>`
        );
        pdfWindow.document.title = "Visualizar Antecedentes Criminais";
      } else {
        alert("Por favor, permita pop-ups para visualizar o documento PDF.");
      }
    } else {
      const imgWindow = window.open("");
      if (imgWindow) {
        imgWindow.document.write(
          `<body style="margin:0; background:#0f172a; display:flex; justify-content:center; align-items:center; min-height:100vh;">
            <img src="${documentData}" style="max-width:95%; max-height:95vh; border-radius:8px; box-shadow:0 10px 25px rgba(0,0,0,0.5);" alt="Antecedentes Criminais" />
          </body>`
        );
        imgWindow.document.title = "Visualizar Antecedentes Criminais";
      }
    }
  };

  return (
    <div className="document-upload-container" style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '0.75rem',
      width: '100%',
      padding: '1.15rem',
      borderRadius: '12px',
      background: 'rgba(255, 255, 255, 0.02)',
      border: documentData ? '1px solid var(--accent-success)' : '1px dashed rgba(255, 255, 255, 0.15)',
      marginTop: '0.5rem',
      transition: 'all 0.2s ease'
    }}>
      {/* Label e Indicador */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <label className="form-label" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <FileText size={16} style={{ color: 'var(--accent-primary)' }} />
          <span>{label} {required && <strong style={{ color: '#f87171' }}>*</strong>}</span>
          {helpUrl && (
            <a
              href={helpUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="Como obter a Certidão de Antecedentes Criminais?"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                background: 'rgba(99, 102, 241, 0.15)',
                color: '#a5b4fc',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                fontSize: '0.75rem',
                textDecoration: 'none',
                cursor: 'pointer',
                marginLeft: '0.2rem',
                transition: 'all 0.2s ease'
              }}
            >
              ?
            </a>
          )}
        </label>
        {documentData && (
          <span style={{ 
            fontSize: '0.75rem', 
            color: 'var(--accent-success)', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.25rem',
            background: 'rgba(16, 185, 129, 0.1)',
            padding: '2px 8px',
            borderRadius: '12px',
            fontWeight: 600
          }}>
            <Check size={14} /> Anexado
          </span>
        )}
      </div>

      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.4' }}>
        Anexe a Certidão de Antecedentes Criminais (PDF ou Foto de documento). Obrigatorio para atuação com crianças.
      </p>

      {/* Exibição se Câmera Ativa */}
      {useCamera && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            position: 'relative',
            width: '100%',
            maxHeight: '300px',
            borderRadius: '8px',
            overflow: 'hidden',
            background: '#000',
            border: '2px solid var(--accent-primary)'
          }}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={capturePhoto}
              style={{ flex: 1, padding: '8px 16px', fontSize: '0.8rem' }}
            >
              Capturar Foto
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={stopCamera}
              style={{ padding: '8px 16px', fontSize: '0.8rem' }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Erros de Câmera ou Formato */}
      {(cameraError || error) && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          color: '#f87171',
          fontSize: '0.75rem',
          background: 'rgba(248, 113, 113, 0.08)',
          padding: '8px 12px',
          borderRadius: '6px'
        }}>
          <AlertCircle size={16} />
          <span>{cameraError || error}</span>
        </div>
      )}

      {/* Exibição quando um documento já foi anexado */}
      {!useCamera && documentData && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(255, 255, 255, 0.03)',
          padding: '0.75rem 1rem',
          borderRadius: '8px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          gap: '0.75rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', overflow: 'hidden' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              background: fileType === 'pdf' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(99, 102, 241, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: fileType === 'pdf' ? '#f87171' : '#a5b4fc',
              flexShrink: 0
            }}>
              {fileType === 'pdf' ? <FileText size={20} /> : <FileCheck size={20} />}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <p style={{
                fontSize: '0.85rem',
                fontWeight: 600,
                color: '#fff',
                margin: 0,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {fileName || 'Certidao_Antecedentes'}
              </p>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                {fileType === 'pdf' ? 'Documento PDF' : 'Imagem / Foto'}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
            <button
              type="button"
              onClick={handlePreview}
              title="Visualizar documento"
              style={{
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#fff',
                padding: '6px 10px',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontSize: '0.75rem'
              }}
            >
              <Eye size={14} />
              <span>Ver</span>
            </button>
            {!disabled && (
              <button
                type="button"
                onClick={handleRemove}
                title="Remover documento"
                style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  color: '#f87171',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontSize: '0.75rem'
                }}
              >
                <Trash2 size={14} />
                <span>Remover</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Botões de Ação para Anexar se Nenhum Documento Selecionado */}
      {!useCamera && !documentData && !disabled && (
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => fileInputRef.current?.click()}
            style={{
              flex: 1,
              padding: '10px 14px',
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              background: 'rgba(99, 102, 241, 0.1)',
              border: '1px solid rgba(99, 102, 241, 0.25)',
              color: '#a5b4fc'
            }}
          >
            <Upload size={16} />
            <span>Anexar PDF / Foto</span>
          </button>
          
          <button
            type="button"
            className="btn btn-secondary"
            onClick={startCamera}
            style={{
              padding: '10px 14px',
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}
          >
            <Camera size={16} />
            <span>Fotografar</span>
          </button>
        </div>
      )}

      {/* Elementos invisíveis para processamento */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".pdf, image/*"
        style={{ display: 'none' }}
      />
    </div>
  );
}
