export type TipoPosto = "24h" | "expediente" | "personalizado";

export interface CabecalhoUnidade {
  governo: string;
  secretaria: string;
  corporacao: string;
  comandoRegional: string;
  batalhao: string;
  unidade: string;
  informativoNumero: string;
  comandanteBpm: string;
  comandanteNpm: string;
  logoUrl?: string;
  determinacoesPadrao: string[];
}

export interface HorarioExpediente {
  inicio: string; // e.g. "07:00"
  fim: string; // e.g. "13:00"
  segundaInicioManha?: string; // "08:00"
  segundaFimManha?: string; // "12:00"
  segundaInicioTarde?: string; // "14:00"
  segundaFimTarde?: string; // "18:00"
  diasSemana: number[]; // 1 to 5 (Seg-Sex)
}

export interface UnidadeTenant {
  id: string;
  nome: string; // e.g. "NÚCLEO PM DE CURVELÂNDIA"
  sigla: string; // e.g. "NPM CURVELÂNDIA"
  cabecalho: CabecalhoUnidade;
  horarioExpediente: HorarioExpediente;
}

export interface TurnoExpediente {
  inicio: string; // e.g. "07:30"
  fim: string; // e.g. "11:30"
}

export interface PostoServico {
  id: string;
  unidadeId: string;
  nome: string; // e.g. "Comandante da GU"
  sigla: string; // e.g. "CMT DA GUPM"
  tipoHorario: TipoPosto;
  horaInicio: string; // e.g. "08:00"
  horaFim?: string; // e.g. "17:30" or "13:00"
  usarDoisTurnos?: boolean; // true if split shift (e.g. 2 turnos matutino e vespertino)
  turno1?: TurnoExpediente; // 1st shift (e.g. 07:30 - 11:30)
  turno2?: TurnoExpediente; // 2nd shift (e.g. 13:30 - 17:30)
  duracaoHoras: number; // e.g. 24 or 8
  militarDesignadoId?: string; // Military officer assigned to perform this expediente post
  requerCnh: boolean;
  ordemExibicao: number;
  corBadge: string;
  ativo: boolean;
}

export type GraduacaoPM =
  | "SUB TEN PM"
  | "1º SGT PM"
  | "2º SGT PM"
  | "3º SGT PM"
  | "CB PM"
  | "SD PM"
  | "OFFICIAL";

export interface Militar {
  id: string;
  unidadeId: string;
  graduacao: GraduacaoPM;
  nomeGuerra: string;
  nomeCompleto: string;
  rgPmmt: string;
  antiguidadeOrdem: number; // 1 = mais antigo, 100 = mais moderno
  cnhAtiva: boolean;
  aptidoesPosto: string[]; // array of posto IDs or names
  ativo: boolean;
}

export type TipoAfastamento =
  | "FERIAS"
  | "LICENCA_PREMIO"
  | "LTS"
  | "CURSO"
  | "PATRULHA_RURAL"
  | "REFORCO_EXTRAORDINARIO"
  | "OUTRO";

export interface Afastamento {
  id: string;
  militarId: string;
  unidadeId: string;
  tipo: TipoAfastamento;
  descricao: string;
  dataInicio: string; // "YYYY-MM-DD"
  dataFim: string; // "YYYY-MM-DD"
  horaFim?: string; // "HH:mm", standard "08:00" if 24h
  is_fatiguing: boolean; // false for Férias/Licenças (D+1 zero rest requirement), true for Cursos/Patrulha (mandatory 24h rest)
}

export type UserRole = "comandante" | "operador" | "admin" | "militar" | "custom";

export interface PermissoesPerfil {
  // Escala Semanal
  escalaVisualizar: boolean;
  escalaEditar: boolean; // Arrastar militares, alocar, remover
  escalaPermuta: boolean; // Realizar permutas SIGADOC
  escalaAjuste: boolean; // Realizar ajustes de escala
  escalaPdf: boolean; // Gerar PDF oficial
  
  // Projeção Mensal
  projecaoVisualizar: boolean;
  projecaoExecutar: boolean; // Gerar projeção automática 30 dias
  projecaoResetar: boolean; // Resetar projeções futuras

  // Central de Conflitos
  conflitosVisualizar: boolean;

  // Postos de Serviço
  postosVisualizar: boolean;
  postosEditar: boolean; // CRUD de postos

  // Efetivo Militar
  efetivoVisualizar: boolean;
  efetivoEditar: boolean; // CRUD de militares e antiguidade

  // Férias e Ausências
  afastamentosVisualizar: boolean;
  afastamentosEditar: boolean; // CRUD de afastamentos

  // Cabeçalho e Configurações
  configuracoesEditar: boolean;

  // Suporte & Perfis de Acesso
  suporteAcesso: boolean;
  gerenciarPerfis: boolean;
  gerenciarUsuarios: boolean;
}

