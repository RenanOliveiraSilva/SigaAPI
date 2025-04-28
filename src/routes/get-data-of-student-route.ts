// src/routes/get-data-of-student-route.ts

import { FastifyInstance } from 'fastify';
import { buscarNomeUsuario } from '../services/SigaScraper';

export async function GetDataOfStudent(app: FastifyInstance) {
  app.get('/usuario', async (request, reply) => {
    try {
      const nome = await buscarNomeUsuario();
      if (!nome) {
        return reply.status(401).send({ error: 'Sessão inválida ou expirada.' });
      }
      return { nome };
    } catch (error) {
      console.error(error);
      return reply.status(500).send({ error: 'Erro interno' });
    }
  });
}
