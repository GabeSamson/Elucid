"use client";

import { useState } from 'react';
import RichTextEditor from './RichTextEditor';

interface WritingSectionEditorProps {
  initialContent: string | null;
}

export default function WritingSectionEditor({ initialContent }: WritingSectionEditorProps) {
  const [content, setContent] = useState(initialContent || '');

  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-charcoal">
        Writing Section Content
      </label>
      <p className="text-xs text-charcoal/60 mb-3">
        This section will appear between the hero and featured products sections on the homepage.
      </p>
      <RichTextEditor
        content={content}
        onChange={setContent}
        name="writingSection"
      />
    </div>
  );
}
