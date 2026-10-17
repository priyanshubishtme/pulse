import { useParams } from 'react-router-dom';

const messages: Record<string, string> = {
  'not-found': 'This short link does not exist.',
  'disabled': 'This short link is disabled.',
  'expired': 'This short link has expired.',
  'limit-reached': 'This short link has reached its click limit.',
};

export const StatusPage = () => {
  const { reason } = useParams();
  const message = messages[reason as string] || 'Unknown status.';

  return (
    <div className="min-h-screen flex items-center justify-center bg-sand text-center p-4">
      <div className="bg-cream p-12 rounded-[24px] shadow-sm max-w-lg w-full border border-line">
        <div className="mb-6">
          <svg className="w-16 h-16 mx-auto text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h1 className="text-2xl font-display font-bold text-navy-900 mb-4">{message}</h1>
        <p className="text-textMuted">If you believe this is an error, please contact the link owner.</p>
        <a href="/" className="mt-8 inline-block text-primary font-medium hover:underline">Go to LinkPulse</a>
      </div>
    </div>
  );
};
