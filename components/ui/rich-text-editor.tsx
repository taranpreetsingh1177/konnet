'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import { Node } from '@tiptap/core'
import { Button } from '@/components/ui/button'
import {
    Bold, Italic, List, ListOrdered, Link as LinkIcon,
    Code, Heading1, Heading2, Quote, Undo, Redo
} from 'lucide-react'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useEffect } from 'react'
import { cn } from '@/lib/utils'

// Custom extension to preserve HTML divs and inline styles (for AI-generated templates)
const PreserveHTML = Node.create({
    name: 'preserveHTML',
    group: 'block',
    content: 'inline*',
    parseHTML() {
        return [
            { tag: 'div' },
        ]
    },
    renderHTML({ HTMLAttributes }) {
        return ['div', HTMLAttributes, 0]
    },
    addAttributes() {
        return {
            style: {
                default: null,
                parseHTML: element => element.getAttribute('style'),
                renderHTML: attributes => {
                    if (!attributes.style) {
                        return {}
                    }
                    return { style: attributes.style }
                },
            },
            class: {
                default: null,
                parseHTML: element => element.getAttribute('class'),
                renderHTML: attributes => {
                    if (!attributes.class) {
                        return {}
                    }
                    return { class: attributes.class }
                },
            },
        }
    },
})

interface RichTextEditorProps {
    value: string
    onChange: (value: string) => void
    placeholder?: string
    className?: string
}

export function RichTextEditor({ value, onChange, placeholder, className }: RichTextEditorProps) {
    const editor = useEditor({
        immediatelyRender: false,
        extensions: [
            StarterKit.configure({
                // Allow paragraph to have inline styles
                paragraph: {
                    HTMLAttributes: {
                        style: null,
                    },
                },
            }),
            PreserveHTML, // Our custom extension to preserve divs
            Link.configure({
                openOnClick: false,
                HTMLAttributes: {
                    class: 'text-blue-500 hover:text-blue-600 underline',
                },
            }),
        ],
        content: value,
        editorProps: {
            attributes: {
                class: 'min-h-[150px] w-full rounded-md border-0 bg-transparent px-3 py-2 text-sm focus-visible:outline-none',
            },
        },
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML())
        },
    })

    // Update content if value changes externally
    useEffect(() => {
        if (editor && value !== editor.getHTML()) {
            editor.commands.setContent(value)
        }
    }, [value, editor])

    if (!editor) {
        return null
    }

    const addVariable = (variable: string) => {
        editor.chain().focus().insertContent(`{${variable}}`).run()
    }

    const setLink = () => {
        const previousUrl = editor.getAttributes('link').href
        const url = window.prompt('URL', previousUrl)

        if (url === null) {
            return
        }

        if (url === '') {
            editor.chain().focus().extendMarkRange('link').unsetLink().run()
            return
        }

        editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
    }

    return (
        <div className={cn("border rounded-md", className)}>
            <div className="flex flex-wrap items-center gap-1 p-1 border-b bg-gray-50/50">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    className={cn("h-8 w-8", editor.isActive('bold') ? 'bg-gray-200' : '')}
                >
                    <Bold className="h-4 w-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    className={cn("h-8 w-8", editor.isActive('italic') ? 'bg-gray-200' : '')}
                >
                    <Italic className="h-4 w-4" />
                </Button>

                <div className="w-px h-6 bg-gray-200 mx-1" />

                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                    className={cn("h-8 w-8", editor.isActive('heading', { level: 1 }) ? 'bg-gray-200' : '')}
                >
                    <Heading1 className="h-4 w-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                    className={cn("h-8 w-8", editor.isActive('heading', { level: 2 }) ? 'bg-gray-200' : '')}
                >
                    <Heading2 className="h-4 w-4" />
                </Button>

                <div className="w-px h-6 bg-gray-200 mx-1" />

                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    className={cn("h-8 w-8", editor.isActive('bulletList') ? 'bg-gray-200' : '')}
                >
                    <List className="h-4 w-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    className={cn("h-8 w-8", editor.isActive('orderedList') ? 'bg-gray-200' : '')}
                >
                    <ListOrdered className="h-4 w-4" />
                </Button>

                <div className="w-px h-6 bg-gray-200 mx-1" />

                <Button
                    variant="ghost"
                    size="icon"
                    onClick={setLink}
                    className={cn("h-8 w-8", editor.isActive('link') ? 'bg-gray-200' : '')}
                >
                    <LinkIcon className="h-4 w-4" />
                </Button>

                <div className="flex-1" />

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-8 gap-2">
                            <Code className="h-4 w-4" />
                            Variables
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => addVariable('name')}>
                            Full Name
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => addVariable('email')}>
                            Email Address
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => addVariable('role')}>
                            Job Role
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => addVariable('company_name')}>
                            Company Name
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            <EditorContent editor={editor} className="p-2" />

            <style jsx global>{`
                .ProseMirror p {
                    margin-bottom: 0.5rem;
                }
                .ProseMirror ul, .ProseMirror ol {
                    padding-left: 1.5rem;
                    margin-bottom: 0.5rem;
                }
                .ProseMirror ul {
                    list-style-type: disc;
                }
                .ProseMirror ol {
                    list-style-type: decimal;
                }
                .ProseMirror h1 {
                    font-size: 1.5rem;
                    font-weight: bold;
                    margin-bottom: 0.5rem;
                }
                .ProseMirror h2 {
                    font-size: 1.25rem;
                    font-weight: bold;
                    margin-bottom: 0.5rem;
                }
            `}</style>
        </div>
    )
}
