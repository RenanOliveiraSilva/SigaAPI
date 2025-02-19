import { fastify } from 'fastify';
import { fastifyCors } from '@fastify/cors';

import {
    validatorCompiler,
    serializerCompiler,
    ZodTypeProvider,
    jsonSchemaTransform,
} from 'fastify-type-provider-zod';
import { z } from 'zod';
import fastifySwagger from '@fastify/swagger';


const app = fastify().withTypeProvider<ZodTypeProvider>();

app.setSerializerCompiler(serializerCompiler);
app.setValidatorCompiler(validatorCompiler);

//Medida de segurança para permitir que qualquer origem acesse a API
app.register(fastifyCors, {
    origin: true
});

//Doxumentação da API
app.register(fastifySwagger, {
    openapi: {
      info: {
        title: 'SIGA API',
        version: '0.1',
      },
    },
    transform: jsonSchemaTransform,
})

//Execução do servidor
app.listen({port: 3333}).then(() => {
    console.log('Server is running on port 3333');
})