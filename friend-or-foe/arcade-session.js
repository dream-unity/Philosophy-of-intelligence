export class ArcadeSession {
  constructor(total) {
    if (!Number.isInteger(total) || total < 20 || total > 1000) {
      throw new RangeError('Choose a whole number from 20 to 1000.');
    }
    this.total = total;
    this.number = 1;
    this.completed = 0;
    this.wins = 0;
    this.deaths = 0;
    this.ammoLosses = 0;
    this.bestTime = null;
  }

  get finished() {
    return this.completed === this.total;
  }

  accept(result) {
    if (this.completed === this.number) return false;
    this.completed++;
    if (result.correct) {
      this.wins++;
      this.bestTime = this.bestTime === null ? result.elapsed : Math.min(this.bestTime, result.elapsed);
    } else if (result.reason === 'escaped') {
      this.deaths++;
    } else {
      this.ammoLosses++;
    }
    return true;
  }

  next() {
    if (this.finished || this.completed !== this.number) return false;
    this.number++;
    return true;
  }
}
