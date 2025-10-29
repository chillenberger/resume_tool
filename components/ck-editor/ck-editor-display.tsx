// components/custom-editor.js
'use client' // Required only in App Router.

import { useRef, RefObject } from 'react';
import { CKEditor } from '@ckeditor/ckeditor5-react';
import { ClassicEditor, Essentials, Paragraph, Bold, Italic, Editor, FullPage, GeneralHtmlSupport } from 'ckeditor5';

import 'ckeditor5/ckeditor5.css';
import 'ckeditor5-premium-features/ckeditor5-premium-features.css';


export default function DisplayEditor({editorRef, defaultContent}: {editorRef: RefObject<Editor | null>, defaultContent: string}) {
    return (
        <div className="w-[50rem]">
            <CKEditor
                editor={ ClassicEditor }
                config={ {
                    licenseKey: 'GPL',
                    plugins: [ Essentials, Paragraph, Bold, Italic, FullPage, GeneralHtmlSupport ],
                    toolbar: [ 'undo', 'redo', '|', 'bold', 'italic' ],
                    initialData: defaultContent,
                    htmlSupport: {
                        // fullPage: {
                        //     allowRenderStylesFromHead: true,
                        // },
                        allow: [
                            {
                                name: /.*/,
                                attributes: true,
                                classes: true,
                                styles: true
                            }
                        ]
                    }
                } }
                onReady={ (editor: Editor) => {
                    editorRef.current = editor;
                }}
            />
        </div>
    );
}
