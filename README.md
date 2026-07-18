# Igreja Kids - PWA de Controle de Fluxo (Check-In)

Este é um aplicativo PWA desenvolvido com **React + Vite + Vanilla CSS** para o controle de fluxo da **Igreja Kids**. Ele conta com um controle de acesso robusto (RBAC) com três perfis: **Responsável**, **Voluntário** (pendente de aprovação) e **Administrador Mestre**.

O app pode ser implantado na **Vercel** e instalado em dispositivos móveis como um aplicativo nativo (PWA standalone).

---

## 🚀 Funcionalidades

1. **Autenticação Segura**: Login e cadastro integrados ao Firebase Auth.
2. **Controle de Acesso Baseado em Perfis (RBAC)**:
   - **Responsável**: Pode cadastrar crianças e gerar QR codes individuais de check-in em tempo real.
   - **Voluntário**: Tem acesso bloqueado até que um Administrador aprove sua conta. Após aprovada, libera o scanner de câmera para ler QR codes.
   - **Administrador Mestre (Admin)**: Visualiza voluntários pendentes, aprova, recusa/remove cadastros e revoga acesso de voluntários ativos.
3. **Escuta em Tempo Real (Real-time Sync)**: A tela do voluntário atualiza e libera o acesso instantaneamente assim que o Admin clica em "Aprovar" no painel.

---

## 🛠️ Instalação Local

1. Instale as dependências:
   ```bash
   npm install
   ```

2. Crie um arquivo chamado `.env.local` na raiz do projeto e adicione suas credenciais do Firebase:
   ```env
   VITE_FIREBASE_API_KEY=seu_api_key
   VITE_FIREBASE_AUTH_DOMAIN=seu_projeto.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=seu_projeto_id
   VITE_FIREBASE_STORAGE_BUCKET=seu_projeto.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=seu_sender_id
   VITE_FIREBASE_APP_ID=seu_app_id
   ```

3. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```

---

## 🌎 Deploy na Vercel

1. Suba o código para o seu repositório do **GitHub**.
2. No painel da **Vercel**, clique em **Add New > Project** e selecione o repositório.
3. Nas configurações do projeto, adicione as **Environment Variables** listadas no passo 2 acima.
4. Clique em **Deploy**. A Vercel configurará o build automaticamente (Vite React).

---

## 🔒 Regras de Segurança do Firestore

Para manter o aplicativo seguro e evitar que voluntários não aprovados leiam dados sensíveis ou que usuários comuns alterem seus próprios perfis para Admin, configure as seguintes regras no painel **Firestore Database > Rules**:

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    
    // Função auxiliar para verificar se o usuário logado é Admin
    function isAdmin() {
      return request.auth != null && 
        get(/databases/$(database)/documents/usuarios/$(request.auth.uid)).data.tipo_usuario == 'admin';
    }

    // Regras para a coleção de usuários
    match /usuarios/{uid} {
      // Qualquer usuário autenticado pode ler os dados do próprio perfil
      allow read: if request.auth != null && (request.auth.uid == uid || isAdmin());
      
      // Permitir cadastro inicial se o usuário estiver se autenticando
      // O usuário comum NÃO pode definir a si mesmo como 'admin' na criação ou atualização
      allow create: if request.auth != null && request.auth.uid == uid 
                    && request.resource.data.tipo_usuario != 'admin';
                    
      // Apenas o próprio usuário pode alterar seu nome/e-mail (sem mudar seu cargo ou aprovação)
      // Ou um administrador mestre pode atualizar qualquer campo (como aprovado)
      allow update: if request.auth != null && (
        isAdmin() || 
        (request.auth.uid == uid 
         && request.resource.data.tipo_usuario == resource.data.tipo_usuario 
         && request.resource.data.aprovado == resource.data.aprovado)
      );

      // Apenas Admins podem deletar registros de usuários (como recusar voluntário)
      allow delete: if isAdmin();
      
      // Regras para a lista de voluntários (usada pelo Admin)
      // Admins podem listar e buscar todos os voluntários
      allow list: if isAdmin();

      // Regras para a subcoleção de filhos
      match /filhos/{filhoId} {
        // Responsáveis e Admins podem ler e alterar dados das crianças vinculadas ao perfil
        allow read, write: if request.auth != null && (request.auth.uid == uid || isAdmin());
      }
    }
  }
}
```

### Como Criar o Primeiro Administrador?
1. Cadastre-se normalmente no aplicativo pelo e-mail desejado.
2. Acesse o **Firebase Console > Firestore Database**.
3. Localize o documento do seu usuário na coleção `usuarios`.
4. Altere o campo `tipo_usuario` para `admin` e defina `aprovado` como `true`.
5. Pronto! Ao recarregar o app, você será direcionado para o painel de administrador mestre.
