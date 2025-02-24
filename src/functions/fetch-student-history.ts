import { Page } from "puppeteer";

interface AlunoData {
  nome: string;
  ra: string;
  semestre: string;
  email_institucional: string;
  historico: DisciplinaHistorico[];
}

interface DisciplinaHistorico {
  disciplina: string;
  periodo: string;
  mediaFinal: string;
  frequencia: string;
  observacao: string;
}

export async function fetchStudentHistory(contextPage: Page): Promise<AlunoData | null> {
  try {
    if (!contextPage) {
      throw new Error("Página não disponível");
    }

    // Aguarda a página de dados carregar
    await contextPage.waitForSelector('#span_vPRO_PESSOALEMAIL', { timeout: 5000 });

    // Mapeamento dos seletores para extração de dados do aluno
    const selectors: Record<keyof Omit<AlunoData, "historico">, string> = {
      nome: "#span_MPW0041vPRO_PESSOALNOME",
      ra: "#span_MPW0041vACD_ALUNOCURSOREGISTROACADEMICOCURSO",
      semestre: "#span_MPW0041vACD_ALUNOCURSOCICLOATUAL",
      email_institucional: "#span_MPW0041vINSTITUCIONALFATEC",
    };

    // Extração dos dados básicos do aluno
    const studentData = await contextPage.evaluate((selectors) => {
      return Object.keys(selectors).reduce((acc, key) => {
        const selector = selectors[key as keyof typeof selectors];
        acc[key as keyof typeof selectors] = document.querySelector(selector)?.textContent?.trim() || "Não disponível";
        return acc;
      }, {} as Record<keyof typeof selectors, string>);
    }, selectors);

    console.log("✅ Dados básicos extraídos com sucesso!");

    // ***Navegar para a página de histórico***
    await contextPage.goto('https://siga.cps.sp.gov.br/aluno/historico.aspx', { waitUntil: 'networkidle2' });

    // Aguarda a tabela de histórico aparecer
    await contextPage.waitForSelector('#Grid1ContainerTbl', { timeout: 5000 });

    // Extração do histórico do aluno
    const historico = await contextPage.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('[id^="Grid1ContainerRow_"]'));

      console.log(`🔍 Linhas do histórico encontradas: ${rows.length}`);

      return rows.map(row => {
        const rowId = row.id.split('_')[1]; // Extrai o ID dinâmico

        const disciplina = document.querySelector(`#span_vACD_DISCIPLINANOME_${rowId}`)?.textContent?.trim() || "Não disponível";
        const periodo = document.querySelector(`#span_vACD_ALUNOHISTORICOPERIODOOFERECIMENTOID_${rowId}`)?.textContent?.trim() || "Não disponível";
        const mediaFinal = document.querySelector(`#span_vACD_ALUNOHISTORICOMEDIAFINAL_${rowId}`)?.textContent?.trim() || "Não disponível";
        const frequencia = document.querySelector(`#span_vACD_ALUNOHISTORICOFREQUENCIA_${rowId}`)?.textContent?.trim() || "Não disponível";
        const observacao = document.querySelector(`#span_vGER_TIPOOBSERVACAOHISTORICODESCRICAO_${rowId}`)?.textContent?.trim() || "Não disponível";

        console.log(`📌 Matéria encontrada: ${disciplina} | Período: ${periodo} | Média: ${mediaFinal} | Frequência: ${frequencia} | Observação: ${observacao}`);

        return { disciplina, periodo, mediaFinal, frequencia, observacao };
      });
    });

    console.log(`✅ Disciplinas extraídas: ${historico.length}`);

    // Retorna os dados completos do aluno, incluindo o histórico acadêmico
    return { ...studentData, historico };

  } catch (error) {
    console.error("❌ Erro ao buscar histórico:", error);
    return null;
  }
}
