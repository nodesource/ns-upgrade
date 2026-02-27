import Fastify from 'fastify'
import { z } from 'zod'
import { createUser, getUser } from 'local-models'

const fastify = Fastify({
  logger: true
})

// Zod schemas
const UserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  age: z.number().min(0).optional()
})

// Routes
fastify.get('/', async (request, reply) => {
  return {
    app: 'Demo Modern App',
    version: '1.0.0',
    nodeVersion: process.version,
    features: ['ESM', 'Fastify', 'Zod', 'Local Models'],
    timestamp: new Date().toISOString()
  }
})

fastify.get('/health', async (request, reply) => {
  return {
    status: 'healthy',
    uptime: process.uptime(),
    memory: process.memoryUsage()
  }
})

fastify.post('/users', async (request, reply) => {
  try {
    const validatedData = UserSchema.parse(request.body)
    const user = await createUser(validatedData)

    return {
      success: true,
      user
    }
  } catch (error) {
    reply.code(400)
    return {
      success: false,
      error: error.message
    }
  }
})

fastify.get('/users/:id', async (request, reply) => {
  try {
    const { id } = request.params
    const user = await getUser(id)

    if (!user) {
      reply.code(404)
      return { error: 'User not found' }
    }

    return { user }
  } catch (error) {
    reply.code(500)
    return { error: error.message }
  }
})

// Run the server
const start = async () => {
  try {
    await fastify.listen({ port: 3000, host: '0.0.0.0' })
    console.log('Server listening on port 3000')
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

// Only start if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  start()
}

export { fastify }
