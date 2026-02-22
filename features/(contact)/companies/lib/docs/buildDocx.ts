import {
    Document,
    Packer,
    Paragraph,
    Table,
    TableRow,
    TableCell,
    TextRun,
    HeadingLevel,
    AlignmentType,
    WidthType,
    BorderStyle,
    ShadingType,
} from "docx";
import type { DocumentAST } from "./docTypes";

const TABLE_BORDER = {
    top: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
    bottom: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
    left: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
    right: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
};

const HEADING_MAP: Record<1 | 2 | 3, (typeof HeadingLevel)[keyof typeof HeadingLevel]> = {
    1: HeadingLevel.HEADING_1,
    2: HeadingLevel.HEADING_2,
    3: HeadingLevel.HEADING_3,
};

function renderCoverTable(rows: { label: string; value: string }[]) {
    return new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: rows.map(
            ({ label, value }) =>
                new TableRow({
                    children: [
                        new TableCell({
                            width: { size: 30, type: WidthType.PERCENTAGE },
                            borders: TABLE_BORDER,
                            shading: { type: ShadingType.SOLID, color: "F5F5F5" },
                            children: [
                                new Paragraph({
                                    children: [new TextRun({ text: label, bold: true, size: 20 })],
                                }),
                            ],
                        }),
                        new TableCell({
                            width: { size: 70, type: WidthType.PERCENTAGE },
                            borders: TABLE_BORDER,
                            children: [new Paragraph({ text: value })],
                        }),
                    ],
                })
        ),
    });
}

function renderTable(headers: string[], rows: string[][]) {
    return new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
            // Header row
            new TableRow({
                children: headers.map(
                    (h) =>
                        new TableCell({
                            borders: TABLE_BORDER,
                            shading: { type: ShadingType.SOLID, color: "1A1A1A" },
                            children: [
                                new Paragraph({
                                    children: [new TextRun({ text: h, bold: true, color: "FFFFFF", size: 20 })],
                                }),
                            ],
                        })
                ),
            }),
            // Data rows
            ...rows.map(
                (row, i) =>
                    new TableRow({
                        children: row.map(
                            (val) =>
                                new TableCell({
                                    borders: TABLE_BORDER,
                                    shading: {
                                        type: ShadingType.SOLID,
                                        color: i % 2 === 0 ? "FFFFFF" : "FAFAFA",
                                    },
                                    children: [new Paragraph({ text: val })],
                                })
                        ),
                    })
            ),
        ],
    });
}

export async function buildDocx(ast: DocumentAST): Promise<Buffer> {
    const children: (Paragraph | Table)[] = [];

    for (const node of ast.nodes) {
        switch (node.type) {
            case "coverTable":
                children.push(renderCoverTable(node.rows));
                children.push(new Paragraph({ text: "" })); // spacer
                break;

            case "heading":
                children.push(
                    new Paragraph({
                        text: node.text,
                        heading: HEADING_MAP[node.level],
                        spacing: { before: node.level === 1 ? 400 : 200, after: 100 },
                    })
                );
                break;

            case "paragraph":
                children.push(
                    new Paragraph({
                        text: node.text,
                        spacing: { after: 120 },
                    })
                );
                break;

            case "bulletList":
                if (node.intro) {
                    children.push(
                        new Paragraph({
                            children: [new TextRun({ text: node.intro, bold: true })],
                            spacing: { before: 100, after: 60 },
                        })
                    );
                }
                node.items.forEach((item) => {
                    children.push(
                        new Paragraph({
                            text: item,
                            bullet: { level: 0 },
                            spacing: { after: 60 },
                        })
                    );
                });
                break;

            case "table":
                children.push(renderTable(node.headers, node.rows));
                children.push(new Paragraph({ text: "" })); // spacer
                break;

            case "questionGroup":
                children.push(
                    new Paragraph({
                        children: [new TextRun({ text: node.category, bold: true, italics: true })],
                        spacing: { before: 200, after: 80 },
                    })
                );
                node.questions.forEach((q) => {
                    children.push(
                        new Paragraph({
                            text: q,
                            bullet: { level: 0 },
                            spacing: { after: 60 },
                        })
                    );
                });
                break;

            case "footer":
                children.push(
                    new Paragraph({
                        children: [new TextRun({ text: node.text, italics: true, size: 18, color: "666666" })],
                        alignment: AlignmentType.CENTER,
                        spacing: { before: 600 },
                    })
                );
                break;
        }
    }

    const doc = new Document({
        styles: {
            default: {
                document: {
                    run: { font: "Calibri", size: 22 },
                },
            },
            paragraphStyles: [
                {
                    id: "Heading1",
                    name: "Heading 1",
                    run: { font: "Calibri", size: 28, bold: true, color: "1A1A1A" },
                    paragraph: { spacing: { before: 400, after: 100 } },
                },
                {
                    id: "Heading2",
                    name: "Heading 2",
                    run: { font: "Calibri", size: 24, bold: true, color: "333333" },
                    paragraph: { spacing: { before: 300, after: 80 } },
                },
            ],
        },
        sections: [{ children }],
    });

    return Packer.toBuffer(doc);
}
