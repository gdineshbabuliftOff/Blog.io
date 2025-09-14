'use client';

import React, { useState, useReducer, useEffect, useRef, createContext, useContext, ChangeEvent } from 'react';
import Head from 'next/head';
import { useParams, useRouter } from 'next/navigation';
import { produce } from 'immer';
import useSWR from 'swr';
import {
  FaMobileAlt, FaTabletAlt, FaDesktop, FaSave, FaArrowLeft, FaUndo, FaRedo, FaTrashAlt,
  FaBold, FaItalic, FaUnderline, FaLink, FaPlus
} from 'react-icons/fa';
import {
  PageContent, Element, ElementType, SiteData, PageStyles,
} from './editor';
import {
  Menu, X, ChevronDown, Rows, Columns, Image as ImageIcon, Type, List as ListIcon, Video, Link as LinkIcon, Minus, Square,
  Star, Wind, Sparkles, Settings, History, Move, ListOrdered, GalleryHorizontal, Footprints, Captions, LucideProps, RectangleHorizontal, LayoutPanelLeft
} from 'lucide-react';
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = "AIzaSyAT5DlkF5bbvu7_vQIXr3sjAqz40_5q9A0";
const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const generateContentWithGemini = async (prompt: string): Promise<string> => {
  try {
    const result = await model.generateContent(prompt);
    return (await result.response).text();
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Error: Could not generate content.";
  }
};

const apiClient = {
  fetchSite: async (siteId: string): Promise<SiteData> => ({
    id: siteId,
    ownerId: 'mock-user-id',
    title: 'My Awesome Website',
    subdomain: 'my-awesome-site',
    content: [],
    pageStyles: { fontFamily: "'Inter', sans-serif", backgroundColor: '#f0f2f5', color: '#111827' },
  }),
  saveSite: async (siteId: string, data: SiteData): Promise<{ success: boolean }> => {
      console.log(`Saving site ${siteId}...`, data);
      return { success: true };
  },
  publishSite: async (siteId: string): Promise<{ success: boolean }> => {
      console.log(`Publishing site ${siteId}...`);
      return { success: true };
  },
};

type EditorAction =
  | { type: 'SET_PAGE_CONTENT'; payload: PageContent }
  | { type: 'ADD_ELEMENT'; payload: { element: Element; parentId: string; index: number } }
  | { type: 'UPDATE_ELEMENT_STYLES'; payload: { elementId: string; styles: object } }
  | { type: 'UPDATE_ELEMENT_CONTENT'; payload: { elementId: string; content: string } }
  | { type: 'DELETE_ELEMENT'; payload: { elementId: string } }
  | { type: 'MOVE_ELEMENT'; payload: { draggedId: string; targetParentId: string; targetIndex: number } }
  | { type: 'SET_SELECTED_ELEMENT'; payload: string | null }
  | { type: 'SET_PAGE_STYLES'; payload: object }
  | { type: 'ADD_HISTORY' }
  | { type: 'UNDO' }
  | { type: 'REDO' };

interface EditorState {
  pageContent: PageContent;
  selectedElementId: string | null;
  pageStyles: PageStyles;
  history: { content: PageContent; timestamp: number }[];
  historyIndex: number;
}

const initialState: EditorState = {
  pageContent: [],
  selectedElementId: null,
  pageStyles: { fontFamily: "'Inter', sans-serif", backgroundColor: '#f0f2f5', color: '#111827' },
  history: [],
  historyIndex: -1,
};

const findAndModifyImmer = (elements: Element[], elementId: string, modification: (element: Element, parent: Element[]) => void | null, parents: Element[] = []): boolean => {
    for (let i = 0; i < elements.length; i++) {
        const el = elements[i];
        if (el.id === elementId) {
            const result = modification(el, parents);
            if (result === null) {
                elements.splice(i, 1);
            }
            return true;
        }
        if (el.children?.length && findAndModifyImmer(el.children, elementId, modification, [...parents, el])) return true;
        if (el.type === 'columns' || el.type === 'right-image-section') {
            try {
                const content = JSON.parse(el.content);
                const containerKey = el.type === 'columns' ? 'columns' : 'children';
                const containers = el.type === 'columns' ? content.columns : [{children: el.children}];

                for (const container of containers) {
                    if (findAndModifyImmer(container.children, elementId, modification, [...parents, el])) {
                        if (el.type === 'columns') el.content = JSON.stringify(content, null, 2);
                        return true;
                    }
                }
            } catch (e) { /* Ignore parsing errors */ }
        }
    }
    return false;
};

