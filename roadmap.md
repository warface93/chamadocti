# CTI meeting and ticket improvements
- [x] Rename navigation, reservation labels and Login/Senha category without changing identifiers.
- [x] Exclusive first Sem Equipamentos option and shared fifteen-minute creation/edit slots.
- [x] Persist and validate Outro Local description in creation, editing and details.
- [x] Confirm cancellation with protected audit history and safe outstanding loans.
- [x] Verify automated rules, live persistence, realtime and mobile/tablet/desktop layouts.

# Melhorias no Atendimento (novo documento)
## Chamados
- [ ] 1. Admin altera categoria do chamado no modal (salva, atualiza card/relatórios, registra histórico).
- [ ] 2. Remover "Responsável por"/"Atendido por" dos cards (manter no histórico interno).
- [ ] 3. Histórico completo de alterações do chamado (tabela ticket_history, autor real, imutável).
- [ ] 4. Usuário edita próprio chamado (título, descrição, anexo) com histórico.
- [ ] 5. Observação opcional "Detalhes da resolução" ao marcar Resolvido.
- [ ] 6. Remover botão excluir da janela de detalhes do chamado.
## Reuniões e equipamentos
- [ ] 7. Clique no card da reunião abre detalhes (remover botão "Detalhe"; botões internos sem propagação).
- [ ] 8. Seção "Equipamentos emprestados" nos detalhes da reunião (nome, marca, tombamento, qtd emprestada/devolvida/pendente, status).
- [ ] 9. Usuário solicita devolução (X) com motivo obrigatório e quantidade; sem liberar estoque.
- [ ] 10. Notificação realtime ao admin sobre devolução pendente.
- [ ] 11. Admin confirma recebimento (libera estoque) ou recusa com motivo.
- [ ] 12. Botão "Cancelar Reunião" vermelho ao lado de "Finalizar Reunião" com motivo obrigatório.
- [ ] 13. Edição completa da reunião (todos os campos, revalidação de conflitos/estoque).
## Banco, sync e testes
- [ ] 14. Migrações: ticket_history, resolution_note, return_requests, cancel reason; RLS e grants.
- [ ] 15. Realtime das novas tabelas sem duplicatas.
- [ ] Testes: regras novas (vitest), build, verificação visual.