export interface PerfilAcesso {
  id: string; // "admin", "comandante", "efetivo", or custom id
  nome: string; // e.g. "Administrador do Sistema", "Comandante", "Efetivo"
  descricao: string;
  corBadge: string; // CSS color classes for badge
  isSistema?: boolean; // Default system profiles that cannot be deleted
  permissoes: PermissoesPerfil;
}

export interface UsuarioAuth {
  id: string; // e.g. "user-comandante", "user-operador", or "user-admin"
  username: string; // RGPMMT (e.g. "comandante", "operador", "admin", "880.819")
  militarId?: string; // linked militar ID if role === "operador" / "militar" / "efetivo"
  password: string; // password
  primeiroAcesso: boolean; // true if default password or needs reset
  role: UserRole;
  perfilId: string; // references PerfilAcesso.id ("admin" | "comandante" | "efetivo" | custom)
  nomeDisplay: string;
  ativo?: boolean;
}

export function isComandante(user?: UsuarioAuth | null): boolean {
  if (!user) return false;
  return user.perfilId === "comandante" || user.perfilId === "admin" || user.role === "comandante" || user.role === "admin";
}

export function isAdmin(user?: UsuarioAuth | null): boolean {
  if (!user) return false;
  return user.perfilId === "admin" || user.role === "admin";
}

export function isOperador(user?: UsuarioAuth | null): boolean {
  if (!user) return false;
  return user.perfilId === "efetivo" || user.role === "operador" || user.role === "militar";
}

export function temPermissao(
  user: UsuarioAuth | null | undefined,
  perfis: PerfilAcesso[],
  permissao: keyof PermissoesPerfil
): boolean {
  if (!user) return false;
  
  // Super admin always has full permissions
  if (user.perfilId === "admin" || user.username === "admin") return true;

  const perfil = perfis.find((p) => p.id === user.perfilId);
  if (!perfil) {
    // Fallback based on legacy role
    if (user.role === "admin" || user.role === "comandante") return true;
    return permissao === "escalaVisualizar" || permissao === "projecaoVisualizar" || permissao === "escalaPdf";
  }

  return Boolean(perfil.permissoes[permissao]);
}

export interface EscalaItem {
  id: string;
  unidadeId: string;
  data: string; // "YYYY-MM-DD"
  postoId: string;
  militarId: string; // militar ID or "REFORCO_EXTRAORDINARIO" or "VAZIO"
  startTimeMs: number; // unix timestamp in ms
  endTimeMs: number; // unix timestamp in ms
  isPermuta: boolean;
  sigadocPermuta?: string;
  militarOriginalId?: string; // If permuta occurred
  isAjuste: boolean;
  observacoes?: string;
  status: "projetada" | "efetivada" | "ajustada" | "concluida";
}

export interface AlertaEscala {
  militarId: string;
  data: string;
  postoId: string;
  tipo: "BLOQUEIO_24H" | "ALERTA_72H" | "ALERTA_96H" | "INDISPONIVEL_AFASTADO" | "MOTORISTA_SEM_CNH";
  mensagem: string;
  detalheHorasDescanso?: number;
}

export interface SemanaOperacional {
  semanaId: string; // e.g. "2026-W32"
  dataInicioTerca: string; // "YYYY-MM-DD"
  dataFimSegunda: string; // "YYYY-MM-DD"
  dias: {
    data: string; // "YYYY-MM-DD"
    diaSemanaNome: string; // "TERÇA-FEIRA", etc.
    isFimDeSemana: boolean;
  }[];
}

export interface PermutaInput {
  escalaItemId: string;
  militarTitularId: string;
  militarSubstitutoId: string;
  sigadoc: string;
  observacao?: string;
}

export interface DeterminacaoEscala {
  id: string;
  ordem: number;
  texto: string;
}

export interface ItemConflito {
  id: string;
  escalaItem: EscalaItem;
  militar: Militar;
  posto: PostoServico;
  data: string;
  alerta: AlertaEscala;
  nivelGravidade: "CRITICO" | "ALERTA" | "OCIOSIDADE";
}

export interface RegistroFolga96h {
  id: string;
  unidadeId: string;
  militarId: string;
  dataInicio: string; // "YYYY-MM-DD"
  dataFim: string; // "YYYY-MM-DD"
  diasFolga: string[]; // ["2026-08-11", "2026-08-12", "2026-08-13", "2026-08-14"]
  horasDescanso: number; // e.g. 96, 120
  motivo: string; // "Folga Regulamentar 96h", "Compensação de Escala", "Adequação de Efetivo 24x72"
  observacoes?: string;
  registradoPor?: string;
  criadoEm: string; // ISO string ou YYYY-MM-DD
}

