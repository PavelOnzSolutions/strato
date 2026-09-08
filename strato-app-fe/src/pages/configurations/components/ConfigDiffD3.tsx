import React, {useEffect, useMemo, useRef} from 'react';
import * as d3 from 'd3';
import {Badge, Box, Flex, Text} from '@radix-ui/themes';
import {useTheme} from '../../../context/ThemeContext.tsx';
import {useTranslation} from 'react-i18next';

export type ChangeType = 'added' | 'removed' | 'changed' | 'unchanged' | 'mixed';

interface ConfigDiffD3Props {
  left: Record<string, any>;
  right: Record<string, any>;
  hideUnchanged?: boolean;
  className?: string;
}

interface TreeNode {
  name: string;
  path: string;
  change: ChangeType;
  leftValue?: any;
  rightValue?: any;
  children?: TreeNode[];
}

const CHANGE_COLORS: Record<ChangeType, string> = {
  added: '#10b981',     // green-500
  removed: '#ef4444',   // red-500
  changed: '#f59e0b',   // amber-500
  unchanged: '#94a3b8', // slate-400
  mixed: '#6366f1',     // indigo-500
};

// Flatten helper
const flatten = (obj: any, prefix = ''): Record<string, any> => {
  const out: Record<string, any> = {};
  if (obj === null || obj === undefined) return out;
  if (typeof obj !== 'object') {
    out[prefix || ''] = obj;
    return out;
  }
  if (Array.isArray(obj)) {
    obj.forEach((v, i) => {
      const p = prefix ? `${prefix}[${i}]` : `[${i}]`;
      Object.assign(out, flatten(v, p));
    });
    return out;
  }
  Object.keys(obj).forEach((k) => {
    const val = (obj as any)[k];
    const p = prefix ? `${prefix}.${k}` : k;
    if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
      Object.assign(out, flatten(val, p));
    } else {
      out[p] = val;
    }
  });
  return out;
};

function computeLeafChange(left: Record<string, any>, right: Record<string, any>, key: string): ChangeType {
  const inL = key in left;
  const inR = key in right;
  if (!inL && inR) return 'added';
  if (inL && !inR) return 'removed';
  // both present
  const lv = left[key];
  const rv = right[key];
  return JSON.stringify(lv) === JSON.stringify(rv) ? 'unchanged' : 'changed';
}

function aggregateChange(children: TreeNode[] | undefined): ChangeType {
  if (!children || children.length === 0) return 'unchanged';
  const set = new Set(children.map(c => c.change));
  if (set.size === 1) return children[0].change;
  // if multiple, prefer highlight order
  if (set.has('added') || set.has('removed') || set.has('changed')) return 'mixed';
  return 'unchanged';
}

function buildTree(allKeys: string[], leftFlat: Record<string, any>, rightFlat: Record<string, any>): TreeNode {
  const root: TreeNode = { name: 'root', path: '', change: 'unchanged', children: [] };
  const byPath: Record<string, TreeNode> = { '': root };

  const ensureNode = (segments: string[]): TreeNode => {
    const path = segments.join('.');
    if (byPath[path]) return byPath[path];
    const parentSeg = segments.slice(0, -1);
    const parent = ensureNode(parentSeg);
    const node: TreeNode = { name: segments[segments.length - 1], path, change: 'unchanged', children: [] };
    parent.children = parent.children || [];
    parent.children.push(node);
    byPath[path] = node;
    return node;
  };

  allKeys.forEach(k => {
    const segments = k.replace(/\[(\d+)\]/g, '.$1').split('.');
    const node = ensureNode(segments);
    node.change = computeLeafChange(leftFlat, rightFlat, k);
    node.leftValue = leftFlat[k];
    node.rightValue = rightFlat[k];
  });

  // Walk bottom-up to aggregate changes on inner nodes
  const paths = Object.keys(byPath).sort((a, b) => b.length - a.length);
  for (const p of paths) {
    const n = byPath[p];
    if (n.children && n.children.length > 0) n.change = aggregateChange(n.children);
  }

  return root;
}

