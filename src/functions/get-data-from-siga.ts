import { Page } from "puppeteer";

interface AlunoData {
  nome: string;
  ra: string;
  semestre: string;
  email: string;
  faculdade: string;
  curso: string;
  situacaoCurso: string;
  periodoCurso: string;
}

export async function GetDataFromSiga(contextPage: Page): Promise<AlunoData | null> {
  try {
    if (!contextPage) {
      throw new Error("Página não disponível");
    }

    // Espera até que o primeiro elemento principal esteja carregado
    await contextPage.waitForSelector('#span_vPRO_PESSOALEMAIL', { timeout: 5000 });

    // Mapeamento dos seletores para extração dinâmica
    const selectors: Record<keyof AlunoData, string> = {
      nome: "#span_MPW0041vPRO_PESSOALNOME",
      ra: "#span_MPW0041vACD_ALUNOCURSOREGISTROACADEMICOCURSO",
      semestre: "#span_MPW0041vACD_ALUNOCURSOCICLOATUAL",
      email: "#span_vPRO_PESSOALEMAIL",
      faculdade: "#span_vUNI_UNIDADENOME_MPAGE",
      curso: "#span_vACD_CURSONOME_MPAGE",
      situacaoCurso: "#span_vSITUACAO_MPAGE",
      periodoCurso: "#span_vACD_PERIODODESCRICAO_MPAGE",
    };

    // Executa a extração de forma mais performática
    const data = await contextPage.evaluate((selectors) => {
      return Object.keys(selectors).reduce((acc, key) => {
        const selector = selectors[key as keyof typeof selectors];
        acc[key as keyof typeof selectors] = document.querySelector(selector)?.textContent?.trim() || "Não disponível";
        return acc;
      }, {} as Record<keyof typeof selectors, string>);
    }, selectors);

    console.log("✅ Dados extraídos com sucesso!");
    return data as AlunoData;

  } catch (error) {
    console.error("❌ Erro ao buscar dados:", error);
    return null;
  }
}
