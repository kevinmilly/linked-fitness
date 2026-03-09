// Minimal Firestore mocks
export class Timestamp {
  seconds: number;
  nanoseconds: number;
  constructor(seconds: number, nanoseconds: number) {
    this.seconds = seconds;
    this.nanoseconds = nanoseconds;
  }
  static now() { return new Timestamp(Math.floor(Date.now() / 1000), 0); }
  toDate() { return new Date(this.seconds * 1000); }
}
export function where(..._args: any[]) { return {}; }
export function orderBy(..._args: any[]) { return {}; }
