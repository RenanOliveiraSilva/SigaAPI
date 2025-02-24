import { Page } from "puppeteer";

export async function GetAcademicPlan(contextPage: Page): Promise<string[] | null> {
    try {
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
    //console.log("📢 JSON Final antes do retorno:", JSON.stringify({ materias }, null, 2));

    // Retorna os dados completos do aluno, incluindo os nomes das matérias
    return materias;
        

    } catch (error) {
        console.error("❌ Erro ao buscar dados:", error);
        return null;
    }


}