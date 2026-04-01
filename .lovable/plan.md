## Plano de Implementação

### 1. Performance & Skeleton Loading
- Adicionar skeleton loading nas páginas Dashboard, Usuários, Setores e Relatórios
- Otimizar carregamento de dados com estados de loading do DataContext

### 2. Ajustes na Reunião
- Adicionar opção "Outro Local" (sem validação de conflito, não aparece em reuniões em aberto)
- Campo obrigatório "Tema da Reunião"
- Filtros de pesquisa (Data, Local, Tema)
- Validação: não permitir horários passados no mesmo dia
- Ampliar horários para 07:30 às 17:00
- Paginação: 6 cards (usuário) e 12 cards (admin)

### 3. Menu Equipamentos (Admin)
- Nova tabela `equipment_inventory` (tipo, marca, tombamento)
- Nova página para cadastrar, editar e excluir equipamentos
- Rota e menu sidebar apenas para admin

### 4. Fluxo de Finalização de Reuniões
- Renomear seção para "Reuniões Finalizadas em Aguardo"
- Reuniões com equipamentos → status "Aguardando devolução" ao finalizar
- Reuniões sem equipamentos → finalização direta
- Admin marca equipamentos como devolvidos → status final "Devolvido"

### 5. Ícone de Relógio
- Alterar cor para branco/cinza claro em todos os locais

### 6. Exportação de Relatórios
- Botão "Baixar relatório de chamados"
- Filtros por dia, mês, ano
- Exportar em Excel (.xlsx) e CSV (.csv)

### Ordem de execução
1. Migration (tabela equipamentos + campo tema em meetings)
2. Performance/Skeleton loading
3. Ajustes reunião (usuário + admin)
4. Menu Equipamentos
5. Fluxo finalização
6. Ícone relógio
7. Exportação relatórios
