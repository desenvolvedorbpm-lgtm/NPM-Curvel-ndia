import React, { useState, useMemo } from "react";
import {
  UnidadeTenant,
  Militar,
  PostoServico,
  EscalaItem,
  RegistroFolga96h
} from "../types";
import {
  formatDateBr,
  gerarDiasFolgaArray,
  calcularTotalFolgasMilitar,
  obterUltimosMilitaresComFolga96h,
  detectarFolgas96hDasEscalas
} from "../utils/rulesEngine";
import {
  Clock,
  Plus,
  Search,
  Filter,
  Trash2,
  Edit2,
  Calendar,
  UserCheck,
  Shield,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  X,
  FileText,
  User,
  Users,
  Award,
  Layers,
  ChevronRight,
  ArrowRight,
  Info
} from "lucide-react";

interface Folgas96hManagerProps {
  unidade: UnidadeTenant;
  militares: Militar[];
  postos: PostoServico[];
  escalas: EscalaItem[];
  registros: RegistroFolga96h[];
  onAddRegistro: (novo: RegistroFolga96h) => void;
  onUpdateRegistro: (atualizado: RegistroFolga96h) => void;
  onDeleteRegistro: (id: string) => void;
  isComandante?: boolean;
}

export const Folgas96hManager: React.FC<Folgas96hManagerProps> = ({
  unidade,
  militares,
  postos,
  escalas,
  registros,
  onAddRegistro,
  onUpdateRegistro,
  onDeleteRegistro,
  isComandante = true
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [militarFiltroId, setMilitarFiltroId] = useState<string>("TODOS");
  const [modalAberto, setModalAberto] = useState(false);
  const [modalDetectarAberto, setModalDetectarAberto] = useState(false);
  const [registroEmEdicao, setRegistroEmEdicao] = useState<RegistroFolga96h | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ texto: string; tipo: "sucesso" | "erro" } | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    militarId: militares[0]?.id || "",
    dataInicio: "2026-08-11",
    dataFim: "2026-08-14",
    horasDescanso: 96,
    motivo: "Folga Regulamentar 96h (Adequação de Efetivo 24x72)",
    observacoes: ""
  });

  // Military Lookup Map
  const militaresMap = useMemo(() => {
    return new Map(militares.map((m) => [m.id, m]));
  }, [militares]);

  // Top 3 Last Military with 96h Rest Applied
  const ultimos3Militares = useMemo(() => {
    return obterUltimosMilitaresComFolga96h(registros, militares, 3);
  }, [registros, militares]);

  // Statistics
  const totalRegistros = registros.length;
  const totalMilitaresDistintos = useMemo(() => {
    const ids = new Set(registros.map((r) => r.militarId));
    return ids.size;
  }, [registros]);

  const mediaPorMilitar = totalMilitaresDistintos > 0 ? (totalRegistros / totalMilitaresDistintos).toFixed(1) : "0";

  // Filtered List
  const registrosFiltrados = useMemo(() => {
    return registros
      .filter((reg) => {
        // Military filter
        if (militarFiltroId !== "TODOS" && reg.militarId !== militarFiltroId) {
          return false;
        }

        // Text search
        if (searchTerm.trim() !== "") {
          const term = searchTerm.toLowerCase();
          const militar = militaresMap.get(reg.militarId);
          const nomeGuerra = militar?.nomeGuerra.toLowerCase() || "";
          const nomeCompleto = militar?.nomeCompleto.toLowerCase() || "";
          const rg = militar?.rgPmmt.toLowerCase() || "";
          const graduacao = militar?.graduacao.toLowerCase() || "";
          const motivo = reg.motivo?.toLowerCase() || "";
          const obs = reg.observacoes?.toLowerCase() || "";
          const dtInicioFmt = formatDateBr(reg.dataInicio).toLowerCase();
          const dtFimFmt = formatDateBr(reg.dataFim).toLowerCase();

          return (
            nomeGuerra.includes(term) ||
            nomeCompleto.includes(term) ||
            rg.includes(term) ||
            graduacao.includes(term) ||
            motivo.includes(term) ||
            obs.includes(term) ||
            dtInicioFmt.includes(term) ||
            dtFimFmt.includes(term) ||
            reg.dataInicio.includes(term) ||
            reg.dataFim.includes(term)
          );
        }

        return true;
      })
      .sort((a, b) => {
        const dateA = a.dataFim || a.dataInicio || "";
        const dateB = b.dataFim || b.dataInicio || "";
        if (dateA !== dateB) return dateB.localeCompare(dateA);
        return (b.criadoEm || "").localeCompare(a.criadoEm || "");
      });
  }, [registros, militarFiltroId, searchTerm, militaresMap]);

  // Detected suggestions from current scales
  const sugestoesDetectadas = useMemo(() => {
    if (!modalDetectarAberto) return [];
    return detectarFolgas96hDasEscalas(unidade.id, escalas, militares, postos);
  }, [modalDetectarAberto, unidade.id, escalas, militares, postos]);

  // Helper for Day Name
  const getDayName = (dateStr: string) => {
    if (!dateStr) return "";
    const dow = new Date(dateStr + "T12:00:00").getDay();
    const names = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    return names[dow];
  };

  // Open Modal to Add
  const handleAbrirNovoModal = () => {
    const militarPadrao = militares[0]?.id || "";
    setFormData({
      militarId: militarPadrao,
      dataInicio: "2026-08-11",
      dataFim: "2026-08-14",
      horasDescanso: 96,
      motivo: "Folga Regulamentar 96h (Adequação de Efetivo 24x72)",
      observacoes: ""
    });
    setRegistroEmEdicao(null);
    setModalAberto(true);
  };

  // Open Modal to Edit
  const handleAbrirEditarModal = (reg: RegistroFolga96h) => {
    setFormData({
      militarId: reg.militarId,
      dataInicio: reg.dataInicio,
      dataFim: reg.dataFim,
      horasDescanso: reg.horasDescanso || 96,
      motivo: reg.motivo || "Folga Regulamentar 96h",
      observacoes: reg.observacoes || ""
    });
    setRegistroEmEdicao(reg);
    setModalAberto(true);
  };

  // Handle Date Start change with automatic +3 days suggestion (4 days total = 96h)
  const handleDataInicioChange = (novoInicio: string) => {
    if (!novoInicio) {
      setFormData((prev) => ({ ...prev, dataInicio: novoInicio }));
      return;
    }
    const d = new Date(novoInicio + "T12:00:00");
    d.setDate(d.getDate() + 3);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const novoFim = `${yyyy}-${mm}-${dd}`;

    setFormData((prev) => ({
      ...prev,
      dataInicio: novoInicio,
      dataFim: novoFim
    }));
  };

  // Save Form
  const handleSalvar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.militarId || !formData.dataInicio || !formData.dataFim) {
      setFeedbackMsg({ texto: "Preencha todos os campos obrigatórios.", tipo: "erro" });
      return;
    }

    const diasCalculados = gerarDiasFolgaArray(formData.dataInicio, formData.dataFim);

    if (registroEmEdicao) {
      // Update
      const atualizado: RegistroFolga96h = {
        ...registroEmEdicao,
        militarId: formData.militarId,
        dataInicio: formData.dataInicio,
        dataFim: formData.dataFim,
        diasFolga: diasCalculados,
        horasDescanso: Number(formData.horasDescanso) || 96,
        motivo: formData.motivo,
        observacoes: formData.observacoes
      };
      onUpdateRegistro(atualizado);
      setFeedbackMsg({ texto: "Registro de folga 96h atualizado com sucesso!", tipo: "sucesso" });
    } else {
      // Create new
      const novo: RegistroFolga96h = {
        id: `folga-96h-${Date.now()}`,
        unidadeId: unidade.id,
        militarId: formData.militarId,
        dataInicio: formData.dataInicio,
        dataFim: formData.dataFim,
        diasFolga: diasCalculados,
        horasDescanso: Number(formData.horasDescanso) || 96,
        motivo: formData.motivo,
        observacoes: formData.observacoes,
        registradoPor: "Comandante da Unidade",
        criadoEm: new Date().toISOString()
      };
      onAddRegistro(novo);
      setFeedbackMsg({ texto: "Nova folga de 96h registrada com sucesso!", tipo: "sucesso" });
    }

    setModalAberto(false);
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  // Import detected suggestion
  const handleImportarSugestao = (sugestao: typeof sugestoesDetectadas[0]) => {
    const novo: RegistroFolga96h = {
      id: `folga-96h-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      unidadeId: unidade.id,
      militarId: sugestao.militar.id,
      dataInicio: sugestao.dataInicio,
      dataFim: sugestao.dataFim,
      diasFolga: sugestao.diasFolga,
      horasDescanso: sugestao.horasDescanso,
      motivo: sugestao.motivo,
      observacoes: `Identificado automaticamente da escala entre ${formatDateBr(sugestao.servicoAnteriorData)} e ${formatDateBr(sugestao.servicoProximoData)}.`,
      registradoPor: "Detecção Automática",
      criadoEm: new Date().toISOString()
    };
    onAddRegistro(novo);
    setFeedbackMsg({ texto: `Folga de 96h para ${sugestao.militar.graduacao} ${sugestao.militar.nomeGuerra} registrada com sucesso!`, tipo: "sucesso" });
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  // Calculate days for current form preview
  const previewDias = useMemo(() => {
    return gerarDiasFolgaArray(formData.dataInicio, formData.dataFim);
  }, [formData.dataInicio, formData.dataFim]);

  const militarSelecionadoForm = militaresMap.get(formData.militarId);
  const totalFolgasPreviasMilitar = calcularTotalFolgasMilitar(formData.militarId, registros);

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {feedbackMsg && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between shadow-lg text-xs font-bold transition-all ${
            feedbackMsg.tipo === "sucesso"
              ? "bg-emerald-950/90 text-emerald-300 border-emerald-500/50"
              : "bg-rose-950/90 text-rose-300 border-rose-500/50"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedbackMsg.tipo === "sucesso" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400" />
            )}
            <span>{feedbackMsg.texto}</span>
          </div>
          <button onClick={() => setFeedbackMsg(null)} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* TOP HIGHLIGHT SECTION: "Últimos 3 Militares com Folga de 96h Aplicada" */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute -right-8 -bottom-8 opacity-5 pointer-events-none">
          <Award className="w-60 h-60 text-amber-400" />
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="bg-blue-500/10 text-blue-400 border border-blue-500/30 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                <Clock className="w-3 h-3 text-blue-400" />
                Controle de Folgas Prolongadas (96 Horas)
              </span>
              <span className="text-xs text-slate-400 font-medium">{unidade.nome}</span>
            </div>
            <h3 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
              <span>Últimos 3 Militares com Folga de 96 Horas Aplicadas</span>
            </h3>
            <p className="text-xs text-slate-400 max-w-2xl">
              Registro oficial e histórico individual de policiais militares contemplados com descanso regulamentar de 96h (ou compensação). Exibindo os últimos 3 militares atendidos.
            </p>
          </div>

          {isComandante && (
            <div className="flex items-center gap-2 flex-wrap shrink-0">
              <button
                onClick={() => setModalDetectarAberto(true)}
                className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold px-3.5 py-2.5 rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer"
                title="Detectar automaticamente folgas de 96h a partir das escalas cadastradas"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Detectar das Escalas</span>
              </button>

              <button
                onClick={handleAbrirNovoModal}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold px-4 py-2.5 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer shadow-blue-600/20"
              >
                <Plus className="w-4 h-4" />
                <span>+ Registrar Folga 96h</span>
              </button>
            </div>
          )}
        </div>

        {/* 3 Prominent Cards of Last 3 Officers */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
          {ultimos3Militares.length === 0 ? (
            <div className="col-span-3 bg-slate-950/60 border border-slate-800/80 rounded-xl p-8 text-center space-y-2">
              <Clock className="w-8 h-8 text-slate-600 mx-auto" />
              <div className="text-sm font-bold text-slate-300">Nenhuma folga de 96h registrada ainda</div>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Clique no botão "+ Registrar Folga 96h" ou use a detecção automática para lançar as primeiras concessões.
              </p>
            </div>
          ) : (
            ultimos3Militares.map((item, index) => {
              const reg = item.ultimoRegistro;
              const militar = item.militar;
              const diasList = reg.diasFolga && reg.diasFolga.length > 0
                ? reg.diasFolga
                : gerarDiasFolgaArray(reg.dataInicio, reg.dataFim);

              const rankBadge = index === 0
                ? { label: "1º Mais Recente", color: "bg-amber-500/20 text-amber-300 border-amber-500/40" }
                : index === 1
                ? { label: "2º Mais Recente", color: "bg-blue-500/20 text-blue-300 border-blue-500/40" }
                : { label: "3º Mais Recente", color: "bg-purple-500/20 text-purple-300 border-purple-500/40" };

              return (
                <div
                  key={`top-3-${militar.id}-${reg.id}`}
                  className="bg-slate-950/80 border border-slate-800 hover:border-slate-700 rounded-xl p-4 transition-all shadow-md relative group space-y-3"
                >
                  {/* Card Header with Rank Badge */}
                  <div className="flex items-center justify-between gap-2 border-b border-slate-800/60 pb-2.5">
                    <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${rankBadge.color}`}>
                      {rankBadge.label}
                    </span>

                    <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                      RG {militar.rgPmmt}
                    </span>
                  </div>

                  {/* Military Info */}
                  <div className="space-y-1">
                    <div className="text-xs text-slate-400 font-medium">Policial Militar</div>
                    <div className="text-base font-extrabold text-white leading-tight">
                      <span className="text-blue-400">{militar.graduacao}</span> {militar.nomeGuerra}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate" title={militar.nomeCompleto}>
                      {militar.nomeCompleto}
                    </div>
                  </div>

                  {/* Folga Date & Days */}
                  <div className="bg-slate-900/90 border border-slate-800 p-2.5 rounded-lg space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400 font-medium flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-blue-400" /> Período da Folga:
                      </span>
                      <span className="text-emerald-400 font-extrabold text-[10px] bg-emerald-950/70 px-2 py-0.5 rounded border border-emerald-700/60">
                        {reg.horasDescanso || 96}h ({diasList.length} dias)
                      </span>
                    </div>

                    <div className="text-xs font-black text-slate-200 flex items-center gap-1.5">
                      <span>{formatDateBr(reg.dataInicio)}</span>
                      <ArrowRight className="w-3 h-3 text-slate-500 shrink-0" />
                      <span>{formatDateBr(reg.dataFim)}</span>
                    </div>

                    {/* Day pills preview */}
                    <div className="flex items-center gap-1 flex-wrap pt-0.5">
                      {diasList.map((dStr) => (
                        <span
                          key={dStr}
                          className="text-[9px] font-bold bg-slate-950 text-slate-300 px-1.5 py-0.5 rounded border border-slate-800"
                        >
                          {getDayName(dStr)} {dStr.split("-")[2]}/{dStr.split("-")[1]}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Total já registrado para este militar (REQUIREMENT) */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 text-xs">
                    <span className="text-slate-400 font-medium">Total Acumulado:</span>
                    <span className="bg-blue-600/20 text-blue-300 border border-blue-500/40 text-[11px] font-black px-2.5 py-0.5 rounded-full shadow-xs">
                      {item.totalFolgasRegistradas} {item.totalFolgasRegistradas === 1 ? "Folga de 96h" : "Folgas de 96h"}
                    </span>
                  </div>

                  {reg.motivo && (
                    <div className="text-[10px] text-slate-400 truncate" title={reg.motivo}>
                      Motivo: <span className="text-slate-300">{reg.motivo}</span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Global Statistics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-slate-800/80">
          <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-xl">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total de Registros (96h)</div>
            <div className="text-xl font-black text-white mt-0.5 flex items-center justify-between">
              <span>{totalRegistros}</span>
              <Award className="w-4 h-4 text-blue-400" />
            </div>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-xl">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Militares Beneficiados</div>
            <div className="text-xl font-black text-emerald-400 mt-0.5 flex items-center justify-between">
              <span>{totalMilitaresDistintos}</span>
              <Users className="w-4 h-4 text-emerald-500" />
            </div>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-xl">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Média por Militar</div>
            <div className="text-xl font-black text-amber-400 mt-0.5 flex items-center justify-between">
              <span>{mediaPorMilitar}</span>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-xl">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Efetivo Ativo Total</div>
            <div className="text-xl font-black text-slate-300 mt-0.5 flex items-center justify-between">
              <span>{militares.filter((m) => m.ativo).length}</span>
              <Shield className="w-4 h-4 text-slate-500" />
            </div>
          </div>
        </div>
      </div>

      {/* FILTER & SEARCH TOOLBAR */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar militar, RG, data ou motivo..."
            className="w-full bg-slate-950 text-white text-xs pl-9 pr-8 py-2.5 rounded-xl border border-slate-700/80 focus:outline-none focus:border-blue-500 transition-all placeholder:text-slate-500"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter by Specific Militar */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-xs text-slate-400 font-semibold whitespace-nowrap">Filtrar por Militar:</span>
          <select
            value={militarFiltroId}
            onChange={(e) => setMilitarFiltroId(e.target.value)}
            className="bg-slate-950 text-white text-xs px-3 py-2 rounded-xl border border-slate-700 focus:outline-none focus:border-blue-500 transition-all cursor-pointer w-full sm:w-64"
          >
            <option value="TODOS">Todos os Militares ({totalRegistros} registros)</option>
            {militares.map((m) => {
              const totalMilitar = calcularTotalFolgasMilitar(m.id, registros);
              return (
                <option key={m.id} value={m.id}>
                  {m.graduacao} {m.nomeGuerra} (RG {m.rgPmmt}) - {totalMilitar} {totalMilitar === 1 ? 'folga' : 'folgas'}
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {/* DETAILED DATA TABLE OF 96H REST RECORDS */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-400" />
            <h4 className="text-sm font-bold text-white">Livro Geral de Folgas de 96 Horas</h4>
            <span className="text-xs text-slate-400">
              ({registrosFiltrados.length} {registrosFiltrados.length === 1 ? "registro" : "registros"})
            </span>
          </div>
        </div>

        {registrosFiltrados.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
              <Clock className="w-7 h-7" />
            </div>
            <h4 className="text-base font-bold text-white">Nenhum Registro Encontrado</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {searchTerm || militarFiltroId !== "TODOS"
                ? "Nenhum registro corresponde aos filtros de busca selecionados."
                : "Ainda não há registros de folgas de 96 horas cadastrados para a unidade."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-950/80 text-slate-400 border-b border-slate-800 text-[11px] uppercase tracking-wider font-bold">
                  <th className="py-3 px-4">Policial Militar</th>
                  <th className="py-3 px-4">Período / Dias da Folga (96h)</th>
                  <th className="py-3 px-4 text-center">Duração</th>
                  <th className="py-3 px-4 text-center">Total do Militar</th>
                  <th className="py-3 px-4">Motivo / Justificativa</th>
                  <th className="py-3 px-4">Cadastrado Em</th>
                  {isComandante && <th className="py-3 px-4 text-right">Ações</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {registrosFiltrados.map((reg) => {
                  const militar = militaresMap.get(reg.militarId);
                  const diasList = reg.diasFolga && reg.diasFolga.length > 0
                    ? reg.diasFolga
                    : gerarDiasFolgaArray(reg.dataInicio, reg.dataFim);
                  const totalDesteMilitar = calcularTotalFolgasMilitar(reg.militarId, registros);

                  return (
                    <tr
                      key={reg.id}
                      className="hover:bg-slate-800/40 transition-colors group"
                    >
                      {/* Military */}
                      <td className="py-3.5 px-4">
                        {militar ? (
                          <div className="space-y-0.5">
                            <div className="font-extrabold text-white text-xs flex items-center gap-1.5">
                              <span className="text-blue-400">{militar.graduacao}</span>
                              <span>{militar.nomeGuerra}</span>
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono">
                              RG {militar.rgPmmt}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-500 italic">Militar não encontrado</span>
                        )}
                      </td>

                      {/* Period and days */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1.5">
                          <div className="font-bold text-slate-200 text-xs flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                            <span>{formatDateBr(reg.dataInicio)}</span>
                            <span className="text-slate-500">até</span>
                            <span>{formatDateBr(reg.dataFim)}</span>
                          </div>

                          {/* Day chips */}
                          <div className="flex items-center gap-1 flex-wrap">
                            {diasList.map((dStr) => (
                              <span
                                key={dStr}
                                className="text-[9px] font-bold bg-slate-950 text-slate-300 px-1.5 py-0.5 rounded border border-slate-800"
                              >
                                {getDayName(dStr)} {dStr.split("-")[2]}/{dStr.split("-")[1]}
                              </span>
                            ))}
                          </div>
                        </div>
                      </td>

                      {/* Rest Duration */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="bg-emerald-950/80 text-emerald-300 border border-emerald-700/60 font-black text-[11px] px-2.5 py-1 rounded-lg inline-block">
                          {reg.horasDescanso || 96}h
                        </span>
                      </td>

                      {/* Total do Militar (REQUIREMENT) */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className="bg-blue-600/20 text-blue-300 border border-blue-500/40 font-black text-[11px] px-2.5 py-1 rounded-full inline-flex items-center gap-1 shadow-xs"
                          title={`Total de folgas de 96h registradas para este militar`}
                        >
                          <Award className="w-3 h-3 text-blue-400" />
                          <span>Total: {totalDesteMilitar}</span>
                        </span>
                      </td>

                      {/* Motive & Observações */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="space-y-0.5">
                          <div className="font-bold text-slate-200 text-xs">
                            {reg.motivo || "Folga Regulamentar 96h"}
                          </div>
                          {reg.observacoes && (
                            <div className="text-[11px] text-slate-400 line-clamp-1" title={reg.observacoes}>
                              {reg.observacoes}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Created At */}
                      <td className="py-3.5 px-4 text-[11px] text-slate-400 whitespace-nowrap">
                        <div>
                          {reg.criadoEm ? formatDateBr(reg.criadoEm.split("T")[0]) : "—"}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {reg.registradoPor || "Comandante"}
                        </div>
                      </td>

                      {/* Actions */}
                      {isComandante && (
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleAbrirEditarModal(reg)}
                              className="p-1.5 bg-slate-800 hover:bg-blue-900/50 text-slate-300 hover:text-blue-300 rounded-lg border border-slate-700 hover:border-blue-600 transition-colors cursor-pointer"
                              title="Editar este registro"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => {
                                if (window.confirm(`Deseja realmente remover o registro de folga 96h de ${militar?.graduacao} ${militar?.nomeGuerra}?`)) {
                                  onDeleteRegistro(reg.id);
                                  setFeedbackMsg({ texto: "Registro de folga 96h removido com sucesso.", tipo: "sucesso" });
                                  setTimeout(() => setFeedbackMsg(null), 3000);
                                }
                              }}
                              className="p-1.5 bg-slate-800 hover:bg-rose-950/80 text-slate-400 hover:text-rose-300 rounded-lg border border-slate-700 hover:border-rose-700 transition-colors cursor-pointer"
                              title="Excluir este registro"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: REGISTRAR / EDITAR FOLGA DE 96 HORAS */}
      {modalAberto && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-400" />
                <h3 className="text-base font-extrabold text-white">
                  {registroEmEdicao ? "Editar Registro de Folga 96h" : "Novo Registro de Folga de 96 Horas"}
                </h3>
              </div>
              <button
                onClick={() => setModalAberto(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSalvar} className="space-y-4 text-xs">
              {/* Militar Selector */}
              <div className="space-y-1.5">
                <label className="text-slate-300 font-bold flex items-center justify-between">
                  <span>Policial Militar Contemplado *</span>
                  {militarSelecionadoForm && (
                    <span className="text-[10px] text-blue-400 font-medium">
                      Já possui {totalFolgasPreviasMilitar} {totalFolgasPreviasMilitar === 1 ? "folga" : "folgas"} registradas
                    </span>
                  )}
                </label>
                <select
                  value={formData.militarId}
                  onChange={(e) => setFormData({ ...formData, militarId: e.target.value })}
                  className="w-full bg-slate-950 text-white text-xs p-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-blue-500 cursor-pointer"
                  required
                >
                  {militares.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.graduacao} {m.nomeGuerra} — RG {m.rgPmmt} ({m.nomeCompleto})
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Range: Inicio e Fim */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-slate-300 font-bold">Data de Início da Folga *</label>
                  <input
                    type="date"
                    value={formData.dataInicio}
                    onChange={(e) => handleDataInicioChange(e.target.value)}
                    className="w-full bg-slate-950 text-white text-xs p-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-300 font-bold">Data de Término da Folga *</label>
                  <input
                    type="date"
                    value={formData.dataFim}
                    onChange={(e) => setFormData({ ...formData, dataFim: e.target.value })}
                    className="w-full bg-slate-950 text-white text-xs p-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              {/* Dynamic Preview of Days and Duration */}
              <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 font-medium">Dias que compõem a folga:</span>
                  <span className="text-emerald-400 font-extrabold">
                    {previewDias.length} dias ({previewDias.length * 24}h)
                  </span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {previewDias.map((dStr) => (
                    <span
                      key={`preview-${dStr}`}
                      className="text-[10px] font-bold bg-slate-900 text-blue-300 px-2 py-0.5 rounded border border-blue-500/30"
                    >
                      {getDayName(dStr)} {dStr.split("-")[2]}/{dStr.split("-")[1]}
                    </span>
                  ))}
                </div>
              </div>

              {/* Motivo */}
              <div className="space-y-1.5">
                <label className="text-slate-300 font-bold">Motivo / Tipo de Concessão *</label>
                <select
                  value={formData.motivo}
                  onChange={(e) => setFormData({ ...formData, motivo: e.target.value })}
                  className="w-full bg-slate-950 text-white text-xs p-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="Folga Regulamentar 96h (Adequação de Efetivo 24x72)">
                    Folga Regulamentar 96h (Adequação de Efetivo 24x72)
                  </option>
                  <option value="Folga Regulamentar 96h (Ciclo de Rodízio Operacional)">
                    Folga Regulamentar 96h (Ciclo de Rodízio Operacional)
                  </option>
                  <option value="Compensação de Escala Cumprida">
                    Compensação de Escala Cumprida
                  </option>
                  <option value="Adequação de Módulo e Revezamento">
                    Adequação de Módulo e Revezamento
                  </option>
                  <option value="Outro (Especificar em Observações)">
                    Outro (Especificar em Observações)
                  </option>
                </select>
              </div>

              {/* Observações */}
              <div className="space-y-1.5">
                <label className="text-slate-300 font-bold">Observações / Número SIGADOC (Opcional)</label>
                <textarea
                  value={formData.observacoes}
                  onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                  placeholder="Ex.: Conforme despacho do Comandante de NPM, compensação de serviço..."
                  rows={2}
                  className="w-full bg-slate-950 text-white text-xs p-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-blue-500 placeholder:text-slate-600"
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalAberto(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-extrabold rounded-xl transition-all shadow-md active:scale-95 cursor-pointer shadow-blue-600/20"
                >
                  {registroEmEdicao ? "Atualizar Registro" : "Salvar Registro de Folga 96h"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DETECTAR FOLGAS 96H AUTOMATICAMENTE DAS ESCALAS */}
      {modalDetectarAberto && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-extrabold text-white">
                  Detecção Automática de Folgas de 96 Horas
                </h3>
              </div>
              <button
                onClick={() => setModalDetectarAberto(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              O sistema analisou os intervalos entre os serviços de 24h cumpridos na unidade. As seguintes ocorrências com intervalo de 96h ou mais foram identificadas:
            </p>

            <div className="max-h-80 overflow-y-auto space-y-2.5 pr-1">
              {sugestoesDetectadas.length === 0 ? (
                <div className="p-8 text-center bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto" />
                  <div className="text-xs font-bold text-white">Nenhum novo intervalo de 96h detectado</div>
                  <p className="text-[11px] text-slate-500">
                    Todos os intervalos de escala atuais seguem o ciclo padrão de 72h de folga ou já foram devidamente processados.
                  </p>
                </div>
              ) : (
                sugestoesDetectadas.map((sug, idx) => {
                  const diasList = sug.diasFolga;
                  const totalPrevio = calcularTotalFolgasMilitar(sug.militar.id, registros);

                  return (
                    <div
                      key={`sugestao-${sug.militar.id}-${sug.dataInicio}-${idx}`}
                      className="bg-slate-950 border border-slate-800 hover:border-slate-700 p-3.5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="font-extrabold text-white flex items-center gap-2">
                          <span className="text-blue-400">{sug.militar.graduacao}</span>
                          <span>{sug.militar.nomeGuerra}</span>
                          <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-1.5 py-0.2 rounded border border-slate-800">
                            RG {sug.militar.rgPmmt}
                          </span>
                        </div>

                        <div className="text-[11px] text-slate-300 font-medium flex items-center gap-1.5">
                          <Calendar className="w-3 h-3 text-amber-400" />
                          <span>Período: {formatDateBr(sug.dataInicio)} a {formatDateBr(sug.dataFim)}</span>
                          <span className="text-emerald-400 font-bold">({sug.horasDescanso}h)</span>
                        </div>

                        <div className="text-[10px] text-slate-400">
                          Intervalo entre serviços de {formatDateBr(sug.servicoAnteriorData)} e {formatDateBr(sug.servicoProximoData)}
                        </div>
                      </div>

                      <button
                        onClick={() => handleImportarSugestao(sug)}
                        className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs px-3.5 py-2 rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer shrink-0 self-start sm:self-auto"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Homologar Registro</span>
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-slate-800">
              <button
                onClick={() => setModalDetectarAberto(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
