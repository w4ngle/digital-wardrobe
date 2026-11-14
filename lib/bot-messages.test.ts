import { describe, expect, it } from 'vitest'
import { botReply, helpMessage, morningOutfitMessage, welcomeMessage } from './bot-messages'

describe('botReply', () => {
  it('welcomes the owner on start', () => expect(botReply('/start')).toBe(welcomeMessage))
  it('explains the wardrobe for other messages', () => expect(botReply('/help')).toBe(helpMessage))
})

describe('morningOutfitMessage', () => {
  it('lists outfit items', () => expect(morningOutfitMessage([{ category: 'Верх', description: 'Белая рубашка' }])).toContain('• Белая рубашка'))
})
