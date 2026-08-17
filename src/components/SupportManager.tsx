import React, { useState } from "react";
import {
  PerfilAcesso,
  PermissoesPerfil,
  UsuarioAuth,
  Militar,
  temPermissao,
  isAdmin
} from "../types";
import {
  Shield,
  ShieldCheck,
  Users,
  KeyRound,
  Lock,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  AlertCircle,
  HelpCircle,
  RotateCcw,
  CheckCircle2,
  Search,
  Settings,
  Grid,
  Calendar,
  AlertTriangle,
  Briefcase,
  UserX,
  FileText,
  Building2,
  Info,
  ChevronRight,
  LifeBuoy
} from "lucide-react";

interface SupportManagerProps {
  perfis: PerfilAcesso[];
  usuarios: UsuarioAuth[];
  militares: Militar[];
  usuarioLogado: UsuarioAuth | null;
  onUpdatePerfis: (novosPerfis: PerfilAcesso[]) => void;
  onUpdateUsuarios: (novosUsuarios: UsuarioAuth[]) => void;
}

const PERMISSOES_CONFIG: {
  categoria: string;
  descricao: string;
  icon: React.ElementType;
  items: {
    chave: keyof PermissoesPerfil;
    titulo: string;
    detalhe: string;
  }[];
}[] = [
  {
    categoria: "Escala Semanal",
    descricao: "Permissões relativas à visualização, confecção e ajustes da grade semanal.",
    icon: Grid,
    items: [
      {
        chave: "escalaVisualizar",
        titulo: "Visualizar Escala Semanal",
        detalhe: "Permite acessar e consultar a grade semanal de terça a segunda-feira."
      },
      {
        chave: "escalaEditar",
        titulo: "Editar Escala e Alocar Militares (Drag & Drop)",
        detalhe: "Permite arrastar e alocar militares ou reforço extraordinário na grade semanal."
      },
      {
        chave: "escalaPermuta",
        titulo: "Homologar Permutas (SIGADOC)",
        detalhe: "Permite registrar permutas oficiais vinculadas a processo SIGADOC."
      },
      {
        chave: "escalaAjuste",
        titulo: "Realizar Ajustes e Substituições",
        detalhe: "Permite realizar ajustes manuais imediatos em postos escalados."
      },
      {
        chave: "escalaPdf",
        titulo: "Gerar e Imprimir PDF Oficial",
        detalhe: "Permite visualizar e exportar o documento oficial da escala em PDF."
      }
    ]
  },
  {
    categoria: "Projeção Mensal (30 Dias)",
    descricao: "Controle da rotatividade contínua e projeção automática de serviços.",
    icon: Calendar,
    items: [
      {
        chave: "projecaoVisualizar",
        titulo: "Visualizar Projeção Mensal",
        detalhe: "Permite consultar o calendário de projeção para os próximos 30 dias."
      },
      {
        chave: "projecaoExecutar",
        titulo: "Executar Projeção Automática",
        detalhe: "Permite acionar o algoritmo de geração automática de escalas futuras."
      },
      {
        chave: "projecaoResetar",
        titulo: "Resetar Projeções Futuras",
        detalhe: "Permite limpar projeções automáticas não efetivadas."
      }
    ]
  },
  {
    categoria: "Central de Conflitos & Auditoria",
    descricao: "Acesso a alertas de regras, descanso mínimo e sobreposições.",
    icon: AlertTriangle,
    items: [
      {
        chave: "conflitosVisualizar",
        titulo: "Acessar Central de Conflitos",
        detalhe: "Permite visualizar inconformidades, violações de 24h e alertas de fadiga."
      }
    ]
  },
  {
    categoria: "Postos de Serviço",
    descricao: "Gestão dos postos operacionais (24h) e expediente administrativo.",
    icon: Briefcase,
    items: [
      {
        chave: "postosVisualizar",
        titulo: "Visualizar Postos de Serviço",
        detalhe: "Permite consultar a relação de postos cadastrados na unidade."
      },
      {
        chave: "postosEditar",
        titulo: "Gerenciar Postos (CRUD)",
        detalhe: "Permite criar, editar horários/turnos e excluir postos de serviço."
      }
    ]
  },
  {
    categoria: "Efetivo Militar",
    descricao: "Gestão dos policiais militares e antiguidade hierárquica.",
    icon: Users,
    items: [
      {
        chave: "efetivoVisualizar",
        titulo: "Visualizar Efetivo Militar",
        detalhe: "Permite consultar a lista de policiais militares e números de RG."
      },
      {
        chave: "efetivoEditar",
        titulo: "Gerenciar Efetivo (CRUD & Antiguidade)",
        detalhe: "Permite cadastrar militares, ajustar ordem de senioridade e CNH."
      }
    ]
  },
  {
    categoria: "Férias & Ausências",
    descricao: "Controle de licenças, férias regulamentares e dispensas médicas.",
    icon: UserX,
    items: [
      {
        chave: "afastamentosVisualizar",
        titulo: "Visualizar Afastamentos",
        detalhe: "Permite consultar afastamentos e datas de retorno do efetivo."
      },
      {
        chave: "afastamentosEditar",
        titulo: "Gerenciar Afastamentos (CRUD)",
        detalhe: "Permite cadastrar e remover períodos de férias, licenças e cursos."
      }
    ]
  },
  {
    categoria: "Configurações da Unidade",
    descricao: "Personalização do cabeçalho oficial e determinações do comando.",
    icon: Building2,
    items: [
      {
        chave: "configuracoesEditar",
        titulo: "Editar Cabeçalho e Determinações",
        detalhe: "Permite alterar dados do cabeçalho da PMMT e diretrizes da escala."
      }
    ]
  },
  {
    categoria: "Suporte & Perfis de Acesso",
    descricao: "Administração de segurança, contas de usuários e regras de acesso.",
    icon: ShieldCheck,
    items: [
      {
        chave: "suporteAcesso",
        titulo: "Acessar Módulo de Suporte",
        detalhe: "Permite abrir a aba de Suporte no menu superior."
      },
      {
        chave: "gerenciarPerfis",
        titulo: "Gerenciar Perfis de Acesso e Permissões",
        detalhe: "Permite criar perfis personalizados e alterar matrizes de permissão."
      },
      {
        chave: "gerenciarUsuarios",
        titulo: "Gerenciar Usuários e Atribuição de Perfis",
        detalhe: "Permite criar usuários, vincular perfis e resetar senhas."
      }
    ]
  }
];