const editorReducer = produce((draft: EditorState, action: EditorAction) => {
    const addHistoryEntry = () => {
        const currentStateString = JSON.stringify(draft.history[draft.historyIndex]?.content || {});
        const newStateString = JSON.stringify(draft.pageContent);
        if (currentStateString === newStateString) return;

        const newHistory = draft.history.slice(0, draft.historyIndex + 1);
        newHistory.push({ content: draft.pageContent, timestamp: Date.now() });
        draft.history = newHistory;
        draft.historyIndex = newHistory.length - 1;
    };

    switch (action.type) {
        case 'SET_PAGE_CONTENT': {
            draft.pageContent = action.payload;
            break;
        }
        case 'ADD_ELEMENT': {
            const { element, parentId, index } = action.payload;
            if (parentId === 'canvas') {
                draft.pageContent.splice(index, 0, element);
            } else {
                let parentFound = false;
                findAndModifyImmer(draft.pageContent, parentId, (parent) => {
                    if (parent.children) {
                        parent.children.splice(index, 0, element);
                        parentFound = true;
                    }
                });
                if (!parentFound) {
                     findAndModifyImmer(draft.pageContent, 'any', (el) => {
                        if (el.type === 'columns') {
                            const content = JSON.parse(el.content);
                            const col = content.columns.find((c: { id: string }) => c.id === parentId);
                            if (col) {
                                col.children.splice(index, 0, element);
                                el.content = JSON.stringify(content, null, 2);
                            }
                        }
                    });
                }
            }
            draft.selectedElementId = element.id;
            addHistoryEntry();
            break;
        }
        case 'UPDATE_ELEMENT_STYLES': {
            findAndModifyImmer(draft.pageContent, action.payload.elementId, (el) => {
                el.styles = { ...el.styles, ...action.payload.styles };
            });
            break;
        }
        case 'UPDATE_ELEMENT_CONTENT': {
            findAndModifyImmer(draft.pageContent, action.payload.elementId, (el) => {
                el.content = action.payload.content;
            });
            break;
        }
        case 'DELETE_ELEMENT': {
            findAndModifyImmer(draft.pageContent, action.payload.elementId, () => null);
            if (draft.selectedElementId === action.payload.elementId) {
                draft.selectedElementId = null;
            }
            addHistoryEntry();
            break;
        }
        case 'SET_SELECTED_ELEMENT': {
            draft.selectedElementId = action.payload;
            break;
        }
        case 'SET_PAGE_STYLES': {
            draft.pageStyles = { ...draft.pageStyles, ...action.payload };
            break;
        }
        case 'ADD_HISTORY': {
            addHistoryEntry();
            break;
        }
        case 'UNDO': {
            if (draft.historyIndex > 0) {
                draft.historyIndex--;
                draft.pageContent = draft.history[draft.historyIndex].content;
                draft.selectedElementId = null;
            }
            break;
        }
        case 'REDO': {
            if (draft.historyIndex < draft.history.length - 1) {
                draft.historyIndex++;
                draft.pageContent = draft.history[draft.historyIndex].content;
                draft.selectedElementId = null;
            }
            break;
        }
    }
});

const EditorContext = createContext<{ state: EditorState; dispatch: React.Dispatch<EditorAction> } | null>(null);

const useEditorContext = () => {
    const context = useContext(EditorContext);
    if (!context) {
        throw new Error('useEditorContext must be used within an EditorProvider');
    }
    return context;
};

