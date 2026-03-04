import { useState } from "react";
import { calculateTotalParts } from "../../utils/fileUtils";

const JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwMTIyMTk2Mi1hNDk1LTRlZGMtYTA5ZS01OGQyMWE0ZjZhNGMiLCJ1aWQiOiJmOGFkNzYzOC03ZWJkLTQzZTUtYmFhOS1mNTJhYmIzMDkyNDYiLCJ0eXBlIjoiZGV2aWNlIiwiaWF0IjoxNzY5OTU1ODAyLCJleHAiOjE3ODU1MDc4MDJ9.dBGmVp8e33rR1G-w-HDcQyK02-nppNLx8J68EBgXjRo';
const BASE_URL = 'http://localhost:3000';

export function Multi() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string>('');

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null;
    setFile(selected);
    setStatus('');
  };

  const handleUpload = async () => {
    if (!file) {
      setStatus('Select a file first.');
      return;
    }

    try {
      setStatus('Requesting multipart upload URL...');

      const totalParts = calculateTotalParts(file.size);

      const params = new URLSearchParams({
        filename: file.name,
        contentType: file.type,
        sizeBytes: String(file.size),
        totalParts: String(totalParts),
      });

      const initResponse = await fetch(
        `${BASE_URL}/files/upload/multipart?${params.toString()}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + JWT,
          },
        },
      );

      if (!initResponse.ok) {
        setStatus('Failed to initialize multipart upload.');
        return;
      }

      const { s3UploadId, id: fileTransferId } = await initResponse.json();

      const PART_SIZE = 10 * 1024 * 1024; // 10 MB
      const uploadedParts: { partNumber: number; etag: string }[] = [];

      for (let partNumber = 1; partNumber <= totalParts; partNumber += 1) {
        const start = (partNumber - 1) * PART_SIZE;
        const end = Math.min(start + PART_SIZE, file.size);
        const chunk = file.slice(start, end);

        setStatus(
          `Requesting URL for part ${partNumber} of ${totalParts}...`,
        );

        const partUrlResponse = await fetch(
          `${BASE_URL}/files/upload/multipart/part-url`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer ' + JWT,
            },
            body: JSON.stringify({
              fileTransferId,
              s3UploadId,
              partNumber,
            }),
          },
        );

        if (!partUrlResponse.ok) {
          setStatus(`Failed to get URL for part ${partNumber}.`);
          return;
        }

        const { method, url } = await partUrlResponse.json();

        setStatus(`Uploading part ${partNumber} of ${totalParts} to S3...`);

        const putResponse = await fetch(url, {
          method: method || 'PUT',
          body: chunk,
        });

        if (!putResponse.ok) {
          setStatus(`Upload failed for part ${partNumber}.`);
          return;
        }

        const etag =
          putResponse.headers.get('ETag') ?? putResponse.headers.get('Etag');

        if (!etag) {
          setStatus(`ETag missing for part ${partNumber}.`);
          return;
        }

        uploadedParts.push({ partNumber, etag });
      }

      const url = `${BASE_URL}/files/upload/multipart/complete`;
      const confirmResponse = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + JWT,
        },
        body: JSON.stringify({
          fileTransferId,
          s3UploadId,
          parts: uploadedParts,
        }),
      });

      if (!confirmResponse.ok) {
        setStatus('Failed to confirm multipart upload.');
        return;
      }

      setStatus('All parts uploaded to S3 and confirmed.');
    } catch (error) {
      console.error(error);
      setStatus('Unexpected error during upload.');
    }
  };


  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1>Multipart upload to S3 (POC)</h1>
      <input type="file" onChange={handleFileChange} />
      <button
        type="button"
        onClick={handleUpload}
        style={{ marginLeft: '1rem', padding: '0.5rem 1rem' }}
      >
        Upload
      </button>
      {status && (
        <p style={{ marginTop: '1rem' }}>
          {status}
        </p>
      )}
    </div>
  );
}