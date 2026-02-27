/**
 * Local data models using modern ES modules
 */

// In-memory database (for demo purposes)
const users = new Map()
let nextId = 1

export async function createUser (data) {
  const id = String(nextId++)
  const user = {
    id,
    ...data,
    createdAt: new Date().toISOString()
  }

  users.set(id, user)
  return user
}

export async function getUser (id) {
  return users.get(id) || null
}

export async function getAllUsers () {
  return Array.from(users.values())
}

export async function updateUser (id, data) {
  const user = users.get(id)

  if (!user) {
    return null
  }

  const updatedUser = {
    ...user,
    ...data,
    updatedAt: new Date().toISOString()
  }

  users.set(id, updatedUser)
  return updatedUser
}

export async function deleteUser (id) {
  const user = users.get(id)

  if (!user) {
    return false
  }

  users.delete(id)
  return true
}

// Model validation
export function validateUser (user) {
  if (!user.name || typeof user.name !== 'string') {
    throw new Error('Invalid user name')
  }

  if (!user.email || typeof user.email !== 'string') {
    throw new Error('Invalid user email')
  }

  return true
}
