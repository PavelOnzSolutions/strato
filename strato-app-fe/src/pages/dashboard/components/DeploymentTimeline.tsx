import React, {useEffect, useRef} from 'react';
import * as d3 from 'd3';
import {Box, Flex, Text} from '@radix-ui/themes';

interface IDeploymentActivity {
    id: string;
    timestamp: string;
    userLogin: string;
    data: {
        status: 'START' | 'SUCCESS' | 'FAILURE';
        environmentName: string;
        message?: string;
    };
    entityId: string;
}

interface DeploymentTimelineProps {
    deployments: IDeploymentActivity[];
}

const DeploymentTimeline: React.FC<DeploymentTimelineProps> = ({ deployments }) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!svgRef.current || !containerRef.current || !deployments || deployments.length === 0) return;

        const container = containerRef.current;
        const width = container.clientWidth;
        const height = 300;
        const margin = { top: 40, right: 40, bottom: 60, left: 60 };

        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove();

        const data = [...deployments].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

        const x = d3.scaleTime()
            .domain(d3.extent(data, d => new Date(d.timestamp)) as [Date, Date])
            .range([margin.left, width - margin.right]);

        // Group by environment for Y axis if multiple environments, or just one line
        const environments = Array.from(new Set(data.map(d => d.data.environmentName)));
        const y = d3.scalePoint()
            .domain(environments)
            .range([margin.top, height - margin.bottom])
            .padding(0.5);

        // X Axis
        const xAxis = svg.append("g")
            .attr("transform", `translate(0,${height - margin.bottom})`)
            .call(d3.axisBottom(x).ticks(5))
            .attr("font-size", "10px")
            .attr("color", "var(--gray-9)");

        // Grid lines
        const gridLines = svg.append("g")
            .attr("class", "grid")
            .attr("transform", `translate(0,${height - margin.bottom})`)
            .call(d3.axisBottom(x).tickSize(-(height - margin.top - margin.bottom)).tickFormat(() => ""))
            .attr("stroke-opacity", 0.1);

        // Y Axis (Environments)
        svg.append("g")
            .attr("transform", `translate(${margin.left},0)`)
            .call(d3.axisLeft(y))
            .attr("font-size", "10px")
            .attr("color", "var(--gray-9)");

        const colorScale: Record<string, string> = {
            'START': 'var(--blue-9)',
            'SUCCESS': 'var(--green-9)',
            'FAILURE': 'var(--red-9)'
        };

        const tooltip = d3.select("body").append("div")
            .attr("class", "timeline-tooltip")
            .style("position", "absolute")
            .style("visibility", "hidden")
            .style("background", "var(--color-panel-solid)")
            .style("border", "1px solid var(--gray-5)")
            .style("border-radius", "8px")
            .style("padding", "8px")
            .style("box-shadow", "0 4px 12px rgba(0,0,0,0.1)")
            .style("z-index", "100")
            .style("pointer-events", "none")
            .style("font-size", "12px");

        const dotsContainer = svg.append("g")
            .attr("clip-path", "url(#clip)");

        // Add clip path to prevent dots from going outside the chart area
        svg.append("defs").append("clipPath")
            .attr("id", "clip")
            .append("rect")
            .attr("x", margin.left)
            .attr("y", 0)
            .attr("width", width - margin.left - margin.right)
            .attr("height", height);

        const dots = dotsContainer.selectAll(".dot")
            .data(data)
            .enter()
            .append("circle")
            .attr("class", "dot")
            .attr("cx", d => x(new Date(d.timestamp)))
            .attr("cy", d => y(d.data.environmentName) || 0)
            .attr("r", 6)
            .attr("fill", d => colorScale[d.data.status])
            .attr("stroke", "white")
            .attr("stroke-width", 2)
            .style("cursor", "pointer")
            .on("mouseover", (_event, d) => {
                tooltip.style("visibility", "visible")
                    .html(`
                        <div style="font-weight: bold; margin-bottom: 4px;">${d.data.environmentName}</div>
                        <div style="display: flex; align-items: center; gap: 4px; color: var(--gray-11);">
                            <span>Status:</span> <span style="color: ${colorScale[d.data.status]}">${d.data.status}</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 4px; color: var(--gray-11);">
                            <span>User:</span> ${d.userLogin}
                        </div>
                        <div style="display: flex; align-items: center; gap: 4px; color: var(--gray-11);">
                            <span>Time:</span> ${new Date(d.timestamp).toLocaleString()}
                        </div>
                    `);
            })
            .on("mousemove", (event) => {
                tooltip.style("top", (event.pageY - 10) + "px")
                    .style("left", (event.pageX + 10) + "px");
            })
            .on("mouseout", () => {
                tooltip.style("visibility", "hidden");
            });

        // Zoom functionality
        const zoom = d3.zoom<SVGSVGElement, unknown>()
            .scaleExtent([1, 20])
            .translateExtent([[margin.left, 0], [width - margin.right, height]])
            .extent([[margin.left, 0], [width - margin.right, height]])
            .on("zoom", (event) => {
                const newX = event.transform.rescaleX(x);
                xAxis.call(d3.axisBottom(newX).ticks(5));
                gridLines.call(d3.axisBottom(newX).tickSize(-(height - margin.top - margin.bottom)).tickFormat(() => ""));
                dots.attr("cx", d => newX(new Date(d.timestamp)));
            });

        svg.call(zoom);

        return () => {
            tooltip.remove();
        };
    }, [deployments]);

    return (
        <Box ref={containerRef} style={{ width: '100%', height: '300px', position: 'relative' }}>
            <svg ref={svgRef} width="100%" height="300"></svg>
            <Flex gap="3" justify="center" mt="2">
                <Flex align="center" gap="1">
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--blue-9)' }}></div>
                    <Text size="1" color="gray">Started</Text>
                </Flex>
                <Flex align="center" gap="1">
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--green-9)' }}></div>
                    <Text size="1" color="gray">Success</Text>
                </Flex>
                <Flex align="center" gap="1">
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--red-9)' }}></div>
                    <Text size="1" color="gray">Failure</Text>
                </Flex>
            </Flex>
        </Box>
    );
};

export default DeploymentTimeline;
