Para integrar a interface **SAGITARIO** ao Virtual Radar Server (VRS) de forma nativa e sem alterar os arquivos originais do sistema, utiliza-se o plugin oficial **Custom Content** (Conteúdo Personalizado). A instalação consiste em injetar três arquivos fundamentais (`sagitario.css`, `setores_sct.js` e `sagitario.js`) em pontos específicos da estrutura HTML da página do mapa.

### 1. Preparação dos Arquivos

Salve os três arquivos do sistema em uma pasta local de fácil acesso no computador onde o VRS está instalado (exemplo utilizado nas configurações: `E:\Virtual Radar Base\Mapa\`).

---

### 2. Configuração das Injeções no VRS

Abra o painel desktop do VRS e navegue até **Ferramentas -> Opções -> Custom Content** (ou **Opções** no menu principal). Certifique-se de que a caixa geral **Ativado** no topo da janela esteja marcada.

Clique no botão **Novo** para adicionar cada um dos três arquivos e configure os parâmetros exatamente conforme as instruções abaixo:

**A. Folha de Estilos (`sagitario.css`)**
Responsável pelo visual tático, cores de alto contraste, menus limpos e formatação da simbologia aeronáutica.

* **Inserir arquivo:** `E:\Virtual Radar Base\Mapa\sagitario.css` *(ou o seu caminho local)*
* **De:** `Head`
* **Em:** `End`
* **Endereço:** `*` *(o asterisco aplica a modificação em todas as páginas do mapa)*
* **Ativado:** Marque a caixa (`Sim`)
<img width="673" height="526" alt="image" src="https://github.com/user-attachments/assets/3dbe93f9-a153-4eca-bd81-cd5d021071cc" />


**B. Banco de Dados do Setor (`setores_sct.js`)**
Arquivo que armazena as coordenadas do espaço aéreo, aerovias, fixos e procedimentos em uma variável JavaScript global (`TEXTO_SCT`), permitindo a leitura instantânea pelo navegador.

* **Inserir arquivo:** `E:\Virtual Radar Base\Mapa\setores_sct.js`
* **De:** `Head`
* **Em:** `End`
* **Endereço:** `*`
* **Ativado:** Marque a caixa (`Sim`)
<img width="672" height="527" alt="image" src="https://github.com/user-attachments/assets/c5412a49-cb8f-4f1b-aff1-19f4b9d40c02" />


**C. Motor Operacional (`sagitario.js`)**
Script principal que executa a renderização acelerada por GPU (`L.canvas`), o roteamento blindado de camadas civis e militares, o painel terminal ATC e a inteligência de zoom (LOD).

* **Inserir arquivo:** `E:\Virtual Radar Base\Mapa\sagitario.js`
* **De:** `Body` *(Atenção: este arquivo deve ser injetado na seção Body, e não no Head)*
* **Em:** `End`
* **Endereço:** `*`
* **Ativado:** Marque a caixa (`Sim`)
<img width="671" height="520" alt="image" src="https://github.com/user-attachments/assets/dca448dd-b047-4cba-8a5f-ccc61b80716c" />
---

### 3. Resumo dos Parâmetros de Injeção

| Arquivo | De (Seção HTML) | Em (Posição) | Endereço | Ativado |
| --- | --- | --- | --- | --- |
| **`sagitario.css`** | `HEAD` | `End` | `*` | Sim |
| **`setores_sct.js`** | `HEAD` | `End` | `*` | Sim |
| **`sagitario.js`** | `BODY` | `End` | `*` | Sim |

---

### 4. Diretório Raiz e Finalização

No rodapé da janela, na seção **Substituir/Adicionar o conteúdo do site**, verifique se a **Pasta raiz do site** está apontando para o diretório base das suas customizações do VRS (ex: `E:\Virtual Radar Base`).

Clique em **OK** para salvar as configurações. Para testar o funcionamento, feche o navegador e abra o endereço web do seu radar em uma **Janela Anônima / Modo Privado**, garantindo que o cache antigo seja descartado e os novos scripts de controle de tráfego aéreo e renderização vetorial sejam executados corretamente.
