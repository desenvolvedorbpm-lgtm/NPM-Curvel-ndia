import React, { useState, useMemo } from "react";
import {
  UnidadeTenant,
  Militar,
  PostoServico,
  EscalaItem,
  Afastamento,
  ItemConflito,
  RegistroFolga96h
} from "../types";
import { obterTodosConflitosEscala, formatDateBr, obterStatusDiaEscala, formatRgPmmt } from "../utils/rulesEngine";
import { Folgas96hManager } from "./Folgas96hManager";
import {
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  Search,
  ExternalLink,
  Clock,
  Briefcase,
  User,
  AlertCircle,
  Filter,
  CheckCircle2,
  Calendar,
  X,
  ArrowRight,
  Car,
  FileText,
  Award,
  Layers,
  History
} from "lucide-react";

interface ConflictsManagerProps {
  unidade: UnidadeTenant;
  militares: Militar[];
  postos: PostoServico[];
  escalas: EscalaItem[];
  afastamentos: Afastamento[];
  registrosFolga96h: RegistroFolga96h[];
  onAddRegistroFolga96h: (novo: RegistroFolga96h) => void;
  onUpdateRegistroFolga96h: (atualizado: RegistroFolga96h) => void;
  onDeleteRegistroFolga96h: (id: string) => void;
  onNavegarParaData: (dataStr: string) => void;
  onAbrirPermuta?: (item: EscalaItem) => void;
  onAbrirAjuste?: (item: EscalaItem) => void;
  isComandante?: boolean;
}

