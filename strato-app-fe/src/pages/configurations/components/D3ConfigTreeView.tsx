import React, {useEffect, useRef, useState} from 'react';
import * as d3 from 'd3';
import {Badge, Box, Button, Flex} from '@radix-ui/themes';
import {Columns, Maximize2, Rows, ZoomIn, ZoomOut} from 'lucide-react';
import {useTheme} from '../../../context/ThemeContext';
import * as ToggleGroup from '@radix-ui/react-toggle-group';
import {useTranslation} from 'react-i18next';

interface D3ConfigTreeViewProps {
  data: any;
  onNodeSelect?: (path: string) => void;
  selectedNodePath?: string;
}

type TreeNode = d3.HierarchyPointNode<ConfigNode> & {
  _children?: TreeNode[];
  children?: TreeNode[];
  x0?: number;
  y0?: number;
  id?: number;
};

interface ConfigNode {
  name: string;
  value?: any;
  type: string;
  children?: ConfigNode[];
  count?: number;
  path?: string;
}

export const D3ConfigTreeView: React.FC<D3ConfigTreeViewProps> = ({ data, onNodeSelect, selectedNodePath }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions] = useState({ width: 750, height: 600 });
  const { appearance } = useTheme();
  const { t } = useTranslation();
  const [orientation, setOrientation] = useState<'horizontal' | 'vertical'>('vertical');

  // Convert JSON data to a hierarchical structure with path tracking
  const convertToHierarchy = (obj: any, name: string = 'root', parentPath: string = ''): ConfigNode => {
    const currentPath = parentPath ? `${parentPath}.${name}` : name;
    if (obj === null || obj === undefined) {
      return { name, value: String(obj), type: 'null' };
    }

    const type = Array.isArray(obj) ? 'array' : typeof obj;

    if (type === 'object' && !Array.isArray(obj)) {
      const children = Object.entries(obj).map(([key, value]) =>
        convertToHierarchy(value, key, currentPath)
      );
      return {
        name,
        type: 'object',
        children,
        count: children.length,
        path: currentPath,
      };
    }

    if (type === 'array') {
      const children = obj.map((item: any, idx: number) =>
        convertToHierarchy(item, `[${idx}]`, currentPath)
      );
      return {
        name,
        type: 'array',
        children,
        count: obj.length,
        path: currentPath,
      };
    }

    // Primitive types
    return {
      name,
      value: String(obj),
      type,
      path: currentPath,
    };
  };

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || !data) return;

    // Clear previous content
    d3.select(svgRef.current).selectAll('*').remove();

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight || 600;

    // Theme colors
    const isDark = appearance === 'dark';
    const linkColor = isDark ? '#444' : '#cbd5e1';
    const textColor = isDark ? '#eee' : '#1e293b';
    const strokeColor = isDark ? '#000' : '#fff';
    const bgColor = isDark ? '#1a1a1a' : '#f8fafc';

    // Create SVG
    const svg = d3
      .select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .style('background-color', bgColor);

    const g = svg.append('g');

    // Add zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 3])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);

    // Create tree layout based on orientation
    const isHorizontal = orientation === 'horizontal';
    const treeLayout = d3.tree<ConfigNode>().nodeSize(isHorizontal ? [40, 200] : [200, 80]);

    // Convert data to hierarchy
    const hierarchyData = convertToHierarchy(data, 'Configuration');
    const root = d3.hierarchy(hierarchyData);

    // Collapse all nodes initially except root
    root.descendants().forEach((d: any, i) => {
      if (i > 0 && d.children) {
        d._children = d.children;
        d.children = null;
      }
    });

    let i = 0;
    const duration = 750;

    // Update function
    function update(source: TreeNode) {
      // Compute the new tree layout
      treeLayout(root as any);
      const nodes = root.descendants() as TreeNode[];
      const links = root.links();

      // Update nodes
      const node = g.selectAll<SVGGElement, TreeNode>('g.node').data(nodes, (d: any) => d.id || (d.id = ++i));

      // Enter new nodes
      const nodeEnter = node
        .enter()
        .append('g')
        .attr('class', 'node')
        .attr('transform', (_d: any) => {
          const x = source.x0 !== undefined ? source.x0 : (isHorizontal ? 0 : width / 2);
          const y = source.y0 !== undefined ? source.y0 : (isHorizontal ? height / 2 : 0);
          return isHorizontal ? `translate(${y},${x})` : `translate(${x},${y})`;
        })
        .style('cursor', 'pointer')
        .on('click', (_event, d: any) => {
          // Toggle expand/collapse
          if (d.children) {
            d._children = d.children;
            d.children = null;
          } else if (d._children) {
            d.children = d._children;
            d._children = null;
          }
          update(d);
          
          // Notify parent of selection
          if (onNodeSelect && d.data.path) {
            onNodeSelect(d.data.path);
          }
        });

      // Add circles for nodes
      nodeEnter
        .append('circle')
        .attr('r', 6)
        .style('fill', (d: any) => {
          if (d._children) return '#3b82f6'; // Has collapsed children - blue
          if (d.children) return '#10b981'; // Has expanded children - green
          return '#6366f1'; // Leaf node - indigo
        })
        .style('stroke', strokeColor)
        .style('stroke-width', '2px');

      // Add labels
      const textX = (d: any) => {
        if (isHorizontal) return d.children || d._children ? -12 : 12;
        return 0;
      };
      const textY = (d: any) => {
        if (isHorizontal) return '.35em';
        return d.children || d._children ? '-1.5em' : '1.5em';
      };
      const textAnchor = (d: any) => {
        if (isHorizontal) return d.children || d._children ? 'end' : 'start';
        return 'middle';
      };

      nodeEnter
        .append('text')
        .attr('dy', textY)
        .attr('x', textX)
        .attr('text-anchor', textAnchor)
        .style('font-size', '12px')
        .style('font-family', 'monospace')
        .style('font-weight', 'bold')
        .style('fill', textColor)
        .text((d: any) => {
          const node = d.data;
          if (node.type === 'object') {
            return `${node.name} {${node.count || 0}}`;
          }
          if (node.type === 'array') {
            return `${node.name} [${node.count || 0}]`;
          }
          if (node.value !== undefined) {
            const truncatedValue = node.value.length > 30 ? node.value.substring(0, 30) + '...' : node.value;
            return `${node.name}: ${truncatedValue}`;
          }
          return node.name;
        })
        .clone(true).lower()
        .attr('stroke', strokeColor)
        .attr('stroke-width', 3);

      // Add type badges
      nodeEnter
        .append('text')
        .attr('dy', (d: any) => {
          if (isHorizontal) return '2em';
          return d.children || d._children ? '-2.6em' : '2.6em';
        })
        .attr('x', (d: any) => {
          if (isHorizontal) {
            // In horizontal mode, place type badge to the right of the node name
            return d.children || d._children ? -12 : 12;
          }
          return 0;
        })
        .attr('text-anchor', (d: any) => {
          if (isHorizontal) return d.children || d._children ? 'end' : 'start';
          return 'middle';
        })
        .style('font-size', '9px')
        .style('font-family', 'sans-serif')
        .style('fill', (d: any) => {
          const typeColors: Record<string, string> = {
            object: '#ef4444',
            array: '#f59e0b',
            string: '#10b981',
            number: '#3b82f6',
            boolean: '#ec4899',
            null: '#6b7280',
          };
          return typeColors[d.data.type] || '#6b7280';
        })
        .text((d: any) => d.data.type);

      // Transition nodes to their new position
      const nodeUpdate = nodeEnter.merge(node as any);

      nodeUpdate
        .transition()
        .duration(duration)
        .attr('transform', (d: any) => isHorizontal ? `translate(${d.y},${d.x})` : `translate(${d.x},${d.y})`);

      nodeUpdate
        .select('circle')
        .style('fill', (d: any) => {
          // Highlight selected node
          if (selectedNodePath && d.data.path === selectedNodePath) {
            return '#f59e0b'; // Orange for selected
          }
          if (d._children) return '#3b82f6';
          if (d.children) return '#10b981';
          return '#6366f1';
        })
        .attr('r', (d: any) => {
          // Make selected node larger
          return selectedNodePath && d.data.path === selectedNodePath ? 8 : 6;
        });

      // Remove exiting nodes
      const nodeExit = node
        .exit()
        .transition()
        .duration(duration)
        .attr('transform', (_d: any) => isHorizontal ? `translate(${source.y},${source.x})` : `translate(${source.x},${source.y})`)
        .remove();

      nodeExit.select('circle').attr('r', 0);
      nodeExit.select('text').style('fill-opacity', 0);

      // Update links
      const link = g.selectAll<SVGPathElement, any>('path.link').data(links, (d: any) => d.target.id);

      // Link generator
      const linkGenerator = isHorizontal 
        ? d3.linkHorizontal<any, any>().x((d: any) => d.y).y((d: any) => d.x)
        : d3.linkVertical<any, any>().x((d: any) => d.x).y((d: any) => d.y);

      // Enter new links
      const linkEnter = link
        .enter()
        .insert('path', 'g')
        .attr('class', 'link')
        .attr('d', () => {
          const o = { x: source.x0 || 0, y: source.y0 || 0 };
          return linkGenerator({ source: o, target: o } as any);
        })
        .style('fill', 'none')
        .style('stroke', linkColor)
        .style('stroke-width', '2px');

      // Transition links to their new position
      linkEnter
        .merge(link as any)
        .transition()
        .duration(duration)
        .attr('d', linkGenerator);

      // Remove exiting links
      link
        .exit()
        .transition()
        .duration(duration)
        .attr('d', () => {
          const o = { x: source.x, y: source.y };
          return linkGenerator({ source: o, target: o } as any);
        })
        .remove();

      // Store old positions for transition
      nodes.forEach((d: any) => {
        d.x0 = d.x;
        d.y0 = d.y;
      });
    }

    // Initial render
    update(root as any);

    // Center the tree initially
    const initialTransform = isHorizontal
      ? d3.zoomIdentity.translate(width / 4, height / 2).scale(0.8)
      : d3.zoomIdentity.translate(width / 2, height / 4).scale(0.8);
    
    svg.call(zoom.transform as any, initialTransform);

    // Store zoom functions for buttons
    (svgRef.current as any).zoomIn = () => {
      svg.transition().duration(300).call(zoom.scaleBy, 1.3);
    };

    (svgRef.current as any).zoomOut = () => {
      svg.transition().duration(300).call(zoom.scaleBy, 0.7);
    };

    (svgRef.current as any).resetZoom = () => {
      svg.transition().duration(300).call(zoom.transform, initialTransform);
    };

    // Export SVG handler
    const handleExport = () => {
      if (!svgRef.current) return;
      const svgData = new XMLSerializer().serializeToString(svgRef.current);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const svgUrl = URL.createObjectURL(svgBlob);
      const downloadLink = document.createElement('a');
      downloadLink.href = svgUrl;
      downloadLink.download = 'configuration-tree.svg';
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      URL.revokeObjectURL(svgUrl);
    };

    window.addEventListener('export-svg', handleExport);

    return () => {
      window.removeEventListener('export-svg', handleExport);
    };
  }, [data, dimensions, appearance, orientation, onNodeSelect]);

  // Separate effect to handle selection highlighting without rebuilding the tree
  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    
    // Update circle styles for selection
    svg.selectAll<SVGCircleElement, any>('g.node circle')
      .style('fill', (d: any) => {
        // Highlight selected node
        if (selectedNodePath && d.data.path === selectedNodePath) {
          return '#f59e0b'; // Orange for selected
        }
        if (d._children) return '#3b82f6';
        if (d.children) return '#10b981';
        return '#6366f1';
      })
      .attr('r', (d: any) => {
        // Make selected node larger
        return selectedNodePath && d.data.path === selectedNodePath ? 8 : 6;
      });
  }, [selectedNodePath]);

  const handleZoomIn = () => {
    if (svgRef.current && (svgRef.current as any).zoomIn) {
      (svgRef.current as any).zoomIn();
    }
  };

  const handleZoomOut = () => {
    if (svgRef.current && (svgRef.current as any).zoomOut) {
      (svgRef.current as any).zoomOut();
    }
  };

  const handleResetZoom = () => {
    if (svgRef.current && (svgRef.current as any).resetZoom) {
      (svgRef.current as any).resetZoom();
    }
  };

  return (
    <Box style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Flex gap="2" mb="3" align="center">
        <Button size="1" variant="soft" onClick={handleZoomIn}>
          <ZoomIn size={14} />
          {t('btn_zoom_in', 'Zoom In')}
        </Button>
        <Button size="1" variant="soft" onClick={handleZoomOut}>
          <ZoomOut size={14} />
          {t('btn_zoom_out', 'Zoom Out')}
        </Button>
        <Button size="1" variant="soft" onClick={handleResetZoom}>
          <Maximize2 size={14} />
          {t('btn_reset', 'Reset')}
        </Button>
        
        <ToggleGroup.Root
          type="single"
          value={orientation}
          onValueChange={(val) => { if (val) setOrientation(val as 'horizontal' | 'vertical') }}
          className="flex bg-[var(--gray-3)] p-1 rounded-[var(--radius-2)]"
        >
          <ToggleGroup.Item
            value="horizontal"
            className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold rounded-[var(--radius-1)] data-[state=on]:bg-[var(--accent-9)] data-[state=on]:text-white text-[var(--gray-11)] transition-all cursor-pointer"
            title={t('lbl_horizontal', 'Horizontal')}
          >
            <Columns size={12} />
          </ToggleGroup.Item>
          <ToggleGroup.Item
            value="vertical"
            className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold rounded-[var(--radius-1)] data-[state=on]:bg-[var(--accent-9)] data-[state=on]:text-white text-[var(--gray-11)] transition-all cursor-pointer"
            title={t('lbl_vertical', 'Vertical')}
          >
            <Rows size={12} />
          </ToggleGroup.Item>
        </ToggleGroup.Root>

        <Box ml="auto">
          <Flex gap="2" align="center">
            <Badge color="blue" size="1">● {t('lbl_collapsed', 'Collapsed')}</Badge>
            <Badge color="green" size="1">● {t('lbl_expanded', 'Expanded')}</Badge>
            <Badge color="indigo" size="1">● {t('lbl_leaf', 'Leaf')}</Badge>
            <Badge color="orange" size="1">● {t('lbl_selected', 'Selected')}</Badge>
          </Flex>
        </Box>
      </Flex>
      <Box
        ref={containerRef}
        style={{
          flex: 1,
          border: '1px solid var(--gray-6)',
          borderRadius: 'var(--radius-3)',
          overflow: 'hidden',
          backgroundColor: appearance === 'dark' ? '#1a1a1a' : '#f8fafc',
        }}
      >
        <svg ref={svgRef} style={{ display: 'block', width: '100%', height: '100%' }} />
      </Box>
    </Box>
  );
};

export default D3ConfigTreeView;
