// Minimal Angular core mocks for unit testing pure logic
export function Injectable(_opts?: any): ClassDecorator {
  return (target: any) => target;
}
export function inject(_token: any): any {
  return undefined;
}
export function signal<T>(initial: T) {
  let value = initial;
  const fn = () => value;
  fn.set = (v: T) => { value = v; };
  fn.update = (updater: (v: T) => T) => { value = updater(value); };
  return fn;
}
export function computed<T>(fn: () => T) {
  return fn;
}
export function Component(_opts?: any): ClassDecorator {
  return (target: any) => target;
}
export function DestroyRef() {}
