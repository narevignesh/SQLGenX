import React, { useMemo, useState, useEffect } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  MarkerType,
  Handle,
  Position,
  NodeProps,
  Edge,
  useReactFlow,
  ReactFlowProvider
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { 
  Key, 
  ArrowRight, 
  Table as TableIcon, 
  Database, 
  Maximize2, 
  Minimize2, 
  Search, 
  Compass
} from 'lucide-react';
import { TableInfo, RelationshipInfo } from '../types';

interface SchemaGraphProps {
  tables: TableInfo[];
  relationships: RelationshipInfo[];
  onSelectTable?: (table: TableInfo) => void;
  selectedTableName?: string | null;
  searchFilter?: string;
}

// ---------------------------------------------------------------------------
// 1. Custom High-End Table Node Component
// ---------------------------------------------------------------------------
const TableNodeComponent: React.FC<NodeProps> = ({ data, selected }) => {
  const table = (data as any).table as TableInfo;
  const isHighlighted = (data as any).isHighlighted;
  const isDimmed = (data as any).isDimmed;
  const searchTerm = ((data as any).searchTerm || '').toLowerCase();
  const onSelect = (data as any).onSelect;

  const matchesSearch = useMemo(() => {
    if (!searchTerm) return false;
    return (
      table.name.toLowerCase().includes(searchTerm) ||
      table.columns.some((c) => c.name.toLowerCase().includes(searchTerm))
    );
  }, [table, searchTerm]);

  return (
    <div
      onClick={() => onSelect && onSelect(table)}
      className={`rounded-2xl border transition-all duration-300 min-w-[260px] max-w-[300px] overflow-hidden backdrop-blur-xl group cursor-pointer ${
        selected || isHighlighted
          ? 'bg-slate-900/95 border-cyan-400 ring-4 ring-cyan-500/30 shadow-[0_0_35px_rgba(6,182,212,0.35)] scale-[1.03] z-50'
          : matchesSearch
          ? 'bg-slate-900/95 border-amber-400 ring-2 ring-amber-400/40 shadow-[0_0_25px_rgba(245,158,11,0.25)] scale-[1.02] z-40'
          : isDimmed
          ? 'bg-slate-950/70 border-slate-800/60 opacity-40 hover:opacity-100 hover:scale-[1.01]'
          : 'bg-slate-900/90 border-slate-800/90 hover:border-cyan-500/50 hover:shadow-2xl hover:shadow-cyan-500/10'
      }`}
    >
      {/* React Flow Connection Handles with Explicit IDs */}
      <Handle
        type="target"
        position={Position.Left}
        id="target-left"
        className="!bg-cyan-400 !w-3 !h-3 !border-2 !border-slate-900 !-left-1.5 transition-transform hover:scale-125 shadow-[0_0_8px_#38bdf8]"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="source-right"
        className="!bg-indigo-400 !w-3 !h-3 !border-2 !border-slate-900 !-right-1.5 transition-transform hover:scale-125 shadow-[0_0_8px_#818cf8]"
      />
      <Handle
        type="target"
        position={Position.Top}
        id="target-top"
        className="!bg-cyan-400 !w-3 !h-3 !border-2 !border-slate-900 !-top-1.5 transition-transform hover:scale-125"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="source-bottom"
        className="!bg-indigo-400 !w-3 !h-3 !border-2 !border-slate-900 !-bottom-1.5 transition-transform hover:scale-125"
      />

      {/* Table Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 px-4 py-3 border-b border-slate-800 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-1.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shrink-0 group-hover:scale-110 transition-transform">
            <TableIcon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-white font-mono tracking-tight truncate flex items-center gap-1.5">
              <span>{table.name}</span>
              {(selected || isHighlighted) && (
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping shrink-0" />
              )}
            </div>
            <div className="text-[10px] text-slate-400 font-mono">
              {table.columns.length} columns
            </div>
          </div>
        </div>

        <span className="text-[10px] font-mono font-semibold text-cyan-300 bg-cyan-950/60 border border-cyan-500/30 px-2 py-0.5 rounded-full shrink-0">
          {table.row_count.toLocaleString()} rows
        </span>
      </div>

      {/* Column List */}
      <div className="p-2.5 space-y-1 max-h-56 overflow-y-auto custom-scrollbar">
        {table.columns.map((col) => {
          const isPk = col.primary_key;
          const fkMatch = table.foreign_keys?.find((fk) => fk.constrained_columns?.includes(col.name));
          const isFk = Boolean(fkMatch);
          const colMatchesSearch = searchTerm && col.name.toLowerCase().includes(searchTerm);

          return (
            <div
              key={col.name}
              className={`flex items-center justify-between px-2.5 py-1.5 rounded-xl text-[11px] font-mono transition-colors ${
                colMatchesSearch
                  ? 'bg-amber-950/50 text-amber-200 border border-amber-500/40'
                  : isPk
                  ? 'bg-amber-950/25 text-amber-300 border border-amber-500/20'
                  : isFk
                  ? 'bg-purple-950/25 text-purple-300 border border-purple-500/20'
                  : 'text-slate-300 bg-slate-950/40 hover:bg-slate-800/40 border border-transparent'
              }`}
            >
              {/* Column Name & Key Indicator */}
              <div className="flex items-center gap-2 min-w-0 truncate">
                {isPk ? (
                  <span className="flex items-center gap-1 shrink-0 px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 text-[9px] font-bold">
                    <Key className="w-2.5 h-2.5" /> PK
                  </span>
                ) : isFk ? (
                  <span 
                    title={`References ${fkMatch?.referred_table}.${fkMatch?.referred_columns?.join(', ')}`}
                    className="flex items-center gap-1 shrink-0 px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 text-[9px] font-bold"
                  >
                    <ArrowRight className="w-2.5 h-2.5" /> FK
                  </span>
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0" />
                )}
                <span className="truncate font-medium">{col.name}</span>
              </div>

              {/* Data Type Pill */}
              <span className="text-[9px] text-slate-400 font-mono uppercase shrink-0 pl-2 opacity-80">
                {col.type}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const nodeTypes = {
  tableNode: TableNodeComponent,
};

// ---------------------------------------------------------------------------
// 2. Main Graph Component with Flow & Controls
// ---------------------------------------------------------------------------
const SchemaGraphContent: React.FC<SchemaGraphProps> = ({
  tables,
  relationships,
  onSelectTable,
  selectedTableName,
  searchFilter = ''
}) => {
  const [layoutMode, setLayoutMode] = useState<'hierarchical' | 'grid'>('hierarchical');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hoveredTable, setHoveredTable] = useState<string | null>(null);
  const [localSearch, setLocalSearch] = useState(searchFilter);

  const { fitView } = useReactFlow();

  // Active highlighted table
  const activeHighlight = selectedTableName || hoveredTable;

  // Determine connected tables for highlight focus
  const connectedTableNames = useMemo(() => {
    if (!activeHighlight) return new Set<string>();
    const set = new Set<string>([activeHighlight]);
    relationships.forEach((rel) => {
      if (rel.from_table === activeHighlight) set.add(rel.to_table);
      if (rel.to_table === activeHighlight) set.add(rel.from_table);
    });
    return set;
  }, [activeHighlight, relationships]);

  // Compute Layout Positions with generous non-overlapping spacing
  const layoutPositions = useMemo(() => {
    const posMap: Record<string, { x: number; y: number }> = {};
    if (!tables.length) return posMap;

    if (layoutMode === 'hierarchical') {
      // Predefined optimal positions for known demo eCommerce schema
      const isEcommerce = tables.some(t => t.name === 'categories') && tables.some(t => t.name === 'orders');
      if (isEcommerce) {
        posMap['categories'] = { x: 50, y: 50 };
        posMap['products'] = { x: 480, y: 50 };
        posMap['order_items'] = { x: 920, y: 50 };
        posMap['customers'] = { x: 50, y: 400 };
        posMap['orders'] = { x: 480, y: 400 };
        posMap['payments'] = { x: 920, y: 400 };
        
        // Add any remaining custom tables
        tables.forEach((t, i) => {
          if (!posMap[t.name]) {
            posMap[t.name] = { x: 50 + (i % 3) * 450, y: 750 + Math.floor(i / 3) * 360 };
          }
        });
        return posMap;
      }

      // Generic Topological Graph Layout for custom databases
      const inboundCount: Record<string, number> = {};
      const outboundCount: Record<string, number> = {};
      tables.forEach((t) => {
        inboundCount[t.name] = 0;
        outboundCount[t.name] = 0;
      });

      relationships.forEach((rel) => {
        outboundCount[rel.from_table] = (outboundCount[rel.from_table] || 0) + 1;
        inboundCount[rel.to_table] = (inboundCount[rel.to_table] || 0) + 1;
      });

      const columns: TableInfo[][] = [[], [], []];
      tables.forEach((t) => {
        const tier = outboundCount[t.name] === 0 ? 0 : inboundCount[t.name] === 0 ? 2 : 1;
        const colIdx = Math.min(2, Math.max(0, tier));
        columns[colIdx].push(t);
      });

      const COL_WIDTH = 450;
      const ROW_HEIGHT = 360;
      const START_X = 60;
      const START_Y = 60;

      columns.forEach((colTables, colIdx) => {
        colTables.forEach((table, rowIdx) => {
          posMap[table.name] = {
            x: START_X + colIdx * COL_WIDTH,
            y: START_Y + rowIdx * ROW_HEIGHT,
          };
        });
      });
    } else {
      // Grid Mode
      const COLS = Math.ceil(Math.sqrt(tables.length)) || 2;
      const COL_WIDTH = 420;
      const ROW_HEIGHT = 350;
      tables.forEach((table, idx) => {
        const c = idx % COLS;
        const r = Math.floor(idx / COLS);
        posMap[table.name] = {
          x: 60 + c * COL_WIDTH,
          y: 60 + r * ROW_HEIGHT,
        };
      });
    }

    return posMap;
  }, [tables, relationships, layoutMode]);

  // Generate React Flow Nodes
  const initialNodes = useMemo(() => {
    return tables.map((t) => {
      const pos = layoutPositions[t.name] || { x: 60, y: 60 };
      const isHighlighted = activeHighlight === t.name;
      const isConnected = connectedTableNames.has(t.name);
      const isDimmed = activeHighlight ? !isConnected : false;

      return {
        id: t.name,
        type: 'tableNode',
        position: pos,
        data: {
          table: t,
          isHighlighted,
          isDimmed,
          searchTerm: localSearch,
          onSelect: onSelectTable,
        },
      };
    });
  }, [tables, layoutPositions, activeHighlight, connectedTableNames, localSearch, onSelectTable]);

  // Generate React Flow Edges with clean handles
  const initialEdges = useMemo((): Edge[] => {
    return relationships.map((rel, idx) => {
      const isConnected =
        activeHighlight === rel.from_table || activeHighlight === rel.to_table;
      const isDimmed = activeHighlight ? !isConnected : false;

      const sourcePos = layoutPositions[rel.from_table] || { x: 0, y: 0 };
      const targetPos = layoutPositions[rel.to_table] || { x: 0, y: 0 };

      // Determine cleanest handle pairing
      let sourceHandle = 'source-right';
      let targetHandle = 'target-left';

      if (sourcePos.x > targetPos.x) {
        sourceHandle = 'source-right';
        targetHandle = 'target-top';
      } else if (Math.abs(sourcePos.x - targetPos.x) < 50) {
        sourceHandle = sourcePos.y < targetPos.y ? 'source-bottom' : 'source-bottom';
        targetHandle = sourcePos.y < targetPos.y ? 'target-top' : 'target-top';
      }

      return {
        id: `e-${rel.from_table}-${rel.to_table}-${idx}`,
        source: rel.from_table,
        target: rel.to_table,
        sourceHandle,
        targetHandle,
        type: 'smoothstep',
        animated: isConnected || !activeHighlight,
        label: `${rel.from_column} ➔ ${rel.to_column}`,
        style: {
          stroke: isConnected ? '#38bdf8' : isDimmed ? '#334155' : '#818cf8',
          strokeWidth: isConnected ? 3 : isDimmed ? 1 : 2,
          opacity: isDimmed ? 0.3 : 1,
          filter: isConnected ? 'drop-shadow(0 0 6px rgba(56,189,248,0.6))' : undefined,
        },
        labelStyle: {
          fill: isConnected ? '#38bdf8' : isDimmed ? '#475569' : '#cbd5e1',
          fontSize: 10,
          fontFamily: 'monospace',
          fontWeight: 600,
        },
        labelBgStyle: {
          fill: isConnected ? '#082f49' : '#0f172a',
          fillOpacity: 0.95,
          rx: 6,
          ry: 6,
          stroke: isConnected ? '#38bdf8' : '#334155',
          strokeWidth: 1,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: isConnected ? '#38bdf8' : isDimmed ? '#334155' : '#818cf8',
          width: 16,
          height: 16,
        },
      };
    });
  }, [relationships, layoutPositions, activeHighlight]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Sync state on updates
  useEffect(() => {
    setNodes(initialNodes);
  }, [initialNodes, setNodes]);

  useEffect(() => {
    setEdges(initialEdges);
  }, [initialEdges, setEdges]);

  // Auto-fit on layout or tables change
  useEffect(() => {
    const timer = setTimeout(() => {
      fitView({ padding: 0.25, duration: 400 });
    }, 100);
    return () => clearTimeout(timer);
  }, [layoutMode, tables.length, fitView]);

  const handleNodeClick = (_: any, node: any) => {
    const matched = tables.find((t) => t.name === node.id);
    if (matched && onSelectTable) {
      onSelectTable(matched);
    }
  };

  const handleNodeMouseEnter = (_: any, node: any) => {
    setHoveredTable(node.id);
  };

  const handleNodeMouseLeave = () => {
    setHoveredTable(null);
  };

  return (
    <div
      className={`w-full rounded-3xl overflow-hidden glass-panel border border-slate-800 shadow-2xl relative transition-all duration-300 ${
        isFullscreen ? 'fixed inset-4 z-50 h-[calc(100vh-32px)] bg-slate-950/95' : 'h-[680px]'
      }`}
    >
      {/* Top Interactive Controls Toolbar */}
      <div className="absolute top-4 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
        
        {/* Graph Legend & Status */}
        <div className="pointer-events-auto p-2.5 px-4 rounded-2xl bg-slate-950/90 border border-slate-800/80 shadow-2xl backdrop-blur-xl flex items-center gap-4 text-xs">
          <div className="flex items-center gap-2 font-bold text-white">
            <div className="p-1 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <Database className="w-4 h-4" />
            </div>
            <span>Entity Relationship Graph</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
              {tables.length} tables · {relationships.length} links
            </span>
          </div>

          <div className="h-4 w-px bg-slate-800 hidden md:block" />

          <div className="hidden md:flex items-center gap-3 text-[10px] font-mono text-slate-400">
            <div className="flex items-center gap-1.5">
              <span className="p-0.5 rounded bg-amber-500/20 text-amber-400">
                <Key className="w-2.5 h-2.5" />
              </span>
              <span>PK Primary</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="p-0.5 rounded bg-purple-500/20 text-purple-400">
                <ArrowRight className="w-2.5 h-2.5" />
              </span>
              <span>FK Foreign</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span>Active Relation</span>
            </div>
          </div>
        </div>

        {/* Action Controls & Layout Pickers */}
        <div className="pointer-events-auto flex items-center gap-2 bg-slate-950/90 border border-slate-800/80 p-1.5 rounded-2xl shadow-2xl backdrop-blur-xl">
          
          {/* Quick Search */}
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Highlight table or column..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 w-36 md:w-52 transition-all font-mono"
            />
          </div>

          {/* Layout Mode Selector */}
          <div className="flex items-center bg-slate-900 p-0.5 rounded-xl border border-slate-800 text-[11px] font-medium">
            <button
              onClick={() => setLayoutMode('hierarchical')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                layoutMode === 'hierarchical'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Hierarchical
            </button>
            <button
              onClick={() => setLayoutMode('grid')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                layoutMode === 'grid'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Grid
            </button>
          </div>

          {/* Zoom & Fit Tools */}
          <button
            onClick={() => fitView({ padding: 0.25, duration: 400 })}
            title="Fit view to screen"
            className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors"
          >
            <Compass className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen ER Diagram'}
            className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* React Flow Viewport */}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        onNodeMouseEnter={handleNodeMouseEnter}
        onNodeMouseLeave={handleNodeMouseLeave}
        fitView
        fitViewOptions={{ padding: 0.25 }}
        minZoom={0.25}
        maxZoom={2.0}
        defaultEdgeOptions={{
          type: 'smoothstep',
        }}
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1.2} color="#334155" />
        <Controls 
          showInteractive={false}
          className="!bg-slate-900 !border-slate-800 !fill-slate-300 !bottom-6 !left-6 !rounded-2xl !shadow-2xl overflow-hidden" 
        />
        <MiniMap
          nodeColor={(node) => (node.id === activeHighlight ? '#38bdf8' : '#475569')}
          maskColor="rgba(15, 23, 42, 0.85)"
          className="!bg-slate-950 !border !border-slate-800 !rounded-2xl !bottom-6 !right-6 shadow-2xl"
          nodeStrokeWidth={3}
        />
      </ReactFlow>
    </div>
  );
};

export const SchemaGraph: React.FC<SchemaGraphProps> = (props) => {
  return (
    <ReactFlowProvider>
      <SchemaGraphContent {...props} />
    </ReactFlowProvider>
  );
};
