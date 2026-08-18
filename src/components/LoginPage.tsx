import React, { useState } from "react";
import { UsuarioAuth, UnidadeTenant } from "../types";
import {
  Shield,
  Lock,
  User,
  KeyRound,
  ArrowRight,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Eye,
  EyeOff
} from "lucide-react";

interface LoginPageProps {
  usuarios: UsuarioAuth[];
  unidadeAtual?: UnidadeTenant;
  onUpdateUsuarios: (novosUsuarios: UsuarioAuth[]) => void;
  onLoginSuccess: (usuario: UsuarioAuth) => void;
}

export const normalizeUser = (input: string): string => {
  return input.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
};

export const LoginPage: React.FC<LoginPageProps> = ({
  usuarios,
  unidadeAtual,
  onUpdateUsuarios,
  onLoginSuccess
}) => {
  const [mode, setMode] = useState<"login" | "troca_senha" | "recuperar">("login");
  const logoUrl = unidadeAtual?.cabecalho?.logoUrl || "https://i.ibb.co/FqLxFKqG/logo-17bpm-removebg-preview.png";

  // Form states
  const [inputRg, setInputRg] = useState("");
  const [inputSenha, setInputSenha] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Troca de Senha states
  const [pendingUser, setPendingUser] = useState<UsuarioAuth | null>(null);
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarNovaSenha, setConfirmarNovaSenha] = useState("");
  const [showNovaPassword, setShowNovaPassword] = useState(false);

  // Recovery states
  const [recoveryRg, setRecoveryRg] = useState("");
  const [recoverySuccessMsg, setRecoverySuccessMsg] = useState<string | null>(null);

  // Error messaging
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Handle Login Submit
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!inputRg.trim()) {
      setErrorMsg("Informe o RGPMMT ou nome de usuário.");
      return;
    }
    if (!inputSenha) {
      setErrorMsg("Informe a sua senha.");
      return;
    }

    const searchNorm = normalizeUser(inputRg);
    const userFound = usuarios.find((u) => normalizeUser(u.username) === searchNorm);

    if (!userFound) {
      setErrorMsg("RGPMMT ou usuário não encontrado. Verifique o número digitado.");
      return;
    }

    if (userFound.password !== inputSenha) {
      setErrorMsg("Senha incorreta. Tente novamente ou use a 'Recuperação de Senha'.");
      return;
    }

    // Password is correct. Check if first access or default password
    if (userFound.primeiroAcesso || userFound.password === "123456") {
      setPendingUser(userFound);
      setNovaSenha("");
      setConfirmarNovaSenha("");
      setErrorMsg(null);
      setMode("troca_senha");
      return;
    }

    // Success login
    onLoginSuccess(userFound);
  };

  // Handle Troca Obrigatória de Senha Submit
  const handleTrocaSenhaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!pendingUser) return;

    if (!novaSenha || novaSenha.length < 6) {
      setErrorMsg("A nova senha deve ter no mínimo 6 caracteres.");
      return;
    }

    if (novaSenha !== confirmarNovaSenha) {
      setErrorMsg("A confirmação de senha não confere com a nova senha digitada.");
      return;
    }

    if (novaSenha === "123456") {
      setErrorMsg("A nova senha não pode ser a senha padrão '123456'. Crie uma senha personalizada.");
      return;
    }

    // Update user in array
    const updatedUser: UsuarioAuth = {
      ...pendingUser,
      password: novaSenha,
      primeiroAcesso: false
    };

    const novosUsuarios = usuarios.map((u) => (u.id === pendingUser.id ? updatedUser : u));
    onUpdateUsuarios(novosUsuarios);

    // Complete login
    onLoginSuccess(updatedUser);
  };

  // Handle Password Recovery Submit
  const handleRecuperarSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setRecoverySuccessMsg(null);

    if (!recoveryRg.trim()) {
      setErrorMsg("Digite o RGPMMT ou usuário para redefinir a senha.");
      return;
    }

    const searchNorm = normalizeUser(recoveryRg);
    const userFound = usuarios.find((u) => normalizeUser(u.username) === searchNorm);

    if (!userFound) {
      setErrorMsg(`Nenhum usuário cadastrado com o RGPMMT / Login '${recoveryRg}'.`);
      return;
    }

    // Reset password to "123456" and set primeiroAcesso = true
    const updatedUser: UsuarioAuth = {
      ...userFound,
      password: "123456",
      primeiroAcesso: true
    };

    const novosUsuarios = usuarios.map((u) => (u.id === userFound.id ? updatedUser : u));
    onUpdateUsuarios(novosUsuarios);

    setRecoverySuccessMsg(
      `Senha do RGPMMT / Usuário '${userFound.username}' redefinida com sucesso! A nova senha temporária é '123456'. Ao realizar o login, será solicitada a criação de uma nova senha.`
    );
    setRecoveryRg("");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between relative overflow-hidden select-none">
      {/* Background Subtle Gradient & Grid Patterns */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-950 to-slate-950 pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-25 pointer-events-none" />

      {/* Header Bar */}
      <header className="relative z-10 py-6 px-4 sm:px-8 border-b border-slate-800/80 bg-slate-900/50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white flex items-center justify-center p-1 shadow-lg border border-slate-200">
              <img
                src={logoUrl}
                alt="Logo PMMT"
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <span className="text-[10px] font-extrabold tracking-widest text-blue-400 uppercase block">
                Polícia Militar do Estado de Mato Grosso
              </span>
              <h1 className="text-base sm:text-lg font-black text-slate-100 tracking-tight">
                {unidadeAtual?.nome || "17º BATALHÃO DE POLÍCIA MILITAR"} • SIS-ESCALAS
              </h1>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2 text-xs text-slate-400 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800">
            <Shield className="w-4 h-4 text-blue-400" />
            <span>Acesso Restrito ao Efetivo Policial</span>
          </div>
        </div>
      </header>

      {/* Main Form Container */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6 my-6">
        <div className="w-full max-w-md bg-slate-900/90 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden backdrop-blur-xl">
          {/* Card Top Banner */}
          <div className="bg-slate-950 px-6 py-6 border-b border-slate-800/80 text-center relative">
            <div className="w-16 h-16 mx-auto bg-white rounded-2xl flex items-center justify-center p-2 shadow-xl border border-slate-200 mb-3">
              <img
                src={logoUrl}
                alt="Logo Unidade"
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>

            {mode === "login" && (
              <>
                <h2 className="text-xl font-extrabold text-slate-100 tracking-tight">
                  Identificação do Usuário
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Digite seu RGPMMT e senha para acessar o sistema de escalas
                </p>
              </>
            )}

            {mode === "troca_senha" && (
              <>
                <h2 className="text-xl font-extrabold text-amber-300 tracking-tight flex items-center justify-center gap-2">
                  <KeyRound className="w-5 h-5 text-amber-400" />
                  Troca Obrigatória de Senha
                </h2>
                <p className="text-xs text-slate-300 mt-1">
                  Primeiro acesso ou senha temporária detectada. Cadastre uma nova senha.
                </p>
              </>
            )}

            {mode === "recuperar" && (
              <>
                <h2 className="text-xl font-extrabold text-blue-400 tracking-tight flex items-center justify-center gap-2">
                  <RotateCcw className="w-5 h-5 text-blue-400" />
                  Recuperação de Senha
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Informe o seu RGPMMT para redefinir sua senha para a senha inicial (123456)
                </p>
              </>
            )}
          </div>

          {/* Form Body */}
          <div className="p-6 space-y-5">
            {/* Global Error Banner */}
            {errorMsg && (
              <div className="p-3.5 bg-rose-950/80 border border-rose-600/80 rounded-xl text-rose-200 text-xs font-semibold flex items-start gap-2.5 animate-in fade-in duration-200">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="flex-1">{errorMsg}</div>
              </div>
            )}

            {/* Global Recovery Success Banner */}
            {recoverySuccessMsg && (
              <div className="p-3.5 bg-emerald-950/80 border border-emerald-600/80 rounded-xl text-emerald-200 text-xs font-semibold flex items-start gap-2.5 animate-in fade-in duration-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div className="flex-1">{recoverySuccessMsg}</div>
              </div>
            )}

            {/* MODE 1: LOGIN */}
            {mode === "login" && (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-blue-400" />
                    RGPMMT ou Usuário:
                  </label>
                  <input
                    type="text"
                    value={inputRg}
                    onChange={(e) => setInputRg(e.target.value)}
                    placeholder="Ex: 880.819"
                    autoFocus
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 font-mono font-bold focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  />
                  <span className="text-[10px] text-slate-500 block">
                    Digite o número do seu RGPMMT (ex: 880819).
                  </span>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-extrabold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-blue-400" />
                      Senha:
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setMode("recuperar");
                        setErrorMsg(null);
                        setRecoverySuccessMsg(null);
                      }}
                      className="text-xs text-blue-400 hover:text-blue-300 font-bold hover:underline cursor-pointer"
                    >
                      Esqueceu a senha?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={inputSenha}
                      onChange={(e) => setInputSenha(e.target.value)}
                      placeholder="Senha de acesso"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 pr-10 text-sm text-slate-100 placeholder-slate-500 font-mono focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <span className="text-[10px] text-slate-500 block">
                    A senha inicial padrão para todos os policiais é: <strong className="text-slate-300 font-mono">123456</strong>
                  </span>
                </div>

                <button
                  type="submit"
                  className="w-full mt-2 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-sm py-3 px-4 rounded-xl shadow-lg shadow-blue-900/30 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
                >
                  <span>Entrar no Sistema</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            )}

            {/* MODE 2: TROCA OBRIGATÓRIA DE SENHA */}
            {mode === "troca_senha" && pendingUser && (
              <form onSubmit={handleTrocaSenhaSubmit} className="space-y-4">
                <div className="p-3 bg-amber-950/40 border border-amber-500/30 rounded-xl text-amber-200 text-xs space-y-1">
                  <p className="font-extrabold">
                    Usuário: {pendingUser.nomeDisplay} ({pendingUser.username})
                  </p>
                  <p className="text-[11px] text-amber-300/80">
                    Sua senha atual é a temporária padrão (<code className="font-mono font-bold">123456</code>). Por diretriz de segurança, cadastre uma nova senha pessoal antes de continuar.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-amber-400" />
                    Nova Senha (Mínimo 6 caracteres):
                  </label>
                  <div className="relative">
                    <input
                      type={showNovaPassword ? "text" : "password"}
                      value={novaSenha}
                      onChange={(e) => setNovaSenha(e.target.value)}
                      placeholder="Crie sua nova senha"
                      autoFocus
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 pr-10 text-sm text-slate-100 placeholder-slate-500 font-mono focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNovaPassword(!showNovaPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                    >
                      {showNovaPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                    Confirmar Nova Senha:
                  </label>
                  <input
                    type={showNovaPassword ? "text" : "password"}
                    value={confirmarNovaSenha}
                    onChange={(e) => setConfirmarNovaSenha(e.target.value)}
                    placeholder="Repita a nova senha"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 font-mono focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full mt-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm py-3 px-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>Cadastrar Nova Senha e Entrar</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMode("login");
                    setPendingUser(null);
                    setErrorMsg(null);
                  }}
                  className="w-full text-xs text-slate-400 hover:text-slate-200 font-semibold py-1 cursor-pointer text-center"
                >
                  Cancelar e voltar para o login
                </button>
              </form>
            )}

            {/* MODE 3: RECUPERAÇÃO DE SENHA */}
            {mode === "recuperar" && (
              <form onSubmit={handleRecuperarSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-blue-400" />
                    Digite o RGPMMT ou Usuário:
                  </label>
                  <input
                    type="text"
                    value={recoveryRg}
                    onChange={(e) => setRecoveryRg(e.target.value)}
                    placeholder="Ex: 880.819"
                    autoFocus
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 font-mono font-bold focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  />
                  <span className="text-[10px] text-slate-500 block">
                    A senha será redefinida imediatamente para a senha temporária inicial: <strong className="text-slate-300 font-mono">123456</strong>.
                  </span>
                </div>

                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-sm py-3 px-4 rounded-xl shadow-lg shadow-blue-900/30 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Resetar Senha para 123456</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMode("login");
                    setErrorMsg(null);
                    setRecoverySuccessMsg(null);
                  }}
                  className="w-full text-xs text-slate-400 hover:text-slate-200 font-semibold py-1.5 cursor-pointer text-center block"
                >
                  ← Voltar para o Login
                </button>
              </form>
            )}
          </div>

          {/* Footer Info */}
          <div className="bg-slate-950 px-6 py-3.5 border-t border-slate-800/80 text-center text-[10.5px] text-slate-500">
            Polícia Militar do Estado de Mato Grosso • 17º BPM
          </div>
        </div>
      </main>

      {/* Page Footer */}
      <footer className="relative z-10 py-3 px-4 text-center text-xs text-slate-500 border-t border-slate-900 bg-slate-950/80">
        Sistema Oficial de Gestão de Escalas de Serviço • PMMT
      </footer>
    </div>
  );
};
