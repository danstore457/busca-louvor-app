# MeuLouvor - Ministério de Louvor & Adoração 🎵

O **MeuLouvor** é uma aplicação web moderna e colaborativa projetada especificamente para ministérios de louvor e adoração organizarem seu repertório musical de forma ágil, intuitiva e em tempo real no altar.

O sistema permite que qualquer músico ou membro cadastre novas músicas com suas respectivas letras e links de referência (YouTube/Spotify), enquanto mantém recursos sensíveis de gerenciamento protegidos sob uma área administrativa segura.

---

## ✨ Funcionalidades Principais

*   **🔍 Busca Dinâmica em Tempo Real**: Filtre instantaneamente por título da música, nome do ministério/comunidade ou palavras contidas dentro da letra.
*   **➕ Cadastro Público Colaborativo**: Qualquer integrante do ministério pode cadastrar novas canções com título, ministério, link de vídeo/áudio e letra completa.
*   **🔐 Área Restrita (Painel Administrativo)**:
    *   Autenticação segura para líderes e administradores do ministério.
    *   **Monitoramento de Presença**: Veja em tempo real quantos administradores estão logados e quantos músicos estão acessando o catálogo.
    *   **Controles de Moderação**: Apenas administradores autorizados possuem permissão para **Editar** ou **Apagar** as músicas do repertório.
*   **📱 Interface Totalmente Responsiva**: Perfeitamente adaptada para celulares, tablets (ideal para uso em suportes de partitura no altar) e computadores.
*   **🎭 Modal Personalizado de Confirmação**: Sistema seguro para evitar exclusões acidentais ao apagar uma canção.
*   **💾 Persistência Dupla (Banco de Dados)**:
    *   Pronto para **PostgreSQL** em produção (basta configurar a variável `DATABASE_URL`).
    *   Fallback inteligente para arquivo **JSON local** automático caso o banco de dados não esteja disponível (perfeito para desenvolvimento offline ou hospedagens simples).

---

## 🛠️ Tecnologias Utilizadas

*   **Frontend**: React (Vite), TypeScript, Tailwind CSS, Motion (Animações), Lucide React (Ícones).
*   **Backend**: Node.js com Express e TypeScript.
*   **Banco de Dados**: PostgreSQL (com fallback automatizado para arquivo JSON).

---

## 🚀 Como Executar o Projeto Localmente

### 1. Clonar o repositório
```bash
git clone <url-do-seu-repositorio>
cd meulouvor
```

### 2. Instalar as dependências
```bash
npm install
```

### 3. Executar em modo de desenvolvimento
```bash
npm run dev
```
O servidor iniciará localmente no endereço `http://localhost:3000`.

### 4. Compilar para Produção (Build)
```bash
npm run build
npm start
```

---

## 📦 Estrutura de Variáveis de Ambiente (.env)

O projeto funciona perfeitamente sem nenhuma configuração inicial usando armazenamento JSON local. Para conectar a um banco de dados PostgreSQL real em produção, basta criar um arquivo `.env` na raiz do projeto e definir:



---