export const ConfigDiffD3: React.FC<ConfigDiffD3Props> = ({ left, right, hideUnchanged, className }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { appearance } = useTheme();
  const { t } = useTranslation();

  const { root } = useMemo(() => {
    const lf = flatten(left || {});
    const rf = flatten(right || {});
    let all = Array.from(new Set([...Object.keys(lf), ...Object.keys(rf)]));

    if (hideUnchanged) {
      all = all.filter(k => computeLeafChange(lf, rf, k) !== 'unchanged');
    }

    const r = buildTree(all, lf, rf);

    let added = 0, removed = 0, changed = 0;
    all.forEach(k => {
      const ct = computeLeafChange(lf, rf, k);
      if (ct === 'added') added++;
      else if (ct === 'removed') removed++;
      else if (ct === 'changed') changed++;
    });

    return { root: r, counts: { added, removed, changed } };
  }, [left, right, hideUnchanged]);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;
    const svgEl = svgRef.current;
    const sel = d3.select(svgEl);
    sel.selectAll('*').remove();

    const width = containerRef.current.clientWidth || 800;
    const height = containerRef.current.clientHeight || 600;

    const svg = sel.attr('width', width).attr('height', height).append('g');

    const tree = d3.tree<TreeNode>().nodeSize([60, 220]);
    const rootH = d3.hierarchy<TreeNode>(root);
    tree(rootH);

    // Colors
    const isDark = appearance === 'dark';
    const linkColor = isDark ? '#444' : '#d4d4d8';
    const textColor = isDark ? '#e5e7eb' : '#374151';

    // Zoom/Pan
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 3])
      .on('zoom', (event) => svg.attr('transform', event.transform));
    d3.select(svgEl).call(zoom as any);

    const linkGen = d3.linkHorizontal<any, any>().x((d: any) => d.y).y((d: any) => d.x);

    const links = rootH.links();
    svg.append('g')
      .attr('fill', 'none')
      .attr('stroke', linkColor)
      .attr('stroke-width', 1.2)
      .selectAll('path')
      .data(links)
      .enter()
      .append('path')
      .attr('d', linkGen as any);

    const nodes = rootH.descendants();
    const gNode = svg.append('g').selectAll('g').data(nodes).enter().append('g')
      .attr('transform', (d: any) => `translate(${d.y},${d.x})`);

    const cardWidth = 180;
    const cardHeight = 44;

    const fo = gNode.append('foreignObject')
      .attr('width', cardWidth)
      .attr('height', cardHeight)
      .attr('x', -8)
      .attr('y', -cardHeight / 2);

    fo.append('xhtml:div')
      .style('width', `${cardWidth}px`)
      .style('height', `${cardHeight}px`)
      .style('background', isDark ? '#1f2937' : '#ffffff')
      .style('border', (d: any) => `1px solid ${CHANGE_COLORS[d.data.change as ChangeType] || CHANGE_COLORS.unchanged}`)
      .style('border-left', (d: any) => `4px solid ${CHANGE_COLORS[d.data.change as ChangeType] || CHANGE_COLORS.unchanged}`)
      .style('border-radius', '4px')
      .style('padding', '4px 8px')
      .style('box-shadow', '0 1px 2px 0 rgba(0, 0, 0, 0.05)')
      .style('display', 'flex')
      .style('flex-direction', 'column')
      .style('justify-content', 'center')
      .style('overflow', 'hidden')
      .html((d: any) => {
        const node = d.data as TreeNode;
        const name = node.name || 'root';
        const change = node.change;
        
        let valueHtml = '';
        if (change === 'added') {
          valueHtml = `<div style="font-size: 10px; color: ${CHANGE_COLORS.added}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">+ ${JSON.stringify(node.rightValue)}</div>`;
        } else if (change === 'removed') {
          valueHtml = `<div style="font-size: 10px; color: ${CHANGE_COLORS.removed}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">- ${JSON.stringify(node.leftValue)}</div>`;
        } else if (change === 'changed') {
          valueHtml = `
            <div style="font-size: 9px; color: ${textColor}; opacity: 0.6; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-decoration: line-through;">${JSON.stringify(node.leftValue)}</div>
            <div style="font-size: 10px; color: ${CHANGE_COLORS.changed}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${JSON.stringify(node.rightValue)}</div>
          `;
        } else if (node.children && node.children.length > 0) {
          valueHtml = `<div style="font-size: 9px; color: ${textColor}; opacity: 0.5;">${node.children.length} items</div>`;
        } else {
          valueHtml = `<div style="font-size: 10px; color: ${textColor}; opacity: 0.8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${JSON.stringify(node.leftValue)}</div>`;
        }

        return `
          <div style="font-weight: bold; font-size: 11px; color: ${textColor}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${name}">${name}</div>
          ${valueHtml}
        `;
      });

    // Center initial view
    const bbox = (svgEl as any).getBBox?.();
    if (bbox) {
      const tx = Math.max(16, (width - bbox.width) / 4);
      const ty = Math.max(16, (height - bbox.height) / 2);
      const initial = d3.zoomIdentity.translate(tx, ty).scale(0.9);
      d3.select(svgEl).call(zoom.transform as any, initial);
      svg.attr('transform', initial.toString());
    }
  }, [root, appearance]);

  return (
    <Box ref={containerRef} className={className} style={{ width: '100%', height: '100%', position: 'relative', minHeight: 360 }}>
      <Flex gap="2" p="2" style={{ position: 'absolute', top: 4, right: 4, zIndex: 5, background: 'var(--gray-2)', border: '1px solid var(--gray-6)', borderRadius: 'var(--radius-2)' }}>
        <Badge color="green">{t('lbl_added', 'Added')}</Badge>
        <Badge color="red">{t('lbl_removed', 'Removed')}</Badge>
        <Badge color="amber">{t('lbl_changed', 'Changed')}</Badge>
        <Badge color="indigo">{t('lbl_mixed', 'Mixed')}</Badge>
        <Text size="1" color="gray" ml="2">{t('msg_graph_interaction', 'Click and drag to pan. Scroll to zoom.')}</Text>
      </Flex>
      <svg ref={svgRef} style={{ width: '100%', height: '100%' }} />
    </Box>
  );
};

export default ConfigDiffD3;
