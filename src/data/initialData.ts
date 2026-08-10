import { UnidadeTenant, PostoServico, Militar, Afastamento, EscalaItem, DeterminacaoEscala } from "../types";

export const UNIDADES_INICIAIS: UnidadeTenant[] = [
  {
    id: "npm-curvelandia",
    nome: "NÚCLEO PM DE CURVELÂNDIA",
    sigla: "NPM CURVELÂNDIA",
    cabecalho: {
      governo: "Governo de Mato Grosso",
      secretaria: "POLÍCIA MILITAR DO ESTADO DE MATO GROSSO",
      corporacao: "6º COMANDO REGIONAL",
      comandoRegional: "17º BPM - MIRASSOL D'OESTE",
      batalhao: "ESTADO DE MATO GROSSO / POLÍCIA MILITAR",
      unidade: "NÚCLEO PM DE CURVELÂNDIA",
      informativoNumero: "83/2026 17º BPM/NPM DE CURVELANDIA",
      comandanteBpm: "Maj PM Costa Soares",
      comandanteNpm: "Sub Ten PM Wanderley Campos Pereira",
      logoUrl: "https://i.ibb.co/FqLxFKqG/logo-17bpm-removebg-preview.png",
      determinacoesPadrao: [
        "1. RONDAS E VISITAS DIARIAMENTE NAS ESCOLAS ESTADUAIS E MUNICIPAIS DE CURVELANDIA PRINCIPALMENTE NOS HORÁRIOS DE PICO (ENTRADA E SAÍDAS DOS ALUNOS);",
        "2. COMANDANTE DA GUPM DEVERÁ PREENCHER O LINK DA RONDA ESCOLAR;",
        "3. REALIZAR PB NA FESTA AGOSTINA DA ESCOLA ESTADUAL CÍVICO-MILITAR BOA ESPERANÇA, NO DIA 07/08/2026, A PARTIR DAS 19H00."
      ]
    },
    horarioExpediente: {
      inicio: "07:00",
      fim: "13:00",
      segundaInicioManha: "08:00",
      segundaFimManha: "12:00",
      segundaInicioTarde: "14:00",
      segundaFimTarde: "18:00",
      diasSemana: [1, 2, 3, 4, 5]
    }
  }
];

export const POSTOS_INICIAIS: PostoServico[] = [
  {
    id: "posto-cmt-gu",
    unidadeId: "npm-curvelandia",
    nome: "Comandante da GU",
    sigla: "CMT DA GUPM",
    tipoHorario: "24h",
    horaInicio: "08:00",
    duracaoHoras: 24,
    requerCnh: false,
    ordemExibicao: 1,
    corBadge: "bg-amber-100 text-amber-800 border-amber-300",
    ativo: true
  },
  {
    id: "posto-motorista",
    unidadeId: "npm-curvelandia",
    nome: "Motorista",
    sigla: "MOTORISTA",
    tipoHorario: "24h",
    horaInicio: "08:00",
    duracaoHoras: 24,
    requerCnh: true,
    ordemExibicao: 2,
    corBadge: "bg-blue-100 text-blue-800 border-blue-300",
    ativo: true
  },
  {
    id: "posto-patrulheiro",
    unidadeId: "npm-curvelandia",
    nome: "Patrulheiro",
    sigla: "PATRULHEIRO",
    tipoHorario: "24h",
    horaInicio: "08:00",
    duracaoHoras: 24,
    requerCnh: false,
    ordemExibicao: 3,
    corBadge: "bg-emerald-100 text-emerald-800 border-emerald-300",
    ativo: true
  },
  {
    id: "posto-expediente",
    unidadeId: "npm-curvelandia",
    nome: "Expediente Administrative",
    sigla: "EXPEDIENTE",
    tipoHorario: "expediente",
    horaInicio: "07:30",
    horaFim: "17:30",
    usarDoisTurnos: true,
    turno1: { inicio: "07:30", fim: "11:30" },
    turno2: { inicio: "13:30", fim: "17:30" },
    duracaoHoras: 8,
    militarDesignadoId: "mil-001", // SUB TEN PM PEREIRA
    requerCnh: false,
    ordemExibicao: 4,
    corBadge: "bg-purple-100 text-purple-800 border-purple-300",
    ativo: true
  }
];

