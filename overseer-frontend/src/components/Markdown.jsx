import { useMemo } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

marked.setOptions({ gfm: true, breaks: false });

export default function Markdown({ source, className = '' }) {
  const html = useMemo(() => {
    const raw = marked.parse(source ?? '');
    return DOMPurify.sanitize(raw, { ADD_ATTR: ['target', 'rel'] });
  }, [source]);

  return (
    <div
      className={`markdown-body ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}