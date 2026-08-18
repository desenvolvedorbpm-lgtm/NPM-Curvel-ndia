import React, { useState, useMemo } from "react";
import {
  Militar,
  PostoServico,
  EscalaItem,
  Afastamento,
  UnidadeTenant
} from "../types";
import {
  formatDateBr,
  sortPostosEmOrdemOficial,
  getTodayString,
  obterStatusDiaEscala,
  isEscalaItemConcluido,
  validarRegrasEscala,
  reajustarHierarquiaGuarnicao,
  formatRgPmmt
} from "../utils/rulesEngine";
import {
  Calendar as CalendarIcon,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  UserCheck,
  UserX,
  X,
  Building2,
  Clock,
  Zap,
  Filter,
  Layers,
  Shield,
  Eye,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Trash2,
  Car
} from "lucide-react";

interface MonthlyCalendarProps {
  unidade: UnidadeTenant;
  militares: Militar[];
  postos: PostoServico[];
  escalas: EscalaItem[];
  afastamentos: Afastamento[];
  onProjetarFuturo: (dataInicioTerca: string, semanas: number) => void;
  onResetarProjecao?: () => void;
  onUpdateEscalas: (novasEscalas: EscalaItem[]) => void;
  isComandante?: boolean;
}

export interface DiaProjecaoInfo {
  dataStr: string;
  numDia: number;
  isTerca: boolean;
  isFimDeSemana: boolean;
  escalasDia: EscalaItem[];
  afastadosDia: {
    afastamento: Afastamento;
    militar: Militar | null;
  }[];
  guarnicaoProjetada: {
    posto: PostoServico;
    militar: Militar | null;
    isReforco: boolean;
    escala: EscalaItem;
  }[];
}

type ModoDensidade = "padrao" | "compacto" | "expandido";
type FiltroExibicao = "todos" | "operacional" | "indisponiveis";

