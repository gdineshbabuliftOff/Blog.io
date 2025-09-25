'use client';

import React, { useState, useReducer, useEffect, useRef, createContext, useContext, useMemo } from 'react';
import Head from 'next/head';
import { useParams, useRouter } from 'next/navigation';
import { produce } from 'immer';
import useSWR, { mutate } from 'swr';
import {
  FaMobileAlt, FaTabletAlt, FaDesktop, FaArrowLeft, FaUndo, FaRedo, FaTrashAlt,
  FaBold, FaItalic, FaUnderline, FaLink, FaPlus
} from 'react-icons/fa';
import {
  PageContent, Element, ElementType, SiteData, PageStyles,
} from './editor';
import {
  Menu, X, ChevronDown, Rows, Columns, Image as ImageIcon, Type, List as ListIcon, Video, Link as LinkIcon, Minus, Square,
  Star, Sparkles, Settings, History, LucideProps, RectangleHorizontal, LayoutPanelLeft, UserSquare, FileText, BookImage, Layers, MessageSquare, PanelRight, Loader2, CheckCircle2, AlertCircle, Clock, Check, Code, Quote, GitBranch, MessageCircleQuestion, Footprints, Captions, ListOrdered, GalleryHorizontal, ArrowLeftCircle, ArrowRightCircle, GalleryThumbnails, Copy, SlidersHorizontal, Replace, ChevronsUpDown, GalleryVerticalEnd, Presentation
} from 'lucide-react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import * as lucideIcons from 'lucide-react';

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

const getAuthToken = (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem("blogToken");
};

