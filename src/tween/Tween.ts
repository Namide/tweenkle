import { type TweenType, type TickerType, type TweenOptions, TweenEmitCallback } from '../types.js'
import { Interpolate } from './Interpolate.js'
import { globalTicker } from '../timer/Ticker.js'
import { Emit } from '../core/Emit.js'

export class Tween<ValueType extends (number | number[])> extends Emit<TweenEmitCallback<ValueType>> implements TweenType<ValueType> {
  isStarted = false
  isEnded = false

  private _timer: TickerType | null = null

  private _startTime: number = 0
  private readonly _options: TweenOptions<ValueType>

  interpolate: Interpolate<ValueType>

  constructor (options: TweenOptions<ValueType>) {
    super()

    this._options = { ...options }

    this._update = this._update.bind(this)

    this.on('start', this._options.onStart)
    this.on('update', this._options.onUpdate)
    this.on('end', this._options.onEnd)

    this.interpolate = new Interpolate<ValueType>(options)
    this.timer = options.timer ?? (globalTicker as TickerType)
  }

  get timer (): TickerType {
    return this._timer as TickerType
  }

  set timer (timer: TickerType | null) {
    if (this._timer !== null) {
      this._timer.off('update', this._update)
      this._timer.off('play', this._options.onPlay)
      this._timer.off('pause', this._options.onPause)
    }

    this._timer = timer

    if (this._timer !== null) {
      this._timer.on('update', this._update)
      this._timer.on('play', this._options.onPlay)
      this._timer.on('pause', this._options.onPause)

      this._startTime = this.timer.time
    }
  }

  getValue (time: number): ValueType {
    return this.interpolate.getValue(time - this._startTime)
  }

  dispose (): void {
    this.off('start', this._options.onStart)
    this.off('update', this._options.onUpdate)
    this.off('end', this._options.onEnd)
    this.timer = null
  }

  private _update (time: number): void {
    // Before
    if (time < this._startTime + this.interpolate.delay) {
      return
    }

    // After
    if (time > this._startTime + this.interpolate.delay + this.interpolate.duration) {
      if (!this.isEnded) {
        const value = this.getValue(time)
        this.emit('update', value)
        this.emit('end', value)
        this.isEnded = true
        if (this.timer.autoDispose) {
          this.dispose()
        }
      }
      return
    }

    // During
    const value = this.getValue(time)
    if (!this.isStarted) { // Start
      this.isStarted = true
      this.emit('start', value)
    }
    this.emit('update', value)
  }
}