export const MonthlyCalendar: React.FC<MonthlyCalendarProps> = ({
  unidade,
  militares,
  postos,
  escalas,
  afastamentos,
  onProjetarFuturo,
  onResetarProjecao,
  onUpdateEscalas,
  isComandante = true
}) => {
  // Current month anchor (e.g. 2026-08)
  const [mesAno, setMesAno] = useState("2026-08");
  const [dataStrSelecionada, setDataStrSelecionada] = useState<string | null>(null);

  // Density & Filter state for layout customization
  const [modoDensidade, setModoDensidade] = useState<ModoDensidade>("padrao");
  const [filtroExibicao, setFiltroExibicao] = useState<FiltroExibicao>("todos");

  // Drag and Drop States
  const [draggedMilitarId, setDraggedMilitarId] = useState<string | null>(null);
  const [draggedSourceItemId, setDraggedSourceItemId] = useState<string | null>(null);
  const [dragOverDayStr, setDragOverDayStr] = useState<string | null>(null);
  const [dragOverSlotKey, setDragOverSlotKey] = useState<string | null>(null);
  const [dropFeedback, setDropFeedback] = useState<{
    tipo: "sucesso" | "alerta" | "bloqueio";
    mensagem: string;
  } | null>(null);

  const [anoStr, mesStr] = mesAno.split("-");
  const ano = parseInt(anoStr, 10);
  const mes = parseInt(mesStr, 10);

  // Generate days in selected month
  const totalDias = useMemo(() => new Date(ano, mes, 0).getDate(), [ano, mes]);
  const primeiroDiaSemana = useMemo(() => new Date(ano, mes - 1, 1).getDay(), [ano, mes]); // 0 = Sun

  const diasDoMes = useMemo(() => {
    const arr: string[] = [];
    for (let d = 1; d <= totalDias; d++) {
      const dd = String(d).padStart(2, "0");
      const mm = String(mes).padStart(2, "0");
      arr.push(`${ano}-${mm}-${dd}`);
    }
    return arr;
  }, [ano, mes, totalDias]);

  // Active posts sorted in official order: Comandante -> Motorista -> Patrulheiro -> Expediente
  const postosUnidade = useMemo(
    () => sortPostosEmOrdemOficial(postos.filter((p) => p.unidadeId === unidade.id && p.ativo)),
    [postos, unidade.id]
  );
  const militaresUnidade = useMemo(
    () => militares.filter((m) => m.unidadeId === unidade.id && m.ativo),
    [militares, unidade.id]
  );

  const handleMesAnterior = () => {
    let m = mes - 1;
    let a = ano;
    if (m < 1) {
      m = 12;
      a -= 1;
    }
    setMesAno(`${a}-${String(m).padStart(2, "0")}`);
  };

  const handleProximoMes = () => {
    let m = mes + 1;
    let a = ano;
    if (m > 12) {
      m = 1;
      a += 1;
    }
    setMesAno(`${a}-${String(m).padStart(2, "0")}`);
  };

  const nomesMeses = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  // Build projected daily mapping
  const mapaProjecaoDias = useMemo(() => {
    const mapa = new Map<string, DiaProjecaoInfo>();

    for (const dataStr of diasDoMes) {
      const numDia = parseInt(dataStr.split("-")[2], 10);
      const dow = new Date(dataStr + "T12:00:00").getDay();
      const isTerca = dow === 2;
      const isFimDeSemana = dow === 0 || dow === 6;

      // Filter scale items for this day
      const escalasDia = escalas.filter(
        (e) => e.unidadeId === unidade.id && e.data === dataStr
      );

      // Check officer absences on this day
      const afastadosDia = afastamentos
        .filter((af) => {
          if (af.unidadeId !== unidade.id) return false;
          const start = new Date(af.dataInicio + "T00:00:00").getTime();
          const end = new Date(af.dataFim + "T23:59:59").getTime();
          const cur = new Date(dataStr + "T12:00:00").getTime();
          return cur >= start && cur <= end;
        })
        .map((af) => ({
          afastamento: af,
          militar: militares.find((m) => m.id === af.militarId) || null
        }));

      // Map guarnição (squad) in official order of posts
      const guarnicaoProjetada: DiaProjecaoInfo["guarnicaoProjetada"] = [];

      for (const posto of postosUnidade) {
        // Skip expediente on weekends
        if (posto.tipoHorario === "expediente" && isFimDeSemana) continue;

        const slot = escalasDia.find((e) => e.postoId === posto.id);
        if (slot) {
          const m = militares.find((item) => item.id === slot.militarId) || null;
          const isReforco = slot.militarId === "REFORCO_EXTRAORDINARIO";
          guarnicaoProjetada.push({
            posto,
            militar: m,
            isReforco,
            escala: slot
          });
        }
      }

      mapa.set(dataStr, {
        dataStr,
        numDia,
        isTerca,
        isFimDeSemana,
        escalasDia,
        afastadosDia,
        guarnicaoProjetada
      });
    }

    return mapa;
  }, [diasDoMes, escalas, afastamentos, unidade.id, postosUnidade, militares]);

  // Derived selected day modal info (safe, zero extra re-render loops)
  const diaSelecionadoModal = dataStrSelecionada ? mapaProjecaoDias.get(dataStrSelecionada) || null : null;

  // Aggregate stats for selected month
  const estatisticasMes = useMemo(() => {
    let totalEscalas = 0;
    let totalAfastadosEventos = 0;

    mapaProjecaoDias.forEach((info) => {
      totalEscalas += info.escalasDia.length;
      totalAfastadosEventos += info.afastadosDia.length;
    });

    return {
      totalEscalas,
      totalAfastadosEventos,
      totalMilitares: militaresUnidade.length
    };
  }, [mapaProjecaoDias, militaresUnidade]);

  // DRAG & DROP HANDLERS
  const handleDragStart = (militarId: string, sourceItemId?: string) => {
    setDraggedMilitarId(militarId);
    setDraggedSourceItemId(sourceItemId || null);
  };

  const handleDragOverDay = (e: React.DragEvent, dataStr: string, slotKey?: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverDayStr !== dataStr) {
      setDragOverDayStr(dataStr);
    }
    if (slotKey && dragOverSlotKey !== slotKey) {
      setDragOverSlotKey(slotKey);
    }
  };

  const handleDropOnDayOrSlot = (targetDataStr: string, targetPostoId?: string) => {
    setDragOverDayStr(null);
    setDragOverSlotKey(null);
    if (!draggedMilitarId) return;

    const sourceItem = draggedSourceItemId
      ? escalas.find((e) => e.id === draggedSourceItemId)
      : null;

    const dataOrigem = sourceItem ? sourceItem.data : null;
    const postoOrigem = sourceItem
      ? postos.find((p) => p.id === sourceItem.postoId) || null
      : null;

    // Determine target posto
    const isTargetFimDeSemana = (() => {
      const dow = new Date(targetDataStr + "T12:00:00").getDay();
      return dow === 0 || dow === 6;
    })();

    const postosValidosTarget = postosUnidade.filter(
      (p) => !(p.tipoHorario === "expediente" && isTargetFimDeSemana)
    );

    if (postosValidosTarget.length === 0) {
      setDropFeedback({
        tipo: "bloqueio",
        mensagem: "Nenhum posto de serviço disponível nesta data."
      });
      setTimeout(() => setDropFeedback(null), 4000);
      setDraggedMilitarId(null);
      setDraggedSourceItemId(null);
      return;
    }

    let targetPosto: PostoServico | null = null;
    if (targetPostoId) {
      targetPosto = postosValidosTarget.find((p) => p.id === targetPostoId) || null;
    }

    // If no specific post was dropped onto, find the first vacant post or default to first available
    if (!targetPosto) {
      const escalasTargetDia = escalas.filter(
        (e) => e.unidadeId === unidade.id && e.data === targetDataStr && (sourceItem ? e.id !== sourceItem.id : true)
      );
      const postosOcupadosIds = new Set(escalasTargetDia.map((e) => e.postoId));
      targetPosto = postosValidosTarget.find((p) => !postosOcupadosIds.has(p.id)) || postosValidosTarget[0];
    }

    if (!targetPosto) return;

    const itemExistenteTarget = escalas.find(
      (e) => e.unidadeId === unidade.id && e.data === targetDataStr && e.postoId === targetPosto!.id
    );

    // If dropping onto the exact same slot it came from, do nothing
    if (sourceItem && itemExistenteTarget?.id === sourceItem.id) {
      setDraggedMilitarId(null);
      setDraggedSourceItemId(null);
      return;
    }

    let startH = targetPosto.horaInicio || "08:00";
    let duracao = targetPosto.duracaoHoras || 24;
    const startTimeMs = new Date(`${targetDataStr}T${startH}:00`).getTime();
    const endTimeMs = startTimeMs + duracao * 60 * 60 * 1000;

    // Special handling for Reforço Extraordinário
    if (draggedMilitarId === "REFORCO_EXTRAORDINARIO") {
      const escalasSemOrigem = sourceItem
        ? escalas.filter((e) => e.id !== sourceItem.id)
        : escalas;

      let novasEscalas = [...escalasSemOrigem];

      if (itemExistenteTarget) {
        novasEscalas = novasEscalas.map((e) =>
          e.id === itemExistenteTarget.id
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
          id: `esc-${targetDataStr}-${targetPosto.id}`,
          unidadeId: unidade.id,
          data: targetDataStr,
          postoId: targetPosto.id,
          militarId: "REFORCO_EXTRAORDINARIO",
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
        targetDataStr,
        unidade.id,
        militaresUnidade,
        postos
      );
      if (dataOrigem && dataOrigem !== targetDataStr) {
        novasEscalas = reajustarHierarquiaGuarnicao(
          novasEscalas,
          dataOrigem,
          unidade.id,
          militaresUnidade,
          postos
        );
      }

      onUpdateEscalas(novasEscalas);
      setDropFeedback({
        tipo: "sucesso",
        mensagem: sourceItem
          ? `Reforço Extraordinário movido de ${formatDateBr(dataOrigem!)} para o dia ${formatDateBr(targetDataStr)} (${targetPosto.sigla}).`
          : `Reforço Extraordinário alocado com sucesso no dia ${formatDateBr(targetDataStr)} (${targetPosto.sigla}).`
      });
      setTimeout(() => setDropFeedback(null), 3500);
      setDraggedMilitarId(null);
      setDraggedSourceItemId(null);
      return;
    }

    const militar = militaresUnidade.find((m) => m.id === draggedMilitarId);
    if (!militar) return;

    // CASE 1: SWAP between two occupied slots (Permuta / Troca entre dias ou postos no mês)
    if (sourceItem && itemExistenteTarget && itemExistenteTarget.militarId) {
      const militarAlvo = militaresUnidade.find((m) => m.id === itemExistenteTarget.militarId);
      const isAlvoReforco = itemExistenteTarget.militarId === "REFORCO_EXTRAORDINARIO";

      const escalasSemAmbos = escalas.filter(
        (e) => e.id !== sourceItem.id && e.id !== itemExistenteTarget.id
      );

      const alertasA = validarRegrasEscala(
        militar,
        targetPosto,
        targetDataStr,
        startTimeMs,
        endTimeMs,
        escalasSemAmbos,
        afastamentos
      );

      const temBloqueioA = alertasA.some(
        (a) => a.tipo === "BLOQUEIO_24H" || a.tipo === "INDISPONIVEL_AFASTADO"
      );

      if (temBloqueioA) {
        const msg = alertasA.find((a) => a.tipo === "BLOQUEIO_24H" || a.tipo === "INDISPONIVEL_AFASTADO")?.mensagem;
        setDropFeedback({
          tipo: "bloqueio",
          mensagem: msg || `Bloqueio: ${militar.graduacao} ${militar.nomeGuerra} não pode assumir a data ${formatDateBr(targetDataStr)}.`
        });
        setTimeout(() => setDropFeedback(null), 5000);
        setDraggedMilitarId(null);
        setDraggedSourceItemId(null);
        return;
      }

      if (militarAlvo && postoOrigem && dataOrigem) {
        const alertasB = validarRegrasEscala(
          militarAlvo,
          postoOrigem,
          dataOrigem,
          sourceItem.startTimeMs,
          sourceItem.endTimeMs,
          escalasSemAmbos,
          afastamentos
        );

        const temBloqueioB = alertasB.some(
          (a) => a.tipo === "BLOQUEIO_24H" || a.tipo === "INDISPONIVEL_AFASTADO"
        );

        if (temBloqueioB) {
          const msg = alertasB.find((a) => a.tipo === "BLOQUEIO_24H" || a.tipo === "INDISPONIVEL_AFASTADO")?.mensagem;
          setDropFeedback({
            tipo: "bloqueio",
            mensagem: msg || `Bloqueio: ${militarAlvo.graduacao} ${militarAlvo.nomeGuerra} não pode assumir o dia ${formatDateBr(dataOrigem)}.`
          });
          setTimeout(() => setDropFeedback(null), 5000);
          setDraggedMilitarId(null);
          setDraggedSourceItemId(null);
          return;
        }
      }

      // Realizar Permuta Recíproca
      let novasEscalas = escalas.map((e) => {
        if (e.id === itemExistenteTarget.id) {
          return {
            ...e,
            militarId: militar.id,
            startTimeMs,
            endTimeMs,
            isPermuta: true,
            isAjuste: true,
            status: "efetivada"
          };
        }
        if (e.id === sourceItem.id) {
          return {
            ...e,
            militarId: isAlvoReforco ? "REFORCO_EXTRAORDINARIO" : (militarAlvo?.id || "REFORCO_EXTRAORDINARIO"),
            isPermuta: true,
            isAjuste: true,
            status: "efetivada"
          };
        }
        return e;
      });

      novasEscalas = reajustarHierarquiaGuarnicao(
        novasEscalas,
        targetDataStr,
        unidade.id,
        militaresUnidade,
        postos
      );
      if (dataOrigem && dataOrigem !== targetDataStr) {
        novasEscalas = reajustarHierarquiaGuarnicao(
          novasEscalas,
          dataOrigem,
          unidade.id,
          militaresUnidade,
          postos
        );
      }

      onUpdateEscalas(novasEscalas);
      const nomeB = militarAlvo ? `${militarAlvo.graduacao} ${militarAlvo.nomeGuerra}` : "Reforço Extraordinário";
      setDropFeedback({
        tipo: "sucesso",
        mensagem: `Permuta realizada: ${militar.graduacao} ${militar.nomeGuerra} (${formatDateBr(targetDataStr)}) ⇄ ${nomeB} (${dataOrigem ? formatDateBr(dataOrigem) : ""}).`
      });
      setTimeout(() => setDropFeedback(null), 4500);
      setDraggedMilitarId(null);
      setDraggedSourceItemId(null);
      return;
    }

    // CASE 2: MOVE to an empty slot or NEW ALLOCATION from Roster Bar
    const escalasSemOrigem = sourceItem
      ? escalas.filter((e) => e.id !== sourceItem.id)
      : escalas;

    const alertas = validarRegrasEscala(
      militar,
      targetPosto,
      targetDataStr,
      startTimeMs,
      endTimeMs,
      escalasSemOrigem,
      afastamentos
    );

    const temBloqueio = alertas.some(
      (a) => a.tipo === "BLOQUEIO_24H" || a.tipo === "INDISPONIVEL_AFASTADO"
    );

    if (temBloqueio) {
      const bloqueioMsg = alertas.find((a) => a.tipo === "BLOQUEIO_24H" || a.tipo === "INDISPONIVEL_AFASTADO")?.mensagem;
      setDropFeedback({
        tipo: "bloqueio",
        mensagem: bloqueioMsg || "BLOQUEIO: Escalação rejeitada por violar restrição de descanso de 24h ou afastamento ativo."
      });
      setTimeout(() => setDropFeedback(null), 5000);
      setDraggedMilitarId(null);
      setDraggedSourceItemId(null);
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
        mensagem: sourceItem
          ? `Policial militar ${militar.graduacao} ${militar.nomeGuerra} movido de ${dataOrigem ? formatDateBr(dataOrigem) : ""} para o dia ${formatDateBr(targetDataStr)} (${targetPosto.sigla}).`
          : `Policial militar ${militar.graduacao} ${militar.nomeGuerra} alocado com sucesso no dia ${formatDateBr(targetDataStr)} (${targetPosto.sigla}).`
      });
      setTimeout(() => setDropFeedback(null), 3500);
    }

    let novasEscalas = [...escalasSemOrigem];

    if (itemExistenteTarget) {
      novasEscalas = novasEscalas.map((e) =>
        e.id === itemExistenteTarget.id
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
        id: `esc-${targetDataStr}-${targetPosto.id}`,
        unidadeId: unidade.id,
        data: targetDataStr,
        postoId: targetPosto.id,
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
      targetDataStr,
      unidade.id,
      militaresUnidade,
      postos
    );
    if (dataOrigem && dataOrigem !== targetDataStr) {
      novasEscalas = reajustarHierarquiaGuarnicao(
        novasEscalas,
        dataOrigem,
        unidade.id,
        militaresUnidade,
        postos
      );
    }

    onUpdateEscalas(novasEscalas);
    setDraggedMilitarId(null);
    setDraggedSourceItemId(null);
  };

  const handleRemoverEscalaNoDia = (escalaId: string) => {
    const item = escalas.find((e) => e.id === escalaId);
    if (!item) return;

    let novas = escalas.filter((e) => e.id !== escalaId);
    novas = reajustarHierarquiaGuarnicao(novas, item.data, unidade.id, militaresUnidade, postos);
    onUpdateEscalas(novas);
    setDropFeedback({
      tipo: "sucesso",
      mensagem: "Escalação removida com sucesso."
    });
    setTimeout(() => setDropFeedback(null), 3000);
  };

  // Helper to determine visual hierarchy & role styles for squad posts
  const getEstiloPostoGuarnicao = (posto: PostoServico, isReforco: boolean) => {
    const siglaUpper = (posto.sigla || "").toUpperCase();
    const nomeLower = (posto.nome || "").toLowerCase();

    if (isReforco) {
      return {
        roleTag: "REF",
        roleLabel: "Reforço Extraordinário",
        badgeBg: "bg-amber-500 text-slate-950 font-black border-amber-300",
        cardBg: "bg-amber-950/70 border-amber-600/80 hover:border-amber-500",
        textRank: "text-amber-300/90",
        textName: "text-amber-200 font-black"
      };
    }

    if (siglaUpper.includes("CMT") || nomeLower.includes("comandante") || nomeLower.includes("cmt")) {
      return {
        roleTag: "CMT",
        roleLabel: "Comandante da Guarnição",
        badgeBg: "bg-blue-600 text-white font-black border-blue-400",
        cardBg: "bg-blue-950/80 border-blue-700/80 hover:border-blue-500",
        textRank: "text-blue-300/90",
        textName: "text-blue-100 font-black"
      };
    }

    if (siglaUpper.includes("MOT") || nomeLower.includes("motorista") || nomeLower.includes("condutor")) {
      return {
        roleTag: "MOT",
        roleLabel: "Motorista da Guarnição",
        badgeBg: "bg-emerald-600 text-white font-black border-emerald-400",
        cardBg: "bg-emerald-950/80 border-emerald-700/80 hover:border-emerald-500",
        textRank: "text-emerald-300/90",
        textName: "text-emerald-100 font-black"
      };
    }

    if (
      siglaUpper.includes("PATR") ||
      siglaUpper.includes("PAT") ||
      nomeLower.includes("patrulheiro") ||
      nomeLower.includes("auxiliar")
    ) {
      return {
        roleTag: "PAT",
        roleLabel: "Patrulheiro da Guarnição",
        badgeBg: "bg-purple-600 text-white font-black border-purple-400",
        cardBg: "bg-purple-950/80 border-purple-700/80 hover:border-purple-500",
        textRank: "text-purple-300/90",
        textName: "text-purple-100 font-black"
      };
    }

    if (posto.tipoHorario === "expediente" || nomeLower.includes("expediente") || nomeLower.includes("adm")) {
      return {
        roleTag: "EXP",
        roleLabel: "Expediente Administrativo",
        badgeBg: "bg-slate-700 text-slate-200 font-bold border-slate-600",
        cardBg: "bg-slate-900/90 border-slate-800 hover:border-slate-700",
        textRank: "text-slate-400",
        textName: "text-slate-200 font-bold"
      };
    }

    return {
      roleTag: posto.sigla || "GUPM",
      roleLabel: posto.nome,
      badgeBg: "bg-slate-800 text-slate-200 font-bold border-slate-700",
      cardBg: "bg-slate-950/90 border-slate-800 hover:border-slate-700",
      textRank: "text-slate-400",
      textName: "text-slate-100 font-bold"
    };
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Toast Feedback Notification */}
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
            className="text-slate-400 hover:text-slate-200 cursor-pointer p-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header Bar */}
      <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-blue-400 bg-blue-600/10 px-2.5 py-1 rounded-md border border-blue-500/20 uppercase flex items-center gap-1.5">
              <CalendarIcon className="w-3.5 h-3.5 text-blue-400" />
              Projeção e Espelhamento Mensal
            </span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-100 mt-1 flex items-center gap-2">
            Escala Projetada por Guarnição • {nomesMeses[mes - 1]} / {ano}
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Month Selector */}
          <div className="flex items-center bg-slate-950 rounded-xl p-1 border border-slate-800">
            <button
              onClick={handleMesAnterior}
              className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-300 cursor-pointer"
              title="Mês Anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1 text-xs font-bold text-slate-200">
              {nomesMeses[mes - 1]} {ano}
            </span>
            <button
              onClick={handleProximoMes}
              className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-300 cursor-pointer"
              title="Próximo Mês"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {!isComandante && (
            <div className="flex items-center gap-2 bg-blue-950/80 border border-blue-700/60 text-blue-200 px-3.5 py-2 rounded-xl text-xs font-semibold shadow-sm">
              <Eye className="w-4 h-4 text-blue-400 shrink-0" />
              <span><strong>Modo Consulta (Operador):</strong> Visualização liberada. Ações de projeção e reset desativadas.</span>
            </div>
          )}

          {/* Automatic Projection (Comandante Only) */}
          {isComandante && (
            <button
              onClick={() => {
                let d = new Date(ano, mes - 1, 1);
                while (d.getDay() !== 2) {
                  d.setDate(d.getDate() + 1);
                }
                const firstTuesStr = d.toISOString().split("T")[0];
                onProjetarFuturo(firstTuesStr, 5);
              }}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
              title="Projeta o restante do mês com base na escala semanal e no ciclo de turnos"
            >
              <Sparkles className="w-4 h-4 text-blue-200" />
              <span>Executar Projeção Automática</span>
            </button>
          )}

          {/* Reset Auto-Projection Button (Comandante Only) */}
          {isComandante && onResetarProjecao && (
            <button
              onClick={onResetarProjecao}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-rose-300 hover:text-rose-200 font-bold text-xs px-3.5 py-2.5 rounded-xl border border-rose-500/30 transition-all shadow-sm active:scale-95 cursor-pointer"
              title="Remove os lançamentos gerados por projeção automática"
            >
              <RotateCcw className="w-4 h-4 text-rose-400" />
              <span>Resetar Projeção Automática</span>
            </button>
          )}
        </div>
      </div>

      {/* Roster Draggable Bar for Monthly Calendar (Comandante Only) */}
      {isComandante && (
        <div className="bg-slate-900 text-white p-3.5 rounded-xl shadow-xl border border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <img src="https://i.ibb.co/FqLxFKqG/logo-17bpm-removebg-preview.png" alt="Logo" className="w-4 h-4 object-contain" referrerPolicy="no-referrer" />
              <span>Efetivo Militar & Reforços (Arraste para Qualquer Dia do Calendário)</span>
            </h3>
            <span className="text-[11px] text-slate-400 font-semibold">
              {militaresUnidade.length} Policiais Cadastrados • Arraste entre dias livremente
            </span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-slate-700">
            {/* SPECIAL DRAGGABLE CARD FOR REFORÇO EXTRAORDINÁRIO */}
            <div
              draggable
              onDragStart={() => handleDragStart("REFORCO_EXTRAORDINARIO")}
              onDragEnd={() => {
                setDraggedMilitarId(null);
                setDraggedSourceItemId(null);
              }}
              className="bg-gradient-to-r from-amber-950 to-amber-900 hover:from-amber-900 hover:to-amber-800 border-2 border-amber-500 hover:border-amber-400 rounded-xl px-3 py-1.5 text-xs cursor-grab active:cursor-grabbing shrink-0 transition-all select-none shadow-lg flex items-center gap-2 text-amber-100 group animate-pulse hover:animate-none"
              title="Arraste para qualquer dia no calendário para alocar um Reforço Extraordinário"
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
                  <span>Arraste p/ qualquer dia</span>
                </div>
              </div>
            </div>

            <div className="w-[1px] h-8 bg-slate-800 mx-1 shrink-0" />

            {militaresUnidade.map((m) => (
              <div
                key={m.id}
                draggable
                onDragStart={() => handleDragStart(m.id)}
                onDragEnd={() => {
                  setDraggedMilitarId(null);
                  setDraggedSourceItemId(null);
                }}
                className="bg-slate-800/90 hover:bg-slate-800 border border-slate-700/80 hover:border-blue-500/50 rounded-xl px-2.5 py-1.5 text-xs cursor-grab active:cursor-grabbing shrink-0 transition-all select-none shadow-md flex items-center gap-2 notranslate"
                translate="no"
                title={`Arraste ${m.graduacao} ${m.nomeGuerra} para qualquer dia`}
              >
                <span className="font-mono text-[10px] text-slate-400 font-bold">
                  #{m.antiguidadeOrdem}
                </span>
                <div className="notranslate" translate="no">
                  <div className="font-bold text-white flex items-center gap-1 text-[11px] notranslate" translate="no">
                    <span className="notranslate" translate="no">{m.graduacao}</span>
                    <span className="text-blue-400 notranslate" translate="no">{m.nomeGuerra}</span>
                  </div>
                  <div className="text-[9.5px] text-slate-400 flex items-center gap-1 notranslate" translate="no">
                    <span className="notranslate" translate="no">RG {formatRgPmmt(m.rgPmmt)}</span>
                    {m.cnhAtiva && <Car className="w-3 h-3 text-emerald-400 ml-1" title="CNH Motorista Ativa" />}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-md flex items-center gap-3">
          <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-extrabold uppercase text-slate-400">Dias no Mês</span>
            <p className="text-lg font-black text-slate-100">{totalDias} dias</p>
          </div>
        </div>

        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-md flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-extrabold uppercase text-slate-400">Turnos Escalados</span>
            <p className="text-lg font-black text-emerald-300">{estatisticasMes.totalEscalas} alocações</p>
          </div>
        </div>

        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-md flex items-center gap-3">
          <div className="p-2.5 bg-rose-500/10 text-rose-400 rounded-xl border border-rose-500/20">
            <UserX className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-extrabold uppercase text-slate-400">Afastamentos Registrados</span>
            <p className="text-lg font-black text-rose-300">{estatisticasMes.totalAfastadosEventos} eventos</p>
          </div>
        </div>

        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-md flex items-center gap-3">
          <div className="p-2.5 bg-purple-500/10 text-purple-400 rounded-xl border border-purple-500/20">
            <img
              src={unidade.cabecalho?.logoUrl || "https://i.ibb.co/FqLxFKqG/logo-17bpm-removebg-preview.png"}
              alt="Logo"
              className="w-5 h-5 object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
          <div>
            <span className="text-[10px] font-extrabold uppercase text-slate-400">Efetivo da Unidade</span>
            <p className="text-lg font-black text-purple-300">{estatisticasMes.totalMilitares} policiais</p>
          </div>
        </div>
      </div>

      {/* Control Bar: View Density & Filters */}
      <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Layout Density Selector */}
        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px] flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-blue-400" /> Densidade do Grid:
          </span>
          <div className="bg-slate-950 p-1 rounded-lg border border-slate-800 flex items-center gap-1">
            <button
              onClick={() => setModoDensidade("compacto")}
              className={`px-2.5 py-1 rounded-md font-extrabold transition-all cursor-pointer ${
                modoDensidade === "compacto"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Compacto
            </button>
            <button
              onClick={() => setModoDensidade("padrao")}
              className={`px-2.5 py-1 rounded-md font-extrabold transition-all cursor-pointer ${
                modoDensidade === "padrao"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Padrão
            </button>
            <button
              onClick={() => setModoDensidade("expandido")}
              className={`px-2.5 py-1 rounded-md font-extrabold transition-all cursor-pointer ${
                modoDensidade === "expandido"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Expandido
            </button>
          </div>
        </div>

        {/* Display Filter Selector */}
        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px] flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-emerald-400" /> Exibição:
          </span>
          <div className="bg-slate-950 p-1 rounded-lg border border-slate-800 flex items-center gap-1">
            <button
              onClick={() => setFiltroExibicao("todos")}
              className={`px-2.5 py-1 rounded-md font-extrabold transition-all cursor-pointer ${
                filtroExibicao === "todos"
                  ? "bg-slate-800 text-slate-100 border border-slate-700 shadow-xs"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Todas as Funções
            </button>
            <button
              onClick={() => setFiltroExibicao("operacional")}
              className={`px-2.5 py-1 rounded-md font-extrabold transition-all cursor-pointer ${
                filtroExibicao === "operacional"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              title="Oculta o Expediente e exibe apenas a Guarnição Operacional de RUA"
            >
              Apenas Guarnição (Rua)
            </button>
            <button
              onClick={() => setFiltroExibicao("indisponiveis")}
              className={`px-2.5 py-1 rounded-md font-extrabold transition-all cursor-pointer ${
                filtroExibicao === "indisponiveis"
                  ? "bg-rose-600 text-white shadow-xs"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Destaque Afastados
            </button>
          </div>
        </div>
      </div>

      {/* Main Calendar Grid with Drag and Drop between Days */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 shadow-2xl overflow-hidden">
        {/* Days of week header */}
        <div className="grid grid-cols-7 bg-slate-950 text-slate-300 text-xs font-extrabold uppercase text-center border-b border-slate-800 py-3">
          <div>Dom</div>
          <div>Seg</div>
          <div className="text-blue-400 font-extrabold flex items-center justify-center gap-1">
            <span>Ter</span>
            <span className="text-[9px] bg-blue-500/20 text-blue-300 px-1 rounded border border-blue-500/30">
              Início
            </span>
          </div>
          <div>Qua</div>
          <div>Qui</div>
          <div>Sex</div>
          <div>Sáb</div>
        </div>

        <div className="grid grid-cols-7 divide-x divide-y divide-slate-800/80 bg-slate-950/40">
          {/* Empty leading cells */}
          {Array.from({ length: primeiroDiaSemana }).map((_, i) => (
            <div key={`empty-${i}`} className="min-h-[120px] bg-slate-950/60 p-2" />
          ))}

          {/* Month Days */}
          {diasDoMes.map((dataStr) => {
            const dayInfo = mapaProjecaoDias.get(dataStr)!;
            const {
              numDia,
              isTerca,
              isFimDeSemana,
              afastadosDia,
              guarnicaoProjetada
            } = dayInfo;

            // Filter squad items according to active filter
            const guarnicaoFiltrada = guarnicaoProjetada.filter((item) => {
              if (filtroExibicao === "operacional") {
                return item.posto.tipoHorario !== "expediente";
              }
              return true;
            });

            // Calculate min height based on density mode
            let minCellHeight = "min-h-[160px]";
            if (modoDensidade === "compacto") minCellHeight = "min-h-[135px]";
            if (modoDensidade === "expandido") minCellHeight = "min-h-[210px]";

            const temAfastados = afastadosDia.length > 0;
            const destaqueIndisponivel = filtroExibicao === "indisponiveis" && temAfastados;
            const isDayDragOver = dragOverDayStr === dataStr;

            return (
              <div
                key={dataStr}
                onDragOver={(e) => handleDragOverDay(e, dataStr)}
                onDragLeave={() => {
                  if (dragOverDayStr === dataStr) setDragOverDayStr(null);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleDropOnDayOrSlot(dataStr);
                }}
                onClick={() => setDataStrSelecionada(dataStr)}
                className={`${minCellHeight} p-2 flex flex-col justify-between transition-all cursor-pointer relative group ${
                  isDayDragOver
                    ? "bg-blue-950/80 ring-2 ring-blue-400 border-blue-500 scale-[1.01] z-10 shadow-xl"
                    : destaqueIndisponivel
                    ? "bg-rose-950/30 hover:bg-rose-900/40 border-rose-800/60"
                    : "bg-slate-900/90 hover:bg-slate-800/90 border-slate-800/40 hover:border-slate-700"
                } ${isTerca ? "border-l-2 border-l-blue-500" : ""}`}
              >
                <div className="space-y-1.5">
                  {/* Date Badge & Info Header */}
                  <div className="flex items-center justify-between pb-1 border-b border-slate-800/60">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-xs font-black w-6 h-6 rounded-full flex items-center justify-center shadow-xs ${
                          isTerca
                            ? "bg-blue-600 text-white ring-2 ring-blue-500/30"
                            : isFimDeSemana
                            ? "bg-amber-500/20 text-amber-300 border border-amber-500/30 font-black"
                            : "bg-slate-800 text-slate-200"
                        }`}
                      >
                        {numDia}
                      </span>
                      {isTerca && (
                        <span className="text-[8px] font-extrabold text-blue-300 uppercase bg-blue-600/20 px-1 py-0.5 rounded border border-blue-500/30">
                          Semana
                        </span>
                      )}
                      {obterStatusDiaEscala(dataStr) === "concluida" ? (
                        <span className="text-[7.5px] font-black uppercase text-emerald-300 bg-emerald-950/80 px-1 py-0.2 rounded border border-emerald-700/60">
                          Concluída
                        </span>
                      ) : (
                        <span className="text-[7.5px] font-black uppercase text-blue-300 bg-blue-950/80 px-1 py-0.2 rounded border border-blue-800/60">
                          Aberta
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 font-mono text-[9.5px]">
                      {guarnicaoFiltrada.length > 0 && (
                        <span className="text-[8.5px] font-extrabold px-1 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700">
                          {guarnicaoFiltrada.length} PMs
                        </span>
                      )}
                      <span className="text-slate-500">
                        {formatDateBr(dataStr).substring(0, 5)}
                      </span>
                    </div>
                  </div>

                  {/* Hierarchical Guarnição List with Draggable Military Items */}
                  <div className="space-y-1 mt-1">
                    {guarnicaoFiltrada.length === 0 ? (
                      <div className="text-[10px] text-slate-500 italic block text-center py-2 font-mono border border-dashed border-slate-800/80 rounded-md">
                        {isComandante ? "Solte um policial aqui" : "Sem escala lançada"}
                      </div>
                    ) : (
                      guarnicaoFiltrada.map((item) => {
                        const estilo = getEstiloPostoGuarnicao(item.posto, item.isReforco);
                        const slotKey = `${dataStr}_${item.posto.id}`;
                        const isSlotHover = dragOverSlotKey === slotKey;

                        const nomeCompletoMilitar = item.militar
                          ? `${item.militar.graduacao} ${item.militar.nomeGuerra} (RG ${item.militar.rgPmmt})`
                          : item.isReforco
                          ? "Reforço Extraordinário"
                          : "Vago";

                        const canDragThisItem = Boolean(
                          isComandante && item.escala && !isEscalaItemConcluido(item.escala)
                        );

                        return (
                          <div
                            key={item.escala.id}
                            draggable={canDragThisItem}
                            onDragStart={(e) => {
                              if (canDragThisItem) {
                                e.stopPropagation();
                                handleDragStart(item.escala.militarId, item.escala.id);
                              }
                            }}
                            onDragEnd={() => {
                              setDraggedMilitarId(null);
                              setDraggedSourceItemId(null);
                            }}
                            onDragOver={(e) => {
                              e.stopPropagation();
                              handleDragOverDay(e, dataStr, slotKey);
                            }}
                            onDrop={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              handleDropOnDayOrSlot(dataStr, item.posto.id);
                            }}
                            title={`${estilo.roleLabel} • ${item.posto.nome}: ${nomeCompletoMilitar} ${
                              canDragThisItem ? "\n(Arraste para mover/permutar com outro dia)" : ""
                            }`}
                            className={`rounded-md p-1 flex items-center justify-between gap-1 border transition-all shadow-2xs ${
                              isSlotHover
                                ? "ring-2 ring-blue-400 bg-blue-950 border-blue-400"
                                : estilo.cardBg
                            } ${
                              canDragThisItem
                                ? "cursor-grab active:cursor-grabbing hover:border-blue-400 hover:scale-[1.01]"
                                : ""
                            }`}
                          >
                            <div className="flex items-center gap-1.5 min-w-0 flex-1">
                              {/* Hierarchical Role Badge */}
                              <span
                                className={`text-[8.5px] px-1.5 py-0.2 rounded border shrink-0 uppercase tracking-tight shadow-xs ${estilo.badgeBg}`}
                              >
                                {item.posto.sigla || estilo.roleTag}
                              </span>

                              {/* Military Rank + War Name */}
                              <div className="flex items-baseline gap-1 truncate min-w-0 notranslate" translate="no">
                                {item.militar && (
                                  <span
                                    className={`text-[8.5px] font-bold shrink-0 uppercase tracking-tight opacity-80 notranslate ${estilo.textRank}`}
                                    translate="no"
                                  >
                                    {item.militar.graduacao}
                                  </span>
                                )}
                                <span className={`text-[10px] uppercase truncate tracking-tight notranslate ${estilo.textName}`} translate="no">
                                  {item.isReforco
                                    ? "REFORÇO EXTRA"
                                    : item.militar
                                    ? item.militar.nomeGuerra
                                    : "VAGO"}
                                </span>
                              </div>
                            </div>

                            {/* Extra visual indicators in expanded mode */}
                            {modoDensidade === "expandido" && item.posto.horaInicio && (
                              <span className="text-[8px] font-mono text-slate-400 bg-slate-950/80 px-1 rounded shrink-0">
                                {item.posto.horaInicio}
                              </span>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Indisponíveis / Afastados Section (Compact & Readable) */}
                {temAfastados && (
                  <div
                    className="mt-1.5 pt-1 border-t border-slate-800/80 flex items-center justify-between text-[9px] bg-rose-950/60 text-rose-200 border border-rose-800/60 rounded px-1.5 py-0.5 cursor-pointer hover:bg-rose-900/80 transition-colors shadow-xs"
                    title={`Policiais Afastados no Dia:\n${afastadosDia
                      .map(
                        (a) =>
                          `• ${a.militar ? `${a.militar.graduacao} ${a.militar.nomeGuerra}` : "Policial"}: ${a.afastamento.tipo.replace("_", " ")}`
                      )
                      .join("\n")}`}
                  >
                    <span className="font-extrabold uppercase text-rose-300 flex items-center gap-1">
                      <UserX className="w-3 h-3 text-rose-400" />
                      {afastadosDia.length} Afastado(s)
                    </span>
                    <span className="text-rose-400/80 font-mono text-[8px]">
                      Ver detalhes
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Detailed Modal for Selected Day */}
      {diaSelecionadoModal && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 rounded-xl border border-slate-800 shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="bg-slate-950 px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600/20 text-blue-400 rounded-lg border border-blue-500/30">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-100 uppercase tracking-wide flex flex-wrap items-center gap-2">
                    Guarnição do Dia {formatDateBr(diaSelecionadoModal.dataStr)}
                    {diaSelecionadoModal.isTerca && (
                      <span className="text-[10px] font-extrabold text-blue-300 bg-blue-600/30 px-2 py-0.5 rounded border border-blue-500/40">
                        Início da Semana
                      </span>
                    )}
                    {obterStatusDiaEscala(diaSelecionadoModal.dataStr) === "concluida" ? (
                      <span className="text-[10px] font-extrabold text-emerald-300 bg-emerald-950/90 px-2 py-0.5 rounded border border-emerald-700/80 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Status: CONCLUÍDA
                      </span>
                    ) : (
                      <span className="text-[10px] font-extrabold text-blue-300 bg-blue-950/90 px-2 py-0.5 rounded border border-blue-800 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-blue-400" /> Status: ABERTA (EDIÇÃO PERMITIDA)
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Unidade: <strong className="text-slate-200">{unidade.nome} ({unidade.sigla})</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDataStrSelecionada(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-6 max-h-[75vh] overflow-y-auto">
              {/* Squad Details in Hierarchical Order */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <h4 className="text-xs font-extrabold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-emerald-400" />
                    Composição da Guarnição de Serviço (Efetivo Escalado)
                  </h4>
                  <span className="text-xs font-bold text-slate-400 font-mono">
                    Total: {diaSelecionadoModal.guarnicaoProjetada.length} postos
                  </span>
                </div>

                {diaSelecionadoModal.guarnicaoProjetada.length === 0 ? (
                  <div className="p-4 bg-slate-950/50 rounded-xl border border-slate-800 text-center text-xs text-slate-400 italic">
                    Nenhum serviço ou posto alocado para este dia.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {diaSelecionadoModal.guarnicaoProjetada.map((item) => {
                      const estilo = getEstiloPostoGuarnicao(item.posto, item.isReforco);

                      return (
                        <div
                          key={item.escala.id}
                          className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${estilo.cardBg}`}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-xs px-2 py-0.5 rounded font-black uppercase tracking-tight border ${estilo.badgeBg}`}
                              >
                                {item.posto.sigla || estilo.roleTag}
                              </span>
                              <span className="font-extrabold text-sm text-slate-100">
                                {item.posto.nome}
                              </span>
                            </div>
                            <div className="text-xs text-slate-400 flex items-center gap-3 font-mono">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5 text-slate-500" />
                                {item.posto.horaInicio || "08:00"} às {item.posto.horaFim || "08:00"} ({item.posto.duracaoHoras}h)
                              </span>
                              <span className="text-slate-600">•</span>
                              <span className="capitalize">{item.posto.tipoHorario}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 sm:text-right pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                            {item.isReforco ? (
                              <span className="inline-flex items-center gap-1 bg-amber-500/20 text-amber-300 px-3 py-1.5 rounded-lg border border-amber-500/40 font-extrabold text-xs uppercase">
                                <Zap className="w-3.5 h-3.5 text-amber-400" /> Reforço Extraordinário
                              </span>
                            ) : item.militar ? (
                              <div className="notranslate" translate="no">
                                <span className={`font-black text-sm uppercase block notranslate ${estilo.textName}`} translate="no">
                                  {item.militar.graduacao} {item.militar.nomeGuerra}
                                </span>
                                <span className="text-xs text-slate-400 font-mono block notranslate" translate="no">
                                  RG: {formatRgPmmt(item.militar.rgPmmt)} • {item.militar.nomeCompleto}
                                </span>
                              </div>
                            ) : (
                              <span className="text-rose-400 font-bold italic text-xs bg-rose-950/40 px-2.5 py-1 rounded border border-rose-800/50">
                                Posto Vago (Sem Policial)
                              </span>
                            )}

                            {isComandante && obterStatusDiaEscala(diaSelecionadoModal.dataStr) !== "concluida" && (
                              <button
                                onClick={() => handleRemoverEscalaNoDia(item.escala.id)}
                                className="p-1.5 bg-slate-900/90 hover:bg-rose-950 text-slate-400 hover:text-rose-300 border border-slate-700 hover:border-rose-700 rounded-lg transition-colors cursor-pointer"
                                title="Desescalar militar deste posto"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Unavailable / Absences Details */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <h4 className="text-xs font-extrabold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                    <UserX className="w-4 h-4 text-rose-400" />
                    Policiais Indisponíveis no Dia (Férias, Licença, LTS, Outros)
                  </h4>
                  <span className="text-xs font-bold text-rose-400 font-mono">
                    {diaSelecionadoModal.afastadosDia.length} afastado(s)
                  </span>
                </div>

                {diaSelecionadoModal.afastadosDia.length === 0 ? (
                  <div className="p-4 bg-slate-950/50 rounded-xl border border-slate-800 text-center text-xs text-slate-400 italic flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Nenhum policial afastado neste dia. Todo o efetivo está apto.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-800 border border-slate-800 rounded-xl overflow-hidden bg-slate-950/40">
                    {diaSelecionadoModal.afastadosDia.map(({ afastamento, militar }) => (
                      <div
                        key={afastamento.id}
                        className="p-3.5 flex items-center justify-between text-xs bg-rose-950/20 hover:bg-rose-950/30 transition-colors"
                      >
                        <div className="space-y-0.5 notranslate" translate="no">
                          <span className="font-extrabold text-rose-200 uppercase block text-sm notranslate" translate="no">
                            {militar ? `${militar.graduacao} ${militar.nomeGuerra}` : "Policial"}
                          </span>
                          <span className="text-slate-400 text-[11px] block font-mono notranslate" translate="no">
                            {militar ? `${militar.nomeCompleto} (RG ${formatRgPmmt(militar.rgPmmt)})` : "N/A"}
                          </span>
                          <span className="text-slate-400 text-[11px] block">
                            Período: <strong>{formatDateBr(afastamento.dataInicio)}</strong> até <strong>{formatDateBr(afastamento.dataFim)}</strong>
                          </span>
                        </div>

                        <span className="bg-rose-500/20 text-rose-300 px-3 py-1.5 rounded-lg border border-rose-500/40 font-extrabold uppercase text-xs shrink-0 ml-3">
                          {afastamento.tipo.replace("_", " ")}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-950 px-5 py-3.5 border-t border-slate-800 flex items-center justify-between">
              <div className="text-xs text-slate-400 flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-blue-400" />
                <span>Escala Oficial • Polícia Militar do Estado de Mato Grosso</span>
              </div>
              <button
                onClick={() => setDataStrSelecionada(null)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs px-4 py-2 rounded-xl border border-slate-700 transition-all cursor-pointer"
              >
                Fechar Detalhamento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
