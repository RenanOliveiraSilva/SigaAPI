import { Page } from 'puppeteer';

export async function GetStudentHistory(contextPage: Page): Promise<{ disciplina: string; periodo: string; mediaFinal: string; frequencia: string; observacao: string; }[] | null>{
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
    return historico;
} 