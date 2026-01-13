'use client';

import { motion } from 'framer-motion';
import type { DiagramData, DiagramNode, DiagramEdge } from '@/data/dev-curriculum';

interface DiagramBlockProps {
  title?: string;
  data: DiagramData;
}

export function DiagramBlock({ title, data }: DiagramBlockProps) {
  return (
    <div className="my-6">
      {title && (
        <h4 className="text-sm font-medium text-[#888] mb-3 flex items-center gap-2">
          <span className="w-5 h-5 rounded bg-[#ea4e33]/20 flex items-center justify-center text-xs">
            📊
          </span>
          {title}
        </h4>
      )}
      <div className="bg-[#0d0d0d] border border-[#222] rounded-xl p-6 overflow-hidden">
        {data.type === 'flow' && <FlowDiagram nodes={data.nodes} edges={data.edges} />}
        {data.type === 'architecture' && (
          <ArchitectureDiagram nodes={data.nodes} edges={data.edges} />
        )}
        {data.type === 'sequence' && <SequenceDiagram nodes={data.nodes} edges={data.edges} />}
        {data.type === 'comparison' && <ComparisonDiagram nodes={data.nodes} />}
      </div>
    </div>
  );
}

// Flow Diagram - step by step process
function FlowDiagram({ nodes, edges }: { nodes: DiagramNode[]; edges?: DiagramEdge[] }) {
  const nodeColors: Record<string, string> = {
    start: '#4ade80',
    end: '#ef4444',
    process: '#ea4e33',
    decision: '#f59e0b',
    data: '#8b5cf6',
  };

  return (
    <div className="py-4">
      <div className="flex flex-wrap items-center justify-center gap-4">
        {nodes.map((node, index) => (
          <motion.div
            key={node.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-center gap-3"
          >
            {/* Node */}
            <div
              className={`relative px-4 py-3 rounded-xl border text-sm font-medium text-center min-w-[100px] ${
                node.type === 'decision' ? 'rotate-0' : ''
              }`}
              style={{
                backgroundColor: `${nodeColors[node.type || 'process']}15`,
                borderColor: `${nodeColors[node.type || 'process']}40`,
                color: nodeColors[node.type || 'process'],
              }}
            >
              {node.type === 'start' && <span className="mr-1">▶</span>}
              {node.type === 'end' && <span className="mr-1">◼</span>}
              {node.type === 'decision' && <span className="mr-1">◇</span>}
              {node.type === 'data' && <span className="mr-1">⬡</span>}
              {node.label}
            </div>

            {/* Arrow to next node */}
            {index < nodes.length - 1 && (
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: index * 0.1 + 0.05 }}
                className="flex items-center"
              >
                <div className="w-8 h-0.5 bg-gradient-to-r from-[#333] to-[#555]" />
                <div className="w-0 h-0 border-t-[4px] border-b-[4px] border-l-[6px] border-transparent border-l-[#555]" />
              </motion.div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Edge labels if present */}
      {edges && edges.length > 0 && (
        <div className="mt-4 flex justify-center gap-4 text-xs text-[#666]">
          {edges.map(
            (edge, i) =>
              edge.label && (
                <span key={i} className="px-2 py-1 bg-[#111] rounded">
                  {edge.label}
                </span>
              )
          )}
        </div>
      )}
    </div>
  );
}

// Architecture Diagram - system components
function ArchitectureDiagram({ nodes, edges }: { nodes: DiagramNode[]; edges?: DiagramEdge[] }) {
  // Group nodes by type for layered display
  const groupedNodes = nodes.reduce(
    (acc, node) => {
      const type = node.type || 'process';
      if (!acc[type]) acc[type] = [];
      acc[type].push(node);
      return acc;
    },
    {} as Record<string, DiagramNode[]>
  );

  const layers = Object.entries(groupedNodes);

  return (
    <div className="py-4 space-y-4">
      {layers.map(([type, layerNodes], layerIndex) => (
        <motion.div
          key={type}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: layerIndex * 0.15 }}
          className="flex justify-center gap-3"
        >
          {layerNodes.map((node, nodeIndex) => (
            <motion.div
              key={node.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: layerIndex * 0.15 + nodeIndex * 0.05 }}
              className="flex flex-col items-center"
            >
              <div
                className="w-24 h-20 rounded-xl border flex items-center justify-center text-center px-2"
                style={{
                  backgroundColor: getNodeColor(type, 0.1),
                  borderColor: getNodeColor(type, 0.3),
                }}
              >
                <span className="text-xs font-medium" style={{ color: getNodeColor(type, 1) }}>
                  {node.label}
                </span>
              </div>
            </motion.div>
          ))}
        </motion.div>
      ))}

      {/* Connections */}
      {edges && edges.length > 0 && (
        <div className="text-center text-xs text-[#666] pt-2">
          <span className="inline-block px-3 py-1 bg-[#111] rounded">
            {edges.length} connections
          </span>
        </div>
      )}
    </div>
  );
}

