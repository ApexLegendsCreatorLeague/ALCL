export type FieldErrors = Readonly<Record<string, readonly string[]>>;

export type ActionSuccess<T> = Readonly<{
  ok: true;
  data: T;
}>;

export type ActionFailure = Readonly<{
  ok: false;
  code:
    | "UNAUTHENTICATED"
    | "FORBIDDEN"
    | "INVALID_INPUT"
    | "CONFLICT"
    | "RATE_LIMITED"
    | "INTERNAL_ERROR";
  message: string;
  fieldErrors?: FieldErrors;
  retryAfterSeconds?: number;
}>;

export type ActionResult<T> = ActionSuccess<T> | ActionFailure;

export const actionSuccess = <T>(data: T): ActionSuccess<T> => ({ ok: true, data });

export const actionFailure = (
  code: ActionFailure["code"],
  message: string,
  options?: Pick<ActionFailure, "fieldErrors" | "retryAfterSeconds">,
): ActionFailure => ({ ok: false, code, message, ...options });
