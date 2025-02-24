import { Page } from "puppeteer";

interface AlunoData {
  nome: string;
  ra: string;
  semestre: string;
  email_pessoal: string;
  email_institucional: string;
  faculdade: string;
  curso: string;
  situacaoCurso: string;
  periodoCurso: string;
  materias: string[]; // Agora só armazenamos os nomes das matérias
}

export async function GetDataFromSiga(contextPage: Page): Promise<AlunoData | null> {
  try {
    if (!contextPage) {
      throw new Error("Página não disponível");
    }

    // Aguarda a página de dados carregar
    await contextPage.waitForSelector('#span_vPRO_PESSOALEMAIL', { timeout: 5000 });

    // Mapeamento dos seletores para extração de dados do aluno
    const selectors: Record<keyof Omit<AlunoData, "materias">, string> = {
      nome: "#span_MPW0041vPRO_PESSOALNOME",
      ra: "#span_MPW0041vACD_ALUNOCURSOREGISTROACADEMICOCURSO",
      semestre: "#span_MPW0041vACD_ALUNOCURSOCICLOATUAL",
      email_pessoal: "#span_vPRO_PESSOALEMAIL",
      email_institucional: "#span_MPW0041vINSTITUCIONALFATEC",
      faculdade: "#span_vUNI_UNIDADENOME_MPAGE",
      curso: "#span_vACD_CURSONOME_MPAGE",
      situacaoCurso: "#span_vSITUACAO_MPAGE",
      periodoCurso: "#span_vACD_PERIODODESCRICAO_MPAGE",
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

    // ***Navegar para a página de horários***
    await contextPage.goto('https://siga.cps.sp.gov.br/aluno/horario.aspx', { waitUntil: 'networkidle2' });

    // Aguarda a tabela de matérias aparecer
    await contextPage.waitForSelector('#Grid1ContainerTbl', { timeout: 5000 });

    // Extração dos nomes das matérias
    const materias = await contextPage.evaluate(() => {
      const materiaElements = Array.from(document.querySelectorAll('[id^="span_vACD_DISCIPLINANOME_"]'));

      console.log(`🔍 Elementos de matérias encontrados: ${materiaElements.length}`);

      return materiaElements.map(materia => {
        const text = materia.textContent?.trim() || "Não disponível";
        console.log(`📌 Matéria encontrada: ${text}`);
        return text;
      });
    });

    console.log(`✅ Matérias extraídas: ${materias.length}`);

    // // 🔹 Verifica se as matérias estão sendo corretamente atribuídas ao objeto final
    // console.log("📢 JSON Final antes do retorno:", JSON.stringify({ ...studentData, materias }, null, 2));

    // Retorna os dados completos do aluno, incluindo os nomes das matérias
    return { ...studentData, materias };

  } catch (error) {
    console.error("❌ Erro ao buscar dados:", error);
    return null;
  }
}
