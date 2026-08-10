import React, { useState } from "react";
import {
  Militar,
  PostoServico,
  EscalaItem,
  Afastamento,
  SemanaOperacional,
  AlertaEscala,
  UnidadeTenant
} from "../types";
import {
  getOperationalWeekForDate,
  validarRegrasEscala,
  sugerirMilitarParaPosto,
  formatDateBr,
  getMilitarAfastamentoNoDia,
  sortPostosEmOrdemOficial,
  calcularInformativoNumero,
  getTodayString,
  obterStatusDiaEscala,
  reajustarHierarquiaGuarnicao
} from "../utils/rulesEngine";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Car,
  AlertTriangle,
  ArrowLeftRight,
  RefreshCw,
  Sparkles,
  Info,
  CheckCircle2,
  XCircle,
  Zap,
  CalendarDays,
  RotateCcw,
  Trash2,
  Lock,
  Eye
} from "lucide-react";

interface ScheduleGridProps {
  unidade: UnidadeTenant;
  militarList: Militar[];
  postosList: PostoServico[];
  escalas: EscalaItem[];
  afastamentos: Afastamento[];
  onUpdateEscalas: (novasEscalas: EscalaItem[]) => void;
  onAbrirPermuta: (item: EscalaItem) => void;
  onAbrirAjuste: (item: EscalaItem) => void;
  onProjetarFuturo: (dataInicioTerca: string, semanas: number) => void;
  onResetarProjecao?: () => void;
  dataTercaInicial?: string;
  onSetDataTercaNavegacao?: (dataTerca: string) => void;
  dataDestaque?: string | null;
  onLimparDestaque?: () => void;
  isComandante?: boolean;
}

