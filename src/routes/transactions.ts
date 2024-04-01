import { FastifyInstance } from 'fastify'
import { knex } from '../database'
import { z } from 'zod'
import { randomUUID } from 'crypto'
import { checkSessionIdExists } from '../middlewares/check-session-id-exists'

export async function transactionRoutes(app: FastifyInstance) {
  app.get('/', { preHandler: [checkSessionIdExists] }, async (request) => {
    const { sessionId } = request.cookies

    const transactions = await knex('transactions')
      .select('*')
      .where('session_id', sessionId)

    return { transactions }
  })

  app.get(
    '/summary',
    { preHandler: [checkSessionIdExists] },
    async (_, reply) => {
      const transactions = await knex('transactions').select('*')
      let balance = 0

      transactions.forEach((transaction) => {
        balance =
          transaction.type === 'debit'
            ? balance - transaction.amount
            : balance + transaction.amount
      })

      return reply.send({
        summary: {
          balance,
          transactionsAmount: transactions.length,
        },
      })
    },
  )

  app.get(
    '/:id',
    { preHandler: [checkSessionIdExists] },
    async (request, reply) => {
      const transactionParamsSchema = z.object({
        id: z.string(),
      })

      const { id } = transactionParamsSchema.parse(request.params)

      const { sessionId } = request.cookies

      const transaction = await knex('transactions')
        .where({
          id,
          session_id: sessionId,
        })
        .select()
        .first()

      return reply.send({ transaction })
    },
  )

  app.post('/', async (request, reply) => {
    const transactionBodySchema = z.object({
      title: z.string(),
      type: z.enum(['credit', 'debit']),
      amount: z.number(),
    })

    const { title, amount, type } = transactionBodySchema.parse(request.body)

    let sessionId = request.cookies.sessionId

    if (!sessionId) {
      sessionId = randomUUID()

      reply.setCookie('sessionId', sessionId, {
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 7 days
      })
    }

    await knex('transactions').insert({
      id: randomUUID(),
      title,
      type,
      amount,
      session_id: sessionId,
    })

    return reply.status(201).send()
  })
}
