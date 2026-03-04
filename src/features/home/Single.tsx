import { useState } from "react";

const JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwMTIyMTk2Mi1hNDk1LTRlZGMtYTA5ZS01OGQyMWE0ZjZhNGMiLCJ1aWQiOiJmOGFkNzYzOC03ZWJkLTQzZTUtYmFhOS1mNTJhYmIzMDkyNDYiLCJ0eXBlIjoiZGV2aWNlIiwiaWF0IjoxNzY5OTU1ODAyLCJleHAiOjE3ODU1MDc4MDJ9.dBGmVp8e33rR1G-w-HDcQyK02-nppNLx8J68EBgXjRo';
const BASE_URL = 'http://localhost:3000';

export function Single() {
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
      setStatus('Requesting upload URL...');

      const params = new URLSearchParams({
        filename: file.name,
        contentType: file.type,
        sizeBytes: String(file.size),
      });

      const presignResponse = await fetch(
        `${BASE_URL}/files/upload/single?${params.toString()}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + JWT,
          },
        },
      );

      if (!presignResponse.ok) {
        setStatus('Failed to get presigned URL.');
        return;
      }

      const { url, id, headers } = await presignResponse.json();

      setStatus('Uploading to S3...');

      const putResponse = await fetch(url, {
        method: 'PUT',
        headers: headers,
        body: file,
      });

      if (!putResponse.ok) {
        setStatus('Upload to S3 failed.');
        return;
      }

      const etag =
        putResponse.headers.get('ETag') ?? putResponse.headers.get('Etag');

      if (!etag) {
        setStatus('Upload succeeded but ETag header is missing.');
        return;
      }

      setStatus('Confirming upload with backend...');

      const confirmResponse = await fetch(
        `${BASE_URL}/files/upload/confirm`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + JWT,
          },
          body: JSON.stringify({
            id,
            etag,
          }),
        },
      );

      if (!confirmResponse.ok) {
        setStatus('Upload stored in S3, but backend confirmation failed.');
        return;
      }

      setStatus(`Upload complete and confirmed. Id: ${id}`);
    } catch (error) {
      console.error(error);
      setStatus('Unexpected error during upload.');
    }
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1>Upload to S3 (POC)</h1>
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