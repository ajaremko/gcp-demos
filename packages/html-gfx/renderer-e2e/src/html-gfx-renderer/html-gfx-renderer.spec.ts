import { describe, it, expect } from 'vitest'
import axios from 'axios'

describe('GET /livez', () => {
  // this should return a 503 first and then a 200.
  // in dev the server seems to be ready immediately.
  it('becomes ready eventually', async () => {
    const res1 = await axios.get('/livez')
    expect(res1.status).toBe(503)
    const res2 = await axios.get('/livez')
    expect(res2.status).toBe(200)
  })
})

describe('POST /render', () => {
  it('returns a 200 status', async () => {
    const html = '<div><h1>Hello World</h1></div>'
    const res = await axios.post('/render', html, {
      headers: { 'Content-Type': 'text/html' },
    })
    expect(res.status).toBe(200)
  })
})
