import { afterEach, describe, expect, it } from 'vitest'
import { describeImage } from './provider'

const apiKey = process.env.OPENAI_API_KEY

afterEach(() => {
  if (apiKey) process.env.OPENAI_API_KEY = apiKey
  else delete process.env.OPENAI_API_KEY
})

describe('AI provider', () => {
  it('loads without an API key and fails only when AI is called', async () => {
    delete process.env.OPENAI_API_KEY

    await expect(describeImage('data:image/jpeg;base64,test')).rejects.toThrow(
      'OPENAI_API_KEY is not configured',
    )
  })
})
