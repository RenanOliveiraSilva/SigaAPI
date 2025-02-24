import { fastify } from 'fastify';
import { fastifyCors } from '@fastify/cors';
import studentHistoryRoutes from "./routes/get-student-history-route";

import {
    validatorCompiler,
    serializerCompiler,
    ZodTypeProvider,
    jsonSchemaTransform,
} from 'fastify-type-provider-zod';

import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';

const app = fastify().withTypeProvider<ZodTypeProvider>();

app.setSerializerCompiler(serializerCompiler);
app.setValidatorCompiler(validatorCompiler);

//Medida de segurança para permitir que qualquer origem acesse a API
app.register(fastifyCors, {
    origin: true
});

app.register(studentHistoryRoutes);


//Documentação da API
app.register(fastifySwagger, {
    openapi: {
      info: {
        title: 'SIGA API',
        version: '0.1',
      },
    },
    transform: jsonSchemaTransform,
})

app.register(fastifySwaggerUi, {
  routePrefix: '/docs',
})

//Importação das rotas
import { GetDataOfStudent } from './routes/get-data-of-student-route';

//Registro das rotas
app.register(GetDataOfStudent);

//Execução do servidor
app.listen({port: 3333}).then(() => {
    console.log('Server is running on port 3333');
})