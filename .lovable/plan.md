
# Plano: Corrigir Sistema de Login e Criar Usuário Admin Inicial

## Diagnóstico do Problema

O sistema está com as tabelas vazias:
- `auth.users`: 0 registros
- `profiles`: 0 registros  
- `user_roles`: 0 registros

Os usuários "demo" (admin/joao) eram dados mockados no código antigo e nunca foram criados no banco de dados real após a migração para o Lovable Cloud.

---

## Solução Proposta

### 1. Adicionar Tela de Cadastro Inicial

Modificar a página de Login para incluir uma opção de cadastro quando não houver usuários no sistema.

**Arquivo:** `src/pages/Login.tsx`
- Adicionar verificação: se não existem usuários → mostrar formulário de cadastro
- O primeiro usuário cadastrado automaticamente se torna **Administrador**
- Campos do cadastro: Nome, Username, Email, Senha

### 2. Criar Função de Bootstrap

**Arquivo:** `src/contexts/AuthContext.tsx`
- Adicionar função `signUp()` que cria usuário via `supabase.auth.signUp()`
- O trigger `handle_new_user` no banco já cria automaticamente o profile e a role 'user'

### 3. Atualizar Role do Primeiro Usuário para Admin

Após o primeiro cadastro, promover automaticamente para admin:

**Arquivo:** `src/pages/Login.tsx`
- Após signup bem-sucedido, verificar se é o único usuário
- Se for, atualizar role para 'admin' na tabela `user_roles`

---

## Fluxo de Implementação

```text
┌─────────────────────────────────────────────────────────────┐
│                    TELA DE LOGIN                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Sistema detecta: 0 usuários cadastrados            │   │
│  │                     ↓                               │   │
│  │  Exibe: "Primeiro Acesso - Cadastre-se"             │   │
│  │                     ↓                               │   │
│  │  Formulário:                                        │   │
│  │  • Nome completo                                    │   │
│  │  • Username (para login)                            │   │
│  │  • Email                                            │   │
│  │  • Senha (mín 6 caracteres)                         │   │
│  │                     ↓                               │   │
│  │  Ao cadastrar:                                      │   │
│  │  1. Cria auth.users                                 │   │
│  │  2. Trigger cria profile + role                     │   │
│  │  3. Atualiza role para 'admin'                      │   │
│  │  4. Redireciona para Dashboard                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Sistema detecta: usuários existentes               │   │
│  │                     ↓                               │   │
│  │  Exibe: Formulário de Login normal                  │   │
│  │  • Username                                         │   │
│  │  • Senha                                            │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/Login.tsx` | Adicionar modo de cadastro inicial, verificar se existem usuários, formulário completo |
| `src/contexts/AuthContext.tsx` | Adicionar função `signUp()` e função para verificar quantidade de usuários |

---

## Detalhes Técnicos

### Login.tsx - Novo Fluxo

```typescript
// Pseudo-código da lógica
const [hasUsers, setHasUsers] = useState<boolean | null>(null);
const [isSignUp, setIsSignUp] = useState(false);

useEffect(() => {
  // Verificar se existem usuários no sistema
  checkIfUsersExist();
}, []);

// Se não há usuários → forçar cadastro
// Se há usuários → mostrar login normal com opção de toggle
```

### AuthContext.tsx - Função signUp

```typescript
const signUp = async (data: SignUpData): Promise<boolean> => {
  // 1. Criar usuário via supabase.auth.signUp
  // 2. O trigger handle_new_user cria profile e role
  // 3. Verificar se é primeiro usuário
  // 4. Se sim, promover para admin
  return true;
}
```

---

## Resultado Esperado

1. Ao acessar `/login` pela primeira vez:
   - Aparece formulário de **cadastro inicial**
   - Mensagem: "Primeiro Acesso - Crie sua conta de administrador"
   
2. Após cadastrar o primeiro usuário:
   - Usuário automaticamente vira Admin
   - É redirecionado para o Dashboard
   - Pode criar outros usuários normalmente

3. Nos próximos acessos:
   - Tela de login normal aparece
   - Usuários fazem login com username/senha
