import {
  Militar,
  PostoServico,
  Afastamento,
  EscalaItem,
  AlertaEscala,
  SemanaOperacional,
  TipoPosto,
  ItemConflito
} from "../types";

/**
  * Calculates the Tuesday-to-Monday operational week for a given date.
  */
export function getOperationalWeekForDate(dateStr: string): SemanaOperacional {
  const d = new Date(dateStr + "T12:00:00");
  const dayOfWeek = d.getDay(); // 0 = Sun, 1 = Mon, 2 = Tue, 3 = Wed, 4 = Thu, 5 = Fri, 6 = Sat

  // Distance from Tuesday (2)
  let diffToTuesday = dayOfWeek - 2;
  if (diffToTuesday < 0) {
    diffToTuesday += 7; // e.g. Sun(0) -> -2 -> +7 = 5 days back
  }

  const tuesday = new Date(d);
  tuesday.setDate(d.getDate() - diffToTuesday);

  const dias = [];
  const nomesDias = [
    "DOMINGO",
    "SEGUNDA-FEIRA",
    "TERÇA-FEIRA",
    "QUARTA-FEIRA",
    "QUINTA-FEIRA",
    "SEXTA-FEIRA",
    "SÁBADO"
  ];

  for (let i = 0; i < 7; i++) {
    const cur = new Date(tuesday);
    cur.setDate(tuesday.getDate() + i);
    const yyyy = cur.getFullYear();
    const mm = String(cur.getMonth() + 1).padStart(2, "0");
    const dd = String(cur.getDate()).padStart(2, "0");
    const curStr = `${yyyy}-${mm}-${dd}`;
    const dow = cur.getDay();

    dias.push({
      data: curStr,
      diaSemanaNome: `${nomesDias[dow]} (${dd}/${mm})`,
      isFimDeSemana: dow === 0 || dow === 6
    });
  }

  const dataInicioTerca = dias[0].data;
  const dataFimSegunda = dias[6].data;

  // Week ID format YYYY-MM-DD (Terca)
  return {
    semanaId: `SEMANA-${dataInicioTerca}`,
    dataInicioTerca,
    dataFimSegunda,
    dias
  };
}

/**
  * Format date string YYYY-MM-DD to DD/MM/YYYY
  */
