import katex from 'katex';
import { useMemo } from 'react';

interface LatexMathProps {
  value: string;
  displayMode?: boolean;
  className?: string;
}

export default function LatexMath({ value, displayMode = false, className }: LatexMathProps) {
  const html = useMemo(() => {
    try {
      return katex.renderToString(value, {
        throwOnError: false,
        displayMode,
        output: 'html',
        strict: false,
        trust: false,
      });
    } catch {
      return value;
    }
  }, [value, displayMode]);

  return <span className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}
