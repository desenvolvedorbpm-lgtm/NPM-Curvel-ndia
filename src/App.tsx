import React, { useState } from "react";
import { RotateCcw, CheckCircle2, X } from "lucide-react";
import {
  UnidadeTenant,
  PostoServico,
  Militar,
  Afastamento,
  EscalaItem,
  UsuarioAuth,
  PerfilAcesso,
  RegistroFolga96h,
  isComandante,
  isOperador,
  isAdmin,
  temPermissao
} from "./types";
import {
  UNIDADES_INICIAIS,
  POSTOS_INICIAIS,
  MILITARES_INICIAIS,
  AFASTAMENTOS_INICIAIS,
  ESCALA_INICIAL_04_A_10_AGOSTO,
  PERFIS_INICIAIS,
  REGISTROS_FOLGA_96H_INICIAIS
} from "./data/initialData";
import { Header } from "./components/Header";
import { LoginPage, normalizeUser } from "./components/LoginPage";
import { ScheduleGrid } from "./components/ScheduleGrid";
import { MonthlyCalendar } from "./components/MonthlyCalendar";
import { PostosManager } from "./components/PostosManager";
import { MilitaryManager } from "./components/MilitaryManager";
import { AbsencesManager } from "./components/AbsencesManager";
import { UnitConfigModal } from "./components/UnitConfigModal";
import { PermutaModal } from "./components/PermutaModal";
import { AjusteModal } from "./components/AjusteModal";
import { PdfExportModal } from "./components/PdfExportModal";
import { ConflictsManager } from "./components/ConflictsManager";
import { SupportManager } from "./components/SupportManager";
import {
  projetarEscalasSemanais,
  validarRegrasEscala,
  lancarMilitarExpedienteAutomatico,
  getOperationalWeekForDate,
  getCurrentOperationalTuesday,
  obterTodosConflitosEscala,
  getTodayString,
  obterStatusDiaEscala,
  isEscalaItemConcluido,
  formatDateBr,
  reajustarHierarquiaGuarnicao
} from "./utils/rulesEngine";
import { saveCollectionToFirestore, subscribeToCollection } from "./lib/dbService";

const LS_KEYS = {
  UNIDADES: "pmmt_unidades_v2",
  POSTOS: "pmmt_postos_v2",
  MILITARES: "pmmt_militares_v2",
  AFASTAMENTOS: "pmmt_afastamentos_v2",
  ESCALAS: "pmmt_escalas_v2",
  REGISTROS_FOLGA_96H: "pmmt_registros_folga_96h_v2",
  USUARIOS: "pmmt_usuarios_v2",
  PERFIS: "pmmt_perfis_v2",
  USUARIO_LOGADO: "pmmt_usuario_logado_v2"
};

function getStoredData<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch (err) {
    console.warn("Error reading localStorage", key, err);
    return fallback;
  }
}

function normalizeMilitaresInitial(rawMilitares: Militar[]): Militar[] {
  if (!rawMilitares || rawMilitares.length === 0) return MILITARES_INICIAIS;

  // Garante que o 1º SGT PM CELSO (mil-008 / RG 881.726) tenha sempre sua ordem oficial de antiguidade #2
  const celso = rawMilitares.find(
    (m) => m.id === "mil-008" || m.rgPmmt === "881.726" || m.nomeGuerra.toUpperCase().includes("CELSO")
  );

  if (celso && celso.antiguidadeOrdem !== 2) {
    const listSemCelso = rawMilitares.filter((m) => m.id !== celso.id);
    // Insere Celso na posição 2
    listSemCelso.splice(1, 0, { ...celso, antiguidadeOrdem: 2 });
    // Reindexar 1..N
    return listSemCelso.map((m, idx) => ({
      ...m,
      antiguidadeOrdem: idx + 1
    }));
  }

  return rawMilitares;
}

