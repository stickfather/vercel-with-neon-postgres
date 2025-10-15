export type ZodIssue = {
  path: (string | number)[];
  message: string;
};

export class ZodError extends Error {
  issues: ZodIssue[];

  constructor(issues: ZodIssue[]) {
    super(issues[0]?.message ?? "Invalid input");
    this.name = "ZodError";
    this.issues = issues;
  }
}

type ParseContext = {
  path: (string | number)[];
  issues: ZodIssue[];
  addIssue(issue: { message: string; path?: (string | number)[] }): void;
  child(key: string | number): ParseContext;
};

function createContext(path: (string | number)[] = [], issues: ZodIssue[] = []): ParseContext {
  return {
    path,
    issues,
    addIssue(issue) {
      const issuePath = issue.path ?? path;
      issues.push({ message: issue.message, path: [...issuePath] });
    },
    child(key) {
      return createContext([...path, key], issues);
    },
  };
}

type ParseResult<T> = { success: true; data: T } | { success: false; error: ZodError };

type Parser<T> = (input: unknown, ctx: ParseContext) => T;

type RefinementCtx = {
  addIssue(issue: { message: string; path?: (string | number)[] }): void;
  path: (string | number)[];
};

class BaseSchema<T> {
  protected readonly parser: Parser<T>;
  readonly refinements: ((value: T, ctx: RefinementCtx) => void)[] = [];

  constructor(parser: Parser<T>) {
    this.parser = parser;
  }

  parseWithContext(input: unknown, ctx: ParseContext): T {
    const value = this.parser(input, ctx);
    for (const refine of this.refinements) {
      refine(value, ctx);
    }
    return value;
  }

  parse(input: unknown): T {
    const ctx = createContext();
    const value = this.parseWithContext(input, ctx);
    if (ctx.issues.length) {
      throw new ZodError(ctx.issues);
    }
    return value;
  }

  safeParse(input: unknown): ParseResult<T> {
    try {
      return { success: true, data: this.parse(input) };
    } catch (error) {
      if (error instanceof ZodError) {
        return { success: false, error };
      }
      throw error;
    }
  }

  refine(check: (value: T) => boolean, message = "Invalid value") {
    return this.superRefine((value, ctx) => {
      if (!check(value)) {
        ctx.addIssue({ message });
      }
    });
  }

  superRefine(refiner: (value: T, ctx: RefinementCtx) => void) {
    const next = new BaseSchema<T>(this.parser);
    next.refinements.push(...this.refinements, refiner);
    return next;
  }

  optional(): BaseSchema<T | undefined> {
    const base = this;
    return new BaseSchema<T | undefined>((input, ctx) => {
      if (input === undefined) return undefined;
      return base.parseWithContext(input, ctx);
    });
  }

  nullable(): BaseSchema<T | null> {
    const base = this;
    return new BaseSchema<T | null>((input, ctx) => {
      if (input === null) return null;
      return base.parseWithContext(input, ctx);
    });
  }

  default(value: T): BaseSchema<T> {
    const base = this;
    return new BaseSchema<T>((input, ctx) => {
      if (input === undefined) return value;
      return base.parseWithContext(input, ctx);
    });
  }

  transform<U>(transformer: (value: T) => U): BaseSchema<U> {
    return new BaseSchema<U>((input, ctx) => {
      const result = this.parser(input, ctx);
      for (const refine of this.refinements) {
        refine(result, ctx);
      }
      if (ctx.issues.length) {
        return undefined as unknown as U;
      }
      return transformer(result);
    });
  }
}

class ZodString extends BaseSchema<string> {
  constructor(
    parser: Parser<string> = (input, ctx) => {
      if (typeof input !== "string") {
        ctx.addIssue({ message: "Expected string" });
        return "";
      }
      return input;
    },
    refinements?: ((value: string, ctx: RefinementCtx) => void)[],
  ) {
    super(parser);
    if (refinements) {
      this.refinements.push(...refinements);
    }
  }

  private clone() {
    return new ZodString(this.parser, [...this.refinements]);
  }

  private withRefinement(refiner: (value: string, ctx: RefinementCtx) => void) {
    const next = this.clone();
    next.refinements.push(refiner);
    return next;
  }

  min(length: number, message = `Must be at least ${length} characters`) {
    return this.withRefinement((value, ctx) => {
      if (value.length < length) {
        ctx.addIssue({ message });
      }
    });
  }

  regex(pattern: RegExp, message = "Invalid format") {
    return this.withRefinement((value, ctx) => {
      if (!pattern.test(value)) {
        ctx.addIssue({ message });
      }
    });
  }

  nonempty(message = "Cannot be empty") {
    return this.withRefinement((value, ctx) => {
      if (!value.length) {
        ctx.addIssue({ message });
      }
    });
  }

  trim() {
    const baseParser = this.parser;
    const next = new ZodString((input, ctx) => {
      const value = baseParser(input, ctx);
      if (ctx.issues.length) return "";
      return value.trim();
    }, [...this.refinements]);
    return next;
  }
}

class ZodNumber extends BaseSchema<number> {
  constructor() {
    super((input, ctx) => {
      if (typeof input !== "number" || Number.isNaN(input)) {
        ctx.addIssue({ message: "Expected number" });
        return 0;
      }
      return input;
    });
  }

  int(message = "Expected integer") {
    return this.superRefine((value, ctx) => {
      if (!Number.isInteger(value)) {
        ctx.addIssue({ message });
      }
    });
  }

  nonnegative(message = "Must be non-negative") {
    return this.superRefine((value, ctx) => {
      if (value < 0) {
        ctx.addIssue({ message });
      }
    });
  }
}

class ZodBoolean extends BaseSchema<boolean> {
  constructor() {
    super((input, ctx) => {
      if (typeof input !== "boolean") {
        ctx.addIssue({ message: "Expected boolean" });
        return false;
      }
      return input;
    });
  }
}

class ZodArray<T> extends BaseSchema<T[]> {
  constructor(private readonly element: BaseSchema<T>) {
    super((input, ctx) => {
      if (!Array.isArray(input)) {
        ctx.addIssue({ message: "Expected array" });
        return [];
      }
      const result: T[] = [];
      input.forEach((value, index) => {
        const childCtx = ctx.child(index);
        const parsed = this.element.parseWithContext(value, childCtx);
        result.push(parsed);
      });
      return result;
    });
  }
}

type Shape = Record<string, BaseSchema<any>>;

type InferredShape<S extends Shape> = {
  [K in keyof S]: S[K] extends BaseSchema<infer R> ? R : never;
};

class ZodObject<S extends Shape> extends BaseSchema<InferredShape<S>> {
  constructor(private readonly shape: S) {
    super((input, ctx) => {
      if (typeof input !== "object" || input === null || Array.isArray(input)) {
        ctx.addIssue({ message: "Expected object" });
        return {} as InferredShape<S>;
      }
      const result: Record<string, unknown> = {};
      for (const key of Object.keys(shape)) {
        const schema = shape[key];
        const childCtx = ctx.child(key);
        const value = (input as Record<string, unknown>)[key];
        const parsed = schema.parseWithContext(value, childCtx);
        result[key] = parsed;
      }
      return result as InferredShape<S>;
    });
  }
}

const z = {
  string: () => new ZodString(),
  number: () => new ZodNumber(),
  boolean: () => new ZodBoolean(),
  array: <T>(schema: BaseSchema<T>) => new ZodArray(schema),
  object: <S extends Shape>(shape: S) => new ZodObject(shape),
};

export { z };
export type { BaseSchema };