const apiClient = {
  fetchSite: async (siteId: string): Promise<SiteData> => {
      if (typeof window === 'undefined') {
          return Promise.reject(new Error('Cannot fetch on server'));
      }
      const token = getAuthToken();
      if (!token) throw new Error('Authentication token not found');
      const response = await fetch(`/api/sites/${siteId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) {
          throw new Error('Failed to fetch site data');
      }
      return response.json();
  },
  saveSiteDraft: async (siteId: string, data: { content: PageContent, pageStyles: PageStyles }): Promise<{ success: boolean }> => {
      const token = getAuthToken();
      if (!token) throw new Error('Authentication token not found');
      const response = await fetch(`/api/sites/${siteId}`, {
          method: 'PUT',
          headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
      });
      if (!response.ok) {
          throw new Error('Failed to save site draft');
      }
      return { success: true };
  },
  getHistory: async (siteId: string): Promise<{ history: any[] }> => {
      const token = getAuthToken();
      if (!token) throw new Error('Authentication token not found');
      const response = await fetch(`/api/sites/${siteId}/history`, {
          headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch history');
      return response.json();
  },
  saveVersion: async (siteId: string, data: { content: PageContent, pageStyles: PageStyles }): Promise<{ success: boolean }> => {
      const token = getAuthToken();
      if (!token) throw new Error('Authentication token not found');
      const response = await fetch(`/api/sites/${siteId}/history`, {
          method: 'POST',
          headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to save version');
      return { success: true };
  },
};

type EditorAction =
  | { type: 'SET_INITIAL_STATE'; payload: { content: PageContent, pageStyles: PageStyles } }
  | { type: 'ADD_ELEMENT'; payload: { elements: Element[]; parentId: string; index: number } }
  | { type: 'UPDATE_ELEMENT_STYLES'; payload: { elementId: string; styles: object; breakpoint: 'desktop' | 'tablet' | 'mobile'; state: 'default' | 'hover' } }
  | { type: 'UPDATE_ELEMENT_ATTRIBUTE'; payload: { elementId: string; attribute: 'htmlId' | 'className'; value: string } }
  | { type: 'UPDATE_ELEMENT_CONTENT'; payload: { elementId: string; content: string } }
  | { type: 'DELETE_ELEMENT'; payload: { elementId: string } }
  | { type: 'DUPLICATE_ELEMENT'; payload: { elementId: string } }
  | { type: 'MOVE_ELEMENT'; payload: { draggedId: string; targetParentId: string; targetIndex: number } }
  | { type: 'SET_SELECTED_ELEMENT'; payload: string | null }
  | { type: 'SET_PAGE_STYLES'; payload: object }
  | { type: 'ADD_HISTORY' }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'REVERT_TO_VERSION'; payload: { content: PageContent, pageStyles: PageStyles } };

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
  pageStyles: {
    fontFamily: "'Inter', sans-serif",
    backgroundColor: '#f0f2f5',
    color: '#111827',
    globalCss: '.custom-class {\n  background-color: orange;\n}\n\n.no-scrollbar::-webkit-scrollbar {\n  display: none;\n}\n\n.no-scrollbar {\n  -ms-overflow-style: none;\n  scrollbar-width: none;\n}',
    globalColors: [
      { name: 'Primary', value: '#4f46e5' },
      { name: 'Secondary', value: '#10b981' },
      { name: 'Accent', value: '#f59e0b' },
      { name: 'Text', value: '#111827' },
      { name: 'Background', value: '#ffffff' },
    ],
    globalFonts: [
      { name: 'Heading', value: "'Inter', sans-serif" },
      { name: 'Body', value: "'Inter', sans-serif" },
    ]
  },
  history: [],
  historyIndex: -1,
};

const getUniqueId = (type: ElementType) => `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const editorReducer = produce((draft: EditorState, action: EditorAction) => {
  const addHistoryEntry = () => {
    const currentStateString = JSON.stringify(draft.history[draft.historyIndex]?.content || {});
    const newStateString = JSON.stringify(draft.pageContent);
    if (currentStateString === newStateString) return;

    const newHistory = draft.history.slice(0, draft.historyIndex + 1);
    newHistory.push({ content: JSON.parse(JSON.stringify(draft.pageContent)), timestamp: Date.now() });
    draft.history = newHistory;
    draft.historyIndex = newHistory.length - 1;
  };

  const findAndTraverse = (elements: Element[], callback: (element: Element, parent?: Element) => boolean | void, parentElement?: Element): boolean => {
    for (const element of elements) {
      if (callback(element, parentElement)) return true;
      if (element.children?.length) {
        if (findAndTraverse(element.children, callback, element)) return true;
      }
      if (element.type === 'columns') {
        try {
          const content = JSON.parse(element.content);
          for (const col of content.columns) {
            if (findAndTraverse(col.children, callback, element)) return true;
          }
        } catch (e) {}
      }
    }
    return false;
  };

  const recursiveDelete = (elements: Element[], elementId: string): Element[] => {
    return elements.filter(el => {
      if (el.id === elementId) return false;
      if (el.children) el.children = recursiveDelete(el.children, elementId);
      if (el.type === 'columns') {
        try {
          const content = JSON.parse(el.content);
          content.columns.forEach((col: { children: Element[] }) => {
            col.children = recursiveDelete(col.children, elementId);
          });
          el.content = JSON.stringify(content, null, 2);
        } catch (e) {}
      }
      return true;
    });
  };

  switch (action.type) {
    case 'SET_INITIAL_STATE': {
      draft.pageContent = action.payload.content;
      draft.pageStyles = action.payload.pageStyles;
      break;
    }
    case 'REVERT_TO_VERSION': {
      draft.pageContent = action.payload.content;
      draft.pageStyles = action.payload.pageStyles;
      addHistoryEntry();
      break;
    }
    case 'ADD_ELEMENT': {
      const { elements: elementsToAdd, parentId, index } = action.payload;
      if (parentId === 'canvas') {
        draft.pageContent.splice(index, 0, ...elementsToAdd);
      } else {
        findAndTraverse(draft.pageContent, (parent) => {
          if (parent.id === parentId) {
             if (parent.children == null) {
                parent.children = [];
             }
             parent.children.splice(index, 0, ...elementsToAdd);
             return true;
          }
          if (parent.type === 'columns') {
            const content = JSON.parse(parent.content);
            const col = content.columns.find((c: {id: string}) => c.id === parentId);
            if (col) {
              col.children.splice(index, 0, ...elementsToAdd);
              parent.content = JSON.stringify(content, null, 2);
              return true;
            }
          }
          return false;
        });
      }
      draft.selectedElementId = elementsToAdd[elementsToAdd.length - 1].id;
      addHistoryEntry();
      break;
    }
    case 'MOVE_ELEMENT': {
      const { draggedId, targetParentId, targetIndex } = action.payload;
      let draggedElement: Element | null = null;

      const findAndRemove = (elements: Element[]): Element[] => {
        return elements.filter(el => {
          if (el.id === draggedId) {
            draggedElement = el;
            return false;
          }
          if (el.children) el.children = findAndRemove(el.children);
          if (el.type === 'columns') {
            try {
              const content = JSON.parse(el.content);
              content.columns.forEach((col: { children: Element[] }) => {
                col.children = findAndRemove(col.children);
              });
              el.content = JSON.stringify(content, null, 2);
            } catch (e) {}
          }
          return true;
        });
      };
      draft.pageContent = findAndRemove(draft.pageContent);

      if (draggedElement) {
        if (targetParentId === 'canvas') {
          draft.pageContent.splice(targetIndex, 0, draggedElement);
        } else {
          findAndTraverse(draft.pageContent, (parent) => {
            if (parent.id === targetParentId && parent.children) {
             parent.children.splice(targetIndex, 0, draggedElement!);
             return true;
            }
            if (parent.type === 'columns') {
              const content = JSON.parse(parent.content);
              const col = content.columns.find((c: { id: string }) => c.id === targetParentId);
              if (col) {
                col.children.splice(targetIndex, 0, draggedElement!);
                parent.content = JSON.stringify(content, null, 2);
                return true;
              }
            }
            return false;
          });
        }
      }
      addHistoryEntry();
      break;
    }
    case 'UPDATE_ELEMENT_STYLES': {
      const { elementId, styles, breakpoint, state } = action.payload;
      findAndTraverse(draft.pageContent, (el) => {
        if(el.id === elementId) {
          if (!el.styles[breakpoint]) el.styles[breakpoint] = { default: {}, hover: {} };
          if (!el.styles[breakpoint][state]) el.styles[breakpoint][state] = {};
          el.styles[breakpoint][state] = { ...el.styles[breakpoint][state], ...styles };
          return true;
        }
      });
      addHistoryEntry();
      break;
    }
    case 'UPDATE_ELEMENT_CONTENT': {
      findAndTraverse(draft.pageContent, (el) => {
        if(el.id === action.payload.elementId) {
          el.content = action.payload.content;
          return true;
        }
      });
      addHistoryEntry();
      break;
    }
    case 'UPDATE_ELEMENT_ATTRIBUTE': {
      const { elementId, attribute, value } = action.payload;
      findAndTraverse(draft.pageContent, (el) => {
        if(el.id === elementId) {
          (el as any)[attribute] = value;
          return true;
        }
      });
      addHistoryEntry();
      break;
    }
    case 'DELETE_ELEMENT': {
      draft.pageContent = recursiveDelete(draft.pageContent, action.payload.elementId);
      if (draft.selectedElementId === action.payload.elementId) {
        draft.selectedElementId = null;
      }
      addHistoryEntry();
      break;
    }
    case 'DUPLICATE_ELEMENT': {
        const { elementId } = action.payload;
        let newElementId: string | null = null;

        const deepCopyAndAssignNewIds = (element: Element): Element => {
            const newElement = JSON.parse(JSON.stringify(element));
            newElement.id = getUniqueId(newElement.type as ElementType);
            if (newElement.children && newElement.children.length > 0) {
                newElement.children = newElement.children.map((child: Element) => deepCopyAndAssignNewIds(child));
            }
            if (newElement.type === 'columns') {
                const content = JSON.parse(newElement.content);
                content.columns.forEach((col: { id: string, children: Element[] }) => {
                    col.id = getUniqueId('column_internal');
                    col.children = col.children.map((child: Element) => deepCopyAndAssignNewIds(child));
                });
                newElement.content = JSON.stringify(content, null, 2);
            }
            return newElement;
        };

        const findAndDuplicate = (elements: Element[]): boolean => {
            for (let i = 0; i < elements.length; i++) {
                const element = elements[i];
                if (element.id === elementId) {
                    const newElement = deepCopyAndAssignNewIds(element);
                    elements.splice(i + 1, 0, newElement);
                    newElementId = newElement.id;
                    return true;
                }
                if (element.children && findAndDuplicate(element.children)) {
                    return true;
                }
                if (element.type === 'columns') {
                    try {
                        const content = JSON.parse(element.content);
                        for (const col of content.columns) {
                            if (findAndDuplicate(col.children)) {
                                element.content = JSON.stringify(content, null, 2);
                                return true;
                            }
                        }
                    } catch (e) {}
                }
            }
            return false;
        };

        findAndDuplicate(draft.pageContent);
        if (newElementId) {
            draft.selectedElementId = newElementId;
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

const createNewElement = (type: ElementType): Element | Element[] => {
    const id = getUniqueId(type);
    const defaultStyles = { desktop: { default: {}, hover: {} }, tablet: { default: {}, hover: {} }, mobile: { default: {}, hover: {} } };
    const baseElement: Omit<Element, 'id'> & { type: ElementType } = { type, styles: JSON.parse(JSON.stringify(defaultStyles)), children: [] };
    
    switch(type) {
        case 'section': baseElement.styles.desktop.default = { minHeight: '100px', width: '100%', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }; break;
        case 'box': baseElement.styles.desktop.default = { minHeight: '100px', width: '100%', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '16px' }; break;
        case 'card': baseElement.styles.desktop.default = { width: '100%', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '16px', backgroundColor: '#ffffff', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)', borderRadius: '12px' }; break;
        case 'video-right-section':
            baseElement.type = 'section';
            baseElement.name = "Video Right Section";
            baseElement.content = JSON.stringify({ videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ' });
            baseElement.styles.desktop.default = { width: '100%', padding: '20px', display: 'flex', gap: '20px', alignItems: 'stretch' };
            baseElement.children = [];
            break;
        case 'video-left-section':
            baseElement.type = 'section';
            baseElement.name = "Video Left Section";
            baseElement.content = JSON.stringify({ videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ' });
            baseElement.styles.desktop.default = { width: '100%', padding: '20px', display: 'flex', gap: '20px', alignItems: 'stretch' };
            baseElement.children = [];
            break;
        case 'right-image-section':
            baseElement.type = 'section';
            baseElement.name = 'Image Right Section';
            baseElement.content = JSON.stringify({ imageSrc: 'https://placehold.co/600x400' });
            baseElement.styles.desktop.default = { width: '100%', padding: '20px', display: 'flex', gap: '20px', alignItems: 'stretch' };
            baseElement.children = [];
            break;
        case 'left-image-section':
            baseElement.type = 'section';
            baseElement.name = 'Image Left Section';
            baseElement.content = JSON.stringify({ imageSrc: 'https://placehold.co/600x400' });
            baseElement.styles.desktop.default = { width: '100%', padding: '20px', display: 'flex', gap: '20px', alignItems: 'stretch' };
            baseElement.children = [];
            break;
        case 'horizontal-scroll':
            baseElement.name = 'Horizontal Scroll';
            baseElement.styles.desktop.default = { width: '100%', maxWidth: '100%', display: 'grid', gridAutoFlow: 'column', padding: '20px 0', position: 'relative' };
            baseElement.children = [
                createNewElement('preview-card') as Element,
                createNewElement('preview-card') as Element,
            ];
            break;
        case 'auto-scroll':
            baseElement.name = 'Auto Scroll';
            baseElement.styles.desktop.default = { width: '100%', maxWidth: '100%', position: 'relative', overflow: 'hidden' };
            baseElement.content = JSON.stringify({ delay: 3000 });
            baseElement.children = [
                createNewElement('preview-card') as Element,
                createNewElement('preview-card') as Element,
                createNewElement('preview-card') as Element,
                createNewElement('preview-card') as Element,
            ];
            break;
        case 'single-auto-scroll':
            baseElement.name = 'Single Auto Scroll';
            baseElement.styles.desktop.default = { width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative', minHeight: '400px' };
            baseElement.content = JSON.stringify({ delay: 3000, transition: 'fade' });
            baseElement.children = [
                createNewElement('detail-card') as Element,
                createNewElement('detail-card') as Element,
                createNewElement('profile-card') as Element,
            ];
            break;
        case 'image-carousel':
            baseElement.name = 'Image Carousel';
            baseElement.styles.desktop.default = { width: '100%', height: '500px', position: 'relative', overflow: 'hidden'};
            baseElement.content = JSON.stringify({ delay: 3000 });
            baseElement.children = [
                { ...(createNewElement('image') as Element), styles: { desktop: { default: { width: '100%', height: '100%', objectFit: 'cover' }}}},
                { ...(createNewElement('image') as Element), content: 'https://placehold.co/1200x500/1e3a8a/ffffff', styles: { desktop: { default: { width: '100%', height: '100%', objectFit: 'cover' }}}},
            ];
            break;
        case 'hero-slider':
            baseElement.name = 'Hero Slider';
            baseElement.styles.desktop.default = { width: '100%', height: '500px', position: 'relative', overflow: 'hidden', color: '#ffffff'};
            baseElement.content = JSON.stringify({ delay: 4000 });
            baseElement.children = [
                { ...(createNewElement('box') as Element),
                  name: 'Hero Slide',
                  styles: { desktop: { default: { backgroundImage: 'url(https://placehold.co/1200x500/4f46e5/ffffff)', backgroundSize: 'cover', backgroundPosition: 'center', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '20px' }}},
                  children: [
                      { ...(createNewElement('heading') as Element), content: '<h1>Slide 1 Title</h1>', styles: { desktop: { default: { color: '#ffffff' }}}},
                      { ...(createNewElement('paragraph') as Element), content: '<p>Description for the first slide.</p>', styles: { desktop: { default: { color: '#eeeeee' }}}},
                  ]
                },
                { ...(createNewElement('box') as Element),
                  name: 'Hero Slide',
                  styles: { desktop: { default: { backgroundImage: 'url(https://placehold.co/1200x500/1e3a8a/ffffff)', backgroundSize: 'cover', backgroundPosition: 'center', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '20px'}}},
                  children: [
                      { ...(createNewElement('heading') as Element), content: '<h1>Slide 2 Title</h1>', styles: { desktop: { default: { color: '#ffffff' }}}},
                  ]
                },
            ];
            break;
        case 'accordion':
            baseElement.name = 'Accordion';
            baseElement.content = JSON.stringify({ title: 'Click to Expand' });
            baseElement.styles.desktop.default = { width: '100%', border: '1px solid #e5e7eb', borderRadius: '8px', color: '#111827' };
            break;
        case 'feature-grid':
            baseElement.type = 'section';
            baseElement.name = "Feature Grid";
            baseElement.styles.desktop.default = { width: '100%', padding: '40px 20px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px'};
            baseElement.children = [
                createNewElement('feature-block') as Element,
                createNewElement('feature-block') as Element,
                createNewElement('feature-block') as Element,
            ];
            break;
        case 'feature-block':
            baseElement.content = JSON.stringify({ icon: 'Star', title: 'Feature Title', text: 'Describe the feature in a few words.'});
            baseElement.styles.desktop.default = { display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '12px' };
            break;
        case 'steps':
            baseElement.type = 'section';
            baseElement.name = 'Steps Section';
            baseElement.content = JSON.stringify({ columnCount: 3 });
            baseElement.children = [
                { ...createNewElement('heading') as Element, content: '<h2>Get Started in 3 Easy Steps</h2>'},
                { ...createNewElement('columns') as Element, content: JSON.stringify({ columns: [
                    { id: getUniqueId('column_internal'), children: [createNewElement('step-block') as Element] },
                    { id: getUniqueId('column_internal'), children: [createNewElement('step-block') as Element] },
                    { id: getUniqueId('column_internal'), children: [createNewElement('step-block') as Element] },
                ]})}
            ];
            break;
        case 'step-block':
            baseElement.content = JSON.stringify({ step: '01', title: 'Step Title', text: 'Explain the step here.' });
            break;
        case 'testimonial':
            baseElement.content = JSON.stringify({ avatar: 'https://placehold.co/100x100', quote: 'This is an amazing product!', name: 'Jane Doe', title: 'CEO, Company' });
            baseElement.styles.desktop.default = { width: '100%', maxWidth: '600px', backgroundColor: '#ffffff', color: '#111827', padding: '24px', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '16px' };
            break;
        case 'faq':
            baseElement.content = JSON.stringify({ items: [{id: getUniqueId('faq-item'), question: 'Is this a question?', answer: 'Yes, and this is the answer.', questionColor: '#111827', answerColor: '#4B5563'}]});
            baseElement.styles.desktop.default = { width: '100%', maxWidth: '700px' };
            break;
        case 'preview-card':
            baseElement.type = 'card';
            baseElement.name = "Preview Card";
            baseElement.styles.desktop.default = { width: '350px', flexShrink: 0, alignSelf: 'center', backgroundColor: '#ffffff', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)', overflow: 'hidden', color: '#111827', padding: '0px', alignItems: 'flex-start' };
            baseElement.children = [
                {...createNewElement('image') as Element, content: 'https://placehold.co/400x250', styles: {desktop: {default: {width: '100%', borderRadius: '0px', alignSelf: 'stretch'}}}},
                {...createNewElement('box') as Element, children: [
                    {...createNewElement('heading') as Element, content: '<h3>Preview Title</h3>'},
                    {...createNewElement('paragraph') as Element, content: '<p>This is a short description for the preview card.</p>'}
                ], styles: {desktop: {default: {padding: '16px'}}}}
            ]
            break;
        case 'detail-card':
            baseElement.type = 'card';
            baseElement.name = "Detail Card";
            baseElement.styles.desktop.default = { width: '350px', alignSelf: 'center', backgroundColor: '#ffffff', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)', padding: '24px', color: '#111827' };
            baseElement.children = [
                {...createNewElement('heading') as Element, content: '<h3>Detail Card</h3>'},
                {...createNewElement('paragraph') as Element, content: '<p>More information here...</p>'},
            ];
            break;
        case 'profile-card':
            baseElement.styles.desktop.default = { display: 'flex', alignItems: 'center', gap: '16px', width: '350px', alignSelf: 'center', backgroundColor: '#ffffff', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)', padding: '24px', color: '#111827' };
            baseElement.content = JSON.stringify({ profileImage: 'https://placehold.co/100x100', name: 'Jane Doe', title: 'UI/UX Designer', handle: '@janedoe' });
            break;
        case 'columns':
            baseElement.styles.desktop.default = { width: '100%', padding: '20px', display: 'flex', gap: '20px' };
            baseElement.content = JSON.stringify({ columns: [{ id: getUniqueId('column_internal'), children: [] }, { id: getUniqueId('column_internal'), children: [] }] }, null, 2);
            break;
        case 'heading': baseElement.content = '<h1>Enter Heading Text...</h1>'; baseElement.styles.desktop.default = { fontSize: '2.25rem', fontWeight: 'bold', color: 'var(--text)', width: '100%', textAlign: 'center' }; break;
        case 'paragraph': baseElement.content = '<p>Enter your paragraph text here.</p>'; baseElement.styles.desktop.default = { fontSize: '1rem', color: '#4b5563', lineHeight: 1.6, width: '100%', textAlign: 'center' }; break;
        case 'hero':
            baseElement.name = 'Hero Section';
            baseElement.styles.desktop.default = { width: '100%', height: '500px', position: 'relative', display: 'flex', color: '#ffffff'};
            baseElement.content = JSON.stringify({
                backgroundType: 'image',
                backgroundImageUrl: 'https://placehold.co/1200x500/4f46e5/ffffff',
                backgroundVideoUrl: '',
                contentPosition: 'center-middle'
            });
            baseElement.children = [
                {...(createNewElement('heading') as Element), content: '<h1>Your Big Idea</h1>', styles: {desktop:{default:{color: '#ffffff', fontSize: '3rem'}}}},
                {...(createNewElement('paragraph') as Element), content: '<p>Explain it in a few words.</p>', styles: {desktop:{default:{color: '#eeeeee', maxWidth: '600px', fontSize: '1.25rem'}}}},
                {...(createNewElement('button') as Element), content: 'Get Started', styles: {desktop:{default:{backgroundColor: '#ffffff', color: 'var(--primary)', alignSelf: 'center'}}}},
            ];
            break;
        case 'gallery':
            baseElement.content = JSON.stringify({ columns: 3, images: ['https://placehold.co/600x400/4f46e5/ffffff', 'https://placehold.co/600x400/1e3a8a/ffffff', 'https://placehold.co/600x400/3730a3/ffffff'] }, null, 2);
            baseElement.styles.desktop.default = { width: '100%', padding: '20px', display: 'grid', gap: '16px' };
            break;
        case 'footer':
            baseElement.content = JSON.stringify({ text: `© ${new Date().getFullYear()} Your Company. All rights reserved.` }, null, 2);
            baseElement.styles.desktop.default = { width: '100%', padding: '40px 20px', backgroundColor: '#111827', color: '#9ca3af', textAlign: 'center' };
            break;
        case 'navbar':
            baseElement.content = JSON.stringify({ logo: { type: 'image', src: "https://placehold.co/100x40/FFFFFF/1a202c?text=Logo", text: "My Site", alt: "Logo" }, links: [{ id: getUniqueId('link'), label: "Home", href: "#" }], cta: { label: "Sign Up", href: "#", enabled: true }}, null, 2);
            baseElement.styles.desktop.default = { width: '100%', backgroundColor: "#fff", color: "#111827", padding: "1rem 2rem", boxShadow: '0 2px 4px rgba(0,0,0,0.05)' };
            break;
        case 'image':
            baseElement.content = 'https://placehold.co/600x400';
            baseElement.styles.desktop.default = { width: 'auto', maxWidth: '100%', height: 'auto', borderRadius: '8px', alignSelf: 'center' };
            break;
        case 'video':
            baseElement.content = 'https://www.youtube.com/embed/dQw4w9WgXcQ';
            baseElement.styles.desktop.default = { width: '100%', aspectRatio: '16 / 9' };
            break;
        case 'divider':
            baseElement.styles.desktop.default = { width: '100%', height: '1px', backgroundColor: '#e5e7eb', margin: '16px 0' };
            break;
        case 'contact-form':
            baseElement.content = JSON.stringify({ fields: [{label: 'Name', type: 'text'}, {label: 'Email', type: 'email'}], buttonText: 'Submit' });
            baseElement.styles.desktop.default = { width: '100%', maxWidth: '500px', display: 'flex', flexDirection: 'column', gap: '16px', color: '#111827' };
            break;
        case 'button':
            baseElement.content = 'Click Me';
            baseElement.styles.desktop.default = { backgroundColor: 'var(--primary)', color: '#fff', padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', alignSelf: 'center' };
            baseElement.styles.desktop.hover = { backgroundColor: '#4338ca' };
            break;
        case 'ordered-list': baseElement.content = `<ol><li>List Item 1</li><li>List Item 2</li></ol>`; baseElement.styles.desktop.default = { paddingLeft: '40px', color: '#4b5563', width: '100%' }; break;
        case 'unordered-list': baseElement.content = `<ul><li>List Item 1</li><li>List Item 2</li></ul>`; baseElement.styles.desktop.default = { paddingLeft: '40px', color: '#4b5563', width: '100%' }; break;
    }
    return { ...baseElement, id };
};

const EditorContext = createContext<{ state: EditorState; dispatch: React.Dispatch<EditorAction> } | null>(null);

const useEditorContext = () => {
  const context = useContext(EditorContext);
  if (!context) { throw new Error('useEditorContext must be used within an EditorProvider'); }
  return context;
};

export default function EditorPage() {
  const router = useRouter();
  const params = useParams();
  const siteId = params.siteId as string;
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);
  
  const token = isClient ? getAuthToken() : null;

  const { data: currentSite, error: apiError, isLoading } = useSWR(
    siteId && token ? [`/api/sites/${siteId}`, token] : null,
    () => apiClient.fetchSite(siteId)
  );

  const [state, dispatch] = useReducer(editorReducer, initialState);
  const [screenSize, setScreenSize] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [activePanel, setActivePanel] = useState<'properties' | 'history' | 'versions'>('properties');
  const [leftSidebarTab, setLeftSidebarTab] = useState<'elements' | 'layers' | 'css'>('elements');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'unsaved' | 'saving' | 'error'>('saved');
  const initialContentLoaded = useRef(false);
  const hasUnsavedChanges = useRef(false);

  useEffect(() => {
    if (currentSite && !initialContentLoaded.current) {
      dispatch({
        type: 'SET_INITIAL_STATE',
        payload: {
          content: currentSite.draftContent || [],
          pageStyles: currentSite.draftPageStyles || initialState.pageStyles,
        }
      });
      dispatch({ type: 'ADD_HISTORY' });
      initialContentLoaded.current = true;
    }
  }, [currentSite]);

  useEffect(() => {
    if (!initialContentLoaded.current || state.history.length <= 1) return;
    hasUnsavedChanges.current = true;
    setSaveStatus('unsaved');
  }, [state.pageContent, state.pageStyles, state.history.length]);
  
  useEffect(() => {
    if (!initialContentLoaded.current) return;
    
    const handler = setTimeout(async () => {
      if (hasUnsavedChanges.current) {
        setSaveStatus('saving');
        try {
          await apiClient.saveSiteDraft(siteId, {
            content: state.pageContent,
            pageStyles: state.pageStyles
          });
          setSaveStatus('saved');
          hasUnsavedChanges.current = false;
        } catch (err) {
          console.error("Auto-save failed:", err);
          setSaveStatus('error');
        }
      }
    }, 2500);
    
    return () => clearTimeout(handler);
  }, [state.pageContent, state.pageStyles, siteId]);

  const findElement = (elements: Element[], elementId: string): Element | null => {
    for (const el of elements) {
      if (el.id === elementId) return el;
      if (el.children?.length) {
        const found = findElement(el.children, elementId);
        if (found) return found;
      }
      if (el.type === 'columns') {
        try {
          const content = JSON.parse(el.content);
          for(const col of content.columns) {
            const found = findElement(col.children, elementId);
            if (found) return found;
          }
        } catch (e) { }
      }
    }
    return null;
  };

  const selectedElement = state.selectedElementId ? findElement(state.pageContent, state.selectedElementId) : null;

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

  const handleSaveVersion = async () => {
    setSaveStatus('saving');
    try {
      await apiClient.saveVersion(siteId, {
        content: state.pageContent,
        pageStyles: state.pageStyles
      });
      setSaveStatus('saved');
      hasUnsavedChanges.current = false;
      mutate(`/api/sites/${siteId}/history`);
    } catch(err) {
      console.error("Save version failed:", err);
      setSaveStatus('error');
    }
  }

  if (!isClient || isLoading) return <div className="flex items-center justify-center h-screen bg-gray-900 text-white">Loading Editor...</div>;
  if (apiError) return <div className="flex items-center justify-center h-screen bg-gray-900 text-white">Failed to load site data.</div>;
  if (!token) return <div className="flex items-center justify-center h-screen bg-gray-900 text-white">Authentication token not found. Please log in again.</div>;
  if (!currentSite && token) return <div className="flex items-center justify-center h-screen bg-gray-900 text-white">Site not found or you do not have permission to edit it.</div>;

  return (
    <EditorContext.Provider value={{ state, dispatch }}>
      <div className="flex h-screen bg-gray-800 text-white font-sans antialiased">
        <Head>
          <title>{currentSite?.title || 'Editor'} - Editor</title>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        </Head>

        <DynamicStyleSheet pageStyles={state.pageStyles}/>

        <header className="fixed top-0 left-0 right-0 z-50 flex h-16 items-center justify-between px-4 bg-gray-900/80 backdrop-blur-md border-b border-gray-700">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="p-2 rounded-md hover:bg-gray-700 transition-colors"><FaArrowLeft /></button>
            <h1 className="text-xl font-semibold">{currentSite?.title || 'New Site'}</h1>
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
            <SaveStatusIndicator status={saveStatus} />
            <button onClick={() => dispatch({ type: 'UNDO' })} disabled={state.historyIndex <= 0} className="p-2 rounded-md hover:bg-gray-700 transition-colors disabled:opacity-50" title="Undo"><FaUndo /></button>
            <button onClick={() => dispatch({ type: 'REDO' })} disabled={state.historyIndex >= state.history.length - 1} className="p-2 rounded-md hover:bg-gray-700 transition-colors disabled:opacity-50" title="Redo"><FaRedo /></button>
            <button onClick={handleSaveVersion} className="flex items-center gap-2 px-4 py-2 bg-gray-700 rounded-md hover:bg-gray-600 transition-colors"><Check size={16}/><span>Save Version</span></button>
            <button onClick={() => {}} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 rounded-md hover:bg-indigo-500 transition-colors"><Sparkles size={16} /><span>Publish</span></button>
          </div>
        </header>

        <div className="flex flex-1 pt-16">
          <LeftPanel activeTab={leftSidebarTab} setActiveTab={setLeftSidebarTab} />
          <EditorCanvas screenSize={screenSize}/>
          <RightPanel activePanel={activePanel} setActivePanel={setActivePanel} selectedElement={selectedElement} screenSize={screenSize} setScreenSize={setScreenSize} />
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

const LeftPanel = ({ activeTab, setActiveTab }: { activeTab: 'elements' | 'layers' | 'css', setActiveTab: (tab: 'elements' | 'layers' | 'css') => void }) => {
    const { state } = useEditorContext();

    const elementGroups: { title: string; items: DraggableItemProps[] }[] = [
        {
            title: 'Layout',
            items: [
                { type: 'section', icon: Rows, label: 'Section' },
                { type: 'columns', icon: Columns, label: 'Columns' },
                { type: 'box', icon: Square, label: 'Box' },
                { type: 'accordion', icon: ChevronsUpDown, label: 'Accordion' },
                { type: 'horizontal-scroll', icon: GalleryThumbnails, label: 'Scroll Section' },
                { type: 'auto-scroll', icon: SlidersHorizontal, label: 'Auto Scroll' },
                { type: 'single-auto-scroll', icon: Replace, label: 'Single Scroll' },
                { type: 'image-carousel', icon: GalleryVerticalEnd, label: 'Image Carousel' },
                { type: 'hero-slider', icon: Presentation, label: 'Hero Slider' },
            ]
        },
        {
            title: 'Split Sections',
            items: [
                { type: 'right-image-section', icon: LayoutPanelLeft, label: 'Image Right' },
                { type: 'left-image-section', icon: PanelRight, label: 'Image Left' },
                { type: 'video-right-section', icon: LayoutPanelLeft, label: 'Video Right' },
                { type: 'video-left-section', icon: PanelRight, label: 'Video Left' },
            ]
        },
        {
            title: 'Content',
            items: [
                { type: 'heading', icon: Type, label: 'Heading' },
                { type: 'paragraph', icon: ListIcon, label: 'Paragraph' },
                { type: 'button', icon: LinkIcon, label: 'Button' },
                { type: 'divider', icon: Minus, label: 'Divider' },
                { type: 'ordered-list', icon: ListOrdered, label: 'Ordered List' },
                { type: 'unordered-list', icon: ListIcon, label: 'Unordered List' },
            ]
        },
        {
            title: 'Media',
            items: [
                { type: 'image', icon: ImageIcon, label: 'Image' },
                { type: 'video', icon: Video, label: 'Video' },
                { type: 'gallery', icon: GalleryHorizontal, label: 'Gallery' },
            ]
        },
        {
            title: 'Presets',
            items: [
                { type: 'hero', icon: Captions, label: 'Hero Section' },
                { type: 'navbar', icon: Menu, label: 'Navbar' },
                { type: 'footer', icon: Footprints, label: 'Footer' },
                { type: 'feature-grid', icon: Star, label: 'Feature Grid' },
                { type: 'steps', icon: GitBranch, label: 'Steps' },
                { type: 'testimonial', icon: Quote, label: 'Testimonial' },
                { type: 'faq', icon: MessageCircleQuestion, label: 'FAQ' },
                { type: 'contact-form', icon: MessageSquare, label: 'Contact Form' },
            ]
        },
        {
            title: 'Cards',
            items: [
                { type: 'card', icon: RectangleHorizontal, label: 'Card' },
                { type: 'preview-card', icon: BookImage, label: 'Preview Card' },
                { type: 'detail-card', icon: FileText, label: 'Detail Card' },
                { type: 'profile-card', icon: UserSquare, label: 'Profile Card' },
            ]
        }
    ];

    return (
        <aside className="w-64 flex-shrink-0 bg-gray-900 border-r border-gray-700 flex flex-col">
            <div className="flex border-b border-gray-700">
                <button onClick={() => setActiveTab('elements')} className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm ${activeTab === 'elements' ? 'bg-gray-800 text-white' : 'text-gray-400'}`}><Square size={16}/> Elements</button>
                <button onClick={() => setActiveTab('layers')} className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm ${activeTab === 'layers' ? 'bg-gray-800 text-white' : 'text-gray-400'}`}><Layers size={16}/> Layers</button>
                <button onClick={() => setActiveTab('css')} className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm ${activeTab === 'css' ? 'bg-gray-800 text-white' : 'text-gray-400'}`}><Code size={16}/> CSS</button>
            </div>
            <div className="p-4 overflow-y-auto">
                {activeTab === 'elements' && (
                    <div>
                        {elementGroups.map(group => (
                            <div key={group.title} className="mb-4">
                                <h3 className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-2">{group.title}</h3>
                                <div className="grid grid-cols-2 gap-2">
                                    {group.items.map(el => <DraggableItem key={el.type} {...el} />)}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                {activeTab === 'layers' && <LayersPanel nodes={state.pageContent} />}
                {activeTab === 'css' && <GlobalCssPanel />}
            </div>
        </aside>
    );
};
LeftPanel.displayName = 'LeftPanel';

const LayersPanel = ({ nodes, level = 0 }: { nodes: Element[], level?: number }) => {
    const { state, dispatch } = useEditorContext();
    const { selectedElementId } = state;

    if (!nodes || nodes.length === 0) return null;

    return (
        <div className="text-sm">
            {nodes.map(node => (
                <div key={node.id}>
                    <button
                        onClick={(e) => { e.stopPropagation(); dispatch({ type: 'SET_SELECTED_ELEMENT', payload: node.id })}}
                        className={`w-full text-left px-2 py-1 rounded hover:bg-gray-700 ${selectedElementId === node.id ? 'bg-indigo-600' : ''}`}
                        style={{ paddingLeft: `${level * 16 + 8}px` }}
                    >
                        {node.name || node.type}
                    </button>
                    {node.children && node.children.length > 0 && <LayersPanel nodes={node.children} level={level + 1} />}
                    {node.type === 'columns' && JSON.parse(node.content).columns.map((col: { id: string, children: Element[] }, i: number) => (
                        <div key={col.id}>
                            <div className="px-2 py-1 text-gray-400" style={{ paddingLeft: `${(level + 1) * 16 + 8}px` }}>Column {i + 1}</div>
                            <LayersPanel nodes={col.children} level={level + 2} />
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
};
LayersPanel.displayName = 'LayersPanel';

const GlobalCssPanel = () => {
    const { state, dispatch } = useEditorContext();
    const { pageStyles } = state;

    const handleCssChange = (css: string) => {
        dispatch({ type: 'SET_PAGE_STYLES', payload: { globalCss: css } });
    };

    return (
        <div>
            <h3 className="text-lg font-bold mb-2">Global Stylesheet</h3>
            <p className="text-xs text-gray-400 mb-4">Add custom CSS classes here. They will be available to all elements on the page.</p>
            <textarea
                className="w-full h-80 bg-gray-800 text-white font-mono text-xs p-2 rounded-md border border-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                value={pageStyles.globalCss || ''}
                onChange={(e) => handleCssChange(e.target.value)}
            />
        </div>
    )
}
GlobalCssPanel.displayName = 'GlobalCssPanel';

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
        const draggedId = e.dataTransfer.getData('draggedElementId');
        if(draggedId) {
            dispatch({ type: 'MOVE_ELEMENT', payload: { draggedId, targetParentId: parentId, targetIndex: index } });
            return;
        }
        const elementType = e.dataTransfer.getData('elementType') as ElementType;
        if (elementType) {
            const newElement = createNewElement(elementType);
            dispatch({ type: 'ADD_ELEMENT', payload: { elements: Array.isArray(newElement) ? newElement : [newElement], parentId, index } });
        }
    };

    const renderChildren = (children: Element[], parentId: string) => (
        <>
            {children.map((child, i) => (
                <div key={child.id} data-draggable="true">
                    {dropIndicator?.parentId === parentId && dropIndicator.index === i && <DropIndicator />}
                    <RenderElement element={child} screenSize={screenSize} handleDragOver={handleDragOver} handleDrop={handleDrop} dropIndicator={dropIndicator} />
                </div>
            ))}
            {dropIndicator?.parentId === parentId && dropIndicator.index === children.length && <DropIndicator />}
            {children.length === 0 && <div className="min-h-[60px] flex items-center justify-center text-xs text-gray-400 border-2 border-dashed border-gray-300 rounded-md">Drag elements here</div>}
        </>
    );

    return (
        <main className="flex-1 overflow-auto p-8" style={{ backgroundColor: pageStyles.backgroundColor }}>
            <div
                className={`mx-auto bg-white shadow-2xl transition-all duration-300 relative ${getScreenSizeClass(screenSize)}`}
                style={{ ...pageStyles, minHeight: '100%', paddingBottom: '50vh' }}
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

const RenderElement = React.memo(({ element, screenSize, handleDragOver, handleDrop, dropIndicator }: { element: Element; screenSize: 'desktop' | 'tablet' | 'mobile'; handleDragOver: (e: React.DragEvent, parentId: string) => void; handleDrop: (e: React.DragEvent, parentId: string, index: number) => void; dropIndicator: { parentId: string; index: number } | null }) => {
    const { state, dispatch } = useEditorContext();
    const isSelected = state.selectedElementId === element.id;
    const ref = useRef<HTMLDivElement>(null);

    const handleSelect = (e: React.MouseEvent) => {
        e.stopPropagation();
        dispatch({ type: 'SET_SELECTED_ELEMENT', payload: element.id });
    };

    const handleDragStart = (e: React.DragEvent) => {
        e.stopPropagation();
        e.dataTransfer.setData('draggedElementId', element.id);
    };

    const handleContentBlur = () => {
        if (ref.current && ref.current.innerHTML !== element.content) {
            dispatch({ type: 'UPDATE_ELEMENT_CONTENT', payload: { elementId: element.id, content: ref.current.innerHTML } });
        }
    };

    const getResponsiveStyles = (element: Element, screenSize: 'desktop' | 'tablet' | 'mobile') => {
        const desktopStyles = element.styles?.desktop?.default || {};
        const tabletStyles = element.styles?.tablet?.default || {};
        const mobileStyles = element.styles?.mobile?.default || {};

        let styles = { ...desktopStyles };
        if (screenSize === 'tablet' || screenSize === 'mobile') {
            styles = { ...styles, ...tabletStyles };
        }
        if (screenSize === 'mobile') {
            styles = { ...styles, ...mobileStyles };
        }
        return styles;
    };

    const combinedStyles = getResponsiveStyles(element, screenSize);

    if (combinedStyles.display === 'none') {
        return null;
    }

    const props = { style: combinedStyles, onClick: handleSelect, onDragStart: handleDragStart, draggable: true, id: element.htmlId, className: element.className };

    const renderChildren = (children: Element[], parentId: string) => (
        <>
            {children.map((child, i) => (
                <div key={child.id} data-draggable="true">
                    {dropIndicator?.parentId === parentId && dropIndicator.index === i && <DropIndicator />}
                    <RenderElement element={child} screenSize={screenSize} handleDragOver={handleDragOver} handleDrop={handleDrop} dropIndicator={dropIndicator}/>
                </div>
            ))}
            {dropIndicator?.parentId === parentId && dropIndicator.index === children.length && <DropIndicator />}
            {children.length === 0 && <div className="min-h-[60px] flex items-center justify-center text-xs text-gray-400 border-2 border-dashed border-gray-300 rounded-md">Drag elements here</div>}
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
            onDrop: (e: React.DragEvent) => handleDrop(e, element.id, dropIndicator?.index ?? (element.children || []).length)
        };
        switch (element.type) {
            case 'section':
            case 'box':
            case 'card':
            case 'preview-card':
            case 'detail-card':
            case 'feature-grid':
                return <section {...props} {...dropProps}>{renderChildren(element.children || [], element.id)}</section>;

            case 'hero': return <HeroComponent element={element} props={props} dropProps={dropProps} renderChildren={renderChildren} />;
            case 'steps': return <StepsComponent element={element} props={props} dropProps={dropProps} renderChildren={renderChildren} />;
            case 'horizontal-scroll': return <HorizontalScrollComponent element={element} props={props} dropProps={dropProps} renderChildren={renderChildren} />;
            case 'auto-scroll': return <AutoScrollComponent element={element} props={props} dropProps={dropProps} screenSize={screenSize} handleDragOver={handleDragOver} handleDrop={handleDrop} dropIndicator={dropIndicator} selectedElementId={state.selectedElementId}/>;
            case 'single-auto-scroll': return <SingleAutoScrollComponent element={element} props={props} dropProps={dropProps} selectedElementId={state.selectedElementId} />;
            case 'image-carousel': return <ImageCarouselComponent element={element} props={props} dropProps={dropProps} />;
            case 'hero-slider': return <HeroSliderComponent element={element} props={props} dropProps={dropProps} />;
            case 'accordion': return <AccordionComponent element={element} props={props} dropProps={dropProps} renderChildren={renderChildren} />;
            case 'feature-block': return <FeatureBlockComponent element={element} props={props}/>;
            case 'step-block': return <StepBlockComponent element={element} props={props}/>;
            case 'testimonial': return <TestimonialComponent element={element} props={props}/>;
            case 'faq': return <FaqComponent element={element} props={props} />;

            case 'profile-card': {
                const content = JSON.parse(element.content);
                return (
                    <div {...props}>
                        <img src={content.profileImage} alt={content.name} style={{width: '80px', height: '80px', borderRadius: '50%'}} />
                        <div>
                            <h3 style={{fontSize: '1.25rem', fontWeight: 'bold', color: '#111827'}}>{content.name}</h3>
                            <p style={{fontSize: '1rem', color: '#4f46e5'}}>{content.title}</p>
                            <p style={{fontSize: '0.875rem', color: '#6b7280'}}>{content.handle}</p>
                        </div>
                    </div>
                );
            }
            case 'video-right-section': {
                const content = JSON.parse(element.content || '{}');
                return (
                    <section {...props}>
                        <div className="flex-1 min-h-[100px]" {...dropProps}>
                            {renderChildren(element.children || [], element.id)}
                        </div>
                        <div className="flex-1 flex min-h-[250px]">
                            <iframe className="w-full h-full rounded-lg" src={content.videoUrl} title="Embedded Video" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe>
                        </div>
                    </section>
                );
            }
            case 'video-left-section': {
                const content = JSON.parse(element.content || '{}');
                return (
                    <section {...props}>
                        <div className="flex-1 flex min-h-[250px]">
                            <iframe className="w-full h-full rounded-lg" src={content.videoUrl} title="Embedded Video" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe>
                        </div>
                        <div className="flex-1 min-h-[100px]" {...dropProps}>
                            {renderChildren(element.children || [], element.id)}
                        </div>
                    </section>
                );
            }
            case 'right-image-section': {
                const content = JSON.parse(element.content || '{}');
                return (
                    <section {...props} >
                        <div className="flex-1 min-h-[100px]" {...dropProps}>
                            {renderChildren(element.children || [], element.id)}
                        </div>
                        <div className="flex-1 flex min-h-[250px]">
                            <img src={content.imageSrc} alt="" className="w-full h-full object-cover rounded-lg" />
                        </div>
                    </section>
                )
            }
            case 'left-image-section': {
                const content = JSON.parse(element.content || '{}');
                return (
                    <section {...props} >
                        <div className="flex-1 flex min-h-[250px]">
                            <img src={content.imageSrc} alt="" className="w-full h-full object-cover rounded-lg" />
                        </div>
                        <div className="flex-1 min-h-[100px]" {...dropProps}>
                            {renderChildren(element.children || [], element.id)}
                        </div>
                    </section>
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
            case 'gallery': {
                const galleryContent = JSON.parse(element.content);
                const gridStyle = {
                    ...combinedStyles,
                    gridTemplateColumns: `repeat(${galleryContent.columns || 3}, 1fr)`
                };
                return <div {...props} style={gridStyle}>{galleryContent.images.map((src: string, i: number) => <img key={i} src={src} alt={`Gallery image ${i+1}`} style={{width: '100%', height: 'auto', borderRadius: '8px'}} />)}</div>;
            }
            case 'footer': {
                const footerContent = JSON.parse(element.content);
                return <footer {...props}><p>{footerContent.text}</p></footer>;
            }
            case 'navbar': return <NavbarComponent element={element} screenSize={screenSize} {...props} />;
            case 'video': return <iframe {...props} src={element.content} title="Embedded Video" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe>;
            case 'divider': return <div {...props} />;
            case 'contact-form': {
                const formContent = JSON.parse(element.content);
                return (
                    <form {...props} onSubmit={e => e.preventDefault()}>
                        {formContent.fields.map((field: {label: string, type: string}) => (
                            <div key={field.label} className="flex flex-col mb-4">
                                <label className="mb-1 text-sm text-gray-700">{field.label}</label>
                                <input type={field.type} className="p-2 border border-gray-300 rounded"/>
                            </div>
                        ))}
                        <button type="submit" style={{ backgroundColor: '#4f46e5', color: '#fff', padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>{formContent.buttonText}</button>
                    </form>
                );
            }
            case 'image': return <img {...props} src={element.content} alt="" />;
            case 'button': return <button {...props}>{element.content}</button>;
            default: return <div {...props} className="p-4 bg-gray-200 text-gray-800 rounded">Invalid Element: {element.type}</div>;
        }
    };

    return <ElementWrapper isSelected={isSelected} element={element}>{renderComponent()}</ElementWrapper>;
});
RenderElement.displayName = 'RenderElement';

const ElementWrapper = ({ isSelected, children, element }: { isSelected: boolean, children: React.ReactNode, element: Element }) => {
    const { dispatch } = useEditorContext();
    return (
        <div data-draggable="true" id={element.htmlId || undefined} className={`relative p-1 border-2 ${isSelected ? 'border-indigo-500' : 'border-transparent hover:border-indigo-500/50'} ${element.className || ''}`}>
            {isSelected && (
                <div className="absolute -top-7 left-0 flex items-center gap-1 bg-indigo-600 text-white px-2 py-0.5 rounded-t-md text-xs">
                    <span className="capitalize">{element.name || element.type.replace(/-/g, ' ')}</span>
                    <button title="Duplicate" onClick={(e) => { e.stopPropagation(); dispatch({ type: 'DUPLICATE_ELEMENT', payload: { elementId: element.id } }); }} className="p-0.5 hover:bg-indigo-500 rounded"><Copy size={10} /></button>
                    <button title="Delete" onClick={(e) => { e.stopPropagation(); dispatch({ type: 'DELETE_ELEMENT', payload: { elementId: element.id } }); }} className="p-0.5 hover:bg-indigo-500 rounded"><FaTrashAlt size={10} /></button>
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

const RightPanel = ({ activePanel, setActivePanel, selectedElement, screenSize, setScreenSize }: { activePanel: 'properties' | 'history' | 'versions', setActivePanel: (panel: 'properties' | 'history' | 'versions') => void, selectedElement: Element | null, screenSize: 'desktop' | 'tablet' | 'mobile', setScreenSize: (size: 'desktop' | 'tablet' | 'mobile') => void }) => {
  const { state } = useEditorContext();
  const params = useParams();
  const siteId = params.siteId as string;

  return (
    <aside className="w-80 flex-shrink-0 bg-gray-900 p-4 border-l border-gray-700 overflow-y-auto">
      <div className="flex mb-4 border-b border-gray-700">
        <button onClick={() => setActivePanel('properties')} className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm ${activePanel === 'properties' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-gray-400'}`}>
          <Settings size={16} /> Properties
        </button>
        <button onClick={() => setActivePanel('history')} className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm ${activePanel === 'history' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-gray-400'}`}>
          <History size={16} /> Session
        </button>
        <button onClick={() => setActivePanel('versions')} className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm ${activePanel === 'versions' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-gray-400'}`}>
          <Clock size={16} /> Versions
        </button>
      </div>
      {activePanel === 'properties' && (
        selectedElement ? <ElementPropertiesPanel key={selectedElement.id} element={selectedElement} screenSize={screenSize} setScreenSize={setScreenSize} /> : <PagePropertiesPanel pageStyles={state.pageStyles} />
      )}
      {activePanel === 'history' && (
        <HistoryPanel history={state.history} historyIndex={state.historyIndex} />
      )}
      {activePanel === 'versions' && (
        <VersionHistoryPanel siteId={siteId} />
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

const AddChildElementProperties = ({ element }: { element: Element }) => {
    const { dispatch } = useEditorContext();

    const handleAddCard = () => {
        let newCardType: ElementType = 'preview-card';
        if (element.type === 'single-auto-scroll') newCardType = 'detail-card';
        if (element.type === 'image-carousel') newCardType = 'image';
        if (element.type === 'hero-slider') newCardType = 'box';
        
        const newElement = createNewElement(newCardType) as Element;

        if (element.type === 'hero-slider') {
            newElement.name = 'Hero Slide';
            newElement.styles = {
                ...newElement.styles,
                desktop: { default: { backgroundImage: 'url(https://placehold.co/1200x500/3730a3/ffffff)', backgroundSize: 'cover', backgroundPosition: 'center', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '20px' }}
            };
            newElement.children = [
                createNewElement('heading') as Element
            ]
        }
        if (element.type === 'image-carousel') {
             newElement.styles = { desktop: { default: { width: '100%', height: '100%', objectFit: 'cover' }}};
        }

        dispatch({
            type: 'ADD_ELEMENT',
            payload: {
                elements: [newElement],
                parentId: element.id,
                index: element.children?.length || 0
            }
        });
    };

    const getButtonLabel = () => {
        if (['image-carousel', 'hero-slider'].includes(element.type)) return 'Add Slide';
        if (element.type === 'accordion') return 'Add Accordion Item';
        return 'Add Card';
    }

    return (
        <div>
            <button
                onClick={handleAddCard}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 py-2 rounded-md hover:bg-indigo-500"
            >
                <FaPlus size={12} /> {getButtonLabel()}
            </button>
        </div>
    );
};
AddChildElementProperties.displayName = 'AddChildElementProperties';

const ChildElementSelector = ({ element }: { element: Element }) => {
    const { state, dispatch } = useEditorContext();
    return (
        <>
            <h4 className="text-sm font-bold mt-4 mb-2">Child Elements</h4>
            <div className="space-y-1 max-h-40 overflow-y-auto border border-gray-700 rounded-md p-1">
                {element.children?.map(child => (
                    <button 
                        key={child.id}
                        onClick={(e) => { e.stopPropagation(); dispatch({ type: 'SET_SELECTED_ELEMENT', payload: child.id })}}
                        className={`w-full text-left p-2 rounded-md text-xs ${state.selectedElementId === child.id ? 'bg-indigo-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}
                    >
                        {child.name || child.type}
                    </button>
                ))}
                {(!element.children || element.children.length === 0) && <p className="text-xs text-gray-500 p-2">This element has no children.</p>}
            </div>
        </>
    )
};
ChildElementSelector.displayName = 'ChildElementSelector';

const AutoScrollProperties = ({ content, onContentChange }: { content: any, onContentChange: (c: any) => void }) => {
    return (
        <StyleInput 
            label="Scroll Delay (ms)" 
            type="number" 
            value={content.delay} 
            onChange={val => onContentChange({ ...content, delay: Number(val) })} 
        />
    );
};
AutoScrollProperties.displayName = 'AutoScrollProperties';

const SingleAutoScrollProperties = ({ element, content, onContentChange }: { element: Element, content: any, onContentChange: (c: any) => void }) => {
    return (
        <>
            <StyleInput 
                label="Scroll Delay (ms)" 
                type="number" 
                value={content.delay} 
                onChange={val => onContentChange({ ...content, delay: Number(val) })} 
            />
            <StyleInput 
                label="Transition" 
                type="select" 
                value={content.transition} 
                onChange={val => onContentChange({ ...content, transition: val })}
                options={[
                    { label: 'Fade', value: 'fade'},
                    { label: 'Slide from Top', value: 'slide-top'},
                    { label: 'Slide from Bottom', value: 'slide-bottom'},
                    { label: 'Slide from Left', value: 'slide-left'},
                    { label: 'Slide from Right', value: 'slide-right'},
                ]}
            />
            <ChildElementSelector element={element} />
        </>
    );
};
SingleAutoScrollProperties.displayName = 'SingleAutoScrollProperties';

const AccordionProperties = ({ content, onContentChange }: { content: any, onContentChange: (c: any) => void }) => {
    return (
        <StyleInput 
            label="Title" 
            value={content.title} 
            onChange={val => onContentChange({ ...content, title: val })} 
        />
    );
}
AccordionProperties.displayName = 'AccordionProperties';

const HeroProperties = ({ element, content, onContentChange }: { element: Element, content: any, onContentChange: (c: any) => void }) => {
    return (
        <>
            <StyleInput 
                label="Background Type" 
                type="select" 
                value={content.backgroundType} 
                onChange={val => onContentChange({ ...content, backgroundType: val })}
                options={[ { label: 'Image', value: 'image' }, { label: 'Video', value: 'video' } ]}
            />
            {content.backgroundType === 'image' ? (
                 <StyleInput label="Background Image URL" value={content.backgroundImageUrl} onChange={val => onContentChange({ ...content, backgroundImageUrl: val })} />
            ) : (
                 <StyleInput label="Background Video URL" value={content.backgroundVideoUrl} onChange={val => onContentChange({ ...content, backgroundVideoUrl: val })} />
            )}
            <StyleInput 
                label="Content Position" 
                type="select" 
                value={content.contentPosition} 
                onChange={val => onContentChange({ ...content, contentPosition: val })}
                options={[
                    { label: 'Center Middle', value: 'center-middle'},
                    { label: 'Center Top', value: 'center-top'},
                    { label: 'Bottom Left', value: 'bottom-left'},
                    { label: 'Bottom Right', value: 'bottom-right'},
                ]}
            />
             <ChildElementSelector element={element} />
        </>
    );
};
HeroProperties.displayName = 'HeroProperties';


const ElementPropertiesPanel = ({ element, screenSize, setScreenSize }: { element: Element; screenSize: 'desktop' | 'tablet' | 'mobile', setScreenSize: (size: 'desktop' | 'tablet' | 'mobile') => void }) => {
  const { dispatch } = useEditorContext();
  const [styleState, setStyleState] = useState<'default' | 'hover'>('default');
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleStyleChange = (key: string, value: string | number) => {
    dispatch({ type: 'UPDATE_ELEMENT_STYLES', payload: { elementId: element.id, styles: { [key]: value }, breakpoint: screenSize, state: styleState } });
  };

  const handleContentChange = (newContent: object) => {
    dispatch({ type: 'UPDATE_ELEMENT_CONTENT', payload: {elementId: element.id, content: JSON.stringify(newContent, null, 2)} });
  }

  const handleGenerateContent = async () => {
    if (!aiPrompt) return;
    setIsGenerating(true);
    const newContent = await generateContentWithGemini(aiPrompt);
    dispatch({ type: 'UPDATE_ELEMENT_CONTENT', payload: { elementId: element.id, content: `<p>${newContent}</p>` } });
    dispatch({ type: 'ADD_HISTORY' });
    setIsGenerating(false);
    setAiPrompt('');
  };

  const currentStyles = element.styles?.[screenSize]?.[styleState] || {};

  const renderContentInputs = () => {
    if (['preview-card', 'detail-card', 'feature-grid'].includes(element.type)) {
      return <p className="text-xs text-gray-400">This is a preset container. Click the elements inside the canvas to edit them.</p>;
    }
    
    if (['image', 'button', 'video'].includes(element.type)) {
      return <StyleInput label="URL / Text" value={element.content} onChange={val => dispatch({type: 'UPDATE_ELEMENT_CONTENT', payload: {elementId: element.id, content: val}})}/>;
    }
    
    if (['horizontal-scroll', 'image-carousel', 'hero-slider'].includes(element.type)) {
        return <AddChildElementProperties element={element} />;
    }

    if (element.content) {
        try {
            const content = JSON.parse(element.content);

            if (element.type === 'auto-scroll') {
                return <>
                    <AddChildElementProperties element={element} />
                    <div className="mt-4"><AutoScrollProperties content={content} onContentChange={handleContentChange} /></div>
                </>;
            }

            if (element.type === 'single-auto-scroll') {
                return <>
                    <AddChildElementProperties element={element} />
                    <div className="mt-4"><SingleAutoScrollProperties element={element} content={content} onContentChange={handleContentChange} /></div>
                </>;
            }

            if (typeof content === 'object' && content !== null) {
                const contentPanelMap: Record<string, React.ReactNode> = {
                  hero: <HeroProperties element={element} content={content} onContentChange={handleContentChange} />,
                  accordion: <AccordionProperties content={content} onContentChange={handleContentChange} />,
                  navbar: <NavbarProperties content={content} onContentChange={handleContentChange} />,
                  columns: <ColumnsProperties element={element} content={content} onContentChange={handleContentChange} />,
                  gallery: <GalleryProperties content={content} onContentChange={handleContentChange} />,
                  steps: <StepsProperties element={element} content={content} onContentChange={handleContentChange} />,
                  footer: <StyleInput label="Copyright Text" value={content.text} onChange={val => handleContentChange({text: val})} />,
                  "right-image-section": <StyleInput label="Image URL" value={content.imageSrc} onChange={val => handleContentChange({ ...content, imageSrc: val })} />,
                  "left-image-section": <StyleInput label="Image URL" value={content.imageSrc} onChange={val => handleContentChange({ ...content, imageSrc: val })} />,
                  "video-right-section": <StyleInput label="Video URL" value={content.videoUrl} onChange={val => handleContentChange({ ...content, videoUrl: val })} />,
                  "video-left-section": <StyleInput label="Video URL" value={content.videoUrl} onChange={val => handleContentChange({ ...content, videoUrl: val })} />,
                  "profile-card": <ProfileCardProperties content={content} onContentChange={handleContentChange} />,
                  "testimonial": <TestimonialProperties content={content} onContentChange={handleContentChange} />,
                  "faq": <FaqProperties content={content} onContentChange={handleContentChange} />,
                  "feature-block": <FeatureBlockProperties content={content} onContentChange={handleContentChange} />,
                  "step-block": <StepBlockProperties content={content} onContentChange={handleContentChange} />,
                  "contact-form": <ContactFormProperties content={content} onContentChange={handleContentChange} />,
                };
                return contentPanelMap[element.type] || null;
            }
        } catch (e) {
            // Content is not JSON, fall through to default behavior or return null
        }
    }

    return null;
  };

  return (
    <div>
      <h3 className="font-bold mb-2 capitalize">{element.name || element.type.replace(/-/g, ' ')} Properties</h3>

      <div className="flex items-center gap-1 bg-gray-800 p-1 rounded-lg mb-4">
        {([ 'desktop', 'tablet', 'mobile' ] as const).map(size => (
          <button key={size} onClick={() => setScreenSize(size)} className={`flex-1 p-2 rounded-md transition-colors text-xs ${screenSize === size ? 'bg-indigo-600 text-white' : 'hover:bg-gray-700'}`} title={`${size.charAt(0).toUpperCase() + size.slice(1)} View`}>
            {size === 'desktop' && <FaDesktop />}
            {size === 'tablet' && <FaTabletAlt />}
            {size === 'mobile' && <FaMobileAlt />}
          </button>
        ))}
      </div>

      <div className="flex border-b-2 border-gray-700 mb-4">
        <button onClick={() => setStyleState('default')} className={`flex-1 py-1 text-sm ${styleState === 'default' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-gray-400'}`}>Default</button>
        <button onClick={() => setStyleState('hover')} className={`flex-1 py-1 text-sm ${styleState === 'hover' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-gray-400'}`}>Hover</button>
      </div>

      {['heading', 'paragraph'].includes(element.type) && (
        <CollapsibleGroup title="AI Content" open>
          <textarea value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} placeholder="e.g., a catchy headline for a portfolio" className="w-full bg-gray-700 rounded-md p-2 text-sm h-20 mb-2" />
          <button onClick={handleGenerateContent} disabled={isGenerating} className="w-full flex items-center justify-center gap-2 bg-indigo-600 py-2 rounded-md hover:bg-indigo-500 disabled:bg-gray-500">
            <Sparkles size={16} />{isGenerating ? 'Generating...' : 'Generate with AI'}
          </button>
        </CollapsibleGroup>
      )}

      <CollapsibleGroup title="Content" open>{renderContentInputs()}</CollapsibleGroup>

      <CollapsibleGroup title="Attributes & ID">
        <StyleInput label="HTML ID" value={element.htmlId || ''} onChange={val => dispatch({ type: 'UPDATE_ELEMENT_ATTRIBUTE', payload: { elementId: element.id, attribute: 'htmlId', value: val }})} />
        <StyleInput label="Custom Classes" value={element.className || ''} onChange={val => dispatch({ type: 'UPDATE_ELEMENT_ATTRIBUTE', payload: { elementId: element.id, attribute: 'className', value: val }})} />
      </CollapsibleGroup>

      <CollapsibleGroup title="Layout & Display">
        <div className="flex items-center justify-between mb-2">
          <label className="block text-xs text-gray-400">Visible</label>
          <input type="checkbox" className="toggle-checkbox" checked={currentStyles.display !== 'none'} onChange={e => handleStyleChange('display', e.target.checked ? '' : 'none')} />
        </div>
        <StyleInput label="Display" type="select" value={currentStyles.display || ''} onChange={val => handleStyleChange('display', val)} options={['block', 'inline-block', 'flex', 'grid', 'inline', 'none'].map(v => ({label: v, value: v}))}/>
        <StyleInput label="Position" type="select" value={currentStyles.position || ''} onChange={val => handleStyleChange('position', val)} options={['static', 'relative', 'absolute', 'fixed', 'sticky'].map(v => ({label: v, value: v}))}/>
        <div className="grid grid-cols-2 gap-2">
          <StyleInput label="Top" value={currentStyles.top || ''} onChange={val => handleStyleChange('top', val)} />
          <StyleInput label="Right" value={currentStyles.right || ''} onChange={val => handleStyleChange('right', val)} />
          <StyleInput label="Bottom" value={currentStyles.bottom || ''} onChange={val => handleStyleChange('bottom', val)} />
          <StyleInput label="Left" value={currentStyles.left || ''} onChange={val => handleStyleChange('left', val)} />
        </div>
        <StyleInput label="Z-Index" type="number" value={currentStyles.zIndex || ''} onChange={val => handleStyleChange('zIndex', val)} />
        <StyleInput label="Flex Direction" value={currentStyles.flexDirection || ''} onChange={val => handleStyleChange('flexDirection', val)} />
        <StyleInput label="Justify Content" value={currentStyles.justifyContent || ''} onChange={val => handleStyleChange('justifyContent', val)} />
        <StyleInput label="Align Items" value={currentStyles.alignItems || ''} onChange={val => handleStyleChange('alignItems', val)} />
        <StyleInput label="Align Self" type="select" value={currentStyles.alignSelf || ''} onChange={val => handleStyleChange('alignSelf', val)} options={['auto', 'flex-start', 'flex-end', 'center', 'stretch'].map(v => ({label:v, value:v}))}/>
        <StyleInput label="Overflow" value={currentStyles.overflow || ''} onChange={val => handleStyleChange('overflow', val)} />
      </CollapsibleGroup>

      <CollapsibleGroup title="Box Model & Spacing">
        <StyleInput label="Width" value={currentStyles.width || ''} onChange={val => handleStyleChange('width', val)} />
        <StyleInput label="Height" value={currentStyles.height || ''} onChange={val => handleStyleChange('height', val)} />
        <div className="grid grid-cols-2 gap-2">
          <StyleInput label="Min-W" value={currentStyles.minWidth || ''} onChange={val => handleStyleChange('minWidth', val)} />
          <StyleInput label="Min-H" value={currentStyles.minHeight || ''} onChange={val => handleStyleChange('minHeight', val)} />
          <StyleInput label="Max-W" value={currentStyles.maxWidth || ''} onChange={val => handleStyleChange('maxWidth', val)} />
          <StyleInput label="Max-H" value={currentStyles.maxHeight || ''} onChange={val => handleStyleChange('maxHeight', val)} />
        </div>
        <StyleInput label="Padding" value={currentStyles.padding || ''} onChange={val => handleStyleChange('padding', val)} />
        <StyleInput label="Margin" value={currentStyles.margin || ''} onChange={val => handleStyleChange('margin', val)} />
        <StyleInput label="Gap" value={currentStyles.gap || ''} onChange={val => handleStyleChange('gap', val)} />
      </CollapsibleGroup>

      <CollapsibleGroup title="Typography">
        <StyleInput label="Font Family" value={currentStyles.fontFamily || ''} onChange={val => handleStyleChange('fontFamily', val)} />
        <StyleInput label="Font Size" value={currentStyles.fontSize || ''} onChange={val => handleStyleChange('fontSize', val)} />
        <StyleInput label="Font Weight" value={currentStyles.fontWeight || ''} onChange={val => handleStyleChange('fontWeight', val)} />
        <StyleInput label="Line Height" value={currentStyles.lineHeight || ''} onChange={val => handleStyleChange('lineHeight', val)} />
        <StyleInput label="Letter Spacing" value={currentStyles.letterSpacing || ''} onChange={val => handleStyleChange('letterSpacing', val)} />
        <StyleInput label="Text Align" type="select" value={currentStyles.textAlign || ''} onChange={val => handleStyleChange('textAlign', val)} options={[{label: 'Left', value: 'left'}, {label: 'Center', value: 'center'}, {label: 'Right', value: 'right'}]} />
        <StyleInput label="Text Decoration" value={currentStyles.textDecoration || ''} onChange={val => handleStyleChange('textDecoration', val)} />
        <StyleInput label="Text Transform" value={currentStyles.textTransform || ''} onChange={val => handleStyleChange('textTransform', val)} />
        <StyleInput label="Color" type="color" value={currentStyles.color || ''} onChange={val => handleStyleChange('color', val)} />
        {['ordered-list', 'unordered-list'].includes(element.type) &&
          <StyleInput label="List Style Type" type="select" value={currentStyles.listStyleType || ''} onChange={(val:string) => handleStyleChange('listStyleType', val)} options={['disc', 'circle', 'square', 'decimal', 'lower-alpha', 'upper-alpha', 'none'].map(v => ({label:v, value:v}))}/>
        }
      </CollapsibleGroup>

      <CollapsibleGroup title="Visual & Effects">
        <StyleInput label="Background" value={currentStyles.background || ''} onChange={val => handleStyleChange('background', val)} />
        <StyleInput label="Opacity" type="number" value={currentStyles.opacity || ''} onChange={val => handleStyleChange('opacity', val)} />
        <StyleInput label="Border" value={currentStyles.border || ''} onChange={val => handleStyleChange('border', val)} placeholder="e.g., 2px solid #4f46e5" />
        <StyleInput label="Border Radius" value={currentStyles.borderRadius || ''} onChange={val => handleStyleChange('borderRadius', val)} placeholder="e.g., 12px" />
        <StyleInput label="Box Shadow" value={currentStyles.boxShadow || ''} onChange={val => handleStyleChange('boxShadow', val)} placeholder="e.g., 0 10px 15px -3px #0000001a" />
        <StyleInput label="Transition" value={currentStyles.transition || ''} onChange={val => handleStyleChange('transition', val)} placeholder="e.g., all 0.3s ease" />
      </CollapsibleGroup>
       <div className="mt-4">
          <button
              onClick={() => dispatch({ type: 'DELETE_ELEMENT', payload: { elementId: element.id } })}
              className="w-full flex items-center justify-center gap-2 bg-red-600/20 text-red-400 py-2 rounded-md hover:bg-red-600/30"
          >
              <FaTrashAlt size={12} /> Delete Element
          </button>
      </div>
    </div>
  );
};
ElementPropertiesPanel.displayName = 'ElementPropertiesPanel';

const PagePropertiesPanel = ({ pageStyles }: { pageStyles: PageStyles }) => {
    const { dispatch } = useEditorContext();
    const handleStyleChange = (key: string, value: any) => {
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
            <CollapsibleGroup title="Design System" open>
                <h4 className="text-sm font-bold mb-2">Global Colors</h4>
                {pageStyles.globalColors?.map((color, index) => (
                    <div key={index} className="flex items-center gap-2 mb-2">
                        <input type="text" value={color.name} onChange={e => { const newColors = [...pageStyles.globalColors!]; newColors[index].name = e.target.value; handleStyleChange('globalColors', newColors)}} className="flex-1 bg-gray-700 rounded px-2 py-1 text-xs"/>
                        <input type="color" value={color.value} onChange={e => { const newColors = [...pageStyles.globalColors!]; newColors[index].value = e.target.value; handleStyleChange('globalColors', newColors)}} className="w-8 h-8 p-0 border-none rounded"/>
                    </div>
                ))}
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

const VersionHistoryPanel = ({ siteId }: { siteId: string }) => {
    const { dispatch } = useEditorContext();
    const { data, error, isLoading } = useSWR(`/api/sites/${siteId}/history`, () => apiClient.getHistory(siteId));

    const handleRevert = (version: any) => {
        if (window.confirm('Are you sure you want to revert to this version? Your current draft will be overwritten.')) {
            dispatch({ type: 'REVERT_TO_VERSION', payload: { content: version.content, pageStyles: version.pageStyles } });
        }
    };

    if (isLoading) return <p>Loading versions...</p>;
    if (error) return <p>Failed to load versions.</p>;

    return (
        <div className="space-y-2">
            {data?.history.length ? data.history.map((version: any) => (
                <div key={version.id} className="p-2 rounded-md bg-gray-800">
                    <p className="text-sm font-medium">
                        {new Date(version.savedAt._seconds * 1000).toLocaleString()}
                    </p>
                    <button onClick={() => handleRevert(version)} className="text-xs text-indigo-400 hover:underline">
                        Load this version
                    </button>
                </div>
            )) : <p className="text-sm text-gray-400">No saved versions yet.</p>}
        </div>
    );
};
VersionHistoryPanel.displayName = 'VersionHistoryPanel';


const NavbarProperties = ({ content, onContentChange }: { content: any; onContentChange: (c: any) => void }) => (<> <StyleInput label="Logo Type" type="select" value={content.logo.type} onChange={val => onContentChange({...content, logo: {...content.logo, type: val}})} options={[{label: 'Image', value: 'image'}, {label: 'Text', value: 'text'}]} /> {content.logo.type === 'image' ? <StyleInput label="Logo URL" value={content.logo.src} onChange={val => onContentChange({...content, logo: {...content.logo, src: val}})} /> : <StyleInput label="Logo Text" value={content.logo.text} onChange={val => onContentChange({...content, logo: {...content.logo, text: val}})} />} <h4 className="text-sm font-bold mt-4 mb-2">Links</h4> {content.links.map((link: { id: string, label: string, href: string }, index: number) => (<div key={link.id} className="flex gap-2 items-center mb-2 p-2 bg-gray-700 rounded-md"> <input type="text" placeholder="Label" value={link.label} onChange={e => { const newLinks = [...content.links]; newLinks[index].label = e.target.value; onContentChange({...content, links: newLinks});}} className="flex-1 bg-gray-600 rounded px-2 py-1"/> <input type="text" placeholder="URL" value={link.href} onChange={e => { const newLinks = [...content.links]; newLinks[index].href = e.target.value; onContentChange({...content, links: newLinks});}} className="flex-1 bg-gray-600 rounded px-2 py-1"/> <button onClick={() => { const newLinks = content.links.filter((_:any, i:number) => i !== index); onContentChange({...content, links: newLinks})}} className="p-1 hover:bg-red-500 rounded"><FaTrashAlt size={12}/></button> </div> ))} <button onClick={() => onContentChange({...content, links: [...content.links, {id: `link-${Date.now()}`, label: 'New Link', href: '#'}]})} className="text-indigo-400 text-sm mt-2 flex items-center gap-1"><FaPlus size={10}/> Add Link</button> <h4 className="text-sm font-bold mt-4 mb-2">CTA Button</h4> <label className="flex items-center gap-2 text-xs text-gray-400 mb-1"><input type="checkbox" checked={content.cta.enabled} onChange={e => onContentChange({...content, cta: {...content.cta, enabled: e.target.checked}})} /> Enable CTA</label> {content.cta.enabled && <> <StyleInput label="CTA Label" value={content.cta.label} onChange={(val: string) => onContentChange({...content, cta: {...content.cta, label: val}})} /> <StyleInput label="CTA URL" value={content.cta.href} onChange={(val: string) => onContentChange({...content, cta: {...content.cta, href: val}})} /> </>} </>);
const GalleryProperties = ({ content, onContentChange }: { content: any; onContentChange: (c: any) => void }) => (<> <StyleInput label="Columns" type="number" value={content.columns} onChange={val => onContentChange({...content, columns: Number(val)})} /> <h4 className="text-sm font-bold mt-4 mb-2">Images</h4> {content.images.map((img: string, index: number) => (<div key={index} className="flex gap-2 items-center mb-2 p-2 bg-gray-700 rounded-md"> <input type="text" placeholder="Image URL" value={img} onChange={e => { const newImages = [...content.images]; newImages[index] = e.target.value; onContentChange({...content, images: newImages});}} className="flex-1 bg-gray-600 rounded px-2 py-1"/> <button onClick={() => { const newImages = content.images.filter((_:any, i:number) => i !== index); onContentChange({...content, images: newImages})}} className="p-1 hover:bg-red-500 rounded"><FaTrashAlt size={12}/></button> </div> ))} <button onClick={() => onContentChange({...content, images: [...content.images, 'https://placehold.co/600x400']})} className="text-indigo-400 text-sm mt-2 flex items-center gap-1"><FaPlus size={10}/> Add Image</button> </>);
const ProfileCardProperties = ({ content, onContentChange }: { content: any; onContentChange: (c: any) => void }) => (<> <StyleInput label="Profile Image URL" value={content.profileImage} onChange={(val: string) => onContentChange({...content, profileImage: val})} /> <StyleInput label="Name" value={content.name} onChange={(val: string) => onContentChange({...content, name: val})} /> <StyleInput label="Title" value={content.title} onChange={(val: string) => onContentChange({...content, title: val})} /> <StyleInput label="Handle" value={content.handle} onChange={(val: string) => onContentChange({...content, handle: val})} /> </>);
const ColumnsProperties = ({ element, content, onContentChange }: { element: Element, content: any, onContentChange: (c:any)=>void}) => {
    const handleColumnCountChange = (count: number) => {
        const newColumns = Array.from({ length: count }, (_, i) => {
            return content.columns[i] || { id: `col-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 9)}`, children: [] };
        });
        onContentChange({ ...content, columns: newColumns });
    };
    return <StyleInput label="Number of Columns" type="select" value={content.columns.length} onChange={val => handleColumnCountChange(Number(val))} options={[1,2,3,4].map(v => ({label: `${v} Column${v>1?'s':''}`, value: v}))} />
};

const DynamicStyleSheet = ({ pageStyles }: { pageStyles: PageStyles }) => {
    const cssVars = pageStyles.globalColors?.map(c => `  --${c.name.toLowerCase()}: ${c.value};`).join('\n');
    const fontVars = pageStyles.globalFonts?.map(f => `  --font-${f.name.toLowerCase()}: ${f.value};`).join('\n');

    const css = `
        :root {
            ${cssVars || ''}
            ${fontVars || ''}
        }
        ${pageStyles.globalCss || ''}
    `;
    return <style>{css}</style>;
};
DynamicStyleSheet.displayName = 'DynamicStyleSheet';

const SaveStatusIndicator = ({ status }: { status: 'saved' | 'unsaved' | 'saving' | 'error' }) => {
    const statusMap = {
        saved: { text: 'All changes saved', icon: <CheckCircle2 size={14} className="text-green-400"/>, color: 'text-gray-400' },
        unsaved: { text: 'Unsaved changes', icon: <AlertCircle size={14} className="text-yellow-400"/>, color: 'text-yellow-400' },
        saving: { text: 'Saving...', icon: <Loader2 size={14} className="animate-spin"/>, color: 'text-gray-400' },
        error: { text: 'Save failed', icon: <X size={14} className="text-red-400"/>, color: 'text-red-400' },
    };
    const currentStatus = statusMap[status];
    return (
        <div className={`flex items-center gap-2 text-sm pr-2 ${currentStatus.color}`}>
            {currentStatus.icon}
            <span>{currentStatus.text}</span>
        </div>
    );
};
SaveStatusIndicator.displayName = 'SaveStatusIndicator';

const NavbarComponent = ({ element, screenSize, ...props }: { element: Element; screenSize: 'desktop' | 'tablet' | 'mobile', [key: string]: any }) => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const navContent = JSON.parse(element.content);

    return (
        <nav {...props} className="relative">
            <div className="flex justify-between items-center w-full">
                {navContent.logo.type === 'image' ? (
                    <img src={navContent.logo.src} alt={navContent.logo.alt} className="h-10"/>
                ) : (
                    <span style={{ fontWeight: 'bold', fontSize: '1.5rem' }}>{navContent.logo.text}</span>
                )}
                <div className="hidden md:flex items-center gap-4">
                    {navContent.links.map((link: { id: string, label: string, href: string }) => <a key={link.id} href={link.href} onClick={e => e.preventDefault()} className="hover:text-indigo-400">{link.label}</a>)}
                </div>
                {navContent.cta.enabled && <a href={navContent.cta.href} onClick={e => e.preventDefault()} className="hidden md:block bg-indigo-600 px-4 py-2 rounded-md hover:bg-indigo-500 text-white">{navContent.cta.label}</a>}
                <div className="md:hidden">
                    <button onClick={(e) => {e.stopPropagation(); setIsMobileMenuOpen(!isMobileMenuOpen)}}>
                        {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>
            </div>
            {isMobileMenuOpen && (
                <div className="absolute top-full left-0 w-full bg-white text-black mt-2 rounded-md shadow-lg p-4 md:hidden">
                    <div className="flex flex-col gap-4">
                        {navContent.links.map((link: { id: string, label: string, href: string }) => <a key={link.id} href={link.href} onClick={e => e.preventDefault()} className="hover:text-indigo-600">{link.label}</a>)}
                        {navContent.cta.enabled && <a href={navContent.cta.href} onClick={e => e.preventDefault()} className="bg-indigo-600 text-center px-4 py-2 rounded-md hover:bg-indigo-500 text-white">{navContent.cta.label}</a>}
                    </div>
                </div>
            )}
        </nav>
    )
}
NavbarComponent.displayName = 'NavbarComponent';

const TestimonialComponent = ({ element, props }: { element: Element; props: any }) => {
    const content = JSON.parse(element.content);
    return (
        <div {...props}>
            <img src={content.avatar} alt={content.name} className="w-20 h-20 rounded-full mx-auto mb-4" />
            <p className="text-lg italic mb-4">"{content.quote}"</p>
            <h4 className="font-bold">{content.name}</h4>
            <p className="text-sm text-gray-500">{content.title}</p>
        </div>
    );
};
TestimonialComponent.displayName = 'TestimonialComponent';

const FaqComponent = ({ element, props }: { element: Element; props: any }) => {
    const content = JSON.parse(element.content);
    const [openItem, setOpenItem] = useState<string | null>(content.items[0]?.id || null);

    return (
        <div {...props}>
            {content.items.map((item: {id: string; question: string; answer: string, questionColor: string, answerColor: string}) => (
                <div key={item.id} className="border-b border-gray-200 py-4">
                    <button className="w-full flex justify-between items-center text-left" onClick={() => setOpenItem(openItem === item.id ? null : item.id)}>
                        <h4 className="font-semibold" style={{color: item.questionColor}}>{item.question}</h4>
                        <ChevronDown className={`transform transition-transform duration-300 ${openItem === item.id ? 'rotate-180' : ''}`} />
                    </button>
                    {openItem === item.id && (
                        <p className="mt-2" style={{color: item.answerColor}}>{item.answer}</p>
                    )}
                </div>
            ))}
        </div>
    );
};
FaqComponent.displayName = 'FaqComponent';

const FeatureBlockComponent = ({ element, props }: { element: Element; props: any }) => {
    const content = JSON.parse(element.content);
    const Icon = (lucideIcons as any)[content.icon] || Star;
    return (
        <div {...props}>
            <Icon className="text-indigo-500 w-10 h-10 mb-4" />
            <h3 className="text-xl font-bold mb-2">{content.title}</h3>
            <p className="text-gray-500">{content.text}</p>
        </div>
    );
};
FeatureBlockComponent.displayName = 'FeatureBlockComponent';

const StepBlockComponent = ({ element, props }: { element: Element; props: any }) => {
    const content = JSON.parse(element.content);
    return (
        <div {...props}>
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 font-bold text-xl mb-4">
                {content.step}
            </div>
            <h3 className="text-xl font-bold mb-2">{content.title}</h3>
            <p className="text-gray-500">{content.text}</p>
        </div>
    );
};
StepBlockComponent.displayName = 'StepBlockComponent';

const StepsComponent = ({ element, props, dropProps, renderChildren }: { element: Element; props: any, dropProps: any, renderChildren: any }) => {
    return (
      <section {...props} {...dropProps}>
        {renderChildren(element.children || [], element.id)}
      </section>
    );
};
StepsComponent.displayName = 'StepsComponent';

const HorizontalScrollComponent = ({ element, props, dropProps, renderChildren }: { element: Element; props: any, dropProps: any, renderChildren: any }) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    
    const scroll = (direction: 'left' | 'right') => {
      if (scrollRef.current) {
        const scrollAmount = direction === 'left' ? -300 : 300;
        scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      }
    };
    
    return (
      <div {...props}>
        <div ref={scrollRef} className="flex gap-4 overflow-x-auto p-4 scroll-smooth no-scrollbar">
          {renderChildren(element.children || [], element.id)}
        </div>
        <button onClick={() => scroll('left')} className="absolute top-1/2 left-2 -translate-y-1/2 bg-white/80 rounded-full p-2 shadow-md hover:bg-white z-10"><ArrowLeftCircle /></button>
        <button onClick={() => scroll('right')} className="absolute top-1/2 right-2 -translate-y-1/2 bg-white/80 rounded-full p-2 shadow-md hover:bg-white z-10"><ArrowRightCircle /></button>
      </div>
    );
};
HorizontalScrollComponent.displayName = 'HorizontalScrollComponent';

const AutoScrollComponent = ({ element, props, dropProps, screenSize, handleDragOver, handleDrop, dropIndicator, selectedElementId }: { element: Element; props: any, dropProps: any, screenSize: any, handleDragOver: any, handleDrop: any, dropIndicator: any, selectedElementId: string | null; }) => {
    const content = JSON.parse(element.content || '{}');
    const delay = content.delay || 3000;
    const scrollRef = useRef<HTMLDivElement>(null);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isHovering, setIsHovering] = useState(false);
    const totalChildren = element.children?.length || 0;
    
    const childIds = useMemo(() => {
        const getAllIds = (els: Element[]): string[] => {
            let ids: string[] = [];
            for (const el of els) {
                ids.push(el.id);
                if (el.children?.length) {
                    ids = [...ids, ...getAllIds(el.children)];
                }
            }
            return ids;
        };
        return getAllIds(element.children || []);
    }, [element.children]);

    const isChildSelected = selectedElementId ? childIds.includes(selectedElementId) : false;
    const isPaused = isHovering || isChildSelected;

    useEffect(() => {
        if (isPaused || !scrollRef.current || totalChildren <= 1) return;

        const interval = setInterval(() => {
            if (scrollRef.current) {
                const { scrollWidth, scrollLeft, clientWidth } = scrollRef.current;
                const nextIndex = (currentIndex + 1) % totalChildren;
                
                if (scrollLeft + clientWidth >= scrollWidth - 1) {
                    scrollRef.current.scrollTo({ left: 0, behavior: 'smooth' });
                     setCurrentIndex(0);
                } else {
                    const childNode = scrollRef.current.children[nextIndex] as HTMLElement;
                    if (childNode) {
                       scrollRef.current.scrollTo({ left: childNode.offsetLeft, behavior: 'smooth' });
                       setCurrentIndex(nextIndex);
                    }
                }
            }
        }, delay);
        return () => clearInterval(interval);
    }, [currentIndex, totalChildren, delay, isPaused]);

    return (
        <div {...props} onMouseEnter={() => setIsHovering(true)} onMouseLeave={() => setIsHovering(false)}>
            <div ref={scrollRef} className="flex gap-4 overflow-x-auto p-4 scroll-smooth no-scrollbar" {...dropProps}>
                {(element.children || []).map((child, i) => (
                     <div key={child.id} data-draggable="true">
                        {dropIndicator?.parentId === element.id && dropIndicator.index === i && <DropIndicator />}
                        <RenderElement
                            element={child}
                            screenSize={screenSize}
                            handleDragOver={handleDragOver}
                            handleDrop={handleDrop}
                            dropIndicator={dropIndicator}
                        />
                    </div>
                ))}
                {dropIndicator?.parentId === element.id && dropIndicator.index === totalChildren && <DropIndicator />}
            </div>
             <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/50 text-white text-xs px-2 py-1 rounded-full">
                <span>{currentIndex + 1} / {totalChildren}</span>
            </div>
        </div>
    );
}
AutoScrollComponent.displayName = 'AutoScrollComponent';

const SingleAutoScrollComponent = ({ element, props, dropProps, selectedElementId }: { element: Element; props: any, dropProps: any, selectedElementId: string | null; }) => {
    const content = JSON.parse(element.content || '{}');
    const delay = content.delay || 3000;
    const transition = content.transition || 'fade';
    const [currentIndex, setCurrentIndex] = useState(0);
    const totalChildren = element.children?.length || 0;
    const [isHovering, setIsHovering] = useState(false);

    const childIds = useMemo(() => {
        const getAllIds = (els: Element[]): string[] => {
            let ids: string[] = [];
            for (const el of els) {
                ids.push(el.id);
                if (el.children?.length) {
                    ids = [...ids, ...getAllIds(el.children)];
                }
            }
            return ids;
        };
        return getAllIds(element.children || []);
    }, [element.children]);

    const isChildSelected = selectedElementId ? childIds.includes(selectedElementId) : false;
    const isPaused = isHovering || isChildSelected;

    useEffect(() => {
        if (isPaused || totalChildren <= 1) return;
        const interval = setInterval(() => {
            setCurrentIndex(prevIndex => (prevIndex + 1) % totalChildren);
        }, delay);
        return () => clearInterval(interval);
    }, [totalChildren, delay, isPaused]);

    const getTransitionClasses = (index: number) => {
        const isActive = index === currentIndex;
        let base = 'transition-all duration-700 ease-in-out absolute w-full h-full flex justify-center items-center';
        
        if (transition === 'fade') {
            return `${base} ${isActive ? 'opacity-100' : 'opacity-0'}`;
        }
        if (transition.startsWith('slide-')) {
            let transformClass = '';
            if (isActive) {
                transformClass = 'transform translate-x-0 translate-y-0';
            } else {
                switch(transition) {
                    case 'slide-top': transformClass = 'transform -translate-y-full'; break;
                    case 'slide-bottom': transformClass = 'transform translate-y-full'; break;
                    case 'slide-left': transformClass = 'transform -translate-x-full'; break;
                    case 'slide-right': transformClass = 'transform translate-x-full'; break;
                }
            }
            return `${base} ${transformClass} ${isActive ? 'opacity-100' : 'opacity-0'}`;
        }
        return base;
    }
    
    return (
        <div {...props} {...dropProps} onMouseEnter={() => setIsHovering(true)} onMouseLeave={() => setIsHovering(false)}>
             {element.children.map((child, index) => (
                 <div key={child.id} className={getTransitionClasses(index)}>
                     <RenderElement element={child} {...{screenSize: 'desktop', handleDragOver: ()=>{}, handleDrop: ()=>{}, dropIndicator: null}} />
                 </div>
             ))}
             {element.children.length === 0 && <div className="min-h-[60px] flex items-center justify-center text-xs text-gray-400 border-2 border-dashed border-gray-300 rounded-md">Drag elements here</div>}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/50 text-white text-xs px-2 py-1 rounded-full">
                <span>{currentIndex + 1} / {totalChildren}</span>
            </div>
        </div>
    );
};
SingleAutoScrollComponent.displayName = 'SingleAutoScrollComponent';

const ImageCarouselComponent = ({ element, props, dropProps }: { element: Element; props: any, dropProps: any }) => {
    const content = JSON.parse(element.content || '{}');
    const delay = content.delay || 3000;
    const [currentIndex, setCurrentIndex] = useState(0);
    const totalChildren = element.children?.length || 0;

    useEffect(() => {
        if (totalChildren <= 1) return;
        const interval = setInterval(() => {
            setCurrentIndex(prevIndex => (prevIndex + 1) % totalChildren);
        }, delay);
        return () => clearInterval(interval);
    }, [totalChildren, delay]);

    return (
        <div {...props} {...dropProps}>
            {element.children.map((child, index) => (
                <div key={child.id} className={`absolute w-full h-full transition-opacity duration-1000 ease-in-out ${index === currentIndex ? 'opacity-100' : 'opacity-0'}`}>
                    <RenderElement element={child} {...{screenSize: 'desktop', handleDragOver: ()=>{}, handleDrop: ()=>{}, dropIndicator: null}} />
                </div>
            ))}
            {element.children.length === 0 && <div className="min-h-[60px] flex items-center justify-center text-xs text-gray-400 border-2 border-dashed border-gray-300 rounded-md">Drag images here</div>}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                {element.children.map((_, index) => (
                    <button 
                        key={index} 
                        onClick={() => setCurrentIndex(index)}
                        className={`w-2 h-2 rounded-full transition-colors ${currentIndex === index ? 'bg-white' : 'bg-white/50'}`}
                    ></button>
                ))}
            </div>
        </div>
    );
};
ImageCarouselComponent.displayName = 'ImageCarouselComponent';

const HeroSliderComponent = ({ element, props, dropProps }: { element: Element; props: any, dropProps: any }) => {
    const content = JSON.parse(element.content || '{}');
    const delay = content.delay || 4000;
    const [currentIndex, setCurrentIndex] = useState(0);
    const totalChildren = element.children?.length || 0;

    useEffect(() => {
        if (totalChildren <= 1) return;
        const interval = setInterval(() => {
            setCurrentIndex(prevIndex => (prevIndex + 1) % totalChildren);
        }, delay);
        return () => clearInterval(interval);
    }, [totalChildren, delay]);

    return (
        <div {...props} {...dropProps}>
            {element.children.map((child, index) => (
                <div key={child.id} className={`absolute w-full h-full transition-opacity duration-1000 ease-in-out ${index === currentIndex ? 'opacity-100' : 'opacity-0'}`}>
                    <RenderElement element={child} {...{screenSize: 'desktop', handleDragOver: ()=>{}, handleDrop: ()=>{}, dropIndicator: null}} />
                </div>
            ))}
             {element.children.length === 0 && <div className="min-h-[60px] flex items-center justify-center text-xs text-gray-400 border-2 border-dashed border-gray-300 rounded-md">Drag slides here</div>}
             <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                {element.children.map((_, index) => (
                    <button 
                        key={index} 
                        onClick={() => setCurrentIndex(index)}
                        className={`w-2 h-2 rounded-full transition-colors ${currentIndex === index ? 'bg-white' : 'bg-white/50'}`}
                    ></button>
                ))}
            </div>
        </div>
    );
};
HeroSliderComponent.displayName = 'HeroSliderComponent';

const AccordionComponent = ({ element, props, dropProps, renderChildren }: { element: Element; props: any, dropProps: any, renderChildren: any }) => {
    const [isOpen, setIsOpen] = useState(false);
    const content = JSON.parse(element.content || '{}');
    
    return(
        <div {...props}>
            <button onClick={() => setIsOpen(!isOpen)} className="w-full flex justify-between items-center p-4 bg-gray-100 text-gray-800 hover:bg-gray-200">
                <span>{content.title || 'Accordion Title'}</span>
                <ChevronDown className={`transform transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
                <div className="p-4 bg-white" {...dropProps}>
                    {renderChildren(element.children || [], element.id)}
                </div>
            )}
        </div>
    )
};
AccordionComponent.displayName = 'AccordionComponent';

const HeroComponent = ({ element, props, dropProps, renderChildren }: { element: Element; props: any, dropProps: any, renderChildren: any }) => {
    const content = JSON.parse(element.content || '{}');
    const positionClasses = {
        'center-middle': 'justify-center items-center text-center',
        'center-top': 'justify-center items-start text-center',
        'bottom-left': 'justify-end items-start text-left',
        'bottom-right': 'justify-end items-end text-right',
    }[content.contentPosition || 'center-middle'];

    return (
        <section {...props} className={`${props.className || ''} relative`}>
            {content.backgroundType === 'image' && (
                <img src={content.backgroundImageUrl} alt="" className="absolute top-0 left-0 w-full h-full object-cover -z-10" />
            )}
            {content.backgroundType === 'video' && (
                <video src={content.backgroundVideoUrl} autoPlay loop muted playsInline className="absolute top-0 left-0 w-full h-full object-cover -z-10" />
            )}
            <div className={`relative z-10 w-full h-full flex flex-col p-8 ${positionClasses}`} {...dropProps}>
                {renderChildren(element.children || [], element.id)}
            </div>
        </section>
    );
};
HeroComponent.displayName = 'HeroComponent';

// Add these new components to your file

const RightImageSection = ({ element, dropProps, renderChildren }: { element: Element; dropProps: any; renderChildren: any }) => {
    const content = JSON.parse(element.content);
    return (
        <div className="w-1/2 min-h-[100px] flex flex-col justify-center" {...dropProps}>
            {renderChildren(element.children || [], element.id)}
        </div>
    );
};
RightImageSection.displayName = 'RightImageSection';

const LeftImageSection = ({ element }: { element: Element }) => {
    const content = JSON.parse(element.content);
    return (
        <div className="w-1/2">
            <img src={content.imageSrc} alt="" className="w-full h-auto object-cover rounded-lg" />
        </div>
    );
};
LeftImageSection.displayName = 'LeftImageSection';


const RightVideoSection = ({ element }: { element: Element }) => {
    const content = JSON.parse(element.content || '{}');
    return (
        <div className="w-1/2">
            <iframe className="w-full aspect-video rounded-lg" src={content.videoUrl} title="Embedded Video" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe>
        </div>
    );
};
RightVideoSection.displayName = 'RightVideoSection';


const LeftVideoSection = ({ element, dropProps, renderChildren }: { element: Element; dropProps: any; renderChildren: any }) => {
    return (
        <div className="w-1/2 min-h-[100px]" {...dropProps}>
            {renderChildren(element.children || [], element.id)}
        </div>
    );
};
LeftVideoSection.displayName = 'LeftVideoSection';


const TestimonialProperties = ({ content, onContentChange }: { content: any; onContentChange: (c: any) => void }) => (
    <>
        <StyleInput label="Avatar URL" value={content.avatar} onChange={val => onContentChange({...content, avatar: val})} />
        <StyleInput label="Quote" value={content.quote} onChange={val => onContentChange({...content, quote: val})} />
        <StyleInput label="Name" value={content.name} onChange={val => onContentChange({...content, name: val})} />
        <StyleInput label="Title" value={content.title} onChange={val => onContentChange({...content, title: val})} />
    </>
);
TestimonialProperties.displayName = 'TestimonialProperties';

const FeatureBlockProperties = ({ content, onContentChange }: { content: any; onContentChange: (c: any) => void }) => (
    <>
        <StyleInput label="Icon Name (from Lucide)" value={content.icon} onChange={val => onContentChange({...content, icon: val})} />
        <StyleInput label="Title" value={content.title} onChange={val => onContentChange({...content, title: val})} />
        <StyleInput label="Text" value={content.text} onChange={val => onContentChange({...content, text: val})} />
    </>
);
FeatureBlockProperties.displayName = 'FeatureBlockProperties';

const StepBlockProperties = ({ content, onContentChange }: { content: any; onContentChange: (c: any) => void }) => (
    <>
        <StyleInput label="Step Number" value={content.step} onChange={val => onContentChange({...content, step: val})} />
        <StyleInput label="Title" value={content.title} onChange={val => onContentChange({...content, title: val})} />
        <StyleInput label="Text" value={content.text} onChange={val => onContentChange({...content, text: val})} />
    </>
);
StepBlockProperties.displayName = 'StepBlockProperties';

const FaqProperties = ({ content, onContentChange }: { content: any; onContentChange: (c: any) => void }) => {
    const handleItemChange = (index: number, field: 'question' | 'answer' | 'questionColor' | 'answerColor', value: string) => {
        const newItems = [...content.items];
        (newItems[index] as any)[field] = value;
        onContentChange({ ...content, items: newItems });
    };

    const handleAddItem = () => {
        const newItems = [...content.items, { id: `faq-${Date.now()}`, question: 'New Question', answer: 'New answer.', questionColor: '#111827', answerColor: '#4B5563' }];
        onContentChange({ ...content, items: newItems });
    };

    const handleRemoveItem = (index: number) => {
        const newItems = content.items.filter((_: any, i: number) => i !== index);
        onContentChange({ ...content, items: newItems });
    };

    return (
        <>
            <h4 className="text-sm font-bold mt-4 mb-2">FAQ Items</h4>
            {content.items.map((item: { id: string, question: string, answer: string, questionColor: string, answerColor: string }, index: number) => (
                <div key={item.id} className="mb-2 p-2 bg-gray-700 rounded-md">
                    <StyleInput label="Question" value={item.question} onChange={val => handleItemChange(index, 'question', val)} />
                    <StyleInput label="Question Color" type="color" value={item.questionColor} onChange={val => handleItemChange(index, 'questionColor', val)} />
                    <StyleInput label="Answer" value={item.answer} onChange={val => handleItemChange(index, 'answer', val)} />
                    <StyleInput label="Answer Color" type="color" value={item.answerColor} onChange={val => handleItemChange(index, 'answerColor', val)} />
                    <button onClick={() => handleRemoveItem(index)} className="text-xs text-red-400 hover:underline mt-2">Remove Item</button>
                </div>
            ))}
            <button onClick={handleAddItem} className="text-indigo-400 text-sm mt-2 flex items-center gap-1"><FaPlus size={10}/> Add FAQ Item</button>
        </>
    );
};
FaqProperties.displayName = 'FaqProperties';

const StepsProperties = ({ element, content, onContentChange }: { element: Element; content: any; onContentChange: (c: any) => void }) => {
    const { dispatch } = useEditorContext();
    const columnsElement = element.children?.find(child => child.type === 'columns');
    
    if (!columnsElement) return <p>Error: Could not find columns element.</p>;
    
    const handleStepCountChange = (newCount: number) => {
      const getUniqueId = (type: ElementType) => `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const createNewElement = (type: ElementType): Element => ({ id: getUniqueId(type), type, styles: { desktop: { default: {}, hover: {} }, tablet: { default: {}, hover: {} }, mobile: { default: {}, hover: {} } }, content: JSON.stringify({ step: '0' + (newCount), title: 'New Step', text: 'Explain the new step.' }) });
    
      const currentContent = JSON.parse(columnsElement.content);
      const currentCount = currentContent.columns.length;
    
      if (newCount > currentCount) {
        const newColumns = [...currentContent.columns];
        for (let i = currentCount; i < newCount; i++) {
          newColumns.push({
            id: getUniqueId('column_internal'),
            children: [createNewElement('step-block')]
          });
        }
        const newContentString = JSON.stringify({ ...currentContent, columns: newColumns }, null, 2);
        dispatch({ type: 'UPDATE_ELEMENT_CONTENT', payload: { elementId: columnsElement.id, content: newContentString } });
      } else if (newCount < currentCount) {
        const newColumns = currentContent.columns.slice(0, newCount);
        const newContentString = JSON.stringify({ ...currentContent, columns: newColumns }, null, 2);
        dispatch({ type: 'UPDATE_ELEMENT_CONTENT', payload: { elementId: columnsElement.id, content: newContentString } });
      }
    };
    
    const currentColumnCount = JSON.parse(columnsElement.content).columns.length;
    
    return (
      <div>
        <StyleInput
          label="Number of Steps"
          type="select"
          value={currentColumnCount}
          onChange={val => handleStepCountChange(Number(val))}
          options={[1, 2, 3, 4, 5, 6].map(v => ({ label: `${v} Step${v > 1 ? 's' : ''}`, value: v }))}
        />
        <p className="text-xs text-gray-400 mt-2">Select a step in the canvas to edit its content.</p>
      </div>
    );
};
StepsProperties.displayName = 'StepsProperties';

const ContactFormProperties = ({ content, onContentChange }: { content: any; onContentChange: (c: any) => void }) => {
    const handleFieldChange = (index: number, field: 'label' | 'type', value: string) => {
        const newFields = [...content.fields];
        (newFields[index] as any)[field] = value;
        onContentChange({ ...content, fields: newFields });
    };

    const handleAddField = () => {
        const newFields = [...content.fields, { label: 'New Field', type: 'text' }];
        onContentChange({ ...content, fields: newFields });
    };

    const handleRemoveField = (index: number) => {
        const newFields = content.fields.filter((_: any, i: number) => i !== index);
        onContentChange({ ...content, fields: newFields });
    };

    return (
        <>
            <h4 className="text-sm font-bold mt-4 mb-2">Form Fields</h4>
            {content.fields.map((field: { label: string, type: string }, index: number) => (
                <div key={index} className="flex gap-2 items-center mb-2 p-2 bg-gray-700 rounded-md">
                    <input type="text" placeholder="Label" value={field.label} onChange={e => handleFieldChange(index, 'label', e.target.value)} className="flex-1 bg-gray-600 rounded px-2 py-1"/>
                    <select value={field.type} onChange={e => handleFieldChange(index, 'type', e.target.value)} className="bg-gray-600 rounded px-2 py-1">
                        <option value="text">Text</option>
                        <option value="email">Email</option>
                        <option value="textarea">Textarea</option>
                    </select>
                    <button onClick={() => handleRemoveField(index)} className="p-1 hover:bg-red-500 rounded"><FaTrashAlt size={12}/></button>
                </div>
            ))}
            <button onClick={handleAddField} className="text-indigo-400 text-sm mt-2 flex items-center gap-1"><FaPlus size={10}/> Add Field</button>
            <h4 className="text-sm font-bold mt-4 mb-2">Button</h4>
            <StyleInput label="Button Text" value={content.buttonText} onChange={val => onContentChange({ ...content, buttonText: val})} />
        </>
    )
};
ContactFormProperties.displayName = 'ContactFormProperties';