# 🔔 Configuração de Push Notifications - EDucfy+

## ✅ O Que Já Está Funcionando

**Todas as notificações in-app estão 100% funcionais!**

O app agora envia notificações para:
- 💙 **Curtidas no Efeed** - Quando alguém curte seu post
- 💬 **Mensagens Diretas** - Quando você recebe uma mensagem privada
- 👥 **Grupo da Turma** - Quando alguém envia mensagem no chat da turma
- 📊 **Notas** - Quando o professor adiciona uma nova nota

Você verá essas notificações:
- ✅ No painel de notificações (sino no topo do app)
- ✅ Em tempo real quando o app está aberto
- ✅ Com nome e foto de quem enviou
- ✅ Com preview da mensagem/ação

## 🔐 Status da Configuração

**Firebase Admin SDK: ✅ CONFIGURADO**
- As credenciais da conta de serviço estão instaladas
- O servidor está autenticado corretamente

**Falta apenas 1 passo:** Habilitar a API do Firebase Cloud Messaging no Google Cloud Console

## 🚀 Último Passo: Habilitar Push Notifications em Background

Para que as notificações push funcionem quando o app está fechado ou o celular travado, você precisa habilitar a Firebase Cloud Messaging API:

### Passo Único: Habilitar Firebase Cloud Messaging API

1. **Acesse o Google Cloud Console:**
   - Vá para [Firebase Cloud Messaging API](https://console.cloud.google.com/apis/library/fcm.googleapis.com)
   - OU use este link direto para o projeto: [FCM API - edufy-vurodev](https://console.cloud.google.com/apis/library/fcm.googleapis.com?project=edufy-vurodev)

2. **Certifique-se que está no projeto correto:**
   - No topo da página, verifique se está selecionado: **edufy-vurodev**

3. **Ative a API:**
   - Clique no botão azul **ATIVAR** (ou "Enable" se estiver em inglês)
   - Aguarde 10-15 segundos para a API ser ativada
   - Você verá uma mensagem confirmando que a API foi ativada

4. **Pronto!**
   - As notificações push já devem estar funcionando
   - Não é necessário reiniciar o servidor
   - Teste enviando uma mensagem para si mesmo

## 📱 Como Ativar Notificações no Navegador

Para receber notificações push, cada usuário precisa:

1. **Abrir o app no navegador**
2. **Clicar no sino** (ícone de notificações no topo)
3. **Clicar em "Ativar Notificações"**
4. **Permitir** quando o navegador pedir permissão

Isso salva o token FCM do usuário no banco de dados, permitindo enviar notificações push.

## 🧪 Como Testar

### Teste 1: Notificações In-App (Já Funcionam)
1. Abra o app em duas abas/navegadores diferentes
2. Faça login com usuários diferentes
3. Envie uma mensagem, curta um post, ou adicione uma nota
4. ✅ A notificação deve aparecer imediatamente no sino

### Teste 2: Push Notifications (Após Configurar)
1. Ative as notificações no navegador (botão no painel de notificações)
2. **Feche a aba do app** (ou minimize)
3. Em outra conta, envie uma mensagem para você
4. ✅ Você deve receber uma notificação do navegador mesmo com o app fechado

### Verificar nos Logs
Abra o console do navegador (F12) e procure por:
- ✅ `Push notification sent successfully` = Funcionando!
- ❌ `Push notification failed` ou `Auth error` = Precisa configurar permissões

## 🎯 Tipos de Notificação Implementados

| Evento | In-App | Push (Background) | Status |
|--------|--------|-------------------|--------|
| Curtida no post | ✅ | ⚙️ Precisa configurar | Implementado |
| Mensagem direta | ✅ | ⚙️ Precisa configurar | Implementado |
| Mensagem no grupo | ✅ | ⚙️ Precisa configurar | Implementado |
| Nova nota | ✅ | ⚙️ Precisa configurar | Implementado |

## ❓ Dúvidas Comuns

**P: As notificações in-app funcionam mas as push não. É normal?**
R: Sim! As notificações in-app funcionam perfeitamente. As push precisam que você configure as permissões do Firebase Admin SDK (veja Passo 1 e 2 acima).

**P: Já configurei mas ainda não funciona. O que fazer?**
R: Aguarde 2-3 minutos após configurar as permissões e reinicie o servidor. Se ainda não funcionar, verifique se:
- A Firebase Cloud Messaging API está ativada
- As roles foram adicionadas corretamente à service account
- O usuário clicou em "Ativar Notificações" no app

**P: Como sei se um usuário tem notificações ativadas?**
R: No console do navegador, você verá: `FCM token found for user [uid]` quando uma notificação é enviada.

**P: Preciso fazer algo no celular?**
R: Para PWA (app instalado), o navegador gerencia as notificações automaticamente. Basta o usuário ter permitido notificações na primeira vez que acessar o app.
