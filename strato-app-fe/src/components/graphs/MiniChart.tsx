import { useEffect, useState } from 'react';
import * as d3 from 'd3';
import { formatDoublePrecisionWithSuffix } from '../../utils/utils.ts';

interface MiniChartProps {
    data: number[];
    color: string;
    width?: number;
    height?: number;
    showCursor?: boolean;
}

const MiniChart = ({ 
    data, 
    color, 
    width = 320, 
    height = 30, 
    showCursor = true 
}: MiniChartProps) => {
    const [svgNode, setSvgNode] = useState<SVGSVGElement | null>(null);

    useEffect(() => {
        if (!svgNode || !data || data.length < 2) return;

        const svg = d3.select(svgNode);
        svg.selectAll("*").remove();

        const margin = { top: 2, right: 2, bottom: 2, left: 2 };

        const x = d3.scaleLinear()
            .domain([0, data.length - 1])
            .range([margin.left, width - margin.right]);

        const y = d3.scaleLinear()
            .domain([Math.min(...data), Math.max(...data)])
            .range([height - margin.bottom, margin.top]);

        const line = d3.line<number>()
            .x((_, i) => x(i))
            .y(d => y(d))
            .curve(d3.curveBasis);

        const gradientId = `gradient-${color.replace(/[^a-zA-Z0-9]/g, '')}`;
        const defs = svg.append("defs");
        const gradient = defs.append("linearGradient")
            .attr("id", gradientId)
            .attr("x1", "0%")
            .attr("y1", "0%")
            .attr("x2", "0%")
            .attr("y2", "100%");

        gradient.append("stop")
            .attr("offset", "0%")
            .attr("stop-color", color)
            .attr("stop-opacity", 0.3);

        gradient.append("stop")
            .attr("offset", "100%")
            .attr("stop-color", color)
            .attr("stop-opacity", 0);

        const area = d3.area<number>()
            .x((_, i) => x(i))
            .y0(height - margin.bottom)
            .y1(d => y(d))
            .curve(d3.curveBasis);

        svg.append("path")
            .datum(data)
            .attr("fill", `url(#${gradientId})`)
            .attr("d", area);

        svg.append("path")
            .datum(data)
            .attr("fill", "none")
            .attr("stroke", color)
            .attr("stroke-width", 1.5)
            .attr("d", line);

        if (showCursor) {
            // Cursor
            const cursor = svg.append("g")
                .style("display", "none");

            cursor.append("line")
                .attr("stroke", "var(--gray-8)")
                .attr("stroke-width", 1)
                .attr("stroke-dasharray", "2,2")
                .attr("y1", margin.top)
                .attr("y2", height - margin.bottom);

            const label = cursor.append("g");

            label.append("rect")
                .attr("fill", "var(--color-panel-solid)")
                .attr("stroke", "var(--gray-5)")
                .attr("rx", 3)
                .attr("ry", 3)
                .attr("height", 20);

            const labelText = label.append("text")
                .attr("fill", "var(--gray-12)")
                .attr("font-size", "8px")
                .attr("font-family", "monospace")
                .attr("dy", "12px")
                .attr("dx", "4px");

            svg.append("rect")
                .attr("width", width)
                .attr("height", height)
                .attr("fill", "transparent")
                .on("mousemove", (event) => {
                    const [mouseX] = d3.pointer(event);
                    const i = Math.round(x.invert(mouseX));
                    if (i >= 0 && i < data.length) {
                        cursor.style("display", null);
                        const xPos = x(i);
                        const val = data[i];
                        cursor.select("line")
                            .attr("x1", xPos)
                            .attr("x2", xPos);

                        labelText.text(formatDoublePrecisionWithSuffix(val));
                        const textWidth = (labelText.node() as SVGTextElement | null)?.getComputedTextLength() || 0;
                        label.select("rect").attr("width", textWidth + 8);

                        let labelX = xPos + 4;
                        if (labelX + textWidth + 8 > width) {
                            labelX = xPos - textWidth - 12;
                        }
                        label.attr("transform", `translate(${labelX}, ${height / 2 - 8})`);
                    }
                })
                .on("mouseleave", () => {
                    cursor.style("display", "none");
                });
        }

    }, [data, color, svgNode, width, height, showCursor]);

    return (
        <svg
            ref={setSvgNode}
            width="100%"
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            preserveAspectRatio="none"
            style={{ display: 'block' }}
        />
    );
};

export default MiniChart;
