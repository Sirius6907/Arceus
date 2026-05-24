import type { NodeLabel } from 'arceus-shared';

// Node colors by type - Celestial Aurora premium aesthetic
export const NODE_COLORS: Record<NodeLabel, string> = {
  Project: '#a855f7', // Electric Purple - prominent
  Package: '#7e22ce', // Violet
  Module: '#6b21a8', // Dark Violet
  Folder: '#8b5cf6', // Neon Violet
  File: '#60a5fa', // Neon Sky Blue
  Class: '#f43f5e', // Neon Rose
  Function: '#10b981', // Electric Emerald
  Method: '#2dd4bf', // Neon Teal
  Variable: '#64748b', // Slate - muted (less important)
  Interface: '#fb7185', // Soft Neon Pink
  Enum: '#f97316', // Neon Orange
  Decorator: '#eab308', // Neon Yellow
  Import: '#475569', // Slate darker - very muted
  Type: '#a855f7', // Electric Purple
  CodeElement: '#64748b', // Slate - muted
  Community: '#8b5cf6', // Neon Violet - cluster indicator
  Process: '#f43f5e', // Neon Rose - execution flow indicator
  Section: '#60a5fa', // Neon Sky Blue - structural section
  Struct: '#f43f5e', // Neon Rose - like Class
  Trait: '#fb7185', // Soft Neon Pink - like Interface
  Impl: '#2dd4bf', // Neon Teal - like Method
  TypeAlias: '#a855f7', // Electric Purple - like Type
  Const: '#64748b', // Slate - like Variable
  Static: '#64748b', // Slate - like Variable
  Namespace: '#7e22ce', // Violet - like Module
  Union: '#f97316', // Neon Orange - like Enum
  Typedef: '#a855f7', // Electric Purple - like Type
  Macro: '#eab308', // Neon Yellow - like Decorator
  Property: '#64748b', // Slate - like Variable
  Record: '#f43f5e', // Neon Rose - like Class
  Delegate: '#2dd4bf', // Neon Teal - like Method
  Annotation: '#eab308', // Neon Yellow - like Decorator
  Constructor: '#10b981', // Electric Emerald - like Function
  Template: '#a855f7', // Electric Purple - like Type
  Route: '#f43f5e', // Neon Rose - like Process
  Tool: '#a855f7', // Electric Purple - like Project
};

// Node sizes by type - clear visual hierarchy with dramatic size differences
// Structural nodes are MUCH larger to make hierarchy obvious
export const NODE_SIZES: Record<NodeLabel, number> = {
  Project: 20, // Largest - root of everything
  Package: 16, // Major structural element
  Module: 13, // Important container
  Folder: 10, // Structural - clearly bigger than files
  File: 6, // Common element - smaller than folders
  Class: 8, // Important code structure
  Function: 4, // Common code element - small
  Method: 3, // Smaller than function
  Variable: 2, // Tiny - leaf node
  Interface: 7, // Important type definition
  Enum: 5, // Type definition
  Decorator: 2, // Tiny modifier
  Import: 1.5, // Very small - usually hidden anyway
  Type: 3, // Type alias - small
  CodeElement: 2, // Generic small
  Community: 0, // Hidden by default - metadata node
  Process: 0, // Hidden by default - metadata node
  Section: 8, // Structural section - similar to Folder
  Struct: 8, // Like Class
  Trait: 7, // Like Interface
  Impl: 3, // Like Method
  TypeAlias: 3, // Like Type
  Const: 2, // Like Variable
  Static: 2, // Like Variable
  Namespace: 13, // Like Module
  Union: 5, // Like Enum
  Typedef: 3, // Like Type
  Macro: 2, // Like Decorator
  Property: 2, // Like Variable
  Record: 8, // Like Class
  Delegate: 3, // Like Method
  Annotation: 2, // Like Decorator
  Constructor: 4, // Like Function
  Template: 3, // Like Type
  Route: 5, // Like Enum
  Tool: 5, // Like Enum
};

// Community color palette for cluster-based coloring
export const COMMUNITY_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#f59e0b', // violet
  '#d946ef', // fuchsia
  '#ec4899', // pink
  '#f43f5e', // rose
  '#14b8a6', // teal
  '#84cc16', // lime
];

export const getCommunityColor = (communityIndex: number): string => {
  return COMMUNITY_COLORS[communityIndex % COMMUNITY_COLORS.length];
};

// Labels to show by default (hide imports and variables by default as they clutter)
export const DEFAULT_VISIBLE_LABELS: NodeLabel[] = [
  'Project',
  'Package',
  'Module',
  'Folder',
  'File',
  'Class',
  'Function',
  'Method',
  'Interface',
  'Enum',
  'Type',
];

// All filterable labels (in display order)
export const FILTERABLE_LABELS: NodeLabel[] = [
  'Folder',
  'File',
  'Class',
  'Interface',
  'Enum',
  'Type',
  'Function',
  'Method',
  'Variable',
  'Decorator',
  'Import',
];

// Edge/Relation types
export type EdgeType = 'CONTAINS' | 'DEFINES' | 'IMPORTS' | 'CALLS' | 'EXTENDS' | 'IMPLEMENTS';

export const ALL_EDGE_TYPES: EdgeType[] = [
  'CONTAINS',
  'DEFINES',
  'IMPORTS',
  'CALLS',
  'EXTENDS',
  'IMPLEMENTS',
];

// Default visible edges (CALLS hidden by default to reduce clutter)
export const DEFAULT_VISIBLE_EDGES: EdgeType[] = [
  'CONTAINS',
  'DEFINES',
  'IMPORTS',
  'EXTENDS',
  'IMPLEMENTS',
  'CALLS',
];

// Edge display info for UI
export const EDGE_INFO: Record<EdgeType, { color: string; label: string }> = {
  CONTAINS: { color: '#2d5a3d', label: 'Contains' },
  DEFINES: { color: '#0e7490', label: 'Defines' },
  IMPORTS: { color: '#1d4ed8', label: 'Imports' },
  CALLS: { color: '#a855f7', label: 'Calls' },
  EXTENDS: { color: '#fb7185', label: 'Extends' },
  IMPLEMENTS: { color: '#2dd4bf', label: 'Implements' },
};
