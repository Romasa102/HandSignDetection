import { describe, it, expect, beforeEach } from 'vitest'
import { RingBuffer } from './ringBuffer'

describe('RingBuffer', () => {
  let buf: RingBuffer<number>

  beforeEach(() => {
    buf = new RingBuffer<number>(4)
  })

  it('starts empty and not full', () => {
    expect(buf.isFull()).toBe(false)
    expect(buf.size).toBe(0)
    expect(buf.toArray()).toEqual([])
  })

  it('returns items in insertion order before full', () => {
    buf.push(1)
    buf.push(2)
    buf.push(3)
    expect(buf.toArray()).toEqual([1, 2, 3])
    expect(buf.isFull()).toBe(false)
  })

  it('reports full when capacity is reached', () => {
    buf.push(1); buf.push(2); buf.push(3); buf.push(4)
    expect(buf.isFull()).toBe(true)
    expect(buf.size).toBe(4)
  })

  it('overwrites oldest item when capacity is exceeded', () => {
    buf.push(1); buf.push(2); buf.push(3); buf.push(4)
    buf.push(5)
    // oldest (1) dropped; order should be 2, 3, 4, 5
    expect(buf.toArray()).toEqual([2, 3, 4, 5])
  })

  it('maintains chronological order after multiple wrap-arounds', () => {
    for (let i = 1; i <= 10; i++) buf.push(i)
    // last 4 items
    expect(buf.toArray()).toEqual([7, 8, 9, 10])
  })

  it('toArray length never exceeds capacity', () => {
    for (let i = 0; i < 100; i++) buf.push(i)
    expect(buf.toArray().length).toBe(4)
  })

  it('clear resets state', () => {
    buf.push(1); buf.push(2)
    buf.clear()
    expect(buf.isFull()).toBe(false)
    expect(buf.size).toBe(0)
    expect(buf.toArray()).toEqual([])
  })

  it('push after clear works correctly', () => {
    buf.push(1); buf.push(2); buf.push(3); buf.push(4)
    buf.clear()
    buf.push(10); buf.push(20)
    expect(buf.toArray()).toEqual([10, 20])
  })
})
