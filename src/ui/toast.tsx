import { Toaster, ToastBar } from 'react-hot-toast';
import type { ToasterProps } from 'react-hot-toast';

export function AppToaster(props: ToasterProps) {
  return (
    <Toaster
      position="top-right"
      gutter={12}
      toastOptions={{
        style: {
          background: '#a16fec',
          color: 'white',
          borderRadius: '0.75rem',
          padding: '0.75rem 1rem',
          fontSize: '0.9rem',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
        },
        success: {
          iconTheme: {
            primary: '#22c55e',
            secondary: 'white',
          },
        },
        error: {
          style: {
            background: '#e5484d',
            color: 'white',
          },
          iconTheme: {
            primary: '#ffffff',
            secondary: '#e5484d',
          },
        },
      }}
      {...props}
    >
      {(t) => (
        <ToastBar
          toast={t}
          style={{
            ...t.style,
          }}
        />
      )}
    </Toaster>
  );
}