export function formatDateBr(dateStr: string): string {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

/**
 * Garante que os postos de serviço sejam sempre exibidos na ordem oficial:
 * 1. Comandante de GU
 * 2. Motorista
 * 3. Patrulheiro (se houver)
 * 4. Demais postos 24h
 * 5. Expediente (por último)
 */
export function sortPostosEmOrdemOficial(postos: PostoServico[]): PostoServico[] {
  const getWeight = (p: PostoServico) => {
    const nomeSigla = (p.nome + " " + p.sigla).toLowerCase();
    if (p.tipoHorario === "expediente" || nomeSigla.includes("expediente")) {
      return 1000 + (p.ordemExibicao || 0);
    }
    if (nomeSigla.includes("comandante") || nomeSigla.includes("cmt")) {
      return 10 + (p.ordemExibicao || 0);
    }
    if (nomeSigla.includes("motorista")) {
      return 20 + (p.ordemExibicao || 0);
    }
    if (nomeSigla.includes("patrulheiro")) {
      return 30 + (p.ordemExibicao || 0);
    }
    return 100 + (p.ordemExibicao || 0);
  };

  return [...postos].sort((a, b) => getWeight(a) - getWeight(b));
}

/**
 * Helper to get the next day string YYYY-MM-DD.
 */
export function getNextDayStr(dateStr: string): string {
  if (!dateStr) return "";
  const [yyyy, mm, dd] = dateStr.split("-").map(Number);
  const d = new Date(Date.UTC(yyyy, mm - 1, dd + 1));
  return d.toISOString().split("T")[0];
}

/**
 * Check if military officer is currently on an active absence on a specific date.
 */
export function getMilitarAfastamentoNoDia(
  militarId: string,
  dataStr: string,
  afastamentos: Afastamento[]
): Afastamento | null {
  const targetDate = new Date(dataStr + "T00:00:00").getTime();

  for (const af of afastamentos) {
    if (af.militarId !== militarId) continue;

    const start = new Date(af.dataInicio + "T00:00:00").getTime();
    const end = new Date(af.dataFim + "T23:59:59").getTime();

    if (targetDate >= start && targetDate <= end) {
      return af;
    }
  }
  return null;
}

/**
 * Helper to determine if an absence is Group 1 (Férias, Licença Prêmio, LTS).
 * Group 1: Returns to scale immediately on the day after dataFim (D+1).
 */
export function isAfastamentoGrupo1(af: Afastamento): boolean {
  const tipoUpper = (af.tipo || "").toUpperCase();
  const descUpper = (af.descricao || "").toUpperCase();

  return (
    tipoUpper === "FERIAS" ||
    tipoUpper === "LICENCA_PREMIO" ||
    tipoUpper === "LTS" ||
    descUpper.includes("FÉRIAS") ||
    descUpper.includes("FERIAS") ||
    descUpper.includes("LICENÇA PRÊMIO") ||
    descUpper.includes("LICENCA PREMIO") ||
    descUpper.includes("LTS")
  );
}

/**
 * Helper to determine if an absence requires a mandatory 24h rest upon completion (Group 2).
 * Group 1: Férias, Licença Prêmio, LTS -> No 24h rest required (return on D+1).
 * Group 2: Patrulha Rural, Cursos, Reforço, Outro -> Mandatory 24h rest before returning to scale.
 */
export function isAfastamentoComDescanso24h(af: Afastamento): boolean {
  if (af.is_fatiguing) return true;
  if (isAfastamentoGrupo1(af)) return false;
  return true;
}

/**
 * Get previous finish timestamp for a military officer considering past services
 * and fatiguing activities (Cursos/Patrulha Rural/Outros).
 * Uses <= targetStartTimeMs so a shift ending at 08:00 is properly factored into rest calculations at 08:00!
 */
export function getUltimoHorarioTerminoServicoOuAtividade(
  militarId: string,
  targetStartTimeMs: number,
  escalas: EscalaItem[],
  afastamentos: Afastamento[],
  postos?: PostoServico[]
): { endTimeMs: number; origem: "SERVICO" | "AFASTAMENTO_FATIGANTE"; descricao?: string } | null {
  let latestEndTimeMs = 0;
  let origem: "SERVICO" | "AFASTAMENTO_FATIGANTE" = "SERVICO";
  let descricao = "";

  // 1. Check past scale items for this militar ending BEFORE OR AT targetStartTimeMs
  for (const item of escalas) {
    if (item.militarId === militarId && item.endTimeMs <= targetStartTimeMs) {
      // Exclude expediente shifts from 24h operational rest calculations
      if (postos) {
        const p = postos.find((posto) => posto.id === item.postoId);
        if (p && p.tipoHorario === "expediente") {
          continue; // Expediente shifts do not count as 24h operational service
        }
      }

      if (item.endTimeMs > latestEndTimeMs) {
        latestEndTimeMs = item.endTimeMs;
        origem = "SERVICO";
        descricao = `Serviço anterior em ${formatDateBr(item.data)}`;
      }
    }
  }

  // 2. Check Group 2 absences (Patrulha Rural / Cursos / Outros) requiring 24h rest ending BEFORE OR AT targetStartTimeMs
  for (const af of afastamentos) {
    if (af.militarId === militarId && isAfastamentoComDescanso24h(af)) {
      const horaFimStr = af.horaFim || "08:00";
      const afEndTimeMs = new Date(`${af.dataFim}T${horaFimStr}:00`).getTime();

      if (afEndTimeMs <= targetStartTimeMs && afEndTimeMs > latestEndTimeMs) {
        latestEndTimeMs = afEndTimeMs;
        origem = "AFASTAMENTO_FATIGANTE";
        descricao = `${af.descricao || af.tipo.replace("_", " ")} encerrado em ${formatDateBr(af.dataFim)} às ${horaFimStr}`;
      }
    }
  }

  if (latestEndTimeMs === 0) return null;

  return { endTimeMs: latestEndTimeMs, origem, descricao };
}

/**
  * Validate scale assignment rules for a given slot.
  * Returns array of alerts (Hard Blocks or Warnings).
  */
export function validarRegrasEscala(
  militar: Militar,
  posto: PostoServico,
  dataStr: string,
  startTimeMs: number,
  endTimeMs: number,
  todasEscalas: EscalaItem[],
  afastamentos: Afastamento[],
  ignorarEscalaItemId?: string,
  postos?: PostoServico[]
): AlertaEscala[] {
  const alertas: AlertaEscala[] = [];

  if (militar.id === "REFORCO_EXTRAORDINARIO" || militar.id === "VAZIO") {
    return alertas;
  }

  // 1. Check CNH for driver roles
  if (posto.requerCnh && !militar.cnhAtiva) {
    alertas.push({
      militarId: militar.id,
      data: dataStr,
      postoId: posto.id,
      tipo: "MOTORISTA_SEM_CNH",
      mensagem: `O militar ${militar.graduacao} ${militar.nomeGuerra} não possui CNH ativa cadastrada para a função de Motorista.`
    });
  }

  // 2. Check if military is on absence (Férias, Licença, Curso, Patrulha)
  const afastamentoAtivo = getMilitarAfastamentoNoDia(militar.id, dataStr, afastamentos);
  if (afastamentoAtivo) {
    alertas.push({
      militarId: militar.id,
      data: dataStr,
      postoId: posto.id,
      tipo: "INDISPONIVEL_AFASTADO",
      mensagem: `Militar indisponível: Em ${afastamentoAtivo.tipo.replace("_", " ")} no período de ${formatDateBr(afastamentoAtivo.dataInicio)} a ${formatDateBr(afastamentoAtivo.dataFim)}.`
    });
  }

  // Filter out current scale item if editing/validating swap
  const escalasFiltradas = todasEscalas.filter((item) => item.id !== ignorarEscalaItemId);

  // 3. Check for double booking on the exact same time slot
  const conflitoMesmoHorario = escalasFiltradas.find(
    (item) =>
      item.militarId === militar.id &&
      item.data === dataStr &&
      ((startTimeMs >= item.startTimeMs && startTimeMs < item.endTimeMs) ||
        (endTimeMs > item.startTimeMs && endTimeMs <= item.endTimeMs) ||
        (startTimeMs <= item.startTimeMs && endTimeMs >= item.endTimeMs))
  );

  if (conflitoMesmoHorario) {
    alertas.push({
      militarId: militar.id,
      data: dataStr,
      postoId: posto.id,
      tipo: "BLOQUEIO_24H",
      mensagem: `BLOQUEIO: O militar já está escalado no posto em ${formatDateBr(dataStr)} em horário sobreposto.`
    });
  }

  // 4. RULE BRANCHING: EXPEDIENTE VS OPERATIONAL 24H
  const isExpediente = posto.tipoHorario === "expediente";

  if (isExpediente) {
    // EXPEDIENTE SPECIFIC RULE:
    // O militar escalado como expediente não entra na regra das 24 horas de serviço.
    // Única regra: não pode ultrapassar 8 horas de expediente diário.

    let totalHorasExpedienteNoDia = (endTimeMs - startTimeMs) / (1000 * 60 * 60);

    const listaPostos = postos || [];
    for (const item of escalasFiltradas) {
      if (item.militarId === militar.id && item.data === dataStr) {
        const itemPosto = listaPostos.find((p) => p.id === item.postoId);
        if (itemPosto && itemPosto.tipoHorario === "expediente") {
          const itemDuracaoHoras = (item.endTimeMs - item.startTimeMs) / (1000 * 60 * 60);
          totalHorasExpedienteNoDia += itemDuracaoHoras;
        }
      }
    }

    if (totalHorasExpedienteNoDia > 8.01) {
      alertas.push({
        militarId: militar.id,
        data: dataStr,
        postoId: posto.id,
        tipo: "BLOQUEIO_24H",
        mensagem: `BLOQUEIO EXPEDIENTE: A carga horária de expediente do militar em ${formatDateBr(dataStr)} é de ${totalHorasExpedienteNoDia.toFixed(1)}h, ultrapassando o limite máximo legal de 8 horas diárias.`,
        detalheHorasDescanso: Math.round(totalHorasExpedienteNoDia)
      });
    }

    // Expediente does NOT evaluate 24h rest blocks or 72h/96h rotation rest warnings
  } else {
    // OPERATIONAL 24H / CUSTOM SHIFT REST INTERVAL CALCULATION
    const ultimoServico = getUltimoHorarioTerminoServicoOuAtividade(
      militar.id,
      startTimeMs,
      escalasFiltradas,
      afastamentos,
      postos
    );

    if (ultimoServico) {
      const horasDescanso = (startTimeMs - ultimoServico.endTimeMs) / (1000 * 60 * 60);

      // Hard Constraint: Absolute Minimum 24h rest
      if (horasDescanso < 23.9) {
        const horasFormatadas = horasDescanso.toFixed(1);
        alertas.push({
          militarId: militar.id,
          data: dataStr,
          postoId: posto.id,
          tipo: "BLOQUEIO_24H",
          mensagem: `BLOQUEIO ABSOLUTO (Hard Constraint): VEDADO escalar militar com apenas ${horasFormatadas}h de descanso. Exigido mínimo de 24h de descanso após o último serviço operacional/atividade. (${ultimoServico.descricao})`,
          detalheHorasDescanso: Math.round(horasDescanso)
        });
      }
      // Soft Constraint: Alert if rest < 72h
      else if (horasDescanso < 71.9) {
        const horasFormatadas = Math.round(horasDescanso);
        alertas.push({
          militarId: militar.id,
          data: dataStr,
          postoId: posto.id,
          tipo: "ALERTA_72H",
          mensagem: `Aviso de Descanso: Intervalo de ${horasFormatadas}h de folga (o padrão recomendado é de 72h).`,
          detalheHorasDescanso: horasFormatadas
        });
      }
      // Soft Constraint: Alert if rest > 96h (Ociosidade)
      else if (horasDescanso > 96) {
        const horasFormatadas = Math.round(horasDescanso);
        alertas.push({
          militarId: militar.id,
          data: dataStr,
          postoId: posto.id,
          tipo: "ALERTA_96H",
          mensagem: `Aviso de Ociosidade: O militar está há ${horasFormatadas}h sem serviço (superior a 96h).`,
          detalheHorasDescanso: horasFormatadas
        });
      }
    }
  }

  return alertas;
}

/**
 * Helper to calculate a deterministic 4-day modulo cycle for a YYYY-MM-DD date.
 */
export function getDayModulo4(dateStr: string): number {
  if (!dateStr) return 0;
  const [yyyy, mm, dd] = dateStr.split("-").map(Number);
  const d = new Date(Date.UTC(yyyy, mm - 1, dd));
  const days = Math.floor(d.getTime() / (1000 * 60 * 60 * 24));
  return ((days % 4) + 4) % 4;
}

/**
 * Identify military officers who fall due on a specific date in the 24x72 rotation cycle.
 */
export function getMilitaresDoTurnoNoDia(
  dataStr: string,
  militares: Militar[],
  historicoEscalas: EscalaItem[],
  afastamentos: Afastamento[]
): Militar[] {
  const targetDayMod = getDayModulo4(dataStr);
  const startTimeMs = new Date(`${dataStr}T08:00:00`).getTime();

  // Active 24h operational officers
  const militares24h = militares.filter((m) => {
    if (!m.ativo) return false;
    // Must not be on leave on dataStr
    if (getMilitarAfastamentoNoDia(m.id, dataStr, afastamentos)) return false;
    return true;
  });

  interface CandidatoTurno {
    militar: Militar;
    categoria: number; // 1 = Atrasado/Pendente (folga 72h-96h+ não escalado na data sugerida), 2 = Turno do Dia (modulo match), 3 = Outros disponíveis
    restHours: number;
  }

  const candidatos: CandidatoTurno[] = [];

  militares24h.forEach((m, idx) => {
    // 1. Calculate rest hours since last 24h operational shift or fatigue activity
    const ult = getUltimoHorarioTerminoServicoOuAtividade(m.id, startTimeMs, historicoEscalas, afastamentos);
    let restHours = 999;
    if (ult) {
      restHours = (startTimeMs - ult.endTimeMs) / 3600000;
    }

    // STRICT 72H REST RULE FOR AUTO-SUGGESTION AND PROJECTION:
    // If the officer has rested less than 71.9 hours since their last shift,
    // they are in MANDATORY 72H REST (folga regulamentar).
    // Under NO CIRCUMSTANCES can they be suggested or projected on this day!
    if (restHours < 71.9) {
      return;
    }

    // 2. Determine 24x72 rotation modulo
    const pastShifts = historicoEscalas
      .filter((e) => e.militarId === m.id && (e.endTimeMs - e.startTimeMs > 12000000))
      .sort((a, b) => b.startTimeMs - a.startTimeMs);

    let turnMod = idx % 4;
    if (pastShifts.length > 0) {
      turnMod = getDayModulo4(pastShifts[0].data);
    }

    const eTurnoDoDia = turnMod === targetDayMod;

    // 3. Categorize candidate for prioritization:
    // Category 1: Officer was due for service (restHours >= 71.9h) on a previous day/turn,
    // but was NOT scheduled in the manual scale. They MUST be prioritized for the next available scale date (within 72h-96h+ window).
    if (restHours >= 72.0 && !eTurnoDoDia && pastShifts.length > 0) {
      candidatos.push({
        militar: m,
        categoria: 1, // Pending/skipped officer with 72h+ rest waiting for scale inclusion
        restHours
      });
    } else if (eTurnoDoDia) {
      candidatos.push({
        militar: m,
        categoria: 2, // Standard turn match
        restHours
      });
    } else {
      candidatos.push({
        militar: m,
        categoria: 3, // Other available officers
        restHours
      });
    }
  });

  // Sort candidates:
  // Primary: Categoria (1 = skipped/pending 72h-96h, 2 = standard turn, 3 = available)
  // Secondary for Categoria 1: Highest rest hours first (most overdue / closest to 96h), then seniority
  // Secondary for Categoria 2 & 3: Seniority (antiguidadeOrdem)
  candidatos.sort((a, b) => {
    if (a.categoria !== b.categoria) {
      return a.categoria - b.categoria;
    }
    if (a.categoria === 1) {
      if (Math.abs(b.restHours - a.restHours) > 1) {
        return b.restHours - a.restHours;
      }
      return a.militar.antiguidadeOrdem - b.militar.antiguidadeOrdem;
    }
    return a.militar.antiguidadeOrdem - b.militar.antiguidadeOrdem;
  });

  return candidatos.map((c) => c.militar);
}

/**
  * Seniority & Aptitude Algorithm Suggester
  */
export function sugerirMilitarParaPosto(
  posto: PostoServico,
  dataStr: string,
  startTimeMs: number,
  endTimeMs: number,
  militares: Militar[],
  escalasExistentes: EscalaItem[],
  afastamentos: Afastamento[]
): { sugerido: Militar | null; razao: string } {
  // 1. Fixed Expediente assignment
  if (posto.tipoHorario === "expediente" && posto.militarDesignadoId) {
    const af = getMilitarAfastamentoNoDia(posto.militarDesignadoId, dataStr, afastamentos);
    if (af) {
      return {
        sugerido: null,
        razao: `Militar designado está em ${af.tipo.replace("_", " ")}. Requer reforço.`
      };
    }
    const des = militares.find((m) => m.id === posto.militarDesignadoId && m.ativo);
    if (des) {
      return {
        sugerido: des,
        razao: `Militar Designado Fixo para Expediente: ${des.graduacao} ${des.nomeGuerra}`
      };
    }
  }

  // 2. Operational 24h posts based on 24x72 turn sequence
  const dueMilitares = getMilitaresDoTurnoNoDia(dataStr, militares, escalasExistentes, afastamentos);

  // Exclude officers already assigned to another post on dataStr
  const jaEscaladosNoDia = escalasExistentes
    .filter((e) => e.data === dataStr)
    .map((e) => e.militarId);

  const dueMilitaresDisponiveis = dueMilitares.filter((m) => !jaEscaladosNoDia.includes(m.id));

  if (posto.sigla.includes("CMT") || posto.nome.toLowerCase().includes("comandante")) {
    if (dueMilitaresDisponiveis.length >= 1) {
      const cmt = dueMilitaresDisponiveis[0];
      return {
        sugerido: cmt,
        razao: `Sugerido para Comandante da GU (72h-96h folga): ${cmt.graduacao} ${cmt.nomeGuerra}`
      };
    } else {
      return {
        sugerido: null,
        razao: "Nenhum militar com folga mínima de 72h disponível para Comandante da GU nesta data."
      };
    }
  }

  if (posto.sigla.includes("MOTORISTA") || posto.nome.toLowerCase().includes("motorista")) {
    if (dueMilitaresDisponiveis.length >= 1) {
      const mot = dueMilitaresDisponiveis.find((m) => m.cnhAtiva) || dueMilitaresDisponiveis[0];
      if (mot) {
        return {
          sugerido: mot,
          razao: `Sugerido para Motorista (72h-96h folga): ${mot.graduacao} ${mot.nomeGuerra}`
        };
      }
    }
    return {
      sugerido: null,
      razao: `Motorista não preenchido: Nenhum militar com folga mínima de 72h disponível sem escala.`
    };
  }

  if (posto.sigla.includes("PATRULHEIRO") || posto.nome.toLowerCase().includes("patrulheiro")) {
    if (dueMilitares.length > 2 && dueMilitaresDisponiveis.length >= 1) {
      const pat = dueMilitaresDisponiveis[0];
      return {
        sugerido: pat,
        razao: `Sugerido para Patrulheiro: 3º militar disponível no dia (${pat.graduacao} ${pat.nomeGuerra})`
      };
    } else {
      return {
        sugerido: null,
        razao: `Posto Patrulheiro não preenchido: O Patrulheiro só é escalado quando há mais de 2 militares disponíveis no mesmo dia (hoje há ${dueMilitares.length} disponíveis com 72h+ de folga).`
      };
    }
  }

  // Fallback
  if (dueMilitaresDisponiveis.length > 0) {
    const esc = dueMilitaresDisponiveis[0];
    return {
      sugerido: esc,
      razao: `Sugerido por rotação/recomposição do turno 24x72: ${esc.graduacao} ${esc.nomeGuerra}`
    };
  }

  return {
    sugerido: null,
    razao: "Nenhum militar disponível com folga mínima de 72h para este posto nesta data."
  };
}

/**
  * Automated Future Week / Month Projection Engine
  * Takes the validated base week and projects subsequent operational weeks (Tuesday-Monday).
  */
export function projetarEscalasSemanais(
  baseEscalas: EscalaItem[],
  dataInicioTercaProjecao: string,
  semanasQuantidade: number,
  militares: Militar[],
  postos: PostoServico[],
  afastamentos: Afastamento[],
  unidadeId: string
): EscalaItem[] {
  const novasEscalas: EscalaItem[] = [];
  const historicoEscalasCompleto = [...baseEscalas];

  // Identify all manual scale items (not projected) for this unit
  const manualEscalasUnidade = baseEscalas.filter(
    (e) => e.unidadeId === unidadeId && e.status !== "projetada" && !e.id.startsWith("proj-")
  );

  const datasComEscalaManual = new Set(manualEscalasUnidade.map((e) => e.data));

  let ultimaDataManualStr = "";
  if (manualEscalasUnidade.length > 0) {
    ultimaDataManualStr = manualEscalasUnidade.reduce(
      (max, e) => (e.data > max ? e.data : max),
      ""
    );
  }

  // Postos ativos na ordem oficial: Comandante, Motorista, Patrulheiro, Expediente
  const postosAtivos = sortPostosEmOrdemOficial(
    postos.filter((p) => p.unidadeId === unidadeId && p.ativo)
  );

  const postCmt = postosAtivos.find(
    (p) => p.tipoHorario === "24h" && (p.sigla.includes("CMT") || p.nome.toLowerCase().includes("comandante"))
  );
  const postMot = postosAtivos.find(
    (p) => p.tipoHorario === "24h" && (p.sigla.includes("MOTORISTA") || p.nome.toLowerCase().includes("motorista"))
  );
  const postPat = postosAtivos.find(
    (p) => p.tipoHorario === "24h" && (p.sigla.includes("PATRULHEIRO") || p.nome.toLowerCase().includes("patrulheiro"))
  );
  const postExp = postosAtivos.find((p) => p.tipoHorario === "expediente");

  let dataTercaAtual = new Date(dataInicioTercaProjecao + "T12:00:00");

  for (let s = 0; s < semanasQuantidade; s++) {
    const semanaInfo = getOperationalWeekForDate(
      dataTercaAtual.toISOString().split("T")[0]
    );

    for (const diaObj of semanaInfo.dias) {
      const dataStr = diaObj.data;

      // CRUCIAL RULE:
      // If this date has any manual scale entry OR falls within the manually launched scale period (<= ultimaDataManualStr),
      // DO NOT project or inject any military officer onto this date.
      // The manual scale serves as the reference for projecting from the day after onwards.
      if (datasComEscalaManual.has(dataStr) || (ultimaDataManualStr && dataStr <= ultimaDataManualStr)) {
        continue;
      }

      // 1. Handle Expediente Post (Mon-Fri) - Only project if no manual entry exists
      if (postExp && !diaObj.isFimDeSemana) {
        const startH = postExp.horaInicio || "07:30";
        const duracao = postExp.duracaoHoras || 8;
        const startMs = new Date(`${dataStr}T${startH}:00`).getTime();
        const endMs = startMs + duracao * 60 * 60 * 1000;

        if (postExp.militarDesignadoId) {
          const af = getMilitarAfastamentoNoDia(postExp.militarDesignadoId, dataStr, afastamentos);
          const militarIdEscolhido = af ? "REFORCO_EXTRAORDINARIO" : postExp.militarDesignadoId;
          const obs = af
            ? `Substituído por reforço devido a ${af.tipo.replace("_", " ")}`
            : "Lançado no Expediente conforme designação da função";

          const novoSlot: EscalaItem = {
            id: `proj-${dataStr}-${postExp.id}`,
            unidadeId,
            data: dataStr,
            postoId: postExp.id,
            militarId: militarIdEscolhido,
            startTimeMs: startMs,
            endTimeMs: endMs,
            isPermuta: false,
            isAjuste: false,
            status: "projetada",
            observacoes: obs
          };
          novasEscalas.push(novoSlot);
          historicoEscalasCompleto.push(novoSlot);
        }
      }

      // Get all scale items already present on dataStr for this unit
      const escalasNoDia = historicoEscalasCompleto.filter(
        (e) => e.unidadeId === unidadeId && e.data === dataStr
      );

      // 2. Handle 24h Operational Posts based on 24x72 turn sequence
      const dueMilitares = getMilitaresDoTurnoNoDia(
        dataStr,
        militares,
        historicoEscalasCompleto,
        afastamentos
      );

      const startH24 = "08:00";
      const startMs24 = new Date(`${dataStr}T${startH24}:00`).getTime();
      const endMs24 = startMs24 + 24 * 60 * 60 * 1000;

      let cmtMilitar: Militar | null = null;
      let motMilitar: Militar | null = null;
      let patMilitar: Militar | null = null;

      // Helper to check if a militar is already allocated on dataStr in this unit
      const isMilitarJaAlocadoNoDia = (militarId: string) => {
        return (
          (cmtMilitar && cmtMilitar.id === militarId) ||
          (motMilitar && motMilitar.id === militarId) ||
          (patMilitar && patMilitar.id === militarId) ||
          escalasNoDia.some((e) => e.militarId === militarId)
        );
      };

      // A) Comandante da GU
      if (postCmt) {
        const dispCmt = dueMilitares.filter((m) => !isMilitarJaAlocadoNoDia(m.id));
        if (dispCmt.length >= 1) {
          cmtMilitar = dispCmt[0];
          const novoSlot: EscalaItem = {
            id: `proj-${dataStr}-${postCmt.id}`,
            unidadeId,
            data: dataStr,
            postoId: postCmt.id,
            militarId: cmtMilitar.id,
            startTimeMs: startMs24,
            endTimeMs: endMs24,
            isPermuta: false,
            isAjuste: false,
            status: "projetada",
            observacoes: `Escalado como Comandante da GU por Antiguidade (${cmtMilitar.graduacao} ${cmtMilitar.nomeGuerra})`
          };
          novasEscalas.push(novoSlot);
          historicoEscalasCompleto.push(novoSlot);
          escalasNoDia.push(novoSlot);
        }
      }

      // B) Motorista
      if (postMot) {
        const dispMot = dueMilitares.filter((m) => !isMilitarJaAlocadoNoDia(m.id));
        if (dispMot.length >= 1) {
          motMilitar = dispMot.find((m) => m.cnhAtiva) || dispMot[0];
          const novoSlot: EscalaItem = {
            id: `proj-${dataStr}-${postMot.id}`,
            unidadeId,
            data: dataStr,
            postoId: postMot.id,
            militarId: motMilitar.id,
            startTimeMs: startMs24,
            endTimeMs: endMs24,
            isPermuta: false,
            isAjuste: false,
            status: "projetada",
            observacoes: `Escalado como Motorista (${motMilitar.graduacao} ${motMilitar.nomeGuerra})`
          };
          novasEscalas.push(novoSlot);
          historicoEscalasCompleto.push(novoSlot);
          escalasNoDia.push(novoSlot);
        }
      }

      // C) Patrulheiro -> STRICT RULE: ONLY IF MORE THAN 2 MILITARES FALL ON DUTY ON THIS DAY!
      if (postPat && dueMilitares.length > 2) {
        const dispPat = dueMilitares.filter((m) => !isMilitarJaAlocadoNoDia(m.id));
        if (dispPat.length >= 1) {
          patMilitar = dispPat[0];
          const novoSlot: EscalaItem = {
            id: `proj-${dataStr}-${postPat.id}`,
            unidadeId,
            data: dataStr,
            postoId: postPat.id,
            militarId: patMilitar.id,
            startTimeMs: startMs24,
            endTimeMs: endMs24,
            isPermuta: false,
            isAjuste: false,
            status: "projetada",
            observacoes: `Posto de Patrulheiro preenchido devido a enquadramento de 3 ou mais militares no mesmo dia (${patMilitar.graduacao} ${patMilitar.nomeGuerra})`
          };
          novasEscalas.push(novoSlot);
          historicoEscalasCompleto.push(novoSlot);
          escalasNoDia.push(novoSlot);
        }
      }
    }

    // Move to next Tuesday (7 days)
    dataTercaAtual.setDate(dataTercaAtual.getDate() + 7);
  }

  return novasEscalas;
}

/**
 * Automatically launches a designated militar into Expediente scale slots for weekdays (Monday through Friday).
 */
export function lancarMilitarExpedienteAutomatico(
  posto: PostoServico,
  militarId: string,
  escalasAtuais: EscalaItem[],
  afastamentos: Afastamento[],
  unidadeId: string
): EscalaItem[] {
  const startH = posto.horaInicio || "07:30";
  const duracao = posto.duracaoHoras || 8;

  // Extract all unique dates present in current escalas or default week
  const datasUnicas = Array.from(new Set(escalasAtuais.map((e) => e.data))).sort();

  let novasEscalas = [...escalasAtuais];

  datasUnicas.forEach((dataStr) => {
    const dow = new Date(dataStr + "T12:00:00").getDay();
    // Skip weekends for Expediente
    if (dow === 0 || dow === 6) return;

    // Check if militar is on leave/absence
    const afastamento = getMilitarAfastamentoNoDia(militarId, dataStr, afastamentos);
    const militarParaAlocar = afastamento ? "REFORCO_EXTRAORDINARIO" : militarId;

    const startMs = new Date(`${dataStr}T${startH}:00`).getTime();
    const endMs = startMs + duracao * 60 * 60 * 1000;

    const itemExistenteIndex = novasEscalas.findIndex(
      (e) => e.unidadeId === unidadeId && e.data === dataStr && e.postoId === posto.id
    );

    if (itemExistenteIndex >= 0) {
      novasEscalas[itemExistenteIndex] = {
        ...novasEscalas[itemExistenteIndex],
        militarId: militarParaAlocar,
        startTimeMs: startMs,
        endTimeMs: endMs,
        status: "efetivada",
        observacoes: afastamento
          ? `Substituído por reforço devido a ${afastamento.tipo}`
          : "Lançado automaticamente via Gestão de Posto do Expediente"
      };
    } else {
      novasEscalas.push({
        id: `auto-exp-${dataStr}-${posto.id}`,
        unidadeId,
        data: dataStr,
        postoId: posto.id,
        militarId: militarParaAlocar,
        startTimeMs: startMs,
        endTimeMs: endMs,
        isPermuta: false,
        isAjuste: false,
        status: "efetivada",
        observacoes: "Lançado automaticamente via Gestão de Posto do Expediente"
      });
    }
  });

  return novasEscalas;
}

/**
 * Sweeps all assigned slots in a unit and evaluates rule compliance,
 * returning a structured list of active conflicts and rest violations.
 */
export function obterTodosConflitosEscala(
  unidadeId: string,
  escalas: EscalaItem[],
  militares: Militar[],
  postos: PostoServico[],
  afastamentos: Afastamento[]
): ItemConflito[] {
  const conflitos: ItemConflito[] = [];
  const escalasUnidade = escalas.filter((e) => e.unidadeId === unidadeId);

  for (const item of escalasUnidade) {
    if (item.militarId === "REFORCO_EXTRAORDINARIO" || item.militarId === "VAZIO") continue;

    const militar = militares.find((m) => m.id === item.militarId);
    const posto = postos.find((p) => p.id === item.postoId);

    if (!militar || !posto) continue;

    const startMs = item.startTimeMs || new Date(`${item.data}T${posto.horaInicio || "08:00"}:00`).getTime();
    const endMs = item.endTimeMs || (startMs + (posto.duracaoHoras || 24) * 3600000);

    const alertas = validarRegrasEscala(
      militar,
      posto,
      item.data,
      startMs,
      endMs,
      escalas,
      afastamentos,
      item.id,
      postos
    );

    for (const a of alertas) {
      let gravidade: "CRITICO" | "ALERTA" | "OCIOSIDADE" = "ALERTA";
      if (a.tipo === "BLOQUEIO_24H" || a.tipo === "INDISPONIVEL_AFASTADO" || a.tipo === "MOTORISTA_SEM_CNH") {
        gravidade = "CRITICO";
      } else if (a.tipo === "ALERTA_96H") {
        gravidade = "OCIOSIDADE";
      }

      conflitos.push({
        id: `conf-${item.id}-${a.tipo}`,
        escalaItem: item,
        militar,
        posto,
        data: item.data,
        alerta: a,
        nivelGravidade: gravidade
      });
    }
  }


  // Sort by gravity (CRITICO first) then by date ascending
  return conflitos.sort((a, b) => {
    if (a.nivelGravidade === "CRITICO" && b.nivelGravidade !== "CRITICO") return -1;
    if (a.nivelGravidade !== "CRITICO" && b.nivelGravidade === "CRITICO") return 1;
    return a.data.localeCompare(b.data);
  });
}

/**
 * Calculates the Informativo Number dynamically according to PMMT rules:
 * - Base week: 04/08/2026 to 10/08/2026 -> Informativo 83/2026 17º BPM/NPM DE CURVELÂNDIA
 * - Sequential weeks in 2026 increment by +1 (e.g. 84/2026, 85/2026...)
 * - Year is derived from the week's Tuesday start date.
 * - On year rollover (e.g. 2027), the number resets to 1 for the first Tuesday of that year.
 */
export function calcularInformativoNumero(
  dataTercaStr: string,
  unidadeInformativoStr?: string
): string {
  if (!dataTercaStr) return "83/2026 17º BPM/NPM DE CURVELANDIA";

  const terca = new Date(dataTercaStr + "T12:00:00");
  const ano = terca.getFullYear();

  // Extract base number for 2026 if available in stored template (default 83)
  let baseNumber2026 = 83;
  let sufixo = "17º BPM/NPM DE CURVELANDIA";

  if (unidadeInformativoStr) {
    const raw = unidadeInformativoStr.trim();
    // Match leading digits before slash e.g. "83/2026 17º BPM..." or "102/2026 17º BPM"
    const match = raw.match(/^(\d+)\/\d+\s*(.*)$/);
    if (match) {
      baseNumber2026 = parseInt(match[1], 10);
      if (match[2]) {
        sufixo = match[2];
      }
    } else {
      sufixo = raw;
    }
  }

  let numInformativo = 1;

  if (ano === 2026) {
    const baseline2026 = new Date("2026-08-04T12:00:00");
    const diffMs = terca.getTime() - baseline2026.getTime();
    const diffWeeks = Math.round(diffMs / (7 * 24 * 3600 * 1000));
    numInformativo = baseNumber2026 + diffWeeks;
  } else {
    // First Tuesday of year `ano`
    const primeiradataAno = new Date(`${ano}-01-01T12:00:00`);
    const dayOfWeek = primeiradataAno.getDay(); // 0 = Sun, 1 = Mon, 2 = Tue
    const daysUntilTuesday = (2 - dayOfWeek + 7) % 7;
    const primeiraTercaAno = new Date(primeiradataAno);
    primeiraTercaAno.setDate(primeiradataAno.getDate() + daysUntilTuesday);

    const diffMs = terca.getTime() - primeiraTercaAno.getTime();
    const diffWeeks = Math.round(diffMs / (7 * 24 * 3600 * 1000));
    numInformativo = 1 + diffWeeks;
  }

  if (numInformativo < 1) numInformativo = 1;

  return `${numInformativo}/${ano} ${sufixo}`;
}

/**
 * Returns today's date string in YYYY-MM-DD local format.
 */
export function getTodayString(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Determines whether a given scale date is past ("concluida") or active/future ("aberta").
 * - If dataStr < hojeStr: scale day has passed, status is "concluida" (immutable / non-deletable on reset).
 * - If dataStr >= hojeStr: scale day is today or future, status is "aberta" (editable / resettable if projected).
 */
export function obterStatusDiaEscala(
  dataStr: string,
  hojeStr: string = getTodayString()
): "concluida" | "aberta" {
  return dataStr < hojeStr ? "concluida" : "aberta";
}

/**
 * Reajusta a hierarquia de uma guarnição em determinada data.
 * Garante que o militar MAIS ANTIGO da guarnição assuma a função de Comandante da GU,
 * e os demais assumam os postos subsequentes (Motorista, Patrulheiro, etc.),
 * remanejando militares mais modernos se necessário e preservando os metadados de permuta.
 */
export function reajustarHierarquiaGuarnicao(
  escalas: EscalaItem[],
  data: string,
  unidadeId: string,
  militares: Militar[],
  postos: PostoServico[]
): EscalaItem[] {
  // 1. Encontrar todos os itens da escala para o dia e unidade
  const itemsDia = escalas.filter((e) => e.unidadeId === unidadeId && e.data === data);
  if (itemsDia.length <= 1) return escalas;

  // 2. Mapear postos ativos ordenados por hierarquia oficial
  const postosUnidade = sortPostosEmOrdemOficial(
    postos.filter((p) => p.unidadeId === unidadeId && p.ativo)
  );
  const postosOpMap = new Map(postosUnidade.map((p) => [p.id, p]));

  // 3. Filtrar itens da guarnição operacionais de 24h com militar alocado
  const guarnicaoItems = itemsDia.filter((e) => {
    const p = postosOpMap.get(e.postoId);
    return (
      p &&
      p.tipoHorario === "24h" &&
      e.militarId &&
      e.militarId !== "REFORCO_EXTRAORDINARIO"
    );
  });

  if (guarnicaoItems.length <= 1) return escalas;

  // Order guarnicaoItems according to official post priority (Comandante -> Motorista -> Patrulheiro...)
  guarnicaoItems.sort((a, b) => {
    const pa = postosOpMap.get(a.postoId);
    const pb = postosOpMap.get(b.postoId);
    const indexA = pa ? postosUnidade.indexOf(pa) : 999;
    const indexB = pb ? postosUnidade.indexOf(pb) : 999;
    return indexA - indexB;
  });

  // Extract current militaries in the guarnicao and their metadata
  const alocacoes = guarnicaoItems.map((item) => {
    const militar = militares.find((m) => m.id === item.militarId);
    return {
      item,
      militar,
      militarId: item.militarId,
      militarOriginalId: item.militarOriginalId,
      isPermuta: item.isPermuta,
      sigadocPermuta: item.sigadocPermuta,
      isAjuste: item.isAjuste,
      status: item.status,
      observacoes: item.observacoes
    };
  });

  // Sort militaries by seniority (antiguidadeOrdem: smaller number = mais antigo)
  const alocacoesOrdenadasPorSenioridade = [...alocacoes].sort((a, b) => {
    const antA = a.militar ? a.militar.antiguidadeOrdem : 9999;
    const antB = b.militar ? b.militar.antiguidadeOrdem : 9999;
    return antA - antB;
  });

  // Check CNH constraint for Motorista if applicable
  if (guarnicaoItems.length >= 2) {
    const postMot = postosOpMap.get(guarnicaoItems[1].postoId);
    if (
      postMot &&
      (postMot.requerCnh ||
        postMot.sigla.includes("MOTORISTA") ||
        postMot.nome.toLowerCase().includes("motorista"))
    ) {
      const candidateMot = alocacoesOrdenadasPorSenioridade[1];
      if (candidateMot && candidateMot.militar && !candidateMot.militar.cnhAtiva) {
        // Look for next military down the seniority list who has CNH
        const swapIdx = alocacoesOrdenadasPorSenioridade.findIndex(
          (aloc, idx) => idx > 1 && aloc.militar && aloc.militar.cnhAtiva
        );
        if (swapIdx !== -1) {
          const temp = alocacoesOrdenadasPorSenioridade[1];
          alocacoesOrdenadasPorSenioridade[1] = alocacoesOrdenadasPorSenioridade[swapIdx];
          alocacoesOrdenadasPorSenioridade[swapIdx] = temp;
        }
      }
    }
  }

  // Create a mapping from item.id to the new military allocation that should occupy that post
  const novosAtribPorItemId = new Map<string, typeof alocacoes[0]>();
  guarnicaoItems.forEach((itemPosto, idx) => {
    novosAtribPorItemId.set(itemPosto.id, alocacoesOrdenadasPorSenioridade[idx]);
  });

  // Return new scales array with updated items
  return escalas.map((item) => {
    const novaAloc = novosAtribPorItemId.get(item.id);
    if (!novaAloc) return item;

    const postInfo = postosOpMap.get(item.postoId);
    const postNome = postInfo ? postInfo.nome : "Posto";

    let obs = novaAloc.observacoes || "";
    if (novaAloc.item.postoId !== item.postoId) {
      const militarNome = novaAloc.militar
        ? `${novaAloc.militar.graduacao} ${novaAloc.militar.nomeGuerra}`
        : "";
      if (postInfo?.sigla.includes("CMT") || postInfo?.nome.toLowerCase().includes("comandante")) {
        obs = novaAloc.isPermuta
          ? `${obs} (Assumiu Comandante da GU por Antiguidade - ${militarNome})`.trim()
          : `Assumiu Comandante da GU por Antiguidade na guarnição (${militarNome})`;
      } else {
        obs = novaAloc.isPermuta
          ? `${obs} (Remanejado para ${postNome} por Antiguidade)`.trim()
          : `Remanejado para ${postNome} por Antiguidade (${militarNome})`;
      }
    }

    return {
      ...item,
      militarId: novaAloc.militarId,
      militarOriginalId: novaAloc.militarOriginalId,
      isPermuta: novaAloc.isPermuta || false,
      sigadocPermuta: novaAloc.sigadocPermuta,
      isAjuste: novaAloc.isAjuste || false,
      status: novaAloc.status || item.status,
      observacoes: obs
    };
  });
}

