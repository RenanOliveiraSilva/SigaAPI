import { z } from "zod";
import { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { studentLogin } from "../functions/student-login";
import { GetDataFromSiga } from "../functions/get-data-from-siga";
import { GetAcademicPlan } from "../functions/get-academic-plan";

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
                        email: z.string(),
                        faculdade: z.string(),
                        curso: z.string(),
                        situacaoCurso: z.string(),
                        periodoCurso: z.string()
                    }),
                    material: z.array(z.string())
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

        if(!success) {
            return reply.status(401).send({
                loggin: success
            })
        }
        

        if (!browser || !page) {
            return reply.status(400).send({
                loggin: false,
                message: 'Browser or page not found'
            })
        }

        const data = await GetDataFromSiga(page);
        const material = await GetAcademicPlan(page);

        return reply.status(200).send({
            loggin: success,
            data: data ?? {
                nome: '',
                ra: '',
                semestre: '',
                email: '',
                faculdade: '',
                curso: '',
                situacaoCurso: '',
                periodoCurso: ''
            },
            material: material ?? []
        })
    })
}