function normalizeUsuariosInitial(rawUsuarios: UsuarioAuth[]): UsuarioAuth[] {
  let list = rawUsuarios && rawUsuarios.length > 0 ? [...rawUsuarios] : getInitialUsuarios(MILITARES_INICIAIS);

  // Garantir que o usuário admin tenha sempre perfil de Administrador do Sistema
  const adminIdx = list.findIndex((u) => u.username === "admin" || u.id === "user-admin");
  if (adminIdx === -1) {
    list.unshift({
      id: "user-admin",
      username: "admin",
      role: "admin",
      perfilId: "admin",
      password: "123456",
      primeiroAcesso: false,
      nomeDisplay: "Administrador do Sistema"
    });
  } else {
    list[adminIdx] = {
      ...list[adminIdx],
      role: "admin",
      perfilId: "admin",
      nomeDisplay: "Administrador do Sistema"
    };
  }

  // Garantir perfil do comandante
  const cmtIdx = list.findIndex((u) => u.username === "comandante" || u.id === "user-comandante");
  if (cmtIdx !== -1) {
    list[cmtIdx] = {
      ...list[cmtIdx],
      role: "comandante",
      perfilId: "comandante"
    };
  }

  return list;
}

function getInitialUsuarios(militaresList: Militar[]): UsuarioAuth[] {
  const adminUser: UsuarioAuth = {
    id: "user-admin",
    username: "admin",
    role: "admin",
    perfilId: "admin",
    password: "123456",
    primeiroAcesso: false,
    nomeDisplay: "Administrador do Sistema"
  };

  const comandanteUser: UsuarioAuth = {
    id: "user-comandante",
    username: "comandante",
    role: "comandante",
    perfilId: "comandante",
    password: "123456",
    primeiroAcesso: false,
    nomeDisplay: "Comandante da Unidade"
  };

  const operadorUser: UsuarioAuth = {
    id: "user-operador",
    username: "operador",
    role: "operador",
    perfilId: "efetivo",
    password: "123456",
    primeiroAcesso: false,
    nomeDisplay: "Operador de Escala (Consulta)"
  };

  const militaryUsers: UsuarioAuth[] = militaresList.map((m) => ({
    id: `user-${m.id}`,
    username: m.rgPmmt,
    militarId: m.id,
    role: "operador",
    perfilId: "efetivo",
    password: "123456",
    primeiroAcesso: false,
    nomeDisplay: `${m.graduacao} ${m.nomeGuerra}`
  }));

  return [adminUser, comandanteUser, operadorUser, ...militaryUsers];
}

