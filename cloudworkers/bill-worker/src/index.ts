import { Hono } from 'hono'

const app = new Hono<{ Bindings: CloudflareBindings }>()

app.get('/', (c) => {
  return c.json({
    code: 200,
    success: true,
    message: 'Leaf Account API',
    data: {
      service: 'account-worker',
      version: '0.1.0',
    },
  })
})

app.get('/v1/health', (c) => {
  return c.json({
    code: 200,
    success: true,
    message: 'ok',
    data: {
      service: 'account-worker',
      timestamp: Date.now(),
    },
  })
})

app.notFound((c) => {
  return c.json(
    {
      code: 404,
      success: false,
      message: 'Not Found',
    },
    404,
  )
})

app.onError((err, c) => {
  console.error('Unhandled worker error:', err)

  return c.json(
    {
      code: 500,
      success: false,
      message: 'Internal Server Error',
    },
    500,
  )
})

export default app
