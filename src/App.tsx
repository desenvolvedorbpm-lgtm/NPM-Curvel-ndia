import React, { useState } from "react";
import { RotateCcw, CheckCircle2, X } from "lucide-react";
import {
  UnidadeTenant,
  PostoServico,
  Militar,
  Afastamento,
  EscalaItem,
  UsuarioAuth,
  isComandante,
  isOperador
} from "./types";
import {
  UNIDADES_INICIAIS,
  POSTOS_INICIAIS,
  MILITARES_INICIAIS,
  AFASTAMENTOS_INICIAIS,
  ESCALA_INICIAL_04_A_10_AGOSTO
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
import { projetarEscalasSemanais, validarRegrasEscala, lancarMilitarExpedienteAutomatico, getOperationalWeekForDate, obterTodosConflitosEscala, getTodayString, formatDateBr, reajustarHierarquiaGuarnicao } from "./utils/rulesEngine";
import { saveCollectionToFirestore, subscribeToCollection } from "./lib/dbService";

const LS_KEYS = {
  UNIDADES: "pmmt_unidades_v2",
  POSTOS: "pmmt_postos_v2",
  MILITARES: "pmmt_militares_v2",
  AFASTAMENTOS: "pmmt_afastamentos_v2",
  ESCALAS: "pmmt_escalas_v2",
  USUARIOS: "pmmt_usuarios_v2",
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

function getInitialUsuarios(militaresList: Militar[]): UsuarioAuth[] {
  const comandanteUser: UsuarioAuth = {
    id: "user-comandante",
    username: "comandante",
    role: "comandante",
    password: "123456",
    primeiroAcesso: false,
    nomeDisplay: "Comandante da Unidade"
  };

  const operadorUser: UsuarioAuth = {
    id: "user-operador",
    username: "operador",
    role: "operador",
    password: "123456",
    primeiroAcesso: false,
    nomeDisplay: "Operador de Escala (Consulta)"
  };

  const adminUser: UsuarioAuth = {
    id: "user-admin",
    username: "admin",
    role: "comandante",
    password: "123456",
    primeiroAcesso: false,
    nomeDisplay: "Administrador do Sistema"
  };

  const militaryUsers: UsuarioAuth[] = militaresList.map((m) => ({
    id: `user-${m.id}`,
    username: m.rgPmmt,
    militarId: m.id,
    role: "operador",
    password: "123456",
    primeiroAcesso: false,
    nomeDisplay: `${m.graduacao} ${m.nomeGuerra}`
  }));

  return [comandanteUser, operadorUser, adminUser, ...militaryUsers];
}

export default function App() {
  // Master State with Persistent LocalStorage
  const [unidades, setUnidades] = useState<UnidadeTenant[]>(() =>
    getStoredData(LS_KEYS.UNIDADES, UNIDADES_INICIAIS)
  );
  const [unidadeAtual, setUnidadeAtual] = useState<UnidadeTenant>(() => unidades[0] || UNIDADES_INICIAIS[0]);

  const [postos, setPostos] = useState<PostoServico[]>(() =>
    getStoredData(LS_KEYS.POSTOS, POSTOS_INICIAIS)
  );
  const [militares, setMilitares] = useState<Militar[]>(() =>
    getStoredData(LS_KEYS.MILITARES, MILITARES_INICIAIS)
  );
  const [afastamentos, setAfastamentos] = useState<Afastamento[]>(() =>
    getStoredData(LS_KEYS.AFASTAMENTOS, AFASTAMENTOS_INICIAIS)
  );
  const [escalas, setEscalas] = useState<EscalaItem[]>(() =>
    getStoredData(LS_KEYS.ESCALAS, ESCALA_INICIAL_04_A_10_AGOSTO)
  );

  // Authentication & Users State
  const [usuarios, setUsuarios] = useState<UsuarioAuth[]>(() =>
    getStoredData(LS_KEYS.USUARIOS, getInitialUsuarios(MILITARES_INICIAIS))
  );
  const [usuarioLogado, setUsuarioLogado] = useState<UsuarioAuth | null>(() =>
    getStoredData<UsuarioAuth | null>(LS_KEYS.USUARIO_LOGADO, null)
  );

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

      return changed ? updated : prev;
    });
  }, [militares]);

  // Real-time Firestore Subscriptions
  React.useEffect(() => {
    const unsubUnidades = subscribeToCollection("unidades", unidades, (items) => {
      setUnidades(items);
    });
    const unsubPostos = subscribeToCollection("postos", postos, (items) => {
      setPostos(items);
    });
    const unsubMilitares = subscribeToCollection("militares", militares, (items) => {
      setMilitares(items);
    });
    const unsubAfastamentos = subscribeToCollection("afastamentos", afastamentos, (items) => {
      setAfastamentos(items);
    });
    const unsubEscalas = subscribeToCollection("escalas", escalas, (items) => {
      setEscalas(items);
    });
    const unsubUsuarios = subscribeToCollection("usuarios", usuarios, (items) => {
      setUsuarios(items);
    });

    return () => {
      unsubUnidades();
      unsubPostos();
      unsubMilitares();
      unsubAfastamentos();
      unsubEscalas();
      unsubUsuarios();
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
      localStorage.setItem(LS_KEYS.USUARIOS, JSON.stringify(usuarios));
      saveCollectionToFirestore("usuarios", usuarios);
    } catch (e) { console.error(e); }
  }, [usuarios]);

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
    "escala" | "mensal" | "conflitos" | "postos" | "militares" | "afastamentos" | "configuracoes"
  >("escala");

  // Tab Guard: Operador profile can only view 'escala' or 'mensal'
  React.useEffect(() => {
    if (usuarioLogado && !isComandante(usuarioLogado)) {
      if (tabAtiva !== "escala" && tabAtiva !== "mensal") {
        setTabAtiva("escala");
      }
    }
  }, [usuarioLogado, tabAtiva]);

  // Navigation from Conflicts to Schedule Grid
  const [dataTercaNavegacao, setDataTercaNavegacao] = useState("2026-08-04");
  const [dataDestaqueNavegacao, setDataDestaqueNavegacao] = useState<string | null>(null);

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
  const [dataTercaPdf, setDataTercaPdf] = useState("2026-08-04");
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
    setMilitares([...militares, novoMilitar]);
  };
  const handleUpdateMilitar = (militarAtualizado: Militar) => {
    setMilitares(militares.map((m) => (m.id === militarAtualizado.id ? militarAtualizado : m)));
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
      const isPassada = item.data < hojeStr;

      if (isPassada) {
        // Dias que já passaram: alteram status para 'concluida' e são mantidas intactas
        mantidas.push({
          ...item,
          status: "concluida"
        });
      } else {
        // Dia atual ou dias futuros (Status: "aberta" / passível de edição/alteração)
        if (isProjetada) {
          // Apenas escalas automáticas projetadas de hoje e do futuro são resetadas
          removidosCount++;
        } else {
          // Lançamentos manuais, permutas e ajustes do dia atual e futuros são mantidos
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
        onSelectTab={(tab) => setTabAtiva(tab)}
        onAbrirPdf={() => setPdfModalAberto(true)}
        qtdAlertasAtivos={alertasAtivosCount}
        usuarioLogado={usuarioLogado}
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
            isComandante={isComandante(usuarioLogado)}
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
            isComandante={isComandante(usuarioLogado)}
          />
        )}

        {tabAtiva === "conflitos" && (
          <ConflictsManager
            unidade={unidadeAtual}
            militares={militares}
            postos={postos}
            escalas={escalas}
            afastamentos={afastamentos}
            onNavegarParaData={handleNavegarParaDataEscala}
            onAbrirPermuta={(item) => setPermutaItem(item)}
            onAbrirAjuste={(item) => setAjusteItem(item)}
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
            militares={militares}
            onAddMilitar={handleAddMilitar}
            onUpdateMilitar={handleUpdateMilitar}
            onDeleteMilitar={handleDeleteMilitar}
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

        {tabAtiva === "configuracoes" && (
          <UnitConfigModal
            unidade={unidadeAtual}
            onSalvarUnidade={handleSalvarUnidade}
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
