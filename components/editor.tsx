"use client";

import { useEditor, EditorContent, Extension } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { Bold, Italic, List, ListOrdered, Quote, Undo, Redo, Link as LinkIcon, Indent, Outdent } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Plugin } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

// Custom extension to highlight variables like {{name}}
const VariableHighlighter = Extension.create({
    name: 'variableHighlighter',

    addProseMirrorPlugins() {
        return [
            new Plugin({
                props: {
                    decorations(state) {
                        const decorations: Decoration[] = []
                        const doc = state.doc

                        doc.descendants((node, pos) => {
                            if (!node.isText) {
                                return
                            }

                            const text = node.text
                            if (!text) return

                            const regex = /\{\{([^}]+)\}\}/g
                            let match

                            while ((match = regex.exec(text)) !== null) {
                                const from = pos + match.index
                                const to = from + match[0].length
                                decorations.push(
                                    Decoration.inline(from, to, {
                                        class: 'variable-highlight',
                                    })
                                )
                            }
                        })

                        return DecorationSet.create(doc, decorations)
                    },
                },
            }),
        ]
    },
})

interface EditorProps {
    content: string;
    onChange?: (html: string) => void;
    editable?: boolean;
    className?: string;
}

export function Editor({ content, onChange, editable = true, className }: EditorProps) {
    const editor = useEditor({
        immediatelyRender: false,
        extensions: [
            StarterKit,
            Link.configure({
                openOnClick: false,
                HTMLAttributes: {
                    class: "text-blue-500 underline",
                },
            }),
            VariableHighlighter,
        ],
        content,
        editable,
        onUpdate: ({ editor }) => {
            onChange?.(editor.getHTML());
        },
        editorProps: {
            attributes: {
                class: cn(
                    "prose prose-sm sm:prose-base dark:prose-invert focus:outline-none max-w-none min-h-[200px] p-4",
                    className
                ),
            },
        },
    });

    // Force re-render on selection update so toolbar state is correct
    const [_, forceUpdate] = useState(0);
    useEffect(() => {
        if (!editor) return;

        const handleUpdate = () => forceUpdate((n: number) => n + 1);

        editor.on('selectionUpdate', handleUpdate);
        editor.on('transaction', handleUpdate);

        return () => {
            editor.off('selectionUpdate', handleUpdate);
            editor.off('transaction', handleUpdate);
        };
    }, [editor]);

    // Sync content updates from parent if needed
    useEffect(() => {
        if (editor && content !== editor.getHTML()) {
            if (editor.getText() === "" && content !== "") {
                editor.commands.setContent(content);
            }
        }
    }, [content, editor]);

    const setLink = () => {
        const previousUrl = editor?.getAttributes('link').href
        const url = window.prompt('URL', previousUrl)

        // cancelled
        if (url === null) {
            return
        }

        // empty
        if (url === '') {
            editor?.chain().focus().extendMarkRange('link').unsetLink().run()
            return
        }

        // update
        editor?.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
    }

    if (!editor) {
        return null;
    }

    return (
        <div className="border border-input rounded-md overflow-hidden bg-background">
            {editable && (
                <div className="border-b border-input bg-muted/50 p-2 flex flex-wrap gap-1">
                    <Toggle
                        isActive={editor.isActive("bold")}
                        onClick={() => editor.chain().focus().toggleBold().run()}
                        icon={<Bold className="h-4 w-4" />}
                        label="Bold"
                    />
                    <Toggle
                        isActive={editor.isActive("italic")}
                        onClick={() => editor.chain().focus().toggleItalic().run()}
                        icon={<Italic className="h-4 w-4" />}
                        label="Italic"
                    />
                    <Toggle
                        isActive={editor.isActive("link")}
                        onClick={setLink}
                        icon={<LinkIcon className="h-4 w-4" />}
                        label="Link"
                    />
                    <div className="w-px h-6 bg-border mx-1" />
                    <Toggle
                        isActive={false} // Indent/Outdent are actions, not states
                        onClick={() => editor.chain().focus().liftListItem('listItem').run()}
                        icon={<Outdent className="h-4 w-4" />}
                        label="Outdent"
                        disabled={!editor.can().liftListItem('listItem')}
                    />
                    <Toggle
                        isActive={false}
                        onClick={() => editor.chain().focus().sinkListItem('listItem').run()}
                        icon={<Indent className="h-4 w-4" />}
                        label="Indent"
                        disabled={!editor.can().sinkListItem('listItem')}
                    />
                    <div className="w-px h-6 bg-border mx-1" />
                    <Toggle
                        isActive={editor.isActive("bulletList")}
                        onClick={() => editor.chain().focus().toggleBulletList().run()}
                        icon={<List className="h-4 w-4" />}
                        label="Bullet List"
                    />
                    <Toggle
                        isActive={editor.isActive("orderedList")}
                        onClick={() => editor.chain().focus().toggleOrderedList().run()}
                        icon={<ListOrdered className="h-4 w-4" />}
                        label="Ordered List"
                    />
                    <div className="w-px h-6 bg-border mx-1" />
                    <Toggle
                        isActive={editor.isActive("blockquote")}
                        onClick={() => editor.chain().focus().toggleBlockquote().run()}
                        icon={<Quote className="h-4 w-4" />}
                        label="Quote"
                    />
                </div>
            )}
            <EditorContent editor={editor} />
        </div>
    );
}

function Toggle({ isActive, onClick, icon, label, disabled }: { isActive: boolean; onClick: () => void; icon: React.ReactNode; label: string; disabled?: boolean }) {
    return (
        <Button
            variant={isActive ? "secondary" : "ghost"}
            size="sm"
            onClick={onClick}
            className="h-8 w-8 p-0"
            title={label}
            type="button"
            disabled={disabled}
        >
            {icon}
            <span className="sr-only">{label}</span>
        </Button>
    )
}
