import { useRef  } from "react";
import {  Editor } from 'ckeditor5';

export default function useCKHtmlEditor (onUpdateCallback?: () => void) {
    const editorRef = useRef<Editor | null>(null);

    return {editorRef, onUpdateCallback};
}
