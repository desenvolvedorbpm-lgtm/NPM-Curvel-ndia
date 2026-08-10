import React, { useState } from "react";
import { EscalaItem, Militar, Afastamento, PostoServico } from "../types";
import { validarRegrasEscala, formatDateBr } from "../utils/rulesEngine";
import { Shield, ArrowLeftRight, AlertOctagon, Check, X, FileCheck } from "lucide-react";

interface PermutaModalProps {
  escalaItem: EscalaItem;
  militares: Militar[];
  postos: PostoServico[];
  todasEscalas: EscalaItem[];
  afastamentos: Afastamento[];
  onConfirmarPermuta: (
    escalaItemId: string,
    militarSubstitutoId: string,
    sigadoc: string,
    observacao: string
  ) => void;
  onFechar: () => void;
}

export const PermutaModal: React.FC<PermutaModalProps> = ({
  escalaItem,
  militares,
  postos,
  todasEscalas,
  afastamentos,
  onConfirmarPermuta,
  onFechar
}) => {
  const militarTitular = militares.find((m) => m.id === escalaItem.militarId);
  const posto = postos.find((p) => p.id === escalaItem.postoId);

  const [militarSubstitutoId, setMilitarSubstitutoId] = useState("");
  const [sigadoc, setSigadoc] = useState("39382239-7938");
  const [observacao, setObservacao] = useState(
    `CI autorizada por despacho no Sigadoc referente ao serviço do dia ${formatDateBr(escalaItem.data)}.`
  );

  const militarSubstituto = militares.find((m) => m.id === militarSubstitutoId);

  // Audit calculations
  let errosAuditoria: string[] = [];

  if (militarSubstituto && posto) {
    // Audit for Substituto taking this shift
    const alertasSubstituto = validarRegrasEscala(
      militarSubstituto,
      posto,
      escalaItem.data,
      escalaItem.startTimeMs,
      escalaItem.endTimeMs,
      todasEscalas,
      afastamentos,
      escalaItem.id,
      postos
    );

    const bloqueiosSub = alertasSubstituto.filter(
      (a) => a.tipo === "BLOQUEIO_24H" || a.tipo === "INDISPONIVEL_AFASTADO"
    );

    for (const b of bloqueiosSub) {
      errosAuditoria.push(`SUBSTITUTO (${militarSubstituto.nomeGuerra}): ${b.mensagem}`);
    }
  }

  const handleSalvar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!militarSubstitutoId || !sigadoc.trim()) return;
    if (errosAuditoria.length > 0) return;

    onConfirmarPermuta(
      escalaItem.id,
      militarSubstitutoId,
      sigadoc.trim(),
      observacao.trim()
    );
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-slate-900 rounded-xl shadow-2xl border border-slate-800 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-150">
        <div className="bg-slate-950 text-white px-5 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5 text-blue-400" />
            <h3 className="font-bold text-sm">Registrar Troca / Permuta de Serviço</h3>
          </div>
          <button onClick={onFechar} className="text-slate-400 hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSalvar} className="p-5 space-y-4 text-xs text-slate-200">
          {/* Header Info */}
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex justify-between items-center">
            <div>
              <span className="font-semibold text-slate-400">Data e Posto:</span>
              <p className="font-bold text-slate-100 text-sm">
                {formatDateBr(escalaItem.data)} • {posto?.sigla || "Posto"}
              </p>
            </div>
            <div className="text-right">
              <span className="font-semibold text-slate-400">Titular Atual:</span>
              <p className="font-bold text-blue-400 text-sm">
                {militarTitular ? `${militarTitular.graduacao} ${militarTitular.nomeGuerra}` : "N/A"}
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Selecione o Policial Militar Substituto (Permutante):
            </label>
            <select
              value={militarSubstitutoId}
              onChange={(e) => setMilitarSubstitutoId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
              required
            >
              <option value="">-- Selecione o militar disponível --</option>
              {militares
                .filter((m) => m.id !== escalaItem.militarId)
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.graduacao} {m.nomeGuerra} (RG {m.rgPmmt})
                  </option>
                ))}
            </select>
          </div>

          <div className="bg-blue-950/40 border border-blue-800/60 p-2.5 rounded-lg flex items-start gap-2 text-[11px] text-blue-200">
            <Shield className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <span>
              <strong>Regra de Hierarquia da Guarnição:</strong> Se a permuta incluir um militar mais moderno no posto de Comandante, o sistema reajustará automaticamente a guarnição, remanejando o mais moderno para outro posto (Motorista/Patrulheiro) e atribuindo o comando da guarnição ao militar mais antigo presente.
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
              <FileCheck className="w-4 h-4 text-blue-400" />
              <span>Número do Documento Autorizador (SIGADOC) - Obrigatório:</span>
            </label>
            <input
              type="text"
              value={sigadoc}
              onChange={(e) => setSigadoc(e.target.value)}
              placeholder="Ex: 39382239-7938 ou CI nº 22590/2026/NPMCURVL/PM"
              className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-lg px-3 py-2 text-xs font-mono font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
              required
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Conceito: A permuta é pontual e NÃO altera a projeção futura base dos militares envolvidos.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Observação para a Escala Oficial (Constara no rodape do PDF):
            </label>
            <textarea
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              rows={2}
              className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* Audit Result Display */}
          {errosAuditoria.length > 0 && (
            <div className="bg-rose-950/80 border border-rose-800 p-3 rounded-lg text-rose-200 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-rose-300">
                <AlertOctagon className="w-4 h-4 text-rose-400" />
                <span>Auditoria de Descanso (Hard Constraint Violada)</span>
              </div>
              <ul className="list-disc pl-5 space-y-0.5 text-[11px]">
                {errosAuditoria.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {militarSubstituto && errosAuditoria.length === 0 && (
            <div className="bg-emerald-950/80 border border-emerald-800 p-2.5 rounded-lg text-emerald-300 flex items-center gap-2 font-semibold">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>Auditoria aprovada: Ambos os militares cumprem o descanso mínimo absoluto de 24h!</span>
            </div>
          )}

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
              disabled={errosAuditoria.length > 0 || !militarSubstitutoId}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white rounded-lg transition-colors cursor-pointer ${
                errosAuditoria.length > 0 || !militarSubstitutoId
                  ? "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700"
                  : "bg-blue-600 hover:bg-blue-500"
              }`}
            >
              <Check className="w-3.5 h-3.5" />
              <span>Confirmar Permuta</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
