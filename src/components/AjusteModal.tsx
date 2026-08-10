import React, { useState } from "react";
import { EscalaItem, Militar, PostoServico } from "../types";
import { formatDateBr } from "../utils/rulesEngine";
import { RefreshCw, Check, X, AlertTriangle } from "lucide-react";

interface AjusteModalProps {
  escalaItem: EscalaItem;
  militares: Militar[];
  postos: PostoServico[];
  onConfirmarAjuste: (escalaItemId: string, novoMilitarId: string, recalculateFuture: boolean) => void;
  onFechar: () => void;
}

export const AjusteModal: React.FC<AjusteModalProps> = ({
  escalaItem,
  militares,
  postos,
  onConfirmarAjuste,
  onFechar
}) => {
  const militarAtual = militares.find((m) => m.id === escalaItem.militarId);
  const posto = postos.find((p) => p.id === escalaItem.postoId);

  const [novoMilitarId, setNovoMilitarId] = useState(escalaItem.militarId);
  const [recalculado, setRecalculado] = useState(true);

  const handleSalvar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoMilitarId) return;

    onConfirmarAjuste(escalaItem.id, novoMilitarId, recalculado);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-slate-900 rounded-xl shadow-2xl border border-slate-800 w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-150">
        <div className="bg-slate-950 text-white px-5 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-sm">Ajuste de Escala (Remanejamento Oficial)</h3>
          </div>
          <button onClick={onFechar} className="text-slate-400 hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSalvar} className="p-5 space-y-4 text-xs text-slate-200">
          <div className="bg-slate-950 border border-amber-800/80 p-3 rounded-lg text-amber-200 space-y-1">
            <p className="font-bold flex items-center gap-1.5 text-amber-400">
              <AlertTriangle className="w-4 h-4" />
              <span>Conceito do Ajuste de Escala</span>
            </p>
            <p className="text-[11px] leading-relaxed text-slate-300">
              Diferente da Permuta, o Ajuste de Escala e feito pela administracao da unidade por necessidade do servico.
              Ao alterar, o sistema <strong>recalcula automaticamente a projecao futura</strong> do militar afetado aplicando as 72h de folga a partir desta nova data.
            </p>
          </div>

          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
            <p className="text-slate-400">Data e Posto:</p>
            <p className="font-bold text-slate-100 text-sm">
              {formatDateBr(escalaItem.data)} • {posto?.sigla}
            </p>
            <p className="text-slate-400 mt-1">Militar Atual:</p>
            <p className="font-semibold text-slate-200">
              {militarAtual ? `${militarAtual.graduacao} ${militarAtual.nomeGuerra}` : "Reforço / Vazio"}
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Selecione o Novo Policial Militar para o Posto:
            </label>
            <select
              value={novoMilitarId}
              onChange={(e) => setNovoMilitarId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
              required
            >
              <option value="REFORCO_EXTRAORDINARIO">REFORÇO EXTRAORDINÁRIO</option>
              {militares.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.graduacao} {m.nomeGuerra} (RG {m.rgPmmt})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="chkRecalc"
              checked={recalculado}
              onChange={(e) => setRecalculado(e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-slate-950 border-slate-800 rounded focus:ring-blue-500 cursor-pointer"
            />
            <label htmlFor="chkRecalc" className="text-xs font-bold text-slate-300 cursor-pointer">
              Recalcular projeções futuras a partir do novo descanso (72h)
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onFechar}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-500 text-slate-950 rounded-lg transition-colors cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Confirmar Ajuste</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
