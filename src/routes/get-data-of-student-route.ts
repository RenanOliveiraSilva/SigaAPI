import { z } from "zod";
import { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { studentLogin } from "../functions/student-login";
import { GetDataFromSiga } from "../functions/get-data-from-siga";

export const GetDataOfStudent: FastifyPluginAsyncZod = async (app) => {
    app.post('/student', {
        schema: {
            name: 'student',
            tags: ['Student'],
            description: 'Get data of student',
            body: z.object({
                user: z.string(),
                password: z.string()
            }),
            response: {
                200: z.object({
                    loggin: z.boolean(),
                    data: z.object({
                        nome: z.string(),
                        ra: z.string(),
                        semestre: z.string(),
                        email_pessoal: z.string(),
                        email_institucional: z.string(),
                        faculdade: z.string(),
                        curso: z.string(),
                        situacaoCurso: z.string(),
                        periodoCurso: z.string(),
                        materias: z.array(z.string()) // 🔹 Agora inclui a lista de matérias
                    })
                }),
                400: z.object({
                    loggin: z.boolean(),
                    message: z.string()
                }),
                401: z.object({
                    loggin: z.boolean()
                })
            }
        }
    }, async (request, reply) => {
        const { user, password } = request.body;

        const { success, browser, page } = await studentLogin(user, password);

        if (!success) {
            return reply.status(401).send({
                loggin: success
            });
        }

        if (!browser || !page) {
            return reply.status(400).send({
                loggin: false,
                message: 'Browser or page not found'
            });
        }

        const data = await GetDataFromSiga(page);

        await browser.close(); // 🔹 Fecha o navegador para evitar vazamento de memória

        // 🔹 Se `data` for nulo, retorna um JSON vazio no mesmo formato esperado
        const responseData = data ?? {
            nome: '',
            ra: '',
            semestre: '',
            email_pessoal: '',
            email_institucional: '',
            faculdade: '',
            curso: '',
            situacaoCurso: '',
            periodoCurso: '',
            materias: [] // 🔹 Garante que `materias` sempre seja um array
        };

        // console.log("📢 JSON retornado na API:", JSON.stringify(responseData, null, 2)); // 🔹 Depuração

        return reply.status(200).send({
            loggin: success,
            data: responseData
        });
    });
}
