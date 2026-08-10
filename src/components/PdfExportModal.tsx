import React, { useRef } from "react";
import { useReactToPrint } from "react-to-print";
import {
  UnidadeTenant,
  EscalaItem,
  Militar,
  PostoServico,
  Afastamento,
  SemanaOperacional
} from "../types";
import { formatDateBr, getOperationalWeekForDate, sortPostosEmOrdemOficial } from "../utils/rulesEngine";
import { exportElementToPdf } from "../utils/pdfGenerator";
import { Download, Printer, X } from "lucide-react";

interface PdfExportModalProps {
  unidade: UnidadeTenant;
  escalas: EscalaItem[];
  militares: Militar[];
  postos: PostoServico[];
  afastamentos: Afastamento[];
  dataTerca: string;
  onFechar: () => void;
}

export const PdfExportModal: React.FC<PdfExportModalProps> = ({
  unidade,
  escalas,
  militares,
  postos,
  afastamentos,
  dataTerca,
  onFechar
}) => {
  const semanaInfo: SemanaOperacional = getOperationalWeekForDate(dataTerca);
  const cab = unidade.cabecalho;
  const documentRef = useRef<HTMLDivElement>(null);

  const handleImprimir = useReactToPrint({
    contentRef: documentRef,
    documentTitle: `Escala_${unidade.sigla}_${semanaInfo.dataInicioTerca}`
  });

  const postosUnidade = sortPostosEmOrdemOficial(
    postos.filter((p) => p.unidadeId === unidade.id && p.ativo)
  );

  const afastamentosUnidade = afastamentos.filter((a) => a.unidadeId === unidade.id);

  // Permuta observations to list under OBSERVAÇÃO
  const permutasNaSemana = escalas.filter(
    (e) => e.unidadeId === unidade.id && e.isPermuta && e.data >= semanaInfo.dataInicioTerca && e.data <= semanaInfo.dataFimSegunda
  );

  const [gerandoPdf, setGerandoPdf] = React.useState(false);

  const handleBaixarPdf = async () => {
    try {
      setGerandoPdf(true);
      await exportElementToPdf("documento-escala-oficial", `Escala_${unidade.sigla}_${semanaInfo.dataInicioTerca}.pdf`);
    } catch (err) {
      console.error("Erro ao gerar PDF:", err);
      alert("Ocorreu um erro ao gerar o PDF. Você também pode clicar em 'Imprimir' e selecionar 'Salvar como PDF'.");
    } finally {
      setGerandoPdf(false);
    }
  };

  // Divide the 7 days logically so Page 1 contains days 1-4 (Tue-Fri) and Page 2 contains days 5-7 (Sat-Mon) + Determinações & Signatures
  const diasPage1 = semanaInfo.dias.slice(0, 4);
  const diasPage2 = semanaInfo.dias.slice(4);

  const renderDayBlock = (diaObj: typeof semanaInfo.dias[0]) => {
    const dataStr = diaObj.data;
    const escalaDia = escalas.filter(
      (e) => e.unidadeId === unidade.id && e.data === dataStr
    );

    return (
      <div key={dataStr} className="border border-black text-[11px]" style={{ borderColor: "#000000" }}>
        {/* Day Header */}
        <div
          className="text-center font-bold py-1 border-b border-black uppercase text-[11px]"
          style={{ backgroundColor: "#f1f5f9", borderColor: "#000000" }}
        >
          ESCALA DE SERVIÇO DO DIA {formatDateBr(dataStr)} ({diaObj.diaSemanaNome.split(" ")[0].toUpperCase()})
          <div className="text-[9.5px] font-normal tracking-wide">
            SERVIÇO 24 HORAS – TURNO DAS 08h00min ÀS 08h00min
          </div>
        </div>

        {/* Posts Table */}
        <table className="w-full text-left border-collapse">
          <tbody>
            {postosUnidade.map((posto, idx) => {
              const slot = escalaDia.find((e) => e.postoId === posto.id);
              const m = slot ? militares.find((item) => item.id === slot.militarId) : null;

              // Skip expediente on weekends
              if (posto.tipoHorario === "expediente" && diaObj.isFimDeSemana) return null;

              return (
                <tr
                  key={posto.id}
                  className="border-b last:border-b-0 border-black"
                  style={{
                    borderColor: "#000000",
                    backgroundColor: idx % 2 === 0 ? "#ffffff" : "#fcfcfc"
                  }}
                >
                  <td
                    className="p-1.5 font-bold w-1/3 uppercase text-[10px] border-r border-black"
                    style={{ borderColor: "#000000", backgroundColor: "#f8fafc" }}
                  >
                    {posto.sigla}
                  </td>
                  <td className="p-1.5 w-1/2 font-bold uppercase border-r border-black" style={{ borderColor: "#000000" }}>
                    {m ? (
                      `${m.graduacao} ${m.nomeGuerra}`
                    ) : slot?.militarId === "REFORCO_EXTRAORDINARIO" ? (
                      "REFORÇO EXTRAORDINÁRIO"
                    ) : (
                      "----------------"
                    )}
                  </td>
                  <td className="p-1.5 w-1/4 font-mono font-bold text-right uppercase">
                    {m ? `RG ${m.rgPmmt}` : "----------"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto">
      <div className="bg-slate-900 rounded-xl shadow-2xl border border-slate-800 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden my-auto">
        {/* Modal Top Header (Hidden on print) */}
        <div className="bg-slate-950 text-white px-5 py-3.5 flex items-center justify-between border-b border-slate-800 shrink-0 no-print">
          <div className="flex items-center gap-2">
            <img src="https://i.ibb.co/FqLxFKqG/logo-17bpm-removebg-preview.png" alt="Logo" className="w-5 h-5 object-contain" referrerPolicy="no-referrer" />
            <h3 className="font-bold text-sm">Espelho Oficial da Escala de Serviço (PDF)</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleImprimir()}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs px-3 py-1.5 rounded-lg transition-colors cursor-pointer border border-slate-700"
              title="Imprimir diretamente ou Salvar via Impressora do Sistema"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir / Salvar PDF</span>
            </button>
            <button
              onClick={handleBaixarPdf}
              disabled={gerandoPdf}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer shadow-md disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{gerandoPdf ? "Gerando PDF..." : "Baixar Arquivo PDF"}</span>
            </button>
            <button onClick={onFechar} className="text-slate-400 hover:text-white p-1 cursor-pointer ml-2">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Document Container Preview */}
        <div className="p-4 sm:p-8 overflow-y-auto bg-slate-950/90 flex justify-center">
          <div
            id="documento-escala-oficial"
            ref={documentRef}
            className="w-full max-w-[800px] flex flex-col items-center gap-8 font-sans"
            style={{ fontFamily: "'Arial', 'Helvetica', sans-serif" }}
          >
            {/* =========================================================================
                PAGE 1 SHEET: OFFICIAL HEADER, INFORMATIVO & DIAS 1 A 4 (TERÇA A SEXTA)
               ========================================================================= */}
            <div
              className="pdf-page-sheet bg-white text-black p-6 sm:p-8 w-full shadow-2xl border border-slate-300 flex flex-col justify-between"
              data-pdf-page="1"
              style={{
                backgroundColor: "#ffffff",
                color: "#000000",
                boxSizing: "border-box"
              }}
            >
              <div className="space-y-3">
                {/* Official Header */}
                <div className="text-center space-y-1 pb-2 border-b-2 border-black" style={{ borderColor: "#000000" }}>
                  {cab.logoUrl ? (
                    <img
                      src={cab.logoUrl}
                      alt="Brasão"
                      className="w-12 h-12 mx-auto object-contain mb-1"
                    />
                  ) : (
                    <div className="w-10 h-10 mx-auto bg-slate-100 rounded-full flex items-center justify-center font-bold text-slate-800 text-[10px] border border-black mb-1">
                      PMMT
                    </div>
                  )}
                  <h1 className="font-bold text-xs sm:text-sm uppercase tracking-wide">
                    {cab.governo || "GOVERNO DO ESTADO DE MATO GROSSO"}
                  </h1>
                  <h2 className="font-bold text-[10.5px] sm:text-xs uppercase tracking-wide">
                    {cab.secretaria || "SECRETARIA DE ESTADO DE SEGURANÇA PÚBLICA / POLÍCIA MILITAR"}
                  </h2>
                </div>

                {/* Subheader Box */}
                <div className="border border-black p-1.5 text-center space-y-0.5 bg-slate-50" style={{ borderColor: "#000000", backgroundColor: "#f8fafc" }}>
                  <p className="font-bold text-[10.5px] uppercase">{cab.batalhao || "ESTADO DE MATO GROSSO / POLÍCIA MILITAR"}</p>
                  <p className="font-extrabold text-xs uppercase">{cab.unidade || "NÚCLEO PM DE CURVELÂNDIA"}</p>
                </div>

                {/* Informativo & Comandantes Box */}
                <div className="border border-black text-[10.5px] grid grid-cols-3 divide-x divide-black bg-white" style={{ borderColor: "#000000" }}>
                  <div className="p-1.5 col-span-2 space-y-0.5">
                    <p>
                      <strong>INFORMATIVO Nº {cab.informativoNumero}</strong>
                    </p>
                    <p>Comandante do 17º BPM: <strong>{cab.comandanteBpm}</strong></p>
                    <p>Comandante do NPM: <strong>{cab.comandanteNpm}</strong></p>
                  </div>
                  <div className="p-1.5 flex flex-col items-center justify-center font-bold font-mono bg-slate-50" style={{ backgroundColor: "#f8fafc" }}>
                    <span className="text-[9.5px] text-slate-600 font-sans font-normal">DATA DE INÍCIO</span>
                    <span className="text-xs">{formatDateBr(semanaInfo.dataInicioTerca)}</span>
                  </div>
                </div>

                {/* DAYS 1-4 (Terça, Quarta, Quinta, Sexta) */}
                <div className="space-y-2.5 pt-0.5">
                  {diasPage1.map(renderDayBlock)}
                </div>
              </div>

              {/* Page 1 Footer indicator */}
              <div className="pt-3 text-right text-[9px] text-slate-500 border-t border-slate-200 mt-4">
                Página 1 de 2 - Escala Semanal de Serviço PMMT
              </div>
            </div>

            {/* =========================================================================
                PAGE 2 SHEET: DIAS 5 A 7 (SÁBADO A SEGUNDA) + DETERMINAÇÕES, AFASTAMENTOS & ASSINATURA
               ========================================================================= */}
            <div
              className="pdf-page-sheet bg-white text-black p-6 sm:p-8 w-full shadow-2xl border border-slate-300 flex flex-col justify-between"
              data-pdf-page="2"
              style={{
                backgroundColor: "#ffffff",
                color: "#000000",
                boxSizing: "border-box"
              }}
            >
              <div className="space-y-3">
                {/* PAGE 2 HEADER DE CONTINUAÇÃO */}
                <div className="text-center space-y-0.5 pb-2 border-b-2 border-black" style={{ borderColor: "#000000" }}>
                  <h2 className="font-bold text-[11px] uppercase">{cab.governo || "GOVERNO DO ESTADO DE MATO GROSSO"}</h2>
                  <h3 className="font-bold text-[10px] uppercase">{cab.secretaria || "SECRETARIA DE ESTADO DE SEGURANÇA PÚBLICA / POLÍCIA MILITAR"}</h3>
                  <div className="border border-black bg-slate-100 py-0.5 px-2 font-bold text-[11px] uppercase mt-1 tracking-wide" style={{ borderColor: "#000000", backgroundColor: "#f1f5f9" }}>
                    CONTINUAÇÃO DA ESCALA DE SERVIÇO DA SEMANA OPERACIONAL
                  </div>
                </div>

                {/* DAYS 5-7 (Sábado, Domingo, Segunda) */}
                <div className="space-y-2.5">
                  {diasPage2.map(renderDayBlock)}
                </div>

                {/* DETERMINAÇÕES LIST */}
                <div className="space-y-1">
                  <h4
                    className="font-bold text-[11px] uppercase text-center py-0.5 border border-black"
                    style={{ backgroundColor: "#f1f5f9", borderColor: "#000000" }}
                  >
                    DETERMINAÇÕES
                  </h4>
                  <div className="space-y-1 text-[10px] font-semibold leading-relaxed border border-black p-2 bg-slate-50" style={{ borderColor: "#000000", backgroundColor: "#f8fafc" }}>
                    {cab.determinacoesPadrao.map((det, idx) => (
                      <p key={idx} className="text-justify">{det}</p>
                    ))}
                  </div>
                </div>

                {/* FÉRIAS E LICENÇAS TABLE */}
                <div className="space-y-1">
                  <h4
                    className="font-bold text-[11px] uppercase text-center py-0.5 border border-black"
                    style={{ backgroundColor: "#f1f5f9", borderColor: "#000000" }}
                  >
                    FÉRIAS, LICENÇA PRÊMIO, LTS E OUTROS AFASTAMENTOS
                  </h4>

                  <table className="w-full text-left border-collapse border border-black text-[10.5px]" style={{ borderColor: "#000000" }}>
                    <thead>
                      <tr
                        className="font-bold uppercase text-center border-b border-black"
                        style={{ backgroundColor: "#f8fafc", borderColor: "#000000" }}
                      >
                        <th className="p-1 border-r border-black" style={{ borderColor: "#000000" }}>NOME / MILITAR</th>
                        <th className="p-1 border-r border-black" style={{ borderColor: "#000000" }}>RG PMMT</th>
                        <th className="p-1 border-r border-black" style={{ borderColor: "#000000" }}>PERÍODO</th>
                        <th className="p-1">TIPO</th>
                      </tr>
                    </thead>
                    <tbody>
                      {afastamentosUnidade.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-1.5 text-center italic text-slate-600 font-normal">
                            Nenhum afastamento ou licença cadastrada para o período.
                          </td>
                        </tr>
                      ) : (
                        afastamentosUnidade.map((af) => {
                          const m = militares.find((item) => item.id === af.militarId);
                          return (
                            <tr
                              key={af.id}
                              className="border-b last:border-b-0 border-black text-center font-semibold"
                              style={{ borderColor: "#000000" }}
                            >
                              <td className="p-1 text-left uppercase border-r border-black" style={{ borderColor: "#000000" }}>
                                {m ? `${m.graduacao} ${m.nomeGuerra}` : "N/A"}
                              </td>
                              <td className="p-1 font-mono border-r border-black" style={{ borderColor: "#000000" }}>
                                {m?.rgPmmt || "---"}
                              </td>
                              <td className="p-1 border-r border-black" style={{ borderColor: "#000000" }}>
                                {formatDateBr(af.dataInicio)} À {formatDateBr(af.dataFim)}
                              </td>
                              <td className="p-1 uppercase">{af.tipo.replace("_", " ")}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* OBSERVAÇÃO SECTION */}
                <div className="border border-black p-2 text-[10px] leading-relaxed bg-slate-50" style={{ borderColor: "#000000", backgroundColor: "#f8fafc" }}>
                  <p className="font-bold uppercase mb-0.5">OBSERVAÇÃO / PERMUTAS REGISTRADAS:</p>
                  {permutasNaSemana.length > 0 ? (
                    permutasNaSemana.map((perm) => (
                      <p key={perm.id}>
                        Conforme Sigadoc nº {perm.sigadocPermuta}, autorizada a permuta de serviço
                        referente ao dia {formatDateBr(perm.data)}. {perm.observacoes}
                      </p>
                    ))
                  ) : (
                    <p>
                      Conforme CI nº 22590/2026/NPMCURVL/PM, autorizada por meio do Despacho nº PM-DES-2026/12636,
                      fica registrada a permuta de serviço entre os militares designados conforme registros no sistema.
                    </p>
                  )}
                </div>

                {/* DIGITAL SIGNATURE BOX */}
                <div className="text-center pt-4 space-y-0.5">
                  <div className="w-60 mx-auto border-t border-black mb-1" style={{ borderColor: "#000000" }} />
                  <p className="text-[9.5px] text-slate-600 font-mono font-bold uppercase">
                    DOCUMENTO ASSINADO ELETRONICAMENTE
                  </p>
                  <p className="font-extrabold text-[11px] uppercase">
                    {cab.comandanteNpm || "WANDERLEY CAMPOS PEREIRA – SUB TEN PM"}
                  </p>
                  <p className="text-[10.5px] font-semibold text-slate-800">Comandante do NPM de Curvelândia</p>
                </div>
              </div>

              {/* FOOTER BARCODE & QR CODE VISUAL */}
              <div className="pt-3 flex items-end justify-between text-[9px] text-slate-600 font-mono border-t border-slate-300 mt-4">
                <div>
                  <p>Assinado com senha por {cab.comandanteNpm || "WANDERLEY CAMPOS PEREIRA"} em {formatDateBr(semanaInfo.dataInicioTerca)}</p>
                  <p>Documento Autêntico Nº: 39382239-7938 - Validação em https://sigadoc.mt.gov.br</p>
                </div>
                <div className="text-right font-extrabold text-black flex items-center gap-1">
                  <span className="text-[9.5px]">Página 2 de 2</span>
                  <span className="text-xs font-bold border border-black px-1 ml-1 bg-slate-100">SIGADOC</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
