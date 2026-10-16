import { describe, expect, it } from "vitest";
import { createLimiter } from "./limiter";

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => (resolve = r));
  return { promise, resolve };
}

describe("createLimiter", () => {
  it("nunca passa do limite de tarefas simultâneas e atende todas", async () => {
    const limiter = createLimiter(2);
    let active = 0;
    let peak = 0;
    const gates = Array.from({ length: 5 }, deferred);
    const runs = gates.map((gate, i) =>
      limiter.run(async () => {
        active++;
        peak = Math.max(peak, active);
        await gate.promise;
        active--;
        return i;
      }),
    );
    for (const gate of gates) {
      await Promise.resolve();
      gate.resolve();
    }
    expect(await Promise.all(runs)).toEqual([0, 1, 2, 3, 4]);
    expect(peak).toBe(2);
  });

  it("libera a vaga quando a tarefa falha", async () => {
    const limiter = createLimiter(1);
    await expect(
      limiter.run(async () => {
        throw new Error("falhou");
      }),
    ).rejects.toThrow("falhou");
    await expect(limiter.run(async () => "ok")).resolves.toBe("ok");
  });

  it("recusa limite inválido", () => {
    expect(() => createLimiter(0)).toThrow();
  });
});
