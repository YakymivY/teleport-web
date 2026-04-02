export interface InitMultipartUploadParams {
  filename: string;
  contentType: string;
  sizeBytes: number;
  totalParts: number;
}