export const ConflictsManager: React.FC<ConflictsManagerProps> = ({
  unidade,
  militares,
  postos,
  escalas,
  afastamentos,
  registrosFolga96h,
  onAddRegistroFolga96h,
  onUpdateRegistroFolga96h,
  onDeleteRegistroFolga96h,
  onNavegarParaData,
  onAbrirPermuta,
  onAbrirAjuste,
  isComandante = true
}) => {
  const [subTabAtiva, setSubTabAtiva] = useState<"conflitos" | "folgas96h">("conflitos");
  const [searchTerm, setSearchTerm] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState<"TODOS" | "CRITICO" | "ALERTA_72H" | "ALERTA_96H" | "AFASTAMENTO">("TODOS");

  // Compute all conflicts dynamically (filtering out finalized/completed scales)
  const todosConflitos = useMemo(() => {
    return obterTodosConflitosEscala(unidade.id, escalas, militares, postos, afastamentos).filter(
      (c) => c.escalaItem.status !== "concluida" && obterStatusDiaEscala(c.data) !== "concluida"
    );
  }, [unidade.id, escalas, militares, postos, afastamentos]);

  // Statistics
  const totalConflitos = todosConflitos.length;
  const totalCriticos = todosConflitos.filter((c) => c.nivelGravidade === "CRITICO").length;
  const totalAlertas72 = todosConflitos.filter((c) => c.alerta.tipo === "ALERTA_72H").length;
  const totalOciosidade = todosConflitos.filter((c) => c.alerta.tipo === "ALERTA_96H").length;

  // Filtered List
  const conflitosFiltrados = useMemo(() => {
    return todosConflitos.filter((item) => {
      // Type filter
      if (tipoFiltro === "CRITICO" && item.nivelGravidade !== "CRITICO") return false;
      if (tipoFiltro === "ALERTA_72H" && item.alerta.tipo !== "ALERTA_72H") return false;
      if (tipoFiltro === "ALERTA_96H" && item.alerta.tipo !== "ALERTA_96H") return false;
      if (tipoFiltro === "AFASTAMENTO" && item.alerta.tipo !== "INDISPONIVEL_AFASTADO") return false;

      // Text search
      if (searchTerm.trim() !== "") {
        const term = searchTerm.toLowerCase();
        const nomeGuerra = item.militar.nomeGuerra.toLowerCase();
        const nomeCompleto = item.militar.nomeCompleto.toLowerCase();
        const graduacao = item.militar.graduacao.toLowerCase();
        const postoNome = item.posto.nome.toLowerCase();
        const dataFmt = formatDateBr(item.data);

        return (
          nomeGuerra.includes(term) ||
          nomeCompleto.includes(term) ||
          graduacao.includes(term) ||
          postoNome.includes(term) ||
          dataFmt.includes(term) ||
          item.data.includes(term)
        );
      }

      return true;
    });
  }, [todosConflitos, tipoFiltro, searchTerm]);

  const getDayName = (dateStr: string) => {
    if (!dateStr) return "";
    const dow = new Date(dateStr + "T12:00:00").getDay();
    const names = [
      "Domingo",
      "Segunda-Feira",
      "Terça-Feira",
      "Quarta-Feira",
      "Quinta-Feira",
      "Sexta-Feira",
      "Sábado"
    ];
    return names[dow];
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* NAVIGATION SUB-TABS: CONFLITOS vs REGISTRO DE FOLGAS 96H */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSubTabAtiva("conflitos")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
              subTabAtiva === "conflitos"
                ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                : "bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800"
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            <span>Conflitos e Inconformidades</span>
            {totalConflitos > 0 && (
              <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
                subTabAtiva === "conflitos"
                  ? "bg-slate-950 text-amber-400"
                  : "bg-amber-500 text-slate-950"
              }`}>
                {totalConflitos}
              </span>
            )}
          </button>

          <button
            onClick={() => setSubTabAtiva("folgas96h")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
              subTabAtiva === "folgas96h"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                : "bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800"
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Registro de Folgas (96h)</span>
            <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
              subTabAtiva === "folgas96h"
                ? "bg-slate-950 text-blue-300"
                : "bg-blue-600/30 text-blue-300 border border-blue-500/40"
            }`}>
              {registrosFolga96h.length}
            </span>
          </button>
        </div>

        <div className="text-xs text-slate-400 font-medium">
          Módulo de Controle: <span className="text-white font-bold">{unidade.nome}</span>
        </div>
      </div>

      {/* VIEW 1: CONFLICTS MONITOR */}
      {subTabAtiva === "conflitos" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Top Banner */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
            <div className="absolute -right-10 -bottom-10 opacity-5 pointer-events-none">
              <ShieldAlert className="w-64 h-64 text-amber-500" />
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-amber-400" />
                    Supervisão Operacional de Descanso
                  </span>
                  <span className="text-xs text-slate-400 font-medium">
                    {unidade.nome}
                  </span>
                </div>
                <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2.5">
                  <span>Painel de Conflitos e Inconformidades de Escala</span>
                </h2>
                <p className="text-xs text-slate-400 max-w-2xl">
                  Monitoramento automático das regras institucionais: bloqueios de descanso mínimo (24h), avisos de descanso recomendado (72h), ociosidade prolongada (&gt;96h) e choques de horários com licenças/afastamentos.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {totalConflitos === 0 ? (
                  <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-4 py-2.5 rounded-xl font-bold text-xs shadow-sm">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Nenhuma Violação Encontrada</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/30 text-rose-300 px-4 py-2.5 rounded-xl font-bold text-xs shadow-sm">
                    <AlertCircle className="w-4 h-4 text-rose-400" />
                    <span>{totalConflitos} {totalConflitos === 1 ? 'Inconformidade Requer Atenção' : 'Inconformidades Requerem Atenção'}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Metrics KPI Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-800/80">
              <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-xl">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total de Conflitos</div>
                <div className="text-2xl font-black text-white mt-1 flex items-center justify-between">
                  <span>{totalConflitos}</span>
                  <AlertCircle className="w-5 h-5 text-slate-500" />
                </div>
              </div>

              <div className="bg-slate-950/70 border border-rose-500/30 p-3.5 rounded-xl">
                <div className="text-[10px] font-bold uppercase tracking-wider text-rose-400">Bloqueios Absolutos (24h)</div>
                <div className="text-2xl font-black text-rose-400 mt-1 flex items-center justify-between">
                  <span>{totalCriticos}</span>
                  <ShieldAlert className="w-5 h-5 text-rose-500/80" />
                </div>
              </div>

              <div className="bg-slate-950/70 border border-amber-500/30 p-3.5 rounded-xl">
                <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Avisos de Folga (&lt;72h)</div>
                <div className="text-2xl font-black text-amber-400 mt-1 flex items-center justify-between">
                  <span>{totalAlertas72}</span>
                  <AlertTriangle className="w-5 h-5 text-amber-500/80" />
                </div>
              </div>

              <div className="bg-slate-950/70 border border-blue-500/30 p-3.5 rounded-xl">
                <div className="text-[10px] font-bold uppercase tracking-wider text-blue-400">Avisos de Ociosidade (&gt;96h)</div>
                <div className="text-2xl font-black text-blue-400 mt-1 flex items-center justify-between">
                  <span>{totalOciosidade}</span>
                  <Clock className="w-5 h-5 text-blue-500/80" />
                </div>
              </div>
            </div>
          </div>

          {/* Filter and Search Toolbar */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Search */}
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por militar, posto ou data..."
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

            {/* Severity Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto scrollbar-none py-1">
              <button
                onClick={() => setTipoFiltro("TODOS")}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                  tipoFiltro === "TODOS"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700"
                }`}
              >
                Todos ({totalConflitos})
              </button>

              <button
                onClick={() => setTipoFiltro("CRITICO")}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                  tipoFiltro === "CRITICO"
                    ? "bg-rose-600 text-white shadow-xs"
                    : "bg-slate-800 text-slate-400 hover:text-rose-300 hover:bg-slate-700"
                }`}
              >
                🛑 Bloqueios Absolutos ({totalCriticos})
              </button>

              <button
                onClick={() => setTipoFiltro("ALERTA_72H")}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                  tipoFiltro === "ALERTA_72H"
                    ? "bg-amber-600 text-white shadow-xs"
                    : "bg-slate-800 text-slate-400 hover:text-amber-300 hover:bg-slate-700"
                }`}
              >
                ⚠️ Descanso &lt;72h ({totalAlertas72})
              </button>

              <button
                onClick={() => setTipoFiltro("ALERTA_96H")}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                  tipoFiltro === "ALERTA_96H"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-slate-800 text-slate-400 hover:text-blue-300 hover:bg-slate-700"
                }`}
              >
                ℹ️ Ociosidade &gt;96h ({totalOciosidade})
              </button>
            </div>
          </div>

          {/* Main Conflicts List */}
          {conflitosFiltrados.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto shadow-inner">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-white">Nenhum Conflito Encontrado</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                {searchTerm || tipoFiltro !== "TODOS"
                  ? "Nenhum resultado corresponde aos filtros selecionados. Tente ajustar a busca ou os filtros."
                  : "A escala atual cumpre integralmente os requisitos operacionais de descanso mínimo (24h) e alocações vigentes."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400 px-1 font-medium">
                <span>Listando {conflitosFiltrados.length} {conflitosFiltrados.length === 1 ? 'item' : 'itens'}</span>
                <span className="text-[11px] text-slate-500">Clique em "Ver na Escala Semanal" para ir diretamente ao dia na grade</span>
              </div>

              {conflitosFiltrados.map((item) => {
                const isCritico = item.nivelGravidade === "CRITICO";
                const isAlerta72 = item.alerta.tipo === "ALERTA_72H";
                const isAlerta96 = item.alerta.tipo === "ALERTA_96H";

                let cardBorder = "border-slate-800 hover:border-slate-700";
                let badgeBg = "bg-slate-800 text-slate-300 border-slate-700";
                let badgeText = "INCONFORMIDADE";
                let badgeIcon = <AlertCircle className="w-3.5 h-3.5" />;

                if (isCritico) {
                  cardBorder = "border-rose-500/40 hover:border-rose-500/70 bg-rose-950/10";
                  badgeBg = "bg-rose-500/20 text-rose-300 border-rose-500/40";
                  badgeText = item.alerta.tipo === "BLOQUEIO_24H"
                    ? "BLOQUEIO 24H (DESCANSO MÍNIMO VETO)"
                    : item.alerta.tipo === "INDISPONIVEL_AFASTADO"
                    ? "MILITAR EM AFASTAMENTO / LICENÇA"
                    : "MOTORISTA SEM CNH ATIVA";
                  badgeIcon = <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />;
                } else if (isAlerta72) {
                  cardBorder = "border-amber-500/30 hover:border-amber-500/60 bg-amber-950/10";
                  badgeBg = "bg-amber-500/20 text-amber-300 border-amber-500/40";
                  badgeText = "AVISO DE DESCANSO REDUZIDO (< 72H)";
                  badgeIcon = <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />;
                } else if (isAlerta96) {
                  cardBorder = "border-blue-500/30 hover:border-blue-500/60 bg-blue-950/10";
                  badgeBg = "bg-blue-500/20 text-blue-300 border-blue-500/40";
                  badgeText = "AVISO DE OCIOSIDADE PROLONGADA (> 96H)";
                  badgeIcon = <Clock className="w-3.5 h-3.5 text-blue-400" />;
                }

                return (
                  <div
                    key={item.id}
                    className={`bg-slate-900 border rounded-2xl p-5 transition-all shadow-md hover:shadow-xl space-y-4 ${cardBorder}`}
                  >
                    {/* Header Row */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`inline-flex items-center gap-1.5 text-[11px] font-extrabold px-3 py-1 rounded-full border uppercase tracking-wider ${badgeBg}`}>
                          {badgeIcon}
                          <span>{badgeText}</span>
                        </span>

                        <span className="text-xs font-bold text-slate-300 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-blue-400" />
                          <span>{getDayName(item.data)}, {formatDateBr(item.data)}</span>
                        </span>
                      </div>

                      {/* Primary CTA: Redirect directly to the day in the schedule grid */}
                      <button
                        onClick={() => onNavegarParaData(item.data)}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer self-start sm:self-auto group shrink-0"
                        title={`Redirecionar diretamente para a escala do dia ${formatDateBr(item.data)}`}
                      >
                        <span>Ver na Escala Semanal</span>
                        <ArrowRight className="w-4 h-4 text-blue-200 group-hover:translate-x-0.5 transition-transform" />
                      </button>
                    </div>

                    {/* Details Grid: Military & Post Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      {/* Military Info */}
                      <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-xl space-y-2 notranslate" translate="no">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-blue-400" />
                          <span>Policial Militar Envolvido</span>
                        </div>
                        <div className="flex items-center justify-between notranslate" translate="no">
                          <div className="font-extrabold text-white text-sm notranslate" translate="no">
                            <span className="text-blue-400 notranslate" translate="no">{item.militar.graduacao}</span> <span className="notranslate" translate="no">{item.militar.nomeGuerra}</span>
                          </div>
                          <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800 notranslate" translate="no">
                            RG {formatRgPmmt(item.militar.rgPmmt)}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-3 notranslate" translate="no">
                          <span className="notranslate" translate="no">Nome: {item.militar.nomeCompleto}</span>
                          {item.militar.cnhAtiva && (
                            <span className="text-emerald-400 flex items-center gap-1 font-semibold" title="CNH Ativa">
                              <Car className="w-3 h-3" /> CNH OK
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Post Info */}
                      <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-xl space-y-2">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                          <Briefcase className="w-3.5 h-3.5 text-blue-400" />
                          <span>Posto de Serviço Escalado</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="font-bold text-white text-sm flex items-center gap-2">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${item.posto.corBadge}`}>
                              {item.posto.sigla}
                            </span>
                            <span>{item.posto.nome}</span>
                          </div>
                          <span className="text-[11px] text-slate-400 font-semibold">
                            {item.posto.duracaoHoras}h de Serviço
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2">
                          <Clock className="w-3 h-3 text-slate-500" />
                          <span>Horário: {item.posto.horaInicio || "08:00"} {item.posto.horaFim ? `às ${item.posto.horaFim}` : ""}</span>
                          <span className="text-slate-600">•</span>
                          <span className="capitalize">{item.posto.tipoHorario}</span>
                        </div>
                      </div>
                    </div>

                    {/* Conflict Explanation Box */}
                    <div className={`p-3.5 rounded-xl border text-xs font-medium space-y-1 ${
                      isCritico
                        ? "bg-rose-950/30 border-rose-500/30 text-rose-200"
                        : isAlerta72
                        ? "bg-amber-950/30 border-amber-500/30 text-amber-200"
                        : "bg-blue-950/30 border-blue-500/30 text-blue-200"
                    }`}>
                      <div className="font-bold flex items-center gap-1.5 text-white">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>Detalhes do Diagnóstico Regulatorio:</span>
                      </div>
                      <p className="pl-5 text-slate-200 leading-relaxed">
                        {item.alerta.mensagem}
                      </p>
                    </div>

                    {/* Secondary Actions Row */}
                    {(onAbrirPermuta || onAbrirAjuste) && (
                      <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-800/60">
                        {onAbrirPermuta && (
                          <button
                            onClick={() => onAbrirPermuta(item.escalaItem)}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-700 transition-colors cursor-pointer"
                          >
                            Lançar Permuta
                          </button>
                        )}
                        {onAbrirAjuste && (
                          <button
                            onClick={() => onAbrirAjuste(item.escalaItem)}
                            className="bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 text-xs font-bold px-3 py-1.5 rounded-lg border border-blue-500/30 transition-colors cursor-pointer"
                          >
                            Substituir Militar
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: REGISTRO DE FOLGAS DE 96 HORAS */}
      {subTabAtiva === "folgas96h" && (
        <div className="animate-in fade-in duration-200">
          <Folgas96hManager
            unidade={unidade}
            militares={militares}
            postos={postos}
            escalas={escalas}
            registros={registrosFolga96h}
            onAddRegistro={onAddRegistroFolga96h}
            onUpdateRegistro={onUpdateRegistroFolga96h}
            onDeleteRegistro={onDeleteRegistroFolga96h}
            isComandante={isComandante}
          />
        </div>
      )}
    </div>
  );
};
