import { useEffect, useRef } from 'react';
import QRCodeStyling from 'qr-code-styling';

interface QrDesignerProps {
  url: string;
  pattern?: 'dots' | 'rounded' | 'classy' | 'classy-rounded' | 'square' | 'extra-rounded';
  cornerStyle?: 'dot' | 'square' | 'extra-rounded';
  color?: string;
  size?: number;
  onDownload?: (ext: 'png' | 'svg') => void;
}

export const QrDesigner = ({
  url,
  pattern = 'square',
  cornerStyle = 'square',
  color = '#000000',
  size = 300
}: QrDesignerProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const qrCode = useRef<QRCodeStyling | undefined>(undefined);

  useEffect(() => {
    qrCode.current = new QRCodeStyling({
      width: size,
      height: size,
      data: url,
      margin: 10,
      dotsOptions: { color, type: pattern },
      cornersSquareOptions: { color, type: cornerStyle },
      backgroundOptions: { color: '#ffffff' },
    });

    if (ref.current) {
      ref.current.innerHTML = '';
      qrCode.current.append(ref.current);
    }
  }, []);

  useEffect(() => {
    if (!qrCode.current) return;
    qrCode.current.update({
      data: url,
      width: size,
      height: size,
      dotsOptions: { color, type: pattern },
      cornersSquareOptions: { color, type: cornerStyle }
    });
  }, [url, pattern, cornerStyle, color, size]);

  return (
    <div className="flex flex-col items-center gap-4">
      <div ref={ref} className="border border-line rounded-[10px] overflow-hidden" />
      <div className="flex gap-2">
        <button
          onClick={() => qrCode.current?.download({ extension: 'png' })}
          className="text-sm bg-primary text-cream px-3 py-1 rounded hover:bg-primary/90"
        >
          Download PNG
        </button>
        <button
          onClick={() => qrCode.current?.download({ extension: 'svg' })}
          className="text-sm bg-sand text-textPrimary px-3 py-1 rounded border border-line hover:bg-sand/80"
        >
          Download SVG
        </button>
      </div>
    </div>
  );
};
