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
    this.solveTimes = [];
    this.seenFamilies = new Set();
    this.firstSeenTotal = 0;
    this.firstSeenWins = 0;
    this.repeatTotal = 0;
    this.repeatWins = 0;
  }

  get finished() {
    return this.completed === this.total;
  }

  get medianTime() {
    if (!this.solveTimes.length) return null;
    const sorted = this.solveTimes.slice().sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  accept(result, familyId = null) {
    if (this.completed === this.number) return false;
    this.completed++;
    if (familyId) {
      const repeated = this.seenFamilies.has(familyId);
      if (repeated) {
        this.repeatTotal++;
        if (result.correct) this.repeatWins++;
      } else {
        this.seenFamilies.add(familyId);
        this.firstSeenTotal++;
        if (result.correct) this.firstSeenWins++;
      }
    }
    if (result.correct) {
      this.wins++;
      this.solveTimes.push(result.elapsed);
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

export const LADDER_LEVELS = Object.freeze([
  'super-super-easy',
  'super-easy',
  'very-easy',
  'easy',
  'medium',
  'hard'
]);

export class ZeroToHeroLadder {
  constructor(levels = LADDER_LEVELS, {promoteAfter = 6, demoteAfter = 2} = {}) {
    this.levels = [...levels];
    this.promoteAfter = promoteAfter;
    this.demoteAfter = demoteAfter;
    this.index = 0;
    this.peakIndex = 0;
    this.winStreak = 0;
    this.lossStreak = 0;
    this.promotions = 0;
    this.demotions = 0;
    this.lastChange = null;
  }

  get level() {
    return this.levels[this.index];
  }

  get peakLevel() {
    return this.levels[this.peakIndex];
  }

  record(correct) {
    this.lastChange = null;
    if (correct) {
      this.winStreak++;
      this.lossStreak = 0;
      if (this.winStreak >= this.promoteAfter) {
        if (this.index < this.levels.length - 1) {
          const from = this.level;
          this.index++;
          if (this.index > this.peakIndex) this.peakIndex = this.index;
          this.promotions++;
          this.winStreak = 0;
          this.lastChange = {direction: 'up', from, to: this.level};
        }
      }
    } else {
      this.lossStreak++;
      this.winStreak = 0;
      if (this.lossStreak >= this.demoteAfter) {
        if (this.index > 0) {
          const from = this.level;
          this.index--;
          this.demotions++;
          this.lossStreak = 0;
          this.lastChange = {direction: 'down', from, to: this.level};
        } else {
          this.lossStreak = 0;
        }
      }
    }
    return this.lastChange;
  }
}

