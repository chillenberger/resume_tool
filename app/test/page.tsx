'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Editor } from '@tiptap/core'
import Document from '@tiptap/extension-document'
import Paragraph from '@tiptap/extension-paragraph'
import Text from '@tiptap/extension-text'
import Heading from '@tiptap/extension-heading'
import { SimpleEditor } from '@/components/tiptap-templates/simple/simple-editor'

// new Editor({
//   element: document.querySelector('.element'),
//   extensions: [
//     Document,
//     Paragraph,
//     Text,
//     Heading.configure({
//       levels: [1, 2, 3],
//     }),
//   ],
// })

const Tiptap = () => {
  const editor = useEditor({
    extensions: [
      Document,
      Paragraph,
      Text,
      Heading.configure({
        levels: [1, 2, 3],
      }),
    ],
    content: '<p>Hello World! 🌎️</p>',
    // Don't render immediately on the server to avoid SSR issues
    immediatelyRender: false,
  })

  return <div className="w-50"><SimpleEditor content="{name: [test some json]}"/></div>
}

export default Tiptap