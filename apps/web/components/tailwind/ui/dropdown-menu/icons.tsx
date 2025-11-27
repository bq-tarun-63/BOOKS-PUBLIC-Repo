"use client";

import { Edit, FolderPlus, Trash2, UserCog, UserMinus, Eye, EyeOff, UserPlus, Share2, ArrowLeftRight, List, LayoutGrid, Calendar, Clock, SlidersHorizontal, Link, ArrowUpRight, Lock, ListFilter, ArrowUpDown, Zap, Ellipsis, Database, Copy, Layers, WrapText, ChevronLeft, ChevronRight, FileText, Paintbrush, Plus } from 'lucide-react';

/**
 * Common icons for dropdown menu items
 * All icons are standardized to h-4 w-4 with text-muted-foreground
 */

export const DropdownMenuIcons = {
  /**
   * Rename/Edit icon
   */
  Rename: () => <Edit className="h-4 w-4 text-muted-foreground" />,
  
  /**
   * Create work area from group icon
   */
  CreateWorkArea: () => <FolderPlus className="h-4 w-4 text-muted-foreground" />,
  
  /**
   * Delete/Remove icon
   */
  Delete: () => <Trash2 className="h-4 w-4 text-muted-foreground" />,
  
  /**
   * Make admin / User settings icon
   */
  MakeAdmin: () => <UserCog className="h-4 w-4 text-muted-foreground" />,
  
  /**
   * Make member / Remove admin icon
   */
  MakeMember: () => <UserMinus className="h-4 w-4 text-muted-foreground" />,
  
  /**
   * View work area / Eye icon
   */
  View: () => <Eye className="h-4 w-4 text-muted-foreground" />,
  
  /**
   * Add members icon
   */
  AddMembers: () => <UserPlus className="h-4 w-4 text-muted-foreground" />,
  
  /**
   * Generic add/plus icon
   */
  Plus: () => <Plus className="h-4 w-4 text-muted-foreground" />,
  
  /**
   * Share icon
   */
  Share: () => <Share2 className="h-4 w-4 text-muted-foreground" />,
  
  /**
   * Move/Transfer icon (for moving between private/public)
   */
  Move: () => <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />,
  
  /**
   * List view icon
   */
  List: () => <List className="h-4 w-4 text-muted-foreground" />,
  
  /**
   * Board/Grid view icon
   */
  Board: () => <LayoutGrid className="h-4 w-4 text-muted-foreground" />,
  
  /**
   * Calendar view icon
   */
  Calendar: () => <Calendar className="h-4 w-4 text-muted-foreground" />,
  
  /**
   * Timeline view icon
   */
  Timeline: () => <Clock className="h-4 w-4 text-muted-foreground" />,
  
  /**
   * Edit/Settings icon (SlidersHorizontal)
   */
  EditView: () => <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />,
  
  /**
   * Paintbrush icon (form styling)
   */
  Paintbrush: () => <Paintbrush className="h-4 w-4 text-muted-foreground" />,
  
  /**
   * Link icon
   */
  Link: () => <Link className="h-4 w-4 text-muted-foreground" />,
  
  /**
   * External link / Open full page icon
   */
  ExternalLink: () => <ArrowUpRight className="h-4 w-4 text-muted-foreground" />,
  
  /**
   * Eye / View icon
   */
  Eye: () => <Eye className="h-4 w-4 text-muted-foreground" />,
  
  /**
   * Lock icon
   */
  Lock: () => <Lock className="h-3 w-3 text-muted-foreground" />,
  
  /**
   * Type/Swap icon (custom SVG for view type)
   */
  Type: () => (
    <svg
      aria-hidden="true"
      role="graphics-symbol"
      viewBox="0 0 20 20"
      className="w-4 h-4 text-muted-foreground"
      fill="currentColor"
    >
      <path d="M6.475 3.125a.625.625 0 1 0 0 1.25h7.975c.65 0 1.175.526 1.175 1.175v6.057l-1.408-1.408a.625.625 0 1 0-.884.884l2.475 2.475a.625.625 0 0 0 .884 0l2.475-2.475a.625.625 0 0 0-.884-.884l-1.408 1.408V5.55a2.425 2.425 0 0 0-2.425-2.425zM3.308 6.442a.625.625 0 0 1 .884 0l2.475 2.475a.625.625 0 1 1-.884.884L4.375 8.393v6.057c0 .649.526 1.175 1.175 1.175h7.975a.625.625 0 0 1 0 1.25H5.55a2.425 2.425 0 0 1-2.425-2.425V8.393L1.717 9.801a.625.625 0 1 1-.884-.884z" />
    </svg>
  ),
  
  /**
   * Filter icon
   */
  Filter: () => <ListFilter className="h-4 w-4 text-muted-foreground" />,
  
  /**
   * Sort icon
   */
  Sort: () => <ArrowUpDown className="h-4 w-4 text-muted-foreground" />,
  
  /**
   * Zap/Lightning icon (for conditional color, automations)
   */
  Zap: () => <Zap className="h-4 w-4 text-muted-foreground" />,
  
  /**
   * Ellipsis icon (for more settings)
   */
  Ellipsis: () => <Ellipsis className="h-4 w-4 text-muted-foreground" />,
  
  /**
   * Database icon
   */
  Database: () => <Database className="h-4 w-4 text-muted-foreground" />,
  
  /**
   * Edit Properties icon
   */
  EditProperties: () => <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />,
  
  /**
   * Copy/Duplicate icon
   */
  Copy: () => <Copy className="h-4 w-4 text-muted-foreground" />,
  
  /**
   * Database/Data source icon (default SVG)
   */
  DatabaseDefault: () => (
    <svg viewBox="0 0 20 20" className="w-5 h-5 block flex-shrink-0 fill-gray-500 dark:fill-gray-400">
      <path d="M10 2.375c-1.778 0-3.415.256-4.63.69-.604.216-1.138.488-1.532.82-.391.331-.713.784-.713 1.347q0 .157.032.304h-.032v9.232c0 .563.322 1.016.713 1.346.394.333.928.605 1.532.82 1.215.435 2.852.691 4.63.691s3.415-.256 4.63-.69c.604-.216 1.138-.488 1.532-.82.391-.331.713-.784.713-1.347V5.536h-.032q.031-.147.032-.304c0-.563-.322-1.016-.713-1.346-.394-.333-.928-.605-1.532-.82-1.215-.435-2.852-.691-4.63-.691M4.375 5.232c0-.053.028-.188.27-.391.238-.201.62-.41 1.146-.599 1.047-.374 2.535-.617 4.209-.617s3.162.243 4.21.617c.526.188.907.398 1.146.599.24.203.269.338.269.391s-.028.188-.27.391c-.238.202-.62.41-1.146.599-1.047.374-2.535.617-4.209.617s-3.162-.243-4.21-.617c-.526-.188-.907-.397-1.146-.599-.24-.203-.269-.338-.269-.39m11.25 1.718V10c0 .053-.028.188-.27.391-.238.201-.62.41-1.146.599-1.047.374-2.535.617-4.209.617s-3.162-.243-4.21-.617c-.526-.188-.907-.398-1.146-.599-.24-.203-.269-.338-.269-.391V6.95c.297.17.633.32.995.45 1.215.433 2.852.69 4.63.69s3.415-.257 4.63-.69c.362-.13.698-.28.995-.45m-11.25 7.818v-3.05c.297.17.633.32.995.449 1.215.434 2.852.69 4.63.69s3.415-.256 4.63-.69c.362-.13.698-.279.995-.45v3.05c0 .054-.028.189-.27.392-.238.201-.62.41-1.146.599-1.047.374-2.535.617-4.209.617s-3.162-.243-4.21-.617c-.526-.188-.907-.398-1.146-.599-.24-.203-.269-.338-.269-.391"></path>
    </svg>
  ),
  
  /**
   * Hide/EyeOff icon
   */
  Hide: () => <EyeOff className="h-4 w-4 text-muted-foreground" />,
  
  /**
   * Group/Layers icon
   */
  Group: () => <Layers className="h-4 w-4 text-muted-foreground" />,
  
  /**
   * Wrap text icon
   */
  WrapText: () => <WrapText className="h-4 w-4 text-muted-foreground" />,
  
  /**
   * Insert left / Chevron left icon
   */
  InsertLeft: () => <ChevronLeft className="h-4 w-4 text-muted-foreground" />,
  
  /**
   * Insert right / Chevron right icon
   */
  InsertRight: () => <ChevronRight className="h-4 w-4 text-muted-foreground" />,
  
  /**
   * Form view icon
   */
  Form: () => <FileText className="h-4 w-4 text-muted-foreground" />,
} as const;

