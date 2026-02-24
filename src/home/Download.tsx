const JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwMTIyMTk2Mi1hNDk1LTRlZGMtYTA5ZS01OGQyMWE0ZjZhNGMiLCJ1aWQiOiJmOGFkNzYzOC03ZWJkLTQzZTUtYmFhOS1mNTJhYmIzMDkyNDYiLCJ0eXBlIjoiZGV2aWNlIiwiaWF0IjoxNzY5OTU1ODAyLCJleHAiOjE3ODU1MDc4MDJ9.dBGmVp8e33rR1G-w-HDcQyK02-nppNLx8J68EBgXjRo';
const BASE_URL = 'http://localhost:3000';

export function Download() {
  const handleDownload = async () => {
    const url = `${BASE_URL}/files/download/`;
    const response = await fetch(url, 
      { 
        headers: { 'Authorization': 'Bearer ' + JWT },
        method: 'GET',
      });
    if (!response.ok) return;

    const data = await response.json() as { url: string };
    if (!data.url) return;

    window.location.href = data.url;
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1>Download from S3 (POC)</h1>
      <button
        type="button"
        onClick={handleDownload}
        style={{ marginLeft: '1rem', padding: '0.5rem 1rem' }}
      >
        Download
      </button>
    </div>
  );
}