import React, { useState } from "react";
import { Militar, GraduacaoPM } from "../types";
import { formatRgPmmt } from "../utils/rulesEngine";
import { Plus, Edit2, Trash2, Award, Car, Check, X, ArrowUp, ArrowDown } from "lucide-react";

interface MilitaryManagerProps {
  unidadeId: string;
  unidadeLogoUrl?: string;
  militares: Militar[];
  onAddMilitar: (militar: Militar) => void;
  onUpdateMilitar: (militar: Militar) => void;
  onDeleteMilitar: (militarId: string) => void;
  onUpdateMilitaresList?: (novosMilitares: Militar[]) => void;
}

const GRADUACOES: GraduacaoPM[] = [
  "SUB TEN PM",
  "1º SGT PM",
  "2º SGT PM",
  "3º SGT PM",
  "CB PM",
  "SD PM",
  "OFFICIAL"
];

export const MilitaryManager: React.FC<MilitaryManagerProps> = ({
  unidadeId,
  unidadeLogoUrl,
  militares,
  onAddMilitar,
  onUpdateMilitar,
  onDeleteMilitar,
  onUpdateMilitaresList
}) => {
  const militaresUnidade = militares
    .filter((m) => m.unidadeId === unidadeId)
    .sort((a, b) => a.antiguidadeOrdem - b.antiguidadeOrdem);

  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState<Militar | null>(null);

  // Form
  const [graduacao, setGraduacao] = useState<GraduacaoPM>("1º SGT PM");
  const [nomeGuerra, setNomeGuerra] = useState("");
  const [nomeCompleto, setNomeCompleto] = useState("");
  const [rgPmmt, setRgPmmt] = useState("");
  const [antiguidadeOrdem, setAntiguidadeOrdem] = useState(1);
  const [cnhAtiva, setCnhAtiva] = useState(true);

  // Helper to normalize and reindex seniority 1..N
  const reindexarSenioridade = (lista: Militar[]): Militar[] => {
    const ordenados = [...lista].sort((a, b) => a.antiguidadeOrdem - b.antiguidadeOrdem);
    return ordenados.map((m, idx) => ({
      ...m,
      antiguidadeOrdem: idx + 1
    }));
  };

  const handleMoverAntiguidade = (militarId: string, direcao: "subir" | "descer") => {
    const idx = militaresUnidade.findIndex((m) => m.id === militarId);
    if (idx === -1) return;
    if (direcao === "subir" && idx === 0) return;
    if (direcao === "descer" && idx === militaresUnidade.length - 1) return;

    const targetIdx = direcao === "subir" ? idx - 1 : idx + 1;
    const copia = [...militaresUnidade];
    const [removido] = copia.splice(idx, 1);
    copia.splice(targetIdx, 0, removido);

    const normalizados = reindexarSenioridade(copia);

    // Merge with other units if any
    const outrosMilitares = militares.filter((m) => m.unidadeId !== unidadeId);
    const listaCompleta = [...outrosMilitares, ...normalizados];

    if (onUpdateMilitaresList) {
      onUpdateMilitaresList(listaCompleta);
    } else {
      normalizados.forEach((m) => onUpdateMilitar(m));
    }
  };

  const abrirNovoModal = () => {
    setEditando(null);
    setGraduacao("SD PM");
    setNomeGuerra("");
    setNomeCompleto("");
    setRgPmmt("");
    setAntiguidadeOrdem(militaresUnidade.length + 1);
    setCnhAtiva(true);
    setModalAberto(true);
  };

  const abrirEditarModal = (m: Militar) => {
    setEditando(m);
    setGraduacao(m.graduacao);
    setNomeGuerra(m.nomeGuerra);
    setNomeCompleto(m.nomeCompleto);
    setRgPmmt(m.rgPmmt);
    setAntiguidadeOrdem(m.antiguidadeOrdem);
    setCnhAtiva(m.cnhAtiva);
    setModalAberto(true);
  };

  const handleSalvar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomeGuerra.trim() || !rgPmmt.trim()) return;

    if (editando) {
      const militarAtualizado: Militar = {
        ...editando,
        graduacao,
        nomeGuerra: nomeGuerra.toUpperCase(),
        nomeCompleto,
        rgPmmt,
        antiguidadeOrdem: Number(antiguidadeOrdem),
        cnhAtiva
      };

      // Reorganize list inserting at new position
      const outros = militaresUnidade.filter((m) => m.id !== editando.id);
      const posDesejada = Math.max(1, Math.min(Number(antiguidadeOrdem), outros.length + 1));
      outros.splice(posDesejada - 1, 0, militarAtualizado);

      const normalizados = reindexarSenioridade(outros);
      const outrosMilitares = militares.filter((m) => m.unidadeId !== unidadeId);
      const listaCompleta = [...outrosMilitares, ...normalizados];

      if (onUpdateMilitaresList) {
        onUpdateMilitaresList(listaCompleta);
      } else {
        onUpdateMilitar(militarAtualizado);
      }
    } else {
      const novo: Militar = {
        id: `mil-${Date.now()}`,
        unidadeId,
        graduacao,
        nomeGuerra: nomeGuerra.toUpperCase(),
        nomeCompleto,
        rgPmmt,
        antiguidadeOrdem: Number(antiguidadeOrdem),
        cnhAtiva,
        aptidoesPosto: ["posto-cmt-gu", "posto-motorista", "posto-patrulheiro", "posto-expediente"],
        ativo: true
      };

      const copia = [...militaresUnidade];
      const posDesejada = Math.max(1, Math.min(Number(antiguidadeOrdem), copia.length + 1));
      copia.splice(posDesejada - 1, 0, novo);

      const normalizados = reindexarSenioridade(copia);
      const outrosMilitares = militares.filter((m) => m.unidadeId !== unidadeId);
      const listaCompleta = [...outrosMilitares, ...normalizados];

      if (onUpdateMilitaresList) {
        onUpdateMilitaresList(listaCompleta);
      } else {
        onAddMilitar(novo);
      }
    }
    setModalAberto(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-900 p-5 rounded-xl border border-slate-800 shadow-xl">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            Gestão do Efetivo Militar (Quadro de Antiguidade)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Mantenha o cadastro de policiais militares ordenado por senioridade. O algoritmo aloca automaticamente os <strong>Mais Antigos</strong> para Comandante da GU e os <strong>Mais Modernos</strong> para Motorista.
          </p>
        </div>
        <button
          onClick={abrirNovoModal}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Cadastrar Policial Militar</span>
        </button>
      </div>

      {/* Table Roster */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950 text-slate-200 text-xs font-bold uppercase tracking-wider border-b border-slate-800">
                <th className="py-3.5 px-4 text-center">Antiguidade</th>
                <th className="py-3.5 px-4">Graduação / Nome de Guerra</th>
                <th className="py-3.5 px-4">Nome Completo</th>
                <th className="py-3.5 px-4">RG PMMT</th>
                <th className="py-3.5 px-4 text-center">CNH Motorista</th>
                <th className="py-3.5 px-4 text-center">Regra de Sugestão</th>
                <th className="py-3.5 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-xs text-slate-200">
              {militaresUnidade.map((m, index) => {
                const isMaisAntigo = index === 0;
                const isMaisModerno = index === militaresUnidade.length - 1;

                return (
                  <tr key={m.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 text-center font-bold text-slate-100">
                      <div className="inline-flex items-center gap-1">
                        <div className="flex flex-col gap-0.5">
                          <button
                            type="button"
                            disabled={isMaisAntigo}
                            onClick={() => handleMoverAntiguidade(m.id, "subir")}
                            className={`p-1 rounded transition-colors ${
                              isMaisAntigo
                                ? "text-slate-700 cursor-not-allowed"
                                : "text-slate-400 hover:text-amber-300 hover:bg-slate-800 cursor-pointer"
                            }`}
                            title="Subir Antiguidade (Tornar Mais Antigo)"
                          >
                            <ArrowUp className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            disabled={isMaisModerno}
                            onClick={() => handleMoverAntiguidade(m.id, "descer")}
                            className={`p-1 rounded transition-colors ${
                              isMaisModerno
                                ? "text-slate-700 cursor-not-allowed"
                                : "text-slate-400 hover:text-blue-300 hover:bg-slate-800 cursor-pointer"
                            }`}
                            title="Descer Antiguidade (Tornar Mais Moderno)"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </button>
                        </div>
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-950 border border-slate-800 text-slate-200 font-mono font-bold">
                          #{m.antiguidadeOrdem}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 notranslate" translate="no">
                      <div className="flex items-center gap-2 notranslate" translate="no">
                        <img
                          src={unidadeLogoUrl || "https://i.ibb.co/FqLxFKqG/logo-17bpm-removebg-preview.png"}
                          alt="Logo"
                          className="w-4 h-4 object-contain"
                          referrerPolicy="no-referrer"
                        />
                        <div className="notranslate" translate="no">
                          <span className="font-bold text-slate-200 notranslate" translate="no">{m.graduacao}</span>{" "}
                          <span className="font-extrabold text-blue-400 notranslate" translate="no">{m.nomeGuerra}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-400 notranslate" translate="no">{m.nomeCompleto || "---"}</td>
                    <td className="py-3 px-4 font-mono font-semibold text-slate-300 notranslate" translate="no">{formatRgPmmt(m.rgPmmt)}</td>
                    <td className="py-3 px-4 text-center">
                      {m.cnhAtiva ? (
                        <span className="inline-flex items-center gap-1 bg-emerald-950/60 text-emerald-300 text-[11px] font-semibold px-2 py-0.5 rounded border border-emerald-800">
                          <Car className="w-3 h-3 text-emerald-400" /> Habilitado
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-slate-950 text-slate-500 text-[11px] px-2 py-0.5 rounded border border-slate-800">
                          Sem CNH
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {isMaisAntigo && (
                        <span className="inline-flex items-center gap-1 bg-amber-950/60 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded border border-amber-800">
                          <ArrowUp className="w-3 h-3 text-amber-400" /> Mais Antigo (Sugerido CMT)
                        </span>
                      )}
                      {isMaisModerno && (
                        <span className="inline-flex items-center gap-1 bg-blue-950/60 text-blue-300 text-[10px] font-bold px-2 py-0.5 rounded border border-blue-800">
                          <ArrowDown className="w-3 h-3 text-blue-400" /> Mais Moderno (Sugerido MOT)
                        </span>
                      )}
                      {!isMaisAntigo && !isMaisModerno && (
                        <span className="text-slate-500 text-[11px]">Substituto / Patrulheiro</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => abrirEditarModal(m)}
                          className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Deseja remover o militar ${m.graduacao} ${m.nomeGuerra}?`)) {
                              onDeleteMilitar(m.id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/50 rounded cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Criar/Editar */}
      {modalAberto && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 rounded-xl shadow-2xl border border-slate-800 w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="bg-slate-950 text-white px-5 py-4 flex items-center justify-between border-b border-slate-800">
              <h3 className="font-bold text-sm">
                {editando ? "Editar Cadastro de Militar" : "Cadastrar Novo Policial Militar"}
              </h3>
              <button
                onClick={() => setModalAberto(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSalvar} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Graduação
                  </label>
                  <select
                    value={graduacao}
                    onChange={(e) => setGraduacao(e.target.value as GraduacaoPM)}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
                  >
                    {GRADUACOES.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Ordem de Antiguidade
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={antiguidadeOrdem}
                    onChange={(e) => setAntiguidadeOrdem(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    required
                  />
                  <p className="text-[10px] text-slate-500 mt-0.5">1 = Mais Antigo da Unidade</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nome de Guerra (Sera exibido na escala)
                </label>
                <input
                  type="text"
                  value={nomeGuerra}
                  onChange={(e) => setNomeGuerra(e.target.value)}
                  placeholder="Ex: LINDOMAR, EVERALDO, PABLO"
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none uppercase"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nome Completo
                </label>
                <input
                  type="text"
                  value={nomeCompleto}
                  onChange={(e) => setNomeCompleto(e.target.value)}
                  placeholder="Ex: LINDOMAR FERREIRA SOUZA"
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  RG PMMT
                </label>
                <input
                  type="text"
                  value={rgPmmt}
                  onChange={(e) => setRgPmmt(e.target.value)}
                  placeholder="Ex: 882.327"
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="chkCnhMilitar"
                  checked={cnhAtiva}
                  onChange={(e) => setCnhAtiva(e.target.checked)}
                  className="w-4 h-4 text-blue-600 bg-slate-950 border-slate-800 rounded focus:ring-blue-500 cursor-pointer"
                />
                <label htmlFor="chkCnhMilitar" className="text-xs text-slate-300 font-medium cursor-pointer">
                  Possui CNH Ativa e está Apto para a função de Motorista
                </label>
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
                  <span>Salvar Registro</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