export const MILITARES_INICIAIS: Militar[] = [
  {
    id: "mil-001",
    unidadeId: "npm-curvelandia",
    graduacao: "SUB TEN PM",
    nomeGuerra: "PEREIRA",
    nomeCompleto: "WANDERLEY CAMPOS PEREIRA",
    rgPmmt: "880.819",
    antiguidadeOrdem: 1,
    cnhAtiva: true,
    aptidoesPosto: ["posto-cmt-gu", "posto-expediente"],
    ativo: true
  },
  {
    id: "mil-002",
    unidadeId: "npm-curvelandia",
    graduacao: "1º SGT PM",
    nomeGuerra: "LINDOMAR",
    nomeCompleto: "LINDOMAR FERREIRA SOUZA",
    rgPmmt: "882.327",
    antiguidadeOrdem: 2,
    cnhAtiva: true,
    aptidoesPosto: ["posto-cmt-gu", "posto-patrulheiro"],
    ativo: true
  },
  {
    id: "mil-003",
    unidadeId: "npm-curvelandia",
    graduacao: "1º SGT PM",
    nomeGuerra: "BARBOSA",
    nomeCompleto: "RODRIGO BARBOSA DOS SANTOS",
    rgPmmt: "883.028",
    antiguidadeOrdem: 3,
    cnhAtiva: true,
    aptidoesPosto: ["posto-cmt-gu", "posto-motorista", "posto-patrulheiro"],
    ativo: true
  },
  {
    id: "mil-004",
    unidadeId: "npm-curvelandia",
    graduacao: "2º SGT PM",
    nomeGuerra: "PABLO",
    nomeCompleto: "PABLO HENRIQUE OLIVEIRA",
    rgPmmt: "884.196",
    antiguidadeOrdem: 4,
    cnhAtiva: true,
    aptidoesPosto: ["posto-cmt-gu", "posto-motorista", "posto-patrulheiro"],
    ativo: true
  },
  {
    id: "mil-005",
    unidadeId: "npm-curvelandia",
    graduacao: "2º SGT PM",
    nomeGuerra: "VANDERSON",
    nomeCompleto: "VANDERSON SILVA LIMA",
    rgPmmt: "885.597",
    antiguidadeOrdem: 5,
    cnhAtiva: true,
    aptidoesPosto: ["posto-cmt-gu", "posto-motorista", "posto-patrulheiro"],
    ativo: true
  },
  {
    id: "mil-006",
    unidadeId: "npm-curvelandia",
    graduacao: "2º SGT PM",
    nomeGuerra: "FABRÍCIO",
    nomeCompleto: "FABRÍCIO MENDES CARDOSO",
    rgPmmt: "885.943",
    antiguidadeOrdem: 6,
    cnhAtiva: true,
    aptidoesPosto: ["posto-cmt-gu", "posto-patrulheiro"],
    ativo: true
  },
  {
    id: "mil-007",
    unidadeId: "npm-curvelandia",
    graduacao: "3º SGT PM",
    nomeGuerra: "EVERALDO",
    nomeCompleto: "EVERALDO PEREIRA DA SILVA",
    rgPmmt: "885.608",
    antiguidadeOrdem: 7,
    cnhAtiva: true,
    aptidoesPosto: ["posto-cmt-gu", "posto-motorista", "posto-patrulheiro"],
    ativo: true
  },
  {
    id: "mil-008",
    unidadeId: "npm-curvelandia",
    graduacao: "1º SGT PM",
    nomeGuerra: "CELSO",
    nomeCompleto: "CELSO ROBERTO MARQUES",
    rgPmmt: "881.726",
    antiguidadeOrdem: 8,
    cnhAtiva: true,
    aptidoesPosto: ["posto-cmt-gu", "posto-patrulheiro"],
    ativo: true
  },
  {
    id: "mil-009",
    unidadeId: "npm-curvelandia",
    graduacao: "3º SGT PM",
    nomeGuerra: "JONAS",
    nomeCompleto: "JONAS AUGUSTO ALVES",
    rgPmmt: "885.564",
    antiguidadeOrdem: 9,
    cnhAtiva: true,
    aptidoesPosto: ["posto-cmt-gu", "posto-motorista"],
    ativo: true
  },
  {
    id: "mil-010",
    unidadeId: "npm-curvelandia",
    graduacao: "CB PM",
    nomeGuerra: "ESPINOZA",
    nomeCompleto: "MARCOS ESPINOZA GOMES",
    rgPmmt: "886.188",
    antiguidadeOrdem: 10,
    cnhAtiva: true,
    aptidoesPosto: ["posto-motorista", "posto-patrulheiro"],
    ativo: true
  },
  {
    id: "mil-011",
    unidadeId: "npm-curvelandia",
    graduacao: "SD PM",
    nomeGuerra: "ALMEIDA",
    nomeCompleto: "LUCAS ALMEIDA FERREIRA",
    rgPmmt: "887.828",
    antiguidadeOrdem: 11,
    cnhAtiva: true,
    aptidoesPosto: ["posto-motorista", "posto-patrulheiro"],
    ativo: true
  },
  {
    id: "mil-012",
    unidadeId: "npm-curvelandia",
    graduacao: "SD PM",
    nomeGuerra: "FONTES",
    nomeCompleto: "GUILHERME FONTES NOGUEIRA",
    rgPmmt: "888.636",
    antiguidadeOrdem: 12, // Mais moderno
    cnhAtiva: true,
    aptidoesPosto: ["posto-motorista", "posto-patrulheiro"],
    ativo: true
  }
];

