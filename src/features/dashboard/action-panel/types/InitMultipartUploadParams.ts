export interface InitMultipartUploadParams {
  destinationDeviceId: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  totalParts: number;
}
