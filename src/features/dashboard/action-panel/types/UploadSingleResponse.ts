export interface UploadSingleResponse {
  url: string;
  method?: string;
  id: string;
  headers: Record<string, string>;
}
