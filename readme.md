# Agenda Barbearia

Aplicacao local de agendamento para barbearia, executada por um servidor Node.js simples e com dados persistidos em `db/local-state.json`.

## Funcionalidades

- Agendamento de clientes com servico, barbeiro, data e horario.
- Agenda do barbeiro com concluir, cancelar e WhatsApp.
- Relatorios e financeiro filtrados por barbeiro.
- Painel administrativo para cadastrar barbeiros e agendamentos.
- PWA instalavel com `manifest.webmanifest` e `sw.js`.

## Executar

```bash
npm start
```

Abra `http://127.0.0.1:4173` no navegador.

O projeto nao depende de Netlify, Google Sheets ou banco externo. O servidor local usa o arquivo `db/local-state.json`.