export default function App() {
  // Master State with Persistent LocalStorage
  const [unidades, setUnidades] = useState<UnidadeTenant[]>(() => {
    const stored = getStoredData(LS_KEYS.UNIDADES, UNIDADES_INICIAIS);
    const valid = stored.filter(
      (u) => u.id !== "17-bpm-mirassol" && !u.nome.toLowerCase().includes("mirassol")
    );
    return valid.length > 0 ? valid : UNIDADES_INICIAIS;
  });
  const [unidadeAtual, setUnidadeAtual] = useState<UnidadeTenant>(() => {
    const valid = unidades.filter(
      (u) => u.id !== "17-bpm-mirassol" && !u.nome.toLowerCase().includes("mirassol")
    );
    return valid[0] || UNIDADES_INICIAIS[0];
  });

  const [postos, setPostos] = useState<PostoServico[]>(() =>
    getStoredData(LS_KEYS.POSTOS, POSTOS_INICIAIS)
  );
  const [militares, setMilitares] = useState<Militar[]>(() =>
    normalizeMilitaresInitial(getStoredData(LS_KEYS.MILITARES, MILITARES_INICIAIS))
  );
  const [afastamentos, setAfastamentos] = useState<Afastamento[]>(() =>
    getStoredData(LS_KEYS.AFASTAMENTOS, AFASTAMENTOS_INICIAIS)
  );
  const [escalas, setEscalas] = useState<EscalaItem[]>(() =>
    getStoredData(LS_KEYS.ESCALAS, ESCALA_INICIAL_04_A_10_AGOSTO)
  );
  const [registrosFolga96h, setRegistrosFolga96h] = useState<RegistroFolga96h[]>(() =>
    getStoredData(LS_KEYS.REGISTROS_FOLGA_96H, REGISTROS_FOLGA_96H_INICIAIS)
  );

  // Authentication & Users State
  const [usuarios, setUsuarios] = useState<UsuarioAuth[]>(() =>
    normalizeUsuariosInitial(getStoredData(LS_KEYS.USUARIOS, getInitialUsuarios(MILITARES_INICIAIS)))
  );
  const [perfis, setPerfis] = useState<PerfilAcesso[]>(() =>
    getStoredData(LS_KEYS.PERFIS, PERFIS_INICIAIS)
  );
  const [usuarioLogado, setUsuarioLogado] = useState<UsuarioAuth | null>(() => {
    const stored = getStoredData<UsuarioAuth | null>(LS_KEYS.USUARIO_LOGADO, null);
    if (stored && (stored.username === "admin" || stored.id === "user-admin")) {
      return {
        ...stored,
        role: "admin",
        perfilId: "admin",
        nomeDisplay: "Administrador do Sistema"
      };
    }
    return stored;
  });

  // Sync user list whenever militares list is updated
  React.useEffect(() => {
    setUsuarios((prev) => {
      let changed = false;
      const updated = [...prev];

      for (const m of militares) {
        const exists = updated.some(
          (u) => u.militarId === m.id || normalizeUser(u.username) === normalizeUser(m.rgPmmt)
        );
        if (!exists) {
          changed = true;
          updated.push({
            id: `user-${m.id}`,
            username: m.rgPmmt,
            militarId: m.id,
            role: "operador",
            perfilId: "efetivo",
            password: "123456",
            primeiroAcesso: false,
            nomeDisplay: `${m.graduacao} ${m.nomeGuerra}`
          });
        } else {
          const idx = updated.findIndex(
            (u) => u.militarId === m.id || normalizeUser(u.username) === normalizeUser(m.rgPmmt)
          );
          if (idx !== -1) {
            const expectedName = `${m.graduacao} ${m.nomeGuerra}`;
            if (updated[idx].nomeDisplay !== expectedName || updated[idx].username !== m.rgPmmt) {
              changed = true;
              updated[idx] = {
                ...updated[idx],
                username: m.rgPmmt,
                nomeDisplay: expectedName
              };
            }
          }
        }
      }

      if (!changed) return prev;
      return JSON.stringify(prev) === JSON.stringify(updated) ? prev : updated;
    });
  }, [militares]);

  // Real-time Firestore Subscriptions
  React.useEffect(() => {
    const unsubUnidades = subscribeToCollection<UnidadeTenant>("unidades", unidades, (items) => {
      const valid = items.filter(
        (u) => u.id !== "17-bpm-mirassol" && !u.nome.toLowerCase().includes("mirassol")
      );
      const res = valid.length > 0 ? valid : UNIDADES_INICIAIS;
      setUnidades((prev) => (JSON.stringify(prev) === JSON.stringify(res) ? prev : res));
    });
    const unsubPostos = subscribeToCollection<PostoServico>("postos", postos, (items) => {
      setPostos((prev) => (JSON.stringify(prev) === JSON.stringify(items) ? prev : items));
    });
    const unsubMilitares = subscribeToCollection<Militar>("militares", militares, (items) => {
      setMilitares((prev) => {
        const normalized = normalizeMilitaresInitial(items);
        return JSON.stringify(prev) === JSON.stringify(normalized) ? prev : normalized;
      });
    });
    const unsubAfastamentos = subscribeToCollection<Afastamento>("afastamentos", afastamentos, (items) => {
      setAfastamentos((prev) => (JSON.stringify(prev) === JSON.stringify(items) ? prev : items));
    });
    const unsubEscalas = subscribeToCollection<EscalaItem>("escalas", escalas, (items) => {
      setEscalas((prev) => (JSON.stringify(prev) === JSON.stringify(items) ? prev : items));
    });
    const unsubUsuarios = subscribeToCollection<UsuarioAuth>("usuarios", usuarios, (items) => {
      setUsuarios((prev) => {
        const normalized = normalizeUsuariosInitial(items);
        return JSON.stringify(prev) === JSON.stringify(normalized) ? prev : normalized;
      });
    });
    const unsubPerfis = subscribeToCollection<PerfilAcesso>("perfisAcesso", perfis, (items) => {
      setPerfis((prev) => (JSON.stringify(prev) === JSON.stringify(items) ? prev : items));
    });
    const unsubRegistrosFolga = subscribeToCollection<RegistroFolga96h>("registrosFolga96h", registrosFolga96h, (items) => {
      setRegistrosFolga96h((prev) => (JSON.stringify(prev) === JSON.stringify(items) ? prev : items));
    });

    return () => {
      unsubUnidades();
      unsubPostos();
      unsubMilitares();
      unsubAfastamentos();
      unsubEscalas();
      unsubUsuarios();
      unsubPerfis();
      unsubRegistrosFolga();
    };
  }, []);

  // Sync state to LocalStorage & Firestore
  React.useEffect(() => {
    try {
      localStorage.setItem(LS_KEYS.UNIDADES, JSON.stringify(unidades));
      saveCollectionToFirestore("unidades", unidades);
    } catch (e) { console.error(e); }
  }, [unidades]);

  React.useEffect(() => {
    try {
      localStorage.setItem(LS_KEYS.POSTOS, JSON.stringify(postos));
      saveCollectionToFirestore("postos", postos);
    } catch (e) { console.error(e); }
  }, [postos]);

  React.useEffect(() => {
    try {
      localStorage.setItem(LS_KEYS.MILITARES, JSON.stringify(militares));
      saveCollectionToFirestore("militares", militares);
    } catch (e) { console.error(e); }
  }, [militares]);

  React.useEffect(() => {
    try {
      localStorage.setItem(LS_KEYS.AFASTAMENTOS, JSON.stringify(afastamentos));
      saveCollectionToFirestore("afastamentos", afastamentos);
    } catch (e) { console.error(e); }
  }, [afastamentos]);

  React.useEffect(() => {
    try {
      localStorage.setItem(LS_KEYS.ESCALAS, JSON.stringify(escalas));
      saveCollectionToFirestore("escalas", escalas);
    } catch (e) { console.error(e); }
  }, [escalas]);

  React.useEffect(() => {
    try {
      localStorage.setItem(LS_KEYS.REGISTROS_FOLGA_96H, JSON.stringify(registrosFolga96h));
      saveCollectionToFirestore("registrosFolga96h", registrosFolga96h);
    } catch (e) { console.error(e); }
  }, [registrosFolga96h]);

  React.useEffect(() => {
    try {
      localStorage.setItem(LS_KEYS.USUARIOS, JSON.stringify(usuarios));
      saveCollectionToFirestore("usuarios", usuarios);
    } catch (e) { console.error(e); }
  }, [usuarios]);

  React.useEffect(() => {
    try {
      localStorage.setItem(LS_KEYS.PERFIS, JSON.stringify(perfis));
      saveCollectionToFirestore("perfisAcesso", perfis);
    } catch (e) { console.error(e); }
  }, [perfis]);

  React.useEffect(() => {
    try {
      if (usuarioLogado) {
        localStorage.setItem(LS_KEYS.USUARIO_LOGADO, JSON.stringify(usuarioLogado));
      } else {
        localStorage.removeItem(LS_KEYS.USUARIO_LOGADO);
      }
    } catch (e) { console.error(e); }
  }, [usuarioLogado]);

  // UI State
  const [tabAtiva, setTabAtiva] = useState<
    "escala" | "mensal" | "conflitos" | "postos" | "militares" | "afastamentos" | "configuracoes" | "suporte"
  >("escala");

  // Tab Guard based on dynamic user permissions
  React.useEffect(() => {
    if (usuarioLogado) {
      if (tabAtiva === "conflitos" && !isComandante(usuarioLogado) && !temPermissao(usuarioLogado, perfis, "conflitosVisualizar")) {
        setTabAtiva("escala");
      } else if (tabAtiva === "postos" && !isComandante(usuarioLogado) && !temPermissao(usuarioLogado, perfis, "postosVisualizar")) {
        setTabAtiva("escala");
      } else if (tabAtiva === "militares" && !isComandante(usuarioLogado) && !temPermissao(usuarioLogado, perfis, "efetivoVisualizar")) {
        setTabAtiva("escala");
      } else if (tabAtiva === "afastamentos" && !isComandante(usuarioLogado) && !temPermissao(usuarioLogado, perfis, "afastamentosVisualizar")) {
        setTabAtiva("escala");
      } else if (tabAtiva === "configuracoes" && !isComandante(usuarioLogado) && !temPermissao(usuarioLogado, perfis, "configuracoesEditar")) {
        setTabAtiva("escala");
      } else if (tabAtiva === "suporte" && !isComandante(usuarioLogado) && !temPermissao(usuarioLogado, perfis, "suporteAcesso")) {
        setTabAtiva("escala");
      }
    }
  }, [usuarioLogado, tabAtiva, perfis]);

  // Navigation from Conflicts to Schedule Grid
  const [dataTercaNavegacao, setDataTercaNavegacao] = useState<string>(() => getCurrentOperationalTuesday());
  const [dataDestaqueNavegacao, setDataDestaqueNavegacao] = useState<string | null>(null);

  const handleSelectTab = (
    tab: "escala" | "mensal" | "conflitos" | "postos" | "militares" | "afastamentos" | "configuracoes" | "suporte"
  ) => {
    if (tab === "escala") {
      // Sempre que abrir a escala semanal, abre na semana atual
      setDataTercaNavegacao(getCurrentOperationalTuesday());
      setDataDestaqueNavegacao(null);
    }
    setTabAtiva(tab);
  };

  const handleNavegarParaDataEscala = (dataItemStr: string) => {
    const sem = getOperationalWeekForDate(dataItemStr);
    setDataTercaNavegacao(sem.dataInicioTerca);
    setDataDestaqueNavegacao(dataItemStr);
    setTabAtiva("escala");
  };

  // Modals
  const [permutaItem, setPermutaItem] = useState<EscalaItem | null>(null);
  const [ajusteItem, setAjusteItem] = useState<EscalaItem | null>(null);
  const [pdfModalAberto, setPdfModalAberto] = useState(false);
  const [dataTercaPdf, setDataTercaPdf] = useState<string>(() => getCurrentOperationalTuesday());
  const [showConfirmResetModal, setShowConfirmResetModal] = useState(false);
  const [toastFeedback, setToastFeedback] = useState<{ message: string; type: "success" | "info" } | null>(null);

  // Handlers for Postos
  const handleAddPosto = (novoPosto: PostoServico) => {
    setPostos([...postos, novoPosto]);
  };
  const handleUpdatePosto = (postoAtualizado: PostoServico) => {
    setPostos(postos.map((p) => (p.id === postoAtualizado.id ? postoAtualizado : p)));
  };
  const handleDeletePosto = (postoId: string) => {
    setPostos(postos.filter((p) => p.id !== postoId));
  };
  const handleLancarExpedienteAutomatico = (posto: PostoServico, militarId: string) => {
    const novas = lancarMilitarExpedienteAutomatico(
      posto,
      militarId,
      escalas,
      afastamentos,
      unidadeAtual.id
    );
    setEscalas(novas);
  };

  // Handlers for Militares
  const handleAddMilitar = (novoMilitar: Militar) => {
    const atualizados = [...militares, novoMilitar].sort((a, b) => a.antiguidadeOrdem - b.antiguidadeOrdem);
    setMilitares(atualizados);
  };
  const handleUpdateMilitar = (militarAtualizado: Militar) => {
    const outros = militares.filter((m) => m.id !== militarAtualizado.id);
    const atualizados = [...outros, militarAtualizado].sort((a, b) => a.antiguidadeOrdem - b.antiguidadeOrdem);
    setMilitares(atualizados);
  };
  const handleUpdateMilitaresList = (novosMilitares: Militar[]) => {
    setMilitares(novosMilitares);
  };
  const handleDeleteMilitar = (militarId: string) => {
    setMilitares(militares.filter((m) => m.id !== militarId));
  };

  // Handlers for Afastamentos
  const handleAddAfastamento = (novoAfastamento: Afastamento) => {
    setAfastamentos([...afastamentos, novoAfastamento]);
  };
  const handleDeleteAfastamento = (id: string) => {
    setAfastamentos(afastamentos.filter((a) => a.id !== id));
  };

  // Handlers for Unit Configuration
  const handleSalvarUnidade = (unidadeAtualizada: UnidadeTenant) => {
    setUnidades(unidades.map((u) => (u.id === unidadeAtualizada.id ? unidadeAtualizada : u)));
    setUnidadeAtual(unidadeAtualizada);
  };

  // Permuta Execution Handler
  const handleConfirmarPermuta = (
    escalaItemId: string,
    militarSubstitutoId: string,
    sigadoc: string,
    observacao: string
  ) => {
    const itemAlvo = escalas.find((e) => e.id === escalaItemId);
    if (!itemAlvo) return;

    const escalasAposPermuta = escalas.map((e) => {
      if (e.id === escalaItemId) {
        return {
          ...e,
          militarOriginalId: e.militarId,
          militarId: militarSubstitutoId,
          isPermuta: true,
          sigadocPermuta: sigadoc,
          observacoes: observacao,
          status: "efetivada" as const
        };
      }
      return e;
    });

    // Re-adjust guarnição hierarchy on that day for that unit so the most senior officer is Comandante da GU
    const escalasReajustadas = reajustarHierarquiaGuarnicao(
      escalasAposPermuta,
      itemAlvo.data,
      itemAlvo.unidadeId,
      militares,
      postos
    );

    setEscalas(escalasReajustadas);
    setPermutaItem(null);
  };

  // Ajuste Execution Handler
  const handleConfirmarAjuste = (
    escalaItemId: string,
    novoMilitarId: string,
    recalculateFuture: boolean
  ) => {
    const itemOriginal = escalas.find((e) => e.id === escalaItemId);
    if (!itemOriginal) return;

    let novasEscalas = escalas.map((e) => {
      if (e.id === escalaItemId) {
        return {
          ...e,
          militarId: novoMilitarId,
          isAjuste: true,
          status: "ajustada" as const
        };
      }
      return e;
    });

    novasEscalas = reajustarHierarquiaGuarnicao(
      novasEscalas,
      itemOriginal.data,
      itemOriginal.unidadeId,
      militares,
      postos
    );

    if (recalculateFuture) {
      // Recalculate projections starting from this date
      const projecaoNova = projetarEscalasSemanais(
        novasEscalas,
        itemOriginal.data,
        3,
        militares,
        postos,
        afastamentos,
        unidadeAtual.id
      );

      // Merge projected slots
      const idsNovos = new Set(projecaoNova.map((p) => `${p.data}-${p.postoId}`));
      novasEscalas = [
        ...novasEscalas.filter((e) => !idsNovos.has(`${e.data}-${e.postoId}`)),
        ...projecaoNova
      ];
    }

    setEscalas(novasEscalas);
    setAjusteItem(null);
  };

  // Future Projection Handler (Auto sequencing for week / month)
  const handleProjetarFuturo = (dataInicioTerca: string, semanas: number) => {
    const projecao = projetarEscalasSemanais(
      escalas,
      dataInicioTerca,
      semanas,
      militares,
      postos,
      afastamentos,
      unidadeAtual.id
    );

    // Keep all manually entered / effective items, only replacing previous auto-projected items
    const idsProjetados = new Set(projecao.map((p) => `${p.data}-${p.postoId}`));
    const mantidas = escalas.filter((e) => {
      const chave = `${e.data}-${e.postoId}`;
      if (!idsProjetados.has(chave)) return true;
      // Preserve manual entries (status !== "projetada")
      return e.status !== "projetada" && !e.id.startsWith("proj-");
    });

    setEscalas([...mantidas, ...projecao]);
    setTabAtiva("mensal");
    setToastFeedback({
      message: `Projeção sequencial mensal concluída com sucesso (${semanas} semanas)! Os lançamentos manuais foram respeitados. Exibindo calendário mensal.`,
      type: "success"
    });
    setTimeout(() => setToastFeedback(null), 5000);
  };

  // Reset / Clear Auto-Projection Handler (preserves manual entries & completed past days)
  const handleResetarProjecao = () => {
    setShowConfirmResetModal(true);
  };

  const handleConfirmarResetProjecao = () => {
    const hojeStr = getTodayString();
    const mantidas: EscalaItem[] = [];
    let removidosCount = 0;

    for (const item of escalas) {
      const isProjetada = item.status === "projetada" || item.id.startsWith("proj-");
      const isPassada = obterStatusDiaEscala(item.data) === "concluida" || item.status === "concluida";

      if (isPassada) {
        // Dias que já concluíram (após as 08:00 do término): status 'concluida' e mantidas intactas
        mantidas.push({
          ...item,
          status: "concluida"
        });
      } else {
        // Escalas em andamento ou futuras (Status: "aberta" / passível de edição/alteração)
        if (isProjetada) {
          // Apenas escalas automáticas projetadas abertas são resetadas
          removidosCount++;
        } else {
          // Lançamentos manuais, permutas e ajustes são mantidos
          mantidas.push(item);
        }
      }
    }

    setEscalas(mantidas);
    setShowConfirmResetModal(false);

    setToastFeedback({
      message: `${removidosCount} escala(s) projetada(s) de hoje (${formatDateBr(hojeStr)}) e dias futuros foram removidas. Escalas de dias passados (Status: Concluída) e lançamentos manuais foram mantidos!`,
      type: "success"
    });
    setTimeout(() => setToastFeedback(null), 5000);
  };

  // Handlers for 96h Rest Records
  const handleAddRegistroFolga96h = (novo: RegistroFolga96h) => {
    setRegistrosFolga96h((prev) => [novo, ...prev]);
  };

  const handleUpdateRegistroFolga96h = (atualizado: RegistroFolga96h) => {
    setRegistrosFolga96h((prev) =>
      prev.map((r) => (r.id === atualizado.id ? atualizado : r))
    );
  };

  const handleDeleteRegistroFolga96h = (id: string) => {
    setRegistrosFolga96h((prev) => prev.filter((r) => r.id !== id));
  };

  // Count active warnings across current unit
  const conflitosAtivos = obterTodosConflitosEscala(
    unidadeAtual.id,
    escalas,
    militares,
    postos,
    afastamentos
  );
  const alertasAtivosCount = conflitosAtivos.length;

  if (!usuarioLogado) {
    return (
      <LoginPage
        usuarios={usuarios}
        unidadeAtual={unidadeAtual}
        onUpdateUsuarios={(novos) => setUsuarios(novos)}
        onLoginSuccess={(user) => setUsuarioLogado(user)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col selection:bg-blue-600 selection:text-white">
      {/* Top Header & Navigation */}
      <Header
        unidades={unidades}
        unidadeAtual={unidadeAtual}
        onSelectUnidade={(u) => setUnidadeAtual(u)}
        tabAtiva={tabAtiva}
        onSelectTab={handleSelectTab}
        onAbrirPdf={() => {
          setDataTercaPdf(dataTercaNavegacao || getCurrentOperationalTuesday());
          setPdfModalAberto(true);
        }}
        qtdAlertasAtivos={alertasAtivosCount}
        usuarioLogado={usuarioLogado}
        perfis={perfis}
        onLogout={() => setUsuarioLogado(null)}
      />

      {/* Tab Content Router */}
      <main className="flex-1 pb-12">
        {tabAtiva === "escala" && (
          <ScheduleGrid
            unidade={unidadeAtual}
            militarList={militares}
            postosList={postos}
            escalas={escalas}
            afastamentos={afastamentos}
            onUpdateEscalas={(novas) => setEscalas(novas)}
            onAbrirPermuta={(item) => setPermutaItem(item)}
            onAbrirAjuste={(item) => setAjusteItem(item)}
            onProjetarFuturo={handleProjetarFuturo}
            onResetarProjecao={handleResetarProjecao}
            dataTercaInicial={dataTercaNavegacao}
            onSetDataTercaNavegacao={(dt) => setDataTercaNavegacao(dt)}
            dataDestaque={dataDestaqueNavegacao}
            onLimparDestaque={() => setDataDestaqueNavegacao(null)}
            isComandante={isComandante(usuarioLogado) || temPermissao(usuarioLogado, perfis, "escalaEditar")}
          />
        )}

        {tabAtiva === "mensal" && (
          <MonthlyCalendar
            unidade={unidadeAtual}
            militares={militares}
            postos={postos}
            escalas={escalas}
            afastamentos={afastamentos}
            onProjetarFuturo={handleProjetarFuturo}
            onResetarProjecao={handleResetarProjecao}
            onUpdateEscalas={(novas) => setEscalas(novas)}
            isComandante={isComandante(usuarioLogado) || temPermissao(usuarioLogado, perfis, "projecaoExecutar")}
          />
        )}

        {tabAtiva === "conflitos" && (
          <ConflictsManager
            unidade={unidadeAtual}
            militares={militares}
            postos={postos}
            escalas={escalas}
            afastamentos={afastamentos}
            registrosFolga96h={registrosFolga96h}
            onAddRegistroFolga96h={handleAddRegistroFolga96h}
            onUpdateRegistroFolga96h={handleUpdateRegistroFolga96h}
            onDeleteRegistroFolga96h={handleDeleteRegistroFolga96h}
            onNavegarParaData={handleNavegarParaDataEscala}
            onAbrirPermuta={(item) => setPermutaItem(item)}
            onAbrirAjuste={(item) => setAjusteItem(item)}
            isComandante={isComandante(usuarioLogado) || temPermissao(usuarioLogado, perfis, "conflitosVisualizar")}
          />
        )}

        {tabAtiva === "postos" && (
          <PostosManager
            unidadeId={unidadeAtual.id}
            postos={postos}
            militares={militares}
            onAddPosto={handleAddPosto}
            onUpdatePosto={handleUpdatePosto}
            onDeletePosto={handleDeletePosto}
            onLancarExpedienteAutomatico={handleLancarExpedienteAutomatico}
          />
        )}

        {tabAtiva === "militares" && (
          <MilitaryManager
            unidadeId={unidadeAtual.id}
            unidadeLogoUrl={unidadeAtual.cabecalho?.logoUrl}
            militares={militares}
            onAddMilitar={handleAddMilitar}
            onUpdateMilitar={handleUpdateMilitar}
            onDeleteMilitar={handleDeleteMilitar}
            onUpdateMilitaresList={handleUpdateMilitaresList}
          />
        )}

        {tabAtiva === "afastamentos" && (
          <AbsencesManager
            unidadeId={unidadeAtual.id}
            afastamentos={afastamentos}
            militares={militares}
            onAddAfastamento={handleAddAfastamento}
            onDeleteAfastamento={handleDeleteAfastamento}
          />
        )}

        {(tabAtiva === "configuracoes" || tabAtiva === "suporte") && (
          <UnitConfigModal
            unidade={unidadeAtual}
            onSalvarUnidade={handleSalvarUnidade}
            perfis={perfis}
            usuarios={usuarios}
            militares={militares}
            usuarioLogado={usuarioLogado}
            onUpdatePerfis={(novos) => setPerfis(novos)}
            onUpdateUsuarios={(novos) => setUsuarios(novos)}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-slate-950 text-slate-500 border-t border-slate-800/80 text-xs py-4 px-6 text-center">
        <p className="font-semibold text-slate-400">
          PMMT • Sistema de Escalas Diárias (NÚCLEO PM DE CURVELÂNDIA)
        </p>
        <p className="text-[11px] text-slate-600 mt-1">
          Motor de regras com restrição absoluta de descanso (24h), alertas de 72h/96h, senioridade (Mais Antigo / Mais Moderno), permutas via SIGADOC e exportação dinâmica de relatórios em PDF.
        </p>
      </footer>

      {/* Modals */}
      {permutaItem && (
        <PermutaModal
          escalaItem={permutaItem}
          militares={militares}
          postos={postos}
          todasEscalas={escalas}
          afastamentos={afastamentos}
          onConfirmarPermuta={handleConfirmarPermuta}
          onFechar={() => setPermutaItem(null)}
        />
      )}

      {ajusteItem && (
        <AjusteModal
          escalaItem={ajusteItem}
          militares={militares}
          postos={postos}
          onConfirmarAjuste={handleConfirmarAjuste}
          onFechar={() => setAjusteItem(null)}
        />
      )}

      {pdfModalAberto && (
        <PdfExportModal
          unidade={unidadeAtual}
          escalas={escalas}
          militares={militares}
          postos={postos}
          afastamentos={afastamentos}
          dataTerca={dataTercaPdf}
          onFechar={() => setPdfModalAberto(false)}
        />
      )}

      {/* Reset Confirmation Modal */}
      {showConfirmResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0">
                <RotateCcw className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-100">
                  Resetar Projeção Automática
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Confirmar remoção de escalas automatizadas
                </p>
              </div>
            </div>

            <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 text-xs text-slate-300 leading-relaxed space-y-2">
              <p>
                Esta ação removerá <strong>APENAS</strong> a escala projetada para o <strong>dia atual e dias futuros</strong> (Status: <span className="text-blue-400 font-bold">Aberta</span>).
              </p>
              <p className="text-emerald-400 font-semibold">
                ✓ Dias em que a escala já passou entram no status <strong>Concluída</strong> e NÃO serão resetados.
              </p>
              <p className="text-amber-300 font-semibold">
                ✓ Lançamentos manuais, trocas e permutas permanecem 100% intactos.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowConfirmResetModal(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800 text-slate-300 font-bold text-xs hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmarResetProjecao}
                className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Sim, Resetar Projeção</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Toast Feedback */}
      {toastFeedback && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-3 bg-slate-900 border border-emerald-500/30 text-emerald-300 px-4 py-3 rounded-xl shadow-2xl animate-in slide-in-from-bottom duration-300 max-w-md">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-bold text-slate-100 leading-tight">{toastFeedback.message}</span>
          <button
            onClick={() => setToastFeedback(null)}
            className="ml-2 text-slate-400 hover:text-slate-200 cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