export const SupportManager: React.FC<SupportManagerProps> = ({
  perfis,
  usuarios,
  militares,
  usuarioLogado,
  onUpdatePerfis,
  onUpdateUsuarios
}) => {
  const [subTab, setSubTab] = useState<"perfis" | "usuarios" | "faq">("perfis");

  // Selected profile in editor
  const [perfilSelecionadoId, setPerfilSelecionadoId] = useState<string>(
    perfis[0]?.id || "admin"
  );
  const perfilSelecionado =
    perfis.find((p) => p.id === perfilSelecionadoId) || perfis[0];

  // Modals / forms
  const [showNovoPerfilModal, setShowNovoPerfilModal] = useState(false);
  const [novoPerfilNome, setNovoPerfilNome] = useState("");
  const [novoPerfilDescricao, setNovoPerfilDescricao] = useState("");
  const [novoPerfilCor, setNovoPerfilCor] = useState("bg-purple-600/20 text-purple-300 border-purple-500/30");

  const [showNovoUsuarioModal, setShowNovoUsuarioModal] = useState(false);
  const [novoUserUsername, setNovoUserUsername] = useState("");
  const [novoUserNome, setNovoUserNome] = useState("");
  const [novoUserPerfilId, setNovoUserPerfilId] = useState("efetivo");
  const [novoUserSenha, setNovoUserSenha] = useState("123456");
  const [novoUserMilitarId, setNovoUserMilitarId] = useState("");

  const [userSearch, setUserSearch] = useState("");
  const [userFilterPerfil, setUserFilterPerfil] = useState<string>("todos");

  // Feedback notifications
  const [feedbackMsg, setFeedbackMsg] = useState<{
    tipo: "sucesso" | "erro";
    texto: string;
  } | null>(null);

  const mostrarFeedback = (texto: string, tipo: "sucesso" | "erro" = "sucesso") => {
    setFeedbackMsg({ texto, tipo });
    setTimeout(() => setFeedbackMsg(null), 3500);
  };

  const podeGerenciarPerfis =
    isAdmin(usuarioLogado) ||
    temPermissao(usuarioLogado, perfis, "gerenciarPerfis");

  const podeGerenciarUsuarios =
    isAdmin(usuarioLogado) ||
    temPermissao(usuarioLogado, perfis, "gerenciarUsuarios");

  // Toggle single permission for current profile
  const handleTogglePermissao = (chave: keyof PermissoesPerfil) => {
    if (!podeGerenciarPerfis) {
      mostrarFeedback("Você não tem permissão para alterar regras de perfis.", "erro");
      return;
    }
    if (!perfilSelecionado) return;

    const novasPermissoes: PermissoesPerfil = {
      ...perfilSelecionado.permissoes,
      [chave]: !perfilSelecionado.permissoes[chave]
    };

    const novosPerfis = perfis.map((p) =>
      p.id === perfilSelecionado.id
        ? { ...p, permissoes: novasPermissoes }
        : p
    );

    onUpdatePerfis(novosPerfis);
    mostrarFeedback(`Permissão '${chave}' atualizada no perfil '${perfilSelecionado.nome}'.`);
  };

  // Toggle all permissions in a category for current profile
  const handleToggleCategoria = (
    items: { chave: keyof PermissoesPerfil }[],
    ativar: boolean
  ) => {
    if (!podeGerenciarPerfis || !perfilSelecionado) return;

    const novasPermissoes: PermissoesPerfil = { ...perfilSelecionado.permissoes };
    items.forEach((item) => {
      novasPermissoes[item.chave] = ativar;
    });

    const novosPerfis = perfis.map((p) =>
      p.id === perfilSelecionado.id
        ? { ...p, permissoes: novasPermissoes }
        : p
    );

    onUpdatePerfis(novosPerfis);
    mostrarFeedback(`Permissões da categoria atualizadas para o perfil '${perfilSelecionado.nome}'.`);
  };

  // Create new profile
  const handleSalvarNovoPerfil = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoPerfilNome.trim()) {
      mostrarFeedback("Informe o nome do novo perfil de acesso.", "erro");
      return;
    }

    const novoId = `perfil-${Date.now().toString(36)}`;
    const novoPerfil: PerfilAcesso = {
      id: novoId,
      nome: novoPerfilNome.trim(),
      descricao: novoPerfilDescricao.trim() || "Perfil de acesso personalizado.",
      corBadge: novoPerfilCor,
      isSistema: false,
      permissoes: {
        escalaVisualizar: true,
        escalaEditar: false,
        escalaPermuta: false,
        escalaAjuste: false,
        escalaPdf: true,
        projecaoVisualizar: true,
        projecaoExecutar: false,
        projecaoResetar: false,
        conflitosVisualizar: false,
        postosVisualizar: false,
        postosEditar: false,
        efetivoVisualizar: true,
        efetivoEditar: false,
        afastamentosVisualizar: false,
        afastamentosEditar: false,
        configuracoesEditar: false,
        suporteAcesso: false,
        gerenciarPerfis: false,
        gerenciarUsuarios: false
      }
    };

    onUpdatePerfis([...perfis, novoPerfil]);
    setPerfilSelecionadoId(novoId);
    setShowNovoPerfilModal(false);
    setNovoPerfilNome("");
    setNovoPerfilDescricao("");
    mostrarFeedback(`Perfil '${novoPerfil.nome}' criado com sucesso!`);
  };

  // Delete custom profile
  const handleExcluirPerfil = (perfilId: string) => {
    const perfil = perfis.find((p) => p.id === perfilId);
    if (!perfil) return;
    if (perfil.isSistema) {
      mostrarFeedback("Perfis padrão do sistema não podem ser excluídos.", "erro");
      return;
    }

    // Reassign users of this profile to 'efetivo'
    const novosUsuarios = usuarios.map((u) =>
      u.perfilId === perfilId ? { ...u, perfilId: "efetivo" } : u
    );
    onUpdateUsuarios(novosUsuarios);

    const novosPerfis = perfis.filter((p) => p.id !== perfilId);
    onUpdatePerfis(novosPerfis);
    setPerfilSelecionadoId(novosPerfis[0]?.id || "admin");
    mostrarFeedback(`Perfil '${perfil.nome}' excluído com sucesso.`);
  };

  // Create new user
  const handleCriarNovoUsuario = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoUserUsername.trim() || !novoUserNome.trim()) {
      mostrarFeedback("Preencha o Login/RGPMMT e o Nome de exibição.", "erro");
      return;
    }

    const usernameExistente = usuarios.some(
      (u) => u.username.trim().toLowerCase() === novoUserUsername.trim().toLowerCase()
    );
    if (usernameExistente) {
      mostrarFeedback("Já existe um usuário cadastrado com este Login/RGPMMT.", "erro");
      return;
    }

    const novoUser: UsuarioAuth = {
      id: `user-${Date.now().toString(36)}`,
      username: novoUserUsername.trim(),
      nomeDisplay: novoUserNome.trim(),
      password: novoUserSenha || "123456",
      primeiroAcesso: false,
      role: novoUserPerfilId === "admin" ? "admin" : novoUserPerfilId === "comandante" ? "comandante" : "operador",
      perfilId: novoUserPerfilId,
      militarId: novoUserMilitarId || undefined
    };

    onUpdateUsuarios([...usuarios, novoUser]);
    setShowNovoUsuarioModal(false);
    setNovoUserUsername("");
    setNovoUserNome("");
    setNovoUserMilitarId("");
    setNovoUserSenha("123456");
    mostrarFeedback(`Usuário '${novoUser.nomeDisplay}' cadastrado com sucesso!`);
  };

  // Change user profile assignment
  const handleAlterarPerfilUsuario = (userId: string, novoPerfilId: string) => {
    if (!podeGerenciarUsuarios) {
      mostrarFeedback("Você não tem permissão para alterar perfis de usuários.", "erro");
      return;
    }

    const user = usuarios.find((u) => u.id === userId);
    if (!user) return;

    if (user.username === "admin" && novoPerfilId !== "admin") {
      mostrarFeedback("O usuário 'admin' master deve permanecer com o perfil Administrador.", "erro");
      return;
    }

    const novos = usuarios.map((u) =>
      u.id === userId
        ? {
            ...u,
            perfilId: novoPerfilId,
            role: (novoPerfilId === "admin"
              ? "admin"
              : novoPerfilId === "comandante"
              ? "comandante"
              : "operador") as any
          }
        : u
    );

    onUpdateUsuarios(novos);
    mostrarFeedback(`Perfil do usuário '${user.nomeDisplay}' atualizado.`);
  };

  // Reset user password to '123456'
  const handleResetarSenhaUsuario = (userId: string) => {
    if (!podeGerenciarUsuarios) return;
    const user = usuarios.find((u) => u.id === userId);
    if (!user) return;

    const novos = usuarios.map((u) =>
      u.id === userId ? { ...u, password: "123456", primeiroAcesso: true } : u
    );

    onUpdateUsuarios(novos);
    mostrarFeedback(`Senha do usuário '${user.nomeDisplay}' redefinida para '123456'.`);
  };

  // Delete user
  const handleExcluirUsuario = (userId: string) => {
    if (!podeGerenciarUsuarios) return;
    const user = usuarios.find((u) => u.id === userId);
    if (!user) return;

    if (user.username === "admin" || user.username === "comandante") {
      mostrarFeedback("Usuários essenciais do sistema não podem ser excluídos.", "erro");
      return;
    }

    const novos = usuarios.filter((u) => u.id !== userId);
    onUpdateUsuarios(novos);
    mostrarFeedback(`Usuário '${user.nomeDisplay}' removido.`);
  };

  // Filtered users list
  const usuariosFiltrados = usuarios.filter((u) => {
    const matchSearch =
      u.nomeDisplay.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.username.toLowerCase().includes(userSearch.toLowerCase());
    const matchPerfil =
      userFilterPerfil === "todos" || u.perfilId === userFilterPerfil;
    return matchSearch && matchPerfil;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-in fade-in duration-300">
      {/* Toast Notification */}
      {feedbackMsg && (
        <div
          className={`fixed top-20 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border transition-all animate-in slide-in-from-top duration-300 ${
            feedbackMsg.tipo === "sucesso"
              ? "bg-slate-900 border-emerald-500/40 text-emerald-300"
              : "bg-slate-900 border-rose-500/40 text-rose-300"
          }`}
        >
          {feedbackMsg.tipo === "sucesso" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          )}
          <span className="text-xs font-bold text-slate-100">{feedbackMsg.texto}</span>
        </div>
      )}

      {/* Main Header */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl backdrop-blur-md flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <LifeBuoy className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold tracking-wider text-blue-400 uppercase">
                Módulo Administrativo
              </span>
              <span className="bg-blue-600/20 text-blue-300 text-[10px] font-bold px-2 py-0.5 rounded border border-blue-500/30">
                PMMT • Suporte & Governança
              </span>
            </div>
            <h2 className="text-xl font-black text-slate-100 flex items-center gap-2">
              Suporte e Gestão de Perfis de Acesso
            </h2>
          </div>
        </div>

        {/* Sub-menu Tabs */}
        <div className="flex items-center gap-1 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
          <button
            onClick={() => setSubTab("perfis")}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              subTab === "perfis"
                ? "bg-blue-600 text-white shadow-md"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Perfis de Acesso & Permissões</span>
          </button>

          <button
            onClick={() => setSubTab("usuarios")}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              subTab === "usuarios"
                ? "bg-blue-600 text-white shadow-md"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Usuários & Atribuições ({usuarios.length})</span>
          </button>

          <button
            onClick={() => setSubTab("faq")}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              subTab === "faq"
                ? "bg-blue-600 text-white shadow-md"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Manual & Instruções PMMT</span>
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: PERFIS DE ACESSO */}
      {subTab === "perfis" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Profile Selector & Management */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-100 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-blue-400" />
                    Perfis Cadastrados
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Selecione para configurar o que cada perfil pode acessar
                  </p>
                </div>

                {podeGerenciarPerfis && (
                  <button
                    onClick={() => setShowNovoPerfilModal(true)}
                    className="p-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 rounded-xl transition-all cursor-pointer"
                    title="Adicionar Novo Perfil de Acesso"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Profiles List */}
              <div className="space-y-2">
                {perfis.map((perfil) => {
                  const isSelected = perfil.id === perfilSelecionadoId;
                  const qtdUsuariosNoPerfil = usuarios.filter(
                    (u) => u.perfilId === perfil.id
                  ).length;

                  return (
                    <div
                      key={perfil.id}
                      onClick={() => setPerfilSelecionadoId(perfil.id)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isSelected
                          ? "bg-slate-800/90 border-blue-500 shadow-md ring-1 ring-blue-500/30"
                          : "bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40"
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-slate-100">
                            {perfil.nome}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded border ${perfil.corBadge}`}
                          >
                            {perfil.id.toUpperCase()}
                          </span>
                          {perfil.isSistema && (
                            <span className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.2 rounded font-bold border border-slate-700">
                              SISTEMA
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                          {perfil.descricao}
                        </p>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 pt-0.5">
                          <span>{qtdUsuariosNoPerfil} usuário(s) vinculado(s)</span>
                        </div>
                      </div>

                      <ChevronRight
                        className={`w-4 h-4 shrink-0 transition-transform ${
                          isSelected ? "text-blue-400 translate-x-1" : "text-slate-600"
                        }`}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick Summary Card */}
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 text-xs text-slate-400 space-y-2">
              <div className="flex items-center gap-2 font-bold text-slate-200">
                <Info className="w-4 h-4 text-blue-400" />
                <span>Sobre as Regras de Acesso</span>
              </div>
              <p className="leading-relaxed">
                As permissões definidas aqui entram em vigor instantaneamente em toda a aplicação. O perfil <strong>Administrador do Sistema</strong> possui controle irrestrito.
              </p>
            </div>
          </div>

          {/* Right Column: Permission Matrix for Selected Profile */}
          <div className="lg:col-span-8 space-y-4">
            {perfilSelecionado && (
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
                {/* Profile Header Details */}
                <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <h3 className="text-lg font-black text-slate-100">
                        {perfilSelecionado.nome}
                      </h3>
                      <span
                        className={`text-xs font-bold px-2.5 py-0.5 rounded-lg border ${perfilSelecionado.corBadge}`}
                      >
                        ID: {perfilSelecionado.id}
                      </span>
                      {perfilSelecionado.isSistema && (
                        <span className="text-[10px] bg-slate-800 text-slate-300 font-bold px-2 py-0.5 rounded border border-slate-700">
                          Perfil Padrão PMMT
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400">
                      {perfilSelecionado.descricao}
                    </p>
                  </div>

                  {!perfilSelecionado.isSistema && podeGerenciarPerfis && (
                    <button
                      onClick={() => handleExcluirPerfil(perfilSelecionado.id)}
                      className="flex items-center gap-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Excluir Perfil</span>
                    </button>
                  )}
                </div>

                {/* Categories & Permission Checkboxes */}
                <div className="space-y-6">
                  {PERMISSOES_CONFIG.map((cat) => {
                    const CatIcon = cat.icon;
                    const todasAtivas = cat.items.every(
                      (it) => perfilSelecionado.permissoes[it.chave]
                    );

                    return (
                      <div
                        key={cat.categoria}
                        className="bg-slate-950/70 border border-slate-800/90 rounded-xl p-4 space-y-3"
                      >
                        {/* Category Header */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-blue-600/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
                              <CatIcon className="w-4 h-4" />
                            </div>
                            <div>
                              <h4 className="text-xs font-extrabold text-slate-200">
                                {cat.categoria}
                              </h4>
                              <p className="text-[11px] text-slate-400">
                                {cat.descricao}
                              </p>
                            </div>
                          </div>

                          {podeGerenciarPerfis && perfilSelecionado.id !== "admin" && (
                            <button
                              onClick={() =>
                                handleToggleCategoria(cat.items, !todasAtivas)
                              }
                              className="text-[11px] text-blue-400 hover:text-blue-300 font-bold px-2 py-1 hover:bg-blue-600/10 rounded cursor-pointer transition-colors"
                            >
                              {todasAtivas ? "Desmarcar Todos" : "Marcar Todos"}
                            </button>
                          )}
                        </div>

                        {/* Items Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
                          {cat.items.map((item) => {
                            const isHabilitado = Boolean(
                              perfilSelecionado.permissoes[item.chave]
                            );
                            const isSuperAdmin = perfilSelecionado.id === "admin";

                            return (
                              <div
                                key={item.chave}
                                onClick={() => {
                                  if (!isSuperAdmin) {
                                    handleTogglePermissao(item.chave);
                                  }
                                }}
                                className={`p-3 rounded-lg border transition-all flex items-start justify-between gap-3 ${
                                  isHabilitado
                                    ? "bg-blue-600/10 border-blue-500/40 text-slate-200"
                                    : "bg-slate-900/60 border-slate-800/80 text-slate-500"
                                } ${
                                  !isSuperAdmin && podeGerenciarPerfis
                                    ? "cursor-pointer hover:border-slate-700"
                                    : "cursor-default opacity-90"
                                }`}
                              >
                                <div className="space-y-0.5">
                                  <span className="text-xs font-bold block text-slate-100">
                                    {item.titulo}
                                  </span>
                                  <p className="text-[10.5px] text-slate-400 leading-snug">
                                    {item.detalhe}
                                  </p>
                                </div>

                                <div
                                  className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 border transition-all mt-0.5 ${
                                    isHabilitado
                                      ? "bg-blue-600 border-blue-500 text-white"
                                      : "bg-slate-800 border-slate-700 text-transparent"
                                  }`}
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 2: USUÁRIOS & ATRIBUIÇÃO DE PERFIS */}
      {subTab === "usuarios" && (
        <div className="space-y-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            {/* Top Bar: Search, Filters & Add User */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
                {/* Search */}
                <div className="relative flex-1 min-w-[200px] max-w-md">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Buscar por nome ou RGPMMT/Login..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Profile Filter */}
                <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs">
                  <span className="text-slate-400 font-bold">Perfil:</span>
                  <select
                    value={userFilterPerfil}
                    onChange={(e) => setUserFilterPerfil(e.target.value)}
                    className="bg-transparent text-slate-200 focus:outline-none cursor-pointer font-semibold"
                  >
                    <option value="todos" className="bg-slate-900">Todos os Perfis</option>
                    {perfis.map((p) => (
                      <option key={p.id} value={p.id} className="bg-slate-900">
                        {p.nome}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {podeGerenciarUsuarios && (
                <button
                  onClick={() => setShowNovoUsuarioModal(true)}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Cadastrar Novo Usuário</span>
                </button>
              )}
            </div>

            {/* Users Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-800/80">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/80 text-[11px] uppercase tracking-wider text-slate-400 font-bold border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Policial / Usuário</th>
                    <th className="py-3 px-4">Login (RGPMMT)</th>
                    <th className="py-3 px-4">Perfil de Acesso</th>
                    <th className="py-3 px-4">Status / Credencial</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-900/40 font-medium">
                  {usuariosFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-500 font-bold">
                        Nenhum usuário encontrado com os filtros atuais.
                      </td>
                    </tr>
                  ) : (
                    usuariosFiltrados.map((user) => {
                      const perfilAtribuido =
                        perfis.find((p) => p.id === user.perfilId) ||
                        perfis.find((p) => p.id === "efetivo");

                      const isSelf = usuarioLogado?.id === user.id;

                      return (
                        <tr key={user.id} className="hover:bg-slate-800/40 transition-colors">
                          {/* Name & Badge */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-[11px] text-slate-300">
                                {user.nomeDisplay.charAt(0)}
                              </div>
                              <div>
                                <span className="font-extrabold text-slate-100 block">
                                  {user.nomeDisplay}
                                </span>
                                {isSelf && (
                                  <span className="text-[10px] text-blue-400 font-bold">
                                    (Sessão Atual)
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Login */}
                          <td className="py-3 px-4 font-mono text-slate-300 font-bold">
                            {user.username}
                          </td>

                          {/* Profile Dropdown Selector */}
                          <td className="py-3 px-4">
                            {podeGerenciarUsuarios && user.username !== "admin" ? (
                              <select
                                value={user.perfilId || "efetivo"}
                                onChange={(e) =>
                                  handleAlterarPerfilUsuario(user.id, e.target.value)
                                }
                                className={`text-xs font-bold px-2.5 py-1 rounded-lg border focus:outline-none cursor-pointer ${
                                  perfilAtribuido?.corBadge || "bg-slate-800 text-slate-300 border-slate-700"
                                }`}
                              >
                                {perfis.map((p) => (
                                  <option
                                    key={p.id}
                                    value={p.id}
                                    className="bg-slate-900 text-white font-medium"
                                  >
                                    {p.nome}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span
                                className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border ${
                                  perfilAtribuido?.corBadge || "bg-slate-800 text-slate-300 border-slate-700"
                                }`}
                              >
                                {perfilAtribuido?.nome || "Efetivo"}
                              </span>
                            )}
                          </td>

                          {/* Status */}
                          <td className="py-3 px-4">
                            {user.primeiroAcesso ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded">
                                Senha Padrão (123456)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded">
                                Senha Personalizada
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {podeGerenciarUsuarios && (
                                <button
                                  onClick={() => handleResetarSenhaUsuario(user.id)}
                                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-lg transition-colors cursor-pointer"
                                  title="Redefinir senha para padrão (123456)"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {podeGerenciarUsuarios &&
                                user.username !== "admin" &&
                                user.username !== "comandante" && (
                                  <button
                                    onClick={() => handleExcluirUsuario(user.id)}
                                    className="p-1.5 bg-slate-800 hover:bg-rose-950 text-rose-400 rounded-lg transition-colors cursor-pointer"
                                    title="Excluir Usuário"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: MANUAL & INSTRUÇÕES PMMT */}
      {subTab === "faq" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3 text-blue-400">
              <Shield className="w-6 h-6" />
              <h3 className="text-base font-extrabold text-slate-100">
                Hierarquia e Perfis Padrão da PMMT
              </h3>
            </div>
            <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
              <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 space-y-1">
                <span className="font-bold text-red-400">1. Administrador do Sistema (admin)</span>
                <p className="text-slate-400">
                  Acesso irrestrito a todas as configurações de sistema, criação e customização de perfis, auditorias completas e gestão de credenciais.
                </p>
              </div>
              <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 space-y-1">
                <span className="font-bold text-amber-400">2. Comandante (comandante)</span>
                <p className="text-slate-400">
                  Responsável pela montagem e alteração das escalas semanais, acionamento do motor de projeção de 30 dias, homologação de permutas via SIGADOC e ajuste de postos.
                </p>
              </div>
              <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 space-y-1">
                <span className="font-bold text-blue-400">3. Efetivo (RGPMMT)</span>
                <p className="text-slate-400">
                  Policiais militares da unidade que consultam a escala, verificam suas escalas futuras na projeção mensal e baixam o arquivo PDF oficial assinado pelo comando.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3 text-emerald-400">
              <HelpCircle className="w-6 h-6" />
              <h3 className="text-base font-extrabold text-slate-100">
                Regras e Diretrizes Operacionais
              </h3>
            </div>
            <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
              <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 space-y-1">
                <span className="font-bold text-emerald-300">Descanso Regulamentar de 24 Horas</span>
                <p className="text-slate-400">
                  Após término de plantão operacional de 24h, o sistema bloqueia qualquer novo agendamento que viole o descanso obrigatório.
                </p>
              </div>
              <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 space-y-1">
                <span className="font-bold text-blue-300">Permutas Oficiais via SIGADOC</span>
                <p className="text-slate-400">
                  Trocas de serviço entre policiais requerem registro do número do processo SIGADOC, constando nas notas de rodapé do PDF oficial.
                </p>
              </div>
              <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 space-y-1">
                <span className="font-bold text-purple-300">Reforço Extraordinário</span>
                <p className="text-slate-400">
                  Permite suprir postos em datas específicas sem restrição de militar único, identificando a escala com etiqueta diferenciada.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: NOVO PERFIL */}
      {showNovoPerfilModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-100">
                    Criar Novo Perfil de Acesso
                  </h3>
                  <p className="text-xs text-slate-400">
                    Defina o nome e a descrição do perfil
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowNovoPerfilModal(false)}
                className="text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSalvarNovoPerfil} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-300">Nome do Perfil *</label>
                <input
                  type="text"
                  required
                  value={novoPerfilNome}
                  onChange={(e) => setNovoPerfilNome(e.target.value)}
                  placeholder="Ex: Sargenteação, Chefe de Operações, Supervisor..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-300">Descrição do Perfil</label>
                <textarea
                  rows={2}
                  value={novoPerfilDescricao}
                  onChange={(e) => setNovoPerfilDescricao(e.target.value)}
                  placeholder="Descreva as atribuições deste perfil de acesso..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-300">Estilo da Badge</label>
                <div className="grid grid-cols-3 gap-2 pt-1">
                  {[
                    { label: "Roxo", cls: "bg-purple-600/20 text-purple-300 border-purple-500/30" },
                    { label: "Verde", cls: "bg-emerald-600/20 text-emerald-300 border-emerald-500/30" },
                    { label: "Azul", cls: "bg-cyan-600/20 text-cyan-300 border-cyan-500/30" },
                    { label: "Laranja", cls: "bg-orange-600/20 text-orange-300 border-orange-500/30" },
                    { label: "Amarelo", cls: "bg-amber-600/20 text-amber-300 border-amber-500/30" },
                    { label: "Rosa", cls: "bg-pink-600/20 text-pink-300 border-pink-500/30" }
                  ].map((cor) => (
                    <button
                      key={cor.label}
                      type="button"
                      onClick={() => setNovoPerfilCor(cor.cls)}
                      className={`p-2 rounded-lg border text-center font-bold text-[11px] cursor-pointer transition-all ${
                        cor.cls
                      } ${novoPerfilCor === cor.cls ? "ring-2 ring-white" : ""}`}
                    >
                      {cor.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowNovoPerfilModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold cursor-pointer hover:bg-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold cursor-pointer"
                >
                  Salvar Perfil
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: NOVO USUÁRIO */}
      {showNovoUsuarioModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-100">
                    Cadastrar Novo Usuário
                  </h3>
                  <p className="text-xs text-slate-400">
                    Crie credenciais e atribua um perfil de acesso
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowNovoUsuarioModal(false)}
                className="text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCriarNovoUsuario} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-300">Login / RGPMMT *</label>
                <input
                  type="text"
                  required
                  value={novoUserUsername}
                  onChange={(e) => setNovoUserUsername(e.target.value)}
                  placeholder="Ex: 889.123 ou sargento.silva"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-300">Nome de Exibição *</label>
                <input
                  type="text"
                  required
                  value={novoUserNome}
                  onChange={(e) => setNovoUserNome(e.target.value)}
                  placeholder="Ex: 3º SGT PM SILVA"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-300">Perfil de Acesso Vinculado *</label>
                <select
                  value={novoUserPerfilId}
                  onChange={(e) => setNovoUserPerfilId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer font-bold"
                >
                  {perfis.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-300">Vincular a Militar do Efetivo (Opcional)</label>
                <select
                  value={novoUserMilitarId}
                  onChange={(e) => {
                    setNovoUserMilitarId(e.target.value);
                    const mil = militares.find((m) => m.id === e.target.value);
                    if (mil) {
                      setNovoUserNome(`${mil.graduacao} ${mil.nomeGuerra}`);
                      setNovoUserUsername(mil.rgPmmt);
                    }
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="">Nenhum militar vinculado (Acesso Avulso)</option>
                  {militares.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.graduacao} {m.nomeGuerra} ({m.rgPmmt})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-300">Senha Inicial</label>
                <input
                  type="text"
                  value={novoUserSenha}
                  onChange={(e) => setNovoUserSenha(e.target.value)}
                  placeholder="Padrão: 123456"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowNovoUsuarioModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold cursor-pointer hover:bg-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold cursor-pointer"
                >
                  Cadastrar Usuário
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