export const ScheduleGrid: React.FC<ScheduleGridProps> = ({
  unidade,
  militarList,
  postosList,
  escalas,
  afastamentos,
  onUpdateEscalas,
  onAbrirPermuta,
  onAbrirAjuste,
  onProjetarFuturo,
  onResetarProjecao,
  dataTercaInicial,
  onSetDataTercaNavegacao,
  dataDestaque,
  onLimparDestaque,
  isComandante = true
}) => {
  // Current Tuesday anchor for operational week (default August 04, 2026)
  const [dataTercaAtual, setDataTercaAtual] = useState(dataTercaInicial || "2026-08-04");

  React.useEffect(() => {
    if (dataTercaInicial && dataTercaInicial !== dataTercaAtual) {
      setDataTercaAtual(dataTercaInicial);
    }
  }, [dataTercaInicial]);

  const mudarDataTerca = (novaTerca: string) => {
    setDataTercaAtual(novaTerca);
    if (onSetDataTercaNavegacao) {
      onSetDataTercaNavegacao(novaTerca);
    }
  };

  const semanaInfo: SemanaOperacional = getOperationalWeekForDate(dataTercaAtual);

  const militaresUnidade = militarList.filter((m) => m.unidadeId === unidade.id && m.ativo);
  const postosUnidade = sortPostosEmOrdemOficial(
    postosList.filter((p) => p.unidadeId === unidade.id && p.ativo)
  );

  // Drag and Drop State
  const [draggedMilitarId, setDraggedMilitarId] = useState<string | null>(null);
  const [dropFeedback, setDropFeedback] = useState<{
    tipo: "sucesso" | "alerta" | "bloqueio";
    mensagem: string;
  } | null>(null);

  // Navigation handlers
  const handleSemanaAnterior = () => {
    const cur = new Date(dataTercaAtual + "T12:00:00");
    cur.setDate(cur.getDate() - 7);
    mudarDataTerca(cur.toISOString().split("T")[0]);
  };

  const handleProximaSemana = () => {
    const cur = new Date(dataTercaAtual + "T12:00:00");
    cur.setDate(cur.getDate() + 7);
    mudarDataTerca(cur.toISOString().split("T")[0]);
  };

  const handleSemanaHoje = () => {
    mudarDataTerca("2026-08-04");
  };

  // Week Options for Selector with Dynamic Informativo Numbers
  const datasSemanasBase = [
    "2026-08-04",
    "2026-08-11",
    "2026-08-18",
    "2026-08-25",
    "2026-09-01",
    "2026-09-08",
    "2026-09-15",
    "2026-09-22"
  ];

  const opcoesSemanas = datasSemanasBase.map((dStr) => {
    const sem = getOperationalWeekForDate(dStr);
    const inf = calcularInformativoNumero(dStr, unidade.cabecalho.informativoNumero);
    const numOnly = inf.split(" ")[0];
    return {
      label: `Inf. ${numOnly} • ${formatDateBr(sem.dataInicioTerca)} a ${formatDateBr(sem.dataFimSegunda)}`,
      value: dStr
    };
  });

  if (!opcoesSemanas.some((op) => op.value === dataTercaAtual)) {
    const inf = calcularInformativoNumero(dataTercaAtual, unidade.cabecalho.informativoNumero);
    const numOnly = inf.split(" ")[0];
    opcoesSemanas.unshift({
      label: `Inf. ${numOnly} • ${formatDateBr(semanaInfo.dataInicioTerca)} a ${formatDateBr(semanaInfo.dataFimSegunda)}`,
      value: dataTercaAtual
    });
  }

  // Drag Start / End
  const handleDragStart = (militarId: string) => {
    setDraggedMilitarId(militarId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // Drop Officer onto Slot Handler
  const handleDropSlot = (dataStr: string, posto: PostoServico) => {
    if (!draggedMilitarId) return;

    let startH = posto.horaInicio || "08:00";
    let duracao = posto.duracaoHoras || 24;
    const startTimeMs = new Date(`${dataStr}T${startH}:00`).getTime();
    const endTimeMs = startTimeMs + duracao * 60 * 60 * 1000;

    // Special handling for Reforço Extraordinário
    if (draggedMilitarId === "REFORCO_EXTRAORDINARIO") {
      const itemExistente = escalas.find(
        (e) => e.unidadeId === unidade.id && e.data === dataStr && e.postoId === posto.id
      );

      let novasEscalas = [...escalas];

      if (itemExistente) {
        novasEscalas = novasEscalas.map((e) =>
          e.id === itemExistente.id
            ? {
                ...e,
                militarId: "REFORCO_EXTRAORDINARIO",
                startTimeMs,
                endTimeMs,
                isAjuste: true,
                status: "efetivada"
              }
            : e
        );
      } else {
        const novoItem: EscalaItem = {
          id: `esc-${dataStr}-${posto.id}`,
          unidadeId: unidade.id,
          data: dataStr,
          postoId: posto.id,
          militarId: "REFORCO_EXTRAORDINARIO",
          startTimeMs,
          endTimeMs,
          isPermuta: false,
          isAjuste: true,
          status: "efetivada"
        };
        novasEscalas.push(novoItem);
      }

      onUpdateEscalas(novasEscalas);
      setDropFeedback({
        tipo: "sucesso",
        mensagem: `Reforço Extraordinário alocado com sucesso no posto ${posto.sigla} para o dia ${formatDateBr(dataStr)}.`
      });
      setTimeout(() => setDropFeedback(null), 3500);
      setDraggedMilitarId(null);
      return;
    }

    const militar = militaresUnidade.find((m) => m.id === draggedMilitarId);
    if (!militar) return;

    // Run rules validation
    const alertas = validarRegrasEscala(
      militar,
      posto,
      dataStr,
      startTimeMs,
      endTimeMs,
      escalas,
      afastamentos
    );

    const temBloqueio = alertas.some(
      (a) => a.tipo === "BLOQUEIO_24H" || a.tipo === "INDISPONIVEL_AFASTADO"
    );

    if (temBloqueio) {
      const bloqueioMsg = alertas.find((a) => a.tipo === "BLOQUEIO_24H" || a.tipo === "INDISPONIVEL_AFASTADO")?.mensagem;
      setDropFeedback({
        tipo: "bloqueio",
        mensagem: bloqueioMsg || "BLOQUEIO ABSOLUTO: Escalação rejeitada por violar restrição de descanso de 24h ou afastamento ativo."
      });
      setTimeout(() => setDropFeedback(null), 5000);
      setDraggedMilitarId(null);
      return;
    }

    const temAlertaSoft = alertas.find((a) => a.tipo === "ALERTA_72H" || a.tipo === "ALERTA_96H");

    if (temAlertaSoft) {
      setDropFeedback({
        tipo: "alerta",
        mensagem: temAlertaSoft.mensagem
      });
      setTimeout(() => setDropFeedback(null), 5000);
    } else {
      setDropFeedback({
        tipo: "sucesso",
        mensagem: `Policial militar ${militar.graduacao} ${militar.nomeGuerra} alocado com sucesso no posto ${posto.sigla}.`
      });
      setTimeout(() => setDropFeedback(null), 3000);
    }

    // Update or create slot in escalas
    const itemExistente = escalas.find(
      (e) => e.unidadeId === unidade.id && e.data === dataStr && e.postoId === posto.id
    );

    let novasEscalas = [...escalas];

    if (itemExistente) {
      novasEscalas = novasEscalas.map((e) =>
        e.id === itemExistente.id
          ? {
              ...e,
              militarId: militar.id,
              startTimeMs,
              endTimeMs,
              isAjuste: true,
              status: "efetivada"
            }
          : e
      );
    } else {
      const novoItem: EscalaItem = {
        id: `esc-${dataStr}-${posto.id}`,
        unidadeId: unidade.id,
        data: dataStr,
        postoId: posto.id,
        militarId: militar.id,
        startTimeMs,
        endTimeMs,
        isPermuta: false,
        isAjuste: true,
        status: "efetivada"
      };
      novasEscalas.push(novoItem);
    }

    novasEscalas = reajustarHierarquiaGuarnicao(
      novasEscalas,
      dataStr,
      unidade.id,
      militaresUnidade,
      postosList
    );

    onUpdateEscalas(novasEscalas);
    setDraggedMilitarId(null);
  };

  const handleRemoverEscala = (itemEscalaId: string) => {
    const novasEscalas = escalas.filter((e) => e.id !== itemEscalaId);
    onUpdateEscalas(novasEscalas);
    setDropFeedback({
      tipo: "sucesso",
      mensagem: "Escalação removida com sucesso."
    });
    setTimeout(() => setDropFeedback(null), 3000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Toast Feedback */}
      {dropFeedback && (
        <div
          className={`p-4 rounded-xl shadow-xl border flex items-center justify-between gap-3 text-xs font-bold transition-all animate-in fade-in slide-in-from-top duration-200 ${
            dropFeedback.tipo === "bloqueio"
              ? "bg-rose-950/90 text-rose-200 border-rose-800"
              : dropFeedback.tipo === "alerta"
              ? "bg-amber-950/90 text-amber-200 border-amber-800"
              : "bg-emerald-950/90 text-emerald-200 border-emerald-800"
          }`}
        >
          <div className="flex items-center gap-2">
            {dropFeedback.tipo === "bloqueio" ? (
              <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
            ) : dropFeedback.tipo === "alerta" ? (
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            )}
            <span>{dropFeedback.mensagem}</span>
          </div>
          <button
            onClick={() => setDropFeedback(null)}
            className="text-slate-400 hover:text-slate-200 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Conflict Selection Highlight Banner */}
      {dataDestaque && (
        <div className="bg-amber-500/10 border border-amber-500/40 text-amber-300 p-4 rounded-2xl flex items-center justify-between gap-3 text-xs font-bold animate-pulse shadow-md">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <span className="text-amber-400 font-extrabold uppercase tracking-wider block text-[10px]">
                Foco do Conflito Selecionado
              </span>
              <span>
                Exibindo a escala do dia <strong>{formatDateBr(dataDestaque)}</strong> selecionado no Painel de Conflitos. A coluna do dia está destacada abaixo.
              </span>
            </div>
          </div>
          {onLimparDestaque && (
            <button
              onClick={onLimparDestaque}
              className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 px-3 py-1.5 rounded-lg border border-amber-500/40 text-xs font-extrabold transition-all cursor-pointer shrink-0"
            >
              Limpar Destaque
            </button>
          )}
        </div>
      )}

      {/* Week Toolbar & Projection Action Bar */}
      <div className="bg-slate-900 p-4 sm:p-5 rounded-xl border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-extrabold text-blue-400 bg-blue-600/10 px-2.5 py-0.5 rounded-md border border-blue-500/20 uppercase">
              Semana Operacional (Terça a Segunda)
            </span>
            <span className="text-[11px] font-extrabold text-amber-300 bg-amber-950/60 px-2.5 py-0.5 rounded-md border border-amber-800/80 font-mono">
              INFORMATIVO Nº {calcularInformativoNumero(semanaInfo.dataInicioTerca, unidade.cabecalho.informativoNumero)}
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-extrabold text-slate-100 mt-1 flex items-center gap-2">
            Escala de {formatDateBr(semanaInfo.dataInicioTerca)} a {formatDateBr(semanaInfo.dataFimSegunda)}
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Week Nav Buttons & Dropdown */}
          <div className="flex items-center bg-slate-950 rounded-xl p-1 border border-slate-800 gap-1">
            <button
              onClick={handleSemanaAnterior}
              className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-300 transition-colors cursor-pointer"
              title="Semana Anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <select
              value={dataTercaAtual}
              onChange={(e) => mudarDataTerca(e.target.value)}
              className="bg-slate-900 border border-slate-800 text-slate-200 text-xs font-bold rounded-lg px-2 py-1 outline-none focus:border-blue-500 cursor-pointer"
            >
              {opcoesSemanas.map((op) => (
                <option key={op.value} value={op.value}>
                  {op.label}
                </option>
              ))}
            </select>

            <button
              onClick={handleProximaSemana}
              className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-300 transition-colors cursor-pointer"
              title="Próxima Semana"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              onClick={handleSemanaHoje}
              className="px-2 py-1 text-[11px] font-bold text-blue-400 bg-blue-950/40 border border-blue-800/60 rounded-lg hover:bg-blue-900/40 transition-colors cursor-pointer ml-1"
              title="Ir para Semana Inicial (04/Ago)"
            >
              Início
            </button>
          </div>

          {/* Operador Notice Banner */}
          {!isComandante && (
            <div className="flex items-center gap-2 bg-blue-950/80 border border-blue-700/60 text-blue-200 px-3.5 py-2 rounded-xl text-xs font-semibold shadow-sm">
              <Eye className="w-4 h-4 text-blue-400 shrink-0" />
              <span><strong>Modo Consulta (Operador):</strong> Projeções, reset e edições desativadas.</span>
            </div>
          )}

          {/* Trigger Projection Engine (Comandante Only) */}
          {isComandante && (
            <button
              onClick={() => {
                onProjetarFuturo(semanaInfo.dataInicioTerca, 5);
              }}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
              title="Projeta o sequenciamento mensal completo e exibe no calendário mensal"
            >
              <Sparkles className="w-4 h-4 text-blue-200" />
              <span>Projetar Sequenciamento Mensal</span>
            </button>
          )}

          {/* Reset Auto-Projection Button (Comandante Only) */}
          {isComandante && onResetarProjecao && (
            <button
              onClick={onResetarProjecao}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-rose-300 hover:text-rose-200 font-bold text-xs px-3 py-2.5 rounded-xl border border-rose-500/30 transition-all shadow-sm active:scale-95 cursor-pointer"
              title="Resetar Projeção Automática (mantém os lançamentos manuais e permutas intactos)"
            >
              <RotateCcw className="w-4 h-4 text-rose-400" />
              <span>Resetar</span>
            </button>
          )}
        </div>
      </div>

      {/* Roster Draggable Bar (Comandante Only for Dragging) */}
      {isComandante ? (
        <div className="bg-slate-900 text-white p-3.5 rounded-xl shadow-xl border border-slate-800 space-y-2.5">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <img src="https://i.ibb.co/FqLxFKqG/logo-17bpm-removebg-preview.png" alt="Logo" className="w-4 h-4 object-contain" referrerPolicy="no-referrer" />
            Efetivo Militar & Reforços (Arraste o Card para o Slot Desejado)
          </h3>
          <span className="text-[11px] text-slate-400">
            {militaresUnidade.length} Policiais Cadastrados
          </span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-slate-700">
          {/* SPECIAL DRAGGABLE CARD FOR REFORÇO EXTRAORDINÁRIO */}
          <div
            draggable
            onDragStart={() => handleDragStart("REFORCO_EXTRAORDINARIO")}
            className="bg-gradient-to-r from-amber-950 to-amber-900 hover:from-amber-900 hover:to-amber-800 border-2 border-amber-500 hover:border-amber-400 rounded-xl px-3 py-1.5 text-xs cursor-grab active:cursor-grabbing shrink-0 transition-all select-none shadow-lg flex items-center gap-2 text-amber-100 group animate-pulse hover:animate-none"
            title="Arraste para qualquer posto e dia na escala para alocar um Reforço Extraordinário"
          >
            <div className="bg-amber-500 text-slate-950 p-1 rounded-lg font-black shrink-0">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <div className="font-extrabold text-[11px] text-amber-300 flex items-center gap-1.5 uppercase tracking-wide">
                <span>Reforço Extraordinário</span>
                <span className="text-[8.5px] bg-amber-400 text-slate-950 px-1 py-0.2 rounded font-black">
                  LIVRE
                </span>
              </div>
              <div className="text-[9.5px] text-amber-200/90 flex items-center gap-1 font-semibold">
                <span>Arraste p/ o dia desejado</span>
              </div>
            </div>
          </div>

          <div className="w-[1px] h-8 bg-slate-800 mx-1 shrink-0" />

          {militaresUnidade.map((m) => {
            return (
              <div
                key={m.id}
                draggable
                onDragStart={() => handleDragStart(m.id)}
                className="bg-slate-800/90 hover:bg-slate-800 border border-slate-700/80 hover:border-blue-500/50 rounded-xl px-2.5 py-1.5 text-xs cursor-grab active:cursor-grabbing shrink-0 transition-all select-none shadow-md flex items-center gap-2"
              >
                <span className="font-mono text-[10px] text-slate-400 font-bold">
                  #{m.antiguidadeOrdem}
                </span>
                <div>
                  <div className="font-bold text-white flex items-center gap-1 text-[11px]">
                    <span>{m.graduacao}</span>
                    <span className="text-blue-400">{m.nomeGuerra}</span>
                  </div>
                  <div className="text-[9.5px] text-slate-400 flex items-center gap-1">
                    <span>RG {m.rgPmmt}</span>
                    {m.cnhAtiva && <Car className="w-3 h-3 text-emerald-400 ml-1" title="CNH Motorista Ativa" />}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      ) : null}

      {/* Main Weekly Schedule Grid (Tuesday to Monday) - Responsive without horizontal scrollbar */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 shadow-xl overflow-hidden w-full">
        <div className="w-full">
          <table className="w-full text-left border-collapse table-fixed">
            <thead>
              <tr className="bg-slate-950 text-slate-200 text-xs font-bold uppercase tracking-wider divide-x divide-slate-800 border-b border-slate-800">
                <th className="py-3 px-2 w-[16%] bg-slate-950 text-slate-300 text-center">
                  Posto
                </th>
                {semanaInfo.dias.map((d) => {
                  const isEmDestaque = dataDestaque === d.data;
                  const hojeStr = getTodayString();
                  const statusDia = obterStatusDiaEscala(d.data, hojeStr);

                  return (
                    <th
                      key={d.data}
                      className={`py-3 px-1 w-[12%] text-center transition-all ${
                        isEmDestaque
                          ? "bg-amber-500/20 text-amber-300 font-extrabold ring-2 ring-amber-500/80"
                          : d.isFimDeSemana
                          ? "bg-slate-900 text-blue-400"
                          : ""
                      }`}
                    >
                      <div className="text-[11px] font-extrabold leading-tight">{d.diaSemanaNome}</div>
                      <div className="flex items-center justify-center gap-1 mt-0.5">
                        {statusDia === "concluida" ? (
                          <span className="text-[8px] bg-emerald-500/20 text-emerald-300 font-extrabold px-1 py-0.2 rounded border border-emerald-500/30 uppercase">
                            Concluída
                          </span>
                        ) : (
                          <span className="text-[8px] bg-blue-500/20 text-blue-300 font-extrabold px-1 py-0.2 rounded border border-blue-500/30 uppercase">
                            Aberta
                          </span>
                        )}
                        {isEmDestaque && (
                          <span className="inline-block text-[8px] bg-amber-500 text-slate-950 font-black px-1 py-0 rounded uppercase tracking-tighter shadow-xs">
                            Foco
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-xs text-slate-200 divide-x divide-slate-800">
              {postosUnidade.map((posto) => (
                <tr key={posto.id} className="hover:bg-slate-800/30 transition-colors">
                  {/* Posto Header Cell */}
                  <td className="p-2 bg-slate-950/60 font-bold border-r border-slate-800 align-top w-[16%]">
                    <div className="space-y-1">
                      <span className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded border ${posto.corBadge}`}>
                        {posto.sigla}
                      </span>
                      <p className="text-slate-200 text-[11px] leading-tight font-semibold">{posto.nome}</p>
                      <div className="text-[9.5px] text-slate-400 font-normal flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-500 shrink-0" />
                        {posto.usarDoisTurnos && posto.turno1 && posto.turno2 ? (
                          <span className="truncate">
                            {posto.turno1.inicio}-{posto.turno1.fim} / {posto.turno2.inicio}-{posto.turno2.fim}
                          </span>
                        ) : (
                          <span>
                            {posto.horaInicio} {posto.horaFim ? `às ${posto.horaFim}` : ""} ({posto.duracaoHoras}h)
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* 7 Days Slots (Tuesday to Monday) */}
                  {semanaInfo.dias.map((d) => {
                    const dataStr = d.data;

                    // Skip Expediente on weekends
                    if (posto.tipoHorario === "expediente" && d.isFimDeSemana) {
                      return (
                        <td key={dataStr} className="p-1.5 bg-slate-950/40 text-center text-slate-500 text-[9.5px] italic align-middle w-[12%]">
                          Sem exp.
                        </td>
                      );
                    }

                    // Find assigned scale item
                    const itemEscala = escalas.find(
                      (e) => e.unidadeId === unidade.id && e.data === dataStr && e.postoId === posto.id
                    );

                    const militarAlocado = itemEscala
                      ? militaresUnidade.find((m) => m.id === itemEscala.militarId)
                      : null;

                    // Calculate seniority suggestion if unassigned
                    const startH = posto.horaInicio || "08:00";
                    const startMs = new Date(`${dataStr}T${startH}:00`).getTime();
                    const endMs = startMs + (posto.duracaoHoras || 24) * 60 * 60 * 1000;

                    const sugestao = sugerirMilitarParaPosto(
                      posto,
                      dataStr,
                      startMs,
                      endMs,
                      militaresUnidade,
                      escalas,
                      afastamentos
                    );

                    // Validate alerts for assigned militar
                    let alertasCalculados: AlertaEscala[] = [];
                    if (militarAlocado) {
                      alertasCalculados = validarRegrasEscala(
                        militarAlocado,
                        posto,
                        dataStr,
                        itemEscala!.startTimeMs,
                        itemEscala!.endTimeMs,
                        escalas,
                        afastamentos,
                        itemEscala!.id,
                        postosList
                      );
                    }

                    const temAlertaRest = alertasCalculados.find((a) => a.tipo === "ALERTA_72H");
                    const temAlertaOcios = alertasCalculados.find((a) => a.tipo === "ALERTA_96H");

                    const isEmDestaque = dataDestaque === dataStr;

                    return (
                      <td
                        key={dataStr}
                        onDragOver={handleDragOver}
                        onDrop={() => handleDropSlot(dataStr, posto)}
                        className={`p-1 sm:p-1.5 transition-all relative align-top w-[12%] ${
                          isEmDestaque
                            ? "bg-amber-950/25 ring-1 ring-amber-500/50"
                            : militarAlocado
                            ? "bg-slate-900/80"
                            : "bg-slate-950/20 hover:bg-blue-900/10"
                        }`}
                      >
                        {militarAlocado ? (
                          <div className="bg-slate-950 text-white rounded-lg p-1.5 shadow-md border border-slate-800 space-y-1 group relative">
                            {/* Badges for Status / Permuta / Ajuste */}
                            <div className="flex items-center justify-between gap-0.5 text-[9px]">
                              {dataStr < getTodayString() || itemEscala?.status === "concluida" ? (
                                <span className="bg-emerald-950/80 text-emerald-300 font-extrabold px-1 py-0.5 rounded border border-emerald-700/60 flex items-center gap-0.5 truncate">
                                  <CheckCircle2 className="w-2.5 h-2.5 shrink-0 text-emerald-400" /> CONCLUÍDA
                                </span>
                              ) : itemEscala?.isPermuta ? (
                                <span className="bg-purple-500/20 text-purple-300 font-extrabold px-1 py-0.5 rounded border border-purple-500/30 flex items-center gap-0.5 truncate">
                                  <ArrowLeftRight className="w-2.5 h-2.5 shrink-0" /> PERMUTA
                                </span>
                              ) : itemEscala?.isAjuste ? (
                                <span className="bg-amber-500/20 text-amber-300 font-bold px-1 py-0.5 rounded border border-amber-500/30 flex items-center gap-0.5 truncate">
                                  <RefreshCw className="w-2.5 h-2.5 shrink-0" /> AJUSTADO
                                </span>
                              ) : (
                                <span className="bg-blue-950/60 text-blue-300 font-extrabold px-1 py-0.5 rounded border border-blue-800/60 flex items-center gap-0.5 truncate">
                                  <Sparkles className="w-2.5 h-2.5 shrink-0 text-blue-400" /> ABERTA
                                </span>
                              )}

                              <span className="font-mono text-slate-400 text-[8.5px] shrink-0">
                                #{militarAlocado.antiguidadeOrdem}
                              </span>
                            </div>

                            {/* Military Info */}
                            <div className="leading-tight">
                              <p className="font-semibold text-[10px] text-slate-300 truncate">
                                {militarAlocado.graduacao}
                              </p>
                              <p className="font-extrabold text-[11px] text-blue-400 truncate">
                                {militarAlocado.nomeGuerra}
                              </p>
                              <p className="text-[9px] text-slate-400 font-mono truncate">
                                RG {militarAlocado.rgPmmt}
                              </p>
                            </div>

                            {/* Soft Alert Warning Pills */}
                            {temAlertaRest && (
                              <div className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[8.5px] font-semibold px-1 py-0.5 rounded flex items-center gap-0.5 leading-none">
                                <AlertTriangle className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                                <span className="truncate">Folga {temAlertaRest.detalheHorasDescanso}h</span>
                              </div>
                            )}

                            {temAlertaOcios && (
                              <div className="bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[8.5px] font-semibold px-1 py-0.5 rounded flex items-center gap-0.5 leading-none">
                                <Info className="w-2.5 h-2.5 text-blue-400 shrink-0" />
                                <span className="truncate">Ocioso {temAlertaOcios.detalheHorasDescanso}h</span>
                              </div>
                            )}

                            {/* Action Buttons (Comandante only) */}
                            {isComandante ? (
                              <div className="flex items-center gap-1 pt-1 border-t border-slate-800/80 text-[9px]">
                                <button
                                  onClick={() => onAbrirPermuta(itemEscala!)}
                                  className="flex-1 bg-slate-900 hover:bg-slate-800 text-slate-200 py-1 px-1 rounded text-[9px] font-semibold transition-colors flex items-center justify-center gap-0.5 cursor-pointer border border-slate-800 truncate"
                                  title="Troca de Serviço com Sigadoc"
                                >
                                  <ArrowLeftRight className="w-2.5 h-2.5 text-purple-400 shrink-0" />
                                  <span>Permuta</span>
                                </button>

                                <button
                                  onClick={() => onAbrirAjuste(itemEscala!)}
                                  className="flex-1 bg-slate-900 hover:bg-slate-800 text-slate-200 py-1 px-1 rounded text-[9px] font-semibold transition-colors flex items-center justify-center gap-0.5 cursor-pointer border border-slate-800 truncate"
                                  title="Ajuste Oficial de Escala"
                                >
                                  <RefreshCw className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                                  <span>Ajuste</span>
                                </button>

                                <button
                                  onClick={() => handleRemoverEscala(itemEscala!.id)}
                                  className="bg-slate-900 hover:bg-rose-950/80 text-rose-400 hover:text-rose-200 p-1 rounded text-[9px] font-semibold transition-colors flex items-center justify-center cursor-pointer border border-slate-800 hover:border-rose-800 shrink-0"
                                  title="Excluir / Desescalar policial deste posto"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-center gap-1 pt-1 border-t border-slate-800/80 text-[9px] text-slate-400 font-bold">
                                <Lock className="w-2.5 h-2.5 text-slate-500 shrink-0" />
                                <span>Escala Fixada</span>
                              </div>
                            )}
                          </div>
                        ) : itemEscala && itemEscala.militarId === "REFORCO_EXTRAORDINARIO" ? (
                          <div className="bg-amber-950/80 border border-amber-600/80 text-amber-200 rounded-lg p-1.5 shadow-md space-y-1 group relative">
                            <div className="flex items-center justify-between text-[9px]">
                              <span className="bg-amber-500/20 text-amber-300 font-extrabold px-1 py-0.5 rounded border border-amber-500/30 flex items-center gap-0.5 truncate">
                                <Zap className="w-2.5 h-2.5 text-amber-400 shrink-0" /> REFORÇO EXTRA
                              </span>
                            </div>

                            <div className="leading-tight">
                              <p className="font-extrabold text-[11px] text-amber-300 truncate uppercase">
                                Reforço Extraordinário
                              </p>
                              <p className="text-[9px] text-amber-400/90 font-mono truncate">
                                Escala Complementar
                              </p>
                            </div>

                            {isComandante ? (
                              <div className="flex items-center gap-1 pt-1 border-t border-amber-800/80 text-[9px]">
                                <button
                                  onClick={() => onAbrirAjuste(itemEscala)}
                                  className="flex-1 bg-amber-900/80 hover:bg-amber-800 text-amber-100 py-1 px-1 rounded text-[9px] font-bold transition-colors flex items-center justify-center gap-0.5 cursor-pointer border border-amber-700 truncate"
                                  title="Alocar / Nomear Policial Militar Específico"
                                >
                                  <RefreshCw className="w-2.5 h-2.5 text-amber-300 shrink-0" />
                                  <span>Alocar PM</span>
                                </button>

                                <button
                                  onClick={() => handleRemoverEscala(itemEscala.id)}
                                  className="bg-amber-900/80 hover:bg-rose-950/80 text-rose-300 hover:text-rose-100 p-1 rounded text-[9px] font-bold transition-colors flex items-center justify-center cursor-pointer border border-amber-700 hover:border-rose-800 shrink-0"
                                  title="Remover Reforço Extraordinário deste Posto"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-center gap-1 pt-1 border-t border-amber-800/80 text-[9px] text-amber-300 font-bold">
                                <Lock className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                                <span>Reforço Fixado</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          /* Empty slot with Seniority Suggestion badge */
                          <div className="border-2 border-dashed border-slate-800 rounded-xl p-2 min-h-[90px] flex flex-col items-center justify-between transition-colors text-center bg-slate-950/30">
                            <span className="text-[10px] font-semibold text-slate-500">
                              {isComandante ? "Arraste para alocar" : "Vago"}
                            </span>

                            {sugestao.sugerido && (
                              <div className="mt-1 bg-blue-950/50 border border-blue-800/80 rounded-lg px-1.5 py-1 text-[9.5px] text-blue-300">
                                <span className="font-bold block text-blue-400">
                                  💡 Sugestão:
                                </span>
                                <span className="font-semibold">
                                  {sugestao.sugerido.graduacao} {sugestao.sugerido.nomeGuerra}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
