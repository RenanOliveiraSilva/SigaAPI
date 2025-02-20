import { z } from "zod";
import { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { studentLogin } from "../functions/student-login";

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
                    loggin: z.boolean()

                })
            }
        }
    }, async (request, reply) => {
        const { user, password } = request.body;

        const response = await studentLogin(user, password);
        const { browser, page } = response;


        return reply.status(200).send({
            loggin: response.success
        })
    })
}