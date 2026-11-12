let secret = null

export async function createVault() {
  return {
    async getSecret() {
      return secret ? Buffer.from(secret) : null
    },
    async createSecretIfAbsent(_name, value) {
      if (!secret) secret = Buffer.from(value)
      return Buffer.from(secret)
    },
  }
}
