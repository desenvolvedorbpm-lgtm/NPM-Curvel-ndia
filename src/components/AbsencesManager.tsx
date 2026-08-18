import React, { useState } from "react";
import { Afastamento, Militar, TipoAfastamento } from "../types";
import { formatDateBr, formatRgPmmt } from "../utils/rulesEngine";
import { Plus, Trash2, Calendar, ShieldAlert, Check, X, Info, Flame, HeartHandshake } from "lucide-react";

interface AbsencesManagerProps {
  unidadeId: string;
  afastamentos: Afastamento[];
  militares: Militar[];
  onAddAfastamento: (afastamento: Afastamento) => void;
  onDeleteAfastamento: (id: string) => void;
}

export const AbsencesManager: React.FC<AbsencesManagerProps> = ({
  unidadeId,
  afastamentos,
  militares,
  onAddAfastamento,
  onDeleteAfastamento
}) => {
  const militaresUnidade = militares.filter((m) => m.unidadeId === unidadeId);
  const afastamentosUnidade = afastamentos.filter((a) => a.unidadeId === unidadeId);

  const [modalAberto, setModalAberto] = useState(false);

  // Form State
  const [militarId, setMilitarId] = useState(militaresUnidade[0]?.id || "");
  const [tipo, setTipo] = useState<TipoAfastamento>("FERIAS");
  const [descricao, setDescricao] = useState("");
  const [dataInicio, setDataInicio] = useState("2026-08-01");
  const [dataFim, setDataFim] = useState("2026-08-15");
  const [horaFim, setHoraFim] = useState("08:00");
  const [isFatiguing, setIsFatiguing] = useState(false);

  const handleTipoChange = (novoTipo: TipoAfastamento) => {
    setTipo(novoTipo);
    // Automatic fatigue assignment per rules:
    // Group 1 (Férias, Licença Prêmio, LTS) -> isFatiguing = false (return D+1)
    // Group 2 (Patrulha Rural, Cursos, Outro, etc.) -> isFatiguing = true (+24h mandatory rest before scheduling)
    if (novoTipo === "FERIAS" || novoTipo === "LICENCA_PREMIO" || novoTipo === "LTS") {
      setIsFatiguing(false);
    } else {
      setIsFatiguing(true);
    }
  };

  const handleSalvar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!militarId || !dataInicio || !dataFim) return;

    const novo: Afastamento = {
      id: `afast-${Date.now()}`,
      militarId,
      unidadeId,
      tipo,
      descricao: descricao || tipo.replace("_", " "),
      dataInicio,
      dataFim,
      horaFim: isFatiguing ? horaFim : "08:00",
      is_fatiguing: isFatiguing
    };

    onAddAfastamento(novo);
    setModalAberto(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-900 p-5 rounded-xl border border-slate-800 shadow-xl">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            Cadastros Administrativos (Férias, Licenças e Operações)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Registro de indisponibilidades. Durante o afastamento, o militar é excluído da projeção automática. Ao retornar, aplicam-se as regras de Reentrada (Retorno Administrativo D+1 vs Retorno Operacional +24h descanso).
          </p>
        </div>
        <button
          onClick={() => {
            setMilitarId(militaresUnidade[0]?.id || "");
            setTipo("FERIAS");
            setIsFatiguing(false);
            setDescricao("");
            setModalAberto(true);
          }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Cadastrar Afastamento</span>
        </button>
      </div>

      {/* Rules Banner Info Box */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex gap-3 text-xs text-blue-200 shadow-xl">
          <HeartHandshake className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-slate-100 mb-1">Regra 1: Retorno Administrativo (is_fatiguing = false)</h4>
            <p className="text-slate-300 leading-relaxed">
              Aplica-se a <strong>Férias, Licença Prêmio e LTS/Afastamento Médico</strong>. O militar fica disponível no dia seguinte ao término do período (Disponibilidade D+1 às 00h00) sem exigência de descanso adicional.
            </p>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex gap-3 text-xs text-amber-200 shadow-xl">
          <Flame className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-slate-100 mb-1">Regra 2: Retorno Operacional/Instrução (is_fatiguing = true)</h4>
            <p className="text-slate-300 leading-relaxed">
              Aplica-se a <strong>Cursos de Formação e Patrulha Rural</strong>. Estas atividades contam como esforço/serviço. Ao término, o sistema injeta compulsoriamente <strong>24 horas de descanso (Hard Constraint)</strong> antes de permitir a escalação.
            </p>
          </div>
        </div>
      </div>

      {/* Afastamentos List */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950 text-slate-200 text-xs font-bold uppercase tracking-wider border-b border-slate-800">
                <th className="py-3.5 px-4">Policial Militar</th>
                <th className="py-3.5 px-4">Tipo de Afastamento</th>
                <th className="py-3.5 px-4">Descrição</th>
                <th className="py-3.5 px-4">Período Vigente</th>
                <th className="py-3.5 px-4 text-center">Regra de Reentrada</th>
                <th className="py-3.5 px-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-xs text-slate-200">
              {afastamentosUnidade.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    Nenhum afastamento cadastrado para esta unidade.
                  </td>
                </tr>
              ) : (
                afastamentosUnidade.map((af) => {
                  const m = militares.find((item) => item.id === af.militarId);

                  return (
                    <tr key={af.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-100 notranslate" translate="no">
                        {m ? `${m.graduacao} ${m.nomeGuerra} (RG ${formatRgPmmt(m.rgPmmt)})` : "Militar Não Encontrado"}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-200 bg-slate-950 px-2 py-1 rounded border border-slate-800">
                          {af.tipo.replace("_", " ")}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-400">{af.descricao}</td>
                      <td className="py-3 px-4 font-medium text-slate-300">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-500" />
                          <span>
                            {formatDateBr(af.dataInicio)} até {formatDateBr(af.dataFim)}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {af.is_fatiguing ? (
                          <span className="inline-flex items-center gap-1 bg-amber-950/60 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded border border-amber-800">
                            <Flame className="w-3 h-3 text-amber-400" />
                            Gera Fadiga (+24h Descanso Obrigatório)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-blue-950/60 text-blue-300 text-[10px] font-bold px-2 py-0.5 rounded border border-blue-800">
                            <Check className="w-3 h-3 text-blue-400" />
                            Retorno Direto D+1
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => {
                            if (confirm("Deseja remover este registro de afastamento?")) {
                              onDeleteAfastamento(af.id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/50 rounded cursor-pointer"
                          title="Remover afastamento"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Criar Afastamento */}
      {modalAberto && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 rounded-xl shadow-2xl border border-slate-800 w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="bg-slate-950 text-white px-5 py-4 flex items-center justify-between border-b border-slate-800">
              <h3 className="font-bold text-sm">Cadastrar Novo Afastamento / Operação</h3>
              <button
                onClick={() => setModalAberto(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSalvar} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Policial Militar
                </label>
                <select
                  value={militarId}
                  onChange={(e) => setMilitarId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
                  required
                >
                  {militaresUnidade.map((m) => (
                    <option key={m.id} value={m.id} className="notranslate">
                      {m.graduacao} {m.nomeGuerra} (RG {formatRgPmmt(m.rgPmmt)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Tipo de Indisponibilidade
                </label>
                <select
                  value={tipo}
                  onChange={(e) => handleTipoChange(e.target.value as TipoAfastamento)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
                >
                  <option value="FERIAS">Férias Regulamentares</option>
                  <option value="LICENCA_PREMIO">Licença Prêmio</option>
                  <option value="LTS">LTS / Licença Tratamento Saúde</option>
                  <option value="PATRULHA_RURAL">Patrulha Rural (Operacional)</option>
                  <option value="CURSO">Curso de Formação / Especialização</option>
                  <option value="REFORCO_EXTRAORDINARIO">Reforço Extraordinário</option>
                  <option value="OUTRO">Outro Afastamento</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Descrição do Motivo
                </label>
                <input
                  type="text"
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Ex: Férias do ano de 2026, CI nº 123/2026"
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Data de Início
                  </label>
                  <input
                    type="date"
                    value={dataInicio}
                    onChange={(e) => setDataInicio(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Data de Término
                  </label>
                  <input
                    type="date"
                    value={dataFim}
                    onChange={(e) => setDataFim(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              {isFatiguing && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Horário de Término do Curso / Patrulha (para contagem das 24h de descanso)
                  </label>
                  <input
                    type="time"
                    value={horaFim}
                    onChange={(e) => setHoraFim(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    required
                  />
                </div>
              )}

              {/* Toggle Manual is_fatiguing override if needed */}
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="chkFatigue"
                    checked={isFatiguing}
                    onChange={(e) => setIsFatiguing(e.target.checked)}
                    className="w-4 h-4 text-blue-600 bg-slate-900 border-slate-800 rounded focus:ring-blue-500 cursor-pointer"
                  />
                  <label htmlFor="chkFatigue" className="text-xs font-bold text-slate-200 cursor-pointer">
                    Flag <code className="bg-slate-900 px-1 py-0.5 rounded text-[11px] text-blue-400">is_fatiguing = true</code>
                  </label>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Se marcado, o sistema exige descanso obrigatório de 24 horas contadas a partir do término desta atividade.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalAberto(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Cadastrar Registro</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