// Sequence Diagram - ordered steps with timeline
function SequenceDiagram({ nodes, edges }: { nodes: DiagramNode[]; edges?: DiagramEdge[] }) {
  return (
    <div className="py-4">
      {/* Timeline */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-[30px] top-4 bottom-4 w-0.5 bg-gradient-to-b from-[#ea4e33] via-[#f59e0b] to-[#4ade80]" />

        {/* Steps */}
        <div className="space-y-4 relative">
          {nodes.map((node, index) => (
            <motion.div
              key={node.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-start gap-4 pl-2"
            >
              {/* Step number */}
              <div className="w-14 h-14 rounded-xl bg-[#111] border border-[#222] flex items-center justify-center shrink-0 z-10">
                <span className="text-lg font-bold text-[#ea4e33]">{index + 1}</span>
              </div>

              {/* Content */}
              <div className="flex-1 bg-[#111] border border-[#222] rounded-xl p-4">
                <div className="font-medium text-white mb-1">{node.label}</div>
                {edges && edges[index]?.label && (
                  <div className="text-xs text-[#666]">{edges[index].label}</div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Comparison Diagram - side by side comparison
function ComparisonDiagram({ nodes }: { nodes: DiagramNode[] }) {
  // Split nodes into two columns for comparison
  const midpoint = Math.ceil(nodes.length / 2);
  const leftNodes = nodes.slice(0, midpoint);
  const rightNodes = nodes.slice(midpoint);

  return (
    <div className="py-4">
      <div className="grid grid-cols-2 gap-4">
        {/* Left column */}
        <div className="space-y-3">
          {leftNodes.map((node, index) => (
            <motion.div
              key={node.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="p-3 bg-[#4ade80]/10 border border-[#4ade80]/30 rounded-xl"
            >
              <div className="flex items-center gap-2">
                <span className="text-[#4ade80]">✓</span>
                <span className="text-sm text-white">{node.label}</span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Right column */}
        <div className="space-y-3">
          {rightNodes.map((node, index) => (
            <motion.div
              key={node.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="p-3 bg-[#ef4444]/10 border border-[#ef4444]/30 rounded-xl"
            >
              <div className="flex items-center gap-2">
                <span className="text-[#ef4444]">✗</span>
                <span className="text-sm text-white">{node.label}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Helper: Get color for node type
function getNodeColor(type: string, opacity: number): string {
  const colors: Record<string, string> = {
    start: `rgba(74, 222, 128, ${opacity})`,
    end: `rgba(239, 68, 68, ${opacity})`,
    process: `rgba(234, 78, 51, ${opacity})`,
    decision: `rgba(245, 158, 11, ${opacity})`,
    data: `rgba(139, 92, 246, ${opacity})`,
  };
  return colors[type] || `rgba(234, 78, 51, ${opacity})`;
}

// ============================================
// PRESET DIAGRAMS - For quick use
// ============================================

export function BlockchainDiagram() {
  const blocks = [
    { id: 1, hash: '7x8f...a2b1', txCount: 156, slot: 245123456 },
    { id: 2, hash: '3k9m...c4d2', txCount: 203, slot: 245123457 },
    { id: 3, hash: '9p2q...e5f3', txCount: 178, slot: 245123458 },
  ];

  return (
    <div className="flex items-center justify-center gap-2 py-4">
      {blocks.map((block, index) => (
        <motion.div
          key={block.id}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.15 }}
          className="flex items-center gap-2"
        >
          <div className="relative">
            <div className="w-32 bg-gradient-to-br from-[#1a1a1a] to-[#111] border border-[#333] rounded-lg p-3">
              <div className="text-[10px] text-[#666] mb-1">Block #{block.slot}</div>
              <div className="text-xs text-[#4ade80] font-mono mb-2">{block.hash}</div>
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-[#888]">{block.txCount} txs</span>
                <span className="text-[#ea4e33]">400ms</span>
              </div>
            </div>
            <div className="absolute -top-2 -right-2 w-4 h-4 bg-[#4ade80] rounded-full flex items-center justify-center">
              <span className="text-[8px] text-black font-bold">✓</span>
            </div>
          </div>

          {index < blocks.length - 1 && (
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: index * 0.15 + 0.1 }}
              className="flex items-center"
            >
              <div className="w-6 h-0.5 bg-gradient-to-r from-[#4ade80] to-[#ea4e33]" />
              <div className="w-0 h-0 border-t-4 border-b-4 border-l-4 border-transparent border-l-[#ea4e33]" />
            </motion.div>
          )}
        </motion.div>
      ))}
    </div>
  );
}

export function TransactionFlowDiagram() {
  const steps = [
    { label: 'Wallet', icon: '👛', color: '#f59e0b' },
    { label: 'Sign', icon: '🔐', color: '#4ade80' },
    { label: 'RPC', icon: '🌐', color: '#ea4e33' },
    { label: 'Validator', icon: '⚡', color: '#8b5cf6' },
    { label: 'Confirmed', icon: '✓', color: '#4ade80' },
  ];

  return (
    <div className="py-4">
      <div className="flex items-center justify-between mb-6">
        {steps.map((step, index) => (
          <motion.div
            key={step.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex flex-col items-center"
          >
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-xl mb-2"
              style={{ backgroundColor: `${step.color}20`, border: `1px solid ${step.color}40` }}
            >
              {step.icon}
            </div>
            <span className="text-xs text-[#888]">{step.label}</span>
          </motion.div>
        ))}
      </div>

      <div className="relative h-1 bg-[#222] rounded-full mx-6 -mt-12 mb-6">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: '100%' }}
          transition={{ duration: 1.5, ease: 'easeInOut' }}
          className="absolute h-full bg-gradient-to-r from-[#f59e0b] via-[#ea4e33] to-[#4ade80] rounded-full"
        />
      </div>

      <div className="grid grid-cols-4 gap-2 text-center text-[10px] text-[#666] mt-4">
        <div>Create TX</div>
        <div>Broadcast</div>
        <div>Process</div>
        <div>Finality ~400ms</div>
      </div>
    </div>
  );
}

export function WalletKeysDiagram() {
  return (
    <div className="py-4 flex flex-col items-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative"
      >
        <div className="flex gap-4 items-stretch">
          {/* Private Key */}
          <div className="w-48 bg-gradient-to-br from-[#ef4444]/10 to-[#ef4444]/5 border border-[#ef4444]/30 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">🔐</span>
              <span className="text-sm font-medium text-[#ef4444]">Private Key</span>
            </div>
            <div className="font-mono text-[10px] text-[#888] break-all bg-black/30 rounded p-2">
              5J3mBb...{'{secret}'}
            </div>
            <div className="mt-3 text-[10px] text-[#ef4444]/70 flex items-center gap-1">
              <span>⚠️</span> Never share!
            </div>
          </div>

          <div className="flex items-center">
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="text-[#666]"
            >
              →
            </motion.div>
          </div>

          {/* Public Key */}
          <div className="w-48 bg-gradient-to-br from-[#4ade80]/10 to-[#4ade80]/5 border border-[#4ade80]/30 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">📍</span>
              <span className="text-sm font-medium text-[#4ade80]">Public Key</span>
            </div>
            <div className="font-mono text-[10px] text-[#888] break-all bg-black/30 rounded p-2">
              7xKXt...a8Rz2
            </div>
            <div className="mt-3 text-[10px] text-[#4ade80]/70 flex items-center gap-1">
              <span>✓</span> Share freely
            </div>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-4 text-center text-xs text-[#666]"
        >
          Ed25519 elliptic curve cryptography
        </motion.div>
      </motion.div>
    </div>
  );
}

export default DiagramBlock;
