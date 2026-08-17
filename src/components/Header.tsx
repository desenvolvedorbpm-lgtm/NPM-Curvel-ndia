import React from "react";
import { UnidadeTenant, UsuarioAuth, PerfilAcesso, isComandante, isAdmin, temPermissao } from "../types";
import {
  Calendar,
  Grid,
  Users,
  Briefcase,
  UserX,
  Settings,
  FileText,
  Building2,
  AlertTriangle,
  LogOut,
  ShieldCheck,
  Eye,
  Shield,
  Cloud,
  LifeBuoy
} from "lucide-react";

interface HeaderProps {
  unidades: UnidadeTenant[];
  unidadeAtual: UnidadeTenant;
  onSelectUnidade: (unidade: UnidadeTenant) => void;
  tabAtiva: "escala" | "mensal" | "conflitos" | "postos" | "militares" | "afastamentos" | "configuracoes" | "suporte";
  onSelectTab: (tab: "escala" | "mensal" | "conflitos" | "postos" | "militares" | "afastamentos" | "configuracoes" | "suporte") => void;
  onAbrirPdf: () => void;
  qtdAlertasAtivos: number;
  usuarioLogado?: UsuarioAuth | null;
  perfis?: PerfilAcesso[];
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  unidades,
  unidadeAtual,
  onSelectUnidade,
  tabAtiva,
  onSelectTab,
  onAbrirPdf,
  qtdAlertasAtivos,
  usuarioLogado,
  perfis = [],
  onLogout
}) => {
  const perfilUsuario = perfis.find((p) => p.id === usuarioLogado?.perfilId);
  const labelPerfil =
    perfilUsuario?.nome.toUpperCase() ||
    (isAdmin(usuarioLogado)
      ? "ADMINISTRADOR DO SISTEMA"
      : isComandante(usuarioLogado)
      ? "COMANDANTE (ACESSO TOTAL)"
      : "EFETIVO (CONSULTA)");

  const podeVerConflitos =
    isComandante(usuarioLogado) || temPermissao(usuarioLogado, perfis, "conflitosVisualizar");
  const podeVerPostos =
    isComandante(usuarioLogado) || temPermissao(usuarioLogado, perfis, "postosVisualizar");
  const podeVerMilitares =
    isComandante(usuarioLogado) || temPermissao(usuarioLogado, perfis, "efetivoVisualizar");
  const podeVerAfastamentos =
    isComandante(usuarioLogado) || temPermissao(usuarioLogado, perfis, "afastamentosVisualizar");
  const podeVerConfig =
    isComandante(usuarioLogado) || temPermissao(usuarioLogado, perfis, "configuracoesEditar");
  const podeVerSuporte =
    isComandante(usuarioLogado) || temPermissao(usuarioLogado, perfis, "suporteAcesso");

  return (
    <header className="bg-slate-900/90 text-white border-b border-slate-800 sticky top-0 z-30 shadow-xl backdrop-blur-md">
      {/* Top Banner with Tenant Switcher & Quick Stats */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-white flex items-center justify-center font-bold text-lg shadow-md border border-slate-200/90 overflow-hidden p-1">
            <img src="https://i.ibb.co/FqLxFKqG/logo-17bpm-removebg-preview.png" alt="Logo 17º BPM" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold tracking-wider text-blue-400 uppercase">
                PMMT • Sistema de Escalas Diárias
              </span>
              <span className="bg-blue-600/20 text-blue-300 text-[10px] font-bold px-2 py-0.5 rounded border border-blue-500/30">
                Multi-Tenant
              </span>
            </div>
            <h1 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              {unidadeAtual.nome}
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Cloud DB Badge */}
          <div className="hidden lg:flex items-center gap-1.5 bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 rounded-xl px-2.5 py-1 text-[11px] font-semibold shadow-xs" title="Conectado ao Firebase Firestore com sincronização em tempo real">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <Cloud className="w-3.5 h-3.5 text-emerald-400" />
            <span>Firestore Nuvem</span>
          </div>

          {/* Logged In User Badge */}
          {usuarioLogado && (
            <div className="flex items-center gap-2 bg-slate-800/90 border border-slate-700/90 rounded-xl px-3 py-1.5 shadow-sm">
              <div
                className={`p-1 rounded-lg border ${
                  isAdmin(usuarioLogado)
                    ? "bg-red-500/20 text-red-300 border-red-500/40"
                    : isComandante(usuarioLogado)
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                    : "bg-blue-600/20 text-blue-300 border-blue-500/30"
                }`}
              >
                {isAdmin(usuarioLogado) ? (
                  <ShieldCheck className="w-4 h-4 text-red-400" />
                ) : isComandante(usuarioLogado) ? (
                  <Shield className="w-4 h-4 text-amber-400" />
                ) : (
                  <Eye className="w-4 h-4 text-blue-400" />
                )}
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-black text-slate-100 leading-none flex items-center gap-1">
                  {usuarioLogado.nomeDisplay}
                </span>
                <span
                  className={`text-[9.5px] font-bold font-mono leading-tight mt-0.5 ${
                    isAdmin(usuarioLogado)
                      ? "text-red-400"
                      : isComandante(usuarioLogado)
                      ? "text-amber-400"
                      : "text-blue-400"
                  }`}
                >
                  PERFIL {labelPerfil}
                </span>
              </div>
              {onLogout && (
                <button
                  onClick={onLogout}
                  className="ml-1 p-1 hover:bg-slate-700 rounded-lg text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
                  title="Sair / Encerrar Sessão"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          {/* Tenant Selector */}
          <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700/80 rounded-xl px-3 py-1.5 text-sm">
            <Building2 className="w-4 h-4 text-slate-400" />
            <span className="text-xs text-slate-400 hidden sm:inline">Unidade:</span>
            <select
              value={unidadeAtual.id}
              onChange={(e) => {
                const found = unidades.find((u) => u.id === e.target.value);
                if (found) onSelectUnidade(found);
              }}
              className="bg-transparent text-slate-200 text-xs font-semibold focus:outline-none cursor-pointer"
            >
              {unidades
                .filter((u) => u.id !== "17-bpm-mirassol" && !u.nome.toLowerCase().includes("mirassol"))
                .map((u) => (
                  <option key={u.id} value={u.id} className="bg-slate-900 text-white">
                    {u.sigla} - {u.nome}
                  </option>
                ))}
            </select>
          </div>

          {/* Active Alerts Pill (When allowed) */}
          {podeVerConflitos && qtdAlertasAtivos > 0 && (
            <button
              onClick={() => onSelectTab("conflitos")}
              className="flex items-center gap-1.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 px-2.5 py-1 rounded-xl text-xs font-bold animate-pulse cursor-pointer transition-all shadow-sm active:scale-95"
              title="Clique para abrir a Central de Conflitos de Escala"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span>{qtdAlertasAtivos} {qtdAlertasAtivos === 1 ? 'Conflito / Alerta' : 'Conflitos / Alertas'}</span>
            </button>
          )}

          {/* PDF Generation Button */}
          <button
            onClick={onAbrirPdf}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            <span>Gerar PDF Oficial</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-slate-950/80 border-t border-slate-800/80 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center gap-1 overflow-x-auto py-1.5 scrollbar-none">
          <button
            onClick={() => onSelectTab("escala")}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
              tabAtiva === "escala"
                ? "bg-blue-600/15 text-blue-400 border border-blue-500/30 font-bold shadow-xs"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            <span>Escala Semanal (Terç-Seg)</span>
          </button>

          <button
            onClick={() => onSelectTab("mensal")}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
              tabAtiva === "mensal"
                ? "bg-blue-600/15 text-blue-400 border border-blue-500/30 font-bold shadow-xs"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Projeção Mensal</span>
          </button>

          {podeVerConflitos && (
            <button
              onClick={() => onSelectTab("conflitos")}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer relative ${
                tabAtiva === "conflitos"
                  ? "bg-amber-500/15 text-amber-300 border border-amber-500/40 font-bold shadow-xs"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              <AlertTriangle className={`w-3.5 h-3.5 ${qtdAlertasAtivos > 0 ? "text-amber-400" : ""}`} />
              <span>Conflitos/Registros</span>
              {qtdAlertasAtivos > 0 && (
                <span className="bg-amber-500 text-slate-950 font-black text-[10px] px-1.5 py-0.2 rounded-full ml-0.5 shadow-sm">
                  {qtdAlertasAtivos}
                </span>
              )}
            </button>
          )}

          {podeVerPostos && (
            <button
              onClick={() => onSelectTab("postos")}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                tabAtiva === "postos"
                  ? "bg-blue-600/15 text-blue-400 border border-blue-500/30 font-bold shadow-xs"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>Postos de Serviço (CRUD)</span>
            </button>
          )}

          {podeVerMilitares && (
            <button
              onClick={() => onSelectTab("militares")}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                tabAtiva === "militares"
                  ? "bg-blue-600/15 text-blue-400 border border-blue-500/30 font-bold shadow-xs"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Efetivo Militar (Antiguidade)</span>
            </button>
          )}

          {podeVerAfastamentos && (
            <button
              onClick={() => onSelectTab("afastamentos")}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                tabAtiva === "afastamentos"
                  ? "bg-blue-600/15 text-blue-400 border border-blue-500/30 font-bold shadow-xs"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              <UserX className="w-3.5 h-3.5" />
              <span>Férias & Ausências</span>
            </button>
          )}

          {(podeVerConfig || podeVerSuporte) && (
            <button
              onClick={() => onSelectTab("configuracoes")}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ml-auto ${
                tabAtiva === "configuracoes" || tabAtiva === "suporte"
                  ? "bg-blue-600/15 text-blue-400 border border-blue-500/30 font-bold shadow-xs"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Cabeçalho & Configurações</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

