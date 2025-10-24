"use client";

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import { useEffect } from 'react';

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  name: string;
}

export default function RichTextEditor({ content, onChange, name }: RichTextEditorProps) {
  const editor = useEditor({
    immediatelyRender: false, // prevent SSR hydration mismatch in Next.js
    extensions: [
      StarterKit,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Underline,
    ],
    content: content || '',
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-xl focus:outline-none min-h-[200px] p-4',
      },
    },
  });

  // Update editor content when prop changes
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content || '');
    }
  }, [content, editor]);

  if (!editor) {
    return null;
  }

  return (
    <div className="border border-charcoal/20 rounded-lg overflow-hidden bg-white">
      {/* Toolbar */}
      <div className="border-b border-charcoal/10 bg-cream p-2 flex flex-wrap gap-1">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`px-3 py-1.5 text-xs rounded transition-colors ${
            editor.isActive('bold')
              ? 'bg-charcoal text-cream'
              : 'bg-white text-charcoal hover:bg-charcoal/10'
          }`}
        >
          <strong>B</strong>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`px-3 py-1.5 text-xs rounded transition-colors ${
            editor.isActive('italic')
              ? 'bg-charcoal text-cream'
              : 'bg-white text-charcoal hover:bg-charcoal/10'
          }`}
        >
          <em>I</em>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={`px-3 py-1.5 text-xs rounded transition-colors ${
            editor.isActive('underline')
              ? 'bg-charcoal text-cream'
              : 'bg-white text-charcoal hover:bg-charcoal/10'
          }`}
        >
          <u>U</u>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={`px-3 py-1.5 text-xs rounded transition-colors ${
            editor.isActive('strike')
              ? 'bg-charcoal text-cream'
              : 'bg-white text-charcoal hover:bg-charcoal/10'
          }`}
        >
          <s>S</s>
        </button>

        <div className="w-px bg-charcoal/10 mx-1" />

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`px-3 py-1.5 text-xs rounded transition-colors ${
            editor.isActive('heading', { level: 1 })
              ? 'bg-charcoal text-cream'
              : 'bg-white text-charcoal hover:bg-charcoal/10'
          }`}
        >
          H1
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`px-3 py-1.5 text-xs rounded transition-colors ${
            editor.isActive('heading', { level: 2 })
              ? 'bg-charcoal text-cream'
              : 'bg-white text-charcoal hover:bg-charcoal/10'
          }`}
        >
          H2
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={`px-3 py-1.5 text-xs rounded transition-colors ${
            editor.isActive('heading', { level: 3 })
              ? 'bg-charcoal text-cream'
              : 'bg-white text-charcoal hover:bg-charcoal/10'
          }`}
        >
          H3
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().setParagraph().run()}
          className={`px-3 py-1.5 text-xs rounded transition-colors ${
            editor.isActive('paragraph')
              ? 'bg-charcoal text-cream'
              : 'bg-white text-charcoal hover:bg-charcoal/10'
          }`}
        >
          P
        </button>

        <div className="w-px bg-charcoal/10 mx-1" />

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`px-3 py-1.5 text-xs rounded transition-colors ${
            editor.isActive('bulletList')
              ? 'bg-charcoal text-cream'
              : 'bg-white text-charcoal hover:bg-charcoal/10'
          }`}
        >
          • List
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`px-3 py-1.5 text-xs rounded transition-colors ${
            editor.isActive('orderedList')
              ? 'bg-charcoal text-cream'
              : 'bg-white text-charcoal hover:bg-charcoal/10'
          }`}
        >
          1. List
        </button>

        <div className="w-px bg-charcoal/10 mx-1" />

        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          className={`px-3 py-1.5 text-xs rounded transition-colors ${
            editor.isActive({ textAlign: 'left' })
              ? 'bg-charcoal text-cream'
              : 'bg-white text-charcoal hover:bg-charcoal/10'
          }`}
        >
          ⫷
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          className={`px-3 py-1.5 text-xs rounded transition-colors ${
            editor.isActive({ textAlign: 'center' })
              ? 'bg-charcoal text-cream'
              : 'bg-white text-charcoal hover:bg-charcoal/10'
          }`}
        >
          ⫶
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          className={`px-3 py-1.5 text-xs rounded transition-colors ${
            editor.isActive({ textAlign: 'right' })
              ? 'bg-charcoal text-cream'
              : 'bg-white text-charcoal hover:bg-charcoal/10'
          }`}
        >
          ⫸
        </button>

        <div className="w-px bg-charcoal/10 mx-1" />

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`px-3 py-1.5 text-xs rounded transition-colors ${
            editor.isActive('blockquote')
              ? 'bg-charcoal text-cream'
              : 'bg-white text-charcoal hover:bg-charcoal/10'
          }`}
        >
          " Quote
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          className="px-3 py-1.5 text-xs rounded bg-white text-charcoal hover:bg-charcoal/10 transition-colors"
        >
          ― HR
        </button>
      </div>

      {/* Editor */}
      <EditorContent editor={editor} />

      {/* Hidden input to submit the HTML content */}
      <input type="hidden" name={name} value={editor.getHTML()} />
    </div>
  );
}
