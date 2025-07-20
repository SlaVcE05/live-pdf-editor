
export type ToolType = 'select' | 'text' | 'signature';

export interface BaseElement {
    id: string;
    type: 'text' | 'signature';
    x: number;
    y: number;
    width: number;
    height: number;
    pageIndex: number;
}

export interface TextElement extends BaseElement {
    type: 'text';
    text: string;
    fontSize: number;
}

export interface SignatureElement extends BaseElement {
    type: 'signature';
    imageData: string; // base64 data URL
}

export type EditableElement = TextElement | SignatureElement;

export interface PageInfo {
    dataUrl: string;
    width: number;
    height: number;
}