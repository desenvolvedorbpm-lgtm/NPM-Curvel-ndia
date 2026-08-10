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
  status: "projetada" | "efetivada" | "ajustada";
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

