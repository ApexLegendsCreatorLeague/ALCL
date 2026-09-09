export interface ExternalDataAdapter<TInput, TOutput> {
  readonly provider: string;
  readonly enabled: boolean;
  import(input: TInput): Promise<readonly TOutput[]>;
}

export type CompetitionDataProvider = "manual" | "apex_liveapi" | "authorized_provider";

export class AuthorizedProviderAdapter<TInput, TOutput>
  implements ExternalDataAdapter<TInput, TOutput>
{
  readonly enabled = true;

  constructor(
    readonly provider: string,
    private readonly importer: (input: TInput) => Promise<readonly TOutput[]>,
  ) {}

  import(input: TInput): Promise<readonly TOutput[]> {
    return this.importer(input);
  }
}

export function createAuthorizedProviderAdapter<TInput, TOutput>(
  provider: string,
  importer: (input: TInput) => Promise<readonly TOutput[]>,
) {
  if (!provider.trim() || provider === "manual" || provider === "apex_liveapi") {
    throw new Error("Authorized providers require a distinct provider name.");
  }
  return new AuthorizedProviderAdapter(provider, importer);
}

export class ManualDataAdapter<T> implements ExternalDataAdapter<readonly T[], T> {
  readonly provider = "manual";
  readonly enabled = true;

  async import(input: readonly T[]): Promise<readonly T[]> {
    return structuredClone(input);
  }
}

export class DisabledDataAdapter<TInput, TOutput>
  implements ExternalDataAdapter<TInput, TOutput>
{
  readonly enabled = false;

  constructor(readonly provider: string) {}

  async import(input: TInput): Promise<readonly TOutput[]> {
    void input;
    throw new Error(`External provider "${this.provider}" is disabled`);
  }
}

export function createAdapter<T>(provider: "manual"): ManualDataAdapter<T>;
export function createAdapter<T>(provider: string): ExternalDataAdapter<unknown, T>;
export function createAdapter<T>(provider: string): ExternalDataAdapter<unknown, T> {
  return provider === "manual"
    ? (new ManualDataAdapter<T>() as ExternalDataAdapter<unknown, T>)
    : new DisabledDataAdapter<unknown, T>(provider);
}