export const AFASTAMENTOS_INICIAIS: Afastamento[] = [
  {
    id: "afast-01",
    militarId: "mil-008", // CELSO
    unidadeId: "npm-curvelandia",
    tipo: "LICENCA_PREMIO",
    descricao: "Licença Prêmio concedida",
    dataInicio: "2026-07-15",
    dataFim: "2026-08-13",
    is_fatiguing: false
  },
  {
    id: "afast-02",
    militarId: "mil-009", // JONAS
    unidadeId: "npm-curvelandia",
    tipo: "LICENCA_PREMIO",
    descricao: "Licença Prêmio concedida",
    dataInicio: "2026-07-16",
    dataFim: "2026-08-14",
    is_fatiguing: false
  },
  {
    id: "afast-03",
    militarId: "mil-010", // ESPINOZA
    unidadeId: "npm-curvelandia",
    tipo: "FERIAS",
    descricao: "Férias Regulamentares Ano 2026",
    dataInicio: "2026-08-05",
    dataFim: "2026-09-03",
    is_fatiguing: false
  }
];

// Reference Scale from August 04 to August 10, 2026 (Tuesday to Monday)
// Exactly matching the official PM/MT PDF reference
export const ESCALA_INICIAL_04_A_10_AGOSTO: EscalaItem[] = [
  // TERÇA 04/08/2026
  {
    id: "esc-04-cmt",
    unidadeId: "npm-curvelandia",
    data: "2026-08-04",
    postoId: "posto-cmt-gu",
    militarId: "mil-002", // LINDOMAR
    startTimeMs: new Date("2026-08-04T08:00:00").getTime(),
    endTimeMs: new Date("2026-08-05T08:00:00").getTime(),
    isPermuta: false,
    isAjuste: false,
    status: "efetivada"
  },
  {
    id: "esc-04-mot",
    unidadeId: "npm-curvelandia",
    data: "2026-08-04",
    postoId: "posto-motorista",
    militarId: "mil-007", // EVERALDO
    startTimeMs: new Date("2026-08-04T08:00:00").getTime(),
    endTimeMs: new Date("2026-08-05T08:00:00").getTime(),
    isPermuta: false,
    isAjuste: false,
    status: "efetivada"
  },
  {
    id: "esc-04-exp",
    unidadeId: "npm-curvelandia",
    data: "2026-08-04",
    postoId: "posto-expediente",
    militarId: "mil-001", // PEREIRA
    startTimeMs: new Date("2026-08-04T07:00:00").getTime(),
    endTimeMs: new Date("2026-08-04T13:00:00").getTime(),
    isPermuta: false,
    isAjuste: false,
    status: "efetivada"
  },

  // QUARTA 05/08/2026
  {
    id: "esc-05-cmt",
    unidadeId: "npm-curvelandia",
    data: "2026-08-05",
    postoId: "posto-cmt-gu",
    militarId: "mil-004", // PABLO
    startTimeMs: new Date("2026-08-05T08:00:00").getTime(),
    endTimeMs: new Date("2026-08-06T08:00:00").getTime(),
    isPermuta: false,
    isAjuste: false,
    status: "efetivada"
  },
  {
    id: "esc-05-mot",
    unidadeId: "npm-curvelandia",
    data: "2026-08-05",
    postoId: "posto-motorista",
    militarId: "mil-011", // ALMEIDA
    startTimeMs: new Date("2026-08-05T08:00:00").getTime(),
    endTimeMs: new Date("2026-08-06T08:00:00").getTime(),
    isPermuta: false,
    isAjuste: false,
    status: "efetivada"
  },
  {
    id: "esc-05-exp",
    unidadeId: "npm-curvelandia",
    data: "2026-08-05",
    postoId: "posto-expediente",
    militarId: "mil-001", // PEREIRA
    startTimeMs: new Date("2026-08-05T07:00:00").getTime(),
    endTimeMs: new Date("2026-08-05T13:00:00").getTime(),
    isPermuta: false,
    isAjuste: false,
    status: "efetivada"
  },

  // QUINTA 06/08/2026 (Reflects permuta mentioned in PDF note!)
  {
    id: "esc-06-cmt",
    unidadeId: "npm-curvelandia",
    data: "2026-08-06",
    postoId: "posto-cmt-gu",
    militarId: "mil-002", // LINDOMAR (Swapped with Fabrício per Sigadoc CI 22590/2026)
    startTimeMs: new Date("2026-08-06T08:00:00").getTime(),
    endTimeMs: new Date("2026-08-07T08:00:00").getTime(),
    isPermuta: true,
    sigadocPermuta: "39382239-7938 (CI nº 22590/2026/NPMCURVL/PM)",
    militarOriginalId: "mil-006", // FABRÍCIO
    observacoes: "Conforme CI nº 22590/2026/NPMCURVL/PM, autorizada permuta entre 1º Sgt PM Lindomar e 2º Sgt PM Fabrício",
    isAjuste: false,
    status: "efetivada"
  },
  {
    id: "esc-06-mot",
    unidadeId: "npm-curvelandia",
    data: "2026-08-06",
    postoId: "posto-motorista",
    militarId: "mil-003", // BARBOSA
    startTimeMs: new Date("2026-08-06T08:00:00").getTime(),
    endTimeMs: new Date("2026-08-07T08:00:00").getTime(),
    isPermuta: false,
    isAjuste: false,
    status: "efetivada"
  },
  {
    id: "esc-06-exp",
    unidadeId: "npm-curvelandia",
    data: "2026-08-06",
    postoId: "posto-expediente",
    militarId: "mil-001", // PEREIRA
    startTimeMs: new Date("2026-08-06T07:00:00").getTime(),
    endTimeMs: new Date("2026-08-06T13:00:00").getTime(),
    isPermuta: false,
    isAjuste: false,
    status: "efetivada"
  },

  // SEXTA 07/08/2026
  {
    id: "esc-07-cmt",
    unidadeId: "npm-curvelandia",
    data: "2026-08-07",
    postoId: "posto-cmt-gu",
    militarId: "mil-005", // VANDERSON
    startTimeMs: new Date("2026-08-07T08:00:00").getTime(),
    endTimeMs: new Date("2026-08-08T08:00:00").getTime(),
    isPermuta: false,
    isAjuste: false,
    status: "efetivada"
  },
  {
    id: "esc-07-mot",
    unidadeId: "npm-curvelandia",
    data: "2026-08-07",
    postoId: "posto-motorista",
    militarId: "REFORCO_EXTRAORDINARIO", // Reforço Extraordinário
    startTimeMs: new Date("2026-08-07T08:00:00").getTime(),
    endTimeMs: new Date("2026-08-08T08:00:00").getTime(),
    isPermuta: false,
    isAjuste: false,
    status: "efetivada"
  },
  {
    id: "esc-07-exp",
    unidadeId: "npm-curvelandia",
    data: "2026-08-07",
    postoId: "posto-expediente",
    militarId: "mil-001", // PEREIRA
    startTimeMs: new Date("2026-08-07T07:00:00").getTime(),
    endTimeMs: new Date("2026-08-07T13:00:00").getTime(),
    isPermuta: false,
    isAjuste: false,
    status: "efetivada"
  },

  // SÁBADO 08/08/2026
  {
    id: "esc-08-cmt",
    unidadeId: "npm-curvelandia",
    data: "2026-08-08",
    postoId: "posto-cmt-gu",
    militarId: "mil-007", // EVERALDO
    startTimeMs: new Date("2026-08-08T08:00:00").getTime(),
    endTimeMs: new Date("2026-08-09T08:00:00").getTime(),
    isPermuta: false,
    isAjuste: false,
    status: "efetivada"
  },
  {
    id: "esc-08-mot",
    unidadeId: "npm-curvelandia",
    data: "2026-08-08",
    postoId: "posto-motorista",
    militarId: "mil-012", // FONTES
    startTimeMs: new Date("2026-08-08T08:00:00").getTime(),
    endTimeMs: new Date("2026-08-09T08:00:00").getTime(),
    isPermuta: false,
    isAjuste: false,
    status: "efetivada"
  },

  // DOMINGO 09/08/2026
  {
    id: "esc-09-cmt",
    unidadeId: "npm-curvelandia",
    data: "2026-08-09",
    postoId: "posto-cmt-gu",
    militarId: "mil-002", // LINDOMAR
    startTimeMs: new Date("2026-08-09T08:00:00").getTime(),
    endTimeMs: new Date("2026-08-10T08:00:00").getTime(),
    isPermuta: false,
    isAjuste: false,
    status: "efetivada"
  },
  {
    id: "esc-09-mot",
    unidadeId: "npm-curvelandia",
    data: "2026-08-09",
    postoId: "posto-motorista",
    militarId: "mil-011", // ALMEIDA
    startTimeMs: new Date("2026-08-09T08:00:00").getTime(),
    endTimeMs: new Date("2026-08-10T08:00:00").getTime(),
    isPermuta: false,
    isAjuste: false,
    status: "efetivada"
  },

  // SEGUNDA 10/08/2026
  {
    id: "esc-10-cmt",
    unidadeId: "npm-curvelandia",
    data: "2026-08-10",
    postoId: "posto-cmt-gu",
    militarId: "mil-006", // FABRÍCIO
    startTimeMs: new Date("2026-08-10T08:00:00").getTime(),
    endTimeMs: new Date("2026-08-11T08:00:00").getTime(),
    isPermuta: false,
    isAjuste: false,
    status: "efetivada"
  },
  {
    id: "esc-10-mot",
    unidadeId: "npm-curvelandia",
    data: "2026-08-10",
    postoId: "posto-motorista",
    militarId: "mil-004", // PABLO
    startTimeMs: new Date("2026-08-10T08:00:00").getTime(),
    endTimeMs: new Date("2026-08-11T08:00:00").getTime(),
    isPermuta: false,
    isAjuste: false,
    status: "efetivada"
  },
  {
    id: "esc-10-exp",
    unidadeId: "npm-curvelandia",
    data: "2026-08-10",
    postoId: "posto-expediente",
    militarId: "mil-001", // PEREIRA
    startTimeMs: new Date("2026-08-10T07:00:00").getTime(),
    endTimeMs: new Date("2026-08-10T13:00:00").getTime(),
    isPermuta: false,
    isAjuste: false,
    status: "efetivada"
  }
];
