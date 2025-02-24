import { FastifyInstance } from "fastify";
import puppeteer from "puppeteer";
import { studentLogin } from "../functions/student-login";
import { fetchStudentHistory } from "../functions/fetch-student-history";

export default async function studentHistoryRoutes(server: FastifyInstance) {
    server.post("/student/history", async (request, reply) => {
        const { user, password } = request.body as { user: string; password: string };

        if (!user || !password) {
            return reply.status(400).send({ error: "Usuário e senha são obrigatórios" });
        }

        const { success, browser, page } = await studentLogin(user, password);

        if (!success) {
            return reply.status(401).send({ loggin: success });
        }

        if (!browser || !page) {
            return reply.status(400).send({ loggin: false, message: "Browser or page not found" });
        }

        try {
            // Chama a função que busca o histórico do aluno
            const studentHistory = await fetchStudentHistory(page);
            await browser.close(); // Fecha o navegador

            // console.log("📢 JSON final retornado pela API:", JSON.stringify(studentHistory, null, 2));

            return reply.send(studentHistory);

        } catch (error) {
            console.error("❌ Erro ao buscar histórico:", error);
            await browser.close();
            return reply.status(500).send({ error: "Erro ao buscar histórico do aluno" });
        }
    });
}
