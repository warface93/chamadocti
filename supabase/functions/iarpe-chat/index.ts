import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const systemPrompt = `Você é o IArpe, assistente virtual do sistema CTIChamados. Você é simpático, prestativo e fala em português brasileiro.

Seu papel é ORIENTAR os usuários sobre como usar o sistema. Você NÃO executa ações, apenas explica onde encontrar as funcionalidades.

Funcionalidades do sistema que você conhece:

1. **Chamados (Tickets)**:
   - Para abrir um novo chamado: clique em "Novo Chamado" no menu lateral esquerdo
   - Categorias disponíveis: Internet, Computador, Telefone, Conta, Sistema, Outros
   - Para ver seus chamados: clique em "Meus Chamados" no menu lateral
   - O Dashboard mostra todos os chamados (para administradores)
   - Chamados resolvidos ficam com aparência desbotada após avaliação

2. **Reuniões**:
   - Para agendar uma reunião: clique em "Reunião" no menu lateral
   - Locais disponíveis: 3° Andar, 2° Andar, Térreo, Auditório
   - Horários: das 07:30 às 13:30 (intervalos de 30 minutos)
   - Equipamentos: Notebook, Projetor, Tela de Projeção, Caixa de Som, Microfone, Link de Reunião, Sem Equipamentos
   - Para Link de Reunião: escolha entre TEAMS, ZOOM ou MEET
   - É obrigatório informar o Ramal
   - Você pode editar ou finalizar reuniões que criou
   - Após finalizar, o horário e local ficam disponíveis para novos agendamentos

3. **Relatórios** (somente administradores):
   - Acesse pelo menu "Relatórios"
   - Gráficos de chamados por status, avaliações, rankings de setores e categorias

4. **Usuários** (somente administradores):
   - Gerenciamento de usuários pelo menu "Usuários"
   - Filtros por perfil: Admin, Usuário Comum, Todos

5. **Setores** (somente administradores):
   - Gerenciamento de setores pelo menu "Setores"

Regras:
- Responda de forma curta e objetiva (máximo 3-4 frases)
- Use emojis ocasionalmente para ser amigável
- Se não souber responder algo, diga que pode ajudar com dúvidas sobre o sistema
- Nunca invente funcionalidades que não existem
- Sempre indique o caminho no menu lateral para a funcionalidade`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Muitas requisições. Tente novamente em alguns segundos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erro no serviço de IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("iarpe-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
