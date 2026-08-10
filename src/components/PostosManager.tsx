import React, { useState } from "react";
import { PostoServico, TipoPosto, Militar } from "../types";
import {
  Plus,
  Edit2,
  Trash2,
  Clock,
  ShieldAlert,
  Check,
  X,
  Car,
  UserCheck,
  Zap,
  CalendarCheck
} from "lucide-react";

interface PostosManagerProps {
  unidadeId: string;
  postos: PostoServico[];
  militares: Militar[];
  onAddPosto: (posto: PostoServico) => void;
  onUpdatePosto: (posto: PostoServico) => void;
  onDeletePosto: (postoId: string) => void;
  onLancarExpedienteAutomatico?: (posto: PostoServico, militarId: string) => void;
}

export const PostosManager: React.FC<PostosManagerProps> = ({
  unidadeId,
  postos,
  militares,
  onAddPosto,
  onUpdatePosto,
  onDeletePosto,
  onLancarExpedienteAutomatico
}) => {
  const postosDaUnidade = postos.filter((p) => p.unidadeId === unidadeId);
  const militaresDaUnidade = militares.filter((m) => m.unidadeId === unidadeId && m.ativo);

  const [modalAberto, setModalAberto] = useState(false);
  const [postoEditando, setPostoEditando] = useState<PostoServico | null>(null);

  // Form State
  const [nome, setNome] = useState("");
  const [sigla, setSigla] = useState("");
  const [tipoHorario, setTipoHorario] = useState<TipoPosto>("24h");
  const [horaInicio, setHoraInicio] = useState("07:30");
  const [horaFim, setHoraFim] = useState("17:30");
  const [usarDoisTurnos, setUsarDoisTurnos] = useState(false);
  const [turno1Inicio, setTurno1Inicio] = useState("07:30");
  const [turno1Fim, setTurno1Fim] = useState("11:30");
  const [turno2Inicio, setTurno2Inicio] = useState("13:30");
  const [turno2Fim, setTurno2Fim] = useState("17:30");
  const [duracaoHoras, setDuracaoHoras] = useState(24);
  const [militarDesignadoId, setMilitarDesignadoId] = useState("");
  const [lancarAutomatico, setLancarAutomatico] = useState(true);
  const [requerCnh, setRequerCnh] = useState(false);
  const [corBadge, setCorBadge] = useState("bg-blue-100 text-blue-800 border-blue-300");

  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);

  const abrirNovoModal = () => {
    setPostoEditando(null);
    setNome("");
    setSigla("");
    setTipoHorario("24h");
    setHoraInicio("08:00");
    setHoraFim("08:00");
    setUsarDoisTurnos(false);
    setTurno1Inicio("07:30");
    setTurno1Fim("11:30");
    setTurno2Inicio("13:30");
    setTurno2Fim("17:30");
    setDuracaoHoras(24);
    setMilitarDesignadoId("");
    setLancarAutomatico(true);
    setRequerCnh(false);
    setCorBadge("bg-blue-100 text-blue-800 border-blue-300");
    setModalAberto(true);
  };

  const abrirEditarModal = (posto: PostoServico) => {
    setPostoEditando(posto);
    setNome(posto.nome);
    setSigla(posto.sigla);
    setTipoHorario(posto.tipoHorario);
    setHoraInicio(posto.horaInicio || "07:30");
    setHoraFim(posto.horaFim || "17:30");
    setUsarDoisTurnos(!!posto.usarDoisTurnos);
    setTurno1Inicio(posto.turno1?.inicio || "07:30");
    setTurno1Fim(posto.turno1?.fim || "11:30");
    setTurno2Inicio(posto.turno2?.inicio || "13:30");
    setTurno2Fim(posto.turno2?.fim || "17:30");
    setDuracaoHoras(posto.duracaoHoras || (posto.tipoHorario === "24h" ? 24 : 8));
    setMilitarDesignadoId(posto.militarDesignadoId || "");
    setLancarAutomatico(true);
    setRequerCnh(posto.requerCnh);
    setCorBadge(posto.corBadge || "bg-purple-100 text-purple-800 border-purple-300");
    setModalAberto(true);
  };

  const handleSalvar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !sigla.trim()) return;

    const hInicioEfetiva = usarDoisTurnos ? turno1Inicio : horaInicio;
    const hFimEfetiva = usarDoisTurnos ? turno2Fim : horaFim;

    const postoSalvar: PostoServico = {
      id: postoEditando ? postoEditando.id : `posto-${Date.now()}`,
      unidadeId,
      nome,
      sigla: sigla.toUpperCase(),
      tipoHorario,
      horaInicio: hInicioEfetiva,
      horaFim: hFimEfetiva,
      usarDoisTurnos,
      turno1: usarDoisTurnos ? { inicio: turno1Inicio, fim: turno1Fim } : undefined,
      turno2: usarDoisTurnos ? { inicio: turno2Inicio, fim: turno2Fim } : undefined,
      duracaoHoras: tipoHorario === "24h" ? 24 : duracaoHoras,
      militarDesignadoId: militarDesignadoId || undefined,
      requerCnh,
      ordemExibicao: postoEditando ? postoEditando.ordemExibicao : postosDaUnidade.length + 1,
      corBadge,
      ativo: true
    };

    if (postoEditando) {
      onUpdatePosto(postoSalvar);
    } else {
      onAddPosto(postoSalvar);
    }

    // Auto launch if selected
    if (lancarAutomatico && militarDesignadoId && onLancarExpedienteAutomatico) {
      onLancarExpedienteAutomatico(postoSalvar, militarDesignadoId);
      const mSel = militaresDaUnidade.find((m) => m.id === militarDesignadoId);
      setMensagemSucesso(
        `Militar ${mSel?.graduacao} ${mSel?.nomeGuerra} lançado automaticamente na escala de Expediente (Segunda a Sexta)!`
      );
      setTimeout(() => setMensagemSucesso(null), 5000);
    }

    setModalAberto(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Success Banner */}
      {mensagemSucesso && (
        <div className="bg-emerald-950/90 text-emerald-200 border border-emerald-800 p-4 rounded-xl shadow-xl flex items-center justify-between text-xs font-bold animate-in fade-in slide-in-from-top duration-200">
          <div className="flex items-center gap-2">
            <CalendarCheck className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{mensagemSucesso}</span>
          </div>
          <button
            onClick={() => setMensagemSucesso(null)}
            className="text-slate-400 hover:text-slate-200 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-900 p-5 rounded-xl border border-slate-800 shadow-xl">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            Gestão de Postos de Serviço
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Cadastre e edite postos operacionais. Defina horários de início/término, 2 turnos de expediente e selecione o militar fixo para lançamento automático na escala.
          </p>
        </div>
        <button
          onClick={abrirNovoModal}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Cadastrar Novo Posto</span>
        </button>
      </div>

      {/* Postos List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {postosDaUnidade.map((posto) => {
          const militarDesignado = militaresDaUnidade.find(
            (m) => m.id === posto.militarDesignadoId
          );

          return (
            <div
              key={posto.id}
              className="bg-slate-900 rounded-xl border border-slate-800 p-5 shadow-xl hover:border-slate-700 transition-all relative flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-md border ${posto.corBadge}`}>
                    {posto.sigla}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => abrirEditarModal(posto)}
                      className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
                      title="Editar posto"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Deseja excluir o posto "${posto.nome}"?`)) {
                          onDeletePosto(posto.id);
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/50 rounded-md transition-colors cursor-pointer"
                      title="Excluir posto"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <h3 className="font-bold text-slate-100 text-base">{posto.nome}</h3>

                <div className="mt-4 space-y-2 text-xs text-slate-300">
                  <div className="flex items-start gap-2">
                    <Clock className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                    <div>
                      {posto.usarDoisTurnos && posto.turno1 && posto.turno2 ? (
                        <div className="space-y-0.5">
                          <p className="font-semibold text-purple-300">Expediente em 2 Turnos:</p>
                          <p className="text-[11px] text-slate-300">
                            <strong>1º Turno:</strong> {posto.turno1.inicio} às {posto.turno1.fim}
                          </p>
                          <p className="text-[11px] text-slate-300">
                            <strong>2º Turno:</strong> {posto.turno2.inicio} às {posto.turno2.fim}
                          </p>
                        </div>
                      ) : (
                        <p>
                          <strong>Horário:</strong> Início às {posto.horaInicio}
                          {posto.horaFim ? ` / Término às ${posto.horaFim}` : ""}
                          <span className="block text-[11px] text-slate-400">
                            Duração: {posto.duracaoHoras}h
                          </span>
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      <strong>Tipo:</strong>{" "}
                      {posto.tipoHorario === "24h"
                        ? "Serviço Operacional 24h"
                        : posto.tipoHorario === "expediente"
                        ? "Expediente Comercial (Seg-Sex)"
                        : "Personalizado"}
                    </span>
                  </div>

                  {militarDesignado && (
                    <div className="bg-purple-950/60 border border-purple-800 text-purple-200 p-2 rounded-lg space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-[11px]">
                        <UserCheck className="w-3.5 h-3.5 text-purple-400" />
                        <span>Militar Fixo do Expediente:</span>
                      </div>
                      <p className="text-xs font-extrabold text-white pl-5">
                        {militarDesignado.graduacao} {militarDesignado.nomeGuerra}
                      </p>
                    </div>
                  )}

                  {posto.requerCnh && (
                    <div className="flex items-center gap-2 text-blue-300 bg-blue-950/50 px-2 py-1 rounded border border-blue-800">
                      <Car className="w-3.5 h-3.5 text-blue-400" />
                      <span className="font-semibold">Requer CNH Ativa de Motorista</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800 space-y-2">
                {posto.militarDesignadoId && onLancarExpedienteAutomatico && (
                  <button
                    onClick={() => {
                      onLancarExpedienteAutomatico(posto, posto.militarDesignadoId!);
                      setMensagemSucesso(
                        `Escala de Expediente atualizada com o militar ${militarDesignado?.graduacao} ${militarDesignado?.nomeGuerra}!`
                      );
                      setTimeout(() => setMensagemSucesso(null), 5000);
                    }}
                    className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold text-[11px] py-1.5 px-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                  >
                    <Zap className="w-3.5 h-3.5 text-yellow-300" />
                    <span>Lançar Automaticamente na Escala</span>
                  </button>
                )}

                <div className="text-[11px] text-slate-400 flex justify-between items-center">
                  <span>Ordem na escala: #{posto.ordemExibicao}</span>
                  <span className="text-emerald-400 font-semibold">Ativo</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Criar / Editar */}
      {modalAberto && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 rounded-xl shadow-2xl border border-slate-800 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-150 max-h-[90vh] flex flex-col">
            <div className="bg-slate-950 text-white px-5 py-4 flex items-center justify-between border-b border-slate-800 shrink-0">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-purple-400" />
                <span>
                  {postoEditando ? "Editar Posto de Serviço" : "Cadastrar Novo Posto de Serviço"}
                </span>
              </h3>
              <button
                onClick={() => setModalAberto(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSalvar} className="p-5 space-y-4 overflow-y-auto flex-1">
              {/* Nome e Sigla */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Nome do Posto
                  </label>
                  <input
                    type="text"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Ex: Expediente, Comandante da GU"
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Sigla (Escala)
                  </label>
                  <input
                    type="text"
                    value={sigla}
                    onChange={(e) => setSigla(e.target.value)}
                    placeholder="Ex: EXPEDIENTE, CMT DA GUPM"
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none uppercase"
                    required
                  />
                </div>
              </div>

              {/* Tipo de Turno */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Tipo de Horário
                </label>
                <select
                  value={tipoHorario}
                  onChange={(e) => {
                    const t = e.target.value as TipoPosto;
                    setTipoHorario(t);
                    if (t === "24h") {
                      setHoraInicio("08:00");
                      setHoraFim("08:00");
                      setDuracaoHoras(24);
                      setUsarDoisTurnos(false);
                      setCorBadge("bg-amber-100 text-amber-800 border-amber-300");
                    } else if (t === "expediente") {
                      setHoraInicio("07:30");
                      setHoraFim("17:30");
                      setDuracaoHoras(8);
                      setUsarDoisTurnos(true);
                      setCorBadge("bg-purple-100 text-purple-800 border-purple-300");
                    }
                  }}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none cursor-pointer"
                >
                  <option value="24h">Operacional 24h</option>
                  <option value="expediente">Expediente Comercial (Seg-Sex)</option>
                  <option value="personalizado">Personalizado</option>
                </select>
              </div>

              {/* Configuração de Horários Início/Término & 2 Turnos */}
              <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-purple-400" />
                    Definição de Horários e Turnos
                  </span>

                  {tipoHorario === "expediente" && (
                    <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-slate-300">
                      <input
                        type="checkbox"
                        checked={usarDoisTurnos}
                        onChange={(e) => setUsarDoisTurnos(e.target.checked)}
                        className="w-4 h-4 text-purple-600 bg-slate-900 border-slate-700 rounded focus:ring-purple-500"
                      />
                      <span>Dividir em 2 Turnos</span>
                    </label>
                  )}
                </div>

                {!usarDoisTurnos ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        Hora de Início
                      </label>
                      <input
                        type="time"
                        value={horaInicio}
                        onChange={(e) => setHoraInicio(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 text-slate-100 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        Hora de Término
                      </label>
                      <input
                        type="time"
                        value={horaFim}
                        onChange={(e) => setHoraFim(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 text-slate-100 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                        required
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 pt-1">
                    {/* 1º Turno */}
                    <div className="bg-slate-900/90 p-3 rounded-lg border border-slate-800 space-y-2">
                      <span className="text-[11px] font-bold text-amber-300 block">
                        1º Turno (Matutino)
                      </span>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] text-slate-400 mb-0.5">
                            Hora Início 1º Turno
                          </label>
                          <input
                            type="time"
                            value={turno1Inicio}
                            onChange={(e) => setTurno1Inicio(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-lg px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-400 mb-0.5">
                            Hora Término 1º Turno
                          </label>
                          <input
                            type="time"
                            value={turno1Fim}
                            onChange={(e) => setTurno1Fim(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-lg px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                            required
                          />
                        </div>
                      </div>
                    </div>

                    {/* 2º Turno */}
                    <div className="bg-slate-900/90 p-3 rounded-lg border border-slate-800 space-y-2">
                      <span className="text-[11px] font-bold text-blue-300 block">
                        2º Turno (Vespertino)
                      </span>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] text-slate-400 mb-0.5">
                            Hora Início 2º Turno
                          </label>
                          <input
                            type="time"
                            value={turno2Inicio}
                            onChange={(e) => setTurno2Inicio(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-lg px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-400 mb-0.5">
                            Hora Término 2º Turno
                          </label>
                          <input
                            type="time"
                            value={turno2Fim}
                            onChange={(e) => setTurno2Fim(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-lg px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            required
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {tipoHorario !== "24h" && (
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Carga Horária Total (Horas)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="24"
                      value={duracaoHoras}
                      onChange={(e) => setDuracaoHoras(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-800 text-slate-100 rounded-lg px-3 py-1.5 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                      required
                    />
                  </div>
                )}
              </div>

              {/* Seleção do Militar Fixo / Expediente */}
              <div className="bg-purple-950/40 border border-purple-800/80 p-4 rounded-xl space-y-3">
                <label className="block text-xs font-extrabold text-purple-200 flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-purple-400" />
                  Militar Fixo Designado para esta Função:
                </label>
                <select
                  value={militarDesignadoId}
                  onChange={(e) => setMilitarDesignadoId(e.target.value)}
                  className="w-full bg-slate-950 border border-purple-800 text-white font-bold rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none cursor-pointer"
                >
                  <option value="">-- Nenhum (Alocação Dinâmica por Sugestão) --</option>
                  {militaresDaUnidade.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.graduacao} {m.nomeGuerra} - {m.nomeCompleto} (RG {m.rgPmmt})
                    </option>
                  ))}
                </select>

                {militarDesignadoId && (
                  <div className="pt-2 border-t border-purple-900/60 flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="chkLancar"
                      checked={lancarAutomatico}
                      onChange={(e) => setLancarAutomatico(e.target.checked)}
                      className="w-4 h-4 text-purple-600 bg-slate-950 border-purple-800 rounded focus:ring-purple-500 cursor-pointer"
                    />
                    <label htmlFor="chkLancar" className="text-xs text-purple-200 font-semibold cursor-pointer">
                      Lançar automaticamente este militar nas escalas de expediente (Segunda a Sexta-feira)
                    </label>
                  </div>
                )}
              </div>

              {/* Exigência CNH */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="chkCnh"
                  checked={requerCnh}
                  onChange={(e) => setRequerCnh(e.target.checked)}
                  className="w-4 h-4 text-blue-600 bg-slate-950 border-slate-800 rounded focus:ring-blue-500 cursor-pointer"
                />
                <label htmlFor="chkCnh" className="text-xs text-slate-300 font-medium cursor-pointer">
                  Exigir CNH Ativa de Motorista para alocação neste posto
                </label>
              </div>

              {/* Cor Badge */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Estilo da Cor do Badge
                </label>
                <select
                  value={corBadge}
                  onChange={(e) => setCorBadge(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none cursor-pointer"
                >
                  <option value="bg-purple-100 text-purple-800 border-purple-300">Roxo (Expediente)</option>
                  <option value="bg-amber-100 text-amber-800 border-amber-300">Amarelo (CMT)</option>
                  <option value="bg-blue-100 text-blue-800 border-blue-300">Azul (Motorista)</option>
                  <option value="bg-emerald-100 text-emerald-800 border-emerald-300">Verde (Patrulheiro)</option>
                  <option value="bg-rose-100 text-rose-800 border-rose-300">Rosa/Vermelho (Especial)</option>
                </select>
              </div>

              {/* Footer Actions */}
              <div className="flex justify-end gap-2 pt-4 border-t border-slate-800 shrink-0">
                <button
                  type="button"
                  onClick={() => setModalAberto(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors shadow-md cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Salvar e Aplicar</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
