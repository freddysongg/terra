export type ApiSource = "eonet" | "firms" | "usgs" | "donki" | "gibs";

export type ApiErrorCode =
  | "UPSTREAM_UNAVAILABLE"
  | "RATE_LIMITED"
  | "PARSE_FAILED"
  | "TIMEOUT";

export interface ApiSuccessResponse<T> {
  status: "ok";
  data: T;
  cached: boolean;
}

export interface ApiErrorResponse {
  status: "error";
  code: ApiErrorCode;
  source: ApiSource;
  message: string;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;
