<div align="center">

# 📦 Tombamentos · Control Room

**Painel web para controlar tombamentos de equipamentos: cadastro, transferências entre lojas/setores, baixas e correções, tudo em uma única tela.**

![HTML5](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=black)
![Sem dependências](https://img.shields.io/badge/depend%C3%AAncias-nenhuma-10b981)
![Servidor](https://img.shields.io/badge/servidor-n%C3%A3o%20necess%C3%A1rio-3b82f6)

<img src="docs/dashboard.png" alt="Dashboard do painel de tombamentos, com o mapa do Brasil" width="900">

<sub>Exemplo com localizações fictícias de estado e cidade.</sub>

</div>

---

## 📑 Sumário

- [O que o painel faz](#-o-que-o-painel-faz)
- [Como executar](#-como-executar)
- [Telas](#-telas)
- [Processos](#-processos)
- [Mapa do Brasil](#-mapa-do-brasil)
- [Regras de negócio](#-regras-de-negócio)
- [Dados e armazenamento](#-dados-e-armazenamento)
- [Estrutura do código](#-estrutura-do-código)
- [Observações importantes](#-observações-importantes)

---

## ✨ O que o painel faz

| | Função |
|---|---|
| ➕ | **Cadastrar** um novo equipamento |
| 🔁 | **Registrar transferências** de um equipamento entre lojas/setores |
| ⬇️ | **Registrar baixas** de tombamentos |
| 🔎 | **Consultar e corrigir** qualquer informação de um equipamento |
| 🗺️ | Ver em um **mapa do Brasil** interativo os estados e as cidades onde os equipamentos estão |
| 📊 | Acompanhar **indicadores**, resumo por tipo, situação geral e últimas transferências |
| 📋 | **Editar as tabelas** diretamente, como em uma planilha |
| 💾 | **Exportar/importar** dados (JSON) e exportar tabelas em CSV |

Nenhum campo é bloqueado por lista fechada: **qualquer texto pode ser digitado em qualquer campo**. As listas que aparecem (marcas, unidades, tombamentos) são apenas sugestões.

---

## 🚀 Como executar

1. Mantenha a **estrutura de pastas** abaixo (o HTML carrega o CSS e o JavaScript por caminho relativo).
2. Abra o `tombamentos_painel.html` no navegador (duplo clique).

```text
📁 sua-pasta/
├── 📄 tombamentos_painel.html   ← estrutura da página (HTML)
├── 📁 css/
│   └── 🎨 estilos.css           ← aparência do painel (CSS)
├── 📁 js/
│   ├── ⚙️ painel.js             ← lógica do painel (JavaScript)
│   ├── 🗺️ mapa.js               ← mapa do Brasil interativo (SVG)
│   ├── 📍 brasil-estados.js     ← contornos dos 27 estados (dados)
│   └── 📍 brasil-cidades.js     ← municípios com coordenadas (dados)
└── 📁 docs/
    └── 🖼️ dashboard.png         ← imagem usada neste README
```

> **Sem instalação, sem servidor, sem internet.** Não há bibliotecas externas nem CDN.
> Testado no Chromium. Use um navegador atual (Chrome, Edge, Firefox ou Safari recentes).

O painel **abre vazio** na primeira vez: cadastre os equipamentos pelo Dashboard ou traga dados existentes com **Importar JSON**, na aba **Dados**.

---

## 🧭 Telas

O menu superior alterna entre as telas:

| Tela | Para que serve |
|---|---|
| **Dashboard** | Indicadores, formulários de cadastro/transferência/baixa, consulta com correção, resumo e últimas transferências |
| **Equipamentos** | Lista unificada, somente leitura, com busca e filtro por situação. Clicar em uma linha abre a consulta daquele equipamento |
| **Novo Tombamento** | Tabela de equipamentos, editável nas células |
| **Transferência** | Tabela de transferências, editável nas células |
| **Baixa** | Tabela de baixas, editável nas células |
| **Dados** | Backup, importação e exportação em CSV |

### Dashboard em detalhe

| Bloco | Conteúdo |
|---|---|
| **Indicadores** | Equipamentos · Sem tombamento · Transferências · Transferidos · Baixas · Validados |
| **Mapa do Brasil** | Estados coloridos pela quantidade de equipamentos, cidades marcadas, busca de local e painel do estado |
| **Novo equipamento** | Equipamento, Marca, Tombamento, Unidade/Setor, **Estado (UF)**, **Cidade**, Nota fiscal, Data da compra |
| **Nova transferência** | Data, Tombamento, Origem, Destino, **Estado destino**, **Cidade destino**, Responsável, Observação |
| **Consultar e corrigir** | Valores atuais de um tombamento e a coluna **Corrigir para** |
| **Registrar baixa** | Tombamento e Data |
| **Equipamentos por tipo** | Barras com quantidade total e quantidade transferida por tipo |
| **Situação** | Gráfico de rosca com a distribuição das situações |
| **Últimas transferências** | As 8 mais recentes, a mais nova no topo |

---

## ⚙️ Processos

<details>
<summary><b>➕ Cadastrar equipamento</b></summary>

<br>

- **Obrigatórios:** Equipamento e Unidade/Setor.
- O **tombamento é opcional** (equipamentos aguardando número aparecem como *Sem tombamento*).
- Se o tombamento informado **já existir**, nada é gravado.
- O novo equipamento entra com **Validado = Não**.

</details>

<details>
<summary><b>🔁 Registrar transferência</b></summary>

<br>

- **Obrigatórios:** Tombamento e Destino. O tombamento precisa existir em *Novo Tombamento*.
- **Origem vazia** → usa o *local atual* do equipamento.
- **Data vazia** → usa a data de hoje.
- Origem e destino **iguais** (sem diferenciar maiúsculas) são recusados.
- Ao digitar o tombamento, o painel mostra o equipamento e o local atual.

</details>

<details>
<summary><b>⬇️ Registrar baixa</b></summary>

<br>

- O tombamento precisa existir e **não pode já estar baixado**.
- Data vazia → hoje.
- Depois da baixa, a situação do equipamento passa a ser **Baixado**.

</details>

<details>
<summary><b>🔎 Consultar e corrigir</b></summary>

<br>

Digite ou escolha um tombamento. A tabela mostra os valores **Atuais** e a coluna **Corrigir para**:

| Campo | Observação |
|---|---|
| Equipamento, Marca, Unidade/Setor, Nota fiscal | Texto livre |
| Tombamento (nº) | Ao trocar o número, ele também é atualizado nas transferências e baixas |
| Data da compra | Formato `dd/mm/aaaa` |
| Validado | `Sim` ou `Não` |
| Origem, Local atual, Data da última transf. | Alteram o registro da **última transferência** do equipamento |
| Estado (UF) e Cidade do local atual | Alteram a **última transferência**; sem transferência, alteram o cadastro. Trocar o estado sem informar a cidade limpa a cidade antiga |
| Situação, Nº de transferências | Somente leitura (resultado dos demais dados) |

**Como usar:** preencha **só o que mudou** e clique em **SALVAR ALTERAÇÕES**.

- Campo vazio → **não altera**.
- `-` (hífen) → **apaga** o campo. *Equipamento* e *Local atual* não podem ficar vazios.
- Datas inexistentes (como `31/13/2026`) são recusadas.
- O tombamento novo **não pode já existir**.
- Um tombamento que já tem transferência ou baixa **não pode ser apagado** (`-`), para não deixar registros órfãos.
- Tombamento **duplicado** que já tenha transferência ou baixa não pode ser renomeado (não há como saber a qual linha elas pertencem).
- Equipamento **sem transferência**: *Local atual* altera a *Unidade/Setor*; *Origem* e *Data da transferência* são recusadas.
- *Unidade/Setor* e *Local atual* diferentes ao mesmo tempo são recusados.

</details>

<details>
<summary><b>📋 Editar nas tabelas</b></summary>

<br>

- Edite direto nas células; a alteração é salva ao sair do campo.
- **+ linha** adiciona uma linha em branco; **✕** exclui (com confirmação).
- Trocar o tombamento em *Novo Tombamento* segue as mesmas regras da consulta.

</details>

<details>
<summary><b>💾 Aba Dados</b></summary>

<br>

| Botão | Ação |
|---|---|
| **Exportar tudo (JSON)** | Baixa `tombamentos_backup.json` com as três tabelas |
| **Importar JSON** | Aceita o backup do painel **ou** uma lista de linhas exportada da planilha (veja abaixo). Pede confirmação antes de substituir |
| **CSV novo / transf / baixa** | Uma tabela em CSV (separador `;`, UTF-8 com BOM, abre direto no Excel) |

</details>

<details>
<summary><b>📥 Importar dados da planilha</b></summary>

<br>

O botão **Importar JSON** reconhece a tabela pelo nome das colunas (sem diferenciar maiúsculas, acentos ou o que estiver entre parênteses):

| Tabela | Colunas reconhecidas |
|---|---|
| **Novo Tombamento** | `EQUIPAMENTO` · `Marca` · `Tombamento` · `Unidade/Setor` · `NOTA FISCAL` · `DATA COMPRA` · `VALIDADO PATRIMONIO` |
| **Transferência** | `DATA` · `TOMBAMENTO` · `ORIGEM` · `DESTINO` · `RESPONSÁVEL` · `OBSERVAÇÃO` · `VALIDADO PATRIMONIO` (as colunas de equipamento, marca e unidade são ignoradas) |
| **Baixa** | `NUMERO TOMBAMENTO` · `DATA` · `VALIDADO PATRIMONIO` |

**Passo a passo (a partir do Google Sheets):**

1. Na aba desejada, vá em **Arquivo → Fazer download → Valores separados por vírgula (.csv)**.
2. Converta o CSV em JSON com qualquer conversor online (CSV → JSON).
3. No painel, abra **Dados → Importar JSON** e escolha o arquivo.
4. Confirme a substituição. Repita para cada aba.

**O que acontece na importação:**

- Só a tabela reconhecida é substituída; as outras permanecem como estão.
- Linhas totalmente em branco são ignoradas.
- Datas `dd/mm/aaaa` são convertidas; datas inexistentes (como `21/25/2026`) ficam vazias e o aviso lista os tombamentos afetados.
- Os tombamentos continuam como texto, preservando os zeros à esquerda.
- Também são aceitos o backup do painel (`Exportar tudo`) e um objeto com uma lista por aba.
- Se o arquivo não for reconhecido, o aviso explica o motivo e **nenhum dado é alterado**.

</details>

---

## 🗺️ Mapa do Brasil

No Dashboard, entre os indicadores e os formulários, o mapa mostra **onde os equipamentos estão**.

| Ação | Resultado |
|---|---|
| **Arrastar** | Move o mapa |
| **Roda do mouse** ou **＋ / −** | Amplia e reduz (de 1× a 14×) em torno do cursor |
| **⌂** | Volta a mostrar o Brasil inteiro |
| **Passar o mouse** | Mostra o estado ou a cidade e a quantidade de equipamentos |
| **Clicar em um estado** | Seleciona e mostra, ao lado, região, total e cidades; **Ver equipamentos** abre a lista filtrada |
| **Clicar em uma cidade (ponto)** | Abre a lista de equipamentos daquela cidade |

**Como o mapa é montado**

- Cada equipamento conta no **local atual**: o *estado e a cidade do destino da última transferência* ou, sem transferência, os do cadastro.
- Equipamentos **baixados** não aparecem.
- Estados ficam mais claros conforme a quantidade de equipamentos; estados sem equipamentos ficam escuros.
- As cidades são marcadas nas coordenadas do município (tabela do IBGE embutida em `js/brasil-cidades.js`). Uma cidade que não esteja na tabela colore o estado, mas não ganha ponto, e entra em "sem coordenadas" no resumo.
- Nos formulários, ao escolher o **Estado (UF)**, a lista de **Cidades** sugere os municípios dele. O campo é livre: dá para digitar qualquer cidade.
- A cidade só pode ser informada junto com o estado. O estado aceita a sigla (`MA`) ou o nome (`Maranhão`) na importação.

### 🔌 Ganchos para o geolocalizador

Os pontos de ligação estão marcados no código com `[GEOLOCALIZADOR n]` (busque por esse texto em `js/painel.js` e `js/mapa.js`):

| # | Onde | Para que serve |
|---|---|---|
| 1 | `GEO_EXTRA` / `coordCidade` | Coordenadas de cidades ou locais que não estão na tabela do IBGE |
| 2 | `Geolocalizador.localizar` | Serviço de geocodificação (texto → coordenadas). Hoje avisa "não conectado" |
| 3 | `dadosMapa` | Monta os pontos do mapa a partir dos equipamentos |
| 4 | Campo **Localizar** / `geoBuscar` | Busca um endereço ou local e leva o mapa até ele |
| 5 | Evento `mapa:estado` | Estado clicado (`uf`, `nome`, `regiao`, `total`) |
| 6 | `Mapa.irPara(lat, lon, zoom)` | Move o mapa até uma coordenada |
| 7 | `Mapa.setDados` | Desenha pontos extras (`extra: true`, em vermelho) vindos do geolocalizador |
| 8 | Evento `mapa:cidade` | Cidade clicada (`uf`, `cidade`, `lat`, `lon`, `valor`) |
| 9 | `geoDe` | Se o registro tiver `lat` e `lon` numéricos, o ponto usa essas coordenadas exatas |

> Os contornos dos estados e os municípios vêm de dados públicos do **IBGE** (contornos simplificados para carregar rápido).

---

## 📐 Regras de negócio

### Situação de um equipamento

A situação é calculada, nunca digitada. A **primeira** regra que se aplica vence:

| # | Condição | Situação |
|---|---|---|
| 1 | Sem número de tombamento | 🔴 **Sem tombamento** |
| 2 | Tombamento consta na tabela de baixas | ⚪ **Baixado** |
| 3 | Tem ao menos uma transferência | 🟠 **Transferido** |
| 4 | Nenhuma das anteriores | 🟢 **Sem transferência** |

### Outras regras

- **Última transferência** = a última linha da tabela de transferências com aquele tombamento.
- **Local atual** = *Destino* da última transferência; sem transferência, a *Unidade/Setor* do cadastro.
- **Tombamento duplicado** aparece com o alerta ⚠ na lista de equipamentos e na consulta.
- **Equipamentos por tipo** agrupam pelo texto do campo *Equipamento*, sem diferenciar maiúsculas:

| Tipo | Regra |
|---|---|
| Computador / PC | contém `computador` ou é exatamente `pc` |
| Notebook · Monitor · Nobreak · Impressora | contém o nome |
| Leitor de preço | contém `preço` |
| PowerBalun | contém `balun` |
| Access Point | é exatamente `ap` |
| Outros | todo o restante |

---

## 🗄️ Dados e armazenamento

### Modelo de dados

Os dados ficam em um objeto com três listas:

| Lista | Campos |
|---|---|
| `novo` (equipamentos) | `equip` · `marca` · `tomb` · `unid` · `uf` · `cidade` · `nf` · `dcomp` · `val` |
| `transf` (transferências) | `data` · `tomb` · `orig` · `dest` · `uf` · `cidade` · `resp` · `obs` · `val` |
| `baixa` (baixas) | `tomb` · `data` · `val` |

Datas são guardadas como `aaaa-mm-dd` e exibidas como `dd/mm/aaaa`. O tombamento é sempre **texto**, para preservar zeros à esquerda (`000687`).

### Onde os dados ficam

```mermaid
flowchart LR
    A["Painel<br/>(memória: db)"] <--> B[("localStorage<br/>chave: tomb_db")]
    A -- exportar --> C["JSON / CSV"]
    C -- importar JSON --> A
```

- Na **primeira abertura** não há dados: as três tabelas começam vazias.
- **Cada alteração é salva automaticamente** no `localStorage`.
- Os dados ficam **neste navegador, neste computador**. Para mover ou guardar, use **Exportar tudo (JSON)**.

---

## 🧩 Estrutura do código

O código é dividido em **três arquivos**, cada um com uma responsabilidade, e organizado em seções comentadas.

| Arquivo | Responsabilidade |
|---|---|
| `tombamentos_painel.html` | Esqueleto da página (24 linhas) |
| `css/estilos.css` | Toda a aparência |
| `js/painel.js` | Dados, regras, processos e telas |

### HTML

```html
<head>   <!-- meta, título e <link rel="stylesheet" href="css/estilos.css"> -->
<body>
  <header>  <!-- título, relógio (#clk) e menu (#nav) -->
  <main id="app">   <!-- a tela atual é desenhada aqui -->
  <div id="toast">  <!-- aviso temporário -->
  <script src="js/brasil-estados.js">   <!-- contornos dos estados -->
  <script src="js/brasil-cidades.js">    <!-- municípios e coordenadas -->
  <script src="js/mapa.js">               <!-- mapa interativo -->
  <script src="js/painel.js">             <!-- lógica do painel -->
```

O HTML é praticamente um esqueleto: as telas são montadas pelo JavaScript dentro de `#app`.

### CSS

Em `css/estilos.css`, seções comentadas, nesta ordem: *Variáveis de cor · Cabeçalho e navegação · Layout geral e cartões · Indicadores · Formulários e campos · Tabelas · Etiquetas de situação · Gráficos · Aviso temporário · Responsivo*.

| Variável | Uso |
|---|---|
| `--bg` | Fundo da página |
| `--c` | Fundo dos cartões |
| `--b` | Bordas |
| `--t` / `--m` | Texto principal / texto secundário |
| `--bl` `--g` `--y` `--r` | Azul, verde, amarelo e vermelho |

- Os gráficos de barras e a rosca usam **CSS puro** (`conic-gradient`), sem biblioteca.
- Abaixo de 1150 px de largura, as colunas se reorganizam (layout responsivo).

### JavaScript

`js/painel.js` é dividido em seções:

| Seção | O que contém |
|---|---|
| **ARMAZENAMENTO** | Adaptadores de dados e carga inicial |
| **UTIL** | Funções auxiliares: `t` (limpa texto), `n` (minúsculas), `D` (data para `dd/mm/aaaa`), `pd` (interpreta data), `T0` (hoje), `h` (escapa HTML), `toast` |
| **REGRAS** | `lastT`, `situ`, `loc`, `dup`, a lista `TIPOS` e as regras de estado/cidade (`normUF`, `validarLocal`) |
| **PROCESSOS** | `cadastrar`, `registrar`, `baixar`, `salvar` |
| **GEOLOCALIZAÇÃO** | `geoDe`, `dadosMapa`, `coordCidade`, `Geolocalizador`, `geoBuscar`, `iniciarMapa` e os eventos do mapa |
| **TELAS** | `render`, `dash`, `cons`, `eqv`, `grid`, `dados` e os tratadores de eventos |

**Como uma tela é desenhada:**

```mermaid
flowchart LR
    A["Clique no menu<br/>go(tab)"] --> B["render()"]
    B --> C["dash() · eqv() · grid() · dados()"]
    C --> D["HTML em #app"]
    E["Botão do formulário<br/>act(w)"] --> F["cadastrar · registrar<br/>baixar · salvar"]
    F -- "ok" --> G["save() + render()"]
    F -- "erro" --> H["Mensagem no formulário"]
```

**Convenção dos campos de formulário (`id`):**

| Prefixo | Formulário |
|---|---|
| `n_` | Novo equipamento (`n_equip`, `n_marca`, `n_tomb`, `n_unid`, `n_uf`, `n_cidade`, `n_nf`, `n_dcomp`) |
| `t_` | Nova transferência (`t_data`, `t_tomb`, `t_orig`, `t_dest`, `t_uf`, `t_cidade`, `t_resp`, `t_obs`) |
| `b_` | Baixa (`b_tomb`, `b_data`) |
| `c_key` | Tombamento consultado |
| `c_` | Campos "Corrigir para" (`c_equip`, `c_marca`, `c_tomb`, `c_unid`, `c_nf`, `c_dcomp`, `c_val`, `c_orig`, `c_dest`, `c_data`, `c_uf`, `c_cidade`) |

Cada processo devolve um resultado simples `{ ok, m }`, em que `m` é a mensagem mostrada ao usuário. Mensagens de sucesso começam com ✔ e as de aviso com ⚠.

### Armazenamento trocável

Toda leitura e gravação passam por um único adaptador, escolhido em uma linha:

```js
const ADAPTER = 'local'; // 'local' = localStorage do navegador
```

Os pontos do código preparados para uma futura integração com servidor e banco estão marcados com comentários `[SERVIDOR/BD n]`. Para listá-los, busque por `[SERVIDOR/BD` em `js/painel.js`.

---

## ⚠️ Observações importantes

- 💾 **Faça backups.** Os dados vivem no `localStorage` do navegador: limpar os dados do navegador apaga o painel. Use **Exportar tudo (JSON)** com frequência.
- 📍 **Precisão do mapa.** As cidades são marcadas no centro do município (tabela do IBGE), não no endereço do equipamento. Equipamentos sem estado informado, ou transferidos sem informar o estado de destino, não aparecem no mapa e são contados em "sem estado informado".
- 🛟 **Dados ilegíveis.** Se o conteúdo salvo no navegador estiver corrompido ou o armazenamento estiver bloqueado, o painel abre vazio e mostra um aviso, em vez de travar.
- 🖥️ **Um navegador, um computador.** Abrir o painel em outro navegador ou máquina começa **vazio**; para levar os dados, exporte o JSON e importe no outro lugar.
- 🔁 **Tombamentos duplicados** são tratados como o mesmo equipamento nas regras de situação (as duas linhas aparecem como transferidas). Por isso o alerta ⚠: corrija o número pela consulta.
- 👥 **Uso individual.** Não há login nem controle de acesso: o painel foi pensado para uma pessoa por vez no próprio computador.