import { it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import request from 'supertest'
import { app } from '../../app'
import { describe } from 'node:test'
import { execSync } from 'node:child_process'

describe('Transaction routes', () => {
  beforeAll(async () => {
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  beforeEach(() => {
    execSync('pnpm knex migrate:rollback --all')
    execSync('pnpm knex migrate:latest')
  })

  it('should create a new transaction', async () => {
    await request(app.server)
      .post('/transactions')
      .send({
        type: 'credit',
        amount: 1000,
        title: 'test',
      })
      .expect(201)
  })

  it('should list all transactions', async () => {
    const type = 'credit'
    const amount = 1000
    const title = 'test'
    const createTransactionResponse = await request(app.server)
      .post('/transactions')
      .send({
        type,
        amount,
        title,
      })

    const cookies = createTransactionResponse.get('Set-Cookie')!

    const listTransactionsResponse = await request(app.server)
      .get('/transactions')
      .set('Cookie', cookies)
      .expect(200)

    expect(listTransactionsResponse.body.transactions).toEqual([
      expect.objectContaining({
        title,
        amount,
        type,
      }),
    ])
  })

  it('should list specific transaction', async () => {
    const type = 'credit'
    const amount = 1000
    const title = 'test'
    const createTransactionResponse = await request(app.server)
      .post('/transactions')
      .send({
        type,
        amount,
        title,
      })

    const cookies = createTransactionResponse.get('Set-Cookie')!

    const listTransactionsResponse = await request(app.server)
      .get('/transactions')
      .set('Cookie', cookies)
      .expect(200)

    const transactionId = listTransactionsResponse.body.transactions[0].id

    const getTransactionResponse = await request(app.server)
      .get(`/transactions/${transactionId}`)
      .set('Cookie', cookies)
      .expect(200)

    expect(getTransactionResponse.body.transaction).toEqual(
      expect.objectContaining({
        title,
        amount,
        type,
      }),
    )
  })

  it('should get transactions summary', async () => {
    const createTransactionResponse = await request(app.server)
      .post('/transactions')
      .send({
        type: 'credit',
        amount: 5000,
        title: 'credit transaction',
      })

    const cookies = createTransactionResponse.get('Set-Cookie')!

    await request(app.server)
      .post('/transactions')
      .set('Cookie', cookies)
      .send({
        type: 'debit',
        amount: 2000,
        title: 'debit transaction',
      })

    const transactionsSummaryResponse = await request(app.server)
      .get('/transactions/summary')
      .set('Cookie', cookies)
      .expect(200)

    expect(transactionsSummaryResponse.body.summary).toEqual(
      expect.objectContaining({
        balance: 3000,
        transactionsAmount: 2,
      }),
    )
  })
})
