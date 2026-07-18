import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabase';
import { 
  Image as ImageIcon, 
  MessageSquare, 
  Send, 
  Megaphone, 
  Camera, 
  Trash2, 
  Clock, 
  PlusCircle, 
  AlertCircle,
  X
} from 'lucide-react';

export default function SocialWall({ user }) {
  const [posts, setPosts] = useState([]);
  const [commentsByPost, setCommentsByPost] = useState({});
  const [loading, setLoading] = useState(true);

  // Estados para nova postagem (Apenas Voluntário/Admin)
  const [showCreator, setShowCreator] = useState(false);
  const [postType, setPostType] = useState('foto'); // 'foto' ou 'aviso'
  const [content, setContent] = useState('');
  const [postImage, setPostImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [creatorError, setCreatorError] = useState('');

  // Estados para câmera
  const [useCamera, setUseCamera] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [stream, setStream] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  // Estado para novos comentários (Mapeado por post_id)
  const [newComments, setNewComments] = useState({});
  // Controle de quais seções de comentários estão abertas
  const [openComments, setOpenComments] = useState({});

  // Permissões
  const canPost = user.tipo_usuario === 'admin' || user.tipo_usuario === 'voluntario';
  const isAdmin = user.tipo_usuario === 'admin';

  // Buscar postagens
  const fetchPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .order('data_criacao', { ascending: false });
      if (!error && data) {
        setPosts(data);
      }
    } catch (err) {
      console.error('Erro ao buscar posts:', err);
    } finally {
      setLoading(false);
    }
  };

  // Buscar todos os comentários
  const fetchComments = async () => {
    try {
      const { data, error } = await supabase
        .from('comentarios')
        .select('*')
        .order('data_criacao', { ascending: true });
      if (!error && data) {
        const commentMap = {};
        data.forEach(c => {
          if (!commentMap[c.post_id]) {
            commentMap[c.post_id] = [];
          }
          commentMap[c.post_id].push(c);
        });
        setCommentsByPost(commentMap);
      }
    } catch (err) {
      console.error('Erro ao buscar comentários:', err);
    }
  };

  // Setup Realtime subscriptions
  useEffect(() => {
    fetchPosts();
    fetchComments();

    const postsChannel = supabase
      .channel('posts-realtime-wall')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => {
        fetchPosts();
      })
      .subscribe();

    const commentsChannel = supabase
      .channel('comments-realtime-wall')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comentarios' }, () => {
        fetchComments();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(postsChannel);
      supabase.removeChannel(commentsChannel);
      stopCamera();
    };
  }, []);

  // Câmera do Criador de Post
  const startCamera = async () => {
    setCameraError('');
    setUseCamera(true);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: 600, height: 600 },
        audio: false
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error(err);
      setCameraError('Não foi possível abrir a câmera traseira. Use envio de arquivo.');
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

      // Comprimir para 600x600 pixels para o mural
      canvas.width = 600;
      canvas.height = 600;

      // Desenhar centralizado
      const minDim = Math.min(video.videoWidth, video.videoHeight);
      const sx = (video.videoWidth - minDim) / 2;
      const sy = (video.videoHeight - minDim) / 2;

      ctx.drawImage(video, sx, sy, minDim, minDim, 0, 0, 600, 600);

      const base64Image = canvas.toDataURL('image/jpeg', 0.7);
      setPostImage(base64Image);
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

          canvas.width = 600;
          canvas.height = 600;

          const minDim = Math.min(img.width, img.height);
          const sx = (img.width - minDim) / 2;
          const sy = (img.height - minDim) / 2;

          ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, 600, 600);

          const base64Image = canvas.toDataURL('image/jpeg', 0.7);
          setPostImage(base64Image);
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

  // Enviar novo post
  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!content.trim()) {
      setCreatorError('Por favor, digite uma descrição/conteúdo.');
      return;
    }
    if (postType === 'foto' && !postImage) {
      setCreatorError('Por favor, capture ou selecione uma foto.');
      return;
    }

    setUploading(true);
    setCreatorError('');

    try {
      const { error } = await supabase
        .from('posts')
        .insert([
          {
            autor_id: user.uid,
            autor_nome: user.nome || 'Voluntário',
            tipo: postType,
            conteudo: content,
            imagem: postType === 'foto' ? postImage : null,
            data_criacao: new Date().toISOString()
          }
        ]);

      if (error) throw error;

      // Limpar campos
      setContent('');
      setPostImage(null);
      setShowCreator(false);
      fetchPosts();
    } catch (err) {
      console.error(err);
      setCreatorError('Erro ao criar postagem: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  // Deletar postagem
  const handleDeletePost = async (postId) => {
    if (window.confirm('Tem certeza de que deseja excluir esta postagem? Todos os comentários serão excluídos.')) {
      try {
        const { error } = await supabase
          .from('posts')
          .delete()
          .eq('id', postId);
        if (error) throw error;
        fetchPosts();
      } catch (err) {
        alert('Erro ao excluir postagem: ' + err.message);
      }
    }
  };

  // Enviar comentário
  const handleAddComment = async (postId) => {
    const commentText = newComments[postId] || '';
    if (!commentText.trim()) return;

    try {
      const { error } = await supabase
        .from('comentarios')
        .insert([
          {
            post_id: postId,
            autor_id: user.uid,
            autor_nome: user.nome || 'Usuário',
            conteudo: commentText,
            data_criacao: new Date().toISOString()
          }
        ]);

      if (error) throw error;

      // Limpar campo de comentário específico
      setNewComments(prev => ({ ...prev, [postId]: '' }));
      fetchComments();
    } catch (err) {
      alert('Erro ao enviar comentário: ' + err.message);
    }
  };

  // Deletar comentário
  const handleDeleteComment = async (commentId) => {
    if (window.confirm('Excluir este comentário?')) {
      try {
        const { error } = await supabase
          .from('comentarios')
          .delete()
          .eq('id', commentId);
        if (error) throw error;
        fetchComments();
      } catch (err) {
        alert('Erro ao deletar comentário: ' + err.message);
      }
    }
  };

  const toggleCommentsSection = (postId) => {
    setOpenComments(prev => ({ ...prev, [postId]: !prev[postId] }));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%', maxWidth: '600px', margin: '0 auto', paddingBottom: '2rem' }}>
      
      {/* Cabeçalho da Seção */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 className="heading-font" style={{ fontSize: '1.25rem', margin: 0, color: '#fff' }}>Mural da Família</h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>Fique por dentro das atividades e avisos</p>
        </div>
        
        {/* Botão para abrir criador de postagem (Apenas Voluntário/Admin) */}
        {canPost && !showCreator && (
          <button 
            className="btn btn-primary" 
            onClick={() => setShowCreator(true)}
            style={{ padding: '8px 14px', fontSize: '0.8rem', gap: '0.4rem' }}
          >
            <PlusCircle size={16} />
            <span>Novo Post</span>
          </button>
        )}
      </div>

      {/* ==================== FORMULÁRIO CRIADOR DE POSTAGEM ==================== */}
      {canPost && showCreator && (
        <div className="auth-card" style={{ padding: '1.25rem', position: 'relative', border: '1px solid rgba(99, 102, 241, 0.25)', background: 'rgba(99, 102, 241, 0.02)' }}>
          <button 
            onClick={() => {
              setShowCreator(false);
              stopCamera();
              setUseCamera(false);
            }} 
            style={{ position: 'absolute', top: '12px', right: '12px', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>

          <h3 className="heading-font" style={{ fontSize: '1rem', color: '#fff', marginBottom: '1rem' }}>Criar Nova Publicação</h3>

          {creatorError && (
            <div className="error-banner" style={{ marginBottom: '1rem', padding: '8px 12px' }}>
              <AlertCircle size={16} />
              <span style={{ fontSize: '0.75rem' }}>{creatorError}</span>
            </div>
          )}

          <form onSubmit={handleCreatePost} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Escolha do tipo */}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button 
                type="button" 
                className={`btn ${postType === 'foto' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => { setPostType('foto'); stopCamera(); setUseCamera(false); }}
                style={{ flex: 1, padding: '8px', fontSize: '0.8rem', gap: '0.4rem' }}
              >
                <ImageIcon size={14} />
                <span>Foto de Atividade</span>
              </button>
              <button 
                type="button" 
                className={`btn ${postType === 'aviso' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => { setPostType('aviso'); stopCamera(); setUseCamera(false); }}
                style={{ flex: 1, padding: '8px', fontSize: '0.8rem', gap: '0.4rem' }}
              >
                <Megaphone size={14} />
                <span>Aviso de Culto</span>
              </button>
            </div>

            {/* Campo de legenda/conteúdo */}
            <div className="form-group">
              <label className="form-label">{postType === 'foto' ? 'Legenda da Foto' : 'Conteúdo do Aviso'}</label>
              <textarea
                placeholder={postType === 'foto' ? 'O que as crianças estão aprendendo hoje?' : 'Escreva aqui o comunicado importante...'}
                className="form-input"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
                rows={3}
                style={{ height: 'auto', padding: '10px 12px', fontSize: '0.85rem' }}
              />
            </div>

            {/* Captura de imagem se tipo for FOTO */}
            {postType === 'foto' && (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '1rem',
                borderRadius: '8px',
                background: 'rgba(0,0,0,0.2)',
                border: '1px solid rgba(255,255,255,0.05)'
              }}>
                {/* Visualizador de Câmera/Foto */}
                <div style={{
                  position: 'relative',
                  width: '100%',
                  maxWidth: '250px',
                  aspectRatio: '1',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  background: '#000',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  border: '1px solid rgba(255,255,255,0.1)'
                }}>
                  {useCamera && (
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  )}
                  {!useCamera && postImage && (
                    <img src={postImage} alt="Preview Post" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  )}
                  {!useCamera && !postImage && (
                    <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                      <Camera size={32} style={{ opacity: 0.5, marginBottom: '0.25rem' }} />
                      <p style={{ margin: 0 }}>Nenhuma foto tirada</p>
                    </div>
                  )}
                </div>

                {cameraError && <p style={{ fontSize: '0.75rem', color: '#f87171', margin: 0 }}>{cameraError}</p>}

                {/* Botões do anexo */}
                <div style={{ display: 'flex', gap: '0.5rem', width: '100%', justifyContent: 'center' }}>
                  {useCamera ? (
                    <button type="button" className="btn btn-primary" onClick={capturePhoto} style={{ padding: '6px 12px', fontSize: '0.75rem' }}>
                      Bater Foto
                    </button>
                  ) : postImage ? (
                    <button type="button" className="btn btn-secondary" onClick={() => setPostImage(null)} style={{ padding: '6px 12px', fontSize: '0.75rem', color: '#f87171' }}>
                      Refazer Foto
                    </button>
                  ) : (
                    <>
                      <button type="button" className="btn btn-primary" onClick={startCamera} style={{ padding: '6px 12px', fontSize: '0.75rem', gap: '0.3rem' }}>
                        <Camera size={12} />
                        <span>Usar Câmera</span>
                      </button>
                      <button type="button" className="btn btn-secondary" onClick={triggerFileSelect} style={{ padding: '6px 12px', fontSize: '0.75rem', gap: '0.3rem' }}>
                        <ImageIcon size={12} />
                        <span>Escolher Arquivo</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}

            <button type="submit" className="btn btn-primary" disabled={uploading}>
              {uploading ? 'Publicando...' : 'Publicar no Mural'}
            </button>
          </form>

          {/* Elementos ocultos */}
          <canvas ref={canvasRef} style={{ display: 'none' }} />
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/*"
            style={{ display: 'none' }}
          />
        </div>
      )}

      {/* ==================== LISTA DE PUBLICACÕES ==================== */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <div className="spinner"></div>
        </div>
      ) : posts.length === 0 ? (
        <div className="empty-state" style={{ padding: '3rem 1.5rem', background: 'rgba(255,255,255,0.01)' }}>
          <Megaphone size={40} />
          <p>Nenhuma publicação encontrada no mural ainda.</p>
        </div>
      ) : (
        posts.map((post) => {
          const comments = commentsByPost[post.id] || [];
          const isCommentsOpen = !!openComments[post.id];
          const canDelete = isAdmin || user.uid === post.autor_id;

          return (
            <div 
              key={post.id} 
              className="volunteer-card" 
              style={{
                padding: 0,
                overflow: 'hidden',
                border: post.tipo === 'aviso' ? '1px solid rgba(245, 158, 11, 0.25)' : '1px solid rgba(255,255,255,0.05)',
                background: post.tipo === 'aviso' ? 'rgba(245, 158, 11, 0.02)' : 'var(--bg-card)'
              }}
            >
              
              {/* Header do Post */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1rem 0.5rem 1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: post.tipo === 'aviso' ? 'linear-gradient(135deg, #f59e0b 0%, #b45309 100%)' : 'linear-gradient(135deg, #6366f1 0%, #3730a3 100%)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: '#fff'
                  }}>
                    {post.autor_nome ? post.autor_nome.substring(0, 2).toUpperCase() : 'VO'}
                  </div>
                  <div>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff', display: 'block' }}>{post.autor_nome}</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Clock size={10} />
                      {new Date(post.data_criacao).toLocaleDateString('pt-BR')} às {new Date(post.data_criacao).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                {/* Tags de tipo de post e botão de excluir */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{
                    fontSize: '0.65rem',
                    padding: '2px 8px',
                    borderRadius: '10px',
                    fontWeight: 600,
                    background: post.tipo === 'aviso' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                    color: post.tipo === 'aviso' ? '#f59e0b' : '#a5b4fc'
                  }}>
                    {post.tipo === 'aviso' ? 'AVISO' : 'FOTO'}
                  </span>

                  {canDelete && (
                    <button 
                      onClick={() => handleDeletePost(post.id)}
                      style={{ background: 'none', border: 'none', color: '#ef4444', opacity: 0.7, cursor: 'pointer', padding: '4px' }}
                      title="Excluir Post"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Corpo do Post */}
              <div style={{ padding: '0.5rem 1rem 1rem 1rem' }}>
                <p style={{ fontSize: '0.85rem', color: '#fff', margin: 0, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                  {post.conteudo}
                </p>
              </div>

              {/* Imagem do Post (se for foto) */}
              {post.tipo === 'foto' && post.imagem && (
                <div style={{ width: '100%', aspectRatio: '1', overflow: 'hidden', background: '#000' }}>
                  <img 
                    src={post.imagem} 
                    alt="Post Imagem" 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
              )}

              {/* Barra de Ações do Post (Likes/Comentários) */}
              <div style={{ 
                display: 'flex', 
                borderTop: '1px solid rgba(255,255,255,0.03)',
                background: 'rgba(0,0,0,0.1)',
                padding: '0.5rem 1rem'
              }}>
                <button 
                  onClick={() => toggleCommentsSection(post.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: isCommentsOpen ? 'var(--accent-primary)' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '4px 8px',
                    borderRadius: '4px'
                  }}
                >
                  <MessageSquare size={14} />
                  <span>Comentários ({comments.length})</span>
                </button>
              </div>

              {/* ==================== SEÇÃO DE COMENTÁRIOS EXPANSÍVEL ==================== */}
              {isCommentsOpen && (
                <div style={{ 
                  background: 'rgba(0,0,0,0.15)',
                  borderTop: '1px solid rgba(255,255,255,0.03)',
                  padding: '1rem'
                }}>
                  {/* Lista de comentários */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem', maxHeight: '200px', overflowY: 'auto' }}>
                    {comments.length === 0 ? (
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0, fontStyle: 'italic' }}>
                        Nenhum comentário ainda. Seja o primeiro a comentar!
                      </p>
                    ) : (
                      comments.map((comm) => {
                        const canDeleteComment = isAdmin || user.uid === comm.autor_id;
                        return (
                          <div 
                            key={comm.id} 
                            style={{
                              background: 'rgba(255,255,255,0.01)',
                              border: '1px solid rgba(255,255,255,0.03)',
                              padding: '0.5rem 0.75rem',
                              borderRadius: '8px',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'flex-start'
                            }}
                          >
                            <div>
                              <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#fff' }}>{comm.autor_nome}</span>
                                <span style={{ fontSize: '0.6rem', color: 'var(--text-secondary)' }}>
                                  {new Date(comm.data_criacao).toLocaleDateString('pt-BR')} {new Date(comm.data_criacao).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0', lineHeight: 1.4 }}>
                                {comm.conteudo}
                              </p>
                            </div>

                            {canDeleteComment && (
                              <button 
                                onClick={() => handleDeleteComment(comm.id)}
                                style={{ background: 'none', border: 'none', color: '#f87171', opacity: 0.6, cursor: 'pointer', padding: '2px' }}
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Input para novo comentário */}
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                      type="text"
                      placeholder="Escreva um comentário..."
                      className="form-input"
                      value={newComments[post.id] || ''}
                      onChange={(e) => setNewComments(prev => ({ ...prev, [post.id]: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddComment(post.id);
                      }}
                      style={{ fontSize: '0.75rem', padding: '6px 12px' }}
                    />
                    <button 
                      className="btn btn-primary"
                      onClick={() => handleAddComment(post.id)}
                      style={{ padding: '8px', width: '36px', height: '36px', minWidth: '36px' }}
                    >
                      <Send size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
