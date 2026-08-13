# Agenda Barbearia

Web app de agendamento para barbearia com suporte a PWA, feito para abrir no navegador e poder ser adicionado a tela inicial do celular.

## O que ja tem

- Agendamento por cliente com nome, WhatsApp, servico, barbeiro, data e horario.
- Horarios ocupados ficam bloqueados automaticamente.
- Agenda do dia com concluir, cancelar e abrir conversa no WhatsApp.
- Area restrita com senha para ver agenda e painel.
- Painel para adicionar servicos, barbeiros e bloquear horarios.
- Integracao com Google Sheets via Apps Script.
- Funciona localmente usando `localStorage` enquanto a URL da planilha nao estiver configurada.
- `manifest.webmanifest` e `sw.js` para instalacao como app.

## Como hospedar

Envie estes arquivos para sua hospedagem:

- `index.html`
- `styles.css`
- `app.js`
- `manifest.webmanifest`
- `sw.js`
- `assets/`
- `icons/`

Para aparecer a opcao de adicionar na tela inicial, hospede em HTTPS. Em localhost tambem funciona para teste.

## Como ligar ao Google Sheets

1. Crie uma planilha no Google Sheets.
2. Na planilha, abra `Extensoes` > `Apps Script`.
3. Apague o codigo inicial e cole o conteudo do arquivo `google-apps-script.gs`.
4. Clique em `Implantar` > `Nova implantacao`.
5. Escolha o tipo `App da Web`.
6. Em `Executar como`, escolha `Eu`.
7. Em `Quem pode acessar`, escolha `Qualquer pessoa`.
8. Clique em `Implantar` e copie a URL do Web App.
9. No arquivo `app.js`, cole a URL nesta linha:

```js
const sheetsApiUrl = "";
```

Ela deve ficar parecida com:

```js
const sheetsApiUrl = "https://script.google.com/macros/s/SEU_ID/exec";
```

## Senha da area restrita

A senha inicial e:

```text
1234
```

Para mudar, edite a linha `const adminPassword = "1234";` no arquivo `app.js`.

Tambem altere a mesma senha no arquivo `google-apps-script.gs`:

```js
const ADMIN_PASSWORD = "1234";
```

## Teste local opcional

Se quiser testar antes de hospedar:

```bash
node server.js
```

Depois abra:

```text
http://127.0.0.1:4173
```

## Observacao importante

Com a URL do Google Apps Script configurada, os agendamentos feitos pelo celular do cliente entram na planilha e aparecem no seu painel administrativo.

Como esta e uma versao estatica, a senha protege a interface, mas nao e uma seguranca forte de servidor. Para uma area administrativa realmente segura, o ideal e criar login com backend.