export default function EditorPage() {
  const router = useRouter();
  const params = useParams();
  const siteId = params.siteId as string;
  const { data: initialSite, error } = useSWR(siteId ? `/api/sites/${siteId}` : null, () => apiClient.fetchSite(siteId));

  const [state, dispatch] = useReducer(editorReducer, initialState);
  const [screenSize, setScreenSize] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [activePanel, setActivePanel] = useState<'properties' | 'history'>('properties');
  
  const findElement = (elements: Element[], elementId: string): Element | null => {
    for (const el of elements) {
        if (el.id === elementId) return el;
        if (el.children?.length) {
            const found = findElement(el.children, elementId);
            if (found) return found;
        }
        if (el.type === 'columns' || el.type === 'right-image-section') {
            try {
                const content = el.type === 'columns' ? JSON.parse(el.content) : { columns: [{ children: el.children }] };
                for(const col of content.columns) {
                    const found = findElement(col.children, elementId);
                    if (found) return found;
                }
            } catch (e) { console.error("Failed to parse content", e); }
        }
    }
    return null;
  };

  const selectedElement = state.selectedElementId ? findElement(state.pageContent, state.selectedElementId) : null;
  
  useEffect(() => {
    if (initialSite && state.history.length === 0) {
      dispatch({ type: 'SET_PAGE_CONTENT', payload: initialSite.content });
      dispatch({ type: 'ADD_HISTORY' });
    }
  }, [initialSite]);
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); dispatch({ type: 'UNDO' }); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') { e.preventDefault(); dispatch({ type: 'REDO' }); }
      const target = e.target as HTMLElement;
      if ((e.key === 'Delete' || e.key === 'Backspace') && state.selectedElementId && !['input', 'textarea'].includes(target.tagName.toLowerCase()) && !target.isContentEditable) {
        e.preventDefault();
        dispatch({ type: 'DELETE_ELEMENT', payload: { elementId: state.selectedElementId } });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state.selectedElementId]);

  if (!siteId || !initialSite) return <div className="flex items-center justify-center h-screen bg-gray-900 text-white">Loading Editor...</div>;
  if (error) return <div className="flex items-center justify-center h-screen bg-gray-900 text-white">Failed to load site data.</div>;
  
  return (
    <EditorContext.Provider value={{ state, dispatch }}>
      <div className="flex h-screen bg-gray-800 text-white font-sans antialiased">
        <Head>
          <title>{initialSite.title} - Editor</title>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        </Head>
        
        <header className="fixed top-0 left-0 right-0 z-50 flex h-16 items-center justify-between px-4 bg-gray-900/80 backdrop-blur-md border-b border-gray-700">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="p-2 rounded-md hover:bg-gray-700 transition-colors"><FaArrowLeft /></button>
            <h1 className="text-xl font-semibold">{initialSite.title}</h1>
            <div className="flex items-center gap-1 bg-gray-800 p-1 rounded-lg">
              {['desktop', 'tablet', 'mobile'].map((size) => (
                <button key={size} onClick={() => setScreenSize(size as any)} className={`p-2 rounded-md transition-colors ${screenSize === size ? 'bg-indigo-600 text-white' : 'hover:bg-gray-700'}`} title={`${size.charAt(0).toUpperCase() + size.slice(1)} View`}>
                  {size === 'desktop' && <FaDesktop />}
                  {size === 'tablet' && <FaTabletAlt />}
                  {size === 'mobile' && <FaMobileAlt />}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => dispatch({ type: 'UNDO' })} disabled={state.historyIndex <= 0} className="p-2 rounded-md hover:bg-gray-700 transition-colors disabled:opacity-50" title="Undo"><FaUndo /></button>
            <button onClick={() => dispatch({ type: 'REDO' })} disabled={state.historyIndex >= state.history.length - 1} className="p-2 rounded-md hover:bg-gray-700 transition-colors disabled:opacity-50" title="Redo"><FaRedo /></button>
            <button onClick={() => apiClient.saveSite(siteId, { ...initialSite, content: state.pageContent, pageStyles: state.pageStyles })} className="flex items-center gap-2 px-4 py-2 bg-gray-700 rounded-md hover:bg-gray-600 transition-colors"><FaSave /><span>Save</span></button>
            <button onClick={() => apiClient.publishSite(siteId)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 rounded-md hover:bg-indigo-500 transition-colors"><Sparkles size={16} /><span>Publish</span></button>
          </div>
        </header>

        <div className="flex flex-1 pt-16">
          <LeftPanel />
          <EditorCanvas screenSize={screenSize}/>
          <RightPanel activePanel={activePanel} setActivePanel={setActivePanel} selectedElement={selectedElement} />
        </div>

        {selectedElement && <RichTextToolbar element={selectedElement} />}
      </div>
    </EditorContext.Provider>
  );
}
EditorPage.displayName = 'EditorPage';

interface DraggableItemProps {
    type: ElementType;
    icon: React.ComponentType<LucideProps>;
    label: string;
}

const DraggableItem = ({ type, icon: Icon, label }: DraggableItemProps) => {
  const handleDragStart = (e: React.DragEvent) => e.dataTransfer.setData('elementType', type);
  return (
    <div draggable onDragStart={handleDragStart} className="flex flex-col items-center gap-2 p-2 rounded-lg bg-gray-800 border border-gray-700 cursor-grab transition-all hover:bg-gray-700 hover:border-indigo-500">
      <Icon className="text-indigo-400" size={24} />
      <span className="text-xs text-center">{label}</span>
    </div>
  );
};
DraggableItem.displayName = 'DraggableItem';

const LeftPanel = () => {
    const elements: DraggableItemProps[] = [
        { type: 'section', icon: Rows, label: 'Section' },
        { type: 'columns', icon: Columns, label: 'Columns' },
        { type: 'box', icon: Square, label: 'Box' },
        { type: 'card', icon: RectangleHorizontal, label: 'Card' },
        { type: 'right-image-section', icon: LayoutPanelLeft, label: 'Image Section' },
        { type: 'hero', icon: Captions, label: 'Hero' },
        { type: 'navbar', icon: Menu, label: 'Navbar' },
        { type: 'footer', icon: Footprints, label: 'Footer' },
        { type: 'heading', icon: Type, label: 'Heading' },
        { type: 'paragraph', icon: ListIcon, label: 'Paragraph' },
        { type: 'image', icon: ImageIcon, label: 'Image' },
        { type: 'gallery', icon: GalleryHorizontal, label: 'Gallery' },
        { type: 'button', icon: LinkIcon, label: 'Button' },
        { type: 'ordered-list', icon: ListOrdered, label: 'Ordered List' },
        { type: 'unordered-list', icon: ListIcon, label: 'Unordered List' },
    ];
    return (
        <aside className="w-64 flex-shrink-0 bg-gray-900 p-4 border-r border-gray-700 overflow-y-auto">
            <h2 className="mb-4 text-lg font-bold">Elements</h2>
            <div className="grid grid-cols-2 gap-2">
                {elements.map(el => <DraggableItem key={el.type} {...el} />)}
            </div>
        </aside>
    );
};
LeftPanel.displayName = 'LeftPanel';

const getScreenSizeClass = (screenSize: 'desktop' | 'tablet' | 'mobile') => {
  switch (screenSize) {
    case 'tablet': return 'w-[768px]';
    case 'mobile': return 'w-[420px]';
    default: return 'w-full';
  }
};

const EditorCanvas = ({ screenSize }: { screenSize: 'desktop' | 'tablet' | 'mobile' }) => {
    const { state, dispatch } = useEditorContext();
    const { pageContent, pageStyles } = state;
    const [dropIndicator, setDropIndicator] = useState<{ parentId: string; index: number; } | null>(null);

    const createNewElement = (type: ElementType): Element => {
        const baseElement: Omit<Element, 'id'> & { type: ElementType } = { type, styles: {}, children: [] };
        switch(type) {
            case 'section': baseElement.styles = { minHeight: '100px', width: '100%', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }; break;
            case 'box': baseElement.styles = { minHeight: '100px', width: '100%', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }; break;
            case 'card': baseElement.styles = { minHeight: '100px', width: '100%', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', backgroundColor: '#ffffff', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)', borderRadius: '12px' }; break;
            case 'right-image-section': 
                baseElement.styles = { width: '100%', padding: '20px', display: 'flex', alignItems: 'center', gap: '20px' }; 
                baseElement.content = JSON.stringify({ imageSrc: 'https://placehold.co/600x600' });
                break;
            case 'columns':
                baseElement.styles = { width: '100%', padding: '20px', display: 'flex', gap: '20px' };
                baseElement.content = JSON.stringify({ columns: [{ id: `col-${Date.now()}-1`, children: [] }, { id: `col-${Date.now()}-2`, children: [] }] }, null, 2);
                break;
            case 'heading': baseElement.content = '<h1>Enter Heading Text...</h1>'; baseElement.styles = { fontSize: '2.25rem', fontWeight: 'bold', color: '#111827', width: '100%', textAlign: 'center' }; break;
            case 'paragraph': baseElement.content = '<p>Enter your paragraph text here. You can make it <strong>bold</strong>, <em>italic</em>, or <u>underline</u> it.</p>'; baseElement.styles = { fontSize: '1rem', color: '#4b5563', lineHeight: 1.6, width: '100%', textAlign: 'center' }; break;
            case 'hero':
                baseElement.content = JSON.stringify({ heading: 'Your Big Idea', subheading: 'Explain your idea in a few words.', cta: 'Get Started', layout: 'text-center', image: '' }, null, 2);
                baseElement.styles = { width: '100%', minHeight: '400px', padding: '60px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', backgroundColor: '#4f46e5', color: '#ffffff' };
                break;
            case 'gallery':
                baseElement.content = JSON.stringify({ images: ['https://placehold.co/600x400/4f46e5/ffffff', 'https://placehold.co/600x400/1e3a8a/ffffff', 'https://placehold.co/600x400/3730a3/ffffff'] }, null, 2);
                baseElement.styles = { width: '100%', padding: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' };
                break;
            case 'footer':
                baseElement.content = JSON.stringify({ text: `© ${new Date().getFullYear()} Your Company. All rights reserved.` }, null, 2);
                baseElement.styles = { width: '100%', padding: '40px 20px', backgroundColor: '#111827', color: '#9ca3af', textAlign: 'center' };
                break;
            case 'navbar':
                 baseElement.content = JSON.stringify({ logo: { src: "https://placehold.co/100x40/FFFFFF/1a202c?text=Logo", alt: "Logo" }, links: [{ label: "Home", href: "#" }, { label: "About", href: "#" }], cta: { label: "Sign Up", href: "#" }}, null, 2);
                 baseElement.styles = { width: '100%', backgroundColor: "#fff", color: "#111827", padding: "1rem 2rem", boxShadow: '0 2px 4px rgba(0,0,0,0.05)' };
                 break;
            case 'image':
                baseElement.content = 'https://placehold.co/600x400';
                baseElement.styles = { width: '50%', height: 'auto', borderRadius: '8px' };
                break;
            case 'button':
                baseElement.content = 'Click Me';
                baseElement.styles = { backgroundColor: '#4f46e5', color: '#fff', padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer' };
                break;
            case 'ordered-list': baseElement.content = `<ol><li>List Item 1</li><li>List Item 2</li></ol>`; baseElement.styles = { paddingLeft: '40px', color: '#4b5563', width: '100%' }; break;
            case 'unordered-list': baseElement.content = `<ul><li>List Item 1</li><li>List Item 2</li></ul>`; baseElement.styles = { paddingLeft: '40px', color: '#4b5563', width: '100%' }; break;
        }
        return { ...baseElement, id: `${type}-${Date.now()}` };
    };
    
    const handleDragOver = (e: React.DragEvent, parentId: string) => {
        e.preventDefault(); e.stopPropagation();
        const target = e.currentTarget as HTMLElement;
        const children = Array.from(target.children).filter(c => c.hasAttribute('data-draggable'));
        const rect = target.getBoundingClientRect();
        const y = e.clientY - rect.top;
        let index = children.length;
        for (let i = 0; i < children.length; i++) {
            const childRect = children[i].getBoundingClientRect();
            if (y < childRect.top - rect.top + childRect.height / 2) {
                index = i; break;
            }
        }
        setDropIndicator({ parentId, index });
    };

    const handleDrop = (e: React.DragEvent, parentId: string, index: number) => {
        e.preventDefault(); e.stopPropagation();
        setDropIndicator(null);
        const elementType = e.dataTransfer.getData('elementType') as ElementType;
        if (elementType) {
            dispatch({ type: 'ADD_ELEMENT', payload: { element: createNewElement(elementType), parentId, index } });
        }
    };

    const renderChildren = (children: Element[], parentId: string) => (
        <>
            {children.map((child, i) => (
                <div key={child.id} data-draggable="true">
                    {dropIndicator?.parentId === parentId && dropIndicator.index === i && <DropIndicator />}
                    <RenderElement element={child} handleDragOver={handleDragOver} handleDrop={handleDrop} dropIndicator={dropIndicator} />
                </div>
            ))}
            {dropIndicator?.parentId === parentId && dropIndicator.index === children.length && <DropIndicator />}
        </>
    );

    return (
        <main className="flex-1 overflow-auto p-8" style={{ backgroundColor: pageStyles.backgroundColor }}>
            <div
                className={`mx-auto bg-white shadow-2xl transition-all duration-300 relative ${getScreenSizeClass(screenSize)}`}
                style={{ ...pageStyles, minHeight: '100%' }}
                onDragOver={(e) => handleDragOver(e, 'canvas')}
                onDrop={(e) => handleDrop(e, 'canvas', dropIndicator?.index ?? pageContent.length)}
                onDragLeave={() => setDropIndicator(null)}
                onClick={() => dispatch({ type: 'SET_SELECTED_ELEMENT', payload: null})}
            >
                {renderChildren(pageContent, 'canvas')}
            </div>
        </main>
    );
};
EditorCanvas.displayName = 'EditorCanvas';

const RenderElement = React.memo(({ element, handleDragOver, handleDrop, dropIndicator }: { element: Element; handleDragOver: (e: React.DragEvent, parentId: string) => void; handleDrop: (e: React.DragEvent, parentId: string, index: number) => void; dropIndicator: { parentId: string; index: number } | null }) => {
    const { state, dispatch } = useEditorContext();
    const isSelected = state.selectedElementId === element.id;
    const ref = useRef<HTMLDivElement>(null);

    const handleSelect = (e: React.MouseEvent) => {
        e.stopPropagation();
        dispatch({ type: 'SET_SELECTED_ELEMENT', payload: element.id });
    };

    const handleContentBlur = () => {
        if (ref.current && ref.current.innerHTML !== element.content) {
            dispatch({ type: 'UPDATE_ELEMENT_CONTENT', payload: { elementId: element.id, content: ref.current.innerHTML } });
            dispatch({ type: 'ADD_HISTORY' });
        }
    };
    
    const props = { style: element.styles, onClick: handleSelect };
    
    const renderChildren = (children: Element[], parentId: string) => (
        <>
            {children.map((child, i) => (
                <div key={child.id} data-draggable="true">
                    {dropIndicator?.parentId === parentId && dropIndicator.index === i && <DropIndicator />}
                    <RenderElement element={child} handleDragOver={handleDragOver} handleDrop={handleDrop} dropIndicator={dropIndicator}/>
                </div>
            ))}
            {dropIndicator?.parentId === parentId && dropIndicator.index === children.length && <DropIndicator />}
        </>
    );

    const renderTextContent = () => (
        <div 
          ref={ref}
          contentEditable 
          suppressContentEditableWarning
          onBlur={handleContentBlur}
          dangerouslySetInnerHTML={{ __html: element.content }}
        />
    );
    
    const renderComponent = () => {
        const dropProps = {
            onDragOver: (e: React.DragEvent) => handleDragOver(e, element.id),
            onDrop: (e: React.DragEvent) => handleDrop(e, element.id, dropIndicator?.index ?? element.children.length)
        };
        switch (element.type) {
            case 'section': 
            case 'box':
            case 'card':
                return (
                    <section {...props} {...dropProps}>
                        {renderChildren(element.children, element.id)}
                    </section>
                );
            case 'right-image-section': {
                 const content = JSON.parse(element.content);
                 return (
                    <div {...props} className="flex gap-4">
                        <div className="flex-1" {...dropProps}>
                             {renderChildren(element.children, element.id)}
                        </div>
                        <div className="flex-1">
                            <img src={content.imageSrc} alt="" style={{width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px'}} />
                        </div>
                    </div>
                 )
            }
            case 'columns': {
                const content = JSON.parse(element.content);
                return (
                    <div {...props}>
                        {content.columns.map((col: { id: string; children: Element[] }) => (
                            <div key={col.id} className="flex-1" style={{ minHeight: '50px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }} onDragOver={(e) => handleDragOver(e, col.id)} onDrop={(e) => handleDrop(e, col.id, dropIndicator?.index ?? col.children.length)}>
                                {renderChildren(col.children, col.id)}
                            </div>
                        ))}
                    </div>
                );
            }
            case 'heading': case 'paragraph': case 'ordered-list': case 'unordered-list': return <div {...props}>{renderTextContent()}</div>;
            case 'hero': {
                const heroContent = JSON.parse(element.content);
                const heroStyles = {
                    ...element.styles,
                    flexDirection: heroContent.layout === 'image-right' ? 'row' : 'column' as 'row' | 'column',
                    alignItems: heroContent.layout === 'image-right' ? 'center' : 'center',
                };
                return (
                    <div {...props} style={heroStyles}>
                        <div style={{flex: 1, paddingRight: heroContent.layout === 'image-right' ? '2rem' : '0'}}>
                            <h1 style={{fontSize: '3rem', fontWeight: 'bold', marginBottom: '1rem'}}>{heroContent.heading}</h1>
                            <p style={{fontSize: '1.25rem', marginBottom: '2rem'}}>{heroContent.subheading}</p>
                            <button style={{backgroundColor: '#fff', color: '#4f46e5', padding: '12px 24px', borderRadius: '8px', fontWeight: '600'}}>{heroContent.cta}</button>
                        </div>
                        {heroContent.layout === 'image-right' && heroContent.image && <div style={{flex: 1}}><img src={heroContent.image} alt="" style={{width: '100%', height: 'auto', borderRadius: '12px'}} /></div>}
                    </div>
                );
            }
            case 'gallery': {
                const galleryContent = JSON.parse(element.content);
                return <div {...props}>{galleryContent.images.map((src: string, i: number) => <img key={i} src={src} alt={`Gallery image ${i+1}`} style={{width: '100%', height: 'auto', borderRadius: '8px'}} />)}</div>;
            }
            case 'footer': {
                 const footerContent = JSON.parse(element.content);
                 return <footer {...props}><p>{footerContent.text}</p></footer>;
            }
            case 'navbar': {
                const navContent = JSON.parse(element.content);
                return (
                    <nav {...props} className="flex justify-between items-center w-full">
                        <img src={navContent.logo.src} alt={navContent.logo.alt} className="h-10"/>
                        <div className="hidden md:flex items-center gap-4">
                            {navContent.links.map((link: { label: string, href: string }) => <a key={link.label} href={link.href} onClick={e => e.preventDefault()} className="hover:text-indigo-400">{link.label}</a>)}
                        </div>
                        <a href={navContent.cta.href} onClick={e => e.preventDefault()} className="bg-indigo-600 px-4 py-2 rounded-md hover:bg-indigo-500 text-white">{navContent.cta.label}</a>
                    </nav>
                );
            }
            case 'image': return <img {...props} src={element.content} alt="" />;
            case 'button': return <button {...props}>{element.content}</button>;
            default: return <div {...props} className="p-4 bg-gray-200 text-gray-800 rounded">Invalid Element</div>;
        }
    };

    return <ElementWrapper isSelected={isSelected} element={element}>{renderComponent()}</ElementWrapper>;
});
RenderElement.displayName = 'RenderElement';

const ElementWrapper = ({ isSelected, children, element }: { isSelected: boolean, children: React.ReactNode, element: Element }) => {
    const { dispatch } = useEditorContext();
    return (
        <div className={`relative p-1 border-2 ${isSelected ? 'border-indigo-500' : 'border-transparent hover:border-indigo-500/50'}`}>
            {isSelected && (
                <div className="absolute -top-7 left-0 flex items-center gap-1 bg-indigo-600 text-white px-2 py-0.5 rounded-t-md text-xs">
                   <span className="capitalize">{element.type.replace('-', ' ')}</span>
                   <button onClick={(e) => { e.stopPropagation(); dispatch({ type: 'DELETE_ELEMENT', payload: { elementId: element.id } }); }} className="p-0.5 hover:bg-indigo-500 rounded"><FaTrashAlt size={10} /></button>
                </div>
            )}
            {children}
        </div>
    );
};
ElementWrapper.displayName = 'ElementWrapper';

const DropIndicator = () => <div className="w-full h-1 my-1 bg-indigo-500 rounded-full" />;
DropIndicator.displayName = 'DropIndicator';

const RichTextToolbar = ({ element }: { element: Element | null }) => {
    if (!element || !['heading', 'paragraph', 'ordered-list', 'unordered-list'].includes(element.type)) return null;
    
    const execCmd = (cmd: string, val?: string) => document.execCommand(cmd, false, val);
    const handleLink = () => {
        const url = prompt('Enter the URL:');
        if (url) execCmd('createLink', url);
    };

    return (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 flex gap-1 bg-gray-900 p-2 rounded-lg shadow-lg border border-gray-700">
            <button onClick={() => execCmd('bold')} className="p-2 hover:bg-gray-700 rounded"><FaBold /></button>
            <button onClick={() => execCmd('italic')} className="p-2 hover:bg-gray-700 rounded"><FaItalic /></button>
            <button onClick={() => execCmd('underline')} className="p-2 hover:bg-gray-700 rounded"><FaUnderline /></button>
            <button onClick={handleLink} className="p-2 hover:bg-gray-700 rounded"><FaLink /></button>
        </div>
    );
};
RichTextToolbar.displayName = 'RichTextToolbar';

const RightPanel = ({ activePanel, setActivePanel, selectedElement }: { activePanel: 'properties' | 'history', setActivePanel: (panel: 'properties' | 'history') => void, selectedElement: Element | null }) => {
  const { state } = useEditorContext();
  return (
    <aside className="w-80 flex-shrink-0 bg-gray-900 p-4 border-l border-gray-700 overflow-y-auto">
      <div className="flex mb-4 border-b border-gray-700">
        <button onClick={() => setActivePanel('properties')} className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm ${activePanel === 'properties' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-gray-400'}`}>
          <Settings size={16} /> Properties
        </button>
        <button onClick={() => setActivePanel('history')} className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm ${activePanel === 'history' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-gray-400'}`}>
          <History size={16} /> History
        </button>
      </div>
      {activePanel === 'properties' && (
        selectedElement ? <ElementPropertiesPanel element={selectedElement} /> : <PagePropertiesPanel pageStyles={state.pageStyles} />
      )}
      {activePanel === 'history' && (
        <HistoryPanel history={state.history} historyIndex={state.historyIndex} />
      )}
    </aside>
  );
};
RightPanel.displayName = 'RightPanel';

const CollapsibleGroup = ({ title, children, open = false }: { title: string, children: React.ReactNode, open?: boolean }) => {
  const [isOpen, setIsOpen] = useState(open);
  return (
    <div className="rounded-md bg-gray-800 mb-2">
      <button onClick={() => setIsOpen(!isOpen)} className="flex justify-between items-center w-full px-3 py-2 text-left text-white font-medium">
        <span>{title}</span>
        <ChevronDown size={20} className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      <div className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-[2000px]' : 'max-h-0'}`}>
        <div className="p-3 border-t border-gray-700">{children}</div>
      </div>
    </div>
  );
};
CollapsibleGroup.displayName = 'CollapsibleGroup';

interface StyleInputProps {
    label: string;
    value: string | number;
    onChange: (value: string) => void;
    type?: string;
    options?: { label: string; value: string | number }[];
    placeholder?: string;
}

const StyleInput = ({ label, value, onChange, type = 'text', options = [], ...props }: StyleInputProps) => (
  <div className="mb-2">
    <label className="block text-xs text-gray-400 mb-1">{label}</label>
    {type === 'select' ? (
      <select value={value || ''} onChange={(e) => onChange(e.target.value)} className="w-full bg-gray-700 rounded-md px-2 py-1 text-sm text-white">
        {options.map((opt) => <option key={opt.value.toString()} value={opt.value}>{opt.label}</option>)}
      </select>
    ) : (
      <input type={type} value={value || ''} onChange={(e) => onChange(e.target.value)} className="w-full bg-gray-700 rounded-md px-2 py-1 text-sm text-white" {...props} />
    )}
  </div>
);
StyleInput.displayName = 'StyleInput';

const ElementPropertiesPanel = ({ element }: { element: Element }) => {
  const { dispatch } = useEditorContext();

  const handleStyleChange = (key: string, value: string | number) => {
    dispatch({ type: 'UPDATE_ELEMENT_STYLES', payload: { elementId: element.id, styles: { [key]: value } } });
  };
  
  const handleContentChange = (newContent: object) => {
      dispatch({ type: 'UPDATE_ELEMENT_CONTENT', payload: {elementId: element.id, content: JSON.stringify(newContent, null, 2)} });
  }

  const renderContentInputs = () => {
      if (element.type === 'right-image-section') {
        const content = JSON.parse(element.content);
        return <StyleInput label="Image URL" value={content.imageSrc} onChange={val => handleContentChange({ ...content, imageSrc: val })} />;
      }
      try {
        const content = JSON.parse(element.content);
        if (typeof content !== 'object' || content === null) return null;
        if (element.type === 'navbar') {
            return (
                <>
                    <StyleInput label="Logo URL" value={content.logo.src} onChange={val => handleContentChange({...content, logo: {...content.logo, src: val}})} />
                    <h4 className="text-sm font-bold mt-4 mb-2">Links</h4>
                    {content.links.map((link: { label: string, href: string }, index: number) => (
                        <div key={index} className="flex gap-2 items-center mb-2 p-2 bg-gray-700 rounded-md">
                            <input type="text" placeholder="Label" value={link.label} onChange={e => { const newLinks = [...content.links]; newLinks[index].label = e.target.value; handleContentChange({...content, links: newLinks});}} className="flex-1 bg-gray-600 rounded px-2 py-1"/>
                            <input type="text" placeholder="URL" value={link.href} onChange={e => { const newLinks = [...content.links]; newLinks[index].href = e.target.value; handleContentChange({...content, links: newLinks});}} className="flex-1 bg-gray-600 rounded px-2 py-1"/>
                            <button onClick={() => { const newLinks = content.links.filter((_:any, i:number) => i !== index); handleContentChange({...content, links: newLinks})}} className="p-1 hover:bg-red-500 rounded"><FaTrashAlt size={12}/></button>
                        </div>
                    ))}
                     <button onClick={() => handleContentChange({...content, links: [...content.links, {label: 'New Link', href: '#'}]})} className="text-indigo-400 text-sm mt-2 flex items-center gap-1"><FaPlus size={10}/> Add Link</button>
                    <h4 className="text-sm font-bold mt-4 mb-2">CTA Button</h4>
                    <StyleInput label="CTA Label" value={content.cta.label} onChange={val => handleContentChange({...content, cta: {...content.cta, label: val}})} />
                    <StyleInput label="CTA URL" value={content.cta.href} onChange={val => handleContentChange({...content, cta: {...content.cta, href: val}})} />
                </>
            );
        }
        if (element.type === 'hero') {
             return (
                 <>
                    <StyleInput label="Heading" value={content.heading} onChange={val => handleContentChange({...content, heading: val})} />
                    <StyleInput label="Subheading" value={content.subheading} onChange={val => handleContentChange({...content, subheading: val})} />
                    <StyleInput label="Button Text" value={content.cta} onChange={val => handleContentChange({...content, cta: val})} />
                    <StyleInput label="Layout" type="select" value={content.layout} onChange={val => handleContentChange({...content, layout: val})} options={[{label: "Text Center", value: 'text-center'}, {label: "Text Left, Image Right", value: 'image-right'}]} />
                    {content.layout === 'image-right' && <StyleInput label="Image URL" value={content.image} onChange={val => handleContentChange({...content, image: val})} />}
                 </>
             )
        }
        if (element.type === 'gallery') {
            return (
                <>
                    <h4 className="text-sm font-bold mt-4 mb-2">Images</h4>
                    {content.images.map((img: string, index: number) => (
                        <div key={index} className="flex gap-2 items-center mb-2 p-2 bg-gray-700 rounded-md">
                           <input type="text" placeholder="Image URL" value={img} onChange={e => { const newImages = [...content.images]; newImages[index] = e.target.value; handleContentChange({images: newImages});}} className="flex-1 bg-gray-600 rounded px-2 py-1"/>
                           <button onClick={() => { const newImages = content.images.filter((_:any, i:number) => i !== index); handleContentChange({images: newImages})}} className="p-1 hover:bg-red-500 rounded"><FaTrashAlt size={12}/></button>
                        </div>
                    ))}
                    <button onClick={() => handleContentChange({images: [...content.images, 'https://placehold.co/600x400']})} className="text-indigo-400 text-sm mt-2 flex items-center gap-1"><FaPlus size={10}/> Add Image</button>
                </>
            );
        }
        if (element.type === 'footer') {
            return <StyleInput label="Copyright Text" value={content.text} onChange={val => handleContentChange({text: val})} />
        }
      } catch (e) {
         if (element.type === 'image' || element.type === 'button') {
            return <StyleInput label="URL / Text" value={element.content} onChange={val => dispatch({type: 'UPDATE_ELEMENT_CONTENT', payload: {elementId: element.id, content: val}})}/>
         }
         return null;
      }
  }

  return (
    <div onMouseUp={() => dispatch({ type: 'ADD_HISTORY' })}>
      <h3 className="font-bold mb-4 capitalize">{element.type.replace('-', ' ')} Properties</h3>
      
      <CollapsibleGroup title="Content" open>{renderContentInputs()}</CollapsibleGroup>

      <CollapsibleGroup title="Layout & Display">
        <StyleInput label="Display" type="select" value={element.styles.display} onChange={val => handleStyleChange('display', val)} options={['block', 'inline-block', 'flex', 'grid', 'inline', 'none'].map(v => ({label: v, value: v}))}/>
        <StyleInput label="Position" type="select" value={element.styles.position} onChange={val => handleStyleChange('position', val)} options={['static', 'relative', 'absolute', 'fixed', 'sticky'].map(v => ({label: v, value: v}))}/>
        <StyleInput label="Top" value={element.styles.top} onChange={val => handleStyleChange('top', val)} />
        <StyleInput label="Right" value={element.styles.right} onChange={val => handleStyleChange('right', val)} />
        <StyleInput label="Bottom" value={element.styles.bottom} onChange={val => handleStyleChange('bottom', val)} />
        <StyleInput label="Left" value={element.styles.left} onChange={val => handleStyleChange('left', val)} />
        <StyleInput label="Z-Index" type="number" value={element.styles.zIndex} onChange={val => handleStyleChange('zIndex', val)} />
        <StyleInput label="Flex Direction" value={element.styles.flexDirection} onChange={val => handleStyleChange('flexDirection', val)} />
        <StyleInput label="Justify Content" value={element.styles.justifyContent} onChange={val => handleStyleChange('justifyContent', val)} />
        <StyleInput label="Align Items" value={element.styles.alignItems} onChange={val => handleStyleChange('alignItems', val)} />
        <StyleInput label="Overflow" value={element.styles.overflow} onChange={val => handleStyleChange('overflow', val)} />
      </CollapsibleGroup>

      <CollapsibleGroup title="Box Model & Spacing">
        <StyleInput label="Width" value={element.styles.width} onChange={val => handleStyleChange('width', val)} />
        <StyleInput label="Height" value={element.styles.height} onChange={val => handleStyleChange('height', val)} />
        <StyleInput label="Min-Width" value={element.styles.minWidth} onChange={val => handleStyleChange('minWidth', val)} />
        <StyleInput label="Min-Height" value={element.styles.minHeight} onChange={val => handleStyleChange('minHeight', val)} />
        <StyleInput label="Padding" value={element.styles.padding} onChange={val => handleStyleChange('padding', val)} />
        <StyleInput label="Margin" value={element.styles.margin} onChange={val => handleStyleChange('margin', val)} />
      </CollapsibleGroup>
      
      <CollapsibleGroup title="Typography">
          <StyleInput label="Font Family" value={element.styles.fontFamily} onChange={val => handleStyleChange('fontFamily', val)} />
          <StyleInput label="Font Size" value={element.styles.fontSize} onChange={val => handleStyleChange('fontSize', val)} />
          <StyleInput label="Font Weight" value={element.styles.fontWeight} onChange={val => handleStyleChange('fontWeight', val)} />
          <StyleInput label="Line Height" value={element.styles.lineHeight} onChange={val => handleStyleChange('lineHeight', val)} />
          <StyleInput label="Letter Spacing" value={element.styles.letterSpacing} onChange={val => handleStyleChange('letterSpacing', val)} />
          <StyleInput label="Text Align" type="select" value={element.styles.textAlign} onChange={val => handleStyleChange('textAlign', val)} options={[{label: 'Left', value: 'left'}, {label: 'Center', value: 'center'}, {label: 'Right', value: 'right'}]} />
          <StyleInput label="Color" type="color" value={element.styles.color} onChange={val => handleStyleChange('color', val)} />
      </CollapsibleGroup>

      <CollapsibleGroup title="Visual & Effects">
          <StyleInput label="Background" value={element.styles.background} onChange={val => handleStyleChange('background', val)} />
          <StyleInput label="Opacity" type="number" value={element.styles.opacity} onChange={val => handleStyleChange('opacity', val)} />
          <StyleInput label="Border" value={element.styles.border} onChange={val => handleStyleChange('border', val)} placeholder="e.g., 2px solid #4f46e5" />
          <StyleInput label="Border Radius" value={element.styles.borderRadius} onChange={val => handleStyleChange('borderRadius', val)} placeholder="e.g., 12px" />
          <StyleInput label="Box Shadow" value={element.styles.boxShadow} onChange={val => handleStyleChange('boxShadow', val)} placeholder="e.g., 0 10px 15px -3px #0000001a" />
          <StyleInput label="Transition" value={element.styles.transition} onChange={val => handleStyleChange('transition', val)} placeholder="e.g., all 0.3s ease" />
      </CollapsibleGroup>
    </div>
  );
};
ElementPropertiesPanel.displayName = 'ElementPropertiesPanel';

const PagePropertiesPanel = ({ pageStyles }: { pageStyles: PageStyles }) => {
    const { dispatch } = useEditorContext();
    const handleStyleChange = (key: string, value: string) => {
        dispatch({ type: 'SET_PAGE_STYLES', payload: { [key]: value } });
    };
    return (
        <div>
            <h3 className="font-bold mb-4">Page Properties</h3>
            <CollapsibleGroup title="Global Styles" open={true}>
                <StyleInput label="Background Color" type="color" value={pageStyles.backgroundColor} onChange={(val: string) => handleStyleChange('backgroundColor', val)} />
                <StyleInput label="Default Text Color" type="color" value={pageStyles.color} onChange={(val: string) => handleStyleChange('color', val)} />
                <StyleInput label="Font Family" value={pageStyles.fontFamily} onChange={(val: string) => handleStyleChange('fontFamily', val)} />
            </CollapsibleGroup>
        </div>
    );
};
PagePropertiesPanel.displayName = 'PagePropertiesPanel';

const HistoryPanel = ({ history, historyIndex }: { history: { timestamp: number }[], historyIndex: number }) => {
    const { dispatch } = useEditorContext();
    return (
        <div className="space-y-2">
            {history.length > 0 ? history.slice().reverse().map((entry, i) => {
                const index = history.length - 1 - i;
                return (
                    <button key={entry.timestamp} onClick={() => index !== historyIndex && dispatch({ type: index < historyIndex ? 'UNDO' : 'REDO' })} className={`w-full text-left p-2 rounded-md transition-colors ${index === historyIndex ? 'bg-indigo-600' : 'bg-gray-800 hover:bg-gray-700'}`}>
                        <span className="text-sm font-medium">{index === historyIndex ? 'Current' : `Version ${index}`}</span>
                        <span className="block text-xs text-gray-400">{new Date(entry.timestamp).toLocaleTimeString()}</span>
                    </button>
                )
            }) : <p className="text-sm text-gray-400">No history yet. Start editing to see changes.</p>}
        </div>
    );
};
HistoryPanel.displayName = 'HistoryPanel';