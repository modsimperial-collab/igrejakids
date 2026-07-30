import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, RotateCcw, AlertCircle, Check } from 'lucide-react';

export default function SelfieCapture({ onCapture, initialValue, label = "Sua Foto (Selfie para identificação)" }) {
  const [photo, setPhoto] = useState(initialValue || null);
  const [useCamera, setUseCamera] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [stream, setStream] = useState(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  // Limpar a câmera ao desmontar o componente
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stream]);

  const startCamera = async () => {
    setCameraError('');
    setUseCamera(true);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 300, height: 300 },
        audio: false
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error('Erro ao acessar a câmera:', err);
      setCameraError('Não foi possível acessar a câmera frontal. Use a opção de arquivo.');
      setUseCamera(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      // Definir tamanho fixo para compressão (300x300)
      canvas.width = 300;
      canvas.height = 300;

      // Desenhar frame do vídeo centralizado/cortado em quadrado
      const minDim = Math.min(video.videoWidth, video.videoHeight);
      const sx = (video.videoWidth - minDim) / 2;
      const sy = (video.videoHeight - minDim) / 2;

      ctx.drawImage(video, sx, sy, minDim, minDim, 0, 0, 300, 300);

      // Comprimir em JPEG com qualidade 0.7 (Base64 compacta)
      const base64Image = canvas.toDataURL('image/jpeg', 0.7);
      setPhoto(base64Image);
      onCapture(base64Image);
      stopCamera();
      setUseCamera(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = canvasRef.current || document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          // Definir tamanho fixo para compressão (300x300)
          canvas.width = 300;
          canvas.height = 300;

          // Desenhar cortando no centro da imagem para manter proporção 1:1
          const minDim = Math.min(img.width, img.height);
          const sx = (img.width - minDim) / 2;
          const sy = (img.height - minDim) / 2;

          ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, 300, 300);

          const base64Image = canvas.toDataURL('image/jpeg', 0.7);
          setPhoto(base64Image);
          onCapture(base64Image);
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileSelect = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const clearPhoto = () => {
    setPhoto(null);
    onCapture(null);
  };

  return (
    <div className="selfie-capture-container" style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '1rem',
      width: '100%',
      padding: '1.25rem',
      borderRadius: '12px',
      background: 'rgba(255, 255, 255, 0.02)',
      border: '1px solid rgba(255, 255, 255, 0.05)',
      marginTop: '0.5rem'
    }}>
      <label className="form-label" style={{ alignSelf: 'flex-start', margin: 0 }}>{label}</label>

      {/* Frame de Exibição / Câmera */}
      <div style={{
        position: 'relative',
        width: '150px',
        height: '150px',
        borderRadius: '50%',
        overflow: 'hidden',
        background: 'rgba(0, 0, 0, 0.2)',
        border: photo ? '3px solid var(--accent-success)' : '2px dashed rgba(255, 255, 255, 0.15)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        {useCamera && (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transform: 'scaleX(-1)' // Espelhar câmera frontal
            }}
          />
        )}

        {!useCamera && photo && (
          <img
            src={photo}
            alt="Selfie"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover'
            }}
          />
        )}

        {!useCamera && !photo && (
          <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
            <Camera size={32} style={{ opacity: 0.5, marginBottom: '0.25rem' }} />
            <p style={{ fontSize: '0.7rem', margin: 0 }}>Sem Foto</p>
          </div>
        )}
      </div>

      {/* Mensagem de Erro de Câmera */}
      {cameraError && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          color: '#f87171',
          fontSize: '0.75rem',
          background: 'rgba(248, 113, 113, 0.08)',
          padding: '6px 12px',
          borderRadius: '6px',
          width: '100%'
        }}>
          <AlertCircle size={14} />
          <span>{cameraError}</span>
        </div>
      )}

      {/* Botões de Ações */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center', width: '100%' }}>
        {useCamera ? (
          <button type="button" className="btn btn-primary" onClick={capturePhoto} style={{ padding: '8px 16px', fontSize: '0.8rem' }}>
            Capturar Foto
          </button>
        ) : photo ? (
          <button type="button" className="btn btn-secondary" onClick={clearPhoto} style={{ padding: '8px 16px', fontSize: '0.8rem', color: '#f87171' }}>
            <RotateCcw size={14} />
            <span>Tirar Outra</span>
          </button>
        ) : (
          <>
            <button type="button" className="btn btn-primary" onClick={startCamera} style={{ padding: '8px 16px', fontSize: '0.8rem', gap: '0.4rem' }}>
              <Camera size={14} />
              <span>Usar Câmera</span>
            </button>
            <button type="button" className="btn btn-secondary" onClick={triggerFileSelect} style={{ padding: '8px 16px', fontSize: '0.8rem', gap: '0.4rem' }}>
              <Upload size={14} />
              <span>Enviar Arquivo</span>
            </button>
          </>
        )}
      </div>

      {/* Elementos ocultos para processamento */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept="image/*"
        style={{ display: 'none' }}
      />
    </div>
  );
}
