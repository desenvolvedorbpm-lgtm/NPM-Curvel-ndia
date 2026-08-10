import React, { useState } from "react";
import { UnidadeTenant, CabecalhoUnidade, HorarioExpediente } from "../types";
import { Settings, Image, Building, Check, Plus, Trash2, Clock } from "lucide-react";

interface UnitConfigModalProps {
  unidade: UnidadeTenant;
  onSalvarUnidade: (unidadeAtualizada: UnidadeTenant) => void;
}

export const UnitConfigModal: React.FC<UnitConfigModalProps> = ({
  unidade,
  onSalvarUnidade
}) => {
  const [nome, setNome] = useState(unidade.nome);
  const [sigla, setSigla] = useState(unidade.sigla);

  // Cabecalho
  const [governo, setGoverno] = useState(unidade.cabecalho.governo);
  const [secretaria, setSecretaria] = useState(unidade.cabecalho.secretaria);
  const [corporacao, setCorporacao] = useState(unidade.cabecalho.corporacao);
  const [comandoRegional, setComandoRegional] = useState(unidade.cabecalho.comandoRegional);
  const [batalhao, setBatalhao] = useState(unidade.cabecalho.batalhao);
  const [unidadeTexto, setUnidadeTexto] = useState(unidade.cabecalho.unidade);
  const [informativoNumero, setInformativoNumero] = useState(unidade.cabecalho.informativoNumero);
  const [comandanteBpm, setComandanteBpm] = useState(unidade.cabecalho.comandanteBpm);
  const [comandanteNpm, setComandanteNpm] = useState(unidade.cabecalho.comandanteNpm);
  const [logoUrl, setLogoUrl] = useState(unidade.cabecalho.logoUrl || "");

  // Determinacoes
  const [determinacoes, setDeterminacoes] = useState<string[]>(
    unidade.cabecalho.determinacoesPadrao || []
  );
  const [novaDeterminacao, setNovaDeterminacao] = useState("");

  // Expediente
  const [expInicio, setExpInicio] = useState(unidade.horarioExpediente.inicio || "07:00");
  const [expFim, setExpFim] = useState(unidade.horarioExpediente.fim || "13:00");

  const [salvoFeedback, setSalvoFeedback] = useState(false);

  const handleAddDeterminacao = () => {
    if (!novaDeterminacao.trim()) return;
    setDeterminacoes([...determinacoes, `${determinacoes.length + 1}. ${novaDeterminacao.trim()}`]);
    setNovaDeterminacao("");
  };

  const handleRemoveDeterminacao = (index: number) => {
    setDeterminacoes(determinacoes.filter((_, i) => i !== index));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSalvar = (e: React.FormEvent) => {
    e.preventDefault();

    const cabecalhoAtualizado: CabecalhoUnidade = {
      governo,
      secretaria,
      corporacao,
      comandoRegional,
      batalhao,
      unidade: unidadeTexto,
      informativoNumero,
      comandanteBpm,
      comandanteNpm,
      logoUrl,
      determinacoesPadrao: determinacoes
    };

    const horarioExpedienteAtualizado: HorarioExpediente = {
      inicio: expInicio,
      fim: expFim,
      diasSemana: [1, 2, 3, 4, 5]
    };

    const unidadeAtualizada: UnidadeTenant = {
      ...unidade,
      nome,
      sigla,
      cabecalho: cabecalhoAtualizado,
      horarioExpediente: horarioExpedienteAtualizado
    };

    onSalvarUnidade(unidadeAtualizada);
    setSalvoFeedback(true);
    setTimeout(() => setSalvoFeedback(false), 3000);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 shadow-xl flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Settings className="w-5 h-5 text-blue-400" />
            Configurações e Cabeçalho da Unidade (PDF Dinâmico)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Personalize as informações oficiais do cabeçalho de impressão, brasão/logo da unidade, oficiais comandantes e horário do expediente comercial.
          </p>
        </div>

        {salvoFeedback && (
          <div className="bg-emerald-950/80 text-emerald-300 text-xs font-bold px-3 py-1.5 rounded-lg border border-emerald-800 flex items-center gap-1.5 animate-bounce">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>Configurações Salvas!</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSalvar} className="space-y-6">
        {/* Unit Identity */}
        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-slate-100 border-b border-slate-800 pb-2 flex items-center gap-2">
            <Building className="w-4 h-4 text-blue-400" />
            Identificação do Tenant / Unidade PM
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Nome Completo da Unidade
              </label>
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Sigla Resumida
              </label>
              <input
                type="text"
                value={sigla}
                onChange={(e) => setSigla(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              />
            </div>
          </div>
        </div>

        {/* Official Header Fields (Cabeçalho de PDF) */}
        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-slate-100 border-b border-slate-800 pb-2 flex items-center gap-2">
            <img src="https://i.ibb.co/FqLxFKqG/logo-17bpm-removebg-preview.png" alt="Logo" className="w-4 h-4 object-contain" referrerPolicy="no-referrer" />
            Campos Oficiais do Cabeçalho (Relatório PDF)
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Governo de Estado
              </label>
              <input
                type="text"
                value={governo}
                onChange={(e) => setGoverno(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Secretaria / Corporação
              </label>
              <input
                type="text"
                value={secretaria}
                onChange={(e) => setSecretaria(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Comando Regional
              </label>
              <input
                type="text"
                value={comandoRegional}
                onChange={(e) => setComandoRegional(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Batalhão Responsável
              </label>
              <input
                type="text"
                value={batalhao}
                onChange={(e) => setBatalhao(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Nome da Unidade no Documento
              </label>
              <input
                type="text"
                value={unidadeTexto}
                onChange={(e) => setUnidadeTexto(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Número do Informativo / Ano
              </label>
              <input
                type="text"
                value={informativoNumero}
                onChange={(e) => setInformativoNumero(e.target.value)}
                placeholder="Ex: 83/2026 17º BPM/NPM DE CURVELANDIA"
                className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Comandante do Batalhão (BPM)
              </label>
              <input
                type="text"
                value={comandanteBpm}
                onChange={(e) => setComandanteBpm(e.target.value)}
                placeholder="Ex: Maj PM Costa Soares"
                className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Comandante do Núcleo PM (NPM) / Emissor
              </label>
              <input
                type="text"
                value={comandanteNpm}
                onChange={(e) => setComandanteNpm(e.target.value)}
                placeholder="Ex: Sub Ten PM Wanderley Campos Pereira"
                className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Logo / Brasão Upload */}
          <div className="pt-2">
            <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
              <Image className="w-4 h-4 text-blue-400" />
              <span> Upload / Imagem do Brasão de Mato Grosso ou Brasão da Unidade:</span>
            </label>
            <div className="flex items-center gap-4">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt="Brasão Unidade"
                  className="w-16 h-16 object-contain border border-slate-800 rounded p-1 bg-slate-950"
                />
              ) : (
                <div className="w-16 h-16 border border-dashed border-slate-800 rounded flex items-center justify-center text-slate-500 text-[10px]">
                  Sem Logo
                </div>
              )}
              <div className="space-y-1">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="text-xs text-slate-400 file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-blue-400 hover:file:bg-slate-700 cursor-pointer"
                />
                <p className="text-[10px] text-slate-500">Suporta arquivos PNG, JPG ou SVG.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Expediente Hours Parameterization */}
        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-slate-100 border-b border-slate-800 pb-2 flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-400" />
            Parametrização do Horário de Expediente
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Horário de Início do Expediente
              </label>
              <input
                type="time"
                value={expInicio}
                onChange={(e) => setExpInicio(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Horário de Término do Expediente
              </label>
              <input
                type="time"
                value={expFim}
                onChange={(e) => setExpFim(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Standard Determinações for PDF */}
        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-slate-100 border-b border-slate-800 pb-2">
            Determinações Padrão de Serviço (Página 2 do PDF)
          </h3>

          <div className="space-y-2">
            {determinacoes.map((det, index) => (
              <div
                key={index}
                className="flex items-center justify-between gap-2 bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-xs text-slate-200"
              >
                <span>{det}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveDeterminacao(index)}
                  className="text-slate-500 hover:text-rose-400 cursor-pointer p-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex gap-2 pt-2">
            <input
              type="text"
              value={novaDeterminacao}
              onChange={(e) => setNovaDeterminacao(e.target.value)}
              placeholder="Digite uma nova determinação (ex: Rondas escolares, PBs, links...)"
              className="flex-1 bg-slate-950 border border-slate-800 text-slate-100 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={handleAddDeterminacao}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs px-3 py-2 rounded-lg transition-colors flex items-center gap-1 cursor-pointer border border-slate-700"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Adicionar</span>
            </button>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-6 py-3 rounded-xl shadow-md transition-all cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Salvar Parâmetros da Unidade</span>
          </button>
        </div>
      </form>
    </div>
  );
};
