/**
 * Fixed-capacity ring buffer. Overwrites oldest item when full.
 * `toArray()` always returns items in chronological (oldest → newest) order.
 */
export class RingBuffer<T> {
  private readonly buf: (T | undefined)[]
  private head = 0   // index of the next write position
  private count = 0

  constructor(private readonly capacity: number) {
    this.buf = new Array(capacity)
  }

  push(item: T): void {
    this.buf[this.head] = item
    this.head = (this.head + 1) % this.capacity
    if (this.count < this.capacity) this.count++
  }

  /**
   * Returns all items in chronological order (oldest first).
   * Returns fewer than `capacity` items if the buffer is not yet full.
   */
  toArray(): T[] {
    const result: T[] = []
    const start = this.isFull() ? this.head : 0
    for (let i = 0; i < this.count; i++) {
      result.push(this.buf[(start + i) % this.capacity] as T)
    }
    return result
  }

  isFull(): boolean {
    return this.count === this.capacity
  }

  get size(): number {
    return this.count
  }

  clear(): void {
    this.head = 0
    this.count = 0
    this.buf.fill(undefined)
  }
}
