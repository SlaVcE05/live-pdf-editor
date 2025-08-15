
export type ToolType = 'select' | 'text' | 'signature' | 'symbol';

export interface BaseElement {
    id: string;
    type: 'text' | 'signature' | 'symbol';
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
    fontFamily: string;
    isBold: boolean;
    isItalic: boolean;
}

export interface SignatureElement extends BaseElement {
    type: 'signature';
    imageData: string; // base64 data URL
}

export interface SymbolElement extends BaseElement {
    type: 'symbol';
    symbolType: 'checkmark';
    color: string;
}

export type EditableElement = TextElement | SignatureElement | SymbolElement;

export interface PageInfo {
    dataUrl: string;
    width: number;
    height: number;
}
