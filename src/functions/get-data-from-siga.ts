import { Page } from "puppeteer";

export async function GetDataFromSiga(contextPage: Page) {
    
    try {
        console.log("🌍 Página atual:", contextPage.url());

        if (!contextPage) {
            throw new Error("Navegador não iniciado");
        }    

        const dadosAluno = await contextPage.evaluate(() => {
            const getText = (selector: string): string =>
                document.querySelector(selector)?.textContent?.trim() || "Não disponível";

            return {
                nome: getText("#span_MPW0041vPRO_PESSOALNOME"),
                ra: getText("#span_MPW0041vACD_ALUNOCURSOREGISTROACADEMICOCURSO"), // Número do RA
                semestre: getText("#span_MPW0041vACD_ALUNOCURSOCICLOATUAL"), // Nome do curso
                email: getText("#span_MPW0041vINSTITUCIONALFATEC"), // E-mail do aluno
                faculdade: getText("#span_vUNI_UNIDADENOME_MPAGE"), // Nome da faculdade
                curso: getText("#span_vACD_CURSONOME_MPAGE"), // Nome do curso
                situacaoCurso: getText("#span_vSITUACAO_MPAGE"), // Situação do curso
                periodoCurso: getText("#span_vACD_PERIODODESCRICAO_MPAGE"), // Período do curso
            };
        });

        return dadosAluno;

    } catch (error) {
        console.error("Erro ao buscar dados do aluno no navegador:", error);
        return null;
    }
}
