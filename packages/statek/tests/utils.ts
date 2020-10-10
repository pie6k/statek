export function spy(fn: any) {
  function spyFn(this: any, ...args: any[]) {
    fn.apply(this, arguments);
    spyFn.callCount++;
    spyFn.lastArgs = Array.from(arguments);
    spyFn.args.push(spyFn.lastArgs);
  }

  spyFn.callCount = 0;
  spyFn.lastArgs = null as any[] | null;

  spyFn.args = [] as any[];
  return spyFn;
}
